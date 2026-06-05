<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div>
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">จัดการการจอง</h2>
      <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">จัดการและยกเลิกตารางการจองอาหารทั้งหมดในระบบ</p>
    </div>

    <!-- Filters -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3 items-end">
        <!-- Search -->
        <div style="flex:2;min-width:220px;display:flex;align-items:center;gap:8px;border:1px solid var(--color-border-tertiary);border-radius:8px;padding:0 12px;height:38px;background:#fff">
          <PhMagnifyingGlass :size="14" style="color:var(--color-text-tertiary);flex-shrink:0" />
          <input v-model="search" style="border:none;outline:none;flex:1;font-size:13px;font-family:inherit;background:transparent" placeholder="ค้นหา..." />
        </div>
        <!-- สถานะ -->
        <select v-model="filterStatus" class="adm-filter-select">
          <option value="">สถานะทั้งหมด</option>
          <option value="จองแล้ว">จองแล้ว</option>
          <option value="เสร็จสิ้น">เสร็จสิ้น</option>
          <option value="ยกเลิก">ยกเลิก</option>
          <option value="ไม่มา">ไม่มา</option>
        </select>
        <!-- ช่วงเวลา -->
        <select v-model="filterSlot" class="adm-filter-select">
          <option value="">ช่วงเวลาทั้งหมด</option>
          <option value="Breakfast">Breakfast</option>
          <option value="Lunch">Lunch</option>
          <option value="Dinner">Dinner</option>
        </select>
        <!-- วันที่ -->
        <input v-model="filterDate" type="date" class="adm-filter-input" style="height:38px" />
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:60px">ลำดับ</th>
            <th style="width:180px">รหัสการจอง</th>
            <th>รายละเอียด</th>
            <th class="center" style="width:130px">ช่วงเวลา</th>
            <th class="center" style="width:110px">สถานะ</th>
            <th style="width:170px">ไทม์ไลน์</th>
            <th class="center" style="width:100px">การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paginated.length === 0">
            <td colspan="7" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="(b, i) in paginated" :key="b.id">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td style="font-family:monospace;font-size:12px;color:var(--color-text-secondary)">{{ b.code }}</td>
            <td>
              <div style="font-weight:500;color:var(--color-primary);font-size:14px">{{ b.name }}</div>
              <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px">วันที่: {{ b.bookingDate }}</div>
              <span class="bh-type-badge">{{ b.type }}</span>
            </td>
            <td class="center">
              <div style="font-weight:500;font-size:13px;color:var(--color-text-primary)">{{ b.slot }}</div>
              <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px">{{ b.slotTime }}</div>
            </td>
            <td class="center">
              <span :class="['bh-status', `bh-status-${b.status}`]">
                {{ b.status }}
              </span>
            </td>
            <td>
              <div style="font-size:12px;color:var(--color-text-secondary)">จองแล้ว: {{ b.bookedAt }}</div>
              <div v-if="b.cancelledAt" style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px">ยกเลิก: {{ b.cancelledAt }}</div>
            </td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(b)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="deleteBooking(b)">
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
            :class="['adm-page-btn', currentPage===p?'active':'']" @click="currentPage=p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage===totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

  </div>

  <!-- Edit Status Modal -->
  <Teleport to="body">
    <Transition name="modal-bg">
      <div v-if="showModal" class="bh-backdrop" @click="showModal=false" />
    </Transition>
    <Transition name="modal-up">
      <div v-if="showModal && editTarget" class="bh-modal">

        <!-- Header -->
        <div class="bh-modal-header">
          <div>
            <h3 class="bh-modal-title">แก้ไขสถานะการจอง</h3>
            <p style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px">{{ editTarget.code }}</p>
          </div>
          <button class="bh-close" @click="showModal=false"><PhX :size="18" weight="bold" /></button>
        </div>
        <div style="height:1px;background:var(--color-border-tertiary)" />

        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px">
          <!-- ข้อมูลการจอง -->
          <div class="bh-info-box">
            <div style="font-weight:500;color:var(--color-primary)">{{ editTarget.name }}</div>
            <div style="font-size:12px;color:var(--color-text-secondary);margin-top:4px">
              {{ editTarget.slot }} · {{ editTarget.slotTime }} · {{ editTarget.bookingDate }}
            </div>
          </div>

          <!-- เลือกสถานะ -->
          <div class="bh-field">
            <label class="bh-label">สถานะ <span style="color:var(--color-danger)">*</span></label>
            <select v-model="editForm.status" class="bh-input bh-select">
              <option value="จองแล้ว">จองแล้ว</option>
              <option value="เสร็จสิ้น">เสร็จสิ้น</option>
              <option value="ไม่มา">ไม่มา</option>
              <option value="ยกเลิก">ยกเลิก</option>
            </select>
          </div>

          <!-- ส่วนยกเลิก — แสดงเฉพาะเมื่อเลือก "ยกเลิก" -->
          <Transition name="cancel-section">
            <div v-if="editForm.status === 'ยกเลิก'" class="bh-cancel-section">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
                <PhWarning :size="16" weight="fill" style="color:var(--color-warning);flex-shrink:0" />
                <span style="font-size:13px;color:var(--color-warning);font-weight:500">กรุณากรอกข้อมูลเพื่อยืนยันการยกเลิก</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:14px">
                <div class="bh-field">
                  <label class="bh-label">เหตุผลการยกเลิก <span style="color:var(--color-danger)">*</span></label>
                  <textarea v-model="editForm.cancelReason" class="bh-input bh-textarea"
                    placeholder="ระบุเหตุผลการยกเลิกการจอง..." />
                </div>
                <div class="bh-field">
                  <label class="bh-label">รหัสพนักงาน Admin <span style="color:var(--color-danger)">*</span></label>
                  <input v-model="editForm.adminCode" class="bh-input"
                    placeholder="กรอกรหัสพนักงาน Admin เพื่อยืนยัน"
                    style="font-family:monospace"
                    autocomplete="off" />
                  <p style="font-size:11px;color:var(--color-text-tertiary);margin-top:4px">
                    รหัสพนักงานจะถูกบันทึกเป็นหลักฐานการยกเลิก
                  </p>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Footer -->
        <div style="height:1px;background:var(--color-border-tertiary)" />
        <div style="display:flex;gap:10px;padding:16px 24px;justify-content:flex-end">
          <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showModal=false">ยกเลิก</button>
          <button
            :class="['adm-hdr-btn', editForm.status==='ยกเลิก' ? 'adm-hdr-btn-danger-btn' : 'adm-hdr-btn-primary']"
            :disabled="!canSave"
            @click="saveEdit"
          >
            {{ editForm.status === 'ยกเลิก' ? 'ยืนยันการยกเลิก' : 'บันทึก' }}
          </button>
        </div>

      </div>
    </Transition>
  </Teleport>

