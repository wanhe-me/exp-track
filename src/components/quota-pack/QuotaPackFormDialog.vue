<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { QuotaPack, QuotaPackInput } from '@exp-track/shared'
import { todayStr } from '@/utils/date'
import { DatePicker, AppButton, AppInput, AppTextarea } from '@/components/base'

const props = defineProps<{
  modelValue: boolean
  quotaPack?: QuotaPack | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [input: QuotaPackInput, id: number | null]
}>()

const isEdit = computed(() => !!props.quotaPack)

interface FormState {
  name: string
  quantity: string
  unit: string
  obtainedDate: string
  expireDate: string
  source: string
  note: string
}

const form = reactive<FormState>({
  name: '',
  quantity: '',
  unit: '',
  obtainedDate: todayStr(),
  expireDate: todayStr(),
  source: '',
  note: '',
})

const errors = ref<Record<string, string>>({})

const resetForm = (): void => {
  form.name = ''
  form.quantity = ''
  form.unit = ''
  form.obtainedDate = todayStr()
  form.expireDate = todayStr()
  form.source = ''
  form.note = ''
  errors.value = {}
}

const fillForm = (pack: QuotaPack): void => {
  form.name = pack.name
  form.quantity = String(pack.quantity)
  form.unit = pack.unit
  form.obtainedDate = pack.obtainedDate
  form.expireDate = pack.expireDate
  form.source = pack.source ?? ''
  form.note = pack.note ?? ''
  errors.value = {}
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      if (props.quotaPack) {
        fillForm(props.quotaPack)
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

  const quantityNum = Number(form.quantity)
  if (form.quantity === '' || Number.isNaN(quantityNum)) {
    e.quantity = '数量必填'
  } else if (quantityNum < 0) {
    e.quantity = '数量不能为负'
  } else if (Math.round(quantityNum * 100) !== quantityNum * 100) {
    e.quantity = '数量精度不能超过 2 位小数'
  }

  if (!form.unit.trim()) {
    e.unit = '单位不能为空'
  } else if (form.unit.trim().length > 32) {
    e.unit = '单位长度不能超过 32'
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.obtainedDate)) {
    e.obtainedDate = '获得日期格式必须为 YYYY-MM-DD'
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expireDate)) {
    e.expireDate = '失效日期格式必须为 YYYY-MM-DD'
  }

  if (!e.obtainedDate && !e.expireDate) {
    if (new Date(`${form.expireDate}T00:00:00`).getTime() < new Date(`${form.obtainedDate}T00:00:00`).getTime()) {
      e.expireDate = '失效日期不得早于获得日期'
    }
  }

  if (form.source.length > 50) {
    e.source = '来源长度不能超过 50'
  }

  if (form.note.length > 500) {
    e.note = '备注长度不能超过 500'
  }

  errors.value = e
  return Object.keys(e).length === 0
}

const submitting = ref(false)

const handleSubmit = async (): Promise<void> => {
  if (!validate()) return
  submitting.value = true
  try {
    const input: QuotaPackInput = {
      name: form.name.trim(),
      quantity: Number(form.quantity),
      unit: form.unit.trim(),
      obtainedDate: form.obtainedDate,
      expireDate: form.expireDate,
      source: form.source.trim() || null,
      note: form.note.trim() || null,
    }
    emit('submit', input, props.quotaPack?.id ?? null)
    close()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.modelValue" class="qp-overlay" @click.self="close">
      <div class="qp-dialog glass">
        <div class="qp-header">
          <h2 class="qp-title">{{ isEdit ? '编辑额度包' : '添加额度包' }}</h2>
          <button class="qp-close" @click="close">×</button>
        </div>

        <div class="qp-content">
          <div class="form-group">
            <AppInput v-model="form.name" label="名称" required placeholder="如：首充赠送包" maxlength="100" :error="errors.name" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <AppInput v-model="form.quantity" label="数量" required type="number" step="0.01" min="0" placeholder="如 100" :error="errors.quantity" />
            </div>
            <div class="form-group">
              <AppInput v-model="form.unit" label="单位" required placeholder="如 万tokens、次、GB" maxlength="32" :error="errors.unit" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <DatePicker v-model="form.obtainedDate" label="获得日期" required :error="errors.obtainedDate" />
            </div>
            <div class="form-group">
              <DatePicker v-model="form.expireDate" label="失效日期" required :error="errors.expireDate" hint="倒计时依据" />
            </div>
          </div>

          <div class="form-group">
            <AppInput v-model="form.source" label="来源" placeholder="可选，如 首充赠送、活动补偿" maxlength="50" :error="errors.source" />
          </div>

          <div class="form-group">
            <AppTextarea v-model="form.note" label="备注" placeholder="可选，纯文本" maxlength="500" :error="errors.note" />
          </div>
        </div>

        <div class="qp-footer">
          <AppButton @click="close">取消</AppButton>
          <AppButton variant="primary" :disabled="submitting" @click="handleSubmit">
            {{ isEdit ? '保存' : '添加' }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.qp-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--color-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.qp-dialog {
  border-radius: var(--radius-lg);
  width: 32rem;
  max-width: calc(100vw - var(--space-8));
  max-height: calc(100vh - var(--space-8));
  display: flex;
  flex-direction: column;
}

.qp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border-light);
}

.qp-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.qp-close {
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

.qp-close:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border);
  background: var(--color-bg-active);
}

.qp-content {
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

.qp-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border-light);
}
</style>
