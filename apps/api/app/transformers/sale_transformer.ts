import type Sale from '#models/sale'
import type SaleLine from '#models/sale_line'
import { serializeCustomerResumen } from '#transformers/customer_transformer'

export function serializeSale(sale: Sale) {
  return {
    id: Number(sale.id),
    code: sale.code,
    customer_id: sale.customerId ? Number(sale.customerId) : null,
    guest_name: sale.guestName,
    payment_method: sale.paymentMethod,
    total_usd: sale.totalUsd,
    total_bs: sale.totalBs,
    usd_rate: sale.usdRate,
    status: sale.status,
    sold_at: sale.soldAt.toISO(),
    customer: sale.customer ? serializeCustomerResumen(sale.customer) : null,
    lines: sale.saleLines?.map(serializeSaleLine),
    created_at: sale.createdAt.toISO(),
    updated_at: sale.updatedAt.toISO(),
  }
}

export function serializeSaleListItem(sale: Sale) {
  return {
    id: Number(sale.id),
    code: sale.code,
    customer_id: sale.customerId ? Number(sale.customerId) : null,
    guest_name: sale.guestName,
    payment_method: sale.paymentMethod,
    total_usd: sale.totalUsd,
    total_bs: sale.totalBs,
    status: sale.status,
    sold_at: sale.soldAt.toISO(),
    customer: sale.customer ? serializeCustomerResumen(sale.customer) : null,
  }
}

export function serializeSaleLine(line: SaleLine) {
  return {
    id: Number(line.id),
    catalog_product_id: line.catalogProductId ? Number(line.catalogProductId) : null,
    material_id: line.materialId ? Number(line.materialId) : null,
    description: line.description,
    quantity: line.quantity,
    unit_price_usd: line.unitPriceUsd,
    subtotal_usd: line.subtotalUsd,
    catalog_product: line.catalogProduct
      ? { id: Number(line.catalogProduct.id), name: line.catalogProduct.name }
      : null,
    material: line.material
      ? { id: Number(line.material.id), name: line.material.name, code: line.material.code }
      : null,
  }
}
