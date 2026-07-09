<template>
  <div class="policies-view">
    <div>
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">ตั้งค่า</h2>
      <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">กำหนดค่าพฤติกรรมของระบบโรงอาหาร</p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="policies-grid" style="margin-top:20px">
      <div v-for="i in 6" :key="i" class="policy-skeleton" />
    </div>

    <!-- Load error -->
    <div v-else-if="loadError" style="margin-top:20px;padding:24px;color:var(--color-danger);background:var(--color-danger-bg);border-radius:10px;font-size:14px">
      {{ loadError }}
    </div>

    <!-- Empty -->
    <div v-else-if="policies.length === 0" style="margin-top:20px;padding:40px;text-align:center;color:var(--color-text-tertiary);font-size:13px">
      ไม่มีข้อมูลการตั้งค่า
    </div>

    <!-- Policy sections -->
    <div v-else class="policy-sections">
      <div v-for="(section, i) in sections" :key="section.title" class="policy-section" :style="i > 0 ? 'margin-top:28px' : 'margin-top:20px'">
        <p class="policy-section-title">{{ section.title }}</p>
        <div class="policies-grid">
          <div v-for="p in section.items" :key="p.key" class="policy-card">
            <div class="policy-card-top">
              <div class="policy-icon-wrap" :style="{ background: policyMeta(p.key).iconBg }">
                <component :is="policyMeta(p.key).icon" :size="17" :style="{ color: policyMeta(p.key).color }" />
              </div>
              <button class="policy-edit-btn" @click="openEdit(p)">
                <PhPencilSimple :size="12" /> แก้ไข
              </button>
            </div>

            <div class="policy-content">
              <p class="policy-key">{{ policyLabel(p.key) }}</p>
              <div class="policy-value" :class="{ 'policy-value-sm': isLongValue(p) }">{{ formatVal(p.key, p.value) }}</div>
              <p class="policy-desc">{{ p.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit modal -->
  <Teleport to="body">
    <Transition name="modal-bg">
      <div v-if="editTarget" class="pol-backdrop" @click="closeEdit" />
    </Transition>
    <Transition name="modal-up">
      <div v-if="editTarget" class="pol-modal" role="dialog" aria-modal="true">
        <div class="pol-modal-header">
          <div class="pol-header-left">
            <div class="pol-icon-circle" :style="{ background: policyMeta(editTarget.key).iconBg, color: policyMeta(editTarget.key).color }">
              <component :is="policyMeta(editTarget.key).icon" :size="20" weight="bold" />
            </div>
            <div>
              <h3 class="pol-modal-title">{{ policyLabel(editTarget.key) }}</h3>
              <p class="pol-modal-sub">{{ editTarget.description }}</p>
            </div>
          </div>
          <button class="pol-close" :disabled="saving" @click="closeEdit">
            <PhX :size="18" weight="bold" />
          </button>
        </div>
        <div class="pol-divider" />

        <div class="pol-body">
          <div class="pol-field">
            <label class="pol-label">ค่า</label>
            <textarea
              v-if="editTarget.key.toLowerCase() === 'receipt.footer'"
              v-model="editVal"
              class="pol-input pol-textarea"
              :disabled="saving"
            />
            <input
              v-else-if="isTextValue(editTarget.key)"
              v-model="editVal"
              class="pol-input"
              :disabled="saving"
            />
            <div v-else style="display:flex;align-items:center;gap:8px">
              <input v-model="editVal" type="number" class="pol-input" :disabled="saving" style="flex:1" />
              <span class="pol-unit">{{ unitFor(editTarget.key) }}</span>
            </div>
          </div>
          <p v-if="saveError" class="policy-save-error">{{ saveError }}</p>
        </div>

        <div class="pol-divider" />
        <div class="pol-footer">
          <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="saving" @click="closeEdit">ยกเลิก</button>
          <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="saving" @click="save">
            <PhFloppyDisk :size="14" /> {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  PhTrendDown, PhBell, PhArrowLineUp, PhArrowLineDown,
  PhCalendarBlank, PhShieldCheck, PhCertificate, PhReceipt, PhGear,
  PhPencilSimple, PhX, PhFloppyDisk,
} from '@phosphor-icons/vue'
import api from '@/api/axios'

interface Policy {
  key: string
  value: number | string
  description: string
}

// Thai/English labels for known policy keys — fallback to formatted key
const POLICY_LABEL_TH: Record<string, string> = {
  topup_min:              'ยอดเติมเงินขั้นต่ำ',
  topup_max:              'ยอดเติมเงินสูงสุด / ครั้ง',
  topup_limit:            'วงเงินเติมเงินต่อวัน',
  wallet_balance_limit:   'ยอดเงินสูงสุดในกระเป๋า',
  balance_limit:          'ยอดเงินสูงสุดในกระเป๋า',
  low_balance_alert:      'แจ้งเตือนยอดเงินต่ำ',
  preorder_max_days:      'จองล่วงหน้าสูงสุด',
  preorder_cutoff_min:    'ตัดยอดจองก่อนเวลา (นาที)',
  max_items_per_order:    'จำนวนรายการสูงสุดต่อออร์เดอร์',
  otp_ttl_minutes:        'OTP TTL',
  'pdpa.version':         'PDPA Version',
  'receipt.footer':       'Receipt Footer',
}

// Keys to hide from the settings view
const HIDDEN_KEYS = ['pdpa_version', 'otp_expire', 'otp_length', 'otp_max_attempts', 'otp_resend_cooldown']

function policyLabel(key: string): string {
  const lower = key.toLowerCase()
  return POLICY_LABEL_TH[lower] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Grouping + icon badge per policy key ────────────────────────────────────────

const SECTION_ORDER = ['กระเป๋าเงิน & ยอดคงเหลือ', 'การจอง', 'ความปลอดภัย', 'ข้อมูลกฎหมาย & ใบเสร็จ', 'อื่นๆ']

interface PolicyMeta { section: string; icon: unknown; color: string; iconBg: string }

const POLICY_META: Record<string, PolicyMeta> = {
  negative_balance_limit: { section: 'กระเป๋าเงิน & ยอดคงเหลือ', icon: PhTrendDown,     color: 'var(--color-danger)',  iconBg: 'var(--color-danger-bg)' },
  low_balance_threshold:  { section: 'กระเป๋าเงิน & ยอดคงเหลือ', icon: PhBell,          color: 'var(--color-warning)', iconBg: 'var(--color-warning-bg)' },
  topup_min:              { section: 'กระเป๋าเงิน & ยอดคงเหลือ', icon: PhArrowLineUp,   color: 'var(--color-accent)',  iconBg: 'var(--color-accent-bg)' },
  topup_max:              { section: 'กระเป๋าเงิน & ยอดคงเหลือ', icon: PhArrowLineDown, color: 'var(--color-success)', iconBg: 'var(--color-success-bg)' },
  preorder_max_days:      { section: 'การจอง',                  icon: PhCalendarBlank, color: 'var(--color-accent)',  iconBg: 'var(--color-accent-bg)' },
  otp_ttl_minutes:        { section: 'ความปลอดภัย',              icon: PhShieldCheck,   color: 'var(--color-warning)', iconBg: 'var(--color-warning-bg)' },
  'pdpa.version':         { section: 'ข้อมูลกฎหมาย & ใบเสร็จ',   icon: PhCertificate,   color: 'var(--color-text-secondary)', iconBg: 'var(--color-bg-secondary)' },
  'receipt.footer':       { section: 'ข้อมูลกฎหมาย & ใบเสร็จ',   icon: PhReceipt,       color: '#534AB7', iconBg: '#EEEDFE' },
}
const DEFAULT_META: PolicyMeta = { section: 'อื่นๆ', icon: PhGear, color: 'var(--color-text-secondary)', iconBg: 'var(--color-bg-secondary)' }

function policyMeta(key: string): PolicyMeta {
  return POLICY_META[key.toLowerCase()] ?? DEFAULT_META
}

// Keys formatted as Thai baht, and keys with a plain unit suffix
const MONEY_KEYS = ['negative_balance_limit', 'low_balance_threshold', 'topup_min', 'topup_max']
const UNIT_MAP: Record<string, string> = {
  preorder_max_days: 'วัน',
  otp_ttl_minutes:   'นาที',
}
const TEXT_KEYS = ['pdpa.version', 'receipt.footer']

function formatVal(key: string, val: number | string): string {
  const k = key.toLowerCase()
  if (MONEY_KEYS.includes(k)) return `฿${Number(val).toLocaleString()}`
  if (UNIT_MAP[k]) return `${val} ${UNIT_MAP[k]}`
  return String(val)
}

function unitFor(key: string): string {
  const k = key.toLowerCase()
  if (MONEY_KEYS.includes(k)) return '฿'
  return UNIT_MAP[k] ?? ''
}

function isTextValue(key: string): boolean {
  return TEXT_KEYS.includes(key.toLowerCase())
}

function isLongValue(p: Policy): boolean {
  return String(formatVal(p.key, p.value)).length > 20
}

const loading = ref(false)
const loadError = ref<string | null>(null)
const allPolicies = ref<Policy[]>([])
const policies = computed(() =>
  allPolicies.value.filter(p => !HIDDEN_KEYS.includes(p.key.toLowerCase()))
)
const sections = computed(() => {
  const grouped = new Map<string, Policy[]>()
  for (const p of policies.value) {
    const section = policyMeta(p.key).section
    if (!grouped.has(section)) grouped.set(section, [])
    grouped.get(section)!.push(p)
  }
  return SECTION_ORDER
    .map(title => ({ title, items: grouped.get(title) ?? [] }))
    .filter(s => s.items.length > 0)
})

// ── Edit modal ────────────────────────────────────────────────────────────────

const editTarget = ref<Policy | null>(null)
const editVal = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)

function openEdit(p: Policy) {
  editTarget.value = p
  editVal.value = String(p.value)
  saveError.value = null
}

function closeEdit() {
  if (saving.value) return
  editTarget.value = null
}

async function save() {
  if (!editTarget.value || saving.value) return
  const p = editTarget.value
  const raw = editVal.value.trim()
  const num = Number(raw)
  const val = !isTextValue(p.key) && !isNaN(num) && raw !== '' ? num : raw
  saving.value = true
  saveError.value = null
  try {
    await api.patch(`/admin/policies/${p.key}`, { value: val })
    p.value = val
    editTarget.value = null
  } catch (e: unknown) {
    saveError.value = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    const { data } = await api.get('/admin/policies')
    allPolicies.value = data.policies ?? []
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'โหลดนโยบายไม่สำเร็จ'
    allPolicies.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.policies-view {
  display: flex;
  flex-direction: column;
}

.policy-sections {
  display: flex;
  flex-direction: column;
}

.policy-section-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0 0 10px 0;
}

.policies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

/* Skeleton */
.policy-skeleton {
  height: 110px;
  border-radius: 12px;
  background: var(--color-bg-secondary);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Policy card */
.policy-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--color-bg-surface);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 12px;
  padding: 16px 18px;
  transition: border-color 0.15s;
}
.policy-card:hover {
  border-color: var(--color-border-secondary);
}

.policy-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.policy-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.policy-edit-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: auto;
  padding: 3px 8px;
  background: transparent;
  color: var(--color-accent);
  border: 0.5px solid var(--color-accent);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.policy-edit-btn:hover {
  background: var(--color-accent-bg);
}

.policy-content {
  flex: 1;
  min-width: 0;
}

.policy-key {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 4px 0;
}

.policy-value {
  font-size: 22px;
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.2;
  margin-bottom: 2px;
}
.policy-value-sm {
  font-size: 16px;
}

.policy-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 2px 0 0 0;
  line-height: 1.4;
}

.policy-save-error {
  font-size: 12px;
  color: var(--color-danger);
  margin: 0;
}

/* Edit modal */
.pol-backdrop { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.4); }
.pol-modal {
  position:fixed; top:50%; left:50%; z-index:201; transform:translate(-50%,-50%);
  background:#fff; border-radius:14px; width:calc(100vw - 48px); max-width:420px;
  box-shadow:0 16px 48px rgba(0,0,0,0.16); overflow:hidden;
  display:flex; flex-direction:column; max-height:calc(100vh - 48px);
}
.pol-modal-header { display:flex; justify-content:space-between; align-items:flex-start; padding:20px 24px 16px; }
.pol-header-left { display:flex; align-items:flex-start; gap:12px; }
.pol-icon-circle {
  width:38px; height:38px; border-radius:50%; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
}
.pol-modal-title { font-size:17px; font-weight:500; color:var(--color-text-primary); }
.pol-modal-sub { font-size:12px; color:var(--color-text-tertiary); margin-top:2px; }
.pol-close { background:none; border:none; cursor:pointer; color:var(--color-text-tertiary); padding:4px; border-radius:6px; display:flex; align-items:center; }
.pol-close:hover:not(:disabled) { background:var(--color-bg-secondary); }
.pol-close:disabled { opacity:0.4; cursor:not-allowed; }
.pol-divider { height:1px; background:var(--color-border-tertiary); flex-shrink:0; }
.pol-body { padding:20px 24px; display:flex; flex-direction:column; gap:12px; overflow-y:auto; }

.pol-field { display:flex; flex-direction:column; gap:5px; }
.pol-label { font-size:12px; color:var(--color-text-secondary); }
.pol-input {
  height:42px; padding:0 12px; border-radius:8px;
  border:1.5px solid #D0D0D0; font-size:14px; color:var(--color-text-primary);
  outline:none; font-family:inherit; background:#fff; width:100%; box-sizing:border-box;
  transition:border-color 0.15s;
}
.pol-input:focus { border-color:var(--color-primary); }
.pol-input:disabled { background:#F5F5F5; cursor:not-allowed; }
.pol-textarea { height:80px; padding:10px 12px; resize:vertical; line-height:1.5; }
.pol-unit { font-size:13px; color:var(--color-text-secondary); flex-shrink:0; }

.pol-footer { display:flex; gap:10px; padding:16px 24px; justify-content:flex-end; flex-shrink:0; }

.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity:0; transform:translate(-50%,-48%); }
</style>
