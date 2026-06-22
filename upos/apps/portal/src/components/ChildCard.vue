<template>
  <div class="child-card" :style="cardStyle">
    <!-- Decorative circles -->
    <div class="deco deco-lg" />
    <div class="deco deco-md" />

    <!-- Avatar -->
    <div class="avatar">
      <PhUser :size="30" weight="fill" color="white" />
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Name row -->
      <div class="mb-2">
        <h3 class="name">{{ name }}</h3>
        <p class="sub">{{ subLabel }}</p>
      </div>

      <!-- Balance label + value -->
      <p class="bal-label">{{ locale.t('ยอดเงินคงเหลือ (บาท)', 'Balance (THB)') }}</p>
      <p class="bal-value">{{ formattedBalance }}</p>

      <!-- Footer: uid + updated -->
      <div class="footer">
        <div class="uid-row">
          <span class="uid">{{ studentCode }}</span>
          <span v-if="updatedAt" class="updated">
            <PhArrowsClockwise :size="10" weight="bold" />
            Updated at {{ formattedTime }}
          </span>
        </div>
        <span class="role-badge">{{ roleLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PhArrowsClockwise, PhUser } from '@phosphor-icons/vue'
import { useLocaleStore } from '@/stores/locale'

const locale = useLocaleStore()

const props = defineProps<{
  name:        string
  studentCode: string
  role?:       string
  balance?:    number
  grade?:      string
  updatedAt?:  string | Date
}>()

const GRADIENTS: Record<string, [string, string]> = {
  student:    ['#1264E3', '#0A4BAD'],
  teacher:    ['#03BA81', '#028A60'],
  staff:      ['#FF9800', '#C67100'],
  cashier:    ['#FF9800', '#C67100'],
  visitor:    ['#7E8C9A', '#566069'],
}

const ROLE_LABELS_TH: Record<string, string> = {
  student: 'นักเรียน',
  teacher: 'ครู',
  staff:   'เจ้าหน้าที่',
  cashier: 'แคชเชียร์',
  visitor: 'บุคคลภายนอก',
}
const ROLE_LABELS_EN: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  staff:   'Staff',
  cashier: 'Cashier',
  visitor: 'Visitor',
}

const [c1, c2] = GRADIENTS[props.role ?? 'student'] ?? ['#1264E3', '#0A4BAD']

const cardStyle = computed(() => ({
  background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
}))

const nameInitial = computed(() => (props.name ?? '').charAt(0).toUpperCase() || '?')

const subLabel = computed(() => {
  const parts: string[] = []
  if (props.grade) parts.push(props.grade)
  return parts.join(' - ') || (props.role === 'teacher' ? locale.t('ครู', 'Teacher') : '')
})

const roleLabel = computed(() => {
  const key = props.role ?? 'student'
  return locale.lang === 'th'
    ? (ROLE_LABELS_TH[key] ?? props.role ?? '')
    : (ROLE_LABELS_EN[key] ?? props.role ?? '')
})

const formattedBalance = computed(() => {
  if (props.balance === undefined) return '฿0.00'
  return `฿${props.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
})

const formattedTime = computed(() => {
  if (!props.updatedAt) return ''
  const d = props.updatedAt instanceof Date ? props.updatedAt : new Date(props.updatedAt)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
})
</script>

<style scoped>
.child-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  padding: 16px 18px 14px;
  min-height: 148px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.20);
  flex-shrink: 0;
  user-select: none;
}

/* Decorative circles */
.deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.10);
  pointer-events: none;
}
.deco-lg { width: 130px; height: 130px; top: -30px; right: -20px; }
.deco-md { width: 72px;  height: 72px;  bottom: -10px; right: 60px; background: rgba(255,255,255,0.07); }

/* Avatar */
.avatar {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  overflow: hidden;
}

/* Content */
.content {
  position: relative;
  z-index: 1;
  padding-right: 52px;
}

.name {
  font-size: 18px;        /* heading-lg */
  font-weight: 500;
  color: #ffffff;
  line-height: 1.4;
}
.sub {
  font-size: 13px;        /* body-sm */
  font-weight: 400;
  color: rgba(255,255,255,0.75);
  margin-top: 1px;
}

.bal-label {
  font-size: 11px;        /* caption */
  font-weight: 400;
  color: rgba(255,255,255,0.65);
  margin-top: 8px;
}
.bal-value {
  font-size: 22px;        /* heading-xl — stat card value per design system */
  font-weight: 500;
  color: #ffffff;
  line-height: 1.3;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 10px;
}
.uid-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.uid {
  font-size: 12px;        /* code scale: 12px mono */
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 400;
  color: rgba(255,255,255,0.75);
  letter-spacing: 0.4px;
}
.updated {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;        /* caption */
  font-weight: 400;
  color: rgba(255,255,255,0.55);
}
.role-badge {
  font-size: 12px;        /* label */
  font-weight: 500;
  padding: 3px 10px;      /* badge padding per design system */
  border-radius: 20px;
  background: rgba(255,255,255,0.18);
  color: #ffffff;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
