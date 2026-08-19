export type AccountStatementMovementType = 'sale' | 'customer_payment' | 'purchase' | 'supplier_payment' | 'expense' | 'machine_expense'



export type AccountStatementMovement = {

  id: number

  type: AccountStatementMovementType

  date: string

  label: string

  account: { id: number; name: string } | null

  amountNative: string

  currencyCode: string

  amountDisplay: string

  amountUsd: string

  isIncome: boolean

  referenceId: number

  status?: string

  isCreditPurchase?: boolean

  isCreditPurchaseCarryover?: boolean

  creditDueDate?: string | null

  purchaseDate?: string

  creditOverdue?: boolean

  creditReportStatus?: 'pending' | 'overdue' | 'settled'

  isCreditSale?: boolean

  creditBalanceUsd?: string

  saleDate?: string

  customerId?: number

  supplierId?: number

}



export type AccountStatementSummary = {

  displayCurrency: string

  salesUsd: string

  purchasesUsd: string

  expensesUsd: string

  machineExpensesUsd: string

  netUsd: string

  sales: string

  purchases: string

  expenses: string

  machineExpenses: string

  net: string

  rates: Record<string, string>

}



export type AccountStatementParams = {

  from?: string

  to?: string

  month?: string

  account_id?: number

  unassigned?: boolean

  display_currency?: string

  types?: Array<'purchases' | 'expenses' | 'machine_expenses' | 'sales'>

}



export type AccountStatementResponse = {

  data: {

    period: { from: string; to: string }

    summary: AccountStatementSummary

    movements: AccountStatementMovement[]

  }

}

export type DailyClosingSummary = {
  date: string
  tickets_count: number
  units_sold: number
  gross_sales_usd: string
  returns_usd: string
  net_sales_usd: string
  cash_sales_usd: string
  credit_sales_usd: string
  credit_orders_count: number
  profit_usd: string
  payments_count: number
  payments_total_usd: string
  expenses_count: number
  expenses_total_usd: string
  operating_net_usd: string
}

export type DailyClosingOrderItem = {
  id: number
  code: string
  customer_name: string | null
  guest_name: string | null
  payment_type: 'CASH' | 'CREDIT'
  status: string
  net_total_usd: string
  confirmed_at: string | null
}

export type DailyClosingPaymentItem = {
  id: number
  customer_name: string
  order_code: string | null
  amount_usd: string
  account_name: string | null
}

export type DailyClosingExpenseItem = {
  id: number
  kind: 'expense' | 'machine_expense'
  description: string
  amount_usd: string
  machine_name: string | null
  category: string | null
}

export type DailyClosingProductItem = {
  id: number
  name: string
  category: string
  sale_unit: string
  quantity_sold: number
  unit_price_usd: string
  total_usd: string
}

export type DailyClosingSaleLineItem = {
  order_id: number
  order_code: string
  confirmed_at: string | null
  payment_type: 'CASH' | 'CREDIT'
  status: string
  customer_name: string | null
  guest_name: string | null
  product_id: number | null
  product_name: string
  category: string | null
  size: string | null
  quantity: number
  returned_quantity: number
  net_quantity: number
  unit_price_usd: string
  gross_usd: string
  returns_usd: string
  net_usd: string
  cost_usd: string
  profit_usd: string
}

export type DailyClosingResult = {
  date: string
  summary: DailyClosingSummary
  orders: DailyClosingOrderItem[]
  payments: DailyClosingPaymentItem[]
  expenses: DailyClosingExpenseItem[]
  products: DailyClosingProductItem[]
  sale_lines: DailyClosingSaleLineItem[]
}

export type DailyClosingResponse = {
  data: DailyClosingResult
}
