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
