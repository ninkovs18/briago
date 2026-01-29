import React, { useMemo, useRef } from 'react'
import {
  addDays,
  addMinutes,
  differenceInMinutes,
  format,
  isSameDay,
  setHours,
  setMinutes,
  startOfWeek
} from 'date-fns'

export type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  color?: string
}

export type ReservationCalendarProps = {
  weekStart?: Date
  events: CalendarEvent[]
  minHour?: number // 8 → 08:00
  maxHour?: number // 20 → 20:00
  stepMinutes?: number // 30
  onPrevWeek?: () => void
  onNextWeek?: () => void
  onSlotClick?: (dt: Date) => void
  onEventClick?: (ev: CalendarEvent) => void
}

const HOURS_LABEL_WIDTH = 56
const DAY_MIN_WIDTH = 140 // px, ensures horizontal scroll on small screens

export default function ReservationCalendar({
  weekStart,
  events,
  minHour = 8,
  maxHour = 20,
  stepMinutes = 30,
  onPrevWeek,
  onNextWeek,
  onSlotClick,
  onEventClick
}: ReservationCalendarProps) {
  const start = useMemo(() => startOfWeek(weekStart ?? new Date(), { weekStartsOn: 1 }), [weekStart])
  const days = new Array(7).fill(0).map((_, i) => addDays(start, i))

  const minutesPerDay = (maxHour - minHour) * 60
  const stepsPerDay = Math.ceil(minutesPerDay / stepMinutes)
  const stepHeight = 28 // px per step
  const columnHeight = stepsPerDay * stepHeight

  const containerRef = useRef<HTMLDivElement | null>(null)

  const dayEvents = useMemo(() => {
    return days.map((day) => events.filter((e) => isSameDay(e.start, day)))
  }, [days, events])

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, dayIdx: number) => {
    if (!onSlotClick) return
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const minutesFromTop = Math.floor(y / stepHeight) * stepMinutes
    const dt = setMinutes(setHours(addDays(start, dayIdx), minHour), 0)
    const clicked = addMinutes(dt, minutesFromTop)
    onSlotClick(clicked)
  }

  const renderEvent = (ev: CalendarEvent, dayIdx: number) => {
    const columnTop = setHours(setMinutes(addDays(start, dayIdx), 0), minHour)
    const startMinutes = differenceInMinutes(ev.start, columnTop)
    const top = (startMinutes / stepMinutes) * stepHeight
    const height = Math.max(20, (differenceInMinutes(ev.end, ev.start) / stepMinutes) * stepHeight)
    const color = ev.color ?? '#1F50FF'

    return (
      <div
        id={`ev-${ev.id}`}
        key={ev.id}
        className="absolute left-1 right-1 rounded-md text-left overflow-hidden shadow-sm cursor-pointer"
        style={{ top, height, background: color, color: '#fff' }}
        title={`${ev.title} — ${format(ev.start, 'HH:mm')}–${format(ev.end, 'HH:mm')}`}
        onClick={(e) => { e.stopPropagation(); onEventClick?.(ev) }}
      >
        <div className="px-2 py-1 text-xs font-medium select-none">
          <div>{format(ev.start, 'HH:mm')} – {format(ev.end, 'HH:mm')}</div>
          <div className="truncate text-[13px] font-semibold">{ev.title}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white border border-[#F0F0F0] rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="font-bold text-lg">{format(start, 'MMM d')} – {format(addDays(start, 6), 'MMM d, yyyy')}</div>
        <div className="flex gap-2">
          <button type="button" onClick={onPrevWeek} className="px-3 py-1 rounded border">← Prev</button>
          <button type="button" onClick={onNextWeek} className="px-3 py-1 rounded border">Next →</button>
        </div>
      </div>

      {/* Grid */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-auto"
        style={{ maxHeight: 600 }}
      >
        <div
          className="grid min-w-max"
          style={{ gridTemplateColumns: `${HOURS_LABEL_WIDTH}px repeat(7, minmax(${DAY_MIN_WIDTH}px, 1fr))` }}
        >
          {/* Day headers */}
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="px-2 py-2 text-center font-semibold border-l first:border-l-0">
              {format(d, 'EEE d')}
            </div>
          ))}

          {/* Time + columns */}
          {/* Time labels */}
          <div className="relative border-t" style={{ height: columnHeight }}>
            {new Array(stepsPerDay + 1).fill(0).map((_, i) => {
              const totalMin = i * stepMinutes
              const hh = Math.floor(totalMin / 60) + minHour
              const mm = totalMin % 60
              const label = mm === 0 ? `${String(hh).padStart(2, '0')}:00` : ''
              return (
                <div key={i} className="absolute left-0 right-0" style={{ top: i * stepHeight - 8 }}>
                  <div className="text-xs text-gray-500 pl-2">{label}</div>
                </div>
              )
            })}
          </div>

          {/* Day columns */}
          {days.map((_, dayIdx) => (
            <div id={`col-${dayIdx}`} key={dayIdx} className="relative border-l border-t" style={{ height: columnHeight }} onClick={(e) => handleColumnClick(e, dayIdx)}>
              {/* horizontal lines */}
              {new Array(stepsPerDay + 1).fill(0).map((_, i) => (
                <div key={i} className="absolute left-0 right-0 border-t border-dashed border-gray-200" style={{ top: i * stepHeight }} />
              ))}
              {/* events */}
              {dayEvents[dayIdx].map((ev) => renderEvent(ev, dayIdx))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
