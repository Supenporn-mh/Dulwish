<template>
  <AppLayout>
    <div class="policies-view" v-loading="loading">
      <div class="policies-header">
        <h2 class="section-title">System Policies</h2>
        <p class="section-desc">Configure canteen system rules and thresholds.</p>
      </div>

      <div class="policies-grid">
        <el-card
          v-for="policy in policies"
          :key="policy.key"
          shadow="never"
          class="policy-card"
        >
          <div class="policy-content">
            <div class="policy-info">
              <div class="policy-key">{{ formatKey(policy.key) }}</div>
              <div class="policy-desc">{{ policy.description || policy.key }}</div>
            </div>
            <div class="policy-edit">
              <template v-if="editingKey === policy.key">
                <el-input
                  v-model="editValue"
                  size="small"
                  style="width: 180px"
                  :placeholder="String(policy.value)"
                  @keyup.enter="savePolicy(policy)"
                  @keyup.esc="cancelEdit"
                />
                <el-button
                  type="primary"
                  size="small"
                  :loading="savingKey === policy.key"
                  @click="savePolicy(policy)"
                >
                  Save
                </el-button>
                <el-button size="small" @click="cancelEdit">Cancel</el-button>
              </template>
              <template v-else>
                <span class="policy-value">{{ policy.value }}</span>
                <el-button
                  type="primary"
                  plain
                  size="small"
                  :icon="Edit"
                  @click="startEdit(policy)"
                >
                  Edit
                </el-button>
              </template>
            </div>
          </div>

          <div class="policy-meta">
            <span v-if="policy.updatedAt" class="policy-updated">
              Last updated: {{ formatDate(policy.updatedAt) }}
              {{ policy.updatedBy ? `by ${policy.updatedBy}` : '' }}
            </span>
          </div>
        </el-card>
      </div>

      <el-empty v-if="!loading && policies.length === 0" description="No policies found" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import api from '@/api/axios'
import { ElMessage } from 'element-plus'
import { Edit } from '@element-plus/icons-vue'

interface Policy {
  key: string
  value: string | number | boolean
  description?: string
  updatedAt?: string
  updatedBy?: string
}

const loading = ref(false)
const policies = ref<Policy[]>([])
const editingKey = ref<string | null>(null)
const editValue = ref('')
const savingKey = ref<string | null>(null)

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function startEdit(policy: Policy) {
  editingKey.value = policy.key
  editValue.value = String(policy.value)
}

function cancelEdit() {
  editingKey.value = null
  editValue.value = ''
}

async function savePolicy(policy: Policy) {
  const trimmed = editValue.value.trim()
  if (trimmed === String(policy.value)) {
    cancelEdit()
    return
  }

  savingKey.value = policy.key
  try {
    // Coerce value type
    let parsedValue: string | number | boolean = trimmed
    if (trimmed === 'true') parsedValue = true
    else if (trimmed === 'false') parsedValue = false
    else if (!isNaN(Number(trimmed)) && trimmed !== '') parsedValue = Number(trimmed)

    await api.patch(`/admin/policies/${policy.key}`, { value: parsedValue })
    policy.value = parsedValue
    policy.updatedAt = new Date().toISOString()
    ElMessage.success(`Policy "${formatKey(policy.key)}" updated`)
    cancelEdit()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to update policy')
  } finally {
    savingKey.value = null
  }
}

async function fetchPolicies() {
  loading.value = true
  try {
    const res = await api.get('/admin/policies')
    // Support both array and object responses
    if (Array.isArray(res.data)) {
      policies.value = res.data
    } else if (typeof res.data === 'object') {
      policies.value = Object.entries(res.data).map(([key, val]: [string, any]) => ({
        key,
        value: typeof val === 'object' && val !== null ? val.value ?? val : val,
        description: typeof val === 'object' && val !== null ? val.description : undefined,
        updatedAt: typeof val === 'object' && val !== null ? val.updatedAt : undefined,
        updatedBy: typeof val === 'object' && val !== null ? val.updatedBy : undefined,
      }))
    }
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Failed to load policies')
  } finally {
    loading.value = false
  }
}

onMounted(fetchPolicies)
</script>

<style scoped>
.policies-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.policies-header {
  margin-bottom: 4px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 4px;
}

.section-desc {
  font-size: 13px;
  color: #909399;
}

.policies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
  gap: 14px;
}

.policy-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  transition: box-shadow 0.15s;
}

.policy-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.policy-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.policy-info {
  flex: 1;
  min-width: 0;
}

.policy-key {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 2px;
}

.policy-desc {
  font-size: 12px;
  color: #909399;
}

.policy-edit {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.policy-value {
  font-size: 15px;
  font-weight: 600;
  color: #667eea;
  min-width: 80px;
  text-align: right;
  margin-right: 8px;
}

.policy-meta {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f2f5;
}

.policy-updated {
  font-size: 11px;
  color: #c0c4cc;
}
</style>
