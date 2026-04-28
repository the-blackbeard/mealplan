import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { user, profile, household, refreshProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [leavingHH, setLeavingHH] = useState(false)

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function copyCode() {
    navigator.clipboard.writeText(household?.invite_code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function leaveHousehold() {
    if (!window.confirm('Leave your current household? You\'ll need to create or join a new one.')) return
    setLeavingHH(true)
    await supabase.from('profiles').update({ household_id: null }).eq('id', user.id)
    await refreshProfile()
    setLeavingHH(false)
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ color: 'var(--brown-dark)', marginBottom: '32px' }}>Settings</h1>

      {/* Profile */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--slate)' }}>Your Profile</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate-mid)', marginBottom: '16px' }}>
          Signed in as <strong>{user?.email}</strong>
        </p>
        <form onSubmit={saveProfile} style={{ display: 'flex', gap: '12px' }}>
          <input className="input" value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Display name" required />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save'}
          </button>
        </form>
      </div>

      {/* Household */}
      {household && (
        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--slate)' }}>Household</h3>
          <div style={{
            background: 'var(--cream)', borderRadius: '10px', padding: '16px',
            marginBottom: '16px'
          }}>
            <p style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--slate)', marginBottom: '4px' }}>
              🏡 {household.name}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--slate-light)' }}>
              Share the invite code below so your partner can join.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--slate-mid)', marginBottom: '8px' }}>
              Invite Code
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                flex: 1, padding: '10px 16px', background: 'var(--cream-dark)',
                borderRadius: '8px', fontFamily: 'monospace', fontSize: '1.1rem',
                letterSpacing: '0.15em', color: 'var(--brown-dark)', fontWeight: '600'
              }}>
                {household.invite_code}
              </div>
              <button className="btn btn-secondary" onClick={copyCode}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--cream-mid)' }}>
            <button className="btn btn-danger btn-sm" onClick={leaveHousehold} disabled={leavingHH}>
              {leavingHH ? 'Leaving…' : 'Leave Household'}
            </button>
            <p style={{ fontSize: '0.78rem', color: 'var(--slate-light)', marginTop: '6px' }}>
              You'll lose access to this household's meal plans.
            </p>
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '12px', color: 'var(--slate)' }}>Account</h3>
        <button className="btn btn-danger" onClick={signOut}>Sign Out</button>
      </div>
    </div>
  )
}
