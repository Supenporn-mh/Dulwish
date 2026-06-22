<template>
  <div style="display:flex;flex-direction:column;gap:16px;max-width:560px">

    <p style="font-size:13px;color:#8E8E93">กำหนดระดับชั้นให้นักเรียนที่ย้ายเข้ากลางปีการศึกษา</p>

    <!-- Error -->
    <div v-if="pageError" class="me-error-bar">
      <span>{{ pageError }}</span>
      <button style="background:none;border:none;cursor:pointer;font-size:12px;color:#8E8E93" @click="pageError=''">ปิด</button>
    </div>

    <!-- Step 1: Search student -->
    <div class="me-card">
      <div class="me-card-title">
        <span class="me-step-badge">1</span>
        ค้นหานักเรียน
      </div>

      <div style="display:flex;gap:8px;padding:16px 16px 0">
        <div class="me-search-wrap">
          <PhMagnifyingGlass :size="15" style="color:#AEAEB2;flex-shrink:0" />
          <input
            v-model="searchQ"
            class="me-search-input"
            placeholder="ชื่อ, นามสกุล หรือ UID"
            @input="onSearch"
          />
        </div>
      </div>

      <!-- Search results -->
      <div v-if="searching" style="padding:16px;text-align:center;font-size:13px;color:#8E8E93">กำลังค้นหา...</div>
      <div v-else-if="searchResults.length > 0" style="padding:8px 0">
        <div
          v-for="s in searchResults"
          :key="s._id"
          :class="['me-student-row', selectedStudent?._id === s._id ? 'me-student-row-selected' : '']"
          @click="selectStudent(s)"
        >
          <div class="me-avatar">{{ s.firstName?.[0] ?? '?' }}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:500;color:#1C1C1E">{{ s.firstName }} {{ s.lastName }}</div>
            <div style="font-size:12px;color:#8E8E93">{{ s.uid }} · {{ s.studentProfile?.gradeLevel ?? 'ยังไม่มีระดับชั้น' }}</div>
          </div>
          <PhCheckCircle v-if="selectedStudent?._id === s._id" :size="18" weight="fill" style="color:var(--color-primary);flex-shrink:0" />
        </div>
      </div>
      <div v-else-if="searchQ.length >= 2 && !searching" style="padding:16px;text-align:center;font-size:13px;color:#AEAEB2">
        ไม่พบนักเรียน
      </div>
      <div v-else style="padding:8px 16px 16px">
        <p style="font-size:12px;color:#AEAEB2">พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา</p>
      </div>
    </div>

    <!-- Step 2: Assign grade (แสดงหลังเลือก student แล้ว) -->
    <Transition name="slide-down">
      <div v-if="selectedStudent" class="me-card">
        <div class="me-card-title">
          <span class="me-step-badge">2</span>
          กำหนดระดับชั้น
        </div>

        <!-- Selected student summary -->
        <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:#F9F9FB;border-bottom:1px solid #F0F0F0">
          <div class="me-avatar">{{ selectedStudent.firstName?.[0] ?? '?' }}</div>
          <div>
            <div style="font-size:14px;font-weight:500;color:#1C1C1E">{{ selectedStudent.firstName }} {{ selectedStudent.lastName }}</div>
            <div style="font-size:12px;color:#8E8E93">ระดับชั้นปัจจุบัน: {{ selectedStudent.studentProfile?.gradeLevel ?? '—' }}</div>
          </div>
          <button style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:12px;color:#8E8E93" @click="selectedStudent=null">เปลี่ยน</button>
        </div>

        <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
          <!-- Grade level select -->
          <div class="me-field">
            <label class="me-label">ระดับชั้นใหม่ <span style="color:var(--color-danger)">*</span></label>
            <select v-model="newGrade" class="me-select">
              <option value="" disabled>เลือกระดับชั้น</option>
              <option v-for="g in gradeLevels" :key="g.id" :value="g.code">
                {{ g.code }} — {{ g.name }}
              </option>
            </select>
          </div>

        </div>
      </div>
    </Transition>

    <!-- Confirm button -->
    <Transition name="slide-down">
      <div v-if="selectedStudent && newGrade">
        <button
          class="me-btn-confirm"
          :disabled="saving"
          @click="submit"
        >
          <template v-if="saving">กำลังบันทึก...</template>
          <template v-else>
            <PhCheckCircle :size="16" weight="fill" />
            ยืนยันการลงทะเบียน
          </template>
        </button>
      </div>
    </Transition>

    <!-- Success banner -->
    <Transition name="slide-down">
      <div v-if="successMsg" class="me-success-bar">
        <PhCheckCircle :size="18" weight="fill" style="flex-shrink:0" />
        {{ successMsg }}
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PhMagnifyingGlass, PhCheckCircle } from '@phosphor-icons/vue'
import type { GradeLevel } from '@/api/types'
import { listGradeLevels, midYearEnroll } from '@/api/settings'
import api from '@/api/axios'

