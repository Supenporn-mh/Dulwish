<template>
  <div class="policies-view">
    <div class="ios-section-header">นโยบายระบบ</div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="policies-grid">
      <div v-for="i in 6" :key="i" class="policy-skeleton" />
    </div>

    <!-- Load error -->
    <div v-else-if="loadError" style="padding:24px;color:var(--color-danger);background:#FEF2F2;border-radius:10px;font-size:14px">
      {{ loadError }}
    </div>

    <!-- Empty -->
    <div v-else-if="policies.length === 0" style="padding:40px;text-align:center;color:#AEAEB2;font-size:13px">
      ไม่มีข้อมูลนโยบาย
    </div>

    <!-- Policy cards -->
    <div v-else class="policies-grid">
      <div
        v-for="p in policies"
        :key="p.key"
        class="ios-card policy-card"
      >
        <div class="policy-card-inner">
          <!-- Left: content -->
          <div class="policy-content">
            <p class="policy-key">{{ p.key }}</p>

            <!-- View mode -->
            <template v-if="editing !== p.key">
              <div class="policy-value">{{ formatVal(p.key, p.value) }}</div>
              <p class="policy-desc">{{ p.description }}</p>
            </template>

            <!-- Edit mode -->
            <template v-else>
              <div class="edit-row">
                <el-input
                  v-model="editVal"
                  size="small"
                  style="width: 130px"
                  @keyup.enter="save(p)"
                />
                <button
                  class="save-icon-btn"
                  :disabled="saving === p.key"
                  @click="save(p)"
                  title="บันทึก"
                >
                  <svg v-if="saving !== p.key" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5L13 4" stroke="#34C759" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none" class="spin">
                    <circle cx="8" cy="8" r="6" stroke="#C6C6C8" stroke-width="2"/>
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="#1264E3" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
                <button
                  class="cancel-icon-btn"
                  @click="editing = null; saveError = null"
                  title="ยกเลิก"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="#FF3B30" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
              <p v-if="saveError && editing === p.key" class="policy-save-error">{{ saveError }}</p>
              <p class="policy-desc">{{ p.description }}</p>
            </template>
          </div>

          <!-- Right: edit button -->
          <button
            v-if="editing !== p.key"
            class="edit-ghost-btn"
            @click="startEdit(p)"
          >
            แก้ไข
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api/axios'

interface Policy {
  key: string
  value: number | string
  description: string
}

const loading = ref(false)
const loadError = ref<string | null>(null)
const policies = ref<Policy[]>([])
const editing = ref<string | null>(null)
const editVal = ref('')
const saving = ref<string | null>(null)
const saveError = ref<string | null>(null)

function formatVal(key: string, val: number | string): string {
  const monetaryKeys = ['limit', 'threshold', 'min', 'max']
  const isMonetary = monetaryKeys.some((k) => key.includes(k))
  if (isMonetary) return `฿${Number(val).toLocaleString()}`
  return String(val)
}

function startEdit(p: Policy) {
  editing.value = p.key
  editVal.value = String(p.value)
}

async function save(p: Policy) {
  const raw = editVal.value.trim()
  const num = Number(raw)
  const val = !isNaN(num) && raw !== '' ? num : raw
  saving.value = p.key
  saveError.value = null
  try {
    await api.patch(`/admin/policies/${p.key}`, { value: val })
    p.value = val
    editing.value = null
    ElMessage.success('บันทึกสำเร็จ')
  } catch (e: unknown) {
    saveError.value = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'
    // p.value is NOT updated — keep the old value
  } finally {
    saving.value = null
  }
}

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    const { data } = await api.get('/admin/policies')
    policies.value = data.policies ?? []
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'โหลดนโยบายไม่สำเร็จ'
    policies.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.policies-view {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.policies-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

@media (min-width: 768px) {
  .policies-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Skeleton */
.policy-skeleton {
  height: 110px;
  border-radius: 16px;
  background: #E5E5EA;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Policy card */
.policy-card {
  padding: 18px 20px;
}

.policy-card-inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.policy-content {
  flex: 1;
  min-width: 0;
}

.policy-key {
  font-size: 11px;
  font-weight: 600;
  color: #AEAEB2;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  margin: 0 0 6px 0;
}

.policy-value {
  font-size: 36px;
  font-weight: 900;
  color: #1264E3;
  line-height: 1.05;
  letter-spacing: -1px;
  margin-bottom: 5px;
}

.policy-desc {
  font-size: 13px;
  color: #6E6E73;
  margin: 0;
  line-height: 1.4;
}

.policy-save-error {
  font-size: 12px;
  color: #FF3B30;
  margin: 0 0 4px 0;
}

/* Edit mode */
.edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.save-icon-btn,
.cancel-icon-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.save-icon-btn {
  background: rgba(52, 199, 89, 0.12);
}

.save-icon-btn:hover:not(:disabled) {
  background: rgba(52, 199, 89, 0.22);
}

.save-icon-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-icon-btn {
  background: rgba(255, 59, 48, 0.10);
}

.cancel-icon-btn:hover {
  background: rgba(255, 59, 48, 0.18);
}

/* Edit ghost button */
.edit-ghost-btn {
  flex-shrink: 0;
  height: 28px;
  padding: 0 14px;
  background: transparent;
  color: #1264E3;
  border: none;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.edit-ghost-btn:hover {
  background: rgba(18, 100, 227, 0.08);
}

/* Spinner animation */
.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
