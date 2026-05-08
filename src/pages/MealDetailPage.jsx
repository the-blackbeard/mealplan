import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'

const sectionLabelStyle = {
  fontSize: '0.72rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--slate-light)',
  marginBottom: '6px',
}

export default function MealDetailPage() {
  const { id } = useParams()
  const { meals, loading, updateMeal } = useMeals()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const meal = meals.find(m => m.id === id)

  function startEdit() {
    setForm({
      name: meal.name || '',
      description: meal.description || '',
      recipe: meal.recipe || '',
      calories: meal.calories_per_portion != null ? String(meal.calories_per_portion) : '',
      protein: meal.protein_per_portion != null ? String(meal.protein_per_portion) : '',
    })
    setEditError('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setForm(null)
    setEditError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setEditError('')
    const { error } = await updateMeal(id, {
      name: form.name,
      description: form.description,
      recipe: form.recipe,
      caloriesPerPortion: form.calories ? parseInt(form.calories, 10) : null,
      proteinPerPortion: form.protein ? parseInt(form.protein, 10) : null,
    })
    if (error) {
      setEditError(error.message || 'Failed to save changes.')
    } else {
      setEditing(false)
      setForm(null)
    }
    setSaving(false)
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>
        <Link to="/meals" style={{ fontSize: '0.9rem', color: 'var(--slate-mid)' }}>
          ← Meals Library
        </Link>
        <div style={{ textAlign: 'center', color: 'var(--slate-light)', padding: '64px 0' }}>
          Loading…
        </div>
      </div>
    )
  }

  // ── Not found state ────────────────────────────────────────────────────────
  if (!meal) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>
        <Link to="/meals" style={{ fontSize: '0.9rem', color: 'var(--slate-mid)' }}>
          ← Meals Library
        </Link>
        <div style={{ textAlign: 'center', color: 'var(--slate-light)', padding: '64px 0' }}>
          Meal not found
        </div>
      </div>
    )
  }

  const hasMacros = meal.calories_per_portion != null || meal.protein_per_portion != null

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing && form) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>
        <Link to="/meals" style={{ fontSize: '0.9rem', color: 'var(--slate-mid)' }}>
          ← Meals Library
        </Link>

        <h1 style={{
          color: 'var(--brown-dark)',
          fontFamily: 'var(--font-display)',
          margin: '20px 0 24px',
        }}>
          Edit Meal
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="edit-meal-name" style={sectionLabelStyle}>
              Name *
            </label>
            <input
              id="edit-meal-name"
              className="input"
              required
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Meal name"
            />
          </div>

          <div>
            <label htmlFor="edit-meal-description" style={sectionLabelStyle}>
              Description
            </label>
            <input
              id="edit-meal-description"
              className="input"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Short description (optional)"
            />
          </div>

          <div>
            <label htmlFor="edit-meal-recipe" style={sectionLabelStyle}>
              Recipe
            </label>
            <textarea
              id="edit-meal-recipe"
              className="input"
              rows={5}
              value={form.recipe}
              onChange={e => setForm(prev => ({ ...prev, recipe: e.target.value }))}
              placeholder="Recipe notes (optional)"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="edit-meal-calories" style={sectionLabelStyle}>
                Calories per portion
              </label>
              <input
                id="edit-meal-calories"
                className="input"
                type="number"
                min="0"
                value={form.calories}
                onChange={e => setForm(prev => ({ ...prev, calories: e.target.value }))}
                placeholder="kcal"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="edit-meal-protein" style={sectionLabelStyle}>
                Protein per portion
              </label>
              <input
                id="edit-meal-protein"
                className="input"
                type="number"
                min="0"
                value={form.protein}
                onChange={e => setForm(prev => ({ ...prev, protein: e.target.value }))}
                placeholder="grams"
              />
            </div>
          </div>

          {editError && (
            <p style={{ color: 'var(--rust)', fontSize: '0.83rem', margin: 0 }}>{editError}</p>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>
      <Link to="/meals" style={{ fontSize: '0.9rem', color: 'var(--slate-mid)' }}>
        ← Meals Library
      </Link>

      {/* Name row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        margin: '20px 0 20px',
      }}>
        <h1 style={{ color: 'var(--brown-dark)', fontFamily: 'var(--font-display)', flex: 1 }}>
          {meal.name}
        </h1>
        <button
          className="btn btn-secondary"
          onClick={startEdit}
          style={{ flexShrink: 0 }}
        >
          Edit
        </button>
      </div>

      {/* Macro chips */}
      {hasMacros && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          {meal.calories_per_portion != null && (
            <div style={{
              flex: 1,
              background: 'var(--white)',
              borderRadius: '10px',
              padding: '10px 12px',
              textAlign: 'center',
              border: '1px solid var(--cream-mid)',
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--brown-dark)' }}>
                {meal.calories_per_portion}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--slate-light)', textTransform: 'uppercase' }}>
                kcal
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--slate-mid)', fontWeight: '600' }}>
                Per portion
              </div>
            </div>
          )}
          {meal.protein_per_portion != null && (
            <div style={{
              flex: 1,
              background: 'var(--white)',
              borderRadius: '10px',
              padding: '10px 12px',
              textAlign: 'center',
              border: '1px solid var(--cream-mid)',
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--brown-dark)' }}>
                {meal.protein_per_portion}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--slate-light)', textTransform: 'uppercase' }}>
                g
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--slate-mid)', fontWeight: '600' }}>
                Per portion
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {meal.description && (
        <div style={{ marginBottom: '20px' }}>
          <div style={sectionLabelStyle}>Description</div>
          <div style={{
            background: 'var(--white)',
            border: '1px solid var(--cream-mid)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            color: 'var(--slate)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
          }}>
            {meal.description}
          </div>
        </div>
      )}

      {/* Recipe */}
      {meal.recipe && (
        <div style={{ marginBottom: '20px' }}>
          <div style={sectionLabelStyle}>Recipe</div>
          <div style={{
            background: 'var(--white)',
            border: '1px solid var(--cream-mid)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            color: 'var(--slate)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}>
            {meal.recipe}
          </div>
        </div>
      )}
    </div>
  )
}
