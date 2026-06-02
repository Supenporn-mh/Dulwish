<template>
  <div class="min-h-screen flex flex-col max-w-[430px] mx-auto" style="background: var(--color-bg-page)">

    <!-- Navbar -->
    <div class="navbar">
      <button @click="router.push('/')" class="flex items-center gap-1 text-[14px] font-medium" style="color: var(--color-primary); background: none; border: none; cursor: pointer;">
        <i class="ti ti-arrow-left" style="font-size: 18px;" />
        กลับ
      </button>
      <span class="navbar-title">{{ roleInfo.label }}</span>
      <div class="w-10" />
    </div>

    <div class="flex-1 px-4 pt-8 pb-6">

      <!-- Role icon -->
      <div class="flex flex-col items-center mb-8">
        <div class="text-[52px] mb-3">{{ roleInfo.icon }}</div>
        <p class="text-body-lg" style="color: var(--color-text-secondary)">{{ roleInfo.desc }}</p>
      </div>

      <!-- Registered success banner -->
      <div v-if="justRegistered" class="notif notif-success mb-5">
        <div class="notif-icon"><i class="ti ti-check" /></div>
        <div class="notif-content">
          <p class="notif-title">ลงทะเบียนสำเร็จ</p>
          <p class="notif-desc">เข้าสู่ระบบด้วยรหัสนักเรียนและรหัสผ่านที่ตั้งไว้</p>
        </div>
      </div>

      <!-- Demo hint (non-parent roles) -->
      <div v-if="!isParent" class="rounded-[var(--radius-lg)] px-4 py-3 mb-6" style="background: var(--color-primary-tint)">
        <p class="text-label mb-1 uppercase tracking-wide" style="color: var(--color-primary)">Demo Account</p>
        <p class="text-body-sm font-mono mt-1" style="color: var(--color-primary-dark)">{{ roleInfo.demo }}</p>
        <button @click="fillDemo" class="mt-2 text-[13px] font-medium underline" style="color: var(--color-primary); background: none; border: none; cursor: pointer; padding: 0;">
          กรอกอัตโนมัติ
        </button>
      </div>

      <!-- Demo hint (parent) -->
      <div v-if="isParent" class="rounded-[var(--radius-lg)] px-4 py-3 mb-6" style="background: var(--color-primary-tint)">
        <p class="text-label mb-1 uppercase tracking-wide" style="color: var(--color-primary)">Demo Account</p>
        <p class="text-body-sm font-mono mt-1" style="color: var(--color-primary-dark)">suchat@dulwich.ac.th / Demo1234!</p>
        <p class="text-body-sm font-mono" style="color: var(--color-primary-dark)">หรือ 0812345678 / Demo1234!</p>
        <button @click="fillParentDemo" class="mt-2 text-[13px] font-medium underline" style="color: var(--color-primary); background: none; border: none; cursor: pointer; padding: 0;">
          กรอกอัตโนมัติ
        </button>
      </div>

      <!-- Form card — parent (email/phone) -->
      <div v-if="isParent" class="card mb-2">
        <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
          <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">อีเมล หรือ เบอร์มือถือ</label>
          <input v-model="identifier" type="text" inputmode="email" autocomplete="username"
            placeholder="example@email.com หรือ 08xxxxxxxx" :disabled="loading"
            class="w-full text-body-md bg-transparent outline-none"
            style="border: none; color: var(--color-text-primary);" />
        </div>
        <div class="card-body" style="padding-top: 14px;">
          <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">รหัสผ่าน</label>
          <div class="flex items-center gap-2">
            <input v-model="password" :type="showPw ? 'text' : 'password'" autocomplete="current-password"
              placeholder="รหัสผ่าน" :disabled="loading"
              class="flex-1 text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
            <button type="button" @click="showPw = !showPw" style="background: none; border: none; cursor: pointer; color: var(--color-text-tertiary);">
              <i :class="showPw ? 'ti ti-eye-off' : 'ti ti-eye'" style="font-size: 18px;" />
            </button>
          </div>
        </div>
      </div>

      <!-- Forgot password link -->
      <div v-if="isParent" class="flex justify-end mb-4">
        <button @click="showForgot = true" class="text-[13px] font-medium"
          style="color: var(--color-primary); background: none; border: none; cursor: pointer;">
          ลืมรหัสผ่าน?
        </button>
      </div>

      <!-- Form card — other roles -->
      <div v-if="!isParent" class="card mb-4">
        <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
          <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">อีเมล</label>
          <input v-model="identifier" type="email" inputmode="email" autocomplete="email" placeholder="example@email.com" :disabled="loading"
            class="w-full text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
        </div>
        <div class="card-body" style="padding-top: 14px;">
          <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">รหัสผ่าน</label>
          <div class="flex items-center gap-2">
            <input v-model="password" :type="showPw ? 'text' : 'password'" autocomplete="current-password" placeholder="รหัสผ่าน" :disabled="loading"
              class="flex-1 text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
            <button type="button" @click="showPw = !showPw" style="background: none; border: none; cursor: pointer; color: var(--color-text-tertiary);">
              <i :class="showPw ? 'ti ti-eye-off' : 'ti ti-eye'" style="font-size: 18px;" />
            </button>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="notif notif-danger mb-4">
        <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
        <div class="notif-content">
          <p class="notif-title">เข้าสู่ระบบไม่สำเร็จ</p>
          <p class="notif-desc">{{ error }}</p>
        </div>
      </div>

      <!-- Login button -->
      <button @click="handleLogin" :disabled="loading || !identifier || !password" class="btn-lg btn-primary w-full mb-3">
        <span v-if="loading" class="flex items-center justify-center gap-2">
          <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          กำลังเข้าสู่ระบบ...
        </span>
        <span v-else>เข้าสู่ระบบ</span>
      </button>

      <!-- Register link (parent only) -->
      <button v-if="isParent" @click="router.push('/parent/register')"
        class="btn-lg btn-ghost w-full">
        ยังไม่มีบัญชี? ลงทะเบียน
      </button>

    </div>
  </div>

  <!-- ── Forgot Password Sheet ───────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="showForgot" class="forgot-backdrop" @click="closeForgot" />
    </Transition>
    <Transition name="sheet-up">
      <div v-if="showForgot" class="forgot-sheet">
        <div class="forgot-handle" />

        <!-- Step 1: enter contact -->
        <div v-if="forgotStep === 1" class="px-5 pb-8 flex flex-col gap-4">
          <div>
            <p class="text-heading-lg" style="color: var(--color-text-primary)">ลืมรหัสผ่าน</p>
            <p class="text-body-sm mt-1" style="color: var(--color-text-secondary)">กรอกอีเมล หรือเบอร์มือถือที่ใช้ลงทะเบียน</p>
          </div>
          <div class="card card-body">
            <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">อีเมล / เบอร์มือถือ</label>
            <input v-model="forgotContact" type="text" placeholder="example@email.com หรือ 08xxxxxxxx"
              class="w-full text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
          </div>
          <div v-if="forgotError" class="notif notif-danger">
            <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
            <div class="notif-content"><p class="notif-desc">{{ forgotError }}</p></div>
          </div>
          <!-- Demo OTP display -->
          <div v-if="forgotOtpDemo" class="rounded-[var(--radius-lg)] px-4 py-3" style="background: var(--color-primary-tint)">
            <p class="text-label" style="color: var(--color-primary)">Demo OTP</p>
            <p class="text-heading-lg font-mono mt-1 tracking-[0.3em]" style="color: var(--color-primary-dark)">{{ forgotOtpDemo }}</p>
          </div>
          <button @click="sendForgotOtp" :disabled="forgotLoading || !forgotContact.trim()"
            class="btn-lg btn-primary w-full">
            <span v-if="forgotLoading" class="flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              กำลังส่ง...
            </span>
            <span v-else>ส่ง OTP</span>
          </button>
        </div>

        <!-- Step 2: enter OTP + new password -->
        <div v-if="forgotStep === 2" class="px-5 pb-8 flex flex-col gap-4">
          <div>
            <p class="text-heading-lg" style="color: var(--color-text-primary)">ตั้งรหัสผ่านใหม่</p>
            <p class="text-body-sm mt-1" style="color: var(--color-text-secondary)">กรอก OTP ที่ส่งไปยัง {{ forgotContact }}</p>
          </div>
          <div class="card">
            <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
              <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">รหัส OTP (6 หลัก)</label>
              <input v-model="forgotOtp" type="text" inputmode="numeric" maxlength="6" placeholder="000000"
                class="w-full text-body-md font-mono tracking-[0.3em] bg-transparent outline-none"
                style="border: none; color: var(--color-text-primary);" />
            </div>
            <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
              <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">รหัสผ่านใหม่</label>
              <input v-model="forgotNewPw" :type="showForgotPw ? 'text' : 'password'" placeholder="อย่างน้อย 8 ตัวอักษร"
                class="w-full text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
            </div>
            <div class="card-body">
              <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">ยืนยันรหัสผ่านใหม่</label>
              <div class="flex items-center gap-2">
                <input v-model="forgotConfirmPw" :type="showForgotPw ? 'text' : 'password'" placeholder="ยืนยัน"
                  class="flex-1 text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
                <button type="button" @click="showForgotPw = !showForgotPw" style="background: none; border: none; cursor: pointer; color: var(--color-text-tertiary);">
                  <i :class="showForgotPw ? 'ti ti-eye-off' : 'ti ti-eye'" style="font-size: 18px;" />
                </button>
              </div>
            </div>
          </div>
          <p v-if="forgotConfirmPw && forgotNewPw !== forgotConfirmPw" class="text-caption" style="color: var(--color-danger)">รหัสผ่านไม่ตรงกัน</p>
          <div v-if="forgotError" class="notif notif-danger">
            <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
            <div class="notif-content"><p class="notif-desc">{{ forgotError }}</p></div>
          </div>
          <button @click="resetPassword"
            :disabled="forgotLoading || forgotOtp.length < 6 || !forgotNewPw || forgotNewPw !== forgotConfirmPw"
            class="btn-lg btn-primary w-full">
            <span v-if="forgotLoading" class="flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              กำลังรีเซ็ต...
            </span>
            <span v-else>ตั้งรหัสผ่านใหม่</span>
          </button>
        </div>

        <!-- Step 3: success -->
        <div v-if="forgotStep === 3" class="px-5 pb-8 flex flex-col items-center gap-4 text-center">
          <i class="ti ti-circle-check" style="font-size: 52px; color: var(--color-success)" />
          <p class="text-heading-lg" style="color: var(--color-text-primary)">เปลี่ยนรหัสผ่านสำเร็จ</p>
          <p class="text-body-sm" style="color: var(--color-text-secondary)">กลับไปเข้าสู่ระบบด้วยรหัสผ่านใหม่</p>
          <button @click="closeForgot" class="btn-lg btn-primary w-full">ปิด</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const identifier = ref('')
