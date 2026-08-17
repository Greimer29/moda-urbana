import type {
  InventoryMovementRow,
  InventoryProductSummary,
  InventoryReportProduct,
} from '@/features/reports/types/inventory-report'
import { productSaleUnitAbrev } from '@/features/ventas/constants'
import { INVENTORY_MOVEMENT_LABELS } from '@/features/reports/utils/inventory-movement-labels'

type A4SheetOptions = {
  title: string
  filterSummary: string
  headers: string[]
  rows: Array<Array<string | number>>
  filename: string
}

async function loadExcelJS() {
  const module = await import('exceljs')
  return module.default
}

async function downloadA4Workbook(options: A4SheetOptions) {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Reporte', {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    },
  })

  sheet.mergeCells('A1', `${String.fromCharCode(64 + options.headers.length)}1`)
  sheet.getCell('A1').value = options.title
  sheet.getCell('A1').font = { bold: true, size: 14 }

  sheet.mergeCells('A2', `${String.fromCharCode(64 + options.headers.length)}2`)
  sheet.getCell('A2').value = options.filterSummary
  sheet.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } }

  const headerRowIndex = 4
  const headerRow = sheet.getRow(headerRowIndex)
  options.headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = header
    cell.font = { bold: true }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' },
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    }
  })

  options.rows.forEach((rowValues, rowOffset) => {
    const row = sheet.getRow(headerRowIndex + 1 + rowOffset)
    rowValues.forEach((value, colIndex) => {
      const cell = row.getCell(colIndex + 1)
      cell.value = value
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
        right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      }
    })
  })

  options.headers.forEach((_, index) => {
    sheet.getColumn(index + 1).width = Math.max(12, options.headers[index]?.length ?? 10)
  })

  sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = options.filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function exportInventorySnapshotExcel(
  products: InventoryReportProduct[],
  filterSummary: string,
  formatMoney: (amountUsd: string | null | undefined) => string
) {
  const rows = products.flatMap((product) =>
    product.lines.map((line) => ({
      code: product.code,
      description: product.description,
      size: line.size,
      quantity: line.quantity,
      unit: productSaleUnitAbrev(product.sale_unit),
      sale_price_usd: product.sale_price_usd,
      cost_usd: product.cost_usd,
      category: product.category,
    }))
  )

  await downloadA4Workbook({
    title: 'Reporte de inventario',
    filterSummary,
    filename: `inventario-${new Date().toISOString().slice(0, 10)}.xlsx`,
    headers: ['Código', 'Descripción', 'Talla', 'Cantidad', 'Unidad', 'Precio', 'Costo', 'Categoría'],
    rows: rows.map((row) => [
      row.code,
      row.description,
      row.size ?? '—',
      Number(row.quantity),
      row.unit,
      formatMoney(row.sale_price_usd),
      formatMoney(row.cost_usd),
      row.category,
    ]),
  })
}

export async function exportInventoryMovementsExcel(
  product: InventoryProductSummary,
  movements: InventoryMovementRow[],
  filterSummary: string,
  formatQuantity: (quantity: string, unit: string) => string
) {
  await downloadA4Workbook({
    title: `Movimientos — ${product.code} ${product.description}`,
    filterSummary,
    filename: `movimientos-${product.code}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    headers: ['Fecha', 'Tipo', 'Cantidad', 'Referencia', 'Detalle'],
    rows: movements.map((movement) => [
      new Date(movement.created_at).toLocaleString('es-VE'),
      INVENTORY_MOVEMENT_LABELS[movement.type] ?? movement.type,
      formatQuantity(movement.quantity, product.sale_unit),
      movement.order_code ??
        (movement.order_id ? `Pedido #${movement.order_id}` : null) ??
        (movement.sale_id ? `Venta #${movement.sale_id}` : null) ??
        (movement.purchase_id ? `Compra #${movement.purchase_id}` : null) ??
        '—',
      movement.note ?? '—',
    ]),
  })
}
