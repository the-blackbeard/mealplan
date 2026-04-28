import { startOfWeek, addDays, format, parseISO, subWeeks, addWeeks } from 'date-fns'

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const SLOTS = ['breakfast', 'lunch', 'dinner']

export function getWeekStart(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 }) // Monday
}

export function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function formatWeekLabel(weekStart) {
  const end = addDays(weekStart, 6)
  return `${format(weekStart, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
}

export function weekStartToString(date) {
  return format(date, 'yyyy-MM-dd')
}

export function stringToWeekStart(str) {
  return parseISO(str)
}

export function prevWeek(weekStart) {
  return subWeeks(weekStart, 1)
}

export function nextWeek(weekStart) {
  return addWeeks(weekStart, 1)
}

export function isCurrentWeek(weekStart) {
  const current = getWeekStart()
  return weekStartToString(weekStart) === weekStartToString(current)
}
