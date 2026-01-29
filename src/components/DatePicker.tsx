import React, { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek
} from 'date-fns'

function fmt(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export type DatePickerProps = {
  value?: string
  onChange?: (value: string) => void
  daysAhead?: number
  includeToday?: boolean
  id?: string
  name?: string
  className?: string
  disabled?: boolean
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  daysAhead = 14,
  includeToday = true,
  id,
  name,
  className,
  disabled = false
}) => {
  const today = useMemo(() => startOfDay(new Date()), [])
  const minDate = useMemo(() => startOfDay(includeToday ? today : addDays(today, 1)), [includeToday, today])
  const maxDate = useMemo(() => startOfDay(addDays(today, daysAhead)), [today, daysAhead])

  const initialSelected = useMemo(() => {
    if (!value) return null as Date | null
    try {
      const d = startOfDay(parseISO(value))
      return d
    } catch {
      return null
    }
  }, [value])

  const [currentMonth, setCurrentMonth] = useState<Date>(
    startOfMonth(initialSelected ?? today)
  )

  const prevMonth = useMemo(() => addMonths(currentMonth, -1), [currentMonth])
  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth])

  const canGoPrev = useMemo(() => {
    const start = startOfMonth(prevMonth)
    const end = endOfMonth(prevMonth)
    return !(isAfter(start, maxDate) || isBefore(end, minDate))
  }, [prevMonth, minDate, maxDate])

  const canGoNext = useMemo(() => {
    const start = startOfMonth(nextMonth)
    const end = endOfMonth(nextMonth)
    return !(isAfter(start, maxDate) || isBefore(end, minDate))
  }, [nextMonth, minDate, maxDate])

  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
    [currentMonth]
  )
  const gridEnd = useMemo(
    () => endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
    [currentMonth]
  )

  const days: Date[] = []
  for (let d = gridStart; !isAfter(d, gridEnd); d = addDays(d, 1)) {
    days.push(d)
  }

  const selectedDate = initialSelected

  const select = (d: Date) => {
    if (disabled) return
    const isOutOfRange = isBefore(d, minDate) || isAfter(d, maxDate)
    if (isOutOfRange) return
    onChange?.(fmt(d))
  }

  return (
    <div className={['inline-block select-none', className].filter(Boolean).join(' ')}>
      <input type="hidden" id={id} name={name} value={value ?? ''} readOnly />

      <div className="w-full max-w-md bg-barbershop-gray rounded-lg border border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="text-white font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!canGoPrev || disabled}
              onClick={() => setCurrentMonth(prevMonth)}
              className="h-8 w-8 grid place-items-center rounded-md border border-gray-600 text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              «
            </button>
            <button
              type="button"
              aria-label="Next month"
              disabled={!canGoNext || disabled}
              onClick={() => setCurrentMonth(nextMonth)}
              className="h-8 w-8 grid place-items-center rounded-md border border-gray-600 text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              »
            </button>
          </div>
        </div>

        {/* Weekday headings */}
        <div className="grid grid-cols-7 text-center text-xs text-gray-300 px-2 pt-2">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 p-2">
          {days.map((d) => {
            const isOutsideMonth = !isSameMonth(d, currentMonth)
            const isDisabled = isBefore(d, minDate) || isAfter(d, maxDate)
            const isToday = isSameDay(d, today)
            const isSelected = !!selectedDate && isSameDay(d, selectedDate)

            const base = 'aspect-square w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-barbershop-gold'
            const tone = isSelected
              ? 'bg-barbershop-gold text-black'
              : isDisabled
              ? 'text-gray-500 opacity-50 cursor-not-allowed border border-transparent'
              : 'text-white hover:bg-gray-700 border border-gray-700'
            const dim = !isSelected && !isDisabled && isOutsideMonth ? 'opacity-60' : ''
            const todayRing = isToday && !isSelected ? 'ring-1 ring-barbershop-gold/60' : ''

            return (
              <button
                key={fmt(d)}
                type="button"
                onClick={() => select(d)}
                disabled={isDisabled || disabled}
                aria-current={isToday ? 'date' : undefined}
                aria-pressed={isSelected}
                className={[base, tone, dim, todayRing].filter(Boolean).join(' ')}
              >
                {format(d, 'd')}
              </button>
            )
          })}
        </div>
        <div className="px-4 pb-3 text-xs text-gray-400">
          Izaberi datum između {fmt(minDate)} i {fmt(maxDate)}
        </div>
      </div>
    </div>
  )
}

export default DatePicker