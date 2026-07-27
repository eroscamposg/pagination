import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ListState, ProductsState } from '@/types/states'
import type { Product } from '@/types/product'
import { buildListKey } from '@/helpers/keyBuilder'
import { mockFetchProducts } from '@/services/api'

export const useProductStore = defineStore('product', {
  state: (): ProductsState => ({
    entities: {},
    lists: {},
  }),
  getters: {
    // Resolves IDs -> full objects for whatever page a list is currently on.
    currentPageItems:
      (state) =>
      (listKey: string): Product[] => {
        const list = state.lists[listKey]
        if (!list) return []
        const ids = list.idsByPage[list.currentPage] ?? []
        // NOTE: Type predicate...
        return ids.map((id) => state.entities[id]).filter((p): p is Product => p !== undefined)
      },
    listMeta:
      (state) =>
      (listKey: string): ListState | undefined => {
        return state.lists[listKey]
      },

    // Handy for interview follow-ups: "has this page already been fetched?"
    isPageCached:
      (state) =>
      (listKey: string, page: number): boolean => {
        return Boolean(state.lists[listKey]?.idsByPage[page])
      },
  },
  actions: {
    // MUTATIONS
    SET_ENTITIES(items: Product[]) {
      items.forEach((item) => {
        // Merge, don't replace — preserves any fields set optimistically
        // elsewhere (useful once we add optimistic updates).
        this.entities[item.id] = {
          ...this.entities[item.id],
          ...item,
        }
      })
    },
    ENSURE_LIST(listKey: string) {
      if (!this.lists[listKey]) {
        this.lists[listKey] = {
          idsByPage: {},
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          status: 'idle',
          error: null,
        }
      }
    },
    SET_LIST_STATUS(listKey: string, status: ListState['status'], error?: string | null) {
      this.lists[listKey]?.status = status
      this.lists[listKey]?.error = error
    },
    SET_LIST_PAGE(
      listKey: string,
      page: number,
      ids: number[],
      totalPages: number,
      totalItems: number,
    ) {
      const list = this.lists[listKey]
      list.idsByPage[page] = ids
      list.currentPage = page
      list.totalPages = totalPages
      list.totalItems = totalItems
    },

    // ACTIONS
    async fetchPage(payload: {
      category?: string
      search?: string
      page: number
      forceRefresh?: boolean
    }) {
      const listKey = buildListKey(payload)
      this.ENSURE_LIST(listKey)

      // Cache hit — skip the network call unless caller forces a refresh.
      const alreadyCached = Boolean(this.lists[listKey]?.idsByPage[payload.page])
      if (alreadyCached && !payload.forceRefresh) {
        this.lists[listKey]?.currentPage = payload.page
        return
      }

      this.SET_LIST_STATUS(listKey, 'loading')

      try {
        const res = await mockFetchProducts(payload)

        this.SET_ENTITIES(res.data)
        this.SET_LIST_PAGE(
          listKey,
          res.meta.page,
          res.data.map((p) => p.id),
          res.meta.totalPages,
          res.meta.totalItems,
        )

        this.SET_LIST_STATUS(listKey, 'success')
      } catch (err) {
        this.SET_LIST_STATUS(listKey, 'error', err instanceof Error ? err.message : 'Unknown error')
      }
    },
  },
})
