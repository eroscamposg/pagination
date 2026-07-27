import type { FetchParams } from '@/types/api'
import type { ListState, ProductsState } from '@/types/states'

// ----------------------------------------------------------------------------
// 3. Helper — builds a stable, unique key per "view/query" so that
//    different list views never collide in state.lists.
// ----------------------------------------------------------------------------
export function buildListKey(params: Omit<FetchParams, 'page' | 'pageSize'>) {
  const category = params.category ?? 'all'
  const search = params.search ?? ''

  return `products:category=${category}:search=${search}`
}

// ----------------------------------------------------------------------------
// 3b. Helper — resolves a list and asserts it exists. Mutations always run
//     ENSURE_LIST first, so a missing list here means a real bug (a mutation
//     called out of order) — better to throw loudly than silently no-op
//     behind an optional chain.
// ----------------------------------------------------------------------------

export function getListOrThrow(lists: ProductsState['lists'], listKey: string): ListState {
  const list = lists[listKey]
  if (!list) {
    throw new Error(`[products] list "${listKey}" not initialized — call ENSURE_LIST first`)
  }
  return list
}
