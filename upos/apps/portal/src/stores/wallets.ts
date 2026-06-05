import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  PhCurrencyCircleDollar, PhReceipt, PhCreditCard, PhBowlFood,
} from '@phosphor-icons/vue'
import {
  listWalletPermissions,
  upsertWalletPermission,
} from '@/api/settings'
import type { WalletPermission } from '@/api/types'

export interface WalletItem {
  id:        string
  name:      string
  desc:      string
  amount:    number
  enabled:   boolean
  startDate: string
  endDate:   string
  icon:      any
}

// Client-side only: maps wallet code → Phosphor icon component
const iconMap: Record<string, any> = {
  W001: PhCurrencyCircleDollar,
  W002: PhReceipt,
  W003: PhCreditCard,
  W004: PhBowlFood,
  W005: PhBowlFood,
}
const defaultIcon = PhCurrencyCircleDollar

function toWalletItem(p: WalletPermission): WalletItem {
  return {
    id:        p.id,
    name:      p.name,
    desc:      p.desc,
    amount:    p.amount,
    enabled:   p.enabled,
    startDate: p.startDate,
    endDate:   p.endDate,
    icon:      iconMap[p.id] ?? defaultIcon,
  }
}

export const useWalletsStore = defineStore('wallets', () => {
  const wallets = ref<WalletItem[]>([])

  async function load(): Promise<void> {
    const permissions = await listWalletPermissions()
    wallets.value = permissions.map(toWalletItem)
  }

  async function save(item: WalletItem): Promise<void> {
    const payload: Partial<WalletPermission> = {
      name:      item.name,
      desc:      item.desc,
      amount:    item.amount,
      enabled:   item.enabled,
      startDate: item.startDate,
      endDate:   item.endDate,
    }
    const updated = await upsertWalletPermission(item.id, payload)
    const idx = wallets.value.findIndex(w => w.id === item.id)
    if (idx !== -1) {
      wallets.value[idx] = toWalletItem(updated)
    }
  }

  return { wallets, load, save }
})
