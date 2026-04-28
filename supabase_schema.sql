-- ============================================================
-- MealPlan App - Supabase Schema
-- Run this in your Supabase SQL editor (Database > SQL Editor)
-- ============================================================

-- 1. Households: group of users sharing a meal plan view
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles: one per auth user, belongs to a household
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Meals library: reusable meals per household
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, name)
);

-- 4. Meal plans: one per household per week (week identified by ISO week start = Monday)
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Always a Monday
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, week_start)
);

-- 5. Meal plan entries: one per day+slot combination
CREATE TABLE meal_plan_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon, 6=Sun
  slot TEXT NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'dinner')),
  meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  custom_note TEXT,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meal_plan_id, day_of_week, slot)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_entries ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/write their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Households: members can view their household; any authenticated user can create one; members can update
CREATE POLICY "Members can view household" ON households FOR SELECT
  USING (id IN (SELECT household_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Authenticated users can create household" ON households FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Members can update household" ON households FOR UPDATE
  USING (id IN (SELECT household_id FROM profiles WHERE id = auth.uid()));

-- Meals: household members can CRUD
CREATE POLICY "Household members can view meals" ON meals FOR SELECT
  USING (household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Household members can insert meals" ON meals FOR INSERT
  WITH CHECK (household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Household members can update meals" ON meals FOR UPDATE
  USING (household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Household members can delete meals" ON meals FOR DELETE
  USING (household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid()));

-- Meal plans
CREATE POLICY "Household members can view meal plans" ON meal_plans FOR SELECT
  USING (household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Household members can insert meal plans" ON meal_plans FOR INSERT
  WITH CHECK (household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Household members can update meal plans" ON meal_plans FOR UPDATE
  USING (household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid()));

-- Meal plan entries
CREATE POLICY "Household members can view entries" ON meal_plan_entries FOR SELECT
  USING (meal_plan_id IN (
    SELECT mp.id FROM meal_plans mp
    JOIN profiles p ON p.household_id = mp.household_id
    WHERE p.id = auth.uid()
  ));
CREATE POLICY "Household members can insert entries" ON meal_plan_entries FOR INSERT
  WITH CHECK (meal_plan_id IN (
    SELECT mp.id FROM meal_plans mp
    JOIN profiles p ON p.household_id = mp.household_id
    WHERE p.id = auth.uid()
  ));
CREATE POLICY "Household members can update entries" ON meal_plan_entries FOR UPDATE
  USING (meal_plan_id IN (
    SELECT mp.id FROM meal_plans mp
    JOIN profiles p ON p.household_id = mp.household_id
    WHERE p.id = auth.uid()
  ));
CREATE POLICY "Household members can delete entries" ON meal_plan_entries FOR DELETE
  USING (meal_plan_id IN (
    SELECT mp.id FROM meal_plans mp
    JOIN profiles p ON p.household_id = mp.household_id
    WHERE p.id = auth.uid()
  ));

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Enable Realtime on relevant tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE meal_plan_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE meal_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE meals;
