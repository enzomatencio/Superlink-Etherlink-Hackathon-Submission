# 🏦 Superlink USD Vault - Autonomous Yield Optimization

> **Etherlink Hackathon Submission - Production-Ready Autonomous DeFi Yield Vault**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-green.svg)
![Network](https://img.shields.io/badge/Network-Etherlink_Mainnet-orange.svg)
![Status](https://img.shields.io/badge/Status-Live_Production-brightgreen.svg)

**Superlink USD Vault** is an intelligent ERC-4626 compliant vault that autonomously maximizes USD stablecoin yields by dynamically rebalancing between USDC and USDT based on real-time APY differentials on Etherlink mainnet.

## 🎯 What Makes This Special

- 🤖 **Fully Autonomous**: Automatically rebalances between USDC/USDT when APY difference >1%
- 🔄 **Multi-DEX Optimization**: Routes through Uniswap V3 and Iguana DEX for best execution
- 🛡️ **Production Security**: UUPS upgradeable proxy with comprehensive safety measures
- ⚡ **Ultra-Fast Queries**: The Graph subgraph for instant activity history
- 💎 **ERC-4626 Standard**: Professional vault tokenization with 1:1 deposit ratios
- 🚨 **Emergency Controls**: Circuit breaker functionality with 24-hour withdrawal locks

## 🏗️ Live Production Infrastructure

### 📄 Smart Contracts (Etherlink Mainnet)
- **🏦 Vault Address**: [`0x6183E7BdCBa7eA6b009A52e4f01409dA7107954F`](https://explorer.etherlink.com/address/0x6183E7BdCBa7eA6b009A52e4f01409dA7107954F)
- **📦 Implementation**: `0x9AB2DBbC8565838A86981ceB706Ce84C04c35957`
- **👤 Owner/Admin**: `0x421892ff736134d95d177cd716324df1d240c295`
- **📅 Deployed**: August 1, 2025 (Block 22409286)
- **✅ Status**: 17/17 comprehensive tests passed on mainnet

### 📊 The Graph Subgraph (Live)
- **🔗 Query Endpoint**: [`https://api.studio.thegraph.com/query/117578/superlink-usd-vault/v1.0.0`](https://api.studio.thegraph.com/query/117578/superlink-usd-vault/v1.0.0)
- **🌐 Studio Dashboard**: [superlink-usd-vault](https://thegraph.com/studio/subgraph/superlink-usd-vault)
- **⚡ Performance**: Sub-100ms query response times for activity history

### 🖥️ Frontend (Multi-Domain Ready)
- **Tech Stack**: React 19, TypeScript, ethers.js, WalletConnect, TailwindCSS
- **Architecture**: Multi-domain support (landing/app/admin)
- **Status**: Production-ready with live contract integration

## 🚀 How It Works

### Autonomous Yield Optimization
1. **Monitor APY**: Continuously checks USDC vs USDT yields on Superlend (Aave V3 fork)
2. **Smart Rebalancing**: Automatically switches allocation when APY difference >1%
3. **Optimal Routing**: Compares Uniswap V3 and Iguana DEX for best swap execution
4. **Slippage Protection**: Maximum 0.05% slippage tolerance for all swaps

### User Experience
1. **Deposit**: Users deposit USDC/USDT, receive supUSD vault tokens (ERC-4626)
2. **Earn**: Vault automatically maximizes yield through intelligent rebalancing
3. **Withdraw**: Users can withdraw anytime (24-hour lock for security)
4. **Track**: Real-time activity history via The Graph subgraph

## 🧪 Comprehensive Testing Results

### ✅ 17-Step Mainnet Validation (All Passed)
Our vault underwent rigorous testing directly on Etherlink mainnet:

1. ✅ **TVL Cap Verification** (10,000 USDC limit enforced)
2. ✅ **Initial Deposit Test** (1 USDC → 1 supUSD perfect ratio)
3. ✅ **APY Verification** (Live rates: USDC 5.40%, USDT 8.10%)
4. ✅ **ERC-4626 Compliance** (Standard tokenization confirmed)
5. ✅ **24-Hour Withdrawal Lock** (Security measure working)
6. ✅ **TVL Cap Modification** (Admin controls: 10K→5K→10K USDC)
7. ✅ **Rebalancing Assessment** (2.70% APY difference detected)
8. ✅ **Route Optimization** (Iguana DEX selected, 0.01% fee)
9. ✅ **Rebalancing Execution** (USDC→USDT with 0.014% slippage)
10. ✅ **Emergency Pause** (All assets converted to USDC safely)
11. ✅ **Emergency Withdrawal** (Time lock bypassed during pause)
12. ✅ **Resume Operations** (Normal operations restored)
13. ✅ **Minimum Deposit Validation** (1 USDC minimum enforced)
14. ✅ **Performance Fee Logic** (15% on yield, not principal)
15. ✅ **Final Profitability Check** (System ready for next rebalance)
16. ✅ **Complete Cycle Test** (Pause→withdraw→resume→deposit)
17. ✅ **Production Readiness** (All systems operational)

### 📊 Real Performance Metrics
- **Gas Efficiency**: 0.217 XTZ deployment cost
- **Swap Slippage**: 0.014% achieved (well below 0.05% limit)
- **Query Speed**: <100ms for subgraph responses
- **Uptime**: 100% since deployment

## 🔐 Security Architecture

### Professional-Grade Security
- **UUPS Upgradeable Proxy**: Bug fixes without state loss
- **OpenZeppelin Standards**: Latest security patterns (August 2025)
- **Reentrancy Guards**: Protection on all external functions
- **Emergency Pause**: Circuit breaker for critical situations
- **Access Control**: Owner-only admin functions
- **Input Validation**: Comprehensive error handling

### Risk Management
- **TVL Cap**: 10,000 USDC maximum exposure
- **Withdrawal Locks**: 24-hour security delay
- **Slippage Limits**: 0.05% maximum for all swaps
- **Multi-DEX Fallback**: Redundant routing options

## 🛠️ Technical Architecture

### Repository Structure
```
superlink-etherlink-hackathon-submission/
├── contracts/          # Smart contracts (Foundry)
│   ├── src/SuperlinkUSDVault.sol
│   ├── script/DeployProxy.s.sol
│   └── test/           # Comprehensive test suites
├── frontend/           # React TypeScript app
│   ├── src/
│   ├── public/
│   └── package.json
├── subgraph/           # The Graph indexer  
│   ├── src/vault.ts
│   ├── schema.graphql
│   └── subgraph.yaml
└── README.md           # This file
```

### Key Technologies
- **Smart Contracts**: Solidity 0.8.24, OpenZeppelin, Foundry
- **Frontend**: React 19, TypeScript, ethers.js, WalletConnect
- **Indexing**: The Graph Protocol, GraphQL
- **Infrastructure**: Etherlink Mainnet, Superlend Protocol

## 💰 Tokenomics & Business Model

### Vault Economics
- **Performance Fee**: 15% on generated yield (not principal)
- **Management Fee**: 0% (no management fees charged)
- **Minimum Deposit**: 1 USDC (prevents dust attacks)
- **TVL Cap**: 10,000 USDC (risk management)

### Revenue Sources
- Performance fees from successful yield generation
- Fees only charged on actual profits earned
- No fees on principal deposits or withdrawals

## 🚀 Quick Start for Developers

### Prerequisites
- Node.js 18+, Foundry, Git

### Setup
```bash
# Clone repository
git clone https://github.com/your-repo/superlink-etherlink-hackathon-submission.git
cd superlink-etherlink-hackathon-submission

# Smart contracts
cd contracts && forge install && forge build && forge test

# Frontend  
cd ../frontend && npm install && npm run build

# Subgraph
cd ../subgraph && npm install && npm run codegen
```

### Environment Configuration
Copy `.env.example` files and configure with:
- **Vault Address**: `0x6183E7BdCBa7eA6b009A52e4f01409dA7107954F`
- **Graph Endpoint**: `https://api.studio.thegraph.com/query/117578/superlink-usd-vault/v1.0.0`
- **RPC URL**: `https://node.mainnet.etherlink.com`

## 🌐 Key Integrations

### Superlend Protocol (Aave V3 Fork)
- **Pool**: `0x3bD16D195786fb2F509f2E2D7F69920262EF114D`
- **USDC slToken**: `0xd03bfdF9B26DB1e6764724d914d7c3d18106a9Fb`
- **USDT slToken**: `0x998098A1B2E95e2b8f15360676428EdFd976861f`

### Multi-DEX Routing
- **Uniswap V3 Router**: `0xdD489C75be1039ec7d843A6aC2Fd658350B067Cf`
- **Iguana DEX Router**: `0xE67B7D039b78DE25367EF5E69596075Bbd852BA9`
- **Quote Comparison**: Real-time optimization across both DEXes

### Token Addresses (Etherlink Mainnet)
- **USDC**: `0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9`
- **USDT**: `0x2C03058C8AFC06713be23e58D2febC8337dbfE6A`

## 🏆 Hackathon Highlights

### What Makes This Submission Outstanding
- ✅ **Complete Production Deployment** on Etherlink Mainnet
- ✅ **Real-World Testing** with actual USDC/USDT and live APY data
- ✅ **Professional Architecture** following DeFi best practices
- ✅ **Multi-Component Integration** (contracts, subgraph, frontend)
- ✅ **Comprehensive Documentation** and testing
- ✅ **Emergency Controls** demonstrating production readiness

### Innovation Points
- **Autonomous Operation**: No manual intervention required
- **Multi-DEX Optimization**: Best execution across multiple venues
- **Real-Time APY Tracking**: Direct integration with Superlend
- **Professional UX**: Multi-domain architecture with admin controls
- **Scalable Architecture**: Upgradeable contracts and modular design

## 📈 Future Roadmap

### Immediate Enhancements
- Support for additional stablecoins (DAI, FRAX)
- Integration with more DEXes on Etherlink
- Advanced rebalancing strategies

### Long-term Vision
- Cross-chain vault architecture
- Automated liquidity provision
- Governance token and DAO structure

---

## 📞 Contact & Links

- **🌐 Etherlink Explorer**: [View Contract](https://explorer.etherlink.com/address/0x6183E7BdCBa7eA6b009A52e4f01409dA7107954F)
- **📊 The Graph Studio**: [View Subgraph](https://thegraph.com/studio/subgraph/superlink-usd-vault)
- **📚 Superlend Protocol**: https://superlend.xyz
- **⚡ Etherlink Network**: https://etherlink.com

---

**🎯 Built for Etherlink Hackathon - Demonstrating Production-Ready Autonomous DeFi Innovation**

*Autonomous. Secure. Production-Ready.*