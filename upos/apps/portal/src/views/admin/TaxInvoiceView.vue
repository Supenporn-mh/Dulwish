<template>
  <div class="ti-page">

    <!-- Back -->
    <button class="ti-back" @click="router.back()">
      <PhArrowLeft :size="16" /> ย้อนกลับ
    </button>

    <div v-if="loading" style="padding:60px;text-align:center;color:var(--color-text-tertiary)">กำลังโหลด...</div>

    <div v-else class="adm-table-wrap ti-card">

      <!-- ── Doc header ─────────────────────────────────────────────── -->
      <div class="ti-doc-header">
        <div class="ti-logo-box">
          <div class="ti-logo-text">UPOS</div>
        </div>
        <div class="ti-title-box">
          <div class="ti-doc-title">ใบเสร็จรับเงิน/ใบกำกับภาษี</div>
          <div class="ti-meta-grid">
            <label class="ti-meta-lbl">เลขที่ใบกำกับภาษี:</label>
            <input v-model="form.invoiceNo" class="ti-input ti-input-sm" />
            <label class="ti-meta-lbl">วันที่ออกเอกสาร:</label>
            <input v-model="form.issuedDate" type="date" class="ti-input ti-input-sm" />
          </div>
        </div>
      </div>

      <!-- ── Two-col: seller | buyer ──────────────────────────────── -->
      <div class="ti-two-col">

        <div class="ti-section">
          <div class="ti-sec-title">ข้อมูลผู้ขาย</div>
          <div class="ti-field"><label>ชื่อผู้ขาย:</label><input v-model="seller.name" class="ti-input" /></div>
          <div class="ti-field"><label>ที่อยู่:</label><textarea v-model="seller.address" class="ti-input ti-ta" /></div>
          <div class="ti-field"><label>เลขประจำตัวผู้เสียภาษี:</label><input v-model="seller.taxId" class="ti-input" /></div>
          <div class="ti-field"><label>สาขา:</label><input v-model="seller.branch" class="ti-input" /></div>
          <div class="ti-field"><label>เบอร์โทรศัพท์:</label><input v-model="seller.phone" class="ti-input" /></div>
          <div class="ti-field"><label>อีเมล:</label><input v-model="seller.email" class="ti-input" /></div>
        </div>

        <div class="ti-section">
          <div class="ti-sec-title">ข้อมูลผู้ซื้อ</div>
          <div class="ti-field"><label>ชื่อผู้ซื้อ:</label><input v-model="buyer.name" class="ti-input" /></div>
          <div class="ti-field"><label>ที่อยู่:</label><textarea v-model="buyer.address" class="ti-input ti-ta" /></div>
          <div class="ti-field"><label>เลขประจำตัวผู้เสียภาษี:</label><input v-model="buyer.taxId" class="ti-input" /></div>
          <div class="ti-field"><label>สาขา:</label><input v-model="buyer.branch" class="ti-input" /></div>
          <div class="ti-field"><label>เบอร์โทรศัพท์:</label><input v-model="buyer.phone" class="ti-input" /></div>
          <div class="ti-field"><label>อีเมล:</label><input v-model="buyer.email" class="ti-input" /></div>
          <div class="ti-field"><label>ช่องทางการชำระเงิน:</label><input v-model="buyer.paymentMethod" class="ti-input" /></div>
        </div>

      </div>

      <!-- ── Items table ───────────────────────────────────────────── -->
      <div class="ti-items-section">
        <div class="ti-sec-title">รายการสินค้า</div>
        <table class="adm-table ti-table">
          <colgroup>
            <col style="width:52px" /><col style="width:110px" /><col />
            <col style="width:66px" /><col style="width:66px" />
            <col style="width:100px" /><col style="width:100px" />
          </colgroup>
          <thead>
            <tr>
              <th class="center">ลำดับ</th>
              <th>รหัสสินค้า</th>
              <th>รายการสินค้า</th>
              <th class="center">จำนวน</th>
              <th class="center">หน่วย</th>
              <th class="right">ราคาต่อหน่วย</th>
              <th class="right">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="items.length === 0">
              <td colspan="7" class="center" style="padding:24px;color:var(--color-text-tertiary)">ไม่มีรายการสินค้า</td>
            </tr>
            <tr v-for="(item, idx) in items" :key="idx">
              <td class="center num">{{ idx + 1 }}</td>
              <td>{{ item.sku ?? '-' }}</td>
              <td>{{ item.name }}</td>
              <td class="center">{{ item.qty }}</td>
              <td class="center">{{ item.unit ?? 'ชิ้น' }}</td>
              <td class="right">{{ item.unitPrice.toFixed(2) }}</td>
              <td class="right">{{ item.lineTotal.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Summary -->
        <div class="ti-summary">
          <div class="ti-sum-row">
            <span>รวมราคาสินค้า (ก่อน VAT):</span>
            <span>{{ subtotal.toFixed(2) }} บาท</span>
          </div>
          <div class="ti-sum-row">
            <span>ภาษีมูลค่าเพิ่ม 7%:</span>
            <span>{{ vatAmount.toFixed(2) }} บาท</span>
          </div>
          <div class="ti-sum-row ti-sum-grand">
            <span>ยอดรวมสุทธิ:</span>
            <span>{{ grandTotal.toFixed(2) }} บาท</span>
          </div>
          <div class="ti-sum-words">({{ amountInWords }})</div>
        </div>
      </div>

      <!-- ── Actions ───────────────────────────────────────────────── -->
      <div class="ti-actions">
        <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="saving" @click="savePrint">
          {{ saving ? 'กำลังบันทึก...' : 'บันทึก/พิมพ์ใบกำกับภาษี' }}
        </button>
        <button class="adm-hdr-btn ti-btn-clear" @click="resetBuyer">ล้างข้อมูล</button>
      </div>

      <!-- ── Note ──────────────────────────────────────────────────── -->
      <div class="ti-note-section">
        <div class="ti-note-lbl">หมายเหตุ:</div>
        <textarea
          v-model="form.note"
          class="ti-input ti-ta ti-ta-full"
          placeholder="กรอกหมายเหตุ หรือเงื่อนไขการยกเว้นภาษีที่ต้องระบุ เช่น 'ถูกหักภาษี ณ ที่จ่าย 3% ภายใน 30 วัน'"
        />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { PhArrowLeft } from '@phosphor-icons/vue'
import { getStoreSettings } from '@/api/settings'
import api from '@/api/axios'

const router = useRouter()
const route  = useRoute()
const txId   = route.params.id as string

const loading = ref(true)
const saving  = ref(false)

const form = ref({ invoiceNo: '', issuedDate: todayStr(), note: '' })

const seller = ref({ name: '', address: '', taxId: '', branch: '', phone: '', email: '' })
const buyer  = ref({ name: '', address: '', taxId: '', branch: '', phone: '', email: '', paymentMethod: '' })

interface TaxItem { sku: string; name: string; qty: number; unit: string; unitPrice: number; lineTotal: number }
const items = ref<TaxItem[]>([])

const subtotal   = computed(() => items.value.reduce((s, i) => s + i.lineTotal, 0))
const vatAmount  = computed(() => Math.round(subtotal.value * 0.07 * 100) / 100)
const grandTotal = computed(() => Math.round((subtotal.value + vatAmount.value) * 100) / 100)
const amountInWords = computed(() => toThaiWords(grandTotal.value))

function todayStr() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`
}

function genInvoiceNo(refNo: string) {
  const suffix = refNo?.replace(/^TXN-[A-Z]+-/, '') ?? Date.now().toString().slice(-6)
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `INV-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${suffix}`
}

onMounted(async () => {
  try {
    const [txRes, invRes] = await Promise.all([
      api.get(`/admin/transactions/${txId}`),
      api.get(`/admin/transactions/${txId}/tax-invoice`).catch(() => ({ data: { invoice: null } })),
    ])

    const tx  = txRes.data.transaction
    const inv = invRes.data.invoice

    const storeSettings = await getStoreSettings().catch(() => null)

    if (inv) {
      form.value   = { invoiceNo: inv.invoiceNo, issuedDate: inv.issuedAt?.split('T')[0] ?? todayStr(), note: inv.note ?? '' }
      buyer.value  = inv.buyer  ?? buyer.value
      // pre-fill seller from store settings if not saved in invoice
      const s = inv.seller
      if (s?.name) {
        seller.value = s
      } else if (storeSettings) {
        seller.value.name    = storeSettings.name    ?? ''
        seller.value.address = storeSettings.address ?? ''
        seller.value.taxId   = storeSettings.taxId   ?? ''
      }
    } else {
      form.value.invoiceNo = genInvoiceNo(tx.refNo)
      const u = tx.walletId?.userId
      if (u) {
        buyer.value.name          = [u.firstName, u.lastName].filter(Boolean).join(' ')
        buyer.value.email         = u.email ?? ''
        buyer.value.paymentMethod = tx.paymentMethod ?? ''
      }
      if (storeSettings) {
        seller.value.name    = storeSettings.name    ?? ''
        seller.value.address = storeSettings.address ?? ''
        seller.value.taxId   = storeSettings.taxId   ?? ''
      }
    }

    // map items
    if (tx.relatedOrderId?.items?.length) {
      items.value = tx.relatedOrderId.items.map((item: any) => ({
        sku:       item.menuItemId?.sku  ?? '-',
        name:      item.menuItemId?.name ?? '-',
        qty:       item.qty,
        unit:      'ชิ้น',
        unitPrice: item.unitPrice ?? 0,
        lineTotal: item.lineTotal ?? 0,
      }))
    }
  } finally {
    loading.value = false
  }
})

async function savePrint() {
  saving.value = true
  try {
    await api.post(`/admin/transactions/${txId}/tax-invoice`, {
      invoiceNo:  form.value.invoiceNo,
      issuedAt:   form.value.issuedDate,
      seller:     seller.value,
      buyer:      buyer.value,
      subtotal:   subtotal.value,
      vatAmount:  vatAmount.value,
      grandTotal: grandTotal.value,
      note:       form.value.note,
    })
    window.print()
  } catch (e) {
    alert('บันทึกไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}

function resetBuyer() {
  buyer.value  = { name: '', address: '', taxId: '', branch: '', phone: '', email: '', paymentMethod: '' }
  form.value.note = ''
}

// ── Thai baht in words ────────────────────────────────────────────────────────
function toThaiWords(amount: number): string {
  const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']

  function wordify(n: number): string {
    if (n === 0) return ''
    const s = Math.round(n).toString()
    const len = s.length
    let r = ''
    for (let i = 0; i < len; i++) {
      const d = parseInt(s[i])
      const pos = len - 1 - i
      if (d === 0) continue
      if (pos === 1) {
        if (d === 1)      r += 'สิบ'
        else if (d === 2) r += 'ยี่สิบ'
        else              r += ones[d] + 'สิบ'
      } else if (pos === 0 && d === 1 && len > 1) {
        r += 'เอ็ด'
      } else {
        const place = ['', '', 'ร้อย', 'พัน', 'หมื่น', 'แสน'][pos] ?? ''
        r += ones[d] + place
      }
    }
    return r
  }

  const [intStr, decStr] = amount.toFixed(2).split('.')
  const baht   = parseInt(intStr)
  const satang = parseInt(decStr)

  let result = ''
  if (baht === 0) result = 'ศูนย์'
  else if (baht >= 1_000_000) result = wordify(Math.floor(baht / 1_000_000)) + 'ล้าน' + wordify(baht % 1_000_000)
  else result = wordify(baht)

  result += 'บาท'
  if (satang === 0) result += 'ถ้วน'
  else result += wordify(satang) + 'สตางค์'

  return result
}
</script>

<style scoped>
.ti-page  { display:flex;flex-direction:column;gap:16px; }
.ti-back  { display:inline-flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:14px;color:var(--color-text-secondary);padding:0;font-family:inherit; }
.ti-back:hover { color:var(--color-primary); }
.ti-card  { border-radius:12px;padding:28px;display:flex;flex-direction:column;gap:24px; }

/* Doc header */
.ti-doc-header  { display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:20px;border-bottom:1px solid #F0F0F4; }
.ti-logo-box    { flex-shrink:0; }
.ti-logo-text   { font-size:28px;font-weight:800;letter-spacing:2px;color:var(--color-primary); }
.ti-title-box   { text-align:right; }
.ti-doc-title   { font-size:18px;font-weight:700;color:var(--color-primary);margin-bottom:12px; }
.ti-meta-grid   { display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center;justify-items:end; }
.ti-meta-lbl    { font-size:13px;color:var(--color-text-secondary);white-space:nowrap; }
.ti-input-sm    { width:180px; }

/* Two-col */
.ti-two-col     { display:grid;grid-template-columns:1fr 1fr;gap:24px; }
.ti-section     { display:flex;flex-direction:column;gap:10px; }
.ti-sec-title   { font-size:14px;font-weight:600;color:var(--color-text-primary);margin-bottom:4px; }
.ti-field       { display:flex;flex-direction:column;gap:4px; }
.ti-field label { font-size:13px;color:var(--color-text-secondary); }
/* hide any element injected into the grid that isn't an intended section */
.ti-two-col > *:not(.ti-section) { display: none; }
/* hide any element injected inside a section that isn't an intended child */
.ti-section > *:not(.ti-sec-title):not(.ti-field) { display: none; }

/* Inputs */
.ti-input {
  height:38px;padding:0 10px;border-radius:8px;border:1px solid #D0D0D0;
  font-size:13px;color:var(--color-text-primary);font-family:inherit;
  background:#fff;outline:none;box-sizing:border-box;width:100%;
  transition:border-color 0.15s;
}
.ti-input:focus { border-color:var(--color-primary); }
.ti-ta          { height:72px;padding:8px 10px;resize:vertical;line-height:1.5; }
.ti-ta-full     { height:96px;width:100%; }

/* Items */
.ti-items-section { display:flex;flex-direction:column;gap:0; }
.ti-table         { width:100%;margin-bottom:0; }

/* Summary */
.ti-summary      { display:flex;flex-direction:column;gap:8px;align-items:flex-end;padding:16px 0 4px; }
.ti-sum-row      { display:flex;gap:32px;font-size:14px;color:var(--color-text-primary); }
.ti-sum-row span:last-child { min-width:100px;text-align:right; }
.ti-sum-grand    { background:var(--color-primary);color:#fff;padding:6px 14px;border-radius:8px;font-weight:700; }
.ti-sum-words    { font-size:12px;color:var(--color-text-tertiary); }

/* Actions */
.ti-actions     { display:flex;gap:12px; }
.ti-btn-clear   { border:1.5px solid #FF3B30;color:#FF3B30;background:#fff; }
.ti-btn-clear:hover { background:#FFF1F0; }

/* Note */
.ti-note-section { display:flex;flex-direction:column;gap:6px; }
.ti-note-lbl     { font-size:13px;color:var(--color-text-secondary); }

/* ── Print ──────────────────────────────────────────────────────────── */
@media print {
  .ti-back, .ti-actions, .ti-note-section { display:none !important; }
  .ti-card { box-shadow:none !important;border:none !important;padding:0 !important; }
  .ti-input, .ti-ta { border:none !important;padding:0 !important;height:auto !important;background:transparent !important; }
  .ti-sum-grand { background:none !important;color:#000 !important; }
}
</style>
