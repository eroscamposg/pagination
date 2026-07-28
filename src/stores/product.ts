import { defineStore } from 'pinia'
import type { ListState, ProductsState } from '@/types/states'
import type { Product } from '@/types/product'
import { buildListKey, getListOrThrow } from '@/helpers/helper'
import { mockFetchProducts, mockUpdateProduct } from '@/services/api'

export const useProductStore = defineStore('product', {
  state: (): ProductsState => ({
    entities: {},
    lists: {},
    pendingIds: {},
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
    isEntityPending:
      (state) =>
      (id: number): boolean => {
        return Boolean(state.pendingIds[id])
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

    // Partial, optimistic write — used for the immediate local update
    // before the server has confirmed anything.
    PATCH_ENTITY({ id, patch }: { id: number; patch: Partial<Product> }) {
      const existing = this.entities[id]
      if (!existing) return
      this.entities[id] = { ...existing, ...patch }
    },

    // Full replace — used both to reconcile with the server's confirmed
    // response and to roll back to a pre-optimistic snapshot on failure.
    // Same mutation serves both purposes because both are "this is now
    // the source of truth for this entity."
    REPLACE_ENTITY({ id, entity }: { id: number; entity: Product }) {
      this.entities[id] = entity
    },

    SET_ENTITY_PENDING({ id, pending }: { id: number; pending: boolean }) {
      if (pending) {
        this.pendingIds[id] = true
      } else {
        delete this.pendingIds[id]
      }
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
    async updateProductOptimistic({
      id,
      patch,
    }: {
      id: number
      patch: Partial<Pick<Product, 'title' | 'price'>>
    }) {
      const previous = this.entities[id]
      if (!previous) {
        throw new Error(`Cannot update product ${id} — not present in store`)
      }

      console.log('previous: ', previous)

      // Snapshot BEFORE mutating, so we have something exact to roll back to.
      // (Spreading here, not reusing `previous` by reference, since `previous`
      // will keep pointing at whatever is currently in state.entities[id]
      // after the optimistic write below.)
      const snapshot: Product = { ...previous }

      this.SET_ENTITY_PENDING({ id, pending: true })
      this.PATCH_ENTITY({ id, patch }) // <- UI reflects this instantly

      try {
        const confirmed = await mockUpdateProduct(id, patch)
        // Reconcile with whatever the server actually persisted — covers
        // cases where the server computes/normalizes fields we didn't send.
        this.REPLACE_ENTITY({ id, entity: confirmed })
      } catch (err) {
        // Roll back to exactly what was there before the optimistic write.
        this.REPLACE_ENTITY({ id, entity: snapshot })
        // Re-throw so the component can show a toast/inline error — the
        // store shouldn't decide how failure is presented.
        throw err
      } finally {
        this.SET_ENTITY_PENDING({ id, pending: false })
      }
    },
  },
})
