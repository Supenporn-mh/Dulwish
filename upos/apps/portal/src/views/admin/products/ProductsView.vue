<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">รายการสินค้า</h2>
      <div class="flex gap-2 flex-wrap">
        <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showImportModal=true">
          <PhUploadSimple :size="14" /> นำเข้าข้อมูล
        </button>
        <button class="adm-hdr-btn adm-hdr-btn-primary" @click="router.push('/admin/products/new')">
          <PhPlus :size="14" /> เพิ่มสินค้า
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3 items-end">
        <div style="display:flex;flex-direction:column;gap:5px;min-width:220px">
          <label style="font-size:12px;color:var(--color-text-secondary)">เลือกประเภทสินค้า</label>
          <select v-model="filterCategory" class="adm-filter-select">
            <option value="">ประเภทสินค้าทั้งหมด</option>
            <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;flex:1;min-width:200px">
          <label style="font-size:12px;color:var(--color-text-secondary)">ค้นหา</label>
          <input v-model="search" class="adm-filter-input" placeholder="ค้นหารหัส / ชื่อสินค้า..." style="width:100%" />
        </div>
        <button class="adm-search-btn" @click="currentPage=1">ค้นหา</button>
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:60px">ลำดับ</th>
            <th style="width:100px">รหัสสินค้า</th>
            <th>ชื่อสินค้า</th>
            <th>ประเภทสินค้า</th>
            <th class="right" style="width:90px">ราคา</th>
            <th class="center" style="width:90px">หน่วยนับ</th>
            <th class="center" style="width:90px">รูปสินค้า</th>
            <th class="center" style="width:90px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="center" style="padding:40px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="errorMsg">
            <td colspan="8" class="center" style="padding:40px;color:var(--color-danger)">{{ errorMsg }}</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="8" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบสินค้า</td>
          </tr>
          <tr v-for="(p, i) in paginated" v-else :key="p.id">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td><span class="adm-code">{{ p.id }}</span></td>
            <td style="font-size:13px;color:var(--color-text-primary)">{{ p.name }}</td>
            <td style="font-size:12px;color:var(--color-primary)">{{ categoryName(p.categoryCode) }}</td>
            <td class="right" style="font-weight:500;color:var(--color-text-primary)">
              {{ p.price.toLocaleString('th-TH', {minimumFractionDigits:2}) }}
            </td>
            <td class="center" style="font-size:13px;color:var(--color-text-secondary)">{{ p.unit }}</td>
            <td class="center">
              <button class="cat-img-btn" :title="p.imageUrl ? 'ดูรูปภาพ' : 'อัปโหลดรูป'" @click="openImageModal(p)">
                <PhImageSquare v-if="!p.imageUrl" :size="18" style="color:var(--color-primary)" />
                <img v-else :src="p.imageUrl" style="width:28px;height:28px;object-fit:cover;border-radius:4px" />
              </button>
            </td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="router.push(`/admin/products/${p.id}/edit`)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="handleDeleteProduct(p)">
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

    <!-- Image Preview Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="imageModal.show" class="lb-backdrop" @click="imageModal.show=false" />
      </Transition>
      <Transition name="lb-zoom">
        <div v-if="imageModal.show" class="lb-wrap" @click.self="imageModal.show=false">
          <div class="lb-card">
            <div class="lb-header">
              <div>
                <span class="adm-code">{{ imageModal.product?.id }}</span>
                <span style="margin-left:10px;font-size:13px;font-weight:500;color:var(--color-text-primary)">
                  {{ imageModal.product?.name }}
                </span>
              </div>
              <div class="flex gap-2 items-center">
                <button v-if="imageModal.product?.imageUrl" class="adm-hdr-btn adm-hdr-btn-soft" style="height:30px;font-size:12px;padding:0 12px" @click="imageModal.show=false; openEdit(imageModal.product!)">
                  <PhPencilSimple :size="12" /> เปลี่ยนรูป
                </button>
                <button class="promo-close-lb" @click="imageModal.show=false"><PhX :size="18" weight="bold" /></button>
              </div>
            </div>
            <div v-if="imageModal.product?.imageUrl" class="lb-preview-area">
              <img :src="imageModal.product.imageUrl" class="lb-img" />
            </div>
            <div v-else class="lb-no-image">
              <PhImageSquare :size="52" weight="light" style="color:var(--color-text-tertiary)" />
              <p style="font-size:14px;color:var(--color-text-secondary);margin-top:10px">ยังไม่มีรูปภาพ</p>
              <button class="adm-hdr-btn adm-hdr-btn-primary" style="margin-top:14px" @click="imageModal.show=false; openEdit(imageModal.product!)">
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
        <div v-if="showModal" class="k-modal" style="max-width:520px">
          <h3 class="k-modal-title">{{ editTarget ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า' }}</h3>
          <div style="display:flex;flex-direction:column;gap:14px;margin-top:18px">
            <div style="display:flex;gap:12px">
              <div class="k-field" style="flex:1">
                <label class="k-label">รหัสสินค้า <span style="color:var(--color-danger)">*</span></label>
                <input v-model="form.id" class="k-input" style="font-family:monospace" :disabled="!!editTarget" />
              </div>
              <div class="k-field" style="flex:2">
                <label class="k-label">ชื่อสินค้า <span style="color:var(--color-danger)">*</span></label>
                <input v-model="form.name" class="k-input" />
              </div>
            </div>
            <div style="display:flex;gap:12px">
              <div class="k-field" style="flex:1">
                <label class="k-label">ประเภทสินค้า</label>
                <select v-model="form.categoryCode" class="k-input k-select">
                  <option value="">เลือกประเภท</option>
                  <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div class="k-field" style="flex:1">
                <label class="k-label">ราคา (฿)</label>
                <input v-model.number="form.price" type="number" class="k-input" min="0" step="0.01" />
              </div>
              <div class="k-field" style="flex:1">
                <label class="k-label">หน่วยนับ</label>
                <select v-model="form.unit" class="k-input k-select">
                  <option value="">เลือกหน่วย</option>
                  <option v-for="u in UNITS" :key="u" :value="u">{{ u }}</option>
                </select>
              </div>
            </div>
            <div class="k-field">
              <label class="k-label">รูปสินค้า</label>
              <div class="cat-dropzone" @click="imgInput?.click()" @dragover.prevent @drop.prevent="onImgDrop">
                <template v-if="form.imageUrl">
                  <img :src="form.imageUrl" style="max-height:100px;border-radius:6px;object-fit:contain" />
                  <span style="font-size:11px;color:var(--color-text-tertiary);margin-top:4px">คลิกเพื่อเปลี่ยน</span>
                </template>
                <template v-else>
                  <PhUploadSimple :size="22" style="color:var(--color-text-tertiary)" />
                  <span style="font-size:12px;color:var(--color-text-secondary)">คลิกหรือลากไฟล์ภาพ</span>
                </template>
              </div>
              <input ref="imgInput" type="file" accept="image/*" style="display:none" @change="onImgChange" />
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showModal=false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!form.id||!form.name" @click="save">บันทึก</button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>

  <!-- ── Import Modal ──────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal-bg">
      <div v-if="showImportModal" class="modal-backdrop" @click="closeImport" />
    </Transition>
    <Transition name="modal-up">
      <div v-if="showImportModal" class="imp-modal" style="max-width:520px">

        <!-- Header -->
        <div class="imp-header">
          <h3 class="imp-title">นำเข้าข้อมูล</h3>
          <button class="imp-close" @click="closeImport"><PhX :size="18" weight="bold" /></button>
        </div>
        <div class="imp-divider" />

        <!-- Step 1 -->
        <div class="imp-step">
          <div class="imp-step-num">1</div>
          <div class="flex-1">
            <p class="imp-step-title">แก้ไขข้อมูลจากไฟล์ต้นฉบับ</p>
            <p class="imp-step-sub">เพื่อให้แน่ใจว่าข้อมูลของคุณถูกจัดรูปแบบอย่างถูกต้อง</p>
            <button class="imp-dl-btn" @click="downloadTemplate">
              <PhDownloadSimple :size="14" weight="bold" />
              ดาวน์โหลดไฟล์ต้นฉบับ
            </button>
          </div>
        </div>
        <div class="imp-divider" />

        <!-- Step 2 -->
        <div class="imp-step" style="align-items:flex-start">
          <div class="imp-step-num">2</div>
          <div class="flex-1">
            <p class="imp-step-title">อัปโหลดไฟล์</p>
            <p class="imp-step-sub">
              ระบุรายการตามคำแนะนำ โดยอัปโหลดครั้งละ 1 ไฟล์<br>
              รองรับสูงสุด 1,000 รายการต่อไฟล์เพื่อการประมวลผลที่มีประสิทธิภาพ
            </p>
            <div
              class="imp-dropzone"
              :class="{ 'imp-dropzone-over': isDragOver, 'imp-dropzone-has': !!importFile }"
              @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop" @click="fileInput?.click()"
            >
              <div v-if="!importFile" style="display:flex;flex-direction:column;align-items:center;gap:10px">
                <div class="imp-upload-icon">
                  <PhCloudArrowUp :size="26" weight="fill" color="white" />
                </div>
                <p style="font-size:14px;color:#3C3C43;text-align:center">
                  ลากและวางไฟล์ตรงนี้ หรือ <span style="color:var(--color-primary);font-weight:500;cursor:pointer">เลือกไฟล์</span> จากเครื่องของคุณ
                </p>
              </div>
              <div v-else style="display:flex;flex-direction:column;align-items:center;gap:6px">
                <PhFileXls :size="36" weight="fill" style="color:var(--color-primary)" />
                <p style="font-size:14px;font-weight:500;color:var(--color-primary)">{{ importFile.name }}</p>
                <p style="font-size:12px;color:#8E8E93">{{ (importFile.size/1024).toFixed(1) }} KB · คลิกเพื่อเปลี่ยนไฟล์</p>
              </div>
            </div>
            <input ref="fileInput" type="file" accept=".xlsx" style="display:none" @change="onFileChange" />
          </div>
        </div>

        <!-- Instructions -->
        <div class="imp-instructions">
          <p style="font-size:13px;font-weight:500;color:var(--color-primary);margin-bottom:8px">คำแนะนำ:</p>
          <ul style="padding-left:16px;display:flex;flex-direction:column;gap:5px">
            <li style="font-size:13px;color:#3C3C43">การอัปโหลดไฟล์ Excel ใช้เพิ่ม/อัปเดต รายการเท่านั้น ไม่สามารถลบได้</li>
            <li style="font-size:13px;color:#3C3C43">โปรดตรวจสอบให้แน่ใจว่าไฟล์ Excel ของคุณตรงกับรูปแบบต้นฉบับที่กำหนด</li>
            <li style="font-size:13px;color:#3C3C43">รองรับเฉพาะไฟล์ที่มีนามสกุล .xlsx เท่านั้น</li>
            <li style="font-size:13px;color:#3C3C43">ข้อมูลในไฟล์ที่ถูกต้องเท่านั้นที่จะถูกอัปโหลด ส่วนข้อมูลที่ผิดจะไม่ถูกอัปโหลดเข้าสู่ระบบ</li>
          </ul>
        </div>

        <!-- Footer -->
        <div class="imp-footer">
          <button class="imp-btn-cancel" @click="closeImport">ยกเลิก</button>
          <button :class="['imp-btn-confirm', importFile ? 'imp-btn-confirm-active':'']" :disabled="!importFile" @click="confirmImport">ยืนยัน</button>
        </div>

      </div>
    </Transition>
  </Teleport>

</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhPencilSimple, PhTrash, PhUploadSimple, PhImageSquare, PhX, PhDownloadSimple, PhCloudArrowUp, PhFileXls } from '@phosphor-icons/vue'
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import {
  listProducts as apiListProducts,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  deleteProduct as apiDeleteProduct,
  importProducts as apiImportProducts,
} from '@/api/products'
import type { Product, ProductImportRow } from '@/api/types'

const router = useRouter()

const CATEGORIES = [
  { id:'002', name:'A: PLANT BASED' }, { id:'003', name:'B: BREAKFAST SETS' },
  { id:'004', name:'C. A LA CARTE WESTERN BREAKFAST' }, { id:'005', name:'D. A LA CARTE ASIAN BREAKFAST' },
  { id:'006', name:'E: HEART HEALTHY SOUP' }, { id:'007', name:'F: HEALTHY SALAD' },
  { id:'008', name:'G : HALAL' }, { id:'009', name:'H: MAIN COURSE' },
  { id:'010', name:'I: THAI SPICY SALAD' }, { id:'011', name:'J: THAI INDIVIDUAL DISHES' },
  { id:'012', name:'K: GRILLED & STIR-FRIED' }, { id:'013', name:'L: NOODLES & RICE' },
  { id:'014', name:'M: SOUP & STEW' }, { id:'015', name:'M: BEVERAGE' },
  { id:'021', name:'S: INDIAN' }, { id:'030', name:'OPEN FOOD' },
]
const UNITS = ['จาน 2','แก้ว','รายการ','ชุด','กล่อง','เซ็ต','ชาม']

function categoryName(code: string) {
  return CATEGORIES.find(c => c.id === code)?.name ?? code
}

const products  = ref<Product[]>([])
const loading   = ref(false)
const errorMsg  = ref('')

async function loadProducts() {
  loading.value = true
  errorMsg.value = ''
  try {
    products.value = await apiListProducts()
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message ?? e?.message ?? 'โหลดข้อมูลสินค้าไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

onMounted(loadProducts)

const search         = ref('')
const filterCategory = ref('')
const pageSize       = ref(10)
const currentPage    = ref(1)
const showModal      = ref(false)
const showImportModal = ref(false)
const importFile      = ref<File | null>(null)
const isDragOver      = ref(false)
const fileInput       = ref<HTMLInputElement | null>(null)

function closeImport()  { showImportModal.value=false; importFile.value=null; isDragOver.value=false }
function onDragOver(e: DragEvent) { e.preventDefault(); isDragOver.value=true }
function onDragLeave()  { isDragOver.value=false }
function onDrop(e: DragEvent) {
  e.preventDefault(); isDragOver.value=false
  const f = e.dataTransfer?.files?.[0]
  if (f && /\.xlsx$/i.test(f.name)) importFile.value = f
}
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) importFile.value = f
  ;(e.target as HTMLInputElement).value = ''
}
function downloadTemplate() {
  const headers = ['Product Code*','Product Name*','Price','Cost','Category Code','Unit','Branch Code','Barcode','Remark','Attribute Type','Attribute Name','Attribute Value','Attribute Price']
  const examples = [
    ['A1','แกงเขียวหวาน(Vegan)',220,0,'002','จาน 2','00000','','','single','ประเภทแป้ง','ข้าวกล้อง',0],
    ['','','','','','','','','','single','ประเภทแป้ง','ข้าวสวย',0],
    ['B1','ชุดอาหารเช้าแบบอเมริกัน(Pork)',280,0,'003','จาน 2','00000','','','','','',''],
    ['M1','น้ำผลไม้ต่างๆ (Fruit Juices)',80,0,'015','แก้ว','00000','','','multiple','ขนาด','S',0],
    ['','','','','','','','','','multiple','ขนาด','M',10],
    ['','','','','','','','','','multiple','ขนาด','L',20],
  ]

  const wb = XLSX.utils.book_new()

  // Sheet 1: Template with examples
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples])
  ws['!cols'] = [{wch:14},{wch:40},{wch:8},{wch:8},{wch:14},{wch:10},{wch:12},{wch:14},{wch:14},{wch:14},{wch:16},{wch:16},{wch:14}]
  XLSX.utils.book_append_sheet(wb, ws, 'ต้นฉบับ')

  // Sheet 2: Instructions
  const instrRows = [
    ['คำแนะนำการกรอกข้อมูลสินค้า'],[''],
    ['คอลัมน์','คำอธิบาย','ตัวอย่าง','จำเป็น'],
    ['Product Code*','รหัสสินค้า (ไม่ซ้ำ)','A1, B1, M1','ใช่'],
    ['Product Name*','ชื่อสินค้า','แกงเขียวหวาน','ใช่'],
    ['Price','ราคาขาย','220','ไม่จำเป็น'],
    ['Cost','ราคาต้นทุน','180','ไม่จำเป็น'],
    ['Category Code','รหัสประเภทสินค้า','002, 003, 015','ไม่จำเป็น'],
    ['Unit','หน่วยนับ','จาน 2, แก้ว, รายการ','ไม่จำเป็น'],
    ['Branch Code','รหัสสาขา','00000','ไม่จำเป็น'],
    ['Barcode','บาร์โค้ด','8850100121042','ไม่จำเป็น'],
    ['Remark','หมายเหตุ','Vegan, Pork','ไม่จำเป็น'],
    ['Attribute Type','ประเภท attribute','single, multiple, number','ไม่จำเป็น'],
    ['Attribute Name','ชื่อ attribute','ประเภทแป้ง, ขนาด','ไม่จำเป็น'],
    ['Attribute Value','ค่า attribute','ข้าวกล้อง, S, M, L','ไม่จำเป็น'],
    ['Attribute Price','ราคา attribute (บาท)','0, 10, 20','ไม่จำเป็น'],
    [''],
    ['หมายเหตุ: สินค้าที่มีหลาย attribute ให้เพิ่มแถวต่อจากแถวสินค้า (Product Code ว่าง)'],
  ]
  const instrWs = XLSX.utils.aoa_to_sheet(instrRows)
  instrWs['!cols'] = [{wch:18},{wch:36},{wch:22},{wch:12}]
  XLSX.utils.book_append_sheet(wb, instrWs, 'คำแนะนำ')

  XLSX.writeFile(wb, 'Product_Import_Template.xlsx')
}
async function confirmImport() {
  if (!importFile.value) return
  const file = importFile.value
  closeImport()
  try {
    const buf = await file.arrayBuffer()
    const wb  = XLSX.read(buf, { type: 'array' })
    const ws  = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' }) as any[][]

    // Skip header row (index 0); each data row maps to ProductImportRow
    const rows: ProductImportRow[] = []
    for (let i = 1; i < raw.length; i++) {
      const r = raw[i]
      rows.push({
        productCode:    String(r[0] ?? '').trim(),
        productName:    String(r[1] ?? '').trim(),
        price:          r[2] !== '' ? Number(r[2]) : undefined,
        cost:           r[3] !== '' ? Number(r[3]) : undefined,
        categoryCode:   r[4] !== '' ? String(r[4]).trim() : undefined,
        unit:           r[5] !== '' ? String(r[5]).trim() : undefined,
        branchCode:     r[6] !== '' ? String(r[6]).trim() : undefined,
        barcode:        r[7] !== '' ? String(r[7]).trim() : undefined,
        remark:         r[8] !== '' ? String(r[8]).trim() : undefined,
        attributeType:  r[9] !== '' ? String(r[9]).trim() : undefined,
        attributeName:  r[10] !== '' ? String(r[10]).trim() : undefined,
        attributeValue: r[11] !== '' ? String(r[11]).trim() : undefined,
        attributePrice: r[12] !== '' ? Number(r[12]) : undefined,
      })
    }

    const result = await apiImportProducts(rows)
    await loadProducts()
    const errSummary = result.errors.length > 0 ? `\nข้อผิดพลาด: ${result.errors.slice(0, 5).join(', ')}` : ''
    alert(`นำเข้าสำเร็จ — เพิ่ม: ${result.inserted} รายการ, อัปเดต: ${result.updated} รายการ${errSummary}`)
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? 'นำเข้าข้อมูลไม่สำเร็จ')
  }
}
const editTarget     = ref<Product | null>(null)
const form           = ref({ id:'', name:'', price:0, categoryCode:'', unit:'', imageUrl:'' })
const imgInput       = ref<HTMLInputElement | null>(null)
const imageModal     = ref({ show:false, product: null as Product | null })

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return products.value.filter(p => {
    const matchQ = !q || p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    const matchC = !filterCategory.value || p.categoryCode === filterCategory.value
    return matchQ && matchC
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() =>
  filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value)
)

