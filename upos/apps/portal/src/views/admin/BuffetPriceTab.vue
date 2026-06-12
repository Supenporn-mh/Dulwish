<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <div class="flex items-center justify-between">
      <p style="font-size:13px;color:var(--color-text-tertiary)">กำหนดราคา Buffet แยกตามประเภทผู้ใช้</p>
      <button class="bp-btn-primary" @click="openAdd">
        <PhPlus :size="15" weight="bold" /> เพิ่มราคา
      </button>
    </div>

    <div v-if="pageError" class="bp-error-bar">
      <span>{{ pageError }}</span>
      <button style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--color-text-tertiary)" @click="pageError=''">ปิด</button>
    </div>

    <div v-if="loading" style="padding:48px;text-align:center;font-size:13px;color:var(--color-text-tertiary)">กำลังโหลด...</div>

    <template v-if="!loading">
      <!-- สมาชิก section -->
      <div class="bp-section">
        <div class="bp-section-header">
          <span class="bp-type-badge bp-type-member">สมาชิก</span>
          <span style="font-size:12px;color:var(--color-text-tertiary)">ครู / บุคลากร / Visitor</span>
        </div>
        <div v-if="memberPricing.length === 0" class="bp-empty">ยังไม่มีการตั้งราคาสำหรับสมาชิก</div>
        <div v-else class="bp-card">
          <div class="bp-row bp-row-head">
            <span>รอบ Buffet</span><span>ประเภทอาหาร</span><span>ราคา (฿)</span><span>มีผลตั้งแต่</span><span>สิ้นสุด</span><span />
          </div>
          <div v-for="(p, i) in memberPricing" :key="p.id" class="bp-row" :style="i>0?'border-top:1px solid var(--color-border-tertiary)':''">
            <div style="font-size:13px;color:var(--color-text-secondary)">{{ roundLabel(p) }}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              <span v-if="!p.categoryIds || p.categoryIds.length === 0" style="font-size:12px;color:var(--color-text-tertiary)">ทุกประเภท</span>
              <span v-for="cid in p.categoryIds" :key="cid" class="bp-cat-chip">
                {{ categories.find(c => c.id === cid)?.name ?? cid }}
              </span>
            </div>
            <div style="font-size:15px;font-weight:600;color:var(--color-text-primary)">฿{{ p.price }}</div>
            <div style="font-size:13px;color:var(--color-text-secondary)">{{ fmtDate(p.effectiveFrom) }}</div>
            <div style="font-size:13px;color:var(--color-text-tertiary)">{{ p.effectiveTo ? fmtDate(p.effectiveTo) : '—' }}</div>
            <div style="display:flex;gap:4px">
              <button class="bp-btn-icon" @click="openEdit(p)"><PhPencil :size="14" /></button>
              <button class="bp-btn-icon bp-btn-del" @click="confirmDel(p)"><PhTrash :size="14" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- นักเรียน section -->
      <div class="bp-section">
        <div class="bp-section-header">
          <span class="bp-type-badge bp-type-student">นักเรียน</span>
          <span style="font-size:12px;color:var(--color-text-tertiary)">กำหนดราคาแยกตามระดับชั้น</span>
        </div>
        <div v-if="studentPricing.length === 0" class="bp-empty">ยังไม่มีการตั้งราคาสำหรับนักเรียน</div>
        <div v-else class="bp-card">
          <div class="bp-row bp-row-head bp-row-student">
            <span>ระดับชั้น</span><span>รอบ Buffet</span><span>ประเภทอาหาร</span><span>ราคา (฿)</span><span>มีผลตั้งแต่</span><span>สิ้นสุด</span><span />
          </div>
          <div v-for="(p, i) in studentPricing" :key="p.id" class="bp-row bp-row-student" :style="i>0?'border-top:1px solid var(--color-border-tertiary)':''">
            <div>
              <span v-if="p.gradeLevel" class="bp-grade-badge">{{ p.gradeLevel.code }}</span>
              <span v-else style="font-size:13px;color:var(--color-text-tertiary)">ทุกระดับ</span>
            </div>
            <div style="font-size:13px;color:var(--color-text-secondary)">{{ roundLabel(p) }}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              <span v-if="!p.categoryIds || p.categoryIds.length === 0" style="font-size:12px;color:var(--color-text-tertiary)">ทุกประเภท</span>
              <span v-for="cid in p.categoryIds" :key="cid" class="bp-cat-chip">
                {{ categories.find(c => c.id === cid)?.name ?? cid }}
              </span>
            </div>
            <div style="font-size:15px;font-weight:600;color:var(--color-text-primary)">฿{{ p.price }}</div>
            <div style="font-size:13px;color:var(--color-text-secondary)">{{ fmtDate(p.effectiveFrom) }}</div>
            <div style="font-size:13px;color:var(--color-text-tertiary)">{{ p.effectiveTo ? fmtDate(p.effectiveTo) : '—' }}</div>
            <div style="display:flex;gap:4px">
              <button class="bp-btn-icon" @click="openEdit(p)"><PhPencil :size="14" /></button>
              <button class="bp-btn-icon bp-btn-del" @click="confirmDel(p)"><PhTrash :size="14" /></button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showModal" class="bp-overlay" @click.self="showModal=false">
          <div class="bp-modal">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h3 class="bp-modal-title">{{ editTarget ? 'แก้ไขราคา' : 'เพิ่มราคา Buffet' }}</h3>
            <button class="bp-btn-icon" @click="showModal=false"><PhX :size="17" weight="bold" /></button>
          </div>

          <!-- ประเภทผู้ใช้ -->
          <div class="bp-field">
            <label class="bp-label">ประเภทผู้ใช้ <span style="color:var(--color-danger)">*</span></label>
            <div style="display:flex;gap:8px">
              <button
                v-for="ut in userTypes" :key="ut.value"
                :class="['bp-type-btn', form.userType === ut.value ? 'bp-type-btn-active' : '']"
                @click="form.userType = ut.value; form.gradeLevelIds = []"
              >{{ ut.label }}</button>
            </div>
          </div>

          <!-- Multi-select ระดับชั้น (student only) -->
          <div v-if="form.userType === 'student'" class="bp-field" v-click-outside="closeDropdown">
            <label class="bp-label">ระดับชั้น <span style="color:var(--color-danger)">*</span></label>

            <!-- token box -->
            <div
              ref="gradeAnchorRef"
              class="bp-multiselect"
              :class="{ 'bp-multiselect-focus': dropdownOpen }"
              @click="openGradeDropdown"
            >
              <div class="bp-tokens">
                <span v-for="id in form.gradeLevelIds" :key="id" class="bp-token">
                  {{ gradeLevels.find(g => g.id === id)?.code ?? id }}
                  <button class="bp-token-x" @click.stop="removeGrade(id)">
                    <PhX :size="10" weight="bold" />
                  </button>
                </span>
                <span v-if="form.gradeLevelIds.length === 0" style="font-size:14px;color:var(--color-text-tertiary);padding:2px 4px">เลือกระดับชั้น</span>
              </div>
              <PhCaretDown :size="14" style="color:var(--color-text-tertiary);flex-shrink:0;margin-left:4px"
                :style="{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }" />
            </div>

            <!-- dropdown -->
            <div v-if="dropdownOpen" class="bp-dropdown" :style="gradeDropdownStyle">
              <!-- search -->
              <div class="bp-dropdown-search">
                <PhMagnifyingGlass :size="14" style="color:var(--color-text-tertiary);flex-shrink:0" />
                <input
                  v-model="gradeSearch"
                  class="bp-dropdown-input"
                  placeholder="ค้นหา"
                  @click.stop
                />
              </div>
              <div class="bp-dropdown-list">
                <!-- select all -->
                <div class="bp-dropdown-item" @click.stop="toggleAll">
                  <span style="font-size:14px;color:var(--color-text-primary)">เลือกทั้งหมด</span>
                  <div :class="['bp-checkbox', allSelected ? 'bp-checkbox-full' : someSelected ? 'bp-checkbox-partial' : '']">
                    <PhMinus v-if="someSelected && !allSelected" :size="11" weight="bold" style="color:#fff" />
                    <PhCheck v-else-if="allSelected" :size="11" weight="bold" style="color:#fff" />
                  </div>
                </div>
                <!-- items -->
                <div
                  v-for="g in filteredGrades"
                  :key="g.id"
                  class="bp-dropdown-item"
                  @click.stop="toggleGrade(g.id)"
                >
                  <span :style="`font-size:14px;color:${form.gradeLevelIds.includes(g.id) ? 'var(--color-primary)' : '#1C1C1E'};font-weight:${form.gradeLevelIds.includes(g.id) ? '500' : '400'}`">{{ g.code }} – {{ g.name }}</span>
                  <div :class="['bp-checkbox', form.gradeLevelIds.includes(g.id) ? 'bp-checkbox-full' : '']">
                    <PhCheck v-if="form.gradeLevelIds.includes(g.id)" :size="11" weight="bold" style="color:#fff" />
                  </div>
                </div>
                <div v-if="filteredGrades.length === 0" style="padding:10px 12px;text-align:center;font-size:13px;color:var(--color-text-tertiary)">ไม่พบระดับชั้น</div>
              </div>
            </div>
          </div>

          <!-- ประเภทอาหาร multi-select -->
          <div class="bp-field" v-click-outside="closeCatDropdown">
            <label class="bp-label">ประเภทอาหาร <span style="font-size:11px;color:var(--color-text-tertiary)">(ไม่เลือก = ใช้ได้ทุกประเภท)</span></label>
            <div
              ref="catAnchorRef"
              class="bp-multiselect"
              :class="{ 'bp-multiselect-focus': catDropdownOpen }"
              @click="openCatDropdown"
            >
              <div class="bp-tokens">
                <span v-for="id in form.categoryIds" :key="id" class="bp-token bp-token-cat">
                  {{ categories.find(c => c.id === id)?.name ?? id }}
                  <button class="bp-token-x" @click.stop="removeCat(id)">
                    <PhX :size="10" weight="bold" />
                  </button>
                </span>
                <span v-if="form.categoryIds.length === 0" style="font-size:14px;color:var(--color-text-tertiary);padding:2px 4px">ทุกประเภทอาหาร</span>
              </div>
              <PhCaretDown :size="14" style="color:var(--color-text-tertiary);flex-shrink:0;margin-left:4px"
                :style="{ transform: catDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }" />
            </div>
            <div v-if="catDropdownOpen" class="bp-dropdown" :style="catDropdownStyle">
              <div class="bp-dropdown-search">
                <PhMagnifyingGlass :size="14" style="color:var(--color-text-tertiary);flex-shrink:0" />
                <input v-model="catSearch" class="bp-dropdown-input" placeholder="ค้นหา" @click.stop />
              </div>
              <div class="bp-dropdown-list">
                <div class="bp-dropdown-item" @click.stop="toggleAllCats">
                  <span style="font-size:14px;color:var(--color-text-primary)">เลือกทั้งหมด</span>
                  <div :class="['bp-checkbox', allCatsSelected ? 'bp-checkbox-full' : someCatsSelected ? 'bp-checkbox-partial' : '']">
                    <PhMinus v-if="someCatsSelected && !allCatsSelected" :size="11" weight="bold" style="color:#fff" />
                    <PhCheck v-else-if="allCatsSelected" :size="11" weight="bold" style="color:#fff" />
                  </div>
                </div>
                <div
                  v-for="c in filteredCats"
                  :key="c.id"
                  class="bp-dropdown-item"
                  @click.stop="toggleCat(c.id)"
                >
                  <span :style="`font-size:14px;color:${form.categoryIds.includes(c.id) ? 'var(--color-primary)' : '#1C1C1E'};font-weight:${form.categoryIds.includes(c.id) ? '500' : '400'}`">{{ c.name }}</span>
                  <div :class="['bp-checkbox', form.categoryIds.includes(c.id) ? 'bp-checkbox-full' : '']">
                    <PhCheck v-if="form.categoryIds.includes(c.id)" :size="11" weight="bold" style="color:#fff" />
                  </div>
                </div>
                <div v-if="filteredCats.length === 0" style="padding:10px 12px;text-align:center;font-size:13px;color:var(--color-text-tertiary)">ไม่พบประเภทอาหาร</div>
              </div>
            </div>
          </div>

          <!-- รอบ Buffet -->
          <div class="bp-field">
            <label class="bp-label">รอบ Buffet</label>
            <select v-model="form.buffetRoundId" class="bp-input">
              <option value="">ทุกรอบ (ใช้ร่วมกัน)</option>
              <option v-for="r in rounds" :key="r.id" :value="r.id">{{ r.name }} ({{ r.startTime }}–{{ r.endTime }})</option>
            </select>
          </div>

          <!-- ราคา -->
          <div class="bp-field">
            <label class="bp-label">ราคา (฿) <span style="color:var(--color-danger)">*</span></label>
            <input v-model.number="form.price" type="number" min="0" class="bp-input" placeholder="0" />
          </div>

          <!-- วันที่ -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="bp-field">
              <label class="bp-label">มีผลตั้งแต่ <span style="color:var(--color-danger)">*</span></label>
              <input v-model="form.effectiveFrom" type="date" class="bp-input" />
            </div>
            <div class="bp-field">
              <label class="bp-label">วันสิ้นสุด</label>
              <input v-model="form.effectiveTo" type="date" class="bp-input" :min="form.effectiveFrom" />
            </div>
          </div>

          <p v-if="modalError" style="font-size:12px;color:var(--color-danger);margin-top:4px">{{ modalError }}</p>

          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="bp-btn-cancel" @click="showModal=false">ยกเลิก</button>
            <button class="bp-btn-confirm" :disabled="!canSubmit || saving" @click="submitModal">
              {{ saving ? 'กำลังบันทึก...' : (editTarget ? 'บันทึก' : `เพิ่มราคา${form.userType==='student' && form.gradeLevelIds.length > 1 ? ` (${form.gradeLevelIds.length} ระดับ)` : ''}`) }}
            </button>
          </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="delTarget" class="bp-overlay" @click.self="delTarget=null">
          <div class="bp-modal" style="max-width:380px">
          <div style="display:flex;justify-content:center;margin-bottom:14px">
            <div style="width:52px;height:52px;border-radius:50%;background:var(--color-danger-bg);display:flex;align-items:center;justify-content:center">
              <PhTrash :size="24" weight="fill" style="color:var(--color-danger)" />
            </div>
          </div>
          <h3 class="bp-modal-title" style="text-align:center">ลบราคา?</h3>
          <p style="font-size:13px;color:var(--color-text-tertiary);text-align:center;margin-bottom:20px">
            ลบราคา <strong style="color:var(--color-text-primary)">{{ delTarget.userType === 'member' ? 'สมาชิก' : 'นักเรียน' }}</strong>
            <template v-if="delTarget.gradeLevel"> ({{ delTarget.gradeLevel.code }})</template>
            ออกจากระบบ?
          </p>
          <div style="display:flex;gap:10px">
            <button class="bp-btn-cancel" @click="delTarget=null">ยกเลิก</button>
            <button class="bp-btn-danger" @click="doDelete">ลบ</button>
          </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhPencil, PhTrash, PhX, PhCaretDown, PhMagnifyingGlass, PhCheck, PhMinus } from '@phosphor-icons/vue'
