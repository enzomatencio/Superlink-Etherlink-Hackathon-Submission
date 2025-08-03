import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Determine site type from environment
const siteType = import.meta.env.VITE_SITE_TYPE || getSiteTypeFromDomain()

function getSiteTypeFromDomain() {
  const hostname = window.location.hostname
  if (hostname.includes('admin.')) return 'admin'
  if (hostname.includes('app.')) return 'app'
  return 'landing'
}

// For landing page, use minimal setup without Web3 dependencies
if (siteType === 'landing') {
  import('./pages/LandingPage').then(({ default: LandingPage }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <LandingPage />
      </StrictMode>
    )
  })
} else {
  // For app and admin, load full Web3 stack
  Promise.all([
    import('react-router-dom'),
    import('wagmi'),
    import('@tanstack/react-query'),
    import('@rainbow-me/rainbowkit'),
    import('./config/web3'),
    import('./App'),
    import('@rainbow-me/rainbowkit/styles.css')
  ]).then(([
    { BrowserRouter },
    { WagmiProvider },
    { QueryClient, QueryClientProvider },
    { RainbowKitProvider, darkTheme },
    { config },
    { default: App }
  ]) => {
    const queryClient = new QueryClient()

    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <RainbowKitProvider
                theme={darkTheme({
                  accentColor: '#052D83',
                  accentColorForeground: 'white',
                  borderRadius: 'medium',
                  fontStack: 'system',
                  overlayBlur: 'small'
                })}
                modalSize="compact"
                initialChain={42793}
                showRecentTransactions={true}
                coolMode={false}
              >
                <App />
              </RainbowKitProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </BrowserRouter>
      </StrictMode>
    )
  })
}
