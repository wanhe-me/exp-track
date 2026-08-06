<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import AppSidebar from '@/components/layout/AppSidebar.vue'

const uiStore = useUiStore()
const { mobileDrawerOpen } = storeToRefs(uiStore)
</script>

<template>
  <div class="app-layout">
    <AppSidebar />

    <!-- 移动端遮罩 -->
    <div
      v-if="mobileDrawerOpen"
      class="drawer-mask"
      @click="uiStore.closeMobileDrawer()"
    ></div>

    <div class="app-main">
      <!-- 移动端顶栏：汉堡 + 标题 -->
      <header class="mobile-topbar glass">
        <button
          class="hamburger-btn"
          aria-label="打开菜单"
          @click="uiStore.toggleMobileDrawer()"
        >
          <FaIcon icon="bars" />
        </button>
        <RouterLink to="/dashboard" class="mobile-logo">
          <FaIcon icon="clock" class="mobile-logo-icon" />
          <span>exp-track</span>
        </RouterLink>
      </header>

      <main class="app-content">
        <div class="content-inner">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
  padding: var(--space-6) 0;
}

.content-inner {
  max-width: var(--layout-max-width);
  margin: 0 auto;
  padding: 0 var(--space-6);
  width: 100%;
}

.drawer-mask {
  position: fixed;
  inset: 0;
  background-color: var(--color-bg-overlay);
  z-index: 150;
  display: none;
}

.mobile-topbar {
  display: none;
  align-items: center;
  gap: var(--space-3);
  height: var(--size-nav-height);
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.hamburger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 1.125rem;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.hamburger-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.mobile-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}

.mobile-logo-icon {
  width: 1.125rem;
  height: 1.125rem;
  color: var(--color-primary);
}

/* ---- 移动端 ---- */
@media (max-width: 768px) {
  .mobile-topbar {
    display: flex;
  }

  .drawer-mask {
    display: block;
  }

  .app-content {
    padding: var(--space-4) 0;
  }

  .content-inner {
    padding: 0 var(--space-4);
  }
}
</style>
