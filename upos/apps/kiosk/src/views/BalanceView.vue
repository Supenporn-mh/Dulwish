<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import UserCard from '@/components/UserCard.vue'
import Icon from '@/components/Icon.vue'
import AutoLogout from '@/components/AutoLogout.vue'

const router = useRouter()
const store = useKioskStore()

const user = computed(() => store.currentUser)
const wallet = computed(() => store.wallet)
const transactions = computed(() => store.transactions)

const displayName = computed(() => user.value?.nameTh || user.value?.name || 'ผู้ใช้')

function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : '-'
  return `${sign}${Math.abs(amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function goBack() {
  router.push('/home')
}

onMounted(() => {
  store.fetchTransactions()
})
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex flex-col" style="background: #F0F2F5">
    <!-- Top bar -->
    <div class="relative flex items-center justify-center px-5 pt-4 pb-3 flex-shrink-0 bg-white" style="border-bottom: 0.5px solid #E0E0E5">
      <span class="absolute" style="left: 20px; font-size: 11px; color: #9A9AB0">ประวัติการทำรายการ</span>
      <h1 class="font-semibold text-gray-900" style="font-size: 15px">ประวัติการทำรายการ</h1>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto px-5 flex flex-col gap-3 min-h-0">
      <UserCard
        :name="displayName"
        :member-code="user?.id ?? ''"
        :balance="wallet?.balance ?? 0"
        :role-label="user?.roleLabel ?? ''"
        :updated-at="new Date()"
      />

      <div class="text-gray-500 text-center" style="font-size: 11px">รายการล่าสุด 10 รายการ</div>

      <div v-if="transactions.length === 0" class="flex-1 flex items-center justify-center text-gray-400" style="font-size: 11px">
        ไม่มีรายการ
      </div>

      <div v-else class="rounded-xl overflow-hidden bg-white" style="border: 0.5px solid #E0E0E0">
        <div
          v-for="(tx, idx) in transactions"
          :key="tx.id"
          class="flex items-center justify-between px-3 py-3"
          :style="idx < transactions.length - 1 ? 'border-bottom: 0.5px solid #E0E0E0' : ''"
        >
          <div class="min-w-0">
            <div class="font-medium text-gray-900 truncate" style="font-size: 11px">{{ tx.description }}</div>
            <div class="text-gray-400 mt-0.5" style="font-size: 9px">{{ formatDate(tx.createdAt) }}</div>
          </div>
          <div
            class="font-medium flex-shrink-0"
            :style="tx.amount >= 0 ? 'font-size: 11px; color: #03BA81' : 'font-size: 11px; color: #FF5252'"
          >{{ formatAmount(tx.amount) }}</div>
        </div>
      </div>
    </div>

    <!-- Bottom -->
    <div class="flex-shrink-0 flex flex-col gap-[5px] px-5 pb-4 pt-2">
      <button class="btn-outline-full flex items-center justify-center gap-1" @click="goBack">
        <Icon name="chevronLeft" :size="14" color="#1264E3" />
        ย้อนกลับ
      </button>
      <div class="text-center text-gray-400" style="font-size: 9px">powered by UPOS</div>
    </div>

    <AutoLogout />
  </div>
</template>
