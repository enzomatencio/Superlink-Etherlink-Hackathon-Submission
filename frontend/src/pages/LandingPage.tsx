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
            to: '0xe60009Dd8017CC4f300f16655E337B382A7AEAE6',
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
            <div className="flex gap-4 items-center">
              <a href="https://x.com/superlinkfun" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                Follow @superlinkfun
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="hero">
          <div className="container">
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              <h1 className="hero-title">
                Smart Yield<br />Optimization
              </h1>
              <p className="hero-subtitle">
                On-chain savings for everyone, everywhere. Curated vaults, simple & safe yield.
              </p>
              
              {/* Current TVL Display */}
              <div style={{ 
                textAlign: 'center', 
                margin: '24px 0 32px 0',
                color: 'var(--text-secondary)',
                fontSize: '16px'
              }}>
                Current TVL: <span style={{ fontWeight: '600', color: 'var(--primary)' }}>${totalTVL}</span>
              </div>
              
              <div className="flex gap-4 justify-center items-center flex-wrap" style={{ marginTop: '0' }}>
                <a href="https://app.superlink.fun" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '16px', minWidth: '160px' }}>
                  Start Earning
                </a>
                <div className="flex items-center gap-4 text-secondary">
                  <span className="status status-live">Live</span>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Features Section */}
        <section style={{ padding: '80px 0' }}>
          <div className="container">
            <div className="text-center mb-8">
              <h2 className="text-3xl mb-4">How it works</h2>
              <p className="text-secondary text-lg">Simple, automated, optimized</p>
            </div>
            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
              <div className="card card-elevated">
                <div className="flex items-center gap-4 mb-4">
                  <div style={{ width: '48px', height: '48px', background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '20px' }}>1</div>
                  <h3 className="card-title" style={{ margin: 0 }}>Deposit</h3>
                </div>
                <p className="text-secondary">Connect wallet, deposit assets. Receive vault tokens instantly.</p>
              </div>
              <div className="card card-elevated">
                <div className="flex items-center gap-4 mb-4">
                  <div style={{ width: '48px', height: '48px', background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '20px' }}>2</div>
                  <h3 className="card-title" style={{ margin: 0 }}>Optimize</h3>
                </div>
                <p className="text-secondary">Smart contracts monitor yields, automatically optimize for best returns.</p>
              </div>
              <div className="card card-elevated">
                <div className="flex items-center gap-4 mb-4">
                  <div style={{ width: '48px', height: '48px', background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '20px' }}>3</div>
                  <h3 className="card-title" style={{ margin: 0 }}>Earn</h3>
                </div>
                <p className="text-secondary">Watch yield accumulate in real-time. Withdraw with time-lock protection.</p>
              </div>
            </div>
          </div>
        </section>


        {/* CTA Section */}
        <section style={{ padding: '80px 0', background: 'var(--primary)', color: 'white' }}>
          <div className="container">
            <div className="text-center">
              <h2 className="text-3xl mb-4" style={{ color: 'white' }}>
                Ready to optimize?
              </h2>
              <p className="text-lg mb-8" style={{ color: 'rgba(255, 255, 255, 0.8)', maxWidth: '600px', margin: '0 auto 32px' }}>
                Start earning optimized yields with automated smart contracts
              </p>
              <a href="https://app.superlink.fun" className="btn" style={{ background: 'white', color: 'var(--primary)', border: 'none', padding: '16px 32px', fontSize: '16px' }}>
                Launch App →
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.3)', padding: '48px 0', background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(5px)' }}>
        <div className="container">
          <div className="flex justify-between items-center" style={{ flexDirection: 'column', gap: '24px' }}>
            <div className="text-center">
              <div className="logo mb-4">Superlink</div>
              <p className="text-secondary">Automated yield optimization platform</p>
            </div>
            <div className="flex gap-6 items-center">
              <a href="https://app.superlink.fun" className="text-secondary" style={{ textDecoration: 'none' }}>App</a>
              <a href="https://admin.superlink.fun" className="text-secondary" style={{ textDecoration: 'none' }}>Admin</a>
              <a href="https://etherlink.com" target="_blank" rel="noopener noreferrer" className="text-secondary" style={{ textDecoration: 'none' }}>Etherlink</a>
              <a href="https://explorer.etherlink.com/address/0xe60009Dd8017CC4f300f16655E337B382A7AEAE6" target="_blank" rel="noopener noreferrer" className="text-secondary" style={{ textDecoration: 'none' }}>Contract</a>
              <a href="https://x.com/enzomatencio" target="_blank" rel="noopener noreferrer" className="text-secondary" style={{ textDecoration: 'none' }}>Developer</a>
            </div>
            <div className="text-center">
              <p className="text-muted" style={{ fontSize: '14px' }}>
                © 2025 Superlink Protocol
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}