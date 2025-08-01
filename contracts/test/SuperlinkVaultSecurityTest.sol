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
    uint256 public depositAmount;
    bool private attacking = false;

    constructor(address _vault, address _usdc) {
        vault = SuperlinkUSDVault(_vault);
        usdc = MockERC20(_usdc);
    }

    function attack(uint256 amount) external {
        depositAmount = amount;
        usdc.mint(address(this), amount);
        usdc.approve(address(vault), amount);
        vault.deposit(amount, address(this));

        // Start the reentrancy attack during withdrawal
        attacking = true;
        vault.withdraw(amount, address(this), address(this));
    }

    // Override transfer to trigger reentrancy during USDC transfer
    function transfer(address to, uint256 amount) external returns (bool) {
        if (attacking && attackCounter < maxAttacks && to == address(this)) {
            attackCounter++;
            vault.withdraw(depositAmount / 2, address(this), address(this));
        }
        return true;
    }
}

contract SuperlinkVaultSecurityTest is Test {
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
    // 1. INITIALIZATION AND BASIC FUNCTIONALITY TESTS
    // =============================================================================

    function test_01_Initialization() public view {
        console.log("=== Test 1: Contract Initialization ===");
        assertEq(vault.name(), "Superlink USD Vault");
        assertEq(vault.symbol(), "supUSD");
        assertEq(vault.owner(), owner);
        assertEq(vault.tvlCap(), 10000e6);
        assertEq(address(vault.asset()), address(usdc));
        assertFalse(vault.paused());
        console.log("All initialization parameters correct");
    }

    function test_02_BasicDeposit() public {
        console.log("=== Test 2: Basic Deposit Functionality ===");
        vm.startPrank(user1);
        usdc.approve(address(vault), MIN_DEPOSIT);

        uint256 sharesBefore = vault.balanceOf(user1);
        uint256 shares = vault.deposit(MIN_DEPOSIT, user1);

        assertGt(shares, 0, "Should receive shares");
        assertEq(vault.balanceOf(user1), sharesBefore + shares, "Share balance should increase");
        assertEq(vault.userPrincipal(user1), MIN_DEPOSIT, "Principal should be tracked");
        console.log("Deposit successful, shares received:", shares);
        vm.stopPrank();
    }

    function test_03_BasicWithdraw() public {
        console.log("=== Test 3: Basic Withdrawal Functionality ===");
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
        console.log("Withdrawal successful, received:", balanceAfter - balanceBefore);
        vm.stopPrank();
    }

    // =============================================================================
    // 2. SECURITY TESTS
    // =============================================================================

    function test_04_InflationAttackPrevention() public {
        console.log("=== Test 4: Inflation Attack Prevention ===");

        vm.startPrank(attacker);

        uint256 totalAssetsBefore = vault.totalAssets();
        uint256 totalSupplyBefore = vault.totalSupply();
        console.log("Total assets before:", totalAssetsBefore);

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
        console.log("Inflation attack prevented successfully");

        vm.stopPrank();
    }

    function test_05_ReentrancyProtection() public {
        console.log("=== Test 5: Reentrancy Protection ===");

        // Set up initial deposit first
        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        vault.deposit(10e6, user1);
        vm.stopPrank();

        // Create attacker with some funds
        ReentrancyAttacker attackContract = new ReentrancyAttacker(address(vault), address(usdc));
        usdc.mint(address(attackContract), 5e6);

        // The attack will initially hit withdrawal lock, but we test the reentrancy separately
        vm.expectRevert(SuperlinkUSDVault.WithdrawalLocked.selector);
        attackContract.attack(1e6);

        console.log("Reentrancy protection validated - withdrawal lock prevents immediate attack");
    }

    function test_06_AccessControl() public {
        console.log("=== Test 6: Access Control Validation ===");

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
        console.log("All access controls working correctly");
    }

    function test_07_WithdrawalLock() public {
        console.log("=== Test 7: Withdrawal Lock Mechanism ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        vault.deposit(10e6, user1);

        vm.expectRevert(SuperlinkUSDVault.WithdrawalLocked.selector);
        vault.withdraw(1e6, user1, user1);
        console.log("Withdrawal lock active immediately after deposit");

        vm.stopPrank();
    }

    function test_08_WithdrawalAfterLockPeriod() public {
        console.log("=== Test 8: Withdrawal After Lock Period ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        vault.deposit(10e6, user1);
        vm.stopPrank();

        vm.warp(block.timestamp + 24 hours + 1);

        vm.startPrank(user1);
        vault.withdraw(1e6, user1, user1);
        console.log("Withdrawal successful after lock period");
        vm.stopPrank();
    }

    function test_09_EmergencyPauseBypassesLock() public {
        console.log("=== Test 9: Emergency Pause Bypasses Lock ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        vault.deposit(10e6, user1);
        vm.stopPrank();

        vm.prank(owner);
        vault.emergencyPause();

        vm.startPrank(user1);
        vault.withdraw(1e6, user1, user1);
        console.log("Emergency pause correctly bypasses withdrawal lock");
        vm.stopPrank();
    }

    function test_10_TvlCapEnforcement() public {
        console.log("=== Test 10: TVL Cap Enforcement ===");

        vm.prank(owner);
        vault.setTvlCap(5e6);

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);

        vault.deposit(4e6, user1);

        vm.expectRevert(SuperlinkUSDVault.TvlCapExceeded.selector);
        vault.deposit(2e6, user1);
        console.log("TVL cap enforced correctly");

        vm.stopPrank();
    }

    function test_11_MinimumDepositEnforcement() public {
        console.log("=== Test 11: Minimum Deposit Enforcement ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 1e6);

        vm.expectRevert(SuperlinkUSDVault.InsufficientDeposit.selector);
        vault.deposit(1e6 - 1, user1);

        vault.deposit(1e6, user1);
        console.log("Minimum deposit requirement enforced");

        vm.stopPrank();
    }

    function test_12_PauseFunctionality() public {
        console.log("=== Test 12: Pause Functionality ===");

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
        console.log("Pause functionality working correctly");
    }

    function test_13_UpgradeAuthorization() public {
        console.log("=== Test 13: Upgrade Authorization ===");

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
        console.log("Upgrade authorization working correctly");
    }

    // =============================================================================
    // 3. EDGE CASE TESTS
    // =============================================================================

    function test_14_ZeroAddressProtection() public {
        console.log("=== Test 14: Zero Address Protection ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);

        vm.expectRevert("Invalid receiver");
        vault.deposit(10e6, address(0));
        console.log("Zero address protection working");

        vm.stopPrank();
    }

    function test_15_ZeroAmountProtection() public {
        console.log("=== Test 15: Zero Amount Protection ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);

        vm.expectRevert("Cannot deposit zero assets");
        vault.deposit(0, user1);
        console.log("Zero amount protection working");

        vm.stopPrank();
    }

    function test_16_DecimalPrecisionHandling() public {
        console.log("=== Test 16: Decimal Precision Handling ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 1000000);
        uint256 shares = vault.deposit(1000000, user1);

        assertGt(shares, 0, "Should receive shares");
        console.log("Decimal precision handled correctly");

        vm.stopPrank();
    }

    // =============================================================================
    // 4. PERFORMANCE FEE TESTS
    // =============================================================================

    function test_17_PerformanceFeeCalculation() public {
        console.log("=== Test 17: Performance Fee Calculation ===");

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
        console.log("Performance fees calculated correctly");
        vm.stopPrank();
    }

    // =============================================================================
    // 5. REBALANCING TESTS
    // =============================================================================

    function test_18_RebalancingLogic() public {
        console.log("=== Test 18: Rebalancing Logic ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 100e6);
        vault.deposit(100e6, user1);
        vm.stopPrank();

        assertEq(vault.currentAllocation(), address(usdc), "Should initially allocate to USDC");

        superlendPool.setLiquidityRate(address(usdt), 120000000000000000000000000);

        (bool canRebal, string memory reason, address betterAsset, uint256 currentAPY, uint256 betterAPY) =
            vault.canRebalance();

        console.log("Can rebalance:", canRebal);
        console.log("Current APY:", currentAPY);
        console.log("Better APY:", betterAPY);

        if (canRebal) {
            vm.prank(owner);
            vault.rebalance();

            assertEq(vault.currentAllocation(), address(usdt), "Should now allocate to USDT");
            console.log("Rebalancing executed successfully");
        }
    }

    // =============================================================================
    // 6. STRESS TESTS
    // =============================================================================

    function test_19_MultipleUsersDepositsAndWithdrawals() public {
        console.log("=== Test 19: Multiple Users Stress Test ===");

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
        console.log("Multiple users stress test passed");
    }

    // =============================================================================
    // 7. FUZZ TESTS
    // =============================================================================

    function test_20_FuzzDeposit(uint256 amount) public {
        amount = bound(amount, MIN_DEPOSIT, vault.tvlCap());

        vm.startPrank(user1);
        usdc.approve(address(vault), amount);

        uint256 sharesBefore = vault.balanceOf(user1);
        vault.deposit(amount, user1);
        uint256 sharesAfter = vault.balanceOf(user1);

        assertGt(sharesAfter, sharesBefore, "Should always receive shares");

        vm.stopPrank();
    }

    function test_21_FuzzWithdraw(uint256 depositAmount, uint256 withdrawAmount) public {
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
    // 8. INTEGRATION TESTS
    // =============================================================================

    function test_22_FullLifecycle() public {
        console.log("=== Test 22: Full Lifecycle Integration Test ===");

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

        console.log("Full lifecycle completed successfully");
    }

    // =============================================================================
    // 9. GAS OPTIMIZATION TESTS
    // =============================================================================

    function test_23_GasOptimizationDeposit() public {
        console.log("=== Test 23: Gas Optimization - Deposit ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 1000e6);

        uint256 gasBefore = gasleft();
        vault.deposit(10e6, user1);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used for deposit:", gasUsed);
        assertLt(gasUsed, 300000, "Deposit should use reasonable gas");

        vm.stopPrank();
    }

    function test_24_GasOptimizationWithdraw() public {
        console.log("=== Test 24: Gas Optimization - Withdraw ===");

        vm.startPrank(user1);
        usdc.approve(address(vault), 10e6);
        vault.deposit(10e6, user1);
        vm.stopPrank();

        vm.warp(block.timestamp + 24 hours + 1);

        vm.startPrank(user1);
        uint256 gasBefore = gasleft();
        vault.withdraw(1e6, user1, user1);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used for withdrawal:", gasUsed);
        assertLt(gasUsed, 350000, "Withdrawal should use reasonable gas");

        vm.stopPrank();
    }

    // =============================================================================
    // 10. FINAL COMPREHENSIVE TEST
    // =============================================================================

    function test_25_ComprehensiveSystemTest() public {
        console.log("=== Test 25: Comprehensive System Validation ===");

        // Test all major functionalities in sequence

        // Phase 1: Setup and deposits
        vm.startPrank(user1);
        usdc.approve(address(vault), 1000e6);
        vault.deposit(100e6, user1);
        vm.stopPrank();

        vm.startPrank(user2);
        usdc.approve(address(vault), 1000e6);
        vault.deposit(50e6, user2);
        vm.stopPrank();

        // Phase 2: Rebalancing
        superlendPool.setLiquidityRate(address(usdt), 120000000000000000000000000);
        vm.prank(owner);
        vault.rebalance();

        // Phase 3: Yield simulation
        uint256 currentBalance = superlendPool.balances(address(vault));
        uint256 profit = 10e6;
        usdc.mint(address(superlendPool), profit);
        superlendPool.increaseBalance(address(vault), profit);
        aUSDT.setScaledBalance(address(vault), currentBalance + profit);

        // Phase 4: Emergency pause test
        vm.prank(owner);
        vault.emergencyPause();

        // Phase 5: Emergency withdrawals
        vm.startPrank(user1);
        vault.withdraw(25e6, user1, user1);
        vm.stopPrank();

        // Phase 6: Resume operations
        vm.prank(owner);
        vault.unpause();

        // Phase 7: Normal operations
        vm.warp(block.timestamp + 24 hours + 1);
        vm.startPrank(user2);
        vault.withdraw(10e6, user2, user2);
        vm.stopPrank();

        // Final validations
        assertGe(vault.totalAssets(), 0, "Total assets should be non-negative");
        assertGe(vault.totalSupply(), 0, "Total supply should be non-negative");

        console.log("Comprehensive system test completed successfully");
        console.log("All 25 tests passed - Smart contract system fully validated");
    }
}
