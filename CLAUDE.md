# TableWeek — Meal Planner

A household meal planning app where partners share a real-time weekly meal plan.
Built with React + Vite on the frontend and Supabase for auth, database, and realtime.

## Commands

```bash
npm run dev      # Start local dev server at http://localhost:5173
npm run build    # Production build (output: dist/)
npm run preview  # Preview production build locally
```

## Project Structure

```
src/
  components/     # Reusable UI pieces (Navbar, WeekGrid, MealCell, MealPicker)
  pages/          # Route-level pages (PlannerPage, HistoryPage, MealsPage, SettingsPage, AuthPage, HouseholdSetup)
  hooks/          # Data-fetching hooks (useMealPlan, useMeals, useWeekHistory)
  context/        # AuthContext — user, profile, household state
  lib/
    supabase.js   # Supabase client (reads from .env)
    dates.js      # Week/date helpers (always week starts on Monday)
```

## Architecture

- **Auth**: Supabase Auth (email + password). On signup, a DB trigger auto-creates a `profiles` row.
- **Households**: Users must belong to a household to use the app. They create one or join via invite code.
- **Meal plans**: One `meal_plans` row per household per week (keyed by `week_start` date = Monday). Entries are in `meal_plan_entries` (one per day+slot combo).
- **Realtime**: `useMealPlan` subscribes to Postgres changes on `meal_plan_entries` so both partners see updates instantly.
- **Meals library**: `meals` table is per-household. When adding a meal to the plan, users pick from this library or create a new meal on the spot.

## Database Tables

| Table | Key columns |
|-------|------------|
| `households` | `id`, `name`, `invite_code` |
| `profiles` | `id` (= auth user id), `household_id`, `display_name` |
| `meals` | `id`, `household_id`, `name`, `description` |
| `meal_plans` | `id`, `household_id`, `week_start` (DATE, always Monday) |
| `meal_plan_entries` | `id`, `meal_plan_id`, `day_of_week` (0=Mon…6=Sun), `slot` (breakfast/lunch/dinner), `meal_id` |

Schema file: `supabase_schema.sql`

## Environment Variables

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Copy `.env.example` to `.env` and fill in values. Never commit `.env`.

## Code Style

- Use ES modules (`import/export`), not CommonJS
- React functional components with hooks only — no class components
- Co-locate component styles inline using plain JS objects (no CSS modules, no Tailwind)
- CSS custom properties (variables) are defined in `src/index.css` — use `var(--name)` for all colors/spacing
- All date logic goes through `src/lib/dates.js` helpers — do not use raw `new Date()` math elsewhere
- Supabase calls go inside hooks (`src/hooks/`) or context — not directly inside components

## Key Patterns

- `useMealPlan(weekStart)` — fetches or creates the plan for a given week, subscribes to realtime, exposes `upsertEntry`, `clearEntry`, `getEntry`
- `useAuth()` — provides `user`, `profile`, `household`, auth methods
- Upserts use `onConflict` to avoid duplicate key errors
- RLS (Row Level Security) is enabled — all queries are automatically scoped to the user's household

## Deployment

- **Vercel**: `vercel.json` handles SPA routing. Add env vars in Vercel dashboard.
- **Netlify**: `netlify.toml` handles SPA routing. Add env vars in Netlify site settings.
- Build command: `npm run build` | Output dir: `dist`
