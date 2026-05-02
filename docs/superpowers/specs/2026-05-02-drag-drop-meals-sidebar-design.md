# Drag-and-Drop Meals Sidebar — Design Spec

**Date:** 2026-05-02  
**Status:** Approved

## Overview

Add a fixed-width meals library sidebar to the right of the weekly calendar on `PlannerPage`. Users drag meal cards from the sidebar and drop them onto any day/slot cell to assign a meal — no modal required. Dropping onto a filled cell silently replaces the existing meal.

## Layout

`PlannerPage` switches from a single centered column to a two-column flex row:

```
┌─────────────────────────────────────┬────────────────┐
│  Calendar card  (flex: 1)           │ MealsSidebar   │
│  WeekGrid inside                    │ (width: 240px) │
│                                     │ height: stretch│
└─────────────────────────────────────┴────────────────┘
```

- The sidebar's height is constrained to match the calendar card (`alignSelf: stretch`). It never makes the page taller.
- The meals list inside the sidebar scrolls internally (`overflowY: auto`). The page itself does not scroll for the sidebar.
- Page `maxWidth` increases from `1200px` to `1500px` to accommodate the sidebar without squishing the grid.

## New Component: `MealsSidebar`

**File:** `src/components/MealsSidebar.jsx`

Responsibilities:
- Calls `useMeals()` to get the household meal list.
- Owns a `search` state; filters the list client-side by name.
- Renders a search `<input>` at the top.
- Renders a scrollable list of `DraggableMealCard` items.
- Shows a count label ("N meals · drag to plan").
- Renders a footer "＋ Add new meal" button that navigates to `/meals`.
- Has no knowledge of the calendar; purely a drag source.

## DraggableMealCard

Each meal card inside the sidebar uses `useDraggable` from `@dnd-kit/core`:

```js
useDraggable({ id: `meal-${meal.id}`, data: { meal } })
```

- Applies `transform` style from the hook when dragging (so the card lifts).
- Shows a drag handle icon (⠿) on the left.
- Displays `meal.name` and optional `meal.description` subtitle.

## DragOverlay

A `DragOverlay` component (provided by `@dnd-kit/core`) renders a floating chip matching the active meal's name while the user is mid-drag. This replaces the browser's default ghost image.

## MealCell as Drop Target

`MealCell` receives `useDroppable({ id: \`drop-\${dayIndex}-\${slot}\` })`.

- When `isOver` is true (something dragged over this cell): border changes to the slot's accent colour (breakfast gold / lunch green / dinner rust) as a drop-zone highlight.
- On drop (`onDragEnd` in `DndContext`): calls `upsertEntry(dayIndex, slot, meal.id, null)`.
- If the cell already has a meal, it is silently replaced (no confirmation).

## DnD Context wiring in PlannerPage

```
<DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
  <WeekGrid ... />
  <MealsSidebar />
  <DragOverlay>
    {activeMeal && <MealChip meal={activeMeal} />}
  </DragOverlay>
</DndContext>
```

`handleDragEnd` reads `over.id` (e.g. `"drop-2-lunch"`) and `active.data.current.meal` then calls `upsertEntry`. `MealChip` is a small inline element rendered inside `DragOverlay` — just the meal name in a styled pill.

## Data Flow

```
useMeals()  →  MealsSidebar  →  DraggableMealCard  (drag source)
                                        ↓ drag
                               DndContext.onDragEnd
                                        ↓
                               upsertEntry(day, slot, mealId)
                                        ↓
                               Supabase upsert  →  realtime broadcast
```

The existing `upsertEntry` function in `useMealPlan` is unchanged. Drag-and-drop is purely a new interaction path that calls the same write operation as click-to-pick.

## Error Handling

- If `upsertEntry` returns an error, no visual change occurs (Supabase realtime will not echo the change back). A future enhancement could show a toast, but that is out of scope here.
- If the meals list is empty, the sidebar shows an empty state: "No meals yet — go to Meals to create some."
- Search returning zero results shows "No meals match your search."

## Dependencies

Add `@dnd-kit/core` and `@dnd-kit/utilities` (peer utilities used by the overlay transform helper).

```bash
npm install @dnd-kit/core @dnd-kit/utilities
```

No other new dependencies.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/PlannerPage.jsx` | Two-column layout, `DndContext`, `handleDragEnd`, `activeMeal` state |
| `src/components/MealCell.jsx` | Add `useDroppable`, drop-zone highlight on `isOver` |
| `src/components/MealsSidebar.jsx` | **New** — search, scrollable list, draggable cards |

`WeekGrid.jsx` requires no changes — it already passes `dayIndex` and `slot` to each `MealCell`.

## Out of Scope

- Drag from calendar cell to calendar cell (reordering)
- Touch/mobile drag (supported by dnd-kit but not a stated requirement)
- Undo / drag-cancel visual feedback beyond the overlay disappearing
