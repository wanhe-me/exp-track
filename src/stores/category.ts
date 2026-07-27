import { defineStore } from 'pinia'
import { ref } from 'vue'
import { categoryApi } from '@/api/category'
import type { Category } from '@/types'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)

  const fetchAll = async (): Promise<void> => {
    loading.value = true
    try {
      categories.value = await categoryApi.list()
    } finally {
      loading.value = false
    }
  }

  const create = async (name: string): Promise<Category> => {
    const created = await categoryApi.create(name)
    categories.value.push(created)
    return created
  }

  const update = async (id: number, name: string): Promise<Category> => {
    const updated = await categoryApi.update(id, name)
    const idx = categories.value.findIndex((c) => c.id === id)
    if (idx >= 0) categories.value[idx] = updated
    return updated
  }

  const remove = async (id: number): Promise<void> => {
    await categoryApi.remove(id)
    categories.value = categories.value.filter((c) => c.id !== id)
  }

  const nameById = (id: number): string =>
    categories.value.find((c) => c.id === id)?.name ?? ''

  return { categories, loading, fetchAll, create, update, remove, nameById }
})
