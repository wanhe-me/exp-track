<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCategoryStore } from '@/stores/category'
import { useSubscriptionStore } from '@/stores/subscription'
import ConfirmDialog from '@/components/base/dialog/ConfirmDialog.vue'
import { AppInput } from '@/components/base'
import type { Category } from '@exp-track/shared'

const categoryStore = useCategoryStore()
const subscriptionStore = useSubscriptionStore()
const { categories, loading } = storeToRefs(categoryStore)
const { subscriptions, filterCategoryId } = storeToRefs(subscriptionStore)

// 各分类下当前视图订阅计数（基于已加载数据）
const countByCategory = computed<Record<number, number>>(() => {
  const map: Record<number, number> = {}
  for (const s of subscriptions.value) {
    map[s.categoryId] = (map[s.categoryId] ?? 0) + 1
  }
  return map
})

const totalCount = computed(() => subscriptions.value.length)

const selectCategory = (id: number | undefined): void => {
  subscriptionStore.filterCategoryId = id
  void subscriptionStore.fetchAll()
}

// ---- 创建 ----
const newName = ref('')
const createError = ref('')
const creating = ref(false)

const handleCreate = async (): Promise<void> => {
  const name = newName.value.trim()
  if (!name) {
    createError.value = '分类名称不能为空'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    await categoryStore.create(name)
    newName.value = ''
  } catch (err) {
    createError.value = err instanceof Error ? err.message : '创建失败'
  } finally {
    creating.value = false
  }
}

// ---- 行内编辑 ----
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
  const name = editingName.value.trim()
  if (!name) return
  try {
    await categoryStore.update(editingId.value, name)
    cancelEdit()
  } catch (err) {
    editingName.value = err instanceof Error ? err.message : '更新失败'
  }
}

// ---- 删除 ----
const deleteTarget = ref<Category | null>(null)
const deleteDialogVisible = ref(false)

const requestDelete = (cat: Category): void => {
  deleteTarget.value = cat
  deleteDialogVisible.value = true
}

const confirmDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  try {
    await categoryStore.remove(id)
    // 若删除的是当前筛选分类，回退到「全部」
    if (filterCategoryId.value === id) {
      selectCategory(undefined)
    }
  } catch (err) {
    alert(err instanceof Error ? err.message : '删除失败')
  }
  deleteTarget.value = null
}
</script>

<template>
  <div class="category-tree">
    <div class="tree-header">
      <h2 class="tree-title">分类</h2>
    </div>

    <div class="tree-create">
      <AppInput
        v-model="newName"
        size="sm"
        placeholder="新建分类..."
        maxlength="50"
        @keyup.enter="handleCreate"
      />
      <button
        class="btn btn-sm btn-primary tree-add-btn"
        :disabled="creating"
        title="添加分类"
        @click="handleCreate"
      >
        <FaIcon icon="plus" />
      </button>
    </div>
    <p v-if="createError" class="form-error">{{ createError }}</p>

    <div v-if="loading" class="loading-state">加载中...</div>

    <ul v-else class="tree-list">
      <li>
        <button
          class="tree-item"
          :class="{ 'tree-item-active': filterCategoryId === undefined }"
          @click="selectCategory(undefined)"
        >
          <FaIcon icon="layer-group" class="tree-icon" fixed-width />
          <span class="tree-label">全部</span>
          <span class="tree-count">{{ totalCount }}</span>
        </button>
      </li>

      <li v-for="cat in categories" :key="cat.id">
        <!-- 编辑态 -->
        <div v-if="editingId === cat.id" class="tree-edit">
          <AppInput v-model="editingName" size="sm" maxlength="50" @keyup.enter="saveEdit" />
          <button class="btn btn-sm btn-primary" title="保存" @click="saveEdit">
            <FaIcon icon="check" />
          </button>
          <button class="btn btn-sm" title="取消" @click="cancelEdit">
            <FaIcon icon="xmark" />
          </button>
        </div>
        <!-- 展示态 -->
        <div
          v-else
          class="tree-item"
          :class="{ 'tree-item-active': filterCategoryId === cat.id }"
          @click="selectCategory(cat.id)"
        >
          <FaIcon icon="tags" class="tree-icon" fixed-width />
          <span class="tree-label">{{ cat.name }}</span>
          <span class="tree-count">{{ countByCategory[cat.id] ?? 0 }}</span>
          <span class="tree-actions">
            <button
              class="tree-action-btn"
              title="编辑"
              @click.stop="startEdit(cat)"
            >
              <FaIcon icon="pen" />
            </button>
            <button
              class="tree-action-btn tree-action-danger"
              title="删除"
              @click.stop="requestDelete(cat)"
            >
              <FaIcon icon="trash-can" />
            </button>
          </span>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      v-model="deleteDialogVisible"
      title="删除分类"
      :message="`确定要删除分类「${deleteTarget?.name}」吗？被订阅引用的分类不可删除。`"
      confirm-text="删除"
      danger
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.category-tree {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  height: 100%;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tree-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
}

.tree-create {
  display: flex;
  gap: var(--space-2);
}

.tree-create .app-input,
.tree-edit .app-input {
  flex: 1;
}

.tree-add-btn {
  flex-shrink: 0;
}

.tree-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  overflow-y: auto;
  flex: 1;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: left;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.tree-item:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.tree-item-active {
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 500;
}

.tree-icon {
  width: 0.875rem;
  flex-shrink: 0;
  opacity: 0.7;
}

.tree-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background-color: var(--color-bg-hover);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  min-width: 1.5rem;
  text-align: center;
}

.tree-item-active .tree-count {
  background-color: var(--color-bg-active);
  color: var(--color-primary);
}

.tree-actions {
  display: none;
  gap: 0.125rem;
  margin-left: var(--space-1);
}

.tree-item:hover .tree-actions {
  display: flex;
}

.tree-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 0.75rem;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.tree-action-btn:hover {
  background-color: var(--color-bg-active);
  color: var(--color-text-primary);
}

.tree-action-danger:hover {
  color: var(--color-status-expired);
}

.tree-edit {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
}
</style>
