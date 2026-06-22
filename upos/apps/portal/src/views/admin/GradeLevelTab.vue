<template>
  <div style="display:flex;flex-direction:column;gap:12px">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <p style="font-size:13px;color:#8E8E93">กำหนดลำดับชั้นเรียนและกลุ่มราคา Buffet</p>
      <button class="gl-btn-primary" @click="openAdd">
        <PhPlus :size="15" weight="bold" />
        เพิ่มระดับชั้น
      </button>
    </div>

    <!-- Error -->
    <div v-if="pageError" class="gl-error-bar">
      <span>{{ pageError }}</span>
      <button style="background:none;border:none;cursor:pointer;font-size:12px;color:#8E8E93" @click="pageError=''">ปิด</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" style="display:flex;justify-content:center;padding:48px 0">
      <span style="font-size:13px;color:#8E8E93">กำลังโหลด...</span>
    </div>

    <!-- Table -->
    <div v-if="!loading" class="gl-card">

      <!-- Header row -->
      <div class="gl-row gl-row-head">
        <span class="gl-col-code">รหัส</span>
        <span class="gl-col-name">ชื่อระดับชั้น</span>
        <span class="gl-col-act" />
      </div>

      <!-- Empty -->
      <div v-if="levels.length === 0" style="padding:40px;text-align:center">
        <p style="font-size:14px;color:#AEAEB2">ยังไม่มีข้อมูลระดับชั้น</p>
      </div>

      <!-- Rows -->
      <div
        v-for="(lvl, idx) in levels"
        :key="lvl.id"
        class="gl-row"
        :style="idx > 0 ? 'border-top:1px solid #F5F5F7' : ''"
      >
        <!-- Code -->
        <div class="gl-col-code">
          <span class="gl-code-badge">{{ lvl.code }}</span>
        </div>

        <!-- Name (inline edit) -->
        <div class="gl-col-name">
          <template v-if="editingId === lvl.id">
            <input
              v-model="editName"
              class="gl-inline-input"
              @blur="saveInlineName(lvl)"
              @keydown.enter="saveInlineName(lvl)"
              @keydown.esc="editingId = null"
              ref="nameInput"
            />
          </template>
          <template v-else>
            <span
              class="gl-name-text"
              @click="startEditName(lvl)"
              title="คลิกเพื่อแก้ไข"
            >{{ lvl.name }}</span>
          </template>
        </div>

        <!-- Delete -->
        <div class="gl-col-act">
          <button class="gl-btn-icon gl-btn-del" @click="confirmDelete(lvl)" title="ลบ">
            <PhTrash :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Add modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showAdd" class="gl-backdrop" @click="showAdd=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showAdd" class="gl-modal">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h3 class="gl-modal-title">เพิ่มระดับชั้น</h3>
            <button class="gl-btn-icon" @click="showAdd=false"><PhX :size="17" weight="bold" /></button>
          </div>

          <div class="gl-field-group">
            <label class="gl-label">รหัสระดับชั้น <span style="color:var(--color-danger)">*</span></label>
            <input v-model="form.code" class="gl-input" placeholder="เช่น K1, P3, S2" />
          </div>
          <div class="gl-field-group">
            <label class="gl-label">ชื่อระดับชั้น <span style="color:var(--color-danger)">*</span></label>
            <input v-model="form.name" class="gl-input" placeholder="เช่น Kindergarten 1" />
          </div>
          <p v-if="addError" style="font-size:12px;color:var(--color-danger);margin-top:8px">{{ addError }}</p>

          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="gl-btn-cancel" @click="showAdd=false">ยกเลิก</button>
            <button class="gl-btn-confirm" :disabled="!canAdd" @click="submitAdd">เพิ่มระดับชั้น</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirm modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="deleteTarget" class="gl-backdrop" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="deleteTarget" class="gl-modal" style="max-width:380px">
          <div style="display:flex;justify-content:center;margin-bottom:14px">
            <div style="width:52px;height:52px;border-radius:50%;background:var(--color-danger-bg);display:flex;align-items:center;justify-content:center">
              <PhTrash :size="24" weight="fill" style="color:var(--color-danger)" />
            </div>
          </div>
          <h3 class="gl-modal-title" style="text-align:center">ลบระดับชั้น?</h3>
          <p style="font-size:13px;color:#8E8E93;text-align:center;margin-bottom:20px;line-height:1.6">
            ลบ <strong style="color:#1C1C1E">{{ deleteTarget.code }} — {{ deleteTarget.name }}</strong><br>ออกจากระบบ?
          </p>
          <div style="display:flex;gap:10px">
            <button class="gl-btn-cancel" @click="deleteTarget=null">ยกเลิก</button>
            <button class="gl-btn-danger" @click="doDelete">ลบ</button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { PhPlus, PhTrash, PhX } from '@phosphor-icons/vue'
