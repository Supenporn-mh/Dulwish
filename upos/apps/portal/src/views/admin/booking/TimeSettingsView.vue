<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">ตั้งค่าช่วงเวลา</h2>
        <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">กำหนดค่าช่วงเวลาการจอง จัดจำกัดความจุ</p>
      </div>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openCreate">
        <PhPlus :size="14" /> เพิ่มช่วงเวลา
      </button>
    </div>

    <!-- Search -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="ts-search-wrap">
        <PhMagnifyingGlass :size="15" style="color:var(--color-text-tertiary);flex-shrink:0" />
        <input v-model="search" class="ts-search" placeholder="ค้นหาชื่อช่วงเวลา หรือเวลาทำการ..." />
      </div>
    </div>

    <!-- Table card -->
    <div class="adm-table-wrap" style="border-radius:12px">

      <!-- Table -->
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:60px">ลำดับ</th>
            <th>ช่วงเวลา</th>
            <th class="center">มื้ออาหาร</th>
            <th class="center">เวลา</th>
            <th class="center">ความจุ</th>
            <th class="center">ชั่วโมงตัดรอบ</th>
            <th class="center">สถานะ</th>
            <th class="center" style="width:100px">การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paginated.length === 0">
            <td colspan="8" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="(s, i) in paginated" :key="s.id">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td style="font-weight:500;color:var(--color-primary)">{{ s.name }}</td>
            <td class="center" style="font-size:13px">{{ mealLabel(s.meal) }}</td>
            <td class="center" style="font-size:13px;font-family:monospace">{{ s.startTime }} – {{ s.endTime }}</td>
            <td class="center" style="font-size:13px">{{ s.capacity }}</td>
            <td class="center" style="font-size:13px">{{ s.cutoffHours }} ชั่วโมง</td>
            <td class="center">
              <span :class="['ts-status', s.enabled ? 'ts-status-on' : 'ts-status-off']">
                <PhCheckCircle v-if="s.enabled" :size="13" weight="fill" />
                <PhCircle v-else :size="13" />
                {{ s.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(s)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="deleteSlot(s)">
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
          </select>
        </div>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage===1" @click="currentPage--">‹</button>
          <button v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage===p?'active':'']" @click="currentPage=p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage===totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showModal" class="ts-backdrop" @click="showModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showModal" class="ts-modal">
          <h3 class="ts-modal-title">{{ editTarget ? 'แก้ไขช่วงเวลา' : 'เพิ่มช่วงเวลาใหม่' }}</h3>

          <div style="display:flex;flex-direction:column;gap:14px;margin-top:20px">
            <!-- ชื่อช่วงเวลา -->
            <div class="ts-field">
              <input v-model="form.name" class="ts-input" placeholder="ชื่อช่วงเวลา" />
            </div>

            <!-- มื้ออาหาร -->
            <div class="ts-field">
              <label class="ts-label">มื้ออาหาร</label>
              <select v-model="form.meal" class="ts-input ts-select">
                <option value="breakfast">เช้า</option>
                <option value="lunch">กลางวัน</option>
                <option value="dinner">เย็น</option>
              </select>
            </div>

            <!-- เวลาเริ่ม / สิ้นสุด -->
            <div style="display:flex;gap:12px">
              <div class="ts-field" style="flex:1">
                <label class="ts-label">เวลาเริ่มต้น</label>
                <input v-model="form.startTime" type="time" class="ts-input" />
              </div>
              <div class="ts-field" style="flex:1">
                <label class="ts-label">เวลาสิ้นสุด</label>
                <input v-model="form.endTime" type="time" class="ts-input" />
              </div>
            </div>

            <!-- ความจุ -->
            <div class="ts-field">
              <label class="ts-label">ความจุ</label>
              <input v-model.number="form.capacity" type="number" class="ts-input" min="1" />
            </div>

            <!-- ชั่วโมงตัดรอบ -->
            <div class="ts-field">
              <label class="ts-label">ชั่วโมงตัดรอบ</label>
              <input v-model.number="form.cutoffHours" type="number" class="ts-input" min="0" step="0.5" />
            </div>

            <!-- Toggle -->
            <div style="display:flex;align-items:center;gap:10px">
              <button
                type="button"
                :class="['ts-toggle', form.enabled ? 'ts-toggle-on' : '']"
                @click="form.enabled = !form.enabled"
              >
                <span class="ts-toggle-thumb" />
              </button>
              <span style="font-size:13px;color:var(--color-text-primary)">เปิดใช้งาน</span>
            </div>
          </div>

          <!-- Footer -->
          <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showModal=false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!form.name" @click="save">
              {{ editTarget ? 'บันทึก' : 'เพิ่มช่วงเวลา' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PhPlus, PhMagnifyingGlass, PhPencilSimple, PhTrash,
  PhCheckCircle, PhCircle,
} from '@phosphor-icons/vue'

interface TimeSlot {
  id: number; name: string; meal: 'breakfast'|'lunch'|'dinner'
  startTime: string; endTime: string; capacity: number
  cutoffHours: number; description: string; enabled: boolean
}

let nextId = 4
const slots = ref<TimeSlot[]>([
  { id:1, name:'Breakfast', meal:'breakfast', startTime:'07:00', endTime:'09:00', capacity:120, cutoffHours:1, description:'', enabled:true },
  { id:2, name:'Lunch',     meal:'lunch',     startTime:'11:30', endTime:'13:30', capacity:150, cutoffHours:1, description:'', enabled:true },
  { id:3, name:'Dinner',    meal:'dinner',    startTime:'17:00', endTime:'18:30', capacity:100, cutoffHours:1, description:'', enabled:true },
])

const search      = ref('')
const pageSize    = ref(10)
const currentPage = ref(1)
const showModal   = ref(false)
const editTarget  = ref<TimeSlot | null>(null)
const form        = ref({ name:'', meal:'breakfast' as any, startTime:'07:00', endTime:'09:00', capacity:120, cutoffHours:1, description:'', enabled:true })

const mealLabel = (m: string) => ({ breakfast:'เช้า', lunch:'กลางวัน', dinner:'เย็น' })[m] ?? m

const filtered   = computed(() => {
  const q = search.value.toLowerCase()
  return slots.value.filter(s => !q || s.name.toLowerCase().includes(q) || s.startTime.includes(q))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() => filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value))

function openCreate() {
  editTarget.value = null
  form.value = { name:'', meal:'breakfast', startTime:'07:00', endTime:'09:00', capacity:120, cutoffHours:1, description:'', enabled:true }
  showModal.value = true
}
function openEdit(s: TimeSlot) {
  editTarget.value = s
  form.value = { ...s }
  showModal.value = true
}
function save() {
  if (!form.value.name) return
  if (editTarget.value) {
    const idx = slots.value.findIndex(s => s.id === editTarget.value!.id)
    if (idx >= 0) slots.value[idx] = { ...form.value, id: editTarget.value.id }
  } else {
    slots.value.push({ ...form.value, id: nextId++ })
  }
  showModal.value = false
}
function deleteSlot(s: TimeSlot) {
  slots.value = slots.value.filter(x => x.id !== s.id)
}
</script>

<style scoped>
.ts-search-wrap {
  display:flex; align-items:center; gap:8px;
  border:1px solid var(--color-border-tertiary); border-radius:8px;
  padding:0 12px; height:38px; background:#fff;
}
.ts-search { border:none; outline:none; flex:1; font-size:13px; color:var(--color-text-primary); background:transparent; font-family:inherit; }
.ts-search::placeholder { color:var(--color-text-tertiary); }

.ts-status {
  display:inline-flex; align-items:center; gap:5px;
  font-size:12px; font-weight:500; padding:3px 10px; border-radius:100px;
}
.ts-status-on  { background:var(--color-primary-tint); color:var(--color-primary); }
.ts-status-off { background:var(--color-bg-secondary); color:var(--color-text-tertiary); }

/* Modal */
.ts-backdrop { position:fixed; inset:0; z-index:50; background:rgba(0,0,0,0.4); }
.ts-modal {
  position:fixed; top:50%; left:50%; z-index:51; transform:translate(-50%,-50%);
  background:#fff; border-radius:14px; width:calc(100vw - 48px); max-width:480px;
  padding:24px; box-shadow:0 16px 48px rgba(0,0,0,0.14);
  max-height:90vh; overflow-y:auto;
}
.ts-modal-title { font-size:17px; font-weight:500; color:var(--color-text-primary); }
.ts-field { display:flex; flex-direction:column; gap:5px; }
.ts-label { font-size:12px; color:var(--color-text-secondary); }
.ts-input {
  height:42px; padding:0 12px; border-radius:8px;
  border:1.5px solid #D0D0D0; font-size:14px;
  color:var(--color-text-primary); outline:none; font-family:inherit; background:#fff;
  transition:border-color 0.15s; width:100%; box-sizing:border-box;
}
.ts-input:focus { border-color:var(--color-primary); }
.ts-select  { cursor:pointer; }

/* Toggle */
.ts-toggle {
  width:44px; height:24px; border-radius:100px; border:none; cursor:pointer;
  background:#D1D1D6; position:relative; padding:0; transition:background 0.2s;
  flex-shrink:0;
}
.ts-toggle-on    { background:var(--color-primary); }
.ts-toggle-thumb {
  width:20px; height:20px; border-radius:50%; background:#fff;
  position:absolute; top:2px; left:2px;
  transition:transform 0.2s; box-shadow:0 1px 3px rgba(0,0,0,0.2);
}
.ts-toggle-on .ts-toggle-thumb { transform:translateX(20px); }

.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity:0; transform:translate(-50%,-48%); }
</style>