const password   = ref('')
const loading    = ref(false)
const error      = ref('')
const showPw     = ref(false)

const roleKey        = computed(() => (route.query.role as string) ?? 'parent')
const isParent       = computed(() => roleKey.value === 'parent')
const justRegistered = computed(() => route.query.registered === '1')

watch(roleKey, () => { identifier.value = ''; password.value = ''; error.value = '' })

// ── Forgot password ───────────────────────────────────────────────────────────
const showForgot    = ref(false)
const forgotStep    = ref(1)
const forgotContact = ref('')
const forgotOtp     = ref('')
const forgotOtpDemo = ref('')
const forgotNewPw   = ref('')
const forgotConfirmPw = ref('')
const showForgotPw  = ref(false)
const forgotLoading = ref(false)
const forgotError   = ref('')

function closeForgot() {
  showForgot.value = false
  forgotStep.value = 1
  forgotContact.value = forgotOtp.value = forgotOtpDemo.value = forgotNewPw.value = forgotConfirmPw.value = forgotError.value = ''
}

async function sendForgotOtp() {
  forgotLoading.value = true; forgotError.value = ''
  try {
    const res = await api.post('/auth/forgot-password/send', { contact: forgotContact.value.trim().toLowerCase() })
    forgotOtpDemo.value = res.data.otp ?? ''
    forgotStep.value = 2
  } catch (e: any) {
    forgotError.value = e?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด'
  } finally { forgotLoading.value = false }
}

