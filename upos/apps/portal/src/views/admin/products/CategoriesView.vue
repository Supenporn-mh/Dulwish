<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">รายการประเภทสินค้า</h2>
      <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openCreate">
        <PhPlus :size="14" /> เพิ่มประเภทสินค้า
      </button>
    </div>

    <!-- Search -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex gap-3">
        <input v-model="search" class="adm-filter-input" placeholder="ค้นหารหัส / ชื่อประเภทสินค้า..." style="min-width:260px" />
        <button class="adm-search-btn" @click="currentPage=1">ค้นหา</button>
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:72px">ลำดับ</th>
            <th style="width:180px">รหัสประเภทสินค้า</th>
            <th>ชื่อประเภทสินค้า</th>
            <th class="center" style="width:100px">รูปสินค้า</th>
            <th class="center" style="width:90px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paginated.length === 0">
            <td colspan="5" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <tr v-for="(c, i) in paginated" :key="c.id">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td><span class="adm-code">{{ c.id }}</span></td>
            <td style="font-weight:500;color:var(--color-primary)">{{ c.name }}</td>
            <td class="center">
              <button
                class="cat-img-btn"
                :title="c.imageUrl ? 'ดูรูปภาพ' : 'อัปโหลดรูป'"
                @click="openImageModal(c)"
              >
                <PhImageSquare v-if="!c.imageUrl" :size="18" style="color:var(--color-primary)" />
                <img v-else :src="c.imageUrl" style="width:28px;height:28px;object-fit:cover;border-radius:6px" />
              </button>
            </td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(c)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="deleteCategory(c)">
                  <PhTrash :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="adm-pagination">
        <div class="adm-pagination-left">
          <span>ทั้งหมด {{ filtered.length }} รายการ</span>
          <span class="adm-pagination-sep">|</span>
          <span>แสดงผล</span>
          <select v-model="pageSize" class="adm-page-size">
            <option :value="10">10 รายการ</option>
            <option :value="25">25 รายการ</option>
            <option :value="50">50 รายการ</option>
          </select>
        </div>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage===1" @click="currentPage--">‹</button>
          <button v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage===p?'active':'']"
            @click="currentPage=p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage===totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

    <!-- Image Preview Modal (preview only) -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="imageModal.show" class="lb-backdrop" @click="imageModal.show=false" />
      </Transition>
      <Transition name="lb-zoom">
        <div v-if="imageModal.show" class="lb-wrap" @click.self="imageModal.show=false">
          <div class="lb-card">
            <!-- Header -->
            <div class="lb-header">
              <div>
                <span class="adm-code">{{ imageModal.category?.id }}</span>
                <span style="margin-left:10px;font-size:14px;font-weight:500;color:var(--color-text-primary)">
                  {{ imageModal.category?.name }}
                </span>
              </div>
              <div class="flex gap-2 items-center">
                <button
                  v-if="imageModal.category?.imageUrl"
                  class="adm-hdr-btn adm-hdr-btn-soft"
                  style="height:30px;font-size:12px;padding:0 12px"
                  @click="imageModal.show=false; openEdit(imageModal.category!)"
                >
                  <PhPencilSimple :size="12" /> เปลี่ยนรูป
                </button>
                <button class="promo-close-lb" @click="imageModal.show=false">
                  <PhX :size="18" weight="bold" />
                </button>
              </div>
            </div>

            <!-- Has image: show preview -->
            <div v-if="imageModal.category?.imageUrl" class="lb-preview-area">
              <img :src="imageModal.category.imageUrl" class="lb-img" :alt="imageModal.category?.name" />
            </div>

            <!-- No image: show placeholder state -->
            <div v-else class="lb-no-image">
              <PhImageSquare :size="52" weight="light" style="color:var(--color-text-tertiary)" />
              <p style="font-size:14px;color:var(--color-text-secondary);margin-top:10px">ยังไม่มีรูปภาพ</p>
              <button
                class="adm-hdr-btn adm-hdr-btn-primary"
                style="margin-top:14px"
                @click="imageModal.show=false; openEdit(imageModal.category!)"
              >
                <PhUploadSimple :size="14" /> อัปโหลดรูป
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showModal" class="k-backdrop" @click="showModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showModal" class="k-modal">
          <h3 class="k-modal-title">{{ editTarget ? 'แก้ไขประเภทสินค้า' : 'เพิ่มประเภทสินค้า' }}</h3>
          <div style="display:flex;flex-direction:column;gap:14px;margin-top:18px">
            <div class="k-field">
              <label class="k-label">รหัสประเภทสินค้า <span style="color:var(--color-danger)">*</span></label>
              <input v-model="form.id" class="k-input" placeholder="เช่น 002" :disabled="!!editTarget" style="font-family:monospace" />
            </div>
            <div class="k-field">
              <label class="k-label">ชื่อประเภทสินค้า <span style="color:var(--color-danger)">*</span></label>
              <input v-model="form.name" class="k-input" placeholder="เช่น A: PLANT BASED" />
            </div>
            <div class="k-field">
              <label class="k-label">รูปสินค้า</label>
              <div
                class="cat-dropzone"
                @click="imgInput?.click()"
                @dragover.prevent
                @drop.prevent="onImgDrop"
              >
                <PhUploadSimple v-if="!form.imageUrl" :size="22" style="color:var(--color-text-tertiary)" />
                <img v-else :src="form.imageUrl" style="height:60px;border-radius:6px;object-fit:cover" />
                <span style="font-size:12px;color:var(--color-text-tertiary);margin-top:4px">
                  {{ form.imageUrl ? 'คลิกเพื่อเปลี่ยน' : 'คลิกหรือลากไฟล์ภาพ' }}
                </span>
              </div>
              <input ref="imgInput" type="file" accept="image/*" style="display:none" @change="onImgChange" />
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showModal=false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!form.id||!form.name" @click="save">ตกลง</button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PhPlus, PhTrash, PhImageSquare, PhUploadSimple, PhX, PhPencilSimple } from '@phosphor-icons/vue'