function openCreate() { editTarget.value=null; form.value={id:'',name:'',price:0,categoryCode:'',unit:'',imageUrl:''}; showModal.value=true }
function openEdit(p: Product) { editTarget.value=p; form.value={...p,imageUrl:p.imageUrl||''}; showModal.value=true }
function openImageModal(p: Product) { imageModal.value={show:true,product:p} }

async function save() {
  if (!form.value.id || !form.value.name) return
  const payload: Omit<Product, 'id'> & { id: string } = {
    id: form.value.id,
    name: form.value.name,
    price: form.value.price,
    categoryCode: form.value.categoryCode,
    unit: form.value.unit,
    imageUrl: form.value.imageUrl || undefined,
  }
  try {
    if (editTarget.value) {
      const updated = await apiUpdateProduct(editTarget.value.id, payload)
      const idx = products.value.findIndex(p => p.id === updated.id)
      if (idx >= 0) products.value[idx] = updated
    } else {
      const created = await apiCreateProduct(payload)
      products.value.push(created)
    }
    showModal.value = false
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? 'บันทึกไม่สำเร็จ')
  }
}
async function handleDeleteProduct(p: Product) {
  try {
    await apiDeleteProduct(p.id)
    products.value = products.value.filter(x => x.id !== p.id)
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? 'ลบไม่สำเร็จ')
  }
}
function onImgChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) { const r = new FileReader(); r.onload = ev => { form.value.imageUrl = ev.target?.result as string }; r.readAsDataURL(f) }
}
function onImgDrop(e: DragEvent) {
  const f = e.dataTransfer?.files?.[0]
  if (f?.type.startsWith('image/')) { const r = new FileReader(); r.onload = ev => { form.value.imageUrl = ev.target?.result as string }; r.readAsDataURL(f) }
}
</script>

