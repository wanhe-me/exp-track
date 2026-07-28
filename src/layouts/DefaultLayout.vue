<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import ThemeToggle from '@/components/base/controls/ThemeToggle.vue'
import SizeControl from '@/components/base/controls/SizeControl.vue'

const subscriptionStore = useSubscriptionStore()

// 临期/已过期数量徽标
const alertCount = computed(() => {
  return subscriptionStore.subscriptions.filter(
    (s) => s.status === 'expired' || s.status === 'soon7',
  ).length
})

const navItems = [
  { to: '/', label: '看板', exact: true },
  { to: '/timeline', label: '时间轴' },
  { to: '/archived', label: '已归档' },
  { to: '/deleted', label: '回收站' },
  { to: '/categories', label: '分类' },
]
</script>

<template>
  <div class="layout">
    <header class="layout-header glass">
      <div class="header-inner">
        <RouterLink to="/" class="logo">
          <FaIcon icon="clock" class="logo-icon" />
          <span class="logo-text">exp-track</span>
        </RouterLink>
        <div class="header-right">
          <nav class="nav">
            <RouterLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="nav-link"
              :class="{ exact: item.exact }"
            >
              {{ item.label }}
              <span v-if="item.to === '/' && alertCount > 0" class="nav-badge">{{ alertCount }}</span>
            </RouterLink>
          </nav>
          <ThemeToggle />
          <SizeControl />
        </div>
      </div>
    </header>

    <main class="layout-main">
      <div class="main-inner">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.layout-header {
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--color-border);
}

.header-inner {
  max-width: var(--layout-max-width);
  margin: 0 auto;
  padding: 0 var(--space-6);
  height: var(--size-nav-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}

.logo:hover {
  color: var(--color-text-primary);
}

.logo-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.nav {
  display: flex;
  gap: var(--space-1);
}

.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.nav-link:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.nav-link.router-link-active {
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 500;
}

.nav-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 0.3125rem;
  margin-left: var(--space-1);
  border-radius: var(--radius-full);
  background-color: var(--color-status-expired);
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: 600;
  line-height: 1;
}

.layout-main {
  flex: 1;
  padding: var(--space-6) 0;
}

.main-inner {
  max-width: var(--layout-max-width);
  margin: 0 auto;
  padding: 0 var(--space-6);
}

@media (max-width: 768px) {
  .header-inner {
    padding: 0 var(--space-4);
  }

  .header-right {
    gap: var(--space-2);
  }

  .nav {
    max-width: calc(100vw - 10rem);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .nav::-webkit-scrollbar {
    display: none;
  }

  .nav-link {
    padding: 0 var(--space-3);
    font-size: var(--font-size-sm);
    white-space: nowrap;
  }

  .main-inner {
    padding: 0 var(--space-4);
  }
}
</style>
