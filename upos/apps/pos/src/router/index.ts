import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import POSView from '@/views/POSView.vue'
import BuffetView from '@/views/BuffetView.vue'
import PreordersView from '@/views/PreordersView.vue'
import PosTopupView from '@/views/PosTopupView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/pos',
      name: 'pos',
      component: POSView,
      meta: { requiresAuth: true },
    },
    {
      path: '/buffet',
      name: 'buffet',
      component: BuffetView,
      meta: { requiresAuth: true },
    },
    {
      path: '/preorders',
      name: 'preorders',
      component: PreordersView,
      meta: { requiresAuth: true },
    },
    {
      path: '/topup',
      name: 'topup',
      component: PosTopupView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && auth.isLoggedIn) {
    next('/pos')
  } else {
    next()
  }
})

export default router
