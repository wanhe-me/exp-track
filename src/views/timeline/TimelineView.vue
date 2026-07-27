<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { storeToRefs } from 'pinia'
import { useSubscriptionStore } from '@/stores/subscription'
import { useCategoryStore } from '@/stores/category'
import { domainConfig } from '@/types'
import type { SubscriptionStatus } from '@/types'
import { formatDate, remainingDaysLabel } from '@/utils/date'
import EmptyState from '@/components/base/EmptyState.vue'

const subscriptionStore = useSubscriptionStore()
const categoryStore = useCategoryStore()
const { loading } = storeToRefs(subscriptionStore)

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const timelineData = computed(() => subscriptionStore.timelineSubscriptions)

const getCssVar = (name: string): string => {
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const statusColors = computed<Record<SubscriptionStatus, string>>(() => ({
  expired: getCssVar('--color-status-expired'),
  soon7: getCssVar('--color-status-soon7'),
  soon30: getCssVar('--color-status-soon30'),
  sufficient: getCssVar('--color-status-sufficient'),
}))

const buildOption = (): echarts.EChartsOption => {
  const range = domainConfig.timeline.rangeDays
  const subs = timelineData.value
  const colors = statusColors.value
  const textSecondary = getCssVar('--color-text-secondary')
  const textTertiary = getCssVar('--color-text-tertiary')
  const borderColor = getCssVar('--color-border-light')
  const bgPage = getCssVar('--color-bg-page')

  const data = subs.map((s) => ({
    value: [s.remainingDays, s.name],
    itemStyle: { color: colors[s.status] },
  }))

  return {
    title: {
      text: `未来 ${range} 天到期分布`,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
        color: getCssVar('--color-text-primary'),
      },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: getCssVar('--glass-bg'),
      borderColor: getCssVar('--glass-border-strong'),
      textStyle: { color: getCssVar('--color-text-primary') },
      extraCssText: `backdrop-filter: ${getCssVar('--glass-blur')}; -webkit-backdrop-filter: ${getCssVar('--glass-blur')};`,
      formatter: (params: unknown) => {
        const p = params as { dataIndex: number }
        const sub = subs[p.dataIndex]
        if (!sub) return ''
        return `<strong>${sub.name}</strong><br/>到期日期：${formatDate(sub.expireDate)}<br/>价格：¥${sub.price.toFixed(2)}<br/>分类：${sub.categoryName || '未分类'}`
      },
    },
    grid: {
      left: '8%',
      right: '5%',
      bottom: '10%',
      top: '15%',
    },
    xAxis: {
      type: 'value',
      name: '剩余天数',
      nameLocation: 'middle',
      nameGap: 30,
      min: 0,
      max: range,
      interval: Math.ceil(range / 9),
      axisLine: { lineStyle: { color: borderColor } },
      axisLabel: { color: textSecondary },
      nameTextStyle: { color: textTertiary },
      splitLine: { lineStyle: { color: borderColor } },
    },
    yAxis: {
      type: 'category',
      data: subs.map((s) => s.name),
      inverse: true,
      axisLine: { lineStyle: { color: borderColor } },
      axisLabel: {
        width: 120,
        overflow: 'truncate',
        fontSize: 12,
        color: textSecondary,
      },
      splitLine: { lineStyle: { color: borderColor } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: 16,
        data,
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: bgPage },
        },
      },
    ],
  }
}

const renderChart = (): void => {
  if (!chartRef.value || timelineData.value.length === 0) return
  if (!chart) {
    chart = echarts.init(chartRef.value)
  }
  chart.setOption(buildOption())
}

const handleResize = (): void => {
  chart?.resize()
}

onMounted(async () => {
  await Promise.all([categoryStore.fetchAll(), subscriptionStore.setView('active')])
  await nextTick()
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})

watch(timelineData, () => {
  nextTick(renderChart)
})
</script>

<template>
  <div class="timeline-view">
    <div class="page-header">
      <h1 class="page-title">未来到期时间轴</h1>
      <p class="page-desc">展示未来 {{ domainConfig.timeline.rangeDays }} 天内到期的订阅分布，点击节点查看详情</p>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <EmptyState
      v-else-if="timelineData.length === 0"
      title="未来无到期订阅"
      :description="`未来 ${domainConfig.timeline.rangeDays} 天内没有即将到期的订阅`"
    />

    <div v-else class="chart-wrapper glass">
      <div ref="chartRef" class="chart"></div>
    </div>

    <div v-if="timelineData.length > 0" class="timeline-list glass">
      <h2 class="section-title">即将到期列表</h2>
      <div class="list-items">
        <div v-for="sub in timelineData" :key="sub.id" class="list-item" :class="`is-${sub.status}`">
          <span class="item-dot" :style="{ backgroundColor: statusColors[sub.status] }"></span>
          <span class="item-name">{{ sub.name }}</span>
          <span class="item-date">{{ formatDate(sub.expireDate) }}</span>
          <span class="item-remaining">{{ remainingDaysLabel(sub.remainingDays) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.chart-wrapper {
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.chart {
  width: 100%;
  height: 480px;
}

.timeline-list {
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  margin-bottom: var(--space-4);
}

.list-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.list-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-page);
  font-size: var(--font-size-sm);
}

.list-item.is-expired {
  background-color: var(--color-status-expired-bg);
}

.list-item.is-soon7 {
  background-color: var(--color-status-soon7-bg);
}

.item-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  font-weight: 500;
}

.item-date {
  color: var(--color-text-secondary);
}

.item-remaining {
  color: var(--color-text-tertiary);
  min-width: 100px;
  text-align: right;
}
</style>
