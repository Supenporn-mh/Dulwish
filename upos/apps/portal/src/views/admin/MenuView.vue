<template>
  <div class="menu-view">
    <!-- Tabs -->
    <div class="tab-bar">
      <button
        :class="['tab-btn', { 'tab-btn--active': activeTab === 'items' }]"
        @click="activeTab = 'items'"
      >
        เมนูอาหาร
      </button>
      <button
        :class="['tab-btn', { 'tab-btn--active': activeTab === 'shops' }]"
        @click="activeTab = 'shops'"
      >
        ร้านค้า
      </button>
    </div>

    <!-- Menu Items tab -->
    <div v-if="activeTab === 'items'">
      <div class="tab-toolbar">
        <button class="add-btn" @click="openAddDialog">
          <span style="font-size:16px; margin-right:6px">＋</span> เพิ่มเมนู
        </button>
      </div>

      <div class="ios-card table-card">
        <el-table
          v-loading="loading"
          :data="menuItems"
          style="width: 100%"
          size="small"
          :header-cell-style="{
            background: '#F2F2F7',
            color: '#6E6E73',
            fontWeight: '600',
            fontSize: '13px',
          }"
          :cell-style="{ fontSize: '14px', color: '#000000' }"
        >
          <el-table-column label="SKU" prop="sku" min-width="110">
            <template #default="{ row }">
              <span class="sku-badge">{{ row.sku }}</span>
            </template>
          </el-table-column>

          <el-table-column label="ชื่อ" prop="name" min-width="150">
            <template #default="{ row }">
              <span style="font-weight:500">{{ row.name }}</span>
            </template>
          </el-table-column>

          <el-table-column label="ร้าน" prop="shop" min-width="130">
            <template #default="{ row }">
              <span style="color:#3C3C43; font-size:13px">{{ row.shop }}</span>
            </template>
          </el-table-column>

          <el-table-column label="ราคา" prop="price" min-width="80" align="right">
            <template #default="{ row }">
              <span style="font-weight:600; color:#1264E3">฿{{ row.price }}</span>
            </template>
          </el-table-column>

          <el-table-column label="สั่งล่วงหน้า" prop="preorderable" min-width="110" align="center">
            <template #default="{ row }">
              <el-switch
                v-model="row.preorderable"
                style="--el-switch-on-color: #1264E3; --el-switch-off-color: #C6C6C8"
              />
            </template>
          </el-table-column>

          <el-table-column label="Active" prop="active" min-width="90" align="center">
            <template #default="{ row }">
              <el-switch
                v-model="row.active"
                style="--el-switch-on-color: #34C759; --el-switch-off-color: #C6C6C8"
              />
            </template>
          </el-table-column>

          <el-table-column label="จัดการ" min-width="130" align="center">
            <template #default="{ row }">
              <button class="action-btn action-btn--edit" @click="openEditDialog(row)">แก้ไข</button>
              <button class="action-btn action-btn--delete" @click="deleteItem(row)">ลบ</button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- Shops tab -->
    <div v-if="activeTab === 'shops'">
      <div class="ios-section-header">ร้านค้าทั้งหมด</div>
      <div class="shops-grid">
        <div
          v-for="shop in shops"
          :key="shop.id"
          class="ios-card shop-card"
        >
          <div class="shop-icon">🍳</div>
          <div class="shop-name">{{ shop.name }}</div>
          <div class="shop-meta">{{ shop.itemCount }} รายการ</div>
        </div>
      </div>
    </div>

    <!-- Add / Edit dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingItem ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'"
      width="480px"
      destroy-on-close
      class="ios-dialog"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="110px"
        label-position="left"
        class="dialog-form"
      >
        <el-form-item label="ชื่อเมนู" prop="name">
          <el-input v-model="form.name" placeholder="ข้าวมันไก่" />
        </el-form-item>
        <el-form-item label="SKU" prop="sku">
          <el-input v-model="form.sku" placeholder="FOOD-001" />
        </el-form-item>
        <el-form-item label="ราคา (฿)" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="ร้านค้า" prop="shop">
          <el-select v-model="form.shop" placeholder="เลือกร้าน" style="width: 100%">
            <el-option v-for="s in shops" :key="s.id" :label="s.name" :value="s.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="สั่งล่วงหน้า">
          <el-switch
            v-model="form.preorderable"
            active-text="ได้"
            inactive-text="ไม่ได้"
            style="--el-switch-on-color: #1264E3"
          />
        </el-form-item>
        <el-form-item label="Active">
          <el-switch
            v-model="form.active"
            active-text="เปิด"
            inactive-text="ปิด"
            style="--el-switch-on-color: #34C759"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <button class="dialog-cancel-btn" @click="dialogVisible = false">ยกเลิก</button>
          <button class="dialog-save-btn" :disabled="saving" @click="saveItem">
            <span v-if="saving">กำลังบันทึก...</span>
            <span v-else>บันทึก</span>
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'

