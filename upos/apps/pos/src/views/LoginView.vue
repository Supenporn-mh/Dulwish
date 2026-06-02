<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
    return
  }
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/pos')
  } catch (e: any) {
    error.value = e.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูล'
  } finally {
    loading.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') handleLogin()
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-8">
    <!-- Background decoration -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-dulwich/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-dulwich/10 rounded-full blur-3xl"></div>
    </div>

    <div class="relative w-full max-w-md">
      <!-- Logo / Title -->
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-dulwich mb-6 shadow-lg shadow-dulwich/30">
          <svg class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white tracking-tight">UPOS POS Terminal</h1>
        <p class="text-slate-400 mt-2 text-sm">Dulwich School Canteen System</p>
      </div>

      <!-- Login Card -->
      <div class="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl">
        <!-- Role badge (shown after login attempt shows role) -->
        <div v-if="auth.isLoggedIn" class="mb-6 flex justify-center">
          <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dulwich/20 text-dulwich-300 text-sm font-semibold border border-dulwich/30">
            <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            {{ auth.roleBadge }}
          </span>
        </div>

        <div class="space-y-5">
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">อีเมล</label>
            <input
              v-model="email"
              type="email"
              autocomplete="username"
              placeholder="cashier@dulwich.ac.th"
              class="w-full h-14 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg placeholder-slate-500 focus:outline-none focus:border-dulwich focus:ring-2 focus:ring-dulwich/30 transition-all"
              @keydown="handleKeydown"
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">รหัสผ่าน</label>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full h-14 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg placeholder-slate-500 focus:outline-none focus:border-dulwich focus:ring-2 focus:ring-dulwich/30 transition-all"
              @keydown="handleKeydown"
            />
          </div>

          <!-- Error -->
          <div v-if="error" class="flex items-center gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-400 text-sm">
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
            </svg>
            {{ error }}
          </div>

          <!-- Login Button -->
          <button
            @click="handleLogin"
            :disabled="loading"
            class="w-full h-14 rounded-xl bg-dulwich hover:bg-dulwich-600 active:bg-dulwich-700 text-white text-lg font-bold transition-all shadow-lg shadow-dulwich/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span>{{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}</span>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-slate-600 text-xs mt-6">
        UPOS v1.0.0 &bull; Dulwich School &bull; {{ new Date().getFullYear() }}
      </p>
    </div>
  </div>
</template>
