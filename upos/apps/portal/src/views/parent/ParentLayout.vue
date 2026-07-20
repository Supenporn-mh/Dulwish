<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute, RouterView } from 'vue-router'
import {
  PhUserCircle, PhArrowLeft, PhSignOut, PhX, PhTranslate, PhLockKey,
  PhWarningCircle, PhInfo, PhCheckCircle,
} from '@phosphor-icons/vue'
import { useLocaleStore }                        from '@/stores/locale'
import { useNotificationStore }                  from '@/stores/notifications'
import type { Notification }                     from '@/stores/notifications'
import { useAuthStore }                          from '@/stores/auth'
import { useParentStore }                        from '@/stores/parent'
import api from '@/api/axios'
import { listNotifications, markAllRead as apiMarkAllRead } from '@/api/notification'

const router      = useRouter()
const route       = useRoute()
const locale      = useLocaleStore()
const notifStore  = useNotificationStore()
const auth        = useAuthStore()
const parentStore = useParentStore()

const showProfile = ref(false)
// showNotifs synced with store so any component can open it
const showNotifs  = computed({
  get: () => notifStore.showSheet,
  set: (v) => { notifStore.showSheet = v },
})

onMounted(async () => {
  // Load server notifications and merge into store
  try {
    const serverNotifs = await listNotifications()
    for (const n of serverNotifs) {
      // Map server notification to store shape — avoid duplicate ids
      const existing = notifStore.items.find(x => x.id === n._id)
      if (!existing) {
        notifStore.items.push({
          id:        n._id,
          type:      n.type,
          title:     n.title,
          titleEn:   n.titleEn ?? n.title,
          body:      n.body,
          bodyEn:    n.bodyEn ?? n.body,
          action:    n.action,
          createdAt: n.createdAt,
          read:      n.read,
        })
      }
    }
    // Sort: newest first
    notifStore.items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    // non-fatal — store may still have client-side notifications
  }
})

// ── Toast notification ────────────────────────────────────────────────────────
const toast        = ref<Notification | null>(null)
let   toastTimer:  ReturnType<typeof setTimeout> | null = null

function showToast(n: Notification) {
  toast.value = n
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 4500)
}

function dismissToast() {
  toast.value = null
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null }
}

function tapToast() {
  if (toast.value?.action) router.push(toast.value.action)
  dismissToast()
}

// Watch for NEW notifications → show toast for the newest one
watch(
  () => notifStore.items.length,
  (newLen, oldLen) => {
    if (newLen > (oldLen ?? 0) && notifStore.items[0]) {
      showToast(notifStore.items[0])
    }
  }
)

const userName = computed(() => {
  try {
    const raw = localStorage.getItem('upos_user')
    if (!raw) return ''
    const u = JSON.parse(raw)
    return [u.firstName, u.lastName].filter(Boolean).join(' ')
  } catch { return '' }
})

const PAGE_TITLES: Record<string, { th: string; en: string }> = {
  '/parent/dashboard':   { th: 'หน้าหลัก',     en: 'Home'        },
  '/parent/preorder':    { th: 'จองอาหาร',      en: 'Meal Booking' },
  '/parent/history':     { th: 'ประวัติ',        en: 'History'     },
  '/parent/topup':       { th: 'เติมเงิน',       en: 'Top Up'      },
  '/parent/add-student': { th: 'เพิ่มนักเรียน',  en: 'Add Student' },
}

const pageTitle = computed(() => {
  const entry = PAGE_TITLES[route.path]
  if (!entry) return 'Parent Portal'
  return locale.lang === 'th' ? entry.th : entry.en
})

function logout() {
  showProfile.value = false
  parentStore.reset()
  auth.logout()
  router.push('/')
}

// ── Change password ───────────────────────────────────────────────────────────
const showChangePw   = ref(false)
const oldPw          = ref('')
const newPw          = ref('')
const confirmNewPw   = ref('')
const showPwInput    = ref(false)
const changePwLoading = ref(false)
const changePwError  = ref('')
const changePwDone   = ref(false)

function openChangePw() { showProfile.value = false; showChangePw.value = true }
function closeChangePw() {
  showChangePw.value = false
  oldPw.value = newPw.value = confirmNewPw.value = changePwError.value = ''
  changePwDone.value = false
}

