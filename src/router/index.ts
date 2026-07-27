import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    description?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: {
          title: '订阅看板',
          description: '集中查看所有订阅的剩余天数、状态与价格，临期与已过期项突出展示，按剩余天数升序排列。',
        },
      },
      {
        path: 'timeline',
        name: 'timeline',
        component: () => import('@/views/TimelineView.vue'),
        meta: {
          title: '未来到期时间轴',
          description: '以时间轴可视化展示未来 90 天内即将到期的订阅分布，帮助你提前规划续费。',
        },
      },
      {
        path: 'archived',
        name: 'archived',
        component: () => import('@/views/ArchivedView.vue'),
        meta: {
          title: '已归档订阅',
          description: '查看已归档的订阅记录，可随时取消归档恢复到默认看板。',
        },
      },
      {
        path: 'deleted',
        name: 'deleted',
        component: () => import('@/views/DeletedView.vue'),
        meta: {
          title: '回收站',
          description: '查看已软删除的订阅记录，可恢复误删的数据。',
        },
      },
      {
        path: 'categories',
        name: 'categories',
        component: () => import('@/views/CategoriesView.vue'),
        meta: {
          title: '分类管理',
          description: '自定义订阅分类，集中管理分类的增删改，避免重复造轮子。',
        },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
