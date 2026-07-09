<template>
  <div class="branding-view">
    <div>
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">ตั้งค่าการแสดงผล</h2>
      <p style="font-size:13px;color:var(--color-text-secondary);margin-top:3px">กำหนดโลโก้และรูปภาพหน้าปกที่แสดงในหน้า Login</p>
    </div>

    <div v-if="error" style="padding:12px 16px;border-radius:8px;background:var(--color-danger-bg);border:1px solid #FFCDD2;font-size:13px;color:var(--color-danger)">
      {{ error }}
    </div>

    <!-- Card 1: รูปภาพหน้าปก -->
    <div class="brand-card">
      <p class="brand-card-title">รูปภาพหน้าปก</p>
      <p class="brand-card-sub">รูปพื้นหลังฝั่งซ้ายของหน้า Login</p>

      <div class="brand-cover-grid">
        <!-- Preview -->
        <div>
          <div
            class="brand-cover-preview"
            :style="form.coverImageUrl
              ? { backgroundImage: `url(${form.coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : {}"
          >
            <span class="brand-badge-preview">PREVIEW</span>
            <button type="button" class="brand-btn-change" @click="coverInput?.click()">
              <PhCamera :size="13" /> เปลี่ยน
            </button>
            <div class="brand-preview-content">
              <div class="brand-shield-circle">
                <PhShieldCheck :size="24" weight="regular" color="#fff" />
              </div>
              <div class="brand-preview-name">Dulwich College Bangkok</div>
              <div class="brand-preview-tagline">Canteen Cashless System</div>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:8px">
            <button type="button" class="brand-btn-danger-sm" :disabled="!form.coverImageUrl" @click="form.coverImageUrl = ''">
              <PhTrash :size="12" /> ลบรูป
            </button>
          </div>
        </div>

        <!-- Upload + spec -->
        <div style="display:flex;flex-direction:column;gap:12px">
          <div
            class="brand-dropzone"
            style="height:180px"
            @dragover.prevent
            @drop.prevent="onDrop($event, 'cover')"
            @click="coverInput?.click()"
          >
            <PhCloudArrowUp :size="24" style="color:var(--color-text-tertiary)" />
            <p class="brand-dropzone-label">คลิกหรือลากไฟล์มาวางที่นี่</p>
            <p class="brand-dropzone-hint">PNG, JPG</p>
          </div>
          <input ref="coverInput" type="file" accept=".png,.jpg,.jpeg" style="display:none" @change="onFileChange($event, 'cover')" />

          <div class="brand-spec-table">
            <div class="brand-spec-row">
              <span class="brand-spec-key">ไฟล์ที่รองรับ</span>
              <span class="brand-spec-val">PNG · JPG</span>
            </div>
            <div class="brand-spec-row">
              <span class="brand-spec-key">ขนาดไฟล์</span>
              <span class="brand-spec-badge">ไม่จำกัด</span>
            </div>
            <div class="brand-spec-row">
              <span class="brand-spec-key">ขนาดภาพแนะนำ</span>
              <span class="brand-spec-val">1920 × 1080px</span>
            </div>
            <div class="brand-spec-row brand-spec-row-last">
              <span class="brand-spec-key">อัตราส่วน</span>
              <span class="brand-spec-val">16:9</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Card 2: โลโก้ -->
    <div class="brand-card">
      <p class="brand-card-title">โลโก้</p>
      <p class="brand-card-sub">โลโก้ที่แสดงบนหน้า Login</p>

      <div class="brand-logo-row">
        <!-- Preview -->
        <div>
          <div class="brand-logo-preview">
            <img v-if="form.logoUrl" :src="form.logoUrl" style="width:100%;height:100%;object-fit:contain;border-radius:10px" />
            <PhShieldCheck v-else :size="32" style="color:var(--color-text-tertiary)" />
            <button type="button" class="brand-btn-change brand-btn-change-logo" @click="logoInput?.click()">
              <PhCamera :size="13" />
            </button>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:8px">
            <button type="button" class="brand-btn-danger-sm" :disabled="!form.logoUrl" @click="form.logoUrl = ''">
              <PhTrash :size="12" /> ลบโลโก้
            </button>
          </div>
        </div>

        <!-- Upload + spec -->
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:12px">
          <div
            class="brand-dropzone"
            style="height:100px"
            @dragover.prevent
            @drop.prevent="onDrop($event, 'logo')"
            @click="logoInput?.click()"
          >
            <PhCloudArrowUp :size="20" style="color:var(--color-text-tertiary)" />
            <p class="brand-dropzone-label">คลิกหรือลากไฟล์มาวางที่นี่</p>
            <p class="brand-dropzone-hint">PNG, JPG</p>
          </div>
          <input ref="logoInput" type="file" accept=".png,.jpg,.jpeg" style="display:none" @change="onFileChange($event, 'logo')" />

          <div class="brand-spec-table">
            <div class="brand-spec-row">
              <span class="brand-spec-key">ไฟล์ที่รองรับ</span>
              <span class="brand-spec-val">PNG · JPG</span>
            </div>
            <div class="brand-spec-row">
              <span class="brand-spec-key">ขนาดไฟล์</span>
              <span class="brand-spec-badge">ไม่จำกัด</span>
            </div>
            <div class="brand-spec-row">
              <span class="brand-spec-key">ขนาดภาพแนะนำ</span>
              <span class="brand-spec-val">512 × 512px</span>
            </div>
            <div class="brand-spec-row brand-spec-row-last">
              <span class="brand-spec-key">อัตราส่วน</span>
              <span class="brand-spec-val">1:1</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Info note -->
    <div class="brand-info-note">
      <PhInfo :size="15" weight="fill" style="flex-shrink:0" />
      <span>การเปลี่ยนแปลงจะมีผลทันทีหลังบันทึก</span>
    </div>

    <!-- Footer actions -->
    <div style="display:flex;justify-content:flex-end;gap:8px">
      <button class="adm-hdr-btn adm-hdr-btn-ghost" :disabled="saving" @click="resetDefaults">รีเซ็ตค่าเริ่มต้น</button>
      <button class="adm-hdr-btn adm-hdr-btn-primary" :disabled="saving || loading" @click="save">
        <PhFloppyDisk :size="14" /> {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  PhCamera, PhTrash, PhCloudArrowUp, PhShieldCheck, PhInfo, PhFloppyDisk,
} from '@phosphor-icons/vue'
import { getStoreSettings, updateStoreSettings } from '@/api/settings'

const loading = ref(false)
const saving = ref(false)
const error = ref('')

const form = ref({ coverImageUrl: '', logoUrl: '' })

const coverInput = ref<HTMLInputElement | null>(null)
const logoInput = ref<HTMLInputElement | null>(null)

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = ev => resolve(ev.target?.result as string)
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'))
    reader.readAsDataURL(file)
  })
}

async function applyFile(file: File, target: 'cover' | 'logo') {
  if (!file.type.startsWith('image/')) return
  try {
    const dataUrl = await readAsDataUrl(file)
    if (target === 'cover') form.value.coverImageUrl = dataUrl
    else form.value.logoUrl = dataUrl
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'อ่านไฟล์ไม่สำเร็จ'
  }
}

function onFileChange(e: Event, target: 'cover' | 'logo') {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) applyFile(f, target)
}

function onDrop(e: DragEvent, target: 'cover' | 'logo') {
  const f = e.dataTransfer?.files?.[0]
  if (f) applyFile(f, target)
}

async function save() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    await updateStoreSettings({ coverImageUrl: form.value.coverImageUrl, logoUrl: form.value.logoUrl })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

function resetDefaults() {
  form.value = { coverImageUrl: '', logoUrl: '' }
}

onMounted(async () => {
  loading.value = true
  try {
    const store = await getStoreSettings()
    form.value = {
      coverImageUrl: store.coverImageUrl ?? '',
      logoUrl: store.logoUrl ?? '',
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.branding-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.brand-card {
  background: var(--color-bg-surface);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 12px;
  padding: 20px;
}
.brand-card-title { font-size: 15px; font-weight: 500; color: var(--color-text-primary); margin: 0; }
.brand-card-sub { font-size: 12px; color: var(--color-text-secondary); margin: 2px 0 16px 0; }

.brand-cover-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 720px) {
  .brand-cover-grid { grid-template-columns: 1fr; }
}

.brand-cover-preview {
  position: relative;
  height: 180px;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(120deg, #0A4BAD, #1264E3, #3D82F0);
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-badge-preview {
  position: absolute; top: 10px; left: 10px;
  background: rgba(0,0,0,0.45); color: #fff;
  font-size: 10px; font-weight: 500; letter-spacing: 0.05em;
  padding: 3px 8px; border-radius: 100px;
}
.brand-btn-change {
  position: absolute; top: 10px; right: 10px;
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);
  color: #fff; font-size: 11px; font-weight: 500;
  padding: 4px 10px; border-radius: 6px; cursor: pointer; font-family: inherit;
}
.brand-btn-change:hover { background: rgba(255,255,255,0.3); }

.brand-preview-content { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.brand-shield-circle {
  width: 48px; height: 48px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.5);
  display: flex; align-items: center; justify-content: center;
}
.brand-preview-name { font-size: 16px; font-weight: 500; color: #fff; text-align: center; }
.brand-preview-tagline { font-size: 9px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.1em; }

.brand-logo-row { display: flex; gap: 24px; align-items: flex-start; }
@media (max-width: 560px) {
  .brand-logo-row { flex-direction: column; }
}
.brand-logo-preview {
  position: relative;
  width: 100px; height: 100px; flex-shrink: 0;
  border-radius: 10px; border: 0.5px solid var(--color-border-tertiary);
  background: var(--color-bg-secondary);
  display: flex; align-items: center; justify-content: center;
}
.brand-btn-change-logo {
  position: absolute; bottom: 0; left: 0; right: 0; top: auto;
  justify-content: center; border-radius: 0 0 9px 9px;
  background: rgba(0,0,0,0.55); border: none;
}

.brand-dropzone {
  border: 1.5px dashed var(--color-border-secondary);
  border-radius: 10px;
  background: var(--color-bg-secondary);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  cursor: pointer; transition: border-color 0.15s;
}
.brand-dropzone:hover { border-color: var(--color-accent); }
.brand-dropzone-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); margin: 0; }
.brand-dropzone-hint { font-size: 11px; color: var(--color-text-tertiary); margin: 0; }

.brand-spec-table { display: flex; flex-direction: column; }
.brand-spec-row {
  display: flex; align-items: center; gap: 8px; padding: 6px 0;
  border-bottom: 0.5px solid var(--color-border-tertiary);
}
.brand-spec-row-last { border-bottom: none; }
.brand-spec-key { font-size: 12px; color: var(--color-text-secondary); min-width: 110px; }
.brand-spec-val { font-size: 12px; font-weight: 500; color: var(--color-text-primary); }
.brand-spec-badge {
  font-size: 11px; font-weight: 500; background: var(--color-accent-bg); color: var(--color-accent);
  border-radius: 20px; padding: 2px 8px;
}

.brand-btn-danger-sm {
  display: inline-flex; align-items: center; gap: 4px;
  height: 26px; padding: 0 10px; border-radius: 6px;
  border: 0.5px solid #FFCDD2; background: #FFF2F2; color: var(--color-danger);
  font-size: 12px; font-weight: 500; font-family: inherit; cursor: pointer;
}
.brand-btn-danger-sm:hover:not(:disabled) { background: var(--color-danger); color: #fff; }
.brand-btn-danger-sm:disabled { opacity: 0.4; cursor: not-allowed; }

.brand-info-note {
  display: flex; align-items: flex-start; gap: 8px;
  background: var(--color-accent-bg); color: var(--color-accent);
  border-radius: 8px; padding: 10px 12px; font-size: 12px;
}
</style>
