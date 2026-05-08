import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import SlotModal from './SlotModal'

const SLOT_META = {
  breakfast: { emoji: '☀️', label: 'Breakfast', color: 'var(--gold)', bg: 'var(--gold-light)' },
  lunch: { emoji: '🌤️', label: 'Lunch', color: 'var(--green)', bg: 'var(--green-light)' },
  dinner: { emoji: '🌙', label: 'Dinner', color: 'var(--rust)', bg: 'var(--rust-light)' }
}

export default function MealCell({ slot, dayIndex, dayLabel, entries = [], onAdd, onRemove, editable = true }) {
  const [modalOpen, setModalOpen] = useState(false)
  const meta = SLOT_META[slot]
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${dayIndex}-${slot}` })

  const hasEntries = entries.length > 0
  const visibleEntries = entries.slice(0, 2)
  const extraCount = entries.length > 2 ? entries.length - 2 : 0

  return (
    <>
      <div
        ref={setNodeRef}
        role="button"
        aria-label={`${meta.label} for ${dayLabel}`}
        onClick={() => editable && setModalOpen(true)}
        style={{
          minHeight: '72px',
          padding: '10px 12px',
          borderRadius: '10px',
          borderWidth: '1.5px',
          borderStyle: 'solid',
          borderColor: isOver ? meta.color : (hasEntries ? 'transparent' : 'var(--cream-mid)'),
          background: hasEntries || isOver ? meta.bg : 'var(--cream)',
          cursor: editable ? 'pointer' : 'default',
          position: 'relative',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: hasEntries ? 'space-between' : 'center',
          alignItems: hasEntries ? 'flex-start' : 'center',
          gap: '4px',
          boxShadow: isOver ? `0 0 0 3px ${meta.bg}` : 'none',
        }}
        onMouseEnter={e => {
          if (editable && !isOver) {
            e.currentTarget.style.borderColor = meta.color
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' // subtle lift, no token
          }
        }}
        onMouseLeave={e => {
          if (!isOver) {
            e.currentTarget.style.borderColor = hasEntries ? 'transparent' : 'var(--cream-mid)'
            e.currentTarget.style.boxShadow = 'none'
          }
        }}
      >
        {hasEntries ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {visibleEntries.map(entry => (
              <p
                key={entry.id}
                style={{
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  color: 'var(--slate)',
                  lineHeight: '1.3',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {entry.meal?.name}
              </p>
            ))}
            {extraCount > 0 && (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  color: meta.color,
                  background: 'rgba(255,255,255,0.7)', // semi-transparent white overlay, no token
                  borderRadius: '10px',
                  padding: '1px 7px',
                  alignSelf: 'flex-start',
                  marginTop: '2px',
                }}
              >
                +{extraCount} more
              </span>
            )}
          </div>
        ) : (
          editable ? (
            <div style={{ textAlign: 'center', color: 'var(--slate-light)', fontSize: '0.82rem' }}>
              <span style={{ fontSize: '20px', display: 'block', marginBottom: '2px' }}>+</span>
              Add meal
            </div>
          ) : (
            <span style={{ color: 'var(--slate-light)', fontSize: '0.82rem' }}>—</span>
          )
        )}
      </div>

      {modalOpen && (
        <SlotModal
          slot={slot}
          dayIndex={dayIndex}
          dayLabel={dayLabel}
          entries={entries}
          onAdd={onAdd}
          onRemove={onRemove}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
