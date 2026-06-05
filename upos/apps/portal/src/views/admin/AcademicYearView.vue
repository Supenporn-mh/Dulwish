<template>
  <div style="display:flex;flex-direction:column;gap:12px">

    <!-- Page header — title อยู่ใน topbar ของ AdminLayout แล้ว -->
    <div class="flex items-center justify-between">
      <p style="font-size:13px;color:#8E8E93">จัดการปีการศึกษาและวันที่ของภาคเรียน</p>
      <button class="ay-btn-primary" @click="addYear">
        <PhPlus :size="15" weight="bold" />
        เพิ่มปีการศึกษา
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="pageLoading" style="display:flex;align-items:center;justify-content:center;padding:48px 0">
      <span style="font-size:13px;color:#8E8E93">กำลังโหลด...</span>
    </div>

    <!-- Error state -->
    <div
      v-if="pageError && !pageLoading"
      style="background:#FFF2F2;border:1px solid #FFCDD2;border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px"
    >
      <span style="font-size:13px;color:#C62828">{{ pageError }}</span>
      <button
        style="background:none;border:none;cursor:pointer;color:#8E8E93;font-size:12px;flex-shrink:0"
        @click="pageError = ''"
      >ปิด</button>
    </div>

    <!-- Academic year cards -->
    <template v-if="!pageLoading">
    <div v-for="yr in years" :key="yr.id" class="ay-card">

      <!-- Card header -->
      <div class="ay-card-header">
        <div class="flex items-center gap-3">
          <!-- Graduation cap icon -->
          <div class="ay-year-icon">
            <PhGraduationCap :size="20" weight="fill" style="color:var(--color-primary)" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span style="font-size:16px;font-weight:500;color:#1C1C1E">ปีการศึกษา {{ yr.year }}</span>
              <span :class="['ay-badge', isComplete(yr) ? 'ay-badge-ok' : 'ay-badge-warn']">
                {{ isComplete(yr) ? 'ครบถ้วน' : 'ไม่ครบ' }}
              </span>
            </div>
            <p style="font-size:12px;color:#8E8E93;margin-top:2px">{{ yr.semesters.length }} ภาคเรียน</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Dirty indicator (no button) -->
          <div class="ay-save-status">
            <template v-if="yr.saving">
              <span class="ay-status-dot ay-status-saving" />
              <span class="ay-status-text">กำลังบันทึก...</span>
            </template>
            <template v-else-if="yr.isDirty">
              <span class="ay-status-dot ay-status-dirty" />
              <span class="ay-status-text" style="color:var(--color-warning)">ยังไม่บันทึก</span>
            </template>
            <template v-else-if="yr.savedAt">
              <span class="ay-status-dot ay-status-saved" />
              <span class="ay-status-text">บันทึกแล้ว {{ fmtTime(yr.savedAt) }}</span>
            </template>
          </div>

          <!-- Save button -->
          <button
            :class="['ay-btn-save', yr.isDirty ? 'ay-btn-save-dirty' : '']"
            :disabled="yr.saving"
            @click="saveYear(yr)"
          >
            <PhFloppyDisk :size="14" weight="fill" />
            {{ yr.saving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>

          <!-- Delete year — disabled ถ้าอยู่ในช่วงเปิดภาค -->
          <button
            class="ay-btn-icon ay-btn-del"
            :disabled="isYearActive(yr)"
            :title="isYearActive(yr) ? 'ไม่สามารถลบได้ขณะเปิดภาคเรียน' : 'ลบปีการศึกษา'"
            :style="isYearActive(yr) ? 'opacity:0.35;cursor:not-allowed' : ''"
            @click="deleteYear(yr)"
          >
            <PhTrash :size="15" />
          </button>

          <!-- Expand/collapse -->
          <button class="ay-btn-icon" @click="yr.expanded = !yr.expanded">
            <PhCaretUp v-if="yr.expanded" :size="16" weight="bold" />
            <PhCaretDown v-else :size="16" weight="bold" />
          </button>
        </div>
      </div>

      <!-- Expanded: semester table -->
      <Transition name="expand">
        <div v-if="yr.expanded" class="ay-table-wrap">
          <!-- Table header -->
          <div class="ay-row ay-row-head">
            <span class="ay-col-name">ชื่อภาคเรียน</span>
            <span class="ay-col-date">วันเริ่มต้น</span>
            <span class="ay-col-date">วันสิ้นสุด</span>
            <span class="ay-col-dur">ระยะเวลา</span>
            <span class="ay-col-act" />
          </div>

          <!-- Semester rows -->
          <div
            v-for="(sem, si) in yr.semesters"
            :key="sem.id"
            class="ay-row"
            :style="si > 0 ? 'border-top:1px solid #F5F5F7' : ''"
          >
            <!-- Name -->
            <div class="ay-col-name">
              <span style="font-size:14px;color:#1C1C1E">{{ sem.name }}</span>
            </div>

            <!-- Start date -->
            <div class="ay-col-date">
              <div class="ay-date-input" @click.stop="($event.currentTarget as HTMLElement).querySelector('input')?.showPicker?.()">
                <PhCalendarBlank :size="14" style="color:#8E8E93;flex-shrink:0;pointer-events:none" />
                <input
                  type="date"
                  v-model="sem.startDate"
                  class="ay-date-field"
                  :max="sem.endDate || undefined"
                  @change="markDirty(yr)"
                />
              </div>
            </div>

            <!-- End date -->
            <div class="ay-col-date">
              <div class="ay-date-input" @click.stop="($event.currentTarget as HTMLElement).querySelector('input')?.showPicker?.()">
                <PhCalendarBlank :size="14" style="color:#8E8E93;flex-shrink:0;pointer-events:none" />
                <input
                  type="date"
                  v-model="sem.endDate"
                  class="ay-date-field"
                  :min="sem.startDate || undefined"
                  @change="markDirty(yr)"
                />
              </div>
            </div>

            <!-- Duration (computed) -->
            <div class="ay-col-dur">
              <span v-if="sem.startDate && sem.endDate" style="font-size:13px;color:#3C3C43">
                {{ calcDays(sem.startDate, sem.endDate) }} วัน
              </span>
              <span v-else style="font-size:13px;color:#AEAEB2">—</span>
            </div>

            <!-- Delete -->
            <div class="ay-col-act">
              <button class="ay-btn-icon ay-btn-del" @click="removeSemester(yr, si)" title="ลบภาคเรียน">
                <PhTrash :size="14" />
              </button>
            </div>
          </div>

          <!-- Add semester row -->
          <div class="ay-add-row">
            <button class="ay-add-sem-btn" @click="addSemester(yr)">
              <PhPlus :size="13" weight="bold" />
              เพิ่มภาคเรียน
            </button>
          </div>
        </div>
      </Transition>
    </div>
    </template>

    <!-- ── Leave confirm modal ──────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showLeaveConfirm" class="modal-backdrop" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showLeaveConfirm" class="modal-box" style="max-width:440px">
          <div style="display:flex;justify-content:center;margin-bottom:14px">
            <div style="width:52px;height:52px;border-radius:50%;background:var(--color-warning-bg);display:flex;align-items:center;justify-content:center">
              <PhWarning :size="26" weight="fill" style="color:var(--color-warning)" />
            </div>
          </div>
          <h3 class="modal-title" style="text-align:center">ออกจากหน้านี้?</h3>
          <p class="modal-sub" style="text-align:center">
            การเปลี่ยนแปลงจะไม่ถูกบันทึก
          </p>
          <div class="modal-actions" style="flex-direction:row;gap:12px;margin-top:4px">
            <button
              style="flex:1;height:44px;padding:0 20px;border-radius:10px;border:1px solid #E8E8E8;background:#fff;font-size:14px;font-weight:500;color:var(--color-text-secondary);cursor:pointer;white-space:nowrap"
              @click="cancelLeave"
            >
              อยู่ที่หน้านี้
            </button>
            <button
              style="flex:1;height:44px;padding:0 20px;border-radius:10px;border:none;background:var(--color-danger);color:#fff;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap"
              @click="confirmLeave"
            >
              ออกจากหน้า
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Add Year Modal ────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showAddYearModal" class="modal-backdrop" @click="closeAddYearModal" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showAddYearModal" class="modal-box" style="width:420px;max-width:calc(100vw - 48px);min-height:260px">
          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h3 class="modal-title" style="margin:0">เพิ่มปีการศึกษาใหม่</h3>
            <button style="background:none;border:none;cursor:pointer;color:#8E8E93;display:flex;align-items:center;padding:4px;border-radius:6px" @click="closeAddYearModal">
              <PhX :size="18" weight="bold" />
            </button>
          </div>

          <!-- Year input -->
          <label style="font-size:13px;font-weight:500;color:#3C3C43;display:block;margin-bottom:6px">ปีเริ่มต้น</label>
          <input
            v-model.number="newYearInput"
            type="number"
            :placeholder="`e.g., ${new Date().getFullYear() + 1}`"
            class="ay-year-input"
            :class="{ 'ay-year-input-error': newYearError }"
            min="2020" max="2099"
            @input="validateNewYear"
          />
          <p v-if="newYearError" style="font-size:12px;color:var(--color-danger);margin-top:4px">{{ newYearError }}</p>

          <!-- Preview text -->
          <p v-if="newYearInput && !newYearError" style="font-size:13px;color:#8E8E93;margin-top:10px;line-height:1.6">
            จะสร้างปีการศึกษา <strong style="color:#1C1C1E">{{ newYearInput }}/{{ newYearInput + 1 }}</strong>
            พร้อม 3 ภาคเรียนเริ่มต้น (Term 1, Term 2, Term 3)
          </p>

          <!-- Buttons -->
          <div style="display:flex;gap:10px;margin-top:20px">
            <button
              style="flex:1;height:44px;padding:0 16px;border-radius:10px;border:1px solid #E8E8E8;background:#fff;font-size:14px;font-weight:500;color:var(--color-text-secondary);cursor:pointer"
              @click="closeAddYearModal"
            >ยกเลิก</button>
            <button
              style="flex:1;height:44px;padding:0 16px;border-radius:10px;border:none;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.15s"
              :style="canCreateYear
                ? 'background:var(--color-primary);color:#fff;cursor:pointer'
                : 'background:#E5E5EA;color:#AEAEB2;cursor:not-allowed'"
              :disabled="!canCreateYear"
              @click="confirmAddYear"
            >สร้างปีการศึกษา</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Delete confirm modal ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showDeleteConfirm" class="modal-backdrop" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showDeleteConfirm" class="modal-box" style="width:420px;max-width:calc(100vw - 48px)">
          <div style="display:flex;justify-content:center;margin-bottom:14px">
            <div style="width:52px;height:52px;border-radius:50%;background:var(--color-danger-bg);display:flex;align-items:center;justify-content:center">
              <PhTrash :size="24" weight="fill" style="color:var(--color-danger)" />
            </div>
          </div>
          <h3 class="modal-title" style="text-align:center">ลบปีการศึกษา?</h3>
          <p class="modal-sub" style="text-align:center">
            ลบปีการศึกษา <strong style="color:#1C1C1E">{{ deleteTarget?.year }}</strong><br>
            และภาคเรียนทั้งหมดหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </p>
          <div style="display:flex;gap:10px;margin-top:4px">
            <button
              style="flex:1;height:44px;padding:0 16px;border-radius:10px;border:1px solid #E8E8E8;background:#fff;font-size:14px;font-weight:500;color:var(--color-text-secondary);cursor:pointer"
              @click="cancelDelete"
            >ยกเลิก</button>
            <button
              style="flex:1;height:44px;padding:0 16px;border-radius:10px;border:none;background:var(--color-danger);color:#fff;font-size:14px;font-weight:500;cursor:pointer"
              @click="confirmDelete"
            >ลบ</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Active year alert modal ───────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showActiveAlert" class="modal-backdrop" @click="showActiveAlert=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showActiveAlert" class="modal-box" style="width:420px;max-width:calc(100vw - 48px)">
          <div style="display:flex;justify-content:center;margin-bottom:14px">
            <div style="width:52px;height:52px;border-radius:50%;background:var(--color-warning-bg);display:flex;align-items:center;justify-content:center">
              <PhWarning :size="26" weight="fill" style="color:var(--color-warning)" />
            </div>
          </div>
          <h3 class="modal-title" style="text-align:center">ไม่สามารถลบได้</h3>
          <p class="modal-sub" style="text-align:center">
            ปีการศึกษา <strong style="color:#1C1C1E">{{ activeAlertYear }}</strong><br>
            อยู่ในช่วงเปิดภาคเรียนแล้ว ไม่สามารถลบได้
          </p>
          <button
            style="width:100%;height:44px;border-radius:10px;border:none;background:var(--color-primary);color:#fff;font-size:14px;font-weight:500;cursor:pointer"
            @click="showActiveAlert=false"
          >รับทราบ</button>
        </div>
      </Transition>
    </Teleport>

    <!-- Empty state -->
    <div v-if="!pageLoading && years.length === 0" class="ay-empty">
      <PhGraduationCap :size="40" weight="thin" style="color:#D0D0D0;margin-bottom:12px" />
      <p style="font-size:15px;color:#AEAEB2">ยังไม่มีข้อมูลปีการศึกษา</p>
      <button class="ay-btn-primary" style="margin-top:16px" @click="addYear">
        <PhPlus :size="15" weight="bold" /> เพิ่มปีการศึกษา
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import {
  PhPlus, PhGraduationCap, PhCalendarBlank,
  PhCaretUp, PhCaretDown, PhTrash, PhFloppyDisk, PhWarning, PhX,
} from '@phosphor-icons/vue'
import type { AcademicYear, Semester } from '@/api/types'
import {
  listAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
} from '@/api/settings'

// ── UI-extended type (UI-only fields never sent to API) ───────────────────────
interface AcademicYearUI extends AcademicYear {
  expanded: boolean
  isDirty:  boolean
  saving:   boolean
  savedAt:  Date | null
}

// ── Page-level loading / error state ─────────────────────────────────────────
const pageLoading = ref(false)
const pageError   = ref('')

// ── Add year modal state ──────────────────────────────────────────────────────
const showAddYearModal = ref(false)
const newYearInput     = ref<number | null>(null)
const newYearError     = ref('')

const existingYears = computed(() => new Set(years.value.map(y => parseInt(y.year.split('/')[0]))))

const canCreateYear = computed(() =>
  !!newYearInput.value && !newYearError.value && newYearInput.value >= 2020
)

function validateNewYear() {
  const y = newYearInput.value
  if (!y) { newYearError.value = ''; return }
  if (existingYears.value.has(y)) {
    newYearError.value = `ปีการศึกษา ${y}/${y+1} มีอยู่ในระบบแล้ว`
  } else if (y < 2020 || y > 2099) {
    newYearError.value = 'กรุณากรอกปี พ.ศ. ระหว่าง 2020–2099'
  } else {
    newYearError.value = ''
  }
}

function closeAddYearModal() {
  showAddYearModal.value = false
  newYearInput.value = null
  newYearError.value = ''
}

async function confirmAddYear() {
  if (!canCreateYear.value || !newYearInput.value) return
  const y1   = newYearInput.value
  const year = `${y1}/${y1 + 1}`
  const semesters: Semester[] = [
    { id: '', name: 'ภาคเรียนที่ 1', startDate: '', endDate: '' },
    { id: '', name: 'ภาคเรียนที่ 2', startDate: '', endDate: '' },
    { id: '', name: 'ภาคเรียนที่ 3', startDate: '', endDate: '' },
  ]
  closeAddYearModal()
  try {
    const created = await createAcademicYear({ year, semesters })
    years.value.unshift(toUI(created, true))
  } catch (e: any) {
    pageError.value = e?.response?.data?.message ?? e?.message ?? 'สร้างปีการศึกษาไม่สำเร็จ'
  }
}

// ── Route guard state ────────────────────────────────────────────────────────
const showLeaveConfirm = ref(false)
let   pendingNavigation: (() => void) | null = null

// ── Years list (empty until API loads) ───────────────────────────────────────
const years = ref<AcademicYearUI[]>([])

// ── Helper: wrap API AcademicYear with UI fields ──────────────────────────────
function toUI(ay: AcademicYear, expanded = false): AcademicYearUI {
  return { ...ay, expanded, isDirty: false, saving: false, savedAt: null }
}

// ── Load on mount ─────────────────────────────────────────────────────────────
onMounted(async () => {
  pageLoading.value = true
  pageError.value   = ''
  try {
    const data = await listAcademicYears()
    years.value = data.map((ay, i) => toUI(ay, i === 0))
  } catch (e: any) {
    pageError.value = e?.response?.data?.message ?? e?.message ?? 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    pageLoading.value = false
  }
})

const anyDirty = computed(() => years.value.some(y => y.isDirty))

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(0, Math.round(ms / 86400000) + 1)
}
function isComplete(yr: AcademicYearUI): boolean {
  return yr.semesters.length > 0 && yr.semesters.every(s => s.startDate && s.endDate)
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })
}

