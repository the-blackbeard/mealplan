# Multi-Meal Slots, Meal Detail Page & Enhanced Add-Meal Form — Design Spec

**Date:** 2026-05-08
**Status:** Approved

---

## Overview

Four related improvements to TableWeek:

1. **Multi-meal slots** — each breakfast/lunch/dinner slot can hold multiple meals (e.g. Omelette + Bread + Chai for breakfast). The DB schema and `useMealPlan` hook are updated to allow it.
2. **Title-only grid cells** — week grid cells show meal names only (no description), stacked compactly, with a "+N more" pill when there are more than 2.
3. **Slot modal** — clicking a cell opens a centered modal showing all meals in that slot, each clickable to navigate to the meal detail page. An "Add more" button reveals an inline search flow.
4. **Meal detail page** — `/meals/:id` route showing name, calories, protein, description, and recipe.
5. **Enhanced meal form** — the Add Meal form (on MealsPage and inline from the modal) gains recipe, calories-per-portion, and protein-per-portion fields.

---

## Database Schema Changes

### 1. Drop unique constraint on `meal_plan_entries`

The current `UNIQUE(meal_plan_id, day_of_week, slot)` constraint allows only one meal per slot. Drop it to allow multiple rows.

```sql
ALTER TABLE meal_plan_entries
  DROP CONSTRAINT meal_plan_entries_meal_plan_id_day_of_week_slot_key;
```

Add a new unique constraint on `(meal_plan_id, day_of_week, slot, meal_id)` to prevent adding the same meal twice to the same slot:

```sql
ALTER TABLE meal_plan_entries
  ADD CONSTRAINT meal_plan_entries_unique_meal_per_slot
  UNIQUE (meal_plan_id, day_of_week, slot, meal_id);
```

### 2. Add columns to `meals`

```sql
ALTER TABLE meals
  ADD COLUMN recipe TEXT,
  ADD COLUMN calories_per_portion INTEGER,
  ADD COLUMN protein_per_portion INTEGER;
```

All three columns are nullable (optional fields).

---

## Hook Changes

### `useMealPlan` (src/hooks/useMealPlan.js)

The existing `upsertEntry` used `onConflict: 'meal_plan_id,day_of_week,slot'` — that conflict target no longer exists. Replace it:

| Old function | New function | Change |
|---|---|---|
| `upsertEntry(day, slot, mealId, note)` | `addEntry(day, slot, mealId)` | Plain `.insert()` with conflict on `(meal_plan_id, day_of_week, slot, meal_id)` — silently ignores duplicate |
| `clearEntry(day, slot)` | `removeEntry(entryId)` | Delete by entry `id`, not by slot |
| `getEntry(day, slot)` | `getEntries(day, slot)` | Returns `Entry[]` instead of `Entry \| null` |

Keep `getEntries` as a pure selector over the `entries` array (no Supabase call).

`addEntry` implementation:
```js
async function addEntry(dayOfWeek, slot, mealId) {
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
```

`removeEntry` implementation:
```js
async function removeEntry(entryId) {
  const { error } = await supabase
    .from('meal_plan_entries')
    .delete()
    .eq('id', entryId)
  if (!error) await fetchPlan()
  return { error }
}
```

### `useMeals` (src/hooks/useMeals.js)

Add `updateMeal(id, fields)` for the Edit flow on the detail page:

```js
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
```

Update `createMeal` signature to accept new fields:
```js
async function createMeal(name, { description = '', recipe = '', caloriesPerPortion = null, proteinPerPortion = null } = {})
```

---

## Component Changes

### `MealCell` (src/components/MealCell.jsx)

- Receives `entries: Entry[]` (replacing single `entry`) and `onRemove(entryId)` (replacing `onClear`).
- Renders a compact vertical list of meal names (no description text).
- If `entries.length > 2`: show first 2 names + a "+N more" pill.
- Clicking the cell opens `SlotModal` (not `MealPicker`). Remove `MealPicker` import.
- Drop zone highlight and `onUpsert` prop replaced by `onAdd(dayIndex, slot, mealId)`.
- Drag-and-drop calls `onAdd` (additive) instead of `onUpsert` (replacement).

Cell display when filled (title-only):
```
┌──────────────────────┐
│ Omelette             │
│ Whole Wheat Bread    │
│ + 1 more             │
└──────────────────────┘
```

### New `SlotModal` (src/components/SlotModal.jsx)

A centered modal with overlay. Two internal views, toggled by `mode` state (`'list'` | `'search'`).

**List view** (`mode === 'list'`):
- Header: "Day label · Slot name" + close button.
- Slot chip: "☀️ N meals" (or "No meals yet" for empty).
- Meal rows: each shows meal name (clickable → navigate to `/meals/:id`) + ✕ remove button. Remove calls `onRemove(entry.id)`.
- "Add more" button → sets `mode = 'search'`.
- If slot is empty: empty state illustration + "Add a meal" button → `mode = 'search'`.

**Search view** (`mode === 'search'`):
- Header: back arrow (← returns to list) + search input (autofocused).
- Slot chip reminder of context.
- Results list filtered from `useMeals()` data client-side.
- Each result has an "+ Add" button → calls `onAdd(dayIndex, slot, meal.id)` then returns to list view.
- If search string matches nothing: "Don't see it?" label + "＋ Create '[query]' as new meal" button → sets `mode = 'create'`.

