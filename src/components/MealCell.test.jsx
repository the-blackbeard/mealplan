import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useDroppable } from '@dnd-kit/core'
import MealCell from './MealCell'

vi.mock('@dnd-kit/core', () => ({
  useDroppable: vi.fn(),
}))

vi.mock('./SlotModal', () => ({
  default: ({ onClose }) => (
    <div data-testid="slot-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

const defaultDroppable = { setNodeRef: () => {}, isOver: false }

describe('MealCell drop target', () => {
  beforeEach(() => {
    useDroppable.mockReturnValue(defaultDroppable)
  })

  it('registers as droppable with id "drop-<dayIndex>-<slot>"', () => {
    render(
      <MealCell
        slot="lunch"
        dayIndex={2}
        dayLabel="Wed, May 1"
        entries={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(useDroppable).toHaveBeenCalledWith({ id: 'drop-2-lunch' })
  })

  it('registers with id "drop-0-breakfast" for Monday breakfast', () => {
    render(
      <MealCell
        slot="breakfast"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entries={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(useDroppable).toHaveBeenCalledWith({ id: 'drop-0-breakfast' })
  })

  it('applies the slot accent colour as border when isOver is true', () => {
    useDroppable.mockReturnValue({ setNodeRef: () => {}, isOver: true })
    const { container } = render(
      <MealCell
        slot="lunch"
        dayIndex={2}
        dayLabel="Wed, May 1"
        entries={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(container.firstChild.style.borderColor).toBe('var(--green)')
  })

  it('uses dinner accent colour (rust) when isOver on a dinner cell', () => {
    useDroppable.mockReturnValue({ setNodeRef: () => {}, isOver: true })
    const { container } = render(
      <MealCell
        slot="dinner"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entries={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(container.firstChild.style.borderColor).toBe('var(--rust)')
  })

  it('shows slot-coloured background when isOver, even on an empty cell (breakfast uses var(--gold-light))', () => {
    useDroppable.mockReturnValue({ setNodeRef: () => {}, isOver: true })
    const { container } = render(
      <MealCell
        slot="breakfast"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entries={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(container.firstChild.style.background).toBe('var(--gold-light)')
  })
})

describe('MealCell entry display', () => {
  beforeEach(() => {
    useDroppable.mockReturnValue(defaultDroppable)
  })

  it('shows "+ Add meal" when entries is empty', () => {
    render(
      <MealCell
        slot="lunch"
        dayIndex={1}
        dayLabel="Tue, May 2"
        entries={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(screen.getByText('Add meal')).toBeInTheDocument()
  })

  it('shows meal name for one entry', () => {
    const entries = [{ id: '1', meal_id: 'a', meal: { name: 'Oatmeal' } }]
    render(
      <MealCell
        slot="breakfast"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entries={entries}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(screen.getByText('Oatmeal')).toBeInTheDocument()
  })

  it('shows both meal names for two entries, no "+N more"', () => {
    const entries = [
      { id: '1', meal_id: 'a', meal: { name: 'Oatmeal' } },
      { id: '2', meal_id: 'b', meal: { name: 'Banana' } },
    ]
    render(
      <MealCell
        slot="breakfast"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entries={entries}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(screen.getByText('Oatmeal')).toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
    expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument()
  })

  it('shows first two names and "+1 more" pill for three entries', () => {
    const entries = [
      { id: '1', meal_id: 'a', meal: { name: 'Oatmeal' } },
      { id: '2', meal_id: 'b', meal: { name: 'Banana' } },
      { id: '3', meal_id: 'c', meal: { name: 'Yogurt' } },
    ]
    render(
      <MealCell
        slot="breakfast"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entries={entries}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(screen.getByText('Oatmeal')).toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
    expect(screen.queryByText('Yogurt')).not.toBeInTheDocument()
    expect(screen.getByText('+1 more')).toBeInTheDocument()
  })

  it('shows "+2 more" pill for four entries', () => {
    const entries = [
      { id: '1', meal_id: 'a', meal: { name: 'Oatmeal' } },
      { id: '2', meal_id: 'b', meal: { name: 'Banana' } },
      { id: '3', meal_id: 'c', meal: { name: 'Yogurt' } },
      { id: '4', meal_id: 'd', meal: { name: 'Toast' } },
    ]
    render(
      <MealCell
        slot="breakfast"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entries={entries}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })
})

describe('MealCell SlotModal interaction', () => {
  beforeEach(() => {
    useDroppable.mockReturnValue(defaultDroppable)
  })

  it('opens SlotModal when cell is clicked', () => {
    const { container } = render(
      <MealCell
        slot="lunch"
        dayIndex={2}
        dayLabel="Wed, May 1"
        entries={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />
    )
    expect(screen.queryByTestId('slot-modal')).not.toBeInTheDocument()
    // container.firstChild is the cell div (first element in the fragment)
    fireEvent.click(container.firstChild)
    expect(screen.getByTestId('slot-modal')).toBeInTheDocument()
  })
})
