import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PanelHeader } from '@/components/layout/panel-header'
import { PROFIT_MARGIN_PANEL_ID, type PurchasesHubTab } from '@/features/purchases/constants'
import { PurchasesHubCards } from '@/features/purchases/components/purchases-hub-cards'
import {
  PURCHASES_HUB_PANEL_EXIT_MS,
  PurchasesHubPanelTransition,
} from '@/features/purchases/components/purchases-hub-panel-transition'
import { usePurchasesSummaryQuery } from '@/features/purchases/hooks/use-purchases'
import { useExpensesSummaryQuery } from '@/features/purchases/hooks/use-expenses'
import { useExchangeRateQuery, useProfitMarginQuery } from '@/features/purchases/hooks/use-settings'

function parseTab(value: string | null): PurchasesHubTab {
  if (value === 'gastos' || value === 'config') {
    return value
  }
  return 'compras'
}

function shouldScrollToProfitMargin(
  hash: string,
  highlightProductId: number | undefined
) {
  return hash === `#${PROFIT_MARGIN_PANEL_ID}` || highlightProductId != null
}

function scrollToProfitMarginPanel() {
  const panel = document.getElementById(PROFIT_MARGIN_PANEL_ID)
  if (!panel) {
    return false
  }
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}

export function PurchasesPage() {
  const [searchParams] = useSearchParams()
  const highlightProductId = Number(searchParams.get('productId') || 0) || undefined
  const [activeTab, setActiveTab] = useState<PurchasesHubTab>(() => parseTab(searchParams.get('tab')))

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get('tab')))
  }, [searchParams])

  useEffect(() => {
    if (activeTab !== 'config') {
      return
    }
    if (!shouldScrollToProfitMargin(window.location.hash, highlightProductId)) {
      return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 12
    const timerIds: number[] = []

    const tryScroll = () => {
      if (cancelled) {
        return
      }
      attempts += 1
      if (scrollToProfitMarginPanel() || attempts >= maxAttempts) {
        return
      }
      timerIds.push(window.setTimeout(tryScroll, 50))
    }

    timerIds.push(window.setTimeout(tryScroll, PURCHASES_HUB_PANEL_EXIT_MS + 50))

    return () => {
      cancelled = true
      timerIds.forEach((id) => window.clearTimeout(id))
    }
  }, [activeTab, highlightProductId, searchParams])

  const purchasesQueryState = usePurchasesSummaryQuery()
  const expensesQueryState = useExpensesSummaryQuery()
  const exchangeRateQueryState = useExchangeRateQuery()
  const profitMarginQueryState = useProfitMarginQuery()

  const {
    data: purchasesSummary,
    isLoading: loadingPurchases,
    isError: purchasesError,
    error: purchasesQueryError,
  } = purchasesQueryState
  const {
    data: expensesSummary,
    isLoading: loadingExpenses,
    isError: expensesError,
    error: expensesQueryError,
  } = expensesQueryState
  const {
    data: exchangeRate,
    isLoading: loadingRate,
    isError: exchangeRateError,
    error: exchangeRateQueryError,
  } = exchangeRateQueryState
  const {
    data: profitMargin,
    isLoading: loadingMargin,
    isError: profitMarginError,
    error: profitMarginQueryError,
  } = profitMarginQueryState

  const configLoading = loadingRate || loadingMargin
  const configError = exchangeRateError || profitMarginError
  const configQueryError = exchangeRateError ? exchangeRateQueryError : profitMarginQueryError

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader
        title="Compras"
        description="Compras a proveedores, gastos de empresa y tasa de cambio global."
      />

      <PurchasesHubCards
        activeTab={activeTab}
        onTabChange={setActiveTab}
        purchasesSummary={purchasesSummary}
        expensesSummary={expensesSummary}
        exchangeRate={exchangeRate}
        profitMargin={profitMargin}
        purchasesQuery={{
          isLoading: loadingPurchases,
          isError: purchasesError,
          error: purchasesQueryError,
        }}
        expensesQuery={{
          isLoading: loadingExpenses,
          isError: expensesError,
          error: expensesQueryError,
        }}
        configQuery={{
          isLoading: configLoading,
          isError: configError,
          error: configQueryError,
        }}
      />

      <PurchasesHubPanelTransition
        activeTab={activeTab}
        highlightProductId={highlightProductId}
      />
    </div>
  )
}
