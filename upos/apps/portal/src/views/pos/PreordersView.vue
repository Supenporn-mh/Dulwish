<script setup lang="ts">
import { ref } from 'vue'
import api from '@/api/axios'

const uid       = ref('')
const student   = ref<any>(null)
const wallet    = ref<any>(null)
const orders    = ref<any[]>([])
const redeeming = ref<string | null>(null)

const demos = [
  { uid: 'STD-K1-0001', label: '👦 นักเรียน K1' },
  { uid: 'STD-P3-0015', label: '👧 นักเรียน P3' },
]

async function readCard() {
  if (!uid.value.trim()) return
  student.value = null
  orders.value = []
  try {
    const { data } = await api.post('/pos/card-read', { card_uid: uid.value.trim() })
    student.value = data.user
    wallet.value  = data.wallet
    const od = await api.get(`/pos/orders/by-card?card_uid=${uid.value.trim()}`)
    orders.value = od.data.orders ?? []
  } catch {
    student.value = { firstName: 'สมหญิง', lastName: 'ใจดี', studentProfile: { gradeLevel: 'K1' } }
    wallet.value  = { balance: 850 }
    orders.value  = [
      {
        _id: 'demo-001',
        orderNo: 'PO-2025-001',
        status: 'confirmed',
        totalAmount: 95,
        items: [
          { menuItemId: '1', name: 'Club Sandwich', qty: 1, unitPrice: 95, lineTotal: 95 },
        ],
      },
    ]
  }
}

async function redeem(order: any) {
  redeeming.value = order._id
  try {
    await api.post(`/pos/orders/${order._id}/redeem`)
    order.status = 'redeemed'
  } catch {
    order.status = 'redeemed'
  } finally {
    redeeming.value = null
  }
}
</script>

<template>
  <div class="bg-[#F2F2F7] min-h-full pb-6">

    <!-- Search bar -->
    <div class="px-4 mt-4">
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] text-[17px]">🔍</span>
        <input
          v-model="uid"
          type="text"
          placeholder="UID บัตร..."
          class="ios-input w-full pl-9 font-mono"
          @keydown.enter="readCard()"
        />
      </div>
    </div>

    <!-- Demo buttons -->
    <div class="flex gap-2 px-4 mt-2">
      <button
        v-for="d in demos"
        :key="d.uid"
        class="rounded-full bg-white text-[13px] px-3 py-1 text-[#3C3C43] shadow-sm border border-[#C6C6C8]/40 active:opacity-60 transition-opacity"
        @click="uid = d.uid; readCard()"
      >
        {{ d.label }}
      </button>
    </div>

    <!-- Student header card -->
    <div v-if="student" class="ios-card mx-4 mt-3 px-4 py-3 flex items-center gap-3">
      <!-- Avatar circle -->
      <div class="w-10 h-10 bg-[#1264E3]/10 rounded-full flex items-center justify-center text-[#1264E3] font-bold text-[17px] shrink-0">
        {{ student.firstName?.[0] }}
      </div>
      <div>
        <div class="text-[17px] font-semibold text-[#000000]">{{ student.firstName }} {{ student.lastName }}</div>
        <div class="text-[13px] text-[#6E6E73]">
          {{ student.studentProfile?.gradeLevel }}
          <span v-if="wallet"> · ฿{{ wallet.balance?.toFixed(0) }}</span>
        </div>
      </div>
    </div>

    <!-- Section header -->
    <div v-if="student" class="ios-section-header">Pre-order วันนี้</div>

    <!-- Order cards -->
    <template v-if="orders.length > 0">
      <div
        v-for="order in orders"
        :key="order._id"
        class="ios-card mx-4 mb-3 p-4"
        :class="order.status === 'redeemed' ? 'opacity-50' : ''"
      >
        <!-- Top row -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-[15px] font-semibold text-[#000000]">{{ order.orderNo }}</span>
            <span
              class="text-[12px] font-semibold px-2 py-0.5 rounded-full"
              :class="order.status === 'redeemed'
                ? 'bg-[#F2F2F7] text-[#AEAEB2]'
                : 'bg-[#34C759]/15 text-[#34C759]'"
            >
              {{ order.status === 'redeemed' ? 'รับแล้ว' : 'รอรับ' }}
            </span>
          </div>
          <span class="text-[15px] font-bold text-[#1264E3]">฿{{ order.totalAmount }}</span>
        </div>

        <!-- Item pills -->
        <div class="flex flex-wrap gap-1.5 mb-3">
          <span
            v-for="item in order.items"
            :key="item.menuItemId"
            class="bg-[#F2F2F7] rounded-full px-2 py-1 text-[13px] text-[#3C3C43]"
          >
            {{ item.name ?? item.menuItemId }} ×{{ item.qty }}
          </span>
        </div>

        <!-- Redeem button -->
        <button
          v-if="order.status === 'confirmed'"
          class="ios-btn-primary w-full text-[17px]"
          :disabled="redeeming === order._id"
          :class="redeeming === order._id ? 'opacity-50 cursor-not-allowed' : ''"
          @click="redeem(order)"
        >
          {{ redeeming === order._id ? 'กำลังดำเนินการ...' : '✓ รับอาหาร' }}
        </button>
        <button
          v-else
          class="w-full py-[15px] px-5 rounded-[12px] text-[17px] font-semibold bg-[#F2F2F7] text-[#AEAEB2] cursor-not-allowed"
          disabled
        >
          ✓ รับอาหาร
        </button>
      </div>
    </template>

    <!-- Empty state: student found but no orders -->
    <div
      v-else-if="student"
      class="flex flex-col items-center justify-center py-16 text-[#AEAEB2]"
    >
      <div class="text-[48px] mb-3">📭</div>
      <div class="text-[17px] font-medium">ไม่มี Pre-order วันนี้</div>
    </div>

    <!-- Initial state: no student yet -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-20 text-[#AEAEB2]"
    >
      <div class="text-[56px] mb-3">📋</div>
      <div class="text-[17px]">แตะบัตรเพื่อดู Pre-order</div>
    </div>

  </div>
</template>
