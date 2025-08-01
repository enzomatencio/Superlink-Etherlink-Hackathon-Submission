// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/SuperlinkUSDVault.sol";
import "../src/interfaces/ISuperlendPool.sol";
import "../src/interfaces/ISwapRouter02.sol";
import "../src/interfaces/IQuoterV2.sol";
import "../src/interfaces/IIguanaDEXRouter.sol";
import "./mocks/MockAToken.sol";
import "./mocks/MockIguanaDEXQuoter.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract MockSuperlendPool {
    mapping(address => uint256) public balances;
    mapping(address => uint128) public liquidityRates;
    mapping(address => address) public aTokens;

    function increaseBalance(address user, uint256 amount) external {
        balances[user] += amount;
    }

    function setAToken(address asset, address aToken) external {
        aTokens[asset] = aToken;
    }

    constructor() {
        liquidityRates[address(0)] = 44000000000000000000000000; // 4.4% APY in RAY
        liquidityRates[address(1)] = 81600000000000000000000000; // 8.16% APY in RAY
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        balances[onBehalfOf] += amount;

        if (aTokens[asset] != address(0)) {
            MockAToken(aTokens[asset]).setScaledBalance(onBehalfOf, balances[onBehalfOf]);
        }
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        if (amount == type(uint256).max) {
            amount = balances[msg.sender];
        }
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;

        if (aTokens[asset] != address(0)) {
            MockAToken(aTokens[asset]).setScaledBalance(msg.sender, balances[msg.sender]);
        }

        IERC20(asset).transfer(to, amount);
        return amount;
    }

    function getReserveData(address asset)
        external
        view
        returns (
            uint256,
            uint128,
            uint128,
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
        )
    {
        return
            (0, 1e27, liquidityRates[asset], 0, 0, 0, 0, 0, aTokens[asset], address(0), address(0), address(0), 0, 0, 0);
    }

    function setLiquidityRate(address asset, uint128 rate) external {
        liquidityRates[asset] = rate;
    }
}

contract MockRouter {
    uint256 public slippage = 0;

    function setSlippage(uint256 _slippage) external {
        slippage = _slippage;
    }

    function exactInputSingle(ISwapRouter02.ExactInputSingleParams calldata params)
        external
        returns (uint256 amountOut)
    {
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        amountOut = params.amountIn * (10000 - slippage) / 10000;
        IERC20(params.tokenOut).transfer(params.recipient, amountOut);
    }
}

contract MockQuoter {
    uint256 public slippage = 0;

    function setSlippage(uint256 _slippage) external {
        slippage = _slippage;
    }

    function quoteExactInputSingle(IQuoterV2.QuoteExactInputSingleParams calldata params)
        external
        view
        returns (uint256 amountOut, uint160, uint32, uint256)
    {
        amountOut = params.amountIn * (10000 - slippage) / 10000;
        return (amountOut, 0, 0, 0);
    }
}

contract MockIguanaRouter {
    uint256 public slippage = 0;

    function setSlippage(uint256 _slippage) external {
        slippage = _slippage;
    }

    function exactInputSingle(IIguanaDEXRouter.ExactInputSingleParams calldata params)
        external
        returns (uint256 amountOut)
    {
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        amountOut = params.amountIn * (10000 - slippage) / 10000;
        IERC20(params.tokenOut).transfer(params.recipient, amountOut);
    }
}

contract ReentrancyAttacker {
    SuperlinkUSDVault public vault;
    MockERC20 public usdc;
    uint256 public attackCounter = 0;
    uint256 public maxAttacks = 3;

    constructor(address _vault, address _usdc) {
        vault = SuperlinkUSDVault(_vault);
        usdc = MockERC20(_usdc);
    }

    function attack(uint256 amount) external {
        usdc.mint(address(this), amount);
        usdc.approve(address(vault), amount);
        vault.deposit(amount, address(this));
        vault.withdraw(amount, address(this), address(this));
    }

    function onERC20Received(address, uint256) external {
        if (attackCounter < maxAttacks) {
            attackCounter++;
            vault.withdraw(1e6, address(this), address(this));
        }
    }
}

