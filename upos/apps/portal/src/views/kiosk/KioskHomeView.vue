<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useKioskStore } from '@/stores/kiosk'
import UserProfileCard from '@/components/UserProfileCard.vue'
import { PhClockCounterClockwise, PhQrCode, PhSmiley, PhSignOut } from '@phosphor-icons/vue'

const router = useRouter()
const store  = useKioskStore()

const user   = computed(() => store.currentUser)
const wallet = computed(() => store.wallet)

const grade = computed(() => user.value?.grade ?? undefined)

function logout() {
  store.clearSession()
  router.push('/kiosk/idle')
}

if (!user.value) {
  router.replace('/kiosk/idle')
}
</script>

<template>
  <div class="w-full h-full flex flex-col overflow-hidden" style="background: var(--color-bg-page)">

    <!-- Profile card -->
    <div class="mx-5 mt-6 flex-shrink-0">
      <UserProfileCard
        :name="user?.name ?? ''"
        :uid="user?.uid ?? ''"
        :role="user?.role ?? 'student'"
        :balance="wallet?.balance"
        :grade="grade"
        :updated-at="new Date()"
      />
    </div>

    <!-- Action grid -->
    <div class="grid grid-cols-2 gap-4 mx-5 mt-5 flex-1 pb-4">

      <button
        @click="router.push('/kiosk/balance')"
        class="card p-5 flex flex-col items-center justify-center gap-3 min-h-[120px] cursor-pointer active:scale-[0.97] transition-transform"
        style="background: var(--color-primary-tint);"
      >
        <PhClockCounterClockwise :size="36" weight="fill" style="color: var(--color-primary)" />
        <span class="text-[16px] font-semibold" style="color: var(--color-primary)">ดูประวัติ</span>
      </button>

      <button
        @click="router.push('/kiosk/topup')"
        class="card p-5 flex flex-col items-center justify-center gap-3 min-h-[120px] cursor-pointer active:scale-[0.97] transition-transform"
        style="background: var(--color-success-bg);"
      >
        <PhQrCode :size="36" weight="fill" style="color: var(--color-success)" />
        <span class="text-[16px] font-semibold" style="color: var(--color-success)">เติมเงิน QR</span>
      </button>

      <button
        @click="router.push('/kiosk/feedback')"
        class="card p-5 flex flex-col items-center justify-center gap-3 min-h-[120px] cursor-pointer active:scale-[0.97] transition-transform"
        style="background: var(--color-warning-bg);"
      >
        <PhSmiley :size="36" weight="fill" style="color: var(--color-warning)" />
        <span class="text-[16px] font-semibold" style="color: var(--color-warning)">ส่งความเห็น</span>
      </button>

      <button
        @click="logout"
        class="card p-5 flex flex-col items-center justify-center gap-3 min-h-[120px] cursor-pointer active:scale-[0.97] transition-transform"
        style="background: var(--color-danger-bg);"
      >
        <PhSignOut :size="36" weight="fill" style="color: var(--color-danger)" />
        <span class="text-[16px] font-semibold" style="color: var(--color-danger)">ออกจากระบบ</span>
      </button>

    </div>
  </div>
</template>