**Create view** (`mode === 'create'`):
- Header: back arrow (← returns to search) + "New Meal" title.
- 5-field form: Name (pre-filled with search query), Description, Recipe (textarea), Calories per portion, Protein per portion.
- On submit: `createMeal(...)` then immediately `addEntry(dayIndex, slot, newMeal.id)`, then `mode = 'list'`.

Props:
```js
<SlotModal
  slot="breakfast"           // 'breakfast' | 'lunch' | 'dinner'
  dayIndex={0}               // 0–6
  dayLabel="Monday, May 5"   // display string
  entries={[...]}            // Entry[] for this slot
  onAdd={addEntry}           // (dayIndex, slot, mealId) => Promise
  onRemove={removeEntry}     // (entryId) => Promise
  onClose={() => ...}
/>
```

### New `MealDetailPage` (src/pages/MealDetailPage.jsx)

Route: `/meals/:id`

- Reads `id` from `useParams()`.
- Calls `useMeals()` and finds the meal by id client-side (no extra Supabase call).
- Shows: back link to `/meals`, meal name as `<h1>`, macro chips (calories + protein, only rendered if non-null), description block (if present), recipe block (if present) rendered as plain pre-wrap text (stored as free-form text, not parsed into numbered steps).
- "Edit" button opens an inline edit form (same fields as Add Meal, pre-populated). Save calls `updateMeal(id, fields)`.

### `MealsPage` (src/pages/MealsPage.jsx)

- Each meal card in the list is now a link to `/meals/:id` (clicking the name navigates).
- Add Meal form gains 3 new optional fields: Recipe (textarea), Calories per portion (number input), Protein per portion (number input).
- Form is laid out: Name (full width) → Description (full width) → Recipe (full width textarea) → [Calories | Protein] (two columns) → Submit.

---

## Routing (src/App.jsx)

Add one new route:
```jsx
<Route path="/meals/:id" element={<MealDetailPage />} />
```

---

## Drag-and-Drop Behaviour Change

`handleDragEnd` in `PlannerPage` currently calls `upsertEntry` (replace). Change it to call `addEntry` (additive). Dropping the same meal twice onto the same slot is a no-op (silently ignored by the new unique constraint on `meal_id`).

---

## `WeekGrid` / `PlannerPage` prop threading

`WeekGrid` currently passes `entry={getEntry(i, slot)}` and `onClear={onClear}` to each `MealCell`. Change to:
- `entries={getEntries(i, slot)}` (array)
- `onRemove={removeEntry}` (by id)
- `onAdd={addEntry}`

`PlannerPage` exposes `addEntry` and `removeEntry` from `useMealPlan` and threads them down.

---

## Error Handling

- `addEntry` failure: no optimistic update; Supabase realtime won't broadcast the change. Modal stays open. A future toast enhancement is out of scope.
- `removeEntry` failure: same — silent, no change visible.
- `updateMeal` failure: show inline error below the edit form.
- Duplicate add (same meal already in slot): Supabase returns a unique-constraint error; app silently ignores it (treat as success).

---

## Files Changed

| File | Change |
|------|--------|
| `supabase_schema.sql` | Document schema migration (drop old constraint, add new, add columns) |
| `src/hooks/useMealPlan.js` | Replace `upsertEntry`/`clearEntry`/`getEntry` with `addEntry`/`removeEntry`/`getEntries` |
| `src/hooks/useMeals.js` | Add `updateMeal`, update `createMeal` signature |
| `src/components/MealCell.jsx` | Multi-entry display, title-only, opens `SlotModal` |
| `src/components/SlotModal.jsx` | **New** — list + search + add flow |
| `src/components/MealPicker.jsx` | No longer used by MealCell (import removed from MealCell); file left in place |
| `src/pages/MealDetailPage.jsx` | **New** — `/meals/:id` detail + edit |
| `src/pages/MealsPage.jsx` | Enhanced form fields, meal names link to detail page |
| `src/pages/PlannerPage.jsx` | Thread `addEntry`/`removeEntry`/`getEntries`, update `handleDragEnd` |
| `src/components/WeekGrid.jsx` | Update props passed to `MealCell` |
| `src/App.jsx` | Add `/meals/:id` route |

---

## DB Migration SQL (run in Supabase SQL editor)

```sql
-- 1. Drop old single-entry-per-slot constraint
ALTER TABLE meal_plan_entries
  DROP CONSTRAINT meal_plan_entries_meal_plan_id_day_of_week_slot_key;

-- 2. Add constraint preventing the same meal from being added twice to one slot
ALTER TABLE meal_plan_entries
  ADD CONSTRAINT meal_plan_entries_unique_meal_per_slot
  UNIQUE (meal_plan_id, day_of_week, slot, meal_id);

-- 3. Add new columns to meals
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS recipe TEXT,
  ADD COLUMN IF NOT EXISTS calories_per_portion INTEGER,
  ADD COLUMN IF NOT EXISTS protein_per_portion INTEGER;
```

---

## Out of Scope

- Sorting/reordering meals within a slot
- Per-meal notes inside a slot
- Nutritional totals per day/week
- Deleting a meal from the library from the detail page (existing Delete button on MealsPage handles this)
