# Superlink USD Vault Smart Contracts

## Overview

The Superlink USD Vault is an ERC-4626 compliant tokenized vault that automatically optimizes yield by dynamically allocating between USDC and USDT on Etherlink mainnet through Superlend (Aave V3 fork).

## Deployed Contract

**Current Deployment (August 2, 2025):**
- **Vault (Proxy)**: `0xe60009Dd8017CC4f300f16655E337B382A7AEAE6` ✅ **LIVE**
- **Implementation**: `0x89AD4835ba1a67eaCa80c00Eaa2Fe87EdFF836E8`
- **Admin**: `0x421892ff736134d95d177cd716324df1d240c295`
- **Network**: Etherlink Mainnet (Chain ID: 42793)

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

# Deploy (unified deployment script)
forge script script/Deploy.s.sol:DeployScript --rpc-url $ETHERLINK_MAINNET_RPC_URL --broadcast

# Test on mainnet (comprehensive 13-step protocol)
VAULT_ADDRESS="<deployed-vault-address>" forge script script/MainnetTest.s.sol:MainnetTestScript --rpc-url $ETHERLINK_MAINNET_RPC_URL --broadcast
```

## Testing Protocol

**ALWAYS USE THE COMPREHENSIVE TESTING PROTOCOL AFTER DEPLOYMENT**

The project includes a mandatory 13-step testing protocol that must be executed after every deployment:

1. **Approve and Deposit 1 USDC** - Test basic deposit functionality
2. **Check Vault Allocation** - Verify accounting and asset allocation
3. **Test Performance Fee Claims** - Ensure fee mechanisms work
4. **Test 24-Hour Withdrawal Lock** - Verify time-based restrictions
5. **Check Withdrawal Timing** - Validate lock period tracking
6. **Emergency Pause and Withdraw** - Test emergency mechanisms
7. **Unpause and Re-deposit** - Verify recovery operations
8. **Test Rebalancing Logic** - Validate optimal routing between USDC/USDT
9. **Post-Rebalance State Check** - Confirm allocation changes
10. **Test Admin Fee Claims** - Verify admin control mechanisms
11. **Test Withdrawal Lock During Normal Operation** - Confirm restrictions
12. **Emergency Pause and Position Conversion** - Test position safety
13. **Test Minimum Deposit Threshold** - Validate input restrictions

This protocol ensures all security mechanisms, routing logic, and administrative controls function correctly in production.

## Environment Variables

```bash
ETHERLINK_MAINNET_RPC_URL=https://node.mainnet.etherlink.com
PRIVATE_KEY=your_private_key_here
VAULT_ADDRESS=0xe60009Dd8017CC4f300f16655E337B382A7AEAE6
```

## Security Features

- **Upgradeable Proxy**: UUPS pattern for safe upgrades
- **Access Control**: Onlyowner functions for critical operations
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Pause Mechanism**: Emergency pause functionality
- **Slippage Protection**: Configurable slippage tolerance for swaps

## Project Structure

The contracts have been cleaned up and streamlined:

```
contracts/
├── src/
│   ├── SuperlinkUSDVault.sol          # Main vault contract
│   └── interfaces/                     # External protocol interfaces
│       ├── ISuperlendPool.sol
│       ├── ISwapRouter02.sol
│       ├── IIguanaDEXRouter.sol
│       └── IQuoterV2.sol
├── script/
│   ├── Deploy.s.sol                   # Unified deployment script
│   └── MainnetTest.s.sol              # Comprehensive testing protocol
├── lib/                               # Foundry dependencies
└── foundry.toml                       # Build configuration
```

**Note**: All mock test files have been removed to maintain a clean, production-focused codebase. Only the unified deployment and testing scripts remain.

## Contract Verification

The contract is verified on Etherlink Explorer with full source code and ABI available.