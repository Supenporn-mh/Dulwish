import { createRouter, createWebHistory } from 'vue-router'
import IdleView from '@/views/IdleView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'idle',
      component: IdleView,
      meta: { requiresAuth: false },
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/balance',
      name: 'balance',
      component: () => import('@/views/BalanceView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/topup',
      name: 'topup',
      component: () => import('@/views/KioskTopupView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/feedback',
      name: 'feedback',
      component: () => import('@/views/FeedbackView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/error/network',
      name: 'error-network',
      component: () => import('@/views/ErrorNetworkView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/error/503',
      name: 'error-503',
      component: () => import('@/views/ErrorServiceView.vue'),
      meta: { requiresAuth: false },
    },
  ],
})

// Navigation guard: redirect to idle if no session on protected routes
router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth) {
    // Dynamic import to avoid circular deps
    import('@/stores/kiosk').then(({ useKioskStore }) => {
      const store = useKioskStore()
      if (!store.currentUser) {
        next({ name: 'idle' })
      } else {
        next()
      }
    })
  } else {
    next()
  }
})

export default router
