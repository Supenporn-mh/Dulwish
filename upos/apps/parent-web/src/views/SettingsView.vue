<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white safe-top border-b border-gray-100">
      <div class="page-header">
        <button class="back-btn" @click="$router.back()">
          <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-lg font-bold text-gray-800">ตั้งค่า</h1>
      </div>
    </header>

    <!-- Body -->
    <main class="flex-1 overflow-y-auto scroll-smooth-ios px-4 py-5 space-y-5">
      <!-- Profile card -->
      <div class="card">
        <div class="flex items-center gap-4">
          <div
            class="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
          >
            {{ userInitial }}
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-bold text-gray-800 truncate">{{ auth.user?.name ?? '-' }}</h2>
            <p class="text-sm text-gray-500 truncate">{{ auth.user?.email ?? '-' }}</p>
            <p v-if="auth.user?.phone" class="text-sm text-gray-500">{{ auth.user.phone }}</p>
          </div>
        </div>
      </div>

      <!-- Children section -->
      <div v-if="auth.children.length > 0" class="card space-y-3">
        <h3 class="font-semibold text-gray-700">บุตรหลาน</h3>

        <div
          v-for="child in auth.children"
          :key="child._id"
          class="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
        >
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-primary-500 font-bold">
            {{ child.name.charAt(0) }}
          </div>
          <div class="flex-1">
            <p class="font-medium text-gray-800 text-sm">{{ child.name }}</p>
            <p class="text-xs text-gray-500">{{ child.grade }} · ID: {{ child.studentId }}</p>
          </div>
          <div
            v-if="auth.selectedChildId === child._id"
            class="text-xs bg-primary-100 text-primary-600 font-semibold px-2.5 py-1 rounded-full"
          >
            เลือกอยู่
          </div>
          <button
            v-else
            class="text-xs text-primary-500 font-medium px-2.5 py-1 rounded-full border border-primary-200 active:bg-primary-50"
            @click="auth.selectChild(child._id)"
          >
            เลือก
          </button>
        </div>
      </div>

      <!-- Language section -->
      <div class="card space-y-4">
        <h3 class="font-semibold text-gray-700">ภาษา / Language</h3>

        <div class="flex gap-3">
          <button
            class="flex-1 py-3.5 rounded-2xl border-2 font-semibold text-base transition-colors flex flex-col items-center gap-1"
            :class="
              lang === 'th'
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-gray-200 bg-white text-gray-600 active:bg-gray-50'
            "
            @click="lang = 'th'"
          >
            <span class="text-2xl">🇹🇭</span>
            <span class="text-sm">ภาษาไทย</span>
          </button>

          <button
            class="flex-1 py-3.5 rounded-2xl border-2 font-semibold text-base transition-colors flex flex-col items-center gap-1"
            :class="
              lang === 'en'
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-gray-200 bg-white text-gray-600 active:bg-gray-50'
            "
            @click="lang = 'en'"
          >
            <span class="text-2xl">🇬🇧</span>
            <span class="text-sm">English</span>
          </button>
        </div>

        <p class="text-xs text-gray-400 text-center">
          {{ lang === 'th' ? 'ตัวเลือกภาษาอยู่ระหว่างพัฒนา' : 'Full language support coming soon' }}
        </p>
      </div>

      <!-- App info -->
      <div class="card space-y-3">
        <h3 class="font-semibold text-gray-700">เกี่ยวกับแอป</h3>

        <div class="space-y-2 text-sm text-gray-600">
          <div class="flex justify-between">
            <span>เวอร์ชัน</span>
            <span class="font-medium text-gray-800">1.0.0</span>
          </div>
          <div class="flex justify-between">
            <span>ระบบ</span>
            <span class="font-medium text-gray-800">UPOS Dulwich</span>
          </div>
          <div class="flex justify-between">
            <span>โรงเรียน</span>
            <span class="font-medium text-gray-800">Dulwich College Bangkok</span>
          </div>
        </div>
      </div>

      <!-- Links -->
      <div class="card space-y-1">
        <SettingsLink label="นโยบายความเป็นส่วนตัว" />
        <SettingsLink label="เงื่อนไขการให้บริการ" />
        <SettingsLink label="ติดต่อสนับสนุน" />
      </div>

      <!-- Logout -->
      <button
        class="w-full py-4 rounded-2xl border-2 border-red-200 text-red-500 font-semibold text-lg bg-white active:bg-red-50 transition-colors flex items-center justify-center gap-2"
        @click="handleLogout"
        :disabled="loggingOut"
      >
        <span v-if="loggingOut">กำลังออกจากระบบ...</span>
        <span v-else>🚪 ออกจากระบบ</span>
      </button>

      <!-- Version footer -->
      <p class="text-center text-xs text-gray-300 pb-2">
        UPOS Parent Web v1.0.0 · Build 2025
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const lang = ref('th')
const loggingOut = ref(false)

const userInitial = computed(() => auth.user?.name?.charAt(0)?.toUpperCase() ?? 'U')

async function handleLogout() {
  loggingOut.value = true
  try {
    await auth.logout()
    router.push('/login')
  } finally {
    loggingOut.value = false
  }
}

// Inline component for settings link rows
const SettingsLink = defineComponent({
  props: { label: String },
  setup(props) {
    return () =>
      h(
        'button',
        {
          class:
            'w-full flex items-center justify-between py-3 border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors px-1',
        },
        [
          h('span', { class: 'text-sm text-gray-700' }, props.label),
          h(
            'svg',
            {
              class: 'w-4 h-4 text-gray-400',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
            },
            [
              h('path', {
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'stroke-width': '2',
                d: 'M9 5l7 7-7 7',
              }),
            ],
          ),
        ],
      )
  },
})
</script>
