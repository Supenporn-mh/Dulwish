<template>
  <AppLayout>
    <div class="menu-view">
      <el-tabs v-model="activeTab" type="border-card" class="menu-tabs">
        <!-- Menu Items Tab -->
        <el-tab-pane label="Menu Items" name="items">
          <div class="tab-toolbar">
            <el-input
              v-model="itemSearch"
              placeholder="Search items..."
              clearable
              :prefix-icon="Search"
              style="width: 240px"
              @input="debouncedFetchItems"
            />
            <el-select
              v-model="itemShopFilter"
              placeholder="All Shops"
              clearable
              style="width: 160px"
              @change="fetchItems"
            >
              <el-option v-for="s in shops" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
            <el-select
              v-model="itemActiveFilter"
              placeholder="All Status"
              clearable
              style="width: 130px"
              @change="fetchItems"
            >
              <el-option label="Active" :value="true" />
              <el-option label="Inactive" :value="false" />
            </el-select>
            <el-button type="primary" :icon="Plus" @click="openAddItem">Add Item</el-button>
          </div>

          <el-table
            :data="menuItems"
            stripe
            style="width: 100%; margin-top: 12px"
            v-loading="itemsLoading"
            :empty-text="itemsLoading ? 'Loading...' : 'No items found'"
          >
            <el-table-column label="SKU" prop="sku" width="120" />
            <el-table-column label="Name" prop="name" min-width="160" />
            <el-table-column label="Shop" prop="shopName" width="130" />
            <el-table-column label="Price" prop="price" width="100" align="right">
              <template #default="{ row }">฿{{ row.price?.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="Pre-Order" prop="preOrderable" width="100" align="center">
              <template #default="{ row }">
                <el-icon v-if="row.preOrderable" color="#67c23a"><CircleCheck /></el-icon>
                <el-icon v-else color="#dcdfe6"><CircleClose /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="Active" prop="active" width="90" align="center">
              <template #default="{ row }">
                <el-switch
                  v-model="row.active"
                  :loading="togglingItemId === row.id"
                  @change="toggleItemActive(row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="130" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" plain :icon="Edit" @click="openEditItem(row)">
                  Edit
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- Shops Tab -->
        <el-tab-pane label="Shops" name="shops">
          <el-table
            :data="shops"
            stripe
            style="width: 100%; margin-top: 4px"
            v-loading="shopsLoading"
            :empty-text="shopsLoading ? 'Loading...' : 'No shops found'"
          >
            <el-table-column label="ID" prop="id" width="80" />
            <el-table-column label="Shop Name" prop="name" min-width="200" />
            <el-table-column label="Description" prop="description" min-width="260" />
            <el-table-column label="Active" prop="active" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.active ? 'success' : 'info'" size="small" effect="plain">
                  {{ row.active ? 'Active' : 'Inactive' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <!-- Add / Edit Dialog -->
      <el-dialog
        v-model="dialogVisible"
        :title="editingItem ? 'Edit Menu Item' : 'Add Menu Item'"
        width="540px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <el-form
          ref="itemFormRef"
          :model="itemForm"
          :rules="itemRules"
          label-width="110px"
          label-position="left"
        >
          <el-form-item label="SKU" prop="sku">
            <el-input v-model="itemForm.sku" placeholder="e.g. ITEM-001" :disabled="!!editingItem" />
          </el-form-item>
          <el-form-item label="Name" prop="name">
            <el-input v-model="itemForm.name" placeholder="Item name" />
          </el-form-item>
          <el-form-item label="Shop" prop="shopId">
            <el-select v-model="itemForm.shopId" placeholder="Select shop" style="width: 100%">
              <el-option v-for="s in shops" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="Price (฿)" prop="price">
            <el-input-number
              v-model="itemForm.price"
              :min="0"
              :precision="2"
              :step="5"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="Description">
            <el-input v-model="itemForm.description" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="Pre-Orderable">
            <el-switch v-model="itemForm.preOrderable" />
          </el-form-item>
          <el-form-item label="Active">
            <el-switch v-model="itemForm.active" />
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="dialogVisible = false">Cancel</el-button>
          <el-button type="primary" :loading="savingItem" @click="saveItem">
            {{ editingItem ? 'Update' : 'Create' }}
          </el-button>
        </template>
      </el-dialog>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import api from '@/api/axios'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Search, Plus, Edit, CircleCheck, CircleClose } from '@element-plus/icons-vue'

interface Shop {
  id: number | string
  name: string
  description?: string
  active: boolean
}

interface MenuItem {
  id: number | string
  sku: string
  name: string
  shopId: number | string
  shopName: string
  price: number
  description?: string
  preOrderable: boolean
  active: boolean
}

const activeTab = ref('items')

// Items
const menuItems = ref<MenuItem[]>([])
const itemsLoading = ref(false)
const itemSearch = ref('')
const itemShopFilter = ref<number | string | null>(null)
const itemActiveFilter = ref<boolean | null>(null)
const togglingItemId = ref<number | string | null>(null)

// Shops
const shops = ref<Shop[]>([])
const shopsLoading = ref(false)

// Dialog
const dialogVisible = ref(false)
const editingItem = ref<MenuItem | null>(null)
const savingItem = ref(false)
const itemFormRef = ref<FormInstance>()

const itemForm = ref({
  sku: '',
  name: '',
  shopId: null as number | string | null,
  price: 0,
  description: '',
  preOrderable: false,
  active: true,
})

const itemRules: FormRules = {
  sku: [{ required: true, message: 'SKU is required', trigger: 'blur' }],
  name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
  shopId: [{ required: true, message: 'Shop is required', trigger: 'change' }],
  price: [{ required: true, message: 'Price is required', trigger: 'blur' }],
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedFetchItems() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchItems(), 400)
}

