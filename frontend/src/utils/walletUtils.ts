// Utility functions to handle wallet connection issues across domains

export function clearWalletStorage() {
  try {
    // Clear all RainbowKit and WalletConnect storage
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('rainbowkit') ||
        key.startsWith('wagmi') ||
        key.startsWith('walletconnect') ||
        key.startsWith('wc@2') ||
        key.includes('wallet')
      )) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log('Cleared wallet storage keys:', keysToRemove)
  } catch (error) {
    console.error('Error clearing wallet storage:', error)
  }
}

export function getDomainInfo() {
  return {
    hostname: window.location.hostname,
    origin: window.location.origin,
    isCustomDomain: window.location.hostname.includes('superlink.fun'),
    isVercelDomain: window.location.hostname.includes('vercel.app'),
  }
}

export function logWalletConnectionInfo() {
  const domainInfo = getDomainInfo()
  console.log('🔍 Wallet Connection Debug Info:', {
    ...domainInfo,
    storageKeys: Object.keys(localStorage).filter(key => 
      key.includes('wallet') || key.includes('rainbow') || key.includes('wagmi')
    ),
    userAgent: navigator.userAgent,
  })
}