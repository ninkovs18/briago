export type WorkingDay = {
  isOpen: boolean
  open: string
  close: string
}

export type WorkingHours = {
  days: Record<string, WorkingDay>
  vacation?: {
    enabled: boolean
    from?: string
    to?: string
  }
}

export const defaultWorkingHours: WorkingHours = {
  days: {
    '0': { isOpen: true, open: '10:00', close: '16:00' },
    '1': { isOpen: true, open: '09:00', close: '19:00' },
    '2': { isOpen: true, open: '09:00', close: '19:00' },
    '3': { isOpen: true, open: '09:00', close: '19:00' },
    '4': { isOpen: true, open: '09:00', close: '19:00' },
    '5': { isOpen: true, open: '09:00', close: '19:00' },
    '6': { isOpen: true, open: '09:00', close: '18:00' }
  },
  vacation: {
    enabled: false,
    from: '',
    to: ''
  }
}

export const normalizeWorkingHours = (value?: Partial<WorkingHours> | null): WorkingHours => {
  if (!value?.days) return defaultWorkingHours
  const days: Record<string, WorkingDay> = { ...defaultWorkingHours.days }
  Object.entries(value.days).forEach(([key, day]) => {
    if (!day) return
    days[key] = {
      isOpen: day.isOpen ?? days[key]?.isOpen ?? true,
      open: day.open || days[key]?.open || '09:00',
      close: day.close || days[key]?.close || '17:00'
    }
  })
  const vacation = value.vacation ?? defaultWorkingHours.vacation
  return {
    days,
    vacation: {
      enabled: vacation?.enabled ?? false,
      from: vacation?.from ?? '',
      to: vacation?.to ?? ''
    }
  }
}

export const timeToMinutes = (value: string) => {
  const [h, m] = value.split(':').map((p) => Number(p))
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m)
}

export const getDayConfig = (date: Date, hours: WorkingHours) => {
  const key = String(date.getDay())
  return hours.days[key] ?? defaultWorkingHours.days[key]
}

export const buildTimeSlots = (open: string, close: string, stepMinutes = 30) => {
  const slots: string[] = []
  const start = timeToMinutes(open)
  const end = timeToMinutes(close)
  for (let t = start; t + stepMinutes <= end; t += stepMinutes) {
    const h = Math.floor(t / 60)
    const m = t % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
}

export const isWithinWorkingHours = (day: WorkingDay, startTime: string, durationMin: number) => {
  if (!day.isOpen) return false
  const start = timeToMinutes(startTime)
  const end = start + durationMin
  return start >= timeToMinutes(day.open) && end <= timeToMinutes(day.close)
}

export const isDateInVacation = (date: Date, hours: WorkingHours) => {
  if (!hours.vacation?.enabled) return false
  if (!hours.vacation.from || !hours.vacation.to) return false
  const from = new Date(`${hours.vacation.from}T00:00:00`)
  const to = new Date(`${hours.vacation.to}T23:59:59`)
  return date >= from && date <= to
}
