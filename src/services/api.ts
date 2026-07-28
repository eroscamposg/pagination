import type { FetchParams } from '@/types/api'
import type { ApiPageResponse, Product } from '@/types/product'

const ALL_PRODUCTS: Product[] = Array.from({ length: 47 }, (_, i) => ({
  id: i + 1,
  title: `Product ${i + 1}`,
  price: Math.round((5 + Math.random() * 95) * 100) / 100,
  category: i % 3 === 0 ? 'shoes' : i % 3 === 1 ? 'shirts' : 'hats',
}))

export function mockFetchProducts(params: FetchParams): Promise<ApiPageResponse> {
  const pageSize = params.pageSize ?? 10

  console.log('params: ', params)

  let filtered = ALL_PRODUCTS

  if (params.category) {
    filtered = filtered.filter((p) => p.category === params.category)
  }

  if (params.search) {
    const q = params.search.toLowerCase()
    filtered = filtered.filter((p) => p.title.toLowerCase().includes(q))
  }

  const totalItems = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const start = (params.page - 1) * pageSize
  const pageData = filtered.slice(start, start + pageSize)

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Uncomment to simulate an error path:
      // if (params.page === 2) return reject(new Error('Network error'))

      resolve({
        data: pageData,
        meta: {
          page: params.page,
          totalPages,
          totalItems,
        },
      })
    }, 400)
  })
}

// Mock PATCH endpoint — updates a single product. Rejects if the new price
// is negative, so we have an easy way to demo the rollback path.
export function mockUpdateProduct(
  id: number,
  patch: Partial<Pick<Product, 'title' | 'price'>>,
): Promise<Product> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = ALL_PRODUCTS.findIndex((p) => p.id === id)
      const existing = ALL_PRODUCTS[index]

      if (index === -1 || !existing) return reject(new Error(`Product ${id} not found`))

      if (patch.price !== undefined && patch.price < 0) {
        return reject(new Error('Price cannot be negative'))
      }

      // Added existing and type check with existing
      ALL_PRODUCTS[index] = { ...existing, ...patch }

      resolve(ALL_PRODUCTS[index])
    }, 500) // deliberately slower than the read, so the optimistic gap is visible
  })
}
