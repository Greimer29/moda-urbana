import { api } from '@/lib/api'
import type { ProductFolder, ProductFolderInput } from '@/features/folders/types'

type FoldersListResponse = {
  data: {
    product_folders: ProductFolder[]
  }
}

type FolderResponse = {
  data: {
    product_folder: ProductFolder
  }
}

export async function listProductFolders() {
  const { data } = await api.get<FoldersListResponse>('/product-folders')
  return data.data.product_folders
}

export async function createProductFolder(payload: ProductFolderInput) {
  const { data } = await api.post<FolderResponse>('/product-folders', payload)
  return data.data.product_folder
}

export async function updateProductFolder(id: number, payload: Partial<ProductFolderInput>) {
  const { data } = await api.put<FolderResponse>(`/product-folders/${id}`, payload)
  return data.data.product_folder
}

export async function deleteProductFolder(id: number) {
  const { data } = await api.delete<{ data: { id: number; eliminado: true } }>(
    `/product-folders/${id}`
  )
  return data.data
}

export async function addProductToFolder(folderId: number, catalogProductId: number) {
  const { data } = await api.post(`/product-folders/${folderId}/products`, {
    catalog_product_id: catalogProductId,
  })
  return data.data
}

export async function removeProductFromFolder(folderId: number, catalogProductId: number) {
  const { data } = await api.delete(
    `/product-folders/${folderId}/products/${catalogProductId}`
  )
  return data.data
}
