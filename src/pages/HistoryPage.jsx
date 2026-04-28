import { useState } from 'react'
import { useWeekHistory } from '../hooks/useWeekHistory'
import { useMealPlan } from '../hooks/useMealPlan'
import { formatWeekLabel, stringToWeekStart, isCurrentWeek } from '../lib/dates'
import WeekGrid from '../components/WeekGrid'

function HistoryWeekView({ weekStr }) {
  const weekStart = stringToWeekStart(weekStr)
  const { loading, getEntry } = useMealPlan(weekStart)

  if (loading) return <div style={{ color: 'var(--slate-light)', padding: '20px', textAlign: 'center' }}>Loading…</div>

  return (
    <div className="card" style={{ padding: '24px' }}>
      <WeekGrid weekStart={weekStart} onUpsert={() => {}} onClear={() => {}} getEntry={getEntry} editable={false} />
    </div>
  )
}

export default function HistoryPage() {
  const { weeks, loading } = useWeekHistory()
  const [expanded, setExpanded] = useState(null)

  const pastWeeks = weeks.filter(w => !isCurrentWeek(stringToWeekStart(w.week_start)))

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ color: 'var(--brown-dark)', marginBottom: '8px' }}>Meal History</h1>
      <p style={{ color: 'var(--slate-mid)', marginBottom: '32px' }}>
        Browse past weeks to revisit your household's meal plans.
      </p>

      {loading ? (
        <div style={{ color: 'var(--slate-light)', textAlign: 'center', padding: '48px' }}>Loading history…</div>
      ) : pastWeeks.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 24px',
          color: 'var(--slate-light)', fontSize: '0.95rem'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          No past weeks yet. Your history will appear here after the current week passes.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pastWeeks.map(week => (
            <div key={week.id} className="card" style={{ overflow: 'hidden' }}>
              <button
                onClick={() => setExpanded(expanded === week.week_start ? null : week.week_start)}
                style={{
                  width: '100%', padding: '18px 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.4rem' }}>📅</span>
                  <div>
                    <p style={{ fontWeight: '600', color: 'var(--slate)', fontSize: '0.95rem' }}>
                      {formatWeekLabel(stringToWeekStart(week.week_start))}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--slate-light)', marginTop: '2px' }}>
                      {week.meal_plan_entries?.[0]?.count || 0} meals planned
                    </p>
                  </div>
                </div>
                <span style={{
                  fontSize: '1.2rem', color: 'var(--brown)',
                  transform: expanded === week.week_start ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s'
                }}>›</span>
              </button>

              {expanded === week.week_start && (
                <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--cream-mid)', paddingTop: '20px' }}>
                  <HistoryWeekView weekStr={week.week_start} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
