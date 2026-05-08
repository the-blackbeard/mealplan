import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MealDetailPage from './MealDetailPage'

vi.mock('../hooks/useMeals', () => ({ useMeals: vi.fn() }))

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({ id: 'meal-1' })),
  Link: ({ to, children }) => <a href={to}>{children}</a>,
}))

import { useMeals } from '../hooks/useMeals'

const baseMeal = {
  id: 'meal-1',
  name: 'Pasta Carbonara',
  description: 'A creamy Italian classic',
  recipe: 'Boil pasta.\nMix eggs and cheese.\nCombine.',
  calories_per_portion: 520,
  protein_per_portion: 22,
}

function mockUseMeals(overrides = {}) {
  useMeals.mockReturnValue({
    meals: [baseMeal],
    loading: false,
    createMeal: vi.fn(),
    updateMeal: vi.fn().mockResolvedValue({ error: null }),
    deleteMeal: vi.fn(),
    ...overrides,
  })
}

describe('MealDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state when loading is true', () => {
    mockUseMeals({ loading: true, meals: [] })
    render(<MealDetailPage />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows "Meal not found" when meal is not in list after loading', () => {
    mockUseMeals({ meals: [] })
    render(<MealDetailPage />)
    expect(screen.getByText('Meal not found')).toBeInTheDocument()
  })

  it('shows meal name in heading when found', () => {
    mockUseMeals()
    render(<MealDetailPage />)
    expect(screen.getByRole('heading', { name: 'Pasta Carbonara' })).toBeInTheDocument()
  })

  it('shows macro chips when calories and protein are set', () => {
    mockUseMeals()
    render(<MealDetailPage />)
    expect(screen.getByText('520')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
    expect(screen.getAllByText('Per portion')).toHaveLength(2)
    expect(screen.getByText('kcal')).toBeInTheDocument()
    expect(screen.getByText('g')).toBeInTheDocument()
  })

  it('does NOT show macro chips when both calories and protein are null', () => {
    mockUseMeals({
      meals: [{ ...baseMeal, calories_per_portion: null, protein_per_portion: null }],
    })
    render(<MealDetailPage />)
    expect(screen.queryByText('Per portion')).not.toBeInTheDocument()
    expect(screen.queryByText('kcal')).not.toBeInTheDocument()
  })

  it('shows description section when present', () => {
    mockUseMeals()
    render(<MealDetailPage />)
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('A creamy Italian classic')).toBeInTheDocument()
  })

  it('hides description section when null', () => {
    mockUseMeals({ meals: [{ ...baseMeal, description: null }] })
    render(<MealDetailPage />)
    expect(screen.queryByText('Description')).not.toBeInTheDocument()
  })

  it('shows recipe section when present', () => {
    mockUseMeals()
    render(<MealDetailPage />)
    expect(screen.getByText('Recipe')).toBeInTheDocument()
    expect(screen.getByText(/Boil pasta/)).toBeInTheDocument()
  })

  it('hides recipe section when null', () => {
    mockUseMeals({ meals: [{ ...baseMeal, recipe: null }] })
    render(<MealDetailPage />)
    expect(screen.queryByText('Recipe')).not.toBeInTheDocument()
  })

  it('Edit button toggles to edit form with name input', () => {
    mockUseMeals()
    render(<MealDetailPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Pasta Carbonara')).toBeInTheDocument()
  })

  it('Cancel in edit form returns to view mode', () => {
    mockUseMeals()
    render(<MealDetailPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('heading', { name: 'Pasta Carbonara' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/Name/i)).not.toBeInTheDocument()
  })

  it('Edit form submit calls updateMeal with correct args', async () => {
    const updateMeal = vi.fn().mockResolvedValue({ error: null })
    mockUseMeals({ updateMeal })
    render(<MealDetailPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    // Update the name
    const nameInput = screen.getByDisplayValue('Pasta Carbonara')
    fireEvent.change(nameInput, { target: { value: 'Pasta Carbonara Updated' } })

    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }))

    await waitFor(() => {
      expect(updateMeal).toHaveBeenCalledWith('meal-1', {
        name: 'Pasta Carbonara Updated',
        description: 'A creamy Italian classic',
        recipe: 'Boil pasta.\nMix eggs and cheese.\nCombine.',
        caloriesPerPortion: 520,
        proteinPerPortion: 22,
      })
    })
  })
})
