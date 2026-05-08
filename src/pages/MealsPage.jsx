import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'

const labelStyle = {
  fontSize: '0.72rem',
  fontWeight: '700',
  color: 'var(--slate-mid)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '3px',
  display: 'block',
}

export default function MealsPage() {
  const { meals, loading, createMeal, deleteMeal } = useMeals()
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newRecipe, setNewRecipe] = useState('')
  const [newCalories, setNewCalories] = useState('')
  const [newProtein, setNewProtein] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  const filtered = meals.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const { error } = await createMeal(newName, {
      description: newDesc,
      recipe: newRecipe,
      caloriesPerPortion: newCalories ? parseInt(newCalories) : null,
      proteinPerPortion: newProtein ? parseInt(newProtein) : null,
    })
    if (error) {
      setError(error.message.includes('unique') ? 'A meal with this name already exists.' : error.message)
    } else {
      setNewName(''); setNewDesc(''); setNewRecipe(''); setNewCalories(''); setNewProtein('')
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
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label htmlFor="name-input" style={labelStyle}>Name</label>
            <input
              id="name-input"
              className="input"
              style={{ width: '100%' }}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Meal name (e.g. Pasta Carbonara)"
              required
            />
          </div>
          <div>
            <label htmlFor="desc-input" style={labelStyle}>Description</label>
            <input
              id="desc-input"
              className="input"
              style={{ width: '100%' }}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Short description (optional)"
            />
          </div>
          <div>
            <label htmlFor="recipe-input" style={labelStyle}>Recipe</label>
            <textarea
              id="recipe-input"
              className="input"
              style={{ width: '100%', resize: 'vertical' }}
              rows={3}
              value={newRecipe}
              onChange={e => setNewRecipe(e.target.value)}
              placeholder="Recipe instructions (optional)"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="calories-input" style={labelStyle}>Calories per portion</label>
              <input
                id="calories-input"
                className="input"
                style={{ width: '100%' }}
                type="number"
                min="0"
                value={newCalories}
                onChange={e => setNewCalories(e.target.value)}
                placeholder="e.g. 450"
              />
            </div>
            <div>
              <label htmlFor="protein-input" style={labelStyle}>Protein per portion</label>
              <input
                id="protein-input"
                className="input"
                style={{ width: '100%' }}
                type="number"
                min="0"
                value={newProtein}
                onChange={e => setNewProtein(e.target.value)}
                placeholder="e.g. 32"
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Adding…' : '+ Add Meal'}
            </button>
          </div>
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
                  <Link
                    to={`/meals/${meal.id}`}
                    style={{ fontWeight: '600', color: 'var(--brown-dark)', textDecoration: 'none' }}
                  >
                    {meal.name}
                  </Link>
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
