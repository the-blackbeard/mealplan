# 🍽️ TableWeek — Household Meal Planner

A beautiful, real-time meal planning app for households. Plan breakfast, lunch, and dinner for every day of the week — together with your partner or family.

## ✨ Features

- **Shared household view** — You and your partner see the same plan in real time
- **Real-time sync** — Changes by one person appear instantly for all household members
- **Weekly meal planning** — Plan breakfast, lunch, and dinner for each day
- **Meals library** — Save meals and pick from them when planning; or create new ones on the fly
- **Week history** — Browse and review any past week's meal plan
- **Multi-user** — Multiple households can use the app independently with their own data
- **Invite codes** — Share a code with your partner so they join your household

## 🗄️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Backend / DB | Supabase (Postgres + Auth + Realtime) |
| Hosting | Vercel or Netlify |

---

## 🚀 Setup Guide

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/mealplan.git
cd mealplan
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** and give it a name (e.g. `tableweek`)
3. Wait for the project to be provisioned (takes ~1 minute)

### 3. Run the database schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the entire contents of `supabase_schema.sql` and paste it
4. Click **Run**

This creates the tables, sets up Row Level Security policies, and enables Realtime.

### 4. Get your API keys

In your Supabase project:
- Go to **Settings → API**
- Copy **Project URL** and **anon / public** key

### 5. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🚢 Deployment

### Deploy to Vercel (recommended)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**

The `vercel.json` file handles SPA routing automatically.

### Deploy to Netlify

1. Push your repo to GitHub
2. Go to [netlify.com](https://netlify.com) → **Add new site** → import your repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in **Site settings → Environment**
6. Click **Deploy**

---

## 👫 How to Use

### First-time setup
1. Create an account (sign up with email + password)
2. **Create a household** (give it a name like "The Smiths")
3. Share your **invite code** (found in Settings) with your partner
4. Your partner signs up and uses the invite code to **join** your household

### Planning meals
- Go to **This Week** to see the current week's plan
- Click any empty cell to add a meal
- Pick from your existing **meals library** or create a new meal on the spot
- Your partner sees every change in real time (green dot = live sync)

### Navigating weeks
- Use **← Prev / Next →** arrows on the planner page to browse any week
- The **History** page lists all past weeks with expandable views

### Managing your meals library
- Go to **Meals** to add, search, or delete meals
- All meals are shared within your household

---

## 📁 Project Structure

```
mealplan/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── WeekGrid.jsx  # The 7-day meal grid
│   │   ├── MealCell.jsx  # Individual day+slot cell
│   │   └── MealPicker.jsx# Modal for selecting/creating meals
│   ├── pages/            # Route-level pages
│   │   ├── AuthPage.jsx
│   │   ├── HouseholdSetup.jsx
│   │   ├── PlannerPage.jsx
│   │   ├── HistoryPage.jsx
│   │   ├── MealsPage.jsx
│   │   └── SettingsPage.jsx
│   ├── hooks/            # Data-fetching hooks
│   │   ├── useMealPlan.js
│   │   ├── useMeals.js
│   │   └── useWeekHistory.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   ├── supabase.js   # Supabase client
│   │   └── dates.js      # Date utility helpers
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase_schema.sql   # Full DB schema — run this in Supabase
├── .env.example          # Environment variable template
├── vercel.json           # Vercel SPA routing
├── netlify.toml          # Netlify SPA routing
├── vite.config.js
└── .claude/
    ├── settings.local.json          # Local Claude Code permissions (gitignored)
    └── skills/
        └── mealplan-learnings/
            └── SKILL.md             # AI agent runbook — project gotchas & patterns
```

---

## 🗃️ Database Schema

| Table | Purpose |
|-------|---------|
| `households` | Named groups; has an invite code |
| `profiles` | One per user; linked to a household |
| `meals` | Reusable meal entries per household |
| `meal_plans` | One per household per week |
| `meal_plan_entries` | One per day+slot combo in a week |

Row Level Security ensures users only see data belonging to their household.

---

---

## 🤖 AI Agent Tooling

This project ships a Claude Code skill at [.claude/skills/mealplan-learnings/](.claude/skills/mealplan-learnings/) — a living runbook of project-specific gotchas, enforced patterns, and hard-won learnings for AI agents working on the codebase.

Run `/mealplan-learnings` in any Claude Code session to load it. Agents should update the skill when they discover something non-obvious.

---

## 📜 License

MIT
