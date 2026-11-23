import { Boxes } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import '../pages/LandingPage.css'
import './AuthLayout.css'

const currentYear = new Date().getFullYear()

export const AuthLayout = () => (
  <div className="landing-page auth-page">
    <main className="auth-main">
      <div className="auth-heading">
        <p className="auth-kicker">OPERATIONS WORKSPACE</p>
        <h1>Shift Handover Platform</h1>
        <p>Secure access for Salim Operations teams.</p>
      </div>
      <div className="auth-content"><Outlet /></div>
    </main>

    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <Link to="/" className="landing-brand landing-footer-brand">
          <span className="landing-brand-mark" aria-hidden="true"><Boxes size={18} strokeWidth={2.2} /></span>
          <span className="landing-brand-name">Salim <strong>Operations</strong></span>
        </Link>
        <p>One shared workspace for operational teams.</p>
        <div className="landing-footer-links">
          <Link to="/">Home</Link>
          <Link to="/#portals">Portals</Link>
          <Link to="/login">Sign in</Link>
        </div>
        <small>© {currentYear} Salim Operations</small>
      </div>
    </footer>
  </div>
)
