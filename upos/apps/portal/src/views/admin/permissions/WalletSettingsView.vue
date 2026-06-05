<template>
  <div style="display:flex;flex-direction:column;gap:20px">

    <!-- Page title -->
    <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">ตั้งค่า Wallet</h2>

    <!-- Branch selector -->
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <button class="branch-pill">
        <PhBuildings :size="14" weight="fill" />
        โรงเรียน Dulwich
      </button>
      <span style="font-size:13px;color:var(--color-text-secondary)">การตั้งค่าและควบคุม Wallet ระดับระบบ</span>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="wallet-error">{{ error }}</div>

    <!-- Hero banner -->
    <div class="wallet-hero">
      <div class="wallet-hero-left">
        <span class="hero-badge">
          <PhShieldCheck :size="12" weight="fill" />
          VERIFIED
        </span>
        <h3 class="hero-title">ศูนย์จัดการ Wallet ระบบ</h3>
        <p class="hero-sub">ตรวจสอบและควบคุมสถานะ Wallet แต่ละประเภทได้อย่างอิสระ</p>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <span class="hero-stat-label">ทั้งหมด</span>
          <span class="hero-stat-val">{{ wallets.length }}</span>
        </div>
        <div class="hero-stat">
          <span class="hero-stat-label">พร้อมใช้</span>
          <span class="hero-stat-val hero-stat-active">{{ activeCount }}</span>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="wallet-loading">กำลังโหลด...</div>

    <!-- Wallet cards grid -->
    <div v-else class="wallet-grid">
      <div
        v-for="w in wallets"
        :key="w.id"
        :class="['wallet-card', { 'wallet-card--on': w.enabled }]"
      >
        <!-- Card header -->
        <div class="wc-header">
          <div :class="['wc-icon', w.enabled ? 'wc-icon--on' : '']">
            <component :is="w.icon" :size="20" weight="fill" />
          </div>
          <div class="wc-info">
            <div class="wc-name">{{ w.name }}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
              <span class="wc-id">ID: {{ w.id }}</span>
              <span class="wc-amount">฿{{ w.amount.toLocaleString() }}</span>
            </div>
          </div>
          <!-- Toggle -->
          <button
            :class="['wc-toggle', w.enabled ? 'wc-toggle--on' : '']"
            @click="toggleWallet(w)"
            type="button"
          >
            <span class="wc-toggle-thumb" />
          </button>
        </div>

        <!-- Date fields -->
        <div class="wc-dates">
          <div class="wc-date-field">
            <label class="wc-date-label">มีผลเริ่มต้น</label>
            <input
              v-model="w.startDate"
              type="date"
              class="wc-date-input"
              :disabled="!w.enabled"
              @change="saveDates(w)"
            />
          </div>
          <div class="wc-date-field">
            <label class="wc-date-label">สิ้นสุดสิทธิ์</label>
            <input
              v-model="w.endDate"
              type="date"
              class="wc-date-input"
              :disabled="!w.enabled"
              @change="saveDates(w)"
            />
          </div>
        </div>

        <!-- Status badge -->
        <div :class="['wc-status', w.enabled ? 'wc-status--on' : 'wc-status--off']">
          <PhCheckCircle v-if="w.enabled" :size="14" weight="fill" />
          <PhPauseCircle  v-else         :size="14" weight="fill" />
          {{ w.enabled ? 'เปิดใช้งาน Wallet แล้ว' : 'ระงับการใช้งานชั่วคราว' }}
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import {
  PhBuildings, PhShieldCheck, PhCheckCircle, PhPauseCircle,
} from '@phosphor-icons/vue'
import { useWalletsStore } from '@/stores/wallets'
import type { WalletItem } from '@/stores/wallets'

const store   = useWalletsStore()
const wallets = store.wallets

const loading = ref(false)
const error   = ref<string | null>(null)

const activeCount = computed(() => wallets.filter(w => w.enabled).length)