const gradeLevels   = ref<GradeLevel[]>([])
const pageError     = ref('')
const searchQ       = ref('')
const searching     = ref(false)
const searchResults = ref<any[]>([])
const selectedStudent = ref<any | null>(null)
const newGrade      = ref('')
const saving        = ref(false)
const successMsg    = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  if (searchQ.value.length < 2) { searchResults.value = []; return }
  searchTimer = setTimeout(doSearch, 350)
}

async function doSearch() {
  searching.value = true
  try {
    const { data } = await api.get('/users', { params: { role: 'student', q: searchQ.value } })
    searchResults.value = data.users ?? []
  } catch { pageError.value = 'ค้นหาไม่สำเร็จ' }
  finally { searching.value = false }
}

function selectStudent(s: any) {
  selectedStudent.value = s
  newGrade.value = s.studentProfile?.gradeLevel ?? ''
  successMsg.value = ''
}

async function submit() {
  if (!selectedStudent.value || !newGrade.value) return
  saving.value   = true
  pageError.value = ''
  try {
    await midYearEnroll({
      studentId:  selectedStudent.value._id,
      gradeLevel: newGrade.value,
    })
    successMsg.value = `${selectedStudent.value.firstName} ${selectedStudent.value.lastName} ถูกกำหนดให้ระดับชั้น ${newGrade.value} แล้ว`
    selectedStudent.value = null
    searchQ.value = ''
    searchResults.value = []
    newGrade.value = ''
  } catch (e: any) {
    pageError.value = e?.response?.data?.error?.message ?? 'บันทึกไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    gradeLevels.value = await listGradeLevels()
  } catch { /* non-critical */ }
})
</script>

<style scoped>
.me-error-bar {
  background:#FFF2F2;border:1px solid #FFCDD2;border-radius:10px;
  padding:10px 14px;display:flex;align-items:center;justify-content:space-between;
  font-size:13px;color:#C62828;
}
.me-success-bar {
  background:var(--color-success-bg);border:1px solid #B7E7D3;border-radius:10px;
  padding:12px 16px;display:flex;align-items:center;gap:8px;
  font-size:13px;color:#028A60;font-weight:500;
}
.me-card {
  background:#fff;border-radius:12px;border:1px solid #EBEBEB;overflow:hidden;
}
.me-card-title {
  display:flex;align-items:center;gap:10px;
  padding:14px 16px;font-size:14px;font-weight:500;color:#1C1C1E;
  border-bottom:1px solid #F5F5F7;
}
.me-step-badge {
  width:22px;height:22px;border-radius:50%;
  background:var(--color-primary);color:#fff;
  font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.me-search-wrap {
  flex:1;height:40px;padding:0 10px;border:1px solid #E8E8E8;border-radius:var(--radius-md);
  background:#fff;display:flex;align-items:center;gap:8px;
  transition:border-color 0.15s;margin-bottom:8px;
}
.me-search-wrap:focus-within { border-color:var(--color-primary); }
.me-search-input {
  flex:1;border:none;outline:none;font-size:14px;color:#1C1C1E;font-family:inherit;background:transparent;
}
.me-student-row {
  display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;
  transition:background 0.15s;
}
.me-student-row:hover { background:#F9F9FB; }
.me-student-row-selected { background:var(--color-primary-tint); }
.me-avatar {
  width:36px;height:36px;border-radius:50%;background:var(--color-primary-tint);
  color:var(--color-primary);font-size:14px;font-weight:600;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.me-field { display:flex;flex-direction:column;gap:6px; }
.me-label { font-size:13px;font-weight:500;color:#3C3C43; }
.me-select,.me-input {
  height:44px;padding:0 12px;border-radius:var(--radius-md);border:1px solid #E8E8E8;
  background:#fff;font-size:14px;color:#1C1C1E;font-family:inherit;outline:none;
  transition:border-color 0.15s;
}
.me-select:focus,.me-input:focus { border-color:var(--color-primary); }
.me-btn-confirm {
  width:100%;height:48px;border-radius:var(--radius-md);border:none;
  background:var(--color-primary);color:#fff;font-size:15px;font-weight:500;
  font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
  transition:opacity 0.15s;
}
.me-btn-confirm:hover { opacity:0.9; }
.me-btn-confirm:disabled { background:#E5E5EA;color:#AEAEB2;cursor:not-allowed; }

.slide-down-enter-active,.slide-down-leave-active { transition:opacity 0.25s,transform 0.25s; }
.slide-down-enter-from,.slide-down-leave-to { opacity:0;transform:translateY(-8px); }
</style>
