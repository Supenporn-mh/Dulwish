<template>
  <div class="admin-layout">
    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen && isMobile"
      class="sidebar-overlay"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside :class="['sidebar', { 'sidebar--hidden': !sidebarOpen && isMobile }]">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">🏫</div>
        <div>
          <div class="sidebar-logo-title">UPOS</div>
          <div class="sidebar-logo-sub">Admin</div>
        </div>
      </div>

      <!-- Nav -->
      <nav class="sidebar-nav">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          :class="['sidebar-link', { 'sidebar-link--active': isActive(link.to) }]"
          @click="isMobile && (sidebarOpen = false)"
        >
          <span class="sidebar-link-icon">{{ link.icon }}</span>
          <span class="sidebar-link-label">{{ link.label }}</span>
        </RouterLink>
      </nav>

      <!-- Footer: user card + logout -->
      <div class="sidebar-footer">
        <div class="sidebar-user-card">
          <div class="sidebar-avatar">{{ userInitials }}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">{{ userName }}</div>
            <span class="sidebar-role-badge">{{ userRole }}</span>
          </div>
        </div>
        <button class="sidebar-logout-btn" @click="handleLogout">
          ออกจากระบบ
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div :class="['main-area', { 'main-area--full': isMobile }]">
      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-left">
          <!-- Hamburger (mobile) -->
          <button
            v-if="isMobile"
            class="hamburger-btn"
            @click="sidebarOpen = !sidebarOpen"
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <rect y="0" width="20" height="2" rx="1" fill="#1264E3"/>
              <rect y="6" width="20" height="2" rx="1" fill="#1264E3"/>
              <rect y="12" width="20" height="2" rx="1" fill="#1264E3"/>
            </svg>
          </button>
          <h1 class="topbar-title">{{ currentPageTitle }}</h1>
        </div>
        <div class="topbar-right">
          <div class="topbar-avatar">{{ userInitials }}</div>
        </div>
      </header>

      <!-- Content -->
      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const sidebarOpen = ref(true)
const isMobile = ref(false)

const navLinks = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/admin/users', icon: '👥', label: 'ผู้ใช้งาน' },
  { to: '/admin/students', icon: '🎒', label: 'นักเรียน' },
  { to: '/admin/menu', icon: '🍽', label: 'เมนู' },
  { to: '/admin/transactions', icon: '💳', label: 'รายการ' },
  { to: '/admin/reports', icon: '📈', label: 'รายงาน' },
  { to: '/admin/audit', icon: '📋', label: 'Audit' },
  { to: '/admin/policies', icon: '⚙️', label: 'นโยบาย' },
]

const pageTitles: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/users': 'ผู้ใช้งาน',
  '/admin/students': 'นักเรียน',
  '/admin/menu': 'เมนู',
  '/admin/transactions': 'รายการ',
  '/admin/reports': 'รายงาน',
  '/admin/audit': 'Audit Log',
  '/admin/policies': 'นโยบาย',
}

const currentPageTitle = computed(() => pageTitles[route.path] ?? 'Admin')

const userName = ref('Admin User')
const userRole = ref('Administrator')
const userInitials = computed(() =>
  userName.value
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
)

function isActive(to: string): boolean {
  return route.path === to || route.path.startsWith(to + '/')
}

function handleLogout() {
  router.push('/login')
}

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  sidebarOpen.value = !isMobile.value
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #F2F2F7;
}

/* Overlay */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
}

/* Sidebar */
.sidebar {
  width: 240px;
  min-height: 100vh;
  background: #FFFFFF;
  border-right: 1px solid rgba(198, 198, 200, 0.3);
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  transition: transform 0.25s ease;
}

.sidebar--hidden {
  transform: translateX(-100%);
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 18px;
  border-bottom: 1px solid rgba(198, 198, 200, 0.3);
}

.sidebar-logo-icon {
  font-size: 28px;
  line-height: 1;
}

.sidebar-logo-title {
  font-size: 20px;
  font-weight: 800;
  color: #1264E3;
  letter-spacing: 2px;
  line-height: 1.1;
}

.sidebar-logo-sub {
  font-size: 11px;
  font-weight: 500;
  color: #AEAEB2;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 1px;
}

/* Nav */
.sidebar-nav {
  flex: 1;
  padding: 10px 0;
  overflow-y: auto;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin: 2px 8px;
  border-radius: 10px;
  color: #3C3C43;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  cursor: pointer;
}

.sidebar-link:hover {
  background: #F2F2F7;
  color: #000000;
}

.sidebar-link--active {
  background: rgba(18, 100, 227, 0.1);
  color: #1264E3;
  font-weight: 600;
}

.sidebar-link-icon {
  font-size: 16px;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar-link-label {
  white-space: nowrap;
}

/* Footer */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(198, 198, 200, 0.3);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #F2F2F7;
  border-radius: 12px;
}

.sidebar-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1264E3;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-user-info {
  min-width: 0;
  flex: 1;
}

.sidebar-user-name {
  font-size: 13px;
  font-weight: 600;
  color: #000000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-role-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  color: #1264E3;
  background: rgba(18, 100, 227, 0.1);
  border-radius: 4px;
  padding: 1px 6px;
  margin-top: 2px;
  letter-spacing: 0.3px;
}

.sidebar-logout-btn {
  width: 100%;
  padding: 9px 16px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 59, 48, 0.1);
  color: #FF3B30;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  text-align: center;
}

.sidebar-logout-btn:hover {
  background: rgba(255, 59, 48, 0.18);
}

/* Main area */
.main-area {
  margin-left: 240px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-area--full {
  margin-left: 0;
}

/* Top bar */
.topbar {
  background: #FFFFFF;
  border-bottom: 1px solid rgba(198, 198, 200, 0.3);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 50;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hamburger-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: rgba(18, 100, 227, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.hamburger-btn:hover {
  background: rgba(18, 100, 227, 0.14);
}

.topbar-title {
  font-size: 22px;
  font-weight: 700;
  color: #000000;
  margin: 0;
  line-height: 1.2;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1264E3;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

/* Content */
.main-content {
  padding: 24px;
  flex: 1;
}

@media (max-width: 767px) {
  .main-content {
    padding: 16px;
  }
}
</style>
