# Superlink Subgraph

## Overview

The Graph Protocol subgraph for indexing Superlink USD Vault events on Etherlink mainnet. Provides fast, reliable access to vault activity history and analytics.

## Indexed Events

### Vault Operations
- **Deposits**: User deposits into the vault
- **Withdrawals**: User withdrawals from the vault
- **Rebalances**: Automatic asset rebalancing events
- **Fee Claims**: Performance fee collection events

### Administrative Events
- **Pause/Unpause**: Vault operational status changes
- **TVL Cap Updates**: Maximum vault size adjustments
- **Route Selection**: DEX routing optimization events

## Deployed Subgraph

- **Studio URL**: https://thegraph.com/studio/subgraph/superlink-usd-vault
- **Query Endpoint**: https://api.studio.thegraph.com/query/117578/superlink-usd-vault/v2.0.0-new-vault
- **Network**: Etherlink Mainnet
- **Contract**: `0xe60009Dd8017CC4f300f16655E337B382A7AEAE6`

## Schema

### Entities

```graphql
type Deposit @entity {
  id: ID!
  user: Bytes!
  assets: BigInt!
  shares: BigInt!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}

type Withdrawal @entity {
  id: ID!
  user: Bytes!
  assets: BigInt!
  shares: BigInt!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}

type Rebalance @entity {
  id: ID!
  fromAsset: Bytes!
  toAsset: Bytes!
  amount: BigInt!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}
```

## Development

### Prerequisites
- Node.js 20.18.1+
- Graph CLI installed globally

### Setup

```bash
# Install dependencies
npm install

# Generate types
npm run codegen

# Build subgraph
npm run build
```

### Deployment

```bash
# Authenticate with The Graph Studio
graph auth --studio 55b37bade1cc8685c1910e508bb144ed

# Deploy to Studio
npm run deploy
```

## Configuration

The subgraph tracks events from the Superlink USD Vault contract starting from block 22,448,242 on Etherlink mainnet.

### Key Configuration
- **Network**: etherlink-mainnet
- **Start Block**: 22448242
- **Contract Address**: 0xe60009Dd8017CC4f300f16655E337B382A7AEAE6
- **ABI**: Full vault contract ABI with all events

## Query Examples

### Get Recent Deposits
```graphql
query GetDeposits {
  deposits(first: 10, orderBy: blockTimestamp, orderDirection: desc) {
    id
    user
    assets
    shares
    blockTimestamp
    transactionHash
  }
}
```

### Get User Activity
```graphql
query GetUserActivity($user: Bytes!) {
  deposits(where: { user: $user }) {
    id
    assets
    shares
    blockTimestamp
  }
  withdrawals(where: { user: $user }) {
    id
    assets
    shares
    blockTimestamp
  }
}
```

### Get Rebalancing History
```graphql
query GetRebalances {
  rebalances(first: 20, orderBy: blockTimestamp, orderDirection: desc) {
    id
    fromAsset
    toAsset
    amount
    blockTimestamp
  }
}
```

## Performance

The subgraph provides sub-second query response times and is automatically kept in sync with the blockchain. All events are indexed within ~1 minute of being mined.