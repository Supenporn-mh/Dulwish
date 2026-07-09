<template>
  <div class="admin-layout">

    <!-- Sidebar -->
    <aside class="sidebar">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <PhBuildings :size="26" weight="fill" style="color:#1264E3" />
        </div>
        <div>
          <div class="sidebar-logo-title">UPOS</div>
          <div class="sidebar-logo-sub">Admin</div>
        </div>
      </div>

      <!-- Nav -->
      <nav class="sidebar-nav">
        <template v-for="item in navItems" :key="item.type === 'link' ? item.to : item.label">

          <!-- flat link -->
          <RouterLink
            v-if="item.type === 'link'"
            :to="item.to"
            :class="['sidebar-link', { 'sidebar-link--active': isActive(item.to) }]"
          >
            <span class="sidebar-link-icon">
              <component :is="item.icon" :size="20" :weight="isActive(item.to) ? 'fill' : 'regular'" />
            </span>
            <span class="sidebar-link-label">{{ item.label }}</span>
          </RouterLink>

          <!-- collapsible group -->
          <div v-else-if="item.type === 'group'" class="sidebar-group">
            <button
              type="button"
              :class="['sidebar-link', 'sidebar-group-header', { 'sidebar-group-open': isGroupActive(item) }]"
              @click="toggleGroup(item.label)"
            >
              <span class="sidebar-link-icon">
                <component :is="item.icon" :size="20" :weight="isGroupActive(item) ? 'fill' : 'regular'" />
              </span>
              <span class="sidebar-link-label" style="flex:1">{{ item.label }}</span>
              <PhCaretDown
                :size="13"
                style="flex-shrink:0;color:var(--color-text-tertiary)"
                :style="{ transform: openGroups.includes(item.label) ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.2s' }"
              />
            </button>
            <div v-if="openGroups.includes(item.label)" class="sidebar-group-links">
              <RouterLink
                v-for="child in item.children"
                :key="child.to"
                :to="child.to"
                :class="['sidebar-link', 'sidebar-child-link', { 'sidebar-link--active': route.path === child.to }]"
              >
                <span class="sidebar-link-icon">
                  <component :is="child.icon" :size="20" :weight="route.path === child.to ? 'fill' : 'regular'" />
                </span>
                <span class="sidebar-link-label">{{ child.label }}</span>
              </RouterLink>
            </div>
          </div>

        </template>
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="sidebar-user-card">
          <div class="sidebar-avatar">{{ userInitials }}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">{{ userName }}</div>
            <span class="sidebar-role-badge">{{ userRole }}</span>
          </div>
        </div>
        <button class="sidebar-logout-btn" @click="handleLogout">ออกจากระบบ</button>
      </div>
    </aside>

    <!-- Main -->
    <div class="main-area">
      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-left">
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhSquaresFour, PhUsers, PhStudent, PhForkKnife,
  PhReceipt, PhChartLine, PhClipboardText, PhGear, PhCalendarDots,
  PhBuildings, PhSignOut, PhCaretDown, PhPackage, PhGraduationCap, PhStorefront,
  PhShieldCheck, PhWallet, PhUsersThree, PhIdentificationCard, PhCalendarCheck,
  PhClock, PhCalendarPlus, PhClockCounterClockwise,
  PhCookingPot, PhTag, PhRuler, PhShoppingBag,
  PhChatDots, PhMonitor, PhImage, PhLayout,
  PhIdentificationBadge, PhXCircle,
} from '@phosphor-icons/vue'

const route  = useRoute()
const router = useRouter()

const openGroups = ref<string[]>([])

function toggleGroup(label: string) {
  const idx = openGroups.value.indexOf(label)
  if (idx >= 0) openGroups.value.splice(idx, 1)
  else openGroups.value.push(label)
}

function isGroupActive(group: any): boolean {
  return group.children.some((c: any) => route.path.startsWith(c.to))
}

