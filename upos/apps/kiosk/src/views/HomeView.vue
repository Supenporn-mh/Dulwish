<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import UserCard from '@/components/UserCard.vue'
import Icon from '@/components/Icon.vue'
import AutoLogout from '@/components/AutoLogout.vue'

const router = useRouter()
const store = useKioskStore()

const user = computed(() => store.currentUser)
const wallet = computed(() => store.wallet)

const displayName = computed(() => user.value?.nameTh || user.value?.name || 'ผู้ใช้')

const PAY_METHODS = [
  { key: 'promptpay', label: 'พร้อมเพย์', icon: 'qrcode' },
  { key: 'alipay', label: 'Alipay', icon: 'card' },
]
const OTHER_ITEMS = [
  { key: 'history', label: 'ประวัติการทำรายการ', icon: 'receipt' },
  { key: 'feedback', label: 'ส่งความเห็น', icon: 'smile' },
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
  <div class="w-screen h-screen overflow-hidden flex flex-col" style="background: #F0F0F5">
    <!-- Top bar -->
    <div class="relative flex items-center justify-center px-5 pt-4 pb-3 flex-shrink-0 bg-white" style="border-bottom: 0.5px solid #E0E0E5">
      <span class="absolute" style="left: 20px; font-size: 11px; color: #9A9AB0">เลือกวิธีเติมเงิน</span>
      <h1 class="font-semibold" style="font-size: 15px; color: #1264E3">เติมเงิน</h1>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5 min-h-0">
      <UserCard
        :name="displayName"
        :member-code="user?.id ?? ''"
        :balance="wallet?.balance ?? 0"
        :role-label="user?.roleLabel ?? ''"
        :updated-at="new Date()"
      />

      <div>
        <div class="mb-2" style="font-size: 13px; font-weight: 600; color: #1A1A2E">เลือกวิธีการเติมเงิน</div>

        <div class="flex flex-col" style="gap: 8px">
          <button
            v-for="item in PAY_METHODS"
            :key="item.key"
            class="menu-row"
            @click="selectItem(item.key)"
          >
            <div class="m-icon">
              <Icon :name="item.icon" :size="20" color="#1264E3" />
            </div>
            <div class="flex-1 text-left" style="font-size: 14px; font-weight: 500; color: #1A1A2E">{{ item.label }}</div>
            <Icon name="chevronRight" :size="18" color="#9A9AB0" />
          </button>

          <div style="height: 0.5px; background: #E0E0E5; margin: 2px 0" />

          <button
            v-for="item in OTHER_ITEMS"
            :key="item.key"
            class="menu-row"
            @click="selectItem(item.key)"
          >
            <div class="m-icon">
              <Icon :name="item.icon" :size="20" color="#1264E3" />
            </div>
            <div class="flex-1 text-left" style="font-size: 14px; font-weight: 500; color: #1A1A2E">{{ item.label }}</div>
            <Icon name="chevronRight" :size="18" color="#9A9AB0" />
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom -->
    <div class="flex-shrink-0 px-5 pb-4 pt-2">
      <button class="btn-outline-full flex items-center justify-center gap-1" @click="goBack">
        <Icon name="chevronLeft" :size="14" color="#1264E3" />
        ย้อนกลับ
      </button>
    </div>

    <AutoLogout />
  </div>
</template>

<style scoped>
.menu-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 12px;
  border: 0.5px solid #E0E0E5;
  padding: 14px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
  -webkit-tap-highlight-color: transparent;
}
.menu-row:hover { border-color: #1264E3; background: #EAF1FD; }
.menu-row:active { background: #daeaff; }
.m-icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #EAF1FD;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
