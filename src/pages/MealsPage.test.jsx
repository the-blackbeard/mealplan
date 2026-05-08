import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MealsPage from './MealsPage'

vi.mock('../hooks/useMeals', () => ({ useMeals: vi.fn() }))

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, style }) => <a href={to} style={style}>{children}</a>,
}))

import { useMeals } from '../hooks/useMeals'

const baseMeals = [
  { id: 'meal-1', name: 'Pasta Carbonara', description: 'A creamy Italian classic' },
  { id: 'meal-2', name: 'Chicken Salad', description: null },
]

function mockUseMeals(overrides = {}) {
  useMeals.mockReturnValue({
    meals: baseMeals,
    loading: false,
    createMeal: vi.fn().mockResolvedValue({ error: null }),
    deleteMeal: vi.fn().mockResolvedValue({}),
    updateMeal: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  })
}

describe('MealsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state when loading is true', () => {
    mockUseMeals({ loading: true, meals: [] })
    render(<MealsPage />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows meal names as links to /meals/:id', () => {
    mockUseMeals()
    render(<MealsPage />)
    const link1 = screen.getByRole('link', { name: 'Pasta Carbonara' })
    expect(link1).toHaveAttribute('href', '/meals/meal-1')
    const link2 = screen.getByRole('link', { name: 'Chicken Salad' })
    expect(link2).toHaveAttribute('href', '/meals/meal-2')
  })

  it('shows meal description when present', () => {
    mockUseMeals()
    render(<MealsPage />)
    expect(screen.getByText('A creamy Italian classic')).toBeInTheDocument()
  })

  it('shows "No meals match" when search finds nothing', () => {
    mockUseMeals()
    render(<MealsPage />)
    const searchInput = screen.getByPlaceholderText(/Filter/i)
    fireEvent.change(searchInput, { target: { value: 'zzznomatch' } })
    expect(screen.getByText('No meals match your search.')).toBeInTheDocument()
  })

  it('add form renders all 5 fields (name, description, recipe, calories, protein)', () => {
    mockUseMeals()
    render(<MealsPage />)
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Recipe/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Calories per portion/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Protein per portion/i)).toBeInTheDocument()
  })

  it('submit calls createMeal with name, recipe, and parsed integer calories/protein', async () => {
    const createMeal = vi.fn().mockResolvedValue({ error: null })
    mockUseMeals({ createMeal })
    render(<MealsPage />)

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Tacos' } })
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Mexican classic' } })
    fireEvent.change(screen.getByLabelText(/Recipe/i), { target: { value: 'Fry meat. Assemble tacos.' } })
    fireEvent.change(screen.getByLabelText(/Calories per portion/i), { target: { value: '400' } })
    fireEvent.change(screen.getByLabelText(/Protein per portion/i), { target: { value: '28' } })

    fireEvent.click(screen.getByRole('button', { name: /Add Meal/i }))

    await waitFor(() => {
      expect(createMeal).toHaveBeenCalledWith('Tacos', {
        description: 'Mexican classic',
        recipe: 'Fry meat. Assemble tacos.',
        caloriesPerPortion: 400,
        proteinPerPortion: 28,
      })
    })
  })

  it('form clears after successful submit', async () => {
    const createMeal = vi.fn().mockResolvedValue({ error: null })
    mockUseMeals({ createMeal })
    render(<MealsPage />)

    const nameInput = screen.getByLabelText(/Name/i)
    const recipeInput = screen.getByLabelText(/Recipe/i)
    const caloriesInput = screen.getByLabelText(/Calories per portion/i)
    const proteinInput = screen.getByLabelText(/Protein per portion/i)

    fireEvent.change(nameInput, { target: { value: 'Soup' } })
    fireEvent.change(recipeInput, { target: { value: 'Boil water.' } })
    fireEvent.change(caloriesInput, { target: { value: '200' } })
    fireEvent.change(proteinInput, { target: { value: '10' } })

    fireEvent.click(screen.getByRole('button', { name: /Add Meal/i }))

    await waitFor(() => {
      expect(nameInput.value).toBe('')
      expect(recipeInput.value).toBe('')
      expect(caloriesInput.value).toBe('')
      expect(proteinInput.value).toBe('')
    })
  })
})
