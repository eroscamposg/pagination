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
