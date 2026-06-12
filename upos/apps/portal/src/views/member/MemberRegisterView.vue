<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

const router = useRouter()

const step = ref(1)

// Step 1
const enrollmentCode  = ref('')
const verifyLoading   = ref(false)
const step1Error      = ref('')
const foundMember     = ref<{ uid: string; firstName: string; lastName: string; role: string } | null>(null)

// Step 2
const password        = ref('')
const confirmPw       = ref('')
const showPw          = ref(false)
const registerLoading = ref(false)
const step2Error      = ref('')

const pwMismatch  = computed(() => confirmPw.value && password.value !== confirmPw.value)
const canRegister = computed(() => password.value.length >= 8 && !pwMismatch.value)

const roleLabel: Record<string, string> = {
  admin:      'Admin',
  supervisor: 'Supervisor',
  cashier:    'แคชเชียร์',
  teacher:    'ครู',
  staff:      'พนักงาน',
}

const roleToLoginPath: Record<string, string> = {
  admin:      '/login?role=admin',
  supervisor: '/login?role=supervisor',
  cashier:    '/login?role=cashier',
}

function goBack() {
  if (step.value > 1) { step.value--; return }
  router.back()
}

async function verifyCode() {
  step1Error.value = ''; verifyLoading.value = true
  try {
    const res = await api.post('/auth/verify-enrollment', {
      code: enrollmentCode.value.trim().toUpperCase(),
    })
    if (res.data.type !== 'member') {
      step1Error.value = 'รหัสนี้ไม่ใช่รหัสสมาชิก กรุณาตรวจสอบอีกครั้ง'
      return
    }
    foundMember.value = res.data.member
    step.value = 2
  } catch (e: any) {
    step1Error.value = e?.response?.data?.error?.message ?? 'ไม่พบรหัสลงทะเบียน'
  } finally { verifyLoading.value = false }
}

async function handleRegister() {
  step2Error.value = ''; registerLoading.value = true
  try {
    await api.post('/auth/member-register', {
      enrollmentCode: enrollmentCode.value.trim().toUpperCase(),
      password:       password.value,
    })
    const loginPath = roleToLoginPath[foundMember.value?.role ?? ''] ?? '/login?role=admin'
    router.push(loginPath + '&registered=1')
  } catch (e: any) {
    step2Error.value = e?.response?.data?.error?.message ?? 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่'
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
      <span class="navbar-title">ลงทะเบียนสมาชิก</span>
      <div class="w-10" />
    </div>

    <!-- Step indicators -->
    <div class="flex items-center justify-center gap-2 py-5 px-4">
      <template v-for="(label, i) in ['Enrollment Code', 'ตั้งรหัสผ่าน']" :key="i">
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
        <div v-if="i < 1" class="h-px w-6" style="background: var(--color-border-tertiary)" />
      </template>
    </div>

    <div class="flex-1 px-4 pb-8">

      <!-- ═══ Step 1: Enrollment Code ═══════════════════════════════════════ -->
      <div v-if="step === 1">
        <p class="text-heading-lg mb-1" style="color: var(--color-text-primary)">ลงทะเบียนสมาชิก</p>
        <p class="text-body-sm mb-5" style="color: var(--color-text-secondary)">
          กรอก Enrollment Code ที่ได้รับจากผู้ดูแลระบบ
        </p>

        <div class="card mb-4">
          <div class="card-body">
            <label class="text-caption mb-1 block" style="color: var(--color-text-secondary)">Enrollment Code</label>
            <input
              v-model="enrollmentCode"
              type="text"
              placeholder="ENR-XXXXXX"
              @input="enrollmentCode = enrollmentCode.toUpperCase()"
              @keydown.enter="enrollmentCode.trim() && verifyCode()"
              class="w-full text-body-md bg-transparent outline-none tracking-wider font-mono uppercase"
              style="border: none; color: var(--color-text-primary);"
            />
          </div>
        </div>

        <div v-if="step1Error" class="notif notif-danger mb-4">
          <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
          <div class="notif-content"><p class="notif-desc">{{ step1Error }}</p></div>
        </div>

        <button @click="verifyCode" :disabled="verifyLoading || !enrollmentCode.trim()"
          class="btn-lg btn-primary w-full">
          <span v-if="verifyLoading" class="flex items-center justify-center gap-2">
            <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            กำลังตรวจสอบ...
          </span>
          <span v-else>ยืนยัน Code</span>
        </button>
      </div>

      <!-- ═══ Step 2: Set Password ══════════════════════════════════════════ -->
      <div v-if="step === 2">
        <p class="text-heading-lg mb-1" style="color: var(--color-text-primary)">ตั้งรหัสผ่าน</p>
        <p class="text-body-sm mb-5" style="color: var(--color-text-secondary)">กำหนดรหัสผ่านสำหรับเข้าสู่ระบบ</p>

        <!-- Member info card -->
        <div v-if="foundMember" class="rounded-[var(--radius-lg)] p-4 mb-5 flex items-center gap-3"
          style="background: var(--color-success-bg)">
          <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style="background: var(--color-success)">
            <i class="ti ti-user-check" style="color: #fff; font-size: 18px;" />
          </div>
          <div>
            <p class="text-body-sm" style="color: var(--color-text-secondary)">พบบัญชีสมาชิก</p>
            <p class="text-heading-md" style="color: var(--color-text-primary)">
              {{ foundMember.firstName }} {{ foundMember.lastName }}
            </p>
            <p class="text-caption" style="color: var(--color-text-secondary)">
              {{ roleLabel[foundMember.role] ?? foundMember.role }}
            </p>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-body" style="border-bottom: 0.5px solid var(--color-border-tertiary); padding-bottom: 14px;">
            <label class="text-caption block mb-1" style="color: var(--color-text-secondary)">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</label>
            <div class="flex items-center gap-2">
              <input v-model="password" :type="showPw ? 'text' : 'password'" placeholder="รหัสผ่าน"
                class="flex-1 text-body-md bg-transparent outline-none" style="border: none; color: var(--color-text-primary);" />
              <button type="button" @click="showPw = !showPw"
                style="background: none; border: none; cursor: pointer; color: var(--color-text-tertiary);">
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

        <div v-if="step2Error" class="notif notif-danger mb-4">
          <div class="notif-icon"><i class="ti ti-alert-triangle" /></div>
          <div class="notif-content"><p class="notif-desc">{{ step2Error }}</p></div>
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
