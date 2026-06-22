<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">รายการอุปกรณ์</h2>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click.stop="openCreate">
        <PhPlus :size="14" /> เพิ่มอุปกรณ์
      </button>
    </div>

    <!-- Search -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="dev-search-wrap">
        <PhMagnifyingGlass :size="15" style="color:var(--color-text-tertiary);flex-shrink:0" />
        <input v-model="search" class="dev-search" placeholder="ค้นหารหัสอุปกรณ์ / ชื่ออุปกรณ์ / สาขา..." @input="currentPage=1" />
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap" style="border-radius:12px">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:64px">ลำดับ</th>
            <th>ชื่อสาขา</th>
            <th>รหัสอุปกรณ์</th>
            <th>ชื่ออุปกรณ์</th>
            <th class="center" style="width:120px">แสดง</th>
            <th class="center" style="width:100px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="center" style="padding:40px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="loadError">
            <td colspan="6" class="center" style="padding:40px;color:var(--color-danger)">{{ loadError }}</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="6" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="(d, i) in paginated" v-else :key="d._id">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td style="color:var(--color-primary);font-weight:500">{{ branchName(d.branchCode) }}</td>
            <td><span class="adm-code">{{ d.deviceId }}</span></td>
            <td style="font-weight:500;color:var(--color-text-primary)">{{ d.name }}</td>
            <td class="center">
              <span :class="['adm-badge', isActive(d) ? 'adm-badge-success' : 'adm-badge-voided']">
                {{ isActive(d) ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(d)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="confirmDelete(d)">
                  <PhTrash :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="adm-pagination">
        <div class="adm-pagination-left">
          <span>ทั้งหมด {{ filtered.length }} รายการ</span>
          <span class="adm-pagination-sep">|</span>
          <span>แสดงผล</span>
          <select v-model="pageSize" class="adm-page-size" @change="currentPage=1">
            <option :value="10">10 รายการ</option>
            <option :value="25">25 รายการ</option>
            <option :value="50">50 รายการ</option>
          </select>
        </div>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage===1" @click="currentPage--">‹</button>
          <button v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage===p?'active':'']"
            @click="currentPage=p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage===totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showModal" class="k-backdrop" @click="showModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showModal" class="k-modal" @click.stop>
          <h3 class="k-modal-title">{{ editTarget ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล' }}</h3>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:18px">
            <div class="k-field">
              <label class="k-label">รหัสอุปกรณ์</label>
              <input v-model="form.deviceId" class="k-input" placeholder="กรุณาระบุรหัสอุปกรณ์" :disabled="!!editTarget" />
            </div>
            <div class="k-field">
              <label class="k-label">ชื่ออุปกรณ์</label>
              <input v-model="form.name" class="k-input" placeholder="เช่น Kiosk 1, POS Counter 1" />
            </div>
            <div class="k-field">
              <label class="k-label">สาขา</label>
              <select v-model="form.branchCode" class="k-input">
                <option value="">-- เลือกสาขา --</option>
                <option v-for="b in branches" :key="b.code" :value="b.code">{{ b.name }}</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <button
                type="button"
                :class="['dev-toggle', form.active ? 'dev-toggle-on' : '']"
                @click="form.active = !form.active"
              >
                <span class="dev-toggle-thumb" />
              </button>
              <span style="font-size:13px;color:var(--color-text-primary)">{{ form.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}</span>
            </div>
            <p v-if="saveError" style="font-size:12px;color:var(--color-danger);margin:0">{{ saveError }}</p>
          </div>
          <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="saving" @click="showModal=false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!form.deviceId||!form.name||!form.branchCode||saving" @click="save">
              {{ saving ? 'กำลังบันทึก...' : 'ตกลง' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="deleteTarget" class="k-backdrop" @click="deleteTarget=null" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="deleteTarget" class="k-modal" @click.stop>
          <h3 class="k-modal-title">ยืนยันการลบ</h3>
          <p style="font-size:14px;color:var(--color-text-secondary);margin-top:12px">
            ต้องการลบอุปกรณ์ <strong style="color:var(--color-text-primary)">{{ deleteTarget.name }}</strong> ใช่หรือไม่?
          </p>
          <p v-if="deleteError" style="font-size:12px;color:var(--color-danger);margin-top:8px">{{ deleteError }}</p>
          <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="deleting" @click="deleteTarget=null">ยกเลิก</button>
            <button class="adm-hdr-btn" style="background:#FF5252;color:#fff" :disabled="deleting" @click="doDelete">
              {{ deleting ? 'กำลังลบ...' : 'ลบ' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhPencilSimple, PhTrash, PhMagnifyingGlass } from '@phosphor-icons/vue'
import { listDevices, createDevice, updateDevice, deleteDevice, listBranches } from '../../api/device'
import type { Device, Branch } from '../../api/device'

// ── State ──────────────────────────────────────────────────────────────────────

const devices    = ref<Device[]>([])
const branches   = ref<Branch[]>([])
const loading    = ref(false)
const loadError  = ref<string | null>(null)

// ── Bootstrap ──────────────────────────────────────────────────────────────────

async function fetchAll() {
  loading.value = true
  loadError.value = null
  try {
    const [devs, brs] = await Promise.all([listDevices(), listBranches()])
    devices.value  = devs
    branches.value = brs
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)

// ── Helpers ────────────────────────────────────────────────────────────────────

function isActive(d: Device): boolean {
  return d.status !== 'inactive' && d.status !== 'disabled'
}

function branchName(code?: string): string {
  if (!code) return '-'
  return branches.value.find(b => b.code === code)?.name ?? code
}

// ── Search / pagination ────────────────────────────────────────────────────────

const search      = ref('')
const pageSize    = ref(10)
const currentPage = ref(1)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return devices.value.filter(d =>
    !q ||
    d.deviceId.toLowerCase().includes(q) ||
    d.name.toLowerCase().includes(q) ||
    (d.branchCode ?? '').toLowerCase().includes(q) ||
    branchName(d.branchCode).toLowerCase().includes(q)
  )
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() =>
  filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value)
)

// ── Modal ──────────────────────────────────────────────────────────────────────

const showModal  = ref(false)
const editTarget = ref<Device | null>(null)
const form       = ref({ deviceId: '', name: '', branchCode: '', active: true })
const saving     = ref(false)
const saveError  = ref<string | null>(null)

function openCreate() {
  editTarget.value = null
  form.value = { deviceId: '', name: '', branchCode: '', active: true }
  saveError.value = null
  showModal.value = true
}

function openEdit(d: Device) {
  editTarget.value = d
  form.value = {
    deviceId:   d.deviceId,
    name:       d.name,
    branchCode: d.branchCode ?? '',
    active:     isActive(d),
  }
  saveError.value = null
  showModal.value = true
}

async function save() {
  if (!form.value.deviceId || !form.value.name || !form.value.branchCode) return
  saving.value = true
  saveError.value = null
  try {
    const status = form.value.active ? 'active' : 'inactive'
    if (editTarget.value) {
      const updated = await updateDevice(editTarget.value._id, {
        name:       form.value.name,
        branchCode: form.value.branchCode,
        status,
      })
      const idx = devices.value.findIndex(d => d._id === editTarget.value!._id)
      if (idx >= 0) devices.value[idx] = updated
    } else {
      const created = await createDevice({
        deviceId:   form.value.deviceId,
        name:       form.value.name,
        branchCode: form.value.branchCode,
        status,
      })
      devices.value.push(created)
    }
    showModal.value = false
  } catch (e: unknown) {
    saveError.value = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────────

const deleteTarget = ref<Device | null>(null)
const deleting     = ref(false)
const deleteError  = ref<string | null>(null)

function confirmDelete(d: Device) {
  deleteTarget.value = d
  deleteError.value = null
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await deleteDevice(deleteTarget.value._id)
    devices.value = devices.value.filter(d => d._id !== deleteTarget.value!._id)
    deleteTarget.value = null
  } catch (e: unknown) {
    deleteError.value = e instanceof Error ? e.message : 'ลบไม่สำเร็จ'
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
/* Search */
.dev-search-wrap { display:flex;align-items:center;gap:8px;border:1px solid var(--color-border-tertiary);border-radius:8px;padding:0 12px;height:38px;background:#fff; }
.dev-search { border:none;outline:none;flex:1;font-size:13px;color:var(--color-text-primary);background:transparent;font-family:inherit; }
.dev-search::placeholder { color:var(--color-text-tertiary); }

/* Toggle — matches BuffetRoundsView: 44×24px, knob 20×20px */
.dev-toggle { width:44px;height:24px;border-radius:100px;border:none;cursor:pointer;background:#D1D1D6;position:relative;padding:0;transition:background 0.2s;flex-shrink:0; }
.dev-toggle-on { background:var(--color-primary); }
.dev-toggle-thumb { width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2); }
.dev-toggle-on .dev-toggle-thumb { transform:translateX(20px); }

/* Modal */
.k-backdrop { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4); }
.k-modal { position:fixed;top:50%;left:50%;z-index:201;transform:translate(-50%,-50%);background:#fff;border-radius:14px;width:calc(100vw - 48px);max-width:420px;padding:24px;box-shadow:0 16px 48px rgba(0,0,0,0.14); }
.k-modal-title { font-size:16px;font-weight:500;color:var(--color-text-primary); }
.k-field { display:flex;flex-direction:column;gap:6px; }
.k-label { font-size:12px;color:var(--color-text-secondary); }
.k-input { height:42px;padding:0 12px;border-radius:8px;border:1.5px solid #D0D0D0;font-size:14px;color:var(--color-text-primary);outline:none;font-family:inherit;background:#fff;transition:border-color 0.15s;width:100%;box-sizing:border-box; }
.k-input:focus    { border-color:var(--color-primary); }
.k-input:disabled { background:var(--color-bg-secondary);color:var(--color-text-tertiary); }

.modal-bg-enter-active,.modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,.modal-bg-leave-to { opacity:0; }
.modal-up-enter-active,.modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,.modal-up-leave-to { opacity:0;transform:translate(-50%,-48%); }
</style>
