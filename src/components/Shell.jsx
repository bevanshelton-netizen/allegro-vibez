import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const nav = [
  ['Home', '/'],
  ['Discover', '/discover'],
  ['Artists', '/artists'],
  ['Prosperity', '/prosperity'],
  ['Rights Guide', '/rights-guide'],
  ['Distribution', '/distribution'],
]

export default function Shell() {
  const { isAuthenticated, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to="/" className="brand">ALLEGRO-VIBEZ</NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          {nav.map(([label, to]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        </nav>
        <div className="account-nav">
          {isAuthenticated ? (
            <>
              <NavLink to="/me" className="soft-link">Fan Home</NavLink>
              <NavLink to="/support" className="soft-link">Support</NavLink>
              <NavLink to="/notifications" className="soft-link">Notifications</NavLink>
              <NavLink to="/dashboard" className="soft-link">{profile?.display_name || 'Dashboard'}</NavLink>
              <button className="link-button" onClick={handleSignOut}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="soft-link">Log in</NavLink>
              <NavLink to="/register" className="pill-button compact">Register</NavLink>
            </>
          )}
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <div><strong>ALLEGRO-VIBEZ</strong><span>More Than Music. A Movement.</span></div>
        <nav><NavLink to="/rights-guide">Rights</NavLink><NavLink to="/protect">Protect</NavLink><NavLink to="/discover">Discover</NavLink></nav>
      </footer>
    </div>
  )
}
