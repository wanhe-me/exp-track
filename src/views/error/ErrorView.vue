<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const errorType = (route.query.type as string) || 'unknown'
const errorMessage = (route.query.message as string) || ''

const errorConfigMap = {
  network: { icon: 'wifi' as const, title: '网络连接失败', description: '请检查网络连接后重试' },
  server: { icon: 'circle-exclamation' as const, title: '服务器错误', description: '服务暂时不可用，请稍后重试' },
  unknown: { icon: 'triangle-exclamation' as const, title: '出错了', description: '发生了一个意外错误' },
}

type ErrorKey = keyof typeof errorConfigMap
const errorKey: ErrorKey = (Object.hasOwn(errorConfigMap, errorType) ? errorType : 'unknown') as ErrorKey
const config = errorConfigMap[errorKey]

const goHome = (): void => {
  void router.replace({ name: 'dashboard' })
}

const retry = (): void => {
  router.back()
}
</script>

<template>
  <div class="error-page">
    <div class="error-content glass">
      <FaIcon :icon="config.icon" class="error-icon" />
      <h1 class="error-title">{{ config.title }}</h1>
      <p class="error-desc">{{ errorMessage || config.description }}</p>
      <div class="error-actions">
        <button class="btn" @click="retry">
          <FaIcon icon="arrow-left" />
          返回上一页
        </button>
        <button class="btn btn-primary" @click="goHome">返回看板</button>
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

  .error-actions {
    flex-direction: column;
    width: 100%;
  }

  .error-actions .btn {
    width: 100%;
  }
}
</style>
