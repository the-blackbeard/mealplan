import { useState, useEffect, useRef } from 'react'
import { useMeals } from '../hooks/useMeals'

export default function MealPicker({ slot, dayLabel, onSelect, onClose }) {
  const { meals, createMeal } = useMeals()
  const [search, setSearch] = useState('')
  const [newMealName, setNewMealName] = useState('')
  const [newMealDesc, setNewMealDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = meals.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e) {
    e.preventDefault()
    if (!newMealName.trim()) return
    setSaving(true); setError('')
    const { data, error } = await createMeal(newMealName, { description: newMealDesc })
    if (error) {
      setError(error.message.includes('unique') ? 'A meal with this name already exists.' : error.message)
    } else {
      onSelect(data)
    }
    setSaving(false)
  }

  const slotColors = {
    breakfast: { color: '#e8a020', bg: '#fef9ec' },
    lunch: { color: 'var(--green)', bg: 'var(--green-light)' },
    dinner: { color: 'var(--rust)', bg: 'var(--rust-light)' }
  }
  const sc = slotColors[slot]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(61,53,48,0.4)',
      backdropFilter: 'blur(4px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card animate-slide" style={{
        width: '100%', maxWidth: '520px', padding: '0',
        overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--cream-mid)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '3px 10px', borderRadius: '20px',
              background: sc.bg, color: sc.color,
              fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize',
              marginBottom: '4px'
            }}>
              {slot === 'breakfast' ? '☀️' : slot === 'lunch' ? '🌤️' : '🌙'} {slot}
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '400' }}>
              Pick a meal for {dayLabel}
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: '20px' }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--cream-mid)' }}>
          <input className="input" ref={inputRef} value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search meals…" />
        </div>

        {/* Meal list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
          {filtered.length === 0 && !search && (
            <p style={{ textAlign: 'center', color: 'var(--slate-light)', padding: '24px 0', fontSize: '0.9rem' }}>
              No meals yet. Create your first one below!
            </p>
          )}
          {filtered.length === 0 && search && (
            <p style={{ textAlign: 'center', color: 'var(--slate-light)', padding: '24px 0', fontSize: '0.9rem' }}>
              No meals match "{search}". Create it below?
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.map(meal => (
              <button key={meal.id} onClick={() => onSelect(meal)}
                style={{
                  width: '100%', padding: '12px 14px', border: '1.5px solid var(--cream-mid)',
                  borderRadius: '10px', background: 'var(--cream)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: 'var(--font-body)', transition: 'all 0.15s', textAlign: 'left'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = sc.color; e.currentTarget.style.background = sc.bg }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cream-mid)'; e.currentTarget.style.background = 'var(--cream)' }}
              >
                <div>
                  <div style={{ fontWeight: '500', color: 'var(--slate)', fontSize: '0.95rem' }}>{meal.name}</div>
                  {meal.description && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-light)', marginTop: '2px' }}>{meal.description}</div>
                  )}
                </div>
                <span style={{ color: sc.color, fontSize: '18px' }}>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Create new meal */}
        <div style={{ borderTop: '1px solid var(--cream-mid)', padding: '16px 24px' }}>
          <button onClick={() => setCreating(!creating)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.88rem',
              fontWeight: '600', color: 'var(--brown)', marginBottom: creating ? '12px' : '0'
            }}>
            <span style={{ fontSize: '20px' }}>{creating ? '−' : '+'}</span>
            Create new meal
          </button>

          {creating && (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input className="input" value={newMealName} onChange={e => setNewMealName(e.target.value)}
                placeholder="Meal name (e.g. Pasta Carbonara)" required />
              <input className="input" value={newMealDesc} onChange={e => setNewMealDesc(e.target.value)}
                placeholder="Short description (optional)" />
              {error && <p style={{ color: 'var(--rust)', fontSize: '0.83rem' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Create & Add'}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCreating(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
