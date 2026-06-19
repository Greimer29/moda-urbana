import type { ReactNode } from 'react'
import { Receipt, Settings, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { formatAmountNumber } from '@/features/currencies/utils/convert-currency'
import type { PurchasesHubTab } from '@/features/purchases/constants'
import type { ExpenseSummary, PurchaseSummary } from '@/features/purchases/types'
import { cn } from '@/lib/utils'

type PurchasesHubCardsProps = {
  activeTab: PurchasesHubTab
  onTabChange: (tab: PurchasesHubTab) => void
  purchasesSummary?: PurchaseSummary
  expensesSummary?: ExpenseSummary
  exchangeRate?: string | null
  profitMargin?: string | null
  isLoading?: boolean
}

export function PurchasesHubCards({
  activeTab,
  onTabChange,
  purchasesSummary,
  expensesSummary,
  exchangeRate,
  profitMargin,
  isLoading,
}: PurchasesHubCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <HubCard
        active={activeTab === 'compras'}
        onClick={() => onTabChange('compras')}
        icon={<Receipt className="size-5" />}
        title="Compras realizadas"
        kpis={[
          {
            label: 'Total compras',
            value: <DisplayMoneyFromUsd amountUsd={purchasesSummary?.totalUsd ?? '0'} />,
          },
          {
            label: 'Confirmadas',
            value: purchasesSummary
              ? `${purchasesSummary.confirmedPercent.toFixed(0)}%`
              : '—',
          },
          {
            label: 'Registradas',
            value: purchasesSummary ? String(purchasesSummary.count) : '—',
          },
        ]}
        isLoading={isLoading}
      />

      <HubCard
        active={activeTab === 'gastos'}
        onClick={() => onTabChange('gastos')}
        icon={<Wallet className="size-5" />}
        title="Gastos"
        kpis={[
          {
            label: 'Total gastos',
            value: <DisplayMoneyFromUsd amountUsd={expensesSummary?.totalUsd ?? '0'} />,
          },
          {
            label: 'Registrados',
            value: expensesSummary ? String(expensesSummary.count) : '—',
          },
          {
            label: 'Esta semana',
            value: <DisplayMoneyFromUsd amountUsd={expensesSummary?.weeklySpentUsd ?? '0'} />,
          },
        ]}
        isLoading={isLoading}
      />

      <HubCard
        active={activeTab === 'config'}
        onClick={() => onTabChange('config')}
        icon={<Settings className="size-5" />}
        title="Configuración"
        kpis={[
          {
            label: 'Tasa Bs/USD',
            value: exchangeRate
              ? formatAmountNumber(Number(exchangeRate), 'VES')
              : 'Sin configurar',
          },
          {
            label: 'Ganancia',
            value:
              profitMargin !== null && profitMargin !== undefined
                ? `${Number(profitMargin).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                : 'Sin configurar',
          },
        ]}
        isLoading={isLoading}
      />
    </div>
  )
}

type HubCardProps = {
  active: boolean
  onClick: () => void
  icon: ReactNode
  title: string
  kpis: Array<{ label: string; value: ReactNode; danger?: boolean }>
  isLoading?: boolean
}

function HubCard({ active, onClick, icon, title, kpis, isLoading }: HubCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left focus:outline-none"
    >
      <Card
        className={cn(
          'purchases-hub-card aspect-[15/7] h-full border shadow-none',
          active && 'purchases-hub-card--active'
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Cargando…</p>
          ) : (
            kpis.map((kpi) => (
              <div key={kpi.label} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{kpi.label}</span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    kpi.danger && 'text-destructive'
                  )}
                >
                  {kpi.value}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </button>
  )
}
