/** 表单公共组件类型定义 */

/** 禁选日期范围：单个日期或起止区间 */
export interface DisabledDateRange {
  /** 起始日期 YYYY-MM-DD（与 end 成对使用，表示闭区间） */
  start?: string
  /** 结束日期 YYYY-MM-DD（与 start 成对使用，表示闭区间） */
  end?: string
  /** 独立禁选日期列表（单项快捷方式） */
  dates?: string[]
}

/** 日期选择器尺寸 */
export type DatePickerSize = 'sm' | 'md' | 'lg'
