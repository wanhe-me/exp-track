/**
 * DatePicker — 自定义日期选择器
 *
 * 功能特性：
 * - v-model 双向绑定（YYYY-MM-DD）
 * - 自定义日历面板，月视图网格
 * - 时间段置灰（禁选），支持单个日期与日期范围
 * - min/max 约束
 * - 标准表单交互（label、hint、error、required）
 * - 尺寸变体：sm / md / lg
 * - 可清空
 * - 键盘导航与无障碍支持
 *
 * 使用示例：
 *   <DatePicker v-model="date" label="开始日期" />
 *   <DatePicker v-model="date" :disabled-dates="blockedRanges" />
 *   <DatePicker v-model="date" :min-date="today" />
 */

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'
import { domainConfig } from '@exp-track/shared'
import type { DisabledDateRange, DatePickerSize } from './types'

interface DayCell {
  /** YYYY-MM-DD */
  date: string
  /** 日数字 1-31 */
  day: number
  /** 是否属于当前展示月份 */
  isCurrentMonth: boolean
  /** 是否是今天 */
  isToday: boolean
  /** 是否被选中 */
  isSelected: boolean
  /** 是否处于禁选范围 */
  isDisabled: boolean
  /** 是否超出 min/max 约束 */
  isOutOfRange: boolean
}

// ==================== Props ====================

const props = withDefaults(
  defineProps<{
    /** v-model 绑定值，YYYY-MM-DD 格式 */
    modelValue?: string
    /** 禁选的日期范围列表 */
    disabledDates?: DisabledDateRange[]
    /** 最小可选日期 YYYY-MM-DD */
    minDate?: string
    /** 最大可选日期 YYYY-MM-DD */
    maxDate?: string
    /** 是否禁用整个选择器 */
    disabled?: boolean
    /** 是否只读 */
    readonly?: boolean
    /** 占位文本 */
    placeholder?: string
    /** 表单标签 */
    label?: string
    /** 辅助提示 */
    hint?: string
    /** 校验错误信息 */
    error?: string
    /** 是否必填 */
    required?: boolean
    /** 尺寸 */
    size?: DatePickerSize
    /** 是否显示清除按钮 */
    clearable?: boolean
    /** 原生 input name */
    name?: string
    /** 日期格式，默认 YYYY-MM-DD */
    format?: string
    /** 周起始日：0=周日，1=周一 */
    weekStart?: 0 | 1
  }>(),
  {
    modelValue: '',
    disabledDates: () => [],
    minDate: '',
    maxDate: '',
    disabled: false,
    readonly: false,
    placeholder: '选择日期',
    label: '',
    hint: '',
    error: '',
    required: false,
    size: 'md',
    clearable: false,
    name: '',
    format: domainConfig.dateFormat,
    weekStart: 1,
  },
)

// ==================== Emits ====================

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  /** 值变更时触发（与 v-model 不同，仅在用户操作时触发） */
  change: [value: string]
}>()

// ==================== 内部状态 ====================

const isOpen = ref(false)
const inputFocused = ref(false)
const currentYear = ref(dayjs().year())
const currentMonth = ref(dayjs().month()) // 0-11
const panelRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const blurTimeoutRef = ref<ReturnType<typeof setTimeout> | null>(null)
const panelStyle = ref<Record<string, string>>({})

// ==================== 计算属性 ====================

const dateFormat = computed(() => props.format)

/** 当前展示的年月标签，如「2026 年 7 月」 */
const monthYearLabel = computed(() => {
  return `${currentYear.value} 年 ${currentMonth.value + 1} 月`
})

/** 月份天数 */
const daysInMonth = computed(() => {
  return dayjs(new Date(currentYear.value, currentMonth.value + 1, 0)).date()
})

/** 当月第一天是星期几（返回 0-6，0=周日） */
const firstDayOfMonth = computed(() => {
  return dayjs(new Date(currentYear.value, currentMonth.value, 1)).day()
})

/** 上个月末尾需要补全的天数 */
const leadingDays = computed(() => {
  const offset = props.weekStart === 1 ? 1 : 0
  return (firstDayOfMonth.value - offset + 7) % 7
})

