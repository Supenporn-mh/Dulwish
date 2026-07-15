<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import UserCard from '@/components/UserCard.vue'
import AutoLogout from '@/components/AutoLogout.vue'

const router = useRouter()
const store = useKioskStore()

const user = computed(() => store.currentUser)
const wallet = computed(() => store.wallet)

const displayName = computed(() => user.value?.nameTh || user.value?.name || 'ผู้ใช้')

const MENU = [
  { key: 'promptpay', label: 'พร้อมเพย์', icon: 'ti-qrcode' },
  { key: 'alipay', label: 'Alipay', icon: 'ti-credit-card' },
  { key: 'history', label: 'ประวัติการทำรายการ', icon: 'ti-receipt', divider: true },
  { key: 'feedback', label: 'ส่งความเห็น', icon: 'ti-mood-smile' },
]

function selectItem(key: string) {
  if (key === 'promptpay' || key === 'alipay') {
    store.selectedMethod = key
    router.push('/topup')
  } else if (key === 'history') {
    router.push('/balance')
  } else if (key === 'feedback') {
    router.push('/feedback')
  }
}

function goBack() {
  store.clearSession()
  router.push('/')
}
</script>

<template>
  <div class="w-screen h-screen overflow-hidden flex flex-col bg-white">
    <!-- Top bar -->
    <div class="flex items-center justify-center px-5 pt-5 pb-3 flex-shrink-0">
      <h1 class="font-bold" style="font-size: 16px; color: #1264E3">เติมเงิน</h1>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto px-5 flex flex-col gap-5 min-h-0">
      <UserCard
        :name="displayName"
        :member-code="user?.id ?? ''"
        :balance="wallet?.balance ?? 0"
        :role-label="user?.roleLabel ?? ''"
        :updated-at="new Date()"
      />

      <div>
        <div class="text-gray-700 mb-2" style="font-size: 13px; font-weight: 500">เลือกวิธีการเติมเงิน</div>

        <div class="rounded-xl border border-gray-200 overflow-hidden">
          <template v-for="item in MENU" :key="item.key">
            <button
              class="w-full flex items-center gap-3 px-3 py-3 active:bg-gray-50"
              @click="selectItem(item.key)"
            >
              <div
                class="flex-shrink-0 rounded-lg bg-brand-tint text-brand-primary flex items-center justify-center"
                style="width: 28px; height: 28px"
              >
                <i :class="`ti ${item.icon}`" style="font-size: 15px" />
              </div>
              <div class="flex-1 text-left text-gray-900" style="font-size: 12px; font-weight: 500">
                {{ item.label }}
              </div>
              <i class="ti ti-chevron-right text-gray-400" style="font-size: 14px" />
            </button>
            <div v-if="item.divider" class="border-t border-gray-200" style="height: 0.5px" />
          </template>
        </div>
      </div>
    </div>

    <!-- Bottom -->
    <div class="flex-shrink-0 px-5 pb-4 pt-2">
      <button class="btn-outline-full flex items-center justify-center gap-1" @click="goBack">
        <i class="ti ti-chevron-left" style="font-size: 14px" />
        ย้อนกลับ
      </button>
    </div>

    <AutoLogout />
  </div>
</template>
