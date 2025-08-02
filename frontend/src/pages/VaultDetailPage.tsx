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
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  // Read vault data
  const { data: vaultName } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'name',
  })

  const { data: totalAssets } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'totalAssets',
  })

  const { data: userShares } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
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
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
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

  const { data: isPaused } = useReadContract({
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

  async function loadActivityHistory() {
    try {
      setLoadingActivities(true)
      console.log('🚀 Loading activity history from contract events...')
      
      // Try Graph first, fallback to contract events
      try {
        const activities = await graphqlService.getAllActivities(50)
        if (activities.length > 0) {
          setActivities(activities)
          console.log(`✅ Loaded ${activities.length} activities from The Graph`)
          setLoadingActivities(false)
          return
        }
      } catch (graphError) {
        console.log('Graph not available, using contract events...')
      }
      
      // Fallback to direct contract events
      const contractEvents = await getVaultEvents(50)
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
          type: '💰 Deposit',
          user: activity.user ? `${activity.user.slice(0, 6)}...${activity.user.slice(-4)}` : '',
          amount: activity.assets ? formatUSD(Number(formatUnits(BigInt(activity.assets), 6))) : '',
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString(),
          hash: activity.transactionHash
        }
      case 'withdrawal':
        return {
          type: '💸 Withdrawal',
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
          type: '🔄 Rebalance',
          user: rebalanceInfo,
          amount: activity.assets || activity.amount ? formatUSD(Number(formatUnits(BigInt(activity.assets || activity.amount || '0'), 6))) : '',
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString(),
          hash: activity.transactionHash
        }
      }
      case 'fees_claimed':
        return {
          type: '💼 Fees Claimed',
          user: 'Admin',
          amount: activity.assets ? formatUSD(Number(formatUnits(BigInt(activity.assets), 6))) : '',
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
        <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
          
          {/* Breadcrumb */}
          <div style={{ marginBottom: '24px' }}>
            <Link to="/" className="btn" style={{ textDecoration: 'none' }}>← Back to Vaults</Link>
          </div>

          {/* Vault Header */}
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
              {vaultName || 'Superlink USD Vault'}
            </h1>
            <p style={{ color: '#666' }}>
              Automated USDC yield optimization • 
              <span className={isPaused ? 'status-paused' : 'status-live'}>
                {isPaused ? ' ⏸ Emergency Paused' : ' ✅ Live'}
              </span>
            </p>
          </div>

          {/* Vault Stats */}
          <div className="stats-grid" style={{ marginBottom: '40px' }}>
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
              <div className="stat-value" style={{ color: '#6366f1' }}>{currentAllocationToken}</div>
              <div className="stat-label">Currently Allocated To</div>
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
                  color: vaultYield > 0 ? '#22c55e' : (vaultYield < 0 ? '#ef4444' : 'inherit')
                }}
              >
                ${vaultYield.toFixed(2)}
              </div>
              <div className="stat-label">Total Yield Earned</div>
            </div>
          </div>

          {/* User Position (if connected) */}
          {isConnected && (
            <div className="card" style={{ marginBottom: '40px' }}>
              <h3 className="card-title">Your Position</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{formatUSD(userDeposited)}</div>
                  <div className="stat-label">Your Deposits</div>
                </div>
                <div className="stat-item">
                  <div 
                    className="stat-value" 
                    title={`Exact yield: $${userYield.toFixed(6)}`}
                    style={{ 
                      color: userYield > 0 ? '#22c55e' : (userYield < 0 ? '#ef4444' : 'inherit'),
                      cursor: 'help'
                    }}
                  >
                    ${userYield.toFixed(2)}
                  </div>
                  <div className="stat-label">Your Yield Earned</div>
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
                  <div className="stat-label">Vault Ownership</div>
                </div>
              </div>
            </div>
          )}

          {/* Deposit/Withdraw Interface */}
          {isConnected && (
            <div className="card" style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <button 
                  onClick={() => setShowDeposit(true)}
                  className={showDeposit ? 'btn btn-primary' : 'btn'}
                  disabled={isPaused}
                >
                  Deposit
                </button>
                <button 
                  onClick={() => setShowDeposit(false)}
                  className={!showDeposit ? 'btn btn-primary' : 'btn'}
                >
                  Withdraw
                </button>
              </div>

              {showDeposit ? (
                isPaused ? (
                  <div>
                    <h4 className="card-title">Deposits Disabled</h4>
                    <div className="error" style={{ marginTop: '16px' }}>
                      <p>Deposits are disabled during emergency pause. Only withdrawals are allowed.</p>
                      <button 
                        onClick={() => setShowDeposit(false)} 
                        className="btn btn-primary" 
                        style={{ marginTop: '12px' }}
                      >
                        Switch to Withdraw
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="card-title">Deposit USDC</h4>
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
                        style={{ paddingRight: '60px' }}
                      />
                      <button
                        type="button"
                        onClick={setMaxDeposit}
                        className="btn"
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          padding: '4px 8px',
                          fontSize: '12px',
                          minHeight: 'auto'
                        }}
                      >
                        MAX
                      </button>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                      Available: {usdcBalance ? Number(formatUnits(usdcBalance as bigint, 6)).toFixed(2) : '0.00'} USDC
                    </div>
                  </div>
                  <button 
                    onClick={handleDeposit}
                    disabled={!depositAmount || isConfirming}
                    className="btn btn-primary"
                  >
                    {isConfirming ? 'Processing...' : 
                     (!usdcAllowance || (depositAmount && usdcAllowance < parseUnits(depositAmount, 6))) ? 'Approve USDC' : 'Deposit'}
                  </button>
                </div>
                )
              ) : (
                <div>
                  <h4 className="card-title">Withdraw USDC</h4>
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
                        style={{ paddingRight: '60px' }}
                        disabled={!canWithdraw}
                      />
                      <button
                        type="button"
                        onClick={setMaxWithdraw}
                        className="btn"
                        disabled={!canWithdraw}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          padding: '4px 8px',
                          fontSize: '12px',
                          minHeight: 'auto'
                        }}
                      >
                        MAX
                      </button>
                    </div>
                    {!canWithdraw && (
                      <div style={{ fontSize: '14px', color: '#ef4444', marginTop: '8px' }}>
                        🔒 Withdrawal locked for: {formatTimeRemaining(countdown > 0 ? countdown : timeUntilUnlock)}
                      </div>
                    )}
                    {isPaused && (
                      <div style={{ fontSize: '14px', color: '#22c55e', marginTop: '8px' }}>
                        ✅ Emergency withdrawals allowed (timelock bypassed)
                      </div>
                    )}
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                      Available: {formatUSD(userAssetValue)}
                    </div>
                  </div>
                  <button 
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || isConfirming || !canWithdraw}
                    className="btn btn-primary"
                  >
                    {isConfirming ? 'Processing...' : (!canWithdraw ? 'Locked' : 'Withdraw')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Emergency Pause Notice */}
          {isPaused && (
            <div className="error" style={{ marginBottom: '40px' }}>
              <h4 style={{ marginBottom: '8px' }}>🚨 Emergency Pause Active</h4>
              <p>The vault is currently paused. Only withdrawals are allowed during this time.</p>
            </div>
          )}

          {/* Ultra-Fast Activity History */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="card-title">Activity History</h3>
              <button onClick={loadActivityHistory} className="btn" disabled={loadingActivities}>
                {loadingActivities ? '⟳ Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {loadingActivities ? (
              <div className="loading">Loading ultra-fast activity history...</div>
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
                              <td>{formatted.type}</td>
                              <td>{formatted.user}</td>
                              <td>{formatted.amount}</td>
                              <td>{formatted.date}</td>
                              <td>{formatted.time}</td>
                              <td>
                                <a 
                                  href={`https://explorer.etherlink.com/tx/${formatted.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#000', textDecoration: 'none' }}
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
                              <td>{formatted.type}</td>
                              <td>{formatted.user}</td>
                              <td>{formatted.amount}</td>
                              <td>{formatted.date}</td>
                              <td>{formatted.time}</td>
                              <td>
                                <a 
                                  href={`https://explorer.etherlink.com/tx/${formatted.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#000', textDecoration: 'none' }}
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
              <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                <div style={{ marginBottom: '16px' }}>
                  📊 No activity yet
                </div>
                <div style={{ fontSize: '14px' }}>
                  Activity will appear here once transactions are made.
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}