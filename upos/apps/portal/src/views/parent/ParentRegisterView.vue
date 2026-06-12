<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import {
  PhUsersThree, PhIdentificationCard,
  PhArrowLeft, PhCheck, PhKey, PhDeviceMobileSpeaker, PhUser, PhLockSimple,
} from '@phosphor-icons/vue'

const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el._clickOutside = (e: MouseEvent) => { if (!el.contains(e.target as Node)) binding.value() }
    document.addEventListener('mousedown', el._clickOutside)
  },
  unmounted(el: HTMLElement) { document.removeEventListener('mousedown', el._clickOutside) },
}

const router = useRouter()
const step = ref<1 | 2 | 3>(1)

// ── Step 1: PDPA ──────────────────────────────────────────────────────────────
const pdpaAgreed = ref(false)

// ── Step 2: ระบุรหัสประจำตัว ─────────────────────────────────────────────────
const selectedRole          = ref<'parent' | 'member' | ''>('')
const showRoleDropdown      = ref(false)
const roleDropdownAnchorRef = ref<HTMLElement | null>(null)
const roleDropdownStyle     = ref('')
const roleLabel             = { parent: 'ผู้ปกครอง', member: 'สมาชิก / พนักงาน' }

function selectRoleOption(role: 'parent' | 'member') {
  if (selectedRole.value !== role) { selectedRole.value = role; onRoleChange() }
  showRoleDropdown.value = false
}
const enrollmentCode = ref('')
const searchLoading  = ref(false)
const searchError    = ref('')
const foundStudent   = ref<any>(null)
const foundMember    = ref<any>(null)
const contact        = ref('')
const otpSending     = ref(false)
const sendOtpError   = ref('')
const demoOtp        = ref('')

// ── Step 2: OTP ───────────────────────────────────────────────────────────────
const otpDigits      = ref(['', '', '', '', '', ''])
const otpError       = ref('')
const resendCooldown = ref(0)
let   resendTimer: ReturnType<typeof setInterval> | null = null

function startResendCooldown() {
  resendCooldown.value = 60
  resendTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) { clearInterval(resendTimer!); resendTimer = null }
  }, 1000)
}
onUnmounted(() => { if (resendTimer) clearInterval(resendTimer) })

// ── Step 4: บัญชี ────────────────────────────────────────────────────────────
const firstName       = ref('')
const lastName        = ref('')
const password        = ref('')
const confirmPw       = ref('')
const showPw          = ref(false)
const registerLoading = ref(false)
const step4Error      = ref('')

// ── Computed ──────────────────────────────────────────────────────────────────
const pwMismatch = computed(() => confirmPw.value && password.value !== confirmPw.value)

function detectContactType(v: string): 'email' | 'phone' | 'unknown' {
  if (!v) return 'unknown'
  if (/^0[0-9]{1,9}$/.test(v) || /^\+66/.test(v)) return 'phone'
  if (v.includes('@') || /^[a-zA-Z]/.test(v)) return 'email'
  return 'unknown'
}

const contactType = computed(() => detectContactType(contact.value.trim()))