interface Category { id: string; name: string; imageUrl?: string }

const categories = ref<Category[]>([
  { id:'002', name:'A: PLANT BASED' },
  { id:'003', name:'B: BREAKFAST SETS' },
  { id:'004', name:'C. A LA CARTE WESTERN BREAKFAST' },
  { id:'005', name:'D. A LA CARTE ASIAN BREAKFAST' },
  { id:'006', name:'E: HEART HEALTHY SOUP' },
  { id:'007', name:'F: HEALTHY SALAD' },
  { id:'008', name:'G : HALAL' },
  { id:'009', name:'H: MAIN COURSE' },
  { id:'010', name:'I: THAI SPICY SALAD' },
  { id:'011', name:'J: THAI INDIVIDUAL DISHES' },
  { id:'012', name:'K: GRILLED & STIR-FRIED' },
  { id:'013', name:'L: NOODLES & RICE' },
  { id:'014', name:'M: SOUP & STEW' },
  { id:'015', name:'N: DESSERT' },
  { id:'016', name:'O: BEVERAGES' },
])

const search      = ref('')
const pageSize    = ref(10)
const currentPage = ref(1)
const showModal   = ref(false)
const editTarget  = ref<Category | null>(null)
const form        = ref({ id:'', name:'', imageUrl:'' })
const imgInput    = ref<HTMLInputElement | null>(null)
const imageModal = ref({ show: false, category: null as Category | null })

function openImageModal(c: Category) {
  imageModal.value = { show: true, category: c }
}

const filtered   = computed(() => {
  const q = search.value.toLowerCase()
  return categories.value.filter(c => !q || c.id.includes(q) || c.name.toLowerCase().includes(q))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() =>
  filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value)
)

function openCreate() { editTarget.value=null; form.value={id:'',name:'',imageUrl:''}; showModal.value=true }
function openEdit(c: Category) { editTarget.value=c; form.value={...c,imageUrl:c.imageUrl||''}; showModal.value=true }