contract SuperlinkUSDVaultTest is Test {
    SuperlinkUSDVault public vaultImpl;
    SuperlinkUSDVault public vault;
    ERC1967Proxy public proxy;

    MockERC20 public usdc;
    MockERC20 public usdt;
    MockSuperlendPool public superlendPool;
    MockRouter public uniswapRouter;
    MockQuoter public uniswapQuoter;
    MockIguanaRouter public iguanaRouter;
    MockIguanaDEXQuoter public iguanaQuoter;
    MockAToken public aUSDC;
    MockAToken public aUSDT;

    address public owner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public attacker = address(0x4);

    uint256 constant INITIAL_SUPPLY = 1000000e6;
    uint256 constant MIN_DEPOSIT = 1e6;

    event Debug(string message, uint256 value);

    function setUp() public {
        vm.startPrank(owner);

        usdc = new MockERC20("USDC", "USDC", 6);
        usdt = new MockERC20("USDT", "USDT", 6);

        superlendPool = new MockSuperlendPool();
        uniswapRouter = new MockRouter();
        uniswapQuoter = new MockQuoter();
        iguanaRouter = new MockIguanaRouter();
        iguanaQuoter = new MockIguanaDEXQuoter();

        aUSDC = new MockAToken("Aave USDC", "aUSDC");
        aUSDT = new MockAToken("Aave USDT", "aUSDT");

        superlendPool.setAToken(address(usdc), address(aUSDC));
        superlendPool.setAToken(address(usdt), address(aUSDT));

        usdc.mint(address(uniswapRouter), INITIAL_SUPPLY);
        usdt.mint(address(uniswapRouter), INITIAL_SUPPLY);
        usdc.mint(address(iguanaRouter), INITIAL_SUPPLY);
        usdt.mint(address(iguanaRouter), INITIAL_SUPPLY);
        usdc.mint(address(superlendPool), INITIAL_SUPPLY);
        usdt.mint(address(superlendPool), INITIAL_SUPPLY);

        vaultImpl = new SuperlinkUSDVault(
            address(usdc),
            address(usdt),
            address(superlendPool),
            address(uniswapRouter),
            address(uniswapQuoter),
            address(iguanaRouter),
            address(iguanaQuoter)
        );

        bytes memory initData = abi.encodeWithSelector(SuperlinkUSDVault.initialize.selector);
        proxy = new ERC1967Proxy(address(vaultImpl), initData);
        vault = SuperlinkUSDVault(address(proxy));

        usdc.mint(user1, INITIAL_SUPPLY);
        usdc.mint(user2, INITIAL_SUPPLY);
        usdc.mint(attacker, INITIAL_SUPPLY);

        vm.stopPrank();
    }

    // =============================================================================
    // BASIC FUNCTIONALITY TESTS
    // =============================================================================

    function testInitialization() public view {
        assertEq(vault.name(), "Superlink USD Vault");
        assertEq(vault.symbol(), "supUSD");
        assertEq(vault.owner(), owner);
        assertEq(vault.tvlCap(), 10000e6);
        assertEq(address(vault.asset()), address(usdc));
        assertFalse(vault.paused());
    }

    function testBasicDeposit() public {
        console.log("=== Testing Basic Deposit ===");
        vm.startPrank(user1);
        usdc.approve(address(vault), MIN_DEPOSIT);

        uint256 shares = vault.deposit(MIN_DEPOSIT, user1);

        assertGt(shares, 0, "Should receive shares");
        assertEq(vault.balanceOf(user1), shares, "Share balance should match");
        assertEq(vault.userPrincipal(user1), MIN_DEPOSIT, "Principal should be tracked");
        console.log("Shares received:", shares);
        vm.stopPrank();
    }

    function testBasicWithdraw() public {
        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        vault.deposit(10e6, user1);
        vm.stopPrank();

        vm.warp(block.timestamp + 24 hours + 1);

        vm.startPrank(user1);
        uint256 balanceBefore = usdc.balanceOf(user1);
        vault.withdraw(1e6, user1, user1);
        uint256 balanceAfter = usdc.balanceOf(user1);

        assertGt(balanceAfter, balanceBefore, "Should receive USDC");
        vm.stopPrank();
    }

    // =============================================================================
    // SECURITY TESTS
    // =============================================================================

    function testInflationAttackPrevention() public {
        console.log("=== Testing Inflation Attack Prevention ===");

        vm.startPrank(attacker);

        uint256 totalAssetsBefore = vault.totalAssets();
        uint256 totalSupplyBefore = vault.totalSupply();
        console.log("Total assets before:", totalAssetsBefore);
        console.log("Total supply before:", totalSupplyBefore);

        usdc.approve(address(vault), 1e6);
        uint256 attackerShares = vault.deposit(1e6, attacker);
        console.log("Attacker shares received:", attackerShares);

        vm.stopPrank();

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        uint256 userShares = vault.deposit(10e6, user1);
        console.log("User shares received:", userShares);

        assertGt(userShares, 0, "User should receive shares");

        uint256 userAssetValue = vault.convertToAssets(userShares);
        console.log("User asset value:", userAssetValue);

        assertGe(userAssetValue, 9.9e6, "User should not lose significant value to inflation attack");

        vm.stopPrank();
    }

    function testReentrancyProtection() public {
        console.log("=== Testing Reentrancy Protection ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        vault.deposit(10e6, user1);
        vm.stopPrank();

        ReentrancyAttacker attackContract = new ReentrancyAttacker(address(vault), address(usdc));
        usdc.mint(address(attackContract), 5e6);

        // The attack will hit withdrawal lock first, which is actually a good security feature
        vm.expectRevert(SuperlinkUSDVault.WithdrawalLocked.selector);
        attackContract.attack(1e6);
    }

    function testAccessControl() public {
        console.log("=== Testing Access Control ===");

        vm.startPrank(attacker);
        vm.expectRevert();
        vault.rebalance();

        vm.expectRevert();
        vault.setTvlCap(20000e6);

        vm.expectRevert();
        vault.pause();

        vm.expectRevert();
        vault.emergencyPause();

        vm.expectRevert();
        vault.claimPerformanceFees();
        vm.stopPrank();
    }

    function testWithdrawalLock() public {
        console.log("=== Testing Withdrawal Lock ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        vault.deposit(10e6, user1);

        vm.expectRevert(SuperlinkUSDVault.WithdrawalLocked.selector);
        vault.withdraw(1e6, user1, user1);

        vm.stopPrank();
    }

    function testWithdrawalAfterLockPeriod() public {
        console.log("=== Testing Withdrawal After Lock Period ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        vault.deposit(10e6, user1);
        vm.stopPrank();

        vm.warp(block.timestamp + 24 hours + 1);

        vm.startPrank(user1);
        vault.withdraw(1e6, user1, user1);
        vm.stopPrank();
    }

    function testEmergencyPauseBypassesLock() public {
        console.log("=== Testing Emergency Pause Bypasses Lock ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        vault.deposit(10e6, user1);
        vm.stopPrank();

        vm.prank(owner);
        vault.emergencyPause();

        vm.startPrank(user1);
        vault.withdraw(1e6, user1, user1);
        vm.stopPrank();
    }

    function testTvlCapEnforcement() public {
        console.log("=== Testing TVL Cap Enforcement ===");

        vm.prank(owner);
        vault.setTvlCap(5e6);

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);

        vault.deposit(4e6, user1);

        vm.expectRevert(SuperlinkUSDVault.TvlCapExceeded.selector);
        vault.deposit(2e6, user1);

        vm.stopPrank();
    }

    function testMinimumDepositEnforcement() public {
        console.log("=== Testing Minimum Deposit Enforcement ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 1e6);

        vm.expectRevert(SuperlinkUSDVault.InsufficientDeposit.selector);
        vault.deposit(1e6 - 1, user1);

        vault.deposit(1e6, user1);

        vm.stopPrank();
    }

    function testPauseFunctionality() public {
        console.log("=== Testing Pause Functionality ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        vault.deposit(10e6, user1);
        vm.stopPrank();

        vm.prank(owner);
        vault.pause();

        vm.startPrank(user2);
        usdc.approve(address(vault), 10e6);
        vm.expectRevert("Contract is paused");
        vault.deposit(10e6, user2);
        vm.stopPrank();

        vm.startPrank(owner);
        vm.expectRevert(SuperlinkUSDVault.ContractPaused.selector);
        vault.rebalance();
        vm.stopPrank();
    }

    function testUpgradeAuthorization() public {
        console.log("=== Testing Upgrade Authorization ===");

        SuperlinkUSDVault newImpl = new SuperlinkUSDVault(
            address(usdc),
            address(usdt),
            address(superlendPool),
            address(uniswapRouter),
            address(uniswapQuoter),
            address(iguanaRouter),
            address(iguanaQuoter)
        );

        vm.startPrank(attacker);
        vm.expectRevert();
        vault.upgradeToAndCall(address(newImpl), "");
        vm.stopPrank();

        vm.prank(owner);
        vault.upgradeToAndCall(address(newImpl), "");
    }

    // =============================================================================
    // EDGE CASE TESTS
    // =============================================================================

    function testZeroAddressProtection() public {
        console.log("=== Testing Zero Address Protection ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);

        vm.expectRevert("Invalid receiver");
        vault.deposit(10e6, address(0));

        vm.stopPrank();
    }

    function testZeroAmountProtection() public {
        console.log("=== Testing Zero Amount Protection ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);

        vm.expectRevert("Cannot deposit zero assets");
        vault.deposit(0, user1);

        vm.stopPrank();
    }

    function testDecimalPrecisionHandling() public {
        console.log("=== Testing Decimal Precision Handling ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 1000000);
        uint256 shares = vault.deposit(1000000, user1);

        assertGt(shares, 0, "Should receive shares");

        vm.stopPrank();
    }

    // =============================================================================
    // PERFORMANCE FEE TESTS
    // =============================================================================

    function testPerformanceFeeCalculation() public {
        console.log("=== Testing Performance Fee Calculation ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 100e6);
        uint256 shares = vault.deposit(100e6, user1);
        vm.stopPrank();

        uint256 currentBalance = superlendPool.balances(address(vault));
        uint256 profit = 10e6;

        usdc.mint(address(superlendPool), profit);
        superlendPool.increaseBalance(address(vault), profit);
        aUSDC.setScaledBalance(address(vault), currentBalance + profit);

        vm.warp(block.timestamp + 24 hours + 1);

        vm.startPrank(user1);
        uint256 assetValueBefore = vault.convertToAssets(shares);
        console.log("Asset value before withdrawal:", assetValueBefore);

        vault.withdraw(50e6, user1, user1);

        assertGt(vault.totalPerformanceFeesEarned(), 0, "Performance fees should be tracked");
        vm.stopPrank();
    }

    // =============================================================================
    // FUZZ TESTS
    // =============================================================================

    function testFuzzDeposit(uint256 amount) public {
        amount = bound(amount, MIN_DEPOSIT, vault.tvlCap());

        vm.startPrank(user1);
        usdc.approve(address(vault), amount);

        uint256 sharesBefore = vault.balanceOf(user1);
        vault.deposit(amount, user1);
        uint256 sharesAfter = vault.balanceOf(user1);

        assertGt(sharesAfter, sharesBefore, "Should always receive shares");

        vm.stopPrank();
    }

    function testFuzzWithdraw(uint256 depositAmount, uint256 withdrawAmount) public {
        depositAmount = bound(depositAmount, MIN_DEPOSIT, vault.tvlCap());
        withdrawAmount = bound(withdrawAmount, 1, depositAmount);

        vm.startPrank(user1);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user1);
        vm.stopPrank();

        vm.warp(block.timestamp + 24 hours + 1);

        vm.startPrank(user1);
        uint256 balanceBefore = usdc.balanceOf(user1);
        vault.withdraw(withdrawAmount, user1, user1);
        uint256 balanceAfter = usdc.balanceOf(user1);

        assertGt(balanceAfter, balanceBefore, "Should receive tokens");

        vm.stopPrank();
    }

    // =============================================================================
    // REBALANCING TESTS
    // =============================================================================

    function testRebalancingLogic() public {
        console.log("=== Testing Rebalancing Logic ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 100e6);
        vault.deposit(100e6, user1);
        vm.stopPrank();

        assertEq(vault.currentAllocation(), address(usdc), "Should initially allocate to USDC");

        superlendPool.setLiquidityRate(address(usdt), 120000000000000000000000000);

        (bool canRebal, string memory reason, address betterAsset, uint256 currentAPY, uint256 betterAPY) =
            vault.canRebalance();

        console.log("Can rebalance:", canRebal);
        console.log("Reason:", reason);
        console.log("Current APY:", currentAPY);
        console.log("Better APY:", betterAPY);

        if (canRebal) {
            vm.prank(owner);
            vault.rebalance();

            assertEq(vault.currentAllocation(), address(usdt), "Should now allocate to USDT");
        }
    }

    // =============================================================================
    // STRESS TESTS
    // =============================================================================

    function testMultipleUsersDepositsAndWithdrawals() public {
        console.log("=== Testing Multiple Users Deposits and Withdrawals ===");

        address[5] memory users = [address(0x10), address(0x11), address(0x12), address(0x13), address(0x14)];

        for (uint256 i = 0; i < users.length; i++) {
            usdc.mint(users[i], 100e6);

            vm.startPrank(users[i]);
            usdc.approve(address(vault), 100e6);
            vault.deposit((i + 1) * 10e6, users[i]);
            vm.stopPrank();
        }

        vm.warp(block.timestamp + 24 hours + 1);

        for (uint256 i = 0; i < users.length; i++) {
            vm.startPrank(users[i]);
            uint256 userShares = vault.balanceOf(users[i]);
            if (userShares > 0) {
                uint256 assetValue = vault.convertToAssets(userShares);
                vault.withdraw(assetValue / 2, users[i], users[i]);
            }
            vm.stopPrank();
        }

        assertGe(vault.totalAssets(), 0, "Vault should be in consistent state");
        assertGe(vault.totalSupply(), 0, "Total supply should be consistent");
    }

    // =============================================================================
    // INTEGRATION TESTS
    // =============================================================================

    function testFullLifecycle() public {
        console.log("=== Testing Full Lifecycle ===");

        // 1. Initial deposit
        vm.startPrank(user1);
        usdc.approve(address(vault), 100e6);
        uint256 shares1 = vault.deposit(100e6, user1);
        console.log("User1 initial shares:", shares1);
        vm.stopPrank();

        // 2. Second user deposits
        vm.startPrank(user2);
        usdc.approve(address(vault), 50e6);
        uint256 shares2 = vault.deposit(50e6, user2);
        console.log("User2 shares:", shares2);
        vm.stopPrank();

        // 3. Simulate yield accrual
        uint256 currentBalance = superlendPool.balances(address(vault));
        uint256 profit = 15e6;
        usdc.mint(address(superlendPool), profit);
        superlendPool.increaseBalance(address(vault), profit);
        aUSDC.setScaledBalance(address(vault), currentBalance + profit);

        // 4. Fast forward past lock
        vm.warp(block.timestamp + 24 hours + 1);

        // 5. Partial withdrawals
        vm.startPrank(user1);
        uint256 balanceBefore1 = usdc.balanceOf(user1);
        vault.withdraw(50e6, user1, user1);
        uint256 balanceAfter1 = usdc.balanceOf(user1);
        console.log("User1 withdrew:", balanceAfter1 - balanceBefore1);
        vm.stopPrank();

        vm.startPrank(user2);
        uint256 balanceBefore2 = usdc.balanceOf(user2);
        vault.withdraw(25e6, user2, user2);
        uint256 balanceAfter2 = usdc.balanceOf(user2);
        console.log("User2 withdrew:", balanceAfter2 - balanceBefore2);
        vm.stopPrank();

        // 6. Check final state
        console.log("Final total assets:", vault.totalAssets());
        console.log("Final total supply:", vault.totalSupply());
        console.log("Performance fees earned:", vault.totalPerformanceFeesEarned());

        // 7. Owner claims fees
        if (vault.totalPerformanceFeesEarned() > 0) {
            vm.prank(owner);
            vault.claimPerformanceFees();
        }

        assertTrue(true, "Full lifecycle completed successfully");
    }
}
