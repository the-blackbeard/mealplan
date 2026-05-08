import { useState } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { getWeekStart, prevWeek, nextWeek, formatWeekLabel, isCurrentWeek } from '../lib/dates'
import { useMealPlan } from '../hooks/useMealPlan'
import WeekGrid from '../components/WeekGrid'
import MealsSidebar from '../components/MealsSidebar'

export function makeDragEndHandler(addEntry) {
  return function handleDragEnd({ active, over }) {
    if (!over) return
    const meal = active.data?.current?.meal
    if (!meal) return
    const parts = over.id.split('-') // ['drop', '2', 'lunch']
    const dayIndex = parseInt(parts[1], 10)
    const slot = parts[2]
    addEntry(dayIndex, slot, meal.id)
  }
}

export default function PlannerPage() {
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const { loading, error, addEntry, removeEntry, getEntries } = useMealPlan(weekStart)
  const [activeMeal, setActiveMeal] = useState(null)
  const isThisWeek = isCurrentWeek(weekStart)

  const handleDragEnd = makeDragEndHandler(addEntry)

  return (
    <div style={{ maxWidth: '1500px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: 'var(--brown-dark)', marginBottom: '6px' }}>
            {isThisWeek ? 'This Week' : 'Meal Plan'}
          </h1>
          <p style={{ color: 'var(--slate-mid)', fontSize: '0.95rem' }}>
            📅 {formatWeekLabel(weekStart)}
            {isThisWeek && (
              <span style={{
                marginLeft: '10px', padding: '2px 10px', borderRadius: '20px',
                background: 'var(--green-light)', color: 'var(--green)',
                fontSize: '0.75rem', fontWeight: '600'
              }}>
                Current Week
              </span>
            )}
          </p>
        </div>

        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekStart(prevWeek(weekStart))}>
            ← Prev
          </button>
          {!isThisWeek && (
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(getWeekStart())}>
              Today
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekStart(nextWeek(weekStart))}>
            Next →
          </button>
        </div>
      </div>

      {/* Realtime indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '20px', fontSize: '0.8rem', color: 'var(--slate-light)'
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)',
          boxShadow: '0 0 0 3px var(--green-light)', display: 'inline-block'
        }} />
        Live — changes by your household appear instantly
      </div>

      {/* Grid + Sidebar */}
      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '320px', gap: '12px', color: 'var(--slate-light)'
        }}>
          <div style={{
            width: '24px', height: '24px', border: '2px solid var(--cream-mid)',
            borderTopColor: 'var(--brown)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          Loading meal plan…
        </div>
      ) : error ? (
        <div style={{
          background: 'var(--rust-light)', color: 'var(--rust)',
          padding: '16px', borderRadius: '10px'
        }}>
          Error: {error}
        </div>
      ) : (
        <DndContext
          onDragStart={({ active }) => setActiveMeal(active.data.current?.meal ?? null)}
          onDragEnd={(e) => { handleDragEnd(e); setActiveMeal(null) }}
          onDragCancel={() => setActiveMeal(null)}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {/* Calendar card */}
            <div className="card" style={{ flex: 1, minWidth: 0, padding: '24px' }}>
              <WeekGrid
                weekStart={weekStart}
                onAdd={addEntry}
                onRemove={removeEntry}
                getEntries={getEntries}
                editable={true}
              />
            </div>

            {/* Meals sidebar */}
            <MealsSidebar />
          </div>

          <DragOverlay dropAnimation={null}>
            {activeMeal && (
              <div style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'var(--brown-dark)',
                color: 'var(--cream)',
                fontSize: '0.88rem',
                fontWeight: '500',
                boxShadow: 'var(--shadow-md)',
                cursor: 'grabbing',
                pointerEvents: 'none',
              }}>
                {activeMeal.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--slate-light)', textAlign: 'center' }}>
        Drag meals from the sidebar onto any slot · Click a cell to manage meals · Changes sync in real time
      </p>
    </div>
  )
}
