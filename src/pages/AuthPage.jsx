import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      const { error } = await signUp(email, password, displayName)
      if (error) setError(error.message)
      else setSuccess('Account created! You can now sign in.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--cream)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background shapes */}
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, var(--cream-dark) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', left: '-60px',
        width: '350px', height: '350px', borderRadius: '50%',
        background: 'radial-gradient(circle, var(--green-light) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div className="animate-slide" style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'var(--brown-dark)', marginBottom: '16px',
            fontSize: '28px'
          }}>🍽️</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--brown-dark)' }}>
            TableWeek
          </h1>
          <p style={{ color: 'var(--slate-mid)', fontSize: '0.9rem', marginTop: '4px' }}>
            Your household meal planner
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: 'var(--cream-dark)',
            borderRadius: '10px', padding: '4px', marginBottom: '28px', gap: '4px'
          }}>
            {['signin', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{
                  flex: 1, padding: '9px', borderRadius: '7px', border: 'none',
                  fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: '500',
                  background: mode === m ? 'var(--white)' : 'transparent',
                  color: mode === m ? 'var(--slate)' : 'var(--slate-mid)',
                  boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.18s ease', cursor: 'pointer'
                }}>
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--slate-mid)', marginBottom: '6px' }}>
                  Your Name
                </label>
                <input className="input" type="text" value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex" required />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--slate-mid)', marginBottom: '6px' }}>
                Email
              </label>
              <input className="input" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--slate-mid)', marginBottom: '6px' }}>
                Password
              </label>
              <input className="input" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6} />
            </div>

            {error && (
              <div style={{
                background: 'var(--rust-light)', color: 'var(--rust)',
                padding: '10px 14px', borderRadius: '8px', fontSize: '0.87rem'
              }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{
                background: 'var(--green-light)', color: 'var(--green)',
                padding: '10px 14px', borderRadius: '8px', fontSize: '0.87rem'
              }}>
                {success}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ marginTop: '4px', justifyContent: 'center', padding: '12px' }}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.82rem', color: 'var(--slate-light)' }}>
          Plan meals together, eat better together.
        </p>
      </div>
    </div>
  )
}
