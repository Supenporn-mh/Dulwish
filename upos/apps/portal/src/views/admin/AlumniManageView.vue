<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Breadcrumb -->
    <div class="am-breadcrumb">
      <span @click="router.push('/admin/alumni')" class="am-bc-link">รายชื่อศิษย์เก่า</span>
      <span class="am-bc-sep">›</span>
      <span class="am-bc-current">จัดการศิษย์เก่า</span>
    </div>

    <!-- Search card -->
    <div class="adm-table-wrap" style="padding:20px;border-radius:12px">
      <p style="font-size:15px;font-weight:500;color:var(--color-text-primary);margin-bottom:16px">ค้นหาศิษย์เก่า</p>
      <div class="flex flex-wrap gap-3 items-end">
        <div style="flex:2;min-width:220px;display:flex;flex-direction:column;gap:5px">
          <label class="am-label">ค้นหารายชื่อ</label>
          <div class="alumni-search-wrap">
            <PhMagnifyingGlass :size="14" style="color:var(--color-text-tertiary);flex-shrink:0" />
            <input v-model="search" class="alumni-search-input" placeholder="ค้นหารหัสนักเรียน / รายชื่อนักเรียน" />
          </div>
        </div>
        <div style="min-width:160px;display:flex;flex-direction:column;gap:5px">
          <label class="am-label">สถานะ <span style="color:var(--color-danger)">*</span></label>
          <select v-model="filterStatus" class="adm-filter-select" style="height:38px">
            <option value="">ทั้งหมด</option>
            <option value="graduated">จบการศึกษา</option>
            <option value="transferred">ย้ายโรงเรียน</option>
            <option value="dropped">ออกกลางคัน</option>
          </select>
        </div>
        <div style="min-width:140px;display:flex;flex-direction:column;gap:5px">
          <label class="am-label">จบปีการศึกษา</label>
          <div class="alumni-search-wrap" style="height:38px">
            <PhCalendarBlank :size="14" style="color:var(--color-text-tertiary);flex-shrink:0" />
            <input v-model="filterYear" type="number" class="alumni-search-input" style="width:70px" />
          </div>
        </div>
        <button class="adm-search-btn" style="height:38px" @click="doSearch">ค้นหา</button>
      </div>
    </div>

    <!-- Action row -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <span style="font-size:13px;color:var(--color-text-secondary)">
        เลือก: {{ selectedIds.length }} / {{ filtered.length }}
      </span>
      <div class="flex gap-2">
        <button
          class="adm-hdr-btn adm-hdr-btn-ghost"
          :disabled="selectedIds.length === 0 || saving"
          @click="restoreSelected"
        >
          <PhArrowCounterClockwise :size="14" /> {{ saving ? 'กำลังบันทึก...' : 'นำกลับเข้าระบบ' }}
        </button>
        <button
          class="adm-hdr-btn"
          style="background:var(--color-danger-bg);color:var(--color-danger);border:1px solid #ffcdd2"
          :disabled="selectedIds.length === 0 || saving"
          @click="deleteSelected"
        >
          <PhTrash :size="14" /> ลบออกจากระบบ
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th style="width:40px;padding:10px 16px">
              <input type="checkbox" class="am-checkbox"
                :checked="selectedIds.length === filtered.length && filtered.length > 0"
                @change="toggleAll"
              />
            </th>
            <th>รหัสนักเรียน</th>
            <th>ชื่อ - นามสกุล</th>
            <th class="center">สถานะ</th>
            <th class="center">จบปีการศึกษา</th>
            <th class="center">วันที่จบ (พ.ศ.)</th>
            <th>หมายเหตุการออก</th>
            <th>จัดการโดย</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="center" style="padding:32px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="8" class="center" style="padding:32px;color:#CC3333;font-size:13px">{{ error }}</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="8" class="center" style="padding:64px;color:var(--color-text-tertiary);font-size:15px">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="a in paginated" :key="a.uid">
            <td style="padding:10px 16px">
              <input type="checkbox" class="am-checkbox"
                :checked="selectedIds.includes(a.uid)"
                @change="toggleRow(a.uid)"
              />
            </td>
            <td><span class="adm-code">{{ a.uid }}</span></td>
            <td style="font-weight:500;color:var(--color-primary)">{{ a.firstName }} {{ a.lastName }}</td>
            <td class="center">
              <span :class="['adm-badge', statusBadge(a.exitReason)]">{{ statusLabel(a.exitReason) }}</span>
            </td>
            <td class="center" style="font-size:13px">{{ a.graduationYear ?? '—' }}</td>
            <td class="center" style="font-size:13px">{{ a.graduationDate ?? '—' }}</td>
            <td style="font-size:13px;color:var(--color-text-secondary)">{{ a.exitRemark || '—' }}</td>
            <td style="font-size:12px;color:var(--color-text-tertiary)">{{ a.managedBy || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Bottom bar -->
      <div class="am-bottom">
        <div class="flex items-center gap-2">
          <span style="font-size:13px;color:var(--color-text-secondary)">แสดง</span>
          <select v-model="pageSize" class="adm-filter-select" style="height:32px;width:70px;min-width:70px">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
          <span style="font-size:13px;color:var(--color-text-secondary)">ข้อมูล</span>
        </div>

        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage===1" @click="currentPage=1">หน้าแรก</button>
          <button class="adm-page-btn" :disabled="currentPage===1" @click="currentPage--">ก่อนหน้า</button>
          <button v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage===p?'active':'']"
            @click="currentPage=p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage===totalPages" @click="currentPage++">หน้าต่อไป</button>
          <button class="adm-page-btn" :disabled="currentPage===totalPages" @click="currentPage=totalPages">หน้าสุดท้าย</button>
        </div>
      </div>
    </div>

    <!-- Footer note + buttons -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <span style="font-size:12px;color:var(--color-text-tertiary)">
        นำกลับเข้าระบบ / ลบออกจากระบบ: {{ pendingActions }}
      </span>
      <div class="flex gap-2">
        <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="router.back()">ยกเลิก</button>
        <button class="adm-hdr-btn adm-hdr-btn-primary" @click="saveChanges">บันทึก</button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  PhMagnifyingGlass, PhCalendarBlank,
  PhArrowCounterClockwise, PhTrash,
} from '@phosphor-icons/vue'
import api from '@/api/axios'

