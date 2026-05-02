import { describe, it, expect, vi } from 'vitest'
import { makeDragEndHandler } from './PlannerPage'

describe('makeDragEndHandler', () => {
  it('calls upsertEntry with parsed dayIndex, slot, and mealId', () => {
    const upsertEntry = vi.fn()
    const handler = makeDragEndHandler(upsertEntry)
    handler({
      active: { data: { current: { meal: { id: 'abc-123' } } } },
      over: { id: 'drop-2-lunch' },
    })
    expect(upsertEntry).toHaveBeenCalledWith(2, 'lunch', 'abc-123', null)
  })

  it('does nothing when dropped outside any cell (over is null)', () => {
    const upsertEntry = vi.fn()
    const handler = makeDragEndHandler(upsertEntry)
    handler({
      active: { data: { current: { meal: { id: 'abc-123' } } } },
      over: null,
    })
    expect(upsertEntry).not.toHaveBeenCalled()
  })

  it('handles day 0 (Monday) and breakfast slot', () => {
    const upsertEntry = vi.fn()
    const handler = makeDragEndHandler(upsertEntry)
    handler({
      active: { data: { current: { meal: { id: 'xyz' } } } },
      over: { id: 'drop-0-breakfast' },
    })
    expect(upsertEntry).toHaveBeenCalledWith(0, 'breakfast', 'xyz', null)
  })

  it('handles day 6 (Sunday) and dinner slot', () => {
    const upsertEntry = vi.fn()
    const handler = makeDragEndHandler(upsertEntry)
    handler({
      active: { data: { current: { meal: { id: 'xyz' } } } },
      over: { id: 'drop-6-dinner' },
    })
    expect(upsertEntry).toHaveBeenCalledWith(6, 'dinner', 'xyz', null)
  })
})