const navItems: any[] = [
  { type: 'link', to: '/admin/dashboard',    icon: PhSquaresFour,   label: 'Dashboard'       },
  { type: 'link', to: '/admin/store',        icon: PhStorefront,    label: 'ข้อมูลร้านค้า'   },
  { type: 'link', to: '/admin/users',               icon: PhUsers,    label: 'ผู้ใช้งาน'       },
  { type: 'link', to: '/admin/banners',             icon: PhImage,    label: 'แบนเนอร์'        },
  { type: 'link', to: '/admin/devices',             icon: PhMonitor,  label: 'จัดการอุปกรณ์'   },
  { type: 'link', to: '/admin/permissions/wallet',  icon: PhWallet,   label: 'ตั้งค่า Wallet'  },
  {
    type: 'group',
    label: 'จัดการนักเรียน',
    sub:   '',
    icon:  PhStudent,
    children: [
      { to: '/admin/student-groups', icon: PhUsersThree,    label: 'กลุ่มนักเรียน'     },
      { to: '/admin/students',       icon: PhStudent,       label: 'รายชื่อนักเรียน'  },
      { to: '/admin/alumni',         icon: PhGraduationCap, label: 'รายชื่อศิษย์เก่า' },
    ],
  },
  {
    type: 'group',
    label: 'จัดการสมาชิก',
    sub:   '',
    icon:  PhShieldCheck,
    children: [
      { to: '/admin/permissions/groups',  icon: PhUsersThree,         label: 'กลุ่มสมาชิก'   },
      { to: '/admin/permissions/members', icon: PhIdentificationCard, label: 'รายชื่อสมาชิก' },
    ],
  },
  { type: 'link', to: '/admin/visitors', icon: PhIdentificationBadge, label: 'จัดการ Visitor' },
  {
    type: 'group',
    label: 'จัดการข้อมูลสินค้า',
    sub:   'ข้อมูลเกี่ยวกับสินค้า',
    icon:  PhPackage,
    children: [
      { to: '/admin/products/kitchens',   icon: PhCookingPot,  label: 'ครัว'          },
      { to: '/admin/products/categories', icon: PhTag,         label: 'ประเภทสินค้า'  },
      { to: '/admin/products/units',      icon: PhRuler,       label: 'หน่วยนับ'      },
      { to: '/admin/products',            icon: PhShoppingBag, label: 'สินค้า'        },
    ],
  },
  {
    type: 'group',
    label: 'จัดการการจอง',
    sub:   '',
    icon:  PhCalendarCheck,
    children: [
      { to: '/admin/booking/schedule',      icon: PhCalendarDots,             label: 'ตั้งค่าประจำสัปดาห์' },
      { to: '/admin/booking/time-settings', icon: PhClock,                    label: 'ตั้งค่าช่วงเวลา'     },
      { to: '/admin/booking/menu',          icon: PhCalendarPlus,             label: 'เมนูการจอง'          },
      { to: '/admin/booking/history',       icon: PhClockCounterClockwise,    label: 'ประวัติการจอง'       },
      { to: '/admin/booking/cancel-reasons', icon: PhXCircle,                  label: 'เหตุผลการยกเลิก'     },
    ],
  },
  {
    type: 'group',
    label: 'จัดการ Buffet',
    icon:  PhForkKnife,
    children: [
      { to: '/admin/buffet/categories', icon: PhForkKnife,               label: 'ประเภทอาหาร'         },
      { to: '/admin/buffet/rounds',    icon: PhClock,                  label: 'ตั้งค่าช่วงเวลา'    },
      { to: '/admin/buffet/schedule',  icon: PhCalendarDots,           label: 'ตั้งค่าประจำสัปดาห์' },
      { to: '/admin/buffet/pricing',   icon: PhTag,                    label: 'ราคา Buffet'         },
      { to: '/admin/buffet/history',   icon: PhClockCounterClockwise,  label: 'ประวัติการใช้งาน'    },
    ],
  },
  { type: 'link', to: '/admin/feedback',      icon: PhChatDots,      label: 'Feedback'        },
  { type: 'link', to: '/admin/sale-screens',  icon: PhLayout,        label: 'หน้าจอขาย'      },
  { type: 'link', to: '/admin/transactions',  icon: PhReceipt,       label: 'รายการ'          },
  { type: 'link', to: '/admin/reports',      icon: PhChartLine,     label: 'รายงาน'          },
  { type: 'link', to: '/admin/audit',        icon: PhClipboardText, label: 'Audit'           },
  { type: 'link', to: '/admin/policies',     icon: PhGear,          label: 'ตั้งค่า'          },
  { type: 'link', to: '/admin/academic-year', icon: PhCalendarDots, label: 'ตั้งค่าภาคเรียน' },
]

