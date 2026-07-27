import type { FetchParams } from '@/types/api'

export function buildListKey(params: Omit<FetchParams, 'page' | 'pageSize'>) {
  const category = params.category ?? 'all'
  const search = params.search ?? ''

  return `products:category=${category}:search=${search}`
}
