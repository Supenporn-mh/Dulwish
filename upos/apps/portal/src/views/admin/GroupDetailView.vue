<template>
  <div style="display:flex;flex-direction:column;gap:20px">

    <!-- Back -->
    <button class="gd-back" @click="router.back()">
      <PhArrowLeft :size="16" />
      ย้อนกลับไปรายการกลุ่ม
    </button>

    <!-- Tab card -->
    <div class="adm-table-wrap gd-card">

      <!-- Tabs -->
      <div class="gd-tabs">
        <button
          :class="['gd-tab', activeTab === 'settings' ? 'gd-tab--active' : '']"
          @click="activeTab = 'settings'"
        >กำหนดสิทธิ์</button>
        <button
          :class="['gd-tab', activeTab === 'members' ? 'gd-tab--active' : '']"
          @click="activeTab = 'members'"
        >จัดการสมาชิก</button>
      </div>

      <!-- ── Tab 1: กำหนดสิทธิ์ ─────────────────────────────────────── -->
      <div v-if="activeTab === 'settings'" class="gd-body">

        <!-- ข้อมูลทั่วไป -->
        <p class="gd-section-title">ข้อมูลทั่วไป</p>
        <div class="gd-info-row">
          <div class="gd-field" style="flex:1">
            <label class="gd-label">รหัสกลุ่ม (GROUP ID)</label>
            <input v-model="form.id" class="gd-input" placeholder="G_CONTROLLER" style="font-family:monospace" />
          </div>
          <div class="gd-field" style="flex:1">
            <label class="gd-label">{{ isStudent ? 'ชื่อกลุ่มนักเรียน' : 'ชื่อกลุ่มสมาชิก' }}</label>
            <input v-model="form.name" class="gd-input" placeholder="ชื่อกลุ่ม" />
          </div>
          <button class="gd-save-btn" :disabled="!form.name" @click="save">บันทึก</button>
        </div>

        <!-- กำหนดสิทธิ์ -->
        <div class="gd-perm-header">
          <p class="gd-section-title" style="margin:0">{{ isStudent ? 'กำหนดสิทธิ์นักเรียน' : 'กำหนดสิทธิ์สวัสดิการ' }}</p>
          <span class="gd-perm-hint">เลือกสิทธิ์ที่กลุ่มนี้จะได้รับ</span>
        </div>
        <!-- Empty: no enabled wallets -->
        <div v-if="permissions.length === 0" style="padding:24px;text-align:center;background:var(--color-bg-secondary);border-radius:10px">
          <p style="font-size:13px;color:var(--color-text-secondary)">ยังไม่มีสิทธิ์ที่เปิดใช้งาน</p>
          <p style="font-size:12px;color:var(--color-text-tertiary);margin-top:4px">
            ไปที่ <strong>ตั้งค่า Wallet</strong> เพื่อเปิดสิทธิ์ก่อน
          </p>
        </div>

        <div v-else class="gd-perm-grid">
          <div
            v-for="p in permissions"
            :key="p.id"
            :class="['gd-perm-card', { 'gd-perm-card--on': selectedPerms.includes(p.id) }]"
            @click="togglePerm(p.id)"
          >
            <div :class="['gd-perm-icon', selectedPerms.includes(p.id) ? 'gd-perm-icon--on' : '']">
              <component :is="p.icon" :size="20" weight="fill" />
            </div>
            <div style="flex:1;min-width:0">
              <div class="gd-perm-name">{{ p.name }}</div>
              <div class="gd-perm-sub">{{ p.desc }}</div>
            </div>
            <div :class="['gd-perm-check', { 'gd-perm-check--on': selectedPerms.includes(p.id) }]">
              <PhCheck v-if="selectedPerms.includes(p.id)" :size="13" weight="bold" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── Tab 2: จัดการสมาชิก ───────────────────────────────────── -->
      <div v-else class="gd-body">

        <!-- Search + button row -->
        <div class="mem-toolbar">
          <div class="mem-search-wrap">
            <PhMagnifyingGlass :size="15" style="color:var(--color-text-tertiary);flex-shrink:0" />
            <input v-model="memberSearch" class="mem-search" placeholder="ค้นหาโดย รหัส / ชื่อ-นามสกุล / Card SN" />
          </div>
          <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openSelectModal">เลือกรายชื่อ</button>
        </div>

        <!-- Count row -->
        <div class="mem-count-row">
          <div class="mem-count-label">
            รายชื่อ
            <span class="mem-count-badge">{{ filteredMembers.length }}</span>
          </div>
          <select class="adm-filter-select" style="height:34px;min-width:120px">
            <option value="">ทั้งหมด</option>
            <option value="active">เปิดใช้งาน</option>
            <option value="inactive">ปิดใช้งาน</option>
          </select>
        </div>

        <!-- Table -->
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th style="width:40px;padding:10px 16px">
                  <input type="checkbox" class="mem-checkbox"
                    :checked="selectedMembers.length === filteredMembers.length && filteredMembers.length > 0"
                    @change="toggleSelectAll"
                  />
                </th>
                <th>{{ isStudent ? 'รหัสนักเรียน' : 'รหัสสมาชิก' }}</th>
                <th>ชื่อ-นามสกุล (TH)</th>
                <th>CARD SN</th>
                <th>วันที่นำเข้า</th>
                <th class="center" style="width:72px">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredMembers.length === 0">
                <td colspan="6" class="center" style="padding:40px;color:var(--color-text-tertiary)">
                  ยังไม่มีสมาชิกในกลุ่มนี้
                </td>
              </tr>
              <tr v-for="m in filteredMembers" :key="m.id">
                <td style="padding:10px 16px">
                  <input type="checkbox" class="mem-checkbox"
                    :checked="selectedMembers.includes(m.id)"
                    @change="toggleMember(m.id)"
                  />
                </td>
                <td><span class="adm-code">{{ m.id }}</span></td>
                <td style="font-weight:500;color:var(--color-primary)">{{ m.name }}</td>
                <td style="font-size:12px;font-family:monospace;color:var(--color-text-secondary)">{{ m.cardSn || '—' }}</td>
                <td style="font-size:13px;color:var(--color-text-secondary)">{{ m.joinedAt || '—' }}</td>
                <td class="center">
                  <button class="adm-action-btn danger" title="ลบออกจากกลุ่ม" @click="removeMember(m)">
                    <PhTrash :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>

  <!-- ── Select Member Modal ─────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal-bg">
      <div v-if="showSelectModal" class="sel-backdrop" @click="showSelectModal = false" />
    </Transition>
    <Transition name="modal-up">
      <div v-if="showSelectModal" class="sel-modal">

        <!-- Header -->
        <div class="sel-header">
          <div>
            <h3 class="sel-title">เลือกรายชื่อ</h3>
            <span class="sel-subtitle">{{ form.name || 'กลุ่ม' }}</span>
          </div>
          <button class="sel-close" @click="showSelectModal = false"><PhX :size="18" weight="bold" /></button>
        </div>

        <div class="sel-body">
          <!-- Left: searchable list -->
          <div class="sel-left">
            <div class="sel-search-wrap">
              <PhMagnifyingGlass :size="14" style="color:var(--color-text-tertiary);flex-shrink:0" />
              <input v-model="selectSearch" class="sel-search" placeholder="ค้นหาโดย รหัส / ชื่อ-นามสกุล / Card SN" />
            </div>

            <!-- Table -->
            <div class="adm-table-wrap" style="flex:1;overflow:auto">
              <table class="adm-table">
                <thead>
                  <tr>
                    <th style="width:40px;padding:10px 14px">
                      <input type="checkbox" class="mem-checkbox"
                        :checked="pendingIds.length === selectableFiltered.length && selectableFiltered.length > 0"
                        :indeterminate="pendingIds.length > 0 && pendingIds.length < selectableFiltered.length"
                        @change="toggleSelectAllPending"
                      />
                    </th>
                    <th>{{ isStudent ? 'รหัสนักเรียน' : 'รหัสสมาชิก' }}</th>
                    <th>ชื่อ-นามสกุล (TH)</th>
                    <th>CARD SN</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="selectableFiltered.length === 0">
                    <td colspan="4" class="center" style="padding:32px;color:var(--color-text-tertiary)">ไม่พบรายชื่อ</td>
                  </tr>
                  <tr
                    v-for="u in selectableFiltered"
                    :key="u.id"
                    :style="pendingIds.includes(u.id) ? 'background:var(--color-primary-tint)' : ''"
                    style="cursor:pointer"
                    @click="togglePending(u.id)"
                  >
                    <td style="padding:10px 14px">
                      <input type="checkbox" class="mem-checkbox"
                        :checked="pendingIds.includes(u.id)"
                        @click.stop
                        @change="togglePending(u.id)"
                      />
                    </td>
                    <td><span class="adm-code">{{ u.id }}</span></td>
                    <td style="font-weight:500;color:var(--color-primary)">{{ u.name }}</td>
                    <td style="font-size:12px;font-family:monospace;color:var(--color-text-secondary)">{{ u.cardSn || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Divider -->
          <div class="sel-divider" />

          <!-- Right: selected preview -->
          <div class="sel-right">
            <p class="sel-selected-title">เลือก {{ pendingIds.length }} รายชื่อ</p>
            <div class="sel-selected-list">
              <div v-for="id in pendingIds" :key="id" class="sel-selected-row">
                <div class="sel-avatar"><PhUser :size="16" style="color:var(--color-primary)" /></div>
                <div style="flex:1;min-width:0">
                  <div class="sel-selected-name">{{ availableUsers.find(u => u.id === id)?.name }}</div>
                  <div class="sel-selected-id">{{ id }}</div>
                </div>
                <button class="sel-remove-btn" @click="togglePending(id)">
                  <PhTrash :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="sel-footer">
          <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showSelectModal = false">ยกเลิก</button>
          <button class="adm-hdr-btn adm-hdr-btn-primary" @click="confirmSelect">
            ยืนยัน {{ pendingIds.length > 0 ? `(${pendingIds.length})` : '' }}
          </button>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhArrowLeft, PhCheck, PhPlus, PhUsersThree, PhTrash,
  PhMagnifyingGlass, PhX, PhUser,
} from '@phosphor-icons/vue'
import { useWalletsStore } from '@/stores/wallets'

const route  = useRoute()
const router = useRouter()

const isStudent = computed(() => route.path.startsWith('/admin/student-groups'))

const activeTab = ref<'settings' | 'members'>('settings')

const form = ref({
  id:   (route.params.id as string) ?? '',
  name: (route.query.name as string) ?? '',
})

// Permissions — เฉพาะ wallet ที่ enabled ใน ตั้งค่า Wallet เท่านั้น
const walletsStore = useWalletsStore()
const permissions  = computed(() =>
  walletsStore.wallets
    .filter(w => w.enabled)
    .map(w => ({ id: w.id, name: w.name, desc: w.desc, icon: w.icon }))
)

const selectedPerms = ref<string[]>(
  route.query.perms ? (route.query.perms as string).split(',').filter(Boolean) : []
)

interface Member { id: string; name: string; cardSn?: string; joinedAt?: string }

const members         = ref<Member[]>([])
const memberSearch    = ref('')
const selectedMembers = ref<string[]>([])

const filteredMembers = computed(() => {
  const q = memberSearch.value.toLowerCase()
  return members.value.filter(m =>
    !q || m.id.toLowerCase().includes(q) ||
    m.name.toLowerCase().includes(q) ||
    (m.cardSn ?? '').toLowerCase().includes(q)
  )
})

function togglePerm(id: string) {
  const idx = selectedPerms.value.indexOf(id)
  if (idx >= 0) selectedPerms.value.splice(idx, 1)
  else selectedPerms.value.push(id)
}

function toggleMember(id: string) {
  const idx = selectedMembers.value.indexOf(id)
  if (idx >= 0) selectedMembers.value.splice(idx, 1)
  else selectedMembers.value.push(id)
}

function toggleSelectAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  selectedMembers.value = checked ? filteredMembers.value.map(m => m.id) : []
}

