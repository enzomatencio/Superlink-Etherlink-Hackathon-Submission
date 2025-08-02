import { useEffect, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSignMessage, useReadContract, useWriteContract } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { VAULT_ADDRESS, ADMIN_ADDRESS } from '../config/web3'
import { vaultABI } from '../config/abi'

export default function AdminPage() {
  const { address, isConnected } = useAccount()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [newTvlCap, setNewTvlCap] = useState('')
  const { signMessage } = useSignMessage()
  const { writeContract } = useWriteContract()
  
  // Separate states for different actions to prevent button conflicts
  const [actionStates, setActionStates] = useState({
    pause: false,
    fees: false,
    tvl: false,
    rebalance: false
  })

  // Read vault data for admin functions
  const { data: totalAssets } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'totalAssets',
  })

  const { data: totalPrincipal } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'totalPrincipal',
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

  const { data: tvlCap } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: vaultABI,
    functionName: 'tvlCap',
  })

  // Calculate pending fees - only if there's actual yield (positive difference)
  const yieldGenerated = totalAssets && totalPrincipal ? 
    (Number(formatUnits(totalAssets as bigint, 6)) - Number(formatUnits(totalPrincipal as bigint, 6))) : 0
  const pendingFees = yieldGenerated > 0 ? yieldGenerated * 0.15 : 0

  useEffect(() => {
    if (isConnected && address && ADMIN_ADDRESS) {
      setIsAdmin(address.toLowerCase() === ADMIN_ADDRESS.toLowerCase())
    } else {
      setIsAdmin(false)
    }
  }, [address, isConnected])

  async function verifyAdminSignature() {
    if (!address || !ADMIN_ADDRESS) return

    setIsVerifying(true)
    try {
      const message = `I am the admin of Superlink Vault at ${VAULT_ADDRESS}\nTimestamp: ${Date.now()}`
      
      await signMessage({
        message,
      })
      
      // If signature succeeds and address matches, user is verified admin
      if (address.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
        setIsAdmin(true)
        alert('Admin access verified!')
      } else {
        alert('Address does not match admin address')
      }
    } catch (error) {
      console.error('Admin verification failed:', error)
      alert('Admin verification failed')
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
          <div className="container" style={{ paddingTop: '60px', textAlign: 'center' }}>
            <h1 style={{ marginBottom: '20px' }}>Admin Panel Access</h1>
            <p style={{ color: '#666', marginBottom: '40px' }}>
              Connect your wallet to access admin functions
            </p>
            <ConnectButton />
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
          <div className="container" style={{ paddingTop: '60px' }}>
            <div className="card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
              <h2 className="card-title">Admin Verification Required</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                You must be the admin wallet and sign a message to access admin functions.
              </p>
              <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px' }}>
                Expected admin: {ADMIN_ADDRESS ? `${ADMIN_ADDRESS.slice(0, 6)}...${ADMIN_ADDRESS.slice(-4)}` : 'Not configured'}
              </p>
              <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px' }}>
                Your address: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'None'}
              </p>
              {address?.toLowerCase() === ADMIN_ADDRESS?.toLowerCase() ? (
                <button 
                  onClick={verifyAdminSignature}
                  disabled={isVerifying}
                  className="btn btn-primary"
                >
                  {isVerifying ? 'Verifying...' : 'Sign to Verify Admin Access'}
                </button>
              ) : (
                <div className="error">
                  This wallet is not authorized for admin access
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
        <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>
              Admin Panel
            </h1>
            <p style={{ color: '#666' }}>
              Vault management and administrative functions
            </p>
          </div>

          {/* Vault Grid Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            
            {/* Superlink USD Vault Card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="card-title">Superlink USD Vault</h3>
                <div className={isPaused ? 'status-paused' : 'status-live'}>
                  {isPaused ? '⏸ Paused' : '✅ Active'}
                </div>
              </div>
              
              {/* Vault Stats */}
              <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-item">
                  <div 
                    className="stat-value" 
                    title={`Exact TVL: $${totalAssets ? formatUnits(totalAssets as bigint, 6) : '0.000000'}`}
                    style={{ cursor: 'help' }}
                  >
                    ${totalAssets ? Number(formatUnits(totalAssets as bigint, 6)).toFixed(2) : '0.00'}
                  </div>
                  <div className="stat-label">USD Vault TVL</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">${tvlCap ? Number(formatUnits(tvlCap as bigint, 6)).toLocaleString() : '0'}</div>
                  <div className="stat-label">TVL Cap</div>
                </div>
                <div className="stat-item">
                  <div 
                    className="stat-value" 
                    title={`Exact pending fees: $${pendingFees.toFixed(8)}`}
                    style={{ cursor: 'help', color: pendingFees > 0 ? '#22c55e' : '#666' }}
                  >
                    ${pendingFees.toFixed(2)}
                  </div>
                  <div className="stat-label">Pending Fees (15%)</div>
                </div>
                <div className="stat-item">
                  <div 
                    className="stat-value"
                    title={`Total yield: ${totalAssets && totalPrincipal ? 
                      '$' + (Number(formatUnits(totalAssets as bigint, 6)) - Number(formatUnits(totalPrincipal as bigint, 6))).toFixed(6)
                      : '$0.000000'}`}
                    style={{ cursor: 'help', color: totalAssets && totalPrincipal && 
                      Number(formatUnits(totalAssets as bigint, 6)) - Number(formatUnits(totalPrincipal as bigint, 6)) > 0 ? '#22c55e' : 
                      (Number(formatUnits(totalAssets as bigint, 6)) - Number(formatUnits(totalPrincipal as bigint, 6)) < 0 ? '#ef4444' : 'inherit') }}
                  >
                    {totalAssets && totalPrincipal ? 
                      '$' + (Number(formatUnits(totalAssets as bigint, 6)) - Number(formatUnits(totalPrincipal as bigint, 6))).toFixed(2)
                      : '$0.00'
                    }
                  </div>
                  <div className="stat-label">Total Yield Earned</div>
                </div>
              </div>
              
              {/* Rebalancing Opportunities */}
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '12px', fontSize: '16px' }}>Rebalancing Opportunities</h4>
                {canRebalanceData && (canRebalanceData as any)[0] ? (
                  <div>
                    <p style={{ color: '#22c55e', marginBottom: '12px', fontSize: '14px' }}>
                      ✅ Profitable rebalancing available!
                    </p>
                    <div style={{ fontSize: '14px', marginBottom: '12px' }}>
                      <div>Current APY: {canRebalanceData ? (Number((canRebalanceData as any)[3]) / 100).toFixed(4) : '0.0000'}%</div>
                      <div>Better APY: {canRebalanceData ? (Number((canRebalanceData as any)[4]) / 100).toFixed(4) : '0.0000'}%</div>
                    </div>
                    <button 
                      onClick={rebalanceVault} 
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '14px' }}
                      disabled={actionStates.rebalance}
                    >
                      {actionStates.rebalance ? 'Executing...' : 'Execute Rebalance'}
                    </button>
                  </div>
                ) : (
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                    No profitable rebalancing opportunities at this time
                  </p>
                )}
              </div>
              
              {/* Vault Management Actions */}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '16px' }}>Management Actions</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  
                  {/* Fee Management */}
                  <div>
                    <button 
                      onClick={claimFees} 
                      className="btn" 
                      style={{ width: '100%' }}
                      disabled={actionStates.fees}
                    >
                      {actionStates.fees ? 'Claiming...' : `Claim Fees`}
                    </button>
                  </div>
                  
                  {/* Emergency Controls */}
                  <div>
                    <button 
                      onClick={isPaused ? unpause : emergencyPause} 
                      className={isPaused ? 'btn' : 'btn btn-danger'}
                      style={{ width: '100%' }}
                      disabled={actionStates.pause}
                    >
                      {actionStates.pause ? (isPaused ? 'Resuming...' : 'Pausing...') : (isPaused ? 'Resume Vault' : 'Emergency Pause')}
                    </button>
                  </div>
                  
                  {/* TVL Management */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      value={newTvlCap}
                      onChange={(e) => setNewTvlCap(e.target.value)}
                      placeholder="TVL Cap"
                      style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <button 
                      onClick={updateTvlCapFunction} 
                      className="btn"
                      disabled={!newTvlCap || actionStates.tvl}
                    >
                      {actionStates.tvl ? '...' : 'Set'}
                    </button>
                  </div>
                  
                  {/* View Vault */}
                  <div>
                    <button 
                      onClick={() => window.open(`https://app.superlink.fun/vault/${VAULT_ADDRESS}`, '_blank')} 
                      className="btn" 
                      style={{ width: '100%' }}
                    >
                      View in App →
                    </button>
                  </div>
                  
                </div>
              </div>
            </div>
            
            {/* Future Vaults Placeholder */}
            <div className="card" style={{ opacity: 0.6, border: '2px dashed #ccc' }}>
              <h3 className="card-title" style={{ color: '#999' }}>Future Vault Slot</h3>
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#999' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>+</div>
                <p>Additional vaults will appear here as they are deployed</p>
              </div>
            </div>
          </div>


          {/* Security Notice */}
          <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
            <h4 style={{ color: '#dc2626', marginBottom: '8px' }}>Security Notice</h4>
            <p style={{ fontSize: '14px', color: '#7f1d1d' }}>
              Admin functions directly interact with smart contracts. Double-check all parameters before executing transactions.
              Emergency pause should only be used in case of security threats or protocol issues.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}