const contactError = computed(() => {
  const v = contact.value.trim()
  if (!v) return ''
  if (contactType.value === 'phone') return /^0[0-9]{9}$/.test(v) ? '' : 'เบอร์มือถือต้องเริ่มด้วย 0 และมี 10 หลัก'
  if (contactType.value === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'รูปแบบอีเมลไม่ถูกต้อง'
  return ''
})

const foundInfo    = computed(() => foundStudent.value || foundMember.value)
const canNext1     = computed(() =>
  !!selectedRole.value && !!foundInfo.value &&
  !!contact.value.trim() && !contactError.value && contactType.value !== 'unknown'
)
const enteredOtpFull = computed(() => otpDigits.value.join(''))
const canRegister    = computed(() =>
  password.value.length >= 8 && !pwMismatch.value &&
  !!firstName.value.trim() && !!lastName.value.trim()
)

const roleLabelTh: Record<string, string> = {
  student: 'นักเรียน',
  parent: 'สมาชิก', member: 'สมาชิก', cashier: 'สมาชิก',
  teacher: 'สมาชิก', staff: 'สมาชิก', supervisor: 'สมาชิก', admin: 'สมาชิก',
}
const loginPathMap: Record<string, string> = {
  parent: '/login?role=parent', admin: '/login?role=admin',
  supervisor: '/login?role=supervisor', cashier: '/login?role=cashier',
}

const nextLabel = computed(() => {
  if (step.value === 1) return otpSending.value ? 'กำลังส่ง...' : 'ส่ง OTP'
  if (step.value === 2) return 'ยืนยัน OTP'
  return registerLoading.value ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'
})
const isNextLoading = computed(() => otpSending.value || registerLoading.value)
const canNext = computed(() => {
  if (step.value === 1) return canNext1.value && pdpaAgreed.value && !otpSending.value
  if (step.value === 2) return enteredOtpFull.value.length === 6
  return canRegister.value && !registerLoading.value
})

// ── Navigation ────────────────────────────────────────────────────────────────
function goBack() {
  if (step.value === 1) { router.back(); return }
  if (step.value === 2) { otpDigits.value = ['','','','','','']; otpError.value = ''; step.value = 1; return }
  step.value = (step.value - 1) as any
}

function handleNext() {
  if (step.value === 1) { sendOtp(); return }
  if (step.value === 2) { verifyOtp(); return }
  handleRegister()
}

// ── Step 2 helpers ────────────────────────────────────────────────────────────
function openRoleDropdown() {
  if (!showRoleDropdown.value) {
    const el = roleDropdownAnchorRef.value
    if (el) {
      const r = el.getBoundingClientRect()
      roleDropdownStyle.value = `position:fixed;top:${r.bottom + 4}px;left:${r.left}px;width:${r.width}px;z-index:9999`
    }
  }
  showRoleDropdown.value = !showRoleDropdown.value
}

function onRoleChange() {
  enrollmentCode.value = ''; foundStudent.value = null; foundMember.value = null
  contact.value = ''; searchError.value = ''; sendOtpError.value = ''
}

async function searchCode() {
  if (!enrollmentCode.value.trim()) return
  searchError.value = ''; searchLoading.value = true
  foundStudent.value = null; foundMember.value = null
  try {
    const res = await api.post('/auth/verify-enrollment', {
      code: enrollmentCode.value.trim().toUpperCase(),
    })
    if (selectedRole.value === 'parent' && res.data.type !== 'student') {
      searchError.value = 'รหัสนี้ไม่ใช่ Enrollment Code ของนักเรียน'
      return
    }
    if (selectedRole.value === 'member' && res.data.type !== 'member') {
      searchError.value = 'รหัสนี้ไม่ใช่ Enrollment Code ของสมาชิก'
      return
    }
    if (res.data.type === 'student') {
      foundStudent.value = res.data.student
    } else {
      foundMember.value = res.data.member
      contact.value = res.data.member.email ?? res.data.member.phone ?? ''
    }
  } catch (e: any) {
    searchError.value = e?.response?.data?.error?.message ?? 'ไม่พบรหัสลงทะเบียน'
  } finally { searchLoading.value = false }
}

async function sendOtp() {
  sendOtpError.value = ''; otpSending.value = true
  try {
    const res = await api.post('/auth/send-registration-otp', {
      enrollmentCode: enrollmentCode.value.trim().toUpperCase(),
      contact:        contact.value.trim(),
    })
    demoOtp.value = res.data.demoOtp
    otpDigits.value = ['','','','','','']
    otpError.value = ''
    step.value = 2
    startResendCooldown()
    await nextTick()
    document.querySelector<HTMLInputElement>('.otp-digit')?.focus()
  } catch (e: any) {
    sendOtpError.value = e?.response?.data?.error?.message ?? 'ส่ง OTP ไม่สำเร็จ'
  } finally { otpSending.value = false }
}

// ── Step 3 ────────────────────────────────────────────────────────────────────
function handleOtpInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const val   = input.value.replace(/\D/g, '').slice(-1)
  otpDigits.value[index] = val
  if (val && index < 5) {
    const inputs = document.querySelectorAll<HTMLInputElement>('.otp-digit')
    inputs[index + 1]?.focus()
  }
}
function handleOtpKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !otpDigits.value[index] && index > 0) {
    otpDigits.value[index - 1] = ''
    const inputs = document.querySelectorAll<HTMLInputElement>('.otp-digit')
    inputs[index - 1]?.focus()
  }
}
function verifyOtp() {
  otpError.value = ''
  if (enteredOtpFull.value !== demoOtp.value) {
    otpError.value = 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
    return
  }
  if (foundMember.value) {
    firstName.value = foundMember.value.firstName ?? ''
    lastName.value  = foundMember.value.lastName  ?? ''
  }
  step.value = 3
}

