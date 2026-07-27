<template>
  <div v-if="meta?.status === 'loading'">Loading...</div>
  <div v-else-if="meta?.status === 'error'">Error: {{ meta.error }}</div>
  <ul v-else>
    <li v-for="p in items" :key="p.id">{{ p.title }} - ${{ p.price }}</li>
  </ul>

  <button
    v-for="p in meta?.totalPages"
    :key="p"
    :class="{ active: p === meta?.currentPage }"
    @click="goToPage(p)"
  >
    {{ p }}
  </button>
</template>

<script setup lang="ts">
import { buildListKey } from '@/helpers/keyBuilder'
import { useProductStore } from '@/stores/product'
import { computed, onMounted, ref } from 'vue'

const store = useProductStore()
const category = 'shoes'
const listKey = buildListKey({ category })

const currentPage = ref(1)

const items = computed(() => store.currentPageItems(listKey))
const meta = computed(() => store.listMeta(listKey))

function goToPage(page: number) {
  currentPage.value = page
  store.fetchPage({ category, page })
}

onMounted(() => goToPage(1))
</script>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
