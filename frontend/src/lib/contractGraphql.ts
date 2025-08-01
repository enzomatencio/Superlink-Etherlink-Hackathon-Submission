// Direct contract event fetching as fallback for The Graph
import { createPublicClient, http, parseEventLogs, formatUnits } from 'viem'
import { etherlinkMainnet } from '../config/web3'
import { vaultABI } from '../config/abi'
import { VAULT_ADDRESS } from '../config/web3'

export interface ContractActivity {
  id: string
  type: 'deposit' | 'withdrawal' | 'rebalance' | 'fees_claimed' | 'pause' | 'unpause'
  user?: string
  assets?: string
  shares?: string
  fromAsset?: string
  toAsset?: string
  amount?: string
  blockNumber: bigint
  blockTimestamp: string
  transactionHash: string
  logIndex: number
}

const client = createPublicClient({
  chain: etherlinkMainnet,
  transport: http()
})

export async function getVaultEvents(limit: number = 50): Promise<ContractActivity[]> {
  try {
    const currentBlock = await client.getBlockNumber()
    const fromBlock = currentBlock - 10000n // Last ~10k blocks
    
    // Get all vault events
    const logs = await client.getLogs({
      address: VAULT_ADDRESS as `0x${string}`,
      fromBlock,
      toBlock: 'latest'
    })

    // Parse events
    const parsedLogs = parseEventLogs({
      abi: vaultABI,
      logs
    })

    const activities: ContractActivity[] = []

    for (const log of parsedLogs.slice(-limit)) {
      const block = await client.getBlock({ blockNumber: log.blockNumber })
      
      let activity: ContractActivity = {
        id: `${log.transactionHash}-${log.logIndex}`,
        type: 'deposit',
        blockNumber: log.blockNumber,
        blockTimestamp: block.timestamp.toString(),
        transactionHash: log.transactionHash,
        logIndex: log.logIndex
      }

      switch (log.eventName) {
        case 'Deposit':
          activity.type = 'deposit'
          activity.user = (log.args as any).receiver
          activity.assets = (log.args as any).assets?.toString()
          activity.shares = (log.args as any).shares?.toString()
          break
          
        case 'Withdraw':
          activity.type = 'withdrawal'
          activity.user = (log.args as any).owner
          activity.assets = (log.args as any).assets?.toString()
          activity.shares = (log.args as any).shares?.toString()
          break
          
        case 'Rebalanced':
          activity.type = 'rebalance'
          activity.fromAsset = (log.args as any).from
          activity.toAsset = (log.args as any).to
          activity.amount = (log.args as any).amount?.toString()
          break
          
        case 'FeesClaimed':
          activity.type = 'fees_claimed'
          activity.amount = (log.args as any).amount?.toString()
          break
          
        case 'EmergencyPaused':
          activity.type = 'pause'
          break
          
        case 'Unpaused':
          activity.type = 'unpause'
          break
          
        default:
          continue
      }

      activities.push(activity)
    }

    return activities.reverse() // Newest first
  } catch (error) {
    console.error('Failed to fetch vault events:', error)
    return []
  }
}

export function formatActivityForDisplay(activity: ContractActivity) {
  const date = new Date(parseInt(activity.blockTimestamp) * 1000)
  
  switch (activity.type) {
    case 'deposit':
      return {
        type: '💰 Deposit',
        user: activity.user ? `${activity.user.slice(0, 6)}...${activity.user.slice(-4)}` : '',
        amount: activity.assets ? `$${Number(formatUnits(BigInt(activity.assets), 6)).toLocaleString()}` : '',
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        hash: activity.transactionHash
      }
      
    case 'withdrawal':
      return {
        type: '💸 Withdrawal',
        user: activity.user ? `${activity.user.slice(0, 6)}...${activity.user.slice(-4)}` : '',
        amount: activity.assets ? `$${Number(formatUnits(BigInt(activity.assets), 6)).toLocaleString()}` : '',
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        hash: activity.transactionHash
      }
      
    case 'rebalance':
      const fromToken = getTokenName(activity.fromAsset || '')
      const toToken = getTokenName(activity.toAsset || '')
      return {
        type: '🔄 Rebalance',
        user: `${fromToken} → ${toToken}`,
        amount: activity.amount ? `$${Number(formatUnits(BigInt(activity.amount), 6)).toLocaleString()}` : '',
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        hash: activity.transactionHash
      }
      
    case 'fees_claimed':
      return {
        type: '💼 Fees Claimed',
        user: 'Admin',
        amount: activity.amount ? `$${Number(formatUnits(BigInt(activity.amount), 6)).toLocaleString()}` : '',
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        hash: activity.transactionHash
      }
      
    case 'pause':
      return {
        type: '⏸ Emergency Paused',
        user: 'Admin',
        amount: '',
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        hash: activity.transactionHash
      }
      
    case 'unpause':
      return {
        type: '▶️ Unpaused',
        user: 'Admin',
        amount: '',
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        hash: activity.transactionHash
      }
      
    default:
      return {
        type: '📊 Activity',
        user: '',
        amount: '',
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        hash: activity.transactionHash
      }
  }
}

function getTokenName(address: string): string {
  if (!address) return 'Unknown'
  if (address.toLowerCase() === '0x796ea11fa2dd751ed01b53c372ffdb4aaa8f00f9') return 'USDC'
  if (address.toLowerCase() === '0x2c03058c8afc06713be23e58d2febc8337dbfe6a') return 'USDT'
  return 'Unknown'
}