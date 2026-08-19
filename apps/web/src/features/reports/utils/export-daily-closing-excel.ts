import type { DailyClosingResult } from '@/features/reports/types'
import { productSaleUnitAbrev } from '@/features/ventas/constants'

const thinBorder = {
  top: { style: 'thin' as const, color: { argb: 'FFEEEEEE' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFEEEEEE' } },
  left: { style: 'thin' as const, color: { argb: 'FFEEEEEE' } },
  right: { style: 'thin' as const, color: { argb: 'FFEEEEEE' } },
}

const headerBorder = {
  top: { style: 'thin' as const, color: { argb: 'FFDDDDDD' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFDDDDDD' } },
  left: { style: 'thin' as const, color: { argb: 'FFDDDDDD' } },
  right: { style: 'thin' as const, color: { argb: 'FFDDDDDD' } },
}

async function loadExcelJS() {
  const module = await import('exceljs')
  return module.default
}

function styleCell(
  cell: {
    value?: unknown
    font?: object
    fill?: object
    border?: object
    alignment?: object
    numFmt?: string
  },
  options?: { header?: boolean; bold?: boolean; money?: boolean }
) {
  cell.border = options?.header ? headerBorder : thinBorder
  if (options?.bold) {
    cell.font = { ...(cell.font ?? {}), bold: true }
  }
  if (options?.money) {
    cell.numFmt = '#,##0.00'
    cell.alignment = { horizontal: 'right' }
  }
}

function toMoney(value: string | number) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function formatDateLabel(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buyerLabel(customerName: string | null, guestName: string | null) {
  return customerName ?? guestName ?? 'Cliente'
}

function paymentTypeLabel(value: 'CASH' | 'CREDIT') {
  return value === 'CREDIT' ? 'Crédito' : 'Contado'
}

function expenseKindLabel(kind: 'expense' | 'machine_expense') {
  return kind === 'machine_expense' ? 'Gasto máquina' : 'Gasto empresa'
}

async function downloadWorkbook(workbook: import('exceljs').Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function writeTableHeader(
  sheet: import('exceljs').Worksheet,
  title: string,
  subtitle: string,
  headers: string[]
) {
  const lastCol = String.fromCharCode(64 + headers.length)
  sheet.mergeCells(`A1:${lastCol}1`)
  sheet.getCell('A1').value = title
  sheet.getCell('A1').font = { bold: true, size: 14 }

  sheet.mergeCells(`A2:${lastCol}2`)
  sheet.getCell('A2').value = subtitle
  sheet.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } }

  const headerRowIndex = 4
  const headerRow = sheet.getRow(headerRowIndex)
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = header
    cell.font = { bold: true }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' },
    }
    styleCell(cell, { header: true })
    sheet.getColumn(index + 1).width = Math.max(12, header.length + 2)
  })

  sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }]
  return headerRowIndex
}

function writeSummarySheet(sheet: import('exceljs').Worksheet, data: DailyClosingResult) {
  const summary = data.summary
  sheet.getColumn(1).width = 34
  sheet.getColumn(2).width = 18

  sheet.getCell('A1').value = 'Cierre diario'
  sheet.getCell('A1').font = { bold: true, size: 14 }
  sheet.getCell('A2').value = formatDateLabel(data.date)
  sheet.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } }
  sheet.getCell('A4').value =
    'Nota: las ventas a crédito no son ingreso de caja. Los abonos sí entran al resultado operativo.'

  const rows: Array<[string, number | string, boolean?]> = [
    ['Tickets', summary.tickets_count],
    ['Unidades vendidas', summary.units_sold],
    ['Ventas brutas (USD)', toMoney(summary.gross_sales_usd), true],
    ['Devoluciones (USD)', toMoney(summary.returns_usd), true],
    ['Ventas netas (USD)', toMoney(summary.net_sales_usd), true],
    ['Ventas contado (USD)', toMoney(summary.cash_sales_usd), true],
    ['Ventas crédito (USD)', toMoney(summary.credit_sales_usd), true],
    ['Pedidos a crédito', summary.credit_orders_count],
    ['Ganancia (USD)', toMoney(summary.profit_usd), true],
    ['Abonos cobrados (USD)', toMoney(summary.payments_total_usd), true],
    ['Cantidad de abonos', summary.payments_count],
    ['Gastos (USD)', toMoney(summary.expenses_total_usd), true],
    ['Cantidad de gastos', summary.expenses_count],
    ['Resultado operativo (USD)', toMoney(summary.operating_net_usd), true],
  ]

  rows.forEach(([label, value, money], index) => {
    const rowNumber = 6 + index
    const labelCell = sheet.getCell(`A${rowNumber}`)
    labelCell.value = label
    styleCell(labelCell, { bold: label.startsWith('Resultado') })

    const valueCell = sheet.getCell(`B${rowNumber}`)
    valueCell.value = value
    styleCell(valueCell, { money: Boolean(money), bold: label.startsWith('Resultado') })
  })
}