</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PhMagnifyingGlass, PhPencilSimple, PhTrash, PhX, PhWarning } from '@phosphor-icons/vue'

interface Booking {
  id: number; code: string; name: string; type: string
  bookingDate: string; slot: string; slotTime: string
  status: 'จองแล้ว'|'เสร็จสิ้น'|'ยกเลิก'|'ไม่มา'
  bookedAt: string; cancelledAt?: string
}

const bookings = ref<Booking[]>([
  { id:1, code:'BK1774335319901243', name:'รณพร เจริญทิพย์',        type:'อื่นๆ', bookingDate:'24/03/2026', slot:'Lunch',  slotTime:'13:00-15:00', status:'เสร็จสิ้น', bookedAt:'24/03/2026' },
  { id:2, code:'WI1774335204511314', name:'ฉัตร จักรพันธ์ประดิษฐ์', type:'อื่นๆ', bookingDate:'24/03/2026', slot:'Lunch',  slotTime:'13:00-15:00', status:'เสร็จสิ้น', bookedAt:'24/03/2026' },
  { id:3, code:'BK1774328453268950', name:'เจตพัทธ์ สีสะอาด',       type:'อื่นๆ', bookingDate:'25/03/2026', slot:'Dinner', slotTime:'17:00-18:00', status:'ไม่มา',    bookedAt:'24/03/2026' },
  { id:4, code:'BK1774328433309735', name:'เจตพัทธ์ สีสะอาด',       type:'อื่นๆ', bookingDate:'25/03/2026', slot:'Lunch',  slotTime:'13:00-15:00', status:'ยกเลิก',   bookedAt:'24/03/2026', cancelledAt:'' },
  { id:5, code:'BK1774328172149765', name:'เจตพัทธ์ สีสะอาด',       type:'อื่นๆ', bookingDate:'24/03/2026', slot:'Lunch',  slotTime:'13:00-15:00', status:'จองแล้ว',  bookedAt:'24/03/2026' },
])

const search       = ref('')
const filterStatus = ref('')
const filterSlot   = ref('')
const filterDate   = ref('')
const pageSize     = ref(10)
const currentPage  = ref(1)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return bookings.value.filter(b => {
    const matchQ = !q || b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
    const matchS = !filterStatus.value || b.status === filterStatus.value
    const matchT = !filterSlot.value   || b.slot   === filterSlot.value
    return matchQ && matchS && matchT
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() => filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value))

