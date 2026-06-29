<template>
  <div style="display:flex;flex-direction:column;gap:12px">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <p style="font-size:13px;color:#8E8E93">กำหนดห้องเรียนแต่ละระดับชั้น</p>
      <button class="cr-btn-primary" @click="openAdd">
        <PhPlus :size="15" weight="bold" />
        เพิ่มห้องเรียน
      </button>
    </div>

    <!-- Error -->
    <div v-if="pageError" class="cr-error-bar">
      <span>{{ pageError }}</span>
      <button style="background:none;border:none;cursor:pointer;font-size:12px;color:#8E8E93" @click="pageError=''">ปิด</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" style="display:flex;justify-content:center;padding:48px 0">
      <span style="font-size:13px;color:#8E8E93">กำลังโหลด...</span>
    </div>

    <!-- Grouped by gradeLevel -->
    <template v-if="!loading">
      <div v-if="grouped.length === 0" class="cr-card" style="padding:40px;text-align:center">
        <p style="font-size:14px;color:#AEAEB2">ยังไม่มีห้องเรียน</p>
      </div>

      <div v-for="group in grouped" :key="group.gradeLevel" class="cr-card">
        <!-- Group header -->
        <div class="cr-group-header">
          <span class="cr-grade-badge">{{ group.gradeLevel }}</span>
          <span style="font-size:13px;color:#8E8E93">{{ group.items.length }} ห้อง</span>
        </div>

        <!-- Header row -->
        <div class="cr-row cr-row-head">
          <span class="cr-col-code">รหัสห้อง</span>
          <span class="cr-col-name">ชื่อห้อง</span>
          <span class="cr-col-act" />
        </div>

        <!-- Rows -->
        <div
          v-for="(room, idx) in group.items"
          :key="room.id"
          class="cr-row"
          :style="idx > 0 ? 'border-top:1px solid #F5F5F7' : ''"
        >
          <div class="cr-col-code">
            <span class="cr-code-badge">{{ room.code }}</span>
          </div>
          <div class="cr-col-name">
            <template v-if="editingId === room.id">
              <input
                v-model="editName"
                class="cr-inline-input"
                @blur="saveInlineName(room)"
                @keydown.enter="saveInlineName(room)"
                @keydown.esc="editingId = null"
                ref="nameInput"
              />
            </template>
            <template v-else>
              <span class="cr-name-text" @click="startEditName(room)" title="คลิกเพื่อแก้ไข">{{ room.name }}</span>
            </template>
          </div>
          <div class="cr-col-act">
            <button class="cr-btn-icon cr-btn-del" @click="confirmDelete(room)" title="ลบ">
              <PhTrash :size="14" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Add modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showAdd" class="cr-backdrop" @click="showAdd=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showAdd" class="cr-modal">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h3 class="cr-modal-title">เพิ่มห้องเรียน</h3>
            <button class="cr-btn-icon" @click="showAdd=false"><PhX :size="17" weight="bold" /></button>
          </div>

          <div class="cr-field-group">
            <label class="cr-label">ระดับชั้น <span style="color:var(--color-danger)">*</span></label>
            <input v-model="form.gradeLevel" class="cr-input" placeholder="เช่น K1, P3, S2" />
          </div>
          <div class="cr-field-group">
            <label class="cr-label">รหัสห้อง <span style="color:var(--color-danger)">*</span></label>
            <input v-model="form.code" class="cr-input" placeholder="เช่น K1-A, P3-B" />
          </div>
          <div class="cr-field-group">
            <label class="cr-label">ชื่อห้อง <span style="color:var(--color-danger)">*</span></label>
            <input v-model="form.name" class="cr-input" placeholder="เช่น K1-A หรือ Kindergarten 1 ห้อง A" />
          </div>
          <p v-if="addError" style="font-size:12px;color:var(--color-danger);margin-top:8px">{{ addError }}</p>

          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="cr-btn-cancel" @click="showAdd=false">ยกเลิก</button>
            <button class="cr-btn-confirm" :disabled="!canAdd" @click="submitAdd">เพิ่มห้องเรียน</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirm modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="deleteTarget" class="cr-backdrop" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="deleteTarget" class="cr-modal" style="max-width:380px">
          <div style="display:flex;justify-content:center;margin-bottom:14px">
            <div style="width:52px;height:52px;border-radius:50%;background:var(--color-danger-bg);display:flex;align-items:center;justify-content:center">
              <PhTrash :size="24" weight="fill" style="color:var(--color-danger)" />
            </div>
          </div>
          <h3 class="cr-modal-title" style="text-align:center">ลบห้องเรียน?</h3>
          <p style="font-size:13px;color:#8E8E93;text-align:center;margin-bottom:20px;line-height:1.6">
            ลบ <strong style="color:#1C1C1E">{{ deleteTarget.code }}</strong> ออกจากระบบ?
          </p>
          <div style="display:flex;gap:10px">
            <button class="cr-btn-cancel" @click="deleteTarget=null">ยกเลิก</button>
            <button class="cr-btn-danger" @click="doDelete">ลบ</button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { PhPlus, PhTrash, PhX } from '@phosphor-icons/vue'