function removeMember(m: Member) {
  members.value = members.value.filter(x => x.id !== m.id)
  selectedMembers.value = selectedMembers.value.filter(id => id !== m.id)
}

// ── Select modal ──────────────────────────────────────────────────────
const showSelectModal = ref(false)
const selectSearch    = ref('')
const pendingIds      = ref<string[]>([])

const availableUsers = computed<Member[]>(() =>
  isStudent.value
    ? [
        { id:'STD-K1-0001', name:'สมหญิง ใจดี',    cardSn:'04A3B5C6' },
        { id:'STD-K1-0012', name:'ปรีชา มานะ',      cardSn:'04E7F8A9' },
        { id:'STD-K2-0008', name:'มานี สุขดี',       cardSn:'04C3D4E5' },
        { id:'STD-P1-0005', name:'กานดา ศรีสวัสดิ์', cardSn:'04F1A2B3' },
        { id:'STD-P3-0015', name:'สมชาย ใจดี',       cardSn:'04B1C2D3' },
        { id:'STD-S1-0003', name:'อรุณี ดีงาม',      cardSn:'' },
      ]
    : [
        { id:'EMP-001', name:'สมชาย ใจดี',   cardSn:'1029384756' },
        { id:'EMP-002', name:'วิภา รักเรียน', cardSn:'5647382910' },
        { id:'EMP-003', name:'หนอง แคชเชียร์',cardSn:'8837465012' },
      ]
)

