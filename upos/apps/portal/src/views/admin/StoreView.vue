<template>
  <div style="display:flex;flex-direction:column;gap:20px">

    <!-- error banner -->
    <div v-if="error" style="padding:12px 16px;border-radius:8px;background:#FFF2F2;border:1px solid #FFCDD2;font-size:13px;color:#C62828">
      {{ error }}
    </div>

    <!-- ข้อมูลร้านค้า -->
    <div class="adm-table-wrap" style="padding:24px;border-radius:12px">
      <h3 style="font-size:16px;font-weight:500;color:var(--color-text-primary);margin-bottom:20px">ข้อมูลร้านค้า</h3>

      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- ชื่อร้านค้า -->
        <div class="store-field">
          <label class="store-label">ชื่อร้านค้า</label>
          <input v-model="form.name" class="store-input" placeholder="ชื่อร้านค้า" :disabled="loadingStore" />
        </div>

        <!-- ที่อยู่ร้านค้า -->
        <div class="store-field">
          <label class="store-label">ที่อยู่ร้านค้า</label>
          <textarea v-model="form.address" class="store-input store-textarea" placeholder="ที่อยู่ร้านค้า" :disabled="loadingStore" />
        </div>

        <!-- เลขประจำตัวผู้เสียภาษี -->
        <div class="store-field">
          <label class="store-label">เลขประจำตัวผู้เสียภาษี</label>
          <input v-model="form.taxId" class="store-input" placeholder="เลขประจำตัวผู้เสียภาษี 13 หลัก" maxlength="13" :disabled="loadingStore" />
        </div>

        <!-- Logo upload -->
        <div class="store-field">
          <label class="store-label">โลโก้ร้านค้า</label>
          <div
            class="store-dropzone"
            :class="{ 'store-dropzone--over': isDragOver, 'store-dropzone--has': !!logoFile }"
            @dragover.prevent="isDragOver = true"
            @dragleave="isDragOver = false"
            @drop.prevent="onDrop"
            @click="logoInput?.click()"
          >
            <div v-if="!logoFile" style="display:flex;flex-direction:column;align-items:center;gap:8px">
              <PhUploadSimple :size="28" style="color:var(--color-text-tertiary)" />
              <p style="font-size:14px;color:var(--color-text-secondary)">
                <span style="font-weight:500">Drag and drop</span> files
              </p>
              <p style="font-size:12px;color:var(--color-text-tertiary)">or click here</p>
            </div>
            <div v-else style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <PhImage :size="32" style="color:var(--color-primary)" />
              <p style="font-size:13px;font-weight:500;color:var(--color-primary)">{{ logoFile.name }}</p>
              <p style="font-size:11px;color:#AEAEB2">คลิกเพื่อเปลี่ยน</p>
            </div>
          </div>
          <input ref="logoInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />
        </div>

        <!-- Submit -->
        <div style="display:flex;justify-content:flex-end">
          <button
            class="adm-hdr-btn adm-hdr-btn-primary"
            style="height:40px;padding:0 28px;font-size:14px"
            :disabled="savingStore"
            @click="saveStore"
          >
            {{ savingStore ? 'กำลังบันทึก...' : 'ตกลง' }}
          </button>
        </div>
      </div>
    </div>

    <!-- รายการสาขา -->
    <div class="adm-table-wrap" style="border-radius:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 20px 16px">
        <h3 style="font-size:16px;font-weight:500;color:var(--color-text-primary)">รายการสาขา</h3>
        <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openAddBranch">
          <PhPlus :size="14" /> เพิ่มสาขา
        </button>
      </div>

      <!-- Controls -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 20px 12px;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--color-text-secondary)">
          Show
          <select v-model="pageSize" class="adm-filter-select" style="width:70px;height:32px">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
          entries
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--color-text-secondary)">
          Search:
          <input v-model="branchSearch" class="adm-filter-input" style="height:32px;width:180px" />
        </div>
      </div>

      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:80px">ลำดับ <PhCaretUpDown :size="10" style="vertical-align:middle;color:#AEAEB2" /></th>
            <th style="width:160px">รหัสสาขา <PhCaretUpDown :size="10" style="vertical-align:middle;color:#AEAEB2" /></th>
            <th>ชื่อสาขา <PhCaretUpDown :size="10" style="vertical-align:middle;color:#AEAEB2" /></th>
            <th class="center" style="width:100px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loadingBranches">
            <td colspan="4" class="center" style="padding:40px;color:#AEAEB2">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="filteredBranches.length === 0">
            <td colspan="4" class="center" style="padding:40px;color:#AEAEB2">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="(b, i) in paginatedBranches" :key="b.code">
            <td class="center num">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
            <td style="font-family:monospace;font-size:13px;color:var(--color-text-secondary)">{{ b.code }}</td>
            <td style="font-weight:500;color:var(--color-text-primary)">{{ b.name }}</td>
            <td class="center" style="display:flex;gap:6px;justify-content:center;align-items:center">
              <button class="adm-action-btn" title="แก้ไข" @click="editBranch(b)">
                <PhGear :size="14" />
              </button>
              <button class="adm-action-btn adm-action-btn-danger" title="ลบ" @click="confirmDeleteBranch(b)">
                <PhTrash :size="14" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;font-size:12px;color:var(--color-text-tertiary);border-top:1px solid var(--color-border-tertiary)">
        <span>Showing {{ showingFrom }} to {{ showingTo }} of {{ filteredBranches.length }} entries</span>
        <div style="display:flex;gap:4px">
          <button class="adm-page-btn" @click="currentPage = 1" :disabled="currentPage === 1">First</button>
          <button class="adm-page-btn" @click="currentPage--" :disabled="currentPage === 1">Previous</button>
          <button v-for="p in totalPages" :key="p" :class="['adm-page-btn', currentPage === p ? 'active' : '']" @click="currentPage = p">{{ p }}</button>
          <button class="adm-page-btn" @click="currentPage++" :disabled="currentPage === totalPages">Next</button>
          <button class="adm-page-btn" @click="currentPage = totalPages" :disabled="currentPage === totalPages">Last</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Branch Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showAddBranch" class="modal-backdrop-store" @click="showAddBranch = false" />
      </Transition>
      <Transition name="modal-up-store">
        <div v-if="showAddBranch" class="store-modal">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:16px;font-weight:500;color:var(--color-text-primary)">
              {{ editTarget ? 'แก้ไขสาขา' : 'เพิ่มสาขา' }}
            </h3>
            <button class="promo-close-btn" @click="showAddBranch = false">
              <PhX :size="18" weight="bold" />
            </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div class="store-field">
              <label class="store-label">รหัสสาขา</label>
              <input
                v-model="branchForm.code"
                class="store-input"
                placeholder="00000"
                maxlength="10"
                style="font-family:monospace"
                :disabled="!!editTarget"
              />
            </div>
            <div class="store-field">
              <label class="store-label">ชื่อสาขา</label>
              <input v-model="branchForm.name" class="store-input" placeholder="ชื่อสาขา" />
            </div>
          </div>
          <div v-if="branchError" style="margin-top:10px;font-size:12px;color:#C62828">{{ branchError }}</div>
          <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showAddBranch = false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="savingBranch" @click="saveBranch">
              {{ savingBranch ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhUploadSimple, PhImage, PhPlus, PhGear, PhCaretUpDown, PhX, PhTrash } from '@phosphor-icons/vue'
import {
  getStoreSettings,
  updateStoreSettings,
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from '@/api/settings'
import type { StoreSettings, Branch } from '@/api/types'

// ── Store settings ────────────────────────────────────────────────────────────

const form = ref<StoreSettings>({ name: '', address: '', taxId: '' })
const logoFile   = ref<File | null>(null)
const logoInput  = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const loadingStore = ref(false)
const savingStore  = ref(false)

// ── Branches ──────────────────────────────────────────────────────────────────

const branches      = ref<Branch[]>([])
const branchSearch  = ref('')
const pageSize      = ref(10)
const currentPage   = ref(1)
const showAddBranch = ref(false)
const editTarget    = ref<Branch | null>(null)
const branchForm    = ref<Branch>({ code: '', name: '' })
const loadingBranches = ref(false)
const savingBranch    = ref(false)

// ── Shared error ──────────────────────────────────────────────────────────────

const error       = ref('')
const branchError = ref('')

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  error.value = ''
  loadingStore.value    = true
  loadingBranches.value = true
  try {
    const [store, branchList] = await Promise.all([
      getStoreSettings(),
      listBranches(),
    ])
    form.value     = { ...store }
    branches.value = branchList
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loadingStore.value    = false
    loadingBranches.value = false
  }
})

