import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
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
import { srLatn } from 'date-fns/locale'

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
  minHour?: number
  maxHour?: number
  stepMinutes?: number
  onPrevWeek?: () => void
  onNextWeek?: () => void
  onCurrentWeek?: () => void
  onSlotClick?: (dt: Date) => void
  onEventClick?: (ev: CalendarEvent) => void
  onEventMove?: (ev: CalendarEvent, nextStart: Date, nextEnd: Date) => void
  highlightEventId?: string | null
}

const HOURS_LABEL_WIDTH = 36
const DAY_MIN_WIDTH = 56
const STEP_HEIGHT = 26

export default function ReservationCalendar({
  weekStart,
  events,
  minHour = 8,
  maxHour = 20,
  stepMinutes = 30,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onSlotClick,
  onEventClick,
  onEventMove,
  highlightEventId
}: ReservationCalendarProps) {
  const start = useMemo(() => startOfWeek(weekStart ?? new Date(), { weekStartsOn: 1 }), [weekStart])
  const days = useMemo(() => new Array(6).fill(0).map((_, i) => addDays(start, i)), [start])
  const monthLabel = useMemo(() => {
    const capitalizeFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
    const monthKeys = new Set<string>()
    const labels: string[] = []
    for (const day of days) {
      const key = format(day, 'yyyy-MM')
      if (monthKeys.has(key)) continue
      monthKeys.add(key)
      labels.push(capitalizeFirst(format(day, 'LLLL yyyy', { locale: srLatn })))
    }
    return labels.join(' / ')
  }, [days])

  const minutesPerDay = (maxHour - minHour) * 60
  const stepsPerDay = Math.ceil(minutesPerDay / stepMinutes)
  const columnHeight = stepsPerDay * STEP_HEIGHT

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [hoverSlot, setHoverSlot] = useState<{ dayIdx: number; slotIdx: number } | null>(null)
  const draggingRef = useRef(false)
  const dragStartRef = useRef<{ id: string; x: number; y: number } | null>(null)

  const dayEvents = useMemo(() => {
    return days.map((day) => events.filter((e) => isSameDay(e.start, day)))
  }, [days, events])

  const toSlotDate = useCallback((dayIdx: number, slotIdx: number) => {
    const base = setMinutes(setHours(addDays(start, dayIdx), minHour), 0)
    return addMinutes(base, slotIdx * stepMinutes)
  }, [start, minHour, stepMinutes])

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, dayIdx: number) => {
    if (dragStartRef.current || draggingRef.current) return
    if (!onSlotClick) return
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const minutesFromTop = Math.floor(y / STEP_HEIGHT) * stepMinutes
    const dt = setMinutes(setHours(addDays(start, dayIdx), minHour), 0)
    onSlotClick(addMinutes(dt, minutesFromTop))
  }

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current) {
      if (dragStartRef.current) {
        const dx = Math.abs(e.clientX - dragStartRef.current.x)
        const dy = Math.abs(e.clientY - dragStartRef.current.y)
        if (dx > 6 || dy > 6) {
          draggingRef.current = true
          setDraggingId(dragStartRef.current.id)
        }
      }
      return
    }
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const slot = el?.closest('[data-slot]') as HTMLElement | null
    if (!slot) {
      setHoverSlot(null)
      return
    }
    const dayIdx = Number(slot.dataset.day)
    const slotIdx = Number(slot.dataset.slot)
    if (Number.isNaN(dayIdx) || Number.isNaN(slotIdx)) return
    setHoverSlot({ dayIdx, slotIdx })
  }, [])

  const handlePointerUp = useCallback((e: PointerEvent) => {
    const wasDragging = draggingRef.current
    const candidate = dragStartRef.current
    draggingRef.current = false
    dragStartRef.current = null

    if (!wasDragging) {
      if (candidate) {
        const ev = events.find((item) => item.id === candidate.id)
        if (ev) onEventClick?.(ev)
      }
      setDraggingId(null)
      setHoverSlot(null)
      return
    }

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const slot = el?.closest('[data-slot]') as HTMLElement | null
    const draggingEvent = events.find((ev) => ev.id === draggingId)
    if (slot && draggingEvent && onEventMove) {
      const dayIdx = Number(slot.dataset.day)
      const slotIdx = Number(slot.dataset.slot)
      if (!Number.isNaN(dayIdx) && !Number.isNaN(slotIdx)) {
        const nextStart = toSlotDate(dayIdx, slotIdx)
        const duration = Math.max(30, differenceInMinutes(draggingEvent.end, draggingEvent.start))
        const nextEnd = addMinutes(nextStart, duration)
        onEventMove(draggingEvent, nextStart, nextEnd)
      }
    }
    setDraggingId(null)
    setHoverSlot(null)
  }, [draggingId, events, onEventClick, onEventMove, toSlotDate])

  useEffect(() => {
    if (!draggingId) return
    const onMove = (e: PointerEvent) => handlePointerMove(e)
    const onUp = (e: PointerEvent) => handlePointerUp(e)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draggingId, handlePointerMove, handlePointerUp])

  const renderEvent = (ev: CalendarEvent, dayIdx: number) => {
    const columnTop = setHours(setMinutes(addDays(start, dayIdx), 0), minHour)
    const startMinutes = differenceInMinutes(ev.start, columnTop)
    const top = (startMinutes / stepMinutes) * STEP_HEIGHT
    const height = Math.max(18, (differenceInMinutes(ev.end, ev.start) / stepMinutes) * STEP_HEIGHT)
    const color = ev.color ?? '#3b82f6'

    const isHighlight = highlightEventId && ev.id === highlightEventId
    return (
      <div
        id={`ev-${ev.id}`}
        key={ev.id}
        className="absolute left-1 right-1 rounded-lg text-left overflow-hidden shadow-sm cursor-grab active:cursor-grabbing"
        style={{
          top,
          height,
          background: color,
          color: '#fff',
          animation: isHighlight ? 'pulseRed 1s ease-in-out 0s 3' : undefined
        }}
        title={`${ev.title} — ${format(ev.start, 'HH:mm')}–${format(ev.end, 'HH:mm')}`}
        onPointerDown={(e) => {
          e.stopPropagation()
          dragStartRef.current = { id: ev.id, x: e.clientX, y: e.clientY }
        }}
        onClick={(e) => {
          e.stopPropagation()
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          if (!draggingRef.current && dragStartRef.current?.id === ev.id) {
            dragStartRef.current = null
            onEventClick?.(ev)
          }
        }}
      >
        <div className="px-1.5 py-0.5 text-[10px] font-semibold select-none">
          <div className="text-[11px] leading-tight whitespace-normal break-all">{ev.title}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-[#F6F8F7] border border-[#E7ECEA] rounded-lg">
      <style>{`
        @keyframes pulseRed {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.45); }
        }
      `}</style>
      <div className="flex flex-col gap-2 px-2 py-2 border-b border-[#E7ECEA] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-bold text-xl sm:text-3xl text-[#1F2937]">{monthLabel}</div>
        </div>
        <div className="flex w-full items-center justify-between sm:w-auto sm:justify-end sm:gap-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onPrevWeek}
              aria-label="Prethodna nedelja"
              className="h-11 w-11 sm:h-12 sm:w-12 inline-flex items-center justify-center rounded-full border border-[#DCE3E1] bg-white text-[#1F2937] shadow-sm transition hover:bg-[#F3F6F5] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#080E53]/30"
            >
              <FiChevronLeft className="text-xl sm:text-2xl" />
            </button>
            <button
              type="button"
              onClick={onNextWeek}
              aria-label="Sledeća nedelja"
              className="h-11 w-11 sm:h-12 sm:w-12 inline-flex items-center justify-center rounded-full border border-[#DCE3E1] bg-white text-[#1F2937] shadow-sm transition hover:bg-[#F3F6F5] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#080E53]/30"
            >
              <FiChevronRight className="text-xl sm:text-2xl" />
            </button>
          </div>
          <button
            type="button"
            onClick={onCurrentWeek}
            className="h-11 px-4 sm:h-12 sm:px-5 inline-flex items-center justify-center rounded-full border border-[#DCE3E1] bg-white text-sm sm:text-base font-semibold text-[#1F2937] shadow-sm transition hover:bg-[#F3F6F5] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#080E53]/30"
          >
            Trenutna nedelja
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-auto"
        style={{ maxHeight: 700 }}
        onPointerUp={() => {
          if (!draggingRef.current) {
            dragStartRef.current = null
          }
        }}
      >
        <div
          className="grid min-w-max"
          style={{ gridTemplateColumns: `${HOURS_LABEL_WIDTH}px repeat(6, minmax(${DAY_MIN_WIDTH}px, 1fr))` }}
        >
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="px-0.5 py-1 text-center border-l first:border-l-0 border-[#E7ECEA]">
              <div className="uppercase text-[11px] sm:text-xs font-semibold text-gray-500">{format(d, 'EEE', { locale: srLatn })}</div>
              <div className="text-lg sm:text-xl font-bold text-[#111827] leading-tight">{format(d, 'd', { locale: srLatn })}</div>
            </div>
          ))}

          <div className="relative border-t border-[#E7ECEA]" style={{ height: columnHeight }}>
            {new Array(stepsPerDay + 1).fill(0).map((_, i) => {
              const totalMin = i * stepMinutes
              const hh = Math.floor(totalMin / 60) + minHour
              const mm = totalMin % 60
              const label = mm === 0 ? `${String(hh).padStart(2, '0')}:00` : ''
              return (
                <div key={i} className="absolute left-0 right-0" style={{ top: i * STEP_HEIGHT - 8 }}>
                  <div className="pl-0.5 text-[11px] sm:text-xs font-semibold text-gray-600">{label}</div>
                </div>
              )
            })}
          </div>

          {days.map((_, dayIdx) => (
            <div
              key={dayIdx}
              className="relative border-l border-t border-[#E7ECEA]"
              style={{ height: columnHeight }}
              onClick={(e) => handleColumnClick(e, dayIdx)}
            >
              {new Array(stepsPerDay).fill(0).map((_, i) => (
                <div
                  key={i}
                  data-day={dayIdx}
                  data-slot={i}
                  className={`absolute left-1 right-1 rounded-md ${hoverSlot?.dayIdx === dayIdx && hoverSlot?.slotIdx === i ? 'bg-blue-100' : 'bg-[#EEF3F2]'}`}
                  style={{ top: i * STEP_HEIGHT + 2, height: STEP_HEIGHT - 4 }}
                />
              ))}
              {dayEvents[dayIdx].map((ev) => renderEvent(ev, dayIdx))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