/** 上个月的天数 */
const prevMonthDays = computed(() => {
  return dayjs(new Date(currentYear.value, currentMonth.value, 0)).date()
})

/** 所有禁选日期集合（Set<YYYY-MM-DD>），用于 O(1) 查询 */
const disabledDateSet = computed<Set<string>>(() => {
  const result = new Set<string>()

  props.disabledDates.forEach((range) => {
    // 单个日期列表
    if (range.dates) {
      range.dates.forEach((d) => {
        if (d) result.add(d)
      })
    }
    // 日期范围（闭区间）
    if (range.start && range.end) {
      let cursor = dayjs(range.start)
      const end = dayjs(range.end)
      while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
        result.add(cursor.format(dateFormat.value))
        cursor = cursor.add(1, 'day')
      }
    }
  })

  return result
})

/** minDate 的 dayjs 实例 */
const minDayjs = computed(() => {
  return props.minDate ? dayjs(props.minDate) : null
})

/** maxDate 的 dayjs 实例 */
const maxDayjs = computed(() => {
  return props.maxDate ? dayjs(props.maxDate) : null
})

/** 周表头 */
const weekHeaders = computed(() => {
  if (props.weekStart === 1) {
    return ['一', '二', '三', '四', '五', '六', '日']
  }
  return ['日', '一', '二', '三', '四', '五', '六']
})

/** 构建日历网格（6 行 × 7 列） */
const calendarDays = computed<DayCell[][]>(() => {
  const today = dayjs().format(dateFormat.value)
  const selected = props.modelValue
  const weeks: DayCell[][] = []
  let row: DayCell[] = []

  // 上月填充
  for (let i = leadingDays.value - 1; i >= 0; i--) {
    const day = prevMonthDays.value - i
    const dateStr = dayjs(new Date(currentYear.value, currentMonth.value - 1, day)).format(dateFormat.value)
    row.push(buildDayCell(dateStr, day, false, today, selected))
  }

  // 当月
  for (let d = 1; d <= daysInMonth.value; d++) {
    const dateStr = dayjs(new Date(currentYear.value, currentMonth.value, d)).format(dateFormat.value)
    row.push(buildDayCell(dateStr, d, true, today, selected))
    if (row.length === 7) {
      weeks.push(row)
      row = []
    }
  }

  // 下月填充
  if (row.length > 0) {
    let nextDay = 1
    while (row.length < 7) {
      const dateStr = dayjs(new Date(currentYear.value, currentMonth.value + 1, nextDay)).format(dateFormat.value)
      row.push(buildDayCell(dateStr, nextDay, false, today, selected))
      nextDay++
    }
    weeks.push(row)
  }

  return weeks
})

/** 构建单个日期格 */
function buildDayCell(
  dateStr: string,
  dayNum: number,
  isCurrentMonth: boolean,
  today: string,
  selected: string | undefined,
): DayCell {
  return {
    date: dateStr,
    day: dayNum,
    isCurrentMonth,
    isToday: dateStr === today,
    isSelected: dateStr === selected,
    isDisabled: disabledDateSet.value.has(dateStr),
    isOutOfRange: isOutOfRangeDate(dateStr),
  }
}

/** 判断日期是否超出 min/max 范围 */
function isOutOfRangeDate(dateStr: string): boolean {
  const d = dayjs(dateStr)
  if (minDayjs.value && d.isBefore(minDayjs.value, 'day')) return true
  if (maxDayjs.value && d.isAfter(maxDayjs.value, 'day')) return true
  return false
}

/** 当前日期是否可被选择 */
function isSelectable(dateStr: string): boolean {
  if (!dateStr) return false
  if (props.disabled) return false
  if (disabledDateSet.value.has(dateStr)) return false
  if (isOutOfRangeDate(dateStr)) return false
  return true
}

// ==================== 方法 ====================

/** 选择日期 */
function selectDate(dateStr: string): void {
  if (!isSelectable(dateStr)) return
  emit('update:modelValue', dateStr)
  emit('change', dateStr)
  isOpen.value = false
  inputRef.value?.focus()
}