// Edit modal
const showModal  = ref(false)
const editTarget = ref<Booking | null>(null)
const editForm   = ref({ status: 'จองแล้ว' as Booking['status'], cancelReason: '', adminCode: '' })

const canSave = computed(() => {
  if (editForm.value.status !== 'ยกเลิก') return true
  return !!editForm.value.cancelReason.trim() && !!editForm.value.adminCode.trim()
})

function openEdit(b: Booking) {
  editTarget.value = b
  editForm.value = { status: b.status, cancelReason: '', adminCode: '' }
  showModal.value = true
}

function saveEdit() {
  if (!editTarget.value || !canSave.value) return
  const idx = bookings.value.findIndex(x => x.id === editTarget.value!.id)
  if (idx >= 0) {
    bookings.value[idx] = {
      ...bookings.value[idx],
      status: editForm.value.status,
      cancelledAt: editForm.value.status === 'ยกเลิก'
        ? new Date().toLocaleDateString('th-TH', { day:'2-digit', month:'2-digit', year:'numeric' })
        : bookings.value[idx].cancelledAt,
    }
  }
  showModal.value = false
}

function deleteBooking(b: Booking) { bookings.value = bookings.value.filter(x => x.id !== b.id) }
</script>

<style scoped>
/* Edit modal */
.bh-backdrop { position:fixed; inset:0; z-index:50; background:rgba(0,0,0,0.4); }
.bh-modal {
  position:fixed; top:50%; left:50%; z-index:51; transform:translate(-50%,-50%);
  background:#fff; border-radius:14px; width:calc(100vw - 48px); max-width:460px;
  box-shadow:0 16px 48px rgba(0,0,0,0.16); overflow:hidden;
}
.bh-modal-header {
  display:flex; justify-content:space-between; align-items:flex-start;
  padding:20px 24px 16px;
}
.bh-modal-title { font-size:17px; font-weight:500; color:var(--color-text-primary); }
.bh-close { background:none; border:none; cursor:pointer; color:var(--color-text-tertiary); padding:4px; border-radius:6px; display:flex; align-items:center; }
.bh-close:hover { background:#F2F2F7; }
.bh-info-box { background:var(--color-bg-secondary); border-radius:8px; padding:12px 14px; }
.bh-field { display:flex; flex-direction:column; gap:5px; }
.bh-label { font-size:12px; color:var(--color-text-secondary); }
.bh-input {
  height:42px; padding:0 12px; border-radius:8px;
  border:1.5px solid #D0D0D0; font-size:14px; color:var(--color-text-primary);
  outline:none; font-family:inherit; background:#fff; width:100%; box-sizing:border-box;
  transition:border-color 0.15s;
}
.bh-input:focus { border-color:var(--color-primary); }
.bh-select   { cursor:pointer; }
.bh-textarea { height:80px; padding:10px 12px; resize:vertical; line-height:1.5; }

.bh-cancel-section {
  background:#FFFBEB; border:1px solid #FDE68A;
  border-radius:10px; padding:16px;
}

.adm-hdr-btn-danger-btn {
  background:var(--color-danger); color:#fff;
}
.adm-hdr-btn-danger-btn:hover:not(:disabled) { opacity:0.9; }
.adm-hdr-btn-danger-btn:disabled { opacity:0.4; cursor:not-allowed; }

.cancel-section-enter-active, .cancel-section-leave-active { transition:opacity 0.2s, transform 0.2s; }
.cancel-section-enter-from, .cancel-section-leave-to { opacity:0; transform:translateY(-6px); }

.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity:0; transform:translate(-50%,-48%); }

.bh-type-badge {
  display:inline-block; margin-top:4px;
  font-size:11px; padding:2px 8px; border-radius:100px;
  background:var(--color-bg-secondary); color:var(--color-text-secondary);
}
.bh-status {
  display:inline-block; font-size:12px; font-weight:500;
  padding:4px 12px; border-radius:100px; white-space:nowrap;
}
.bh-status-จองแล้ว  { background:#FEF3C7; color:#92400E; }
.bh-status-เสร็จสิ้น { background:#D1FAE5; color:#065F46; }
.bh-status-ยกเลิก   { background:#F3F4F6; color:#6B7280; }
.bh-status-ไม่มา    { background:#FEE2E2; color:#991B1B; }
</style>