async function fetchItems() {
  itemsLoading.value = true
  try {
    const params: Record<string, any> = {}
    if (itemSearch.value) params.search = itemSearch.value
    if (itemShopFilter.value !== null) params.shopId = itemShopFilter.value
    if (itemActiveFilter.value !== null) params.active = itemActiveFilter.value

    const res = await api.get('/menu/items', { params })
    menuItems.value = res.data.data || res.data.items || res.data
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to load menu items')
  } finally {
    itemsLoading.value = false
  }
}

async function fetchShops() {
  shopsLoading.value = true
  try {
    const res = await api.get('/menu/shops')
    shops.value = res.data.data || res.data.shops || res.data
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to load shops')
  } finally {
    shopsLoading.value = false
  }
}

function openAddItem() {
  editingItem.value = null
  itemForm.value = { sku: '', name: '', shopId: null, price: 0, description: '', preOrderable: false, active: true }
  dialogVisible.value = true
}

function openEditItem(item: MenuItem) {
  editingItem.value = item
  itemForm.value = {
    sku: item.sku,
    name: item.name,
    shopId: item.shopId,
    price: item.price,
    description: item.description || '',
    preOrderable: item.preOrderable,
    active: item.active,
  }
  dialogVisible.value = true
}

async function saveItem() {
  if (!itemFormRef.value) return
  const valid = await itemFormRef.value.validate().catch(() => false)
  if (!valid) return

  savingItem.value = true
  try {
    if (editingItem.value) {
      await api.put(`/menu/items/${editingItem.value.id}`, itemForm.value)
      ElMessage.success('Item updated')
    } else {
      await api.post('/menu/items', itemForm.value)
      ElMessage.success('Item created')
    }
    dialogVisible.value = false
    fetchItems()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to save item')
  } finally {
    savingItem.value = false
  }
}

async function toggleItemActive(item: MenuItem) {
  togglingItemId.value = item.id
  try {
    await api.patch(`/menu/items/${item.id}`, { active: item.active })
    ElMessage.success(item.active ? 'Item activated' : 'Item deactivated')
  } catch (err: any) {
    item.active = !item.active
    ElMessage.error(err.response?.data?.message || 'Failed to update item')
  } finally {
    togglingItemId.value = null
  }
}

watch(activeTab, (tab) => {
  if (tab === 'shops') fetchShops()
})

onMounted(() => {
  fetchItems()
  fetchShops()
})
</script>

<style scoped>
.menu-view {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.menu-tabs {
  border-radius: 12px;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
