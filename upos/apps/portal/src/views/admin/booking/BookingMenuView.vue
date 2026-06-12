<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">จัดการเมนูอาหาร</h2>
        <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">จัดการเมนูอาหารและรายการสินค้าทั้งหมดในระบบ</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showImportModal=true">
          <PhUploadSimple :size="14" /> นำเข้าไฟล์ Excel
        </button>
        <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openCreate">
          <PhPlus :size="14" /> เพิ่มเมนูใหม่
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3 items-end">
        <div style="flex:2;min-width:220px;display:flex;align-items:center;gap:8px;border:1px solid var(--color-border-tertiary);border-radius:8px;padding:0 12px;height:38px;background:#fff">
          <PhMagnifyingGlass :size="14" style="color:var(--color-text-tertiary);flex-shrink:0" />
          <input v-model="search" style="border:none;outline:none;flex:1;font-size:13px;font-family:inherit;background:transparent;color:var(--color-text-primary)" placeholder="ค้นหาเมนู..." />
        </div>
        <select v-model="filterSlot" class="adm-filter-select" style="flex:1;min-width:160px">
          <option value="">ช่วงเวลาทั้งหมด</option>
          <option value="Breakfast">Breakfast</option>
          <option value="Lunch">Lunch</option>
          <option value="Dinner">Dinner</option>
        </select>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:11px;color:var(--color-text-secondary)">เลือกวันที่</label>
          <input v-model="filterDate" type="date" class="adm-filter-input" style="height:38px" />
        </div>
        <button class="adm-search-btn" @click="currentPage=1">ค้นหา</button>
      </div>
    </div>

    <!-- API error banner -->
    <div v-if="apiError" style="background:#FFF0F0;border:1px solid #FFCDD2;border-radius:8px;padding:10px 14px;font-size:13px;color:#C62828">
      {{ apiError }}
    </div>

    <!-- Table -->
    <div class="adm-table-wrap" style="border-radius:12px">

      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:60px">ลำดับ</th>
            <th>ชื่อเมนู</th>
            <th class="center" style="width:100px">ช่วงเวลา</th>
            <th class="center" style="width:110px">สถานะ</th>
            <th class="center" style="width:120px">วันที่เริ่ม</th>
            <th class="center" style="width:120px">วันที่สิ้นสุด</th>
            <th class="center" style="width:90px">การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="center" style="padding:40px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="!loading && paginated.length === 0">
            <td colspan="7" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบข้อมูล</td>
          </tr>
          <template v-else>
          <tr v-for="(m, i) in paginated" :key="m.id">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td style="font-size:13px;color:var(--color-text-primary);max-width:500px">{{ m.name }}</td>
            <td class="center" style="font-size:13px">{{ m.timeSlot }}</td>
            <td class="center">
              <span :class="['bm-status', m.enabled ? 'bm-status-on' : 'bm-status-off']">
                <PhCheckCircle v-if="m.enabled" :size="13" weight="fill" />
                <PhCircle v-else :size="13" />
                {{ m.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </td>
            <td class="center" style="font-size:12px;color:var(--color-text-secondary);white-space:nowrap">{{ m.startDate || '—' }}</td>
            <td class="center" style="font-size:12px;color:var(--color-text-secondary);white-space:nowrap">{{ m.endDate || '—' }}</td>
            <td class="center">
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(m)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn danger" title="ลบ" @click="deleteMenu(m)">
                  <PhTrash :size="14" />
                </button>
              </div>
            </td>
          </tr>
          </template>
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
            :class="['adm-page-btn', currentPage===p?'active':'']" @click="currentPage=p">{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage===totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showImportModal" class="bm-backdrop" @click="closeImport" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showImportModal" class="imp-modal-bm">
          <div class="imp-header">
            <h3 class="imp-title">นำเข้าไฟล์ Excel</h3>
            <button class="imp-close" @click="closeImport"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="imp-divider" />
          <div class="imp-step">
            <div class="imp-step-num">1</div>
            <div class="flex-1">
              <p class="imp-step-title">ดาวน์โหลดไฟล์ต้นฉบับ</p>
              <p class="imp-step-sub">เพื่อให้แน่ใจว่าข้อมูลของคุณถูกจัดรูปแบบอย่างถูกต้อง</p>
              <button class="imp-dl-btn" @click="downloadTemplate">
                <PhDownloadSimple :size="14" weight="bold" /> ดาวน์โหลดไฟล์ต้นฉบับ
              </button>
            </div>
          </div>
          <div class="imp-divider" />
          <div class="imp-step" style="align-items:flex-start">
            <div class="imp-step-num">2</div>
            <div class="flex-1">
              <p class="imp-step-title">อัปโหลดไฟล์</p>
              <p class="imp-step-sub">
                ระบุรายการตามคำแนะนำ โดยอัปโหลดครั้งละ 1 ไฟล์<br>
                รองรับสูงสุด 1,000 รายการต่อไฟล์เพื่อการประมวลผลที่มีประสิทธิภาพ
              </p>
              <div class="imp-dropzone" :class="{'imp-dropzone-over':isDragOver,'imp-dropzone-has':!!importFile}"
                @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop" @click="fileInput?.click()">
                <div v-if="!importFile" style="display:flex;flex-direction:column;align-items:center;gap:8px">
                  <div class="imp-upload-icon"><PhCloudArrowUp :size="26" weight="fill" color="white" /></div>
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

          <!-- คำแนะนำ -->
          <div class="imp-instructions">
            <p style="font-size:13px;font-weight:500;color:var(--color-primary);margin-bottom:8px">คำแนะนำ:</p>
            <ul style="padding-left:16px;display:flex;flex-direction:column;gap:5px">
              <li style="font-size:13px;color:#3C3C43">การอัปโหลดไฟล์ Excel ใช้เพิ่ม/อัปเดต รายการเท่านั้น ไม่สามารถลบได้</li>
              <li style="font-size:13px;color:#3C3C43">โปรดตรวจสอบให้แน่ใจว่าไฟล์ Excel ของคุณตรงกับรูปแบบต้นฉบับที่กำหนด</li>
              <li style="font-size:13px;color:#3C3C43">รองรับเฉพาะไฟล์ที่มีนามสกุล .xlsx เท่านั้น</li>
              <li style="font-size:13px;color:#3C3C43">ข้อมูลในไฟล์ที่ถูกต้องเท่านั้นที่จะถูกอัปโหลด ส่วนข้อมูลที่ผิดจะไม่ถูกอัปโหลดเข้าสู่ระบบ</li>
            </ul>
          </div>

          <!-- Import result -->
          <div v-if="importResult" style="margin:0 24px 16px;padding:12px 14px;border-radius:8px;background:#F0FFF4;border:1px solid #C6F6D5;font-size:13px;color:#276749;display:flex;flex-direction:column;gap:4px">
            <span>เพิ่มใหม่ {{ importResult.inserted }} รายการ · อัปเดต {{ importResult.updated }} รายการ</span>
            <span v-if="importResult.errors.length > 0" style="color:#C62828">ข้อผิดพลาด {{ importResult.errors.length }} รายการ: {{ importResult.errors.slice(0,3).join(', ') }}{{ importResult.errors.length > 3 ? ' ...' : '' }}</span>
          </div>
          <div v-if="importError" style="margin:0 24px 16px;padding:10px 14px;border-radius:8px;background:#FFF0F0;border:1px solid #FFCDD2;font-size:13px;color:#C62828">
            {{ importError }}
          </div>

          <div class="imp-footer">
            <button class="imp-btn-cancel" @click="closeImport">{{ importResult ? 'ปิด' : 'ยกเลิก' }}</button>
            <button :class="['imp-btn-confirm', (importFile && !importing && !importResult) ? 'imp-btn-confirm-active' : '']" :disabled="!importFile || importing || !!importResult" @click="confirmImport">
              {{ importing ? 'กำลังนำเข้า...' : 'ยืนยัน' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showModal" class="bm-backdrop" @click="showModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showModal" class="bm-modal">
          <h3 class="bm-modal-title">{{ editTarget ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่' }}</h3>
          <div style="display:flex;flex-direction:column;gap:14px;margin-top:18px">
            <div class="bm-field">
              <label class="bm-label">ชื่อเมนู <span style="color:var(--color-danger)">*</span></label>
              <textarea v-model="form.name" class="bm-input bm-textarea" placeholder="ชื่อเมนูหรือรายการอาหาร" />
            </div>
            <div style="display:flex;gap:12px">
              <div class="bm-field" style="flex:1">
                <label class="bm-label">ช่วงเวลา</label>
                <select v-model="form.timeSlot" class="bm-input bm-select">
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>
              <div class="bm-field" style="flex:1">
                <label class="bm-label">ส่วนผสม</label>
                <input v-model="form.ingredient" class="bm-input" placeholder="ส่วนผสม (ถ้ามี)" />
              </div>
            </div>
            <div style="display:flex;gap:12px">
              <div class="bm-field" style="flex:1">
                <label class="bm-label">วันที่เริ่ม</label>
                <input v-model="form.startDate" type="date" class="bm-input" />
              </div>
              <div class="bm-field" style="flex:1">
                <label class="bm-label">วันที่สิ้นสุด</label>
                <input v-model="form.endDate" type="date" class="bm-input" />
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <button type="button" :class="['ts-toggle', form.enabled ? 'ts-toggle-on' : '']" @click="form.enabled=!form.enabled">
                <span class="ts-toggle-thumb" />
              </button>
              <span style="font-size:13px;color:var(--color-text-primary)">เปิดใช้งาน</span>
            </div>
          </div>
          <div v-if="saveError" style="margin-top:12px;padding:8px 12px;border-radius:8px;background:#FFF0F0;border:1px solid #FFCDD2;font-size:13px;color:#C62828">
            {{ saveError }}
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="saving" @click="showModal=false">ยกเลิก</button>
            <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="!form.name || saving" @click="save">{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhUploadSimple, PhMagnifyingGlass, PhPencilSimple, PhTrash, PhCheckCircle, PhCircle, PhX, PhCloudArrowUp, PhFileXls, PhDownloadSimple } from '@phosphor-icons/vue'
import * as XLSX from 'xlsx'
import type { BookingMenu, BookingMenuImportRow } from '@/api/types'
import { listBookingMenus, createBookingMenu, updateBookingMenu, deleteBookingMenu, importBookingMenus } from '@/api/booking'

const menus    = ref<BookingMenu[]>([])
const loading  = ref(false)
const apiError = ref('')

async function fetchMenus() {
  loading.value = true
  apiError.value = ''
  try {
    menus.value = await listBookingMenus()
  } catch (e: any) {
    apiError.value = e?.response?.data?.message ?? e?.message ?? 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

onMounted(fetchMenus)

const search      = ref('')
const filterSlot  = ref('')
const filterDate  = ref('')
const pageSize    = ref(10)
const currentPage = ref(1)
const showModal   = ref(false)
const showImportModal = ref(false)
const editTarget  = ref<BookingMenu | null>(null)
const form        = ref({ name:'', ingredient:'', timeSlot:'Breakfast', enabled:true, startDate:'', endDate:'' })
const saving      = ref(false)
const saveError   = ref('')

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return menus.value.filter(m => {
    const matchQ = !q || m.name.toLowerCase().includes(q)
    const matchS = !filterSlot.value || m.timeSlot === filterSlot.value
    return matchQ && matchS
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated  = computed(() => filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value))

function openCreate() { editTarget.value=null; form.value={name:'',ingredient:'',timeSlot:'Breakfast',enabled:true,startDate:'',endDate:''}; saveError.value=''; showModal.value=true }
function openEdit(m: BookingMenu) { editTarget.value=m; form.value={name:m.name,ingredient:m.ingredient,timeSlot:m.timeSlot,enabled:m.enabled,startDate:m.startDate,endDate:m.endDate}; saveError.value=''; showModal.value=true }

async function save() {
  if (!form.value.name || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    const payload = { name: form.value.name, ingredient: form.value.ingredient, timeSlot: form.value.timeSlot, enabled: form.value.enabled, startDate: form.value.startDate, endDate: form.value.endDate }
    if (editTarget.value) {
      const updated = await updateBookingMenu(String(editTarget.value.id), payload)
      const idx = menus.value.findIndex(m => m.id === editTarget.value!.id)
      if (idx >= 0) menus.value[idx] = updated
    } else {
      const created = await createBookingMenu(payload)
      menus.value.push(created)
    }
    showModal.value = false
  } catch (e: any) {
    saveError.value = e?.response?.data?.message ?? e?.message ?? 'บันทึกไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

async function deleteMenu(m: BookingMenu) {
  try {
    await deleteBookingMenu(String(m.id))
    menus.value = menus.value.filter(x => x.id !== m.id)
  } catch (e: any) {
    apiError.value = e?.response?.data?.message ?? e?.message ?? 'ลบไม่สำเร็จ'
  }
}
// Import modal
const importFile      = ref<File | null>(null)
const isDragOver      = ref(false)
const fileInput       = ref<HTMLInputElement | null>(null)
const importing       = ref(false)
const importResult    = ref<{ inserted:number; updated:number; errors:string[] } | null>(null)
const importError     = ref('')

function closeImport() {
  showImportModal.value = false
  importFile.value = null
  importResult.value = null
  importError.value = ''
}
function onDragOver(e: DragEvent) { e.preventDefault(); isDragOver.value=true }
function onDragLeave() { isDragOver.value=false }
function onDrop(e: DragEvent) {
  e.preventDefault(); isDragOver.value=false
  const f = e.dataTransfer?.files?.[0]
  if (f && /\.xlsx$/i.test(f.name)) { importFile.value = f; importResult.value = null; importError.value = '' }
}
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) { importFile.value = f; importResult.value = null; importError.value = '' }
  ;(e.target as HTMLInputElement).value = ''
}
function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Template with examples
  const headers = ['ชื่อเมนู*','ช่วงเวลาการจอง* (คั่นด้วย ,)','สถานะ','วันที่เริ่ม (DD/MM/YYYY)','วันที่สิ้นสุด (DD/MM/YYYY)']
  const example = [
    ['PWB แกงเขียวหวานไก่',                                        'Breakfast',              'เปิดใช้งาน','25/03/2026','25/03/2026'],
    ['ข้าวสวย / ข้าวกล้อง, เกี้ยวซ่, หมูตัว, พริกเกลือ, หน่อไม้', 'Dinner',                 'เปิดใช้งาน','25/03/2026','25/03/2026'],
    ['ข้าวสวย /ข้าวกล้อง, กะเพราเป็ด, ทอดมันปลา',                  'Breakfast,Lunch',        'เปิดใช้งาน','24/03/2026','24/03/2026'],
    ['ชุดอาหารเช้าแบบอเมริกัน',                                     'Breakfast,Lunch,Dinner', 'เปิดใช้งาน','24/03/2026','25/03/2026'],
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, ...example])
  ws['!cols'] = [{wch:48},{wch:12},{wch:14},{wch:22},{wch:22}]
  XLSX.utils.book_append_sheet(wb, ws, 'ต้นฉบับ')

  // Sheet 2: Instructions
  const instrRows = [
    ['คำแนะนำการกรอกข้อมูลเมนูการจอง'],[''],
    ['คอลัมน์','คำอธิบาย','ตัวอย่าง','จำเป็น'],
    ['ชื่อเมนู*','ชื่อเมนูหรือรายการอาหาร (รองรับข้อความยาว)','PWB แกงเขียวหวานไก่','ใช่'],
    ['ช่วงเวลา*','ช่วงเวลาการจอง ถ้ามีมากกว่า 1 ให้คั่นด้วย , เช่น Breakfast,Lunch','Breakfast หรือ Breakfast,Lunch,Dinner','ใช่'],
    ['สถานะ','สถานะเมนู','เปิดใช้งาน หรือ ปิดใช้งาน','ไม่จำเป็น (default: เปิดใช้งาน)'],
    ['วันที่เริ่ม','วันที่เริ่มเมนูนี้ รูปแบบ DD/MM/YYYY','25/03/2026','ไม่จำเป็น'],
    ['วันที่สิ้นสุด','วันที่สิ้นสุดเมนูนี้ รูปแบบ DD/MM/YYYY','25/03/2026','ไม่จำเป็น'],
    [''],
    ['หมายเหตุ:'],
    ['- การอัปโหลดไฟล์ Excel ใช้เพิ่ม/อัปเดต รายการเท่านั้น ไม่สามารถลบได้'],
    ['- ชื่อช่วงเวลาต้องตรงกับที่ตั้งค่าไว้ในเมนู "ตั้งค่าช่วงเวลา"'],
    ['- รองรับเฉพาะไฟล์ .xlsx เท่านั้น'],
    ['- สูงสุด 1,000 รายการต่อการอัปโหลด 1 ครั้ง'],
  ]
  const instrWs = XLSX.utils.aoa_to_sheet(instrRows)
  instrWs['!cols'] = [{wch:18},{wch:44},{wch:28},{wch:30}]
  XLSX.utils.book_append_sheet(wb, instrWs, 'คำแนะนำ')

  XLSX.writeFile(wb, 'BookingMenu_Template.xlsx')
}
async function confirmImport() {
  if (!importFile.value || importing.value) return
  importing.value = true
  importResult.value = null
  importError.value = ''
  try {
    // Client-side xlsx parse
    const buffer = await importFile.value.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][]

    // Row 0 = headers, rows 1+ = data
    const rows: BookingMenuImportRow[] = []
    for (let i = 1; i < raw.length; i++) {
      const r = raw[i]
      if (!r || !r[0]) continue
      rows.push({
        name:      String(r[0] ?? '').trim(),
        timeSlot:  String(r[1] ?? '').trim(),
        status:    r[2] ? String(r[2]).trim() : undefined,
        startDate: r[3] ? String(r[3]).trim() : undefined,
        endDate:   r[4] ? String(r[4]).trim() : undefined,
      })
    }

    // Send to API
    const result = await importBookingMenus(rows)
    importResult.value = result

    // Refresh list so imported rows appear
    await fetchMenus()
  } catch (e: any) {
    importError.value = e?.response?.data?.message ?? e?.message ?? 'นำเข้าไม่สำเร็จ'
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.bm-status { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:500; padding:3px 10px; border-radius:100px; white-space:nowrap; }
.bm-status-on  { background:var(--color-primary-tint); color:var(--color-primary); }
.bm-status-off { background:var(--color-bg-secondary); color:var(--color-text-tertiary); }

.bm-backdrop { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.4); }
.bm-modal { position:fixed; top:50%; left:50%; z-index:201; transform:translate(-50%,-50%); background:#fff; border-radius:14px; width:calc(100vw - 48px); max-width:500px; padding:24px; box-shadow:0 16px 48px rgba(0,0,0,0.14); max-height:90vh; overflow-y:auto; }
.bm-modal-title { font-size:17px; font-weight:500; color:var(--color-text-primary); }
.bm-field { display:flex; flex-direction:column; gap:5px; }
.bm-label { font-size:12px; color:var(--color-text-secondary); }
.bm-input { height:42px; padding:0 12px; border-radius:8px; border:1.5px solid #D0D0D0; font-size:14px; color:var(--color-text-primary); outline:none; font-family:inherit; background:#fff; transition:border-color 0.15s; width:100%; box-sizing:border-box; }
.bm-input:focus { border-color:var(--color-primary); }
.bm-select  { cursor:pointer; }
.bm-textarea { height:80px; padding:10px 12px; resize:vertical; line-height:1.5; }

/* reuse ts-toggle from TimeSettingsView via global? define locally */
.ts-toggle { width:44px; height:24px; border-radius:100px; border:none; cursor:pointer; background:#D1D1D6; position:relative; padding:0; transition:background 0.2s; flex-shrink:0; }
.ts-toggle-on { background:var(--color-primary); }
.ts-toggle-thumb { width:20px; height:20px; border-radius:50%; background:#fff; position:absolute; top:2px; left:2px; transition:transform 0.2s; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
.ts-toggle-on .ts-toggle-thumb { transform:translateX(20px); }

/* Import modal */
.imp-modal-bm { position:fixed; top:50%; left:50%; z-index:201; transform:translate(-50%,-50%); background:#fff; border-radius:16px; width:calc(100vw - 48px); max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:0 16px 48px rgba(0,0,0,0.18); }
.imp-header  { display:flex; justify-content:space-between; align-items:center; padding:20px 24px 16px; }
.imp-title   { font-size:18px; font-weight:500; color:#1C1C1E; }
.imp-close   { background:none; border:none; cursor:pointer; color:#8E8E93; display:flex; align-items:center; padding:4px; border-radius:6px; }
.imp-close:hover { background:#F2F2F7; }
.imp-divider { height:1px; background:#F0F0F0; }
.imp-step    { display:flex; align-items:flex-start; gap:14px; padding:20px 24px; }
.imp-step-num { width:32px; height:32px; border-radius:8px; background:var(--color-primary-tint); color:var(--color-primary); font-size:15px; font-weight:500; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.imp-step-title { font-size:15px; font-weight:500; color:#1C1C1E; margin-bottom:4px; }
.imp-step-sub   { font-size:13px; color:#8E8E93; line-height:1.5; margin-bottom:10px; }
.imp-dl-btn { display:inline-flex; align-items:center; gap:5px; font-size:14px; font-weight:500; color:var(--color-primary); background:none; border:none; cursor:pointer; padding:0; font-family:inherit; }
.imp-dropzone { border:2px dashed #D0D0D0; border-radius:12px; background:#FAFAFA; padding:32px 24px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:border-color 0.15s,background 0.15s; min-height:130px; }
.imp-dropzone:hover,.imp-dropzone-over { border-color:var(--color-primary); background:var(--color-primary-tint); }
.imp-dropzone-has { border-color:var(--color-success); background:var(--color-success-bg); }
.imp-upload-icon { width:52px; height:52px; border-radius:50%; background:var(--color-primary); display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
.imp-instructions { margin:0 24px 20px; background:var(--color-primary-tint); border-radius:10px; padding:14px 16px; }
.imp-footer { display:flex; gap:12px; padding:16px 24px 20px; border-top:1px solid #F0F0F0; }
.imp-btn-cancel { flex:1; height:48px; border-radius:12px; border:2px solid var(--color-primary); color:var(--color-primary); background:transparent; font-size:15px; font-weight:500; cursor:pointer; font-family:inherit; }
.imp-btn-cancel:hover { background:var(--color-primary-tint); }
.imp-btn-confirm { flex:1; height:48px; border-radius:12px; border:none; background:#E5E5EA; color:#AEAEB2; font-size:15px; font-weight:500; cursor:not-allowed; font-family:inherit; }
.imp-btn-confirm-active { background:var(--color-primary); color:#fff; cursor:pointer; }

.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from,   .modal-bg-leave-to     { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from,   .modal-up-leave-to     { opacity:0; transform:translate(-50%,-48%); }
</style>
