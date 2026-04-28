import { useState } from 'react'
import MealPicker from './MealPicker'

const SLOT_META = {
  breakfast: { emoji: '☀️', label: 'Breakfast', color: '#e8a020', bg: '#fef9ec' },
  lunch: { emoji: '🌤️', label: 'Lunch', color: 'var(--green)', bg: 'var(--green-light)' },
  dinner: { emoji: '🌙', label: 'Dinner', color: 'var(--rust)', bg: 'var(--rust-light)' }
}

export default function MealCell({ slot, dayIndex, dayLabel, entry, onUpsert, onClear, editable = true }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const meta = SLOT_META[slot]

  async function handleSelect(meal) {
    await onUpsert(dayIndex, slot, meal.id, null)
    setPickerOpen(false)
  }

  async function handleClear(e) {
    e.stopPropagation()
    await onClear(dayIndex, slot)
  }

  const hasMeal = entry?.meal || entry?.custom_note

  return (
    <>
      <div
        onClick={() => editable && setPickerOpen(true)}
        style={{
          minHeight: '72px',
          padding: '10px 12px',
          borderRadius: '10px',
          border: `1.5px solid ${hasMeal ? 'transparent' : 'var(--cream-mid)'}`,
          background: hasMeal ? meta.bg : 'var(--cream)',
          cursor: editable ? 'pointer' : 'default',
          position: 'relative',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: hasMeal ? 'space-between' : 'center',
          alignItems: hasMeal ? 'flex-start' : 'center',
          gap: '4px'
        }}
        onMouseEnter={e => {
          if (editable) {
            e.currentTarget.style.borderColor = meta.color
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = hasMeal ? 'transparent' : 'var(--cream-mid)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {hasMeal ? (
          <>
            <div style={{ width: '100%' }}>
              <p style={{
                fontSize: '0.88rem', fontWeight: '600', color: 'var(--slate)',
                lineHeight: '1.3', wordBreak: 'break-word'
              }}>
                {entry.meal?.name || entry.custom_note}
              </p>
              {entry.meal?.description && (
                <p style={{ fontSize: '0.74rem', color: 'var(--slate-mid)', marginTop: '2px' }}>
                  {entry.meal.description}
                </p>
              )}
              {entry.updater && (
                <p style={{ fontSize: '0.7rem', color: meta.color, marginTop: '4px', opacity: 0.8 }}>
                  by {entry.updater.display_name}
                </p>
              )}
            </div>
            {editable && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <button
                  onClick={e => { e.stopPropagation(); setPickerOpen(true) }}
                  style={{
                    fontSize: '0.7rem', padding: '2px 7px', borderRadius: '5px',
                    background: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer',
                    color: 'var(--slate-mid)', fontFamily: 'var(--font-body)'
                  }}
                >
                  Change
                </button>
                <button
                  onClick={handleClear}
                  style={{
                    fontSize: '0.7rem', padding: '2px 7px', borderRadius: '5px',
                    background: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer',
                    color: 'var(--rust)', fontFamily: 'var(--font-body)'
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </>
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

      {pickerOpen && (
        <MealPicker
          slot={slot}
          dayLabel={dayLabel}
          onSelect={handleSelect}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}