import type { BuffetPricing, BuffetRound, GradeLevel, BuffetCategory } from '@/api/types'
import { listBuffetPricing, createBuffetPricing, updateBuffetPricing, deleteBuffetPricing, listBuffetRounds, listBuffetCategories } from '@/api/buffet'
import { listGradeLevels } from '@/api/settings'

// ── v-click-outside directive ──────────────────────────────────────────────────
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el._clickOutside = (e: MouseEvent) => { if (!el.contains(e.target as Node)) binding.value() }
    document.addEventListener('mousedown', el._clickOutside)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('mousedown', el._clickOutside)
  },
}

// ── State ──────────────────────────────────────────────────────────────────────
const pricing     = ref<BuffetPricing[]>([])
const rounds      = ref<BuffetRound[]>([])
const gradeLevels = ref<GradeLevel[]>([])
const categories  = ref<BuffetCategory[]>([])
const loading     = ref(false)
const pageError   = ref('')
const showModal   = ref(false)
const saving      = ref(false)
const modalError  = ref('')
const editTarget  = ref<BuffetPricing | null>(null)
const delTarget   = ref<BuffetPricing | null>(null)

const dropdownOpen    = ref(false)
const gradeSearch     = ref('')
const catDropdownOpen = ref(false)
const catSearch       = ref('')

