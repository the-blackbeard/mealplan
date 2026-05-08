import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SlotModal from './SlotModal'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useMeals', () => ({
  useMeals: () => ({
    meals: [
      { id: 'm1', name: 'Omelette' },
      { id: 'm2', name: 'Bread' },
      { id: 'm3', name: 'Chai' },
    ],
    loading: false,
    createMeal: vi.fn().mockResolvedValue({ data: { id: 'm4', name: 'New' }, error: null }),
    updateMeal: vi.fn(),
    deleteMeal: vi.fn(),
    refetch: vi.fn()
  })
}))

const defaultEntries = [
  { id: 'e1', meal_id: 'm1', meal: { id: 'm1', name: 'Omelette' }, day_of_week: 0, slot: 'breakfast' },
]

function renderModal(props = {}) {
  return render(
    <MemoryRouter>
      <SlotModal
        slot="breakfast"
        dayIndex={0}
        dayLabel="Monday, May 5"
        entries={defaultEntries}
        onAdd={vi.fn().mockResolvedValue({ error: null })}
        onRemove={vi.fn().mockResolvedValue({ error: null })}
        onClose={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  )
}

describe('SlotModal list view', () => {
  beforeEach(() => mockNavigate.mockClear())

  it('shows meal names from entries', () => {
    renderModal()
    expect(screen.getByText('Omelette')).toBeInTheDocument()
  })

  it('calls onRemove with entry id when remove button is clicked', () => {
    const onRemove = vi.fn().mockResolvedValue({ error: null })
    renderModal({ onRemove })
    fireEvent.click(screen.getByLabelText('Remove Omelette'))
    expect(onRemove).toHaveBeenCalledWith('e1')
  })

  it('navigates to /meals/:id when meal name is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByText('Omelette'))
    expect(mockNavigate).toHaveBeenCalledWith('/meals/m1')
  })

  it('calls onClose when overlay backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = renderModal({ onClose })
    fireEvent.click(container.firstChild)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows empty state when no entries', () => {
    renderModal({ entries: [] })
    expect(screen.getByText(/Nothing planned here yet/)).toBeInTheDocument()
  })
})

describe('SlotModal search view', () => {
  it('shows search input when Add more is clicked', () => {
    renderModal()
    fireEvent.click(screen.getByText(/Add more/))
    expect(screen.getByPlaceholderText('Search meals…')).toBeInTheDocument()
  })

  it('filters meals by search query', () => {
    renderModal({ entries: [] })
    fireEvent.click(screen.getByText(/Add a meal/))
    fireEvent.change(screen.getByPlaceholderText('Search meals…'), { target: { value: 'Om' } })
    expect(screen.getByText('Omelette')).toBeInTheDocument()
    expect(screen.queryByText('Bread')).not.toBeInTheDocument()
  })

  it('calls onAdd with correct args when + Add is clicked', async () => {
    const onAdd = vi.fn().mockResolvedValue({ error: null })
    renderModal({ entries: [], onAdd })
    fireEvent.click(screen.getByText(/Add a meal/))
    fireEvent.change(screen.getByPlaceholderText('Search meals…'), { target: { value: 'Om' } })
    fireEvent.click(screen.getByText('＋ Add'))
    expect(onAdd).toHaveBeenCalledWith(0, 'breakfast', 'm1')
  })

  it('shows Create button when no meals match', () => {
    renderModal({ entries: [] })
    fireEvent.click(screen.getByText(/Add a meal/))
    fireEvent.change(screen.getByPlaceholderText('Search meals…'), { target: { value: 'xyz' } })
    expect(screen.getByText(/Create "xyz" as new meal/)).toBeInTheDocument()
  })
})

describe('SlotModal create view', () => {
  it('switches to create view with name pre-filled from search', () => {
    renderModal({ entries: [] })
    fireEvent.click(screen.getByText(/Add a meal/))
    fireEvent.change(screen.getByPlaceholderText('Search meals…'), { target: { value: 'Poha' } })
    fireEvent.click(screen.getByText(/Create "Poha" as new meal/))
    expect(screen.getByText('New Meal')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Poha')).toBeInTheDocument()
  })

  it('stays on create view and the form is still visible after failed submit', async () => {
    renderModal({ entries: [] })
    fireEvent.click(screen.getByText(/Add a meal/))
    fireEvent.change(screen.getByPlaceholderText('Search meals…'), { target: { value: 'xyz' } })
    fireEvent.click(screen.getByText(/Create "xyz" as new meal/))
    expect(screen.getByText('New Meal')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Meal name/i)).toBeInTheDocument()
  })
})