import type { GradeLevel } from '@/api/types'
import {
  listGradeLevels,
  createGradeLevel,
  updateGradeLevel,
  deleteGradeLevel,
} from '@/api/settings'

const levels    = ref<GradeLevel[]>([])
const loading   = ref(false)
const pageError = ref('')

// ── inline edit ───────────────────────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editName  = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

function startEditName(lvl: GradeLevel) {
  editingId.value = lvl.id
  editName.value  = lvl.name
  nextTick(() => nameInput.value?.focus())
}

async function saveInlineName(lvl: GradeLevel) {
  const trimmed = editName.value.trim()
  editingId.value = null
  if (!trimmed || trimmed === lvl.name) return
  try {
    const updated = await updateGradeLevel(lvl.id, { name: trimmed })
    const idx = levels.value.findIndex(l => l.id === lvl.id)
    if (idx !== -1) levels.value[idx] = updated
  } catch { pageError.value = 'แก้ไขชื่อไม่สำเร็จ' }
}

async function updateGroup(lvl: GradeLevel, gradeGroup: GradeLevel['gradeGroup']) {
  try {
    const updated = await updateGradeLevel(lvl.id, { gradeGroup })
    const idx = levels.value.findIndex(l => l.id === lvl.id)
    if (idx !== -1) levels.value[idx] = updated
  } catch { pageError.value = 'แก้ไขกลุ่มไม่สำเร็จ' }
}

async function toggleRepeat(lvl: GradeLevel) {
  try {
    const updated = await updateGradeLevel(lvl.id, { canRepeat: !lvl.canRepeat })
    const idx = levels.value.findIndex(l => l.id === lvl.id)
    if (idx !== -1) levels.value[idx] = updated
  } catch { pageError.value = 'แก้ไขไม่สำเร็จ' }
}

// ── add modal ─────────────────────────────────────────────────────────────────
const showAdd  = ref(false)
const addError = ref('')
const form = ref({ code: '', name: '', gradeGroup: 'secondary' as GradeLevel['gradeGroup'], canRepeat: false })

const canAdd = computed(() => !!form.value.code.trim() && !!form.value.name.trim())

function openAdd() {
  form.value = { code: '', name: '', gradeGroup: 'secondary', canRepeat: false }
  addError.value = ''
  showAdd.value  = true
}

async function submitAdd() {
  if (!canAdd.value) return
  addError.value = ''
  try {
    const created = await createGradeLevel({
      code:       form.value.code.trim().toUpperCase(),
      name:       form.value.name.trim(),
      gradeGroup: form.value.gradeGroup,
      canRepeat:  form.value.canRepeat,
      sortOrder:  levels.value.length,
    })
    levels.value.push(created)
    showAdd.value = false
  } catch (e: any) {
    addError.value = e?.response?.data?.error?.message ?? 'เพิ่มไม่สำเร็จ'
  }
}

// ── delete ────────────────────────────────────────────────────────────────────
const deleteTarget = ref<GradeLevel | null>(null)

function confirmDelete(lvl: GradeLevel) {
  deleteTarget.value = lvl
}

async function doDelete() {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  deleteTarget.value = null
  try {
    await deleteGradeLevel(id)
    levels.value = levels.value.filter(l => l.id !== id)
  } catch { pageError.value = 'ลบไม่สำเร็จ' }
}

// ── load ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  loading.value = true
  try {
    levels.value = await listGradeLevels()
  } catch { pageError.value = 'โหลดข้อมูลไม่สำเร็จ' }
  finally { loading.value = false }
})
</script>

<style scoped>
.gl-btn-primary {
  display:inline-flex;align-items:center;gap:6px;
  height:36px;padding:0 16px;border-radius:var(--radius-md);
  background:var(--color-primary);color:#fff;border:none;
  font-size:14px;font-weight:500;font-family:inherit;cursor:pointer;transition:opacity 0.15s;
}
.gl-btn-primary:active { opacity:0.8; }