// ── Step 4 ────────────────────────────────────────────────────────────────────
async function handleRegister() {
  step4Error.value = ''; registerLoading.value = true
  try {
    const otp    = enteredOtpFull.value
    const ctType = contactType.value
    const ctVal  = contact.value.trim()

    if (selectedRole.value === 'parent') {
      const body: Record<string, string> = {
        enrollmentCode: enrollmentCode.value.trim().toUpperCase(),
        firstName:      firstName.value.trim(),
        lastName:       lastName.value.trim(),
        password:       password.value,
        otp,
      }
      if (ctType === 'phone') body.phone = ctVal
      else body.email = ctVal.toLowerCase()
      await api.post('/auth/parent-register', body)
      router.push('/login?role=parent&registered=1')
    } else {
      const body: Record<string, string> = {
        enrollmentCode: enrollmentCode.value.trim().toUpperCase(),
        password:       password.value,
        otp,
      }
      if (ctType === 'phone') body.phone = ctVal
      else body.email = ctVal.toLowerCase()
      await api.post('/auth/member-register', body)
      const role = foundMember.value?.role ?? 'admin'
      router.push((loginPathMap[role] ?? '/login?role=admin') + '&registered=1')
    }
  } catch (e: any) {
    step4Error.value = e?.response?.data?.error?.message ?? 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่'
  } finally { registerLoading.value = false }
}
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background: var(--color-bg-page)">

    <!-- ── Navbar (full-width) ───────────────────────────────────────────── -->
    <div class="navbar">
      <button @click="goBack" class="flex items-center gap-1.5 text-[14px] font-medium"
        style="color: var(--color-primary); background: none; border: none; cursor: pointer;">
        <PhArrowLeft :size="18" weight="bold" />
        กลับ
      </button>
      <span class="navbar-title">ลงทะเบียนเข้าใช้งาน</span>
      <div class="w-14" />
    </div>

  <div class="flex-1 flex justify-center overflow-y-auto" style="background: var(--color-bg-page)">
  <div class="w-full max-w-[430px] flex flex-col" style="background: var(--color-bg-page)">

    <!-- ── Step indicator ─────────────────────────────────────────────────── -->
    <div class="step-track">
      <!-- Step 1 -->
      <div class="step-item">
        <div class="step-dot" :class="step > 1 ? 'step-done' : step === 1 ? 'step-active' : 'step-idle'">
          <PhCheck v-if="step > 1" :size="13" weight="bold" />
          <PhKey   v-else-if="step === 1" :size="15" weight="bold" />
          <span v-else class="step-num">1</span>
        </div>
        <span class="step-lbl" :class="step >= 1 ? 'step-lbl-on' : ''">รหัส</span>
      </div>
      <div class="step-conn" :class="step > 1 ? 'step-conn-done' : ''" />
      <!-- Step 2 -->
      <div class="step-item">
        <div class="step-dot" :class="step > 2 ? 'step-done' : step === 2 ? 'step-active' : 'step-idle'">
          <PhCheck              v-if="step > 2"    :size="13" weight="bold" />
          <PhDeviceMobileSpeaker v-else-if="step === 2" :size="15" weight="bold" />
          <span v-else class="step-num">2</span>
        </div>
        <span class="step-lbl" :class="step >= 2 ? 'step-lbl-on' : ''">OTP</span>
      </div>
      <div class="step-conn" :class="step > 2 ? 'step-conn-done' : ''" />
      <!-- Step 3 -->
      <div class="step-item">
        <div class="step-dot" :class="step === 3 ? 'step-active' : 'step-idle'">
          <PhUser v-if="step === 3" :size="15" weight="bold" />
          <span v-else class="step-num">3</span>
        </div>
        <span class="step-lbl" :class="step >= 3 ? 'step-lbl-on' : ''">บัญชี</span>
      </div>
    </div>

    <!-- ── Scrollable content ─────────────────────────────────────────────── -->
    <div class="content-area">

      <!-- ═══ Step 1: ระบุรหัสประจำตัว ══════════════════════════════════════ -->
      <div v-if="step === 1">
        <h2 class="page-title">ระบุรหัสประจำตัว</h2>
        <p class="page-subtitle">กรอกข้อมูลเพื่อยืนยันตัวตนผ่าน OTP</p>

        <!-- Form card -->
        <div class="card mb-4">

          <!-- ประเภท dropdown -->
          <div class="card-body" :style="selectedRole ? 'border-bottom: 0.5px solid var(--color-border-tertiary)' : ''">
            <label class="field-label">ประเภท <span style="color: var(--color-danger)">*</span></label>
            <div class="cdd-wrap" v-click-outside="() => showRoleDropdown = false">
              <button ref="roleDropdownAnchorRef" type="button" @click="openRoleDropdown"
                class="cdd-trigger" :class="showRoleDropdown ? 'cdd-open' : ''">
                <span :style="selectedRole ? 'color: var(--color-text-primary)' : 'color: var(--color-text-tertiary)'">
                  {{ selectedRole ? roleLabel[selectedRole] : '- เลือกประเภท -' }}
                </span>
                <i class="ti ti-chevron-down cdd-arrow" :class="showRoleDropdown ? 'cdd-arrow-up' : ''" />
              </button>
              <div v-if="showRoleDropdown" class="cdd-list" :style="roleDropdownStyle">
                <button type="button" @click="selectRoleOption('parent')" class="cdd-item"
                  :class="selectedRole === 'parent' ? 'cdd-item-active' : ''">
                  <PhUsersThree :size="22" weight="duotone" style="color: var(--color-success); flex-shrink:0" />
                  <div class="flex-1">
                    <p class="cdd-name">ผู้ปกครอง</p>
                    <p class="cdd-hint">Enrollment Code ของนักเรียน</p>
                  </div>
                  <i v-if="selectedRole === 'parent'" class="ti ti-check" style="color: var(--color-primary); font-size: 16px;" />
                </button>
                <div class="cdd-divider" />
                <button type="button" @click="selectRoleOption('member')" class="cdd-item"
                  :class="selectedRole === 'member' ? 'cdd-item-active' : ''">
                  <PhIdentificationCard :size="22" weight="duotone" style="color: var(--color-primary); flex-shrink:0" />
                  <div class="flex-1">
                    <p class="cdd-name">สมาชิก / พนักงาน</p>
                    <p class="cdd-hint">Enrollment Code ของสมาชิก</p>
                  </div>
                  <i v-if="selectedRole === 'member'" class="ti ti-check" style="color: var(--color-primary); font-size: 16px;" />
                </button>
              </div>
            </div>
          </div>

          <!-- Enrollment Code field (shows when role selected) -->
          <template v-if="selectedRole">
            <div class="card-body">
              <label class="field-label">
                {{ selectedRole === 'parent' ? 'Enrollment Code นักเรียน' : 'Enrollment Code สมาชิก' }}
                <span style="color: var(--color-danger)">*</span>
              </label>
              <!-- Inline input + button -->
              <div class="code-row" :class="{ 'code-row-focus': false }">
                <PhLockSimple :size="16" style="color: var(--color-text-tertiary); flex-shrink:0" />
                <input
                  v-model="enrollmentCode"
                  type="text"
                  placeholder="ENR - XXXXXX"
                  @input="enrollmentCode = (enrollmentCode ?? '').toUpperCase()"
                  @keydown.enter="searchCode"
                  class="code-input font-mono tracking-wider uppercase"
                />
                <button @click="searchCode" :disabled="searchLoading || !enrollmentCode.trim()"
                  class="verify-btn">
                  <span v-if="searchLoading" class="w-3.5 h-3.5 border-2 border-current/40 border-t-current rounded-full animate-spin" />
                  <span v-else>ตรวจสอบ</span>
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Error -->
        <div v-if="searchError" class="notif notif-danger mb-3">
          <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
          <div class="notif-content"><p class="notif-desc">{{ searchError }}</p></div>
        </div>

        <!-- Found: student -->
        <div v-if="foundStudent" class="found-chip found-student mb-3">
          <div class="found-avatar" style="background: var(--color-success)">
            <i class="ti ti-school" style="color: #fff; font-size: 18px;" />
          </div>
          <div>
            <p class="found-sub">พบนักเรียน</p>
            <p class="found-name">{{ foundStudent.firstName }} {{ foundStudent.lastName }}</p>
            <p class="found-meta">{{ foundStudent.gradeLevel }} · {{ foundStudent.className }}</p>
          </div>
        </div>

        <!-- Found: member -->
        <div v-if="foundMember" class="found-chip found-member mb-3">
          <div class="found-avatar" style="background: var(--color-primary)">
            <i class="ti ti-user-check" style="color: #fff; font-size: 18px;" />
          </div>
          <div>
            <p class="found-sub">พบบัญชีสมาชิก</p>
            <p class="found-name">{{ foundMember.firstName }} {{ foundMember.lastName }}</p>
            <p class="found-meta">{{ roleLabelTh[foundMember.role] ?? foundMember.role }}</p>
          </div>
        </div>

        <!-- Contact + PDPA (after found) -->
        <template v-if="foundInfo">
          <div class="card mb-3">
            <div class="card-body">
              <div class="flex items-center justify-between mb-1">
                <label class="field-label mb-0">
                  อีเมล หรือ เบอร์มือถือ <span style="color: var(--color-danger)">*</span>
                </label>
                <span v-if="contactType === 'email'" class="contact-pill contact-pill-email">
                  <i class="ti ti-mail" style="font-size: 10px" /> อีเมล
                </span>
                <span v-else-if="contactType === 'phone'" class="contact-pill contact-pill-phone">
                  <i class="ti ti-device-mobile" style="font-size: 10px" /> มือถือ
                </span>
              </div>
              <input v-model="contact" type="text"
                :inputmode="contactType === 'phone' ? 'tel' : 'email'"
                placeholder="example@email.com หรือ 08xxxxxxxx"
                class="field-input mt-1" />
              <p v-if="contactError" class="field-error">{{ contactError }}</p>
            </div>
          </div>

          <!-- Info box -->
          <div class="info-box mb-3">
            <i class="ti ti-info-circle" style="font-size: 15px; flex-shrink: 0; margin-top: 1px;" />
            <p>ระบุอีเมลหรือเบอร์มือถือที่ใช้ได้จริง เพื่อรับรหัส OTP ยืนยันการลงทะเบียน</p>
          </div>

          <!-- PDPA consent -->
          <label class="flex items-start gap-3 cursor-pointer mb-3">
            <div class="relative flex-shrink-0 mt-0.5">
              <input type="checkbox" v-model="pdpaAgreed" class="sr-only" />
              <div class="w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-colors"
                :style="pdpaAgreed
                  ? 'background: var(--color-primary); border-color: var(--color-primary)'
                  : 'background: #fff; border-color: var(--color-border-secondary)'">
                <i v-if="pdpaAgreed" class="ti ti-check" style="font-size: 12px; color: #fff;" />
              </div>
            </div>
            <p class="text-body-sm leading-relaxed" style="color: var(--color-text-primary)">
              ฉันได้อ่านและยอมรับ
              <span style="color: var(--color-primary); font-weight: 500">นโยบายความเป็นส่วนตัว</span>
              และยินยอมให้โรงเรียนเก็บรวบรวมและใช้ข้อมูลของฉันตามที่ระบุไว้
            </p>
          </label>
        </template>

        <!-- Send OTP error -->
        <div v-if="sendOtpError" class="notif notif-danger mb-2">
          <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
          <div class="notif-content"><p class="notif-desc">{{ sendOtpError }}</p></div>
        </div>
      </div>

      <!-- ═══ Step 2: ยืนยัน OTP ════════════════════════════════════════════ -->
      <div v-if="step === 2">
        <h2 class="page-title">ยืนยัน OTP</h2>
        <p class="page-subtitle">
          กรอกรหัส OTP 6 หลัก ที่ส่งไปยัง
          <span style="color: var(--color-primary); font-weight: 500">{{ contact }}</span>
          <span style="color: var(--color-text-tertiary)"> (มีอายุ 15 นาที)</span>
        </p>

        <!-- Demo OTP -->
        <div v-if="demoOtp" class="demo-otp-card mb-5">
          <p class="text-caption mb-1" style="color: var(--color-primary)">Demo OTP</p>
          <p class="demo-otp-digits">{{ demoOtp.split('').join(' ') }}</p>
        </div>

        <!-- 6-digit input -->
        <div class="card mb-5">
          <div class="card-body">
            <label class="text-caption mb-3 block text-center" style="color: var(--color-text-secondary)">
              รหัส OTP (6 หลัก)
            </label>
            <div class="flex justify-center gap-2">
              <input
                v-for="(_, i) in otpDigits" :key="i"
                v-model="otpDigits[i]"
                type="text" inputmode="numeric" maxlength="1"
                class="otp-digit"
                :class="otpDigits[i] ? 'otp-filled' : 'otp-empty'"
                @input="handleOtpInput(i, $event)"
                @keydown="handleOtpKeydown(i, $event)"
              />
            </div>
          </div>
        </div>

        <div v-if="otpError" class="notif notif-danger mb-4">
          <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
          <div class="notif-content"><p class="notif-desc">{{ otpError }}</p></div>
        </div>

        <!-- Resend -->
        <p class="text-center text-[13px]" style="color: var(--color-text-secondary)">
          ไม่ได้รับ OTP?
          <button
            @click="resendCooldown === 0 && (step = 1, otpDigits = ['','','','','',''])"
            :disabled="resendCooldown > 0"
            :style="resendCooldown > 0
              ? 'background:none;border:none;cursor:not-allowed;color:var(--color-text-tertiary);font-size:13px;font-weight:500'
              : 'background:none;border:none;cursor:pointer;color:var(--color-primary);font-weight:500;font-size:13px'">
            <template v-if="resendCooldown > 0">ส่งใหม่ได้ใน {{ resendCooldown }} วินาที</template>
            <template v-else>ส่งใหม่อีกครั้ง</template>
          </button>
        </p>
      </div>

      <!-- ═══ Step 3: ข้อมูลบัญชี ══════════════════════════════════════════ -->
      <div v-if="step === 3">
        <h2 class="page-title">กรอกชื่อและตั้งรหัสผ่าน</h2>
        <p class="page-subtitle">สำหรับเข้าสู่ระบบ</p>

        <!-- Summary chip -->
        <div class="found-chip mb-5" :class="foundStudent ? 'found-student' : 'found-member'">
          <div class="found-avatar"
            :style="foundStudent ? 'background: var(--color-success)' : 'background: var(--color-primary)'">
            <i :class="foundStudent ? 'ti ti-school' : 'ti ti-user-check'" style="color:#fff;font-size:16px" />
          </div>
          <div>
            <p class="found-name">
              <template v-if="foundStudent">{{ foundStudent.firstName }} {{ foundStudent.lastName }}</template>
              <template v-else-if="foundMember">{{ foundMember.firstName }} {{ foundMember.lastName }}</template>
            </p>
            <p class="found-meta">
              <template v-if="foundStudent">{{ foundStudent.gradeLevel }}</template>
              <template v-else-if="foundMember">{{ roleLabelTh[foundMember.role] ?? foundMember.role }}</template>
            </p>
          </div>
        </div>

        <div class="card mb-4">
          <!-- ชื่อ -->
          <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
            <label class="field-label">ชื่อ <span style="color: var(--color-danger)">*</span></label>
            <input v-model="firstName" type="text" placeholder="ชื่อจริง" class="field-input mt-1" />
          </div>
          <!-- นามสกุล -->
          <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
            <label class="field-label">นามสกุล <span style="color: var(--color-danger)">*</span></label>
            <input v-model="lastName" type="text" placeholder="นามสกุล" class="field-input mt-1" />
          </div>
          <!-- รหัสผ่าน -->
          <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
            <label class="field-label">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร) <span style="color: var(--color-danger)">*</span></label>
            <div class="field-input flex items-center gap-2 overflow-hidden mt-1" style="padding:0">
              <input v-model="password" :type="showPw ? 'text' : 'password'" placeholder="รหัสผ่าน"
                class="flex-1 px-[14px] py-[12px] bg-transparent outline-none text-[15px]"
                style="color: var(--color-text-primary); border: none;" />
              <button type="button" @click="showPw = !showPw"
                class="pr-3 flex-shrink-0"
                style="background: none; border: none; cursor: pointer; color: var(--color-text-tertiary);">
                <i :class="showPw ? 'ti ti-eye-off' : 'ti ti-eye'" style="font-size: 18px;" />
              </button>
            </div>
          </div>
          <!-- ยืนยันรหัสผ่าน -->
          <div class="card-body">
            <label class="field-label">ยืนยันรหัสผ่าน <span style="color: var(--color-danger)">*</span></label>
            <input v-model="confirmPw" :type="showPw ? 'text' : 'password'" placeholder="ยืนยันรหัสผ่าน" class="field-input mt-1" />
            <p v-if="pwMismatch" class="field-error mt-1">รหัสผ่านไม่ตรงกัน</p>
          </div>
        </div>

        <div v-if="step4Error" class="notif notif-danger mb-4">
          <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
          <div class="notif-content"><p class="notif-desc">{{ step4Error }}</p></div>
        </div>
      </div>

    </div><!-- /content-area -->

  </div>
  </div><!-- /centered content -->

    <!-- ── Bottom nav (full-width) ──────────────────────────────────────────── -->
    <div class="bottom-nav">
      <button @click="goBack" class="btn-back">ย้อนกลับ</button>
      <button @click="handleNext" :disabled="!canNext"
        class="btn-forward" :class="canNext ? 'btn-forward-active' : 'btn-forward-disabled'">
        <span v-if="isNextLoading" class="flex items-center gap-2 justify-center">
          <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          {{ nextLabel }}
        </span>
        <span v-else>{{ nextLabel }}</span>
      </button>
    </div>

  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 4px 16px 16px;
}

