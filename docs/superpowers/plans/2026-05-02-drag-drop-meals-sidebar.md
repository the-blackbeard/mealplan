# Drag-and-Drop Meals Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed-width meals library sidebar to `PlannerPage` with drag-and-drop so users can drag any meal card onto a calendar slot to assign it instantly.

**Architecture:** `MealsSidebar` is a new self-contained component that calls `useMeals()`, owns search state, and renders draggable cards via `@dnd-kit/core`. `PlannerPage` switches to a two-column flex layout, wraps everything in `DndContext`, and calls the existing `upsertEntry` on drop. `MealCell` gains `useDroppable` for visual drop-zone feedback. The `handleDragEnd` logic is extracted as a pure exported function (`makeDragEndHandler`) so it can be unit-tested in isolation.

**Tech Stack:** React 18, `@dnd-kit/core`, `@dnd-kit/utilities`, Vitest, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, jsdom

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Install | — | `@dnd-kit/core`, `@dnd-kit/utilities`, vitest, testing-library |
| Modify | `vite.config.js` | Add vitest configuration block |
| Modify | `package.json` | Add `"test"` script |
| Create | `src/test-setup.js` | Import `@testing-library/jest-dom` matchers |
| Create | `src/components/MealsSidebar.jsx` | Sidebar with search + draggable meal cards |
| Create | `src/components/MealsSidebar.test.jsx` | Tests for MealsSidebar |
| Modify | `src/components/MealCell.jsx` | Add `useDroppable`, drop-zone highlight |
| Create | `src/components/MealCell.test.jsx` | Tests for MealCell drop target behaviour |
| Modify | `src/pages/PlannerPage.jsx` | Two-column layout, `DndContext`, export `makeDragEndHandler` |
| Create | `src/pages/PlannerPage.test.jsx` | Tests for `makeDragEndHandler` |

---

## Task 1: Install Dependencies + Test Infrastructure

**Files:**
- Modify: `vite.config.js`
- Modify: `package.json`
- Create: `src/test-setup.js`

- [ ] **Step 1: Install runtime and dev dependencies**

```bash
npm install @dnd-kit/core @dnd-kit/utilities
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Expected: no errors, packages appear in `package.json`.

- [ ] **Step 2: Add vitest config to `vite.config.js`**

Replace the entire file with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
})
```

- [ ] **Step 3: Add test script to `package.json`**

Add `"test": "vitest"` to the `"scripts"` block:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
  "test": "vitest"
},
```

- [ ] **Step 4: Create test setup file**

Create `src/test-setup.js`:

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Verify test runner works**

```bash
npm test -- --run
```

Expected: "No test files found" (or 0 tests, no errors). Vitest exits 0.

- [ ] **Step 6: Commit**

```bash
git add vite.config.js package.json package-lock.json src/test-setup.js
git commit -m "chore: install dnd-kit and vitest test infrastructure"
```

---

## Task 2: `makeDragEndHandler` — pure function (TDD)

This utility parses a dnd-kit `onDragEnd` event and calls `upsertEntry`. Extracting it as a pure named export makes it trivially testable without rendering anything.

**Files:**
- Modify: `src/pages/PlannerPage.jsx` (add export only — no rendering changes yet)
- Create: `src/pages/PlannerPage.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/PlannerPage.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { makeDragEndHandler } from './PlannerPage'

