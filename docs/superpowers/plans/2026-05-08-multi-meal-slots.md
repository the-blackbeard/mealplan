# Multi-Meal Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow multiple meals per breakfast/lunch/dinner slot, show title-only compact cells, add a slot modal (list/search/create), a meal detail page at `/meals/:id`, and extend the meal form with recipe and nutrition fields.

**Architecture:** Three layers — DB schema migration removes the single-entry-per-slot constraint and adds nutrition columns to `meals`; hook layer replaces `upsertEntry`/`clearEntry`/`getEntry` with `addEntry`/`removeEntry`/`getEntries` and adds `updateMeal`; component layer adds `SlotModal`, new `MealDetailPage`, and updates `MealCell`, `WeekGrid`, `PlannerPage`, `HistoryPage`, and `MealsPage`.

**Tech Stack:** React 18, Vite, Supabase JS v2, @dnd-kit/core, react-router-dom v6, Vitest, @testing-library/react

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase_schema.sql` | Modify | Document constraint + column changes |
| `src/hooks/useMealPlan.js` | Modify | `addEntry` / `removeEntry` / `getEntries` |
| `src/hooks/useMeals.js` | Modify | `updateMeal` + extended `createMeal` |
| `src/components/SlotModal.jsx` | **Create** | Centered modal: list / search / create views |
| `src/components/SlotModal.test.jsx` | **Create** | Tests for SlotModal |
| `src/components/MealCell.jsx` | Modify | Title-only multi-entry list; opens SlotModal |
| `src/components/MealCell.test.jsx` | Modify | Update for `entries[]` prop |
| `src/components/WeekGrid.jsx` | Modify | Thread `getEntries` / `onAdd` / `onRemove` to MealCell |
| `src/pages/PlannerPage.jsx` | Modify | Thread new hook functions; update DnD handler |
| `src/pages/PlannerPage.test.jsx` | Modify | Update for `addEntry` signature |
| `src/pages/HistoryPage.jsx` | Modify | `HistoryWeekView` uses `getEntries` |
| `src/pages/MealDetailPage.jsx` | **Create** | `/meals/:id` — name, macros, description, recipe, edit |
| `src/pages/MealDetailPage.test.jsx` | **Create** | Tests for MealDetailPage |
| `src/pages/MealsPage.jsx` | Modify | Add recipe / calories / protein fields; name links to detail |
| `src/pages/MealsPage.test.jsx` | **Create** | Tests for enhanced form |
| `src/App.jsx` | Modify | Add `/meals/:id` route |

---

## Task 1: DB Migration

**Files:**
- Modify: `supabase_schema.sql`

- [ ] **Step 1: Run this SQL in the Supabase SQL editor for your project**

```sql
-- Drop the constraint that limited one meal per slot
ALTER TABLE meal_plan_entries
  DROP CONSTRAINT meal_plan_entries_meal_plan_id_day_of_week_slot_key;

-- Prevent the same meal from being added twice to one slot
ALTER TABLE meal_plan_entries
  ADD CONSTRAINT meal_plan_entries_unique_meal_per_slot
  UNIQUE (meal_plan_id, day_of_week, slot, meal_id);

-- Add nutrition + recipe columns to meals (all nullable)
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS recipe TEXT,
  ADD COLUMN IF NOT EXISTS calories_per_portion INTEGER,
  ADD COLUMN IF NOT EXISTS protein_per_portion INTEGER;
```

- [ ] **Step 2: Update `supabase_schema.sql` to match**

In the `meal_plan_entries` table block, replace:
```sql
  UNIQUE(meal_plan_id, day_of_week, slot)
```
with:
```sql
  UNIQUE(meal_plan_id, day_of_week, slot, meal_id)
```

In the `meals` table block, add before the closing `);`:
```sql
  recipe TEXT,
  calories_per_portion INTEGER,
  protein_per_portion INTEGER,
