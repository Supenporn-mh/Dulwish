<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">ตั้งค่าช่วงเวลา</h2>
        <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">กำหนดค่าช่วงเวลาการจอง จัดจำกัดความจุ</p>
      </div>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openCreate" :disabled="loading">
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

    <!-- Error banner -->
    <div v-if="error" class="ts-error-banner">
      <PhWarning :size="15" style="flex-shrink:0" />
      <span>{{ error }}</span>
      <button class="ts-error-dismiss" @click="error = null">✕</button>
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
          <tr v-if="loading">
            <td colspan="8" class="center" style="padding:40px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="8" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <template v-else>
            <tr v-for="(s, i) in paginated" :key="s._id">
              <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
              <td style="font-weight:500;color:var(--color-primary)">{{ s.name }}</td>
              <td class="center" style="font-size:13px">{{ mealLabel(s.meal) }}</td>
              <td class="center" style="font-size:13px;font-family:monospace">{{ s.startTime }} – {{ s.endTime }}</td>
              <td class="center" style="font-size:13px">{{ s.capacity }}</td>
              <td class="center" style="font-size:13px">{{ s.cutoffHours }} ชั่วโมง</td>
              <td class="center">
                <button
                  :class="['ts-status', s.enabled ? 'ts-status-on' : 'ts-status-off']"
                  :disabled="savingId === s._id"
                  :title="s.enabled ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'"
                  @click="toggleEnabled(s)"
                >
                  <PhCheckCircle v-if="s.enabled" :size="13" weight="fill" />
                  <PhCircle v-else :size="13" />
                  {{ s.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
                </button>
              </td>
              <td class="center">
                <div class="adm-actions">
                  <button class="adm-action-btn" title="แก้ไข" :disabled="savingId === s._id" @click="openEdit(s)">
                    <PhPencilSimple :size="14" />
                  </button>
                  <button class="adm-action-btn danger" title="ลบ" :disabled="savingId === s._id" @click="deleteSlot(s)">
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
              <span style="font-size:13px;color:var(--color-text-primary)">{{ form.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}</span>
            </div>
          </div>

          <!-- Footer -->
          <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="modalSaving" @click="showModal=false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!form.name || modalSaving" @click="save">
              {{ modalSaving ? 'กำลังบันทึก...' : (editTarget ? 'บันทึก' : 'เพิ่มช่วงเวลา') }}
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
  PhPlus, PhMagnifyingGlass, PhPencilSimple, PhTrash,
  PhCheckCircle, PhCircle, PhWarning,
} from '@phosphor-icons/vue'
import api from '../../../api/axios'

// UI row shape — all logic uses this; _id is the Mongo ObjectId string
interface SlotDoc {
  _id: string
  name: string
  meal: 'breakfast' | 'lunch' | 'dinner'
  startTime: string
  endTime: string
  capacity: number
  cutoffHours: number
  description: string
  enabled: boolean
}

// MealPeriod document as returned by the backend
interface MealPeriod {
  _id: string
  code: string
  name: string
  startTime: string
  endTime: string
  cutoffMinutes: number
  seatCapacity: number
  description: string
  active: boolean
}

function mpToRow(mp: MealPeriod): SlotDoc {
  return {
    _id: mp._id,
    name: mp.name,
    meal: mp.code.toLowerCase() as 'breakfast' | 'lunch' | 'dinner',
    startTime: mp.startTime,
    endTime: mp.endTime,
    capacity: mp.seatCapacity,
    cutoffHours: mp.cutoffMinutes / 60,
    description: mp.description ?? '',
    enabled: mp.active,
  }
}

function rowToPayload(f: FormShape): Record<string, unknown> {
  return {
    code: f.meal.toUpperCase(),
    name: f.name,
    startTime: f.startTime,
    endTime: f.endTime,
    cutoffMinutes: Math.round(f.cutoffHours * 60),
    seatCapacity: f.capacity,
    description: f.description,
    active: f.enabled,
  }
}

const slots       = ref<SlotDoc[]>([])
const loading     = ref(false)
const error       = ref<string | null>(null)
const savingId    = ref<string | null>(null)
const modalSaving = ref(false)

const search      = ref('')
const pageSize    = ref(10)
const currentPage = ref(1)
const showModal   = ref(false)
const editTarget  = ref<SlotDoc | null>(null)

type FormShape = {
  name: string
  meal: 'breakfast' | 'lunch' | 'dinner'
  startTime: string
  endTime: string
  capacity: number
  cutoffHours: number
  description: string
  enabled: boolean
}

const blankForm = (): FormShape => ({
  name: '', meal: 'breakfast', startTime: '07:00', endTime: '09:00',
  capacity: 120, cutoffHours: 1, description: '', enabled: true,
})
const form = ref<FormShape>(blankForm())

const mealLabel = (m: string) => ({ breakfast: 'เช้า', lunch: 'กลางวัน', dinner: 'เย็น' }[m] ?? m)

const filtered   = computed(() => {
  const q = search.value.toLowerCase()
  return slots.value.filter(s => !q || s.name.toLowerCase().includes(q) || s.startTime.includes(q))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/menu/meal-periods', { params: { scope: 'all' } })
    const list: MealPeriod[] = data.mealPeriods ?? data.periods ?? []
    slots.value = list.map(mpToRow)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

function openCreate() {
  editTarget.value = null
  form.value = blankForm()
  showModal.value = true
}

function openEdit(s: SlotDoc) {
  editTarget.value = s
  form.value = {
    name: s.name,
    meal: s.meal,
    startTime: s.startTime,
    endTime: s.endTime,
    capacity: s.capacity,
    cutoffHours: s.cutoffHours,
    description: s.description,
    enabled: s.enabled,
  }
  showModal.value = true
}

async function save() {
  if (!form.value.name) return
  modalSaving.value = true
  error.value = null
  try {
    if (editTarget.value) {
      const { data } = await api.patch(`/menu/meal-periods/${editTarget.value._id}`, rowToPayload(form.value))
      const updated = mpToRow(data.mealPeriod as MealPeriod)
      const idx = slots.value.findIndex(s => s._id === editTarget.value!._id)
      if (idx >= 0) slots.value[idx] = updated
    } else {
      const { data } = await api.post('/menu/meal-periods', rowToPayload(form.value))
      slots.value.push(mpToRow(data.mealPeriod as MealPeriod))
    }
    showModal.value = false
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'
  } finally {
    modalSaving.value = false
  }
}

async function deleteSlot(s: SlotDoc) {
  savingId.value = s._id
  error.value = null
  try {
    await api.delete(`/menu/meal-periods/${s._id}`)
    slots.value = slots.value.filter(x => x._id !== s._id)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'ลบไม่สำเร็จ'
  } finally {
    savingId.value = null
  }
}

async function toggleEnabled(s: SlotDoc) {
  savingId.value = s._id
  error.value = null
  try {
    const { data } = await api.patch(`/menu/meal-periods/${s._id}`, { active: !s.enabled })
    const updated = mpToRow(data.mealPeriod as MealPeriod)
    const idx = slots.value.findIndex(x => x._id === s._id)
    if (idx >= 0) slots.value[idx] = updated
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'เปลี่ยนสถานะไม่สำเร็จ'
  } finally {
    savingId.value = null
  }
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

.ts-error-banner {
  display:flex; align-items:center; gap:8px;
  background:#fff1f0; border:1px solid #ffa39e; border-radius:8px;
  padding:10px 14px; font-size:13px; color:#cf1322;
}
.ts-error-dismiss {
  margin-left:auto; border:none; background:none; cursor:pointer;
  color:#cf1322; font-size:14px; padding:0 4px;
}

.ts-status {
  display:inline-flex; align-items:center; gap:5px;
  font-size:12px; font-weight:500; padding:3px 10px; border-radius:100px;
  border:none; cursor:pointer; transition:opacity 0.15s, filter 0.15s;
}
.ts-status:hover:not(:disabled) { filter:brightness(0.92); }
.ts-status:disabled { cursor:not-allowed; opacity:0.6; }
.ts-status-on  { background:var(--color-primary-tint); color:var(--color-primary); }
.ts-status-off { background:var(--color-bg-secondary); color:var(--color-text-tertiary); }

/* Modal */
.ts-backdrop { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.4); }
.ts-modal {
  position:fixed; top:50%; left:50%; z-index:201; transform:translate(-50%,-50%);
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