const pageTitles: Record<string, string> = {
  '/admin/dashboard':             'Dashboard',
  '/admin/users':                 'ผู้ใช้งาน',
  '/admin/devices':               'จัดการอุปกรณ์',
  '/admin/students':              'นักเรียน',
  '/admin/student-groups':        'กลุ่มนักเรียน',
  '/admin/alumni':                'รายชื่อศิษย์เก่า',
  '/admin/alumni/manage':         'จัดการศิษย์เก่า',
  '/admin/products/kitchens':     'ครัว',
  '/admin/products/categories':   'ประเภทสินค้า',
  '/admin/products/units':        'หน่วยนับ',
  '/admin/products':              'สินค้า',
  '/admin/products/new':         'เพิ่มสินค้า',
  '/admin/booking/schedule':      'ตั้งค่าประจำสัปดาห์',
  '/admin/booking/time-settings': 'ตั้งค่าช่วงเวลา',
  '/admin/booking/menu':          'เมนูการจอง',
  '/admin/booking/history':       'ประวัติการจอง',
  '/admin/booking/cancel-reasons': 'เหตุผลการยกเลิก',
  '/admin/transactions':          'รายการ',
  '/admin/reports':               'รายงาน',
  '/admin/audit':                 'Audit Log',
  '/admin/policies':              'ตั้งค่า',
  '/admin/academic-year':         'ตั้งค่าภาคเรียน',
  '/admin/buffet/categories':     'ประเภทอาหาร Buffet',
  '/admin/buffet/rounds':         'ตั้งค่าช่วงเวลา Buffet',
  '/admin/buffet/schedule':       'ตั้งค่าประจำสัปดาห์ Buffet',
  '/admin/buffet/pricing':        'ราคา Buffet',
  '/admin/buffet/history':        'ประวัติการใช้งาน Buffet',
  '/admin/store':                 'ข้อมูลร้านค้า',
  '/admin/permissions/wallet':   'ตั้งค่า Wallet',   // standalone link
  '/admin/permissions/groups':   'กลุ่มสมาชิก',
  '/admin/permissions/members':  'รายชื่อสมาชิก',
  '/admin/visitors':             'จัดการ Visitor',
  '/admin/feedback':             'Feedback',
  '/admin/banners':              'แบนเนอร์',
  '/admin/sale-screens':         'หน้าจอขาย',
}

const currentPageTitle = computed(() => {
  if (pageTitles[route.path]) return pageTitles[route.path]
  if (route.path.endsWith('/tax-invoice')) return 'ใบกำกับภาษี'
  if (route.query.name)       return route.query.name as string
  // group detail fallback
  const id = route.params.id as string
  if (id && id !== 'new') return id.replace(/_/g, ' ')
  return 'Admin'
})

// ── Real user from localStorage ───────────────────────────────────────────────
const storedUser = JSON.parse(localStorage.getItem('upos_user') ?? 'null') as {
  firstName?: string; lastName?: string; role?: string
} | null

const userName = ref(
  storedUser
    ? [storedUser.firstName, storedUser.lastName].filter(Boolean).join(' ') || 'Admin User'
    : 'Admin User'
)
const userRole = ref(storedUser?.role ?? 'Administrator')

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

async function handleLogout() {
  try {
    const { default: api } = await import('@/api/axios')
    await api.post('/auth/logout')
  } catch {
    // ignore — proceed with local cleanup regardless
  }
  localStorage.removeItem('upos_token')
  localStorage.removeItem('upos_user')
  router.push('/login')
}