/** 切换到上个月 */
function prevMonth(): void {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

/** 切换到下个月 */
function nextMonth(): void {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

/** 切换到今天所在月份 */
function goToToday(): void {
  const now = dayjs()
  currentYear.value = now.year()
  currentMonth.value = now.month()
}

/** 清除选中值 */
function handleClear(event: MouseEvent): void {
  event.stopPropagation()
  emit('update:modelValue', '')
  emit('change', '')
}

/** 根据输入框位置计算面板定位 */
function updatePanelPosition(): void {
  if (!inputRef.value) return
  const rect = inputRef.value.getBoundingClientRect()
  const panelWidth = 300 // 18.75rem
  const panelEstHeight = 340 // 估算面板高度
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let top = rect.bottom + 4
  let left = rect.left

  // 下方空间不够时，向上弹出
  if (top + panelEstHeight > viewportHeight) {
    top = rect.top - panelEstHeight - 4
  }
  // 右侧溢出时向左偏移
  if (left + panelWidth > viewportWidth) {
    left = viewportWidth - panelWidth - 8
  }
  // 左侧溢出修正
  if (left < 0) {
    left = 8
  }

  panelStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
  }
}

/** 展开/收起日历面板 */
function togglePanel(): void {
  if (props.disabled || props.readonly) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    syncMonthToSelected()
    nextTick(() => updatePanelPosition())
  }
}

/** 同步当前展示月份到选中值 */
function syncMonthToSelected(): void {
  if (props.modelValue) {
    const d = dayjs(props.modelValue)
    if (d.isValid()) {
      currentYear.value = d.year()
      currentMonth.value = d.month()
      return
    }
  }
  goToToday()
}

/** 关闭面板 */
function closePanel(): void {
  isOpen.value = false
}

function onInputFocus(event: FocusEvent): void {
  inputFocused.value = true
  emit('focus', event)
}

function onInputBlur(event: FocusEvent): void {
  inputFocused.value = false
  emit('blur', event)
  // 延迟关闭以允许点击面板
  blurTimeoutRef.value = setTimeout(() => {
    if (!panelRef.value?.contains(document.activeElement)) {
      closePanel()
    }
  }, 200)
}

function onInputClick(): void {
  togglePanel()
}

/** 输入框键盘导航 */
function onInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    togglePanel()
  }
  if (event.key === 'Escape') {
    closePanel()
  }
}

/** 面板键盘导航 */
function onPanelKeydown(event: KeyboardEvent): void {
  if (!isOpen.value) return

  const current = props.modelValue ? dayjs(props.modelValue) : dayjs()
  let next = current

  switch (event.key) {
    case 'ArrowLeft':
      next = current.subtract(1, 'day')
      break
    case 'ArrowRight':
      next = current.add(1, 'day')
      break
    case 'ArrowUp':
      next = current.subtract(7, 'day')
      break
    case 'ArrowDown':
      next = current.add(7, 'day')
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (props.modelValue && isSelectable(props.modelValue)) {
        selectDate(props.modelValue)
      }
      return
    case 'Escape':
      closePanel()
      inputRef.value?.focus()
      return
    default:
      return
  }

  event.preventDefault()
  const dateStr = next.format(dateFormat.value)
  if (isSelectable(dateStr)) {
    emit('update:modelValue', dateStr)
    // 同步月份到选定日期
    currentYear.value = next.year()
    currentMonth.value = next.month()
  }
}

// ==================== 点击外部关闭 ====================

function handleClickOutside(event: MouseEvent): void {
  const target = event.target as Node | null
  if (!target) return
  if (panelRef.value?.contains(target)) return
  if (inputRef.value?.parentElement?.contains(target)) return
  closePanel()
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('scroll', updatePanelPosition, true)
  window.addEventListener('resize', updatePanelPosition)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('scroll', updatePanelPosition, true)
  window.removeEventListener('resize', updatePanelPosition)
  if (blurTimeoutRef.value) {
    clearTimeout(blurTimeoutRef.value)
    blurTimeoutRef.value = null
  }
})

// ==================== 输入框显示值 ====================

const displayValue = computed(() => {
  if (!props.modelValue) return ''
  return props.modelValue
})

// ==================== 尺寸映射 ====================

const sizeClass = computed(() => `dp--${props.size}`)

