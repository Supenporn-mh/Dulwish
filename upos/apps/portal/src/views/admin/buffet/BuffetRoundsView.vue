<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">ตั้งค่าช่วงเวลา Buffet</h2>
        <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">กำหนดรอบ Buffet เช่น มื้อเช้า มื้อกลางวัน พร้อมช่วงเวลา</p>
      </div>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openCreate" :disabled="loading">
        <PhPlus :size="14" /> เพิ่มรอบ
      </button>
    </div>

    <!-- Search -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="br-search-wrap">
        <PhMagnifyingGlass :size="15" style="color:var(--color-text-tertiary);flex-shrink:0" />
        <input v-model="search" class="br-search" placeholder="ค้นหาชื่อรอบ หรือเวลา..." />
      </div>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="br-error-banner">
      <PhWarning :size="15" style="flex-shrink:0" />
      <span>{{ error }}</span>
      <button class="br-error-dismiss" @click="error = null">✕</button>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap" style="border-radius:12px">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:60px">ลำดับ</th>
            <th>ชื่อรอบ</th>
            <th class="center" style="width:180px">เวลา</th>
            <th class="center" style="width:120px">สถานะ</th>
            <th class="center" style="width:100px">การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="center" style="padding:40px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="5" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <template v-else>
            <tr v-for="(r, i) in paginated" :key="r.id">
              <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
              <td style="font-weight:500;color:var(--color-primary)">{{ r.name }}</td>
              <td class="center" style="font-size:13px;font-family:monospace">{{ r.startTime }} – {{ r.endTime }}</td>
              <td class="center">
                <button
                  :class="['br-status', r.active ? 'br-status-on' : 'br-status-off']"
                  :disabled="savingId === r.id"
                  @click="toggleActive(r)"
                >
                  <PhCheckCircle v-if="r.active" :size="13" weight="fill" />
                  <PhCircle v-else :size="13" />
                  {{ r.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
                </button>
              </td>
              <td class="center">
                <div class="adm-actions">
                  <button class="adm-action-btn" title="แก้ไข" :disabled="savingId === r.id" @click="openEdit(r)">
                    <PhPencilSimple :size="14" />
                  </button>
                  <button class="adm-action-btn danger" title="ลบ" :disabled="savingId === r.id" @click="deleteRound(r)">
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
        <div v-if="showModal" class="br-backdrop" @click="showModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showModal" class="br-modal">
          <h3 class="br-modal-title">{{ editTarget ? 'แก้ไขรอบ Buffet' : 'เพิ่มรอบ Buffet' }}</h3>

          <div style="display:flex;flex-direction:column;gap:14px;margin-top:20px">
            <div class="br-field">
              <label class="br-label">ชื่อรอบ <span style="color:var(--color-danger)">*</span></label>
              <input v-model="form.name" class="br-input" placeholder="เช่น มื้อเช้า, มื้อกลางวัน" />
            </div>
            <div style="display:flex;gap:12px">
              <div class="br-field" style="flex:1">
                <label class="br-label">เวลาเริ่ม <span style="color:var(--color-danger)">*</span></label>
                <input v-model="form.startTime" type="time" class="br-input" />
              </div>
              <div class="br-field" style="flex:1">
                <label class="br-label">เวลาสิ้นสุด <span style="color:var(--color-danger)">*</span></label>
                <input v-model="form.endTime" type="time" class="br-input" />
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <button
                type="button"
                :class="['br-toggle', form.active ? 'br-toggle-on' : '']"
                @click="form.active = !form.active"
              >
                <span class="br-toggle-thumb" />
              </button>
              <span style="font-size:13px;color:var(--color-text-primary)">{{ form.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}</span>
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="modalSaving" @click="showModal=false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!form.name || !form.startTime || !form.endTime || modalSaving" @click="save">
              {{ modalSaving ? 'กำลังบันทึก...' : (editTarget ? 'บันทึก' : 'เพิ่มรอบ') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhMagnifyingGlass, PhPencilSimple, PhTrash, PhCheckCircle, PhCircle, PhWarning } from '@phosphor-icons/vue'
import type { BuffetRound } from '@/api/types'
import { listBuffetRounds, createBuffetRound, updateBuffetRound, deleteBuffetRound } from '@/api/buffet'

const rounds      = ref<BuffetRound[]>([])
const loading     = ref(false)
const error       = ref<string | null>(null)
const savingId    = ref<string | null>(null)
const modalSaving = ref(false)

const search      = ref('')
const pageSize    = ref(10)
const currentPage = ref(1)
const showModal   = ref(false)
const editTarget  = ref<BuffetRound | null>(null)

const blankForm = () => ({ name: '', startTime: '07:00', endTime: '09:00', active: true })
const form = ref(blankForm())

const filtered   = computed(() => {
  const q = search.value.toLowerCase()
  return rounds.value.filter(r => !q || r.name.toLowerCase().includes(q) || r.startTime.includes(q) || r.endTime.includes(q))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))

onMounted(async () => {
  loading.value = true
  try {
    rounds.value = await listBuffetRounds()
  } catch {
    error.value = 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

function openCreate() {
  editTarget.value = null
  form.value = blankForm()
  showModal.value = true
}

function openEdit(r: BuffetRound) {
  editTarget.value = r
  form.value = { name: r.name, startTime: r.startTime, endTime: r.endTime, active: r.active }
  showModal.value = true
}

async function save() {
  if (!form.value.name || !form.value.startTime || !form.value.endTime) return
  modalSaving.value = true
  error.value = null
  try {
    if (editTarget.value) {
      const updated = await updateBuffetRound(editTarget.value.id, form.value)
      const idx = rounds.value.findIndex(r => r.id === editTarget.value!.id)
      if (idx >= 0) rounds.value[idx] = updated
    } else {
      const created = await createBuffetRound({ ...form.value, sortOrder: rounds.value.length })
      rounds.value.push(created)
    }
    showModal.value = false
  } catch {
    error.value = 'บันทึกไม่สำเร็จ'
  } finally {
    modalSaving.value = false
  }
}

async function toggleActive(r: BuffetRound) {
  savingId.value = r.id
  error.value = null
  try {
    const updated = await updateBuffetRound(r.id, { active: !r.active })
    const idx = rounds.value.findIndex(x => x.id === r.id)
    if (idx >= 0) rounds.value[idx] = updated
  } catch {
    error.value = 'เปลี่ยนสถานะไม่สำเร็จ'
  } finally {
    savingId.value = null
  }
}

async function deleteRound(r: BuffetRound) {
  savingId.value = r.id
  error.value = null
  try {
    await deleteBuffetRound(r.id)
    rounds.value = rounds.value.filter(x => x.id !== r.id)
  } catch {
    error.value = 'ลบไม่สำเร็จ'
  } finally {
    savingId.value = null
  }
}
</script>

<style scoped>
.br-search-wrap { display:flex;align-items:center;gap:8px;border:1px solid var(--color-border-tertiary);border-radius:8px;padding:0 12px;height:38px;background:#fff; }
.br-search { border:none;outline:none;flex:1;font-size:13px;color:var(--color-text-primary);background:transparent;font-family:inherit; }
.br-search::placeholder { color:var(--color-text-tertiary); }
.br-error-banner { display:flex;align-items:center;gap:8px;background:#fff1f0;border:1px solid #ffa39e;border-radius:8px;padding:10px 14px;font-size:13px;color:#cf1322; }
.br-error-dismiss { margin-left:auto;border:none;background:none;cursor:pointer;color:#cf1322;font-size:14px;padding:0 4px; }
.br-status { display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;padding:3px 10px;border-radius:100px;border:none;cursor:pointer;transition:opacity 0.15s,filter 0.15s; }
.br-status:hover:not(:disabled) { filter:brightness(0.92); }
.br-status:disabled { cursor:not-allowed;opacity:0.6; }
.br-status-on  { background:var(--color-primary-tint);color:var(--color-primary); }
.br-status-off { background:var(--color-bg-secondary);color:var(--color-text-tertiary); }
.br-backdrop { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4); }
.br-modal { position:fixed;top:50%;left:50%;z-index:201;transform:translate(-50%,-50%);background:#fff;border-radius:14px;width:calc(100vw - 48px);max-width:480px;padding:24px;box-shadow:0 16px 48px rgba(0,0,0,0.14); }
.br-modal-title { font-size:17px;font-weight:500;color:var(--color-text-primary); }
.br-field { display:flex;flex-direction:column;gap:5px; }
.br-label { font-size:12px;color:var(--color-text-secondary); }
.br-input { height:42px;padding:0 12px;border-radius:8px;border:1.5px solid #D0D0D0;font-size:14px;color:var(--color-text-primary);outline:none;font-family:inherit;background:#fff;transition:border-color 0.15s;width:100%;box-sizing:border-box; }
.br-input:focus { border-color:var(--color-primary); }
.br-toggle { width:44px;height:24px;border-radius:100px;border:none;cursor:pointer;background:#D1D1D6;position:relative;padding:0;transition:background 0.2s;flex-shrink:0; }
.br-toggle-on { background:var(--color-primary); }
.br-toggle-thumb { width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2); }
.br-toggle-on .br-toggle-thumb { transform:translateX(20px); }
.modal-bg-enter-active,.modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,.modal-bg-leave-to { opacity:0; }
.modal-up-enter-active,.modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,.modal-up-leave-to { opacity:0;transform:translate(-50%,-48%); }
</style>