const gradeAnchorRef   = ref<HTMLElement | null>(null)
const catAnchorRef     = ref<HTMLElement | null>(null)
const gradeDropdownStyle = ref('')
const catDropdownStyle   = ref('')

function calcDropdownStyle(el: HTMLElement | null): string {
  if (!el) return ''
  const r = el.getBoundingClientRect()
  return `position:fixed;top:${r.bottom + 4}px;left:${r.left}px;width:${r.width}px;z-index:9999`
}
function openGradeDropdown() {
  gradeDropdownStyle.value = calcDropdownStyle(gradeAnchorRef.value)
  dropdownOpen.value = true
}
function openCatDropdown() {
  catDropdownStyle.value = calcDropdownStyle(catAnchorRef.value)
  catDropdownOpen.value = true
}

const userTypes = [
  { value: 'member'  as const, label: 'สมาชิก' },
  { value: 'student' as const, label: 'นักเรียน' },
]

const form = ref({
  userType:      'member' as 'member' | 'student',
  gradeLevelIds: [] as string[],
  buffetRoundId: '',
  categoryIds:   [] as string[],
  price:         0,
  effectiveFrom: '',
  effectiveTo:   '',
})

// ── Computed ──────────────────────────────────────────────────────────────────
const canSubmit = computed(() => {
  if (!form.value.effectiveFrom || form.value.price < 0) return false
  if (form.value.userType === 'student' && form.value.gradeLevelIds.length === 0) return false
  return true
})

