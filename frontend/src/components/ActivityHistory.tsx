import { useAccount, usePublicClient } from 'wagmi'
import { formatUnits, decodeEventLog, createPublicClient, http } from 'viem'
import { useState, useEffect } from 'react'
import { VAULT_ADDRESS, USDC_ADDRESS, USDT_ADDRESS, etherlinkMainnet } from '../config/web3'
import { vaultABI } from '../config/abi'

interface ActivityEvent {
  type: 'deposit' | 'withdraw' | 'rebalance' | 'feeClaim' | 'pause' | 'unpause'
  timestamp: number
  blockNumber: bigint
  txHash: string
  user?: string
  amount?: string
  asset?: string
  fromAsset?: string
  toAsset?: string
}

// RPC endpoints to try
const RPC_ENDPOINTS = [
  'https://rpc.ankr.com/etherlink_mainnet',
  'https://node.mainnet.etherlink.com',
]

const ActivityHistory = () => {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'user'>('all')
  const [searchStatus, setSearchStatus] = useState<string>('')

  useEffect(() => {
    const fetchActivities = async () => {
      if (!publicClient) return
      
      setLoading(true)
      setSearchStatus('Loading vault activities...')
      
      try {
        // Try with primary client first
        const activities = await fetchVaultActivities(publicClient)
        if (activities.length > 0) {
          setActivities(activities)
          setSearchStatus(`Found ${activities.length} activities`)
          return
        }

        // If no events found, try alternative RPCs
        for (const rpc of RPC_ENDPOINTS) {
          setSearchStatus(`Trying alternative RPC: ${rpc}...`)
          const altClient = createPublicClient({
            chain: etherlinkMainnet,
            transport: http(rpc),
          })
          
          const altActivities = await fetchVaultActivities(altClient)
          if (altActivities.length > 0) {
            setActivities(altActivities)
            setSearchStatus(`Found ${altActivities.length} activities`)
            return
          }
        }

        setSearchStatus('No vault activities found')
      } catch (error) {
        console.error('Error fetching activities:', error)
        setSearchStatus('Error loading activities')
      } finally {
        setLoading(false)
      }
    }

    async function fetchVaultActivities(client: any): Promise<ActivityEvent[]> {
      try {
        const currentBlock = await client.getBlockNumber()
        console.log('Current block:', currentBlock.toString())
        console.log('Vault address:', VAULT_ADDRESS)
        
        // CORRECTED deployment block (verified via testing)
        const DEPLOYMENT_BLOCK = 22249016n
        
        setSearchStatus('Fetching vault events in chunks...')
        
        const activities = await fetchVaultEventsInChunks(client, DEPLOYMENT_BLOCK, currentBlock)
        return activities
      } catch (error) {
        console.error('Error in fetchVaultActivities:', error)
        return []
      }
    }

    async function fetchVaultEventsInChunks(client: any, fromBlock: bigint, toBlock: bigint): Promise<ActivityEvent[]> {
      let allEvents: any[] = []
      const MAX_BLOCK_RANGE = 999n // Etherlink RPC strict limit
      
      console.log(`Fetching vault events from block ${fromBlock} to ${toBlock}`)
      
      let currentBlock = fromBlock
      let totalChunks = Number((toBlock - fromBlock) / MAX_BLOCK_RANGE) + 1
      let currentChunk = 0
      
      // Process in chunks to respect RPC limits
      while (currentBlock <= toBlock) {
        const chunkEnd = currentBlock + MAX_BLOCK_RANGE > toBlock ? toBlock : currentBlock + MAX_BLOCK_RANGE
        currentChunk++
        
        try {
          setSearchStatus(`Fetching events... chunk ${currentChunk}/${totalChunks}`)
          
          console.log(`Fetching chunk: blocks ${currentBlock} to ${chunkEnd}`)
          
          const chunkEvents = await client.getLogs({
            address: VAULT_ADDRESS,
            fromBlock: currentBlock,
            toBlock: chunkEnd
          })
          
          if (chunkEvents.length > 0) {
            console.log(`Found ${chunkEvents.length} events in chunk ${currentBlock}-${chunkEnd}`)
            allEvents = allEvents.concat(chunkEvents)
          }
          
        } catch (error) {
          console.error(`Error fetching chunk ${currentBlock}-${chunkEnd}:`, error)
          // Continue with next chunk even if one fails
        }
        
        currentBlock = chunkEnd + 1n
        
        // Small delay to prevent RPC rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      console.log('Total vault events found:', allEvents.length)
      
      // Sort by block number to maintain chronological order
      allEvents.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))

      // Process and decode vault events
      const processedActivities: ActivityEvent[] = []
      
      for (const log of allEvents) {
        try {
          const block = await client.getBlock({ blockNumber: log.blockNumber })
          
          // Decode the event using the vault ABI
          const decoded = decodeEventLog({
            abi: vaultABI,
            data: log.data,
            topics: log.topics
          })

          console.log('Decoded vault event:', decoded.eventName, decoded.args)

          let activity: ActivityEvent | null = null

          switch (decoded.eventName) {
            case 'Deposit':
              activity = {
                type: 'deposit',
                timestamp: Number(block.timestamp),
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
                user: (decoded.args as any).owner,
                amount: formatUnits((decoded.args as any).assets, 6),
                asset: 'USDC'
              }
              break

            case 'Withdraw':
              activity = {
                type: 'withdraw',
                timestamp: Number(block.timestamp),
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
                user: (decoded.args as any).owner,
                amount: formatUnits((decoded.args as any).assets, 6),
                asset: 'USDC'
              }
              break

            case 'Rebalanced':
              const fromAsset = (decoded.args as any).from === USDC_ADDRESS ? 'USDC' : 
                                (decoded.args as any).from === USDT_ADDRESS ? 'USDT' : 'Unknown'
              const toAsset = (decoded.args as any).to === USDC_ADDRESS ? 'USDC' : 
                               (decoded.args as any).to === USDT_ADDRESS ? 'USDT' : 'Unknown'
              
              activity = {
                type: 'rebalance',
                timestamp: Number(block.timestamp),
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
                amount: formatUnits((decoded.args as any).amount, 6),
                fromAsset,
                toAsset
              }
              break

            case 'FeesClaimed':
              activity = {
                type: 'feeClaim',
                timestamp: Number(block.timestamp),
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
                amount: formatUnits((decoded.args as any).amount, 6),
                asset: 'USDC'
              }
              break

            case 'EmergencyPaused':
              activity = {
                type: 'pause',
                timestamp: Number(block.timestamp),
                blockNumber: log.blockNumber,
                txHash: log.transactionHash
              }
              break

            case 'Unpaused':
              activity = {
                type: 'unpause',
                timestamp: Number(block.timestamp),
                blockNumber: log.blockNumber,
                txHash: log.transactionHash
              }
              break
          }

          if (activity) {
            processedActivities.push(activity)
          }
        } catch (error) {
          // Skip events that can't be decoded (shouldn't happen with address filtering)
          console.log('Could not decode vault event:', error)
        }
      }

      // Sort by timestamp descending (newest first)
      processedActivities.sort((a, b) => b.timestamp - a.timestamp)
      return processedActivities
    }

    fetchActivities()
  }, [publicClient])

  const filteredActivities = filter === 'user' && address 
    ? activities.filter(activity => activity.user?.toLowerCase() === address.toLowerCase())
    : activities

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deposit': return '💰'
      case 'withdraw': return '💸'
      case 'rebalance': return '🔄'
      case 'feeClaim': return '💎'
      case 'pause': return '⏸️'
      case 'unpause': return '▶️'
      default: return '📊'
    }
  }

  const getActivityDescription = (activity: ActivityEvent) => {
    switch (activity.type) {
      case 'deposit':
        return `Deposited ${Number(activity.amount!).toFixed(6)} ${activity.asset}`
      case 'withdraw':
        return `Withdrew ${Number(activity.amount!).toFixed(6)} ${activity.asset}`
      case 'rebalance':
        return `Rebalanced ${Number(activity.amount!).toFixed(6)} from ${activity.fromAsset} to ${activity.toAsset}`
      case 'feeClaim':
        return `Performance fees claimed: ${Number(activity.amount!).toFixed(6)} ${activity.asset}`
      case 'pause':
        return 'Vault paused by admin'
      case 'unpause':
        return 'Vault unpaused by admin'
      default:
        return 'Unknown activity'
    }
  }

  return (
    <div className="activity-history">
      <div className="activity-header">
        <h2>📋 Activity History</h2>
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All Activity
          </button>
          <button 
            className={filter === 'user' ? 'active' : ''}
            onClick={() => setFilter('user')}
            disabled={!address}
          >
            My Activity
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div>Loading activity history...</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
            {searchStatus}
          </div>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="no-activity">
          <p>{filter === 'user' ? 'No activity found for your address' : 'No activity recorded yet'}</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
            {searchStatus}
          </p>
        </div>
      ) : (
        <div className="activity-list">
          {filteredActivities.map((activity, index) => (
            <div key={`${activity.txHash}-${index}`} className="activity-item">
              <div className="activity-icon">
                {getActivityIcon(activity.type)}
              </div>
              <div className="activity-details">
                <div className="activity-description">
                  {getActivityDescription(activity)}
                </div>
                <div className="activity-meta">
                  <span className="time">{formatTime(activity.timestamp)}</span>
                  {activity.user && filter === 'all' && (
                    <span className="user">
                      User: {activity.user.slice(0, 6)}...{activity.user.slice(-4)}
                    </span>
                  )}
                  <a 
                    href={`https://explorer.etherlink.com/tx/${activity.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-link"
                  >
                    View TX
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActivityHistory