---
name: updating-seed-script
description: Use when the mealplan database schema changes (new table, new column, dropped column, changed constraint) or when seed data needs updating (meals list, test users, fill rate, number of weeks). Also use before running npm run seed after any schema migration.
---

# Updating the Mealplan Seed Script

## Overview

`scripts/seed.js` populates Supabase for local development. It is idempotent — safe to re-run any number of times. All writes use upsert. Run with: `npm run seed`

**Always read `supabase_schema.sql` first** — it is the source of truth for column names, types, NOT NULL constraints, CHECK constraints, and UNIQUE constraints that drive `onConflict` values.

## Script Structure

```
scripts/seed.js
│
├── TEST_USERS array       ← edit to add/change test accounts
├── MEALS array            ← edit to add/change meal library entries
├── SLOTS / DAYS consts    ← drives entry generation (3 slots × 7 days)
│
└── seed() function
    ├── household          select-or-insert by name
    ├── users              listUsers → createUser (idempotent)
    ├── profiles           upsert({ id, email, display_name, household_id })
    ├── meals              bulk upsert from MEALS array, onConflict: 'household_id,name'
    └── meal plans         loop 4 weeks → upsert plan → upsert entries at ~80% fill
```

## Updating Seed Data (no schema change)

**Add or change meals** — edit the `MEALS` array. Each entry: `{ name, description, tags, ...any_other_columns }`. `name` must be unique per household (DB enforces it). Re-run seed.

**Add or change test users** — edit `TEST_USERS`: `{ email, password, displayName }`. New users are created; existing ones are left unchanged.

**Change fill rate** — edit `Math.random() > 0.2` in the entries loop (`0.2` = 20% empty slots).

**Change week count** — edit `w < 4` in the `for` loop.

## Updating for Schema Changes

### New column on an existing table

1. Open `supabase_schema.sql` and find the column definition.
2. Check: is it `NOT NULL`? Does it have a `DEFAULT`? Is there a `CHECK` constraint?
3. Find the table's upsert block in `seed()`:
   - For `meals`: add the field to each object in the `MEALS` array (the spread `{ ...m, household_id }` auto-includes it).
   - For `profiles`: add to the upsert object literal directly.
   - For `meal_plan_entries`: add to the `entries.push({...})` object.
4. If `NOT NULL` with no default → every row must carry an explicit value or Supabase will reject it.
5. If nullable or has a default → the field can be omitted for rows where the default is fine.

### New table

Add a numbered step in `seed()` using this pattern (place it after any tables it references by FK):

```js
console.log('\n── Seeding: <TableName> ──────────────────────────────')
const ROWS = [
  { col_a: 'value', col_b: 'value' },
]
const { data: rows, error: rErr } = await supabase
  .from('<table_name>')
  .upsert(
    ROWS.map(r => ({ ...r, household_id: household.id })),
    { onConflict: '<unique_col_or_cols>', ignoreDuplicates: false }
  )
  .select()           // ← include if downstream steps need the IDs
if (rErr) throw rErr
console.log(`  Upserted ${rows.length} <things>`)
```

Key decisions:
- `onConflict` must match the UNIQUE constraint in `supabase_schema.sql` exactly (comma-separated, no spaces around commas).
- Include `.select()` if the next step needs the returned `id` values.
- `ignoreDuplicates: false` means conflicts update the existing row rather than skipping.

### Removed column

Remove the field from the object literal or data array. Nothing else changes unless a foreign key is affected.

### Changed UNIQUE constraint

Update the `onConflict` string to match the new constraint in `supabase_schema.sql`. A mismatch causes upsert to insert duplicates rather than update.

## Idempotency Patterns — Always Preserve

| Pattern | Location | Why |
|---------|----------|-----|
| `upsert + onConflict` | meals, plans, entries, profiles | re-run without duplicates |
| `listUsers` before `createUser` | users | Supabase auth has no upsert; avoid duplicate error |
| `.maybeSingle()` on household lookup | household | handles 0 or 1 row without throwing |
| `throw error` on every DB error | all steps | fails fast so root cause is obvious |

## Verification

After any change, run the script and check output:

```bash
npm run seed
```

Expected: each section logs either "Created …" or "… exists" / "Upserted N …". Any Supabase error will print and exit with code 1. Fix the error before committing.

## Common Mistakes

**Wrong `onConflict` value** — copy the exact column names from the `UNIQUE(...)` constraint in `supabase_schema.sql`. A wrong value silently inserts duplicates.

**Missing `.select()` after upsert** — if you need IDs from the inserted rows downstream, chain `.select()`. Without it the return value is `null`.

**NOT NULL column omitted** — Supabase returns a 400 and the seed exits. Check the schema for `NOT NULL` before omitting any field.

**Column name mismatch** — JS camelCase ≠ SQL snake_case. Always copy column names from `supabase_schema.sql`, not from component code.

**Adding data before schema migration** — run the Supabase SQL migration first, then update the seed. The reverse order will fail on the NOT NULL / CHECK constraint.
