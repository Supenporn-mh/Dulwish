<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">รายการแบนเนอร์</h2>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click.stop="openCreate">
        <PhPlus :size="14" /> เพิ่มแบนเนอร์
      </button>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap" style="border-radius:12px">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:64px">ลำดับ</th>
            <th>ชื่อแบนเนอร์</th>
            <th class="center" style="width:160px">รูปแบนเนอร์</th>
            <th class="center" style="width:100px">แสดง</th>
            <th class="center" style="width:100px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="center" style="padding:40px">
              <div class="bnr-spinner" />
            </td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="5" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="(b, i) in paginated" :key="b.id">
            <td class="num center">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
            <td style="font-weight:500;color:var(--color-text-primary)">{{ b.name }}</td>
            <td class="center">
              <img v-if="b.imageBase64" :src="b.imageBase64" class="bnr-thumb" />
              <span v-else style="color:var(--color-text-tertiary);font-size:12px">ไม่มีรูป</span>
            </td>
            <td class="center">
              <span :class="['adm-badge', b.isVisible ? 'adm-badge-success' : 'adm-badge-voided']">
                {{ b.isVisible ? 'แสดง' : 'ซ่อน' }}
              </span>
            </td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(b)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="confirmDelete(b)">
                  <PhTrash :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="adm-pagination">
        <div class="adm-pagination-left">
          <span>ทั้งหมด {{ banners.length }} รายการ</span>
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
            v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage === p ? 'active' : '']"
            @click="currentPage = p"
          >{{ p }}</button>
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
        <div v-if="showModal" class="k-modal" style="max-width:480px" @click.stop>
          <h3 class="k-modal-title">{{ editTarget ? 'แก้ไขแบนเนอร์' : 'เพิ่มแบนเนอร์' }}</h3>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:18px">

            <div class="k-field">
              <label class="k-label">ชื่อแบนเนอร์</label>
              <input v-model="form.name" class="k-input" placeholder="ระบุชื่อแบนเนอร์" />
            </div>

            <div style="display:flex;align-items:center;gap:10px">
              <button
                type="button"
                :class="['bnr-toggle', form.isVisible ? 'bnr-toggle-on' : '']"
                @click="form.isVisible = !form.isVisible"
              >
                <span class="bnr-toggle-thumb" />
              </button>
              <span style="font-size:13px;color:var(--color-text-primary)">แสดง</span>
            </div>

            <div class="k-field">
              <label class="k-label">รูปภาพ</label>
              <div
                class="bnr-upload-zone"
                :class="{ 'bnr-upload-zone--drag': isDragging }"
                @dragover.prevent="isDragging = true"
                @dragleave="isDragging = false"
                @drop.prevent="onDrop"
                @click="(fileInput as HTMLInputElement)?.click()"
              >
                <img v-if="form.imageBase64" :src="form.imageBase64" class="bnr-preview" />
                <template v-else>
                  <PhCloudArrowUp :size="32" style="color:var(--color-text-tertiary)" />
                  <span style="font-size:13px;color:var(--color-text-secondary);margin-top:8px">Drag and drop file here</span>
                  <span style="font-size:12px;color:var(--color-text-tertiary)">or</span>
                  <span class="bnr-browse-btn">Browse Files</span>
                </template>
              </div>
              <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />
            </div>

          </div>
          <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showModal = false">ยกเลิก</button>
            <button
              class="adm-hdr-btn adm-hdr-btn-primary"
              :disabled="!form.name || saving"
              @click="save"
            >{{ saving ? 'กำลังบันทึก...' : 'ตกลง' }}</button>
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
            ต้องการลบแบนเนอร์ <strong style="color:var(--color-text-primary)">{{ deleteTarget.name }}</strong> ใช่หรือไม่?
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
import { listBanners, createBanner, updateBanner, deleteBanner } from '@/api/banner'
import type { Banner } from '@/api/banner'

const banners      = ref<Banner[]>([])
const loading      = ref(true)
const saving       = ref(false)
const pageSize     = ref(10)
const currentPage  = ref(1)
const showModal    = ref(false)
const editTarget   = ref<Banner | null>(null)
const deleteTarget = ref<Banner | null>(null)
const isDragging   = ref(false)
const fileInput    = ref<HTMLInputElement | null>(null)

const form = ref({ name: '', imageBase64: '', isVisible: true })

const totalPages = computed(() => Math.max(1, Math.ceil(banners.value.length / pageSize.value)))
const paginated  = computed(() =>
  banners.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
)

onMounted(load)

async function load() {
  loading.value = true
  try { banners.value = await listBanners() } finally { loading.value = false }
}

function openCreate() {
  editTarget.value = null
  form.value = { name: '', imageBase64: '', isVisible: true }
  showModal.value = true
}

function openEdit(b: Banner) {
  editTarget.value = b
  form.value = { name: b.name, imageBase64: b.imageBase64 ?? '', isVisible: b.isVisible }
  showModal.value = true
}

async function save() {
  if (!form.value.name) return
  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      imageBase64: form.value.imageBase64 || undefined,
      isVisible: form.value.isVisible,
    }
    if (editTarget.value) {
      const updated = await updateBanner(editTarget.value.id, payload)
      const idx = banners.value.findIndex(b => b.id === editTarget.value!.id)
      if (idx >= 0) banners.value[idx] = updated
    } else {
      const created = await createBanner({ ...payload, isVisible: payload.isVisible })
      banners.value.push(created)
    }
    showModal.value = false
  } finally {
    saving.value = false
  }
}

function confirmDelete(b: Banner) { deleteTarget.value = b }

async function doDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  try {
    await deleteBanner(deleteTarget.value.id)
    banners.value = banners.value.filter(b => b.id !== deleteTarget.value!.id)
    deleteTarget.value = null
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
</script>

<style scoped>
.bnr-thumb { height:40px;width:auto;max-width:120px;border-radius:4px;object-fit:cover; }

.bnr-toggle { width:44px;height:24px;border-radius:100px;border:none;cursor:pointer;background:#D1D1D6;position:relative;padding:0;transition:background 0.2s;flex-shrink:0; }
.bnr-toggle-on { background:var(--color-primary); }
.bnr-toggle-thumb { width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2); }
.bnr-toggle-on .bnr-toggle-thumb { transform:translateX(20px); }

.bnr-upload-zone {
  border: 1.5px dashed #C8C8D0;
  border-radius: 10px;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 20px;
  gap: 4px;
  transition: border-color 0.15s, background 0.15s;
  background: #FAFAFA;
}
.bnr-upload-zone:hover { border-color: var(--color-primary); background: #F5F8FF; }
.bnr-upload-zone--drag { border-color: var(--color-primary); background: #EFF4FF; }
.bnr-preview { max-height: 100px; max-width: 100%; border-radius: 6px; object-fit: contain; }
.bnr-browse-btn {
  margin-top: 4px;
  padding: 6px 16px;
  border-radius: 20px;
  background: #4B5563;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.bnr-spinner { width:24px;height:24px;border:3px solid #E5E7EB;border-top-color:var(--color-primary);border-radius:50%;animation:bnr-spin 0.7s linear infinite; }
@keyframes bnr-spin { to { transform:rotate(360deg); } }

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
