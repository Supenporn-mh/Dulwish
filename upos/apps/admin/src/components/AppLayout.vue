<template>
  <el-container class="layout-container">
    <!-- Sidebar -->
    <el-aside :width="sidebarCollapsed ? '64px' : '220px'" class="sidebar">
      <div class="sidebar-header">
        <div class="logo-wrap">
          <div class="logo-icon">U</div>
          <span v-show="!sidebarCollapsed" class="logo-text">UPOS Admin</span>
        </div>
        <el-button
          :icon="sidebarCollapsed ? Expand : Fold"
          circle
          size="small"
          text
          class="collapse-btn"
          @click="sidebarCollapsed = !sidebarCollapsed"
        />
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="sidebarCollapsed"
        :collapse-transition="false"
        router
        class="sidebar-menu"
        background-color="#1a1a2e"
        text-color="#a0a8c0"
        active-text-color="#ffffff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>Dashboard</template>
        </el-menu-item>

        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <template #title>Users</template>
        </el-menu-item>

        <el-menu-item index="/students">
          <el-icon><School /></el-icon>
          <template #title>Students</template>
        </el-menu-item>

        <el-menu-item index="/menu">
          <el-icon><Menu /></el-icon>
          <template #title>Menu</template>
        </el-menu-item>

        <el-menu-item index="/transactions">
          <el-icon><CreditCard /></el-icon>
          <template #title>Transactions</template>
        </el-menu-item>

        <el-menu-item index="/reports">
          <el-icon><TrendCharts /></el-icon>
          <template #title>Reports</template>
        </el-menu-item>

        <el-menu-item index="/audit">
          <el-icon><Document /></el-icon>
          <template #title>Audit Log</template>
        </el-menu-item>

        <el-menu-item index="/policies">
          <el-icon><Setting /></el-icon>
          <template #title>Policies</template>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer" v-show="!sidebarCollapsed">
        <span class="version">v1.0.0</span>
      </div>
    </el-aside>

    <!-- Main area -->
    <el-container class="main-container">
      <!-- Top bar -->
      <el-header class="topbar" height="56px">
        <div class="topbar-left">
          <h1 class="page-title">{{ pageTitle }}</h1>
        </div>
        <div class="topbar-right">
          <div class="user-info">
            <el-icon class="user-avatar-icon"><UserFilled /></el-icon>
            <div class="user-details">
              <span class="user-name">{{ authStore.user?.name || 'Admin' }}</span>
              <span class="user-role">{{ authStore.user?.role || '' }}</span>
            </div>
          </div>
          <el-divider direction="vertical" />
          <el-button type="danger" plain size="small" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
            Logout
          </el-button>
        </div>
      </el-header>

      <!-- Content -->
      <el-main class="main-content">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessageBox } from 'element-plus'
import {
  DataAnalysis,
  User,
  Menu,
  CreditCard,
  TrendCharts,
  Document,
  Setting,
  Fold,
  Expand,
  UserFilled,
  SwitchButton,
} from '@element-plus/icons-vue'

// School icon fallback (not in all EP versions)
import { School } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const sidebarCollapsed = ref(false)

const activeMenu = computed(() => route.path)

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/users': 'Users',
    '/students': 'Students',
    '/menu': 'Menu Management',
    '/transactions': 'Transactions',
    '/reports': 'Reports',
    '/audit': 'Audit Log',
    '/policies': 'Policies',
  }
  return titles[route.path] || 'UPOS Admin'
})

async function handleLogout() {
  try {
    await ElMessageBox.confirm('Are you sure you want to logout?', 'Confirm Logout', {
      confirmButtonText: 'Logout',
      cancelButtonText: 'Cancel',
      type: 'warning',
    })
    authStore.logout()
    router.push('/login')
  } catch {
    // Cancelled
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  background-color: #1a1a2e;
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 12px;
  border-bottom: 1px solid #2a2a4a;
  min-height: 64px;
}

.logo-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.logo-text {
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.collapse-btn {
  color: #a0a8c0 !important;
  flex-shrink: 0;
}

.collapse-btn:hover {
  color: #ffffff !important;
}

.sidebar-menu {
  flex: 1;
  border-right: none !important;
  overflow-y: auto;
  overflow-x: hidden;
}

:deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  margin: 2px 8px;
  border-radius: 8px;
}

:deep(.el-menu-item.is-active) {
  background-color: #667eea !important;
  color: #ffffff !important;
}

:deep(.el-menu-item:hover) {
  background-color: #2a2a4a !important;
  color: #ffffff !important;
}

:deep(.el-menu--collapse .el-menu-item) {
  margin: 2px 4px;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid #2a2a4a;
}

.version {
  color: #4a4a6a;
  font-size: 11px;
}

.main-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.topbar {
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.topbar-left {
  display: flex;
  align-items: center;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar-icon {
  width: 36px;
  height: 36px;
  background: #f0f2f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
  font-size: 20px;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.2;
}

.user-role {
  font-size: 11px;
  color: #909399;
  text-transform: capitalize;
  line-height: 1.2;
}

.main-content {
  background: #f0f2f5;
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}
</style>
