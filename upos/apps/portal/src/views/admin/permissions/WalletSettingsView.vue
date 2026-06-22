<template>
  <div style="display:flex;flex-direction:column;gap:24px">

    <!-- Page header -->
    <div>
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">ตั้งค่า Wallet</h2>
      <p style="font-size:13px;color:var(--color-text-secondary);margin-top:4px">สิทธิ์ที่ได้รับมาจากระบบกลาง เปิด/ปิดเพื่อให้ใช้งานใน UPOS</p>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="wallet-error">{{ error }}</div>

    <!-- Hero banner -->
    <div class="wallet-hero">
      <div class="wallet-hero-left">
        <span class="hero-badge">
          <PhArrowsClockwise :size="12" weight="fill" />
          ระบบกลาง
        </span>
        <h3 class="hero-title">สิทธิ์จากระบบกลาง</h3>
        <p class="hero-sub">ดึงจากระบบสวัสดิการ · เปิดใช้งานในระบบ UPOS</p>
      </div>
      <div class="hero-right">
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
        <button class="sync-btn" @click="syncFromExternal" :disabled="syncing" type="button">
          <PhArrowsClockwise :size="14" :class="{ 'spin': syncing }" weight="bold" />
          {{ syncing ? 'กำลังซิงค์...' : 'ซิงค์จากระบบสวัสดิการ' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="wallet-loading">กำลังโหลด...</div>

    <!-- Permission cards -->
    <div v-else class="perm-grid">
      <div
        v-for="w in wallets"
        :key="w.id"
        :class="['perm-card', w.enabled ? 'perm-card--on' : '']"
      >
        <!-- Top row: icon + name + toggle -->
        <div class="pc-top">
          <div :class="['pc-icon', w.enabled ? 'pc-icon--on' : '']">
            <component :is="w.icon" :size="20" weight="fill" />
          </div>
          <div class="pc-info">
            <div class="pc-name">{{ w.name }}</div>
            <div class="pc-meta">
              <span class="pc-limit">฿{{ (w.amount ?? 0).toLocaleString() }} / ครั้ง</span>
            </div>
          </div>
          <button
            :class="['pc-toggle', w.enabled ? 'pc-toggle--on' : '']"
            @click="toggleWallet(w)"
            type="button"
          >
            <span class="pc-thumb" />
          </button>
        </div>

        <!-- Divider -->
        <div class="pc-divider" />

        <!-- Roles -->
        <div class="pc-roles">
          <span class="pc-roles-label">บทบาทที่ใช้ได้</span>
          <div class="pc-role-chips">
            <span class="pc-role-chip pc-role-chip--admin">
              <PhShieldCheck :size="11" weight="fill" />
              แอดมิน
            </span>
            <span class="pc-role-chip pc-role-chip--staff">
              <PhUserCircle :size="11" weight="fill" />
              พนักงาน
            </span>
          </div>
        </div>

        <!-- Status badge -->
        <div :class="['pc-status', w.enabled ? 'pc-status--on' : 'pc-status--off']">
          <PhCheckCircle v-if="w.enabled"  :size="13" weight="fill" />
          <PhPauseCircle  v-else           :size="13" weight="fill" />
          {{ w.enabled ? 'เปิดใช้งานใน UPOS แล้ว' : 'ปิดการใช้งาน' }}
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="wallets.length === 0" class="empty-state">
        <PhWallet :size="32" style="color:var(--color-text-tertiary);margin-bottom:8px" />
        <p style="font-size:14px;color:var(--color-text-secondary)">ยังไม่มีสิทธิ์กระเป๋าตัง</p>
        <p style="font-size:12px;color:var(--color-text-tertiary);margin-top:4px">กด "ซิงค์จากระบบสวัสดิการ" เพื่อดึงข้อมูล</p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  PhShieldCheck, PhUserCircle,
  PhCheckCircle, PhPauseCircle,
  PhArrowsClockwise, PhWallet,
} from '@phosphor-icons/vue'
import { useWalletsStore } from '@/stores/wallets'
import type { WalletItem } from '@/stores/wallets'

const store   = useWalletsStore()
const wallets = store.wallets

const loading = ref(false)
const syncing = ref(false)
const error   = ref<string | null>(null)

const activeCount = computed(() => wallets.filter(w => w.enabled).length)

onMounted(async () => {
  loading.value = true
  error.value   = null
  try {
    await store.load()
  } catch (e: any) {
    error.value = e?.message ?? 'โหลดข้อมูลไม่สำเร็จ'
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
    w.enabled = !w.enabled
    error.value = e?.message ?? 'บันทึกไม่สำเร็จ'
  }
}

async function syncFromExternal() {
  syncing.value = true
  error.value   = null
  try {
    await store.load()
  } catch (e: any) {
    error.value = e?.message ?? 'ซิงค์ไม่สำเร็จ'
  } finally {
    syncing.value = false
  }
}
</script>

<style scoped>
/* Hero banner */
.wallet-hero {
  background: linear-gradient(135deg, #0A2B6B 0%, #1264E3 100%);
  border-radius: 16px;
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.wallet-hero-left { flex: 1; min-width: 200px; }
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  border-radius: 100px;
  margin-bottom: 12px;
}
.hero-title { font-size: 22px; font-weight: 500; color: #fff; margin-bottom: 6px; }
.hero-sub   { font-size: 13px; color: rgba(255, 255, 255, 0.7); line-height: 1.5; }

.hero-right  { display: flex; flex-direction: column; align-items: flex-end; gap: 14px; flex-shrink: 0; }
.hero-stats  { display: flex; gap: 12px; }
.hero-stat {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px 24px;
  text-align: center;
  min-width: 80px;
}
.hero-stat-label  { display: block; font-size: 12px; color: rgba(255, 255, 255, 0.7); margin-bottom: 4px; }
.hero-stat-val    { font-size: 28px; font-weight: 500; color: #fff; }
.hero-stat-active { color: #34D399; }

/* Sync button */
.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 100px;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  background: transparent;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
  white-space: nowrap;
}
.sync-btn:hover    { background: rgba(255, 255, 255, 0.12); }
.sync-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; display: inline-block; }

/* Grid */
.perm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

/* Empty state */
.empty-state {
  grid-column: 1 / -1;
  padding: 48px 24px;
  text-align: center;
  background: var(--color-bg-secondary);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Card */
.perm-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--color-border-tertiary);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.perm-card--on {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px rgba(18, 100, 227, 0.12);
}

/* Card top */
.pc-top { display: flex; align-items: center; gap: 12px; }

.pc-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
  transition: background 0.2s, color 0.2s;
}
.pc-icon--on { background: var(--color-primary); color: #fff; }

.pc-info  { flex: 1; min-width: 0; }
.pc-name  { font-size: 15px; font-weight: 500; color: var(--color-text-primary); }
.pc-meta  { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
.pc-limit { font-size: 12px; color: var(--color-text-secondary); }

.pc-tag-teal {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 100px;
  background: #ECFDF5;
  color: #059669;
}

/* Toggle */
.pc-toggle {
  width: 44px;
  height: 24px;
  border-radius: 100px;
  border: none;
  cursor: pointer;
  background: #D1D1D6;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
  padding: 0;
}
.pc-toggle--on { background: var(--color-primary); }
.pc-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.pc-toggle--on .pc-thumb { transform: translateX(20px); }

/* Divider */
.pc-divider {
  height: 1px;
  background: var(--color-border-tertiary);
}

/* Roles */
.pc-roles { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pc-roles-label { font-size: 12px; color: var(--color-text-secondary); flex-shrink: 0; }
.pc-role-chips  { display: flex; gap: 6px; flex-wrap: wrap; }

.pc-role-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 100px;
}
.pc-role-chip--admin {
  background: rgba(18, 100, 227, 0.1);
  color: var(--color-primary);
}
.pc-role-chip--staff {
  background: rgba(91, 91, 91, 0.08);
  color: var(--color-text-secondary);
}

/* Status badge */
.pc-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
}
.pc-status--on  { background: var(--color-success-bg); color: #028A60; }
.pc-status--off { background: var(--color-bg-secondary); color: var(--color-text-tertiary); }

/* Loading / error */
.wallet-loading {
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}
.wallet-error {
  padding: 12px 16px;
  border-radius: 10px;
  background: #FEF2F2;
  color: #B91C1C;
  font-size: 13px;
  border: 1px solid #FECACA;
}
</style>
