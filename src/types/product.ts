export interface Product {
  id: number
  title: string
  price: number
  category: string
}

export interface ApiPageResponse {
  data: Product[]
  meta: {
    page: number
    totalPages: number
    totalItems: number
  }
}