const memberPricing  = computed(() => pricing.value.filter(p => p.userType === 'member'))
const studentPricing = computed(() => {
  return pricing.value
    .filter(p => p.userType === 'student')
    .sort((a, b) => {
      const ga = gradeLevels.value.find(g => g.id === a.gradeLevelId)?.sortOrder ?? 999
      const gb = gradeLevels.value.find(g => g.id === b.gradeLevelId)?.sortOrder ?? 999
      return ga - gb
    })
})

const filteredGrades = computed(() =>
  gradeLevels.value.filter(g =>
    !gradeSearch.value ||
    g.code.toLowerCase().includes(gradeSearch.value.toLowerCase()) ||
    g.name.toLowerCase().includes(gradeSearch.value.toLowerCase())
  )
)
const allSelected  = computed(() => filteredGrades.value.length > 0 && filteredGrades.value.every(g => form.value.gradeLevelIds.includes(g.id)))
const someSelected = computed(() => filteredGrades.value.some(g => form.value.gradeLevelIds.includes(g.id)))

const filteredCats    = computed(() =>
  categories.value.filter(c =>
    !catSearch.value || c.name.toLowerCase().includes(catSearch.value.toLowerCase())
  )
)
const allCatsSelected  = computed(() => filteredCats.value.length > 0 && filteredCats.value.every(c => form.value.categoryIds.includes(c.id)))
const someCatsSelected = computed(() => filteredCats.value.some(c => form.value.categoryIds.includes(c.id)))

