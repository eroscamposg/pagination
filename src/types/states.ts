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
}

export interface RootState {
  products: ProductsState
}
