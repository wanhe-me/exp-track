/**
 * 公共组件聚合入口
 *
 * 使用方法：
 *   import { StatusBadge, DatePicker } from '@/components/base'
 *   或按需直接引入子路径：import StatusBadge from '@/components/base/display/StatusBadge.vue'
 */

// ---- display（展示型组件） ----
export { default as StatusBadge } from './display/StatusBadge.vue'
export { default as CategoryTag } from './display/CategoryTag.vue'
export { default as EmptyState } from './display/EmptyState.vue'

// ---- dialog（弹窗/反馈组件） ----
export { default as ConfirmDialog } from './dialog/ConfirmDialog.vue'

// ---- controls（控件/操作组件） ----
export { default as ThemeToggle } from './controls/ThemeToggle.vue'
export { default as SizeControl } from './controls/SizeControl.vue'

// ---- form（表单输入组件） ----
export { default as DatePicker } from './form/DatePicker.vue'
export type { DisabledDateRange, DatePickerSize } from './form/types'