// ── Multi-select helpers ───────────────────────────────────────────────────────
function toggleGrade(id: string) {
  const idx = form.value.gradeLevelIds.indexOf(id)
  if (idx >= 0) form.value.gradeLevelIds.splice(idx, 1)
  else form.value.gradeLevelIds.push(id)
}
function removeGrade(id: string) {
  form.value.gradeLevelIds = form.value.gradeLevelIds.filter(x => x !== id)
}
function toggleAll() {
  if (allSelected.value) {
    form.value.gradeLevelIds = form.value.gradeLevelIds.filter(id => !filteredGrades.value.some(g => g.id === id))
  } else {
    const toAdd = filteredGrades.value.map(g => g.id).filter(id => !form.value.gradeLevelIds.includes(id))
    form.value.gradeLevelIds.push(...toAdd)
  }
}
function closeDropdown() { dropdownOpen.value = false }

function toggleCat(id: string) {
  const idx = form.value.categoryIds.indexOf(id)
  if (idx >= 0) form.value.categoryIds.splice(idx, 1)
  else form.value.categoryIds.push(id)
}
function removeCat(id: string) {
  form.value.categoryIds = form.value.categoryIds.filter(x => x !== id)
}
function toggleAllCats() {
  if (allCatsSelected.value) {
    form.value.categoryIds = form.value.categoryIds.filter(id => !filteredCats.value.some(c => c.id === id))
  } else {
    const toAdd = filteredCats.value.map(c => c.id).filter(id => !form.value.categoryIds.includes(id))
    form.value.categoryIds.push(...toAdd)
  }
}
function closeCatDropdown() { catDropdownOpen.value = false }