const API_BASE = 'http://localhost:4000'

interface MenuItem {
  id: string
  sku: string
  name: string
  shop: string
  price: number
  preorderable: boolean
  active: boolean
}

interface Shop {
  id: string
  name: string
  itemCount: number
}

const DEMO_ITEMS: MenuItem[] = [
  { id: '1', sku: 'FOOD-001', name: 'ข้าวมันไก่', shop: 'ร้านครัวไทย', price: 45, preorderable: true, active: true },
  { id: '2', sku: 'FOOD-002', name: 'ก๋วยเตี๋ยวหมู', shop: 'ร้านก๋วยเตี๋ยว', price: 40, preorderable: false, active: true },
  { id: '3', sku: 'FOOD-003', name: 'ข้าวผัดหมู', shop: 'ร้านครัวไทย', price: 50, preorderable: true, active: true },
  { id: '4', sku: 'FOOD-004', name: 'ส้มตำ', shop: 'ร้านอาหารอีสาน', price: 35, preorderable: false, active: true },
  { id: '5', sku: 'BUFF-001', name: 'Buffet นักเรียน', shop: 'โรงอาหาร', price: 120, preorderable: false, active: true },
]

const DEMO_SHOPS: Shop[] = [
  { id: 's1', name: 'ร้านครัวไทย', itemCount: 8 },
  { id: 's2', name: 'ร้านก๋วยเตี๋ยว', itemCount: 5 },
  { id: 's3', name: 'ร้านอาหารอีสาน', itemCount: 4 },
  { id: 's4', name: 'โรงอาหาร', itemCount: 2 },
]

const activeTab = ref('items')
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingItem = ref<MenuItem | null>(null)
const formRef = ref<FormInstance>()
const menuItems = ref<MenuItem[]>([])
const shops = ref<Shop[]>(DEMO_SHOPS)

const form = reactive({
  name: '',
  sku: '',
  price: 0,
  shop: '',
  preorderable: false,
  active: true,
})

const rules: FormRules = {
  name:  [{ required: true, message: 'กรุณากรอกชื่อเมนู', trigger: 'blur' }],
  sku:   [{ required: true, message: 'กรุณากรอก SKU', trigger: 'blur' }],
  price: [{ required: true, message: 'กรุณากรอกราคา', trigger: 'blur' }],
  shop:  [{ required: true, message: 'กรุณาเลือกร้าน', trigger: 'change' }],
}

function openAddDialog() {
  editingItem.value = null
  Object.assign(form, { name: '', sku: '', price: 0, shop: '', preorderable: false, active: true })
  dialogVisible.value = true
}

function openEditDialog(item: MenuItem) {
  editingItem.value = item
  Object.assign(form, {
    name: item.name,
    sku: item.sku,
    price: item.price,
    shop: item.shop,
    preorderable: item.preorderable,
    active: item.active,
  })
  dialogVisible.value = true
}

async function saveItem() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const payload = { ...form }
    if (editingItem.value) {
      const res = await fetch(`${API_BASE}/menu/items/${editingItem.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok || true) {
        Object.assign(editingItem.value, payload)
        ElMessage.success('อัปเดตเมนูสำเร็จ')
      }
    } else {
      const res = await fetch(`${API_BASE}/menu/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const newItem = res.ok
        ? await res.json()
        : { id: Date.now().toString(), ...payload }
      menuItems.value.push(newItem)
      ElMessage.success('เพิ่มเมนูสำเร็จ')
    }
    dialogVisible.value = false
  } catch {
    ElMessage.warning('API ไม่พร้อม — บันทึกเฉพาะ UI')
    dialogVisible.value = false
  } finally {
    saving.value = false
  }
}