const inputWrapperClass = computed(() => ({
  'dp-input-wrapper': true,
  [sizeClass.value]: true,
  'dp--focused': inputFocused.value,
  'dp--has-error': !!props.error,
  'dp--disabled': props.disabled,
  'dp--has-value': !!props.modelValue,
}))

/** 组件的唯一 ID，用于 label 关联 */
const uid = `dp-${Math.random().toString(36).slice(2, 9)}`
</script>

<template>
  <div class="date-picker">
    <!-- label -->
    <label
      v-if="props.label"
      :for="uid"
      class="dp-label"
      :class="{ 'dp-label--required': props.required }"
    >
      {{ props.label }}
    </label>

    <!-- 输入框触发区 -->
    <div :class="inputWrapperClass">
      <input
        :id="uid"
        ref="inputRef"
        type="text"
        class="dp-input"
        :value="displayValue"
        :name="props.name"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :required="props.required"
        autocomplete="off"
        aria-haspopup="dialog"
        :aria-expanded="isOpen"
        :aria-label="props.label || '选择日期'"
        @focus="onInputFocus"
        @blur="onInputBlur"
        @click="onInputClick"
        @keydown="onInputKeydown"
      />

      <!-- 右侧图标区 -->
      <span class="dp-suffix">
        <!-- 清除按钮 -->
        <button
          v-if="props.clearable && props.modelValue && !props.disabled"
          type="button"
          class="dp-clear-btn"
          tabindex="-1"
          aria-label="清除日期"
          @mousedown.prevent
          @click="handleClear"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <!-- 日历图标 -->
        <svg
          class="dp-calendar-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
        </svg>
      </span>
    </div>

    <!-- 校验错误 -->
    <p v-if="props.error" class="dp-error">{{ props.error }}</p>

    <!-- 辅助提示 -->
    <p v-else-if="props.hint" class="dp-hint">{{ props.hint }}</p>

    <!-- 日历面板 -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="dp-panel"
        :style="panelStyle"
        role="dialog"
        :aria-label="`日期选择 - ${monthYearLabel}`"
        @keydown="onPanelKeydown"
      >
        <!-- 面板头部：月切换 + 年 -->
        <div class="dp-panel-header">
          <button
            type="button"
            class="dp-nav-btn"
            aria-label="上个月"
            @click="prevMonth"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <span class="dp-month-year" role="heading" aria-level="2">
            {{ monthYearLabel }}
          </span>

          <button
            type="button"
            class="dp-nav-btn"
            aria-label="下个月"
            @click="nextMonth"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        <!-- 星期表头 -->
        <div class="dp-week-header">
          <span
            v-for="(wh, idx) in weekHeaders"
            :key="idx"
            class="dp-week-day"
          >
            {{ wh }}
          </span>
        </div>

        <!-- 日期网格 -->
        <div class="dp-grid" role="grid" aria-label="日期网格">
          <div
            v-for="(week, wi) in calendarDays"
            :key="wi"
            class="dp-week-row"
            role="row"
          >
            <button
              v-for="(cell, ci) in week"
              :key="ci"
              type="button"
              class="dp-day-cell"
              :class="{
                'dp-day--outside': !cell.isCurrentMonth,
                'dp-day--today': cell.isToday,
                'dp-day--selected': cell.isSelected,
                'dp-day--disabled': cell.isDisabled || cell.isOutOfRange,
              }"
              :disabled="!cell.isCurrentMonth || cell.isDisabled || cell.isOutOfRange"
              :aria-label="cell.date"
              :aria-selected="cell.isSelected"
              :aria-disabled="cell.isDisabled || cell.isOutOfRange"
              :tabindex="cell.isSelected ? 0 : -1"
              @click="selectDate(cell.date)"
            >
              {{ cell.day }}
            </button>
          </div>
        </div>

        <!-- 底部快捷按钮 -->
        <div class="dp-panel-footer">
          <button
            type="button"
            class="dp-footer-btn"
            @click="goToToday"
          >
            今天
          </button>
          <button
            type="button"
            class="dp-footer-btn"
            @click="closePanel"
          >
            关闭
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ==================== 容器 ==================== */
.date-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  position: relative;
}

/* ==================== Label ==================== */
.dp-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  user-select: none;
}

