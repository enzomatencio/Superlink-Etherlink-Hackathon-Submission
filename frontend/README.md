# Superlink Frontend

## Overview

A modern React-based frontend for the Superlink USD Vault, featuring multiple domain routing for different user experiences:

- **superlink.fun**: Landing page with project overview
- **app.superlink.fun**: Main vault application
- **admin.superlink.fun**: Administrative dashboard

## Features

### User Interface
- **Real-time APY Display**: Shows current and historical yields
- **Position Tracking**: View deposits, shares, and earnings
- **Activity History**: Complete transaction history via The Graph
- **Responsive Design**: Works on desktop and mobile

### Technical Features
- **Multi-Wallet Support**: WalletConnect, MetaMask, Rainbow, Coinbase
- **Real-time Data**: Direct blockchain calls for accurate metrics
- **The Graph Integration**: Fast activity history loading
- **Error Handling**: Comprehensive error states and recovery
- **Performance Optimized**: Code splitting and lazy loading

## Architecture

### Core Components

- **LandingPage**: Marketing and project overview
- **AppPage**: Main vault interaction interface
- **AdminPage**: Administrative controls (owner only)
- **VaultDetailPage**: Detailed vault analytics

### Key Features

- **VaultStats**: Real-time TVL, APY, and allocation data
- **UserPosition**: Personal vault position and earnings
- **ActivityHistory**: Transaction history from subgraph

## Environment Configuration

```bash
# Domain type
VITE_SITE_TYPE=app

# Admin wallet
VITE_ADMIN_ADDRESS=0x421892ff736134d95d177cd716324df1d240c295

# Contract addresses
VITE_VAULT_ADDRESS=0x1F2C64c792ea49991D5efd350B15c0e043e402Ce
VITE_USDC_ADDRESS=0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9
VITE_USDT_ADDRESS=0x2C03058C8AFC06713be23e58D2febC8337dbfE6A

# The Graph endpoint
VITE_GRAPH_ENDPOINT=https://api.studio.thegraph.com/query/117578/superlink-usd-vault/version/latest

# RPC endpoints
VITE_RPC_PRIMARY=https://node.mainnet.etherlink.com
VITE_RPC_FALLBACK=https://relay.mainnet.etherlink.com
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

The frontend is deployed on Vercel with automatic deployments from the main branch. Each domain (landing, app, admin) has its own Vercel project configuration.

## Technology Stack

- **React + TypeScript**: Core framework
- **Vite**: Build tool and dev server
- **TailwindCSS**: Styling framework
- **ethers.js**: Ethereum interactions
- **WalletConnect**: Multi-wallet support
- **The Graph**: Activity history indexing
- **Vercel**: Hosting and deployment