<template>
  <div class="lv-root">

    <!-- ── LEFT PANEL (desktop only) ──────────────────────────────── -->
    <div class="lv-left">
      <div class="lv-left-inner">
        <div class="lv-shield">
          <svg viewBox="0 0 100 130" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2">
            <path d="M50 6 L10 24 L10 74 Q10 108 50 124 Q90 108 90 74 L90 24 Z"/>
            <text x="50" y="70" text-anchor="middle" font-size="20" font-weight="700"
              stroke="none" fill="rgba(255,255,255,0.95)" font-family="Georgia,serif">DCB</text>
            <line x1="24" y1="80" x2="76" y2="80" stroke-width="1" stroke="rgba(255,255,255,0.4)"/>
            <text x="50" y="94" text-anchor="middle" font-size="7.5" letter-spacing="2.5"
              stroke="none" fill="rgba(255,255,255,0.6)" font-family="Georgia,serif">DULWICH</text>
          </svg>
        </div>
        <h2 class="lv-school-name">Dulwich College<br>Bangkok</h2>
        <p class="lv-school-sub">UPOS · Canteen Cashless System</p>
      </div>
    </div>

    <!-- ── RIGHT PANEL ─────────────────────────────────────────────── -->
    <div class="lv-right">

      <!-- Lang toggle (top-right) -->
      <div class="lv-topbar">
        <button @click="locale.toggle()" class="lang-btn" :aria-label="locale.lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'">
          <PhTranslate :size="13" weight="bold" />
          {{ locale.lang === 'th' ? 'EN' : 'TH' }}
        </button>
      </div>

      <!-- ── CARD AREA (flex: 1, centers card vertically) ─────────── -->
      <div class="lv-card-area">

      <!-- ── LOGIN CARD ──────────────────────────────────────────── -->
      <div v-if="!showForgot" class="lv-card">

        <!-- Crest -->
        <div class="lv-crest-wrap">
          <svg viewBox="0 0 100 130" width="68" height="88" fill="none"
            stroke="var(--color-text-primary)" stroke-width="2.2">
            <path d="M50 6 L10 24 L10 74 Q10 108 50 124 Q90 108 90 74 L90 24 Z"/>
            <text x="50" y="70" text-anchor="middle" font-size="20" font-weight="700"
              stroke="none" fill="var(--color-text-primary)" font-family="Georgia,serif">DCB</text>
            <line x1="24" y1="80" x2="76" y2="80" stroke-width="1" stroke="var(--color-border-primary)"/>
            <text x="50" y="94" text-anchor="middle" font-size="7.5" letter-spacing="2.5"
              stroke="none" fill="var(--color-text-tertiary)" font-family="Georgia,serif">DULWICH</text>
          </svg>
        </div>

        <h1 class="lv-title">{{ locale.t('เข้าสู่ระบบ', 'Sign In') }}</h1>
        <p class="lv-subtitle">{{ roleInfo.desc }}</p>

        <!-- Registered success -->
        <div v-if="justRegistered" class="lv-banner lv-banner-success">
          <i class="ti ti-check" />
          {{ locale.t('ลงทะเบียนสำเร็จ — เข้าสู่ระบบด้วยรหัสผ่านที่ตั้งไว้', 'Registration successful — sign in with your password') }}
        </div>

        <!-- Demo hint -->
        <div v-if="!isParent" class="lv-demo">
          <span class="lv-demo-label">Demo Account</span>
          <span class="lv-demo-val">{{ roleInfo.demo }}</span>
          <button @click="fillDemo" class="lv-demo-fill">{{ locale.t('กรอกอัตโนมัติ', 'Auto Fill') }}</button>
        </div>
        <div v-if="isParent" class="lv-demo">
          <span class="lv-demo-label">Demo Account</span>
          <span class="lv-demo-val">ruttana@gmail.com / Demo1234!</span>
          <button @click="fillParentDemo" class="lv-demo-fill">{{ locale.t('กรอกอัตโนมัติ', 'Auto Fill') }}</button>
        </div>

        <!-- Email / Identifier -->
        <div class="lv-field">
          <label class="lv-field-label">{{ isParent ? locale.t('อีเมล หรือ เบอร์มือถือ', 'Email or Mobile') : locale.t('อีเมล', 'Email') }}</label>
          <div class="lv-input-wrap">
            <i class="ti ti-mail lv-input-icon" />
            <input
              v-model="identifier"
              :type="isParent ? 'text' : 'email'"
              inputmode="email"
              :autocomplete="isParent ? 'username' : 'email'"
              :placeholder="isParent ? locale.t('example@email.com หรือ 08xxxxxxxx', 'example@email.com or 08xxxxxxxx') : 'example@email.com'"
              :disabled="loading"
              class="lv-input"
            />
          </div>
        </div>

        <!-- Password -->
        <div class="lv-field">
          <label class="lv-field-label">{{ locale.t('รหัสผ่าน', 'Password') }}</label>
          <div class="lv-input-wrap">
            <i class="ti ti-lock lv-input-icon" />
            <input
              v-model="password"
              :type="showPw ? 'text' : 'password'"
              autocomplete="current-password"
              :placeholder="locale.t('รหัสผ่าน', 'Password')"
              :disabled="loading"
              class="lv-input"
              @keyup.enter="handleLogin"
            />
            <button type="button" @click="showPw = !showPw" class="lv-eye-btn">
              <i :class="showPw ? 'ti ti-eye-off' : 'ti ti-eye'" />
            </button>
          </div>
        </div>

        <!-- Forgot password link -->
        <div v-if="isParent" class="lv-forgot-row">
          <button @click="openForgot" class="lv-forgot-btn">{{ locale.t('ลืมรหัสผ่าน?', 'Forgot Password?') }}</button>
        </div>

        <!-- Error -->
        <div v-if="error" class="lv-banner lv-banner-error">
          <i class="ti ti-alert-triangle" />
          {{ error }}
        </div>

        <!-- Continue -->
        <button @click="handleLogin" :disabled="loading || !identifier || !password" class="lv-btn-primary">
          <span v-if="loading" class="lv-spinner" />
          <span v-else>{{ locale.t('เข้าสู่ระบบ', 'Sign In') }} &nbsp;→</span>
        </button>

        <!-- Register (parent) -->
        <button v-if="isParent" @click="router.push('/parent/register')" class="lv-btn-outline mt-3">
          {{ locale.t('ยังไม่มีบัญชี? ลงทะเบียน', "Don't have an account? Register") }}
        </button>

        <!-- Back to role selection -->
        <button @click="router.push('/')" class="lv-back-link mt-3">
          {{ locale.t('← เปลี่ยนประเภทผู้ใช้', '← Change User Type') }}
        </button>

      </div>

      <!-- ── FORGOT PASSWORD CARD ─────────────────────────────────── -->
      <div v-else class="lv-card">

        <!-- Crest -->
        <div class="lv-crest-wrap">
          <svg viewBox="0 0 100 130" width="68" height="88" fill="none"
            stroke="var(--color-text-primary)" stroke-width="2.2">
            <path d="M50 6 L10 24 L10 74 Q10 108 50 124 Q90 108 90 74 L90 24 Z"/>
            <text x="50" y="70" text-anchor="middle" font-size="20" font-weight="700"
              stroke="none" fill="var(--color-text-primary)" font-family="Georgia,serif">DCB</text>
            <line x1="24" y1="80" x2="76" y2="80" stroke-width="1" stroke="var(--color-border-primary)"/>
            <text x="50" y="94" text-anchor="middle" font-size="7.5" letter-spacing="2.5"
              stroke="none" fill="var(--color-text-tertiary)" font-family="Georgia,serif">DULWICH</text>
          </svg>
        </div>

        <!-- Step 1: enter contact -->
        <template v-if="forgotStep === 1">
          <h1 class="lv-title">{{ locale.t('ลืมรหัสผ่าน?', 'Forgot Password?') }}</h1>
          <p class="lv-subtitle">{{ locale.t('กรอกอีเมล หรือเบอร์มือถือที่ใช้ลงทะเบียน', 'Enter your registered email or mobile number') }}</p>

          <div class="lv-field">
            <label class="lv-field-label">{{ locale.t('อีเมล / เบอร์มือถือ', 'Email / Mobile') }}</label>
            <div class="lv-input-wrap">
              <i class="ti ti-mail lv-input-icon" />
              <input v-model="forgotContact" type="text"
                :placeholder="locale.t('example@email.com หรือ 08xxxxxxxx', 'example@email.com or 08xxxxxxxx')"
                class="lv-input" />
            </div>
          </div>

          <!-- Demo OTP display -->
          <div v-if="forgotOtpDemo" class="lv-demo">
            <span class="lv-demo-label">Demo OTP</span>
            <span class="lv-demo-val tracking-widest text-lg font-mono">{{ forgotOtpDemo }}</span>
          </div>

          <div v-if="forgotError" class="lv-banner lv-banner-error mb-3">
            <i class="ti ti-alert-triangle" />{{ forgotError }}
          </div>

          <button @click="sendForgotOtp" :disabled="forgotLoading || !forgotContact.trim()" class="lv-btn-primary">
            <span v-if="forgotLoading" class="lv-spinner" />
            <span v-else>{{ locale.t('ส่ง OTP', 'Send OTP') }} &nbsp;→</span>
          </button>
        </template>

        <!-- Step 2: OTP + new password -->
        <template v-else-if="forgotStep === 2">
          <h1 class="lv-title">{{ locale.t('ตั้งรหัสผ่านใหม่', 'Set New Password') }}</h1>
          <p class="lv-subtitle">{{ locale.t('กรอก OTP ที่ส่งไปยัง', 'Enter OTP sent to') }} {{ forgotContact }}</p>

          <div class="lv-field">
            <label class="lv-field-label">{{ locale.t('รหัส OTP (6 หลัก)', 'OTP Code (6 digits)') }}</label>
            <div class="lv-input-wrap">
              <i class="ti ti-keyboard lv-input-icon" />
              <input v-model="forgotOtp" type="text" inputmode="numeric" maxlength="6"
                placeholder="000000" class="lv-input font-mono tracking-widest" />
            </div>
          </div>

          <div class="lv-field">
            <label class="lv-field-label">{{ locale.t('รหัสผ่านใหม่', 'New Password') }}</label>
            <div class="lv-input-wrap">
              <i class="ti ti-lock lv-input-icon" />
              <input v-model="forgotNewPw" :type="showForgotPw ? 'text' : 'password'"
                :placeholder="locale.t('อย่างน้อย 8 ตัวอักษร', 'At least 8 characters')" class="lv-input" />
              <button type="button" @click="showForgotPw = !showForgotPw" class="lv-eye-btn">
                <i :class="showForgotPw ? 'ti ti-eye-off' : 'ti ti-eye'" />
              </button>
            </div>
          </div>

          <div class="lv-field">
            <label class="lv-field-label">{{ locale.t('ยืนยันรหัสผ่านใหม่', 'Confirm New Password') }}</label>
            <div class="lv-input-wrap">
              <i class="ti ti-lock lv-input-icon" />
              <input v-model="forgotConfirmPw" :type="showForgotPw ? 'text' : 'password'"
                :placeholder="locale.t('ยืนยัน', 'Confirm')" class="lv-input" />
            </div>
            <p v-if="forgotConfirmPw && forgotNewPw !== forgotConfirmPw"
              class="text-[12px] mt-1" style="color:var(--color-danger)">{{ locale.t('รหัสผ่านไม่ตรงกัน', 'Passwords do not match') }}</p>
          </div>

          <div v-if="forgotError" class="lv-banner lv-banner-error mb-3">
            <i class="ti ti-alert-triangle" />{{ forgotError }}
          </div>

          <button @click="resetPassword"
            :disabled="forgotLoading || forgotOtp.length < 6 || !forgotNewPw || forgotNewPw !== forgotConfirmPw"
            class="lv-btn-primary">
            <span v-if="forgotLoading" class="lv-spinner" />
            <span v-else>{{ locale.t('ตั้งรหัสผ่านใหม่', 'Set New Password') }} &nbsp;→</span>
          </button>
        </template>

        <!-- Step 3: success -->
        <template v-else>
          <div class="flex flex-col items-center text-center py-4 gap-3">
            <i class="ti ti-circle-check" style="font-size:52px;color:var(--color-success)" />
            <h1 class="lv-title">{{ locale.t('เปลี่ยนรหัสผ่านสำเร็จ', 'Password Changed') }}</h1>
            <p class="lv-subtitle">{{ locale.t('กลับไปเข้าสู่ระบบด้วยรหัสผ่านใหม่', 'Sign in with your new password') }}</p>
          </div>
          <button @click="closeForgot" class="lv-btn-primary">{{ locale.t('เข้าสู่ระบบ', 'Sign In') }}</button>
        </template>

        <!-- Back to login -->
        <button @click="closeForgot" class="lv-back-link mt-4">
          {{ locale.t('← กลับเข้าสู่ระบบ', '← Back to Sign In') }}
        </button>

      </div>

      </div><!-- /lv-card-area -->

      <!-- Footer -->
      <p class="lv-footer">
        UPOS · Canteen Cashless System &nbsp;•&nbsp; © 2026 All rights reserved.
      </p>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore } from '@/stores/locale'