import type { Classroom } from '@/api/types'
import { listClassrooms, createClassroom, updateClassroom, deleteClassroom } from '@/api/settings'

const classrooms = ref<Classroom[]>([])
const loading    = ref(false)
const pageError  = ref('')

const grouped = computed(() => {
  const map = new Map<string, Classroom[]>()
  for (const c of classrooms.value) {
    if (!map.has(c.gradeLevel)) map.set(c.gradeLevel, [])
    map.get(c.gradeLevel)!.push(c)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([gradeLevel, items]) => ({ gradeLevel, items }))
})

// inline edit
const editingId = ref<string | null>(null)
const editName  = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

function startEditName(room: Classroom) {
  editingId.value = room.id
  editName.value  = room.name
  nextTick(() => nameInput.value?.focus())
}

async function saveInlineName(room: Classroom) {
  const trimmed = editName.value.trim()
  editingId.value = null
  if (!trimmed || trimmed === room.name) return
  try {
    const updated = await updateClassroom(room.id, { name: trimmed })
    const idx = classrooms.value.findIndex(c => c.id === room.id)
    if (idx !== -1) classrooms.value[idx] = updated
  } catch { pageError.value = 'แก้ไขชื่อไม่สำเร็จ' }
}

// add modal
const showAdd  = ref(false)
const addError = ref('')
const form = ref({ code: '', name: '', gradeLevel: '' })

const canAdd = computed(() => !!form.value.code.trim() && !!form.value.name.trim() && !!form.value.gradeLevel.trim())

function openAdd() {
  form.value = { code: '', name: '', gradeLevel: '' }
  addError.value = ''
  showAdd.value  = true
}

async function submitAdd() {
  if (!canAdd.value) return
  addError.value = ''
  try {
    const created = await createClassroom({
      code:       form.value.code.trim().toUpperCase(),
      name:       form.value.name.trim(),
      gradeLevel: form.value.gradeLevel.trim().toUpperCase(),
      sortOrder:  classrooms.value.filter(c => c.gradeLevel === form.value.gradeLevel.trim().toUpperCase()).length,
    })
    classrooms.value.push(created)
    showAdd.value = false
  } catch (e: any) {
    addError.value = e?.response?.data?.error?.message ?? 'เพิ่มไม่สำเร็จ'
  }
}

// delete
const deleteTarget = ref<Classroom | null>(null)

function confirmDelete(room: Classroom) {
  deleteTarget.value = room
}

async function doDelete() {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  deleteTarget.value = null
  try {
    await deleteClassroom(id)
    classrooms.value = classrooms.value.filter(c => c.id !== id)
  } catch { pageError.value = 'ลบไม่สำเร็จ' }
}

onMounted(async () => {
  loading.value = true
  try {
    classrooms.value = await listClassrooms()
  } catch { pageError.value = 'โหลดข้อมูลไม่สำเร็จ' }
  finally { loading.value = false }
})
</script>

<style scoped>
.cr-btn-primary {
  display:inline-flex;align-items:center;gap:6px;
  height:36px;padding:0 16px;border-radius:var(--radius-md);
  background:var(--color-primary);color:#fff;border:none;
  font-size:14px;font-weight:500;font-family:inherit;cursor:pointer;transition:opacity 0.15s;
}
.cr-btn-primary:active { opacity:0.8; }