async function resetPassword() {
  forgotLoading.value = true; forgotError.value = ''
  try {
    await api.post('/auth/forgot-password/reset', {
      contact: forgotContact.value.trim().toLowerCase(),
      otp:         forgotOtp.value.trim(),
      newPassword: forgotNewPw.value,
    })
    forgotStep.value = 3
  } catch (e: any) {
    forgotError.value = e?.response?.data?.error?.message ?? 'รหัส OTP ไม่ถูกต้อง'
  } finally { forgotLoading.value = false }
}

const roleMap: Record<string, any> = {
  parent:     { icon: '👨‍👩‍👧', label: 'ผู้ปกครอง',       desc: 'เข้าสู่ระบบด้วยอีเมล / เบอร์มือถือ', demo: '', creds: ['',''], to: '/parent/dashboard' },
  admin:      { icon: '🛡️',   label: 'Admin',           desc: 'เข้าสู่ระบบสำหรับผู้ดูแล',     demo: 'admin@dulwich.ac.th / Admin1234!', creds: ['admin@dulwich.ac.th','Admin1234!'],  to: '/admin/dashboard'  },
  supervisor: { icon: '🛡️',   label: 'Supervisor',       desc: 'เข้าสู่ระบบสำหรับ Supervisor', demo: 'patcha@school.local / Super123!',  creds: ['patcha@school.local','Super123!'],   to: '/admin/dashboard'  },
  cashier:    { icon: '🏪',   label: 'แคชเชียร์ (POS)', desc: 'เข้าสู่ระบบสำหรับแคชเชียร์',   demo: 'nong@school.local / Cashier123!',  creds: ['nong@school.local','Cashier123!'],   to: '/pos/sale'         },
}

