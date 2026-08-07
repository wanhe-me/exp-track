<script setup lang="ts">
import { useRouter } from 'vue-router'
import { AppButton } from '@/components/base'

const router = useRouter()

const goHome = (): void => {
  void router.replace({ name: 'dashboard' })
}

const goBack = (): void => {
  if (window.history.length > 1) {
    router.back()
  } else {
    void router.replace({ name: 'dashboard' })
  }
}
</script>

<template>
  <div class="error-page">
    <div class="error-content glass">
      <FaIcon icon="triangle-exclamation" class="error-icon" />
      <h1 class="error-code">404</h1>
      <p class="error-title">页面未找到</p>
      <p class="error-desc">你访问的页面不存在或已被移除</p>
      <div class="error-actions">
        <AppButton icon="arrow-left" @click="goBack">返回上一页</AppButton>
        <AppButton variant="primary" @click="goHome">返回看板</AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--size-nav-height) - var(--space-12));
  padding: var(--space-6);
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-12) var(--space-10);
  border-radius: var(--radius-xl);
  max-width: 30rem;
  width: 100%;
}

.error-icon {
  width: 3rem;
  height: 3rem;
  color: var(--color-status-expired);
  margin-bottom: var(--space-4);
}

.error-code {
  font-size: 4.5rem;
  font-weight: 800;
  line-height: 1;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.error-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.error-desc {
  font-size: var(--font-size-base);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-8);
}

.error-actions {
  display: flex;
  gap: var(--space-3);
}

@media (max-width: 768px) {
  .error-content {
    padding: var(--space-8) var(--space-6);
  }

  .error-code {
    font-size: 3.5rem;
  }

  .error-actions {
    flex-direction: column;
    width: 100%;
  }

  .error-actions .app-btn {
    width: 100%;
  }
}
</style>
