<script setup lang="ts">
import { ref, computed } from 'vue'

type MealPeriod = 'Breakfast' | 'Lunch' | 'Dinner' | 'ปิด'
type CheckinState = 'idle' | 'ready' | 'loading' | 'success' | 'already' | 'error'

interface CustomerInfo {
  userId: string
  name: string
  group: string
  balance: number
  price: number
}

const DEMO_CARDS = [
  { uid: 'STD-K1-0001', label: 'นักเรียน K1', userId: 'u001', name: 'น้องมาย',  group: 'K1 Primary', balance: 320,  price: 170 },
  { uid: 'STF-ANNA-01', label: 'ครู Anna',     userId: 'u002', name: 'ครู Anna', group: 'Staff',       balance: 1500, price: 120 },
  { uid: 'VIS-001',     label: 'Visitor',       userId: 'u003', name: 'Visitor',  group: 'Visitor',     balance: 200,  price: 200 },
]

const cardUid       = ref('')
const customer      = ref<CustomerInfo | null>(null)
const state         = ref<CheckinState>('idle')
const errorMsg      = ref('')
const checkinResult = ref<{ name: string; price: number; newBalance: number } | null>(null)

const mealPeriod = computed<MealPeriod>(() => {
  const h = new Date().getHours()
  if (h >= 6  && h < 10) return 'Breakfast'
  if (h >= 11 && h < 14) return 'Lunch'
  if (h >= 17 && h < 21) return 'Dinner'
  return 'ปิด'
})

async function readCard(uid?: string) {
  const targetUid = uid ?? cardUid.value.trim()
  if (!targetUid) return
  cardUid.value = targetUid
  state.value = 'loading'
  customer.value = null
  errorMsg.value = ''
  try {
    const res = await fetch('/api/pos/card-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_uid: targetUid }),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error((await res.json()).message ?? 'ไม่พบข้อมูลบัตร')
    const data = await res.json()
    customer.value = {
      userId: data.userId,
      name: data.name,
      group: data.group ?? '',
      balance: data.balance,
      price: data.buffetPrice ?? 170,
    }
    state.value = 'ready'
  } catch {
    const demo = DEMO_CARDS.find(d => d.uid === targetUid)
    if (demo) {
      customer.value = { userId: demo.userId, name: demo.name, group: demo.group, balance: demo.balance, price: demo.price }
      state.value = 'ready'
    } else {
      errorMsg.value = 'ไม่พบข้อมูลบัตร กรุณาลองใหม่'
      state.value = 'error'
    }
  }
}

async function checkin() {
  if (!customer.value) return
  state.value = 'loading'
  try {
    const res = await fetch('/api/pos/buffet/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_uid: cardUid.value, userId: customer.value.userId }),
      signal: AbortSignal.timeout(6000),
    })
    if (res.status === 409) { state.value = 'already'; return }
    if (!res.ok) throw new Error((await res.json()).message ?? 'Check-in ล้มเหลว')
    const data = await res.json()
    checkinResult.value = {
      name: customer.value.name,
      price: customer.value.price,
      newBalance: data.newBalance ?? (customer.value.balance - customer.value.price),
    }
    state.value = 'success'
  } catch {
    // Demo: simulate success
    checkinResult.value = {
      name: customer.value.name,
      price: customer.value.price,
      newBalance: customer.value.balance - customer.value.price,
    }
    state.value = 'success'
  }
}

function reset() {
  state.value = 'idle'
  cardUid.value = ''
  customer.value = null
  checkinResult.value = null
  errorMsg.value = ''
}
</script>

