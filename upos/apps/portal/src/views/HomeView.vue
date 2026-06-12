<template>
  <div class="min-h-screen bg-[#F2F2F7] flex flex-col">

    <!-- Header -->
    <div class="bg-white pt-14 pb-6 px-6 text-center">
      <div class="w-[72px] h-[72px] bg-[#1264E3] rounded-[20px] flex items-center justify-center mx-auto mb-3 shadow-ios-md">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="8" y="10" width="24" height="4" rx="2" fill="white"/>
          <rect x="8" y="18" width="16" height="4" rx="2" fill="white" opacity=".7"/>
          <rect x="8" y="26" width="20" height="4" rx="2" fill="white" opacity=".5"/>
        </svg>
      </div>
      <h1 class="text-[28px] font-bold text-black tracking-tight">UPOS</h1>
      <p class="text-[15px] text-[#6E6E73] mt-1">Dulwich College Bangkok</p>
    </div>

    <!-- Role list -->
    <div class="flex-1 px-4 pt-6 pb-8 max-w-[430px] mx-auto w-full">
      <p class="ios-section-header px-0 pt-0 mb-3">เลือกประเภทผู้ใช้งาน</p>

      <div class="ios-card mb-4">
        <button
          v-for="(role, idx) in roles"
          :key="role.id"
          @click="enter(role)"
          class="ios-list-row w-full text-left"
          :class="idx === 0 ? 'rounded-t-[16px]' : idx === roles.length - 1 ? 'rounded-b-[16px] border-0' : ''"
        >
          <!-- Icon -->
          <div class="ios-icon mr-3" :style="{ background: role.color + '18' }">
            <span>{{ role.icon }}</span>
          </div>
          <!-- Label -->
          <div class="flex-1 min-w-0">
            <p class="text-[17px] font-medium text-black">{{ role.label }}</p>
            <p class="text-[13px] text-[#6E6E73] truncate mt-[2px]">{{ role.desc }}</p>
          </div>
          <!-- Chevron -->
          <svg class="ml-2 flex-shrink-0 text-[#C6C6C8]" width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M1 1l7 6.5L1 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <!-- Register shortcut -->
      <div class="flex items-center justify-center mt-3">
        <button @click="router.push('/parent/register')"
          class="text-[13px] font-medium underline"
          style="color: var(--color-primary); background: none; border: none; cursor: pointer; padding: 4px 0;">
          ยังไม่มีบัญชี? ลงทะเบียนที่นี่
        </button>
      </div>

      <!-- Version -->
      <p class="text-center text-[13px] text-[#AEAEB2] mt-2">UPOS v1.0 · Canteen Cashless System</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const roles = [
  { id:'parent',  icon:'👨‍👩‍👧', label:'ผู้ปกครอง',         desc:'เติมเงิน · สั่งอาหาร · ดูประวัติ',   color:'#34C759', path:'/login?role=parent'  },
  { id:'admin',   icon:'🛡️',   label:'Admin / Supervisor', desc:'จัดการระบบ · รายงาน · นโยบาย',     color:'#1264E3', path:'/login?role=admin'   },
  { id:'cashier', icon:'🏪',   label:'แคชเชียร์ (POS)',   desc:'ขายหน้าร้าน · Buffet · Pre-order', color:'#FF9500', path:'/login?role=cashier'  },
  { id:'kiosk',   icon:'🖥️',   label:'Kiosk Self-Service', desc:'แตะบัตร · ดูยอด · เติมเงิน',       color:'#5856D6', path:'/kiosk/idle'          },
]

function enter(role: typeof roles[0]) {
  router.push(role.id === 'kiosk' ? '/kiosk/idle' : `/login?role=${role.id}`)
}
</script>
