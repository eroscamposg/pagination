import type { Product } from './product'

export interface ListState {
  idsByPage: Record<number, number[]>
  currentPage: number
  totalPages: number
  totalItems: number
  status: 'idle' | 'loading' | 'success' | 'error'
  error: string | null
}

export interface ProductsState {
  entities: Record<number, Product>
  lists: Record<string, ListState>
  // IDs currently being saved via an optimistic update — lets the UI
  // disable inputs / show a spinner without a separate loading state
  // per field.
  pendingIds: Record<number, boolean>
}

export interface RootState {
  products: ProductsState
}