.cr-btn-icon {
  width:28px;height:28px;border-radius:6px;
  background:var(--color-bg-secondary);border:0.5px solid var(--color-border-tertiary);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--color-text-secondary);transition:background 0.15s;
}
.cr-btn-icon:hover { background:var(--color-border-tertiary); }
.cr-btn-del { background:transparent;border:none; }
.cr-btn-del:hover { color:var(--color-danger);background:var(--color-danger-bg); }

.cr-btn-cancel {
  flex:1;height:44px;border-radius:10px;border:1px solid #E8E8E8;background:#fff;
  font-size:14px;font-weight:500;color:var(--color-text-secondary);cursor:pointer;
}
.cr-btn-confirm {
  flex:1;height:44px;border-radius:10px;border:none;
  background:var(--color-primary);color:#fff;font-size:14px;font-weight:500;cursor:pointer;
}
.cr-btn-confirm:disabled { background:#E5E5EA;color:#AEAEB2;cursor:not-allowed; }
.cr-btn-danger {
  flex:1;height:44px;border-radius:10px;border:none;
  background:var(--color-danger);color:#fff;font-size:14px;font-weight:500;cursor:pointer;
}

.cr-error-bar {
  background:#FFF2F2;border:1px solid #FFCDD2;border-radius:10px;
  padding:10px 14px;display:flex;align-items:center;justify-content:space-between;
  font-size:13px;color:#C62828;
}

.cr-card {
  background:#fff;border-radius:12px;border:1px solid #EBEBEB;overflow:hidden;
}
.cr-group-header {
  display:flex;align-items:center;gap:10px;
  padding:10px 16px;background:#FAFAFA;border-bottom:1px solid #F0F0F0;
}
.cr-grade-badge {
  display:inline-block;padding:2px 10px;border-radius:6px;
  background:var(--color-primary-tint);font-size:12px;font-weight:600;
  color:var(--color-primary);letter-spacing:0.02em;
}
.cr-row {
  display:grid;
  grid-template-columns:100px 1fr 40px;
  align-items:center;padding:10px 16px;gap:12px;
}
.cr-row-head { background:#F5F5F7;padding:7px 16px; }
.cr-row-head span { font-size:12px;font-weight:400;color:#AEAEB2; }

.cr-code-badge {
  display:inline-block;padding:2px 8px;border-radius:6px;
  background:#F0F0F0;font-size:12px;font-weight:600;color:#3C3C43;letter-spacing:0.02em;
}
.cr-name-text {
  font-size:14px;color:#1C1C1E;cursor:pointer;border-radius:4px;padding:2px 4px;
  transition:background 0.15s;
}
.cr-name-text:hover { background:#F5F5F7; }
.cr-inline-input {
  height:32px;padding:0 8px;border:1px solid var(--color-primary);border-radius:6px;
  font-size:14px;color:#1C1C1E;font-family:inherit;outline:none;width:100%;box-sizing:border-box;
}

.cr-backdrop { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4); }
.cr-modal {
  position:fixed;top:50%;left:50%;z-index:201;transform:translate(-50%,-50%);
  background:#fff;border-radius:16px;width:420px;max-width:calc(100vw - 48px);
  padding:28px 24px;box-shadow:0 16px 48px rgba(0,0,0,0.16);box-sizing:border-box;
}
.cr-modal-title { font-size:18px;font-weight:500;color:#1C1C1E;margin:0 0 4px; }
.cr-field-group { display:flex;flex-direction:column;gap:6px;margin-bottom:14px; }
.cr-label { font-size:13px;font-weight:500;color:#3C3C43; }
.cr-input {
  height:44px;padding:0 12px;border-radius:var(--radius-md);border:1px solid #E8E8E8;
  background:#fff;font-size:14px;color:#1C1C1E;font-family:inherit;outline:none;
  transition:border-color 0.15s;
}
.cr-input:focus { border-color:var(--color-primary); }

.modal-bg-enter-active,.modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,.modal-bg-leave-to { opacity:0; }
.modal-up-enter-active,.modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,.modal-up-leave-to { opacity:0;transform:translate(-50%,-48%); }
</style>
