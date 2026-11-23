import { useState } from 'react'
import { ArrowRight, Boxes, Check, ChevronDown, ClipboardCheck, Menu, ShieldCheck, Users, Workflow, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './LandingPage.css'

const portalAccess = [
  { label: 'Administrator Portal', audience: 'Administration', icon: ShieldCheck, path: '/users', description: 'Manage accounts, review access, and oversee operations.' },
  { label: 'Supervisor Portal', audience: 'Supervisors', icon: Users, path: '/dashboard', description: 'Review the operation, shifts, team records, and activity.' },
  { label: 'Outgoing Staff Portal', audience: 'Outgoing shift', icon: ClipboardCheck, path: '/my-shift', description: 'Prepare a handover and pass open work to the next shift.' },
  { label: 'Incoming Staff Portal', audience: 'Incoming shift', icon: Workflow, path: '/handovers', description: 'Review handovers, acknowledge transfer, and continue follow-up work.' },
]

const currentYear = new Date().getFullYear()

export const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const closeMenu = () => setMenuOpen(false)

  const handleLogout = async () => {
    setLogoutError('')
    try { await logout() } catch (error) { setLogoutError(error instanceof Error ? error.message : 'Sign out failed.') }
  }

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Link to="/" className="landing-brand" aria-label="Salim Operations home" onClick={closeMenu}>
            <span className="landing-brand-mark" aria-hidden="true"><Boxes size={20} strokeWidth={2.2} /></span>
            <span className="landing-brand-name">Salim <strong>Operations</strong></span>
          </Link>
          <button className="landing-menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="landing-navigation" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <nav id="landing-navigation" className={`landing-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
            <a href="#home" onClick={closeMenu}>Home</a>
            <a href="#portals" onClick={closeMenu}>Portals</a>
            <a href="#overview" onClick={closeMenu}>About</a>
            {isLoading ? <span className="landing-session-status">Checking session...</span> : isAuthenticated ? <>
              <Link className="landing-nav-signin" to={user?.defaultRoute ?? '/dashboard'} onClick={closeMenu}>Open workspace <ArrowRight size={15} /></Link>
              <button className="landing-nav-signout" type="button" onClick={() => { closeMenu(); void handleLogout() }}>Sign out</button>
            </> : <Link className="landing-nav-signin" to="/login" onClick={closeMenu}>Sign in <ArrowRight size={15} /></Link>}
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero" id="home">
          <div className="landing-hero-grid" aria-hidden="true" />
          <div className="landing-container landing-hero-inner">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow"><span /> A shared workspace for better handovers</p>
              <h1>One platform.<br /><span>Every operation.</span></h1>
              <p className="landing-hero-description">Bring shift handovers, tasks, incidents, and team records into one secure operations workspace.</p>
              <div className="landing-hero-actions">
                <a className="landing-button landing-button-primary" href="#portals">Choose your portal <ArrowRight size={17} /></a>
                {isAuthenticated ? <Link className="landing-button landing-button-quiet" to={user?.defaultRoute ?? '/dashboard'}>Open workspace</Link> : <Link className="landing-button landing-button-quiet" to="/login">Sign in to your workspace</Link>}
              </div>
              <div className="landing-hero-note"><Check size={15} /> Access follows the role assigned to your account</div>
            </div>

            <div className="landing-hero-art" aria-label="Illustration of operations modules in a shared workspace">
              <div className="landing-art-glow" />
              <div className="landing-art-window">
                <div className="landing-art-window-top"><div className="landing-art-dots" aria-hidden="true"><i /><i /><i /></div><span>OPERATIONS WORKSPACE</span><span className="landing-art-mark"><Boxes size={16} /></span></div>
                <div className="landing-art-content">
                  <div className="landing-art-heading"><span>SHIFT WORKFLOW</span><span className="landing-art-live"><i /> Connected modules</span></div>
                  <div className="landing-flow">
                    <div className="landing-flow-line" />
                    <div className="landing-flow-step"><span className="landing-flow-icon flow-blue"><span>01</span></span><span><strong>Shift handover</strong><small>Keep the next team informed</small></span><ArrowRight size={15} /></div>
                    <div className="landing-flow-step"><span className="landing-flow-icon flow-green"><span>02</span></span><span><strong>Tasks &amp; follow-ups</strong><small>Carry work through the shift</small></span><ArrowRight size={15} /></div>
                    <div className="landing-flow-step"><span className="landing-flow-icon flow-amber"><span>03</span></span><span><strong>Incident records</strong><small>Track issues to resolution</small></span><Check size={15} /></div>
                  </div>
                  <div className="landing-art-foot"><span>One workspace</span><span className="landing-art-foot-line" /><span>Role-aware access</span></div>
                </div>
              </div>
              <div className="landing-art-float"><span className="landing-float-icon"><Check size={16} /></span><span><strong>Shared context</strong><small>Across the workday</small></span></div>
              <p className="landing-art-caption">A workspace overview</p>
            </div>
          </div>
          <a className="landing-scroll-cue" href="#portals" aria-label="Scroll to portals"><ChevronDown size={19} /></a>
        </section>

        <section className="landing-value-strip" aria-label="Workspace features">
          <div className="landing-container landing-value-inner">
            <div><span className="landing-value-check"><Check size={13} /></span><span>One shared workspace</span></div>
            <div><span className="landing-value-check"><Check size={13} /></span><span>Role-based access</span></div>
            <div><span className="landing-value-check"><Check size={13} /></span><span>Secure sign-in and sign-out</span></div>
          </div>
        </section>

        <section className="landing-portals landing-section" id="portals">
          <div className="landing-container">
            <div className="landing-section-heading">
              <div>
                <p className="landing-section-kicker">SALIM OPERATIONS</p>
                <h2>Choose your portal</h2>
                <p className="landing-section-intro">Choose the area you need. Sign in with your existing account; your assigned role determines which tools are available.</p>
              </div>
              {!isAuthenticated ? <Link to="/login" className="landing-text-link">Sign in <ArrowRight size={16} /></Link> : null}
            </div>
            {logoutError ? <p className="landing-logout-error" role="alert">{logoutError}</p> : null}
            <div className="landing-portal-grid landing-role-grid">
              {portalAccess.map((portal) => {
                const Icon = portal.icon
                return (
                  <Link key={portal.label} to={isAuthenticated ? portal.path : '/login'} state={isAuthenticated ? undefined : { from: { pathname: portal.path } }} className="landing-portal-card">
                    <span className="landing-card-icon"><Icon size={20} strokeWidth={1.8} /></span>
                    <span className="landing-card-access">{portal.audience}</span>
                    <h4>{portal.label}</h4>
                    <p>{portal.description}</p>
                    <span className="landing-card-link">{isAuthenticated ? 'Open portal' : 'Sign in to portal'} <ArrowRight size={15} /></span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        <section className="landing-overview landing-section" id="overview">
          <div className="landing-container landing-overview-grid">
            <div><p className="landing-section-kicker">BUILT AROUND THE WAY TEAMS WORK</p><h2>Clear handovers.<br /><span>Confident next steps.</span></h2></div>
            <div className="landing-overview-copy">
              <p>Salim Operations brings shifts, handovers, tasks, incidents, notifications, and management tools together.</p>
              <p>Portal links take you to sign-in first when you do not have an active session. After sign-in, the application opens the selected area when your account has access.</p>
              {isAuthenticated ? <Link to={user?.defaultRoute ?? '/dashboard'} className="landing-button landing-button-dark">Enter the workspace <ArrowRight size={16} /></Link> : <Link to="/login" className="landing-button landing-button-dark">Sign in to continue <ArrowRight size={16} /></Link>}
            </div>
          </div>
          <div className="landing-container landing-how-grid">
            <article><span>01</span><h3>Choose a portal</h3><p>Select the workspace area you need from the links above.</p></article>
            <article><span>02</span><h3>Sign in securely</h3><p>Use the operations account assigned to you by an administrator.</p></article>
            <article><span>03</span><h3>Continue your work</h3><p>Access is based on your assigned role and permissions.</p></article>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <Link to="/" className="landing-brand landing-footer-brand"><span className="landing-brand-mark" aria-hidden="true"><Boxes size={18} strokeWidth={2.2} /></span><span className="landing-brand-name">Salim <strong>Operations</strong></span></Link>
          <p>One shared workspace for operational teams.</p>
          <div className="landing-footer-links"><a href="#home">Home</a><a href="#portals">Portals</a>{isAuthenticated ? <button type="button" onClick={() => { void handleLogout() }}>Sign out</button> : <Link to="/login">Sign in</Link>}</div>
          <small>© {currentYear} Salim Operations</small>
        </div>
      </footer>
    </div>
  )
}
