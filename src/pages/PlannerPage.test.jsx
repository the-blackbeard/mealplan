import { describe, it, expect, vi } from 'vitest'
import { makeDragEndHandler } from './PlannerPage'

describe('makeDragEndHandler', () => {
  it('calls addEntry with parsed dayIndex, slot, and mealId', () => {
    const addEntry = vi.fn()
    const handler = makeDragEndHandler(addEntry)
    handler({
      active: { data: { current: { meal: { id: 'abc-123' } } } },
      over: { id: 'drop-2-lunch' },
    })
    expect(addEntry).toHaveBeenCalledWith(2, 'lunch', 'abc-123')
  })

  it('does nothing when dropped outside any cell (over is null)', () => {
    const addEntry = vi.fn()
    const handler = makeDragEndHandler(addEntry)
    handler({
      active: { data: { current: { meal: { id: 'abc-123' } } } },
      over: null,
    })
    expect(addEntry).not.toHaveBeenCalled()
  })

  it('handles day 0 (Monday) and breakfast slot', () => {
    const addEntry = vi.fn()
    const handler = makeDragEndHandler(addEntry)
    handler({
      active: { data: { current: { meal: { id: 'xyz' } } } },
      over: { id: 'drop-0-breakfast' },
    })
    expect(addEntry).toHaveBeenCalledWith(0, 'breakfast', 'xyz')
  })

  it('handles day 6 (Sunday) and dinner slot', () => {
    const addEntry = vi.fn()
    const handler = makeDragEndHandler(addEntry)
    handler({
      active: { data: { current: { meal: { id: 'xyz' } } } },
      over: { id: 'drop-6-dinner' },
    })
    expect(addEntry).toHaveBeenCalledWith(6, 'dinner', 'xyz')
  })

  it('does nothing when active has no meal data', () => {
    const addEntry = vi.fn()
    const handler = makeDragEndHandler(addEntry)
    handler({
      active: { data: { current: {} } },
      over: { id: 'drop-2-lunch' },
    })
    expect(addEntry).not.toHaveBeenCalled()
  })
})
