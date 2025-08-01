# Superlink: Autonomous USD Yield Vault

**Etherlink Hackathon Submission - DeFi Category**

Superlink is an autonomous yield optimization vault that maximizes returns on USD stablecoins through intelligent allocation between USDC and USDT on the Etherlink blockchain.

## 🎯 Project Overview

Superlink automatically monitors yield rates across different stablecoin lending pools on Superlend (Aave V3 fork) and dynamically rebalances between USDC and USDT to capture the highest available APY. Users deposit stablecoins and receive supUSD tokens representing their share of the optimized yield-generating vault.

### Key Features

- **🔄 Autonomous Rebalancing**: Automatically switches between USDC/USDT for optimal yields
- **📊 Real-time APY Optimization**: Continuous monitoring of Superlend rates
- **🛡️ Security First**: Upgradeable proxy, reentrancy protection, emergency pause
- **💡 Dual DEX Integration**: Uses both Uniswap V3 and Iguana DEX for best swap rates
- **📈 Performance Fees**: 15% fee on generated yield
- **🏦 TVL Management**: 10,000 USDC maximum for risk management
- **⚡ Ultra-fast UI**: Powered by The Graph for instant activity history

## 🏗️ Architecture

### Smart Contracts (`/contracts`)
- **SuperlinkUSDVault.sol**: ERC-4626 compliant vault with autonomous rebalancing
- **Deployment**: `0x1F2C64c792ea49991D5efd350B15c0e043e402Ce` (Etherlink Mainnet)
- **Security**: OpenZeppelin upgradeable contracts, comprehensive testing

### Frontend (`/frontend`)
- **Landing**: superlink.fun - Project overview and marketing
- **App**: app.superlink.fun - Main vault interface
- **Admin**: admin.superlink.fun - Administrative dashboard
- **Technology**: React + TypeScript, TailwindCSS, ethers.js

### Subgraph (`/subgraph`)
- **Indexing**: All vault events (deposits, withdrawals, rebalances)
- **Performance**: Sub-second query times via The Graph Protocol
- **Endpoint**: Studio deployment on Etherlink

## 🚀 Live Demo

- **Website**: [superlink.fun](https://superlink.fun)
- **App**: [app.superlink.fun](https://app.superlink.fun)  
- **Explorer**: [Etherlink Explorer](https://explorer.etherlink.com/address/0x1F2C64c792ea49991D5efd350B15c0e043e402Ce)
- **Subgraph**: [The Graph Studio](https://thegraph.com/studio/subgraph/superlink-usd-vault)

## 📊 Current Metrics

- **TVL**: 1.0 USDC
- **Current APY**: 4.4% (USDC allocation)
- **Alternative APY**: 8.16% (USDT available)
- **Performance**: Rebalancing profitable (+3.76% potential gain)
- **Status**: Fully operational and tested on mainnet

## 💻 Technical Implementation

### Smart Contract Features
- **ERC-4626 Standard**: Full compliance with tokenized vault standard
- **Dynamic Allocation**: Real-time APY comparison and automatic rebalancing
- **Multi-DEX Routing**: Optimal swap paths via Uniswap V3 and Iguana DEX
- **Risk Management**: TVL caps, minimum deposits, slippage protection

### Frontend Features
- **Multi-Wallet Support**: WalletConnect, MetaMask, Rainbow, Coinbase
- **Real-time Data**: Direct blockchain integration for accurate metrics
- **Responsive Design**: Optimized for desktop and mobile
- **Activity History**: Complete transaction tracking via subgraph

### Subgraph Features
- **Event Indexing**: Deposits, withdrawals, rebalances, admin actions
- **Fast Queries**: Optimized GraphQL schema for UI performance
- **Real-time Sync**: Automatic updates within ~1 minute

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- Foundry (for contracts)
- Graph CLI (for subgraph)

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-username/Superlink-Etherlink-Hackathon-Submission.git
cd Superlink-Etherlink-Hackathon-Submission

# Smart Contracts
cd contracts
forge install
forge build
forge test

# Frontend
cd ../frontend
npm install
npm run dev

# Subgraph
cd ../subgraph
npm install
npm run codegen
npm run build
```

## 🧪 Testing & Verification

### Smart Contract Testing
- **Unit Tests**: Comprehensive test suite covering all functionality
- **Mainnet Fork Tests**: Real environment testing against live protocols
- **Edge Case Testing**: Rebalancing, slippage, error conditions
- **Security Testing**: Reentrancy, access control, upgrade safety

### Live Testing Results
✅ All core functions tested on Etherlink mainnet with real funds  
✅ APY calculation matches Superlend rates (4.4% USDC, 8.16% USDT)  
✅ Rebalancing logic correctly identifies profitable opportunities  
✅ Deposit/withdrawal functionality working correctly  
✅ Performance fees calculated accurately  

## 🛡️ Security Measures

- **Proxy Pattern**: UUPS upgradeable contracts for bug fixes
- **Access Control**: Owner-only functions for critical operations  
- **Reentrancy Guards**: Protection against reentrancy attacks
- **Pause Mechanism**: Emergency stop functionality
- **TVL Limits**: Maximum deposit caps for risk management
- **Slippage Protection**: Configurable slippage tolerance

## 📈 Tokenomics

- **Token Symbol**: supUSD
- **Base Assets**: USDC, USDT
- **Performance Fee**: 15% on generated yield
- **Minimum Deposit**: 1 USDC
- **Maximum TVL**: 10,000 USDC

## 🌟 Innovation Highlights

1. **Autonomous Yield Optimization**: First fully autonomous stablecoin vault on Etherlink
2. **Dual Protocol Integration**: Seamless Superlend + DEX integration
3. **Real-time Decision Making**: Dynamic rebalancing based on live market data
4. **User-Centric Design**: Simple deposit/withdraw with automatic optimization
5. **Etherlink Native**: Built specifically for Etherlink's fast, low-cost environment

## 🏆 Hackathon Category: DeFi

Superlink represents a significant advancement in DeFi yield optimization:

- **Innovation**: Autonomous rebalancing without user intervention
- **Technical Excellence**: Clean architecture, comprehensive testing, security-first design
- **User Experience**: Simple interface hiding complex yield optimization
- **Etherlink Integration**: Leverages Etherlink's speed and cost advantages
- **Real Value**: Generates actual yield optimization for users

## 🔗 External Integrations

- **Superlend Protocol**: Aave V3 fork for yield generation
- **Uniswap V3**: Decentralized exchange for token swaps
- **Iguana DEX**: Alternative DEX for optimal routing
- **The Graph**: Decentralized indexing for activity history
- **WalletConnect**: Multi-wallet connectivity

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This hackathon submission represents a complete, production-ready DeFi protocol. The codebase is clean, well-documented, and ready for community contribution and further development.

---

**Built for Etherlink Hackathon 2025**  
*Autonomous yield optimization made simple*