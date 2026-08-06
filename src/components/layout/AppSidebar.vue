<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import ThemeToggle from '@/components/base/controls/ThemeToggle.vue'
import SizeControl from '@/components/base/controls/SizeControl.vue'

const route = useRoute()
const uiStore = useUiStore()
const { sidebarCollapsed, mobileDrawerOpen } = storeToRefs(uiStore)

interface NavItem {
  to: string
  label: string
  icon: string
  exact?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: '概览',
    items: [
      { to: '/dashboard', label: '看板', icon: 'gauge-high', exact: true },
      { to: '/timeline', label: '时间轴', icon: 'chart-line' },
    ],
  },
  {
    title: '管理',
    items: [{ to: '/management', label: '订阅管理', icon: 'table-list' }],
  },
  {
    title: '归档区',
    items: [
      { to: '/archived', label: '已归档', icon: 'box-archive' },
      { to: '/deleted', label: '回收站', icon: 'trash-can' },
    ],
  },
]

const isLinkActive = (item: NavItem): boolean => {
  if (item.exact) return route.path === item.to
  return route.path === item.to || route.path.startsWith(item.to + '/')
}

const onNavClick = (): void => {
  // 移动端：点击导航后自动收起抽屉
  uiStore.closeMobileDrawer()
}
</script>

<template>
  <aside
    class="sidebar"
    :class="{
      'sidebar-collapsed': sidebarCollapsed,
      'sidebar-mobile-open': mobileDrawerOpen,
    }"
  >
    <div class="sidebar-header">
      <RouterLink to="/dashboard" class="sidebar-logo" @click="onNavClick">
        <FaIcon icon="clock" class="logo-icon" />
        <span v-if="!sidebarCollapsed" class="logo-text">exp-track</span>
      </RouterLink>
    </div>

    <nav class="sidebar-nav">
      <div v-for="group in navGroups" :key="group.title" class="nav-group">
        <p v-if="!sidebarCollapsed" class="nav-group-title">{{ group.title }}</p>
        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ 'nav-link-active': isLinkActive(item) }"
          :title="sidebarCollapsed ? item.label : undefined"
          @click="onNavClick"
        >
          <FaIcon :icon="item.icon" class="nav-icon" fixed-width />
          <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div v-if="!sidebarCollapsed" class="footer-controls">
        <ThemeToggle />
        <SizeControl />
      </div>
      <button
        class="collapse-btn"
        :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="uiStore.toggleSidebar()"
      >
        <FaIcon :icon="sidebarCollapsed ? 'angle-right' : 'angle-left'" fixed-width />
        <span v-if="!sidebarCollapsed" class="collapse-label">收起</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 14rem;
  flex-shrink: 0;
  height: 100vh;
  position: sticky;
  top: 0;
  border-right: 1px solid var(--color-border-light);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  transition: width var(--transition-base);
  overflow: hidden;
}

.sidebar-collapsed {
  width: 3.75rem;
}

.sidebar-header {
  padding: var(--space-4) var(--space-4);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.sidebar-logo:hover {
  color: var(--color-text-primary);
}

.logo-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-primary);
  flex-shrink: 0;
}

.logo-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-3) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-group-title {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  padding: 0 var(--space-3);
  margin-bottom: var(--space-1);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 2.5rem;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  white-space: nowrap;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.nav-link:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.nav-link.nav-link-active {
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 500;
}

.nav-icon {
  width: 1.125rem;
  flex-shrink: 0;
  text-align: center;
}

.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-collapsed .nav-link {
  justify-content: center;
  padding: 0;
}

.sidebar-footer {
  border-top: 1px solid var(--color-border-light);
  padding: var(--space-3);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.footer-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 2.25rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  width: 100%;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.collapse-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.sidebar-collapsed .collapse-btn {
  height: 2.5rem;
}

/* ---- 移动端抽屉 ---- */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 200;
    width: 16rem;
    transform: translateX(-100%);
    transition: transform var(--transition-base);
  }

  .sidebar-collapsed {
    width: 16rem;
  }

  .sidebar-mobile-open {
    transform: translateX(0);
  }
}
</style>
