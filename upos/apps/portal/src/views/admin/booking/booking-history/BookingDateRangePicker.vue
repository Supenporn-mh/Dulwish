<template>
  <div style="position:relative" @click.stop>
    <button class="drp-trigger" @click="toggleOpen">
      <PhCalendarBlank :size="14" style="flex-shrink:0" />
      <span :style="!from && !to ? 'color:var(--color-text-tertiary)' : ''">{{ label }}</span>
    </button>

    <Transition name="bh-dd">
      <div v-if="open" class="drp-popover">
        <div class="drp-header">
          <button class="drp-nav-btn" @click="prevMonth"><PhCaretLeft :size="13" weight="bold" /></button>
          <span class="drp-month-label">{{ MONTHS_FULL[viewMonth] }} {{ viewYear }}</span>
          <button class="drp-nav-btn" @click="nextMonth"><PhCaretRight :size="13" weight="bold" /></button>
        </div>

        <div class="drp-weekdays">
          <span v-for="w in WEEKDAYS" :key="w">{{ w }}</span>
        </div>

        <div class="drp-grid">
          <button
            v-for="(cell, i) in cells" :key="i"
            type="button"
            class="drp-day"
            :disabled="!cell.dateStr"
            :class="{
              'drp-day-empty':  !cell.dateStr,
              'drp-day-today':  cell.dateStr === todayStr,
              'drp-day-start':  cell.dateStr && cell.dateStr === draftFrom,
              'drp-day-end':    cell.dateStr && cell.dateStr === draftTo,
              'drp-day-inrange': cell.dateStr && isInRange(cell.dateStr),
            }"
            @click="cell.dateStr && selectDay(cell.dateStr)"
          >{{ cell.day }}</button>
        </div>

        <div class="drp-footer">
          <span class="drp-hint">{{ hint }}</span>
          <button class="drp-clear-btn" @click="clear">ล้าง</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PhCalendarBlank, PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'

const props = defineProps<{ from: string; to: string }>()
const emit = defineEmits<{ 'update:from': [string]; 'update:to': [string] }>()

const MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const pad2 = (n: number) => String(n).padStart(2, '0')

const today = new Date()
const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`

const open = ref(false)
const draftFrom = ref('')
const draftTo = ref('')
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

function fmtShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`
}

const label = computed(() => {
  if (props.from && props.to) return `${fmtShort(props.from)} – ${fmtShort(props.to)}`
  if (props.from) return `${fmtShort(props.from)} – ...`
  return 'เลือกช่วงวันที่'
})

const hint = computed(() => {
  if (draftFrom.value && !draftTo.value) return 'เลือกวันสิ้นสุด'
  return 'เลือกวันเริ่มต้น'
})

function toggleOpen() {
  if (!open.value) {
    draftFrom.value = props.from
    draftTo.value = props.to
    const anchor = props.from ? new Date(props.from) : today
    viewYear.value = anchor.getFullYear()
    viewMonth.value = anchor.getMonth()
  }
  open.value = !open.value
}

function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}
function nextMonth() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

interface Cell { day: number | null; dateStr: string | null }
const cells = computed<Cell[]>(() => {
  const y = viewYear.value, m = viewMonth.value
  const firstWeekday = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const list: Cell[] = []
  for (let i = 0; i < firstWeekday; i++) list.push({ day: null, dateStr: null })
  for (let d = 1; d <= daysInMonth; d++) list.push({ day: d, dateStr: `${y}-${pad2(m + 1)}-${pad2(d)}` })
  while (list.length % 7 !== 0) list.push({ day: null, dateStr: null })
  return list
})

function isInRange(dateStr: string): boolean {
  return !!draftFrom.value && !!draftTo.value && dateStr > draftFrom.value && dateStr < draftTo.value
}

function selectDay(dateStr: string) {
  if (!draftFrom.value || draftTo.value) {
    draftFrom.value = dateStr
    draftTo.value = ''
    return
  }
  if (dateStr < draftFrom.value) {
    draftTo.value = draftFrom.value
    draftFrom.value = dateStr
  } else {
    draftTo.value = dateStr
  }
  emit('update:from', draftFrom.value)
  emit('update:to', draftTo.value)
  open.value = false
}

function clear() {
  draftFrom.value = ''
  draftTo.value = ''
  emit('update:from', '')
  emit('update:to', '')
  open.value = false
}
</script>

<style scoped>
.drp-trigger {
  display: flex; align-items: center; gap: 8px;
  height: 36px; padding: 0 12px; border-radius: 8px;
  border: 1px solid var(--color-border-tertiary); background: #fff;
  color: var(--color-text-primary); font-size: 13px; font-family: inherit;
  cursor: pointer; white-space: nowrap;
}
.drp-trigger:hover { background: var(--color-bg-secondary); }

.drp-popover {
  position: absolute; left: 0; top: calc(100% + 4px); z-index: 100;
  background: #fff; border: 1px solid #E5E7EB; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12); padding: 12px; width: 280px;
}

.drp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.drp-month-label { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
.drp-nav-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--color-border-tertiary);
  background: #fff; color: var(--color-text-secondary); cursor: pointer;
}
.drp-nav-btn:hover { background: var(--color-bg-secondary); }

.drp-weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr);
  font-size: 11px; color: var(--color-text-tertiary); text-align: center; margin-bottom: 4px;
}

.drp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.drp-day {
  height: 30px; border: none; background: transparent; border-radius: 6px;
  font-size: 12px; font-family: inherit; color: var(--color-text-primary); cursor: pointer;
}
.drp-day:hover:not(:disabled) { background: var(--color-bg-secondary); }
.drp-day-empty { visibility: hidden; cursor: default; }
.drp-day-today { box-shadow: inset 0 0 0 1px var(--color-border-tertiary); }
.drp-day-inrange { background: var(--color-primary-tint); border-radius: 0; }
.drp-day-start, .drp-day-end {
  background: var(--color-primary); color: #fff; font-weight: 500;
}

.drp-footer {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-border-tertiary);
}
.drp-hint { font-size: 11px; color: var(--color-text-tertiary); }
.drp-clear-btn {
  font-size: 12px; color: var(--color-text-secondary); background: transparent;
  border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; font-family: inherit;
}
.drp-clear-btn:hover { background: var(--color-bg-secondary); }

.bh-dd-enter-active, .bh-dd-leave-active { transition: opacity 0.15s, transform 0.15s; }
.bh-dd-enter-from, .bh-dd-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
