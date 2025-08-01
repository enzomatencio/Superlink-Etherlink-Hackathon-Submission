# Deployment Guide

## Prerequisites

- Node.js 18+ (20.18.1+ for subgraph)
- Foundry (for smart contracts)
- Git

## Smart Contracts

### Environment Setup
```bash
cd contracts
cp .env.example .env
# Edit .env with your private key and RPC URLs
```

### Deploy Contract
```bash
# Install dependencies
forge install

# Compile contracts
forge build

# Deploy to Etherlink mainnet
forge script script/DeployProxy.s.sol --rpc-url $ETHERLINK_MAINNET_RPC_URL --broadcast --verify

# Run tests
forge test
```

## Frontend

### Environment Setup
```bash
cd frontend
cp .env.example .env.local
# Edit environment variables for your deployment
```

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `VITE_VAULT_ADDRESS=0x1F2C64c792ea49991D5efd350B15c0e043e402Ce`
   - `VITE_ADMIN_ADDRESS=0x421892ff736134d95d177cd716324df1d240c295`
   - `VITE_GRAPH_ENDPOINT=<your_subgraph_endpoint>`
3. Deploy automatically on git push

## Subgraph

### Environment Setup
```bash
cd subgraph
cp .env.example .env
# Edit with your Graph Studio deploy key
```

### Deploy to The Graph Studio
```bash
# Install dependencies
npm install

# Authenticate with The Graph Studio
graph auth --studio <YOUR_DEPLOY_KEY>

# Generate types and build
npm run codegen
npm run build

# Deploy to Studio
npm run deploy
```

## Environment Variables Summary

### Contracts (.env)
- `ETHERLINK_MAINNET_RPC_URL`: Etherlink RPC endpoint
- `PRIVATE_KEY`: Deployment wallet private key
- `ETHERSCAN_API_KEY`: Block explorer API key

### Frontend (.env.local)
- `VITE_SITE_TYPE`: Domain type (landing/app/admin)
- `VITE_VAULT_ADDRESS`: Deployed vault contract address
- `VITE_ADMIN_ADDRESS`: Admin wallet address
- `VITE_GRAPH_ENDPOINT`: Subgraph query endpoint

### Subgraph (.env)
- `GRAPH_DEPLOY_KEY`: The Graph Studio deployment key
- `VAULT_ADDRESS`: Contract address to index

## Current Deployments

- **Vault Contract**: `0x1F2C64c792ea49991D5efd350B15c0e043e402Ce`
- **Network**: Etherlink Mainnet
- **Frontend**: Ready for Vercel deployment
- **Subgraph**: Configured for The Graph Studio

## Security Notes

- Never commit actual private keys or API keys
- Use `.env.example` files as templates
- Keep sensitive credentials in environment variables only
- Verify all contract addresses before deployment