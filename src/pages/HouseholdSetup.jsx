import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function HouseholdSetup() {
  const { user, refreshProfile } = useAuth()
  const [tab, setTab] = useState('create') // 'create' | 'join'
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createHousehold(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data: hh, error: createErr } = await supabase
      .from('households')
      .insert({ name: householdName.trim() })
      .select()
      .single()

    if (createErr) { setError(createErr.message); setLoading(false); return }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ household_id: hh.id })
      .eq('id', user.id)

    if (updateErr) setError(updateErr.message)
    else await refreshProfile()
    setLoading(false)
  }

  async function joinHousehold(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data: hh, error: findErr } = await supabase
      .from('households')
      .select('*')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .maybeSingle()

    if (findErr || !hh) { setError('No household found with that invite code.'); setLoading(false); return }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ household_id: hh.id })
      .eq('id', user.id)

    if (updateErr) setError(updateErr.message)
    else await refreshProfile()
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px', background: 'var(--cream)'
    }}>
      <div className="animate-slide" style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏡</div>
          <h1 style={{ color: 'var(--brown-dark)', marginBottom: '8px' }}>Set Up Your Household</h1>
          <p style={{ color: 'var(--slate-mid)', fontSize: '0.92rem' }}>
            Create a new household or join your partner's existing one.
          </p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <div style={{
            display: 'flex', background: 'var(--cream-dark)',
            borderRadius: '10px', padding: '4px', marginBottom: '28px', gap: '4px'
          }}>
            {[['create', '✨ Create New'], ['join', '🔗 Join Existing']].map(([t, label]) => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                style={{
                  flex: 1, padding: '9px', borderRadius: '7px', border: 'none',
                  fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: '500',
                  background: tab === t ? 'var(--white)' : 'transparent',
                  color: tab === t ? 'var(--slate)' : 'var(--slate-mid)',
                  boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.18s', cursor: 'pointer'
                }}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'create' ? (
            <form onSubmit={createHousehold} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--slate-mid)', marginBottom: '6px' }}>
                  Household Name
                </label>
                <input className="input" value={householdName} onChange={e => setHouseholdName(e.target.value)}
                  placeholder="e.g. The Smiths" required />
                <p style={{ fontSize: '0.78rem', color: 'var(--slate-light)', marginTop: '5px' }}>
                  After creating, share your invite code with your partner so they can join.
                </p>
              </div>
              {error && <div style={{ color: 'var(--rust)', fontSize: '0.87rem' }}>{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ justifyContent: 'center', padding: '12px' }}>
                {loading ? 'Creating…' : 'Create Household'}
              </button>
            </form>
          ) : (
            <form onSubmit={joinHousehold} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '500', color: 'var(--slate-mid)', marginBottom: '6px' }}>
                  Invite Code
                </label>
                <input className="input" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                  placeholder="e.g. a3f7b2c1" required />
                <p style={{ fontSize: '0.78rem', color: 'var(--slate-light)', marginTop: '5px' }}>
                  Ask your partner for the 8-character invite code from their Settings page.
                </p>
              </div>
              {error && <div style={{ color: 'var(--rust)', fontSize: '0.87rem' }}>{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ justifyContent: 'center', padding: '12px' }}>
                {loading ? 'Joining…' : 'Join Household'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