<style scoped>
.cat-img-btn { background:none; border:none; cursor:pointer; padding:4px; border-radius:6px; display:flex; align-items:center; justify-content:center; transition:background 0.1s; margin:0 auto; }
.cat-img-btn:hover { background:var(--color-primary-tint); }

.cat-dropzone { border:1.5px dashed var(--color-border-tertiary); border-radius:10px; background:#FAFAFA; padding:16px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; transition:border-color 0.15s; min-height:80px; justify-content:center; }
.cat-dropzone:hover { border-color:var(--color-primary); background:var(--color-primary-tint); }

.k-backdrop { position:fixed; inset:0; z-index:50; background:rgba(0,0,0,0.4); }
.k-modal { position:fixed; top:50%; left:50%; z-index:51; transform:translate(-50%,-50%); background:#fff; border-radius:14px; width:calc(100vw - 48px); max-width:520px; padding:24px; box-shadow:0 16px 48px rgba(0,0,0,0.14); max-height:90vh; overflow-y:auto; }
.k-modal-title { font-size:16px; font-weight:500; color:var(--color-text-primary); }
.k-field { display:flex; flex-direction:column; gap:5px; }
.k-label { font-size:12px; color:var(--color-text-secondary); }
.k-input { height:40px; padding:0 12px; border-radius:8px; border:1px solid var(--color-border-tertiary); font-size:14px; color:var(--color-text-primary); outline:none; font-family:inherit; background:#fff; }
.k-input:focus { border-color:var(--color-primary); }
.k-input:disabled { background:var(--color-bg-secondary); color:var(--color-text-tertiary); }
.k-select { cursor:pointer; }

.lb-backdrop { position:fixed; inset:0; z-index:60; background:rgba(0,0,0,0.55); }
.lb-wrap { position:fixed; inset:0; z-index:61; display:flex; align-items:center; justify-content:center; padding:24px; }
.lb-card { background:#fff; border-radius:16px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 64px rgba(0,0,0,0.25); }
.lb-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid var(--color-border-tertiary); position:sticky; top:0; background:#fff; z-index:1; }
.lb-preview-area { background:#F2F2F7; padding:16px; }
.lb-img { width:100%; max-height:360px; object-fit:contain; display:block; border-radius:8px; }
.lb-no-image { padding:40px 20px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#FAFAFA; }
.promo-close-lb { background:none; border:none; cursor:pointer; color:var(--color-text-tertiary); padding:4px; border-radius:6px; display:flex; align-items:center; }
.promo-close-lb:hover { background:#F2F2F7; }

.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity:0; transform:translate(-50%,-48%); }
.lb-zoom-enter-active, .lb-zoom-leave-active   { transition:opacity 0.2s,transform 0.2s; }
.lb-zoom-enter-from,   .lb-zoom-leave-to       { opacity:0; transform:scale(0.96); }

/* Import modal */
.modal-backdrop { position:fixed; inset:0; z-index:50; background:rgba(0,0,0,0.4); }
.imp-modal {
  position:fixed; top:50%; left:50%; z-index:51; transform:translate(-50%,-50%);
  background:#fff; border-radius:16px; width:calc(100vw - 48px);
  max-height:90vh; overflow-y:auto; box-shadow:0 16px 48px rgba(0,0,0,0.18);
}
.imp-header  { display:flex; justify-content:space-between; align-items:center; padding:20px 24px 16px; }
.imp-title   { font-size:18px; font-weight:500; color:#1C1C1E; }
.imp-close   { background:none; border:none; cursor:pointer; color:#8E8E93; display:flex; align-items:center; padding:4px; border-radius:6px; }
.imp-close:hover { background:#F2F2F7; }
.imp-divider { height:1px; background:#F0F0F0; }
.imp-step    { display:flex; align-items:flex-start; gap:14px; padding:20px 24px; }
.imp-step-num { width:32px; height:32px; border-radius:8px; background:var(--color-primary-tint); color:var(--color-primary); font-size:15px; font-weight:500; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.imp-step-title { font-size:15px; font-weight:500; color:#1C1C1E; margin-bottom:4px; }
.imp-step-sub   { font-size:13px; color:#8E8E93; line-height:1.5; margin-bottom:10px; }
.imp-dl-btn { display:inline-flex; align-items:center; gap:5px; font-size:14px; font-weight:500; color:var(--color-primary); background:none; border:none; cursor:pointer; padding:0; }
.imp-dropzone {
  border:2px dashed #D0D0D0; border-radius:12px; background:#FAFAFA;
  padding:36px 24px; display:flex; flex-direction:column; align-items:center; justify-content:center;
  cursor:pointer; transition:border-color 0.15s, background 0.15s; min-height:150px;
}
.imp-dropzone:hover, .imp-dropzone-over { border-color:var(--color-primary); background:var(--color-primary-tint); }
.imp-dropzone-has { border-color:var(--color-success); background:var(--color-success-bg); }
.imp-upload-icon { width:52px; height:52px; border-radius:50%; background:var(--color-primary); display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
.imp-instructions { margin:0 24px 20px; background:var(--color-primary-tint); border-radius:10px; padding:14px 16px; }
.imp-footer      { display:flex; gap:12px; padding:16px 24px 20px; border-top:1px solid #F0F0F0; }
.imp-btn-cancel  { flex:1; height:48px; border-radius:12px; border:2px solid var(--color-primary); color:var(--color-primary); background:transparent; font-size:15px; font-weight:500; cursor:pointer; font-family:inherit; }
.imp-btn-cancel:hover { background:var(--color-primary-tint); }
.imp-btn-confirm { flex:1; height:48px; border-radius:12px; border:none; background:#E5E5EA; color:#AEAEB2; font-size:15px; font-weight:500; cursor:not-allowed; font-family:inherit; }
.imp-btn-confirm-active { background:var(--color-primary); color:#fff; cursor:pointer; }

.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity:0; transform:translate(-50%,-48%); }
</style>
