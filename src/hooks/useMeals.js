import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useMeals() {
  const { household, user } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMeals = useCallback(async () => {
    if (!household) return
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('household_id', household.id)
      .order('name')
    setMeals(data || [])
    setLoading(false)
  }, [household])

  useEffect(() => { fetchMeals() }, [fetchMeals])

  async function createMeal(name, description = '', tags = []) {
    if (!household || !user) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('meals')
      .insert({
        household_id: household.id,
        name: name.trim(),
        description,
        tags,
        created_by: user.id
      })
      .select()
      .single()

    if (!error) setMeals(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }

  async function deleteMeal(id) {
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (!error) setMeals(prev => prev.filter(m => m.id !== id))
    return { error }
  }

  return { meals, loading, createMeal, deleteMeal, refetch: fetchMeals }
}
