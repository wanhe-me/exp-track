import { defineStore } from 'pinia'
import { ref } from 'vue'

/** localStorage 持久化 key（沿用 exp-track-* 命名约定） */
const SIDEBAR_KEY = 'exp-track-sidebar-collapsed'

const readPersistedCollapsed = (): boolean => {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(SIDEBAR_KEY) === '1'
}

/**
 * 全局 UI 状态：侧边栏折叠（桌面持久化）+ 移动端抽屉（瞬时，不持久化）。
 * 界面尺寸缩放仍由 stores/settings 管理，此处仅负责侧边栏。
 */
export const useUiStore = defineStore('ui', () => {
  // 桌面侧边栏折叠状态，持久化
  const sidebarCollapsed = ref<boolean>(readPersistedCollapsed())

  // 移动端抽屉开关，瞬时状态（路由切换 / 遮罩点击时关闭）
  const mobileDrawerOpen = ref<boolean>(false)

  const setSidebarCollapsed = (collapsed: boolean): void => {
    sidebarCollapsed.value = collapsed
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    }
  }

  const toggleSidebar = (): void => {
    setSidebarCollapsed(!sidebarCollapsed.value)
  }

  const openMobileDrawer = (): void => {
    mobileDrawerOpen.value = true
  }

  const closeMobileDrawer = (): void => {
    mobileDrawerOpen.value = false
  }

  const toggleMobileDrawer = (): void => {
    mobileDrawerOpen.value = !mobileDrawerOpen.value
  }

  return {
    sidebarCollapsed,
    mobileDrawerOpen,
    setSidebarCollapsed,
    toggleSidebar,
    openMobileDrawer,
    closeMobileDrawer,
    toggleMobileDrawer,
  }
})
