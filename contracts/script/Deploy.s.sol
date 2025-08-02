// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/SuperlinkUSDVault.sol";

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

        console.log("=== SUPERLINK USD VAULT DEPLOYMENT ===");
        console.log("Network: Etherlink Mainnet");
        console.log("Deployer:", deployer);
        console.log("XTZ Balance:", deployer.balance);

        require(deployer.balance > 0.1 ether, "Insufficient XTZ for deployment");

        // Deploy implementation
        SuperlinkUSDVault implementation = new SuperlinkUSDVault(
            USDC_MAINNET, USDT_MAINNET, SUPERLEND_POOL, 
            UNISWAP_ROUTER, UNISWAP_QUOTER, IGUANA_ROUTER, IGUANA_QUOTER
        );

        console.log("Implementation deployed:", address(implementation));

        // Deploy proxy with initialization
        bytes memory initData = abi.encodeWithSelector(SuperlinkUSDVault.initialize.selector);
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);

        console.log("Proxy (Main Contract) deployed:", address(proxy));

        // Verify deployment
        SuperlinkUSDVault vault = SuperlinkUSDVault(address(proxy));
        console.log("Vault Name:", vault.name());
        console.log("Vault Symbol:", vault.symbol());
        console.log("Owner:", vault.owner());
        console.log("TVL Cap:", vault.tvlCap());
        console.log("Current Allocation:", vault.currentAllocation());
        console.log("Paused:", vault.paused());

        // Deployment verification
        require(vault.owner() == deployer, "Owner mismatch");
        require(vault.currentAllocation() == USDC_MAINNET, "Wrong initial allocation");
        require(vault.tvlCap() == 10000e6, "Wrong TVL cap");
        require(!vault.paused(), "Should not be paused");

        console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
        console.log("VAULT ADDRESS:", address(proxy));
        console.log("IMPLEMENTATION:", address(implementation));
        console.log("ADMIN:", vault.owner());

        vm.stopBroadcast();
    }
}