onMounted(async () => {
  loading.value = true
  error.value   = null
  try {
    await store.load()
  } catch (e: any) {
    error.value = e?.message ?? 'โหลดข้อมูล Wallet ไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

async function toggleWallet(w: WalletItem) {
  w.enabled = !w.enabled
  error.value = null
  try {
    await store.save(w)
  } catch (e: any) {
    // revert optimistic toggle on failure
    w.enabled = !w.enabled
    error.value = e?.message ?? 'บันทึกไม่สำเร็จ'
  }
}

async function saveDates(w: WalletItem) {
  error.value = null
  try {
    await store.save(w)
  } catch (e: any) {
    error.value = e?.message ?? 'บันทึกวันที่ไม่สำเร็จ'
  }
}
</script>

<style scoped>
/* Branch pill */
.branch-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 100px;
  background: var(--color-primary); color: #fff;
  font-size: 13px; font-weight: 500; border: none; cursor: pointer;
  font-family: inherit;
}

/* Hero banner */
.wallet-hero {
  background: linear-gradient(135deg, #0A2B6B 0%, #1264E3 100%);
  border-radius: 16px; padding: 28px 32px;
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  flex-wrap: wrap;
}
.wallet-hero-left { flex: 1; min-width: 200px; }
.hero-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(255,255,255,0.15); color: #fff;
  font-size: 11px; font-weight: 500; letter-spacing: 0.05em;
  padding: 3px 10px; border-radius: 100px; margin-bottom: 12px;
}
.hero-title { font-size: 22px; font-weight: 500; color: #fff; margin-bottom: 6px; }
.hero-sub   { font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.5; }

.hero-stats { display: flex; gap: 12px; flex-shrink: 0; }
.hero-stat  {
  background: rgba(255,255,255,0.1); border-radius: 12px;
  padding: 14px 24px; text-align: center; min-width: 80px;
}
.hero-stat-label { display: block; font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 4px; }
.hero-stat-val   { font-size: 28px; font-weight: 500; color: #fff; }
.hero-stat-active { color: #34D399; }

/* Grid */
.wallet-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

/* Card */
.wallet-card {
  background: #fff; border-radius: 14px;
  border: 1px solid var(--color-border-tertiary);
  padding: 20px; display: flex; flex-direction: column; gap: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.wallet-card--on {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px rgba(18,100,227,0.15);
}

/* Card header */
.wc-header { display: flex; align-items: center; gap: 12px; }
.wc-icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-bg-secondary); color: var(--color-text-tertiary);
  transition: background 0.2s, color 0.2s;
}
.wc-icon--on { background: var(--color-primary); color: #fff; }

.wc-info    { flex: 1; min-width: 0; }
.wc-name    { font-size: 15px; font-weight: 500; color: var(--color-text-primary); }
.wc-id      { font-size: 11px; color: var(--color-text-tertiary); }
.wc-amount  {
  font-size: 12px; font-weight: 500; color: var(--color-primary);
  background: var(--color-primary-tint); padding: 1px 8px; border-radius: 100px;
}

/* Toggle */
.wc-toggle {
  width: 44px; height: 24px; border-radius: 100px; border: none; cursor: pointer;
  background: #D1D1D6; position: relative; transition: background 0.2s;
  flex-shrink: 0; padding: 0;
}
.wc-toggle--on    { background: var(--color-primary); }
.wc-toggle-thumb  {
  width: 20px; height: 20px; border-radius: 50%; background: #fff;
  position: absolute; top: 2px; left: 2px;
  transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.wc-toggle--on .wc-toggle-thumb { transform: translateX(20px); }

/* Date fields */
.wc-dates { display: flex; gap: 12px; }
.wc-date-field { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.wc-date-label { font-size: 12px; color: var(--color-text-secondary); }
.wc-date-input {
  height: 36px; padding: 0 10px; border-radius: 8px;
  border: 1px solid var(--color-border-tertiary);
  font-size: 13px; color: var(--color-text-primary);
  outline: none; font-family: inherit; background: #fff;
  transition: border-color 0.15s; width: 100%;
}
.wc-date-input:focus    { border-color: var(--color-primary); }
.wc-date-input:disabled { background: var(--color-bg-secondary); color: var(--color-text-tertiary); }

/* Loading / error states */
.wallet-loading {
  padding: 24px; text-align: center;
  font-size: 14px; color: var(--color-text-secondary);
}
.wallet-error {
  padding: 12px 16px; border-radius: 10px;
  background: #FEF2F2; color: #B91C1C;
  font-size: 13px; font-weight: 400;
  border: 1px solid #FECACA;
}

/* Status badge */
.wc-status {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; border-radius: 8px;
  font-size: 13px; font-weight: 400;
}
.wc-status--on  { background: var(--color-success-bg); color: #028A60; }
.wc-status--off { background: var(--color-bg-secondary); color: var(--color-text-tertiary); }
</style>
