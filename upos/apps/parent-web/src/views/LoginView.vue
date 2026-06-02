<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Header brand area -->
    <div class="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
      <!-- Logo -->
      <div class="mb-8 flex flex-col items-center">
        <div
          class="w-20 h-20 rounded-3xl bg-primary-500 flex items-center justify-center mb-4 shadow-lg"
        >
          <span class="text-white text-4xl font-bold">U</span>
        </div>
        <h1 class="text-3xl font-bold text-primary-500 tracking-tight">UPOS Dulwich</h1>
        <p class="text-gray-500 mt-1 text-base">ระบบโรงอาหาร Dulwich College</p>
      </div>

      <!-- Login form card -->
      <div class="w-full max-w-sm">
        <h2 class="text-xl font-semibold text-gray-800 mb-6 text-center">เข้าสู่ระบบผู้ปกครอง</h2>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">อีเมล</label>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              placeholder="กรอกอีเมลของคุณ"
              class="input-field"
              :disabled="loading"
              required
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">รหัสผ่าน</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="กรอกรหัสผ่าน"
                class="input-field pr-12"
                :disabled="loading"
                required
              />
              <button
                type="button"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl"
                @click="showPassword = !showPassword"
                tabindex="-1"
              >
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <!-- Error message -->
          <div
            v-if="errorMsg"
            class="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm"
          >
            {{ errorMsg }}
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn-primary mt-2"
            :disabled="loading || !email || !password"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              กำลังเข้าสู่ระบบ...
            </span>
            <span v-else>เข้าสู่ระบบ</span>
          </button>
        </form>
      </div>
    </div>

    <!-- Footer -->
    <div class="pb-8 text-center">
      <p class="text-xs text-gray-400">UPOS v1.0 · Dulwich College Bangkok</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const showPassword = ref(false)

async function handleLogin() {
  if (!email.value || !password.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    await auth.login(email.value, password.value)

    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch (e: any) {
    const status = e?.response?.status
    if (status === 401) {
      errorMsg.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
    } else if (status === 429) {
      errorMsg.value = 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่'
    } else if (!navigator.onLine) {
      errorMsg.value = 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต'
    } else {
      errorMsg.value = e?.response?.data?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    }
  } finally {
    loading.value = false
  }
}
</script>
