import { useEffect, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSignMessage, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { VAULT_ADDRESS, ADMIN_ADDRESS } from '../config/web3'
import { vaultABI } from '../config/abi'

export default function AdminPage() {
  console.log('👑 AdminPage component starting...')
  
  // Add error handling for wagmi hooks
  let address: `0x${string}` | undefined, isConnected: boolean
  try {
    const accountResult = useAccount()
    address = accountResult.address
    isConnected = accountResult.isConnected
    console.log('✅ useAccount hook successful', { address, isConnected })
  } catch (error) {
    console.error('❌ useAccount hook failed:', error)
    // Return a fallback UI
    return (
      <div style={{ padding: '40px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <h1 style={{ color: '#000' }}>Admin Page - Connection Error</h1>
        <p style={{ color: '#000' }}>Unable to connect to wallet provider. Please refresh the page.</p>
        <pre style={{ color: '#000', fontSize: '12px' }}>{String(error)}</pre>
      </div>
    )
  }
  
  const [isAdmin, setIsAdmin] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [hasVerifiedSignature, setHasVerifiedSignature] = useState(false)
  const [newTvlCap, setNewTvlCap] = useState('')
  
  // Safely initialize wagmi hooks
  let signMessageAsync: any, writeContract: any, hash: any, isConfirmed: boolean = false
  try {
    const signResult = useSignMessage()
    const writeResult = useWriteContract()
    signMessageAsync = signResult.signMessageAsync
    writeContract = writeResult.writeContract
    hash = writeResult.data
    
    const { isSuccess } = useWaitForTransactionReceipt({ hash })
    isConfirmed = isSuccess || false
    
    console.log('✅ wagmi hooks initialized successfully')
  } catch (error) {
    console.error('❌ wagmi hooks failed:', error)
    signMessageAsync = () => Promise.reject('Hook not available')
    writeContract = () => Promise.reject('Hook not available')
  }
  
  // Separate states for different actions to prevent button conflicts
  const [actionStates, setActionStates] = useState({
    pause: false,
    fees: false,
    tvl: false,
    rebalance: false
  })

  // Read vault data for admin functions
  const { data: totalAssets, refetch: refetchTotalAssets } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'totalAssets',
  })

  const { data: totalPrincipal, refetch: refetchTotalPrincipal } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'totalPrincipal',
  })

  const { data: isPaused, refetch: refetchPausedStatus } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'paused',
  })

  const { data: canRebalanceData, refetch: refetchCanRebalance } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'canRebalance',
  })

  const { data: tvlCap, refetch: refetchTvlCap } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'tvlCap',
  })

  // Calculate pending fees - only if there's actual yield (positive difference)
  const yieldGenerated = totalAssets && totalPrincipal ? 
    (Number(formatUnits(totalAssets as bigint, 6)) - Number(formatUnits(totalPrincipal as bigint, 6))) : 0
  const pendingFees = yieldGenerated > 0 ? yieldGenerated * 0.15 : 0

  // Auto-refresh all admin data when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && hash) {
      console.log('🎉 Admin transaction confirmed! Auto-refreshing data...', hash)
      
      // Refresh all admin-relevant data after brief delay
      setTimeout(() => {
        console.log('🔄 Refreshing admin vault data after transaction...')
        refetchTotalAssets()
        refetchTotalPrincipal()
        refetchPausedStatus()
        refetchCanRebalance()
        refetchTvlCap()
      }, 1000) // 1 second delay to ensure blockchain state is updated
    }
  }, [isConfirmed, hash])

  useEffect(() => {
    console.log('🔍 Admin verification state:', {
      isConnected,
      address,
      ADMIN_ADDRESS,
      hasVerifiedSignature,
      addressMatch: address?.toLowerCase() === ADMIN_ADDRESS?.toLowerCase()
    })
    
    // Reset verification if wallet disconnects or address changes
    if (!isConnected || !address) {
      setHasVerifiedSignature(false)
      setIsAdmin(false)
      return
    }
    
    // Only set isAdmin to true if address matches AND signature has been verified
    if (isConnected && address && ADMIN_ADDRESS && hasVerifiedSignature) {
      const addressMatches = address.toLowerCase() === ADMIN_ADDRESS?.toLowerCase()
      setIsAdmin(addressMatches)
      console.log('✅ Setting isAdmin to:', addressMatches)
    } else {
      setIsAdmin(false)
      console.log('❌ Setting isAdmin to false')
    }
  }, [address, isConnected, hasVerifiedSignature])

  async function verifyAdminSignature() {
    if (!address || !ADMIN_ADDRESS) return

    setIsVerifying(true)
    try {
      const message = `I am the admin of Superlink Vault at ${VAULT_ADDRESS}\nTimestamp: ${Date.now()}`
      
      console.log('🔐 Starting signature verification...')
      
      // Wait for the user to actually sign the message
      const signature = await signMessageAsync({
        message,
      })
      
      console.log('✅ Signature received:', signature ? 'success' : 'failed')
      
      // Only proceed if we got a signature back and address matches
      if (signature && address.toLowerCase() === ADMIN_ADDRESS?.toLowerCase()) {
        setHasVerifiedSignature(true)
        console.log('🎉 Admin access granted')
      }
    } catch (error) {
      console.error('Admin verification failed:', error)
      // Silently handle rejections - user chose not to sign
    } finally {
      setIsVerifying(false)
    }
  }

  // Admin functions
  async function emergencyPause() {
    if (!isAdmin) return
    setActionStates(prev => ({ ...prev, pause: true }))
    try {
      await writeContract({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: vaultABI,
        functionName: 'emergencyPause',
        args: [],
      })
      console.log('Emergency pause transaction submitted')
      // Refetch paused status after transaction
      setTimeout(() => refetchPausedStatus(), 2000)
    } catch (error) {
      console.error('Emergency pause failed:', error)
      alert('Emergency pause failed: ' + (error as Error).message)
    } finally {
      setActionStates(prev => ({ ...prev, pause: false }))
    }
  }

  async function unpause() {
    if (!isAdmin) return
    setActionStates(prev => ({ ...prev, pause: true }))
    try {
      await writeContract({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: vaultABI,
        functionName: 'unpause',
        args: [],
      })
      console.log('Unpause transaction submitted')
      // Refetch paused status after transaction
      setTimeout(() => refetchPausedStatus(), 2000)
    } catch (error) {
      console.error('Unpause failed:', error)
      alert('Unpause failed: ' + (error as Error).message)
    } finally {
      setActionStates(prev => ({ ...prev, pause: false }))
    }
  }

  async function rebalanceVault() {
    if (!isAdmin) return
    
    // Check if rebalance is beneficial
    const canRebalance = Array.isArray(canRebalanceData) ? canRebalanceData[0] : false
    if (!canRebalance) {
      alert('Rebalancing is not beneficial at this time')
      return
    }
    
    setActionStates(prev => ({ ...prev, rebalance: true }))
    try {
      console.log('Rebalancing vault...')
      await writeContract({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: vaultABI,
        functionName: 'rebalance',
        args: [],
      })
      console.log('Rebalance transaction submitted')
    } catch (error) {
      console.error('Rebalance failed:', error)
      alert('Rebalance failed: ' + (error as Error).message)
    } finally {
      setActionStates(prev => ({ ...prev, rebalance: false }))
    }
  }

  async function claimFees() {
    if (!isAdmin) return
    
    setActionStates(prev => ({ ...prev, fees: true }))
    try {
      console.log('Claiming fees...')
      
      // Show warning if no fees available but still allow transaction
      if (pendingFees <= 0) {
        console.log('No fees available - transaction will likely fail as expected')
      }
      
      await writeContract({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: vaultABI,
        functionName: 'claimPerformanceFees',
        args: [],
      })
      console.log('Claim fees transaction submitted')
    } catch (error) {
      console.error('Claim fees failed:', error)
      
      // More descriptive error message for zero fees case
      if (pendingFees <= 0) {
        alert('Transaction failed as expected - no performance fees to claim yet.')
      } else {
        alert('Claim fees failed: ' + (error as Error).message)
      }
    } finally {
      setActionStates(prev => ({ ...prev, fees: false }))
    }
  }

  async function updateTvlCapFunction() {
    if (!isAdmin || !newTvlCap) return
    setActionStates(prev => ({ ...prev, tvl: true }))
    try {
      const capInWei = parseUnits(newTvlCap, 6) // USDC has 6 decimals
      await writeContract({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: vaultABI,
        functionName: 'setTvlCap',
        args: [capInWei],
      })
      console.log('TVL cap update transaction submitted')
      setNewTvlCap('')
    } catch (error) {
      console.error('TVL cap update failed:', error)
      alert('TVL cap update failed: ' + (error as Error).message)
    } finally {
      setActionStates(prev => ({ ...prev, tvl: false }))
    }
  }

  if (!isConnected) {
    return (
      <div>
        <header className="header">
          <div className="container">
            <div className="header-content">
              <a href="/" className="logo">Superlink Admin</a>
              <ConnectButton />
            </div>
          </div>
        </header>
        <main>
          <div className="container" style={{ paddingTop: '80px' }}>
            <div className="text-center" style={{ maxWidth: '480px', margin: '0 auto' }}>
              <h1 className="text-3xl mb-6">Admin Access</h1>
              <p className="text-secondary text-lg mb-8">
                Connect your wallet to access vault administration
              </p>
              <ConnectButton />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div>
        <header className="header">
          <div className="container">
            <div className="header-content">
              <a href="/" className="logo">Superlink Admin</a>
              <ConnectButton />
            </div>
          </div>
        </header>
        <main>
          <div className="container" style={{ paddingTop: '80px' }}>
            <div className="card card-elevated text-center" style={{ maxWidth: '520px', margin: '0 auto' }}>
              <div className="card-header">
                <h2 className="card-title">Admin Verification</h2>
                <p className="card-subtitle">
                  Signature verification required to access admin functions
                </p>
              </div>
              
              <div className="mb-6">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center p-4" style={{ background: 'var(--background)', borderRadius: 'var(--radius-sm)' }}>
                    <span className="text-secondary">Expected admin:</span>
                    <code className="text-primary">{ADMIN_ADDRESS ? `${ADMIN_ADDRESS.slice(0, 6)}...${ADMIN_ADDRESS.slice(-4)}` : 'Not configured'}</code>
                  </div>
                  <div className="flex justify-between items-center p-4" style={{ background: 'var(--background)', borderRadius: 'var(--radius-sm)' }}>
                    <span className="text-secondary">Your address:</span>
                    <code className="text-primary">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'None'}</code>
                  </div>
                </div>
              </div>
              
              {address?.toLowerCase() === ADMIN_ADDRESS?.toLowerCase() ? (
                <button 
                  onClick={verifyAdminSignature}
                  disabled={isVerifying}
                  className="btn btn-primary w-full"
                  style={{ height: '48px', fontSize: '16px' }}
                >
                  {isVerifying ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                      <span>Verifying Signature...</span>
                    </div>
                  ) : (
                    'Sign to Verify Admin Access'
                  )}
                </button>
              ) : (
                <div className="error">
                  <div className="flex items-center gap-3">
                    <span>This wallet is not authorized for admin access</span>
                  </div>
                </div>
              )}
            </div>
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
            <a href="/" className="logo">Superlink Admin</a>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Admin Panel */}
      <main>
        <div className="container" style={{ paddingTop: '32px', paddingBottom: '80px' }}>
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-3xl" style={{ margin: 0 }}>Admin Panel</h1>
              <span className="status status-live">Authorized</span>
            </div>
            <p className="text-secondary text-lg">
              Vault management and administrative functions
            </p>
          </div>

          {/* Vault Grid Layout */}
          <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            
            {/* Superlink USD Vault Card */}
            <div className="card card-elevated">
              <div className="card-header">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="card-title">Superlink USD Vault</h3>
                    <p className="card-subtitle">Main vault administration and controls</p>
                  </div>
                  <span className={`status ${isPaused ? 'status-paused' : 'status-live'}`}>
                    {isPaused ? 'Paused' : 'Active'}
                  </span>
                </div>
              </div>
              
              {/* Vault Stats */}
              <div className="stats-grid mb-6">
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
                  <div className="stat-value">${tvlCap ? Number(formatUnits(tvlCap as bigint, 6)).toLocaleString() : '0'}</div>
                  <div className="stat-label">TVL Cap</div>
                </div>
                <div className="stat-item">
                  <div 
                    className="stat-value" 
                    title={`Exact pending fees: $${pendingFees.toFixed(8)}`}
                    style={{ cursor: 'help', color: pendingFees > 0 ? 'var(--success)' : 'var(--text-secondary)' }}
                  >
                    ${pendingFees.toFixed(2)}
                  </div>
                  <div className="stat-label">Pending Fees</div>
                </div>
                <div className="stat-item">
                  <div 
                    className="stat-value"
                    title={`Total yield: ${totalAssets && totalPrincipal ? 
                      '$' + (Number(formatUnits(totalAssets as bigint, 6)) - Number(formatUnits(totalPrincipal as bigint, 6))).toFixed(6)
                      : '$0.000000'}`}
                    style={{ cursor: 'help', color: totalAssets && totalPrincipal && 
                      Number(formatUnits(totalAssets as bigint, 6)) - Number(formatUnits(totalPrincipal as bigint, 6)) > 0 ? 'var(--success)' : 
                      (Number(formatUnits(totalAssets as bigint, 6)) - Number(formatUnits(totalPrincipal as bigint, 6)) < 0 ? 'var(--error)' : 'inherit') }}
                  >
                    {totalAssets && totalPrincipal ? 
                      '$' + (Number(formatUnits(totalAssets as bigint, 6)) - Number(formatUnits(totalPrincipal as bigint, 6))).toFixed(2)
                      : '$0.00'
                    }
                  </div>
                  <div className="stat-label">Total Yield</div>
                </div>
              </div>
              
              {/* Rebalancing Opportunities */}
              <div className="mb-6 p-4" style={{ background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <h4 className="text-lg mb-4">Rebalancing Opportunities</h4>
                {canRebalanceData && (canRebalanceData as any)[0] ? (
                  <div>
                    <div className="success mb-4" style={{ padding: '12px' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ fontWeight: '600' }}>Profitable rebalancing available!</span>
                      </div>
                    </div>
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1 p-2" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div className="text-secondary" style={{ fontSize: '12px', marginBottom: '2px' }}>Current APY</div>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{canRebalanceData ? (Number((canRebalanceData as any)[3]) / 100).toFixed(2) : '0.00'}%</div>
                      </div>
                      <div className="flex-1 p-2" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div className="text-secondary" style={{ fontSize: '12px', marginBottom: '2px' }}>Better APY</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--success)' }}>{canRebalanceData ? (Number((canRebalanceData as any)[4]) / 100).toFixed(2) : '0.00'}%</div>
                      </div>
                    </div>
                    <button 
                      onClick={rebalanceVault} 
                      className="btn btn-accent"
                      disabled={actionStates.rebalance}
                      style={{ width: '100%' }}
                    >
                      {actionStates.rebalance ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                          <span>Executing Rebalance...</span>
                        </div>
                      ) : (
                        'Execute Rebalance'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-secondary">No profitable rebalancing opportunities at this time</p>
                  </div>
                )}
              </div>
              
              {/* Vault Management Actions */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <h4 className="text-lg mb-6">Management Actions</h4>
                <div className="flex flex-col gap-4">
                  
                  {/* Emergency Controls - Primary Action */}
                  <button 
                    onClick={isPaused ? unpause : emergencyPause} 
                    className={`btn w-full ${isPaused ? 'btn-success' : 'btn-error'}`}
                    style={{ height: '56px', fontSize: '16px' }}
                    disabled={actionStates.pause}
                  >
                    {actionStates.pause ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                        <span>{isPaused ? 'Resuming...' : 'Pausing...'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>{isPaused ? 'Resume Vault' : 'Emergency Pause'}</span>
                      </div>
                    )}
                  </button>
                  
                  {/* Secondary Actions Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    
                    {/* Fee Management */}
                    <button 
                      onClick={claimFees} 
                      className="btn" 
                      style={{ height: '48px' }}
                      disabled={actionStates.fees}
                    >
                      {actionStates.fees ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="loading-spinner" style={{ width: '14px', height: '14px' }}></div>
                          <span>Claiming...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>Claim Fees</span>
                        </div>
                      )}
                    </button>
                    
                    {/* View Vault */}
                    <button 
                      onClick={() => window.open(`https://app.superlink.fun/vault/${VAULT_ADDRESS}`, '_blank')} 
                      className="btn" 
                      style={{ height: '48px' }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>View in App</span>
                      </div>
                    </button>
                    
                  </div>
                  
                  {/* TVL Management */}
                  <div>
                    <label className="form-label mb-2">Update TVL Cap</label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={newTvlCap}
                        onChange={(e) => setNewTvlCap(e.target.value)}
                        placeholder="Enter new TVL cap (USDC)"
                        className="form-input flex-1"
                        style={{ height: '48px' }}
                      />
                      <button 
                        onClick={updateTvlCapFunction} 
                        className="btn btn-primary"
                        style={{ height: '48px', minWidth: '80px' }}
                        disabled={!newTvlCap || actionStates.tvl}
                      >
                        {actionStates.tvl ? (
                          <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                        ) : (
                          'Update'
                        )}
                      </button>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
            
            {/* Future Vaults Placeholder */}
            <div className="card text-center" style={{ opacity: 0.5, border: '2px dashed var(--border)' }}>
              <div style={{ padding: '80px 20px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px', opacity: '0.5' }}>⊕</div>
                <h3 className="card-title text-muted mb-4">Future Vault Slot</h3>
                <p className="text-secondary">Additional vaults will appear here as they are deployed</p>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div className="flex items-start gap-4">
              <div>
                <h4 className="text-lg mb-2" style={{ color: 'var(--error)' }}>Security Notice</h4>
                <p className="text-secondary">
                  Admin functions directly interact with smart contracts. Double-check all parameters before executing transactions.
                  Emergency pause should only be used in case of security threats or protocol issues.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}