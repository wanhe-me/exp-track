<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useCategoryStore } from '@/stores/category'
import type { BillingCycle, Subscription, SubscriptionInput } from '@/types'
import { BILLING_CYCLE_LABELS, domainConfig } from '@/types'
import { todayStr } from '@/utils/date'
import { DatePicker } from '@/components/base'

const props = defineProps<{
  modelValue: boolean
  subscription?: Subscription | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [input: SubscriptionInput, id: number | null]
}>()

const categoryStore = useCategoryStore()

const isEdit = computed(() => !!props.subscription)

interface FormState {
  name: string
  categoryId: number | ''
  price: string
  billingCycle: BillingCycle
  startDate: string
  expireDate: string
  autoRenew: boolean
  note: string
}

const form = reactive<FormState>({
  name: '',
  categoryId: '',
  price: '',
  billingCycle: 'month',
  startDate: todayStr(),
  expireDate: todayStr(),
  autoRenew: false,
  note: '',
})

const errors = ref<Record<string, string>>({})

const resetForm = (): void => {
  form.name = ''
  form.categoryId = ''
  form.price = ''
  form.billingCycle = 'month'
  form.startDate = todayStr()
  form.expireDate = todayStr()
  form.autoRenew = false
  form.note = ''
  errors.value = {}
}

const fillForm = (sub: Subscription): void => {
  form.name = sub.name
  form.categoryId = sub.categoryId
  form.price = String(sub.price)
  form.billingCycle = sub.billingCycle
  form.startDate = sub.startDate
  form.expireDate = sub.expireDate
  form.autoRenew = sub.autoRenew
  form.note = sub.note ?? ''
  errors.value = {}
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      if (props.subscription) {
        fillForm(props.subscription)
      } else {
        resetForm()
      }
    }
  },
)

const close = (): void => {
  emit('update:modelValue', false)
}

const validate = (): boolean => {
  errors.value = {}
  const e: Record<string, string> = {}

  if (!form.name.trim()) {
    e.name = '名称不能为空'
  } else if (form.name.trim().length > 100) {
    e.name = '名称长度不能超过 100'
  }

  if (form.categoryId === '' || form.categoryId <= 0) {
    e.categoryId = '请选择分类'
  }

  const priceNum = Number(form.price)
  if (form.price === '' || Number.isNaN(priceNum)) {
    e.price = '价格必填'
  } else if (priceNum < 0) {
    e.price = '价格不能为负'
  } else if (Math.round(priceNum * 100) !== priceNum * 100) {
    e.price = '价格精度不能超过 2 位小数'
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) {
    e.startDate = '开始日期格式必须为 YYYY-MM-DD'
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expireDate)) {
    e.expireDate = '到期日期格式必须为 YYYY-MM-DD'
  }

  if (!e.startDate && !e.expireDate) {
    if (new Date(`${form.expireDate}T00:00:00`).getTime() < new Date(`${form.startDate}T00:00:00`).getTime()) {
      e.expireDate = '到期日期不得早于开始日期'
    }
  }

  if (form.note.length > 1000) {
    e.note = '备注长度不能超过 1000'
  }

  errors.value = e
  return Object.keys(e).length === 0
}

const submitting = ref(false)

const handleSubmit = async (): Promise<void> => {
  if (!validate()) return
  submitting.value = true
  try {
    const input: SubscriptionInput = {
      name: form.name.trim(),
      categoryId: Number(form.categoryId),
      price: Number(form.price),
      billingCycle: form.billingCycle,
      startDate: form.startDate,
      expireDate: form.expireDate,
      autoRenew: form.autoRenew,
      note: form.note.trim() || null,
    }
    emit('submit', input, props.subscription?.id ?? null)
    close()
  } finally {
    submitting.value = false
  }
}

const billingOptions: { value: BillingCycle; label: string }[] = [
  { value: 'month', label: BILLING_CYCLE_LABELS.month },
  { value: 'quarter', label: BILLING_CYCLE_LABELS.quarter },
  { value: 'year', label: BILLING_CYCLE_LABELS.year },
]
</script>

<template>
  <Teleport to="body">
    <div v-if="props.modelValue" class="form-overlay" @click.self="close">
      <div class="form-dialog glass">
        <div class="form-header">
          <h2 class="form-title">{{ isEdit ? '编辑订阅' : '添加订阅' }}</h2>
          <button class="form-close" @click="close">×</button>
        </div>

        <div class="form-content">
          <div class="form-group">
            <label class="form-label">名称 <span class="required">*</span></label>
            <input v-model="form.name" class="input" placeholder="如：OpenAI API" maxlength="100" />
            <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">分类 <span class="required">*</span></label>
              <select v-model="form.categoryId" class="select">
                <option value="" disabled>请选择分类</option>
                <option v-for="c in categoryStore.categories" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
              <p v-if="errors.categoryId" class="form-error">{{ errors.categoryId }}</p>
            </div>

            <div class="form-group">
              <label class="form-label">价格（{{ domainConfig.currencySymbol }}）<span class="required">*</span></label>
              <input v-model="form.price" class="input" type="number" step="0.01" min="0" placeholder="0.00" />
              <p v-if="errors.price" class="form-error">{{ errors.price }}</p>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">计费周期 <span class="required">*</span></label>
              <select v-model="form.billingCycle" class="select">
                <option v-for="opt in billingOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">自动续费 <span class="required">*</span></label>
              <label class="checkbox-label">
                <input v-model="form.autoRenew" type="checkbox" />
                <span>开启自动续费（仅作标记，不触发自动逻辑）</span>
              </label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <DatePicker v-model="form.startDate" label="开始日期" required :error="errors.startDate" />
            </div>

            <div class="form-group">
              <DatePicker v-model="form.expireDate" label="到期日期" required :error="errors.expireDate" hint="到期日期为剩余天数唯一权威字段" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea v-model="form.note" class="textarea" placeholder="可选，纯文本" maxlength="1000"></textarea>
            <p v-if="errors.note" class="form-error">{{ errors.note }}</p>
          </div>

          <p class="form-hint currency-hint">
            若服务以非人民币计价，请自行换算后填入。
          </p>
        </div>

        <div class="form-footer">
          <button class="btn" @click="close">取消</button>
          <button class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
            {{ isEdit ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.form-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--color-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.form-dialog {
  border-radius: var(--radius-lg);
  width: 35rem;
  max-width: calc(100vw - var(--space-8));
  max-height: calc(100vh - var(--space-8));
  display: flex;
  flex-direction: column;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border-light);
}

.form-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.form-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: var(--color-bg-hover);
  font-size: 1.375rem;
  line-height: 1;
  color: var(--color-text-tertiary);
  padding: 0;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.form-close:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border);
  background: var(--color-bg-active);
}

.form-close:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.form-content {
  padding: var(--space-5) var(--space-6);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.required {
  color: var(--color-status-expired);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  padding-top: var(--space-2);
}

.currency-hint {
  color: var(--color-text-tertiary);
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border-light);
}
</style>
