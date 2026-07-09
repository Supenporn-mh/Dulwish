<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">จัดการเหตุผลการยกเลิก</h2>
        <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">กำหนด shortcut เหตุผลที่แสดงใน dropdown ตอนยกเลิกการจอง</p>
      </div>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openCreate">
        <PhPlus :size="14" /> เพิ่มเหตุผล
      </button>
    </div>

    <!-- Info note -->
    <div style="display:flex;align-items:flex-start;gap:8px;background:var(--color-accent-bg);color:var(--color-accent);border-radius:8px;padding:10px 14px;font-size:12px;line-height:1.6">
      <PhInfo :size="16" weight="fill" style="flex-shrink:0;margin-top:1px" />
      <span>ลากเพื่อเรียงลำดับ · เหตุผลที่เคยถูกใช้แล้วจะซ่อนจาก dropdown แต่ยังแสดงในประวัติ · อื่นๆ ลบไม่ได้</span>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th style="width:36px"></th>
            <th class="center" style="width:50px">#</th>
            <th>เหตุผล</th>
            <th class="center" style="width:100px">ถูกใช้</th>
            <th class="center" style="width:90px">เปิดใช้งาน</th>
            <th style="width:120px">อัปเดตเมื่อ</th>
            <th class="center" style="width:90px">ดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="center" style="padding:40px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="7" class="center" style="padding:40px;color:var(--color-danger)">{{ error }}</td>
          </tr>
          <tr v-else-if="reasons.length === 0">
            <td colspan="7" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <tr
            v-for="(r, i) in reasons" v-else :key="r.id"
            :style="r.hiddenAt ? 'opacity:0.6' : ''"
            draggable="true"
            @dragstart="onDragStart(i)"
            @dragover.prevent
            @drop="onDrop(i)"
          >
            <td class="center">
              <PhDotsSixVertical :size="16" style="color:var(--color-text-tertiary);cursor:grab" />
            </td>
            <td class="num center">{{ i + 1 }}</td>
            <td>
              <span style="font-size:13px;font-weight:500;color:var(--color-text-primary)">{{ r.label }}</span>
              <span
                v-if="r.isDefault"
                class="adm-badge"
                style="background:var(--color-muted-bg);color:var(--color-muted);margin-left:8px;display:inline-flex;align-items:center;gap:4px"
              >
                <PhLock :size="10" /> ค่าเริ่มต้น
              </span>
            </td>
            <td class="center">
              <span
                v-if="r.usedCount > 0"
                class="adm-badge"
                style="background:var(--color-success-bg);color:var(--color-success);display:inline-flex;align-items:center;gap:4px"
              >
                <PhCheck :size="10" /> {{ r.usedCount }} ครั้ง
              </span>
              <span v-else class="adm-badge" style="background:var(--color-muted-bg);color:var(--color-muted)">0 ครั้ง</span>
            </td>
            <td class="center">
              <button
                :class="['adm-toggle', !r.hiddenAt ? 'on' : '']"
                :disabled="r.isDefault || savingId === r.id"
                :style="r.isDefault ? 'opacity:0.4;cursor:not-allowed' : ''"
                @click="toggleActive(r)"
              />
            </td>
            <td style="color:var(--color-text-secondary);font-size:12px">
              {{ r.isDefault ? '—' : formatDDMMYYYY(r.updatedAt) }}
            </td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" :disabled="r.isDefault" @click="openEdit(r)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" :disabled="r.isDefault || r.usedCount > 0" @click="openDeleteConfirm(r)">
                  <PhTrash :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add / Edit modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showModal" class="crv-backdrop" @click="closeModal" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showModal" class="crv-modal" role="dialog" aria-modal="true">
          <div class="crv-modal-header">
            <div class="crv-header-left">
              <div class="crv-icon-circle">
                <component :is="editTarget ? PhPencilSimple : PhTag" :size="20" weight="bold" />
              </div>
              <div>
                <h3 class="crv-modal-title">{{ editTarget ? 'แก้ไขเหตุผลการยกเลิก' : 'เพิ่มเหตุผลการยกเลิก' }}</h3>
                <p class="crv-modal-sub">แสดงใน dropdown ตอนยกเลิกการจอง</p>
              </div>
            </div>
            <button class="crv-close" :disabled="saving" @click="closeModal">
              <PhX :size="18" weight="bold" />
            </button>
          </div>
          <div class="crv-divider" />

          <div class="crv-body">
            <div class="crv-field">
              <label class="crv-label">เหตุผล <span style="color:var(--color-danger)">*</span></label>
              <input
                v-model="form.label"
                class="crv-input"
                maxlength="100"
                :disabled="saving"
                placeholder="เช่น โรงเรียนหยุดกะทันหัน"
              />
              <p class="crv-hint" style="text-align:right">{{ form.label.length }} / 100</p>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between">
              <div>
                <div style="font-size:13px;color:var(--color-text-primary)">เปิดใช้งาน</div>
                <div class="crv-hint">แสดงใน dropdown ตอนยกเลิก</div>
              </div>
              <button
                :class="['adm-toggle', form.active ? 'on' : '']"
                :disabled="saving"
                @click="form.active = !form.active"
              />
            </div>
            <p v-if="formError" class="crv-error">{{ formError }}</p>
          </div>

          <div class="crv-divider" />
          <div class="crv-footer">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="saving" @click="closeModal">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!canSubmit || saving" @click="submitForm">
              <PhFloppyDisk :size="14" /> {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="deleteTarget" class="crv-backdrop" @click="closeDeleteConfirm" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="deleteTarget" class="crv-modal" role="dialog" aria-modal="true">
          <div class="crv-modal-header">
            <div class="crv-header-left">
              <div class="crv-icon-circle" style="background:var(--color-danger-bg);color:var(--color-danger)">
                <PhTrash :size="20" weight="bold" />
              </div>
              <div>
                <h3 class="crv-modal-title">ลบเหตุผล</h3>
                <p class="crv-modal-sub">ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <button class="crv-close" :disabled="saving" @click="closeDeleteConfirm">
              <PhX :size="18" weight="bold" />
            </button>
          </div>
          <div class="crv-divider" />

          <div class="crv-body">
            <p style="font-size:14px;color:var(--color-text-primary)">
              ต้องการลบเหตุผล <strong>{{ deleteTarget.label }}</strong> ออกจากระบบ?
            </p>
            <div class="crv-danger-box">
              <PhWarning :size="16" weight="fill" style="color:var(--color-danger);flex-shrink:0" />
              <span>เหตุผลนี้ยังไม่เคยถูกใช้ จึงสามารถลบได้ถาวร</span>
            </div>
            <p v-if="formError" class="crv-error">{{ formError }}</p>
          </div>

          <div class="crv-divider" />
          <div class="crv-footer">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="saving" @click="closeDeleteConfirm">ยกเลิก</button>
            <button class="adm-hdr-btn crv-danger-btn" :disabled="saving" @click="confirmDelete">
              <PhTrash :size="14" /> {{ saving ? 'กำลังลบ...' : 'ลบถาวร' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  PhPlus, PhInfo, PhDotsSixVertical, PhLock, PhCheck,
  PhPencilSimple, PhTrash, PhTag, PhX, PhFloppyDisk, PhWarning,
} from '@phosphor-icons/vue'
import api from '../../../api/axios'

interface CancelReason {
  id: string
  label: string
  sortOrder: number
  isDefault: boolean
  usedCount: number
  hiddenAt: string | null
  updatedAt: string
}

const reasons = ref<CancelReason[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const savingId = ref<string | null>(null)

async function fetchReasons() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/booking/cancel-reasons')
    reasons.value = (data.reasons ?? []).slice().sort((a: CancelReason, b: CancelReason) => a.sortOrder - b.sortOrder)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

// ── Drag reorder ──────────────────────────────────────────────────────────────

const dragIndex = ref<number | null>(null)

function onDragStart(i: number) {
  dragIndex.value = i
}

async function onDrop(targetIndex: number) {
  const from = dragIndex.value
  dragIndex.value = null
  if (from === null || from === targetIndex) return

  const list = reasons.value.slice()
  const [moved] = list.splice(from, 1)
  list.splice(targetIndex, 0, moved)

  const changed: CancelReason[] = []
  list.forEach((r, idx) => {
    if (r.sortOrder !== idx) {
      r.sortOrder = idx
      changed.push(r)
    }
  })
  reasons.value = list

  try {
    await Promise.all(changed.map(r => api.patch(`/booking/cancel-reasons/${r.id}`, { sortOrder: r.sortOrder })))
  } catch {
    fetchReasons()
  }
}

// ── Toggle active/hidden ──────────────────────────────────────────────────────

async function toggleActive(r: CancelReason) {
  if (r.isDefault || savingId.value === r.id) return
  savingId.value = r.id
  const nextHiddenAt = r.hiddenAt ? null : new Date().toISOString()
  try {
    const { data } = await api.patch(`/booking/cancel-reasons/${r.id}`, { hiddenAt: nextHiddenAt })
    const idx = reasons.value.findIndex(x => x.id === r.id)
    if (idx !== -1) reasons.value[idx] = { ...reasons.value[idx], ...data.reason }
  } catch {
    // leave state unchanged on failure
  } finally {
    savingId.value = null
  }
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────

const showModal = ref(false)
const editTarget = ref<CancelReason | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const form = ref({ label: '', active: true })

const canSubmit = computed(() => form.value.label.trim().length > 0 && form.value.label.length <= 100)

function openCreate() {
  editTarget.value = null
  form.value = { label: '', active: true }
  formError.value = null
  showModal.value = true
}

function openEdit(r: CancelReason) {
  editTarget.value = r
  form.value = { label: r.label, active: !r.hiddenAt }
  formError.value = null
  showModal.value = true
}

function closeModal() {
  if (saving.value) return
  showModal.value = false
}

async function submitForm() {
  if (!canSubmit.value || saving.value) return
  saving.value = true
  formError.value = null
  try {
    if (editTarget.value) {
      const { data } = await api.patch(`/booking/cancel-reasons/${editTarget.value.id}`, {
        label: form.value.label.trim(),
        hiddenAt: form.value.active ? null : new Date().toISOString(),
      })
      const idx = reasons.value.findIndex(x => x.id === editTarget.value!.id)
      if (idx !== -1) reasons.value[idx] = { ...reasons.value[idx], ...data.reason }
    } else {
      const { data } = await api.post('/booking/cancel-reasons', { label: form.value.label.trim() })
      let created = data.reason as CancelReason
      if (!form.value.active) {
        const { data: patched } = await api.patch(`/booking/cancel-reasons/${created.id}`, { hiddenAt: new Date().toISOString() })
        created = { ...created, ...patched.reason }
      }
      reasons.value.push(created)
    }
    showModal.value = false
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

// ── Delete confirm ────────────────────────────────────────────────────────────

const deleteTarget = ref<CancelReason | null>(null)

function openDeleteConfirm(r: CancelReason) {
  deleteTarget.value = r
  formError.value = null
}

function closeDeleteConfirm() {
  if (saving.value) return
  deleteTarget.value = null
}

async function confirmDelete() {
  if (!deleteTarget.value || saving.value) return
  saving.value = true
  formError.value = null
  try {
    await api.delete(`/booking/cancel-reasons/${deleteTarget.value.id}`)
    reasons.value = reasons.value.filter(r => r.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'ลบไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

// ── Display helpers ───────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0')
function formatDDMMYYYY(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

onMounted(fetchReasons)
</script>

<style scoped>
.crv-backdrop { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.4); }
.crv-modal {
  position:fixed; top:50%; left:50%; z-index:201; transform:translate(-50%,-50%);
  background:#fff; border-radius:14px; width:calc(100vw - 48px); max-width:440px;
  box-shadow:0 16px 48px rgba(0,0,0,0.16); overflow:hidden;
  display:flex; flex-direction:column; max-height:calc(100vh - 48px);
}
.crv-modal-header { display:flex; justify-content:space-between; align-items:flex-start; padding:20px 24px 16px; }
.crv-header-left { display:flex; align-items:flex-start; gap:12px; }
.crv-icon-circle {
  width:38px; height:38px; border-radius:50%; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  background:var(--color-accent-bg); color:var(--color-accent);
}
.crv-modal-title { font-size:17px; font-weight:500; color:var(--color-text-primary); }
.crv-modal-sub { font-size:12px; color:var(--color-text-tertiary); margin-top:2px; }
.crv-close { background:none; border:none; cursor:pointer; color:var(--color-text-tertiary); padding:4px; border-radius:6px; display:flex; align-items:center; }
.crv-close:hover:not(:disabled) { background:#F2F2F7; }
.crv-close:disabled { opacity:0.4; cursor:not-allowed; }
.crv-divider { height:1px; background:var(--color-border-tertiary); flex-shrink:0; }
.crv-body { padding:20px 24px; display:flex; flex-direction:column; gap:16px; overflow-y:auto; }

.crv-field { display:flex; flex-direction:column; gap:5px; }
.crv-label { font-size:12px; color:var(--color-text-secondary); }
.crv-input {
  height:42px; padding:0 12px; border-radius:8px;
  border:1.5px solid #D0D0D0; font-size:14px; color:var(--color-text-primary);
  outline:none; font-family:inherit; background:#fff; width:100%; box-sizing:border-box;
  transition:border-color 0.15s;
}
.crv-input:focus { border-color:var(--color-primary); }
.crv-input:disabled { background:#F5F5F5; cursor:not-allowed; }
.crv-hint { font-size:11px; color:var(--color-text-tertiary); }
.crv-error { font-size:12px; color:var(--color-danger); }

.crv-danger-box {
  display:flex; align-items:flex-start; gap:8px;
  background:var(--color-danger-bg); border-radius:10px; padding:12px 14px;
  font-size:12px; color:var(--color-text-primary); line-height:1.5;
}

.crv-footer { display:flex; gap:10px; padding:16px 24px; justify-content:flex-end; flex-shrink:0; }

.crv-danger-btn { display:inline-flex; align-items:center; gap:6px; background:var(--color-danger); color:#fff; }
.crv-danger-btn:hover:not(:disabled) { opacity:0.9; }
.crv-danger-btn:disabled { opacity:0.4; cursor:not-allowed; }

.adm-action-btn:disabled { opacity:0.4; cursor:not-allowed; pointer-events:none; }

.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity:0; transform:translate(-50%,-48%); }
</style>
