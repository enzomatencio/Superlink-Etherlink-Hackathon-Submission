import { useEffect, useState } from 'react'

export default function LandingPage() {
  const [totalTVL, setTotalTVL] = useState<string>('Loading...')

  useEffect(() => {
    // Fetch TVL from a lightweight API call instead of heavy Web3 libraries
    fetchTotalTVL()
  }, [])

  async function fetchTotalTVL() {
    try {
      console.log('📊 Fetching TVL...')
      
      // Use a simple fetch to get TVL instead of importing heavy Web3 libraries
      const response = await fetch('https://node.mainnet.etherlink.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: '0x3Fca75673860491aCBD2ec27ba0a9B99d2031f7D',
            data: '0x01e1d114' // totalAssets() function selector
          }, 'latest'],
          id: 1
        })
      })
      
      const data = await response.json()
      if (data.result) {
        // Convert hex result to decimal and format (6 decimals for USDC)
        const tvlWei = parseInt(data.result, 16)
        const tvlUSD = tvlWei / 1000000 // 6 decimals
        setTotalTVL(tvlUSD.toFixed(2))
        console.log(`✅ TVL loaded: $${tvlUSD.toFixed(2)}`)
      } else {
        setTotalTVL('0') // No fallback - show real data only
      }
    } catch (error) {
      console.error('Error fetching TVL:', error)
      setTotalTVL('0') // No fallback - show real data only
    }
  }

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <a href="/" className="logo">Superlink</a>
            <a href="https://app.superlink.fun" className="btn btn-primary">
              Launch App
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section style={{ paddingTop: '80px', paddingBottom: '80px' }}>
          <div className="container">
            <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '48px', fontWeight: '600', marginBottom: '24px' }}>
                Automated Yield Optimization
              </h1>
              <p style={{ fontSize: '20px', color: '#666', marginBottom: '40px' }}>
                Maximize your USDC returns with automated rebalancing between the highest-yield protocols on Etherlink.
              </p>
              <a href="https://app.superlink.fun" className="btn btn-primary" style={{ fontSize: '16px', padding: '16px 32px' }}>
                Start Earning →
              </a>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section style={{ padding: '60px 0', backgroundColor: '#f9f9f9' }}>
          <div className="container">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">${totalTVL}</div>
                <div className="stat-label">Total Value Locked</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">ERC-4626</div>
                <div className="stat-label">Vault Standard</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">Etherlink</div>
                <div className="stat-label">Built on</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{ padding: '80px 0' }}>
          <div className="container">
            <h2 style={{ textAlign: 'center', fontSize: '36px', marginBottom: '60px' }}>
              How It Works
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
              <div className="card">
                <h3 className="card-title">1. Deposit USDC</h3>
                <p>Deposit your USDC into the vault and receive supUSD tokens representing your share.</p>
              </div>
              <div className="card">
                <h3 className="card-title">2. Automated Optimization</h3>
                <p>The vault automatically monitors yields across protocols and rebalances to maximize returns.</p>
              </div>
              <div className="card">
                <h3 className="card-title">3. Earn & Withdraw</h3>
                <p>Watch your yield grow in real-time. Withdraw anytime after the 24-hour security lock.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section style={{ padding: '80px 0', backgroundColor: '#f9f9f9' }}>
          <div className="container">
            <h2 style={{ textAlign: 'center', fontSize: '36px', marginBottom: '60px' }}>
              Security First
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ marginBottom: '16px' }}>Emergency Pause</h4>
                <p style={{ color: '#666' }}>Immediate halt capability for security</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ marginBottom: '16px' }}>24h Withdrawal Lock</h4>
                <p style={{ color: '#666' }}>Time delay protection against attacks</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ marginBottom: '16px' }}>TVL Caps</h4>
                <p style={{ color: '#666' }}>Conservative limits for risk management</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ marginBottom: '16px' }}>OpenZeppelin</h4>
                <p style={{ color: '#666' }}>Battle-tested security components</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ padding: '80px 0' }}>
          <div className="container">
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '36px', marginBottom: '24px' }}>
                Start Optimizing Your Yield
              </h2>
              <p style={{ fontSize: '18px', color: '#666', marginBottom: '40px' }}>
                Join the automated yield optimization protocol on Etherlink
              </p>
              <a href="https://app.superlink.fun" className="btn btn-primary" style={{ fontSize: '16px', padding: '16px 32px' }}>
                Launch App →
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e5e5e5', padding: '40px 0', backgroundColor: '#f9f9f9' }}>
        <div className="container">
          <div style={{ textAlign: 'center', color: '#666' }}>
            <p>
              Built on <a href="https://etherlink.com" target="_blank" rel="noopener noreferrer" style={{ color: '#000' }}>Etherlink</a> • 
              <a href="https://app.superlink.fun" style={{ color: '#000', marginLeft: '16px' }}>App</a> • 
              <a href="https://admin.superlink.fun" style={{ color: '#000', marginLeft: '16px' }}>Admin</a>
            </p>
            <p style={{ marginTop: '16px', fontSize: '14px' }}>
              © 2024 Superlink. Automated yield optimization protocol.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}