// ── Display helpers ────────────────────────────────────────────────────────────
function roundLabel(p: BuffetPricing) {
  if (!p.buffetRoundId) return 'ทุกรอบ'
  if (p.buffetRound) return `${p.buffetRound.name} (${p.buffetRound.startTime}–${p.buffetRound.endTime})`
  return rounds.value.find(r => r.id === p.buffetRoundId)?.name ?? p.buffetRoundId
}
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function openAdd() {
  editTarget.value = null
  form.value = {
    userType: 'member', gradeLevelIds: [], buffetRoundId: '',
    categoryIds: [],
    price: 0, effectiveFrom: new Date().toISOString().split('T')[0], effectiveTo: '',
  }
  gradeSearch.value    = ''
  dropdownOpen.value   = false
  catSearch.value      = ''
  catDropdownOpen.value = false
  modalError.value     = ''
  showModal.value      = true
}

function openEdit(p: BuffetPricing) {
  editTarget.value = p
  const glId = p.gradeLevelId ?? (p.gradeLevel?._id ? String(p.gradeLevel._id) : null)
  form.value = {
    userType:      p.userType,
    gradeLevelIds: glId ? [glId] : [],
    buffetRoundId: p.buffetRoundId ?? '',
    categoryIds:   p.categoryIds ? [...p.categoryIds] : [],
    price:         p.price,
    effectiveFrom: p.effectiveFrom?.split('T')[0] ?? '',
    effectiveTo:   p.effectiveTo?.split('T')[0] ?? '',
  }
  gradeSearch.value    = ''
  dropdownOpen.value   = false
  catSearch.value      = ''
  catDropdownOpen.value = false
  modalError.value     = ''
  showModal.value      = true
}

