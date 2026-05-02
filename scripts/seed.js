/**
 * Seed script for local development.
 * Populates the DB with a test household, two users, a meals library,
 * and 4 weeks of meal plan entries (current week + 3 prior).
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (bypasses RLS).
 * Run: npm run seed
 */

import { createClient } from '@supabase/supabase-js'
import { startOfWeek, subWeeks, format } from 'date-fns'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const TEST_USERS = [
  { email: 'alice@test.com', password: 'password123', displayName: 'Alice' },
  { email: 'bob@test.com', password: 'password123', displayName: 'Bob' },
]

const MEALS = [
  // Breakfasts
  { name: 'Avocado Toast', description: 'Whole grain toast with smashed avocado and chilli flakes', tags: ['breakfast', 'vegetarian'] },
  { name: 'Greek Yogurt Parfait', description: 'Layered yogurt, granola, and mixed berries', tags: ['breakfast', 'vegetarian'] },
  { name: 'Banana Pancakes', description: 'Fluffy pancakes with banana and maple syrup', tags: ['breakfast', 'vegetarian'] },
  { name: 'Scrambled Eggs on Toast', description: 'Creamy scrambled eggs with sourdough', tags: ['breakfast'] },
  { name: 'Smoothie Bowl', description: 'Blended açaí with toppings: coconut, seeds, and fruit', tags: ['breakfast', 'vegan'] },
  { name: 'Oatmeal with Berries', description: 'Steel-cut oats with seasonal berries and honey', tags: ['breakfast', 'vegan'] },
  // Lunches
  { name: 'Caesar Salad', description: 'Romaine, parmesan, croutons, Caesar dressing', tags: ['lunch', 'vegetarian'] },
  { name: 'Grilled Chicken Wrap', description: 'Char-grilled chicken with lettuce, tomato, and chipotle mayo', tags: ['lunch'] },
  { name: 'Lentil Soup', description: 'Red lentils with cumin, turmeric, and a squeeze of lemon', tags: ['lunch', 'vegan'] },
  { name: 'Tuna Melt', description: 'Open-faced tuna sandwich with melted cheddar', tags: ['lunch'] },
  { name: 'Veggie Buddha Bowl', description: 'Quinoa, roasted veg, tahini dressing', tags: ['lunch', 'vegan'] },
  { name: 'BLT Sandwich', description: 'Bacon, lettuce, tomato on toasted bread', tags: ['lunch'] },
  { name: 'Tomato Basil Soup', description: 'Roasted tomato soup with fresh basil and crusty bread', tags: ['lunch', 'vegetarian'] },
  // Dinners
  { name: 'Spaghetti Bolognese', description: 'Classic beef ragu on al dente spaghetti', tags: ['dinner'] },
  { name: 'Grilled Salmon', description: 'Salmon fillet with lemon butter and asparagus', tags: ['dinner'] },
  { name: 'Chicken Stir Fry', description: 'Ginger-garlic chicken with bok choy and jasmine rice', tags: ['dinner'] },
  { name: 'Beef Tacos', description: 'Seasoned ground beef in corn tortillas with all the toppings', tags: ['dinner'] },
  { name: 'Vegetable Curry', description: 'Coconut milk curry with chickpeas, spinach, and naan', tags: ['dinner', 'vegan'] },
  { name: 'Roast Chicken', description: 'Herb-rubbed roast chicken with roasted potatoes', tags: ['dinner'] },
  { name: 'Shrimp Fried Rice', description: 'Wok-tossed rice with shrimp, egg, and vegetables', tags: ['dinner'] },
  { name: 'Margherita Pizza', description: 'Thin-crust pizza with San Marzano tomatoes and fresh mozzarella', tags: ['dinner', 'vegetarian'] },
  { name: 'Beef Stew', description: 'Slow-cooked beef with carrots, potatoes, and red wine', tags: ['dinner'] },
  { name: 'Pasta Primavera', description: 'Penne with seasonal vegetables in a light olive oil sauce', tags: ['dinner', 'vegetarian'] },
]

