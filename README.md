# 🚀 Superlink USD Vault - Etherlink Hackathon Submission


> **A production-ready autonomous yield optimization vault that showcases the full potential of Etherlink's DeFi ecosystem by integrating Superlend, Uniswap V3, and Iguana DEX to automatically maximize USDC/USDT yields.**

## 🏆 Etherlink Ecosystem Integration Highlights

### 🌐 **Etherlink Native Integration**
- **🎯 Live on Etherlink Mainnet** - Production deployment with real user funds ($2+ TVL)
- **🔗 Native RPC Integration** - Direct integration with Etherlink RPC endpoints
- **⛽ Gas Efficiency** - Transaction patterns utilizing Etherlink's fee structure
- **🔍 Explorer Integration** - Contract verified on Etherlink Explorer

### 🏦 **Superlend Protocol Integration** (Aave V3 Fork on Etherlink)
- **📈 Primary Yield Source** - Deposits funds into Superlend's USDC/USDT markets
- **🤖 APY Monitoring** - Fetches yield rates from Superlend's oracle system
- **💰 Automatic Rebalancing** - Switches between slUSDC and slUSDT based on Superlend rates
- **🔒 aToken Integration** - Holds interest-bearing slUSDC/slUSDT tokens from Superlend

### 🔄 **Multi-DEX Etherlink Ecosystem**
- **🦄 Uniswap V3 on Etherlink** - DEX integration for USDC/USDT swaps with concentrated liquidity
- **🦎 Iguana DEX Integration** - Etherlink DEX for route comparison and optimization
- **⚡ Quote Comparison** - Compares swap routes across both DEXes for execution
- **🎯 Pool Selection** - Chooses liquidity pools within each DEX for slippage optimization

### 🔧 **Etherlink Features**
- **📊 The Graph on Etherlink** - Custom subgraph indexing vault events for historical queries
- **🌍 Multi-Domain Architecture** - Frontend distributed across multiple domains
- **⚡ State Updates** - UI updates using Etherlink's block confirmation times
- **🔐 EIP-1271 Signature Support** - Wallet compatibility on Etherlink

## 🌟 Live Demo

