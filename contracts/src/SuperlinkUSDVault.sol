// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/ISuperlendPool.sol";
import "./interfaces/ISwapRouter02.sol";
import "./interfaces/IQuoterV2.sol";
import "./interfaces/IIguanaDEXRouter.sol";

contract SuperlinkUSDVault is
    Initializable,
    ERC4626Upgradeable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    mapping(address => uint256) public userDepositTime;
    mapping(address => uint256) public userPrincipal;
    uint256 public totalPrincipal;
    address public currentAllocation;
    bool public paused;
    uint256 public tvlCap;
    uint256 public totalPerformanceFeesEarned;
    mapping(address => uint256) public feeShares;

    address public immutable USDC;
    address public immutable USDT;
    ISuperlendPool public immutable superlendPool;
    ISwapRouter02 public immutable uniswapRouter;
    IQuoterV2 public immutable uniswapQuoter;
    IIguanaDEXRouter public immutable iguanaRouter;
    IIguanaDEXQuoter public immutable iguanaQuoter;

    uint256 private constant PERFORMANCE_FEE = 1500;
    uint256 private constant MIN_DEPOSIT = 1e6;
    uint256 private constant LOCK_DURATION = 24 hours;
    uint256 private constant MAX_SLIPPAGE = 10;
    uint256 private constant ROUTING_MAX_SLIPPAGE = 5;
    uint256 private constant MIN_REBALANCE_PROFIT = 100;
    uint256 private constant FEE_DENOMINATOR = 10000;
    uint24 private constant UNISWAP_FEE_LOWEST = 100;
    uint24 private constant UNISWAP_FEE_LOW = 500;
    uint24 private constant UNISWAP_FEE_MEDIUM = 3000;
    uint24 private constant UNISWAP_FEE_HIGH = 10000;
    
    uint24 private constant IGUANA_FEE_LOWEST = 100;
    uint24 private constant IGUANA_FEE_LOW = 500;
    uint24 private constant IGUANA_FEE_MEDIUM = 2500;
    uint24 private constant IGUANA_FEE_HIGH = 3000;

    struct RouteInfo {
        address router;
        uint256 expectedOut;
        bytes routeData;
        uint24 fee;
    }

    event Rebalanced(address indexed from, address indexed to, uint256 amount);
    event RouteSelected(address indexed router, uint24 fee, uint256 amountIn, uint256 amountOut);
    event FeesClaimed(uint256 amount);
    event EmergencyPaused();
    event Unpaused();
    event TvlCapUpdated(uint256 newCap);

    error InsufficientDeposit();
    error TvlCapExceeded();
    error WithdrawalLocked();
    error ContractPaused();
    error ContractNotPaused();
    error InsufficientSlippage();
    error NoFeesToClaim();
    error RebalanceNotProfitable();
    error SlippageExceedsLimit();

    constructor(
        address _usdc,
        address _usdt,
        address _superlendPool,
        address _uniswapRouter,
        address _uniswapQuoter,
        address _iguanaRouter,
        address _iguanaQuoter
    ) {
        USDC = _usdc;
        USDT = _usdt;
        superlendPool = ISuperlendPool(_superlendPool);
        uniswapRouter = ISwapRouter02(_uniswapRouter);
        uniswapQuoter = IQuoterV2(_uniswapQuoter);
        iguanaRouter = IIguanaDEXRouter(_iguanaRouter);
        iguanaQuoter = IIguanaDEXQuoter(_iguanaQuoter);

        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC4626_init(IERC20(USDC));
        __ERC20_init("Superlink USD Vault", "supUSD");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        tvlCap = 10000e6;
        currentAllocation = USDC;
        paused = false;
        totalPerformanceFeesEarned = 0;

        IERC20(USDC).approve(address(superlendPool), type(uint256).max);
        IERC20(USDT).approve(address(superlendPool), type(uint256).max);
        IERC20(USDC).approve(address(uniswapRouter), type(uint256).max);
        IERC20(USDT).approve(address(uniswapRouter), type(uint256).max);
        IERC20(USDC).approve(address(iguanaRouter), type(uint256).max);
        IERC20(USDT).approve(address(iguanaRouter), type(uint256).max);

        // Value-accruing token model: First depositor gets 1:1 ratio
        // Subsequent depositors pay market rate based on Superlend yield
        // Virtual shares (offset=1) provide basic inflation attack protection
    }

    /**
     * @dev Returns 6 decimals to maintain 1:1 ratio with USDC for better UX
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @dev No decimal offset for clean first depositor 1:1 ratio
     * Custom logic handles first depositor = 1:1, subsequent = market rate
     * Security via minimum deposits and special first depositor handling
     */
    function _decimalsOffset() internal pure override returns (uint8) {
        return 0;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Override ERC-4626 conversion to implement first depositor = 1:1 ratio
     * First depositor (when totalSupply = 0) gets exactly 1:1 USDC:supUSD ratio
     * Subsequent depositors pay market rate based on vault performance
     */
    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view override returns (uint256) {
        uint256 supply = totalSupply();
        
        // First depositor special case: 1:1 ratio
        if (supply == 0) {
            return assets;
        }
        
        // Subsequent depositors: standard ERC-4626 market rate
        return Math.mulDiv(assets, supply, totalAssets(), rounding);
    }

    /**
     * @dev Override ERC-4626 conversion for consistent reverse calculation
     */
    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view override returns (uint256) {
        uint256 supply = totalSupply();
        
        // Handle edge case when supply is 0
        if (supply == 0) {
            return shares;
        }
        
        // Standard conversion based on current market rate
        return Math.mulDiv(shares, totalAssets(), supply, rounding);
    }

    function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256) {
        require(!paused, "Contract is paused");
        require(assets > 0, "Cannot deposit zero assets");
        require(receiver != address(0), "Invalid receiver");
        if (assets < MIN_DEPOSIT) revert InsufficientDeposit();
        if (totalAssets() + assets > tvlCap) revert TvlCapExceeded();

        uint256 startShareBalance = balanceOf(receiver);
        IERC20(USDC).transferFrom(msg.sender, address(this), assets);
        uint256 originalAssets = assets;
        uint256 actualAssets = assets;

        if (currentAllocation == USDT) {
            RouteInfo memory route = _getBestRoute(USDC, USDT, assets);
            actualAssets = _executeSwap(USDC, USDT, assets, route.router, route.routeData, route.expectedOut);
        }

        uint256 shares = previewDeposit(originalAssets);

        userDepositTime[receiver] = block.timestamp;
        userPrincipal[receiver] += originalAssets;
        totalPrincipal += originalAssets;

        superlendPool.supply(currentAllocation, actualAssets, address(this), 0);
        _mint(receiver, shares);

        // Verify shares were minted correctly
        assert(balanceOf(receiver) >= startShareBalance + shares);

        emit Deposit(msg.sender, receiver, originalAssets, shares);
        return shares;
    }

    function withdraw(uint256 assets, address receiver, address owner) public override nonReentrant returns (uint256) {
        require(assets > 0, "Cannot withdraw zero assets");
        require(receiver != address(0), "Invalid receiver");
        require(owner != address(0), "Invalid owner");

        if (block.timestamp < userDepositTime[owner] + LOCK_DURATION && !paused) {
            revert WithdrawalLocked();
        }

        uint256 totalUserShares = balanceOf(owner);
        require(totalUserShares > 0, "No shares to withdraw");
        uint256 currentAssetValue = convertToAssets(totalUserShares);

        uint256 shares = previewWithdraw(assets);
        require(shares <= totalUserShares, "Insufficient shares");

        _burn(owner, shares);
        
        uint256 userShare = assets;

        uint256 userFeeShares = feeShares[owner];
        uint256 userRegularShares = totalUserShares > userFeeShares ? totalUserShares - userFeeShares : 0;
        
        if (userRegularShares > 0 && currentAssetValue > userPrincipal[owner]) {
            uint256 userRegularAssetValue = (currentAssetValue * userRegularShares) / totalUserShares;
            
            if (userRegularAssetValue > userPrincipal[owner]) {
                uint256 profit = userRegularAssetValue - userPrincipal[owner];
                uint256 fee = (profit * PERFORMANCE_FEE) / FEE_DENOMINATOR;
                uint256 withdrawalFee = (fee * assets) / currentAssetValue;
                userShare -= withdrawalFee;

                totalPerformanceFeesEarned += withdrawalFee;
            }
        }

        uint256 principalReduction;
        
        if (totalUserShares > 0) {
            if (shares == totalUserShares) {
                principalReduction = userPrincipal[owner];
            } else {
                principalReduction = (userPrincipal[owner] * shares) / totalUserShares;
            }
            
            if (principalReduction > userPrincipal[owner]) {
                principalReduction = userPrincipal[owner];
            }
        } else {
            principalReduction = userPrincipal[owner];
        }
        
        userPrincipal[owner] -= principalReduction;
        if (principalReduction <= totalPrincipal) {
            totalPrincipal -= principalReduction;
        } else {
            totalPrincipal = 0;
        }

        if (userFeeShares > 0) {
            uint256 feeSharesReduction = (userFeeShares * shares) / totalUserShares;
            feeShares[owner] = userFeeShares > feeSharesReduction ? 
                userFeeShares - feeSharesReduction : 0;
        }
        
        if (balanceOf(owner) == 0) {
            userPrincipal[owner] = 0;
            feeShares[owner] = 0;
        }

        uint256 withdrawn;

        if (paused) {
            withdrawn = userShare;
            uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));
            require(usdcBalance >= withdrawn, "Insufficient USDC balance");
        } else {
            uint256 availableBalance = _getCurrentSuperlendBalance();
            require(availableBalance >= userShare, "Insufficient balance in lending pool");

            withdrawn = superlendPool.withdraw(currentAllocation, userShare, address(this));

            if (currentAllocation == USDT && withdrawn > 0) {
                RouteInfo memory route = _getBestRoute(USDT, USDC, withdrawn);
                withdrawn = _executeSwap(USDT, USDC, withdrawn, route.router, route.routeData, route.expectedOut);
            }
        }

        IERC20(USDC).transfer(receiver, withdrawn);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
        return shares;
    }

    function canRebalance()
        public
        view
        returns (bool canRebal, string memory reason, address betterAsset, uint256 currentAPY, uint256 betterAPY)
    {
        if (paused) {
            return (false, "Contract is paused", address(0), 0, 0);
        }

        address alternativeAsset = currentAllocation == USDC ? USDT : USDC;

        try superlendPool.getReserveData(currentAllocation) returns (
            uint256,
            uint128,
            uint128 currentLiquidityRate,
            uint128,
            uint128,
            uint128,
            uint40,
            uint16,
            address,
            address,
            address,
            address,
            uint128,
            uint128,
            uint128
        ) {
            try superlendPool.getReserveData(alternativeAsset) returns (
                uint256,
                uint128,
                uint128 alternativeLiquidityRate,
                uint128,
                uint128,
                uint128,
                uint40,
                uint16,
                address,
                address,
                address,
                address,
                uint128,
                uint128,
                uint128
            ) {
                uint256 RAY = 1e27;

                currentAPY = (uint256(currentLiquidityRate) * 10000) / RAY;
                betterAPY = (uint256(alternativeLiquidityRate) * 10000) / RAY;

                if (betterAPY <= currentAPY) {
                    return (false, "Current allocation has better or equal APY", address(0), currentAPY, betterAPY);
                }

                uint256 apyDifference = betterAPY - currentAPY;
                if (apyDifference < MIN_REBALANCE_PROFIT) {
                    return (
                        false, "APY difference insufficient to cover swap costs and slippage", alternativeAsset, currentAPY, betterAPY
                    );
                }

                return (true, "Rebalancing would be profitable", alternativeAsset, currentAPY, betterAPY);
            } catch {
                return (false, "Failed to get alternative asset data", address(0), 0, 0);
            }
        } catch {
            return (false, "Failed to get current asset data", address(0), 0, 0);
        }
    }

    function rebalance() external onlyOwner nonReentrant {
        if (paused) revert ContractPaused();

        (bool canRebal,, address betterAsset,,) = canRebalance();
        if (!canRebal) revert RebalanceNotProfitable();

        superlendPool.withdraw(currentAllocation, type(uint256).max, address(this));
        uint256 actualWithdrawn = IERC20(currentAllocation).balanceOf(address(this));

        if (betterAsset != currentAllocation) {
            RouteInfo memory route = _getBestRoute(currentAllocation, betterAsset, actualWithdrawn);
            
            uint256 expectedSlippage = actualWithdrawn > route.expectedOut ? 
                ((actualWithdrawn - route.expectedOut) * FEE_DENOMINATOR) / actualWithdrawn : 0;
            
            if (expectedSlippage > ROUTING_MAX_SLIPPAGE) {
                revert RebalanceNotProfitable();
            }
            
            actualWithdrawn = _executeSwap(
                currentAllocation, betterAsset, actualWithdrawn, route.router, route.routeData, route.expectedOut
            );
        }

        currentAllocation = betterAsset;
        superlendPool.supply(currentAllocation, actualWithdrawn, address(this), 0);

        emit Rebalanced(currentAllocation == USDC ? USDT : USDC, currentAllocation, actualWithdrawn);
    }

    function claimPerformanceFees() external onlyOwner nonReentrant {
        if (totalPerformanceFeesEarned == 0) revert NoFeesToClaim();

        uint256 feesToClaim = totalPerformanceFeesEarned;
        totalPerformanceFeesEarned = 0;

        uint256 feeAmount;
        if (paused) {
            uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));
            require(usdcBalance >= feesToClaim, "Insufficient USDC for fees");
            feeAmount = feesToClaim;
        } else {
            feeAmount = superlendPool.withdraw(currentAllocation, feesToClaim, address(this));

            if (currentAllocation == USDT && feeAmount > 0) {
                RouteInfo memory route = _getBestRoute(USDT, USDC, feeAmount);
                feeAmount = _executeSwap(USDT, USDC, feeAmount, route.router, route.routeData, route.expectedOut);
            }
        }

        IERC20(USDC).transfer(OwnableUpgradeable.owner(), feeAmount);

        emit FeesClaimed(feeAmount);
    }

    /**
     * @notice Claims all performance fees including unrealized profits by minting fee shares
     * @dev Mints shares to admin representing 15% of total profit without affecting user positions
     */
    function claimAllPerformanceFees() external onlyOwner nonReentrant {
        require(!paused, "Cannot claim all fees while paused");
        
        uint256 currentTotalAssets = totalAssets();
        
        if (currentTotalAssets <= totalPrincipal) {
            if (totalPerformanceFeesEarned > 0) {
                uint256 feesToClaim = totalPerformanceFeesEarned;
                totalPerformanceFeesEarned = 0;
                
                uint256 feeAmount = superlendPool.withdraw(currentAllocation, feesToClaim, address(this));
                
                if (currentAllocation == USDT && feeAmount > 0) {
                    RouteInfo memory route = _getBestRoute(USDT, USDC, feeAmount);
                    feeAmount = _executeSwap(USDT, USDC, feeAmount, route.router, route.routeData, route.expectedOut);
                }
                
                IERC20(USDC).transfer(OwnableUpgradeable.owner(), feeAmount);
                emit FeesClaimed(feeAmount);
            }
            return;
        }
        
        uint256 totalProfit = currentTotalAssets - totalPrincipal;
        uint256 totalFeesOwed = (totalProfit * PERFORMANCE_FEE) / FEE_DENOMINATOR;
        
        uint256 newFeesToCollect = totalFeesOwed > totalPerformanceFeesEarned ? 
            totalFeesOwed - totalPerformanceFeesEarned : 0;
        
        if (newFeesToCollect == 0 && totalPerformanceFeesEarned == 0) {
            revert NoFeesToClaim();
        }
        
        uint256 totalFeesToProcess = newFeesToCollect + totalPerformanceFeesEarned;
        
        uint256 sharesToMint = convertToShares(totalFeesToProcess);
        
        if (sharesToMint > 0) {
            address admin = OwnableUpgradeable.owner();
            
            _mint(admin, sharesToMint);
            
            feeShares[admin] += sharesToMint;
            
            
            totalPerformanceFeesEarned = 0;
            
            emit FeesClaimed(totalFeesToProcess);
        }
    }

    function pause() external onlyOwner {
        require(!paused, "Already paused");
        paused = true;
    }

    function emergencyPause() external onlyOwner {
        if (paused) revert ContractPaused();

        paused = true;

        superlendPool.withdraw(currentAllocation, type(uint256).max, address(this));

        if (currentAllocation == USDT) {
            uint256 usdtBalance = IERC20(USDT).balanceOf(address(this));
            if (usdtBalance > 0) {
                RouteInfo memory route = _getBestRoute(USDT, USDC, usdtBalance);
                _executeSwap(USDT, USDC, usdtBalance, route.router, route.routeData, route.expectedOut);
            }
            currentAllocation = USDC;
        }

        emit EmergencyPaused();
    }

    function unpause() external onlyOwner {
        if (!paused) revert ContractNotPaused();

        paused = false;

        uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));
        if (usdcBalance > 0) {
            superlendPool.supply(USDC, usdcBalance, address(this), 0);
        }

        emit Unpaused();
    }

    function setTvlCap(uint256 newCap) external onlyOwner {
        tvlCap = newCap;
        emit TvlCapUpdated(newCap);
    }

    function getBestSwapRoute(address tokenIn, address tokenOut, uint256 amountIn)
        external
        returns (RouteInfo memory)
    {
        return _getBestRoute(tokenIn, tokenOut, amountIn);
    }

    function checkRebalancingProfitability() external view returns (
        bool isProfitable, 
        string memory reason, 
        uint256 expectedSlippage,
        uint256 maxAllowedSlippage
    ) {
        (bool canRebal, string memory canRebalReason,,,) = canRebalance();
        
        if (!canRebal) {
            return (false, canRebalReason, 0, ROUTING_MAX_SLIPPAGE);
        }
        
        return (true, "Rebalancing appears profitable", 0, ROUTING_MAX_SLIPPAGE);
    }

    function totalAssets() public view override returns (uint256) {
        if (paused) {
            return IERC20(USDC).balanceOf(address(this));
        }
        
        uint256 superlendBalance = _getCurrentSuperlendBalance();
        
        // For value-accruing token: ensure clean calculation
        // Round down to nearest wei to prevent dust accumulation
        return superlendBalance;
    }

    function lastWithdrawalTime(address user) external view returns (uint256) {
        return userDepositTime[user];
    }

    /**
     * @notice Returns the total claimable performance fees (realized + unrealized)
     * @return realizedFees Already accumulated fees from withdrawals
     * @return unrealizedFees Fees from current unrealized profits
     * @return totalFees Total claimable fees
     */
    function getClaimableFees() external view returns (
        uint256 realizedFees,
        uint256 unrealizedFees,
        uint256 totalFees
    ) {
        realizedFees = totalPerformanceFeesEarned;
        
        uint256 currentTotalAssets = totalAssets();
        if (currentTotalAssets > totalPrincipal) {
            uint256 totalProfit = currentTotalAssets - totalPrincipal;
            uint256 totalFeesOwed = (totalProfit * PERFORMANCE_FEE) / FEE_DENOMINATOR;
            unrealizedFees = totalFeesOwed > realizedFees ? totalFeesOwed - realizedFees : 0;
        } else {
            unrealizedFees = 0;
        }
        
        totalFees = realizedFees + unrealizedFees;
    }

    function _getCurrentSuperlendBalance() internal view returns (uint256) {
        (
            ,
            uint128 liquidityIndex,
            ,
            ,
            ,
            ,
            ,
            ,
            address aTokenAddress,
            ,
            ,
            ,
            ,
            ,
        ) = superlendPool.getReserveData(currentAllocation);

        uint256 scaledBalance = IAToken(aTokenAddress).scaledBalanceOf(address(this));
        return (scaledBalance * liquidityIndex) / 1e27;
    }

    function _getBestRoute(address tokenIn, address tokenOut, uint256 amountIn)
        internal
        returns (RouteInfo memory bestRoute)
    {
        if (amountIn == 0) {
            revert("Cannot route zero amount");
        }

        uint256 bestOutput = 0;

        uint24[4] memory uniswapFees = [UNISWAP_FEE_LOWEST, UNISWAP_FEE_LOW, UNISWAP_FEE_MEDIUM, UNISWAP_FEE_HIGH];
        
        for (uint i = 0; i < uniswapFees.length; i++) {
            try uniswapQuoter.quoteExactInputSingle(
                IQuoterV2.QuoteExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    amountIn: amountIn,
                    fee: uniswapFees[i],
                    sqrtPriceLimitX96: 0
                })
            ) returns (uint256 amountOut, uint160, uint32, uint256) {
                if (amountOut > bestOutput) {
                    bestOutput = amountOut;
                    bestRoute = RouteInfo({
                        router: address(uniswapRouter),
                        expectedOut: amountOut,
                        routeData: abi.encode(uniswapFees[i]),
                        fee: uniswapFees[i]
                    });
                }
            } catch {}
        }

        uint24[4] memory iguanaFees = [IGUANA_FEE_LOWEST, IGUANA_FEE_LOW, IGUANA_FEE_MEDIUM, IGUANA_FEE_HIGH];
        
        for (uint i = 0; i < iguanaFees.length; i++) {
            try iguanaQuoter.quoteExactInputSingle(
                IIguanaDEXQuoter.QuoteExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    amountIn: amountIn,
                    fee: iguanaFees[i],
                    sqrtPriceLimitX96: 0
                })
            ) returns (uint256 amountOut, uint160, uint32, uint256) {
                if (amountOut > bestOutput) {
                    bestOutput = amountOut;
                    bestRoute = RouteInfo({
                        router: address(iguanaRouter),
                        expectedOut: amountOut,
                        routeData: abi.encode(iguanaFees[i]),
                        fee: iguanaFees[i]
                    });
                }
            } catch {}
        }

        require(bestOutput > 0, "No valid route found");

        uint256 minExpectedOutput = (amountIn * (FEE_DENOMINATOR - ROUTING_MAX_SLIPPAGE)) / FEE_DENOMINATOR;
        require(bestOutput >= minExpectedOutput, "Route slippage too high for stablecoin swap");
    }

    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address router,
        bytes memory routeData,
        uint256 expectedOut
    ) internal returns (uint256) {
        uint256 minAmountOut = (expectedOut * (FEE_DENOMINATOR - MAX_SLIPPAGE)) / FEE_DENOMINATOR;
        uint24 fee = abi.decode(routeData, (uint24));

        uint256 amountOut;
        if (router == address(uniswapRouter)) {
            ISwapRouter02.ExactInputSingleParams memory params = ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            });
            amountOut = uniswapRouter.exactInputSingle(params);
        } else if (router == address(iguanaRouter)) {
            IIguanaDEXRouter.ExactInputSingleParams memory params = IIguanaDEXRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            });
            amountOut = iguanaRouter.exactInputSingle(params);
        } else {
            revert("Invalid router");
        }

        // Emit route selection event for monitoring
        emit RouteSelected(router, fee, amountIn, amountOut);
        
        return amountOut;
    }
}
