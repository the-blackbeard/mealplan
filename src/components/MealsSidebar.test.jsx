import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useMeals } from '../hooks/useMeals'
import { useDraggable } from '@dnd-kit/core'
import MealsSidebar from './MealsSidebar'

vi.mock('../hooks/useMeals')
vi.mock('@dnd-kit/core', () => ({
  useDraggable: vi.fn(),
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

const MEALS = [
  { id: '1', name: 'Pasta Carbonara', description: 'Classic Italian' },
  { id: '2', name: 'Greek Salad', description: '' },
  { id: '3', name: 'Ramen', description: 'Japanese noodles' },
]

const draggableDefault = {
  attributes: { role: 'button' },
  listeners: {},
  setNodeRef: () => {},
  transform: null,
  isDragging: false,
}

describe('MealsSidebar', () => {
  beforeEach(() => {
    useMeals.mockReturnValue({ meals: MEALS, loading: false })
    useDraggable.mockReturnValue(draggableDefault)
  })

  it('renders a card for each meal', () => {
    render(<MealsSidebar />)
    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
    expect(screen.getByText('Greek Salad')).toBeInTheDocument()
    expect(screen.getByText('Ramen')).toBeInTheDocument()
  })

  it('shows meal description when available', () => {
    render(<MealsSidebar />)
    expect(screen.getByText('Classic Italian')).toBeInTheDocument()
    expect(screen.getByText('Japanese noodles')).toBeInTheDocument()
  })

  it('shows the count label with total number of meals', () => {
    render(<MealsSidebar />)
    expect(screen.getByText(/3 meals/)).toBeInTheDocument()
  })

  it('filters meals by search query (case-insensitive)', async () => {
    render(<MealsSidebar />)
    await userEvent.type(screen.getByPlaceholderText('Search meals…'), 'pasta')
    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
    expect(screen.queryByText('Greek Salad')).not.toBeInTheDocument()
    expect(screen.queryByText('Ramen')).not.toBeInTheDocument()
  })

  it('updates count label to reflect filtered results', async () => {
    render(<MealsSidebar />)
    await userEvent.type(screen.getByPlaceholderText('Search meals…'), 'pasta')
    expect(screen.getByText(/1 meal/)).toBeInTheDocument()
  })

  it('shows "no results" message when search finds nothing', async () => {
    render(<MealsSidebar />)
    await userEvent.type(screen.getByPlaceholderText('Search meals…'), 'xyznotfound')
    expect(screen.getByText(/No meals match your search/)).toBeInTheDocument()
  })

  it('shows empty state when household has no meals', () => {
    useMeals.mockReturnValue({ meals: [], loading: false })
    render(<MealsSidebar />)
    expect(screen.getByText(/No meals yet/)).toBeInTheDocument()
  })

  it('registers each meal card with useDraggable using meal-<id> as the id', () => {
    render(<MealsSidebar />)
    expect(useDraggable).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'meal-1' })
    )
    expect(useDraggable).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'meal-2' })
    )
  })

  it('passes the meal object as drag data', () => {
    render(<MealsSidebar />)
    expect(useDraggable).toHaveBeenCalledWith(
      expect.objectContaining({ data: { meal: MEALS[0] } })
    )
  })
})
