<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">รายการ Panel</h2>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click.stop="openCreate">
        <PhPlus :size="14" /> เพิ่ม Panel
      </button>
    </div>

    <!-- Branch filter -->
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--color-text-secondary)">เลือกสาขา</span>
      <select v-model="branchFilter" class="pnl-select" style="min-width:180px" @change="currentPage = 1">
        <option value="">ทั้งหมด</option>
        <option v-for="b in branches" :key="b.code" :value="b.code">{{ b.name }}</option>
      </select>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap" style="border-radius:12px">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:64px">ลำดับ</th>
            <th>Panel</th>
            <th style="width:180px">สาขา</th>
            <th class="center" style="width:140px">รูปภาพ</th>
            <th class="center" style="width:120px">สถานะ</th>
            <th class="center" style="width:100px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="center" style="padding:40px">
              <div class="pnl-spinner" />
            </td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="6" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="(p, i) in paginated" :key="p.id">
            <td class="num center">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
            <td style="font-weight:500;color:var(--color-text-primary)">{{ p.name }}</td>
            <td style="color:var(--color-text-secondary)">{{ branchName(p.branch) }}</td>
            <td class="center">
              <img v-if="p.imageBase64" :src="p.imageBase64" class="pnl-thumb" />
              <span v-else style="color:var(--color-text-tertiary);font-size:12px">ไม่มีรูป</span>
            </td>
            <td class="center">
              <span :class="['adm-badge', p.isVisible ? 'adm-badge-success' : 'adm-badge-voided']">
                {{ p.isVisible ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(p)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="confirmDelete(p)">
                  <PhTrash :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="adm-pagination">
        <div class="adm-pagination-left">
          <span>ทั้งหมด {{ filtered.length }} รายการ</span>
          <span class="adm-pagination-sep">|</span>
          <span>แสดงผล</span>
          <select v-model="pageSize" class="adm-page-size" @change="currentPage = 1">
            <option :value="10">10 รายการ</option>
            <option :value="25">25 รายการ</option>
            <option :value="50">50 รายการ</option>
          </select>
        </div>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>
          <button
            v-for="pg in totalPages" :key="pg"
            :class="['adm-page-btn', currentPage === pg ? 'active' : '']"
            @click="currentPage = pg"
          >{{ pg }}</button>
          <button class="adm-page-btn" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showModal" class="k-backdrop" @click="showModal = false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showModal" class="k-modal pnl-modal" @click.stop>
          <h3 class="k-modal-title">{{ editTarget ? 'แก้ไขหน้าจอ' : 'เพิ่มหน้าจอ' }}</h3>

          <div style="display:flex;flex-direction:column;gap:16px;margin-top:18px">

            <!-- Row 1: ชื่อ + สาขา -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="k-field">
                <label class="k-label">ชื่อหน้าจอ <span style="color:#FF5252">*</span></label>
                <input v-model="form.name" class="k-input" placeholder="ระบุชื่อหน้าจอ" />
              </div>
              <div class="k-field">
                <label class="k-label">สาขา <span style="color:#FF5252">*</span></label>
                <select v-model="form.branch" class="k-input">
                  <option value="">-- เลือกสาขา --</option>
                  <option v-for="b in branches" :key="b.code" :value="b.code">{{ b.name }}</option>
                </select>
              </div>
            </div>

            <!-- Product selector -->
            <div style="display:flex;align-items:flex-end;gap:8px">
              <div class="k-field" style="flex:1">
                <label class="k-label">สินค้า</label>
                <select v-model="selectedProductId" class="k-input">
                  <option value="">-- เลือกสินค้า --</option>
                  <option
                    v-for="p in availableProducts"
                    :key="p.id"
                    :value="p.id"
                  >{{ p.name }}</option>
                </select>
              </div>
              <button
                type="button"
                class="adm-hdr-btn adm-hdr-btn-primary"
                style="height:42px;padding:0 14px;flex-shrink:0"
                :disabled="!selectedProductId"
                @click="addItem"
              >
                <PhPlus :size="14" />
              </button>
            </div>

            <!-- Items table -->
            <div v-if="form.items.length > 0" class="pnl-items-wrap">
              <table class="pnl-items-table">
                <thead>
                  <tr>
                    <th>ชื่อสินค้า</th>
                    <th class="center" style="width:100px">สีตัวอักษร</th>
                    <th class="center" style="width:100px">สีพื้นหลัง</th>
                    <th class="center" style="width:60px">ลบ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in form.items" :key="item.productId">
                    <td style="font-size:13px">{{ item.productName }}</td>
                    <td class="center">
                      <input type="color" v-model="item.textColor" class="pnl-color-input" />
                    </td>
                    <td class="center">
                      <input type="color" v-model="item.bgColor" class="pnl-color-input" />
                    </td>
                    <td class="center">
                      <button type="button" class="adm-action-btn danger" @click="removeItem(idx)">
                        <PhTrash :size="13" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Image upload -->
            <div class="k-field">
              <label class="k-label">รูปภาพหน้าจอ</label>
              <div
                class="pnl-upload-zone"
                :class="{ 'pnl-upload-zone--drag': isDragging }"
                @dragover.prevent="isDragging = true"
                @dragleave="isDragging = false"
                @drop.prevent="onDrop"
                @click="(fileInput as HTMLInputElement)?.click()"
              >
                <img v-if="form.imageBase64" :src="form.imageBase64" class="pnl-img-preview" />
                <template v-else>
                  <PhCloudArrowUp :size="28" style="color:var(--color-text-tertiary)" />
                  <span style="font-size:13px;color:var(--color-text-secondary);margin-top:6px">Drag and drop file here</span>
                  <span style="font-size:12px;color:var(--color-text-tertiary)">or</span>
                  <span class="pnl-browse-btn">Browse Files</span>
                </template>
              </div>
              <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />
            </div>

            <!-- เปิด/ปิดใช้งาน toggle -->
            <div style="display:flex;align-items:center;gap:10px">
              <button
                type="button"
                :class="['pnl-toggle', form.isVisible ? 'pnl-toggle-on' : '']"
                @click="form.isVisible = !form.isVisible"
              >
                <span class="pnl-toggle-thumb" />
              </button>
              <span style="font-size:13px;color:var(--color-text-primary)">
                {{ form.isVisible ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </div>

          </div>

          <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showModal = false">ยกเลิก</button>
            <button
              class="adm-hdr-btn adm-hdr-btn-primary"
              :disabled="!form.name || !form.branch || saving"
              @click="save"
            >{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="deleteTarget" class="k-backdrop" @click="deleteTarget = null" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="deleteTarget" class="k-modal" @click.stop>
          <h3 class="k-modal-title">ยืนยันการลบ</h3>
          <p style="font-size:14px;color:var(--color-text-secondary);margin-top:12px">
            ต้องการลบ Panel <strong style="color:var(--color-text-primary)">{{ deleteTarget.name }}</strong> ใช่หรือไม่?
          </p>
          <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="deleteTarget = null">ยกเลิก</button>
            <button class="adm-hdr-btn" style="background:#FF5252;color:#fff" :disabled="saving" @click="doDelete">ลบ</button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhPencilSimple, PhTrash, PhCloudArrowUp } from '@phosphor-icons/vue'
import { listPanels, createPanel, updatePanel, deletePanel } from '@/api/panel'
import type { Panel, PanelItem } from '@/api/panel'
import { listBranches } from '@/api/settings'
import { listProducts } from '@/api/products'
import type { Branch } from '@/api/types'
import type { Product } from '@/api/types'

const panels       = ref<Panel[]>([])
const branches     = ref<Branch[]>([])
const products     = ref<Product[]>([])
const loading      = ref(true)
const saving       = ref(false)
const branchFilter = ref('')
const pageSize     = ref(10)
const currentPage  = ref(1)
const showModal    = ref(false)
const editTarget   = ref<Panel | null>(null)
const deleteTarget = ref<Panel | null>(null)

const selectedProductId = ref('')
const isDragging        = ref(false)
const fileInput         = ref<HTMLInputElement | null>(null)

const form = ref<{ name: string; branch: string; isVisible: boolean; imageBase64: string; items: PanelItem[] }>({
  name: '', branch: '', isVisible: true, imageBase64: '', items: [],
})

const filtered = computed(() =>
  branchFilter.value
    ? panels.value.filter(p => p.branch === branchFilter.value)
    : panels.value
)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() =>
  filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
)

const availableProducts = computed(() =>
  products.value.filter(p => !form.value.items.some(i => i.productId === p.id))
)

onMounted(async () => {
  loading.value = true
  try {
    const [p, b, pr] = await Promise.all([listPanels(), listBranches(), listProducts()])
    panels.value   = p
    branches.value = b
    products.value = pr
  } finally {
    loading.value = false
  }
})

function branchName(code: string) {
  return branches.value.find(b => b.code === code)?.name ?? code
}

function openCreate() {
  editTarget.value = null
  form.value = { name: '', branch: '', isVisible: true, imageBase64: '', items: [] }
  selectedProductId.value = ''
  showModal.value = true
}

function openEdit(p: Panel) {
  editTarget.value = p
  form.value = {
    name:        p.name,
    branch:      p.branch,
    isVisible:   p.isVisible,
    imageBase64: p.imageBase64 ?? '',
    items:       p.items.map(i => ({ ...i })),
  }
  selectedProductId.value = ''
  showModal.value = true
}

function addItem() {
  const product = products.value.find(p => p.id === selectedProductId.value)
  if (!product) return
  form.value.items.push({
    productId:   product.id,
    productName: product.name,
    textColor:   '#000000',
    bgColor:     '#FFFFFF',
  })
  selectedProductId.value = ''
}

function removeItem(idx: number) {
  form.value.items.splice(idx, 1)
}

async function save() {
  if (!form.value.name || !form.value.branch) return
  saving.value = true
  try {
    const payload = {
      name:        form.value.name,
      branch:      form.value.branch,
      isVisible:   form.value.isVisible,
      imageBase64: form.value.imageBase64 || undefined,
      items:       form.value.items,
    }
    if (editTarget.value) {
      const updated = await updatePanel(editTarget.value.id, payload)
      const idx = panels.value.findIndex(p => p.id === editTarget.value!.id)
      if (idx >= 0) panels.value[idx] = updated
    } else {
      const created = await createPanel(payload)
      panels.value.unshift(created)
    }
    showModal.value = false
  } finally {
    saving.value = false
  }
}

function readFile(file: File) {
  const reader = new FileReader()
  reader.onload = e => { form.value.imageBase64 = e.target?.result as string }
  reader.readAsDataURL(file)
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) readFile(file)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) readFile(file)
}

function confirmDelete(p: Panel) { deleteTarget.value = p }

async function doDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  try {
    await deletePanel(deleteTarget.value.id)
    panels.value = panels.value.filter(p => p.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.pnl-select { height:38px;padding:0 10px;border-radius:8px;border:1.5px solid #D0D0D0;font-size:13px;color:var(--color-text-primary);background:#fff;outline:none;font-family:inherit; }
.pnl-select:focus { border-color:var(--color-primary); }

.pnl-toggle { width:44px;height:24px;border-radius:100px;border:none;cursor:pointer;background:#D1D1D6;position:relative;padding:0;transition:background 0.2s;flex-shrink:0; }
.pnl-toggle-on { background:var(--color-primary); }
.pnl-toggle-thumb { width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2); }
.pnl-toggle-on .pnl-toggle-thumb { transform:translateX(20px); }

.pnl-modal { max-width:620px; }

.pnl-items-wrap { border:1px solid var(--color-border-tertiary);border-radius:8px;overflow:hidden; }
.pnl-items-table { width:100%;border-collapse:collapse; }
.pnl-items-table th { padding:8px 12px;font-size:12px;font-weight:500;color:var(--color-text-secondary);background:#F8F8FA;border-bottom:1px solid var(--color-border-tertiary);text-align:left; }
.pnl-items-table td { padding:8px 12px;font-size:13px;color:var(--color-text-primary);border-bottom:1px solid #F0F0F4; }
.pnl-items-table tr:last-child td { border-bottom:none; }
.pnl-items-table .center { text-align:center; }

.pnl-color-input { width:36px;height:28px;padding:2px;border:1.5px solid #D0D0D0;border-radius:6px;cursor:pointer;background:#fff; }

.pnl-thumb { height:40px;width:auto;max-width:120px;border-radius:4px;object-fit:cover; }

.pnl-upload-zone {
  border:1.5px dashed #C8C8D0;border-radius:10px;min-height:120px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  cursor:pointer;padding:16px;gap:4px;transition:border-color 0.15s,background 0.15s;background:#FAFAFA;
}
.pnl-upload-zone:hover { border-color:var(--color-primary);background:#F5F8FF; }
.pnl-upload-zone--drag { border-color:var(--color-primary);background:#EFF4FF; }
.pnl-img-preview { max-height:80px;max-width:100%;border-radius:6px;object-fit:contain; }
.pnl-browse-btn { margin-top:4px;padding:5px 14px;border-radius:20px;background:#4B5563;color:#fff;font-size:12px;cursor:pointer; }

.pnl-spinner { width:24px;height:24px;border:3px solid #E5E7EB;border-top-color:var(--color-primary);border-radius:50%;animation:pnl-spin 0.7s linear infinite; }
@keyframes pnl-spin { to { transform:rotate(360deg); } }

.k-backdrop { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4); }
.k-modal { position:fixed;top:50%;left:50%;z-index:201;transform:translate(-50%,-50%);background:#fff;border-radius:14px;width:calc(100vw - 48px);max-width:420px;padding:24px;box-shadow:0 16px 48px rgba(0,0,0,0.14); }
.k-modal-title { font-size:16px;font-weight:500;color:var(--color-text-primary); }
.k-field { display:flex;flex-direction:column;gap:6px; }
.k-label { font-size:12px;color:var(--color-text-secondary); }
.k-input { height:42px;padding:0 12px;border-radius:8px;border:1.5px solid #D0D0D0;font-size:14px;color:var(--color-text-primary);outline:none;font-family:inherit;background:#fff;transition:border-color 0.15s;width:100%;box-sizing:border-box; }
.k-input:focus { border-color:var(--color-primary); }

.modal-bg-enter-active,.modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,.modal-bg-leave-to { opacity:0; }
.modal-up-enter-active,.modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,.modal-up-leave-to { opacity:0;transform:translate(-50%,-48%); }
</style>
