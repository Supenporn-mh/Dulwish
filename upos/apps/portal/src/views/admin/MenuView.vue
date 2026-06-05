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

      <div v-if="fetchError" class="error-banner">
        โหลดข้อมูลไม่สำเร็จ — {{ fetchError }}
      </div>

      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th class="center" style="width:52px">ลำดับ</th>
              <th>SKU</th>
              <th>ชื่อเมนู</th>
              <th>ร้าน</th>
              <th class="right">ราคา</th>
              <th class="center">สั่งล่วงหน้า</th>
              <th class="center">เปิดขาย</th>
              <th class="center" style="width:90px">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="center" style="padding:32px;color:#AEAEB2">กำลังโหลด...</td>
            </tr>
            <tr v-else-if="menuItems.length === 0 && !fetchError">
              <td colspan="8" class="center" style="padding:32px;color:#AEAEB2">ไม่มีเมนูอาหาร</td>
            </tr>
            <tr v-for="(item, i) in menuItems" :key="item._id">
              <td class="num center">{{ i + 1 }}</td>
              <td><span class="adm-code">{{ item.sku }}</span></td>
              <td style="font-weight:500;color:var(--color-primary)">{{ item.name }}</td>
              <td style="color:#3C3C43">{{ shopNameById(item.shopId) }}</td>
              <td class="right" style="font-weight:500;color:var(--color-primary)">฿{{ item.price }}</td>
              <td class="center">
                <button
                  :class="['adm-toggle', item.isPreorderable ? 'on' : '']"
                  :disabled="togglingId === item._id"
                  @click="togglePreorderable(item)"
                />
              </td>
              <td class="center">
                <button
                  :class="['adm-toggle', item.active ? 'on' : '']"
                  :disabled="togglingId === item._id"
                  @click="toggleActive(item)"
                />
              </td>
              <td>
                <div class="adm-actions">
                  <button class="adm-action-btn" title="แก้ไข" @click="openEditDialog(item)">
                    <PhPencilSimple :size="15" />
                  </button>
                  <button class="adm-action-btn danger" title="ลบ" @click="deleteItem(item)">
                    <PhTrash :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Shops tab -->
    <div v-if="activeTab === 'shops'">
      <div class="ios-section-header">ร้านค้าทั้งหมด</div>
      <div v-if="loading" style="padding:32px;color:#AEAEB2;text-align:center">กำลังโหลด...</div>
      <div v-else-if="shops.length === 0" style="padding:32px;color:#AEAEB2;text-align:center">ไม่มีข้อมูลร้านค้า</div>
      <div v-else class="shops-grid">
        <div
          v-for="shop in shops"
          :key="shop._id"
          class="ios-card shop-card"
        >
          <div class="shop-icon">🍳</div>
          <div class="shop-name">{{ shop.name }}</div>
          <div class="shop-meta">{{ shop.code }}</div>
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
        <el-form-item label="ร้านค้า" prop="shopId">
          <el-select v-model="form.shopId" placeholder="เลือกร้าน" style="width: 100%">
            <el-option v-for="s in shops" :key="s._id" :label="s.name" :value="s._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="สั่งล่วงหน้า">
          <el-switch
            v-model="form.isPreorderable"
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
import { PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import api from '@/api/axios'

interface MenuItem {
  _id: string
  sku: string
  name: string
  shopId: string
  price: number
  isPreorderable: boolean
  active: boolean
  description?: string
  categoryId?: string
}

interface Shop {
  _id: string
  code: string
  name: string
  type?: string
}

const activeTab = ref('items')
const loading = ref(false)
const saving = ref(false)
const togglingId = ref<string | null>(null)
const fetchError = ref<string | null>(null)
const dialogVisible = ref(false)
const editingItem = ref<MenuItem | null>(null)
const formRef = ref<FormInstance>()
const menuItems = ref<MenuItem[]>([])
const shops = ref<Shop[]>([])

const form = reactive({
  name: '',
  sku: '',
  price: 0,
  shopId: '',
  isPreorderable: false,
  active: true,
})

const rules: FormRules = {
  name:   [{ required: true, message: 'กรุณากรอกชื่อเมนู', trigger: 'blur' }],
  sku:    [{ required: true, message: 'กรุณากรอก SKU', trigger: 'blur' }],
  price:  [{ required: true, message: 'กรุณากรอกราคา', trigger: 'blur' }],
  shopId: [{ required: true, message: 'กรุณาเลือกร้าน', trigger: 'change' }],
}

function shopNameById(id: string): string {
  return shops.value.find(s => s._id === id)?.name ?? id
}

function openAddDialog() {
  editingItem.value = null
  Object.assign(form, { name: '', sku: '', price: 0, shopId: '', isPreorderable: false, active: true })
  dialogVisible.value = true
}

function openEditDialog(item: MenuItem) {
  editingItem.value = item
  Object.assign(form, {
    name: item.name,
    sku: item.sku,
    price: item.price,
    shopId: item.shopId,
    isPreorderable: item.isPreorderable,
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
    if (editingItem.value) {
      const { data } = await api.patch(`/menu/items/${editingItem.value._id}`, {
        name: form.name,
        price: form.price,
        active: form.active,
        isPreorderable: form.isPreorderable,
      })
      const updated: MenuItem = data.item
      const idx = menuItems.value.findIndex(m => m._id === updated._id)
      if (idx !== -1) menuItems.value[idx] = updated
      ElMessage.success('อัปเดตเมนูสำเร็จ')
    } else {
      const { data } = await api.post('/menu/items', {
        shopId: form.shopId,
        sku: form.sku,
        name: form.name,
        price: form.price,
        isPreorderable: form.isPreorderable,
      })
      menuItems.value.push(data.item)
      ElMessage.success('เพิ่มเมนูสำเร็จ')
    }
    dialogVisible.value = false
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message ?? 'บันทึกไม่สำเร็จ')
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
    await api.delete(`/menu/items/${item._id}`)
    item.active = false
    ElMessage.success('ปิดการใช้งานเมนูแล้ว')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message ?? 'ลบไม่สำเร็จ')
  }
}

