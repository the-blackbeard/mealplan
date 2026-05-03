import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { useMeals } from '../hooks/useMeals'

function DraggableMealCard({ meal }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `meal-${meal.id}`,
    data: { meal },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1.5px solid var(--cream-mid)',
        background: 'var(--cream)',
        cursor: 'grab',
        userSelect: 'none',
        opacity: isDragging ? 0.4 : 1,
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : 'border-color 0.15s',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--slate-light)', marginTop: '1px', flexShrink: 0 }}>⠿</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--slate)', lineHeight: '1.3' }}>
          {meal.name}
        </div>
        {meal.description && (
          <div style={{ fontSize: '0.74rem', color: 'var(--slate-light)', marginTop: '1px', lineHeight: '1.3' }}>
            {meal.description}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MealsSidebar() {
  const { meals, loading } = useMeals()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = meals.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{
      width: '240px',
      flexShrink: 0,
      background: 'var(--white)',
      border: '1px solid var(--cream-mid)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      alignSelf: 'stretch',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--cream-mid)', flexShrink: 0 }}>
        <div style={{
          fontSize: '0.85rem', fontWeight: '600', color: 'var(--brown-dark)',
          marginBottom: '10px',
        }}>
          🍽 Meals Library
        </div>
        <input
          className="input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search meals…"
          style={{ fontSize: '0.82rem', padding: '7px 10px' }}
        />
      </div>

      {/* Count label */}
      <div style={{
        padding: '8px 14px 4px',
        fontSize: '0.72rem',
        fontWeight: '600',
        color: 'var(--slate-light)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        flexShrink: 0,
      }}>
        {filtered.length} {filtered.length === 1 ? 'meal' : 'meals'} · drag to plan
      </div>

      {/* Scrollable meals list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {loading && (
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-light)', textAlign: 'center', padding: '16px 0' }}>
            Loading…
          </p>
        )}
        {!loading && meals.length === 0 && (
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-light)', textAlign: 'center', padding: '16px 0' }}>
            No meals yet — go to Meals to create some.
          </p>
        )}
        {!loading && meals.length > 0 && filtered.length === 0 && (
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-light)', textAlign: 'center', padding: '16px 0' }}>
            No meals match your search.
          </p>
        )}
        {filtered.map(meal => (
          <DraggableMealCard key={meal.id} meal={meal} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--cream-mid)', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/meals')}
          style={{
            width: '100%',
            background: 'none',
            border: '1.5px dashed var(--cream-mid)',
            borderRadius: '8px',
            padding: '7px',
            fontSize: '0.82rem',
            fontWeight: '600',
            color: 'var(--brown)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          + Add new meal
        </button>
      </div>
    </div>
  )
}
