<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <div style="display:flex;align-items:center;justify-content:space-between">
      <p style="font-size:13px;color:#8E8E93;margin:0">กำหนดประเภทอาหาร Buffet สำหรับจัดหมวดหมู่รายการ</p>
      <button class="bc-btn-add" @click="openCreate">
        <PhPlus :size="14" weight="bold" /> เพิ่มประเภทอาหาร
      </button>
    </div>

    <div v-if="pageError" class="bc-error-bar">
      <span>{{ pageError }}</span>
      <button style="background:none;border:none;cursor:pointer;font-size:12px;color:#8E8E93" @click="pageError=''">ปิด</button>
    </div>

    <div v-if="loading" style="padding:48px;text-align:center;font-size:13px;color:#8E8E93">กำลังโหลด...</div>

    <!-- Table -->
    <div v-else class="bc-card">
      <div v-if="categories.length === 0" style="padding:48px;text-align:center;font-size:14px;color:#AEAEB2">
        ยังไม่มีประเภทอาหาร
      </div>
      <template v-else>
        <div class="bc-table-head">
          <span>รหัส</span>
          <span>ชื่อประเภทอาหาร</span>
          <span>สถานะ</span>
          <span></span>
        </div>
        <div v-for="cat in categories" :key="cat.id" class="bc-table-row">
          <span style="font-size:13px;font-weight:600;color:#3C3C43;font-family:monospace">{{ cat.code }}</span>
          <span style="font-size:14px;font-weight:500;color:#1C1C1E">{{ cat.name }}</span>
          <span>
            <span :class="['bc-badge', cat.active ? 'bc-badge-on' : 'bc-badge-off']">
              {{ cat.active ? 'เปิดใช้' : 'ปิดใช้' }}
            </span>
          </span>
          <span style="display:flex;gap:6px;justify-content:flex-end">
            <button class="bc-action-btn" @click="openEdit(cat)">
              <PhPencilSimple :size="14" />
            </button>
            <button class="bc-action-btn bc-action-btn-danger" @click="confirmDelete(cat)">
              <PhTrash :size="14" />
            </button>
          </span>
        </div>
      </template>
    </div>

  </div>

  <!-- Modal: Add / Edit -->
  <Teleport to="body">
    <div v-if="showModal" class="bc-overlay" @click.self="closeModal">
      <div class="bc-modal">
        <div class="bc-modal-header">
          <span>{{ editingId ? 'แก้ไขประเภทอาหาร' : 'เพิ่มประเภทอาหาร' }}</span>
          <button class="bc-close-btn" @click="closeModal"><PhX :size="16" weight="bold" /></button>
        </div>

        <div v-if="modalError" class="bc-error-bar" style="margin:0 16px 12px">{{ modalError }}</div>

        <div class="bc-modal-body">

          <!-- รหัส -->
          <div class="bc-field">
            <label class="bc-label">รหัสประเภทอาหาร <span style="color:var(--color-danger)">*</span></label>
            <input
              v-model.trim="form.code"
              class="bc-input"
              placeholder="เช่น STD, PREM, VEG"
              style="font-family:monospace;text-transform:uppercase"
              @input="form.code = (form.code as string).toUpperCase()"
            />
          </div>

          <!-- ชื่อ -->
          <div class="bc-field">
            <label class="bc-label">ชื่อประเภทอาหาร <span style="color:var(--color-danger)">*</span></label>
            <input v-model="form.name" class="bc-input" placeholder="เช่น Standard, Premium, มังสวิรัติ" />
          </div>

          <!-- สถานะ -->
          <div class="bc-field bc-field-row">
            <label class="bc-label" style="margin:0">เปิดใช้งาน</label>
            <button
              type="button"
              :class="['bc-toggle', form.active ? 'bc-toggle-on' : '']"
              @click="form.active = !form.active"
            >
              <span class="bc-toggle-knob" />
            </button>
          </div>

        </div>

        <div class="bc-modal-footer">
          <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="closeModal">ยกเลิก</button>
          <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Delete confirm -->
  <Teleport to="body">
    <div v-if="deleteTarget" class="bc-overlay" @click.self="deleteTarget=null">
      <div class="bc-modal" style="max-width:400px">
        <div class="bc-modal-header">
          <span>ยืนยันการลบ</span>
          <button class="bc-close-btn" @click="deleteTarget=null"><PhX :size="16" weight="bold" /></button>
        </div>
        <div class="bc-modal-body">
          <p style="font-size:14px;color:#3C3C43">ลบประเภทอาหาร <strong>{{ deleteTarget.name }}</strong> ?</p>
          <p style="font-size:13px;color:#FF3B30;margin-top:6px">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
        </div>
        <div class="bc-modal-footer">
          <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="deleteTarget=null">ยกเลิก</button>
          <button class="adm-hdr-btn" style="background:#FF3B30;color:#fff" :disabled="deleting" @click="doDelete">
            {{ deleting ? 'กำลังลบ...' : 'ลบ' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PhPlus, PhPencilSimple, PhTrash, PhX } from '@phosphor-icons/vue'
import type { BuffetCategory } from '@/api/types'
import { listBuffetCategories, createBuffetCategory, updateBuffetCategory, deleteBuffetCategory } from '@/api/buffet'

const categories   = ref<BuffetCategory[]>([])
const loading      = ref(false)
const pageError    = ref('')
const showModal    = ref(false)
const modalError   = ref('')
const saving       = ref(false)
const editingId    = ref<string | null>(null)
const deleteTarget = ref<BuffetCategory | null>(null)
const deleting     = ref(false)

const form = ref({ code: '', name: '', active: true })

function openCreate() {
  editingId.value  = null
  modalError.value = ''
  form.value       = { code: '', name: '', active: true }
  showModal.value  = true
}

function openEdit(cat: BuffetCategory) {
  editingId.value  = cat.id
  modalError.value = ''
  form.value       = { code: cat.code, name: cat.name, active: cat.active }
  showModal.value  = true
}

function closeModal() { showModal.value = false }

function confirmDelete(cat: BuffetCategory) { deleteTarget.value = cat }

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteBuffetCategory(deleteTarget.value.id)
    categories.value = categories.value.filter(c => c.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  } catch {
    pageError.value = 'ลบไม่สำเร็จ'
  } finally {
    deleting.value = false
  }
}