// ── Mark dirty (no auto-save) ─────────────────────────────────────────────────
function markDirty(yr: AcademicYearUI) {
  yr.isDirty = true
}

// ── Manual save ───────────────────────────────────────────────────────────────
async function saveYear(yr: AcademicYearUI) {
  if (!isComplete(yr)) {
    alert('กรุณากรอกวันที่ให้ครบทุกภาคเรียนก่อนบันทึก')
    return
  }
  yr.saving = true
  try {
    const payload: Partial<AcademicYear> = {
      year:      yr.year,
      semesters: yr.semesters.map(s => ({
        id:        s.id,
        name:      s.name,
        startDate: s.startDate,
        endDate:   s.endDate,
      })),
    }
    const updated = await updateAcademicYear(yr.id, payload)
    // merge API response back into local entry (preserves UI fields)
    const idx = years.value.findIndex(y => y.id === yr.id)
    if (idx !== -1) {
      years.value[idx] = {
        ...years.value[idx],
        ...updated,
        isDirty: false,
        saving:  false,
        savedAt: new Date(),
      }
    }
  } catch (e: any) {
    pageError.value = e?.response?.data?.message ?? e?.message ?? 'บันทึกไม่สำเร็จ'
    yr.saving = false
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
function addYear() {
  // เปิด modal กรอกปีแทน auto-add
  showAddYearModal.value = true
}

function isYearActive(yr: AcademicYearUI): boolean {
  const today = new Date().toISOString().split('T')[0]
  return yr.semesters.some(s =>
    s.startDate && s.endDate &&
    today >= s.startDate && today <= s.endDate
  )
}

const deleteTarget     = ref<AcademicYearUI | null>(null)
const showDeleteConfirm = ref(false)
const showActiveAlert   = ref(false)
const activeAlertYear   = ref('')

function deleteYear(yr: AcademicYearUI) {
  if (isYearActive(yr)) {
    activeAlertYear.value = yr.year
    showActiveAlert.value = true
    return
  }
  deleteTarget.value      = yr
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  deleteTarget.value      = null
  showDeleteConfirm.value = false
  try {
    await deleteAcademicYear(id)
    years.value = years.value.filter(y => y.id !== id)
  } catch (e: any) {
    pageError.value = e?.response?.data?.message ?? e?.message ?? 'ลบไม่สำเร็จ'
  }
}

function cancelDelete() {
  deleteTarget.value      = null
  showDeleteConfirm.value = false
}

function addSemester(yr: AcademicYearUI) {
  const n = yr.semesters.length + 1
  yr.semesters.push({ id:`sem-${Date.now()}`, name:`ภาคเรียนที่ ${n}`, startDate:'', endDate:'' })
  markDirty(yr)
}

function removeSemester(yr: AcademicYearUI, idx: number) {
  yr.semesters.splice(idx, 1)
  yr.semesters.forEach((s, i) => { s.name = `ภาคเรียนที่ ${i + 1}` })
  markDirty(yr)
}

// ── Route guard ───────────────────────────────────────────────────────────────
onBeforeRouteLeave((_to, _from, next) => {
  if (!anyDirty.value) { next(); return }
  pendingNavigation = next
  showLeaveConfirm.value = true
})

function confirmLeave() {
  years.value.forEach(y => { y.isDirty = false })
  showLeaveConfirm.value = false
  pendingNavigation?.()
  pendingNavigation = null
}

function cancelLeave() {
  showLeaveConfirm.value = false
  pendingNavigation?.(false as any)
  pendingNavigation = null
}
</script>

<style scoped>
/* ── Buttons ──────────────────────────────────────────────────────────── */
/* primary — btn-md ตาม design system §3 */
.ay-btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 16px; border-radius: var(--radius-md);
  background: var(--color-primary); color: #fff; border: none;
  font-size: 14px; font-weight: 500; font-family: inherit;
  cursor: pointer; transition: opacity 0.15s;
}
.ay-btn-primary:active { opacity: 0.8; }

/* ghost save button */
.ay-btn-save {
  display: inline-flex; align-items: center; gap: 5px;
  height: 32px; padding: 0 12px; border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  border: 0.5px solid var(--color-border-secondary);
  color: var(--color-text-secondary);
  font-size: 13px; font-weight: 500; font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.ay-btn-save:hover { background: var(--color-border-tertiary); }
.ay-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

/* dirty state — ปุ่มเปลี่ยนเป็นสีน้ำเงิน */
.ay-btn-save-dirty {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.ay-btn-save-dirty:hover { opacity: 0.9; background: var(--color-primary); }

/* ── Save status indicator ────────────────────────────────────────────── */
.ay-save-status {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--color-text-tertiary);
  min-width: 150px; justify-content: flex-end;
}
.ay-status-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.ay-status-dot.ay-status-dirty  { background: var(--color-warning); animation: pulse 1.2s infinite; }
.ay-status-dot.ay-status-saving { background: var(--color-primary); animation: pulse 0.8s infinite; }
.ay-status-dot.ay-status-saved  { background: var(--color-success); }
.ay-status-text { font-size: 12px; font-weight: 400; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

/* icon-only button */
.ay-btn-icon {
  width: 30px; height: 30px; border-radius: var(--radius-md);
  background: var(--color-bg-secondary); border: 0.5px solid var(--color-border-tertiary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--color-text-secondary);
  transition: background 0.15s, color 0.15s;
}
.ay-btn-icon:hover { background: var(--color-border-tertiary); color: #1C1C1E; }
.ay-btn-del { background: transparent; border: none; }
.ay-btn-del:hover { color: var(--color-danger); background: var(--color-danger-bg); }

/* ── Card ─────────────────────────────────────────────────────────────── */
.ay-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #EBEBEB;
  overflow: hidden;
}
.ay-card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
}
.ay-year-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: var(--color-primary-tint);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

/* Status badge — design system §4: pill, 12px/500, pad 3px 10px */
.ay-badge {
  font-size: 12px; font-weight: 500;
  padding: 3px 10px; border-radius: 20px;
}
.ay-badge-ok   { background: var(--color-success-bg); color: #028A60; }
.ay-badge-warn { background: var(--color-warning-bg); color: #C67100; }

/* ── Table inside card ────────────────────────────────────────────────── */
.ay-table-wrap { border-top: 1px solid #F0F0F0; }

.ay-row {
  display: grid;
  grid-template-columns: 160px 1fr 1fr 110px 40px;
  align-items: center;
  padding: 10px 20px;
  gap: 12px;
}
.ay-row-head {
  background: #FAFAFA;
  padding: 7px 20px;
}
.ay-row-head span {
  font-size: 12px; font-weight: 400; color: #AEAEB2;
}

/* Date input */
.ay-date-input {
  display: flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 10px;
  border: 1px solid #E8E8E8; border-radius: var(--radius-md);
  background: #fff; cursor: pointer;
  transition: border-color 0.15s;
}
.ay-date-input:focus-within { border-color: var(--color-primary); }
.ay-date-field {
  border: none; background: transparent; outline: none;
  font-size: 13px; color: #3C3C43; font-family: inherit;
  cursor: pointer; flex: 1; min-width: 0;
}
/* ซ่อน native browser calendar icon ทุก browser */
.ay-date-field::-webkit-calendar-picker-indicator {
  display: none;
  -webkit-appearance: none;
}
.ay-date-field::-webkit-inner-spin-button { display: none; }
.ay-date-field[type="date"] { appearance: none; -moz-appearance: none; }

/* Add semester link */
.ay-add-row { padding: 10px 20px; border-top: 1px dashed #E8E8E8; }
.ay-add-sem-btn {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 13px; font-weight: 500;
  color: var(--color-primary); background: none; border: none;
  cursor: pointer; padding: 0;
  transition: opacity 0.15s;
}
.ay-add-sem-btn:active { opacity: 0.7; }

/* Empty state */
.ay-empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 60px 24px;
  background: #fff; border-radius: 12px; border: 1px solid #EBEBEB;
}

/* Year number input */
.ay-year-input {
  width: 100%; height: 44px; padding: 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid #E8E8E8; background: #fff;
  font-size: 15px; color: #1C1C1E; font-family: inherit;
  outline: none; transition: border-color 0.15s;
}
.ay-year-input:focus { border-color: var(--color-primary); }
.ay-year-input-error { border-color: var(--color-danger) !important; }

/* Modal */
.modal-backdrop { position:fixed;inset:0;z-index:50;background:rgba(0,0,0,0.4); }
.modal-box {
  position:fixed;top:50%;left:50%;z-index:51;
  transform:translate(-50%,-50%);
  background:#fff;border-radius:16px;
  /* default size — overridden per modal via inline style */
  width:420px;max-width:calc(100vw - 48px);
  padding:28px 24px;
  box-shadow:0 16px 48px rgba(0,0,0,0.16);
  box-sizing:border-box;
}
.modal-title { font-size:18px;font-weight:500;color:#1C1C1E;margin-bottom:8px; }
.modal-sub   { font-size:13px;color:#8E8E93;line-height:1.6;margin-bottom:20px; }
.modal-actions { display:flex;flex-direction:column;gap:8px; }
.modal-bg-enter-active,.modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,.modal-bg-leave-to { opacity:0; }
.modal-up-enter-active,.modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,.modal-up-leave-to { opacity:0;transform:translate(-50%,-48%); }

/* Expand transition */
.expand-enter-active, .expand-leave-active {
  transition: opacity 0.2s, max-height 0.25s ease;
  overflow: hidden; max-height: 600px;
}
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; }
</style>
