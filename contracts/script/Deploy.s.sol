// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SuperlinkUSDVault.sol";

// Simple deployment script for implementation-only (not recommended for production)
// Use DeployProxy.s.sol for production deployment with proxy pattern
contract DeployScript is Script {
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
        
        console.log("=== WARNING: Simple Deployment (No Proxy) ===");
        console.log("This deployment is NOT upgradeable!");
        console.log("For production, use: forge script script/DeployProxy.s.sol");
        console.log("\nDeploying SuperlinkUSDVault implementation...");
        console.log("Deployer address:", deployer);
        
        // Deploy the vault implementation
        SuperlinkUSDVault vault = new SuperlinkUSDVault(
            USDC_MAINNET,
            USDT_MAINNET,
            SUPERLEND_POOL,
            UNISWAP_ROUTER,
            UNISWAP_QUOTER,
            IGUANA_ROUTER,
            IGUANA_QUOTER
        );
        
        console.log("\nSuperlinkUSDVault implementation deployed at:", address(vault));
        
        // NOTE: Cannot initialize implementation directly as it's upgradeable
        // For testing only, would need proxy in production
        console.log("\nNOTE: This contract needs to be initialized before use!");
        console.log("Call initialize() function after deployment or use proxy deployment.");
        
        console.log("\n=== Deployment Summary (Implementation Only) ===");
        console.log("SuperlinkUSDVault Implementation:", address(vault));
        console.log("USDC:", USDC_MAINNET);
        console.log("USDT:", USDT_MAINNET);
        console.log("Superlend Pool:", SUPERLEND_POOL);
        console.log("Uniswap Router:", UNISWAP_ROUTER);
        console.log("Uniswap Quoter:", UNISWAP_QUOTER);
        console.log("Iguana Router:", IGUANA_ROUTER);
        console.log("Iguana Quoter:", IGUANA_QUOTER);
        console.log("\nWARNING: Use proxy deployment for production!");
        
        vm.stopBroadcast();
    }
    
}