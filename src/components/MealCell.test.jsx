import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useDroppable } from '@dnd-kit/core'
import MealCell from './MealCell'

vi.mock('@dnd-kit/core', () => ({
  useDroppable: vi.fn(),
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
        entry={null}
        onUpsert={vi.fn()}
        onClear={vi.fn()}
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
        entry={null}
        onUpsert={vi.fn()}
        onClear={vi.fn()}
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
        entry={null}
        onUpsert={vi.fn()}
        onClear={vi.fn()}
      />
    )
    // container.firstChild is the cell div (first element in the fragment)
    expect(container.firstChild.style.borderColor).toBe('var(--green)')
  })

  it('uses dinner accent colour (rust) when isOver on a dinner cell', () => {
    useDroppable.mockReturnValue({ setNodeRef: () => {}, isOver: true })
    const { container } = render(
      <MealCell
        slot="dinner"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entry={null}
        onUpsert={vi.fn()}
        onClear={vi.fn()}
      />
    )
    expect(container.firstChild.style.borderColor).toBe('var(--rust)')
  })

  it('shows slot-coloured background when isOver, even on an empty cell', () => {
    useDroppable.mockReturnValue({ setNodeRef: () => {}, isOver: true })
    const { container } = render(
      <MealCell
        slot="breakfast"
        dayIndex={0}
        dayLabel="Mon, Apr 28"
        entry={null}
        onUpsert={vi.fn()}
        onClear={vi.fn()}
      />
    )
    expect(container.firstChild.style.background).toBe('rgb(254, 249, 236)')
  })
})
