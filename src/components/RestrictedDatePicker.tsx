import React from 'react'

function formatDateInput(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export type RestrictedDatePickerProps = {
  value?: string // 'YYYY-MM-DD'
  onChange?: (value: string) => void
  daysAhead?: number // default 14
  includeToday?: boolean // default true
  id?: string
  name?: string
  className?: string
}

export const RestrictedDatePicker: React.FC<RestrictedDatePickerProps> = ({
  value,
  onChange,
  daysAhead = 14,
  includeToday = true,
  id,
  name,
  className
}) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const minDate = new Date(today)
  if (!includeToday) {
    minDate.setDate(minDate.getDate() + 1)
  }
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + daysAhead)

  const min = formatDateInput(minDate)
  const max = formatDateInput(maxDate)

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    onChange?.(e.target.value)
  }

  return (
    <input
      type="date"
      id={id}
      name={name}
      className={className}
      min={min}
      max={max}
      value={value ?? ''}
      onChange={handleChange}
    />
  )
}

export default RestrictedDatePicker