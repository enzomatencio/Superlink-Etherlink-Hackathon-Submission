import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { VAULT_ADDRESS, USDC_ADDRESS, USDT_ADDRESS } from '../config/web3'
import { vaultABI, erc20ABI } from '../config/abi'
import { graphqlService, type VaultActivity, getTokenSymbol } from '../lib/graphql'
import { getVaultEvents, formatActivityForDisplay, type ContractActivity } from '../lib/contractGraphql'

// Utility function for better USD formatting
function formatUSD(amount: number): string {
  if (amount >= 0.01) {
    return `$${amount.toFixed(2)}`
  } else if (amount > 0) {
    return `$${amount.toFixed(5)}`
  }
  return '$0.00'
}

// Get token name from address
function getTokenName(address: string): string {
  if (address?.toLowerCase() === USDC_ADDRESS?.toLowerCase()) return 'USDC'
  if (address?.toLowerCase() === USDT_ADDRESS?.toLowerCase()) return 'USDT'
  return 'Unknown'
}

// Format time remaining for countdown
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Available now'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}


export default function VaultDetailPage() {
  const { vaultAddress } = useParams()
  const { address, isConnected } = useAccount()
  
  // UI State
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [activities, setActivities] = useState<VaultActivity[]>([])
  const [contractActivities, setContractActivities] = useState<ContractActivity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [showDeposit, setShowDeposit] = useState(true)
  const [countdown, setCountdown] = useState(0)
  const [currentAPY, setCurrentAPY] = useState(0)

  // Contract interactions
  const { writeContract, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Read vault data
  const { data: vaultName } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'name',
  })

  const { data: totalAssets, refetch: refetchTotalAssets } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'totalAssets',
  })

  const { data: userShares, refetch: refetchUserShares } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  const { data: currentAllocation } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'currentAllocation',
  })

  const { data: userPrincipal } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'userPrincipal',
    args: address ? [address] : undefined,
  })

  const { data: totalPrincipal } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'totalPrincipal',
  })

  const { data: totalSupply } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'totalSupply',
  })

  // Read reserve data from Superlend Pool contract directly
  const { data: reserveData } = useReadContract({
    address: '0x3bD16D195786fb2F509f2E2D7F69920262EF114D', // Correct Superlend Pool address
    abi: [
      {
        "inputs": [{"internalType": "address", "name": "asset", "type": "address"}],
        "name": "getReserveData",
        "outputs": [{
          "internalType": "DataTypes.ReserveData",
          "name": "",
          "type": "tuple",
          "components": [
            {"name": "configuration", "type": "uint256", "internalType": "DataTypes.ReserveConfigurationMap"},
            {"name": "liquidityIndex", "type": "uint128", "internalType": "uint128"},
            {"name": "currentLiquidityRate", "type": "uint128", "internalType": "uint128"},
            {"name": "variableBorrowIndex", "type": "uint128", "internalType": "uint128"},
            {"name": "currentVariableBorrowRate", "type": "uint128", "internalType": "uint128"},
            {"name": "currentStableBorrowRate", "type": "uint128", "internalType": "uint128"},
            {"name": "lastUpdateTimestamp", "type": "uint40", "internalType": "uint40"},
            {"name": "id", "type": "uint16", "internalType": "uint16"},
            {"name": "aTokenAddress", "type": "address", "internalType": "address"},
            {"name": "stableDebtTokenAddress", "type": "address", "internalType": "address"},
            {"name": "variableDebtTokenAddress", "type": "address", "internalType": "address"},
            {"name": "interestRateStrategyAddress", "type": "address", "internalType": "address"},
            {"name": "accruedToTreasury", "type": "uint128", "internalType": "uint128"},
            {"name": "unbacked", "type": "uint128", "internalType": "uint128"},
            {"name": "isolationModeTotalDebt", "type": "uint128", "internalType": "uint128"}
          ]
        }],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'getReserveData',
    args: currentAllocation ? [currentAllocation] : undefined,
    query: { enabled: !!currentAllocation }
  })

  // Alternative: Try UI Pool Data Provider for more reliable data
  const { data: uiPoolData } = useReadContract({
    address: '0x9F9384Ef6a1A76AE1a95dDF483be4b0214fda0Ef9', // UI Pool Data Provider
    abi: [
      {
        "inputs": [
          {"internalType": "contract IPoolAddressesProvider", "name": "provider", "type": "address"}
        ],
        "name": "getReservesData",
        "outputs": [{
          "internalType": "struct IUiPoolDataProvider.AggregatedReserveData[]",
          "name": "",
          "type": "tuple[]",
          "components": [
            {"name": "underlyingAsset", "type": "address"},
            {"name": "name", "type": "string"},
            {"name": "symbol", "type": "string"},
            {"name": "decimals", "type": "uint256"},
            {"name": "baseLTVasCollateral", "type": "uint256"},
            {"name": "reserveLiquidationThreshold", "type": "uint256"},
            {"name": "reserveLiquidationBonus", "type": "uint256"},
            {"name": "reserveFactor", "type": "uint256"},
            {"name": "usageAsCollateralEnabled", "type": "bool"},
            {"name": "borrowingEnabled", "type": "bool"},
            {"name": "stableBorrowRateEnabled", "type": "bool"},
            {"name": "isActive", "type": "bool"},
            {"name": "isFrozen", "type": "bool"},
            {"name": "liquidityIndex", "type": "uint128"},
            {"name": "variableBorrowIndex", "type": "uint128"},
            {"name": "liquidityRate", "type": "uint128"},
            {"name": "variableBorrowRate", "type": "uint128"},
            {"name": "stableBorrowRate", "type": "uint128"},
            {"name": "lastUpdateTimestamp", "type": "uint40"},
            {"name": "aTokenAddress", "type": "address"},
            {"name": "stableDebtTokenAddress", "type": "address"},
            {"name": "variableDebtTokenAddress", "type": "address"},
            {"name": "interestRateStrategyAddress", "type": "address"},
            {"name": "availableLiquidity", "type": "uint256"},
            {"name": "totalPrincipalStableDebt", "type": "uint256"},
            {"name": "averageStableRate", "type": "uint256"},
            {"name": "stableDebtLastUpdateTimestamp", "type": "uint256"},
            {"name": "totalScaledVariableDebt", "type": "uint256"}
          ]
        }],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'getReservesData',
    args: ['0x5ccF60c7E10547c5389E9cBFf543E5D0Db9F4feC'], // Pool Addresses Provider
    query: { enabled: true }
  })

  // Read user deposit timestamp for withdrawal lock countdown
  const { data: userDepositTimestamp } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'userDepositTime',
    args: address ? [address] : undefined,
  })

  // Read USDC balance for MAX button
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })
  
  // Get rebalance data for debugging (keeping for admin features)
  const { data: canRebalanceData } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI, 
    functionName: 'canRebalance',
  })
  
  // Use canRebalanceData for debugging if needed
  if (canRebalanceData) {
    console.log('🔧 Contract canRebalance data (for debugging):', {
      canRebalance: (canRebalanceData as readonly [boolean, string, `0x${string}`, bigint, bigint])[0],
      rawAPY: (canRebalanceData as readonly [boolean, string, `0x${string}`, bigint, bigint])[3].toString()
    })
  }

  const { data: isPaused, refetch: refetchIsPaused } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'paused',
  })

  const { data: usdcAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: erc20ABI,
    functionName: 'allowance',
    args: address ? [address, VAULT_ADDRESS] : undefined,
  })

  // Calculate user's earned yield and APY - vault tokens use 6 decimals, not 18!
  const userAssetValue = userShares && totalAssets && totalSupply ? 
    (Number(formatUnits(userShares as bigint, 6)) * Number(formatUnits(totalAssets as bigint, 6))) / Number(formatUnits(totalSupply as bigint, 6)) : 0
  const userDeposited = userPrincipal ? Number(formatUnits(userPrincipal as bigint, 6)) : 0
  const userYield = userAssetValue - userDeposited
  
  // Calculate real APY based on vault performance and underlying protocol APY
  const vaultYield = totalAssets && totalPrincipal ? 
    Number(formatUnits(totalAssets as bigint, 6)) - Number(formatUnits(totalPrincipal as bigint, 6)) : 0
  const totalDeposited = totalPrincipal ? Number(formatUnits(totalPrincipal as bigint, 6)) : 0
  
  // Calculate real APY from underlying lending protocol using the same function as AppPage
  async function calculateRealAPY(): Promise<number> {
    console.log('🔍 APY Debug Info (VaultDetailPage):', {
      hasReserveData: !!reserveData,
      hasUiPoolData: !!uiPoolData,
      hasCurrentAllocation: !!currentAllocation,
      currentAllocation: currentAllocation as string,
      reserveDataRaw: reserveData,
      uiPoolDataRaw: uiPoolData,
      uiPoolDataLength: Array.isArray(uiPoolData) ? uiPoolData.length : 'not array'
    })
    
    // Try UI Pool Data Provider first (more reliable)
    if (uiPoolData) {
      try {
        console.log('🔍 Trying UI Pool Data Provider (VaultDetailPage)...')
        const reservesArray = uiPoolData as any[]
        
        // If we have currentAllocation, use it; otherwise default to USDC
        const targetAsset = currentAllocation || USDC_ADDRESS
        
        // Find the reserve data for target asset
        const currentReserve = reservesArray.find((reserve: any) => 
          reserve.underlyingAsset?.toLowerCase() === (targetAsset as string).toLowerCase()
        )
        
        if (currentReserve && currentReserve.liquidityRate) {
          const liquidityRate = currentReserve.liquidityRate
          console.log('🔍 Found reserve in UI data (VaultDetailPage):', {
            asset: currentReserve.underlyingAsset,
            symbol: currentReserve.symbol,
            liquidityRate: liquidityRate.toString(),
            isCurrentAllocation: !!currentAllocation,
            usingDefault: !currentAllocation ? 'USDC' : 'current allocation'
          })
          
          // Convert from RAY (27 decimals) to decimal APR
          const RAY = Math.pow(10, 27)
          const SECONDS_PER_YEAR = 365 * 24 * 60 * 60
          
          const aprDecimal = Number(liquidityRate) / RAY
          const grossAPY = (Math.pow(1 + (aprDecimal / SECONDS_PER_YEAR), SECONDS_PER_YEAR) - 1) * 100
          const netAPYForUsers = grossAPY * 0.85
          
          console.log('📊 APY Calculation (VaultDetailPage - UI Pool Data):', {
            asset: currentReserve.symbol,
            liquidityRateRaw: liquidityRate.toString(),
            aprDecimal: aprDecimal.toFixed(10),
            grossAPY: grossAPY.toFixed(4) + '%',
            netAPY: netAPYForUsers.toFixed(4) + '%'
          })
          
          return netAPYForUsers
        }
      } catch (error) {
        console.error('Error with UI Pool Data (VaultDetailPage):', error)
      }
    }
    
    // Fallback to direct pool contract call
    if (reserveData && currentAllocation) {
      try {
        console.log('🔍 Trying direct Pool contract (VaultDetailPage)...')
        const currentLiquidityRate = (reserveData as any)[2]
        
        console.log('🔍 Direct Pool Reserve Data (VaultDetailPage):', {
          reserveDataArray: Array.isArray(reserveData),
          reserveDataLength: Array.isArray(reserveData) ? (reserveData as any[]).length : 'not array',
          index2Value: currentLiquidityRate,
          index2String: currentLiquidityRate?.toString()
        })
        
        if (currentLiquidityRate && currentLiquidityRate !== '0') {
          const RAY = Math.pow(10, 27)
          const SECONDS_PER_YEAR = 365 * 24 * 60 * 60
          
          const aprDecimal = Number(currentLiquidityRate) / RAY
          const grossAPY = (Math.pow(1 + (aprDecimal / SECONDS_PER_YEAR), SECONDS_PER_YEAR) - 1) * 100
          const netAPYForUsers = grossAPY * 0.85
          
          console.log('📊 APY Calculation (VaultDetailPage - Direct Pool):', {
            currentLiquidityRateRaw: currentLiquidityRate.toString(),
            aprDecimal: aprDecimal.toFixed(10),
            grossAPY: grossAPY.toFixed(4) + '%',
            netAPY: netAPYForUsers.toFixed(4) + '%'
          })
          
          return netAPYForUsers
        }
      } catch (error) {
        console.error('Error with direct pool call (VaultDetailPage):', error)
      }
    }
    
    console.log('⚠️ All contract calls failed - trying direct RPC fallback (VaultDetailPage)...')
    
    // Final fallback: Get current allocation APY directly via RPC
    try {
      // Use current allocation if available, otherwise fallback to USDC
      const targetAsset = currentAllocation || USDC_ADDRESS
      const poolAddress = '0x3bD16D195786fb2F509f2E2D7F69920262EF114D'
      
      console.log('🔄 RPC fallback (VaultDetailPage) - using asset:', targetAsset, targetAsset === USDT_ADDRESS ? '(USDT)' : '(USDC)')
      
      // Make direct RPC call for target asset reserve data
      const response = await fetch('https://node.mainnet.etherlink.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: poolAddress,
            data: '0x35ea6a75' + targetAsset.slice(2).padStart(64, '0') // getReserveData(targetAsset)
          }, 'latest'],
          id: 1
        })
      })
      
      const data = await response.json()
      if (data.result && data.result !== '0x') {
        const resultHex = data.result
        const liquidityRateHex = '0x' + resultHex.slice(130, 194) // liquidityRate at offset 128 (field 2)
        const liquidityRate = BigInt(liquidityRateHex)
        
        if (liquidityRate > 0) {
          const RAY = Number(BigInt(10) ** BigInt(27))
          const SECONDS_PER_YEAR = 365 * 24 * 60 * 60
          
          const aprDecimal = Number(liquidityRate) / RAY
          const grossAPY = (Math.pow(1 + (aprDecimal / SECONDS_PER_YEAR), SECONDS_PER_YEAR) - 1) * 100
          const netAPY = grossAPY * 0.85 // 15% performance fee
          
          console.log('📊 Direct RPC APY Calculation (VaultDetailPage):', {
            asset: targetAsset === USDT_ADDRESS ? 'USDT' : 'USDC',
            liquidityRateRaw: liquidityRate.toString(),
            aprDecimal: aprDecimal.toFixed(10),
            grossAPY: grossAPY.toFixed(4) + '%',
            netAPY: netAPY.toFixed(4) + '%',
            note: `Direct RPC fallback for ${targetAsset === USDT_ADDRESS ? 'USDT' : 'USDC'}`
          })
          
          return netAPY
        }
      }
    } catch (error) {
      console.error('Direct RPC fallback failed (VaultDetailPage):', error)
    }
    
    console.log('⚠️ All APY calculation methods failed (VaultDetailPage) - returning 0')
    return 0
  }
  
  // Update APY when data changes
  useEffect(() => {
    calculateRealAPY().then(setCurrentAPY)
  }, [reserveData, uiPoolData, currentAllocation])
  
  // Debug logging
  console.log('🔍 Debug Info:', {
    userShares: userShares ? userShares.toString() : 'null',
    userSharesFormatted: userShares ? Number(formatUnits(userShares as bigint, 18)) : 0,
    totalAssets: totalAssets ? totalAssets.toString() : 'null',
    totalSupply: totalSupply ? totalSupply.toString() : 'null',
    userAssetValue,
    userDeposited,
    userYield,
    vaultYield,
    totalDeposited,
    currentAPY
  })
  
  // Get current allocation token name
  const currentAllocationToken = currentAllocation ? getTokenName(currentAllocation as string) : 'Loading...'
  
  // Calculate user's ownership percentage of the vault
  function calculateOwnershipPercentage(): string {
    if (!userShares || !totalSupply) {
      return '0.00'
    }
    
    const userSharesValue = Number(formatUnits(userShares as bigint, 6))
    const totalSupplyValue = Number(formatUnits(totalSupply as bigint, 6))
    
    if (totalSupplyValue === 0) {
      return '0.00'
    }
    
    const percentage = (userSharesValue / totalSupplyValue) * 100
    return percentage.toFixed(2)
  }
  
  // Calculate withdrawal lock countdown
  const now = Math.floor(Date.now() / 1000)
  const lockTimestamp = userDepositTimestamp ? Number(userDepositTimestamp) : 0
  const lockEndTime = lockTimestamp + (24 * 60 * 60) // 24 hours
  const timeUntilUnlock = Math.max(0, lockEndTime - now)
  // When paused, withdrawals are allowed immediately (bypass timelock)
  const canWithdraw = isPaused || timeUntilUnlock === 0
  
  // Update countdown every second
  useEffect(() => {
    if (timeUntilUnlock > 0) {
      setCountdown(timeUntilUnlock)
      const timer = setInterval(() => {
        const newTimeUntilUnlock = Math.max(0, lockEndTime - Math.floor(Date.now() / 1000))
        setCountdown(newTimeUntilUnlock)
        if (newTimeUntilUnlock === 0) {
          clearInterval(timer)
        }
      }, 1000)
      return () => clearInterval(timer)
    } else {
      setCountdown(0)
    }
  }, [lockEndTime, timeUntilUnlock])

  // Load ultra-fast activity history from The Graph
  useEffect(() => {
    loadActivityHistory()
  }, [])

  // Auto-refresh all data when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && hash) {
      console.log('🎉 Transaction confirmed! Auto-refreshing all data...', hash)
      
      // Immediate refresh of activity history (most important for user feedback)
      loadActivityHistory()
      
      // Refresh all contract data after brief delays to ensure blockchain state is updated
      setTimeout(() => {
        console.log('🔄 Refreshing vault data after transaction...')
        refetchTotalAssets()
        refetchIsPaused()
        if (address) {
          refetchUserShares()
          refetchUsdcBalance()
        }
      }, 1000) // 1 second delay
      
      // Refresh activity again after longer delay to catch subgraph updates
      setTimeout(() => {
        console.log('🔄 Final activity refresh for subgraph sync...')
        loadActivityHistory()
      }, 3000) // 3 second delay for subgraph indexing
    }
  }, [isConfirmed, hash, address])

  async function loadActivityHistory() {
    try {
      setLoadingActivities(true)
      console.log('🚀 Loading activity history from contract events...', new Date().toISOString())
      
      // Try Graph first, fallback to contract events
      try {
        console.log('📊 Trying The Graph subgraph first...')
        const activities = await graphqlService.getAllActivities(50)
        console.log('📊 Graph returned activities:', activities.length, activities)
        if (activities.length > 0) {
          setActivities(activities)
          console.log(`✅ Loaded ${activities.length} activities from The Graph`)
          setLoadingActivities(false)
          return
        } else {
          console.log('📊 The Graph returned 0 activities, trying contract events...')
        }
      } catch (graphError) {
        console.log('📊 Graph not available, using contract events...', graphError)
      }
      
      // Fallback to direct contract events
      console.log('🔗 Fallback: Loading directly from contract events...')
      const contractEvents = await getVaultEvents(50)
      console.log('🔗 Contract events returned:', contractEvents.length, contractEvents)
      setContractActivities(contractEvents)
      
      console.log(`✅ Loaded ${contractEvents.length} activities from contract events`)
      setLoadingActivities(false)
    } catch (error) {
      console.error('❌ Failed to load activity history:', error)
      setLoadingActivities(false)
    }
  }

  // Handle deposit
  async function handleDeposit() {
    if (!depositAmount || !address) return

    const amount = parseUnits(depositAmount, 6)

    try {
      // Check minimum deposit amount (1 USDC)
      if (amount < parseUnits('1', 6)) {
        alert('Minimum deposit amount is 1 USDC')
        return
      }

      // Check if user has enough USDC
      if (!usdcBalance || usdcBalance < amount) {
        alert('Insufficient USDC balance')
        return
      }

      // Check if vault is paused
      if (isPaused) {
        alert('Vault is currently paused - deposits are not allowed')
        return
      }

      // Check if approval is needed
      if (!usdcAllowance || usdcAllowance < amount) {
        console.log('Approving USDC for vault...')
        await writeContract({
          address: USDC_ADDRESS as `0x${string}`,
          abi: erc20ABI,
          functionName: 'approve',
          args: [VAULT_ADDRESS, amount],
        })
        return
      }

      console.log('Depositing to vault...')
      // Deposit to vault
      await writeContract({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: vaultABI,
        functionName: 'deposit',
        args: [amount, address],
      })

      setDepositAmount('')
    } catch (error) {
      console.error('Deposit failed:', error)
      alert('Deposit failed: ' + (error as Error).message)
    }
  }

  // Set max USDC balance for deposit
  function setMaxDeposit() {
    if (usdcBalance) {
      const maxAmount = formatUnits(usdcBalance, 6)
      setDepositAmount(maxAmount)
    }
  }

  // Handle withdraw
  async function handleWithdraw() {
    if (!withdrawAmount || !address) return

    const amount = parseUnits(withdrawAmount, 6)

    try {
      // Check if user has enough asset balance
      if (!userAssetValue || Number(userAssetValue) < Number(withdrawAmount)) {
        alert('Insufficient vault balance')
        return
      }

      // Check withdrawal lock (unless paused)
      if (!canWithdraw) {
        alert(`Withdrawal locked. Time remaining: ${formatTimeRemaining(countdown)}`)
        return
      }

      console.log('Withdrawing from vault...')
      await writeContract({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: vaultABI,
        functionName: 'withdraw',
        args: [amount, address, address],
      })

      setWithdrawAmount('')
    } catch (error) {
      console.error('Withdraw failed:', error)
      alert('Withdraw failed: ' + (error as Error).message)
    }
  }

  // Set max vault balance for withdrawal
  function setMaxWithdraw() {
    if (userAssetValue) {
      setWithdrawAmount(userAssetValue.toString())
    }
  }

  // Format activity for display
  function formatActivity(activity: VaultActivity) {
    const date = new Date(parseInt(activity.blockTimestamp) * 1000)
    
    switch (activity.type) {
      case 'deposit':
        return {
          type: 'Deposit',
          user: activity.user ? `${activity.user.slice(0, 6)}...${activity.user.slice(-4)}` : '',
          amount: activity.assets ? formatUSD(Number(formatUnits(BigInt(activity.assets), 6))) : '',
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString(),
          hash: activity.transactionHash
        }
      case 'withdrawal':
        return {
          type: 'Withdrawal',
          user: activity.user ? `${activity.user.slice(0, 6)}...${activity.user.slice(-4)}` : '',
          amount: activity.assets ? formatUSD(Number(formatUnits(BigInt(activity.assets), 6))) : '',
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString(),
          hash: activity.transactionHash
        }
      case 'rebalance': {
        const fromToken = getTokenSymbol(activity.fromAsset)
        const toToken = getTokenSymbol(activity.toAsset)
        const rebalanceInfo = activity.fromAsset && activity.toAsset ? `${fromToken} → ${toToken}` : 'Vault'
        return {
          type: 'Rebalance',
          user: rebalanceInfo,
          amount: activity.assets || activity.amount ? formatUSD(Number(formatUnits(BigInt(activity.assets || activity.amount || '0'), 6))) : '',
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString(),
          hash: activity.transactionHash
        }
      }
      case 'fees_claimed':
        return {
          type: 'Fees Claimed',
          user: 'Admin',
          amount: activity.assets ? formatUSD(Number(formatUnits(BigInt(activity.assets), 6))) : '',
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString(),
          hash: activity.transactionHash
        }
      default:
        return {
          type: 'Activity',
          user: '',
          amount: '',
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString(),
          hash: activity.transactionHash
        }
    }
  }

  if (!vaultAddress || vaultAddress !== VAULT_ADDRESS) {
    return (
      <div>
        <header className="header">
          <div className="container">
            <div className="header-content">
              <Link to="/" className="logo">Superlink</Link>
              <ConnectButton />
            </div>
          </div>
        </header>
        <main>
          <div className="container" style={{ paddingTop: '60px', textAlign: 'center' }}>
            <h1>Vault Not Found</h1>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              The requested vault does not exist.
            </p>
            <Link to="/" className="btn">← Back to App</Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo">Superlink</Link>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <div className="container" style={{ paddingTop: '32px', paddingBottom: '80px' }}>
          
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link to="/" className="btn-ghost" style={{ textDecoration: 'none' }}>← Back to Vaults</Link>
          </div>

          {/* Vault Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-3xl" style={{ margin: 0 }}>
                {vaultName || 'Superlink USD Vault'}
              </h1>
              <span className={`status ${isPaused ? 'status-paused' : 'status-live'}`}>
                {isPaused ? 'Emergency Paused' : 'Live'}
              </span>
            </div>
            <div className="text-secondary" style={{ lineHeight: '1.6', maxWidth: '900px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
                Automated USDC savings vault, rebalancing between the highest stablecoin yields on Superlend on Etherlink. 
                <strong> Performance fees: 15%</strong> - Withdrawals are locked for 24 hours after deposit, depositing again will reset the locktime.
              </p>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
                The APY displayed is the real live APY from Superlend pools (USDC or USDT depending on the current vault allocation), 
                net of performance fees (15%). The APY does not take in account additional incentives such as Apple Farm. 
                It is purely computed based on the current lending and borrowing metrics of the USDC or USDT pools on Superlend.
              </p>
              <a 
                href="https://explorer.etherlink.com/address/0xe60009Dd8017CC4f300f16655E337B382A7AEAE6?tab=index"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
                style={{ padding: '4px 8px', fontSize: '12px', textDecoration: 'none' }}
              >
                View vault contract →
              </a>
            </div>
          </div>

          {/* Vault Stats */}
          <div className="stats-grid mb-8">
            <div className="stat-item">
              <div 
                className="stat-value" 
                title={`Exact TVL: $${totalAssets ? formatUnits(totalAssets as bigint, 6) : '0.000000'}`}
                style={{ cursor: 'help' }}
              >
                ${totalAssets ? Number(formatUnits(totalAssets as bigint, 6)).toFixed(2) : '0.00'}
              </div>
              <div className="stat-label">Total Value Locked</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{currentAllocationToken}</div>
              <div className="stat-label">Current Asset</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{currentAPY.toFixed(2)}%</div>
              <div className="stat-label">Current APY</div>
            </div>
            <div className="stat-item">
              <div 
                className="stat-value" 
                title={`Exact yield: $${vaultYield.toFixed(6)}`}
                style={{ 
                  cursor: 'help',
                  color: vaultYield > 0 ? 'var(--success)' : (vaultYield < 0 ? 'var(--error)' : 'inherit')
                }}
              >
                ${vaultYield.toFixed(2)}
              </div>
              <div className="stat-label">Total Yield</div>
            </div>
          </div>

          {/* User Position (if connected) */}
          {isConnected && (
            <div className="card card-elevated mb-8">
              <div className="card-header">
                <h3 className="card-title">Your Position</h3>
                <p className="card-subtitle">Track your deposits, yield, and vault ownership</p>
              </div>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{formatUSD(userDeposited)}</div>
                  <div className="stat-label">Deposits</div>
                </div>
                <div className="stat-item">
                  <div 
                    className="stat-value" 
                    title={`Exact yield: $${userYield.toFixed(6)}`}
                    style={{ 
                      color: userYield > 0 ? 'var(--success)' : (userYield < 0 ? 'var(--error)' : 'inherit'),
                      cursor: 'help'
                    }}
                  >
                    ${userYield.toFixed(2)}
                  </div>
                  <div className="stat-label">Yield Earned</div>
                </div>
                <div className="stat-item">
                  <div 
                    className="stat-value" 
                    title={`Exact balance: ${usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0.000000'} USDC`}
                    style={{ cursor: 'help' }}
                  >
                    ${usdcBalance ? Number(formatUnits(usdcBalance as bigint, 6)).toFixed(2) : '0.00'}
                  </div>
                  <div className="stat-label">USDC Balance</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{calculateOwnershipPercentage()}%</div>
                  <div className="stat-label">Vault Share</div>
                </div>
              </div>
            </div>
          )}

          {/* Deposit/Withdraw Interface */}
          {isConnected && (
            <div className="card card-elevated mb-8">
              <div className="card-header">
                <h3 className="card-title">Manage Position</h3>
                <p className="card-subtitle">Deposit USDC to start earning or withdraw your position</p>
              </div>
              <div className="flex gap-4 mb-6">
                <button 
                  onClick={() => setShowDeposit(true)}
                  className={showDeposit ? 'btn btn-primary' : 'btn'}
                  disabled={isPaused}
                  style={{ flex: 1 }}
                >
                  Deposit
                </button>
                <button 
                  onClick={() => setShowDeposit(false)}
                  className={!showDeposit ? 'btn btn-primary' : 'btn'}
                  style={{ flex: 1 }}
                >
                  Withdraw
                </button>
              </div>

              {showDeposit ? (
                isPaused ? (
                  <div className="text-center">
                    <div className="error">
                      <div className="flex items-center gap-4 mb-4">
                        <div>
                          <h4 className="text-lg mb-2">Deposits Disabled</h4>
                          <p>Deposits are disabled during emergency pause. Only withdrawals are allowed.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowDeposit(false)} 
                        className="btn btn-primary"
                      >
                        Switch to Withdraw
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Amount (USDC)</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0.00"
                          max={usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0'}
                          style={{ paddingRight: '80px', fontSize: '18px', height: '56px' }}
                        />
                        <button
                          type="button"
                          onClick={setMaxDeposit}
                          className="btn-ghost"
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            padding: '6px 12px',
                            fontSize: '12px',
                            minHeight: 'auto',
                            fontWeight: '600'
                          }}
                        >
                          MAX
                        </button>
                      </div>
                      <div className="text-secondary mt-4 flex justify-between">
                        <span>Available: {usdcBalance ? Number(formatUnits(usdcBalance as bigint, 6)).toFixed(2) : '0.00'} USDC</span>
                        <span>Min: 1.00 USDC</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleDeposit}
                      disabled={!depositAmount || isConfirming}
                      className="btn btn-primary w-full"
                      style={{ height: '48px', fontSize: '16px' }}
                    >
                      {isConfirming ? 'Processing...' : 
                       (!usdcAllowance || (depositAmount && usdcAllowance < parseUnits(depositAmount, 6))) ? 'Approve USDC' : 'Deposit to Vault'}
                    </button>
                  </div>
                )
              ) : (
                <div>
                  <div className="form-group">
                    <label className="form-label">Amount (USDC)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        max={userAssetValue.toString()}
                        style={{ paddingRight: '80px', fontSize: '18px', height: '56px' }}
                        disabled={!canWithdraw}
                      />
                      <button
                        type="button"
                        onClick={setMaxWithdraw}
                        className="btn-ghost"
                        disabled={!canWithdraw}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          padding: '6px 12px',
                          fontSize: '12px',
                          minHeight: 'auto',
                          fontWeight: '600'
                        }}
                      >
                        MAX
                      </button>
                    </div>
                    <div className="mt-4">
                      {!canWithdraw && userAssetValue > 0 && (
                        <div className="error" style={{ padding: '12px', marginBottom: '12px' }}>
                          Withdrawal locked for: {formatTimeRemaining(countdown > 0 ? countdown : timeUntilUnlock)}
                        </div>
                      )}
                      {isPaused && (
                        <div className="success" style={{ padding: '12px', marginBottom: '12px' }}>
                          Emergency withdrawals allowed (timelock bypassed)
                        </div>
                      )}
                      <div className="text-secondary flex justify-between">
                        <span>Available: {formatUSD(userAssetValue)}</span>
                        <span>{!canWithdraw ? 'Locked' : 'Ready'}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || isConfirming || !canWithdraw}
                    className={`btn w-full ${!canWithdraw ? 'btn-ghost' : 'btn-primary'}`}
                    style={{ height: '48px', fontSize: '16px' }}
                  >
                    {isConfirming ? 'Processing...' : (!canWithdraw ? 'Locked' : 'Withdraw from Vault')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Emergency Pause Notice */}
          {isPaused && (
            <div className="error mb-8">
              <div className="flex items-center gap-4">
                <div>
                  <h4 className="text-lg mb-2">Emergency Pause Active</h4>
                  <p>The vault is currently paused. Only withdrawals are allowed during this time.</p>
                </div>
              </div>
            </div>
          )}

          {/* Activity History */}
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="card-title">Recent Activity</h3>
                  <p className="card-subtitle">Track all vault transactions in real-time</p>
                </div>
                <button onClick={loadActivityHistory} className="btn-ghost" disabled={loadingActivities}>
                  {loadingActivities ? (
                    <div className="flex items-center gap-2">
                      <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    'Refresh'
                  )}
                </button>
              </div>
            </div>

            {loadingActivities ? (
              <div className="loading">
                <div className="loading-spinner"></div>
                <span>Loading activity history...</span>
              </div>
            ) : activities.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>User/Details</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Use The Graph data if available, otherwise use contract events */}
                    {activities.length > 0 
                      ? activities.map((activity, index) => {
                          const formatted = formatActivity(activity)
                          return (
                            <tr key={index}>
                              <td><span style={{ fontWeight: '500' }}>{formatted.type}</span></td>
                              <td className="text-secondary">{formatted.user}</td>
                              <td style={{ fontWeight: '600' }}>{formatted.amount}</td>
                              <td className="text-secondary">{formatted.date}</td>
                              <td className="text-secondary">{formatted.time}</td>
                              <td>
                                <a 
                                  href={`https://explorer.etherlink.com/tx/${formatted.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-ghost"
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                >
                                  {formatted.hash.slice(0, 8)}...
                                </a>
                              </td>
                            </tr>
                          )
                        })
                      : contractActivities.map((activity, index) => {
                          const formatted = formatActivityForDisplay(activity)
                          return (
                            <tr key={index}>
                              <td><span style={{ fontWeight: '500' }}>{formatted.type}</span></td>
                              <td className="text-secondary">{formatted.user}</td>
                              <td style={{ fontWeight: '600' }}>{formatted.amount}</td>
                              <td className="text-secondary">{formatted.date}</td>
                              <td className="text-secondary">{formatted.time}</td>
                              <td>
                                <a 
                                  href={`https://explorer.etherlink.com/tx/${formatted.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-ghost"
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                >
                                  {formatted.hash.slice(0, 8)}...
                                </a>
                              </td>
                            </tr>
                          )
                        })
                    }
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center" style={{ padding: '60px 20px' }}>
                <h4 className="text-lg mb-4">No activity yet</h4>
                <p className="text-secondary">Activity will appear here once transactions are made.</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}