// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
    uint256 private constant MAX_SLIPPAGE = 50;
    uint256 private constant FEE_DENOMINATOR = 10000;
    uint24 private constant UNISWAP_FEE_LOW = 100;
    uint24 private constant UNISWAP_FEE_MEDIUM = 500;
    uint24 private constant IGUANA_FEE_LOW = 100;
    uint24 private constant IGUANA_FEE_MEDIUM = 500;

    struct RouteInfo {
        address router;
        uint256 expectedOut;
        bytes routeData;
        uint24 fee;
    }

    event Rebalanced(address indexed from, address indexed to, uint256 amount);
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

        IERC20(USDC).approve(address(superlendPool), type(uint256).max);
        IERC20(USDT).approve(address(superlendPool), type(uint256).max);
        IERC20(USDC).approve(address(uniswapRouter), type(uint256).max);
        IERC20(USDT).approve(address(uniswapRouter), type(uint256).max);
        IERC20(USDC).approve(address(iguanaRouter), type(uint256).max);
        IERC20(USDT).approve(address(iguanaRouter), type(uint256).max);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256) {
        require(!paused, "Contract is paused");
        require(assets > 0, "Cannot deposit zero assets");
        require(receiver != address(0), "Invalid receiver");
        if (assets < MIN_DEPOSIT) revert InsufficientDeposit();
        if (totalAssets() + assets > tvlCap) revert TvlCapExceeded();

        IERC20(USDC).transferFrom(msg.sender, address(this), assets);
        uint256 originalAssets = assets;
        uint256 actualAssets = assets;

        if (currentAllocation == USDT) {
            RouteInfo memory route = _getBestRoute(USDC, USDT, assets);
            actualAssets = _executeSwap(USDC, USDT, assets, route.router, route.routeData, route.expectedOut);
        }

        // Calculate shares BEFORE supplying to get correct ERC4626 calculation
        uint256 shares = previewDeposit(originalAssets);

        // Update deposit time for lock period (always update to latest deposit)
        userDepositTime[receiver] = block.timestamp;
        userPrincipal[receiver] += originalAssets;
        totalPrincipal += originalAssets;

        superlendPool.supply(currentAllocation, actualAssets, address(this), 0);
        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, originalAssets, shares);
        return shares;
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override nonReentrant returns (uint256) {
        // Input validation
        require(assets > 0, "Cannot withdraw zero assets");
        require(receiver != address(0), "Invalid receiver");
        require(owner != address(0), "Invalid owner");
        
        // Check lock period - only bypass if paused for emergency withdrawal  
        if (block.timestamp < userDepositTime[owner] + LOCK_DURATION && !paused) {
            revert WithdrawalLocked();
        }

        // Calculate user's current asset value BEFORE burning shares
        uint256 userShares = balanceOf(owner);
        require(userShares > 0, "No shares to withdraw");
        uint256 currentAssetValue = convertToAssets(userShares);
        
        uint256 shares = previewWithdraw(assets);
        require(shares <= userShares, "Insufficient shares");
        
        _burn(owner, shares);
        uint256 userShare = assets;
        
        // Calculate performance fee if user has profit
        if (currentAssetValue > userPrincipal[owner]) {
            uint256 profit = currentAssetValue - userPrincipal[owner];
            uint256 fee = (profit * PERFORMANCE_FEE) / FEE_DENOMINATOR;
            // Apply fee proportionally to this withdrawal
            uint256 withdrawalFee = (fee * assets) / currentAssetValue;
            userShare -= withdrawalFee;
            uint256 feeShares = previewDeposit(withdrawalFee);
            _mint(OwnableUpgradeable.owner(), feeShares);
        }

        // Update user principal and total principal with safer math
        uint256 principalReduction = (userPrincipal[owner] * assets) / currentAssetValue;
        if (principalReduction > userPrincipal[owner]) {
            principalReduction = userPrincipal[owner];
        }
        userPrincipal[owner] -= principalReduction;
        if (principalReduction <= totalPrincipal) {
            totalPrincipal -= principalReduction;
        } else {
            totalPrincipal = 0;
        }

        uint256 withdrawn;
        
        // Handle paused state correctly - ensure we have USDC available
        if (paused) {
            withdrawn = userShare;
            uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));
            require(usdcBalance >= withdrawn, "Insufficient USDC balance");
        } else {
            // Normal operation: withdraw from lending pool
            withdrawn = superlendPool.withdraw(currentAllocation, userShare, address(this));
            
            // Convert to USDC if currently allocated to USDT
            if (currentAllocation == USDT) {
                RouteInfo memory route = _getBestRoute(USDT, USDC, withdrawn);
                withdrawn = _executeSwap(USDT, USDC, withdrawn, route.router, route.routeData, route.expectedOut);
            }
        }

        // Always transfer USDC to user
        IERC20(USDC).transfer(receiver, withdrawn);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
        return shares;
    }

    function canRebalance() public view returns (
        bool canRebal,
        string memory reason,
        address betterAsset,
        uint256 currentAPY,
        uint256 betterAPY
    ) {
        if (paused) {
            return (false, "Contract is paused", address(0), 0, 0);
        }
        
        address alternativeAsset = currentAllocation == USDC ? USDT : USDC;
        
        try superlendPool.getReserveData(currentAllocation) returns (
            uint256, uint128, uint128 currentLiquidityRate, uint128, uint128, uint128, uint40, uint16, address, address, address, address, uint128, uint128, uint128
        ) {
            try superlendPool.getReserveData(alternativeAsset) returns (
                uint256, uint128, uint128 alternativeLiquidityRate, uint128, uint128, uint128, uint40, uint16, address, address, address, address, uint128, uint128, uint128
            ) {
                // Convert RAY format (1e27) to basis points (1e4) for easier comparison
                // APY = (1 + rate/SECONDS_PER_YEAR)^SECONDS_PER_YEAR - 1
                // For small rates, we can approximate: APY ≈ rate (in RAY format)
                // Convert to basis points: (rate * 10000) / 1e27 = rate / 1e23
                uint256 RAY = 1e27;
                uint256 SECONDS_PER_YEAR = 365 * 24 * 60 * 60; // 31,536,000
                
                // Convert RAY rates to APY in basis points (1 basis point = 0.01%)
                // For comparison purposes, we'll use simplified conversion
                currentAPY = (uint256(currentLiquidityRate) * 10000) / RAY;
                betterAPY = (uint256(alternativeLiquidityRate) * 10000) / RAY;
                
                if (betterAPY <= currentAPY) {
                    return (false, "Current allocation has better or equal APY", address(0), currentAPY, betterAPY);
                }
                
                // Require at least 0.1% (10 basis points) difference to justify rebalancing
                uint256 apyDifference = betterAPY - currentAPY;
                if (apyDifference < 10) { // 10 basis points = 0.1%
                    return (false, "APY difference too small to justify gas costs", alternativeAsset, currentAPY, betterAPY);
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
            actualWithdrawn = _executeSwap(currentAllocation, betterAsset, actualWithdrawn, route.router, route.routeData, route.expectedOut);
        }

        currentAllocation = betterAsset;
        superlendPool.supply(currentAllocation, actualWithdrawn, address(this), 0);

        emit Rebalanced(currentAllocation == USDC ? USDT : USDC, currentAllocation, actualWithdrawn);
    }

    function claimFees() external onlyOwner nonReentrant {
        uint256 currentValue = totalAssets();
        if (currentValue <= totalPrincipal) revert NoFeesToClaim();

        uint256 profit = currentValue - totalPrincipal;
        uint256 fees = (profit * PERFORMANCE_FEE) / FEE_DENOMINATOR;
        
        // Withdraw fee amount from lending protocol
        uint256 feeAmount;
        if (paused) {
            // If paused, fees are already in USDC
            feeAmount = fees;
            require(IERC20(USDC).balanceOf(address(this)) >= feeAmount, "Insufficient USDC for fees");
        } else {
            // Withdraw from current allocation
            feeAmount = superlendPool.withdraw(currentAllocation, fees, address(this));
            
            // Convert to USDC if currently in USDT
            if (currentAllocation == USDT && feeAmount > 0) {
                RouteInfo memory route = _getBestRoute(USDT, USDC, feeAmount);
                feeAmount = _executeSwap(USDT, USDC, feeAmount, route.router, route.routeData, route.expectedOut);
            }
        }
        
        // Transfer USDC fees directly to owner
        IERC20(USDC).transfer(OwnableUpgradeable.owner(), feeAmount);
        
        // Update principal to reflect claimed fees
        totalPrincipal += fees;

        emit FeesClaimed(feeAmount);
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

    function getBestSwapRoute(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (RouteInfo memory) {
        return _getBestRoute(tokenIn, tokenOut, amountIn);
    }

    function totalAssets() public view override returns (uint256) {
        if (paused) {
            return IERC20(USDC).balanceOf(address(this));
        }
        return _getCurrentSuperlendBalance();
    }

    function _getCurrentSuperlendBalance() internal view returns (uint256) {
        (
            ,           // configuration
            uint128 liquidityIndex,    // liquidityIndex
            ,           // currentLiquidityRate
            ,           // variableBorrowIndex
            ,           // currentVariableBorrowRate
            ,           // currentStableBorrowRate
            ,           // lastUpdateTimestamp
            ,           // id
            address aTokenAddress,     // aTokenAddress
            ,           // stableDebtTokenAddress
            ,           // variableDebtTokenAddress
            ,           // interestRateStrategyAddress
            ,           // accruedToTreasury
            ,           // unbacked
                        // isolationModeTotalDebt
        ) = superlendPool.getReserveData(currentAllocation);
        uint256 scaledBalance = IAToken(aTokenAddress).scaledBalanceOf(address(this));
        return (scaledBalance * liquidityIndex) / 1e27;
    }

    function _getBestRoute(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (RouteInfo memory bestRoute) {
        if (amountIn == 0) {
            revert("Cannot route zero amount");
        }
        
        uint256 bestOutput = 0;
        
        // Try Uniswap routes first (typically more reliable)
        try uniswapQuoter.quoteExactInputSingle(
            IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: UNISWAP_FEE_LOW,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 amountOut, uint160, uint32, uint256) {
            if (amountOut > bestOutput) {
                bestOutput = amountOut;
                bestRoute = RouteInfo({
                    router: address(uniswapRouter),
                    expectedOut: amountOut,
                    routeData: abi.encode(UNISWAP_FEE_LOW),
                    fee: UNISWAP_FEE_LOW
                });
            }
        } catch {}

        try uniswapQuoter.quoteExactInputSingle(
            IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: UNISWAP_FEE_MEDIUM,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 amountOut, uint160, uint32, uint256) {
            if (amountOut > bestOutput) {
                bestOutput = amountOut;
                bestRoute = RouteInfo({
                    router: address(uniswapRouter),
                    expectedOut: amountOut,
                    routeData: abi.encode(UNISWAP_FEE_MEDIUM),
                    fee: UNISWAP_FEE_MEDIUM
                });
            }
        } catch {}

        // Try IguanaDEX routes as alternatives
        try iguanaQuoter.quoteExactInputSingle(
            IIguanaDEXQuoter.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: IGUANA_FEE_LOW,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 amountOut, uint160, uint32, uint256) {
            if (amountOut > bestOutput) {
                bestOutput = amountOut;
                bestRoute = RouteInfo({
                    router: address(iguanaRouter),
                    expectedOut: amountOut,
                    routeData: abi.encode(IGUANA_FEE_LOW),
                    fee: IGUANA_FEE_LOW
                });
            }
        } catch {}

        try iguanaQuoter.quoteExactInputSingle(
            IIguanaDEXQuoter.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: IGUANA_FEE_MEDIUM,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 amountOut, uint160, uint32, uint256) {
            if (amountOut > bestOutput) {
                bestOutput = amountOut;
                bestRoute = RouteInfo({
                    router: address(iguanaRouter),
                    expectedOut: amountOut,
                    routeData: abi.encode(IGUANA_FEE_MEDIUM),
                    fee: IGUANA_FEE_MEDIUM
                });
            }
        } catch {}

        require(bestOutput > 0, "No valid route found");
        
        // Additional safety check: ensure we get reasonable output
        uint256 minExpectedOutput = (amountIn * 9900) / 10000; // Allow max 1% slippage for routing
        require(bestOutput >= minExpectedOutput, "Route output too low");
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
            return uniswapRouter.exactInputSingle(params);
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
            return iguanaRouter.exactInputSingle(params);
        }
        
        revert("Invalid router");
    }
}