import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  PhCurrencyCircleDollar, PhReceipt, PhCreditCard, PhBowlFood,
} from '@phosphor-icons/vue'

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

export const useWalletsStore = defineStore('wallets', () => {
  const wallets = ref<WalletItem[]>([
    { id:'W001', name:'กระเป๋าหลัก (เติมเงิน)',      desc:'เติมเงินเข้าระบบ',                    amount:500, enabled:true,  startDate:'2024-01-01', endDate:'', icon: PhCurrencyCircleDollar },
    { id:'W002', name:'ชำระค่าอาหาร',                desc:'ชำระผ่าน POS/Kiosk',                  amount:200, enabled:false, startDate:'', endDate:'', icon: PhReceipt                 },
    { id:'W003', name:'Pre-order',                   desc:'สั่งอาหารล่วงหน้า',                    amount:100, enabled:false, startDate:'', endDate:'', icon: PhCreditCard              },
    { id:'W004', name:'Buffet (Primary ฿170)',        desc:'K1–P6 · ฿170/รอบ (ตาม spec 2026)',    amount:170, enabled:false, startDate:'', endDate:'', icon: PhBowlFood                },
    { id:'W005', name:'Buffet (Secondary ฿150)',      desc:'S1–S6 · ฿150/รอบ (ตาม spec 2026)',    amount:150, enabled:false, startDate:'', endDate:'', icon: PhBowlFood                },
  ])

  return { wallets }
})
