---
name: mealplan-learnings
description: Use when starting any task on the TableWeek meal planner project — loads project-specific gotchas, patterns, and hard-won learnings not obvious from reading the code. Also use when about to add a new Supabase query, touch date logic, change styling, or extend realtime behavior.
---

# TableWeek — Project Learnings & Agent Runbook

## Purpose

This is a living reference for agents working on the TableWeek meal planner (`/Users/garvitverma/projects/mealplan`). It captures **non-obvious gotchas, enforced constraints, and patterns discovered during development** that are NOT fully explained by reading the code or CLAUDE.md alone.

**When you learn something new that would have helped you avoid a mistake or a wrong assumption, add it here.**

---

## Core Mental Model

- **Household = the unit of data isolation.** Every table (except `profiles`) is scoped by `household_id`. RLS policies enforce this at the DB level — you cannot accidentally read another household's data.
- **Week = a Monday DATE.** There is no "current week" concept in the DB — only `week_start` (always a Monday). Never compute this manually; always use `src/lib/dates.js` helpers.
- **Meal plan entries are upserted, not inserted.** The `meal_plan_entries` table has a `UNIQUE(meal_plan_id, day_of_week, slot)` constraint. Every write must use `onConflict` or it will error on the second write for the same slot.

---

## Architecture Gotchas

### Auth & Onboarding Flow
- Supabase Auth handles signup/login. On signup, a **DB trigger** auto-creates a `profiles` row — do not do this in app code.
- After login, `AuthContext` checks if `profile.household_id` is set. If not, the app routes the user to `HouseholdSetup.jsx` before anything else is accessible.
- Joining a household uses an `invite_code` (8-char hex). The join path must update `profiles.household_id`, not create a new household.

### Supabase RLS (Row Level Security)
- RLS is ON for all tables. If a query silently returns nothing, suspect a missing or incorrect RLS policy before debugging app code.
- Policies must exist for **each operation type separately**: SELECT, INSERT, UPDATE, DELETE. A SELECT policy does not cover INSERT.
- The pattern used for household-scoped access:
  ```sql
  USING (household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid()))
  ```
- `profiles` table policies are scoped to `auth.uid() = id` (own row only).

### Upsert Pattern
```js
// Always use onConflict — this is the only safe way to write meal_plan_entries
const { error } = await supabase
  .from('meal_plan_entries')
  .upsert(
    { meal_plan_id, day_of_week, slot, meal_id },
    { onConflict: 'meal_plan_id,day_of_week,slot' }
  )
```
Never use plain `.insert()` for entries — it will fail if the slot already has data.

### Realtime Subscription
- `useMealPlan` subscribes to `postgres_changes` on `meal_plan_entries`. This is what makes both partners see each other's changes instantly.
- Subscriptions are set up inside a `useEffect` and cleaned up on unmount. When modifying `useMealPlan`, always verify the cleanup function unsubscribes correctly — stale subscriptions cause duplicate updates.
- The subscription filters by `meal_plan_id`, so it is scoped to the current week. When the user navigates weeks, the hook re-subscribes automatically because `weekStart` is a dependency.

### meal_plans Row Creation
- `useMealPlan` calls a function that **creates the `meal_plans` row if it doesn't exist** before fetching entries. This uses an upsert on `(household_id, week_start)`. Do not assume a plan row exists before writing entries.

---

## Date Logic Rules

- **Never use `new Date()` math directly in components or hooks.** All date operations go through `src/lib/dates.js`.
- Week always starts on Monday. The `week_start` stored in the DB is the ISO Monday of that week.
- `day_of_week` in entries is `0 = Monday`, `6 = Sunday` — **not** the JS `Date.getDay()` convention (which is 0 = Sunday). This trips up agents constantly.

---

## Styling Rules

- **No Tailwind. No CSS modules.** Styles are plain JS objects passed as `style` props.
- **All colors and spacing use CSS custom properties** defined in `src/index.css`. Use `var(--name)` — never hardcode hex colors or pixel values that match a variable.
- Example of correct style usage:
  ```jsx
  <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-md)' }}>
  ```
- When adding a new color or spacing token, define it in `src/index.css` first, then use it via `var()`.

---

## Data Flow Rules

- **Supabase calls only inside `src/hooks/` or `src/context/`.** Components must never import or call `supabase` directly.
- Components receive data and callbacks as props or via hooks — they do not own data fetching.
- `useAuth()` is the single source of truth for `user`, `profile`, and `household`. Don't re-fetch these independently.

---

## Current Feature State (as of 2026-05-02)

| Feature | Status |
|---------|--------|
| Auth, households, invite codes | Complete |
| Weekly meal plan grid (WeekGrid, MealCell) | Complete |
| Meal library (MealsPage) | Complete |
| Realtime sync between partners | Complete |
| Week navigation (HistoryPage) | Complete |
| Drag-and-drop sidebar (dnd-kit) | In progress — plan exists, not implemented |
| Vitest test infrastructure | Installed, no tests written yet |

### Drag-and-Drop Notes
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` are installed.
- A design spec and implementation plan exist in the repo (`.superpowers/` dir).
- The planned UX: a sidebar of meals from the library that can be dragged onto `MealCell` slots in the grid.
- `MealCell` and `WeekGrid` will need to become drop targets (`useDroppable`). Meals in the sidebar will be draggables (`useDraggable`).

---

## Common Agent Mistakes on This Project

| Mistake | Correct Approach |
|---------|-----------------|
| Using `day_of_week: date.getDay()` | Map to 0=Mon convention via `dates.js` helper |
| Plain `.insert()` on `meal_plan_entries` | Always `.upsert()` with `onConflict` |
| Adding Tailwind classes | Use inline `style={{}}` with `var(--name)` tokens |
| Fetching Supabase inside a component | Move fetch into a hook in `src/hooks/` |
| Hardcoding a week start date | Use `dates.js` to compute the current week's Monday |
| Assuming `meal_plans` row exists | `useMealPlan` creates it; always access entries via that hook |
| Forgetting RLS policy for a new table/operation | Add explicit policy for each CRUD operation |

---

## How to Update This Skill

When you (an agent) discover something non-obvious during your work on this project — a gotcha, a constraint that wasn't documented, an assumption that was wrong — **add it to this file** before ending your session.

Rules for adding entries:
1. Add under the most relevant section, or create a new section if none fits.
2. State the specific wrong assumption or mistake, then the correct behavior.
3. Update the "Current Feature State" table when features ship or status changes.
4. Keep entries concrete — code snippets beat prose for agent consumption.
5. Update the date in the "Current Feature State" heading when you make changes.

To trigger this skill manually at any time: `/mealplan-learnings`
