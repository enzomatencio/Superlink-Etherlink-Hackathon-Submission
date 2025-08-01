// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/SuperlinkUSDVault.sol";
import "../src/interfaces/ISuperlendPool.sol";

contract DeployProxyScript is Script {
    // Etherlink Mainnet contract addresses
    address constant USDC_MAINNET = 0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9;
    address constant USDT_MAINNET = 0x2C03058C8AFC06713be23e58D2febC8337dbfE6A;
    address constant SUPERLEND_POOL = 0x3bD16D195786fb2F509f2E2D7F69920262EF114D;
    address constant UNISWAP_ROUTER = 0xdD489C75be1039ec7d843A6aC2Fd658350B067Cf;
    address constant UNISWAP_QUOTER = 0xaa52bB8110fE38D0d2d2AF0B85C3A3eE622CA455;
    address constant IGUANA_ROUTER = 0xE67B7D039b78DE25367EF5E69596075Bbd852BA9;
    address constant IGUANA_QUOTER = 0xaB26D8163eaF3Ac0c359E196D28837B496d40634;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Etherlink Mainnet Deployment ===");
        console.log("Deploying SuperlinkUSDVault with proxy pattern...");
        console.log("Deployer address:", deployer);
        console.log("Network: Etherlink Mainnet");
        
        // Verify we have enough XTZ for deployment
        require(deployer.balance > 0.1 ether, "Insufficient XTZ balance for deployment");
        console.log("Deployer XTZ balance:", deployer.balance);
        
        // 1. Deploy implementation contract
        SuperlinkUSDVault implementation = new SuperlinkUSDVault(
            USDC_MAINNET,
            USDT_MAINNET,
            SUPERLEND_POOL,
            UNISWAP_ROUTER,
            UNISWAP_QUOTER,
            IGUANA_ROUTER,
            IGUANA_QUOTER
        );
        
        console.log("Implementation deployed at:", address(implementation));
        
        // 2. Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            SuperlinkUSDVault.initialize.selector
        );
        
        // 3. Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        
        console.log("Proxy deployed at:", address(proxy));
        
        // 4. Cast proxy to vault interface
        SuperlinkUSDVault vault = SuperlinkUSDVault(address(proxy));
        
        // 5. Verify deployment
        console.log("=== Deployment Verification ===");
        console.log("Vault Name:", vault.name());
        console.log("Vault Symbol:", vault.symbol());
        console.log("Owner:", vault.owner());
        console.log("Current Allocation:", vault.currentAllocation());
        console.log("TVL Cap:", vault.tvlCap());
        console.log("Paused:", vault.paused());
        
        // 6. Verify proxy setup
        require(vault.owner() == deployer, "Owner mismatch");
        require(vault.currentAllocation() == USDC_MAINNET, "Initial allocation should be USDC");
        require(vault.tvlCap() == 10000e6, "TVL cap should be 10,000 USDC");
        require(!vault.paused(), "Vault should not be paused");
        
        // 7. Verify protocol integrations
        console.log("=== Protocol Integration Checks ===");
        try vault.canRebalance() returns (bool canRebal, string memory reason, address betterAsset, uint256 currentAPY, uint256 betterAPY) {
            console.log("Rebalance check successful:", canRebal);
            console.log("Reason:", reason);
            console.log("Current APY:", currentAPY);
            console.log("Better APY:", betterAPY);
        } catch {
            console.log("Warning: Rebalance check failed - may indicate protocol integration issues");
        }
        
        // 8. Final deployment summary
        console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
        console.log("Network: Etherlink Mainnet");
        console.log("Proxy address (MAIN CONTRACT):", address(proxy));
        console.log("Implementation address:", address(implementation));
        console.log("Owner:", vault.owner());
        console.log("\nNext steps:");
        console.log("1. Save the proxy address for frontend integration");
        console.log("2. Test with small deposits first");
        console.log("3. Monitor rebalancing opportunities");
        console.log("4. Consider increasing TVL cap after testing");
        
        vm.stopBroadcast();
        
        // 9. Deployment info (file write disabled to avoid script failures)
        console.log("\nDeployment completed successfully!");
        console.log("Save these addresses for frontend integration:");
    }
}