// ── Computed ──────────────────────────────────────────────────────────────────

const filteredBranches = computed(() => {
  const q = branchSearch.value.toLowerCase()
  return branches.value.filter(b =>
    !q || b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)
  )
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredBranches.value.length / pageSize.value)))
const paginatedBranches = computed(() =>
  filteredBranches.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
)
const showingFrom = computed(() => filteredBranches.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1)
const showingTo   = computed(() => Math.min(currentPage.value * pageSize.value, filteredBranches.value.length))

// ── Logo handlers ─────────────────────────────────────────────────────────────

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f && f.type.startsWith('image/')) logoFile.value = f
}
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) logoFile.value = f
}

// ── Store save ────────────────────────────────────────────────────────────────

async function saveStore() {
  if (savingStore.value) return
  savingStore.value = true
  error.value = ''
  try {
    const updated = await updateStoreSettings({ ...form.value })
    form.value = { ...updated }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'
  } finally {
    savingStore.value = false
  }
}

// ── Branch handlers ───────────────────────────────────────────────────────────

function openAddBranch() {
  editTarget.value    = null
  branchForm.value    = { code: '', name: '' }
  branchError.value   = ''
  showAddBranch.value = true
}

function editBranch(b: Branch) {
  editTarget.value    = b
  branchForm.value    = { ...b }
  branchError.value   = ''
  showAddBranch.value = true
}

