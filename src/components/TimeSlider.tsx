import React, { useMemo, useRef, useState } from 'react'

export type TimeSliderProps = {
  value?: string // e.g. "9:30 AM"
  onChange?: (value: string) => void
  slots?: string[] // available time labels for the selected date
  id?: string
  name?: string
  className?: string
  disabled?: boolean
  emptyMessage?: string
}

export const TimeSlider: React.FC<TimeSliderProps> = ({
  value,
  onChange,
  slots = [],
  id,
  name,
  className,
  disabled = false,
  emptyMessage = 'Izaberi datum da vidiš slobodne termine.'
}) => {
  const list = slots
  const currentIndex = useMemo(() => (value ? list.indexOf(value) : -1), [value, list])
  const [focusedIndex, setFocusedIndex] = useState<number>(currentIndex >= 0 ? currentIndex : 0)

  const containerRef = useRef<HTMLDivElement | null>(null)

  const select = (idx: number) => {
    if (disabled) return
    if (idx < 0 || idx >= list.length) return
    onChange?.(list[idx])
    setFocusedIndex(idx)
  }

  const scrollByBoxes = (dir: 1 | -1) => {
    const el = containerRef.current
    if (!el) return
    const box = el.querySelector<HTMLButtonElement>('button[data-box]')
    const delta = box ? (box.offsetWidth + 8) * 4 : el.clientWidth * 0.8 // 4 boxes
    el.scrollBy({ left: dir * delta, behavior: 'smooth' })
  }

  return (
    <div className={["w-full", className].filter(Boolean).join(' ')}>
      <input type="hidden" id={id} name={name} value={value ?? ''} readOnly />

      {list.length === 0 ? (
        <div className="text-sm text-gray-400 py-3">{emptyMessage}</div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center">
            <button
              type="button"
              aria-label="Pomeri ulevo"
              onClick={() => scrollByBoxes(-1)}
              className="h-8 w-8 grid place-items-center rounded-md border border-gray-600 text-white bg-barbershop-dark hover:bg-gray-800"
            >
              ‹
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button
              type="button"
              aria-label="Pomeri udesno"
              onClick={() => scrollByBoxes(1)}
              className="h-8 w-8 grid place-items-center rounded-md border border-gray-600 text-white bg-barbershop-dark hover:bg-gray-800"
            >
              ›
            </button>
          </div>

          <div
            ref={containerRef}
className="flex gap-2 overflow-x-auto scrollbar-gold px-10 py-2"
          >
            {list.map((slot, idx) => {
              const isSelected = value === slot
              const isFocused = focusedIndex === idx
              const base = 'min-w-[88px] px-3 py-3 rounded-md border text-center text-sm select-none'
              const tone = isSelected
                ? 'bg-barbershop-gold text-black border-barbershop-gold'
                : 'bg-barbershop-dark text-white border-gray-700 hover:bg-gray-800'
              const ring = isFocused && !isSelected ? 'ring-2 ring-barbershop-gold/60' : ''
              return (
                <button
                  key={slot}
                  type="button"
                  data-box
                  onClick={() => select(idx)}
                  onFocus={() => setFocusedIndex(idx)}
                  disabled={disabled}
                  className={[base, tone, ring, 'disabled:opacity-50'].filter(Boolean).join(' ')}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeSlider
