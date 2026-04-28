import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useWeekHistory() {
  const { household } = useAuth()
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!household) return
    supabase
      .from('meal_plans')
      .select('id, week_start, meal_plan_entries(count)')
      .eq('household_id', household.id)
      .order('week_start', { ascending: false })
      .then(({ data }) => {
        setWeeks(data || [])
        setLoading(false)
      })
  }, [household])

  return { weeks, loading }
}
