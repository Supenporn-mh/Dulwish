<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

const router = useRouter()

// ── State ─────────────────────────────────────────────────────────────────────
const step = ref(1)

// Step 1
const studentId      = ref('')
const contact        = ref('')     // email or phone
const lookupLoading  = ref(false)
const sendLoading    = ref(false)
const foundStudent   = ref<any>(null)
const step1Error     = ref('')
const otpDemo        = ref('')     // show OTP in demo mode

// Step 2
const otp            = ref('')
const step2Error     = ref('')

// Step 3
const firstName      = ref('')
const lastName       = ref('')
const password       = ref('')
const confirmPw      = ref('')
const showPw         = ref(false)
const registerLoading = ref(false)
const step3Error     = ref('')

// ── Helpers ───────────────────────────────────────────────────────────────────
const pwMismatch = computed(() => confirmPw.value && password.value !== confirmPw.value)
const canRegister = computed(() =>
  firstName.value.trim() && lastName.value.trim() &&
  password.value.length >= 8 && !pwMismatch.value
)

function goBack() {
  if (step.value > 1) { step.value--; return }
  router.back()
}

// Step 1a: lookup student by ID
async function lookupStudent() {
  step1Error.value = ''; lookupLoading.value = true
  try {
    const res = await api.post('/auth/parent/lookup-student', {
      studentId: studentId.value.trim().toUpperCase(),
    })
    foundStudent.value = res.data.student
  } catch (e: any) {
    step1Error.value = e?.response?.data?.error?.message ?? 'ไม่พบรหัสนักเรียนในระบบ'
    foundStudent.value = null
  } finally { lookupLoading.value = false }
}

// Step 1b: send OTP to contact
async function sendOtp() {
  step1Error.value = ''; sendLoading.value = true
  try {
    const res = await api.post('/auth/parent/send-otp', {
      studentId: studentId.value.trim().toUpperCase(),
      contact:   contact.value.trim().toLowerCase(),
    })
    otpDemo.value = res.data.otp ?? ''
    step.value = 2
  } catch (e: any) {
    step1Error.value = e?.response?.data?.error?.message ?? 'ไม่สามารถส่ง OTP ได้'
  } finally { sendLoading.value = false }
}

// Step 2: verify OTP → move to step 3
function verifyOtp() {
  if (otp.value.length < 6) { step2Error.value = 'กรุณากรอก OTP 6 หลัก'; return }
  step2Error.value = ''
  step.value = 3
}

// Step 3: register
async function handleRegister() {
  step3Error.value = ''; registerLoading.value = true
  try {
    await api.post('/auth/parent/register', {
      studentId: studentId.value.trim().toUpperCase(),
      contact:   contact.value.trim().toLowerCase(),
      otp:       otp.value.trim(),
      firstName: firstName.value.trim(),
      lastName:  lastName.value.trim(),
      password:  password.value,
    })
    router.push('/login?role=parent&registered=1')
  } catch (e: any) {
    step3Error.value = e?.response?.data?.error?.message ?? 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่'
  } finally { registerLoading.value = false }
}
</script>

