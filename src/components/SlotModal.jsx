import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'

const SLOT_META = {
  breakfast: { emoji: '☀️', label: 'Breakfast', color: '#e8a020', bg: '#fef9ec' },
  lunch: { emoji: '🌤️', label: 'Lunch', color: 'var(--green)', bg: 'var(--green-light)' },
  dinner: { emoji: '🌙', label: 'Dinner', color: 'var(--rust)', bg: 'var(--rust-light)' }
}

export default function SlotModal({ slot, dayIndex, dayLabel, entries, onAdd, onRemove, onClose }) {
  const [mode, setMode] = useState('list') // 'list' | 'search' | 'create'
  const [search, setSearch] = useState('')
  const [createForm, setCreateForm] = useState({ name: '', description: '', recipe: '', calories: '', protein: '' })
  const [createError, setCreateError] = useState('')
  const [saving, setSaving] = useState(false)
  const searchRef = useRef(null)
  const navigate = useNavigate()
  const { meals, createMeal } = useMeals()

  const meta = SLOT_META[slot] || SLOT_META.breakfast

  // Autofocus search input when entering search mode
  useEffect(() => {
    if (mode === 'search' && searchRef.current) {
      searchRef.current.focus()
    }
  }, [mode])

  // Meals already in entries (by meal_id)
  const existingMealIds = new Set(entries.map(e => e.meal_id))

  // Filter meals for search view, excluding already-planned ones
  const filteredMeals = meals.filter(m =>
    !existingMealIds.has(m.id) &&
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  async function handleAdd(mealId) {
    await onAdd(dayIndex, slot, mealId)
    setMode('list')
    setSearch('')
  }

  const emptyForm = { name: '', description: '', recipe: '', calories: '', protein: '' }

  async function handleCreate(e) {
    e.preventDefault()
    if (!createForm.name.trim()) return
    setSaving(true)
    setCreateError('')
    const { data, error } = await createMeal(createForm.name.trim(), {
      description: createForm.description,
      recipe: createForm.recipe,
      caloriesPerPortion: createForm.calories ? parseInt(createForm.calories) : null,
      proteinPerPortion: createForm.protein ? parseInt(createForm.protein) : null,
    })
    if (error) {
      setCreateError(error.message)
    } else if (data) {
      await onAdd(dayIndex, slot, data.id)
      setMode('list')
      setSearch('')
      setCreateForm(emptyForm)
    }
    setSaving(false)
  }

  function goToSearch() {
    setMode('search')
    setSearch('')
  }

  function goToCreate() {
    setCreateForm(prev => ({ ...prev, name: search }))
    setMode('create')
  }

  // ── Overlay styles ──────────────────────────────────────────────────────────
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(60,40,20,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  }

  const cardStyle = {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: '340px',
    overflow: 'hidden',
    fontFamily: 'var(--font-body)',
  }

  const headerStyle = {
    padding: '16px 16px 12px',
    borderBottom: '1px solid var(--cream-mid)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  }

  const slotChipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 10px',
    borderRadius: '20px',
    background: meta.bg,
    color: meta.color,
    fontSize: '0.78rem',
    fontWeight: '600',
  }

  const closeBtnStyle = {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: 'var(--slate-light)',
    padding: '2px 6px',
    borderRadius: '6px',
    lineHeight: 1,
    flexShrink: 0,
  }

  const backBtnStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--slate-mid)',
    fontSize: '1rem',
    padding: '2px 6px',
    borderRadius: '6px',
    lineHeight: 1,
    flexShrink: 0,
    fontFamily: 'var(--font-body)',
  }

  // ── List view ───────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return (
      <div style={overlayStyle} onClick={handleOverlayClick}>
        <div style={cardStyle} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={headerStyle}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate-mid)', marginBottom: '4px' }}>
                {dayLabel}
              </div>
              <div style={slotChipStyle}>
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
                <span style={{ opacity: 0.7 }}>
                  · {entries.length === 0 ? 'No meals yet' : `${entries.length} meal${entries.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
            <button style={closeBtnStyle} onClick={onClose} aria-label="Close">✕</button>
          </div>

          {/* Meal list */}
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {entries.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-light)', textAlign: 'center', padding: '10px 0' }}>
                Nothing planned here yet
              </p>
            ) : (
              entries.map(entry => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--cream)',
                    border: '1px solid var(--cream-mid)',
                  }}
                >
                  <button
                    onClick={() => navigate(`/meals/${entry.meal_id}`)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      color: 'var(--slate)',
                      textAlign: 'left',
                      padding: 0,
                      fontFamily: 'var(--font-body)',
                      flexGrow: 1,
                    }}
                  >
                    {entry.meal?.name}
                  </button>
                  <button
                    aria-label={`Remove ${entry.meal?.name}`}
                    onClick={() => onRemove(entry.id)}
                    style={{
                      background: 'var(--rust-light)',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--rust)',
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontFamily: 'var(--font-body)',
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer: Add button */}
          <div style={{ padding: '0 14px 14px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={goToSearch}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {entries.length === 0 ? '+ Add a meal' : '+ Add more'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Search view ─────────────────────────────────────────────────────────────
  if (mode === 'search') {
    return (
      <div style={overlayStyle} onClick={handleOverlayClick}>
        <div style={cardStyle} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button style={backBtnStyle} onClick={() => { setMode('list'); setSearch('') }}>←</button>
              <div style={slotChipStyle}>
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </div>
            </div>
            <button style={closeBtnStyle} onClick={onClose} aria-label="Close">✕</button>
          </div>

          {/* Search input */}
          <div style={{ padding: '12px 14px 8px' }}>
            <input
              ref={searchRef}
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search meals…"
            />
          </div>

          {/* Results */}
          <div style={{ padding: '0 14px', maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {filteredMeals.length > 0 ? (
              filteredMeals.map(meal => (
                <div
                  key={meal.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    background: 'var(--cream)',
                    border: '1px solid var(--cream-mid)',
                  }}
                >
                  <span style={{ fontSize: '0.88rem', color: 'var(--slate)' }}>{meal.name}</span>
                  <button
                    onClick={() => handleAdd(meal.id)}
                    style={{
                      background: 'var(--green-light)',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--green)',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      padding: '3px 9px',
                      borderRadius: '5px',
                      fontFamily: 'var(--font-body)',
                      flexShrink: 0,
                    }}
                  >
                    ＋ Add
                  </button>
                </div>
              ))
            ) : (
              search.length > 0 && (
                <div style={{ padding: '10px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--slate-mid)', marginBottom: '8px' }}>
                    Don't see it?
                  </p>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={goToCreate}
                  >
                    ＋ Create &quot;{search}&quot; as new meal
                  </button>
                </div>
              )
            )}
          </div>

          <div style={{ height: '14px' }} />
        </div>
      </div>
    )
  }

  // ── Create view ─────────────────────────────────────────────────────────────
  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button style={backBtnStyle} onClick={() => setMode('search')}>←</button>
            <h3 style={{ fontSize: '1rem', color: 'var(--brown-dark)', fontFamily: 'var(--font-display)' }}>
              New Meal
            </h3>
          </div>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Create form */}
        <form onSubmit={handleCreate} style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--slate-mid)', display: 'block', marginBottom: '4px' }}>
              Name *
            </label>
            <input
              className="input"
              required
              value={createForm.name}
              onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Meal name"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--slate-mid)', display: 'block', marginBottom: '4px' }}>
              Description
            </label>
            <input
              className="input"
              value={createForm.description}
              onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Short description (optional)"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--slate-mid)', display: 'block', marginBottom: '4px' }}>
              Recipe
            </label>
            <textarea
              className="input"
              rows={3}
              value={createForm.recipe}
              onChange={e => setCreateForm(prev => ({ ...prev, recipe: e.target.value }))}
              placeholder="Recipe notes (optional)"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--slate-mid)', display: 'block', marginBottom: '4px' }}>
                Calories
              </label>
              <input
                className="input"
                type="number"
                min="0"
                value={createForm.calories}
                onChange={e => setCreateForm(prev => ({ ...prev, calories: e.target.value }))}
                placeholder="kcal"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--slate-mid)', display: 'block', marginBottom: '4px' }}>
                Protein
              </label>
              <input
                className="input"
                type="number"
                min="0"
                value={createForm.protein}
                onChange={e => setCreateForm(prev => ({ ...prev, protein: e.target.value }))}
                placeholder="grams"
              />
            </div>
          </div>

          {createError && (
            <p style={{ color: 'var(--rust)', fontSize: '0.8rem', margin: 0 }}>{createError}</p>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '2px', justifyContent: 'center' }}>
            Save &amp; Add to Plan
          </button>
        </form>
      </div>
    </div>
  )
}
