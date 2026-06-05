<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">จัดการครัว</h2>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openCreate">
        <PhPlus :size="14" /> เพิ่มครัว
      </button>
    </div>

    <!-- Error banner -->
    <div v-if="error" style="padding:12px 16px;border-radius:8px;background:#fef2f2;color:#b91c1c;font-size:14px;font-weight:400">
      {{ error }}
    </div>

    <!-- Search -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex gap-3">
        <input v-model="search" class="adm-filter-input" placeholder="ค้นหารหัสครัว / ชื่อครัว..." style="min-width:240px" />
        <button class="adm-search-btn" @click="currentPage=1">ค้นหา</button>
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap" style="border-radius:12px">

      <!-- Table -->
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:80px">ลำดับ</th>
            <th>รหัสครัว</th>
            <th>ชื่อครัว</th>
            <th class="center" style="width:80px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="center" style="padding:40px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="4" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <template v-else>
          <tr v-for="(k, i) in paginated" :key="k.id">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td><span class="adm-code">{{ k.id }}</span></td>
            <td style="font-weight:500;color:var(--color-primary)">{{ k.name }}</td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(k)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="handleDelete(k)">
                  <PhTrash :size="14" />
                </button>
              </div>
            </td>
          </tr>
          </template>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="adm-pagination">
        <div class="adm-pagination-left">
          <span>ทั้งหมด {{ filtered.length }} รายการ</span>
          <span class="adm-pagination-sep">|</span>
          <span>แสดงผล</span>
          <select v-model="pageSize" class="adm-page-size">
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
        <div v-if="showModal" class="k-modal">
          <h3 class="k-modal-title">{{ editTarget ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล' }}</h3>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:18px">
            <div class="k-field">
              <label class="k-label">รหัสครัว</label>
              <input v-model="form.id" class="k-input" placeholder="เช่น K001" :disabled="!!editTarget" />
            </div>
            <div class="k-field">
              <label class="k-label">ชื่อครัว</label>
              <input v-model="form.name" class="k-input" placeholder="เช่น ครัวไทย" />
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showModal=false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!form.id||!form.name||saving" @click="save">{{ saving ? 'กำลังบันทึก...' : 'ตกลง' }}</button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import type { Kitchen } from '@/api/types'
import {
  listKitchens,
  createKitchen,
  updateKitchen,
  deleteKitchen,
} from '@/api/products'

const kitchens    = ref<Kitchen[]>([])
const loading     = ref(false)
const error       = ref<string | null>(null)
const saving      = ref(false)

const search      = ref('')
const pageSize    = ref(10)
const currentPage = ref(1)
const showModal   = ref(false)
const editTarget  = ref<Kitchen | null>(null)
const form        = ref({ id: '', name: '' })

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    kitchens.value = await listKitchens()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'โหลดข้อมูลล้มเหลว'
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return kitchens.value.filter(k =>
    !q || k.id.toLowerCase().includes(q) || k.name.toLowerCase().includes(q)
  )
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() =>
  filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value)
)

function openCreate() {
  editTarget.value = null
  form.value = { id: '', name: '' }
  showModal.value = true
}
function openEdit(k: Kitchen) {
  editTarget.value = k
  form.value = { ...k }
  showModal.value = true
}
async function save() {
  if (!form.value.id || !form.value.name) return
  saving.value = true
  error.value = null
  try {
    if (editTarget.value) {
      const updated = await updateKitchen(editTarget.value.id, { name: form.value.name })
      const idx = kitchens.value.findIndex(k => k.id === editTarget.value!.id)
      if (idx >= 0) kitchens.value[idx] = updated
    } else {
      const created = await createKitchen({ id: form.value.id, name: form.value.name })
      kitchens.value.push(created)
    }
    showModal.value = false
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'บันทึกข้อมูลล้มเหลว'
  } finally {
    saving.value = false
  }
}
async function handleDelete(k: Kitchen) {
  error.value = null
  try {
    await deleteKitchen(k.id)
    kitchens.value = kitchens.value.filter(x => x.id !== k.id)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'ลบข้อมูลล้มเหลว'
  }
}
</script>

<style scoped>
.k-backdrop {
  position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4);
}
.k-modal {
  position: fixed; top: 50%; left: 50%; z-index: 51;
  transform: translate(-50%,-50%);
  background: #fff; border-radius: 14px;
  width: calc(100vw - 48px); max-width: 420px;
  padding: 24px; box-shadow: 0 16px 48px rgba(0,0,0,0.14);
}
.k-modal-title { font-size: 16px; font-weight: 500; color: var(--color-text-primary); }
.k-field { display: flex; flex-direction: column; gap: 6px; }
.k-label { font-size: 12px; color: var(--color-text-secondary); }
.k-input {
  height: 42px; padding: 0 12px; border-radius: 8px;
  border: 1px solid var(--color-border-tertiary);
  font-size: 14px; color: var(--color-text-primary);
  outline: none; font-family: inherit; background: #fff;
  transition: border-color 0.15s;
}
.k-input:focus   { border-color: var(--color-primary); }
.k-input:disabled { background: var(--color-bg-secondary); color: var(--color-text-tertiary); }

.modal-bg-enter-active, .modal-bg-leave-active { transition: opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity: 0; }
.modal-up-enter-active, .modal-up-leave-active { transition: opacity 0.25s, transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity: 0; transform: translate(-50%,-48%); }
</style>