<template>
  <div class="min-h-screen flex flex-col max-w-[430px] mx-auto" style="background: var(--color-bg-page)">

    <!-- Navbar -->
    <div class="navbar">
      <button @click="goBack" class="flex items-center gap-1 text-[14px] font-medium"
        style="color: var(--color-primary); background: none; border: none; cursor: pointer;">
        <i class="ti ti-arrow-left" style="font-size: 18px;" />
        กลับ
      </button>
      <span class="navbar-title">ลงทะเบียนผู้ปกครอง</span>
      <div class="w-10" />
    </div>

    <!-- Step indicators -->
    <div class="flex items-center justify-center gap-2 py-5 px-4">
      <template v-for="(label, i) in ['Student ID', 'ยืนยัน OTP', 'ข้อมูล']" :key="i">
        <div class="flex items-center gap-1.5">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium transition-colors"
            :style="step > i+1 ? 'background: var(--color-success); color: #fff'
                  : step === i+1 ? 'background: var(--color-primary); color: #fff'
                  : 'background: var(--color-border-tertiary); color: var(--color-text-tertiary)'">
            <i v-if="step > i+1" class="ti ti-check" style="font-size: 13px;" />
            <span v-else>{{ i+1 }}</span>
          </div>
          <span class="text-[12px] font-medium hidden sm:inline"
            :style="step >= i+1 ? 'color: var(--color-primary)' : 'color: var(--color-text-tertiary)'">
            {{ label }}
          </span>
        </div>
        <div v-if="i < 2" class="h-px w-6" style="background: var(--color-border-tertiary)" />
      </template>
    </div>

    <div class="flex-1 px-4 pb-8">

      <!-- ═══ Step 1: Student ID + Contact ══════════════════════════════════ -->
      <div v-if="step === 1">
        <p class="text-heading-lg mb-1" style="color: var(--color-text-primary)">ลงทะเบียนผู้ปกครอง</p>
        <p class="text-body-sm mb-5" style="color: var(--color-text-secondary)">
          กรอกรหัสนักเรียน แล้วระบุอีเมลหรือเบอร์มือถือ เพื่อรับรหัส OTP
        </p>

        <!-- Demo hint -->
        <div class="rounded-[var(--radius-lg)] px-4 py-3 mb-5" style="background: var(--color-primary-tint)">
          <p class="text-label" style="color: var(--color-primary)">Demo</p>
          <p class="text-body-sm font-mono mt-1" style="color: var(--color-primary-dark)">
            STD-K1-0001 หรือ STD-P3-0015
          </p>
        </div>

        <!-- Student ID input + lookup -->
        <div class="card mb-4">
          <div class="card-body flex items-center gap-3">
            <div class="flex-1">
              <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">รหัสนักเรียน</label>
              <input v-model="studentId" type="text" placeholder="STD-XXXX-XXXX"
                @input="studentId = studentId.toUpperCase(); foundStudent = null"
                @keydown.enter="lookupStudent"
                class="w-full text-body-md bg-transparent outline-none tracking-wider font-mono uppercase"
                style="border: none; color: var(--color-text-primary);" />
            </div>
            <button @click="lookupStudent" :disabled="lookupLoading || !studentId.trim()"
              class="btn btn-md btn-secondary flex-shrink-0">
              <span v-if="lookupLoading" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span v-else>ค้นหา</span>
            </button>
          </div>
        </div>

        <!-- Student result card -->
        <div v-if="foundStudent" class="rounded-[var(--radius-lg)] p-4 mb-5 flex items-center gap-3" style="background: var(--color-success-bg)">
          <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background: var(--color-success)">
            <i class="ti ti-school" style="color: #fff; font-size: 18px;" />
          </div>
          <div>
            <p class="text-body-sm" style="color: var(--color-text-secondary)">พบนักเรียน</p>
            <p class="text-heading-md" style="color: var(--color-text-primary)">{{ foundStudent.firstName }} {{ foundStudent.lastName }}</p>
            <p class="text-caption" style="color: var(--color-text-secondary)">{{ foundStudent.grade }} · {{ foundStudent.className }}</p>
          </div>
        </div>

        <!-- Contact input (shown after student found) -->
        <div v-if="foundStudent" class="card mb-4">
          <div class="card-body">
            <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">อีเมล หรือ เบอร์มือถือ</label>
            <input v-model="contact" type="text" inputmode="email" placeholder="example@email.com หรือ 08xxxxxxxx"
              class="w-full text-body-md bg-transparent outline-none"
              style="border: none; color: var(--color-text-primary);" />
          </div>
        </div>

        <div v-if="step1Error" class="notif notif-danger mb-4">
          <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
          <div class="notif-content"><p class="notif-desc">{{ step1Error }}</p></div>
        </div>

        <button v-if="foundStudent" @click="sendOtp" :disabled="sendLoading || !contact.trim()"
          class="btn-lg btn-primary w-full">
          <span v-if="sendLoading" class="flex items-center justify-center gap-2">
            <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            กำลังส่ง OTP...
          </span>
          <span v-else>ส่ง OTP</span>
        </button>
      </div>

      <!-- ═══ Step 2: OTP Verification ══════════════════════════════════════ -->
      <div v-if="step === 2">
        <p class="text-heading-lg mb-1" style="color: var(--color-text-primary)">ยืนยัน OTP</p>
        <p class="text-body-sm mb-5" style="color: var(--color-text-secondary)">
          กรอกรหัส OTP 6 หลัก ที่ส่งไปยัง {{ contact }} (มีอายุ 14 วัน)
        </p>

        <!-- Demo OTP display -->
        <div v-if="otpDemo" class="rounded-[var(--radius-lg)] px-4 py-3 mb-5" style="background: var(--color-primary-tint)">
          <p class="text-label" style="color: var(--color-primary)">Demo OTP</p>
          <p class="text-[28px] font-medium font-mono tracking-[0.3em] mt-1" style="color: var(--color-primary-dark)">{{ otpDemo }}</p>
        </div>

        <div class="card mb-4">
          <div class="card-body">
            <label class="text-caption mb-2 block" style="color: var(--color-text-secondary)">รหัส OTP (6 หลัก)</label>
            <input v-model="otp" type="text" inputmode="numeric" maxlength="6" placeholder="000000"
              class="w-full text-[28px] font-medium font-mono tracking-[0.3em] bg-transparent outline-none text-center"
              style="border: none; color: var(--color-text-primary);" />
          </div>
        </div>

        <div v-if="step2Error" class="notif notif-danger mb-4">
          <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
          <div class="notif-content"><p class="notif-desc">{{ step2Error }}</p></div>
        </div>

        <button @click="verifyOtp" :disabled="otp.length < 6" class="btn-lg btn-primary w-full">
          ยืนยัน OTP
        </button>
      </div>

      <!-- ═══ Step 3: Personal Info + Password ══════════════════════════════ -->
      <div v-if="step === 3">
        <p class="text-heading-lg mb-1" style="color: var(--color-text-primary)">ข้อมูลผู้ปกครอง</p>
        <p class="text-body-sm mb-5" style="color: var(--color-text-secondary)">กรอกชื่อและตั้งรหัสผ่านสำหรับเข้าสู่ระบบ</p>

        <!-- Student reminder -->
        <div class="rounded-[var(--radius-lg)] p-3 mb-5 flex items-center gap-3" style="background: var(--color-primary-tint)">
          <i class="ti ti-school" style="color: var(--color-primary); font-size: 18px;" />
          <p class="text-body-sm" style="color: var(--color-primary-dark)">
            {{ foundStudent?.firstName }} {{ foundStudent?.lastName }} · {{ foundStudent?.grade }}
          </p>
        </div>

        <div class="card mb-4">
          <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
            <label class="text-caption block mb-1" style="color: var(--color-text-secondary)">ชื่อ</label>
            <input v-model="firstName" type="text" placeholder="ชื่อจริง"
              class="w-full text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
          </div>
          <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
            <label class="text-caption block mb-1" style="color: var(--color-text-secondary)">นามสกุล</label>
            <input v-model="lastName" type="text" placeholder="นามสกุล"
              class="w-full text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
          </div>
          <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
            <label class="text-caption block mb-1" style="color: var(--color-text-secondary)">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</label>
            <div class="flex items-center gap-2">
              <input v-model="password" :type="showPw ? 'text' : 'password'" placeholder="รหัสผ่าน"
                class="flex-1 text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
              <button type="button" @click="showPw = !showPw" style="background: none; border: none; cursor: pointer; color: var(--color-text-tertiary);">
                <i :class="showPw ? 'ti ti-eye-off' : 'ti ti-eye'" style="font-size: 18px;" />
              </button>
            </div>
          </div>
          <div class="card-body">
            <label class="text-caption block mb-1" style="color: var(--color-text-secondary)">ยืนยันรหัสผ่าน</label>
            <input v-model="confirmPw" :type="showPw ? 'text' : 'password'" placeholder="ยืนยันรหัสผ่าน"
              class="w-full text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
          </div>
        </div>

        <p v-if="pwMismatch" class="text-caption mb-3" style="color: var(--color-danger)">รหัสผ่านไม่ตรงกัน</p>

        <div v-if="step3Error" class="notif notif-danger mb-4">
          <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
          <div class="notif-content"><p class="notif-desc">{{ step3Error }}</p></div>
        </div>

        <button @click="handleRegister" :disabled="registerLoading || !canRegister"
          class="btn-lg btn-primary w-full">
          <span v-if="registerLoading" class="flex items-center justify-center gap-2">
            <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            กำลังลงทะเบียน...
          </span>
          <span v-else>ลงทะเบียน</span>
        </button>
      </div>

    </div>
  </div>
</template>
