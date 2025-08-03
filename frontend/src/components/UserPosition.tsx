import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { useState } from 'react'
import { VAULT_ADDRESS, USDC_ADDRESS } from '../config/web3'
import { vaultABI, erc20ABI } from '../config/abi'

const UserPosition = () => {
  const { address, isConnected } = useAccount()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  // Read user's vault token balance
  const { data: vaultBalance } = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
      refetchInterval: 5000 
    }
  })

  // Read user's USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
      refetchInterval: 5000 
    }
  })

  // Read USDC allowance
  const { data: usdcAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20ABI,
    functionName: 'allowance',
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { 
      enabled: !!address,
      refetchInterval: 5000 
    }
  })

  // Read vault data for position value calculation
  const { data: totalAssets } = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultABI,
    functionName: 'totalAssets',
    query: { refetchInterval: 5000 }
  })

  const { data: totalSupply } = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultABI,
    functionName: 'totalSupply',
    query: { refetchInterval: 5000 }
  })

  // Read user's principal (initial deposit amount)
  const { data: userPrincipalData } = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultABI,
    functionName: 'userPrincipal',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
      refetchInterval: 5000 
    }
  })

  // Write contracts
  const { writeContract: approveUsdc, data: approveHash } = useWriteContract()
  const { writeContract: depositToVault, data: depositHash } = useWriteContract()
  const { writeContract: withdrawFromVault, data: withdrawHash } = useWriteContract()

  // Wait for transaction confirmations
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isLoading: isDepositing } = useWaitForTransactionReceipt({ hash: depositHash })
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawHash })

  // Calculate position value
  const sharePrice = totalAssets && totalSupply && totalSupply > 0n ? 
    Number(totalAssets) / Number(totalSupply) : 1
  
  const positionValue = vaultBalance ? 
    (Number(vaultBalance) * sharePrice / 1e6).toFixed(6) : '0'

  // Calculate user's yield earned
  const userPrincipal = userPrincipalData ? formatUnits(userPrincipalData, 6) : '0'
  const userYieldEarned = Number(positionValue) > 0 && Number(userPrincipal) > 0 ? 
    (Number(positionValue) - Number(userPrincipal)).toFixed(6) : '0'

  // Format balances
  const usdcBalanceFormatted = usdcBalance ? formatUnits(usdcBalance, 6) : '0'
  const vaultBalanceFormatted = vaultBalance ? Number(vaultBalance).toString() : '0'

  // Check if approval is needed
  const needsApproval = depositAmount && 
    (!usdcAllowance || parseUnits(depositAmount, 6) > usdcAllowance)

  const handleApprove = () => {
    if (!depositAmount) return
    
    approveUsdc({
      address: USDC_ADDRESS,
      abi: erc20ABI,
      functionName: 'approve',
      args: [VAULT_ADDRESS, parseUnits(depositAmount, 6)],
    })
  }

  const handleDeposit = () => {
    if (!depositAmount || !address) return
    
    depositToVault({
      address: VAULT_ADDRESS,
      abi: vaultABI,
      functionName: 'deposit',
      args: [parseUnits(depositAmount, 6), address],
    })
  }

  const handleWithdraw = () => {
    if (!withdrawAmount || !address) return
    
    withdrawFromVault({
      address: VAULT_ADDRESS,
      abi: vaultABI,
      functionName: 'withdraw',
      args: [parseUnits(withdrawAmount, 6), address, address],
    })
  }

  if (!isConnected) {
    return (
      <div className="user-position">
        <h2>💼 Your Position</h2>
        <div className="connect-prompt">
          <p>Connect your wallet to view your position</p>
        </div>
      </div>
    )
  }

  return (
    <div className="user-position">
      <h2>💼 Your Position</h2>
      
      <div className="position-summary">
        <div className="position-stat">
          <h3>Position Value</h3>
          <div className="value">${positionValue}</div>
        </div>
        <div className="position-stat">
          <h3>Principal Deposited</h3>
          <div className="value">${userPrincipal}</div>
        </div>
        <div className="position-stat">
          <h3>Yield Earned</h3>
          <div className={`value ${Number(userYieldEarned) >= 0 ? 'positive' : 'negative'}`}>
            ${userYieldEarned}
          </div>
        </div>
        <div className="position-stat">
          <h3>Vault Shares</h3>
          <div className="value">{vaultBalanceFormatted}</div>
        </div>
      </div>

      <div className="balances">
        <div className="balance-item">
          <span>USDC Balance:</span>
          <span>${Number(usdcBalanceFormatted).toFixed(6)}</span>
        </div>
      </div>

      <div className="actions">
        <div className="action-section">
          <h3>💰 Deposit</h3>
          <div className="input-group">
            <input
              type="number"
              placeholder="Amount (min 1 USDC)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              min="1"
              step="0.000001"
            />
            <span className="currency">USDC</span>
          </div>
          
          {needsApproval ? (
            <button 
              onClick={handleApprove} 
              disabled={isApproving || !depositAmount}
              className="action-button approve"
            >
              {isApproving ? 'Approving...' : 'Approve USDC'}
            </button>
          ) : (
            <button 
              onClick={handleDeposit} 
              disabled={isDepositing || !depositAmount || Number(depositAmount) < 1}
              className="action-button deposit"
            >
              {isDepositing ? 'Depositing...' : 'Deposit'}
            </button>
          )}
        </div>

        {Number(vaultBalanceFormatted) > 0 && (
          <div className="action-section">
            <h3>💸 Withdraw</h3>
            <div className="input-group">
              <input
                type="number"
                placeholder="Amount to withdraw"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="0.000001"
                step="0.000001"
                max={positionValue}
              />
              <span className="currency">USDC</span>
            </div>
            
            <button 
              onClick={handleWithdraw} 
              disabled={isWithdrawing || !withdrawAmount}
              className="action-button withdraw"
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
            </button>
            
            <div className="withdraw-note">
              <small>⏰ Note: Withdrawals have a 24-hour lock period after deposit</small>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserPosition