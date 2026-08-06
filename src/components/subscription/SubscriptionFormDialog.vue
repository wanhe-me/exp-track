<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useCategoryStore } from '@/stores/category'
import {
  BILLING_CYCLE_LABELS,
  QUOTA_CYCLE_LABELS,
  SUBSCRIPTION_TYPE_LABELS,
  domainConfig,
  type BillingCycle,
  type QuotaCycle,
  type Subscription,
  type SubscriptionInput,
  type SubscriptionType,
} from '@exp-track/shared'
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
  subscriptionType: SubscriptionType
  quotaCycle: QuotaCycle | ''
  quotaTotal: string
  quotaInputMode: 'used' | 'remaining'
  quotaUsed: string
  quotaRemaining: string
  quotaUnit: string
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
  subscriptionType: 'standard',
  quotaCycle: '',
  quotaTotal: '',
  quotaInputMode: 'used',
  quotaUsed: '',
  quotaRemaining: '',
  quotaUnit: '',
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
  form.subscriptionType = 'standard'
  form.quotaCycle = ''
  form.quotaTotal = ''
  form.quotaInputMode = 'used'
  form.quotaUsed = ''
  form.quotaRemaining = ''
  form.quotaUnit = ''
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
  form.subscriptionType = sub.subscriptionType
  form.quotaCycle = sub.quotaCycle ?? ''
  form.quotaTotal = sub.quotaTotal != null ? String(sub.quotaTotal) : ''
  // 二选一回填：优先已使用，其次剩余
  if (sub.quotaUsed != null) {
    form.quotaInputMode = 'used'
    form.quotaUsed = String(sub.quotaUsed)
    form.quotaRemaining = ''
  } else if (sub.quotaRemaining != null) {
    form.quotaInputMode = 'remaining'
    form.quotaRemaining = String(sub.quotaRemaining)
    form.quotaUsed = ''
  } else {
    form.quotaInputMode = 'used'
    form.quotaUsed = ''
    form.quotaRemaining = ''
  }
  form.quotaUnit = sub.quotaUnit ?? ''
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

// 额度联动：根据填写模式实时计算另一字段的只读值（二选一填写，另一个自动算）
const quotaComputedValue = computed<string>(() => {
  if (form.subscriptionType !== 'quota') return ''
  const total = Number(form.quotaTotal)
  if (form.quotaTotal === '' || Number.isNaN(total)) return ''
  if (form.quotaInputMode === 'used') {
    const used = Number(form.quotaUsed)
    if (form.quotaUsed === '' || Number.isNaN(used)) return ''
    const v = Math.round((total - used) * 100) / 100
    return v >= 0 ? String(v) : ''
  }
  const remaining = Number(form.quotaRemaining)
  if (form.quotaRemaining === '' || Number.isNaN(remaining)) return ''
  const v = Math.round((total - remaining) * 100) / 100
  return v >= 0 ? String(v) : ''
})

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

  // 额度型校验
  if (form.subscriptionType === 'quota') {
    if (form.quotaCycle === '') {
      e.quotaCycle = '请选择额度周期'
    }

    const totalNum = Number(form.quotaTotal)
    if (form.quotaTotal === '' || Number.isNaN(totalNum)) {
      e.quotaTotal = '总额度必填'
    } else if (totalNum <= 0) {
      e.quotaTotal = '总额度必须大于 0'
    } else if (Math.round(totalNum * 100) !== totalNum * 100) {
      e.quotaTotal = '总额度精度不能超过 2 位小数'
    }

    if (form.quotaInputMode === 'used') {
      const usedNum = Number(form.quotaUsed)
      if (form.quotaUsed === '' || Number.isNaN(usedNum)) {
        e.quotaUsed = '已使用额度必填'
      } else if (usedNum < 0) {
        e.quotaUsed = '已使用额度不能为负'
      } else if (Math.round(usedNum * 100) !== usedNum * 100) {
        e.quotaUsed = '已使用额度精度不能超过 2 位小数'
      } else if (!e.quotaTotal && usedNum > totalNum) {
        e.quotaUsed = '已使用额度不能超过总额度'
      }
    } else {
      const remainingNum = Number(form.quotaRemaining)
      if (form.quotaRemaining === '' || Number.isNaN(remainingNum)) {
        e.quotaRemaining = '剩余额度必填'
      } else if (remainingNum < 0) {
        e.quotaRemaining = '剩余额度不能为负'
      } else if (Math.round(remainingNum * 100) !== remainingNum * 100) {
        e.quotaRemaining = '剩余额度精度不能超过 2 位小数'
      } else if (!e.quotaTotal && remainingNum > totalNum) {
        e.quotaRemaining = '剩余额度不能超过总额度'
      }
    }

    if (form.quotaUnit.length > 20) {
      e.quotaUnit = '单位长度不能超过 20'
    }
  }

  errors.value = e
  return Object.keys(e).length === 0
}

const submitting = ref(false)

const handleSubmit = async (): Promise<void> => {
  if (!validate()) return
  submitting.value = true
  try {
    const isQuota = form.subscriptionType === 'quota'
    let quotaTotal: number | null = null
    let quotaUsed: number | null = null
    let quotaRemaining: number | null = null

    if (isQuota) {
      const total = Number(form.quotaTotal)
      quotaTotal = total
      if (form.quotaInputMode === 'used') {
        const used = Number(form.quotaUsed)
        quotaUsed = used
        quotaRemaining = Math.round((total - used) * 100) / 100
      } else {
        const remaining = Number(form.quotaRemaining)
        quotaRemaining = remaining
        quotaUsed = Math.round((total - remaining) * 100) / 100
      }
    }

    const input: SubscriptionInput = {
      name: form.name.trim(),
      categoryId: Number(form.categoryId),
      price: Number(form.price),
      billingCycle: form.billingCycle,
      startDate: form.startDate,
      expireDate: form.expireDate,
      autoRenew: form.autoRenew,
      note: form.note.trim() || null,
      subscriptionType: form.subscriptionType,
      quotaCycle: isQuota ? (form.quotaCycle as QuotaCycle) : null,
      quotaTotal,
      quotaUsed,
      quotaRemaining,
      quotaUnit: isQuota ? form.quotaUnit.trim() || null : null,
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

const subscriptionTypeOptions: { value: SubscriptionType; label: string; hint: string }[] = [
  { value: 'standard', label: SUBSCRIPTION_TYPE_LABELS.standard, hint: '功能解锁型，只看到期时间' },
  { value: 'quota', label: SUBSCRIPTION_TYPE_LABELS.quota, hint: '额度型，展示剩余额度' },
]

const quotaCycleOptions: { value: QuotaCycle; label: string }[] = [
  { value: 'week', label: QUOTA_CYCLE_LABELS.week },
  { value: 'month', label: QUOTA_CYCLE_LABELS.month },
]

const quotaInputModeOptions: { value: 'used' | 'remaining'; label: string }[] = [
  { value: 'used', label: '填写已使用' },
  { value: 'remaining', label: '填写剩余' },
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

          <div class="form-group">
            <label class="form-label">订阅类型 <span class="required">*</span></label>
            <div class="radio-group">
              <label
                v-for="opt in subscriptionTypeOptions"
                :key="opt.value"
                class="radio-card"
                :class="{ active: form.subscriptionType === opt.value }"
              >
                <input v-model="form.subscriptionType" type="radio" :value="opt.value" />
                <span class="radio-card-label">{{ opt.label }}</span>
                <span class="radio-card-hint">{{ opt.hint }}</span>
              </label>
            </div>
          </div>

          <template v-if="form.subscriptionType === 'quota'">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">额度周期 <span class="required">*</span></label>
                <select v-model="form.quotaCycle" class="select">
                  <option value="" disabled>请选择周期</option>
                  <option v-for="opt in quotaCycleOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}限额
                  </option>
                </select>
                <p v-if="errors.quotaCycle" class="form-error">{{ errors.quotaCycle }}</p>
              </div>

              <div class="form-group">
                <label class="form-label">总额度 <span class="required">*</span></label>
                <input v-model="form.quotaTotal" class="input" type="number" step="0.01" min="0" placeholder="如 100" />
                <p v-if="errors.quotaTotal" class="form-error">{{ errors.quotaTotal }}</p>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">填写方式 <span class="required">*</span></label>
              <div class="segmented">
                <button
                  v-for="opt in quotaInputModeOptions"
                  :key="opt.value"
                  type="button"
                  class="segmented-btn"
                  :class="{ active: form.quotaInputMode === opt.value }"
                  @click="form.quotaInputMode = opt.value"
                >{{ opt.label }}</button>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">
                  已使用额度<template v-if="form.quotaInputMode === 'used'"><span class="required">*</span></template><template v-else><span class="form-label-suffix">（自动计算）</span></template>
                </label>
                <input
                  v-if="form.quotaInputMode === 'used'"
                  v-model="form.quotaUsed" class="input" type="number" step="0.01" min="0" placeholder="如 30"
                />
                <input v-else :value="quotaComputedValue" class="input" type="number" readonly placeholder="自动计算" />
                <p v-if="errors.quotaUsed" class="form-error">{{ errors.quotaUsed }}</p>
              </div>

              <div class="form-group">
                <label class="form-label">
                  剩余额度<template v-if="form.quotaInputMode === 'remaining'"><span class="required">*</span></template><template v-else><span class="form-label-suffix">（自动计算）</span></template>
                </label>
                <input
                  v-if="form.quotaInputMode === 'remaining'"
                  v-model="form.quotaRemaining" class="input" type="number" step="0.01" min="0" placeholder="如 70"
                />
                <input v-else :value="quotaComputedValue" class="input" type="number" readonly placeholder="自动计算" />
                <p v-if="errors.quotaRemaining" class="form-error">{{ errors.quotaRemaining }}</p>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">额度单位</label>
              <input v-model="form.quotaUnit" class="input" placeholder="可选，如 $、次、万token" maxlength="20" />
              <p v-if="errors.quotaUnit" class="form-error">{{ errors.quotaUnit }}</p>
            </div>
          </template>

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

.radio-group {
  display: flex;
  gap: var(--space-3);
}

.radio-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);
}

.radio-card input[type='radio'] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.radio-card:hover {
  background: var(--color-bg-hover);
}

.radio-card.active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.radio-card-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.radio-card-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.segmented {
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

.segmented-btn {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.segmented-btn:hover {
  background: var(--color-bg-hover);
}

.segmented-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-text-primary);
  font-weight: 600;
}

.form-label-suffix {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 400;
  margin-left: var(--space-1);
}

.input[readonly] {
  background: var(--color-bg-hover);
  color: var(--color-text-tertiary);
  cursor: default;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border-light);
}
</style>
