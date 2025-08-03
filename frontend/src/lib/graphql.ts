import { GraphQLClient } from 'graphql-request'
import { GRAPH_ENDPOINT } from '../config/web3'

const graphQLClient = new GraphQLClient(GRAPH_ENDPOINT)

// Try multiple query formats since we don't know the exact schema
const ACTIVITIES_QUERIES = [
  // Try format 1: Standard ERC4626 events (correct schema)
  `query GetActivities($first: Int!) {
    deposits(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      user {
        id
      }
      sender
      receiver
      assets
      shares
      blockNumber
      blockTimestamp
      transactionHash
    }
    withdrawals(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      user {
        id
      }
      sender
      receiver
      owner
      assets
      shares
      blockNumber
      blockTimestamp
      transactionHash
    }
  }`,
  
  // Try format 2: Generic transaction format
  `query GetTransactions($first: Int!) {
    transactions(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      hash
      timestamp
      blockNumber
      from
      to
      value
      type
    }
  }`,
  
  // Try format 3: Events format
  `query GetEvents($first: Int!) {
    events(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      transaction
      blockNumber
      blockTimestamp
      event
      args
    }
  }`,
  
  // Try format 4: Simple deposit/withdrawal entities
  `query GetSimpleActivities($first: Int!) {
    depositEntities: deposits(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      user
      amount
      timestamp
      blockNumber
      transactionHash
    }
    withdrawalEntities: withdrawals(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      user
      amount
      timestamp
      blockNumber
      transactionHash
    }
  }`,
  
  // Try format 5: Include all vault events (rebalancing and fees)
  `query GetAllActivities($first: Int!) {
    deposits(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      sender
      owner
      assets
      shares
      blockNumber
      blockTimestamp
      transactionHash
    }
    withdrawals(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      sender
      receiver
      owner
      assets
      shares
      blockNumber
      blockTimestamp
      transactionHash
    }
    rebalances(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      fromAsset
      toAsset
      amount
      blockNumber
      blockTimestamp
      transactionHash
    }
    feeClaims(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      amount
      blockNumber
      blockTimestamp
      transactionHash
    }
    tvlCapUpdates(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      newCap
      previousCap
      updatedBy
      blockNumber
      blockTimestamp
      transactionHash
    }
    routeSelections(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      router
      fee
      amountIn
      amountOut
      blockNumber
      blockTimestamp
      transactionHash
    }
  }`,
  
  // Try format 6: Generic events with rebalancing
  `query GetVaultEvents($first: Int!) {
    vaultEvents(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      type
      user
      amount
      fromToken
      toToken
      timestamp
      blockNumber
      transactionHash
    }
  }`
]

export interface VaultActivity {
  id: string
  type: 'deposit' | 'withdrawal' | 'rebalance' | 'fees_claimed' | 'tvl_cap_update' | 'route_selection'
  user?: string
  assets?: string
  shares?: string
  amount?: string
  fromAsset?: string
  toAsset?: string
  newCap?: string
  previousCap?: string
  updatedBy?: string
  router?: string
  fee?: string
  amountIn?: string
  amountOut?: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
}

