<template>
  <div style="display:flex;flex-direction:column;gap:20px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">กลุ่มสมาชิก</h2>
        <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">จัดการสิทธิ์การใช้งานแยกตามกลุ่มหรือแผนกของพนักงาน</p>
      </div>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openCreate">
        <PhPlus :size="14" /> สร้างกลุ่มสมาชิกใหม่
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" style="padding:12px 16px;background:var(--color-danger-bg);color:var(--color-danger);border-radius:10px;font-size:13px">
      {{ error }}
    </div>

    <!-- Search -->
    <div class="group-search-wrap">
      <PhMagnifyingGlass :size="16" style="color:var(--color-text-tertiary);flex-shrink:0" />
      <input v-model="search" class="group-search" placeholder="ค้นหาชื่อกลุ่ม..." />
    </div>

    <!-- Loading -->
    <div v-if="loading" style="padding:48px;text-align:center;color:var(--color-text-tertiary);font-size:13px">
      กำลังโหลด...
    </div>

    <!-- Grid -->
    <div v-else class="group-grid">
      <div v-for="g in filtered" :key="g.id" class="group-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between">
          <div class="group-avatar">
            <PhUsersThree :size="22" weight="fill" style="color:var(--color-primary)" />
          </div>
          <div style="display:flex;gap:6px">
            <button class="group-edit-btn" @click="openEdit(g)" title="แก้ไข">
              <PhPencilSimple :size="15" />
            </button>
            <button class="group-edit-btn" @click="removeGroup(g)" title="ลบ" style="color:var(--color-danger)">
              <PhTrash :size="15" />
            </button>
          </div>
        </div>
        <div style="margin-top:14px">
          <div class="group-name">{{ g.name }}</div>
          <div class="group-meta">ID: {{ g.id }} · {{ g.memberCount }} สมาชิก</div>
        </div>
        <div style="height:1px;background:var(--color-border-tertiary);margin:14px 0" />
        <div style="display:flex;flex-wrap:wrap;gap:4px;min-height:22px">
          <span v-for="wid in enabledPerms(g.permissions)" :key="wid" class="group-perm-badge">{{ walletName(wid) }}</span>
          <span v-if="enabledPerms(g.permissions).length === 0" style="font-size:12px;color:var(--color-text-tertiary)">ยังไม่มีสิทธิ์</span>
        </div>
      </div>

      <div v-if="filtered.length === 0" style="grid-column:1/-1;padding:48px;text-align:center;color:var(--color-text-tertiary)">
        <PhUsersThree :size="40" weight="light" style="display:block;margin:0 auto 10px" />
        <p style="font-size:15px">ไม่พบกลุ่มที่ค้นหา</p>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PhPlus, PhUsersThree, PhMagnifyingGlass, PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import { useWalletsStore } from '@/stores/wallets'
import { listGroups, deleteGroup } from '@/api/groups'
import type { MemberGroup } from '@/api/types'

const router       = useRouter()
const walletsStore = useWalletsStore()
function walletName(id: string) { return walletsStore.wallets.find(w => w.id === id)?.name ?? id }
function enabledPerms(perms?: string[]) {
  const enabledIds = new Set(walletsStore.wallets.filter(w => w.enabled).map(w => w.id))
  return (perms ?? []).filter(id => enabledIds.has(id))
}

const groups  = ref<MemberGroup[]>([])
const loading = ref(false)
const error   = ref<string | null>(null)

async function loadGroups() {
  loading.value = true
  error.value   = null
  try {
    groups.value = await listGroups('member')
  } catch (e: any) {
    error.value = e?.message ?? 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (walletsStore.wallets.length === 0) await walletsStore.load()
  await loadGroups()
})

const search = ref('')

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return groups.value.filter(g => !q || g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q))
})

function openCreate()        { router.push('/admin/permissions/groups/new?name=สร้างกลุ่มสมาชิกใหม่') }
function openEdit(g: MemberGroup)  { router.push(`/admin/permissions/groups/${g.id}?name=${encodeURIComponent(g.name)}&perms=${(g.permissions??[]).join(',')}`) }

async function removeGroup(g: MemberGroup) {
  if (!confirm(`ลบกลุ่ม "${g.name}" ใช่หรือไม่?`)) return
  try {
    await deleteGroup(g.id)
    groups.value = groups.value.filter(x => x.id !== g.id)
  } catch (e: any) {
    alert(e?.message ?? 'ลบไม่สำเร็จ')
  }
}
</script>

<style scoped>
.group-search-wrap {
  display: flex; align-items: center; gap: 10px;
  background: #fff; border: 1px solid var(--color-border-tertiary);
  border-radius: 10px; padding: 0 16px; height: 46px;
}
.group-search {
  border: none; outline: none; flex: 1;
  font-size: 14px; color: var(--color-text-primary); background: transparent; font-family: inherit;
}
.group-search::placeholder { color: var(--color-text-tertiary); }

.group-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.group-card {
  background: #fff; border-radius: 14px;
  border: 1px solid var(--color-border-tertiary);
  padding: 20px; transition: box-shadow 0.15s;
}
.group-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }

.group-avatar {
  width: 52px; height: 52px; border-radius: 14px;
  background: var(--color-primary-tint);
  display: flex; align-items: center; justify-content: center;
}
.group-edit-btn {
  width: 32px; height: 32px; border-radius: 8px; border: none;
  background: var(--color-bg-secondary); color: var(--color-text-secondary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 0.1s;
}
.group-edit-btn:hover { background: var(--color-border-tertiary); color: var(--color-text-primary); }

.group-name { font-size: 17px; font-weight: 500; color: var(--color-text-primary); }
.group-meta { font-size: 12px; color: var(--color-text-tertiary); margin-top: 4px; }

.group-perm-badge {
  display: inline-block; font-size: 10px; font-weight: 500;
  padding: 2px 8px; border-radius: 100px;
  background: var(--color-primary-tint); color: var(--color-primary);
  white-space: nowrap;
}

.modal-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4); }
.modal-box {
  position: fixed; top: 50%; left: 50%; z-index: 51;
  transform: translate(-50%,-50%);
  background: #fff; border-radius: 14px;
  width: calc(100vw - 48px); max-width: 420px;
  padding: 24px; box-shadow: 0 16px 48px rgba(0,0,0,0.14);
}
.modal-title { font-size: 16px; font-weight: 500; color: var(--color-text-primary); }
.pf-field { display: flex; flex-direction: column; gap: 5px; }
.pf-label { font-size: 12px; color: var(--color-text-secondary); }
.pf-input {
  height: 38px; padding: 0 12px; border-radius: 8px;
  border: 1px solid var(--color-border-tertiary);
  font-size: 14px; color: var(--color-text-primary);
  outline: none; font-family: inherit; background: #fff;
}
.pf-input:focus { border-color: var(--color-primary); }

.modal-bg-enter-active, .modal-bg-leave-active { transition: opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity: 0; }
.modal-up-enter-active, .modal-up-leave-active { transition: opacity 0.25s, transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity: 0; transform: translate(-50%,-48%); }
</style>
