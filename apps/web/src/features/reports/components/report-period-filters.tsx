import { CalendarRange } from 'lucide-react'
import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { currentMonthIso, previousMonthIso, todayIso } from '@/features/reports/constants'
import type { ReportPeriodMode, ReportPeriodState } from '@/features/reports/report-period'
import { reportUi } from '@/features/reports/report-ui'
import { cn } from '@/lib/utils'

type ReportPeriodFiltersProps = {
  value: ReportPeriodState
  onChange: (value: ReportPeriodState) => void
  className?: string
}

export function ReportPeriodFilters({ value, onChange, className }: ReportPeriodFiltersProps) {
  function setMode(mode: ReportPeriodMode) {
    if (mode === 'month') {
      onChange({ ...value, mode, month: value.month || currentMonthIso() })
      return
    }
    if (mode === 'day') {
      onChange({ ...value, mode, date: value.date || todayIso() })
      return
    }
    if (mode === 'range') {
      const today = todayIso()
      onChange({
        ...value,
        mode,
        from: value.from || today,
        to: value.to || today,
      })
      return
    }
    onChange({ ...value, mode })
  }

  function applyThisMonth() {
    onChange({
      ...value,
      mode: 'month',
      month: currentMonthIso(),
    })
  }

  function applyPreviousMonth() {
    onChange({
      ...value,
      mode: 'month',
      month: previousMonthIso(),
    })
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className={reportUi.pillTrack}>
        <PeriodPill active={value.mode === 'month' && value.month === currentMonthIso()} onClick={applyThisMonth}>
          Este mes
        </PeriodPill>
        <PeriodPill
          active={value.mode === 'month' && value.month === previousMonthIso()}
          onClick={applyPreviousMonth}
        >
          Mes anterior
        </PeriodPill>
        <PeriodPill active={value.mode === 'day'} onClick={() => setMode('day')}>
          Día
        </PeriodPill>
        <PeriodPill active={value.mode === 'range'} onClick={() => setMode('range')}>
          Rango
        </PeriodPill>
      </div>

      {value.mode === 'day' ? (
        <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5">
          <CalendarRange className="size-4 text-neutral-500" />
          <Input
            type="date"
            value={value.date}
            onChange={(e) => onChange({ ...value, mode: 'day', date: e.target.value })}
            className="h-7 w-[140px] border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
      ) : null}

      {value.mode === 'range' ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, mode: 'range', from: e.target.value })}
            className={cn(reportUi.input, 'w-[140px]')}
          />
          <span className={reportUi.muted}>—</span>
          <Input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, mode: 'range', to: e.target.value })}
            className={cn(reportUi.input, 'w-[140px]')}
          />
        </div>
      ) : null}

      {value.mode === 'month' ? (
        <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5">
          <CalendarRange className="size-4 text-neutral-500" />
          <Input
            type="month"
            value={value.month}
            onChange={(e) => onChange({ ...value, mode: 'month', month: e.target.value })}
            className="h-7 w-[130px] border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
      ) : null}
    </div>
  )
}

function PeriodPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className={active ? reportUi.pillActive : reportUi.pillInactive}>
      {children}
    </button>
  )
}
