import { defineStore } from 'pinia'
import type { ListState, ProductsState } from '@/types/states'
import type { Product } from '@/types/product'
import { buildListKey, getListOrThrow } from '@/helpers/helper'
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
      // when fetchPage is dispatched with a params combination that produces a listKey not already present in state.lists, a new
      // list object is created with info about that page

      // lists: {
      // 'products:category=shoes:search=': { idsByPage: {...}, currentPage: 1, ... },
      // 'products:category=hats:search=':  { idsByPage: {...}, currentPage: 1, ... },
      // 'products:category=all:search=red shirt': { idsByPage: {...}, currentPage: 1, ... }
      // }
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
      const list = getListOrThrow(this.lists, listKey)
      list.status = status
      list.error = error ?? null
    },
    SET_LIST_PAGE(
      listKey: string,
      page: number,
      ids: number[],
      totalPages: number,
      totalItems: number,
    ) {
      const list = getListOrThrow(this.lists, listKey)
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
        const list = getListOrThrow(this.lists, listKey)
        list.currentPage = payload.page
        return
      }

      this.SET_LIST_STATUS(listKey, 'loading')

      try {
        const res = await mockFetchProducts(payload)
        console.log(res)

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
