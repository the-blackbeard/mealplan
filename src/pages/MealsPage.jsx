import { useState } from 'react'
import { useMeals } from '../hooks/useMeals'

export default function MealsPage() {
  const { meals, loading, createMeal, deleteMeal } = useMeals()
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  const filtered = meals.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const { error } = await createMeal(newName, newDesc)
    if (error) {
      setError(error.message.includes('unique') ? 'A meal with this name already exists.' : error.message)
    } else {
      setNewName(''); setNewDesc('')
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    setDeleting(id)
    await deleteMeal(id)
    setDeleting(null)
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ color: 'var(--brown-dark)', marginBottom: '8px' }}>Meals Library</h1>
      <p style={{ color: 'var(--slate-mid)', marginBottom: '32px' }}>
        Your household's collection of meals. Pick from these when planning the week.
      </p>

      {/* Add meal form */}
      <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--slate)' }}>Add New Meal</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '180px' }}>
            <input className="input" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Meal name (e.g. Pasta Carbonara)" required />
          </div>
          <div style={{ flex: '2', minWidth: '220px' }}>
            <input className="input" value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="Short description (optional)" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Adding…' : '+ Add Meal'}
          </button>
        </form>
        {error && <p style={{ color: 'var(--rust)', fontSize: '0.83rem', marginTop: '8px' }}>{error}</p>}
      </div>

      {/* Meals list */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: 'var(--slate)' }}>
            {meals.length} meal{meals.length !== 1 ? 's' : ''} in library
          </h3>
          <input className="input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Filter…" style={{ width: '200px' }} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--slate-light)', padding: '32px' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--slate-light)', padding: '48px' }}>
            {search ? 'No meals match your search.' : 'No meals yet. Add your first one above!'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(meal => (
              <div key={meal.id} className="card" style={{
                padding: '14px 18px', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ fontWeight: '600', color: 'var(--slate)' }}>{meal.name}</p>
                  {meal.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--slate-light)', marginTop: '2px' }}>{meal.description}</p>
                  )}
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(meal.id)}
                  disabled={deleting === meal.id}
                >
                  {deleting === meal.id ? '…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
