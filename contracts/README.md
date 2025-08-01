# Superlink USD Vault Smart Contracts

## Overview

The Superlink USD Vault is an ERC-4626 compliant tokenized vault that automatically optimizes yield by dynamically allocating between USDC and USDT on Etherlink mainnet through Superlend (Aave V3 fork).

## Deployed Contract

**Current Deployment:** `0x1F2C64c792ea49991D5efd350B15c0e043e402Ce` (Etherlink Mainnet)

## Features

- **ERC-4626 Standard**: Full compliance with tokenized vault standard
- **Dynamic Rebalancing**: Automatically switches between USDC/USDT for optimal APY
- **Dual DEX Integration**: Uses both Uniswap V3 and Iguana DEX for best swap rates
- **Performance Fees**: 15% performance fee on generated yield
- **Security**: Pausable, upgradeable proxy pattern with ReentrancyGuard
- **TVL Cap**: 10,000 USDC maximum to manage risk
- **Minimum Deposit**: 1 USDC to prevent dust attacks

## Architecture

### Core Components

1. **SuperlinkUSDVault.sol**: Main vault contract implementing ERC-4626
2. **Interfaces**: Clean interface definitions for external protocols
   - `ISuperlendPool.sol`: Superlend (Aave V3) integration
   - `ISwapRouter02.sol`: Uniswap V3 router interface
   - `IIguanaDEXRouter.sol`: Iguana DEX router interface
   - `IQuoterV2.sol`: Price quoter interface

### External Integrations

- **Superlend Protocol**: Yield generation through lending
- **Uniswap V3**: DEX for token swaps
- **Iguana DEX**: Alternative DEX for optimal routing

## Build & Deploy

```bash
# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test

# Deploy (requires environment variables)
forge script script/DeployProxy.s.sol --rpc-url $RPC_URL --broadcast --verify
```

## Environment Variables

```bash
ETHERLINK_MAINNET_RPC_URL=https://node.mainnet.etherlink.com
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_explorer_api_key
```

## Security Features

- **Upgradeable Proxy**: UUPS pattern for safe upgrades
- **Access Control**: Onlyowner functions for critical operations
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Pause Mechanism**: Emergency pause functionality
- **Slippage Protection**: Configurable slippage tolerance for swaps

## Contract Verification

The contract is verified on Etherlink Explorer with full source code and ABI available.