const SLOTS = ['breakfast', 'lunch', 'dinner']
const DAYS = [0, 1, 2, 3, 4, 5, 6] // Mon–Sun

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonday(date) {
  return startOfWeek(date, { weekStartsOn: 1 })
}

function toDateStr(date) {
  return format(date, 'yyyy-MM-dd')
}

async function getOrCreateUser(email, password, displayName) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users?.find(u => u.email === email)
  if (existing) {
    console.log(`  User exists: ${email}`)
    return existing
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  console.log(`  Created user: ${email}`)
  return data.user
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log('\n── Seeding: Household ─────────────────────────────────')

  // 1. Find or create household
  let { data: household, error: hErr } = await supabase
    .from('households')
    .select()
    .eq('name', 'Test Household')
    .maybeSingle()
  if (hErr) throw hErr

  if (!household) {
    const { data, error } = await supabase
      .from('households')
      .insert({ name: 'Test Household' })
      .select()
      .single()
    if (error) throw error
    household = data
    console.log(`  Created household: ${household.name} (${household.id})`)
  } else {
    console.log(`  Household exists: ${household.name} (${household.id})`)
  }

  // 2. Create/find users
  console.log('\n── Seeding: Users ─────────────────────────────────────')
  const users = []
  for (const u of TEST_USERS) {
    const user = await getOrCreateUser(u.email, u.password, u.displayName)
    users.push(user)
  }

  // 3. Link profiles to household (trigger creates the profile row; we update it)
  console.log('\n── Seeding: Profiles ──────────────────────────────────')
  for (let i = 0; i < users.length; i++) {
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: users[i].id,
          email: TEST_USERS[i].email,
          display_name: TEST_USERS[i].displayName,
          household_id: household.id,
        },
        { onConflict: 'id' }
      )
    if (error) throw error
    console.log(`  Linked ${TEST_USERS[i].displayName} → household`)
  }

  // 4. Seed meals library
  console.log('\n── Seeding: Meals library ─────────────────────────────')
  const { data: meals, error: mErr } = await supabase
    .from('meals')
    .upsert(
      MEALS.map(m => ({ ...m, household_id: household.id })),
      { onConflict: 'household_id,name', ignoreDuplicates: false }
    )
    .select()
  if (mErr) throw mErr
  console.log(`  Upserted ${meals.length} meals`)

  // 5. Seed 4 weeks of meal plans + entries
  console.log('\n── Seeding: Meal plans (4 weeks) ──────────────────────')
  const today = new Date()

  for (let w = 0; w < 4; w++) {
    const weekDate = subWeeks(getMonday(today), w)
    const weekStart = toDateStr(weekDate)

    // Upsert the meal_plan row
    const { data: plan, error: pErr } = await supabase
      .from('meal_plans')
      .upsert(
        { household_id: household.id, week_start: weekStart },
        { onConflict: 'household_id,week_start' }
      )
      .select()
      .single()
    if (pErr) throw pErr

    // Build entries — fill ~80% of slots
    const entries = []
    for (const day of DAYS) {
      for (const slot of SLOTS) {
        if (Math.random() > 0.2) {
          const meal = meals[Math.floor(Math.random() * meals.length)]
          entries.push({
            meal_plan_id: plan.id,
            day_of_week: day,
            slot,
            meal_id: meal.id,
          })
        }
      }
    }

    const { error: eErr } = await supabase
      .from('meal_plan_entries')
      .upsert(entries, { onConflict: 'meal_plan_id,day_of_week,slot', ignoreDuplicates: false })
    if (eErr) throw eErr

    const label = w === 0 ? 'current week' : `${w} week${w > 1 ? 's' : ''} ago`
    console.log(`  ${weekStart} (${label}): ${entries.length} entries`)
  }

  console.log('\n✓ Seed complete')
  console.log('\nTest credentials:')
  TEST_USERS.forEach(u => console.log(`  ${u.email}  /  ${u.password}`))
}

seed().catch(err => {
  console.error('\nSeed failed:', err.message)
  process.exit(1)
})
