const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export function supplierImageUrl(supplierId: number) {
  return `${apiUrl}/api/v1/suppliers/${supplierId}/image`
}
