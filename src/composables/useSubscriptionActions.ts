import { ref } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import type { Subscription, SubscriptionInput } from '@/types'
import type { SubscriptionView } from '@/types'

export const useSubscriptionActions = (view: SubscriptionView) => {
  const store = useSubscriptionStore()

  const formVisible = ref(false)
  const editingSubscription = ref<Subscription | null>(null)
  const deleteTarget = ref<Subscription | null>(null)
  const archiveTarget = ref<Subscription | null>(null)
  const deleteDialogVisible = ref(false)
  const archiveDialogVisible = ref(false)

  const openCreate = (): void => {
    editingSubscription.value = null
    formVisible.value = true
  }

  const openEdit = (sub: Subscription): void => {
    editingSubscription.value = sub
    formVisible.value = true
  }

  const handleSubmit = async (input: SubscriptionInput, id: number | null): Promise<void> => {
    if (id !== null) {
      await store.update(id, input)
    } else {
      await store.create(input)
    }
  }

  const requestDelete = (sub: Subscription): void => {
    deleteTarget.value = sub
    deleteDialogVisible.value = true
  }

  const confirmDelete = async (): Promise<void> => {
    if (deleteTarget.value) {
      await store.remove(deleteTarget.value.id)
      deleteTarget.value = null
    }
  }

  const requestArchive = (sub: Subscription): void => {
    archiveTarget.value = sub
    archiveDialogVisible.value = true
  }

  const confirmArchive = async (): Promise<void> => {
    if (archiveTarget.value) {
      await store.archive(archiveTarget.value.id)
      archiveTarget.value = null
    }
  }

  const handleUnarchive = async (sub: Subscription): Promise<void> => {
    await store.unarchive(sub.id)
  }

  const handleRestore = async (sub: Subscription): Promise<void> => {
    await store.restore(sub.id)
  }

  return {
    formVisible,
    editingSubscription,
    deleteTarget,
    archiveTarget,
    deleteDialogVisible,
    archiveDialogVisible,
    openCreate,
    openEdit,
    handleSubmit,
    requestDelete,
    confirmDelete,
    requestArchive,
    confirmArchive,
    handleUnarchive,
    handleRestore,
    view,
  }
}
