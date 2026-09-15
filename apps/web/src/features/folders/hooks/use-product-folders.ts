import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addProductToFolder,
  createProductFolder,
  deleteProductFolder,
  listProductFolders,
  removeProductFromFolder,
  updateProductFolder,
} from '@/features/folders/services/folder-service'
import type { ProductFolderInput } from '@/features/folders/types'

export const productFoldersQueryKey = ['product-folders'] as const

export function useProductFoldersQuery() {
  return useQuery({
    queryKey: productFoldersQueryKey,
    queryFn: listProductFolders,
  })
}

export function useCreateProductFolderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ProductFolderInput) => createProductFolder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productFoldersQueryKey })
    },
  })
}

export function useUpdateProductFolderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ProductFolderInput> }) =>
      updateProductFolder(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productFoldersQueryKey })
    },
  })
}

export function useDeleteProductFolderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteProductFolder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productFoldersQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
    },
  })
}

export function useAddProductToFolderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      folderId,
      catalogProductId,
    }: {
      folderId: number
      catalogProductId: number
    }) => addProductToFolder(folderId, catalogProductId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productFoldersQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
    },
  })
}

export function useRemoveProductFromFolderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      folderId,
      catalogProductId,
    }: {
      folderId: number
      catalogProductId: number
    }) => removeProductFromFolder(folderId, catalogProductId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productFoldersQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['catalog-products'] })
    },
  })
}
