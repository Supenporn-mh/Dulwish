import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true, title: 'Dashboard' },
    },
    {
      path: '/users',
      name: 'Users',
      component: () => import('@/views/UsersView.vue'),
      meta: { requiresAuth: true, title: 'Users' },
    },
    {
      path: '/students',
      name: 'Students',
      component: () => import('@/views/StudentsView.vue'),
      meta: { requiresAuth: true, title: 'Students' },
    },
    {
      path: '/menu',
      name: 'Menu',
      component: () => import('@/views/MenuView.vue'),
      meta: { requiresAuth: true, title: 'Menu Management' },
    },
    {
      path: '/transactions',
      name: 'Transactions',
      component: () => import('@/views/TransactionsView.vue'),
      meta: { requiresAuth: true, title: 'Transactions' },
    },
    {
      path: '/reports',
      name: 'Reports',
      component: () => import('@/views/ReportsView.vue'),
      meta: { requiresAuth: true, title: 'Reports' },
    },
    {
      path: '/audit',
      name: 'Audit',
      component: () => import('@/views/AuditView.vue'),
      meta: { requiresAuth: true, title: 'Audit Log' },
    },
    {
      path: '/policies',
      name: 'Policies',
      component: () => import('@/views/PoliciesView.vue'),
      meta: { requiresAuth: true, title: 'Policies' },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.accessToken) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && auth.accessToken) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