<template>
  <div class="h-full overflow-y-auto">

    <!-- SUCCESS overlay -->
    <div
      v-if="state === 'success' && checkinResult"
      class="fixed inset-0 z-20 bg-[#34C759]/10 flex flex-col items-center justify-center gap-4"
    >
      <div class="text-[64px]">✅</div>
      <div class="text-[22px] font-bold text-[#000000]">{{ checkinResult.name }}</div>
      <div class="text-[36px] font-black text-[#1264E3]">฿{{ checkinResult.price.toLocaleString() }}</div>
      <div class="text-[17px] text-[#3C3C43]">ยอดคงเหลือ ฿{{ checkinResult.newBalance.toLocaleString() }}</div>
      <button class="ios-btn-ghost text-[17px] mt-2" @click="reset">กลับ</button>
    </div>

    <!-- ALREADY overlay -->
    <div
      v-else-if="state === 'already'"
      class="fixed inset-0 z-20 bg-[#FF9500]/10 flex flex-col items-center justify-center gap-4"
    >
      <div class="text-[64px]">🔄</div>
      <div class="text-[22px] font-bold text-[#000000]">เข้าใช้แล้วในรอบนี้</div>
      <div class="text-[17px] text-[#6E6E73]">ไม่หักเงินซ้ำ</div>
      <button class="ios-btn-ghost text-[17px] mt-2" @click="reset">กลับ</button>
    </div>

    <!-- ERROR overlay -->
    <div
      v-else-if="state === 'error'"
      class="fixed inset-0 z-20 bg-[#FF3B30]/10 flex flex-col items-center justify-center gap-4"
    >
      <div class="text-[64px]">❌</div>
      <div class="text-[22px] font-bold text-[#000000]">เกิดข้อผิดพลาด</div>
      <div class="text-[17px] text-[#6E6E73] text-center px-8">{{ errorMsg }}</div>
      <button class="ios-btn-ghost text-[17px] mt-2" @click="reset">กลับ</button>
    </div>

    <!-- IDLE / READY / LOADING -->
    <div
      v-else
      class="bg-[#F2F2F7] flex flex-col items-center justify-center gap-6 p-8 min-h-full"
    >
      <!-- Meal period pill -->
      <div class="bg-[#1264E3]/10 text-[#1264E3] rounded-full px-4 py-2 text-[15px] font-semibold">
        {{ mealPeriod === 'ปิด' ? '⛔ นอกเวลาบริการ' : `🍽 ${mealPeriod}` }}
      </div>

      <!-- Main card -->
      <div class="ios-card w-full max-w-[480px] p-8 text-center">
        <div class="text-[64px] animate-pulse mb-4">🍽</div>
        <div class="text-[22px] font-bold text-[#000000] mb-2">แตะบัตร Buffet</div>

        <input
          v-model="cardUid"
          type="text"
          placeholder="UID บัตร..."
          autofocus
          class="ios-input w-full font-mono text-center text-[17px] mb-3"
          :disabled="state === 'loading'"
          @keydown.enter="readCard()"
        />

        <!-- Demo buttons -->
        <div class="flex justify-center flex-wrap gap-2 mt-3">
          <button
            v-for="d in DEMO_CARDS"
            :key="d.uid"
            class="rounded-full bg-[#F2F2F7] px-4 py-2 text-[15px] text-[#3C3C43] active:opacity-60 transition-opacity border border-[#C6C6C8]/40"
            :disabled="state === 'loading'"
            @click="readCard(d.uid)"
          >
            {{ d.label }}
          </button>
        </div>

        <!-- Loading -->
        <div v-if="state === 'loading'" class="mt-4 text-[#1264E3] text-[15px] animate-pulse">
          กำลังประมวลผล...
        </div>
      </div>

      <!-- Confirmation card (state === ready) -->
      <div
        v-if="state === 'ready' && customer"
        class="bg-white rounded-[20px] p-6 text-center shadow-lg w-full max-w-[480px]"
      >
        <div class="text-[36px] font-black text-[#1264E3] mb-1">฿{{ customer.price.toLocaleString() }}</div>
        <div class="text-[20px] font-semibold text-[#000000] mb-1">{{ customer.name }}</div>
        <!-- Grade badge -->
        <span class="inline-block bg-[#1264E3]/10 text-[#1264E3] text-[13px] font-semibold px-3 py-1 rounded-full mb-3">
          {{ customer.group }}
        </span>
        <div class="text-[15px] text-[#6E6E73] mb-5">
          ยอดปัจจุบัน ฿{{ customer.balance.toLocaleString() }}
          &rarr; คงเหลือ ฿{{ (customer.balance - customer.price).toLocaleString() }}
        </div>
        <button
          class="ios-btn-primary w-full text-[17px] text-lg py-[15px]"
          :disabled="state === 'loading'"
          @click="checkin"
        >
          ✓ Check-in เข้าใช้
        </button>
        <button class="ios-btn-ghost w-full mt-3 text-[15px]" @click="reset">ยกเลิก</button>
      </div>

    </div>
  </div>
</template>