import { PhTranslate } from '@phosphor-icons/vue'
import api from '@/api/axios'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()
const locale = useLocaleStore()

const identifier = ref('')
const password   = ref('')
const loading    = ref(false)
const error      = ref('')
const showPw     = ref(false)

const roleKey        = computed(() => (route.query.role as string) ?? 'parent')
const isParent       = computed(() => roleKey.value === 'parent')
const justRegistered = computed(() => route.query.registered === '1')

watch(roleKey, () => { identifier.value = ''; password.value = '' })

// ── Forgot password ──────────────────────────────────────────────────────────
const showForgot      = ref(false)
const forgotStep      = ref(1)
const forgotContact   = ref('')
const forgotOtp       = ref('')
const forgotOtpDemo   = ref('')
const forgotNewPw     = ref('')
const forgotConfirmPw = ref('')
const showForgotPw    = ref(false)
const forgotLoading   = ref(false)
const forgotError     = ref('')

const API_ERROR_MAP: Record<string, string> = {
  'ไม่พบบัญชีนี้ในระบบ':                'Account not found',
  'อีเมลหรือรหัสผ่านไม่ถูกต้อง':          'Invalid email or password',
  'รหัส OTP ไม่ถูกต้อง':                  'Invalid OTP code',
  'OTP หมดอายุแล้ว':                      'OTP has expired',
  'กรุณากรอกข้อมูลให้ครบถ้วน':            'Please fill in all required fields',
  'บัญชีนี้ถูกระงับการใช้งาน':            'This account has been suspended',
  'เกิดข้อผิดพลาด':                       'An error occurred',
}
function translateApiError(msg: string | undefined, fallbackTh: string, fallbackEn: string): string {
  if (!msg) return locale.t(fallbackTh, fallbackEn)
  return locale.lang === 'en' ? (API_ERROR_MAP[msg] ?? msg) : msg
}