const selectableFiltered = computed(() => {
  const q = selectSearch.value.toLowerCase()
  const inGroup = new Set(members.value.map(m => m.id))
  return availableUsers.value.filter(u =>
    !inGroup.has(u.id) &&
    (!q || u.id.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || (u.cardSn ?? '').includes(q))
  )
})

function openSelectModal() {
  pendingIds.value  = []
  selectSearch.value = ''
  showSelectModal.value = true
}

function togglePending(id: string) {
  const idx = pendingIds.value.indexOf(id)
  if (idx >= 0) pendingIds.value.splice(idx, 1)
  else pendingIds.value.push(id)
}

function toggleSelectAllPending(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  pendingIds.value = checked ? selectableFiltered.value.map(u => u.id) : []
}

function confirmSelect() {
  const today = new Date().toLocaleDateString('th-TH', { day:'2-digit', month:'2-digit', year:'numeric' })
  for (const id of pendingIds.value) {
    const u = availableUsers.value.find(x => x.id === id)
    if (u && !members.value.find(m => m.id === id)) {
      members.value.push({ id: u.id, name: u.name, cardSn: u.cardSn, joinedAt: today })
    }
  }
  showSelectModal.value = false
}

function save() {
  router.back()
}
</script>

<style scoped>
.gd-back {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: none; cursor: pointer; padding: 0;
  font-size: 13px; color: var(--color-text-secondary); font-family: inherit;
  transition: color 0.15s;
}
.gd-back:hover { color: var(--color-primary); }

