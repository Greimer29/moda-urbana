import type {
  InventoryMovementRow,
  InventoryProductSummary,
  InventoryReportProduct,
} from '@/features/reports/types/inventory-report'
import { productSaleUnitAbrev } from '@/features/ventas/constants'
import { INVENTORY_MOVEMENT_LABELS } from '@/features/reports/utils/inventory-movement-labels'
import { inventoryLineSizeLabel } from '@/features/reports/utils/inventory-line-size'
import { todayIsoDate } from '@/lib/app-timezone'

type A4SheetOptions = {
  title: string
  filterSummary: string
  headers: string[]
  rows: Array<Array<string | number>>
  filename: string
}

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

function formatQty(value: string) {
  const num = Number(value)
  return Number.isInteger(num) ? num : Number(num.toFixed(3))
}

function styleCell(
  cell: {
    value?: unknown
    font?: object
    fill?: object
    border?: object
    alignment?: object
  },
  options?: { header?: boolean; merged?: boolean }
) {
  cell.border = options?.header ? headerBorder : thinBorder
  if (options?.merged) {
    cell.alignment = { vertical: 'middle', wrapText: true }
  }
}

async function downloadWorkbookBuffer(
  sheet: import('exceljs').Worksheet,
  filename: string
) {
  const buffer = await sheet.workbook.xlsx.writeBuffer()
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

function writeSheetHeader(
  sheet: import('exceljs').Worksheet,
  title: string,
  filterSummary: string,
  headers: string[]
) {
  const lastCol = String.fromCharCode(64 + headers.length)

  sheet.mergeCells(`A1:${lastCol}1`)
  sheet.getCell('A1').value = title
  sheet.getCell('A1').font = { bold: true, size: 14 }

  sheet.mergeCells(`A2:${lastCol}2`)
  sheet.getCell('A2').value = filterSummary
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
  })

  headers.forEach((header, index) => {
    sheet.getColumn(index + 1).width = Math.max(12, header.length + 2)
  })

  sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }]

  return headerRowIndex
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

  const headerRowIndex = writeSheetHeader(sheet, options.title, options.filterSummary, options.headers)

  options.rows.forEach((rowValues, rowOffset) => {
    const row = sheet.getRow(headerRowIndex + 1 + rowOffset)
    rowValues.forEach((value, colIndex) => {
      const cell = row.getCell(colIndex + 1)
      cell.value = value
      styleCell(cell)
    })
  })

  await downloadWorkbookBuffer(sheet, options.filename)
}

async function downloadGroupedInventoryWorkbook(
  products: InventoryReportProduct[],
  filterSummary: string,
  formatMoney: (amountUsd: string | null | undefined) => string
) {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const headers = ['Código', 'Tipo', 'Descripción', 'Talla', 'Cantidad', 'Unidad', 'Precio', 'Costo', 'Categoría']

  const sheet = workbook.addWorksheet('Inventario', {
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

  const headerRowIndex = writeSheetHeader(
    sheet,
    'Reporte de inventario',
    filterSummary,
    headers
  )

  sheet.getColumn(1).width = 12
  sheet.getColumn(2).width = 12
  sheet.getColumn(3).width = 36
  sheet.getColumn(4).width = 10
  sheet.getColumn(5).width = 10
  sheet.getColumn(6).width = 10
  sheet.getColumn(7).width = 14
  sheet.getColumn(8).width = 14
  sheet.getColumn(9).width = 14

  let currentRow = headerRowIndex + 1

  for (const product of products) {
    const lineCount = product.lines.length
    const unitLabel = productSaleUnitAbrev(product.sale_unit)
    const startRow = currentRow
    const endRow = currentRow + lineCount - 1

    const descriptionLines = [product.description, product.category]
    if (product.has_sizes && lineCount > 1) {
      descriptionLines.push(`${lineCount} tallas · total ${formatQty(product.total_quantity)}`)
    }

    if (lineCount > 1) {
      sheet.mergeCells(startRow, 1, endRow, 1)
      sheet.mergeCells(startRow, 2, endRow, 2)
      sheet.mergeCells(startRow, 3, endRow, 3)
      sheet.mergeCells(startRow, 7, endRow, 7)
      sheet.mergeCells(startRow, 8, endRow, 8)
      sheet.mergeCells(startRow, 9, endRow, 9)
    }

    product.lines.forEach((line, lineIndex) => {
      const rowNumber = startRow + lineIndex
      const row = sheet.getRow(rowNumber)

      if (lineIndex === 0) {
        const codeCell = row.getCell(1)
        codeCell.value = product.code
        styleCell(codeCell, { merged: lineCount > 1 })

        const kindCell = row.getCell(2)
        kindCell.value = product.kind === 'material' ? 'Material' : 'Producto'
        styleCell(kindCell, { merged: lineCount > 1 })

        const descCell = row.getCell(3)
        descCell.value = descriptionLines.join('\n')
        styleCell(descCell, { merged: lineCount > 1 })

        const priceCell = row.getCell(7)
        priceCell.value = formatMoney(product.sale_price_usd)
        styleCell(priceCell, { merged: lineCount > 1 })

        const costCell = row.getCell(8)
        costCell.value = product.cost_usd ? formatMoney(product.cost_usd) : '—'
        styleCell(costCell, { merged: lineCount > 1 })

        const categoryCell = row.getCell(9)
        categoryCell.value = product.category
        styleCell(categoryCell, { merged: lineCount > 1 })
      }

      const sizeCell = row.getCell(4)
      sizeCell.value = inventoryLineSizeLabel(line)
      styleCell(sizeCell)

      const qtyCell = row.getCell(5)
      qtyCell.value = formatQty(line.quantity)
      qtyCell.alignment = { horizontal: 'right' }
      styleCell(qtyCell)

      const unitCell = row.getCell(6)
      unitCell.value = unitLabel
      styleCell(unitCell)
    })

    currentRow = endRow + 1
  }

  await downloadWorkbookBuffer(
    sheet,
    `inventario-${todayIsoDate()}.xlsx`
  )
}

export async function exportInventorySnapshotExcel(
  products: InventoryReportProduct[],
  filterSummary: string,
  formatMoney: (amountUsd: string | null | undefined) => string
) {
  await downloadGroupedInventoryWorkbook(products, filterSummary, formatMoney)
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
    filename: `movimientos-${product.code}-${todayIsoDate()}.xlsx`,
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
