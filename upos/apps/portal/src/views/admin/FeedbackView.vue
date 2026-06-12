<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <div>
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">Feedback</h2>
      <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">ความคิดเห็นจากผู้ใช้งาน</p>
    </div>

    <!-- Filters -->
    <div class="fb-filter-bar">
      <div class="fb-filter-group">
        <label class="fb-filter-label">Channel</label>
        <select v-model="filterChannel" class="fb-select" @change="onFilter">
          <option value="">ทั้งหมด</option>
          <option value="mobile">Mobile</option>
          <option value="kiosk">Kiosk</option>
        </select>
      </div>
      <div class="fb-filter-group">
        <label class="fb-filter-label">คะแนน</label>
        <select v-model="filterRating" class="fb-select" @change="onFilter">
          <option value="">ทั้งหมด</option>
          <option v-for="n in [5,4,3,2,1]" :key="n" :value="n">{{ '★'.repeat(n) + '☆'.repeat(5-n) }}</option>
        </select>
      </div>
      <div class="fb-filter-group">
        <label class="fb-filter-label">วันที่</label>
        <input v-model="filterDate" type="date" class="fb-input" @change="onFilter" />
      </div>
      <button v-if="hasFilter" class="fb-btn-clear" @click="clearFilter">ล้าง filter</button>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <div v-if="loading" style="padding:40px;text-align:center;color:#AEAEB2;font-size:14px">กำลังโหลด...</div>
      <div v-else-if="error" style="padding:24px;text-align:center;color:var(--color-danger);font-size:14px">{{ error }}</div>
      <div v-else-if="items.length === 0" style="padding:40px;text-align:center;color:#AEAEB2;font-size:14px">ยังไม่มีข้อมูล Feedback</div>
      <table v-else class="adm-table">
        <thead>
          <tr>
            <th style="width:48px">#</th>
            <th>ผู้ใช้งาน</th>
            <th style="width:100px">Channel</th>
            <th style="width:110px">คะแนน</th>
            <th style="width:120px">หมวดหมู่</th>
            <th>ความคิดเห็น</th>
            <th style="width:130px">วันที่</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(fb, i) in items" :key="fb.id">
            <td class="adm-td-num">{{ (page - 1) * limit + i + 1 }}</td>
            <td>
              <div v-if="fb.userName" style="font-size:13px;font-weight:500;color:#1C1C1E">{{ fb.userName }}</div>
              <div v-if="fb.userUid" style="font-size:11px;color:#AEAEB2;font-family:monospace">{{ fb.userUid }}</div>
              <div v-if="!fb.userName && !fb.userUid" style="font-size:13px;color:#AEAEB2">ไม่ระบุ</div>
            </td>
            <td>
              <span :class="['fb-badge', fb.channel === 'kiosk' ? 'fb-badge-kiosk' : 'fb-badge-mobile']">
                {{ fb.channel === 'kiosk' ? 'Kiosk' : 'Mobile' }}
              </span>
            </td>
            <td>
              <span v-if="fb.rating" class="fb-stars">
                <span v-for="n in 5" :key="n" :style="{ color: n <= fb.rating! ? '#FF9500' : '#E5E5EA' }">★</span>
              </span>
              <span v-else style="color:#AEAEB2;font-size:12px">—</span>
            </td>
            <td style="font-size:13px;color:#3C3C43">{{ fb.category || '—' }}</td>
            <td style="font-size:13px;color:#1C1C1E;max-width:240px">
              <span v-if="fb.comment" style="white-space:pre-line;word-break:break-word">{{ fb.comment }}</span>
              <span v-else style="color:#AEAEB2">—</span>
            </td>
            <td style="font-size:12px;color:#8E8E93;white-space:nowrap">{{ fmtDate(fb.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="fb-pagination">
      <button class="fb-page-btn" :disabled="page <= 1" @click="changePage(page - 1)">‹</button>
      <span class="fb-page-info">{{ page }} / {{ totalPages }}</span>
      <button class="fb-page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">›</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { FeedbackAdminItem } from '@/api/types'
import { getAdminFeedback } from '@/api/feedback'

const items        = ref<FeedbackAdminItem[]>([])
const total        = ref(0)
const page         = ref(1)
const limit        = ref(20)
const loading      = ref(false)
const error        = ref('')

const filterChannel = ref('')
const filterRating  = ref<number | ''>('')
const filterDate    = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const hasFilter  = computed(() => !!filterChannel.value || !!filterRating.value || !!filterDate.value)

async function load() {
  loading.value = true
  error.value   = ''
  try {
    const res = await getAdminFeedback({
      channel: filterChannel.value || undefined,
      rating:  filterRating.value  || undefined,
      date:    filterDate.value    || undefined,
      page:    page.value,
      limit:   limit.value,
    })
    items.value = res.feedbacks
    total.value = res.total
  } catch (e: any) {
    error.value = e?.response?.data?.error?.message ?? 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

function onFilter() {
  page.value = 1
  load()
}

function clearFilter() {
  filterChannel.value = ''
  filterRating.value  = ''
  filterDate.value    = ''
  onFilter()
}

function changePage(p: number) {
  page.value = p
  load()
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

onMounted(load)
</script>

<style scoped>
.fb-filter-bar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #EBEBEB;
  padding: 14px 16px;
}
.fb-filter-group { display: flex; flex-direction: column; gap: 5px; }
.fb-filter-label { font-size: 12px; font-weight: 500; color: #3C3C43; }
.fb-select, .fb-input {
  height: 36px;
  padding: 0 10px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid #E8E8E8;
  background: #F5F5F7;
  font-size: 13px;
  color: #1C1C1E;
  font-family: inherit;
  outline: none;
  min-width: 100px;
}
.fb-select:focus, .fb-input:focus { border-color: var(--color-primary); background: #fff; }
.fb-btn-clear {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid #E8E8E8;
  background: #fff;
  font-size: 13px;
  color: #8E8E93;
  cursor: pointer;
  font-family: inherit;
  align-self: flex-end;
}
.fb-btn-clear:hover { color: var(--color-danger); border-color: var(--color-danger); }
.fb-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.fb-badge-kiosk  { background: #EEF3FF; color: #1264E3; }
.fb-badge-mobile { background: #F0FDF4; color: #16A34A; }
.fb-stars { font-size: 15px; letter-spacing: 1px; }
.fb-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.fb-page-btn {
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid #E8E8E8;
  background: #fff;
  font-size: 16px;
  color: #3C3C43;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.fb-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.fb-page-info { font-size: 13px; color: #8E8E93; }
</style>
