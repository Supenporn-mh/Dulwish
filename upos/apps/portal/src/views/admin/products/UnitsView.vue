<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">รายการหน่วยนับ</h2>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openCreate">
        <PhPlus :size="14" /> เพิ่มหน่วยนับ
      </button>
    </div>

    <!-- Search -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex gap-3">
        <input v-model="search" class="adm-filter-input" placeholder="ค้นหาชื่อหน่วยนับ..." style="min-width:220px" />
        <button class="adm-search-btn" @click="currentPage=1">ค้นหา</button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" style="color:var(--color-danger);font-size:14px;padding:8px 0">{{ error }}</div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:80px">ลำดับ</th>
            <th>ชื่อหน่วยนับ</th>
            <th class="center" style="width:100px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="3" class="center" style="padding:40px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="3" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="(u, i) in paginated" v-else :key="u._id">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td style="font-weight:500;color:var(--color-primary)">{{ u.name }}</td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(u)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="handleDelete(u)">
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

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showModal" class="k-backdrop" @click="showModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showModal" class="k-modal">
          <h3 class="k-modal-title">{{ editTarget ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล' }}</h3>
          <div style="margin-top:18px">
            <div class="k-field">
              <label class="k-label">ชื่อหน่วยนับ <span style="color:var(--color-danger)">*</span></label>
              <input v-model="form.name" class="k-input" placeholder="กรุณาระบุชื่อหน่วยนับ" @keydown.enter="save" />
            </div>
          </div>
          <div v-if="saveError" style="color:var(--color-danger);font-size:13px;margin-top:8px">{{ saveError }}</div>
          <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="saving" @click="showModal=false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!form.name.trim() || saving" @click="save">
              {{ saving ? 'กำลังบันทึก...' : 'ตกลง' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import {
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit as apiDeleteUnit,
} from '@/api/products'

interface UnitRow { _id: string; name: string }

const units       = ref<UnitRow[]>([])
const loading     = ref(false)
const error       = ref('')
const saving      = ref(false)
const saveError   = ref('')

const search      = ref('')
const pageSize    = ref(10)
const currentPage = ref(1)
const showModal   = ref(false)
const editTarget  = ref<UnitRow | null>(null)
const form        = ref({ name: '' })

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await listUnits()
    // API returns Unit[] where each doc has _id from Mongo
    units.value = (data as unknown as UnitRow[])
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'โหลดข้อมูลล้มเหลว'
  } finally {
    loading.value = false
  }
})

const filtered   = computed(() => {
  const q = search.value.toLowerCase()
  return units.value.filter(u => !q || u.name.toLowerCase().includes(q))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() =>
  filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value)
)

function openCreate() { editTarget.value=null; form.value={ name:'' }; saveError.value=''; showModal.value=true }
function openEdit(u: UnitRow) { editTarget.value=u; form.value={ name:u.name }; saveError.value=''; showModal.value=true }

async function save() {
  if (!form.value.name.trim()) return
  saving.value = true
  saveError.value = ''
  try {
    if (editTarget.value) {
      const updated = await updateUnit(editTarget.value._id as unknown as number, { name: form.value.name.trim() })
      const row = updated as unknown as UnitRow
      const idx = units.value.findIndex(u => u._id === editTarget.value!._id)
      if (idx >= 0) units.value[idx] = row
    } else {
      const created = await createUnit({ name: form.value.name.trim() } as { name: string })
      units.value.push(created as unknown as UnitRow)
    }
    showModal.value = false
  } catch (e: unknown) {
    saveError.value = e instanceof Error ? e.message : 'บันทึกล้มเหลว'
  } finally {
    saving.value = false
  }
}

async function handleDelete(u: UnitRow) {
  try {
    await apiDeleteUnit(u._id as unknown as number)
    units.value = units.value.filter(x => x._id !== u._id)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'ลบล้มเหลว'
  }
}
</script>

<style scoped>
.k-backdrop { position:fixed; inset:0; z-index:50; background:rgba(0,0,0,0.4); }
.k-modal {
  position:fixed; top:50%; left:50%; z-index:51; transform:translate(-50%,-50%);
  background:#fff; border-radius:14px; width:calc(100vw - 48px); max-width:400px;
  padding:24px; box-shadow:0 16px 48px rgba(0,0,0,0.14);
}
.k-modal-title { font-size:16px; font-weight:500; color:var(--color-text-primary); }
.k-field { display:flex; flex-direction:column; gap:5px; }
.k-label { font-size:12px; color:var(--color-text-secondary); }
.k-input {
  height:42px; padding:0 12px; border-radius:8px;
  border:1px solid var(--color-border-tertiary); font-size:14px;
  color:var(--color-text-primary); outline:none; font-family:inherit; background:#fff;
}
.k-input:focus { border-color:var(--color-primary); }

.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity:0; transform:translate(-50%,-48%); }
</style>
