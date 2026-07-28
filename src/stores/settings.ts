import { defineStore } from 'pinia'
import { ref } from 'vue'

/** localStorage 持久化 key（沿用 exp-track-* 命名约定） */
const STORAGE_KEY = 'exp-track-ui-scale'

/** 界面尺寸档位预设。store 与 SizeControl 共用同一份常量。 */
export const UI_SCALE_PRESETS = [
  { value: 0.9, key: 'compact', label: '紧凑' },
  { value: 1.0, key: 'default', label: '默认' },
  { value: 1.10, key: 'cozy', label: '宽松' },
  { value: 1.25, key: 'large', label: '大号' },
] as const

export type UiScalePreset = (typeof UI_SCALE_PRESETS)[number]
export type UiScale = UiScalePreset['value']

const isUiScale = (v: unknown): v is UiScale =>
  UI_SCALE_PRESETS.some((p) => p.value === v)

const readPersistedScale = (): UiScale => {
  if (typeof localStorage === 'undefined') return 1.0
  const raw = localStorage.getItem(STORAGE_KEY)
  const parsed = raw === null ? NaN : Number(raw)
  return isUiScale(parsed) ? parsed : 1.0
}

export const useSettingsStore = defineStore('settings', () => {
  const uiScale = ref<UiScale>(readPersistedScale())

  const setUiScale = (value: UiScale): void => {
    if (!isUiScale(value)) return
    uiScale.value = value
    document.documentElement.style.setProperty('--ui-scale', String(value))
    localStorage.setItem(STORAGE_KEY, String(value))
  }

  return { uiScale, setUiScale }
})
