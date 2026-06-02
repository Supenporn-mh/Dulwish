import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Lang = 'th' | 'en'

export const useLocaleStore = defineStore('locale', () => {
  const lang = ref<Lang>(
    (localStorage.getItem('upos_lang') as Lang) ?? 'th'
  )

  function toggle() {
    lang.value = lang.value === 'th' ? 'en' : 'th'
    localStorage.setItem('upos_lang', lang.value)
  }

  function t(th: string, en: string): string {
    return lang.value === 'th' ? th : en
  }

  return { lang, toggle, t }
})
