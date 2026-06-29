import { createRouter, createWebHistory } from 'vue-router'

// routes
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
        { path: 'banners',      component: () => import('@/views/admin/BannerView.vue') },
        { path: 'devices',      component: () => import('@/views/admin/DevicesView.vue') },
        { path: 'students',     component: () => import('@/views/admin/StudentsView.vue') },
        { path: 'transactions', component: () => import('@/views/admin/TransactionsView.vue') },
        { path: 'transactions/:id/tax-invoice', component: () => import('@/views/admin/TaxInvoiceView.vue') },
        { path: 'reports',      component: () => import('@/views/admin/ReportsView.vue') },
        { path: 'audit',        component: () => import('@/views/admin/AuditView.vue') },
        { path: 'policies',      component: () => import('@/views/admin/PoliciesView.vue') },
        { path: 'academic-year', component: () => import('@/views/admin/AcademicYearView.vue') },
        { path: 'buffet',             redirect: 'buffet/rounds' },
        { path: 'buffet/rounds',      component: () => import('@/views/admin/buffet/BuffetRoundsView.vue') },
        { path: 'buffet/schedule',    component: () => import('@/views/admin/buffet/BuffetScheduleView.vue') },
        { path: 'buffet/pricing',     component: () => import('@/views/admin/buffet/BuffetPricingView.vue') },
        { path: 'buffet/history',     component: () => import('@/views/admin/buffet/BuffetHistoryView.vue') },
        { path: 'buffet/categories',  component: () => import('@/views/admin/buffet/BuffetCategoryView.vue') },
        { path: 'visitors',                  component: () => import('@/views/admin/VisitorsView.vue') },
        { path: 'alumni',                    component: () => import('@/views/admin/AlumniView.vue') },
        { path: 'alumni/manage',             component: () => import('@/views/admin/AlumniManageView.vue') },
        { path: 'booking/time-settings',     component: () => import('@/views/admin/booking/TimeSettingsView.vue') },
        { path: 'booking/menu',              component: () => import('@/views/admin/booking/BookingMenuView.vue') },
        { path: 'booking/history',           component: () => import('@/views/admin/booking/BookingHistoryView.vue') },
        { path: 'booking/schedule',          component: () => import('@/views/admin/booking/BookingScheduleView.vue') },
        { path: 'student-groups',           component: () => import('@/views/admin/StudentGroupsView.vue') },
        { path: 'student-groups/:id',       component: () => import('@/views/admin/GroupDetailView.vue') },
        { path: 'store',               component: () => import('@/views/admin/StoreView.vue') },
        { path: 'permissions/wallet',  component: () => import('@/views/admin/permissions/WalletSettingsView.vue') },
        { path: 'permissions/groups',      component: () => import('@/views/admin/permissions/MemberGroupsView.vue') },
        { path: 'permissions/groups/:id',  component: () => import('@/views/admin/GroupDetailView.vue') },
        { path: 'permissions/members', component: () => import('@/views/admin/permissions/MembersView.vue') },
        { path: 'products/kitchens',   component: () => import('@/views/admin/products/KitchensView.vue') },
        { path: 'products/categories', component: () => import('@/views/admin/products/CategoriesView.vue') },
        { path: 'products/units',      component: () => import('@/views/admin/products/UnitsView.vue') },
        { path: 'products',            component: () => import('@/views/admin/products/ProductsView.vue') },
        { path: 'products/new',        component: () => import('@/views/admin/products/ProductDetailView.vue') },
        { path: 'products/:id/edit',   component: () => import('@/views/admin/products/ProductDetailView.vue') },
        { path: 'feedback',            component: () => import('@/views/admin/FeedbackView.vue') },
        { path: 'sale-screens',        component: () => import('@/views/admin/SaleScreensView.vue') },
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
  if (!token || !user) {
    const loginRole = roles.includes('admin') || roles.includes('supervisor')
      ? 'admin'
      : roles.includes('cashier')
        ? 'cashier'
        : 'parent'
    return next({ name: 'login', query: { redirect: to.fullPath, role: loginRole } })
  }
  if (!roles.includes(user.role)) return next('/')
  next()
})

export default router
