<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCategoryStore } from '@/stores/category'
import ConfirmDialog from '@/components/base/dialog/ConfirmDialog.vue'
import EmptyState from '@/components/base/display/EmptyState.vue'
import type { Category } from '@/types'

const categoryStore = useCategoryStore()
const { categories, loading } = storeToRefs(categoryStore)

onMounted(() => {
  void categoryStore.fetchAll()
})

// ---- 创建 ----
const newName = ref('')
const createError = ref('')
const creating = ref(false)

const handleCreate = async (): Promise<void> => {
  if (!newName.value.trim()) {
    createError.value = '分类名称不能为空'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    await categoryStore.create(newName.value.trim())
    newName.value = ''
  } catch (err) {
    createError.value = err instanceof Error ? err.message : '创建失败'
  } finally {
    creating.value = false
  }
}

// ---- 编辑 ----
const editingId = ref<number | null>(null)
const editingName = ref('')

const startEdit = (cat: Category): void => {
  editingId.value = cat.id
  editingName.value = cat.name
}

const cancelEdit = (): void => {
  editingId.value = null
  editingName.value = ''
}

const saveEdit = async (): Promise<void> => {
  if (editingId.value === null) return
  try {
    await categoryStore.update(editingId.value, editingName.value.trim())
    cancelEdit()
  } catch (err) {
    editingName.value = err instanceof Error ? err.message : '更新失败'
  }
}

// ---- 删除 ----
const deleteTarget = ref<Category | null>(null)
const deleteDialog = ref<{ open: () => void } | null>(null)

const requestDelete = (cat: Category): void => {
  deleteTarget.value = cat
  deleteDialog.value?.open()
}

const confirmDelete = async (): Promise<void> => {
  if (deleteTarget.value) {
    try {
      await categoryStore.remove(deleteTarget.value.id)
    } catch (err) {
      // 被引用的分类禁止删除，错误信息已由拦截器透传
      alert(err instanceof Error ? err.message : '删除失败')
    }
    deleteTarget.value = null
  }
}
</script>

<template>
  <div class="categories-view">
    <div class="page-header">
      <h1 class="page-title">分类管理</h1>
      <p class="page-desc">自定义订阅分类，被引用的分类不可删除</p>
    </div>

    <div class="create-section">
      <input
        v-model="newName"
        class="input"
        placeholder="输入新分类名称..."
        maxlength="50"
        @keyup.enter="handleCreate"
      />
      <button class="btn btn-primary" :disabled="creating" @click="handleCreate">添加</button>
    </div>
    <p v-if="createError" class="form-error">{{ createError }}</p>

    <div v-if="loading" class="loading-state">加载中...</div>

    <EmptyState
      v-else-if="categories.length === 0"
      title="暂无分类"
      description="添加分类后即可在订阅中使用"
    />

    <div v-else class="category-list">
      <div v-for="cat in categories" :key="cat.id" class="category-item glass">
        <template v-if="editingId === cat.id">
          <input v-model="editingName" class="input edit-input" maxlength="50" />
          <button class="btn btn-sm btn-primary" @click="saveEdit">保存</button>
          <button class="btn btn-sm" @click="cancelEdit">取消</button>
        </template>
        <template v-else>
          <span class="category-name">{{ cat.name }}</span>
          <div class="category-actions">
            <button class="btn btn-sm" @click="startEdit(cat)">编辑</button>
            <button class="btn btn-sm btn-danger" @click="requestDelete(cat)">删除</button>
          </div>
        </template>
      </div>
    </div>

    <ConfirmDialog
      ref="deleteDialog"
      title="删除分类"
      :message="`确定要删除分类「${deleteTarget?.name}」吗？`"
      confirm-text="删除"
      danger
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.categories-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.create-section {
  display: flex;
  gap: var(--space-3);
  max-width: 30rem;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 40rem;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  transition:
    background-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.category-item:hover {
  background: var(--glass-bg-hover);
  box-shadow: var(--glass-shadow-hover);
}

.edit-input {
  flex: 1;
}

.category-name {
  font-size: var(--font-size-base);
  font-weight: 500;
}

.category-actions {
  display: flex;
  gap: var(--space-2);
}
</style>
