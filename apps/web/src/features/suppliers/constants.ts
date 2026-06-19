export function supplierImagePath(supplierId: number) {
  return `/suppliers/${supplierId}/image`
}

/** @deprecated Usar supplierImagePath con AuthenticatedImage o useAuthenticatedAsset */
export function supplierImageUrl(supplierId: number) {
  return supplierImagePath(supplierId)
}
