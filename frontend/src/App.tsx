import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AppPage from './pages/AppPage'
import AdminPage from './pages/AdminPage'
import VaultDetailPage from './pages/VaultDetailPage'

function App() {
  // Determine site type based on environment or domain
  const siteType = import.meta.env.VITE_SITE_TYPE || getSiteTypeFromDomain()

  function getSiteTypeFromDomain() {
    const hostname = window.location.hostname
    if (hostname.includes('admin.')) return 'admin'
    if (hostname.includes('app.')) return 'app'
    return 'landing'
  }

  // Single-domain routing for development
  if (siteType === 'landing') {
    return <LandingPage />
  }

  if (siteType === 'admin') {
    return <AdminPage />
  }

  // App routing (app.superlink.fun)
  return (
    <Routes>
      <Route path="/" element={<AppPage />} />
      <Route path="/vault/:vaultAddress" element={<VaultDetailPage />} />
    </Routes>
  )
}

export default App