function openForgot() {
  showForgot.value = true
  forgotStep.value = 1
}

function closeForgot() {
  showForgot.value = false
  forgotStep.value = 1
  forgotContact.value = forgotOtp.value = forgotOtpDemo.value = ''
  forgotNewPw.value = forgotConfirmPw.value = forgotError.value = ''
}

async function sendForgotOtp() {
  forgotLoading.value = true; forgotError.value = ''
  try {
    const res = await api.post('/auth/forgot-password/send', { contact: forgotContact.value.trim().toLowerCase() })
    forgotOtpDemo.value = res.data.otp ?? ''
    forgotStep.value = 2
  } catch (e: any) {
    forgotError.value = translateApiError(e?.response?.data?.error?.message, 'เกิดข้อผิดพลาด', 'An error occurred')
  } finally { forgotLoading.value = false }
}

async function resetPassword() {
  forgotLoading.value = true; forgotError.value = ''
  try {
    await api.post('/auth/forgot-password/reset', {
      contact:     forgotContact.value.trim().toLowerCase(),
      otp:         forgotOtp.value.trim(),
      newPassword: forgotNewPw.value,
    })
    forgotStep.value = 3
  } catch (e: any) {
    forgotError.value = translateApiError(e?.response?.data?.error?.message, 'รหัส OTP ไม่ถูกต้อง', 'Invalid OTP code')
  } finally { forgotLoading.value = false }
}

