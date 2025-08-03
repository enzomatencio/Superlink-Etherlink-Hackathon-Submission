import { useEffect, useState, useCallback } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { Link } from 'react-router-dom'
import { VAULT_ADDRESS, USDC_ADDRESS, USDT_ADDRESS } from '../config/web3'
import { vaultABI } from '../config/abi'

interface VaultInfo {
  address: string
  name: string
  symbol: string
  tvl: string
  apy: string
  totalEarned: string
  status: 'live' | 'paused'
  isRebalancing: boolean
}


export default function AppPage() {
  const { isConnected } = useAccount()
  const [vaults, setVaults] = useState<VaultInfo[]>([])
  const [loading, setLoading] = useState(true)

  // Read vault data
  const { data: vaultName } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'name',
  })

  const { data: vaultSymbol } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'symbol',
  })

  const { data: totalAssets } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'totalAssets',
  })

  const { data: isPaused } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'paused',
  })

  const { data: canRebalanceData } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'canRebalance',
  })

  const { data: currentAllocation } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'currentAllocation',
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

  const { data: totalPrincipal } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'totalPrincipal',
  })

  const loadVaultData = useCallback(async () => {
    try {
      // Calculate real APY from underlying lending protocol
      const currentAPY = await calculateRealAPY()
      
      // Calculate total yield earned by the vault
      const totalYieldEarned = calculateTotalYieldEarned()
      
      const vaultInfo: VaultInfo = {
        address: VAULT_ADDRESS,
        name: (vaultName as string) || 'Superlink USD Vault',
        symbol: (vaultSymbol as string) || 'USD',
        tvl: totalAssets ? formatUnits(totalAssets as bigint, 6) : '0',
        apy: currentAPY.toFixed(2),
        totalEarned: totalYieldEarned.toFixed(2),
        status: isPaused ? 'paused' : 'live',
        isRebalancing: canRebalanceData ? (canRebalanceData as readonly [boolean, string, `0x${string}`, bigint, bigint])[0] : false
      }
      
      setVaults([vaultInfo])
      setLoading(false)
    } catch (error) {
      console.error('Error loading vault data:', error)
      // Fallback to basic data with real blockchain values
      const currentAPY = await calculateRealAPY()
      const totalYieldEarned = calculateTotalYieldEarned()
      
      setVaults([{
        address: VAULT_ADDRESS,
        name: (vaultName as string) || 'Superlink USD Vault',
        symbol: (vaultSymbol as string) || 'USD',
        tvl: totalAssets ? formatUnits(totalAssets as bigint, 6) : '0',
        apy: currentAPY.toFixed(2),
        totalEarned: totalYieldEarned.toFixed(2),
        status: isPaused ? 'paused' : 'live',
        isRebalancing: false
      }])
      setLoading(false)
    }
  }, [vaultName, vaultSymbol, totalAssets, isPaused, canRebalanceData, totalPrincipal, reserveData, uiPoolData, currentAllocation])

  useEffect(() => {
    loadVaultData()
  }, [loadVaultData])

  async function calculateRealAPY(): Promise<number> {
    console.log('🔍 APY Debug Info:', {
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
        console.log('🔍 Trying UI Pool Data Provider...')
        const reservesArray = uiPoolData as any[]
        
        // Debug: Show all available reserves
        console.log('📋 Available Superlend reserves:', 
          reservesArray.map(r => ({ 
            symbol: r.symbol, 
            address: r.underlyingAsset,
            liquidityRate: r.liquidityRate?.toString()
          }))
        )
        
        // Strategy: Always use current allocation, fallback to USDC if unknown
        let targetAsset = currentAllocation as string
        let fallbackReason = 'using current allocation'
        
        if (!currentAllocation) {
          targetAsset = USDC_ADDRESS
          fallbackReason = 'vault allocation unknown, using base asset (USDC)'
        }
        
        // Find the reserve data for target asset
        const currentReserve = reservesArray.find((reserve: any) => 
          reserve.underlyingAsset?.toLowerCase() === (targetAsset as string).toLowerCase()
        )
        
        if (currentReserve && currentReserve.liquidityRate) {
          const liquidityRate = currentReserve.liquidityRate
          console.log('🔍 Found reserve in UI data:', {
            asset: currentReserve.underlyingAsset,
            symbol: currentReserve.symbol,
            liquidityRate: liquidityRate.toString(),
            strategy: fallbackReason
          })
          
          // Convert from RAY (27 decimals) to decimal APR
          const RAY = Math.pow(10, 27)
          const SECONDS_PER_YEAR = 365 * 24 * 60 * 60
          
          const aprDecimal = Number(liquidityRate) / RAY
          const grossAPY = (Math.pow(1 + (aprDecimal / SECONDS_PER_YEAR), SECONDS_PER_YEAR) - 1) * 100
          const netAPYForUsers = grossAPY * 0.85
          
          console.log('📊 APY Calculation (UI Pool Data):', {
            asset: currentReserve.symbol,
            liquidityRateRaw: liquidityRate.toString(),
            aprDecimal: aprDecimal.toFixed(10),
            grossAPY: grossAPY.toFixed(4) + '%',
            netAPY: netAPYForUsers.toFixed(4) + '%',
            note: fallbackReason
          })
          
          return netAPYForUsers
        } else {
          console.log('⚠️ Target asset not found in reserves, available assets:', 
            reservesArray.map(r => ({ symbol: r.symbol, address: r.underlyingAsset }))
          )
        }
      } catch (error) {
        console.error('Error with UI Pool Data:', error)
      }
    }
    
    // Fallback to direct pool contract call
    if (reserveData && currentAllocation) {
      try {
        console.log('🔍 Trying direct Pool contract...')
        const currentLiquidityRate = (reserveData as any)[2]
        
        console.log('🔍 Direct Pool Reserve Data:', {
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
          
          console.log('📊 APY Calculation (Direct Pool):', {
            currentLiquidityRateRaw: currentLiquidityRate.toString(),
            aprDecimal: aprDecimal.toFixed(10),
            grossAPY: grossAPY.toFixed(4) + '%',
            netAPY: netAPYForUsers.toFixed(4) + '%'
          })
          
          return netAPYForUsers
        }
      } catch (error) {
        console.error('Error with direct pool call:', error)
      }
    }
    
    console.log('⚠️ All contract calls failed - trying direct USDC fallback...')
    
    // Final fallback: Get current allocation APY directly via RPC
    try {
      // Use current allocation if available, otherwise fallback to USDC
      const targetAsset = currentAllocation || USDC_ADDRESS
      const poolAddress = '0x3bD16D195786fb2F509f2E2D7F69920262EF114D'
      
      console.log('🔄 RPC fallback - using asset:', targetAsset, targetAsset === USDT_ADDRESS ? '(USDT)' : '(USDC)')
      
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
          
          console.log('📊 Direct RPC APY Calculation:', {
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
      console.error('Direct RPC fallback failed:', error)
    }
    
    console.log('⚠️ All APY calculation methods failed - returning 0')
    return 0
  }

  function calculateTotalYieldEarned(): number {
    // Calculate total yield earned by the vault (totalAssets - totalPrincipal)
    if (!totalAssets || !totalPrincipal) {
      return 0
    }
    
    const totalAssetsValue = Number(formatUnits(totalAssets as bigint, 6))
    const totalPrincipalValue = Number(formatUnits(totalPrincipal as bigint, 6))
    
    return Math.max(0, totalAssetsValue - totalPrincipalValue)
  }

  if (loading) {
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
          <div className="container" style={{ paddingTop: '40px' }}>
            <div className="loading">Loading vaults...</div>
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
          {/* Page Title */}
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
              Yield Vaults
            </h1>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="card" style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h3 className="card-title">Connect Your Wallet</h3>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Connect your wallet to view and interact with vaults
              </p>
              <ConnectButton />
            </div>
          )}

          {/* Vaults List */}
          <div style={{ display: 'grid', gap: '24px' }}>
            {vaults.map((vault) => (
              <div key={vault.address} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {vault.name}
                      <span className={vault.status === 'live' ? 'status-live' : 'status-paused'}>
                        {vault.status === 'live' ? '● Live' : '⏸ Paused'}
                      </span>
                    </h3>
                    <div className="card-subtitle" style={{ lineHeight: '1.6', maxWidth: '800px' }}>
                      <p style={{ margin: '0 0 12px 0' }}>
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
                  <Link 
                    to={`/vault/${vault.address}`} 
                    className="btn btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    View Vault →
                  </Link>
                </div>

                {/* Vault Stats */}
                <div className="stats-grid" style={{ margin: '0' }}>
                  <div className="stat-item">
                    <div 
                      className="stat-value" 
                      title={`Exact TVL: $${vault.tvl}`}
                      style={{ cursor: 'help' }}
                    >
                      ${Number(vault.tvl).toFixed(2)}
                    </div>
                    <div className="stat-label">Total Value Locked</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{vault.apy}%</div>
                    <div className="stat-label">Current APY</div>
                  </div>
                  <div className="stat-item">
                    <div 
                      className="stat-value" 
                      title={`Exact yield: ${Number(vault.totalEarned) < 0 ? '-' : ''}$${Math.abs(Number(vault.totalEarned)).toFixed(6)}`}
                      style={{ 
                        cursor: 'help',
                        color: Number(vault.totalEarned) > 0 ? '#22c55e' : (Number(vault.totalEarned) < 0 ? '#ef4444' : 'inherit')
                      }}
                    >
                      ${Number(vault.totalEarned) >= 0 ? Math.abs(Number(vault.totalEarned)).toFixed(2) : Number(vault.totalEarned).toFixed(2)}
                    </div>
                    <div className="stat-label">Total Yield Earned</div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div style={{ textAlign: 'center', marginTop: '60px', color: '#666' }}>
            <p>
              Superlink automatically optimizes yields across lending protocols on Etherlink
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}