function save() {
  if (!form.value.id || !form.value.name) return
  if (editTarget.value) {
    const idx = categories.value.findIndex(c => c.id === editTarget.value!.id)
    if (idx >= 0) categories.value[idx] = { id:form.value.id, name:form.value.name, imageUrl:form.value.imageUrl||undefined }
  } else {
    categories.value.push({ id:form.value.id, name:form.value.name, imageUrl:form.value.imageUrl||undefined })
  }
  showModal.value = false
}
function deleteCategory(c: Category) {
  categories.value = categories.value.filter(x => x.id !== c.id)
}
function onImgChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) { const r = new FileReader(); r.onload = ev => { form.value.imageUrl = ev.target?.result as string }; r.readAsDataURL(f) }
}
function onImgDrop(e: DragEvent) {
  const f = e.dataTransfer?.files?.[0]
  if (f && f.type.startsWith('image/')) { const r = new FileReader(); r.onload = ev => { form.value.imageUrl = ev.target?.result as string }; r.readAsDataURL(f) }
}
</script>

<style scoped>
.cat-img-btn {
  background: none; border: none; cursor: pointer; padding: 4px;
  border-radius: 6px; display: flex; align-items: center; justify-content: center;
  transition: background 0.1s; margin: 0 auto;
}
.cat-img-btn:hover { background: var(--color-primary-tint); }

.cat-dropzone {
  border: 1.5px dashed var(--color-border-tertiary); border-radius: 10px;
  background: #FAFAFA; padding: 20px; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  transition: border-color 0.15s, background 0.15s;
}
.cat-dropzone:hover { border-color: var(--color-primary); background: var(--color-primary-tint); }

.k-backdrop { position:fixed; inset:0; z-index:50; background:rgba(0,0,0,0.4); }
.k-modal {
  position:fixed; top:50%; left:50%; z-index:51; transform:translate(-50%,-50%);
  background:#fff; border-radius:14px; width:calc(100vw - 48px); max-width:440px;
  padding:24px; box-shadow:0 16px 48px rgba(0,0,0,0.14);
}
.k-modal-title { font-size:16px; font-weight:500; color:var(--color-text-primary); }
.k-field { display:flex; flex-direction:column; gap:5px; }
.k-label { font-size:12px; color:var(--color-text-secondary); }
.k-input {
  height:40px; padding:0 12px; border-radius:8px;
  border:1px solid var(--color-border-tertiary); font-size:14px;
  color:var(--color-text-primary); outline:none; font-family:inherit; background:#fff;
}
.k-input:focus   { border-color:var(--color-primary); }
.k-input:disabled { background:var(--color-bg-secondary); color:var(--color-text-tertiary); }

.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity:0; transform:translate(-50%,-48%); }

/* Image modal / Lightbox */
.lb-backdrop  { position:fixed; inset:0; z-index:60; background:rgba(0,0,0,0.55); }
.lb-wrap {
  position:fixed; inset:0; z-index:61;
  display:flex; align-items:center; justify-content:center; padding:24px;
}
.lb-card {
  background:#fff; border-radius:16px;
  width:100%; max-width:520px; max-height:90vh;
  overflow-y:auto;
  box-shadow:0 24px 64px rgba(0,0,0,0.25);
}
.lb-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; border-bottom:1px solid var(--color-border-tertiary);
  position:sticky; top:0; background:#fff; z-index:1;
}
.lb-preview-area { background:#F2F2F7; padding:16px; }
.lb-img { width:100%; max-height:360px; object-fit:contain; display:block; border-radius:8px; }

.lb-no-image {
  padding:40px 20px; display:flex; flex-direction:column;
  align-items:center; justify-content:center; background:#FAFAFA;
}
.promo-close-lb {
  background:none; border:none; cursor:pointer; color:var(--color-text-tertiary);
  padding:4px; border-radius:6px; display:flex; align-items:center;
}
.promo-close-lb:hover { background:#F2F2F7; }

.lb-zoom-enter-active, .lb-zoom-leave-active { transition:opacity 0.2s,transform 0.2s; }
.lb-zoom-enter-from,   .lb-zoom-leave-to     { opacity:0; transform:scale(0.96); }
</style>
