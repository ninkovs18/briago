import React from 'react'

export type StepStatus = 'complete' | 'current' | 'upcoming'

export type StepCardProps = {
  title: string
  status: StepStatus
  onHeaderClick?: () => void
  disabled?: boolean
  children: React.ReactNode
}

const statusStyles: Record<StepStatus, string> = {
  complete: 'border-barbershop-gold',
  current: 'border-barbershop-gold',
  upcoming: 'border-gray-700'
}

const badgeStyles: Record<StepStatus, string> = {
  complete: 'bg-barbershop-gold text-black',
  current: 'bg-barbershop-gold text-black',
  upcoming: 'bg-gray-700 text-gray-200'
}

const StepCard: React.FC<StepCardProps> = ({ title, status, onHeaderClick, disabled, children }) => {
  const clickable = !!onHeaderClick && !disabled
  return (
    <div className={['rounded-lg border', statusStyles[status], 'overflow-hidden bg-barbershop-dark'].join(' ')}>
      <button
        type="button"
        onClick={onHeaderClick}
        disabled={!clickable}
        className={[
          'w-full flex items-center justify-between px-4 py-3',
          'border-b border-gray-700',
          clickable ? 'hover:bg-gray-800' : 'cursor-default'
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          <span className={['inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold', badgeStyles[status]].join(' ')}>
            {status === 'complete' ? '✓' : '•'}
          </span>
          <span className="text-white font-semibold">{title}</span>
        </div>
      </button>

      {status === 'current' && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  )
}

export default StepCard