// ── Role map ─────────────────────────────────────────────────────────────────
const roleMap: Record<string, any> = {
  parent:     { label: 'ผู้ปกครอง',       descTh: 'เติมเงิน · สั่งอาหาร · ดูประวัติ', descEn: 'Top Up · Order Food · View History', demo: '', creds: ['',''] },
  admin:      { label: 'Admin',           descTh: 'เข้าสู่ระบบสำหรับผู้ดูแล',                                                          demo: 'admin@dulwich.ac.th / Admin1234!',    creds: ['admin@dulwich.ac.th','Admin1234!']  },
  supervisor: { label: 'Supervisor',      descTh: 'เข้าสู่ระบบสำหรับ Supervisor',                                                       demo: 'patcha@school.local / Super123!',     creds: ['patcha@school.local','Super123!']   },
  cashier:    { label: 'แคชเชียร์ (POS)', descTh: 'เข้าสู่ระบบสำหรับแคชเชียร์',                                                         demo: 'nong@school.local / Cashier123!',     creds: ['nong@school.local','Cashier123!']   },
}

const roleInfo = computed(() => {
  const entry = roleMap[roleKey.value] ?? roleMap.parent
  const desc  = entry.descEn && locale.lang === 'en' ? entry.descEn : entry.descTh
  return { ...entry, desc }
})