async function save() {
  modalError.value = ''
  if (!form.value.code.trim()) { modalError.value = 'กรุณาใส่รหัสประเภทอาหาร'; return }
  if (!form.value.name.trim()) { modalError.value = 'กรุณาใส่ชื่อประเภทอาหาร'; return }

  saving.value = true
  try {
    const payload = { code: form.value.code.trim(), name: form.value.name.trim(), active: form.value.active }
    if (editingId.value) {
      const updated = await updateBuffetCategory(editingId.value, payload)
      const idx = categories.value.findIndex(c => c.id === editingId.value)
      if (idx >= 0) categories.value[idx] = updated
      else categories.value = await listBuffetCategories()
    } else {
      const created = await createBuffetCategory({ ...payload, sortOrder: categories.value.length })
      categories.value.push(created)
    }
    showModal.value = false
  } catch (e: any) {
    modalError.value = e?.response?.data?.error?.message ?? 'บันทึกไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    categories.value = await listBuffetCategories()
  } catch {
    pageError.value = 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.bc-btn-add {
  display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 16px;
  border-radius:100px;background:var(--color-primary);color:#fff;
  font-size:13px;font-weight:500;border:none;cursor:pointer;font-family:inherit;
  transition:opacity 0.15s;
}
.bc-btn-add:hover { opacity:0.9; }

.bc-error-bar {
  background:#FFF2F2;border:1px solid #FFCDD2;border-radius:10px;
  padding:10px 14px;font-size:13px;color:#C62828;
}

.bc-card { background:#fff;border-radius:12px;border:1px solid #EBEBEB;overflow:hidden; }
.bc-table-head {
  display:grid;grid-template-columns:100px 1fr 80px 80px;
  padding:8px 16px;background:#FAFAFA;border-bottom:1px solid #F5F5F7;
}
.bc-table-head span { font-size:12px;color:#AEAEB2;font-weight:500; }
.bc-table-row {
  display:grid;grid-template-columns:100px 1fr 80px 80px;
  padding:12px 16px;border-bottom:1px solid #F5F5F7;align-items:center;
}
.bc-table-row:last-child { border-bottom:none; }

.bc-badge { display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:100px; }
.bc-badge-on  { background:rgba(52,199,89,0.12);color:#34C759; }
.bc-badge-off { background:rgba(142,142,147,0.12);color:#8E8E93; }

.bc-action-btn {
  width:30px;height:30px;border-radius:8px;border:1px solid #E8E8E8;
  background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:#3C3C43;transition:background 0.15s;
}
.bc-action-btn:hover { background:#F5F5F7; }
.bc-action-btn-danger:hover { background:#FFF2F2;color:#FF3B30;border-color:#FFCDD2; }

/* Modal */
.bc-overlay {
  position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;
  align-items:center;justify-content:center;z-index:1000;padding:16px;
}
.bc-modal {
  background:#fff;border-radius:16px;width:100%;max-width:420px;
  display:flex;flex-direction:column;overflow:hidden;
}
.bc-modal-header {
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;border-bottom:1px solid #F5F5F7;
  font-size:16px;font-weight:600;color:#1C1C1E;
}
.bc-close-btn {
  width:30px;height:30px;border-radius:50%;background:#F2F2F7;
  border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:#3C3C43;
}
.bc-modal-body { padding:20px;display:flex;flex-direction:column;gap:14px; }
.bc-modal-footer {
  display:flex;justify-content:flex-end;gap:10px;
  padding:14px 20px;border-top:1px solid #F5F5F7;
}

.bc-field { display:flex;flex-direction:column;gap:6px; }
.bc-field-row { flex-direction:row;align-items:center;justify-content:space-between; }
.bc-label { font-size:13px;font-weight:500;color:#3C3C43; }
.bc-input {
  height:42px;padding:0 12px;border-radius:8px;border:1.5px solid #D0D0D0;
  font-size:14px;color:#1C1C1E;outline:none;font-family:inherit;background:#fff;
  transition:border-color 0.15s;box-sizing:border-box;width:100%;
}
.bc-input:focus { border-color:var(--color-primary);box-shadow:0 0 0 2px rgba(18,100,227,0.08); }

.bc-toggle {
  width:44px;height:26px;border-radius:100px;background:#E5E5EA;border:none;
  cursor:pointer;position:relative;transition:background 0.2s;padding:0;flex-shrink:0;
}
.bc-toggle-on { background:var(--color-primary); }
.bc-toggle-knob {
  position:absolute;top:3px;left:3px;width:20px;height:20px;
  border-radius:50%;background:#fff;transition:transform 0.2s;
  box-shadow:0 1px 3px rgba(0,0,0,0.2);
}
.bc-toggle-on .bc-toggle-knob { transform:translateX(18px); }
</style>