async function submitModal() {
  if (!canSubmit.value) return
  saving.value     = true
  modalError.value = ''
  try {
    const base = {
      userType:      form.value.userType,
      buffetRoundId: form.value.buffetRoundId || null,
      categoryIds:   form.value.categoryIds,
      price:         form.value.price,
      effectiveFrom: form.value.effectiveFrom,
      effectiveTo:   form.value.effectiveTo || null,
    }
    if (editTarget.value) {
      await updateBuffetPricing(editTarget.value.id, {
        ...base,
        gradeLevelId: form.value.gradeLevelIds[0] ?? null,
      })
    } else {
      if (form.value.userType === 'student') {
        // create one record per selected grade level
        await Promise.all(form.value.gradeLevelIds.map(id =>
          createBuffetPricing({ ...base, gradeLevelId: id })
        ))
      } else {
        await createBuffetPricing({ ...base, gradeLevelId: null })
      }
    }
    showModal.value = false
    pricing.value = await listBuffetPricing()
  } catch (e: any) {
    modalError.value = e?.response?.data?.error?.message ?? 'บันทึกไม่สำเร็จ'
  } finally { saving.value = false }
}

function confirmDel(p: BuffetPricing) { delTarget.value = p }
async function doDelete() {
  if (!delTarget.value) return
  const id = delTarget.value.id
  delTarget.value = null
  try {
    await deleteBuffetPricing(id)
    pricing.value = pricing.value.filter(p => p.id !== id)
  } catch { pageError.value = 'ลบไม่สำเร็จ' }
}

onMounted(async () => {
  loading.value = true
  try {
    const [p, r, g, c] = await Promise.all([listBuffetPricing(), listBuffetRounds(), listGradeLevels(), listBuffetCategories()])
    pricing.value     = p
    rounds.value      = r
    gradeLevels.value = g
    categories.value  = c
  } catch { pageError.value = 'โหลดข้อมูลไม่สำเร็จ' }
  finally { loading.value = false }
})
</script>

