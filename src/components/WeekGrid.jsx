import { format } from 'date-fns'
import MealCell from './MealCell'
import { DAYS, SLOTS, getWeekDays } from '../lib/dates'

const SLOT_META = {
  breakfast: { emoji: '☀️', label: 'Breakfast' },
  lunch: { emoji: '🌤️', label: 'Lunch' },
  dinner: { emoji: '🌙', label: 'Dinner' }
}

export default function WeekGrid({ weekStart, entries, onUpsert, onClear, getEntry, editable = true }) {
  const days = getWeekDays(weekStart)
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '100px repeat(7, minmax(140px, 1fr))',
        gap: '8px',
        minWidth: '1080px'
      }}>
        {/* Header row: day names */}
        <div /> {/* empty corner */}
        {days.map((day, i) => {
          const dayStr = format(day, 'yyyy-MM-dd')
          const isToday = dayStr === today
          return (
            <div key={i} style={{
              textAlign: 'center', paddingBottom: '4px'
            }}>
              <div style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 12px', borderRadius: '10px',
                background: isToday ? 'var(--brown-dark)' : 'transparent',
                color: isToday ? 'var(--cream)' : 'var(--slate)'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>
                  {DAYS[i].slice(0, 3)}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1.1 }}>
                  {format(day, 'd')}
                </span>
              </div>
            </div>
          )
        })}

        {/* Rows: one per slot */}
        {SLOTS.map(slot => (
          <>
            {/* Slot label */}
            <div key={`label-${slot}`} style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              paddingRight: '8px', paddingTop: '4px'
            }}>
              <span style={{ fontSize: '1.1rem', marginBottom: '2px' }}>{SLOT_META[slot].emoji}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--slate-mid)', textTransform: 'capitalize', letterSpacing: '0.03em' }}>
                {SLOT_META[slot].label}
              </span>
            </div>
            {days.map((day, i) => (
              <MealCell
                key={`${slot}-${i}`}
                slot={slot}
                dayIndex={i}
                dayLabel={`${DAYS[i]}, ${format(day, 'MMM d')}`}
                entry={getEntry(i, slot)}
                onUpsert={onUpsert}
                onClear={onClear}
                editable={editable}
              />
            ))}
          </>
        ))}
      </div>
    </div>
  )
}