// Get token name from address
export function getTokenSymbol(address?: string): string {
  if (!address) return 'Unknown'
  
  const addr = address.toLowerCase()
  if (addr === '0x796ea11fa2dd751ed01b53c372ffdb4aaa8f00f9') return 'USDC' // Etherlink USDC
  if (addr === '0x2c03058c8afc06713be23e58d2febc8337dbfe6a') return 'USDT' // Etherlink USDT
  
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export interface VaultStats {
  totalValueLocked: string
  totalShares: string
  totalDeposits: string
  totalWithdrawals: string
  performanceFeesClaimed: string
}

export class GraphQLService {
  async getAllActivities(first: number = 100): Promise<VaultActivity[]> {
    console.log('🔗 Fetching activities from The Graph...', GRAPH_ENDPOINT)
    
    // Try different query formats until one works
    for (let i = 0; i < ACTIVITIES_QUERIES.length; i++) {
      try {
        console.log(`Trying query format ${i + 1}...`)
        const data = await graphQLClient.request(ACTIVITIES_QUERIES[i], { first }) as any
        console.log(`Query ${i + 1} response:`, data)
        
        const activities: VaultActivity[] = []
        
        // Handle different response formats
        if (data.deposits || data.withdrawals) {
          // Format 1: deposits/withdrawals
          if (data.deposits) {
            data.deposits.forEach((deposit: any) => {
              activities.push({
                id: deposit.id,
                type: 'deposit',
                user: deposit.user?.id || deposit.sender || deposit.receiver,
                assets: deposit.assets || deposit.amount || deposit.value,
                shares: deposit.shares,
                blockNumber: deposit.blockNumber?.toString() || '0',
                blockTimestamp: deposit.blockTimestamp?.toString() || deposit.timestamp?.toString() || '0',
                transactionHash: deposit.transactionHash || deposit.hash || deposit.id
              })
            })
          }
          
          if (data.withdrawals) {
            data.withdrawals.forEach((withdraw: any) => {
              activities.push({
                id: withdraw.id,
                type: 'withdrawal',
                user: withdraw.user?.id || withdraw.sender || withdraw.owner || withdraw.receiver,
                assets: withdraw.assets || withdraw.amount || withdraw.value,
                shares: withdraw.shares,
                blockNumber: withdraw.blockNumber?.toString() || '0',
                blockTimestamp: withdraw.blockTimestamp?.toString() || withdraw.timestamp?.toString() || '0',
                transactionHash: withdraw.transactionHash || withdraw.hash || withdraw.id
              })
            })
          }
        } else if (data.transactions) {
          // Format 2: transactions
          data.transactions.forEach((tx: any) => {
            activities.push({
              id: tx.id,
              type: tx.type?.toLowerCase() === 'withdraw' ? 'withdrawal' : 'deposit',
              user: tx.from,
              assets: tx.value,
              blockNumber: tx.blockNumber?.toString() || '0',
              blockTimestamp: tx.timestamp?.toString() || '0',
              transactionHash: tx.hash || tx.id
            })
          })
        } else if (data.events) {
          // Format 3: events
          data.events.forEach((event: any) => {
            const eventType = event.event?.toLowerCase()
            activities.push({
              id: event.id,
              type: eventType === 'withdraw' ? 'withdrawal' : 'deposit',
              blockNumber: event.blockNumber?.toString() || '0',
              blockTimestamp: event.blockTimestamp?.toString() || '0',
              transactionHash: event.transaction || event.id
            })
          })
        } else if (data.depositEntities || data.withdrawalEntities) {
          // Format 4: simple entities
          if (data.depositEntities) {
            data.depositEntities.forEach((deposit: any) => {
              activities.push({
                id: deposit.id,
                type: 'deposit',
                user: deposit.user,
                assets: deposit.amount,
                blockNumber: deposit.blockNumber?.toString() || '0',
                blockTimestamp: deposit.timestamp?.toString() || '0',
                transactionHash: deposit.transactionHash || deposit.id
              })
            })
          }
          
          if (data.withdrawalEntities) {
            data.withdrawalEntities.forEach((withdrawal: any) => {
              activities.push({
                id: withdrawal.id,
                type: 'withdrawal',
                user: withdrawal.user,
                assets: withdrawal.amount,
                blockNumber: withdrawal.blockNumber?.toString() || '0',
                blockTimestamp: withdrawal.timestamp?.toString() || '0',
                transactionHash: withdrawal.transactionHash || withdrawal.id
              })
            })
          }
        } else if (data.rebalances || data.feeClaims) {
          // Format 5: Handle all vault events (deposits, withdraws, rebalancing, fees)
          if (data.deposits) {
            data.deposits.forEach((deposit: any) => {
              activities.push({
                id: deposit.id,
                type: 'deposit',
                user: deposit.sender || deposit.owner,
                assets: deposit.assets,
                shares: deposit.shares,
                blockNumber: deposit.blockNumber?.toString() || '0',
                blockTimestamp: deposit.blockTimestamp?.toString() || '0',
                transactionHash: deposit.transactionHash || deposit.id
              })
            })
          }
          
          if (data.withdrawals) {
            data.withdrawals.forEach((withdraw: any) => {
              activities.push({
                id: withdraw.id,
                type: 'withdrawal',
                user: withdraw.user?.id || withdraw.sender || withdraw.owner,
                assets: withdraw.assets,
                shares: withdraw.shares,
                blockNumber: withdraw.blockNumber?.toString() || '0',
                blockTimestamp: withdraw.blockTimestamp?.toString() || '0',
                transactionHash: withdraw.transactionHash || withdraw.id
              })
            })
          }
          
          if (data.rebalances) {
            data.rebalances.forEach((rebalance: any) => {
              activities.push({
                id: rebalance.id,
                type: 'rebalance',
                assets: rebalance.amount,
                fromAsset: rebalance.fromAsset,
                toAsset: rebalance.toAsset,
                blockNumber: rebalance.blockNumber?.toString() || '0',
                blockTimestamp: rebalance.blockTimestamp?.toString() || '0',
                transactionHash: rebalance.transactionHash || rebalance.id
              })
            })
          }
          
          if (data.feeClaims) {
            data.feeClaims.forEach((feesClaimed: any) => {
              activities.push({
                id: feesClaimed.id,
                type: 'fees_claimed',
                assets: feesClaimed.amount,
                blockNumber: feesClaimed.blockNumber?.toString() || '0',
                blockTimestamp: feesClaimed.blockTimestamp?.toString() || '0',
                transactionHash: feesClaimed.transactionHash || feesClaimed.id
              })
            })
          }

          if (data.tvlCapUpdates) {
            data.tvlCapUpdates.forEach((tvlUpdate: any) => {
              activities.push({
                id: tvlUpdate.id,
                type: 'tvl_cap_update',
                newCap: tvlUpdate.newCap,
                previousCap: tvlUpdate.previousCap,
                updatedBy: tvlUpdate.updatedBy,
                blockNumber: tvlUpdate.blockNumber?.toString() || '0',
                blockTimestamp: tvlUpdate.blockTimestamp?.toString() || '0',
                transactionHash: tvlUpdate.transactionHash || tvlUpdate.id
              })
            })
          }

          if (data.routeSelections) {
            data.routeSelections.forEach((routeSelection: any) => {
              activities.push({
                id: routeSelection.id,
                type: 'route_selection',
                router: routeSelection.router,
                fee: routeSelection.fee,
                amountIn: routeSelection.amountIn,
                amountOut: routeSelection.amountOut,
                blockNumber: routeSelection.blockNumber?.toString() || '0',
                blockTimestamp: routeSelection.blockTimestamp?.toString() || '0',
                transactionHash: routeSelection.transactionHash || routeSelection.id
              })
            })
          }
        } else if (data.vaultEvents) {
          // Format 6: Generic vault events
          data.vaultEvents.forEach((event: any) => {
            activities.push({
              id: event.id,
              type: event.type === 'rebalance' ? 'rebalance' : (event.type === 'withdraw' ? 'withdrawal' : 'deposit'),
              user: event.user,
              assets: event.amount,
              fromAsset: event.fromToken,
              toAsset: event.toToken,
              blockNumber: event.blockNumber?.toString() || '0',
              blockTimestamp: event.timestamp?.toString() || '0',
              transactionHash: event.transactionHash || event.id
            })
          })
        }
        
        if (activities.length > 0) {
          // Sort by timestamp (newest first)
          activities.sort((a, b) => parseInt(b.blockTimestamp) - parseInt(a.blockTimestamp))
          console.log(`✅ Found ${activities.length} activities using query format ${i + 1}`)
          return activities
        }
        
      } catch (error) {
        console.log(`Query format ${i + 1} failed:`, error)
        continue
      }
    }
    
    // If all queries fail, return empty but don't throw error
    console.log('⚠️ No activity data found - this might be normal for a new vault')
    return []
  }
  
  async getVaultStats(): Promise<VaultStats | null> {
    console.log('📊 Fetching vault stats from The Graph...')
    
    const statsQueries = [
      // Try different vault stats queries
      `query GetVaultStats {
        vault(id: "0xe60009dd8017cc4f300f16655e337b382a7aeae6") {
          id
          totalValueLocked
          totalShares
          totalDeposits
          totalWithdrawals
          performanceFeesClaimed
        }
      }`,
      
      `query GetVaultInfo {
        vaults(first: 1) {
          id
          totalAssets
          totalSupply
          totalDeposits
          totalWithdrawals
        }
      }`,
      
      `query GetProtocolStats {
        protocol(id: "superlink") {
          totalValueLocked
          totalUsers
          totalTransactions
        }
      }`
    ]
    
    for (let i = 0; i < statsQueries.length; i++) {
      try {
        console.log(`Trying stats query ${i + 1}...`)
        const data = await graphQLClient.request(statsQueries[i]) as any
        
        if (data.vault) {
          console.log('✅ Vault stats fetched successfully')
          return data.vault as VaultStats
        } else if (data.vaults && data.vaults.length > 0) {
          console.log('✅ Vault stats fetched from vaults array')
          return data.vaults[0] as VaultStats
        } else if (data.protocol) {
          console.log('✅ Protocol stats fetched')
          return {
            totalValueLocked: data.protocol.totalValueLocked || '0',
            totalShares: '0',
            totalDeposits: '0',
            totalWithdrawals: '0',
            performanceFeesClaimed: '0'
          }
        }
      } catch (error) {
        console.log(`Stats query ${i + 1} failed:`, error)
        continue
      }
    }
    
    console.log('⚠️ No vault stats found - using fallback')
    return null
  }
}

export const graphqlService = new GraphQLService()