<style scoped>
.bp-btn-primary { display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 16px;border-radius:var(--radius-md);background:var(--color-primary);color:#fff;border:none;font-size:14px;font-weight:500;font-family:inherit;cursor:pointer; }
.bp-btn-icon { width:28px;height:28px;border-radius:6px;background:var(--color-bg-secondary);border:0.5px solid var(--color-border-tertiary);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--color-text-secondary); }
.bp-btn-icon:hover { background:var(--color-border-tertiary); }
.bp-btn-del:hover { color:var(--color-danger);background:var(--color-danger-bg); }
.bp-btn-cancel { flex:1;height:44px;border-radius:10px;border:1px solid var(--color-border-tertiary);background:#fff;font-size:14px;font-weight:500;color:var(--color-text-secondary);cursor:pointer; }
.bp-btn-confirm { flex:1;height:44px;border-radius:10px;border:none;background:var(--color-primary);color:#fff;font-size:14px;font-weight:500;cursor:pointer; }
.bp-btn-confirm:disabled { background:var(--color-border-tertiary);color:var(--color-text-tertiary);cursor:not-allowed; }
.bp-btn-danger { flex:1;height:44px;border-radius:10px;border:none;background:var(--color-danger);color:#fff;font-size:14px;font-weight:500;cursor:pointer; }
.bp-error-bar { background:var(--color-danger-bg);border:1px solid var(--color-danger);border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;font-size:13px;color:var(--color-danger); }

.bp-section { display:flex;flex-direction:column;gap:8px; }
.bp-section-header { display:flex;align-items:center;gap:10px; }
.bp-type-badge { display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600; }
.bp-type-member  { background:#E8F8F0;color:#028A60; }
.bp-type-student { background:#EEF3FF;color:#1264E3; }
.bp-grade-badge { display:inline-block;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600;background:var(--color-bg-secondary);color:var(--color-text-secondary); }
.bp-empty { padding:24px 0;font-size:13px;color:var(--color-text-tertiary); }
.bp-card { background:#fff;border-radius:12px;border:1px solid var(--color-border-tertiary);overflow:hidden; }
.bp-row { display:grid;grid-template-columns:1fr 1fr 100px 130px 130px 64px;align-items:center;padding:10px 16px;gap:12px; }
.bp-row-student { grid-template-columns:100px 1fr 1fr 100px 130px 130px 64px; }
.bp-cat-chip { display:inline-block;padding:2px 8px;border-radius:100px;font-size:11px;font-weight:500;background:rgba(255,149,0,0.12);color:#C47800; }
.bp-token-cat { background:rgba(255,149,0,0.12);color:#C47800; }
.bp-row-head { background:var(--color-bg-secondary);padding:7px 16px; }
.bp-row-head span { font-size:12px;font-weight:400;color:var(--color-text-tertiary); }

/* Modal */
.bp-overlay { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:16px; }
.bp-modal { background:#fff;border-radius:16px;width:460px;max-width:100%;max-height:90vh;overflow-y:auto;padding:24px 20px;box-shadow:0 16px 48px rgba(0,0,0,0.16);box-sizing:border-box; }
.bp-modal-title { font-size:18px;font-weight:500;color:var(--color-text-primary);margin:0; }
.bp-field { display:flex;flex-direction:column;gap:5px;margin-bottom:12px; }
.bp-label { font-size:13px;font-weight:500;color:var(--color-text-secondary); }
.bp-input { height:44px;padding:0 12px;border-radius:var(--radius-md);border:1px solid var(--color-border-tertiary);background:#fff;font-size:14px;color:var(--color-text-primary);font-family:inherit;outline:none;transition:border-color 0.15s; }
.bp-input:focus { border-color:var(--color-primary); }
.bp-type-btn { flex:1;height:40px;border-radius:8px;border:1px solid var(--color-border-tertiary);background:var(--color-bg-secondary);font-size:14px;font-weight:500;font-family:inherit;color:var(--color-text-secondary);cursor:pointer;transition:all 0.15s; }
.bp-type-btn-active { background:var(--color-primary);border-color:var(--color-primary);color:#fff; }

/* Multi-select */
.bp-multiselect { min-height:44px;padding:6px 10px;border-radius:var(--radius-md);border:1px solid var(--color-border-tertiary);background:#fff;cursor:pointer;display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;transition:border-color 0.15s; }
.bp-multiselect-focus { border-color:var(--color-primary); }
.bp-tokens { display:flex;flex-wrap:wrap;gap:6px;flex:1;min-width:0; }
.bp-token { display:inline-flex;align-items:center;gap:4px;padding:3px 8px 3px 10px;background:rgba(18,100,227,0.1);border-radius:20px;font-size:13px;font-weight:500;color:#1264E3; }
.bp-token-x { background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;color:#1264E3;opacity:0.7;transition:opacity 0.15s; }
.bp-token-x:hover { opacity:1; }

.bp-dropdown { z-index:9999;background:#fff;border-radius:12px;border:1px solid var(--color-border-tertiary);box-shadow:0 8px 24px rgba(0,0,0,0.12);overflow:hidden; }
.bp-dropdown-search { display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--color-border-tertiary); }
.bp-dropdown-input { flex:1;border:none;outline:none;font-size:14px;color:var(--color-text-primary);font-family:inherit;background:transparent; }
.bp-dropdown-list { max-height:200px;overflow-y:auto; }
.bp-dropdown-item { display:flex;align-items:center;justify-content:space-between;padding:8px 12px;cursor:pointer;transition:background 0.12s; }
.bp-dropdown-item:hover { background:var(--color-bg-secondary); }
.bp-dropdown-item-label { display:flex;align-items:center;gap:8px;flex:1;min-width:0; }

.bp-checkbox { width:20px;height:20px;border-radius:5px;border:1.5px solid var(--color-border-primary);background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.15s; }
.bp-checkbox-full { background:var(--color-primary);border-color:var(--color-primary); }
.bp-checkbox-partial { background:var(--color-primary);border-color:var(--color-primary); }

.modal-fade-enter-active,.modal-fade-leave-active { transition:opacity 0.2s; }
.modal-fade-enter-from,.modal-fade-leave-to { opacity:0; }
</style>
