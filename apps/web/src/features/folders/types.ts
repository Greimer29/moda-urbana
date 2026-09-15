export type ProductFolder = {
  id: number
  name: string
  sort_order: number
  products_count: number
  created_at: string
  updated_at: string
}

export type ProductFolderInput = {
  name: string
  sort_order?: number
}