onMounted(() => {
  // auto-expand group ถ้า current route อยู่ใน group นั้น
  for (const item of navItems) {
    if (item.type === 'group' && isGroupActive(item) && !openGroups.value.includes(item.label)) {
      openGroups.value.push(item.label)
    }
  }
})
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; background: var(--color-bg-secondary); }

.sidebar {
  width: 240px; height: 100vh; background: var(--color-bg-surface);
  border-right: 1px solid var(--color-border-tertiary);
  box-shadow: 2px 0 12px rgba(0,0,0,0.06);
  display: flex; flex-direction: column;
  position: fixed; top: 0; left: 0; z-index: 100;
  overflow: hidden;
}
.sidebar-logo {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 20px 18px;
  border-bottom: 1px solid var(--color-border-tertiary);
}
.sidebar-logo-title { font-size: 20px; font-weight: 800; color: var(--color-primary); letter-spacing: 2px; line-height: 1.1; }
.sidebar-logo-sub   { font-size: 11px; font-weight: 500; color: var(--color-text-tertiary); letter-spacing: 1px; text-transform: uppercase; margin-top: 1px; }

.sidebar-nav { flex: 1; padding: 10px 0; overflow-y: auto; }

.sidebar-link {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; margin: 2px 8px; border-radius: 10px;
  color: var(--color-text-secondary); text-decoration: none; font-size: 14px; font-weight: 500;
  transition: background 0.15s, color 0.15s; cursor: pointer;
  border: none; background: none; width: calc(100% - 16px); font-family: inherit;
  box-sizing: border-box;
}
.sidebar-link:hover   { background: var(--color-primary-tint); color: var(--color-primary); }
.sidebar-link--active { background: var(--color-primary-tint); color: var(--color-primary); font-weight: 600; }
.sidebar-group-open   { color: var(--color-primary); font-weight: 600; }
.sidebar-link-icon    { width: 22px; text-align: center; flex-shrink: 0; }
.sidebar-link-label   { white-space: nowrap; }

.sidebar-group        { margin: 0; }
.sidebar-group-header { text-align: left; }
.sidebar-group-links  { display: flex; flex-direction: column; margin: 0 8px 2px 20px; }
.sidebar-child-link   { margin: 1px 0; }

.sidebar-footer {
  padding: 16px; border-top: 1px solid var(--color-border-tertiary);
  display: flex; flex-direction: column; gap: 10px;
}
.sidebar-user-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; background: var(--color-primary-tint); border-radius: 12px;
}
.sidebar-avatar {
  width: 36px; height: 36px; border-radius: 50%; background: var(--color-primary); color: #fff;
  font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.sidebar-user-info  { min-width: 0; flex: 1; }
.sidebar-user-name  { font-size: 13px; font-weight: 600; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar-role-badge {
  display: inline-block; font-size: 10px; font-weight: 600;
  color: var(--color-primary); background: var(--color-primary-tint); border-radius: 4px; padding: 1px 6px; margin-top: 2px;
}
.sidebar-logout-btn {
  width: 100%; padding: 9px 16px; border-radius: 10px; border: none;
  background: var(--color-danger-bg); color: var(--color-danger); font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.15s; font-family: inherit;
}
.sidebar-logout-btn:hover { background: rgba(255,82,82,0.18); }

.main-area    { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }

.topbar {
  background: var(--color-bg-surface); border-bottom: 1px solid var(--color-border-tertiary);
  padding: 16px 24px; display: flex; align-items: center;
  justify-content: space-between; position: sticky; top: 0; z-index: 50;
}
.topbar-left  { display: flex; align-items: center; gap: 12px; }
.topbar-title { font-size: 22px; font-weight: 700; color: var(--color-text-primary); margin: 0; }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.topbar-avatar {
  width: 36px; height: 36px; border-radius: 50%; background: var(--color-primary); color: #fff;
  font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; cursor: pointer;
}

.main-content { padding: 24px; flex: 1; }
</style>
