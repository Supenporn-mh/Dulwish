<template>
  <div class="adm-table-wrap" style="display:flex;flex-direction:column;gap:0;min-height:calc(100vh - 100px);border-radius:12px;overflow:hidden">

    <!-- Title -->
    <div style="text-align:center;padding:20px 0 0;position:relative">
      <h2 style="font-size:18px;font-weight:500;color:var(--color-text-primary)">
        {{ isNew ? 'เพิ่มสินค้า' : 'แก้ไขสินค้า' }}
      </h2>
      <button class="pd-close" @click="router.back()">
        <PhX :size="18" weight="bold" />
      </button>
    </div>

    <!-- Tabs (full-width segmented) -->
    <div class="pd-tabs">
      <button :class="['pd-tab', tab==='basic'?'pd-tab--active':'pd-tab--inactive']" @click="tab='basic'">ข้อมูลพื้นฐาน</button>
      <button :class="['pd-tab', tab==='extra'?'pd-tab--active':'pd-tab--inactive']" @click="tab='extra'">ข้อมูลเพิ่มเติม</button>
    </div>

    <!-- Loading / Error -->
    <div v-if="loading" style="padding:40px;text-align:center;color:var(--color-text-tertiary)">กำลังโหลด...</div>
    <div v-else-if="errorMsg" style="padding:20px 24px;color:var(--color-danger);font-size:14px">{{ errorMsg }}</div>

    <!-- ── Tab 1: ข้อมูลพื้นฐาน ──────────────────────────────────── -->
    <div v-if="tab==='basic' && !loading" class="pd-body">
      <div class="pd-grid">
        <!-- Left/Center fields -->
        <div class="pd-fields">
          <div class="pd-row">
            <div class="pd-field">
              <input v-model="form.id" class="pd-input" placeholder="รหัสสินค้า*" :disabled="!isNew" />
            </div>
            <div class="pd-field">
              <input v-model="form.barcode" class="pd-input" placeholder="Barcode" />
            </div>
          </div>
          <div class="pd-row">
            <div class="pd-field">
              <input v-model="form.name" class="pd-input" placeholder="ชื่อสินค้า*" />
            </div>
            <div class="pd-field">
              <input v-model="form.cost" type="number" class="pd-input" placeholder="ราคาต้นทุน*" min="0" />
            </div>
          </div>
          <div class="pd-row">
            <div class="pd-field">
              <input v-model="form.price" type="number" class="pd-input" placeholder="ราคาสินค้า*" min="0" />
            </div>
            <div class="pd-field">
              <select v-model="form.unit" class="pd-input pd-select">
                <option value="" disabled>หน่วยนับ*</option>
                <option v-for="u in units" :key="u.id" :value="u.name">{{ u.name }}</option>
              </select>
            </div>
          </div>
          <div class="pd-row">
            <div class="pd-field">
              <select v-model="form.branch" class="pd-input pd-select">
                <option value="" disabled>สาขา*</option>
                <option v-for="b in branches" :key="b.code" :value="b.code">{{ b.name }} ({{ b.code }})</option>
              </select>
            </div>
            <div class="pd-field">
              <div class="pd-float-wrap">
                <label class="pd-float-label">ประเภทอาหาร</label>
                <select v-model="form.categoryCode" class="pd-input pd-select pd-float-input">
                  <option value="">-- ไม่ระบุ --</option>
                  <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="pd-row">
            <div class="pd-field">
              <div class="pd-float-wrap">
                <label class="pd-float-label">ครัว</label>
                <select v-model="form.kitchenCode" class="pd-input pd-select pd-float-input">
                  <option value="">-- ไม่ระบุ --</option>
                  <option v-for="k in kitchens" :key="k.id" :value="k.id">{{ k.name }}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="pd-row">
            <div class="pd-field" style="display:flex;align-items:center;gap:10px">
              <span style="font-size:13px;color:var(--color-text-secondary);white-space:nowrap">เลือกไอคอน</span>
              <div style="display:flex;gap:8px">
                <button
                  v-for="icon in ICONS"
                  :key="icon"
                  :class="['pd-icon-btn', form.icon===icon?'pd-icon-btn--on':'']"
                  @click="form.icon = form.icon===icon ? '' : icon"
                  type="button"
                >{{ icon }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: image upload -->
        <div class="pd-img-area">
          <div
            class="pd-dropzone"
            :class="{ 'pd-dropzone--has': !!form.imageUrl }"
            @click="imgInput?.click()"
            @dragover.prevent
            @drop.prevent="onImgDrop"
          >
            <template v-if="form.imageUrl">
              <img :src="form.imageUrl" style="max-height:160px;border-radius:8px;object-fit:contain" />
              <span style="font-size:11px;color:var(--color-text-tertiary);margin-top:6px">คลิกเพื่อเปลี่ยน</span>
            </template>
            <template v-else>
              <PhUploadSimple :size="24" style="color:var(--color-text-tertiary)" />
              <p style="font-size:13px;font-weight:500;color:var(--color-text-secondary);margin-top:8px">Drag and drop files</p>
              <p style="font-size:12px;color:var(--color-text-tertiary)">or click here</p>
            </template>
          </div>
          <input ref="imgInput" type="file" accept="image/*" style="display:none" @change="onImgChange" />
        </div>
      </div>
    </div>

    <!-- ── Tab 2: ข้อมูลเพิ่มเติม ──────────────────────────────────── -->
    <div v-else-if="tab==='extra' && !loading" class="pd-body">
      <div style="display:flex;flex-direction:column;gap:0">

        <!-- Attribute rows -->
        <div v-for="(attr, ai) in form.attributes" :key="ai">
          <div style="padding:16px 0;display:flex;flex-direction:column;gap:8px">
            <!-- Row: name + type + delete -->
            <div class="pd-attr-row">
              <input
                v-model="attr.name"
                class="pd-input"
                style="flex:1"
                :class="{ 'pd-input-error': attrSubmitted && !attr.name }"
                placeholder="ชื่อตัวเลือก*"
              />
              <!-- Type select with floating label -->
              <div class="pd-float-wrap" style="min-width:200px">
                <label class="pd-float-label">รูปแบบ*</label>
                <select v-model="attr.type" class="pd-input pd-select pd-float-input">
                  <option value="" disabled>Select an option</option>
                  <option value="single">ตัวเลือกเดียว</option>
                  <option value="number">จำนวน</option>
                  <option value="multiple">หลายตัวเลือก</option>
                </select>
              </div>
              <button class="adm-action-btn danger" @click="removeAttr(ai)"><PhTrash :size="14" /></button>
            </div>
            <p v-if="attrSubmitted && !attr.name" style="font-size:11px;color:var(--color-danger)">Required field!</p>

            <!-- Sub-options -->
            <div v-for="(opt, oi) in attr.options" :key="oi" class="pd-option-row">
              <input v-model="opt.name" class="pd-input" style="flex:1" placeholder="ชื่อสินค้า*" />
              <input v-model.number="opt.price" type="number" class="pd-input" style="max-width:160px" placeholder="ราคา*" />
              <button class="adm-action-btn danger" @click="removeOption(attr, oi)"><PhTrash :size="14" /></button>
            </div>

            <!-- Add sub-option -->
            <button class="pd-add-btn" @click="addOption(attr)">
              <PhPlus :size="13" weight="bold" /> เพิ่มรายการ
            </button>
          </div>
          <div style="height:1px;background:var(--color-border-tertiary)" />
        </div>

        <!-- Add attribute row -->
        <div style="padding:16px 0">
          <button class="pd-add-btn" @click="addAttr">
            <PhPlus :size="13" weight="bold" /> เพิ่มรายการ
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="pd-footer">
      <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="router.back()">ยกเลิก</button>
      <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!canSave" @click="save">ตกลง</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PhX, PhPlus, PhTrash, PhUploadSimple } from '@phosphor-icons/vue'
import {
  listProducts as apiListProducts,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  listCategories as apiListCategories,
  listKitchens as apiListKitchens,
  listUnits as apiListUnits,
} from '@/api/products'
import { listBranches } from '@/api/settings'
import type { Product, ProductCategory, Kitchen, Unit } from '@/api/types'

// local type — not exported, avoids touching api/types.ts
interface BranchOption { code: string; name: string }

const route  = useRoute()
const router = useRouter()
const isNew  = computed(() => route.path.endsWith('/new'))
const productCode = computed(() => route.params.id as string)

const categories = ref<ProductCategory[]>([])
const kitchens   = ref<Kitchen[]>([])
const units      = ref<Unit[]>([])
const branches   = ref<BranchOption[]>([])
const ICONS = ['🍜','🍱','🥗','☕','🌿']

const tab      = ref<'basic'|'extra'>('basic')
const imgInput = ref<HTMLInputElement | null>(null)
const loading  = ref(false)
const errorMsg = ref('')

interface AttrOption { name: string; price: number }
interface Attribute  { name: string; type: 'single'|'number'|'multiple'; options: AttrOption[] }

const form = ref({
  id: '', barcode: '', name: '', cost: null as number|null, price: null as number|null,
  unit: '', branch: '', categoryCode: '', kitchenCode: '', icon: '',
  imageUrl: '', attributes: [] as Attribute[],
})

const canSave       = computed(() => !!form.value.id && !!form.value.name)
const attrSubmitted = ref(false)

onMounted(async () => {
  const [cats, kits, unitList, branchList] = await Promise.all([
    apiListCategories().catch(() => [] as ProductCategory[]),
    apiListKitchens().catch(() => [] as Kitchen[]),
    apiListUnits().catch(() => [] as Unit[]),
    listBranches().catch(() => [] as BranchOption[]),
  ])
  categories.value = cats
  kitchens.value   = kits
  units.value      = unitList
  branches.value   = branchList

  if (isNew.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    const all = await apiListProducts()
    const p   = all.find(x => x.id === productCode.value)
    if (p) {
      form.value.id           = p.id
      form.value.barcode      = p.barcode ?? ''
      form.value.name         = p.name
      form.value.cost         = p.cost ?? null
      form.value.price        = p.price ?? null
      form.value.unit         = p.unit ?? ''
      form.value.branch       = p.branch ?? ''
      form.value.categoryCode = p.categoryCode ?? ''
      form.value.kitchenCode  = p.kitchenCode ?? ''
      form.value.imageUrl     = p.imageUrl ?? ''
      form.value.attributes   = (p.attributes ?? []).map(a => ({
        name: a.name,
        type: a.type as 'single'|'number'|'multiple',
        options: a.options.map(o => ({ name: o.name, price: o.price })),
      }))
    }
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message ?? e?.message ?? 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

function onImgChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) { const r = new FileReader(); r.onload = ev => { form.value.imageUrl = ev.target?.result as string }; r.readAsDataURL(f) }
  ;(e.target as HTMLInputElement).value = ''
}
function onImgDrop(e: DragEvent) {
  const f = e.dataTransfer?.files?.[0]
  if (f?.type.startsWith('image/')) { const r = new FileReader(); r.onload = ev => { form.value.imageUrl = ev.target?.result as string }; r.readAsDataURL(f) }
}

function addAttr()                          { form.value.attributes.push({ name:'', type:'single', options:[] }) }
function removeAttr(i: number)              { form.value.attributes.splice(i, 1) }
function addOption(a: Attribute)            { a.options.push({ name:'', price:0 }) }
function removeOption(a: Attribute, i: number) { a.options.splice(i, 1) }

async function save() {
  if (!canSave.value) return
  const payload: Omit<Product, 'id'> & { id: string } = {
    id:           form.value.id,
    name:         form.value.name,
    price:        form.value.price ?? 0,
    cost:         form.value.cost ?? undefined,
    categoryCode: form.value.categoryCode,
    kitchenCode:  form.value.kitchenCode || undefined,
    unit:         form.value.unit,
    barcode:      form.value.barcode || undefined,
    branch:       form.value.branch || undefined,
    imageUrl:     form.value.imageUrl || undefined,
    attributes:   form.value.attributes.length > 0 ? form.value.attributes : undefined,
  }
  try {
    if (isNew.value) {
      await apiCreateProduct(payload)
    } else {
      await apiUpdateProduct(productCode.value, payload)
    }
    router.back()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? 'บันทึกไม่สำเร็จ')
  }
}
</script>

<style scoped>
/* Close button */
.pd-close {
  position:absolute; top:18px; right:20px;
  background:#F2F2F7; border:none; cursor:pointer; width:32px; height:32px;
  border-radius:50%; display:flex; align-items:center; justify-content:center;
  color:var(--color-text-secondary); transition:background 0.1s;
}
.pd-close:hover { background:var(--color-border-tertiary); }

/* Tabs — full-width segmented */
.pd-tabs { display:flex; border-bottom:2px solid var(--color-border-tertiary); margin-top:16px; }
.pd-tab {
  flex:1; padding:14px; font-size:14px; font-weight:500;
  text-align:center; background:none; border:none; border-bottom:2px solid transparent;
  cursor:pointer; font-family:inherit; margin-bottom:-2px;
  transition:color 0.15s, border-color 0.15s, background 0.15s;
}
.pd-tab--inactive { background:#fff; color:var(--color-text-secondary); }
.pd-tab--active   { background:#fff; color:var(--color-primary); border-bottom-color:var(--color-primary); }

/* Body */
.pd-body { padding:28px 24px; flex:1; }

/* Grid layout */
.pd-grid {
  display:flex; gap:24px; align-items:flex-start;
}
.pd-fields { flex:1; display:flex; flex-direction:column; gap:14px; }
.pd-row    { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.pd-field  { flex:1; }
.pd-row > .pd-field:only-child { grid-column: 1 / -1; }

/* Input */
.pd-input {
  width:100%; height:46px; padding:0 14px; border-radius:8px;
  border:1.5px solid #D0D0D0;
  font-size:14px; color:var(--color-text-primary);
  outline:none; font-family:inherit; background:#fff;
  transition:border-color 0.15s; box-sizing:border-box;
}
.pd-input:focus    { border-color:var(--color-primary); box-shadow:0 0 0 2px rgba(18,100,227,0.08); }
.pd-input:disabled { background:var(--color-bg-secondary); color:var(--color-text-tertiary); }
.pd-input-error    { border-color:var(--color-danger) !important; }
.pd-select         { cursor:pointer; }

/* Icon buttons */
.pd-icon-btn {
  width:34px; height:34px; border-radius:8px; border:1.5px solid var(--color-border-tertiary);
  background:#fff; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center;
  transition:border-color 0.15s, background 0.15s;
}
.pd-icon-btn:hover   { border-color:var(--color-primary); background:var(--color-primary-tint); }
.pd-icon-btn--on     { border-color:var(--color-primary); background:var(--color-primary-tint); }

/* Image upload */
.pd-img-area  { width:220px; flex-shrink:0; }
.pd-dropzone {
  border:2px dashed #C8C8C8; border-radius:10px;
  background:#F9F9F9; padding:20px 12px; cursor:pointer;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:6px; min-height:220px; transition:border-color 0.15s, background 0.15s;
  text-align:center;
}
.pd-dropzone:hover  { border-color:var(--color-primary); background:var(--color-primary-tint); }
.pd-dropzone--has   { border-color:var(--color-success); background:var(--color-success-bg); }

/* Attribute rows */
.pd-attr-row  { display:flex; align-items:center; gap:12px; }
.pd-option-row { display:flex; align-items:center; gap:10px; padding-left:24px; }

/* Floating label */
.pd-float-wrap  { position:relative; }
.pd-float-label {
  position:absolute; top:-8px; left:12px; z-index:1;
  font-size:11px; color:var(--color-primary); background:#fff; padding:0 4px;
  font-weight:500;
}
.pd-float-input { padding-top:4px; }

/* Add button (pill primary) */
.pd-add-btn {
  display:inline-flex; align-items:center; gap:6px;
  height:34px; padding:0 18px; border-radius:100px;
  background:var(--color-primary); color:#fff;
  font-size:13px; font-weight:500; border:none; cursor:pointer;
  font-family:inherit; transition:opacity 0.15s;
}
.pd-add-btn:hover { opacity:0.9; }

/* Footer */
.pd-footer {
  display:flex; justify-content:flex-end; gap:10px;
  padding:16px 24px; border-top:1px solid var(--color-border-tertiary);
  background:#fff; position:sticky; bottom:0;
}
.pd-btn-confirm {
  height:40px; padding:0 28px; border-radius:100px; border:none;
  background:#3B3DBF; color:#fff; font-size:14px; font-weight:500;
  cursor:pointer; font-family:inherit; transition:opacity 0.15s;
}
.pd-btn-confirm:disabled { opacity:0.4; cursor:not-allowed; }
.pd-btn-confirm:hover:not(:disabled) { opacity:0.9; }
.pd-btn-cancel {
  height:40px; padding:0 28px; border-radius:100px; border:none;
  background:#E53935; color:#fff; font-size:14px; font-weight:500;
  cursor:pointer; font-family:inherit; transition:opacity 0.15s;
}
.pd-btn-cancel:hover { opacity:0.85; }
</style>