```

- [ ] **Step 3: Commit**

```bash
git add supabase_schema.sql
git commit -m "chore: update schema for multi-meal slots and nutrition columns"
```

---

## Task 2: Update `useMeals` hook

**Files:**
- Modify: `src/hooks/useMeals.js`

- [ ] **Step 1: Replace the file contents**

```js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useMeals() {
  const { household, user } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMeals = useCallback(async () => {
    if (!household) return
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('household_id', household.id)
      .order('name')
    setMeals(data || [])
    setLoading(false)
  }, [household])

  useEffect(() => { fetchMeals() }, [fetchMeals])

  async function createMeal(name, { description = '', recipe = '', caloriesPerPortion = null, proteinPerPortion = null } = {}) {
    if (!household || !user) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('meals')
      .insert({
        household_id: household.id,
        name: name.trim(),
        description,
        recipe: recipe || null,
        calories_per_portion: caloriesPerPortion,
        protein_per_portion: proteinPerPortion,
        created_by: user.id
      })
      .select()
      .single()

    if (!error) setMeals(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }

  async function updateMeal(id, fields) {
    const { data, error } = await supabase
      .from('meals')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (!error) setMeals(prev => prev.map(m => m.id === id ? data : m))
    return { data, error }
  }

  async function deleteMeal(id) {
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (!error) setMeals(prev => prev.filter(m => m.id !== id))
    return { error }
  }

  return { meals, loading, createMeal, updateMeal, deleteMeal, refetch: fetchMeals }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useMeals.js
git commit -m "feat: add updateMeal and extend createMeal with recipe/nutrition fields"
```

---

## Task 3: Update `useMealPlan` hook

**Files:**
- Modify: `src/hooks/useMealPlan.js`

- [ ] **Step 1: Replace the file contents**

```js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { weekStartToString } from '../lib/dates'
import { useAuth } from '../context/AuthContext'

export function useMealPlan(weekStart) {
  const { household } = useAuth()
  const [mealPlan, setMealPlan] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const weekStr = weekStartToString(weekStart)

  const fetchPlan = useCallback(async () => {
    if (!household) return
    setLoading(true)
    setError(null)

    let { data: plan, error: planErr } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('household_id', household.id)
      .eq('week_start', weekStr)
      .maybeSingle()

    if (planErr) { setError(planErr.message); setLoading(false); return }

    if (!plan) {
      const { data: newPlan, error: createErr } = await supabase
        .from('meal_plans')
        .upsert(
          { household_id: household.id, week_start: weekStr },
          { onConflict: 'household_id,week_start' }
        )
        .select()
        .single()
      if (createErr) { setError(createErr.message); setLoading(false); return }
      plan = newPlan
    }

    setMealPlan(plan)

    const { data: ents, error: entErr } = await supabase
      .from('meal_plan_entries')
      .select('*, meal:meals(*), updater:profiles(display_name)')
      .eq('meal_plan_id', plan.id)

    if (entErr) { setError(entErr.message); setLoading(false); return }

    setEntries(ents || [])
    setLoading(false)
  }, [household, weekStr])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  useEffect(() => {
    if (!mealPlan) return
    const channel = supabase
      .channel(`meal_plan_${mealPlan.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meal_plan_entries',
        filter: `meal_plan_id=eq.${mealPlan.id}`
      }, () => { fetchPlan() })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [mealPlan, fetchPlan])

  async function addEntry(dayOfWeek, slot, mealId) {
    if (!mealPlan) return { error: 'No meal plan loaded' }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('meal_plan_entries')
      .insert({
        meal_plan_id: mealPlan.id,
        day_of_week: dayOfWeek,
        slot,
        meal_id: mealId,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
    if (!error) await fetchPlan()
    return { error }
  }

  async function removeEntry(entryId) {
    const { error } = await supabase
      .from('meal_plan_entries')
      .delete()
      .eq('id', entryId)
    if (!error) await fetchPlan()
    return { error }
  }

  function getEntries(dayOfWeek, slot) {
    return entries.filter(e => e.day_of_week === dayOfWeek && e.slot === slot)
  }

  return { mealPlan, entries, loading, error, addEntry, removeEntry, getEntries, refetch: fetchPlan }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useMealPlan.js
git commit -m "feat: replace upsertEntry with addEntry/removeEntry/getEntries for multi-meal support"
```

---

## Task 4: New `SlotModal` component

**Files:**
- Create: `src/components/SlotModal.jsx`
- Create: `src/components/SlotModal.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/components/SlotModal.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SlotModal from './SlotModal'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useMeals', () => ({
  useMeals: () => ({
    meals: [
      { id: 'm1', name: 'Omelette' },
      { id: 'm2', name: 'Bread' },
      { id: 'm3', name: 'Chai' },
    ],
    loading: false,
    createMeal: vi.fn().mockResolvedValue({ data: { id: 'm4', name: 'New' }, error: null }),
    updateMeal: vi.fn(),
    deleteMeal: vi.fn(),
    refetch: vi.fn()
  })
}))

const defaultEntries = [
  { id: 'e1', meal_id: 'm1', meal: { id: 'm1', name: 'Omelette' }, day_of_week: 0, slot: 'breakfast' },
]

function renderModal(props = {}) {
  return render(
    <MemoryRouter>
      <SlotModal
        slot="breakfast"
        dayIndex={0}
        dayLabel="Monday, May 5"
        entries={defaultEntries}
        onAdd={vi.fn().mockResolvedValue({ error: null })}
        onRemove={vi.fn().mockResolvedValue({ error: null })}
        onClose={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  )
}

describe('SlotModal list view', () => {
  beforeEach(() => mockNavigate.mockClear())

  it('shows meal names from entries', () => {
    renderModal()
    expect(screen.getByText('Omelette')).toBeInTheDocument()
  })

  it('calls onRemove with entry id when remove button is clicked', () => {
    const onRemove = vi.fn().mockResolvedValue({ error: null })
    renderModal({ onRemove })
    fireEvent.click(screen.getByLabelText('Remove Omelette'))
    expect(onRemove).toHaveBeenCalledWith('e1')
  })

  it('navigates to /meals/:id when meal name is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByText('Omelette'))
    expect(mockNavigate).toHaveBeenCalledWith('/meals/m1')
  })

  it('calls onClose when overlay backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = renderModal({ onClose })
    fireEvent.click(container.firstChild)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows empty state when no entries', () => {
    renderModal({ entries: [] })
    expect(screen.getByText(/Nothing planned here yet/)).toBeInTheDocument()
  })
})

describe('SlotModal search view', () => {
  it('shows search input when Add more is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByText(/Add more/))
    expect(screen.getByPlaceholderText('Search meals…')).toBeInTheDocument()
  })

  it('filters meals by search query', () => {
    renderModal({ entries: [] })
    fireEvent.click(screen.getByText(/Add a meal/))
    fireEvent.change(screen.getByPlaceholderText('Search meals…'), { target: { value: 'Om' } })
    expect(screen.getByText('Omelette')).toBeInTheDocument()
    expect(screen.queryByText('Bread')).not.toBeInTheDocument()
  })

  it('calls onAdd with correct args when + Add is clicked', async () => {
    const onAdd = vi.fn().mockResolvedValue({ error: null })
    renderModal({ entries: [], onAdd })
    fireEvent.click(screen.getByText(/Add a meal/))
    fireEvent.change(screen.getByPlaceholderText('Search meals…'), { target: { value: 'Om' } })
    fireEvent.click(screen.getByText('＋ Add'))
    expect(onAdd).toHaveBeenCalledWith(0, 'breakfast', 'm1')
  })

  it('shows Create button when no meals match', () => {
    renderModal({ entries: [] })
    fireEvent.click(screen.getByText(/Add a meal/))
    fireEvent.change(screen.getByPlaceholderText('Search meals…'), { target: { value: 'xyz' } })
    expect(screen.getByText(/Create "xyz" as new meal/)).toBeInTheDocument()
  })
})

describe('SlotModal create view', () => {
  it('switches to create view with name pre-filled from search', () => {
    renderModal({ entries: [] })
    fireEvent.click(screen.getByText(/Add a meal/))
    fireEvent.change(screen.getByPlaceholderText('Search meals…'), { target: { value: 'Poha' } })
    fireEvent.click(screen.getByText(/Create "Poha" as new meal/))
    expect(screen.getByText('New Meal')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Poha')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/components/SlotModal.test.jsx
```
Expected: `Cannot find module './SlotModal'`

- [ ] **Step 3: Create `src/components/SlotModal.jsx`**

```jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'

const SLOT_META = {
  breakfast: { emoji: '☀️', label: 'Breakfast', color: '#e8a020', bg: '#fef9ec' },
  lunch: { emoji: '🌤️', label: 'Lunch', color: 'var(--green)', bg: 'var(--green-light)' },
  dinner: { emoji: '🌙', label: 'Dinner', color: 'var(--rust)', bg: 'var(--rust-light)' }
}

const emptyForm = { name: '', description: '', recipe: '', calories: '', protein: '' }

export default function SlotModal({ slot, dayIndex, dayLabel, entries, onAdd, onRemove, onClose }) {
  const [mode, setMode] = useState('list')
  const [search, setSearch] = useState('')
  const [createForm, setCreateForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { meals, createMeal } = useMeals()
  const meta = SLOT_META[slot]
  const searchRef = useRef(null)

  useEffect(() => {
    if (mode === 'search' && searchRef.current) searchRef.current.focus()
  }, [mode])

  const filteredMeals = meals.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) &&
    !entries.some(e => e.meal_id === m.id)
  )

  async function handleAdd(mealId) {
    await onAdd(dayIndex, slot, mealId)
    setMode('list')
    setSearch('')
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await createMeal(createForm.name, {
      description: createForm.description,
      recipe: createForm.recipe,
      caloriesPerPortion: createForm.calories ? parseInt(createForm.calories) : null,
      proteinPerPortion: createForm.protein ? parseInt(createForm.protein) : null
    })
    if (!error && data) {
      await onAdd(dayIndex, slot, data.id)
      setMode('list')
      setSearch('')
      setCreateForm(emptyForm)
    }
    setSaving(false)
  }

  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(61,53,48,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px'
  }
  const cardStyle = {
    background: 'white', borderRadius: '16px', width: '100%', maxWidth: '340px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)', overflow: 'hidden'
  }
  const backBtnStyle = {
    width: '28px', height: '28px', borderRadius: '50%', background: 'var(--cream)',
    border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--slate-mid)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  }
  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    background: meta.bg, color: meta.color,
    fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px',
    borderRadius: '20px', marginBottom: '12px'
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={cardStyle}>

        {mode === 'list' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 18px 12px', borderBottom: '1px solid var(--cream-mid)' }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--slate)', fontSize: '0.92rem' }}>{dayLabel}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--slate-light)', marginTop: '1px' }}>{meta.label}</p>
              </div>
              <button onClick={onClose} style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--cream)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--slate-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <span style={chipStyle}>
                {meta.emoji} {entries.length > 0 ? `${entries.length} meal${entries.length > 1 ? 's' : ''}` : 'No meals yet'}
              </span>
              {entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0 12px', color: 'var(--slate-light)', fontSize: '0.82rem' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🍽️</div>
                  Nothing planned here yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                  {entries.map(entry => (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', background: 'var(--cream)' }}>
                      <button
                        onClick={() => navigate(`/meals/${entry.meal_id}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--slate)', fontSize: '0.82rem', textAlign: 'left', padding: 0, flex: 1 }}
                      >
                        {entry.meal?.name}
                      </button>
                      <button
                        onClick={() => onRemove(entry.id)}
                        aria-label={`Remove ${entry.meal?.name}`}
                        style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--rust-light)', border: 'none', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--rust)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setMode('search')}
                style={{ width: '100%', padding: '10px', background: meta.color, color: 'white', border: 'none', borderRadius: '9px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ＋ {entries.length === 0 ? 'Add a meal' : 'Add more'}
              </button>
            </div>
          </>
        )}

        {mode === 'search' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px 10px', borderBottom: '1px solid var(--cream-mid)' }}>
              <button onClick={() => { setMode('list'); setSearch('') }} style={backBtnStyle}>←</button>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search meals…"
                style={{ flex: 1, border: `1.5px solid ${meta.color}`, borderRadius: '8px', padding: '7px 10px', fontSize: '0.82rem', color: 'var(--slate)', background: 'var(--cream)', outline: 'none' }}
              />
            </div>
            <div style={{ padding: '12px 16px' }}>
              <span style={chipStyle}>{meta.emoji} {meta.label} · {dayLabel}</span>
              {filteredMeals.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredMeals.map(meal => (
                    <div key={meal.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)' }}>{meal.name}</span>
                      <button
                        onClick={() => handleAdd(meal.id)}
                        style={{ fontSize: '0.7rem', color: meta.color, fontWeight: 700, padding: '3px 8px', background: meta.bg, borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                      >＋ Add</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--cream-mid)', paddingTop: '10px', marginTop: '4px' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--slate-light)', textAlign: 'center', marginBottom: '8px' }}>Don't see it?</p>
                  <button
                    onClick={() => { setCreateForm(f => ({ ...f, name: search })); setMode('create') }}
                    style={{ width: '100%', padding: '10px', background: 'white', color: 'var(--brown-dark)', border: '1.5px solid var(--cream-mid)', borderRadius: '9px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >＋ Create "{search}" as new meal</button>
                </div>
              )}
            </div>
          </>
        )}

        {mode === 'create' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px 12px', borderBottom: '1px solid var(--cream-mid)' }}>
              <button onClick={() => setMode('search')} style={backBtnStyle}>←</button>
              <p style={{ fontWeight: 700, color: 'var(--slate)', fontSize: '0.9rem' }}>New Meal</p>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Meal Name</label>
                <input className="input" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Description <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--slate-light)' }}>(optional)</span></label>
                <input className="input" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Recipe <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--slate-light)' }}>(optional)</span></label>
                <textarea className="input" value={createForm.recipe} onChange={e => setCreateForm(f => ({ ...f, recipe: e.target.value }))} style={{ minHeight: '64px', resize: 'vertical', fontFamily: 'var(--font-body)' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Calories</label>
                  <input className="input" type="number" min="0" value={createForm.calories} onChange={e => setCreateForm(f => ({ ...f, calories: e.target.value }))} placeholder="kcal" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Protein</label>
                  <input className="input" type="number" min="0" value={createForm.protein} onChange={e => setCreateForm(f => ({ ...f, protein: e.target.value }))} placeholder="grams" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%' }}>
                {saving ? 'Saving…' : '＋ Add Meal'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/components/SlotModal.test.jsx
```
Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/SlotModal.jsx src/components/SlotModal.test.jsx
git commit -m "feat: add SlotModal with list, search, and create views"
```

---

## Task 5: Update `MealCell`

**Files:**
- Modify: `src/components/MealCell.jsx`
- Modify: `src/components/MealCell.test.jsx`

- [ ] **Step 1: Update `MealCell.test.jsx`**

Replace the file:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useDroppable } from '@dnd-kit/core'
import { MemoryRouter } from 'react-router-dom'
import MealCell from './MealCell'

vi.mock('@dnd-kit/core', () => ({ useDroppable: vi.fn() }))
vi.mock('../hooks/useMeals', () => ({
  useMeals: () => ({ meals: [], loading: false, createMeal: vi.fn(), updateMeal: vi.fn(), deleteMeal: vi.fn(), refetch: vi.fn() })
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const defaultDroppable = { setNodeRef: () => {}, isOver: false }

function renderCell(props = {}) {
  return render(
    <MemoryRouter>
      <MealCell
        slot="lunch"
        dayIndex={2}
        dayLabel="Wed, May 7"
        entries={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  )
}

describe('MealCell drop target', () => {
  beforeEach(() => { useDroppable.mockReturnValue(defaultDroppable) })

  it('registers as droppable with id "drop-<dayIndex>-<slot>"', () => {
    renderCell()
    expect(useDroppable).toHaveBeenCalledWith({ id: 'drop-2-lunch' })
  })

  it('registers with id "drop-0-breakfast" for Monday breakfast', () => {
    renderCell({ slot: 'breakfast', dayIndex: 0 })
    expect(useDroppable).toHaveBeenCalledWith({ id: 'drop-0-breakfast' })
  })

  it('applies slot accent colour as border when isOver', () => {
    useDroppable.mockReturnValue({ setNodeRef: () => {}, isOver: true })
    const { container } = renderCell()
    expect(container.firstChild.style.borderColor).toBe('var(--green)')
  })

  it('uses rust border for dinner slot when isOver', () => {
    useDroppable.mockReturnValue({ setNodeRef: () => {}, isOver: true })
    const { container } = renderCell({ slot: 'dinner', dayIndex: 0 })
    expect(container.firstChild.style.borderColor).toBe('var(--rust)')
  })

  it('shows slot-coloured background when isOver on empty cell', () => {
    useDroppable.mockReturnValue({ setNodeRef: () => {}, isOver: true })
    const { container } = renderCell({ slot: 'breakfast', dayIndex: 0 })
    expect(container.firstChild.style.background).toBe('rgb(254, 249, 236)')
  })
})

describe('MealCell multi-entry display', () => {
  beforeEach(() => { useDroppable.mockReturnValue(defaultDroppable) })

  it('shows meal names without descriptions', () => {
    renderCell({
      entries: [
        { id: 'e1', meal_id: 'm1', meal: { id: 'm1', name: 'Omelette', description: 'Egg dish' } },
        { id: 'e2', meal_id: 'm2', meal: { id: 'm2', name: 'Bread', description: 'Toasted' } },
      ]
    })
    expect(screen.getByText('Omelette')).toBeInTheDocument()
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.queryByText('Egg dish')).not.toBeInTheDocument()
    expect(screen.queryByText('Toasted')).not.toBeInTheDocument()
  })

  it('shows first 2 meals and a "+N more" pill when there are 3+', () => {
    renderCell({
      entries: [
        { id: 'e1', meal_id: 'm1', meal: { id: 'm1', name: 'Omelette' } },
        { id: 'e2', meal_id: 'm2', meal: { id: 'm2', name: 'Bread' } },
        { id: 'e3', meal_id: 'm3', meal: { id: 'm3', name: 'Chai' } },
      ]
    })
    expect(screen.getByText('Omelette')).toBeInTheDocument()
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.queryByText('Chai')).not.toBeInTheDocument()
    expect(screen.getByText('+1 more')).toBeInTheDocument()
  })

  it('shows "Add meal" prompt when entries is empty', () => {
    renderCell({ entries: [] })
    expect(screen.getByText('Add meal')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/components/MealCell.test.jsx
```
Expected: multi-entry display tests fail; drop target tests may also fail due to changed props.

- [ ] **Step 3: Replace `src/components/MealCell.jsx`**

```jsx
import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import SlotModal from './SlotModal'

const SLOT_META = {
  breakfast: { emoji: '☀️', label: 'Breakfast', color: '#e8a020', bg: '#fef9ec' },
  lunch: { emoji: '🌤️', label: 'Lunch', color: 'var(--green)', bg: 'var(--green-light)' },
  dinner: { emoji: '🌙', label: 'Dinner', color: 'var(--rust)', bg: 'var(--rust-light)' }
}

export default function MealCell({ slot, dayIndex, dayLabel, entries = [], onAdd, onRemove, editable = true }) {
  const [modalOpen, setModalOpen] = useState(false)
  const meta = SLOT_META[slot]
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${dayIndex}-${slot}` })

  const hasMeals = entries.length > 0
  const visibleEntries = entries.slice(0, 2)
  const extraCount = entries.length - 2

  return (
    <>
      <div
        ref={setNodeRef}
        onClick={() => editable && setModalOpen(true)}
        style={{
          minHeight: '72px',
          padding: '10px 12px',
          borderRadius: '10px',
          border: `1.5px solid ${isOver ? meta.color : (hasMeals ? 'transparent' : 'var(--cream-mid)')}`,
          borderColor: isOver ? meta.color : (hasMeals ? 'transparent' : 'var(--cream-mid)'),
          background: hasMeals || isOver ? meta.bg : 'var(--cream)',
          cursor: editable ? 'pointer' : 'default',
          position: 'relative',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: hasMeals ? 'flex-start' : 'center',
          alignItems: hasMeals ? 'flex-start' : 'center',
          gap: '3px',
          boxShadow: isOver ? `0 0 0 3px ${meta.bg}` : 'none',
        }}
        onMouseEnter={e => {
          if (editable && !isOver) {
            e.currentTarget.style.borderColor = meta.color
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
          }
        }}
        onMouseLeave={e => {
          if (!isOver) {
            e.currentTarget.style.borderColor = hasMeals ? 'transparent' : 'var(--cream-mid)'
            e.currentTarget.style.boxShadow = 'none'
          }
        }}
      >
        {hasMeals ? (
          <>
            {visibleEntries.map(entry => (
              <p key={entry.id} style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', lineHeight: 1.3, wordBreak: 'break-word', margin: 0, width: '100%' }}>
                {entry.meal?.name}
              </p>
            ))}
            {extraCount > 0 && (
              <span style={{ fontSize: '0.7rem', color: meta.color, fontWeight: 700, background: meta.bg, padding: '1px 7px', borderRadius: '10px', marginTop: '2px' }}>
                +{extraCount} more
              </span>
            )}
          </>
        ) : (
          editable ? (
            <div style={{ textAlign: 'center', color: 'var(--slate-light)', fontSize: '0.82rem' }}>
              <span style={{ fontSize: '20px', display: 'block', marginBottom: '2px' }}>+</span>
              Add meal
            </div>
          ) : (
            <span style={{ color: 'var(--slate-light)', fontSize: '0.82rem' }}>—</span>
          )
        )}
      </div>

      {modalOpen && editable && (
        <SlotModal
          slot={slot}
          dayIndex={dayIndex}
          dayLabel={dayLabel}
          entries={entries}
          onAdd={onAdd}
          onRemove={onRemove}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/components/MealCell.test.jsx
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/MealCell.jsx src/components/MealCell.test.jsx
git commit -m "feat: update MealCell for multi-entry title-only display and SlotModal"
```

---

## Task 6: Update `WeekGrid`

**Files:**
- Modify: `src/components/WeekGrid.jsx`

- [ ] **Step 1: Replace the WeekGrid component**

```jsx
import { format } from 'date-fns'
import MealCell from './MealCell'
import { DAYS, SLOTS, getWeekDays } from '../lib/dates'

const SLOT_META = {
  breakfast: { emoji: '☀️', label: 'Breakfast' },
  lunch: { emoji: '🌤️', label: 'Lunch' },
  dinner: { emoji: '🌙', label: 'Dinner' }
}

export default function WeekGrid({ weekStart, getEntries, onAdd, onRemove, editable = true }) {
  const days = getWeekDays(weekStart)
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '100px repeat(7, minmax(140px, 1fr))',
        gap: '8px',
        minWidth: '1080px'
      }}>
        <div />
        {days.map((day, i) => {
          const dayStr = format(day, 'yyyy-MM-dd')
          const isToday = dayStr === today
          return (
            <div key={i} style={{ textAlign: 'center', paddingBottom: '4px' }}>
              <div style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 12px', borderRadius: '10px',
                background: isToday ? 'var(--brown-dark)' : 'transparent',
                color: isToday ? 'var(--cream)' : 'var(--slate)'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>
                  {DAYS[i].slice(0, 3)}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1.1 }}>
                  {format(day, 'd')}
                </span>
              </div>
            </div>
          )
        })}

        {SLOTS.map(slot => (
          <>
            <div key={`label-${slot}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '8px', paddingTop: '4px' }}>
              <span style={{ fontSize: '1.1rem', marginBottom: '2px' }}>{SLOT_META[slot].emoji}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-mid)', textTransform: 'capitalize', letterSpacing: '0.03em' }}>
                {SLOT_META[slot].label}
              </span>
            </div>
            {days.map((day, i) => (
              <MealCell
                key={`${slot}-${i}`}
                slot={slot}
                dayIndex={i}
                dayLabel={`${DAYS[i]}, ${format(day, 'MMM d')}`}
                entries={getEntries(i, slot)}
                onAdd={onAdd}
                onRemove={onRemove}
                editable={editable}
              />
            ))}
          </>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WeekGrid.jsx
git commit -m "feat: update WeekGrid to pass entries array and new callbacks to MealCell"
```

---

## Task 7: Update `PlannerPage`

**Files:**
- Modify: `src/pages/PlannerPage.jsx`
- Modify: `src/pages/PlannerPage.test.jsx`

- [ ] **Step 1: Read `src/pages/PlannerPage.test.jsx` to see current test for `makeDragEndHandler`**

- [ ] **Step 2: Update `PlannerPage.test.jsx` — replace any tests for `makeDragEndHandler`**

Find the existing `makeDragEndHandler` tests and replace them with:

```js
import { describe, it, expect, vi } from 'vitest'
import { makeDragEndHandler } from './PlannerPage'

describe('makeDragEndHandler', () => {
  it('calls addEntry with dayIndex, slot, and meal id parsed from over.id', () => {
    const addEntry = vi.fn()
    const handler = makeDragEndHandler(addEntry)
    handler({
      active: { data: { current: { meal: { id: 'meal-1', name: 'Omelette' } } } },
      over: { id: 'drop-2-lunch' }
    })
    expect(addEntry).toHaveBeenCalledWith(2, 'lunch', 'meal-1')
  })

  it('does nothing when over is null', () => {
    const addEntry = vi.fn()
    const handler = makeDragEndHandler(addEntry)
    handler({ active: { data: { current: { meal: { id: 'meal-1' } } } }, over: null })
    expect(addEntry).not.toHaveBeenCalled()
  })

  it('does nothing when active has no meal data', () => {
    const addEntry = vi.fn()
    const handler = makeDragEndHandler(addEntry)
    handler({ active: { data: { current: {} } }, over: { id: 'drop-0-breakfast' } })
    expect(addEntry).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npx vitest run src/pages/PlannerPage.test.jsx
```
Expected: tests fail because `makeDragEndHandler` still calls `upsertEntry`.

- [ ] **Step 4: Update `src/pages/PlannerPage.jsx`**

Replace the entire file:

```jsx
import { useState } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { getWeekStart, prevWeek, nextWeek, formatWeekLabel, isCurrentWeek } from '../lib/dates'
import { useMealPlan } from '../hooks/useMealPlan'
import WeekGrid from '../components/WeekGrid'
import MealsSidebar from '../components/MealsSidebar'

export function makeDragEndHandler(addEntry) {
  return function handleDragEnd({ active, over }) {
    if (!over) return
    const meal = active.data?.current?.meal
    if (!meal) return
    const parts = over.id.split('-') // ['drop', '2', 'lunch']
    const dayIndex = parseInt(parts[1], 10)
    const slot = parts[2]
    addEntry(dayIndex, slot, meal.id)
  }
}

export default function PlannerPage() {
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const { loading, error, addEntry, removeEntry, getEntries } = useMealPlan(weekStart)
  const [activeMeal, setActiveMeal] = useState(null)
  const isThisWeek = isCurrentWeek(weekStart)

  const handleDragEnd = makeDragEndHandler(addEntry)

  return (
    <div style={{ maxWidth: '1500px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: 'var(--brown-dark)', marginBottom: '6px' }}>
            {isThisWeek ? 'This Week' : 'Meal Plan'}
          </h1>
          <p style={{ color: 'var(--slate-mid)', fontSize: '0.95rem' }}>
            📅 {formatWeekLabel(weekStart)}
            {isThisWeek && (
              <span style={{ marginLeft: '10px', padding: '2px 10px', borderRadius: '20px', background: 'var(--green-light)', color: 'var(--green)', fontSize: '0.75rem', fontWeight: 600 }}>
                Current Week
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekStart(prevWeek(weekStart))}>← Prev</button>
          {!isThisWeek && (
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(getWeekStart())}>Today</button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekStart(nextWeek(weekStart))}>Next →</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--slate-light)' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 3px var(--green-light)', display: 'inline-block' }} />
        Live — changes by your household appear instantly
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: '12px', color: 'var(--slate-light)' }}>
          <div style={{ width: '24px', height: '24px', border: '2px solid var(--cream-mid)', borderTopColor: 'var(--brown)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Loading meal plan…
        </div>
      ) : error ? (
        <div style={{ background: 'var(--rust-light)', color: 'var(--rust)', padding: '16px', borderRadius: '10px' }}>
          Error: {error}
        </div>
      ) : (
        <DndContext
          onDragStart={({ active }) => setActiveMeal(active.data.current?.meal ?? null)}
          onDragEnd={(e) => { handleDragEnd(e); setActiveMeal(null) }}
          onDragCancel={() => setActiveMeal(null)}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="card" style={{ flex: 1, minWidth: 0, padding: '24px' }}>
              <WeekGrid
                weekStart={weekStart}
                getEntries={getEntries}
                onAdd={addEntry}
                onRemove={removeEntry}
                editable={true}
              />
            </div>
            <MealsSidebar />
          </div>

          <DragOverlay dropAnimation={null}>
            {activeMeal && (
              <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--brown-dark)', color: 'var(--cream)', fontSize: '0.88rem', fontWeight: 500, boxShadow: 'var(--shadow-md)', cursor: 'grabbing', pointerEvents: 'none' }}>
                {activeMeal.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--slate-light)', textAlign: 'center' }}>
        Drag meals from the sidebar onto any slot · Click a cell to add and manage meals · Changes sync in real time
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run src/pages/PlannerPage.test.jsx
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PlannerPage.jsx src/pages/PlannerPage.test.jsx
git commit -m "feat: wire addEntry/removeEntry/getEntries into PlannerPage and update drag handler"
```

---

## Task 8: Update `HistoryPage`

**Files:**
- Modify: `src/pages/HistoryPage.jsx`

- [ ] **Step 1: Update `HistoryWeekView` inside `HistoryPage.jsx`**

Replace only the `HistoryWeekView` function (lines 7–17):

```jsx
function HistoryWeekView({ weekStr }) {
  const weekStart = stringToWeekStart(weekStr)
  const { loading, getEntries } = useMealPlan(weekStart)

  if (loading) return <div style={{ color: 'var(--slate-light)', padding: '20px', textAlign: 'center' }}>Loading…</div>

  return (
    <div className="card" style={{ padding: '24px' }}>
      <WeekGrid weekStart={weekStart} getEntries={getEntries} onAdd={() => {}} onRemove={() => {}} editable={false} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/HistoryPage.jsx
git commit -m "fix: update HistoryPage to use getEntries from updated useMealPlan"
```

---

## Task 9: New `MealDetailPage`

**Files:**
- Create: `src/pages/MealDetailPage.jsx`
- Create: `src/pages/MealDetailPage.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/pages/MealDetailPage.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MealDetailPage from './MealDetailPage'

const mockUpdateMeal = vi.fn().mockResolvedValue({ error: null })

vi.mock('../hooks/useMeals', () => ({
  useMeals: () => ({
    meals: [
      {
        id: 'meal-1',
        name: 'Masala Omelette',
        description: 'Spiced egg omelette',
        recipe: 'Beat eggs. Add spices. Cook.',
        calories_per_portion: 320,
        protein_per_portion: 22
      }
    ],
    loading: false,
    updateMeal: mockUpdateMeal,
    createMeal: vi.fn(),
    deleteMeal: vi.fn(),
    refetch: vi.fn()
  })
}))

function renderPage(id = 'meal-1') {
  return render(
    <MemoryRouter initialEntries={[`/meals/${id}`]}>
      <Routes>
        <Route path="/meals/:id" element={<MealDetailPage />} />
        <Route path="/meals" element={<div>Meals Library</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('MealDetailPage', () => {
  it('shows the meal name as heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Masala Omelette' })).toBeInTheDocument()
  })

  it('shows calories chip', () => {
    renderPage()
    expect(screen.getByText('320')).toBeInTheDocument()
  })

  it('shows protein chip', () => {
    renderPage()
    expect(screen.getByText('22g')).toBeInTheDocument()
  })

  it('shows description', () => {
    renderPage()
    expect(screen.getByText('Spiced egg omelette')).toBeInTheDocument()
  })

  it('shows recipe', () => {
    renderPage()
    expect(screen.getByText('Beat eggs. Add spices. Cook.')).toBeInTheDocument()
  })

  it('shows not-found message for unknown id', () => {
    renderPage('no-such-meal')
    expect(screen.getByText(/Meal not found/)).toBeInTheDocument()
  })

  it('calls updateMeal with correct fields on save', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Edit'))
    const nameInput = screen.getByDisplayValue('Masala Omelette')
    fireEvent.change(nameInput, { target: { value: 'Plain Omelette' } })
    fireEvent.submit(nameInput.closest('form'))
    await waitFor(() => expect(mockUpdateMeal).toHaveBeenCalledWith('meal-1', expect.objectContaining({ name: 'Plain Omelette' })))
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/pages/MealDetailPage.test.jsx
```
Expected: `Cannot find module './MealDetailPage'`

- [ ] **Step 3: Create `src/pages/MealDetailPage.jsx`**

```jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'

export default function MealDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { meals, updateMeal } = useMeals()
  const meal = meals.find(m => m.id === id)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  if (!meal) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px', textAlign: 'center', color: 'var(--slate-light)' }}>
        Meal not found.{' '}
        <button onClick={() => navigate('/meals')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown)', textDecoration: 'underline', fontFamily: 'var(--font-body)' }}>
          Back to library
        </button>
      </div>
    )
  }

  function startEdit() {
    setForm({
      name: meal.name,
      description: meal.description || '',
      recipe: meal.recipe || '',
      calories: meal.calories_per_portion?.toString() || '',
      protein: meal.protein_per_portion?.toString() || ''
    })
    setEditing(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSaveError('')
    const { error } = await updateMeal(id, {
      name: form.name,
      description: form.description || null,
      recipe: form.recipe || null,
      calories_per_portion: form.calories ? parseInt(form.calories) : null,
      protein_per_portion: form.protein ? parseInt(form.protein) : null
    })
    if (error) setSaveError(error.message)
    else setEditing(false)
    setSaving(false)
  }

  const hasDetails = meal.description || meal.recipe || meal.calories_per_portion != null || meal.protein_per_portion != null

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px' }}>
      <button
        onClick={() => navigate('/meals')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown)', fontSize: '0.85rem', fontWeight: 600, padding: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-body)' }}
      >
        ← Meals Library
      </button>

      {!editing ? (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h1 style={{ color: 'var(--brown-dark)', fontSize: '1.6rem', lineHeight: 1.2 }}>{meal.name}</h1>
            <button onClick={startEdit} style={{ padding: '6px 14px', background: 'white', border: '1.5px solid var(--cream-mid)', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-mid)', cursor: 'pointer', flexShrink: 0 }}>Edit</button>
          </div>

          {(meal.calories_per_portion != null || meal.protein_per_portion != null) && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              {meal.calories_per_portion != null && (
                <div style={{ flex: 1, background: 'var(--cream)', borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid var(--cream-mid)' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brown-dark)' }}>{meal.calories_per_portion}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>kcal</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--slate-mid)', fontWeight: 600, marginTop: '2px' }}>Per portion</div>
                </div>
              )}
              {meal.protein_per_portion != null && (
                <div style={{ flex: 1, background: 'var(--cream)', borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid var(--cream-mid)' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brown-dark)' }}>{meal.protein_per_portion}g</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>protein</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--slate-mid)', fontWeight: 600, marginTop: '2px' }}>Per portion</div>
                </div>
              )}
            </div>
          )}

          {meal.description && (
            <>
              <p style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--slate-light)', marginBottom: '6px' }}>Description</p>
              <div style={{ background: 'var(--cream)', borderRadius: '10px', padding: '12px 14px', fontSize: '0.85rem', color: 'var(--slate-mid)', lineHeight: 1.55, marginBottom: '16px', border: '1px solid var(--cream-mid)' }}>
                {meal.description}
              </div>
            </>
          )}

          {meal.recipe && (
            <>
              <p style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--slate-light)', marginBottom: '6px' }}>Recipe</p>
              <div style={{ background: 'var(--cream)', borderRadius: '10px', padding: '12px 14px', fontSize: '0.82rem', color: 'var(--slate)', lineHeight: 1.65, border: '1px solid var(--cream-mid)', whiteSpace: 'pre-wrap' }}>
                {meal.recipe}
              </div>
            </>
          )}

          {!hasDetails && (
            <p style={{ color: 'var(--slate-light)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
              No details added yet. Click Edit to add a recipe and nutrition info.
            </p>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ color: 'var(--slate)', marginBottom: '20px', fontSize: '1.1rem' }}>Edit Meal</h2>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Meal Name</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Description <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--slate-light)' }}>(optional)</span></label>
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Recipe <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--slate-light)' }}>(optional)</span></label>
              <textarea className="input" value={form.recipe} onChange={e => setForm(f => ({ ...f, recipe: e.target.value }))} style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'var(--font-body)' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Calories</label>
                <input className="input" type="number" min="0" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} placeholder="kcal" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-mid)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Protein</label>
                <input className="input" type="number" min="0" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} placeholder="grams" />
              </div>
            </div>
            {saveError && <p style={{ color: 'var(--rust)', fontSize: '0.82rem' }}>{saveError}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/pages/MealDetailPage.test.jsx
```
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MealDetailPage.jsx src/pages/MealDetailPage.test.jsx
git commit -m "feat: add MealDetailPage with nutrition chips, description, recipe, and edit form"
```

---

## Task 10: Add route in `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the import and route**

Add import at the top (after `MealsPage` import):
```jsx
import MealDetailPage from './pages/MealDetailPage'
```

Add route inside `<Routes>` (after the `/meals` route):
```jsx
<Route path="/meals/:id" element={<MealDetailPage />} />
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add /meals/:id route for meal detail page"
```

---

## Task 11: Update `MealsPage` form

**Files:**
- Modify: `src/pages/MealsPage.jsx`
- Create: `src/pages/MealsPage.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/pages/MealsPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MealsPage from './MealsPage'

const mockCreateMeal = vi.fn().mockResolvedValue({ error: null })

vi.mock('../hooks/useMeals', () => ({
  useMeals: () => ({
    meals: [{ id: 'm1', name: 'Omelette', description: 'Eggs' }],
    loading: false,
    createMeal: mockCreateMeal,
    updateMeal: vi.fn(),
    deleteMeal: vi.fn().mockResolvedValue({ error: null }),
    refetch: vi.fn()
  })
}))

function renderPage() {
  return render(<MemoryRouter><MealsPage /></MemoryRouter>)
}

describe('MealsPage enhanced form', () => {
  beforeEach(() => mockCreateMeal.mockClear())

  it('has a recipe textarea', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/Recipe/)).toBeInTheDocument()
  })

  it('has a calories input', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/Calories per portion/)).toBeInTheDocument()
  })

  it('has a protein input', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/Protein g per portion/)).toBeInTheDocument()
  })

  it('calls createMeal with all five fields on submit', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText(/Meal name/), { target: { value: 'Salad' } })
    fireEvent.change(screen.getByPlaceholderText(/Short description/), { target: { value: 'Fresh' } })
    fireEvent.change(screen.getByPlaceholderText(/Recipe/), { target: { value: 'Mix it.' } })
    fireEvent.change(screen.getByPlaceholderText(/Calories per portion/), { target: { value: '200' } })
    fireEvent.change(screen.getByPlaceholderText(/Protein g per portion/), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /Add Meal/ }))
    await waitFor(() =>
      expect(mockCreateMeal).toHaveBeenCalledWith('Salad', {
        description: 'Fresh',
        recipe: 'Mix it.',
        caloriesPerPortion: 200,
        proteinPerPortion: 10
      })
    )
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/pages/MealsPage.test.jsx
```
Expected: recipe/calories/protein tests fail.

- [ ] **Step 3: Replace `src/pages/MealsPage.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'

export default function MealsPage() {
  const navigate = useNavigate()
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
      proteinPerPortion: newProtein ? parseInt(newProtein) : null
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

      <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--slate)' }}>Add New Meal</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="input" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Meal name (e.g. Pasta Carbonara)" required />
          <input className="input" value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Short description (optional)" />
          <textarea className="input" value={newRecipe} onChange={e => setNewRecipe(e.target.value)}
            placeholder="Recipe (optional)" style={{ minHeight: '72px', resize: 'vertical', fontFamily: 'var(--font-body)' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <input className="input" type="number" min="0" value={newCalories} onChange={e => setNewCalories(e.target.value)}
              placeholder="Calories per portion (optional)" style={{ flex: 1 }} />
            <input className="input" type="number" min="0" value={newProtein} onChange={e => setNewProtein(e.target.value)}
              placeholder="Protein g per portion (optional)" style={{ flex: 1 }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Adding…' : '+ Add Meal'}
          </button>
        </form>
        {error && <p style={{ color: 'var(--rust)', fontSize: '0.83rem', marginTop: '8px' }}>{error}</p>}
      </div>

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
              <div key={meal.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/meals/${meal.id}`)}>
                  <p style={{ fontWeight: 600, color: 'var(--brown)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{meal.name}</p>
                  {meal.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--slate-light)', marginTop: '2px' }}>{meal.description}</p>
                  )}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(meal.id)} disabled={deleting === meal.id}>
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/pages/MealsPage.test.jsx
```
Expected: all 4 tests pass.

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```
Expected: all tests across all files pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/MealsPage.jsx src/pages/MealsPage.test.jsx
git commit -m "feat: add recipe, calories, protein fields to MealsPage form and link names to detail page"
```

---

## Self-Review Checklist

- [x] DB migration SQL covers both constraint change and new columns
- [x] `addEntry` / `removeEntry` / `getEntries` names are consistent across hooks, components, and tests
- [x] `createMeal` options object `{ description, recipe, caloriesPerPortion, proteinPerPortion }` matches across `useMeals`, `SlotModal`, and `MealsPage`
- [x] `SlotModal` excludes already-added meals from search results (prevents duplicates)
- [x] `MealCell` wraps `SlotModal` in `{modalOpen && editable && ...}` — no modal rendered in history view
- [x] `HistoryPage` passes no-op `onAdd`/`onRemove` — safe since `editable={false}` prevents modal open
- [x] `MealDetailPage` handles `meal === undefined` (unknown id) gracefully
- [x] `updateMeal` in `useMeals` and `MealDetailPage` use consistent field names (`calories_per_portion`, `protein_per_portion`)
