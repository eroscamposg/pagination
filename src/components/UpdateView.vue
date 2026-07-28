<script setup lang="ts">
import { useProductStore } from '@/stores/product'
import { computed, ref } from 'vue'

const props = defineProps<{ productId: number }>()
const store = useProductStore()

const product = computed(() => store.entities[props.productId])
const isPending = computed(() => store.isEntityPending(props.productId))

const errorMessage = ref<string | null>(null)

async function savePrice(newPrice: number) {
  errorMessage.value = null
  try {
    await store.updateProductOptimistic({
      id: props.productId,
      patch: { price: newPrice },
    })
  } catch (err) {
    // Store already rolled back the entity to its pre-edit value —
    // this catch is purely for user-facing feedback.
    errorMessage.value = err instanceof Error ? err.message : 'Update failed'
  }
}
</script>

<template>
  <div>
    <input
      type="number"
      :value="product?.price"
      :disabled="isPending"
      @change="savePrice(($event.target as HTMLInputElement).valueAsNumber)"
    />
    <span v-if="isPending">Saving...</span>
    <span v-if="errorMessage" class="error">{{ errorMessage }}</span>
  </div>
</template>