const router = useRouter()

interface Alumni {
  uid: string; firstName: string; lastName: string
  gradeLevel?: string; graduationYear?: string; graduationDate?: string
  exitReason?: 'graduated' | 'transferred' | 'dropped'
  exitRemark?: string; managedBy?: string
}

const loading     = ref(false)
const saving      = ref(false)
const error       = ref('')
const alumni      = ref<Alumni[]>([])
const search      = ref('')
const filterStatus = ref('')
const filterYear  = ref(new Date().getFullYear() + 543 + '')
const currentPage = ref(1)
const pageSize    = ref(10)
const selectedIds  = ref<string[]>([])
const pendingActions = ref(0)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return alumni.value.filter(a => {
    const matchQ = !q || a.uid.toLowerCase().includes(q) || `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
    const matchS = !filterStatus.value || a.exitReason === filterStatus.value
    const matchY = !filterYear.value   || a.graduationYear === filterYear.value
    return matchQ && matchS && matchY
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() =>
  filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value)
)

function doSearch()  { currentPage.value = 1 }

function toggleAll(e: Event) {
  selectedIds.value = (e.target as HTMLInputElement).checked
    ? filtered.value.map(a => a.uid) : []
}
function toggleRow(uid: string) {
  const idx = selectedIds.value.indexOf(uid)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(uid)
}

async function restoreSelected() {
  if (!selectedIds.value.length) return
  saving.value = true
  error.value = ''
  const ids = [...selectedIds.value]
  try {
    await Promise.all(ids.map(uid => api.patch(`/admin/students/${uid}`, { status: 'active' })))
    pendingActions.value += ids.length
    selectedIds.value = []
    await fetchAlumni()
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'นำกลับเข้าระบบไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}
async function deleteSelected() {
  if (!selectedIds.value.length) return
  saving.value = true
  error.value = ''
  const ids = [...selectedIds.value]
  try {
    await Promise.all(ids.map(uid => api.patch(`/admin/students/${uid}`, { status: 'inactive' })))
    pendingActions.value += ids.length
    selectedIds.value = []
    await fetchAlumni()
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'ลบออกจากระบบไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}
function saveChanges() { router.push('/admin/alumni') }

function statusLabel(r?: string) {
  if (r === 'graduated')   return 'จบการศึกษา'
  if (r === 'transferred') return 'ย้ายโรงเรียน'
  if (r === 'dropped')     return 'ออกกลางคัน'
  return 'จบการศึกษา'
}
function statusBadge(r?: string) {
  if (r === 'transferred') return 'adm-badge adm-badge-topup'
  if (r === 'dropped')     return 'adm-badge adm-badge-void'
  return 'adm-badge adm-badge-success'
}

async function fetchAlumni() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/admin/students')
    const all = res.data?.students ?? res.data ?? []
    alumni.value = all
      .filter((s: any) => s.status === 'inactive' || s.gradeLevel === 'GRADUATED')
      .map((s: any) => ({
        uid:            s.uid,
        firstName:      s.firstName,
        lastName:       s.lastName,
        gradeLevel:     s.gradeLevel,
        graduationYear: s.graduationYear ?? '',
        graduationDate: s.graduationDate ?? '',
        exitReason:     (s.exitReason as Alumni['exitReason']) ?? 'graduated',
        exitRemark:     s.exitRemark ?? '',
        managedBy:      s.managedBy ?? 'ระบบ',
      }))
  } catch (e: any) {
    alumni.value = []
    error.value = e?.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

onMounted(fetchAlumni)
</script>

<style scoped>
.am-breadcrumb { display:flex; align-items:center; gap:6px; font-size:13px; }
.am-bc-link    { color:var(--color-primary); cursor:pointer; font-weight:500; }
.am-bc-link:hover { text-decoration:underline; }
.am-bc-sep     { color:var(--color-text-tertiary); }
.am-bc-current { color:var(--color-text-secondary); }
.am-label      { font-size:12px; color:var(--color-text-secondary); }

.alumni-search-wrap {
  display:flex; align-items:center; gap:8px;
  border:1px solid var(--color-border-tertiary); border-radius:8px;
  padding:0 12px; height:38px; background:#fff;
}
.alumni-search-input {
  border:none; outline:none; flex:1;
  font-size:13px; color:var(--color-text-primary); background:transparent; font-family:inherit;
}
.alumni-search-input::placeholder { color:var(--color-text-tertiary); }

.am-checkbox { width:15px; height:15px; cursor:pointer; accent-color:var(--color-primary); }

.adm-badge        { display:inline-block; padding:3px 10px; border-radius:100px; font-size:11px; font-weight:500; }
.adm-badge-success { background:var(--color-success-bg); color:#028A60; }
.adm-badge-topup   { background:var(--color-primary-tint); color:var(--color-primary); }
.adm-badge-void    { background:var(--color-danger-bg); color:#CC3333; }

.am-bottom {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 20px; border-top:1px solid var(--color-border-tertiary);
  flex-wrap:wrap; gap:10px;
}
</style>
