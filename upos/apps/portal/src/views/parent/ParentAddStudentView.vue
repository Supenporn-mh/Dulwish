<template>
  <div class="px-4 pt-6 pb-8">

    <!-- Step indicators -->
    <div class="flex items-center gap-3 mb-6">
      <div class="flex items-center gap-2">
        <div
          class="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium transition-colors"
          :style="step >= 1
            ? 'background: var(--color-primary); color: #fff'
            : 'background: var(--color-border-tertiary); color: var(--color-text-tertiary)'"
        >
          <PhCheck v-if="step > 1" :size="13" weight="bold" />
          <span v-else>1</span>
        </div>
        <span
          class="text-body-sm font-medium"
          :style="step >= 1 ? 'color: var(--color-primary)' : 'color: var(--color-text-tertiary)'"
        >{{ locale.t('ยืนยันรหัส', 'Verify Code') }}</span>
      </div>
      <div class="h-px w-8" style="background: var(--color-border-tertiary)" />
      <div class="flex items-center gap-2">
        <div
          class="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium transition-colors"
          :style="step >= 2
            ? 'background: var(--color-primary); color: #fff'
            : 'background: var(--color-border-tertiary); color: var(--color-text-tertiary)'"
        >2</div>
        <span
          class="text-body-sm font-medium"
          :style="step >= 2 ? 'color: var(--color-primary)' : 'color: var(--color-text-tertiary)'"
        >{{ locale.t('ยืนยันข้อมูล', 'Confirm Details') }}</span>
      </div>
    </div>

    <!-- ── Step 1: Enter enrollment code ── -->
    <div v-if="step === 1">
      <p class="text-heading-lg mb-1" style="color: var(--color-text-primary)">{{ locale.t('กรอกรหัสลงทะเบียน', 'Enter Enrollment Code') }}</p>
      <p class="text-body-sm mb-6" style="color: var(--color-text-secondary)">{{ locale.t('รหัสที่ได้รับจากโรงเรียนสำหรับนักเรียนที่ต้องการเพิ่ม', 'The code received from the school for the student you want to add') }}</p>

      <div class="card mb-4">
        <div class="card-body">
          <label class="text-caption block mb-2" style="color: var(--color-text-secondary)">{{ locale.t('รหัสลงทะเบียน', 'Enrollment Code') }}</label>
          <input
            v-model="enrollmentCode"
            type="text"
            placeholder="ENR-XXXXX"
            :disabled="verifying"
            @input="enrollmentCode = enrollmentCode.toUpperCase()"
            @keydown.enter="handleVerify"
            class="w-full text-body-md bg-transparent outline-none tracking-wider font-mono uppercase"
            style="border: none; color: var(--color-text-primary);"
          />
        </div>
      </div>

      <!-- Error -->
      <div v-if="verifyError" class="notif notif-danger mb-4">
        <div class="notif-icon"><PhWarning :size="16" /></div>
        <div class="notif-content">
          <p class="notif-title">{{ locale.t('ยืนยันไม่สำเร็จ', 'Verification Failed') }}</p>
          <p class="notif-desc">{{ verifyError }}</p>
        </div>
      </div>

      <button @click="handleVerify" :disabled="verifying || !enrollmentCode.trim()" class="btn-lg btn-primary w-full">
        <span v-if="verifying" class="flex items-center gap-2">
          <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          {{ locale.t('กำลังตรวจสอบ...', 'Verifying...') }}
        </span>
        <span v-else>{{ locale.t('ยืนยันรหัส', 'Verify Code') }}</span>
      </button>
    </div>

    <!-- ── Step 2: Confirm student ── -->
    <div v-if="step === 2">
      <!-- Student info card -->
      <div class="rounded-[var(--radius-lg)] p-4 mb-6 flex items-center gap-3" style="background: var(--color-primary-tint)">
        <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background: var(--color-primary)">
          <PhGraduationCap :size="20" color="#fff" weight="fill" />
        </div>
        <div>
          <p class="text-body-sm" style="color: var(--color-text-secondary)">{{ locale.t('นักเรียน', 'Student') }}</p>
          <p class="text-heading-md" style="color: var(--color-text-primary)">{{ student?.firstName }} {{ student?.lastName }}</p>
          <p class="text-caption" style="color: var(--color-text-secondary)">{{ student?.gradeLevel }}</p>
        </div>
      </div>

      <p class="text-body-sm mb-5" style="color: var(--color-text-secondary)">
        {{ locale.t('ต้องการเพิ่ม', 'Would you like to add') }} <strong>{{ student?.firstName }} {{ student?.lastName }}</strong> {{ locale.t('เป็นนักเรียนของคุณใช่ไหม?', 'as your student?') }}
      </p>

      <!-- Error -->
      <div v-if="addError" class="notif notif-danger mb-4">
        <div class="notif-icon"><PhWarning :size="16" /></div>
        <div class="notif-content">
          <p class="notif-title">{{ locale.t('เพิ่มนักเรียนไม่สำเร็จ', 'Failed to Add Student') }}</p>
          <p class="notif-desc">{{ addError }}</p>
        </div>
      </div>

      <button @click="handleAdd" :disabled="adding" class="btn-lg btn-primary w-full mb-3">
        <span v-if="adding" class="flex items-center gap-2">
          <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          {{ locale.t('กำลังเพิ่ม...', 'Adding...') }}
        </span>
        <span v-else>
          <PhUserPlus :size="18" weight="bold" class="inline-block mr-1" />
          {{ locale.t('ยืนยันเพิ่มนักเรียน', 'Confirm Add Student') }}
        </span>
      </button>

      <button @click="step = 1; verifyError = ''" class="btn-lg btn-ghost w-full" :disabled="adding">
        {{ locale.t('แก้ไขรหัส', 'Edit Code') }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLocaleStore } from '@/stores/locale'
import api from '@/api/axios'
import { PhCheck, PhWarning, PhGraduationCap, PhUserPlus } from '@phosphor-icons/vue'

const router = useRouter()
const locale = useLocaleStore()

const step           = ref(1)
const enrollmentCode = ref('')
const verifying      = ref(false)
const verifyError    = ref('')
const student        = ref<{ firstName: string; lastName: string; gradeLevel: string | null } | null>(null)
const adding         = ref(false)
const addError       = ref('')

async function handleVerify() {
  if (!enrollmentCode.value.trim()) return
  verifying.value = true
  verifyError.value = ''
  try {
    const { data } = await api.post('/auth/verify-enrollment', { code: enrollmentCode.value.trim() })
    student.value = data.student
    step.value = 2
  } catch (e: any) {
    verifyError.value = e?.response?.data?.error?.message ?? locale.t('ไม่สามารถตรวจสอบรหัสได้', 'Unable to verify code')
  } finally {
    verifying.value = false
  }
}

async function handleAdd() {
  adding.value = true
  addError.value = ''
  try {
    await api.post('/users/me/add-student', { enrollmentCode: enrollmentCode.value.trim() })
    router.push('/parent/dashboard')
  } catch (e: any) {
    addError.value = e?.response?.data?.error?.message ?? locale.t('เกิดข้อผิดพลาด กรุณาลองใหม่', 'An error occurred, please try again')
  } finally {
    adding.value = false
  }
}
</script>