describe('makeDragEndHandler', () => {
  it('calls upsertEntry with parsed dayIndex, slot, and mealId', () => {
    const upsertEntry = vi.fn()
    const handler = makeDragEndHandler(upsertEntry)
    handler({
      active: { data: { current: { meal: { id: 'abc-123' } } } },
      over: { id: 'drop-2-lunch' },
    })
    expect(upsertEntry).toHaveBeenCalledWith(2, 'lunch', 'abc-123', null)
  })

  it('does nothing when dropped outside any cell (over is null)', () => {
    const upsertEntry = vi.fn()
    const handler = makeDragEndHandler(upsertEntry)
    handler({
      active: { data: { current: { meal: { id: 'abc-123' } } } },
      over: null,
    })
    expect(upsertEntry).not.toHaveBeenCalled()
  })

  it('handles day 0 (Monday) and breakfast slot', () => {
    const upsertEntry = vi.fn()
    const handler = makeDragEndHandler(upsertEntry)
    handler({
      active: { data: { current: { meal: { id: 'xyz' } } } },
      over: { id: 'drop-0-breakfast' },
    })
    expect(upsertEntry).toHaveBeenCalledWith(0, 'breakfast', 'xyz', null)
  })

  it('handles day 6 (Sunday) and dinner slot', () => {
    const upsertEntry = vi.fn()
    const handler = makeDragEndHandler(upsertEntry)
    handler({
      active: { data: { current: { meal: { id: 'xyz' } } } },
      over: { id: 'drop-6-dinner' },
    })
    expect(upsertEntry).toHaveBeenCalledWith(6, 'dinner', 'xyz', null)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run src/pages/PlannerPage.test.jsx
```

Expected: FAIL — `makeDragEndHandler` is not exported from `PlannerPage.jsx`.

- [ ] **Step 3: Add `makeDragEndHandler` export to `PlannerPage.jsx`**

Add the following **before** the `export default function PlannerPage()` line (no other changes to the component yet):

```js
export function makeDragEndHandler(upsertEntry) {
  return function handleDragEnd({ active, over }) {
    if (!over) return
    const parts = over.id.split('-') // ['drop', '2', 'lunch']
    const dayIndex = parseInt(parts[1], 10)
    const slot = parts[2]
    const meal = active.data.current.meal
    upsertEntry(dayIndex, slot, meal.id, null)
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --run src/pages/PlannerPage.test.jsx
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PlannerPage.jsx src/pages/PlannerPage.test.jsx
git commit -m "feat: add makeDragEndHandler with tests"
```

---

## Task 3: `MealCell` as Drop Target (TDD)

Add `useDroppable` so each cell registers with dnd-kit and highlights when something is dragged over it.

**Files:**
- Modify: `src/components/MealCell.jsx`
- Create: `src/components/MealCell.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/MealCell.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useDroppable } from '@dnd-kit/core'
import MealCell from './MealCell'

vi.mock('@dnd-kit/core', () => ({
  useDroppable: vi.fn(),
}))

const defaultDroppable = { setNodeRef: () => {}, isOver: false }

describe('MealCell drop target', () => {
  beforeEach(() => {
    useDroppable.mockReturnValue(defaultDroppable)
  })

  it('registers as droppable with id "drop-<dayIndex>-<slot>"', () => {
    render(
      <MealCell
        slot="lunch"
        dayIndex={2}
        dayLabel="Wed, May 1"
        entry={null}
        onUpsert={vi.fn()}
        onClear={vi.fn()}
      />
    )
    expect(useDroppable).toHaveBeenCalledWith({ id: 'drop-2-lunch' })
  })

  it('registers with id "drop-0-breakfast" for Monday breakfast', () => {
    render(
      <MealCell
        slot="breakfast"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entry={null}
        onUpsert={vi.fn()}
        onClear={vi.fn()}
      />
    )
    expect(useDroppable).toHaveBeenCalledWith({ id: 'drop-0-breakfast' })
  })

  it('applies the slot accent colour as border when isOver is true', () => {
    useDroppable.mockReturnValue({ setNodeRef: () => {}, isOver: true })
    const { container } = render(
      <MealCell
        slot="lunch"
        dayIndex={2}
        dayLabel="Wed, May 1"
        entry={null}
        onUpsert={vi.fn()}
        onClear={vi.fn()}
      />
    )
    // container.firstChild is the cell div (first element in the fragment)
    expect(container.firstChild.style.borderColor).toBe('var(--green)')
  })

  it('uses dinner accent colour (rust) when isOver on a dinner cell', () => {
    useDroppable.mockReturnValue({ setNodeRef: () => {}, isOver: true })
    const { container } = render(
      <MealCell
        slot="dinner"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entry={null}
        onUpsert={vi.fn()}
        onClear={vi.fn()}
      />
    )
    expect(container.firstChild.style.borderColor).toBe('var(--rust)')
  })

  it('shows slot-coloured background when isOver, even on an empty cell', () => {
    useDroppable.mockReturnValue({ setNodeRef: () => {}, isOver: true })
    const { container } = render(
      <MealCell
        slot="breakfast"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entry={null}
        onUpsert={vi.fn()}
        onClear={vi.fn()}
      />
    )
    expect(container.firstChild.style.background).toBe('#fef9ec')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run src/components/MealCell.test.jsx
```

Expected: FAIL — `useDroppable` is not used in `MealCell.jsx` yet.

- [ ] **Step 3: Modify `MealCell.jsx` to add drop target support**

Replace the entire file content with:

```jsx
import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import MealPicker from './MealPicker'

const SLOT_META = {
  breakfast: { emoji: '☀️', label: 'Breakfast', color: '#e8a020', bg: '#fef9ec' },
  lunch: { emoji: '🌤️', label: 'Lunch', color: 'var(--green)', bg: 'var(--green-light)' },
  dinner: { emoji: '🌙', label: 'Dinner', color: 'var(--rust)', bg: 'var(--rust-light)' }
}

export default function MealCell({ slot, dayIndex, dayLabel, entry, onUpsert, onClear, editable = true }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const meta = SLOT_META[slot]
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${dayIndex}-${slot}` })

  async function handleSelect(meal) {
    await onUpsert(dayIndex, slot, meal.id, null)
    setPickerOpen(false)
  }

  async function handleClear(e) {
    e.stopPropagation()
    await onClear(dayIndex, slot)
  }

  const hasMeal = entry?.meal || entry?.custom_note

  return (
    <>
      <div
        ref={setNodeRef}
        onClick={() => editable && setPickerOpen(true)}
        style={{
          minHeight: '72px',
          padding: '10px 12px',
          borderRadius: '10px',
          border: `1.5px solid ${isOver ? meta.color : (hasMeal ? 'transparent' : 'var(--cream-mid)')}`,
          background: hasMeal || isOver ? meta.bg : 'var(--cream)',
          cursor: editable ? 'pointer' : 'default',
          position: 'relative',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: hasMeal ? 'space-between' : 'center',
          alignItems: hasMeal ? 'flex-start' : 'center',
          gap: '4px',
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
            e.currentTarget.style.borderColor = hasMeal ? 'transparent' : 'var(--cream-mid)'
            e.currentTarget.style.boxShadow = 'none'
          }
        }}
      >
        {hasMeal ? (
          <>
            <div style={{ width: '100%' }}>
              <p style={{
                fontSize: '0.88rem', fontWeight: '600', color: 'var(--slate)',
                lineHeight: '1.3', wordBreak: 'break-word'
              }}>
                {entry.meal?.name || entry.custom_note}
              </p>
              {entry.meal?.description && (
                <p style={{ fontSize: '0.74rem', color: 'var(--slate-mid)', marginTop: '2px' }}>
                  {entry.meal.description}
                </p>
              )}
              {entry.updater && (
                <p style={{ fontSize: '0.7rem', color: meta.color, marginTop: '4px', opacity: 0.8 }}>
                  by {entry.updater.display_name}
                </p>
              )}
            </div>
            {editable && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <button
                  onClick={e => { e.stopPropagation(); setPickerOpen(true) }}
                  style={{
                    fontSize: '0.7rem', padding: '2px 7px', borderRadius: '5px',
                    background: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer',
                    color: 'var(--slate-mid)', fontFamily: 'var(--font-body)'
                  }}
                >
                  Change
                </button>
                <button
                  onClick={handleClear}
                  style={{
                    fontSize: '0.7rem', padding: '2px 7px', borderRadius: '5px',
                    background: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer',
                    color: 'var(--rust)', fontFamily: 'var(--font-body)'
                  }}
                >
                  Clear
                </button>
              </div>
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

      {pickerOpen && (
        <MealPicker
          slot={slot}
          dayLabel={dayLabel}
          onSelect={handleSelect}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --run src/components/MealCell.test.jsx
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MealCell.jsx src/components/MealCell.test.jsx
git commit -m "feat: add useDroppable drop-zone highlight to MealCell"
```

---

## Task 4: `MealsSidebar` Component (TDD)

New component: sidebar with search, internal-scroll meal list, draggable cards.

**Files:**
- Create: `src/components/MealsSidebar.jsx`
- Create: `src/components/MealsSidebar.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/MealsSidebar.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useMeals } from '../hooks/useMeals'
import { useDraggable } from '@dnd-kit/core'
import MealsSidebar from './MealsSidebar'

vi.mock('../hooks/useMeals')
vi.mock('@dnd-kit/core', () => ({
  useDraggable: vi.fn(),
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

const MEALS = [
  { id: '1', name: 'Pasta Carbonara', description: 'Classic Italian' },
  { id: '2', name: 'Greek Salad', description: '' },
  { id: '3', name: 'Ramen', description: 'Japanese noodles' },
]

const draggableDefault = {
  attributes: { role: 'button' },
  listeners: {},
  setNodeRef: () => {},
  transform: null,
  isDragging: false,
}

describe('MealsSidebar', () => {
  beforeEach(() => {
    useMeals.mockReturnValue({ meals: MEALS, loading: false })
    useDraggable.mockReturnValue(draggableDefault)
  })

  it('renders a card for each meal', () => {
    render(<MealsSidebar />)
    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
    expect(screen.getByText('Greek Salad')).toBeInTheDocument()
    expect(screen.getByText('Ramen')).toBeInTheDocument()
  })

  it('shows meal description when available', () => {
    render(<MealsSidebar />)
    expect(screen.getByText('Classic Italian')).toBeInTheDocument()
    expect(screen.getByText('Japanese noodles')).toBeInTheDocument()
  })

  it('shows the count label with total number of meals', () => {
    render(<MealsSidebar />)
    expect(screen.getByText(/3 meals/)).toBeInTheDocument()
  })

  it('filters meals by search query (case-insensitive)', async () => {
    render(<MealsSidebar />)
    await userEvent.type(screen.getByPlaceholderText('Search meals…'), 'pasta')
    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
    expect(screen.queryByText('Greek Salad')).not.toBeInTheDocument()
    expect(screen.queryByText('Ramen')).not.toBeInTheDocument()
  })

  it('updates count label to reflect filtered results', async () => {
    render(<MealsSidebar />)
    await userEvent.type(screen.getByPlaceholderText('Search meals…'), 'pasta')
    expect(screen.getByText(/1 meal/)).toBeInTheDocument()
  })

  it('shows "no results" message when search finds nothing', async () => {
    render(<MealsSidebar />)
    await userEvent.type(screen.getByPlaceholderText('Search meals…'), 'xyznotfound')
    expect(screen.getByText(/No meals match your search/)).toBeInTheDocument()
  })

  it('shows empty state when household has no meals', () => {
    useMeals.mockReturnValue({ meals: [], loading: false })
    render(<MealsSidebar />)
    expect(screen.getByText(/No meals yet/)).toBeInTheDocument()
  })

  it('registers each meal card with useDraggable using meal-<id> as the id', () => {
    render(<MealsSidebar />)
    expect(useDraggable).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'meal-1' })
    )
    expect(useDraggable).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'meal-2' })
    )
  })

  it('passes the meal object as drag data', () => {
    render(<MealsSidebar />)
    expect(useDraggable).toHaveBeenCalledWith(
      expect.objectContaining({ data: { meal: MEALS[0] } })
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run src/components/MealsSidebar.test.jsx
```

Expected: FAIL — `MealsSidebar` does not exist yet.

- [ ] **Step 3: Create `MealsSidebar.jsx`**

Create `src/components/MealsSidebar.jsx`:

```jsx
import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'

function DraggableMealCard({ meal }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `meal-${meal.id}`,
    data: { meal },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1.5px solid var(--cream-mid)',
        background: 'var(--cream)',
        cursor: 'grab',
        userSelect: 'none',
        opacity: isDragging ? 0.4 : 1,
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : 'border-color 0.15s',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--slate-light)', marginTop: '1px', flexShrink: 0 }}>⠿</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--slate)', lineHeight: '1.3' }}>
          {meal.name}
        </div>
        {meal.description && (
          <div style={{ fontSize: '0.74rem', color: 'var(--slate-light)', marginTop: '1px', lineHeight: '1.3' }}>
            {meal.description}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MealsSidebar() {
  const { meals, loading } = useMeals()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = meals.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{
      width: '240px',
      flexShrink: 0,
      background: 'var(--white)',
      border: '1px solid var(--cream-mid)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      alignSelf: 'stretch',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--cream-mid)', flexShrink: 0 }}>
        <div style={{
          fontSize: '0.85rem', fontWeight: '600', color: 'var(--brown-dark)',
          marginBottom: '10px',
        }}>
          🍽 Meals Library
        </div>
        <input
          className="input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search meals…"
          style={{ fontSize: '0.82rem', padding: '7px 10px' }}
        />
      </div>

      {/* Count label */}
      <div style={{
        padding: '8px 14px 4px',
        fontSize: '0.72rem',
        fontWeight: '600',
        color: 'var(--slate-light)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        flexShrink: 0,
      }}>
        {filtered.length} {filtered.length === 1 ? 'meal' : 'meals'} · drag to plan
      </div>

      {/* Scrollable meals list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {loading && (
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-light)', textAlign: 'center', padding: '16px 0' }}>
            Loading…
          </p>
        )}
        {!loading && meals.length === 0 && (
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-light)', textAlign: 'center', padding: '16px 0' }}>
            No meals yet — go to Meals to create some.
          </p>
        )}
        {!loading && meals.length > 0 && filtered.length === 0 && (
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-light)', textAlign: 'center', padding: '16px 0' }}>
            No meals match your search.
          </p>
        )}
        {filtered.map(meal => (
          <DraggableMealCard key={meal.id} meal={meal} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--cream-mid)', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/meals')}
          style={{
            width: '100%',
            background: 'none',
            border: '1.5px dashed var(--cream-mid)',
            borderRadius: '8px',
            padding: '7px',
            fontSize: '0.82rem',
            fontWeight: '600',
            color: 'var(--brown)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          + Add new meal
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --run src/components/MealsSidebar.test.jsx
```

Expected: 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MealsSidebar.jsx src/components/MealsSidebar.test.jsx
git commit -m "feat: add MealsSidebar with search and draggable meal cards"
```

---

## Task 5: Wire `DndContext` into `PlannerPage` + Two-Column Layout

Connect everything: two-column layout, `DndContext`, `DragOverlay`, and `MealsSidebar`.

**Files:**
- Modify: `src/pages/PlannerPage.jsx`

- [ ] **Step 1: Run existing `PlannerPage` tests to confirm they still pass**

```bash
npm test -- --run src/pages/PlannerPage.test.jsx
```

Expected: 4 tests PASS (makeDragEndHandler tests from Task 2).

- [ ] **Step 2: Replace `PlannerPage.jsx` with the full updated implementation**

Replace the entire file:

```jsx
import { useState } from 'react'
import { format } from 'date-fns'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { getWeekStart, prevWeek, nextWeek, formatWeekLabel, isCurrentWeek } from '../lib/dates'
import { useMealPlan } from '../hooks/useMealPlan'
import WeekGrid from '../components/WeekGrid'
import MealsSidebar from '../components/MealsSidebar'

export function makeDragEndHandler(upsertEntry) {
  return function handleDragEnd({ active, over }) {
    if (!over) return
    const parts = over.id.split('-') // ['drop', '2', 'lunch']
    const dayIndex = parseInt(parts[1], 10)
    const slot = parts[2]
    const meal = active.data.current.meal
    upsertEntry(dayIndex, slot, meal.id, null)
  }
}

export default function PlannerPage() {
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const { loading, error, upsertEntry, clearEntry, getEntry } = useMealPlan(weekStart)
  const [activeMeal, setActiveMeal] = useState(null)
  const isThisWeek = isCurrentWeek(weekStart)

  const handleDragEnd = makeDragEndHandler(upsertEntry)

  return (
    <div style={{ maxWidth: '1500px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: 'var(--brown-dark)', marginBottom: '6px' }}>
            {isThisWeek ? 'This Week' : 'Meal Plan'}
          </h1>
          <p style={{ color: 'var(--slate-mid)', fontSize: '0.95rem' }}>
            📅 {formatWeekLabel(weekStart)}
            {isThisWeek && (
              <span style={{
                marginLeft: '10px', padding: '2px 10px', borderRadius: '20px',
                background: 'var(--green-light)', color: 'var(--green)',
                fontSize: '0.75rem', fontWeight: '600'
              }}>
                Current Week
              </span>
            )}
          </p>
        </div>

        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekStart(prevWeek(weekStart))}>
            ← Prev
          </button>
          {!isThisWeek && (
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(getWeekStart())}>
              Today
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekStart(nextWeek(weekStart))}>
            Next →
          </button>
        </div>
      </div>

      {/* Realtime indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '20px', fontSize: '0.8rem', color: 'var(--slate-light)'
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)',
          boxShadow: '0 0 0 3px var(--green-light)', display: 'inline-block'
        }} />
        Live — changes by your household appear instantly
      </div>

      {/* Grid + Sidebar */}
      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '320px', gap: '12px', color: 'var(--slate-light)'
        }}>
          <div style={{
            width: '24px', height: '24px', border: '2px solid var(--cream-mid)',
            borderTopColor: 'var(--brown)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          Loading meal plan…
        </div>
      ) : error ? (
        <div style={{
          background: 'var(--rust-light)', color: 'var(--rust)',
          padding: '16px', borderRadius: '10px'
        }}>
          Error: {error}
        </div>
      ) : (
        <DndContext
          onDragStart={({ active }) => setActiveMeal(active.data.current?.meal ?? null)}
          onDragEnd={(e) => { handleDragEnd(e); setActiveMeal(null) }}
          onDragCancel={() => setActiveMeal(null)}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {/* Calendar card */}
            <div className="card" style={{ flex: 1, minWidth: 0, padding: '24px' }}>
              <WeekGrid
                weekStart={weekStart}
                onUpsert={upsertEntry}
                onClear={clearEntry}
                getEntry={getEntry}
                editable={true}
              />
            </div>

            {/* Meals sidebar */}
            <MealsSidebar />
          </div>

          <DragOverlay dropAnimation={null}>
            {activeMeal && (
              <div style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'var(--brown-dark)',
                color: 'var(--cream)',
                fontSize: '0.88rem',
                fontWeight: '500',
                boxShadow: 'var(--shadow-md)',
                cursor: 'grabbing',
                pointerEvents: 'none',
              }}>
                {activeMeal.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--slate-light)', textAlign: 'center' }}>
        Drag meals from the sidebar onto any slot · Click a cell to use the picker · Changes sync in real time
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --run
```

Expected: all tests pass (PlannerPage × 4, MealCell × 5, MealsSidebar × 9).

- [ ] **Step 4: Start the dev server and manually smoke-test**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and verify:
- [ ] Sidebar appears on the right of the calendar
- [ ] Sidebar height matches the calendar card — does not extend beyond it
- [ ] Meals list scrolls inside the sidebar when there are many meals
- [ ] Search input filters the list in real time
- [ ] Dragging a meal card shows the floating chip overlay
- [ ] Hovering over a cell while dragging highlights its border with the slot colour
- [ ] Dropping on an empty cell assigns the meal (visible immediately)
- [ ] Dropping on a filled cell silently replaces the meal
- [ ] Dropping outside the grid cancels with no change
- [ ] "Add new meal" footer button navigates to `/meals`
- [ ] Click-to-pick modal still works normally

- [ ] **Step 5: Commit**

```bash
git add src/pages/PlannerPage.jsx
git commit -m "feat: wire DndContext and MealsSidebar into PlannerPage with two-column layout"
```

---

## Task 6: Final commit — run all tests clean

- [ ] **Step 1: Run full test suite one final time**

```bash
npm test -- --run
```

Expected: 18 tests, all PASS, 0 failures.

- [ ] **Step 2: Run build to confirm no type/lint errors**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: drag-and-drop meals sidebar complete"
```
