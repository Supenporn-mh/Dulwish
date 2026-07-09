<template>
  <div style="display:flex;flex-direction:column;gap:16px" @click="activeDropdown = null">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">รายการยอดขาย</h2>
    </div>

    <!-- Filters -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end">
        <div class="txn-field">
          <label class="txn-label">วันที่</label>
          <input type="date" v-model="filter.date" class="txn-input" />
        </div>
        <div class="txn-field">
          <label class="txn-label">สถานะ</label>
          <select v-model="filter.status" class="txn-input">
            <option value="">ALL</option>
            <option value="select_payment">Select Payment</option>
            <option value="wait_payment">Wait Payment</option>
            <option value="complete">Complete</option>
            <option value="void">Void</option>
          </select>
        </div>
        <div class="txn-field">
          <label class="txn-label">ประเภท</label>
          <select v-model="filter.txType" class="txn-input">
            <option value="">ALL</option>
            <option value="topup">Topup</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div class="txn-field">
          <label class="txn-label">ช่องทางการชำระเงิน</label>
          <select v-model="filter.paymentMethod" class="txn-input">
            <option value="">ALL</option>
            <option value="wallet">Wallet</option>
            <option value="cash">เงินสด</option>
            <option value="promptpay">PromptPay</option>
            <option value="card_wallet">Card/Wallet</option>
            <option value="scb_qr">SCB QR</option>
          </select>
        </div>
        <button class="adm-hdr-btn adm-hdr-btn-primary" style="height:42px" @click="fetchTxns">
          ค้นหา
        </button>
        <button
          v-if="filter.date || filter.status || filter.paymentMethod || filter.txType"
          class="adm-hdr-btn adm-hdr-btn-ghost"
          style="height:42px"
          @click="clearFilters"
        >ล้าง</button>
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap" style="border-radius:12px;overflow-x:auto">
      <table class="adm-table" style="table-layout:fixed;min-width:900px">
        <colgroup>
          <col style="width:56px" />
          <col style="width:150px" />
          <col style="width:140px" />
          <col style="width:90px" />
          <col style="width:80px" />
          <col style="width:110px" />
          <col style="width:100px" />
          <col style="width:130px" />
          <col style="width:90px" />
          <col style="width:64px" />
        </colgroup>
        <thead>
          <tr>
            <th class="center">ลำดับ</th>
            <th>เลขที่รายการ</th>
            <th>วันที่ทำรายการ</th>
            <th>ร้านค้า</th>
            <th class="center">ประเภท</th>
            <th>ช่องทางชำระ</th>
            <th class="center">สถานะ</th>
            <th class="center">สถานะการชำระเงิน</th>
            <th class="right">Grand Total</th>
            <th class="center">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10" class="center" style="padding:40px">
              <div class="txn-spinner" />
            </td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="10" class="center" style="padding:40px;color:var(--color-text-tertiary)">ไม่พบรายการ</td>
          </tr>
          <tr v-for="(tx, i) in paginated" :key="tx._id ?? i">
            <td class="num center">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
            <td><span class="adm-code">{{ tx.refNo }}</span></td>
            <td style="white-space:nowrap;color:var(--color-text-secondary)">{{ fmtDate(tx.createdAt) }}</td>
            <td style="font-weight:500;color:var(--color-primary)">{{ tx.deviceId ?? tx.channel ?? '-' }}</td>
            <td class="center">
              <span :class="['adm-badge', txTypeInfo(tx).cls]">{{ txTypeInfo(tx).label }}</span>
            </td>
            <td>
              <span v-if="tx.paymentMethod" :class="['adm-badge', 'adm-badge-info']">
                {{ paymentLabel(tx.paymentMethod) }}
              </span>
              <span v-else style="color:var(--color-text-tertiary)">-</span>
            </td>
            <td class="center">
              <span :class="['adm-badge', orderStatusClass(tx)]">
                {{ orderStatusLabel(tx) }}
              </span>
            </td>
            <td class="center">
              <span v-if="tx.status === 'success'" class="adm-badge adm-badge-success">success</span>
              <span v-else-if="tx.status === 'wait'" class="adm-badge adm-badge-pending">wait</span>
              <span v-else style="color:var(--color-text-tertiary)">-</span>
            </td>
            <td class="right" style="font-weight:500;color:var(--color-text-primary)">
              {{ tx.amount != null ? Math.abs(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 0 }) : '-' }}
            </td>
            <td class="center">
              <div style="position:relative" @click.stop>
                <button
                  :class="['txn-gear-btn', activeDropdown === (tx._id ?? i) ? 'txn-gear-btn--active' : '']"
                  @click="toggleDropdown(tx._id ?? i)"
                >
                  <PhGear :size="16" />
                </button>
                <Transition name="dd">
                  <div v-if="activeDropdown === (tx._id ?? i)" class="txn-dropdown">
                    <button class="txn-dd-item" @click="onAction('detail', tx)">
                      <PhEye :size="14" /> ดูรายละเอียด
                    </button>
                    <button
                      class="txn-dd-item"
                      :disabled="tx.status !== 'wait' && tx.status !== 'pending'"
                      @click="onAction('payment-status', tx)"
                    >
                      <PhCreditCard :size="14" /> เปลี่ยนสถานะการชำระเงิน
                    </button>
                    <button
                      class="txn-dd-item"
                      :disabled="tx.status !== 'success'"
                      @click="onAction('tax-invoice', tx)"
                    >
                      <PhReceipt :size="14" /> จัดการใบกำกับภาษี
                    </button>
                    <div class="txn-dd-divider" />
                    <button class="txn-dd-item txn-dd-item--danger" @click="onAction('void', tx)">
                      <PhProhibit :size="14" /> void
                    </button>
                  </div>
                </Transition>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="adm-pagination">
        <div class="adm-pagination-left">
          <span>ทั้งหมด {{ filteredTxns.length }} รายการ</span>
          <span class="adm-pagination-sep">|</span>
          <span>แสดงผล</span>
          <select v-model="pageSize" class="adm-page-size" @change="currentPage = 1">
            <option :value="10">10 รายการ</option>
            <option :value="25">25 รายการ</option>
            <option :value="50">50 รายการ</option>
          </select>
        </div>
        <div class="adm-page-btns">
          <button class="adm-page-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>
          <button
            v-for="p in totalPages" :key="p"
            :class="['adm-page-btn', currentPage === p ? 'active' : '']"
            @click="currentPage = p"
          >{{ p }}</button>
          <button class="adm-page-btn" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
        </div>
      </div>
    </div>

  </div>

  <!-- Void Modal -->
  <Teleport to="body">
    <Transition name="txd-fade">
      <div v-if="showVoid" class="txd-overlay" @click.self="showVoid=false">
        <div class="txd-modal" style="max-width:420px">
          <div class="txd-header">ยกเลิกรายการ (Void)</div>
          <div class="txd-body" style="gap:14px">
            <div style="font-size:13px;color:var(--color-text-secondary)">
              เลขที่: <strong>{{ voidTx?.refNo ?? '-' }}</strong>
            </div>
            <div class="txn-field">
              <label class="txn-label">เหตุผลการยกเลิก <span style="color:var(--color-danger)">*</span></label>
              <div class="txn-reason-chips">
                <button
                  v-for="opt in cancelReasons" :key="opt.id"
                  type="button"
                  class="txn-reason-chip"
                  :class="{ 'txn-reason-chip-active': voidForm.reason === opt.label }"
                  @click="voidForm.reason = opt.label"
                >{{ opt.label }}</button>
              </div>
              <input v-model="voidForm.reason" class="txn-input" placeholder="ระบุเหตุผล..." />
            </div>
            <div class="txn-field">
              <label class="txn-label">รหัส Supervisor <span style="color:var(--color-danger)">*</span></label>
              <input v-model="voidForm.supervisorCode" class="txn-input" type="password" placeholder="Supervisor code" autocomplete="off" />
            </div>
            <div v-if="voidError" style="font-size:12px;color:var(--color-danger,#CC3333)">{{ voidError }}</div>
          </div>
          <div class="txd-footer" style="gap:10px">
            <button class="txd-pill-btn" style="background:#E5E5EA;color:#3C3C43" @click="showVoid=false">ยกเลิก</button>
            <button
              class="txd-pill-btn"
              style="background:#FF3B30"
              :disabled="!voidForm.reason || !voidForm.supervisorCode || voidLoading"
              @click="confirmVoid"
            >{{ voidLoading ? 'กำลังดำเนินการ...' : 'ยืนยัน Void' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Payment Status Modal -->
  <Teleport to="body">
    <Transition name="txd-fade">
      <div v-if="showPaymentStatus" class="txd-overlay" @click.self="showPaymentStatus=false">
        <div class="txd-modal" style="max-width:380px">
          <div class="txd-header">เปลี่ยนสถานะการชำระเงิน</div>
          <div class="txd-body" style="gap:14px">
            <div style="font-size:13px;color:var(--color-text-secondary)">
              เลขที่: <strong>{{ paymentStatusTx?.refNo ?? '-' }}</strong>
            </div>
            <div style="font-size:13px;color:var(--color-text-secondary)">
              ยืนยันเปลี่ยนสถานะเป็น <strong style="color:#34C759">success</strong>?
            </div>
            <div v-if="paymentStatusError" style="font-size:12px;color:var(--color-danger,#CC3333)">{{ paymentStatusError }}</div>
          </div>
          <div class="txd-footer" style="gap:10px">
            <button class="txd-pill-btn" style="background:#E5E5EA;color:#3C3C43" @click="showPaymentStatus=false">ยกเลิก</button>
            <button
              class="txd-pill-btn"
              :disabled="paymentStatusLoading"
              @click="confirmPaymentStatus"
            >{{ paymentStatusLoading ? 'กำลังดำเนินการ...' : 'ยืนยัน' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Detail Modal -->
  <Teleport to="body">
    <Transition name="txd-fade">
      <div v-if="showDetail" class="txd-overlay" @click.self="showDetail=false">
        <div class="txd-modal">

          <!-- Header -->
          <div class="txd-header">รายละเอียดคำสั่งซื้อ</div>

          <!-- Loading -->
          <div v-if="detailLoading" style="padding:48px;text-align:center;font-size:13px;color:var(--color-text-tertiary)">
            กำลังโหลด...
          </div>

          <template v-else-if="detailTx">
            <div class="txd-body">

              <!-- Info rows -->
              <div class="txd-info-rows">
                <div class="txd-plain-row">
                  <span class="txd-plain-key">เลขที่ทำรายการ</span>
                  <span class="txd-plain-sep">:</span>
                  <span class="txd-plain-val">{{ detailTx.refNo ?? '-' }}</span>
                </div>
                <div class="txd-plain-row">
                  <span class="txd-plain-key">วันที่ทำรายการ</span>
                  <span class="txd-plain-sep">:</span>
                  <span class="txd-plain-val">{{ fmtDateDetail(detailTx.createdAt) }}</span>
                </div>
                <div class="txd-plain-row">
                  <span class="txd-plain-key">สถานะคำสั่งซื้อ</span>
                  <span class="txd-plain-sep">:</span>
                  <span class="txd-plain-val" :style="{ color: orderStatusColor(detailTx), fontWeight: 500 }">{{ orderStatusLabel(detailTx) }}</span>
                </div>
                <template v-if="detailTx.walletId?.userId">
                  <div class="txd-plain-row">
                    <span class="txd-plain-key">เลขประจำตัว</span>
                    <span class="txd-plain-sep">:</span>
                    <span class="txd-plain-val">{{ detailTx.walletId.userId.uid ?? '-' }}</span>
                  </div>
                  <div class="txd-plain-row">
                    <span class="txd-plain-key">ชื่อ-นามสกุล</span>
                    <span class="txd-plain-sep">:</span>
                    <span class="txd-plain-val">{{ [detailTx.walletId.userId.firstName, detailTx.walletId.userId.lastName].filter(Boolean).join(' ') || '-' }}</span>
                  </div>
                </template>
                <div v-if="detailTx.note" class="txd-plain-row">
                  <span class="txd-plain-key txd-key-bold">หมายเหตุ</span>
                  <span class="txd-plain-sep">:</span>
                  <span class="txd-plain-val">{{ detailTx.note }}</span>
                </div>
              </div>

              <!-- Items (if order exists) -->
              <template v-if="detailTx.relatedOrderId?.items?.length">
                <div class="txd-divider-line" />

                <div class="txd-items-wrap">
                  <div class="txd-items-hdr">
                    <span>รายการ</span>
                    <span class="txd-col-center">จำนวน</span>
                    <span class="txd-col-right">ราคา/หน่วย</span>
                    <span class="txd-col-right">ราคา</span>
                  </div>
                  <div v-for="(item, idx) in detailTx.relatedOrderId.items" :key="idx">
                    <div class="txd-item-line">
                      <span>{{ idx + 1 }}. {{ item.menuItemId?.name ?? '-' }}</span>
                      <span class="txd-col-center">{{ item.qty }}</span>
                      <span class="txd-col-right">{{ (item.unitPrice ?? 0).toFixed(2) }}</span>
                      <span class="txd-col-right">{{ (item.lineTotal ?? 0).toFixed(2) }}</span>
                    </div>
                    <div v-if="item.note" class="txd-item-addon">- {{ item.note }}</div>
                  </div>
                </div>

                <div class="txd-divider-line" />

                <div class="txd-summary-rows">
                  <div class="txd-sum-row">
                    <span>Service Charge 0 %</span><span>0.00</span>
                  </div>
                  <div class="txd-sum-row txd-sum-discount">
                    <span>ส่วนลด</span><span>0</span>
                  </div>
                  <div class="txd-sum-row">
                    <span>VAT 7 %</span><span>0.00</span>
                  </div>
                  <div class="txd-sum-row txd-sum-total">
                    <span>รวม</span>
                    <span>{{ (detailTx.relatedOrderId.totalAmount ?? Math.abs(detailTx.amount ?? 0)).toFixed(2) }}</span>
                  </div>
                </div>
              </template>

              <!-- Fallback: topup / no order -->
              <template v-else>
                <div class="txd-divider-line" />
                <div class="txd-sum-row txd-sum-total">
                  <span>ยอดรวม</span>
                  <span>{{ Math.abs(detailTx.amount ?? 0).toFixed(2) }}</span>
                </div>
              </template>

            </div>

            <div class="txd-footer">
              <button class="txd-pill-btn" @click="showDetail=false">ปิด</button>
            </div>
          </template>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PhGear, PhEye, PhCreditCard, PhReceipt, PhProhibit } from '@phosphor-icons/vue'
import api from '@/api/axios'

const router = useRouter()

// ── Cancel reasons (shared shortcut list from "เหตุผลการยกเลิก") ───────────────

interface CancelReasonOption {
  id: string
  label: string
  isDefault: boolean
}

const cancelReasons = ref<CancelReasonOption[]>([])

async function fetchCancelReasons() {
  try {
    const { data } = await api.get('/booking/cancel-reasons', { params: { activeOnly: true } })
    cancelReasons.value = data.reasons ?? []
  } catch {
    cancelReasons.value = []
  }
}

const loading        = ref(false)
const txns           = ref<any[]>([])
const activeDropdown = ref<string | null>(null)
const currentPage    = ref(1)
const pageSize       = ref(10)

// Detail modal
const showDetail    = ref(false)
const detailTx      = ref<any>(null)
const detailLoading = ref(false)

// Void modal
const showVoid   = ref(false)
const voidTx     = ref<any>(null)
const voidLoading = ref(false)
const voidError  = ref('')
const voidForm   = ref({ reason: '', supervisorCode: '' })

// Payment-status modal
const showPaymentStatus    = ref(false)
const paymentStatusTx      = ref<any>(null)
const paymentStatusLoading = ref(false)
const paymentStatusError   = ref('')

const filter = ref({ date: '', status: '', paymentMethod: '', txType: '' })

const filteredTxns = computed(() => {
  let list = (txns.value as any[]).filter(tx => tx.type === 'topup' || tx.type === 'purchase')
  if (filter.value.status) {
    list = list.filter(tx => resolveOrderStatus(tx) === filter.value.status)
  }
  if (filter.value.txType === 'topup') {
    list = list.filter(tx => tx.type === 'topup')
  } else if (filter.value.txType === 'paid') {
    list = list.filter(tx => tx.type !== 'topup')
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTxns.value.length / pageSize.value)))
const paginated  = computed(() =>
  filteredTxns.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
)

function fmtDate(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

function fmtDateDetail(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function txTypeInfo(tx: any): { label: string; cls: string } {
  if (tx.type === 'topup') return { label: 'Topup', cls: 'adm-badge-success' }
  return { label: 'Paid', cls: 'adm-badge-pending' }
}

function paymentLabel(m: string): string {
  const map: Record<string, string> = {
    cash:         'เงินสด',
    wallet:       'Wallet',
    promptpay:    'พร้อมเพย์',
    qr_promptpay: 'พร้อมเพย์',
    card_wallet:  'Card/Wallet',
    scb_qr:       'SCB QR',
    maemoney:     'แม่มณี',
    credit_debit: 'เครดิต/เดบิต',
  }
  return map[m] ?? m
}

// map legacy order statuses → new 4-state model
const legacyStatusMap: Record<string, string> = {
  confirmed: 'complete',
  redeemed:  'complete',
  cancelled: 'void',
}

const orderStatusTH: Record<string, string> = {
  select_payment: 'Select Payment',
  wait_payment:   'Wait Payment',
  complete:       'Complete',
  void:           'Void',
  failed:         'Failed',
}

// map tx.status → order status when no relatedOrderId
const txStatusFallback: Record<string, string> = {
  success: 'complete',
  voided:  'void',
  wait:    'wait_payment',
  pending: 'select_payment',
  failed:  'failed',
}

function resolveOrderStatus(tx: any): string {
  const raw = tx.relatedOrderId?.status ?? tx.paymentStatus
  if (raw) return legacyStatusMap[raw] ?? raw
  return txStatusFallback[tx.status] ?? ''
}

function orderStatusLabel(tx: any): string {
  const s = resolveOrderStatus(tx)
  return orderStatusTH[s] ?? s ?? '-'
}

function orderStatusColor(tx: any): string {
  const s = resolveOrderStatus(tx)
  const map: Record<string, string> = {
    complete:       '#34C759',
    wait_payment:   '#007AFF',
    select_payment: '#FF9500',
    void:           '#FF3B30',
    failed:         '#FF3B30',
  }
  return map[s] ?? 'var(--color-text-primary)'
}

function orderStatusClass(tx: any): string {
  const s = resolveOrderStatus(tx)
  const map: Record<string, string> = {
    complete:       'adm-badge-success',
    wait_payment:   'adm-badge-info',
    select_payment: 'adm-badge-pending',
    void:           'adm-badge-failed',
    failed:         'adm-badge-failed',
  }
  return map[s] ?? 'adm-badge-voided'
}

function txStatusClass(s: string): string {
  const map: Record<string, string> = {
    success: 'adm-badge-success',
    pending: 'adm-badge-pending',
    wait:    'adm-badge-pending',
    failed:  'adm-badge-failed',
    voided:  'adm-badge-voided',
  }
  return map[s] ?? 'adm-badge-voided'
}

function toggleDropdown(id: string) {
  activeDropdown.value = activeDropdown.value === id ? null : id
}

async function onAction(action: string, tx: any) {
  activeDropdown.value = null
  if (action === 'tax-invoice') {
    router.push(`/admin/transactions/${tx._id}/tax-invoice`)
    return
  }
  if (action === 'detail') {
    showDetail.value    = true
    detailLoading.value = true
    detailTx.value      = null
    try {
      const { data } = await api.get(`/admin/transactions/${tx._id}`)
      detailTx.value = data.transaction
    } catch {
      detailTx.value = tx
    } finally {
      detailLoading.value = false
    }
    return
  }
  if (action === 'void') {
    voidTx.value            = tx
    voidForm.value          = { reason: '', supervisorCode: '' }
    voidError.value         = ''
    showVoid.value          = true
    return
  }
  if (action === 'payment-status') {
    paymentStatusTx.value    = tx
    paymentStatusError.value = ''
    showPaymentStatus.value  = true
    return
  }
}

async function confirmVoid() {
  if (!voidTx.value || voidLoading.value) return
  if (!voidForm.value.reason || !voidForm.value.supervisorCode) return
  voidLoading.value = true
  voidError.value   = ''
  try {
    await api.post(`/admin/transactions/${voidTx.value._id}/void`, {
      reason:         voidForm.value.reason,
      supervisorCode: voidForm.value.supervisorCode,
    })
    showVoid.value = false
    await fetchTxns()
  } catch (err: any) {
    voidError.value = err?.response?.data?.message ?? 'ยกเลิกรายการไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    voidLoading.value = false
  }
}

async function confirmPaymentStatus() {
  if (!paymentStatusTx.value || paymentStatusLoading.value) return
  paymentStatusLoading.value = true
  paymentStatusError.value   = ''
  try {
    await api.patch(`/admin/transactions/${paymentStatusTx.value._id}/payment-status`, { status: 'success' })
    showPaymentStatus.value = false
    await fetchTxns()
  } catch (err: any) {
    paymentStatusError.value = err?.response?.data?.message ?? 'เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    paymentStatusLoading.value = false
  }
}

async function fetchTxns() {
  loading.value  = true
  currentPage.value = 1
  try {
    const params: Record<string, string> = {}
    if (filter.value.date)          params.date          = filter.value.date
    if (filter.value.paymentMethod) params.paymentMethod = filter.value.paymentMethod
    const { data } = await api.get('/admin/transactions', { params })
    txns.value = data.transactions ?? []
  } catch {
    txns.value = []
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filter.value = { date: '', status: '', paymentMethod: '', txType: '' }
  fetchTxns()
}

onMounted(() => {
  fetchTxns()
  fetchCancelReasons()
})
</script>

<style scoped>
.txn-field { display:flex;flex-direction:column;gap:6px; }
.txn-label { font-size:12px;color:var(--color-text-secondary); }
.txn-input {
  height:42px;padding:0 12px;border-radius:8px;border:1.5px solid #D0D0D0;
  font-size:14px;color:var(--color-text-primary);outline:none;
  font-family:inherit;background:#fff;transition:border-color 0.15s;
  min-width:160px;box-sizing:border-box;
}
.txn-input:focus { border-color:var(--color-primary); }

.txn-reason-chips { display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px; }
.txn-reason-chip {
  padding:8px 14px;border-radius:100px;
  border:1px solid var(--color-border-tertiary);background:#fff;
  color:var(--color-text-secondary);font-size:13px;font-family:inherit;cursor:pointer;
  transition:background 0.15s, border-color 0.15s, color 0.15s;
}
.txn-reason-chip:hover { background:var(--color-bg-secondary); }
.txn-reason-chip-active { border-color:var(--color-danger);background:var(--color-danger-bg);color:var(--color-danger); }

.txn-gear-btn {
  width:32px;height:32px;border-radius:8px;border:1.5px solid #E5E7EB;
  background:#fff;display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--color-primary);transition:background 0.15s,border-color 0.15s;
}
.txn-gear-btn:hover,
.txn-gear-btn--active { background:#EEF3FF;border-color:var(--color-primary); }

.txn-dropdown {
  position:absolute;right:0;top:calc(100% + 4px);z-index:100;
  background:#fff;border:1px solid #E5E7EB;border-radius:10px;
  box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:210px;padding:4px;
}
.txn-dd-item {
  display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;
  border:none;background:transparent;border-radius:6px;
  font-size:13px;color:var(--color-text-primary);cursor:pointer;
  text-align:left;font-family:inherit;transition:background 0.12s;
}
.txn-dd-item:hover:not(:disabled) { background:#F5F5F7; }
.txn-dd-item:disabled { color:var(--color-text-tertiary);cursor:not-allowed;opacity:0.5; }
.txn-dd-item--danger { color:#FF5252; }
.txn-dd-item--danger:hover { background:#FFF1F0; }
.txn-dd-divider { height:1px;background:#F0F0F4;margin:4px 0; }

.txn-spinner { width:24px;height:24px;border:3px solid #E5E7EB;border-top-color:var(--color-primary);border-radius:50%;animation:txn-spin 0.7s linear infinite; }
@keyframes txn-spin { to { transform:rotate(360deg); } }

.dd-enter-active,.dd-leave-active { transition:opacity 0.15s,transform 0.15s; }
.dd-enter-from,.dd-leave-to { opacity:0;transform:translateY(-4px); }

/* Detail Modal */
.txd-overlay { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:16px; }
.txd-modal { background:#fff;border-radius:16px;width:500px;max-width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.16); }
.txd-header { padding:20px 24px 16px;font-size:18px;font-weight:600;text-align:center;color:var(--color-text-primary);border-bottom:1px solid #F0F0F4;flex-shrink:0; }
.txd-body { flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column; }
.txd-footer { padding:16px 24px;display:flex;justify-content:flex-end;flex-shrink:0; }

/* Info rows */
.txd-info-rows { display:flex;flex-direction:column;gap:10px;margin-bottom:4px; }
.txd-plain-row { display:grid;grid-template-columns:140px 14px 1fr;align-items:baseline;font-size:14px;line-height:1.6; }
.txd-plain-key { color:var(--color-text-primary); }
.txd-key-bold { font-weight:700; }
.txd-plain-sep { color:var(--color-text-primary);text-align:center; }
.txd-plain-val { color:var(--color-text-primary);word-break:break-word; }

/* Divider */
.txd-divider-line { border:none;border-top:1px solid #E5E7EB;margin:14px 0; }

/* Items table */
.txd-items-wrap { display:flex;flex-direction:column; }
.txd-items-hdr { display:grid;grid-template-columns:1fr 56px 80px 80px;padding:4px 0 8px;font-size:14px;font-weight:600;color:var(--color-text-primary);border-bottom:1px solid #E5E7EB;margin-bottom:4px; }
.txd-item-line { display:grid;grid-template-columns:1fr 56px 80px 80px;padding:6px 0;font-size:14px;color:var(--color-text-primary); }
.txd-item-addon { font-size:12px;color:var(--color-text-secondary);padding:0 0 4px 16px; }
.txd-col-center { text-align:center; }
.txd-col-right { text-align:right; }

/* Summary */
.txd-summary-rows { display:flex;flex-direction:column;gap:9px; }
.txd-sum-row { display:flex;justify-content:space-between;font-size:14px;color:var(--color-text-primary); }
.txd-sum-discount { color:#FF3B30; }
.txd-sum-total { font-weight:700;font-size:15px; }

/* Close button */
.txd-pill-btn { background:var(--color-primary);color:#fff;border:none;border-radius:50px;padding:10px 32px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity 0.15s; }
.txd-pill-btn:hover { opacity:0.88; }

.txd-fade-enter-active,.txd-fade-leave-active { transition:opacity 0.2s; }
.txd-fade-enter-from,.txd-fade-leave-to { opacity:0; }
</style>
