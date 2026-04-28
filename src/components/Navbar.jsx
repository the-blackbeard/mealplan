import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { profile, household, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { to: '/', label: '📅 This Week' },
    { to: '/history', label: '📚 History' },
    { to: '/meals', label: '🍴 Meals' },
    { to: '/settings', label: '⚙️ Settings' }
  ]

  return (
    <nav style={{
      background: 'var(--white)',
      borderBottom: '1px solid var(--cream-mid)',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 8px rgba(92,61,32,0.07)'
    }}>
      <div style={{
        maxWidth: '1200px', margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px'
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🍽️</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--brown-dark)' }}>
            TableWeek
          </span>
          {household && (
            <span style={{
              fontSize: '0.72rem', padding: '2px 8px', borderRadius: '20px',
              background: 'var(--cream-dark)', color: 'var(--slate-mid)', marginLeft: '4px'
            }}>
              {household.name}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {links.map(link => (
            <Link key={link.to} to={link.to}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '0.87rem', fontWeight: '500',
                color: location.pathname === link.to ? 'var(--brown-dark)' : 'var(--slate-mid)',
                background: location.pathname === link.to ? 'var(--cream-dark)' : 'transparent',
                transition: 'all 0.15s'
              }}>
              {link.label}
            </Link>
          ))}

          {/* User pill */}
          <div style={{
            marginLeft: '12px', position: 'relative'
          }}>
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px', borderRadius: '24px',
                background: 'var(--cream-dark)', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)'
              }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: 'var(--brown-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--cream)', fontSize: '0.75rem', fontWeight: '600'
              }}>
                {(profile?.display_name || '?')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--slate)', fontWeight: '500' }}>
                {profile?.display_name || 'You'}
              </span>
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                background: 'var(--white)', border: '1px solid var(--cream-mid)',
                borderRadius: '10px', boxShadow: 'var(--shadow-md)',
                padding: '8px', minWidth: '160px', zIndex: 200
              }}>
                <button onClick={() => { setMenuOpen(false); signOut() }}
                  style={{
                    width: '100%', padding: '9px 14px', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.87rem',
                    color: 'var(--rust)', textAlign: 'left', borderRadius: '7px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