/* ── Page headings ───────────────────────────────────────────────────────── */
.page-title    { font-size: 24px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 4px; }
.page-subtitle { font-size: 14px; color: var(--color-text-secondary); margin-bottom: 20px; line-height: 1.5; }

/* ── Step indicator ──────────────────────────────────────────────────────── */
.step-track {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px 32px 20px;
  gap: 0;
}
.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.step-conn {
  flex: 1;
  height: 2px;
  background: var(--color-border-secondary);
  border: none;
  margin-top: 15px;
  min-width: 32px;
  max-width: 64px;
}
.step-conn-done { background: var(--color-primary); }

.step-dot {
  width: 30px; height: 30px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s, border-color 0.2s;
}
.step-active { background: var(--color-primary); color: #fff; }
.step-done   { background: var(--color-success);  color: #fff; }
.step-idle   {
  background: transparent;
  border: 2px solid var(--color-border-secondary);
  color: var(--color-text-tertiary);
}
.step-num  { font-size: 12px; font-weight: 700; }
.step-lbl    { font-size: 11px; font-weight: 600; color: var(--color-text-tertiary); }
.step-lbl-on { color: var(--color-primary); }

/* ── Form fields ─────────────────────────────────────────────────────────── */
.field-label {
  font-size: 13px; font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 0;
}
.field-label.mb-0 { margin-bottom: 0; }

.field-input {
  width: 100%; padding: 11px 14px; font-size: 15px;
  color: var(--color-text-primary);
  background: var(--color-bg-surface);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-md);
  outline: none; transition: border-color 0.15s;
  box-sizing: border-box;
}
.field-input:focus { border-color: var(--color-primary); }
.field-error { font-size: 11px; color: var(--color-danger); margin-top: 4px; }

/* Inline enrollment code row */
.code-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 6px 0 12px;
  background: var(--color-bg-surface);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-md);
  transition: border-color 0.15s;
  margin-top: 8px;
}
.code-row:focus-within { border-color: var(--color-primary); }
.code-input {
  flex: 1;
  padding: 11px 0;
  background: transparent;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--color-text-primary);
  min-width: 0;
}
.code-input::placeholder { color: var(--color-text-tertiary); }
.verify-btn {
  flex-shrink: 0;
  height: 32px;
  padding: 0 14px;
  border-radius: calc(var(--radius-md) - 2px);
  background: transparent;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary);
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  display: flex; align-items: center; gap: 4px;
  white-space: nowrap;
}
.verify-btn:hover:not(:disabled) { background: var(--color-primary-tint); }
.verify-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Custom dropdown ─────────────────────────────────────────────────────── */
.cdd-wrap { position: relative; margin-top: 8px; }
.cdd-trigger {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 11px 14px; font-size: 15px;
  background: var(--color-bg-surface);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-md);
  cursor: pointer; text-align: left; transition: border-color 0.15s;
}
.cdd-trigger:hover, .cdd-open { border-color: var(--color-primary); }
.cdd-arrow { color: var(--color-text-tertiary); font-size: 16px; transition: transform 0.2s; flex-shrink: 0; }
.cdd-arrow-up { transform: rotate(180deg); }
.cdd-list {
  /* position/top/left/width come from inline :style (position:fixed via JS) */
  background: var(--color-bg-surface);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
.cdd-item {
  width: 100%; display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; background: transparent; border: none;
  cursor: pointer; text-align: left; transition: background 0.1s;
}
.cdd-item:hover { background: var(--color-bg-secondary); }
.cdd-item-active { background: var(--color-primary-tint); }
.cdd-name { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
.cdd-hint { font-size: 12px; color: var(--color-text-secondary); margin-top: 1px; }
.cdd-divider { height: 0.5px; background: var(--color-border-tertiary); margin: 0 14px; }

/* ── Found chips ─────────────────────────────────────────────────────────── */
.found-chip {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: var(--radius-lg);
}
.found-student { background: var(--color-success-bg); }
.found-member  { background: var(--color-primary-tint); }
.found-avatar  {
  width: 40px; height: 40px; border-radius: 100px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.found-sub  { font-size: 12px; color: var(--color-text-secondary); }
.found-name { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
.found-meta { font-size: 12px; color: var(--color-text-secondary); margin-top: 1px; }

/* ── Info box ────────────────────────────────────────────────────────────── */
.info-box {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 12px 14px; border-radius: var(--radius-md);
  background: var(--color-warning-bg); color: var(--color-warning);
  font-size: 13px; line-height: 1.55;
}

/* ── Contact pills ───────────────────────────────────────────────────────── */
.contact-pill { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 100px; }
.contact-pill-email { background: var(--color-primary-tint); color: var(--color-primary); }
.contact-pill-phone { background: var(--color-success-bg);  color: var(--color-success); }

/* ── Demo OTP card ───────────────────────────────────────────────────────── */
.demo-otp-card {
  padding: 16px; border-radius: var(--radius-lg);
  background: var(--color-primary-tint);
  border: 1.5px solid var(--color-primary);
}
.demo-otp-digits {
  font-size: 32px; font-weight: 800; font-family: monospace;
  letter-spacing: 0.35em; color: var(--color-primary);
}

/* ── OTP digit boxes ─────────────────────────────────────────────────────── */
.otp-digit {
  width: 44px; height: 52px; border-radius: 10px;
  text-align: center; font-size: 22px; font-weight: 700; font-family: monospace;
  outline: none; transition: border-color 0.15s, background 0.15s;
}
.otp-empty  { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 2px solid var(--color-border-tertiary); }
.otp-filled { background: var(--color-primary-tint); color: var(--color-primary); border: 2px solid var(--color-primary); }
.otp-digit:focus { border-color: var(--color-primary) !important; background: var(--color-primary-tint) !important; }

/* ── Bottom nav ──────────────────────────────────────────────────────────── */
.bottom-nav {
  flex-shrink: 0;
  display: flex; gap: 12px;
  padding: 12px 16px 28px;
  border-top: 0.5px solid var(--color-border-tertiary);
  background: var(--color-bg-surface);
}
.btn-back {
  flex: 1; height: 50px; border-radius: var(--radius-md);
  font-size: 15px; font-weight: 600; font-family: inherit;
  background: transparent;
  border: 1.5px solid var(--color-border-secondary);
  color: var(--color-text-secondary);
  cursor: pointer; transition: opacity 0.15s;
}
.btn-back:hover { opacity: 0.75; }
.btn-forward {
  flex: 1.6; height: 50px; border-radius: var(--radius-md);
  font-size: 15px; font-weight: 600; font-family: inherit;
  border: none; cursor: pointer;
  transition: opacity 0.15s;
}
.btn-forward-active   { background: var(--color-primary); color: #fff; }
.btn-forward-disabled { background: var(--color-border-tertiary); color: var(--color-text-tertiary); cursor: not-allowed; }
</style>