.gl-btn-icon {
  width:28px;height:28px;border-radius:6px;
  background:var(--color-bg-secondary);border:0.5px solid var(--color-border-tertiary);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--color-text-secondary);transition:background 0.15s;
}
.gl-btn-icon:hover { background:var(--color-border-tertiary); }
.gl-btn-icon:disabled { opacity:0.3;cursor:not-allowed; }
.gl-btn-del { background:transparent;border:none; }
.gl-btn-del:hover { color:var(--color-danger);background:var(--color-danger-bg); }

.gl-btn-cancel {
  flex:1;height:44px;border-radius:10px;border:1px solid #E8E8E8;background:#fff;
  font-size:14px;font-weight:500;color:var(--color-text-secondary);cursor:pointer;
}
.gl-btn-confirm {
  flex:1;height:44px;border-radius:10px;border:none;
  background:var(--color-primary);color:#fff;font-size:14px;font-weight:500;cursor:pointer;
}
.gl-btn-confirm:disabled { background:#E5E5EA;color:#AEAEB2;cursor:not-allowed; }
.gl-btn-danger {
  flex:1;height:44px;border-radius:10px;border:none;
  background:var(--color-danger);color:#fff;font-size:14px;font-weight:500;cursor:pointer;
}

.gl-error-bar {
  background:#FFF2F2;border:1px solid #FFCDD2;border-radius:10px;
  padding:10px 14px;display:flex;align-items:center;justify-content:space-between;
  font-size:13px;color:#C62828;
}

.gl-card {
  background:#fff;border-radius:12px;border:1px solid #EBEBEB;overflow:hidden;
}
.gl-row {
  display:grid;
  grid-template-columns:72px 1fr 40px;
  align-items:center;padding:10px 16px;gap:12px;
}
.gl-row-head {
  background:#FAFAFA;padding:7px 16px;
}
.gl-row-head span { font-size:12px;font-weight:400;color:#AEAEB2; }

.gl-code-badge {
  display:inline-block;padding:2px 8px;border-radius:6px;
  background:#F0F0F0;font-size:12px;font-weight:600;color:#3C3C43;letter-spacing:0.02em;
}
.gl-name-text {
  font-size:14px;color:#1C1C1E;cursor:pointer;border-radius:4px;padding:2px 4px;
  transition:background 0.15s;
}
.gl-name-text:hover { background:#F5F5F7; }

.gl-inline-input {
  height:32px;padding:0 8px;border:1px solid var(--color-primary);border-radius:6px;
  font-size:14px;color:#1C1C1E;font-family:inherit;outline:none;width:100%;box-sizing:border-box;
}

.gl-select {
  height:32px;padding:0 8px;border:1px solid #E8E8E8;border-radius:6px;
  font-size:13px;color:#3C3C43;font-family:inherit;background:#fff;cursor:pointer;outline:none;
  transition:border-color 0.15s;
}
.gl-select:focus { border-color:var(--color-primary); }

.gl-toggle {
  height:28px;padding:0 12px;border-radius:20px;border:1px solid #E8E8E8;
  background:#F5F5F7;font-size:12px;font-weight:500;color:#8E8E93;cursor:pointer;transition:all 0.15s;
}
.gl-toggle-on {
  background:var(--color-success-bg);border-color:transparent;color:#028A60;
}

/* modal */
.gl-backdrop { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4); }
.gl-modal {
  position:fixed;top:50%;left:50%;z-index:201;transform:translate(-50%,-50%);
  background:#fff;border-radius:16px;width:420px;max-width:calc(100vw - 48px);
  padding:28px 24px;box-shadow:0 16px 48px rgba(0,0,0,0.16);box-sizing:border-box;
}
.gl-modal-title { font-size:18px;font-weight:500;color:#1C1C1E;margin:0 0 4px; }

.gl-field-group { display:flex;flex-direction:column;gap:6px;margin-bottom:14px; }
.gl-label { font-size:13px;font-weight:500;color:#3C3C43; }
.gl-input {
  height:44px;padding:0 12px;border-radius:var(--radius-md);border:1px solid #E8E8E8;
  background:#fff;font-size:14px;color:#1C1C1E;font-family:inherit;outline:none;
  transition:border-color 0.15s;
}
.gl-input:focus { border-color:var(--color-primary); }

.modal-bg-enter-active,.modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,.modal-bg-leave-to { opacity:0; }
.modal-up-enter-active,.modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,.modal-up-leave-to { opacity:0;transform:translate(-50%,-48%); }
</style>