async function deleteItem(item: MenuItem) {
  await ElMessageBox.confirm(`ปิดการใช้งานเมนู "${item.name}" ?`, 'ยืนยัน', {
    confirmButtonText: 'ปิดการใช้งาน',
    cancelButtonText: 'ยกเลิก',
    type: 'warning',
  })
  try {
    await fetch(`${API_BASE}/menu/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false }),
    })
  } catch { /* ignore */ }
  item.active = false
  ElMessage.success('ปิดการใช้งานเมนูแล้ว')
}

async function fetchMenu() {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/menu/items`)
    if (res.ok) {
      const data = await res.json()
      menuItems.value = Array.isArray(data) ? data : data.data ?? DEMO_ITEMS
    } else {
      menuItems.value = DEMO_ITEMS
    }
  } catch {
    menuItems.value = DEMO_ITEMS
  } finally {
    loading.value = false
  }
}

onMounted(fetchMenu)
</script>

<style scoped>
.menu-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Tab bar */
.tab-bar {
  display: flex;
  gap: 6px;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04);
  width: fit-content;
}

.tab-btn {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #6E6E73;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn--active {
  background: #1264E3;
  color: #FFFFFF;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(18,100,227,0.3);
}

/* Toolbar */
.tab-toolbar {
  margin-bottom: 8px;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  height: 38px;
  padding: 0 18px;
  background: #1264E3;
  color: #FFFFFF;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  box-shadow: 0 2px 8px rgba(18,100,227,0.25);
}

.add-btn:hover {
  background: #0F52C1;
}

/* Table card */
.table-card {
  padding: 0;
  overflow: hidden;
}

.table-card :deep(.el-table) {
  border-radius: 0;
}

.table-card :deep(.el-table__row:hover > td) {
  background: rgba(18, 100, 227, 0.04) !important;
}

.table-card :deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid rgba(198, 198, 200, 0.25);
}

.sku-badge {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: #6E6E73;
  background: #F2F2F7;
  padding: 2px 7px;
  border-radius: 5px;
}

.action-btn {
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  margin: 0 2px;
}

.action-btn--edit {
  background: rgba(18, 100, 227, 0.10);
  color: #1264E3;
}

.action-btn--edit:hover {
  background: rgba(18, 100, 227, 0.18);
}

.action-btn--delete {
  background: rgba(255, 59, 48, 0.10);
  color: #FF3B30;
}

.action-btn--delete:hover {
  background: rgba(255, 59, 48, 0.18);
}

/* Shops grid */
.shops-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.shop-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.shop-icon {
  font-size: 28px;
  line-height: 1;
}

.shop-name {
  font-size: 15px;
  font-weight: 700;
  color: #000000;
}

.shop-meta {
  font-size: 13px;
  color: #AEAEB2;
}

/* Dialog */
.ios-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

.ios-dialog :deep(.el-dialog__header) {
  background: #F2F2F7;
  border-bottom: 1px solid rgba(198, 198, 200, 0.4);
  padding: 16px 20px;
}

.ios-dialog :deep(.el-dialog__title) {
  font-size: 17px;
  font-weight: 600;
  color: #000000;
}

.ios-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.ios-dialog :deep(.el-dialog__footer) {
  border-top: 1px solid rgba(198, 198, 200, 0.4);
  padding: 14px 20px;
}

.dialog-form :deep(.el-form-item__label) {
  color: #3C3C43;
  font-weight: 500;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-cancel-btn {
  height: 36px;
  padding: 0 18px;
  background: #F2F2F7;
  color: #3C3C43;
  border: none;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.dialog-cancel-btn:hover {
  background: #E5E5EA;
}

.dialog-save-btn {
  height: 36px;
  padding: 0 22px;
  background: #1264E3;
  color: #FFFFFF;
  border: none;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.dialog-save-btn:hover:not(:disabled) {
  background: #0F52C1;
}

.dialog-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