const roleInfo = computed(() => roleMap[roleKey.value] ?? roleMap.parent)

const roleToPath: Record<string, string> = {
  parent: '/parent/dashboard', admin: '/admin/dashboard',
  supervisor: '/admin/dashboard', cashier: '/pos/sale',
}

function fillDemo() {
  const [e, p] = roleInfo.value.creds
  identifier.value = e; password.value = p
}

function fillParentDemo() {
  identifier.value = 'suchat@dulwich.ac.th'
  password.value   = 'Demo1234!'
}

async function handleLogin() {
  loading.value = true; error.value = ''
  try {
    let user: any
    if (isParent.value) {
      user = await auth.parentLoginV2(identifier.value.trim(), password.value)
    } else {
      user = await auth.login(identifier.value.trim(), password.value)
    }
    router.push(roleToPath[user.role] ?? '/')
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message
    const status = e?.response?.status
    if (msg) error.value = msg
    else if (status === 401) error.value = 'รหัสไม่ถูกต้องหรือรหัสผ่านผิด'
    else error.value = 'ไม่สามารถเชื่อมต่อ API ได้ — ตรวจสอบว่า API รันอยู่ที่ localhost:4000'
  } finally { loading.value = false }
}
</script>

<style scoped>
.forgot-backdrop {
  position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.4);
}
.forgot-sheet {
  position: fixed; bottom: 0; left: 50%; z-index: 50;
  transform: translateX(-50%);
  width: 100%; max-width: 430px;
  background: var(--color-bg-surface);
  border-radius: 20px 20px 0 0;
  padding-top: 12px;
  box-shadow: 0 -4px 30px rgba(0,0,0,0.12);
}
.forgot-handle {
  width: 40px; height: 4px; border-radius: 2px;
  background: var(--color-border-secondary);
  margin: 0 auto 16px;
}
.backdrop-enter-active, .backdrop-leave-active { transition: opacity 0.25s; }
.backdrop-enter-from, .backdrop-leave-to       { opacity: 0; }
.sheet-up-enter-active, .sheet-up-leave-active { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }
.sheet-up-enter-from, .sheet-up-leave-to       { transform: translateX(-50%) translateY(100%); }
</style>