async function submitChangePw() {
  changePwError.value = ''; changePwLoading.value = true
  try {
    await api.post('/auth/change-password', {
      oldPassword: oldPw.value,
      newPassword: newPw.value,
    })
    changePwDone.value = true
  } catch (e: any) {
    const _msg = e?.response?.data?.error?.message
    const PW_ERROR_MAP: Record<string, string> = {
      'รหัสผ่านปัจจุบันไม่ถูกต้อง': 'Current password is incorrect',
      'เกิดข้อผิดพลาด':             'An error occurred',
    }
    changePwError.value = _msg
      ? (locale.lang === 'en' ? (PW_ERROR_MAP[_msg] ?? _msg) : _msg)
      : locale.t('เกิดข้อผิดพลาด', 'An error occurred')
  } finally { changePwLoading.value = false }
}
</script>

<template>
  <div class="min-h-screen flex justify-center" style="background: var(--color-bg-page)">
    <div class="w-full max-w-[430px] md:max-w-[720px] lg:max-w-[1100px] flex flex-col min-h-screen relative" style="background: var(--color-bg-page)">

      <!-- ── Navbar ────────────────────────────────────────────────────── -->
      <header class="navbar sticky top-0 z-20 flex items-center justify-between px-4 h-[52px]">
        <!-- Back -->
        <button
          @click="router.back()"
          class="w-10 h-10 flex items-center justify-center -ml-2 transition-opacity active:opacity-50"
          style="background: none; border: none; cursor: pointer;"
        >
          <PhArrowLeft :size="22" weight="bold" style="color: var(--color-primary)" />
        </button>

        <!-- Title -->
        <span class="navbar-title absolute left-1/2 -translate-x-1/2">{{ pageTitle }}</span>

        <!-- Right: lang toggle + profile -->
        <div class="flex items-center gap-1 -mr-1">
          <!-- Language toggle -->
          <button
            @click="locale.toggle()"
            class="lang-btn"
            :aria-label="locale.lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'"
          >
            <PhTranslate :size="13" weight="bold" />
            {{ locale.lang === 'th' ? 'EN' : 'TH' }}
          </button>

          <!-- Profile -->
          <button
            @click="showProfile = true"
            class="w-10 h-10 flex items-center justify-center transition-opacity active:opacity-50"
            style="background: none; border: none; cursor: pointer;"
          >
            <PhUserCircle :size="26" weight="fill" style="color: var(--color-text-primary)" />
          </button>
        </div>
      </header>

      <!-- ── Page content ──────────────────────────────────────────────── -->
      <main class="flex-1 overflow-y-auto pb-8">
        <RouterView />
      </main>

      <!-- ── Toast notification ───────────────────────────────────────────── -->
      <Transition name="toast">
        <div
          v-if="toast"
          class="toast-wrap"
          @click="tapToast"
        >
          <div class="toast-body" :class="`toast-${toast.type}`">
            <!-- Icon -->
            <div class="toast-icon-wrap" :class="`notif-icon-${toast.type}`">
              <PhWarningCircle v-if="toast.type==='warning'||toast.type==='danger'" :size="16" weight="fill"/>
              <PhCheckCircle   v-else-if="toast.type==='success'" :size="16" weight="fill"/>
              <PhInfo          v-else :size="16" weight="fill"/>
            </div>
            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="text-[14px] font-medium" style="color:var(--color-text-primary)">
                {{ locale.lang==='th' ? toast.title : toast.titleEn }}
              </p>
              <p class="text-[12px] mt-0.5 leading-[1.4]" style="color:var(--color-text-secondary)">
                {{ locale.lang==='th' ? toast.body : toast.bodyEn }}
              </p>
            </div>
            <!-- Dismiss -->
            <button @click.stop="dismissToast" class="notif-dismiss flex-shrink-0">
              <PhX :size="13" weight="bold"/>
            </button>
          </div>
          <!-- Progress bar -->
          <div class="toast-progress" :class="`toast-prog-${toast.type}`"/>
        </div>
      </Transition>

      <!-- ── Profile sheet backdrop ────────────────────────────────────── -->
      <Transition name="backdrop">
        <div
          v-if="showProfile"
          class="fixed inset-0 z-30 bg-black/40"
          @click="showProfile = false"
        />
      </Transition>

      <!-- ── Profile sheet ─────────────────────────────────────────────── -->
      <Transition name="sheet">
        <div v-if="showProfile" class="profile-sheet">
          <!-- Handle -->
          <div class="flex justify-center pt-3 pb-1">
            <div class="w-10 h-1 rounded-full" style="background: var(--color-border-secondary)" />
          </div>

          <!-- Close -->
          <button class="sheet-close" @click="showProfile = false">
            <PhX :size="18" weight="bold" />
          </button>

          <!-- Avatar + name -->
          <div class="flex flex-col items-center py-5 gap-2">
            <div class="sheet-avatar">
              <PhUserCircle :size="52" weight="fill" style="color: var(--color-primary)" />
            </div>
            <p class="text-[18px] font-medium" style="color: var(--color-text-primary)">
              {{ userName || locale.t('ผู้ปกครอง', 'Parent') }}
            </p>
          </div>

          <div class="px-4 pb-2">
            <div class="sheet-divider" />
          </div>

          <!-- Language row -->
          <div class="sheet-row">
            <div class="flex items-center gap-3">
              <PhTranslate :size="20" style="color: var(--color-text-secondary)" />
              <span class="text-[15px]" style="color: var(--color-text-primary)">
                {{ locale.lang === 'th' ? 'ภาษา' : 'Language' }}
              </span>
            </div>
            <button class="lang-pill" @click="locale.toggle()">
              <span :class="{ 'pill-active': locale.lang === 'th' }">TH</span>
              <span class="pill-sep">|</span>
              <span :class="{ 'pill-active': locale.lang === 'en' }">EN</span>
            </button>
          </div>

          <div class="px-4 py-2">
            <div class="sheet-divider" />
          </div>

          <!-- Change password -->
          <button class="sheet-row sheet-logout" @click="openChangePw">
            <div class="flex items-center gap-3">
              <PhLockKey :size="20" style="color: var(--color-text-secondary)" />
              <span class="text-[15px] font-medium" style="color: var(--color-text-primary)">
                {{ locale.lang === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password' }}
              </span>
            </div>
          </button>

          <div class="px-4 py-2">
            <div class="sheet-divider" />
          </div>

          <!-- Logout -->
          <button class="sheet-row sheet-logout" @click="logout">
            <div class="flex items-center gap-3">
              <PhSignOut :size="20" style="color: var(--color-danger)" />
              <span class="text-[15px] font-medium" style="color: var(--color-danger)">
                {{ locale.lang === 'th' ? 'ออกจากระบบ' : 'Sign Out' }}
              </span>
            </div>
          </button>

          <div class="pb-8" />
        </div>
      </Transition>

    <!-- ── Notification Sheet ───────────────────────────────────────────── -->
    <Transition name="backdrop">
      <div v-if="showNotifs" class="fixed inset-0 z-30 bg-black/40"
        @click="showNotifs = false; notifStore.markAllRead(); apiMarkAllRead().catch(() => {})" />
    </Transition>
    <Transition name="sheet">
      <div v-if="showNotifs" class="profile-sheet">
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-10 h-1 rounded-full" style="background: var(--color-border-secondary)" />
        </div>
        <button class="sheet-close" @click="showNotifs = false">
          <PhX :size="18" weight="bold" />
        </button>

        <p class="text-[18px] font-medium px-5 pb-3 pt-1" style="color:var(--color-text-primary)">
          {{ locale.lang === 'th' ? 'การแจ้งเตือน' : 'Notifications' }}
        </p>

        <!-- Empty state -->
        <div v-if="notifStore.items.length === 0"
          class="flex flex-col items-center py-10 gap-2 px-5"
          style="color:var(--color-text-tertiary)">
          <span class="text-[36px]">🔔</span>
          <p class="text-[14px]">{{ locale.lang === 'th' ? 'ไม่มีการแจ้งเตือน' : 'No notifications' }}</p>
        </div>

        <!-- Notification list -->
        <div v-else class="px-4 pb-10 flex flex-col gap-2">
          <div
            v-for="n in notifStore.items"
            :key="n.id"
            class="notif-item"
            :class="`notif-item-${n.type}`"
            @click="n.action && router.push(n.action); showNotifs = false"
          >
            <div class="notif-icon-wrap" :class="`notif-icon-${n.type}`">
              <PhWarningCircle v-if="n.type==='warning' || n.type==='danger'" :size="16" weight="fill" />
              <PhCheckCircle   v-else-if="n.type==='success'" :size="16" weight="fill" />
              <PhInfo          v-else :size="16" weight="fill" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[14px] font-medium" style="color:var(--color-text-primary)">
                {{ locale.lang === 'th' ? n.title : n.titleEn }}
              </p>
              <p class="text-[13px] mt-0.5 leading-[1.4]" style="color:var(--color-text-secondary)">
                {{ locale.lang === 'th' ? n.body : n.bodyEn }}
              </p>
              <p class="text-[11px] mt-1" style="color:var(--color-text-tertiary)">
                {{ new Date(n.createdAt).toLocaleTimeString(locale.lang==='th'?'th-TH':'en-GB', { hour:'2-digit', minute:'2-digit' }) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Change Password Sheet ───────────────────────────────────────── -->
    <Transition name="backdrop">
      <div v-if="showChangePw" class="fixed inset-0 z-30 bg-black/40" @click="closeChangePw" />
    </Transition>
    <Transition name="sheet">
      <div v-if="showChangePw" class="profile-sheet">
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-10 h-1 rounded-full" style="background: var(--color-border-secondary)" />
        </div>
        <button class="sheet-close" @click="closeChangePw"><PhX :size="18" weight="bold" /></button>

        <!-- Success state -->
        <div v-if="changePwDone" class="flex flex-col items-center px-5 py-8 gap-3 text-center">
          <PhLockKey :size="44" weight="fill" style="color: var(--color-success)" />
          <p class="text-[18px] font-medium" style="color: var(--color-text-primary)">
            {{ locale.lang === 'th' ? 'เปลี่ยนรหัสผ่านสำเร็จ' : 'Password Changed' }}
          </p>
          <button class="btn btn-primary w-full mt-2" @click="closeChangePw">
            {{ locale.lang === 'th' ? 'ปิด' : 'Close' }}
          </button>
        </div>

        <!-- Form -->
        <div v-else class="px-5 pb-10 flex flex-col gap-4">
          <p class="text-[18px] font-medium" style="color: var(--color-text-primary)">
            {{ locale.lang === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password' }}
          </p>

          <div class="card">
            <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
              <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">
                {{ locale.lang === 'th' ? 'รหัสผ่านเดิม' : 'Current Password' }}
              </label>
              <div class="flex items-center gap-2">
                <input v-model="oldPw" :type="showPwInput ? 'text' : 'password'" autocomplete="current-password"
                  class="flex-1 text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
                <button type="button" @click="showPwInput = !showPwInput" style="background: none; border: none; cursor: pointer; color: var(--color-text-tertiary);">
                  <PhUserCircle v-if="false" /><i :class="showPwInput ? 'ti ti-eye-off' : 'ti ti-eye'" style="font-size: 18px;" />
                </button>
              </div>
            </div>
            <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
              <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">
                {{ locale.lang === 'th' ? 'รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)' : 'New Password (min 8 chars)' }}
              </label>
              <input v-model="newPw" :type="showPwInput ? 'text' : 'password'" autocomplete="new-password"
                class="w-full text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
            </div>
            <div class="card-body">
              <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">
                {{ locale.lang === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm New Password' }}
              </label>
              <input v-model="confirmNewPw" :type="showPwInput ? 'text' : 'password'"
                class="w-full text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
            </div>
          </div>

          <p v-if="confirmNewPw && newPw !== confirmNewPw" class="text-caption" style="color: var(--color-danger)">
            {{ locale.lang === 'th' ? 'รหัสผ่านไม่ตรงกัน' : 'Passwords do not match' }}
          </p>

          <div v-if="changePwError" class="notif notif-danger">
            <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
            <div class="notif-content"><p class="notif-desc">{{ changePwError }}</p></div>
          </div>

          <button
            @click="submitChangePw"
            :disabled="changePwLoading || !oldPw || newPw.length < 8 || newPw !== confirmNewPw"
            class="btn btn-primary w-full"
            :class="{ 'opacity-40 cursor-not-allowed': changePwLoading || !oldPw || newPw.length < 8 || newPw !== confirmNewPw }"
          >
            <span v-if="changePwLoading" class="flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {{ locale.lang === 'th' ? 'กำลังบันทึก...' : 'Saving...' }}
            </span>
            <span v-else>{{ locale.lang === 'th' ? 'บันทึก' : 'Save' }}</span>
          </button>
        </div>
      </div>
    </Transition>

    </div>
  </div>
</template>

<style scoped>
/* Language toggle button in header */
.lang-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 12px;        /* label */
  font-weight: 500;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-tertiary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s;
  letter-spacing: 0.3px;
}
.lang-btn:active { opacity: 0.7; }

/* ── Toast notification ──────────────────────────────────────────────── */
.toast-wrap {
  position: fixed;
  top: 60px;  /* below navbar */
  left: 50%; transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 398px;
  z-index: 60;
  cursor: pointer;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-modal);
}
.toast-body {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border: 1px solid transparent;
  border-bottom: none;
}
.toast-warning { background: var(--color-warning-bg); border-color: #FFCC80; }
.toast-danger  { background: var(--color-danger-bg);  border-color: #FFAB9F; }
.toast-success { background: var(--color-success-bg); border-color: #80D8BC; }
.toast-info    { background: var(--color-primary-tint); border-color: #A8C4F5; }

.toast-progress {
  height: 3px;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  animation: toast-shrink 4.5s linear forwards;
}
.toast-prog-warning { background: var(--color-warning); }
.toast-prog-danger  { background: var(--color-danger);  }
.toast-prog-success { background: var(--color-success); }
.toast-prog-info    { background: var(--color-primary); }

@keyframes toast-shrink {
  from { width: 100%; }
  to   { width: 0%;   }
}

/* toast transition */
.toast-enter-active { transition: opacity 0.25s, transform 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.toast-leave-active { transition: opacity 0.2s, transform 0.2s; }
.toast-enter-from   { opacity: 0; transform: translateX(-50%) translateY(-16px); }
.toast-leave-to     { opacity: 0; transform: translateX(-50%) translateY(-8px); }

/* ── Notification items ─────────────────────────────────────────────── */
.notif-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px; border-radius: var(--radius-lg);
  cursor: pointer; transition: opacity 0.15s;
  border: 1px solid transparent;
}
.notif-item:active { opacity: 0.7; }
.notif-item-warning { background: var(--color-warning-bg);  border-color: #FFCC80; }
.notif-item-danger  { background: var(--color-danger-bg);   border-color: #FFAB9F; }
.notif-item-success { background: var(--color-success-bg);  border-color: #80D8BC; }
.notif-item-info    { background: var(--color-primary-tint); border-color: #A8C4F5; }

.notif-icon-wrap {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.notif-icon-warning { background: rgba(255,152,0,0.18); color: var(--color-warning); }
.notif-icon-danger  { background: rgba(255,82,82,0.15);  color: var(--color-danger); }
.notif-icon-success { background: rgba(3,186,129,0.15);  color: var(--color-success); }
.notif-icon-info    { background: var(--color-primary-tint); color: var(--color-primary); }

.notif-dismiss {
  width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
  background: rgba(0,0,0,0.06); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--color-text-tertiary);
}
.notif-dismiss:active { background: rgba(0,0,0,0.12); }

/* Profile sheet */
.profile-sheet {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  background: var(--color-bg-surface);
  border-radius: 20px 20px 0 0;
  z-index: 40;
  box-shadow: 0 -4px 30px rgba(0,0,0,0.12);
}
.sheet-close {
  position: absolute;
  top: 14px;
  right: 16px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--color-bg-page);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
}
.sheet-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-bg-page);
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-divider {
  height: 0.5px;
  background: var(--color-border-tertiary);
}
.sheet-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: none;
  border: none;
  width: 100%;
  cursor: default;
}
.sheet-logout { cursor: pointer; }
.sheet-logout:active { opacity: 0.7; }

/* Language pill inside sheet */
.lang-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-tertiary);
  font-size: 12px;        /* label */
  font-weight: 500;
  color: var(--color-text-tertiary);
  cursor: pointer;
}
.pill-sep { opacity: 0.3; }
.pill-active { color: var(--color-primary); }

/* Sheet transition */
.sheet-enter-active, .sheet-leave-active { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }
.sheet-enter-from, .sheet-leave-to       { transform: translateX(-50%) translateY(100%); }
.backdrop-enter-active, .backdrop-leave-active { transition: opacity 0.25s; }
.backdrop-enter-from, .backdrop-leave-to       { opacity: 0; }
</style>
