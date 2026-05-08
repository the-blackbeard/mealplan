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

  async function createMeal(name, { description = '', recipe = '', caloriesPerPortion = null, proteinPerPortion = null } = {}) {
    if (!household || !user) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('meals')
      .insert({
        household_id: household.id,
        name: name.trim(),
        description,
        recipe: recipe || null,
        calories_per_portion: caloriesPerPortion,
        protein_per_portion: proteinPerPortion,
        created_by: user.id
      })
      .select()
      .single()

    if (!error) setMeals(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }

  async function updateMeal(id, { name, description, recipe, caloriesPerPortion, proteinPerPortion } = {}) {
    if (!household || !user) return { error: 'Not authenticated' }
    const payload = {}
    if (name !== undefined) payload.name = name.trim()
    if (description !== undefined) payload.description = description
    if (recipe !== undefined) payload.recipe = recipe || null
    if (caloriesPerPortion !== undefined) payload.calories_per_portion = caloriesPerPortion
    if (proteinPerPortion !== undefined) payload.protein_per_portion = proteinPerPortion

    const { data, error } = await supabase
      .from('meals')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (!error) setMeals(prev => prev.map(m => m.id === id ? data : m))
    return { data, error }
  }

  async function deleteMeal(id) {
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (!error) setMeals(prev => prev.filter(m => m.id !== id))
    return { error }
  }

  return { meals, loading, createMeal, updateMeal, deleteMeal, refetch: fetchMeals }
}