async function togglePreorderable(item: MenuItem) {
  if (togglingId.value) return
  togglingId.value = item._id
  try {
    const { data } = await api.patch(`/menu/items/${item._id}`, {
      isPreorderable: !item.isPreorderable,
    })
    const idx = menuItems.value.findIndex(m => m._id === data.item._id)
    if (idx !== -1) menuItems.value[idx] = data.item
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message ?? 'อัปเดตไม่สำเร็จ')
  } finally {
    togglingId.value = null
  }
}

async function toggleActive(item: MenuItem) {
  if (togglingId.value) return
  togglingId.value = item._id
  try {
    const { data } = await api.patch(`/menu/items/${item._id}`, {
      active: !item.active,
    })
    const idx = menuItems.value.findIndex(m => m._id === data.item._id)
    if (idx !== -1) menuItems.value[idx] = data.item
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message ?? 'อัปเดตไม่สำเร็จ')
  } finally {
    togglingId.value = null
  }
}

async function fetchMenu() {
  loading.value = true
  fetchError.value = null
  try {
    const { data } = await api.get('/menu')
    menuItems.value = Array.isArray(data.items) ? data.items : []
    shops.value = Array.isArray(data.shops) ? data.shops : []
  } catch (err: any) {
    fetchError.value = err?.response?.data?.message ?? err?.message ?? 'ไม่สามารถเชื่อมต่อ API'
    menuItems.value = []
    shops.value = []
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
  font-weight: 500;
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
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  box-shadow: 0 2px 8px rgba(18,100,227,0.25);
}

.add-btn:hover {
  background: #0F52C1;
}

/* Error banner */
.error-banner {
  padding: 10px 14px;
  background: rgba(255, 59, 48, 0.08);
  border: 1px solid rgba(255, 59, 48, 0.2);
  border-radius: 10px;
  color: #FF3B30;
  font-size: 14px;
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
  font-weight: 500;
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
  font-weight: 500;
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
  font-weight: 500;
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
  font-weight: 500;
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
