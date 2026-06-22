<template>
  <div class="user-profile-card" :style="cardStyle">
    <!-- Decorative circles -->
    <div class="deco-circle deco-lg" />
    <div class="deco-circle deco-sm" />

    <!-- Avatar initial -->
    <div class="avatar-circle">
      <span>{{ nameInitial }}</span>
    </div>

    <!-- Content -->
    <div class="card-content">
      <!-- Name + sub -->
      <div class="mb-3">
        <h2 class="card-name">{{ name }}</h2>
        <p v-if="subLabel" class="card-sub">{{ subLabel }}</p>
      </div>

      <!-- Balance -->
      <div v-if="balance !== undefined" class="mb-3">
        <p class="balance-label">ยอดเงินคงเหลือ (บาท)</p>
        <p class="balance-value">{{ formattedBalance }}</p>
        <p v-if="isLow" class="low-badge">
          <PhWarningCircle :size="12" weight="fill" />
          ยอดเงินน้อย
        </p>
      </div>

      <!-- Footer row: uid + role badge + updated -->
      <div class="card-footer">
        <div>
          <p class="card-uid">{{ uid }}</p>
          <p v-if="updatedAt" class="card-updated">
            <PhArrowsClockwise :size="11" weight="bold" />
            อัปเดต {{ formattedTime }}
          </p>
        </div>
        <span class="role-badge" :style="roleBadgeStyle">{{ roleLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PhWarningCircle, PhArrowsClockwise } from '@phosphor-icons/vue'

const props = defineProps<{
  name:      string
  uid:       string
  role:      string
  balance?:  number
  grade?:    string
  updatedAt?: string | Date
  compact?:  boolean
}>()

// ── Gradient by role ────────────────────────────────────────────────────────
const GRADIENTS: Record<string, [string, string]> = {
  student:    ['#1264E3', '#0A4BAD'],
  teacher:    ['#03BA81', '#028A60'],
  staff:      ['#FF9800', '#C67100'],
  cashier:    ['#FF9800', '#C67100'],
  visitor:    ['#7E8C9A', '#566069'],
  supervisor: ['#FF5252', '#CC3333'],
  admin:      ['#FF5252', '#CC3333'],
}

const ROLE_LABELS: Record<string, string> = {
  student:    'นักเรียน',
  teacher:    'ครู',
  staff:      'เจ้าหน้าที่',
  cashier:    'แคชเชียร์',
  visitor:    'บุคคลภายนอก',
  supervisor: 'Supervisor',
  admin:      'Admin',
}

const [c1, c2] = GRADIENTS[props.role] ?? ['#1264E3', '#0A4BAD']

const cardStyle = computed(() => ({
  background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
}))

const roleBadgeStyle = computed(() => ({
  background: 'rgba(255,255,255,0.18)',
  color:      '#ffffff',
}))

const nameInitial = computed(() =>
  (props.name ?? '').charAt(0).toUpperCase() || '?'
)

const subLabel = computed(() => {
  if (props.role === 'student' && props.grade) {
    return props.grade
  }
  if (props.role === 'teacher') return 'ครู / Teacher'
  if (props.role === 'staff' || props.role === 'cashier') return 'Staff'
  if (props.role === 'visitor') return 'Visitor'
  return ''
})

const roleLabel = computed(() => ROLE_LABELS[props.role] ?? props.role)

const formattedBalance = computed(() => {
  if (props.balance === undefined) return '-'
  return `฿${props.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
})

const isLow = computed(() => (props.balance ?? 0) < 200)

const formattedTime = computed(() => {
  if (!props.updatedAt) return ''
  const d = props.updatedAt instanceof Date ? props.updatedAt : new Date(props.updatedAt)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
})
</script>

<style scoped>
.user-profile-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  padding: 20px;
  min-height: 168px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.22);
}

/* Decorative circles */
.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.10);
  pointer-events: none;
}
.deco-lg {
  width: 160px;
  height: 160px;
  top: -40px;
  right: -30px;
}
.deco-sm {
  width: 90px;
  height: 90px;
  bottom: -20px;
  right: 50px;
  background: rgba(255,255,255,0.07);
}

/* Avatar */
.avatar-circle {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255,255,255,0.20);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  z-index: 1;
}

/* Content */
.card-content { position: relative; z-index: 1; padding-right: 64px; }

.card-name {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
}
.card-sub {
  font-size: 13px;
  color: rgba(255,255,255,0.75);
  margin-top: 2px;
}

.balance-label {
  font-size: 11px;
  color: rgba(255,255,255,0.70);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.balance-value {
  font-size: 32px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.1;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}
.low-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #ffffff;
  background: rgba(255,255,255,0.20);
  padding: 2px 8px;
  border-radius: 20px;
}

.card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 12px;
}
.card-uid {
  font-size: 12px;
  font-family: 'IBM Plex Mono', monospace;
  color: rgba(255,255,255,0.80);
  font-weight: 500;
  letter-spacing: 0.5px;
}
.card-updated {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: rgba(255,255,255,0.60);
  margin-top: 2px;
}
.role-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