function writeDataSheet(
  sheet: import('exceljs').Worksheet,
  title: string,
  subtitle: string,
  headers: string[],
  rows: Array<Array<string | number>>,
  totalRow?: Array<string | number>
) {
  const headerRowIndex = writeTableHeader(sheet, title, subtitle, headers)
  let currentRow = headerRowIndex + 1

  rows.forEach((rowValues) => {
    const row = sheet.getRow(currentRow)
    rowValues.forEach((value, colIndex) => {
      const cell = row.getCell(colIndex + 1)
      cell.value = value
      const isMoney =
        typeof value === 'number' &&
        colIndex > 0 &&
        headers[colIndex]?.includes('USD')
      styleCell(cell, { money: isMoney })
    })
    currentRow += 1
  })

  if (totalRow) {
    const row = sheet.getRow(currentRow)
    totalRow.forEach((value, colIndex) => {
      const cell = row.getCell(colIndex + 1)
      cell.value = value
      const isMoney = typeof value === 'number'
      styleCell(cell, { bold: true, money: isMoney })
    })
  }
}

export async function exportDailyClosingExcel(data: DailyClosingResult) {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const subtitle = formatDateLabel(data.date)

  const summarySheet = workbook.addWorksheet('Resumen')
  writeSummarySheet(summarySheet, data)

  const ventasSheet = workbook.addWorksheet('Ventas')
  writeDataSheet(
    ventasSheet,
    'Ventas por ticket',
    subtitle,
    ['Código', 'Cliente', 'Tipo pago', 'Estado', 'Hora', 'Total neto USD'],
    data.orders.map((order) => [
      order.code,
      buyerLabel(order.customer_name, order.guest_name),
      paymentTypeLabel(order.payment_type),
      order.status,
      formatTime(order.confirmed_at),
      toMoney(order.net_total_usd),
    ]),
    ['TOTAL', '', '', '', '', toMoney(data.summary.net_sales_usd)]
  )

  const detalleSheet = workbook.addWorksheet('Detalle')
  writeDataSheet(
    detalleSheet,
    'Detalle por línea',
    subtitle,
    [
      'Ticket',
      'Cliente',
      'Tipo pago',
      'Producto',
      'Categoría',
      'Talla',
      'Cantidad',
      'Devuelta',
      'Neta',
      'Precio unit. USD',
      'Bruto USD',
      'Devolución USD',
      'Neto USD',
      'Costo USD',
      'Ganancia USD',
    ],
    data.sale_lines.map((line) => [
      line.order_code,
      buyerLabel(line.customer_name, line.guest_name),
      paymentTypeLabel(line.payment_type),
      line.product_name,
      line.category ?? '—',
      line.size ?? '—',
      line.quantity,
      line.returned_quantity,
      line.net_quantity,
      toMoney(line.unit_price_usd),
      toMoney(line.gross_usd),
      toMoney(line.returns_usd),
      toMoney(line.net_usd),
      toMoney(line.cost_usd),
      toMoney(line.profit_usd),
    ]),
    [
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      data.summary.units_sold,
      '',
      toMoney(data.summary.gross_sales_usd),
      toMoney(data.summary.returns_usd),
      toMoney(data.summary.net_sales_usd),
      '',
      toMoney(data.summary.profit_usd),
    ]
  )

  const productosSheet = workbook.addWorksheet('Productos')
  writeDataSheet(
    productosSheet,
    'Productos vendidos',
    subtitle,
    ['Producto', 'Categoría', 'Unidad', 'Cantidad', 'Precio prom. USD', 'Total USD'],
    data.products.map((product) => [
      product.name,
      product.category,
      productSaleUnitAbrev(product.sale_unit),
      product.quantity_sold,
      toMoney(product.unit_price_usd),
      toMoney(product.total_usd),
    ]),
    ['TOTAL', '', '', data.summary.units_sold, '', toMoney(data.summary.net_sales_usd)]
  )

  const abonosSheet = workbook.addWorksheet('Abonos')
  writeDataSheet(
    abonosSheet,
    'Abonos cobrados',
    subtitle,
    ['Cliente', 'Pedido', 'Cuenta', 'Monto USD'],
    data.payments.map((payment) => [
      payment.customer_name,
      payment.order_code ?? '—',
      payment.account_name ?? '—',
      toMoney(payment.amount_usd),
    ]),
    ['TOTAL', '', '', toMoney(data.summary.payments_total_usd)]
  )

  const gastosSheet = workbook.addWorksheet('Gastos')
  writeDataSheet(
    gastosSheet,
    'Gastos del día',
    subtitle,
    ['Tipo', 'Descripción', 'Detalle', 'Monto USD'],
    data.expenses.map((expense) => [
      expenseKindLabel(expense.kind),
      expense.description,
      expense.machine_name
        ? expense.category
          ? `${expense.machine_name} · ${expense.category}`
          : expense.machine_name
        : '—',
      toMoney(expense.amount_usd),
    ]),
    ['TOTAL', '', '', toMoney(data.summary.expenses_total_usd)]
  )

  const creditOrders = data.orders.filter((order) => order.payment_type === 'CREDIT')
  const creditosSheet = workbook.addWorksheet('Creditos')
  writeDataSheet(
    creditosSheet,
    'Ventas a crédito generadas',
    subtitle,
    ['Código', 'Cliente', 'Estado', 'Hora', 'Monto neto USD'],
    creditOrders.map((order) => [
      order.code,
      buyerLabel(order.customer_name, order.guest_name),
      order.status,
      formatTime(order.confirmed_at),
      toMoney(order.net_total_usd),
    ]),
    ['TOTAL', '', '', '', toMoney(data.summary.credit_sales_usd)]
  )

  await downloadWorkbook(workbook, `cierre-${data.date}.xlsx`)
}
