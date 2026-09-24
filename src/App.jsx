import { Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Discover from './pages/Discover'
import Artists from './pages/Artists'
import PublicCreator from './pages/PublicCreator'
import Login from './pages/Login'
import Register from './pages/Register'
import { AccessDenied, ForgotPassword, ResetPassword, VerifyEmail } from './pages/AuthUtility'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import CreatorHub from './pages/CreatorHub'
import Upload from './pages/Upload'
import MyMusic from './pages/MyMusic'
import ReleaseManager from './pages/ReleaseManager'
import Prosperity from './pages/Prosperity'
import Protect from './pages/Protect'
import RightsGuide from './pages/RightsGuide'
import Payments from './pages/Payments'
import Wallet from './pages/Wallet'
import Billing from './pages/Billing'
import Distribution from './pages/Distribution'
import DistributionOps from './pages/DistributionOps'
import AICreatorSuite from './pages/AICreatorSuite'
import FanConnect from './pages/FanConnect'
import FanDashboard from './pages/FanDashboard'
import PlaylistLibrary from './pages/PlaylistLibrary'
import PublicPlaylist from './pages/PublicPlaylist'
import PrivacySettings from './pages/PrivacySettings'
import SupportCentre from './pages/SupportCentre'
import AdminSupport from './pages/AdminSupport'
import AdminAudit from './pages/AdminAudit'
import AdminDashboard from './pages/AdminDashboard'
import AdminReview from './pages/AdminReview'
import SearchResults from './pages/SearchResults'
import ReleasePage from './pages/ReleasePage'
import Notifications from './pages/Notifications'
import Royalties from './pages/Royalties'
import CopyrightCentre from './pages/CopyrightCentre'
import AdminCopyright from './pages/AdminCopyright'
import AdminRisk from './pages/AdminRisk'
import SystemHealth from './pages/SystemHealth'

const guard = (element, opts = {}) => <ProtectedRoute {...opts}>{element}</ProtectedRoute>

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/release/:slug" element={<ReleasePage />} />
        <Route path="/artist/:slug" element={<PublicCreator />} />
        <Route path="/playlist/:slug" element={<PublicPlaylist />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="/onboarding" element={guard(<Onboarding />)} />
        <Route path="/dashboard" element={guard(<Dashboard />)} />
        <Route path="/creator-hub" element={guard(<CreatorHub />)} />
        <Route path="/upload" element={guard(<Upload />)} />
        <Route path="/my-music" element={guard(<MyMusic />)} />
        <Route path="/release-manager/:id" element={guard(<ReleaseManager />)} />
        <Route path="/prosperity" element={guard(<Prosperity />)} />
        <Route path="/royalties" element={guard(<Royalties />)} />
        <Route path="/notifications" element={guard(<Notifications />)} />
        <Route path="/protect" element={<Protect />} />
        <Route path="/rights-guide" element={<RightsGuide />} />
        <Route path="/wallet" element={guard(<Wallet />)} />
        <Route path="/billing" element={guard(<Billing />)} />
        <Route path="/payments" element={guard(<Payments />)} />
        <Route path="/distribution" element={guard(<Distribution />)} />
        <Route path="/ai-studio" element={guard(<AICreatorSuite />)} />
        <Route path="/fan-connect" element={guard(<FanConnect />)} />
        <Route path="/me" element={guard(<FanDashboard />)} />
        <Route path="/me/playlists" element={guard(<PlaylistLibrary />)} />
        <Route path="/settings/privacy" element={guard(<PrivacySettings />)} />
        <Route path="/support" element={guard(<SupportCentre />)} />
        <Route path="/copyright" element={guard(<CopyrightCentre />)} />
        <Route path="/admin" element={guard(<AdminDashboard />, { allowedRoles: ['admin', 'super_admin', 'moderator'] })} />
        <Route path="/admin/releases" element={guard(<AdminReview />, { allowedRoles: ['admin', 'super_admin', 'moderator'] })} />
        <Route path="/admin/distribution" element={guard(<DistributionOps />, { allowedRoles: ['admin', 'super_admin', 'moderator'] })} />
        <Route path="/admin/support" element={guard(<AdminSupport />, { allowedRoles: ['admin', 'super_admin', 'support'] })} />
        <Route path="/admin/audit" element={guard(<AdminAudit />, { allowedRoles: ['admin', 'super_admin'] })} />
        <Route path="/admin/copyright" element={guard(<AdminCopyright />, { allowedRoles: ['admin', 'super_admin', 'moderator'] })} />
        <Route path="/admin/risk" element={guard(<AdminRisk />, { allowedRoles: ['admin', 'super_admin', 'moderator'] })} />
        <Route path="/admin/health" element={guard(<SystemHealth />, { allowedRoles: ['admin', 'super_admin'] })} />
        <Route path="*" element={<main className="container page-pad"><h1>Page not found</h1></main>} />
      </Route>
    </Routes>
  )
}
