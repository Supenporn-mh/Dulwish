import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',       name: 'home',  component: () => import('@/views/HomeView.vue') },
    { path: '/login',  name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/parent/register', name: 'parent-register', component: () => import('@/views/parent/ParentRegisterView.vue') },

    // ── Parent ──────────────────────────────────────────────────────
    {
      path: '/parent',
      component: () => import('@/views/parent/ParentLayout.vue'),
      meta: { roles: ['parent'] },
      children: [
        { path: '',          redirect: 'dashboard' },
        { path: 'dashboard', component: () => import('@/views/parent/DashboardView.vue') },
        { path: 'topup',     component: () => import('@/views/parent/TopupView.vue') },
        { path: 'preorder',  component: () => import('@/views/parent/PreorderView.vue') },
        { path: 'history',     component: () => import('@/views/parent/HistoryView.vue')          },
        { path: 'add-student', component: () => import('@/views/parent/ParentAddStudentView.vue') },
      ],
    },

    // ── Admin ────────────────────────────────────────────────────────
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { roles: ['admin', 'supervisor'] },
      children: [
        { path: '',             redirect: 'dashboard' },
        { path: 'dashboard',    component: () => import('@/views/admin/DashboardView.vue') },
        { path: 'users',        component: () => import('@/views/admin/UsersView.vue') },
        { path: 'students',     component: () => import('@/views/admin/StudentsView.vue') },
        { path: 'menu',         component: () => import('@/views/admin/MenuView.vue') },
        { path: 'transactions', component: () => import('@/views/admin/TransactionsView.vue') },
        { path: 'reports',      component: () => import('@/views/admin/ReportsView.vue') },
        { path: 'audit',        component: () => import('@/views/admin/AuditView.vue') },
        { path: 'policies',      component: () => import('@/views/admin/PoliciesView.vue') },
        { path: 'academic-year', component: () => import('@/views/admin/AcademicYearView.vue') },
      ],
    },

    // ── POS ─────────────────────────────────────────────────────────
    {
      path: '/pos',
      component: () => import('@/views/pos/PosLayout.vue'),
      meta: { roles: ['cashier', 'supervisor'] },
      children: [
        { path: '',        redirect: 'sale' },
        { path: 'sale',    component: () => import('@/views/pos/SaleView.vue') },
        { path: 'buffet',  component: () => import('@/views/pos/BuffetView.vue') },
        { path: 'orders',  component: () => import('@/views/pos/PreordersView.vue') },
        { path: 'topup',   component: () => import('@/views/pos/TopupView.vue') },
      ],
    },

    // ── Kiosk ────────────────────────────────────────────────────────
    {
      path: '/kiosk',
      component: () => import('@/views/kiosk/KioskLayout.vue'),
      children: [
        { path: '',         redirect: 'idle' },
        { path: 'idle',     component: () => import('@/views/kiosk/IdleView.vue') },
        { path: 'home',     component: () => import('@/views/kiosk/KioskHomeView.vue') },
        { path: 'balance',  component: () => import('@/views/kiosk/BalanceView.vue') },
        { path: 'topup',    component: () => import('@/views/kiosk/TopupView.vue') },
        { path: 'feedback', component: () => import('@/views/kiosk/FeedbackView.vue') },
      ],
    },

    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('upos_token')
  const user  = JSON.parse(localStorage.getItem('upos_user') ?? 'null')
  const roles = to.meta.roles as string[] | undefined

  if (!roles) return next()
  if (!token || !user) return next({ name: 'login', query: { redirect: to.fullPath } })
  if (!roles.includes(user.role)) return next('/')
  next()
})

export default router