const roleToPath: Record<string, string> = {
  parent: '/parent/dashboard', admin: '/admin/dashboard',
  supervisor: '/admin/dashboard', cashier: '/pos/sale',
}

function fillDemo() {
  const [e, p] = roleInfo.value.creds
  identifier.value = e; password.value = p
}
function fillParentDemo() {
  identifier.value = 'ruttana@gmail.com'
  password.value   = 'Demo1234!'
}

async function handleLogin() {
  if (loading.value || !identifier.value || !password.value) return
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
    const msg    = e?.response?.data?.error?.message
                ?? e?.response?.data?.message
    const status = e?.response?.status
    if (msg)                error.value = translateApiError(msg, msg, API_ERROR_MAP[msg] ?? msg)
    else if (status === 401) error.value = locale.t('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'Invalid email or password')
    else if (status === 422) error.value = locale.t('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีเมลและรหัสผ่าน', 'Invalid data, please check your email and password')
    else if (!status)        error.value = locale.t('ไม่สามารถเชื่อมต่อ API ได้', 'Cannot connect to API — check that API is running at localhost:4000')
    else                     error.value = locale.t(`เกิดข้อผิดพลาด (${status})`, `Error (${status})`)
  } finally { loading.value = false }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════ */
.lv-root {
  display: flex;
  min-height: 100vh;
}

/* ═══════════════════════════════════════════════════════════
   LEFT PANEL
═══════════════════════════════════════════════════════════ */
.lv-left { display: none; }

@media (min-width: 768px) {
  .lv-left {
    display: flex;
    flex: 1;
    min-height: 100vh;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background:
      linear-gradient(170deg,
        rgba(10,28,74,0.85) 0%,
        rgba(18,60,140,0.72) 55%,
        rgba(18,100,227,0.62) 100%
      ),
      repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.03) 60px),
      repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.03) 60px),
      linear-gradient(160deg, #0A1C4A 0%, #0F2D6B 50%, #1264E3 100%);
  }
}

.lv-left-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: white;
  padding: 48px 56px;
}
.lv-shield {
  width: 96px;
  height: 125px;
  margin-bottom: 32px;
}
.lv-school-name {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 14px;
  font-family: Georgia, 'Times New Roman', serif;
}
.lv-school-sub {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ═══════════════════════════════════════════════════════════
   RIGHT PANEL — light gray, fixed width on desktop
═══════════════════════════════════════════════════════════ */
.lv-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px 28px;
  min-height: 100vh;
  background: #F0F2F5;
  overflow-y: auto;
}

@media (min-width: 768px) {
  .lv-right {
    flex: 0 0 480px;
    background: #F5F7FA;
    padding: 24px 44px 32px;
  }
}
@media (min-width: 1400px) {
  .lv-right {
    flex: 0 0 540px;
    padding: 28px 56px 36px;
  }
}

/* ── Card area: fills remaining height, centers card ──────── */
.lv-card-area {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16px 0;
}

/* ═══════════════════════════════════════════════════════════
   TOPBAR
═══════════════════════════════════════════════════════════ */
.lv-topbar {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.lang-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-tertiary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s;
  letter-spacing: 0.3px;
  font-family: inherit;
}
.lang-btn:active { opacity: 0.7; }