.gd-card { border-radius: 14px; overflow: hidden; }

/* Tabs */
.gd-tabs {
  display: flex; border-bottom: 1px solid var(--color-border-tertiary);
  padding: 0 24px;
}
.gd-tab {
  padding: 14px 4px; margin-right: 24px; font-size: 14px; font-weight: 500;
  color: var(--color-text-secondary); background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer; font-family: inherit;
  transition: color 0.15s, border-color 0.15s;
}
.gd-tab:hover       { color: var(--color-text-primary); }
.gd-tab--active     { color: var(--color-primary); border-bottom-color: var(--color-primary); }

.gd-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

.gd-section-title { font-size: 15px; font-weight: 500; color: var(--color-primary); margin: 0; }

/* Info row */
.gd-info-row {
  display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap;
}
.gd-field { display: flex; flex-direction: column; gap: 5px; min-width: 180px; }
.gd-label {
  font-size: 12px; color: var(--color-text-secondary);
}
.gd-input {
  height: 42px; padding: 0 12px; border-radius: 10px;
  border: 1px solid var(--color-border-tertiary);
  font-size: 14px; color: var(--color-text-primary);
  outline: none; font-family: inherit; background: #fff;
}
.gd-input:focus { border-color: var(--color-primary); }

.gd-save-btn {
  height: 42px; padding: 0 24px; border-radius: 10px; border: none;
  background: #1C2B4A; color: #fff;
  font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit;
  white-space: nowrap; flex-shrink: 0; transition: opacity 0.15s;
}
.gd-save-btn:hover    { opacity: 0.85; }
.gd-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Perm header */
.gd-perm-header { display: flex; align-items: center; justify-content: space-between; }
.gd-perm-hint   { font-size: 12px; color: var(--color-text-tertiary); }

/* Perm grid */
.gd-perm-grid { display: flex; flex-direction: column; gap: 10px; }

.gd-perm-card {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px; border-radius: 12px;
  border: 1.5px solid var(--color-border-tertiary);
  cursor: pointer; transition: border-color 0.15s, background 0.15s;
  background: #fff;
}
.gd-perm-card:hover    { border-color: var(--color-primary); background: var(--color-primary-tint); }
.gd-perm-card--on      { border-color: var(--color-primary); background: var(--color-primary-tint); }