.dp-label--required::after {
  content: ' *';
  color: var(--color-status-expired);
}

/* ==================== 输入框 ==================== */
.dp-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-card);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
  cursor: pointer;
}

.dp-input-wrapper:hover:not(.dp--disabled) {
  border-color: var(--color-primary);
}

.dp-input-wrapper.dp--focused {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-focus);
}

.dp-input-wrapper.dp--has-error {
  border-color: var(--color-status-expired);
}

.dp-input-wrapper.dp--has-error.dp--focused {
  box-shadow: 0 0 0 3px var(--color-status-expired-bg);
}

.dp-input-wrapper.dp--disabled {
  background-color: var(--color-bg-hover);
  border-color: var(--color-border-light);
  cursor: not-allowed;
  opacity: 0.6;
}

/* 尺寸 */
.dp--sm .dp-input {
  height: var(--size-btn-sm-height);
  font-size: var(--font-size-xs);
  padding: 0 var(--space-2);
}

.dp--md .dp-input {
  height: var(--size-input-height);
  font-size: var(--font-size-sm);
  padding: 0 var(--space-3);
}

.dp--lg .dp-input {
  height: var(--size-btn-lg-height);
  font-size: var(--font-size-base);
  padding: 0 var(--space-4);
}

.dp-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  outline: none;
  cursor: pointer;
  font-family: inherit;
  line-height: 1;
}

.dp-input::placeholder {
  color: var(--color-text-disabled);
}

.dp-input:disabled {
  cursor: not-allowed;
}

/* ==================== 后缀图标区 ==================== */
.dp-suffix {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding-right: var(--space-2);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.dp-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-tertiary);
  padding: 0;
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background-color var(--transition-fast);
}

.dp-clear-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-hover);
}

.dp-calendar-icon {
  flex-shrink: 0;
}

/* ==================== 错误 / 提示 ==================== */
.dp-error {
  font-size: var(--font-size-xs);
  color: var(--color-status-expired);
  margin: 0;
  line-height: 1.4;
}

.dp-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
  line-height: 1.4;
}

/* ==================== 日历面板 ==================== */
/* 面板定位通过 inline style 动态计算 */
.dp-panel {
  z-index: 1100;
  width: 18.75rem;
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  padding: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

/* 面板头部 */
.dp-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.dp-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.dp-nav-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.dp-nav-btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.dp-month-year {
  font-weight: 600;
  font-size: var(--font-size-base);
  user-select: none;
}

/* 星期表头 */
.dp-week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.125rem;
  margin-bottom: var(--space-1);
}

.dp-week-day {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 500;
  user-select: none;
}

/* 日期网格 */
.dp-grid {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.dp-week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.125rem;
}

/* 日期格 */
.dp-day-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2.25rem;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: inherit;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    font-weight var(--transition-fast);
  position: relative;
}

.dp-day-cell:hover:not(:disabled) {
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
}

.dp-day-cell:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

/* 非当月日期 */
.dp-day--outside {
  color: var(--color-text-disabled);
}

/* 今天 */
.dp-day--today {
  font-weight: 700;
  color: var(--color-primary);
}

.dp-day--today::after {
  content: '';
  position: absolute;
  bottom: 0.25rem;
  width: 0.25rem;
  height: 0.25rem;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
}

/* 选中态 */
.dp-day--selected {
  background-color: var(--color-primary) !important;
  color: #ffffff !important;
  font-weight: 600;
}

.dp-day--selected::after {
  background-color: #ffffff;
}

/* 禁用态（禁选范围 + 超出范围） */
.dp-day--disabled {
  color: var(--color-text-disabled) !important;
  background-color: var(--color-bg-hover) !important;
  cursor: not-allowed !important;
  opacity: 0.5;
  text-decoration: line-through;
}

.dp-day--disabled:hover {
  background-color: var(--color-bg-hover) !important;
  color: var(--color-text-disabled) !important;
}

/* 面板底部 */
.dp-panel-footer {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border-light);
}

.dp-footer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.875rem;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-family: inherit;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.dp-footer-btn:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.dp-footer-btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .dp-panel {
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%);
    width: calc(100vw - var(--space-8));
    max-width: 21.25rem;
  }
}
</style>