/* ═══════════════════════════════════════════════════════════
   CARD — white, bordered, shadow
═══════════════════════════════════════════════════════════ */
.lv-card {
  width: 100%;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  background: white;
  border-radius: 16px;
  border: 1px solid #DDE1EA;
  box-shadow: 0 2px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

/* ═══════════════════════════════════════════════════════════
   CREST
═══════════════════════════════════════════════════════════ */
.lv-crest-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

/* ═══════════════════════════════════════════════════════════
   HEADINGS
═══════════════════════════════════════════════════════════ */
.lv-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}
.lv-subtitle {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: 24px;
  line-height: 1.5;
}

/* ═══════════════════════════════════════════════════════════
   BANNERS
═══════════════════════════════════════════════════════════ */
.lv-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  border-radius: var(--radius-lg);
  padding: 10px 14px;
  margin-bottom: 14px;
}
.lv-banner-success { color: var(--color-success); background: var(--color-success-bg); }
.lv-banner-error   { color: var(--color-danger);  background: var(--color-danger-bg);  }

/* ═══════════════════════════════════════════════════════════
   DEMO HINT
═══════════════════════════════════════════════════════════ */
.lv-demo {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  background: var(--color-primary-tint);
  border-radius: var(--radius-lg);
  padding: 10px 14px;
  margin-bottom: 18px;
}
.lv-demo-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-primary);
  flex: 0 0 100%;
}
.lv-demo-val {
  font-size: 12px;
  font-family: monospace;
  color: var(--color-primary-dark);
  flex: 0 0 100%;
}
.lv-demo-fill {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  margin-top: 2px;
}

/* ═══════════════════════════════════════════════════════════
   FIELDS
═══════════════════════════════════════════════════════════ */
.lv-field { margin-bottom: 14px; }
.lv-field-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}
.lv-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #F3F5F8;
  border: 1.5px solid transparent;
  border-radius: 10px;
  padding: 0 14px;
  height: 46px;
  transition: border-color 0.15s, background 0.15s;
}
.lv-input-wrap:focus-within {
  border-color: var(--color-primary);
  background: white;
}
.lv-input-icon {
  font-size: 16px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.lv-input {
  flex: 1;
  font-size: 14.5px;
  font-family: inherit;
  color: var(--color-text-primary);
  background: none;
  border: none;
  outline: none;
}
.lv-input::placeholder { color: var(--color-text-tertiary); }
.lv-input:disabled { opacity: 0.6; }
.lv-eye-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  padding: 0;
  font-size: 16px;
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════════════
   FORGOT ROW
═══════════════════════════════════════════════════════════ */
.lv-forgot-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -4px;
  margin-bottom: 18px;
}
.lv-forgot-btn {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.lv-forgot-btn:hover { text-decoration: underline; }

/* ═══════════════════════════════════════════════════════════
   BUTTONS
═══════════════════════════════════════════════════════════ */
.lv-btn-primary {
  width: 100%;
  height: 48px;
  background: var(--color-primary);
  color: white;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s, transform 0.1s;
}
.lv-btn-primary:hover:not(:disabled)  { background: var(--color-primary-light); }
.lv-btn-primary:active:not(:disabled) { transform: scale(0.98); }
.lv-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.lv-btn-outline {
  width: 100%;
  height: 44px;
  background: none;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  border: 1.5px solid var(--color-primary);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.lv-btn-outline:hover { background: var(--color-primary-tint); }

.lv-back-link {
  display: block;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
}
.lv-back-link:hover { text-decoration: underline; }

.lv-spinner {
  width: 17px; height: 17px;
  border: 2.5px solid rgba(255,255,255,0.35);
  border-top-color: white;
  border-radius: 50%;
  animation: lv-spin 0.7s linear infinite;
}
@keyframes lv-spin { to { transform: rotate(360deg); } }

/* ═══════════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════════ */
.lv-footer {
  font-size: 12px;
  color: var(--color-text-tertiary);
  text-align: center;
  margin-top: 20px;
  line-height: 1.7;
}

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.mb-3 { margin-bottom: 12px; }
.font-mono { font-family: monospace; }
.tracking-widest { letter-spacing: 0.3em; }
.text-lg { font-size: 18px; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.text-center { text-align: center; }
.py-4 { padding-top: 16px; padding-bottom: 16px; }
.gap-3 { gap: 12px; }
</style>