- **🌐 Live Application**: [app.superlink.fun](https://app.superlink.fun)
- **👨‍💼 Admin Dashboard**: [admin.superlink.fun](https://admin.superlink.fun)
- **📱 Landing Page**: [superlink.fun](https://superlink.fun)
- **🔍 Contract Explorer**: [0xe60009...2A7AEAE6](https://explorer.etherlink.com/address/0xe60009Dd8017CC4f300f16655E337B382A7AEAE6)

## 🏗️ Etherlink-Native Architecture

### 📋 **Etherlink Ecosystem Protocols Integrated**

| Protocol | Role | Etherlink Address | Integration Type |
|----------|------|-------------------|------------------|
| **Superlend** | Primary yield source (Aave V3 fork) | `0x3bD16D195786fb2F509f2E2D7F69920262EF114D` | Native yield farming |
| **Uniswap V3** | DEX for USDC/USDT swaps | `0xdD489C75be1039ec7d843A6aC2Fd658350B067Cf` | Concentrated liquidity |
| **Iguana DEX** | Native Etherlink DEX | `0xE67B7D039b78DE25367EF5E69596075Bbd852BA9` | Route optimization |
| **The Graph** | Event indexing on Etherlink | Studio Subgraph | Historical data |

### 🔧 **Smart Contracts** (`/contracts`) - **Deployed on Etherlink Mainnet**
- **Main Contract**: `SuperlinkUSDVault.sol` - ERC-4626 compliant with Etherlink optimizations
- **Etherlink Deployment**: `0xe60009Dd8017CC4f300f16655E337B382A7AEAE6` (Verified on Etherlink Explorer)
- **Multi-Protocol Integration**: Direct calls to Superlend, Uniswap V3, and Iguana on Etherlink
- **Gas-Optimized**: Leverages Etherlink's low fees for frequent rebalancing operations
- **Proxy Pattern**: UUPS upgradeable using Etherlink's native upgrade mechanisms

### 🌐 **Frontend** (`/frontend`) - **Etherlink-Optimized UX**
- **RPC Integration**: Direct connection to `https://node.mainnet.etherlink.com`
- **Fast Finality**: UI updates leverage Etherlink's 1-second block confirmation
- **Multi-Domain**: Distributed across `superlink.fun`, `app.superlink.fun`, `admin.superlink.fun`
- **Etherlink Explorer**: Deep links to transaction details on `explorer.etherlink.com`
- **Tech Stack**: React 19, ethers.js (Etherlink-configured), RainbowKit with Etherlink support

### 📊 **Subgraph** (`/subgraph`) - **Etherlink Event Indexing**
- **The Graph Studio**: Custom subgraph deployed specifically for Etherlink network
- **Event Coverage**: All vault events (deposits, withdrawals, rebalances, admin actions)
- **Etherlink Block Tracking**: From deployment block `22446595` with full transaction context
- **Query Endpoint**: `https://api.studio.thegraph.com/query/117578/superlink-usd-vault/`

## 💡 Etherlink Ecosystem Innovations

### 🏦 **1. Superlend Integration Mastery**
```solidity
// Autonomous interaction with Superlend (Aave V3) on Etherlink
function _depositToSuperlend(address asset, uint256 amount) internal {
    IPool(SUPERLEND_POOL).supply(asset, amount, address(this), 0);
}

// Real-time APY comparison between slUSDC and slUSDT
function canRebalance() external view returns (bool profitable, address fromAsset, address toAsset, uint256 currentAPY, uint256 betterAPY)
```

### 🔄 **2. Multi-DEX Etherlink Optimization**
```solidity
// Compare quotes across Uniswap V3 and Iguana DEX on Etherlink
function _getBestSwapRoute(address tokenIn, address tokenOut, uint256 amountIn) 
    internal view returns (ISwapRouter router, uint256 amountOut, uint24 fee)
```
- **Uniswap V3 Concentrated Liquidity**: Uses 0.05%, 0.3%, and 1% fee tiers
- **Iguana DEX Integration**: Accesses Etherlink DEX for rate comparison
- **Quote Comparison**: Chooses route with <0.05% slippage tolerance
- **Pool Selection**: Selects liquidity pools for optimization

### ⛽ **3. Etherlink Gas Efficiency**
- **Batch Operations**: Multiple Superlend interactions in single transaction
- **Frequent Rebalancing**: Enabled by Etherlink's gas cost structure
- **Optimized Storage**: Gas-efficient state management for Etherlink

### 🚀 **4. DeFi Patterns on Etherlink**
- **ERC-4626 Tokenization**: Standard vault interface with Etherlink optimizations
- **Yield Compounding**: Automatic reinvestment of Superlend rewards
- **Emergency Liquidity**: Conversion to USDC during pause using Etherlink DEXes
- **Time-Lock Security**: 24-hour withdrawal delays with emergency bypass mechanisms

## 📈 Etherlink Performance Metrics

| Metric | Value | Etherlink Advantage |
|--------|-------|-------------------|
| **Live TVL** | $2+ USDC actively earning yield | Real production usage on Etherlink |
| **Yield Source** | Superlend (Aave V3 fork) | Native Etherlink lending protocol |
| **DEX Integration** | Uniswap V3 + Iguana DEX | Multi-DEX Etherlink ecosystem |
| **Max Slippage** | 0.05% for routing | Utilizes available Etherlink liquidity |
| **Block Finality** | 1-second confirmation | Etherlink consensus mechanism |
| **Gas Efficiency** | <$0.01 per rebalance | Etherlink's fee structure enables frequent optimization |
| **Query Performance** | <1 second activity history | The Graph on Etherlink |
| **Uptime** | 100% since deployment | Etherlink infrastructure |

## 🔧 Technical Implementation

### Smart Contract Addresses (Etherlink Mainnet)
```
Vault (Proxy):     0xe60009Dd8017CC4f300f16655E337B382A7AEAE6
Implementation:    0x631341f33500B84aB73bCC9e09f88f7D32CE496d
Admin:            0x421892ff736134d95d177cd716324df1d240c295
Deployment Block: 22446595 (Aug 2, 2025)
```

### **Etherlink Ecosystem Protocol Integrations**
```
🏦 SUPERLEND (Aave V3 Fork on Etherlink)
Pool:                  0x3bD16D195786fb2F509f2E2D7F69920262EF114D
Pool Configurator:     0x30F6880Bb1cF780a49eB4Ef64E64585780AAe060
Oracle:               0xeCF313dE38aA85EF618D06D1A602bAa917D62525
UI Data Provider:     0x9F9384Ef6a1A76AE1a95dF483be4b0214fda0Ef9

🦄 UNISWAP V3 (on Etherlink)
SwapRouter02:         0xdD489C75be1039ec7d843A6aC2Fd658350B067Cf
Factory:              0xcb2436774C3e191c85056d248EF4260ce5f27A9D
QuoterV2:            0xaa52bB8110fE38D0d2d2AF0B85C3A3eE622CA455
Universal Router:     0x9db70E29712Cc8Af10c2B597BaDA6784544FF407

🦎 IGUANA DEX (Native Etherlink)
SwapRouter:           0xE67B7D039b78DE25367EF5E69596075Bbd852BA9
Factory:              0x093cCBAEcb0E0006c8BfFca92E9929d117fEC583
QuoterV2:            0xaB26D8163eaF3Ac0c359E196D28837B496d40634
Smart Router:         0xbfe9C246A5EdB4F021C8910155EC93e7CfDaB7a0

💰 ETHERLINK TOKENS
USDC:                 0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9
USDT:                 0x2C03058C8AFC06713be23e58D2febC8337dbfE6A
slUSDC (Superlend):   0xd03bfdF9B26DB1e6764724d914d7c3d18106a9Fb
slUSDT (Superlend):   0x998098A1B2E95e2b8f15360676428EdFd976861f
```

### **The Graph on Etherlink**
```
📊 ETHERLINK SUBGRAPH
Endpoint: https://api.studio.thegraph.com/query/117578/superlink-usd-vault/v2.2.0-correct-deployment-block
Studio:   https://thegraph.com/studio/subgraph/superlink-usd-vault
Network:  Etherlink Mainnet (Chain ID: 42793)
Events:   Deposits, Withdrawals, Rebalances, Fee Claims, Admin Actions
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20.18.1+
- Foundry (for smart contracts)
- MetaMask or compatible wallet

### Quick Start
```bash
# Clone the repository
git clone https://github.com/enzomatencio/Superlink-Etherlink-Hackathon-Submission.git
cd Superlink-Etherlink-Hackathon-Submission

# Frontend Development
cd frontend
npm install
npm run dev

# Smart Contract Testing
cd ../contracts
forge install
forge test

# Subgraph Development
cd ../subgraph
npm install
npm run build
```

### **Etherlink Configuration**
```bash
# Frontend (.env) - Etherlink Mainnet
VITE_VAULT_ADDRESS=0xe60009Dd8017CC4f300f16655E337B382A7AEAE6
VITE_ADMIN_ADDRESS=0x421892ff736134d95d177cd716324df1d240c295
VITE_GRAPH_ENDPOINT=https://api.studio.thegraph.com/query/117578/superlink-usd-vault/v2.2.0-correct-deployment-block

# Etherlink Network Configuration
VITE_CHAIN_ID=42793
VITE_CHAIN_NAME="Etherlink Mainnet"
VITE_RPC_URL=https://node.mainnet.etherlink.com
VITE_EXPLORER_URL=https://explorer.etherlink.com

# Smart Contracts (.env) - Etherlink Deployment
ETHERLINK_MAINNET_RPC_URL=https://node.mainnet.etherlink.com
ETHERLINK_TESTNET_RPC_URL=https://node.ghostnet.etherlink.com
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key_for_verification
```

## 🔒 Security Features

### Smart Contract Security
- **ERC-4626 Standard**: Industry-standard vault interface
- **OpenZeppelin Upgradeable**: Latest security patterns
- **Reentrancy Protection**: Guards on all external functions
- **Access Control**: Owner-only administrative functions
- **Slippage Protection**: Maximum 0.05% slippage tolerance

### Operational Security
- **TVL Limits**: Risk management through deposit caps
- **Emergency Pause**: Circuit breaker for security events
- **Time Locks**: 24-hour withdrawal delays (bypassable during pause)
- **Multi-Signature Ready**: Upgradeable to multi-sig admin

## 📊 Testing & Verification

### Comprehensive Test Suite
```bash
# Run all tests
forge test

# Specific test categories
forge test --match-contract VaultTest     # Core vault functionality
forge test --match-contract SecurityTest  # Security and edge cases
forge test --match-contract IntegrationTest # External protocol tests
```

### **Etherlink Mainnet Testing Results**
- ✅ **Live Production Deployment**: Contract verified on Etherlink Explorer
- ✅ **Real User Funds**: $2+ USDC actively deposited and earning yield
- ✅ **Superlend Integration**: Confirmed earning live APY from Superlend protocol
- ✅ **Multi-DEX Optimization**: Verified optimal routing between Uniswap V3 and Iguana DEX
- ✅ **Emergency Controls**: Pause/unpause mechanisms tested with real transactions
- ✅ **Gas Efficiency**: Rebalancing costs <$0.01 on Etherlink
- ✅ **The Graph Indexing**: All events properly indexed from deployment block
- ✅ **Cross-Domain Frontend**: All three domains operational on Etherlink mainnet

## 🌍 Multi-Domain Frontend

### Domain Architecture
| Domain | Purpose | Target Users |
|--------|---------|--------------|
| `superlink.fun` | Landing page | General public |
| `app.superlink.fun` | Vault interface | DeFi users |
| `admin.superlink.fun` | Admin dashboard | Vault administrators |

### Key Features
- **Responsive Design**: Mobile-first approach
- **Real-Time Data**: Live blockchain integration
- **Activity History**: Complete transaction history via subgraph
- **Multi-Wallet Support**: MetaMask, WalletConnect, and more

## 📈 Business Model

### Revenue Streams
- **Performance Fees**: 15% of generated yield
- **No Management Fees**: Users keep 100% of principal
- **Transparent Costs**: All fees clearly displayed

### Value Proposition
- **Automated Optimization**: No manual rebalancing needed
- **Gas Efficiency**: Shared costs across all vault users
- **Professional Management**: Institutional-grade yield strategies
- **Risk Management**: Built-in safety mechanisms


## 🎯 **Etherlink Hackathon Achievements**

### 🏆 **What This Demonstrates for Etherlink**
- **🌟 Autonomous Vault**: Production-ready yield optimization built for Etherlink ecosystem
- **🔗 Protocol Integration**: Integrates Superlend + Uniswap V3 + Iguana DEX in unified vault
- **📊 Infrastructure**: Full-stack DeFi application showcasing Etherlink capabilities
- **💰 Real Economic Value**: Live vault managing real user funds on Etherlink mainnet
- **⚡ Etherlink Utilization**: Uses fee structure and finality for frequent rebalancing

### 🚀 **Technical Achievements**
- **Multi-Protocol Integration**: Integrates 3 major Etherlink protocols
- **Gas Efficiency**: Demonstrates cost-effective frequent rebalancing on Etherlink
- **User Experience**: Professional frontend with multi-domain architecture
- **Data Infrastructure**: Custom subgraph providing historical queries
- **Security Implementation**: Production-ready security with emergency controls

### 📈 **Impact on Etherlink Ecosystem**
- **Liquidity Aggregation**: Brings yield-seeking users to Superlend protocol
- **DEX Volume**: Generates trading volume across Uniswap V3 and Iguana DEX
- **Infrastructure Example**: Demonstrates DeFi patterns possible on Etherlink
- **Developer Resources**: Open-source reference implementation for future builders

## 📋 Project Structure

```
Superlink-Etherlink-Hackathon-Submission/
├── contracts/              # Smart contracts (Foundry)
│   ├── src/SuperlinkUSDVault.sol
│   ├── script/Deploy.s.sol
│   └── test/               # Comprehensive test suite
├── frontend/               # React application
│   ├── src/pages/          # Multi-domain pages
│   ├── src/components/     # Reusable components
│   └── src/config/         # Web3 configuration
├── subgraph/              # The Graph indexer
│   ├── schema.graphql     # Data schema
│   ├── src/vault.ts       # Event handlers
│   └── subgraph.yaml      # Subgraph configuration
└── README.md              # This file
```

## 📄 License & Legal

This project is developed for the Etherlink Hackathon. All code is provided for educational and demonstration purposes. Users should conduct their own due diligence before interacting with any smart contracts.

## 🔗 Links & Resources

- **Live Application**: [app.superlink.fun](https://app.superlink.fun)
- **Contract Address**: [0xe60009Dd8017CC4f300f16655E337B382A7AEAE6](https://explorer.etherlink.com/address/0xe60009Dd8017CC4f300f16655E337B382A7AEAE6)
- **The Graph Studio**: [superlink-usd-vault](https://thegraph.com/studio/subgraph/superlink-usd-vault)
- **Etherlink Explorer**: [explorer.etherlink.com](https://explorer.etherlink.com)

---

**Built with ❤️ for the Etherlink Hackathon**# Last updated: Sun Aug  3 13:31:29 CEST 2025
