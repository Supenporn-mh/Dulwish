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
          <tr v-if="paginated.length === 0">
            <td colspan="3" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="(u, i) in paginated" :key="u.id">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td style="font-weight:500;color:var(--color-primary)">{{ u.name }}</td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(u)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="deleteUnit(u)">
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
          <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showModal=false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!form.name.trim()" @click="save">ตกลง</button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PhPlus, PhPencilSimple, PhTrash } from '@phosphor-icons/vue'

interface Unit { id: number; name: string }

let nextId = 11
const units = ref<Unit[]>([
  { id:1,  name:'จาน' },
  { id:2,  name:'ชาม' },
  { id:3,  name:'แก้ว' },
  { id:4,  name:'ถ้วย' },
  { id:5,  name:'จาน 2' },
  { id:6,  name:'ขวด' },
  { id:7,  name:'กล่อง' },
  { id:8,  name:'เซ็ต' },
  { id:9,  name:'รายการ' },
  { id:10, name:'ชุด' },
])

const search      = ref('')
const pageSize    = ref(10)
const currentPage = ref(1)
const showModal   = ref(false)
const editTarget  = ref<Unit | null>(null)
const form        = ref({ name: '' })

const filtered   = computed(() => {
  const q = search.value.toLowerCase()
  return units.value.filter(u => !q || u.name.toLowerCase().includes(q))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() =>
  filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value)
)

function openCreate() { editTarget.value=null; form.value={ name:'' }; showModal.value=true }
function openEdit(u: Unit) { editTarget.value=u; form.value={ name:u.name }; showModal.value=true }
function save() {
  if (!form.value.name.trim()) return
  if (editTarget.value) {
    const idx = units.value.findIndex(u => u.id === editTarget.value!.id)
    if (idx >= 0) units.value[idx] = { ...units.value[idx], name: form.value.name.trim() }
  } else {
    units.value.push({ id: nextId++, name: form.value.name.trim() })
  }
  showModal.value = false
}
function deleteUnit(u: Unit) {
  units.value = units.value.filter(x => x.id !== u.id)
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