async function saveBranch() {
  if (!branchForm.value.code || !branchForm.value.name) {
    branchError.value = 'กรุณากรอกข้อมูลให้ครบ'
    return
  }
  if (savingBranch.value) return
  savingBranch.value = true
  branchError.value  = ''
  try {
    if (editTarget.value) {
      const updated = await updateBranch(editTarget.value.code, { name: branchForm.value.name })
      const idx = branches.value.findIndex(b => b.code === editTarget.value!.code)
      if (idx >= 0) branches.value[idx] = { ...updated }
    } else {
      const created = await createBranch({ ...branchForm.value })
      branches.value.push({ ...created })
    }
    showAddBranch.value = false
    editTarget.value    = null
    branchForm.value    = { code: '', name: '' }
  } catch (e: unknown) {
    branchError.value = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'
  } finally {
    savingBranch.value = false
  }
}

async function confirmDeleteBranch(b: Branch) {
  if (!window.confirm(`ลบสาขา "${b.name}" (${b.code})?`)) return
  error.value = ''
  try {
    await deleteBranch(b.code)
    branches.value = branches.value.filter(x => x.code !== b.code)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'ลบไม่สำเร็จ'
  }
}
</script>

<style scoped>
.store-field { display: flex; flex-direction: column; gap: 5px; }
.store-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 400;
}
.store-input {
  width: 100%; padding: 9px 12px; border-radius: 8px;
  border: 1px solid var(--color-border-tertiary);
  font-size: 14px; color: var(--color-text-primary);
  outline: none; font-family: inherit; background: #fff;
  transition: border-color 0.15s;
}
.store-input:focus { border-color: var(--color-primary); }
.store-input:disabled { background: #F5F5F5; color: #AEAEB2; cursor: not-allowed; }
.store-textarea { min-height: 88px; resize: vertical; line-height: 1.5; }

.store-dropzone {
  border: 2px dashed #D0D0D0; border-radius: 10px;
  background: #FAFAFA; padding: 40px 24px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: border-color 0.15s, background 0.15s;
  min-height: 130px;
}
.store-dropzone:hover, .store-dropzone--over {
  border-color: var(--color-primary); background: var(--color-primary-tint);
}
.store-dropzone--has { border-color: var(--color-success); background: var(--color-success-bg); }

.store-modal {
  position: fixed; top: 50%; left: 50%; z-index: 51;
  transform: translate(-50%, -50%);
  background: #fff; border-radius: 14px;
  width: calc(100vw - 48px); max-width: 400px;
  padding: 24px; box-shadow: 0 16px 48px rgba(0,0,0,0.14);
}
.modal-backdrop-store {
  position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4);
}
.promo-close-btn {
  background: none; border: none; cursor: pointer; color: #8E8E93;
  padding: 4px; border-radius: 6px; display: flex; align-items: center;
}
.promo-close-btn:hover { background: #F2F2F7; }

.adm-action-btn-danger { color: #C62828; }
.adm-action-btn-danger:hover { background: #FFF2F2; }

.modal-bg-enter-active, .modal-bg-leave-active { transition: opacity 0.2s; }
.modal-bg-enter-from, .modal-bg-leave-to       { opacity: 0; }
.modal-up-store-enter-active, .modal-up-store-leave-active { transition: opacity 0.25s, transform 0.25s; }
.modal-up-store-enter-from, .modal-up-store-leave-to       { opacity: 0; transform: translate(-50%, -48%); }
</style>
