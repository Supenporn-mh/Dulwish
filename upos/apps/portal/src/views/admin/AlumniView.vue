<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">ค้นหาศิษย์เก่า</h2>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="router.push('/admin/alumni/manage')">
        <PhGear :size="14" /> จัดการศิษย์เก่า
      </button>
    </div>

    <!-- Search card -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <p style="font-size:16px;font-weight:500;color:#1C1C1E;margin-bottom:16px">รายชื่อศิษย์เก่า</p>
      <div class="flex flex-wrap gap-3 items-end">

        <!-- ค้นหารายชื่อ -->
        <div style="display:flex;flex-direction:column;gap:5px;flex:2;min-width:220px">
          <label class="promo-label">ค้นหารายชื่อ</label>
          <div class="alumni-search-wrap">
            <PhMagnifyingGlass :size="14" style="color:#AEAEB2;flex-shrink:0" />
            <input v-model="search" class="alumni-search-input" placeholder="ค้นหารหัสนักเรียน / รายชื่อนักเรียน" />
          </div>
        </div>

        <!-- สถานะ -->
        <div style="display:flex;flex-direction:column;gap:5px;min-width:160px">
          <label class="promo-label">สถานะ <span style="color:var(--color-danger)">*</span></label>
          <select v-model="filterStatus" class="adm-filter-select" style="height:38px">
            <option value="">ทั้งหมด</option>
            <option value="graduated">จบการศึกษา</option>
            <option value="transferred">ย้ายโรงเรียน</option>
            <option value="dropped">ออกกลางคัน</option>
          </select>
        </div>

        <!-- จบปีการศึกษา -->
        <div style="display:flex;flex-direction:column;gap:5px;min-width:140px">
          <label class="promo-label">จบปีการศึกษา</label>
          <div class="alumni-year-wrap">
            <PhCalendarBlank :size="14" style="color:#AEAEB2;flex-shrink:0" />
            <input v-model="filterYear" type="number" class="alumni-search-input" placeholder="ปีการศึกษา" style="width:80px" />
          </div>
        </div>

        <!-- ปุ่มค้นหา -->
        <button class="adm-search-btn" style="height:38px;min-width:88px" @click="doSearch">ค้นหา</button>
      </div>
    </div>

    <!-- Result count -->
    <p style="font-size:13px;color:#3C3C43">ผลการค้นหา : {{ filtered.length }}</p>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th>รหัสนักเรียน <PhCaretUpDown :size="11" style="vertical-align:middle;color:#AEAEB2" /></th>
            <th>ชื่อ - นามสกุล <PhCaretUpDown :size="11" style="vertical-align:middle;color:#AEAEB2" /></th>
            <th class="center">สถานะ <PhCaretUpDown :size="11" style="vertical-align:middle;color:#AEAEB2" /></th>
            <th class="center">จบปีการศึกษา <PhCaretUpDown :size="11" style="vertical-align:middle;color:#AEAEB2" /></th>
            <th class="center">วันที่จบ (พ.ศ.) <PhCaretUpDown :size="11" style="vertical-align:middle;color:#AEAEB2" /></th>
            <th class="center">อัปเดตล่าสุด <PhCaretUpDown :size="11" style="vertical-align:middle;color:#AEAEB2" /></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="center" style="padding:32px;color:#AEAEB2">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="filtered.length === 0">
            <td colspan="7" class="center" style="padding:64px;color:#AEAEB2;font-size:15px">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="a in paginated" :key="a.uid">
            <td><span class="adm-code">{{ a.uid }}</span></td>
            <td>
              <div style="font-weight:500;color:#1C1C1E">{{ a.firstName }} {{ a.lastName }}</div>
              <div v-if="a.gradeLevel" style="font-size:11px;color:#AEAEB2">{{ a.gradeLevel }}</div>
            </td>
            <td class="center">
              <span :class="['adm-badge', statusBadge(a.exitReason)]">
                {{ statusLabel(a.exitReason) }}
              </span>
            </td>
            <td class="center" style="font-size:13px">{{ a.graduationYear ?? '—' }}</td>
            <td class="center" style="font-size:13px">{{ a.graduationDate ?? '—' }}</td>
            <td class="center" style="font-size:12px;color:#AEAEB2">{{ a.updatedAt ?? '—' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="adm-pagination">
        <div class="adm-pagination-left">
          <span>ทั้งหมด {{ filtered.length }} คน</span>
          <span class="adm-pagination-sep">|</span>
          <span>แสดงผล</span>
          <select v-model="pageSize" class="adm-page-size">
            <option :value="10">10 รายการ</option>
            <option :value="25">25 รายการ</option>
            <option :value="50">50 รายการ</option>
          </select>
        </div>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>
          <button v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage === p ? 'active' : '']"
            @click="currentPage = p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PhMagnifyingGlass, PhCalendarBlank, PhCaretUpDown, PhGear } from '@phosphor-icons/vue'
const router = useRouter()
import api from '@/api/axios'

interface Alumni {
  uid:            string
  firstName:      string
  lastName:       string
  gradeLevel?:    string
  graduationYear?: string
  graduationDate?: string
  exitReason?:    'graduated' | 'transferred' | 'dropped'
  exitRemark?:    string
  updatedAt?:     string
}

const loading     = ref(false)
const alumni      = ref<Alumni[]>([])
const search      = ref('')
const filterStatus = ref('')
const filterYear  = ref(new Date().getFullYear() + 543 + '')
const currentPage = ref(1)
const pageSize    = ref(20)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return alumni.value.filter(a => {
    const matchSearch = !q ||
      a.uid.toLowerCase().includes(q) ||
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
    const matchStatus = !filterStatus.value || a.exitReason === filterStatus.value
    const matchYear   = !filterYear.value   || a.graduationYear === filterYear.value
    return matchSearch && matchStatus && matchYear
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() =>
  filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
)

function doSearch() { currentPage.value = 1 }

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
  try {
    const res = await api.get('/admin/students')
    const all = res.data?.students ?? res.data ?? []
    alumni.value = all
      .filter((s: any) => s.status === 'inactive' || s.gradeLevel === 'GRADUATED')
      .map((s: any) => ({
        uid:            s.uid,
        firstName:      s.firstName,
        lastName:       s.lastName,
        gradeLevel:     s.gradeLevel === 'GRADUATED' ? 'S6 (จบแล้ว)' : s.gradeLevel,
        graduationYear: filterYear.value,
        graduationDate: '',
        exitReason:     'graduated' as const,
        exitRemark:     '',
        updatedAt:      '',
      }))
  } catch {
    alumni.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchAlumni)
</script>

<style scoped>
.alumni-search-wrap,
.alumni-year-wrap {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid #E8E8E8; border-radius: 8px;
  padding: 0 12px; height: 38px; background: #fff;
}
.alumni-search-input {
  border: none; outline: none; flex: 1;
  font-size: 13px; color: #1C1C1E; background: transparent;
  font-family: inherit;
}
.alumni-search-input::placeholder { color: #AEAEB2; }

.adm-badge        { display:inline-block; padding:3px 10px; border-radius:100px; font-size:11px; font-weight:500; }
.adm-badge-success { background:var(--color-success-bg); color:#028A60; }
.adm-badge-topup   { background:var(--color-primary-tint); color:var(--color-primary); }
.adm-badge-void    { background:var(--color-danger-bg); color:#CC3333; }
</style>