.gd-perm-icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-bg-secondary); color: var(--color-text-secondary);
  transition: background 0.15s, color 0.15s;
}
.gd-perm-icon--on { background: var(--color-primary); color: #fff; }

.gd-perm-name { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
.gd-perm-sub  { font-size: 12px; color: var(--color-text-tertiary); margin-top: 2px; }

.gd-perm-check {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  border: 1.5px solid var(--color-border-tertiary);
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}
.gd-perm-check--on { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

/* Member tab */
.mem-toolbar {
  display: flex; gap: 12px; align-items: center;
}
.mem-search-wrap {
  flex: 1; display: flex; align-items: center; gap: 10px;
  background: #fff; border: 1px solid var(--color-border-tertiary);
  border-radius: 100px; padding: 0 16px; height: 42px;
}
.mem-search {
  border: none; outline: none; flex: 1;
  font-size: 14px; color: var(--color-text-primary); background: transparent; font-family: inherit;
}
.mem-search::placeholder { color: var(--color-text-tertiary); }

.mem-count-row {
  display: flex; align-items: center; justify-content: space-between;
}
.mem-count-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 500; color: var(--color-text-primary);
}
.mem-count-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; height: 22px; border-radius: 100px; padding: 0 6px;
  background: var(--color-warning-bg); color: var(--color-warning);
  font-size: 12px; font-weight: 600;
}
.mem-checkbox {
  width: 16px; height: 16px; cursor: pointer; accent-color: var(--color-primary);
}

/* Select modal */
.sel-backdrop {
  position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4);
}
.sel-modal {
  position: fixed; top: 50%; left: 50%; z-index: 51;
  transform: translate(-50%, -50%);
  background: #fff; border-radius: 16px;
  width: calc(100vw - 48px); max-width: 860px;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.18); overflow: hidden;
}
.sel-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px 16px; flex-shrink: 0;
  border-bottom: 1px solid var(--color-border-tertiary);
}
.sel-title    { font-size: 18px; font-weight: 500; color: var(--color-text-primary); }
.sel-subtitle { font-size: 13px; color: var(--color-primary); font-weight: 500; }
.sel-close {
  background: none; border: none; cursor: pointer; color: var(--color-text-tertiary);
  padding: 4px; border-radius: 6px; display: flex; align-items: center;
}
.sel-close:hover { background: #F2F2F7; }

.sel-body {
  display: flex; flex: 1; min-height: 0; overflow: hidden;
}
.sel-left  { flex: 1; display: flex; flex-direction: column; padding: 16px; min-width: 0; overflow: hidden; }
.sel-divider { width: 1px; background: var(--color-border-tertiary); flex-shrink: 0; }
.sel-right { width: 280px; flex-shrink: 0; padding: 16px; display: flex; flex-direction: column; gap: 10px; overflow: hidden; }

.sel-search-wrap {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid var(--color-border-tertiary); border-radius: 100px;
  padding: 0 14px; height: 40px; margin-bottom: 12px;
}
.sel-search {
  border: none; outline: none; flex: 1; font-size: 13px;
  color: var(--color-text-primary); background: transparent; font-family: inherit;
}
.sel-search::placeholder { color: var(--color-text-tertiary); }


.sel-selected-title { font-size: 13px; font-weight: 500; color: var(--color-text-primary); flex-shrink: 0; }
.sel-selected-list  { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.sel-selected-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  background: var(--color-bg-secondary);
}
.sel-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: var(--color-primary-tint);
  display: flex; align-items: center; justify-content: center;
}
.sel-selected-name { font-size: 13px; font-weight: 500; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sel-selected-id   { font-size: 11px; color: var(--color-text-tertiary); margin-top: 1px; }
.sel-remove-btn {
  background: none; border: none; cursor: pointer; color: var(--color-text-tertiary);
  padding: 4px; border-radius: 6px; flex-shrink: 0; display: flex; align-items: center;
}
.sel-remove-btn:hover { color: var(--color-danger); background: var(--color-danger-bg); }

.sel-footer {
  padding: 14px 24px; border-top: 1px solid var(--color-border-tertiary);
  display: flex; gap: 10px; justify-content: flex-end; flex-shrink: 0;
}

.modal-bg-enter-active, .modal-bg-leave-active { transition: opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity: 0; }
.modal-up-enter-active, .modal-up-leave-active { transition: opacity 0.25s, transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity: 0; transform: translate(-50%,-48%); }
</style>
