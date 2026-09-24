import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireOnboarding = false, allowedRoles = [] }) {
  const location = useLocation()
  const { user, profile, loading } = useAuth()

  if (loading) return <div className="screen-state">Loading your ALLEGRO-VIBEZ account…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  if (profile?.status === 'suspended') return <Navigate to="/access-denied" replace />
  if (requireOnboarding && profile?.onboarding_complete === false) return <Navigate to="/onboarding" replace />
  if (allowedRoles.length && !allowedRoles.includes(profile?.role)) return <Navigate to="/access-denied" replace />
  return children
}
