<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:#1C1C1E">จัดการนักเรียน</h2>
      <div class="flex gap-2 flex-wrap">
        <!-- Import Excel -->
        <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showImportModal = true">
          <PhUploadSimple :size="14" />
          นำเข้าไฟล์ Excel
        </button>
        <input ref="csvInput" type="file" accept=".xlsx,.xls,.csv" style="display:none" @change="handleImport" />
        <!-- Add individual -->
        <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openAddModal">
          <PhPlus :size="14" />
          เพิ่มนักเรียน
        </button>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="stat-row">
      <!-- นักเรียนทั้งหมด -->
      <div class="stat-card stat-card-primary">
        <PhStudent :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">นักเรียนทั้งหมด</span>
          <span class="stat-value">{{ statTotal }}</span>
        </div>
      </div>
      <!-- ติดตามแล้ว -->
      <div class="stat-card stat-card-success">
        <PhSmiley :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">ติดตามแล้ว</span>
          <span class="stat-value">{{ statLinked }}</span>
        </div>
      </div>
      <!-- ผู้ปกครองติดตาม -->
      <div class="stat-card stat-card-info">
        <PhSmiley :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">ผู้ปกครองติดตาม</span>
          <span class="stat-value">{{ statLinked }}</span>
        </div>
      </div>
      <!-- ยังไม่ติดตาม -->
      <div class="stat-card stat-card-danger">
        <PhSmileySad :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">ยังไม่ติดตาม</span>
          <span class="stat-value">{{ statUnlinked }}</span>
        </div>
      </div>
      <!-- ผู้ปกครองยังไม่ติดตาม -->
      <div class="stat-card stat-card-ghost">
        <PhHandWaving :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">ผู้ปกครองยังไม่ติดตาม</span>
          <span class="stat-value">{{ statUnlinked }}</span>
        </div>
      </div>
    </div>

    <!-- Filters + action buttons -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3">
        <input v-model="search" class="adm-filter-input" placeholder="ค้นหาชื่อ / รหัสนักเรียน..." style="min-width:220px" />
        <select v-model="filterGrade" class="adm-filter-select">
          <option value="">ชั้นปีทั้งหมด</option>
          <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
        </select>
        <select v-model="filterClass" class="adm-filter-select">
          <option value="">ห้องทั้งหมด</option>
          <option v-for="c in availableClasses" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="filterStatus" class="adm-filter-select">
          <option value="">สถานะทั้งหมด</option>
          <option value="active">เปิดใช้งาน</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
        <button class="adm-search-btn" @click="currentPage = 1">ค้นหา</button>
      </div>
      <!-- Sub-action row -->
      <div class="flex flex-wrap gap-2" style="margin-top:12px;padding-top:12px;border-top:1px solid #F0F0F0">
        <button class="adm-hdr-btn adm-hdr-btn-soft" @click="openPromoteModal">
          <PhArrowUp :size="14" />
          เลื่อนชั้นเรียน
        </button>
        <button class="adm-hdr-btn adm-hdr-btn-soft" :disabled="exportingCodes" @click="downloadEnrollmentCodes">
          <PhDownloadSimple :size="14" />
          {{ exportingCodes ? 'กำลังสร้าง...' : 'ดาวน์โหลด Enrollment Code' }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:52px">ลำดับ</th>
            <th>รหัสนักเรียน</th>
            <th>ชื่อ-นามสกุล</th>
            <th class="center">ชั้น / ห้อง</th>
            <th>บัตร RFID</th>
            <th class="right">ยอดเงิน (฿)</th>
            <th class="center">ผู้ปกครอง</th>
            <th class="center">สิทธิ</th>
            <th class="center">สถานะ</th>
            <th class="center" style="width:152px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10" class="center" style="padding:32px;color:#AEAEB2">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="fetchError">
            <td colspan="10" class="center" style="padding:32px;color:var(--color-danger)">{{ fetchError }}</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="10" class="center" style="padding:32px;color:#AEAEB2">ไม่พบนักเรียน</td>
          </tr>
          <tr v-for="(s, i) in paginated" :key="s.uid">
            <!-- ลำดับ -->
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>

            <!-- รหัสนักเรียน -->
            <td><span class="adm-code">{{ s.uid }}</span></td>

            <!-- ชื่อ -->
            <td>
              <div style="font-weight:500;color:var(--color-primary)">{{ s.firstName }} {{ s.lastName }}</div>
              <div v-if="s.guardianEmail" style="font-size:11px;color:#AEAEB2;margin-top:2px">{{ s.guardianEmail }}</div>
            </td>

            <!-- ชั้น/ห้อง -->
            <td class="center">
              <div style="font-weight:500;color:#1C1C1E">{{ s.gradeLevel }}</div>
              <div style="font-size:11px;color:#8E8E93">{{ s.className }}</div>
            </td>

            <!-- บัตร RFID -->
            <td>
              <div v-if="s.cardUid" class="flex items-center gap-1.5">
                <span class="adm-code" style="font-size:11px">{{ s.cardUid }}</span>
                <span :class="['adm-badge', s.cardStatus === 'active' ? 'adm-badge-success' : s.cardStatus === 'lost' ? 'adm-badge-void' : 'adm-badge-voided']"
                  style="font-size:10px;padding:2px 7px">
                  {{ s.cardStatus === 'active' ? 'ใช้งาน' : s.cardStatus === 'lost' ? 'หาย' : 'ปิด' }}
                </span>
              </div>
              <span v-else style="color:#AEAEB2;font-size:12px">ยังไม่มีบัตร</span>
            </td>

            <!-- ยอดเงิน -->
            <td class="right">
              <span :style="{
                fontWeight: '500',
                color: s.balance < s.lowThreshold ? 'var(--color-danger)' : 'var(--color-success)'
              }">
                ฿{{ s.balance.toLocaleString('th-TH', {minimumFractionDigits:2}) }}
              </span>
              <div v-if="s.balance < s.lowThreshold" style="font-size:10px;color:var(--color-warning);margin-top:1px">
                ⚠ ต่ำกว่า ฿{{ s.lowThreshold }}
              </div>
            </td>

            <!-- ผู้ปกครอง -->
            <td class="center">
              <span class="adm-badge adm-badge-success" style="font-size:11px;padding:3px 10px;display:inline-flex;align-items:center;gap:4px">
                <PhUsers :size="11" weight="fill" />
                {{ s.parentCount ?? 0 }}/2
              </span>
            </td>

            <!-- สิทธิ -->
            <td class="center">
              <div class="flex flex-col items-center gap-1">
                <span
                  v-for="w in enabledWallets"
                  :key="w.id"
                  class="adm-badge adm-badge-topup"
                  style="font-size:10px;padding:2px 8px;white-space:nowrap"
                >
                  {{ w.name }}
                </span>
                <span v-if="enabledWallets.length === 0" style="font-size:11px;color:#AEAEB2">—</span>
              </div>
            </td>

            <!-- สถานะ -->
            <td class="center">
              <span class="adm-status">
                <span :class="['adm-dot', s.status === 'active' ? 'adm-dot-success' : 'adm-dot-gray']" />
                <span :style="{color: s.status === 'active' ? '#028A60' : '#8E8E93'}">
                  {{ s.status === 'active' ? 'เปิดใช้' : 'ปิดใช้' }}
                </span>
              </span>
            </td>

            <!-- จัดการ -->
            <td>
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEditModal(s)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn" title="Enrollment Code" @click="openCodeModal(s)">
                  <PhKey :size="14" />
                </button>
                <button
                  :class="['adm-action-btn', s.status === 'active' ? 'danger' : 'success']"
                  :title="s.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'"
                  @click="toggleStatus(s)"
                >
                  <PhProhibit v-if="s.status === 'active'" :size="14" />
                  <PhCheckCircle v-else :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="adm-pagination">
        <div class="adm-pagination-left">
          <span>ทั้งหมด {{ filtered.length }} คน</span>
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

    <!-- ── Import Modal ─────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showImportModal" class="modal-backdrop" @click="closeImportModal" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showImportModal" class="imp-modal">

          <!-- Title row -->
          <div class="imp-header">
            <h3 class="imp-title">นำเข้าข้อมูล</h3>
            <button class="imp-close" @click="closeImportModal"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="imp-divider" />

          <!-- Step 1 -->
          <div class="imp-step">
            <div class="imp-step-num">1</div>
            <div class="flex-1">
              <p class="imp-step-title">แก้ไขข้อมูลจากไฟล์ต้นฉบับ</p>
              <p class="imp-step-sub">เพื่อให้แน่ใจว่าข้อมูลของคุณถูกจัดรูปแบบอย่างถูกต้อง</p>
              <button class="imp-dl-btn" @click="downloadTemplate">
                <PhDownloadSimple :size="14" weight="bold" />
                ดาวน์โหลดไฟล์ต้นฉบับ
              </button>
            </div>
          </div>
          <div class="imp-divider" />

          <!-- Step 2 -->
          <div class="imp-step" style="align-items:flex-start">
            <div class="imp-step-num">2</div>
            <div class="flex-1">
              <p class="imp-step-title">อัปโหลดไฟล์</p>
              <p class="imp-step-sub">
                ระบุรายการตามคำแนะนำ โดยอัปโหลดครั้งละ 1 ไฟล์<br>
                รองรับสูงสุด 1,000 รายการต่อไฟล์เพื่อการประมวลผลที่มีประสิทธิภาพ
              </p>

              <!-- Drop zone -->
              <div
                class="imp-dropzone"
                :class="{ 'imp-dropzone-over': isDragOver, 'imp-dropzone-has': !!importFile }"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
                @click="openFileSelect"
              >
                <div v-if="!importFile" class="flex flex-col items-center gap-3">
                  <div class="imp-upload-icon">
                    <PhCloudArrowUp :size="26" weight="fill" color="white" />
                  </div>
                  <p class="imp-dropzone-text">
                    ลากและวางไฟล์ตรงนี้ หรือ
                    <span class="imp-select-link">เลือกไฟล์</span>
                    จากเครื่องของคุณ
                  </p>
                </div>
                <div v-else class="flex flex-col items-center gap-2">
                  <PhFileXls :size="36" weight="fill" style="color:var(--color-primary)" />
                  <p style="font-size:14px;font-weight:500;color:var(--color-primary)">{{ importFile.name }}</p>
                  <p style="font-size:12px;color:#8E8E93">{{ (importFile.size/1024).toFixed(1) }} KB · คลิกเพื่อเปลี่ยนไฟล์</p>
                </div>
              </div>
              <input ref="csvInput" type="file" accept=".xlsx,.xls,.csv" style="display:none" @change="onFileChange" />
            </div>
          </div>

          <!-- Instructions -->
          <div class="imp-instructions">
            <p style="font-size:13px;font-weight:500;color:var(--color-primary);margin-bottom:8px">คำแนะนำ:</p>
            <ul style="padding-left:16px;display:flex;flex-direction:column;gap:5px">
              <li style="font-size:13px;color:#3C3C43">การอัปโหลดไฟล์ Excel ใช้เพิ่ม/อัปเดต รายการเท่านั้น ไม่สามารถลบได้</li>
              <li style="font-size:13px;color:#3C3C43">โปรดตรวจสอบให้แน่ใจว่าไฟล์ Excel ของคุณตรงกับรูปแบบต้นฉบับที่กำหนด</li>
              <li style="font-size:13px;color:#3C3C43">รองรับเฉพาะไฟล์ที่มีนามสกุล .xlsx เท่านั้น</li>
              <li style="font-size:13px;color:#3C3C43">ข้อมูลในไฟล์ที่ถูกต้องเท่านั้นที่จะถูกอัปโหลด ส่วนข้อมูลที่ผิดจะไม่ถูกอัปโหลดเข้าสู่ระบบ</li>
            </ul>
          </div>

          <!-- Footer buttons -->
          <div class="imp-footer">
            <button class="imp-btn-cancel" @click="closeImportModal">ยกเลิก</button>
            <button
              :class="['imp-btn-confirm', importFile ? 'imp-btn-confirm-active' : '']"
              :disabled="!importFile"
              @click="confirmImport"
            >ยืนยัน</button>
          </div>

        </div>
      </Transition>
    </Teleport>

    <!-- ── Import Result Modal ──────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showImportResult" class="modal-backdrop" @click="showImportResult=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showImportResult && importResult" class="modal-box" style="max-width:500px">
          <h3 class="modal-title">ผลการนำเข้าข้อมูล</h3>

          <!-- Success count -->
          <div style="display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:8px;background:var(--color-success-bg);margin-bottom:12px">
            <span style="font-size:20px">✅</span>
            <span style="font-size:15px;font-weight:500;color:#028A60">
              นำเข้าสำเร็จ {{ importResult.success }} รายการ
            </span>
          </div>

          <!-- Errors -->
          <div v-if="importResult.errors.length > 0">
            <p style="font-size:13px;font-weight:500;color:var(--color-danger);margin-bottom:8px">
              ⚠ พบข้อผิดพลาด {{ importResult.errors.length }} รายการ:
            </p>
            <div style="max-height:200px;overflow-y:auto;border:1px solid var(--color-danger-bg);border-radius:8px;padding:10px;background:var(--color-danger-bg)">
              <p v-for="(err, i) in importResult.errors" :key="i"
                style="font-size:12px;color:#CC3333;margin-bottom:4px">
                • {{ err }}
              </p>
            </div>
          </div>

          <div class="modal-actions" style="margin-top:16px">
            <button class="adm-hdr-btn adm-hdr-btn-primary" @click="showImportResult=false">ตกลง</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Add Student Modal ──────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showAddModal" class="modal-backdrop" @click="showAddModal = false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showAddModal" class="imp-modal" style="max-width:460px">
          <div class="imp-header">
            <h3 class="imp-title">เพิ่มนักเรียนใหม่</h3>
            <button class="imp-close" @click="showAddModal = false"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="imp-divider" />
          <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px">
            <div class="edit-field-row">
              <div class="edit-field">
                <label class="promo-label">ชื่อ <span style="color:var(--color-danger)">*</span></label>
                <input v-model="addForm.firstName" class="edit-input" placeholder="ชื่อจริง" />
              </div>
              <div class="edit-field">
                <label class="promo-label">นามสกุล <span style="color:var(--color-danger)">*</span></label>
                <input v-model="addForm.lastName" class="edit-input" placeholder="นามสกุล" />
              </div>
            </div>
            <div class="edit-field-row">
              <div class="edit-field">
                <label class="promo-label">ชั้นปี <span style="color:var(--color-danger)">*</span></label>
                <select v-model="addForm.gradeLevel" class="promo-select">
                  <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
                </select>
              </div>
              <div class="edit-field">
                <label class="promo-label">ห้องเรียน <span style="color:var(--color-danger)">*</span></label>
                <input v-model="addForm.className" class="edit-input" placeholder="เช่น P1-A" />
              </div>
            </div>
            <div class="edit-field">
              <label class="promo-label">อีเมล / เบอร์ผู้ปกครอง</label>
              <input v-model="addForm.guardianEmail" class="edit-input" placeholder="parent@example.com หรือ 08xxxxxxxx" />
            </div>
            <div class="edit-field">
              <label class="promo-label">รหัสนักเรียน <span style="color:#AEAEB2;font-weight:400">(ระบบจะสร้างให้อัตโนมัติถ้าไม่กรอก)</span></label>
              <input v-model="addForm.uid" class="edit-input" placeholder="เช่น STD-P1-0001" style="font-family:monospace" />
            </div>
            <div v-if="addError" style="font-size:13px;color:var(--color-danger);padding:8px 12px;background:var(--color-danger-bg);border-radius:8px">
              {{ addError }}
            </div>
          </div>
          <div class="imp-footer">
            <button class="imp-btn-cancel" @click="showAddModal = false">ยกเลิก</button>
            <button class="imp-btn-confirm imp-btn-confirm-active" :disabled="addSaving" @click="saveAdd">
              {{ addSaving ? 'กำลังบันทึก...' : 'เพิ่มนักเรียน' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Edit Student Modal ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showEditModal" class="modal-backdrop" @click="showEditModal = false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showEditModal && editTarget" class="imp-modal" style="max-width:460px">
          <div class="imp-header">
            <h3 class="imp-title">แก้ไขข้อมูลนักเรียน</h3>
            <button class="imp-close" @click="showEditModal = false"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="imp-divider" />
          <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px">
            <div class="edit-field-row">
              <div class="edit-field">
                <label class="promo-label">ชื่อ</label>
                <input v-model="editTarget.firstName" class="edit-input" />
              </div>
              <div class="edit-field">
                <label class="promo-label">นามสกุล</label>
                <input v-model="editTarget.lastName" class="edit-input" />
              </div>
            </div>
            <div class="edit-field-row">
              <div class="edit-field">
                <label class="promo-label">ชั้นปี</label>
                <select v-model="editTarget.gradeLevel" class="promo-select">
                  <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
                </select>
              </div>
              <div class="edit-field">
                <label class="promo-label">ห้องเรียน</label>
                <input v-model="editTarget.className" class="edit-input" />
              </div>
            </div>
            <div class="edit-field">
              <label class="promo-label">อีเมล / เบอร์ผู้ปกครอง</label>
              <input v-model="editTarget.guardianEmail" class="edit-input" placeholder="parent@example.com หรือ 08xxxxxxxx" />
            </div>
            <!-- RFID -->
            <div class="promo-divider" style="margin:4px -24px;width:calc(100% + 48px)" />
            <div class="edit-field-row" style="align-items:flex-end">
              <div class="edit-field" style="flex:2">
                <label class="promo-label">รหัสบัตร RFID <span style="color:#AEAEB2;font-weight:400">(ถ้ามี)</span></label>
                <input v-model="editTarget.cardUid" class="edit-input" placeholder="04A3B5C6..." style="font-family:monospace" />
              </div>
              <div class="edit-field" style="flex:1">
                <label class="promo-label">สถานะบัตร</label>
                <select v-model="editTarget.cardStatus" class="promo-select" :disabled="!editTarget.cardUid">
                  <option value="active">ใช้งาน</option>
                  <option value="inactive">ปิด</option>
                  <option value="lost">หาย</option>
                </select>
              </div>
            </div>
          </div>

          <!-- ── ผู้ปกครอง + ครอบครัว ── -->
          <div class="promo-divider" style="margin:0" />
          <div style="padding:16px 24px;display:flex;flex-direction:column;gap:12px;background:#FAFAFA">
            <div>
              <div style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">ผู้ปกครองที่ลิงก์แล้ว</div>
              <div v-if="editParentsLoading" style="font-size:12px;color:#AEAEB2">กำลังโหลด...</div>
              <div v-else-if="editParents.length === 0" style="font-size:12px;color:#AEAEB2">ยังไม่มีผู้ปกครอง</div>
              <div v-for="(p, idx) in editParents" :key="p.linkId" class="edit-info-row">
                <div class="edit-info-avatar" style="background:#D1FAE5;color:#065F46">{{ p.firstName?.[0] ?? '?' }}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:500;color:#1C1C1E">ผู้ปกครองคนที่ {{ idx + 1 }} — {{ p.firstName }} {{ p.lastName }}</div>
                  <div style="font-size:11px;color:#8E8E93">{{ p.email || p.phone || '—' }}</div>
                </div>
                <span v-if="p.isPrimary" style="font-size:10px;background:#D1FAE5;color:#065F46;padding:2px 7px;border-radius:4px;flex-shrink:0">หลัก</span>
              </div>
            </div>
            <template v-if="editTarget?.familyCode">
              <div style="height:1px;background:#E5E7EB" />
              <div>
                <div style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">กลุ่มครอบครัว {{ editTarget.familyCode }}</div>
                <div v-if="editFamilyLoading" style="font-size:12px;color:#AEAEB2">กำลังโหลด...</div>
                <template v-else>
                  <div v-for="s in editFamilyStudents" :key="s.uid" class="edit-info-row">
                    <div class="edit-info-avatar" style="background:var(--color-primary-tint);color:var(--color-primary)">{{ s.firstName?.[0] ?? '?' }}</div>
                    <div style="flex:1;min-width:0">
                      <div style="font-size:13px;font-weight:500;color:#1C1C1E">{{ s.firstName }} {{ s.lastName }}</div>
                      <div style="font-size:11px;color:#8E8E93">{{ s.gradeLevel }}</div>
                    </div>
                    <span style="font-size:10px;background:#EEF2FF;color:#3730A3;padding:2px 7px;border-radius:4px;flex-shrink:0">นักเรียน</span>
                  </div>
                  <div v-if="editFamilyStudents.length === 0" style="font-size:12px;color:#AEAEB2">ไม่พบนักเรียนในกลุ่ม</div>
                </template>
              </div>
            </template>
          </div>

          <div v-if="editError" style="padding:0 24px 12px;font-size:13px;color:var(--color-danger)">{{ editError }}</div>
          <div class="imp-footer">
            <button class="imp-btn-cancel" @click="showEditModal = false">ยกเลิก</button>
            <button class="imp-btn-confirm imp-btn-confirm-active" :disabled="editSaving" @click="saveEdit">
              {{ editSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Enrollment Code Modal ─────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showCodeModal" class="modal-backdrop" @click="showCodeModal = false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showCodeModal" class="code-modal">

          <!-- Header -->
          <div class="code-header">
            <h3 class="code-title">Enrollment Code</h3>
            <button class="promo-close" @click="showCodeModal = false">
              <PhX :size="18" weight="bold" />
            </button>
          </div>
          <div class="promo-divider" />

          <div class="code-body">
            <!-- Student info -->
            <div v-if="codeData" class="code-student-name">
              {{ codeData.firstName }} {{ codeData.lastName }}
              <span class="code-grade-badge">{{ codeData.gradeLevel }}</span>
            </div>
            <div v-else class="code-student-name" style="color:#AEAEB2">กำลังโหลด...</div>

            <!-- Summary row -->
            <div v-if="codeData" class="code-summary-row">
              <PhUsers :size="13" style="flex-shrink:0" />
              <span>ผู้ปกครองลิงก์แล้ว {{ codeData.parentCount ?? 0 }}/2</span>
              <template v-if="codeData.pendingCodes?.length">
                <span style="color:#D1D5DB">·</span>
                <span>Code รอใช้งาน {{ codeData.pendingCodes.length }} อัน</span>
              </template>
            </div>

            <!-- Linked parent slots -->
            <div v-if="codeData?.parentCount" class="code-linked-slots">
              <div v-for="n in codeData.parentCount" :key="n" class="code-linked-row">
                <PhCheckCircle :size="14" weight="fill" style="color:#059669;flex-shrink:0" />
                <span style="flex:1">ผู้ปกครองคนที่ {{ n }} — ลิงก์แล้ว</span>
                <button
                  v-if="n === 1"
                  class="code-replace-btn"
                  :disabled="replacingParent1"
                  :title="'สร้าง Code ใหม่ (เอาผู้ปกครองคนที่ 1 ออก)'"
                  @click="replaceParent1"
                >
                  <PhArrowClockwise :size="12" :class="{ spin: replacingParent1 }" />
                  <span>สร้าง Code ใหม่</span>
                </button>
              </div>
            </div>

            <!-- Pending codes per parent slot -->
            <div v-if="codeData?.pendingCodes?.length" style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
              <div v-for="(entry, idx) in codeData.pendingCodes" :key="idx">
                <div style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:flex;align-items:center;justify-content:space-between">
                  <span>CODE ผู้ปกครองคนที่ {{ (codeData.parentCount ?? 0) + idx + 1 }}</span>
                  <button
                    class="code-replace-btn"
                    :disabled="generatingCode"
                    @click="generateCodeForSlot(idx)"
                  >
                    <PhArrowClockwise :size="11" :class="{ spin: generatingCode }" />
                    <span>สร้าง Code ใหม่</span>
                  </button>
                </div>
                <div class="code-box">
                  <span class="code-text">{{ entry.code }}</span>
                  <button class="code-copy-btn" :title="copied === entry.code ? 'คัดลอกแล้ว' : 'คัดลอก'" @click="copyCodeEntry(entry.code)">
                    <PhCheckCircle v-if="copied === entry.code" :size="16" weight="fill" style="color:#059669" />
                    <PhCopy v-else :size="16" />
                  </button>
                </div>
                <div style="font-size:11px;color:#6B7280;margin-top:4px;display:flex;align-items:center;gap:6px">
                  <span class="code-status code-status-active" style="font-size:10px;padding:1px 6px">ใช้งานได้</span>
                  <span>หมดอายุ {{ formatExpiry(entry.expiresAt) }}</span>
                </div>
              </div>
            </div>

            <!-- Empty slots: generate buttons when no code exists for a slot -->
            <template v-if="codeData && (codeData.parentCount ?? 0) < 2">
              <div
                v-for="slotN in (2 - (codeData.parentCount ?? 0) - (codeData.pendingCodes?.length ?? 0))"
                :key="'empty-' + slotN"
                style="margin-top:8px"
              >
                <div style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px">
                  CODE ผู้ปกครองคนที่ {{ (codeData.parentCount ?? 0) + (codeData.pendingCodes?.length ?? 0) + slotN }}
                </div>
                <button
                  class="code-generate-btn"
                  style="height:40px;font-size:13px"
                  :disabled="generatingCode"
                  @click="generateCode"
                >
                  <PhArrowClockwise :size="13" :class="{ spin: generatingCode }" />
                  สร้าง Code
                </button>
              </div>
            </template>
          </div>

          <div class="promo-divider" />

          <!-- Footer -->
          <div class="code-footer">
            <div v-if="codeError" style="width:100%;font-size:13px;color:var(--color-danger);text-align:center;margin-bottom:4px">{{ codeError }}</div>
            <p v-if="(codeData?.parentCount ?? 0) >= 2" class="code-footer-note" style="color:#059669">นักเรียนมีผู้ปกครองครบ 2 คนแล้ว</p>
            <p v-else class="code-footer-note">Code มีอายุ 14 วัน นับจากวันที่สร้าง</p>
          </div>

        </div>
      </Transition>
    </Teleport>

    <!-- ── Replace Parent 1 Confirm ──────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showReplaceConfirm" class="modal-backdrop" @click="showReplaceConfirm = false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showReplaceConfirm" class="modal-box" style="max-width:380px;padding:24px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--color-danger-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <PhWarning :size="18" weight="fill" style="color:var(--color-danger)" />
            </div>
            <h3 style="font-size:15px;font-weight:600;color:var(--color-text-primary)">ยืนยันการลบผู้ปกครองคนที่ 1</h3>
          </div>
          <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.6;margin-bottom:20px">
            ผู้ปกครองคนที่ 1 จะถูก<strong>ยกเลิกการลิงก์ทันที</strong> และระบบจะสร้าง Enrollment Code ใหม่สำหรับผูกผู้ปกครองคนใหม่
          </p>
          <div style="display:flex;gap:10px">
            <button
              class="btn-ghost"
              style="flex:1;height:40px;border-radius:8px;font-size:14px"
              @click="showReplaceConfirm = false"
            >ยกเลิก</button>
            <button
              style="flex:1;height:40px;border-radius:8px;font-size:14px;font-weight:500;background:var(--color-danger);color:#fff;border:none;cursor:pointer"
              @click="doReplaceParent1"
            >ตกลง ลบและสร้าง Code</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Promote Modal ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showPromoteModal" class="modal-backdrop" @click="closePromoteModal" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showPromoteModal" class="promo-modal">

          <!-- Header -->
          <div class="promo-header">
            <div>
              <div class="promo-title">
                <PhArrowCircleUp :size="20" weight="fill" style="color:var(--color-primary);flex-shrink:0" />
                เลื่อนชั้นนักเรียน
              </div>
              <p class="promo-subtitle">เลื่อนชั้นนักเรียนที่เลือกไปยังปีการศึกษาถัดไป</p>
            </div>
            <button class="promo-close" @click="closePromoteModal">
              <PhX :size="18" weight="bold" />
            </button>
          </div>

          <div class="promo-divider" />

          <!-- Year selectors -->
          <div class="promo-body">
            <div class="promo-year-row">
              <div class="promo-year-col">
                <label class="promo-label">จากปีการศึกษา</label>
                <select v-model="promoteFromYear" class="promo-select">
                  <option v-for="y in academicYears" :key="y" :value="y">{{ y }}</option>
                </select>
              </div>
              <div class="promo-year-col">
                <label class="promo-label">ไปยังปีการศึกษา</label>
                <div class="promo-year-readonly">{{ promoteToYear }}</div>
              </div>
            </div>

            <!-- Search -->
            <div class="promo-search-wrap">
              <PhMagnifyingGlass :size="15" style="color:#AEAEB2;flex-shrink:0" />
              <input v-model="promoteSearch" class="promo-search" placeholder="Search..." />
            </div>

            <!-- Section header -->
            <div class="promo-section-title-row">
              <span class="promo-section-title">ตัวอย่างการเลื่อนชั้น (เลือก {{ totalToPromote }} คน)</span>
              <button class="promo-select-all-btn" @click="toggleSelectAll">
                {{ isAllSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด' }}
              </button>
            </div>

            <!-- Grade groups list -->
            <div class="promo-list">
              <div v-for="group in promoteGroups" :key="group.from" class="promo-row-wrap">
                <!-- Grade header row -->
                <div class="promo-row">
                  <!-- Expand toggle -->
                  <button class="promo-expand-btn" @click="toggleExpand(group.from)">
                    <PhCaretRight
                      :size="13"
                      weight="bold"
                      :style="{
                        color: '#8E8E93',
                        transition: 'transform 0.15s',
                        transform: expandedGrades.has(group.from) ? 'rotate(90deg)' : 'rotate(0deg)',
                      }"
                    />
                  </button>
                  <!-- Grade select-all checkbox -->
                  <input
                    type="checkbox"
                    class="promo-grade-checkbox"
                    :checked="isGradeAllSelected(group)"
                    :indeterminate="isGradePartial(group)"
                    @change="toggleGradeAll(group)"
                  />
                  <span class="promo-grade-from">{{ group.from }}</span>
                  <PhArrowRight :size="13" style="color:#AEAEB2;flex-shrink:0" />
                  <span v-if="group.to" class="promo-grade-to">{{ group.to }}</span>
                  <span v-else class="promo-grade-grad">
                    <PhGraduationCap :size="14" weight="fill" />
                    จบการศึกษา
                  </span>
                  <span :class="['promo-count', isGradePartial(group) ? 'promo-count-partial' : '']">
                    {{ gradeSelectedCount(group) }}/{{ group.students.length }} คน
                  </span>
                </div>
                <!-- Expanded student list -->
                <div v-if="expandedGrades.has(group.from)" class="promo-student-list">
                  <label
                    v-for="s in group.students"
                    :key="s.uid"
                    class="promo-student-row"
                    @click.prevent="toggleStudent(s.uid)"
                  >
                    <input
                      type="checkbox"
                      class="promo-grade-checkbox"
                      :checked="selectedUids.has(s.uid)"
                      @change="toggleStudent(s.uid)"
                    />
                    <span class="promo-student-name">{{ s.firstName }} {{ s.lastName }}</span>
                    <span class="promo-student-uid">{{ s.uid }}</span>
                  </label>
                </div>
              </div>
              <div v-if="promoteGroups.length === 0" class="promo-empty">
                ไม่พบนักเรียนที่ตรงกับการค้นหา
              </div>
            </div>

            <!-- Graduation warning -->
            <div v-if="hasGraduates && !promoteSearch" class="promo-warn-grad">
              <PhWarning :size="15" weight="fill" style="flex-shrink:0;margin-top:1px" />
              <span>นักเรียน S6 จะถูกบันทึกเป็นจบการศึกษา</span>
            </div>
          </div>

          <div class="promo-divider" />

          <!-- Confirmation checkbox -->
          <div class="promo-confirm-wrap">
            <label class="promo-confirm-label">
              <input v-model="promoteConfirmed" type="checkbox" class="promo-checkbox" />
              <div>
                <div class="promo-confirm-title">ยืนยันการเลื่อนชั้น</div>
                <div class="promo-confirm-sub">
                  เลื่อนชั้นนักเรียน {{ selectedUids.size }} คน ไปยัง {{ promoteToYear }} การกระทำนี้ไม่สามารถยกเลิกได้
                </div>
              </div>
            </label>
          </div>

          <!-- Footer -->
          <div v-if="promoteError" style="padding:0 24px 8px;font-size:13px;color:var(--color-danger)">{{ promoteError }}</div>
          <div class="promo-footer">
            <button class="promo-btn-cancel" @click="closePromoteModal">ยกเลิก</button>
            <button
              :class="['promo-btn-confirm', promoteConfirmed ? 'promo-btn-confirm-active' : '']"
              :disabled="!promoteConfirmed || promoting"
              @click="promoteAll"
            >
              <PhArrowCircleUp :size="15" weight="fill" />
              {{ promoting ? 'กำลังเลื่อนชั้น...' : `เลื่อนชั้น ${totalToPromote} คน` }}
            </button>
          </div>

        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWalletsStore } from '@/stores/wallets'
import {
  PhArrowUp, PhUploadSimple, PhDownloadSimple, PhPlus,
  PhPencilSimple, PhProhibit,
  PhX, PhCloudArrowUp, PhFileXls,
  PhArrowCircleUp, PhMagnifyingGlass, PhCaretRight, PhArrowRight,
  PhGraduationCap, PhWarning, PhKey, PhCopy, PhCheckCircle, PhArrowClockwise,
  PhStudent, PhSmiley, PhSmileySad, PhHandWaving, PhUsers,
} from '@phosphor-icons/vue'
import * as XLSX from 'xlsx'
import api from '@/api/axios'
import { listAcademicYears } from '@/api/settings'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Student {
  uid:           string
  firstName:     string
  lastName:      string
  gradeLevel:    string
  className:     string
  guardianEmail?: string
  walletIds?:     string[]
  cardUid?:      string
  cardStatus?:   'active' | 'inactive' | 'lost'
  balance:       number
  lowThreshold:  number
  parentCount:   number
  familyCode?:   string
  canPreorder:   boolean
  buffetGroup:   'primary' | 'secondary'
  status:        'active' | 'inactive' | 'suspended'
}

interface ParentLink {
  linkId:       string
  parentId:     string
  firstName:    string
  lastName:     string
  email:        string
  phone:        string
  relationship: string
  isPrimary:    boolean
  boundAt:      string
}
interface FamilyMember {
  uid:        string
  firstName:  string
  lastName:   string
  gradeLevel: string
  status:     string
}
interface FamilyParent {
  parentId:  string
  uid:       string
  firstName: string
  lastName:  string
  email:     string
  phone:     string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GRADES = ['K1','K2','P1','P2','P3','P4','P5','P6','S1','S2','S3','S4','S5','S6']
const PRE_ORDER_GRADES = ['K1','K2']
// populated from API; fallback keeps the UI usable if API is slow/unreachable
const academicYears = ref<string[]>(['2023/2024','2024/2025','2025/2026','2026/2027','2027/2028'])

// ── State ─────────────────────────────────────────────────────────────────────
const loading          = ref(false)
const students         = ref<Student[]>([])
const search           = ref('')
const filterGrade      = ref('')
const filterClass      = ref('')
const filterStatus     = ref('')
const currentPage      = ref(1)
const pageSize         = ref(10)
const showPromoteModal = ref(false)
const showAddModal     = ref(false)
const csvInput         = ref<HTMLInputElement | null>(null)

// ── Add student state ──────────────────────────────────────────────────────
interface AddForm {
  firstName: string; lastName: string; gradeLevel: string
  className: string; guardianEmail: string; uid: string
}
const addForm    = ref<AddForm>({ firstName: '', lastName: '', gradeLevel: 'P1', className: '', guardianEmail: '', uid: '' })
const addSaving  = ref(false)
const addError   = ref('')

function openAddModal() {
  addForm.value   = { firstName: '', lastName: '', gradeLevel: 'P1', className: '', guardianEmail: '', uid: '' }
  addError.value  = ''
  showAddModal.value = true
}

async function saveAdd() {
  if (addSaving.value) return
  const { firstName, lastName, gradeLevel, className, guardianEmail, uid } = addForm.value
  if (!firstName.trim() || !lastName.trim() || !gradeLevel || !className.trim()) {
    addError.value = 'กรุณากรอกข้อมูลจำเป็นให้ครบ'
    return
  }
  addSaving.value = true
  addError.value  = ''
  try {
    const payload: any = { firstName: firstName.trim(), lastName: lastName.trim(), gradeLevel, className: className.trim() }
    if (guardianEmail.trim()) payload.guardianEmail = guardianEmail.trim()
    if (uid.trim()) payload.uid = uid.trim()
    const res = await api.post('/admin/students', payload)
    const newStudent = mapStudent(res.data?.student ?? res.data)
    students.value = [newStudent, ...students.value]
    showAddModal.value = false
  } catch (err: any) {
    addError.value = err?.response?.data?.message ?? 'เพิ่มนักเรียนไม่สำเร็จ'
  } finally {
    addSaving.value = false
  }
}

// ── Export enrollment codes ────────────────────────────────────────────────
const exportingCodes = ref(false)

async function downloadEnrollmentCodes() {
  exportingCodes.value = true
  try {
    const res  = await api.get('/admin/students/codes')
    const rows = res.data?.students ?? []

    const wb = XLSX.utils.book_new()

    // ── Sheet 1: Enrollment Codes ──────────────────────────────────────
    const headers = ['ลำดับ', 'รหัสนักเรียน', 'ชื่อ-นามสกุล', 'ชั้น / ห้อง', 'Enrollment Code', 'วันหมดอายุ', 'อีเมล / เบอร์ผู้ปกครอง']
    const data = rows.map((s: any, i: number) => {
      const exp = s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('th-TH', {
        day: 'numeric', month: 'short', year: 'numeric',
      }) : '—'
      return [
        i + 1,
        s.uid,
        `${s.firstName} ${s.lastName}`,
        `${s.gradeLevel} / ${s.className}`,
        s.code,
        exp,
        s.guardianContact || '—',
      ]
    })

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
    ws['!cols'] = [
      { wch: 6 }, { wch: 16 }, { wch: 22 }, { wch: 12 },
      { wch: 20 }, { wch: 18 }, { wch: 28 },
    ]

    // bold header row (limited in free xlsx)
    XLSX.utils.book_append_sheet(wb, ws, 'Enrollment Codes')

    // ── Sheet 2: Instructions ──────────────────────────────────────────
    const instrWs = XLSX.utils.aoa_to_sheet([
      ['คำแนะนำสำหรับผู้ปกครอง'],
      [''],
      ['1. เปิดแอป UPOS หรือเว็บไซต์ของโรงเรียน'],
      ['2. เลือก "ลงทะเบียนผู้ปกครอง"'],
      ['3. กรอกรหัสนักเรียน (คอลัมน์ ข)'],
      ['4. กรอกอีเมลหรือเบอร์มือถือของผู้ปกครอง'],
      ['5. รับ OTP และยืนยัน'],
      ['6. กรอกชื่อ-นามสกุล และตั้งรหัสผ่าน'],
      [''],
      ['* Enrollment Code มีอายุ 14 วัน หากหมดอายุให้ติดต่อโรงเรียนเพื่อขอรหัสใหม่'],
    ])
    instrWs['!cols'] = [{ wch: 60 }]
    XLSX.utils.book_append_sheet(wb, instrWs, 'คำแนะนำ')

    const today = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    XLSX.writeFile(wb, `Enrollment_Codes_${today}.xlsx`)
  } catch {
    // export failed — do nothing (no local fallback)
  } finally {
    exportingCodes.value = false
  }
}

// Edit modal state
const showEditModal      = ref(false)
const editTarget         = ref<Student | null>(null)
const editSaving         = ref(false)
const editError          = ref('')
const editParentsLoading = ref(false)
const editParents        = ref<ParentLink[]>([])
const editFamilyLoading  = ref(false)
const editFamilyStudents = ref<FamilyMember[]>([])
const editFamilyParents  = ref<FamilyParent[]>([])

function openEditModal(s: Student) {
  editTarget.value         = { ...s }
  editError.value          = ''
  editParents.value        = []
  editFamilyStudents.value = []
  editFamilyParents.value  = []
  showEditModal.value      = true
  fetchEditParents(s.uid)
  if (s.familyCode) fetchEditFamily(s.familyCode)
}

async function fetchEditParents(uid: string) {
  editParentsLoading.value = true
  try {
    const res = await api.get(`/admin/students/${uid}/parents`)
    editParents.value = res.data?.parents ?? []
  } catch { /* non-critical */ }
  finally { editParentsLoading.value = false }
}

async function fetchEditFamily(code: string) {
  editFamilyLoading.value = true
  try {
    const res = await api.get(`/admin/families/${code}`)
    editFamilyStudents.value = res.data?.students ?? []
    editFamilyParents.value  = res.data?.parents  ?? []
  } catch { /* non-critical */ }
  finally { editFamilyLoading.value = false }
}
async function saveEdit() {
  if (!editTarget.value || editSaving.value) return
  editSaving.value = true
  editError.value  = ''
  try {
    const { uid, firstName, lastName, gradeLevel, className, guardianEmail, status } = editTarget.value
    const res = await api.patch(`/admin/students/${uid}`, { firstName, lastName, gradeLevel, className, guardianEmail, status })
    const updated = res.data?.student ?? res.data
    const mapped = mapStudent(updated)
    const idx = students.value.findIndex(s => s.uid === uid)
    if (idx >= 0) students.value[idx] = mapped
    showEditModal.value = false
  } catch (err: any) {
    editError.value = err?.response?.data?.message ?? 'บันทึกไม่สำเร็จ'
  } finally {
    editSaving.value = false
  }
}

// Toggle active/inactive
const togglingUid = ref<string | null>(null)

async function toggleStatus(s: Student) {
  if (togglingUid.value) return
  togglingUid.value = s.uid
  const newStatus = s.status === 'active' ? 'inactive' : 'active'
  try {
    const res = await api.patch(`/admin/students/${s.uid}`, { status: newStatus })
    const updated = res.data?.student ?? res.data
    const mapped = mapStudent(updated)
    const idx = students.value.findIndex(x => x.uid === s.uid)
    if (idx >= 0) students.value[idx] = mapped
  } catch {
    // silently ignore — list not changed
  } finally {
    togglingUid.value = null
  }
}

// Enrollment code modal state
const showCodeModal   = ref(false)
const codeData        = ref<any>(null)
const generatingCode  = ref(false)
const copied          = ref<string | false>(false)
let   copiedTimer: ReturnType<typeof setTimeout> | null = null

function normalizeCodeData(data: any) {
  const first = data.pendingCodes?.[0] ?? null
  return { ...data, code: first?.code ?? null, expiresAt: first?.expiresAt ?? null, used: false, expired: false }
}

async function openCodeModal(student: Student) {
  showCodeModal.value = true
  codeData.value      = null
  try {
    const res = await api.get(`/admin/students/${student.uid}/code`)
    codeData.value = normalizeCodeData(res.data)
  } catch {
    codeData.value = {
      studentUid: student.uid,
      firstName:  student.firstName,
      lastName:   student.lastName,
      gradeLevel: student.gradeLevel,
      code:       null,
      expiresAt:  null,
      used:       false,
      expired:    false,
    }
  }
}

const codeError           = ref('')
const replacingParent1    = ref(false)
const showReplaceConfirm  = ref(false)

function replaceParent1() {
  if (!codeData.value || replacingParent1.value) return
  showReplaceConfirm.value = true
}

async function doReplaceParent1() {
  if (!codeData.value) return
  showReplaceConfirm.value = false
  replacingParent1.value   = true
  codeError.value          = ''
  try {
    const res = await api.post(`/admin/students/${codeData.value.studentUid}/code/replace-parent1`)
    codeData.value = normalizeCodeData(res.data)
  } catch (err: any) {
    codeError.value = err?.response?.data?.error?.message ?? 'สร้าง Code ไม่สำเร็จ'
  } finally {
    replacingParent1.value = false
  }
}

async function generateCode() {
  if (!codeData.value || generatingCode.value) return
  generatingCode.value = true
  codeError.value      = ''
  try {
    const res = await api.post(`/admin/students/${codeData.value.studentUid}/code/generate`)
    codeData.value = normalizeCodeData(res.data)
  } catch (err: any) {
    codeError.value = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? 'สร้าง Code ไม่สำเร็จ'
  } finally {
    generatingCode.value = false
  }
}

async function generateCodeForSlot(slotIdx: number) {
  if (!codeData.value || generatingCode.value) return
  generatingCode.value = true
  codeError.value      = ''
  try {
    const res = await api.post(`/admin/students/${codeData.value.studentUid}/code/generate`, { slot: slotIdx })
    codeData.value = normalizeCodeData(res.data)
  } catch (err: any) {
    codeError.value = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? 'สร้าง Code ไม่สำเร็จ'
  } finally {
    generatingCode.value = false
  }
}

function copyCodeEntry(code: string) {
  if (!code) return
  navigator.clipboard.writeText(code).then(() => {
    copied.value = code
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 2000)
  })
}

function formatExpiry(iso: string | Date | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' น.'
}

// Promote modal state
const promoteFromYear  = ref('2025/2026')
const promoteSearch    = ref('')
const expandedGrades   = ref<Set<string>>(new Set())
const promoteConfirmed = ref(false)
const promoting        = ref(false)
const selectedUids     = ref<Set<string>>(new Set())

// ── Computed ──────────────────────────────────────────────────────────────────
const availableClasses = computed(() => {
  const classes = [...new Set(students.value
    .filter(s => !filterGrade.value || s.gradeLevel === filterGrade.value)
    .map(s => s.className)
  )].sort()
  return classes
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return students.value.filter(s => {
    const matchSearch = !q || s.uid.toLowerCase().includes(q) ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
    const matchGrade  = !filterGrade.value  || s.gradeLevel === filterGrade.value
    const matchClass  = !filterClass.value  || s.className  === filterClass.value
    const matchStatus = !filterStatus.value || s.status     === filterStatus.value
    return matchSearch && matchGrade && matchClass && matchStatus
  })
})

// Wallet permissions (from shared store)
const walletsStore   = useWalletsStore()
const enabledWallets = computed(() => walletsStore.wallets.filter(w => w.enabled))

// Stat cards
const statTotal    = computed(() => students.value.length)
const statLinked   = computed(() => students.value.filter(s => s.parentCount > 0).length)
const statUnlinked = computed(() => students.value.filter(s => s.parentCount === 0 && s.status === 'active').length)

const totalPages   = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated    = computed(() => filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value))
const activeCount  = computed(() => filtered.value.filter(s => s.status === 'active').length)
const inactiveCount= computed(() => filtered.value.filter(s => s.status !== 'active').length)

// Promote computed
const promoteToYear = computed(() => {
  const parts = promoteFromYear.value.split('/')
  if (parts.length !== 2) return ''
  return `${+parts[0] + 1}/${+parts[1] + 1}`
})

const promoteGroups = computed(() => {
  const q = promoteSearch.value.toLowerCase()
  const groups: { from: string; to: string | null; students: Student[] }[] = []
  const activeStudents = students.value.filter(s => s.status === 'active')

  for (const grade of GRADES) {
    let list = activeStudents.filter(s => s.gradeLevel === grade)
    if (q) list = list.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.uid.toLowerCase().includes(q)
    )
    if (list.length === 0) continue
    const idx  = GRADES.indexOf(grade)
    const next = idx < GRADES.length - 1 ? GRADES[idx + 1] : null
    groups.push({ from: grade, to: next, students: list })
  }
  return groups
})

const totalToPromote = computed(() => selectedUids.value.size)

const hasGraduates = computed(() =>
  promoteGroups.value.some(g => g.from === 'S6' && g.students.some(s => selectedUids.value.has(s.uid)))
)

const allActiveUids = computed(() =>
  students.value
    .filter(s => s.status === 'active' && GRADES.includes(s.gradeLevel))
    .map(s => s.uid)
)

const isAllSelected = computed(() =>
  allActiveUids.value.length > 0 &&
  allActiveUids.value.every(uid => selectedUids.value.has(uid))
)

function isGradeAllSelected(group: { students: Student[] }) {
  return group.students.length > 0 && group.students.every(s => selectedUids.value.has(s.uid))
}
function isGradePartial(group: { students: Student[] }) {
  const cnt = group.students.filter(s => selectedUids.value.has(s.uid)).length
  return cnt > 0 && cnt < group.students.length
}
function gradeSelectedCount(group: { students: Student[] }) {
  return group.students.filter(s => selectedUids.value.has(s.uid)).length
}

// ── Methods ───────────────────────────────────────────────────────────────────
// ── Column definitions (ตรงกับ template) ─────────────────────────────────────
const TEMPLATE_COLUMNS = [
  { key: 'uid',           header: 'รหัสนักเรียน*',      example: 'STD-K1-0001',          note: 'รูปแบบ STD-{ชั้น}-{ลำดับ} เช่น STD-K1-0001' },
  { key: 'firstName',     header: 'ชื่อ*',               example: 'สมหญิง',                note: 'ชื่อจริงภาษาไทย' },
  { key: 'lastName',      header: 'นามสกุล*',            example: 'ใจดี',                  note: 'นามสกุลภาษาไทย' },
  { key: 'gradeLevel',    header: 'ชั้นปี*',             example: 'K1',                    note: 'K1, K2, P1-P6, S1-S6' },
  { key: 'className',     header: 'ห้องเรียน*',          example: 'K1-A',                  note: 'เช่น K1-A, P3-B, S1-C' },
  { key: 'dob',           header: 'วันเกิด',             example: '01/01/2563',            note: 'DD/MM/YYYY (ปี พ.ศ.)' },
  { key: 'guardianEmail', header: 'อีเมลผู้ปกครอง',     example: 'parent@example.com',    note: 'ใช้ส่งรหัส Verification' },
  { key: 'cardUid',       header: 'รหัสบัตร RFID',       example: '04A3B5C6D7E8',          note: 'UID จากบัตร RFID/NFC (ถ้ามี)' },
  { key: 'walletIds',    header: 'รหัสสิทธิ์',          example: 'W001,W003',             note: 'รหัส Wallet คั่นด้วย , เช่น W001,W003 (ถ้ามี)' },
]

const EXAMPLE_ROWS = [
  ['STD-K1-0001', 'สมหญิง',  'ใจดี',     'K1', 'K1-A', '15/03/2562', 'suchart@dulwich.ac.th', '04A3B5C6', 'W001,W004'],
  ['STD-K1-0002', 'สมชาย',   'ใจดี',     'K1', 'K1-A', '22/07/2562', 'suchart@dulwich.ac.th', '04B1C2D3', 'W001'],
  ['STD-K2-0008', 'มานี',    'สุขดี',    'K2', 'K2-A', '10/11/2561', 'somying@gmail.com',      '04C3D4E5', 'W001,W003'],
  ['STD-P3-0015', 'วิชัย',   'รักเรียน', 'P3', 'P3-B', '05/05/2559', 'vichai.p@example.com',   '04D5E6F7', ''],
  ['STD-S1-0003', 'อรุณี',   'ดีงาม',    'S1', 'S1-B', '30/09/2555', 'arunee.d@example.com',   '',         'W001,W005'],
]

// ── Import result state ────────────────────────────────────────────────────────
const importResult    = ref<{ success: number; errors: string[] } | null>(null)
const showImportResult = ref(false)
const showImportModal  = ref(false)
const importFile       = ref<File | null>(null)
const isDragOver       = ref(false)

function triggerImport() { csvInput.value?.click() }

function openFileSelect() { csvInput.value?.click() }

function onDragOver(e: DragEvent) { e.preventDefault(); isDragOver.value = true }
function onDragLeave()             { isDragOver.value = false }
function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && /\.(xlsx|xls|csv)$/i.test(file.name)) importFile.value = file
}
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) { importFile.value = file }
  ;(e.target as HTMLInputElement).value = ''
}

function closeImportModal() {
  showImportModal.value = false
  importFile.value = null
  isDragOver.value = false
}

// ── Download Template ──────────────────────────────────────────────────────────
function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Template with example rows
  const headers = TEMPLATE_COLUMNS.map(c => c.header)
  const notes   = ['หมายเหตุ:', ...TEMPLATE_COLUMNS.map(c => c.note)]
  const rows    = [headers, notes, ...EXAMPLE_ROWS]

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths
  ws['!cols'] = TEMPLATE_COLUMNS.map((_, i) => ({ wch: [18, 12, 14, 10, 12, 14, 26, 18, 22][i] ?? 16 }))

  // Style header row (row 0) — note: xlsx free tier has limited styling
  XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อนักเรียน')

  // Sheet 2: Instructions
  const instrRows = [
    ['คำแนะนำการกรอกข้อมูล'],
    [''],
    ['คอลัมน์', 'คำอธิบาย', 'ตัวอย่าง', 'จำเป็น'],
    ...TEMPLATE_COLUMNS.map(c => [c.header.replace('*',''), c.note, c.example, c.header.includes('*') ? 'ใช่' : 'ไม่จำเป็น']),
    [''],
    ['ชั้นปีที่รองรับ:', 'K1, K2, P1, P2, P3, P4, P5, P6, S1, S2, S3, S4, S5, S6'],
    ['รหัสสิทธิ์ที่ใช้ได้:', 'W001=กระเป๋าหลัก, W002=ชำระค่าอาหาร, W003=Pre-order, W004=Buffet Primary(฿170), W005=Buffet Secondary(฿150)'],
    ['ตัวอย่างรหัสสิทธิ์:', 'W001,W003  หรือ  W001,W004,W005  (คั่นด้วยเครื่องหมาย ,)'],
    ['รูปแบบรหัสนักเรียน:', 'STD-{ชั้น}-{ลำดับ 4 หลัก}  เช่น STD-K1-0001, STD-P3-0015'],
    ['ตัวอย่างห้องเรียน:', 'K1-A, K1-B, P3-A, P3-B, S1-C'],
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instrRows)
  wsInstr['!cols'] = [{ wch: 22 }, { wch: 42 }, { wch: 22 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'คำแนะนำ')

  XLSX.writeFile(wb, 'Student_Import_Template.xlsx')
}

// ── Confirm Import (called from modal) ────────────────────────────────────────
function confirmImport() {
  const file = importFile.value
  if (!file) return
  closeImportModal()
  processFile(file)
}

// ── Handle file input change (fallback) ────────────────────────────────────────
function handleImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(e.target as HTMLInputElement).value = ''
  processFile(file)
}

function processFile(file: File) {
  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb   = XLSX.read(data, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string,string>>(ws, { header: 1 }) as string[][]

      const parseErrors: string[] = []
      interface ParsedRow {
        firstName: string; lastName: string; gradeLevel: string
        className: string; guardianEmail?: string; uid?: string
        rowNum: number
      }
      const valid: ParsedRow[] = []

      for (let i = 2; i < rows.length; i++) {
        const r = rows[i]
        if (!r || r.every(c => !c)) continue

        const [uid, firstName, lastName, gradeLevel, className, , guardianEmail] = r.map(c => String(c ?? '').trim())

        if (!firstName || !lastName || !gradeLevel || !className) {
          parseErrors.push(`แถว ${i+1}: ข้อมูลจำเป็นไม่ครบ (ชื่อ/ชั้น/ห้อง)`)
          continue
        }
        if (!['K1','K2','P1','P2','P3','P4','P5','P6','S1','S2','S3','S4','S5','S6'].includes(gradeLevel)) {
          parseErrors.push(`แถว ${i+1}: ชั้นปี "${gradeLevel}" ไม่ถูกต้อง`)
          continue
        }
        valid.push({ firstName, lastName, gradeLevel, className, guardianEmail: guardianEmail || undefined, uid: uid || undefined, rowNum: i + 1 })
      }

      let successCount = 0
      const apiErrors: string[] = []
      for (const row of valid) {
        try {
          const payload: any = { firstName: row.firstName, lastName: row.lastName, gradeLevel: row.gradeLevel, className: row.className }
          if (row.guardianEmail) payload.guardianEmail = row.guardianEmail
          if (row.uid) payload.uid = row.uid
          await api.post('/admin/students', payload)
          successCount++
        } catch (err: any) {
          const msg = err?.response?.data?.message ?? 'เพิ่มไม่สำเร็จ'
          apiErrors.push(`แถว ${row.rowNum} (${row.firstName} ${row.lastName}): ${msg}`)
        }
      }

      if (successCount > 0) await fetchStudents()

      importResult.value    = { success: successCount, errors: [...parseErrors, ...apiErrors] }
      showImportResult.value = true
    } catch {
      importResult.value    = { success: 0, errors: ['ไม่สามารถอ่านไฟล์ได้ — กรุณาใช้ไฟล์ .xlsx หรือ .csv ตาม Template'] }
      showImportResult.value = true
    }
  }
  reader.readAsArrayBuffer(file)
}

function openPromoteModal() {
  // pre-select all active students
  selectedUids.value = new Set(
    students.value
      .filter(s => s.status === 'active' && GRADES.includes(s.gradeLevel))
      .map(s => s.uid)
  )
  promoteConfirmed.value = false
  promoteSearch.value    = ''
  expandedGrades.value   = new Set()
  showPromoteModal.value = true
}

function closePromoteModal() {
  showPromoteModal.value = false
  promoteSearch.value    = ''
  promoteConfirmed.value = false
  expandedGrades.value   = new Set()
  selectedUids.value     = new Set()
}

function toggleExpand(grade: string) {
  const next = new Set(expandedGrades.value)
  next.has(grade) ? next.delete(grade) : next.add(grade)
  expandedGrades.value = next
}

function toggleStudent(uid: string) {
  const next = new Set(selectedUids.value)
  next.has(uid) ? next.delete(uid) : next.add(uid)
  selectedUids.value     = next
  promoteConfirmed.value = false
}

function toggleGradeAll(group: { students: Student[] }) {
  const next      = new Set(selectedUids.value)
  const allChosen = group.students.every(s => next.has(s.uid))
  for (const s of group.students) {
    allChosen ? next.delete(s.uid) : next.add(s.uid)
  }
  selectedUids.value     = next
  promoteConfirmed.value = false
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedUids.value = new Set()
  } else {
    selectedUids.value = new Set(allActiveUids.value)
  }
  promoteConfirmed.value = false
}

const promoteError = ref('')

async function promoteAll() {
  if (!promoteConfirmed.value || promoting.value || selectedUids.value.size === 0) return
  promoting.value  = true
  promoteError.value = ''
  try {
    await api.post('/admin/promote', {
      fromYear:     promoteFromYear.value,
      toYear:       promoteToYear.value,
      studentUids:  [...selectedUids.value],
    })
    await fetchStudents()
    closePromoteModal()
  } catch (err: any) {
    promoteError.value = err?.response?.data?.message ?? 'เลื่อนชั้นไม่สำเร็จ'
  } finally {
    promoting.value = false
  }
}

// ── Map raw API student to local Student shape ────────────────────────────────
function mapStudent(s: any): Student {
  const grade = s.gradeLevel ?? s.grade_level ?? s.grade ?? ''
  return {
    uid:           s.uid ?? s._id,
    firstName:     s.firstName ?? s.first_name,
    lastName:      s.lastName  ?? s.last_name,
    gradeLevel:    grade,
    className:     s.className  ?? s.class_name  ?? '',
    guardianEmail: s.guardianEmail ?? s.guardian_email,
    cardUid:       s.cardUid ?? s.card_uid,
    cardStatus:    s.cardStatus ?? undefined,
    balance:       s.balance ?? 0,
    lowThreshold:  s.lowThreshold ?? 200,
    parentCount:   s.parentCount ?? 0,
    canPreorder:   PRE_ORDER_GRADES.includes(grade),
    buffetGroup:   ['K1','K2','P1','P2','P3','P4','P5','P6'].includes(grade) ? 'primary' : 'secondary',
    status:        s.status ?? 'active',
  }
}

const fetchError = ref('')

async function fetchStudents() {
  loading.value    = true
  fetchError.value = ''
  try {
    const res = await api.get('/admin/students')
    students.value = (res.data?.students ?? res.data ?? []).map(mapStudent)
  } catch (err: any) {
    fetchError.value = err?.response?.data?.message ?? 'โหลดข้อมูลไม่สำเร็จ'
    students.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchStudents()
  try {
    const years = await listAcademicYears()
    if (years.length > 0) {
      academicYears.value = years.map(y => y.year)
    }
  } catch {
    // keep fallback values
  }
})
</script>

<style scoped>
/* Header action buttons */
.adm-hdr-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 16px;
  border-radius: var(--radius-md);
  font-size: 13px; font-weight: 500;
  font-family: inherit; cursor: pointer;
  transition: opacity 0.15s;
  border: none;
  white-space: nowrap;
}
.adm-hdr-btn:active { opacity: 0.8; }
.adm-hdr-btn-primary { background: var(--color-primary); color: #fff; }
.adm-hdr-btn-ghost   { background: #fff; color: var(--color-text-secondary); border: 1px solid var(--color-border-tertiary); }
.adm-hdr-btn-warn    { background: var(--color-warning-bg); color: var(--color-warning); border: 1px solid #FFCC80; }
.adm-hdr-btn-soft    { background: var(--color-primary-tint); color: var(--color-primary); border: 1px solid transparent; }
.adm-hdr-btn-soft:hover { background: #d6e8fb; }

/* Filter inputs */
/* adm-filter-* and adm-search-btn moved to global style.css */

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.4);
}
.modal-box {
  position: fixed; top: 50%; left: 50%; z-index: 201;
  transform: translate(-50%,-50%);
  background: #fff; border-radius: 12px;
  width: calc(100% - 48px); max-width: 440px;
  padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.14);
}
.modal-title { font-size: 18px; font-weight: 500; color: #1C1C1E; margin-bottom: 8px; }
.modal-sub   { font-size: 13px; color: #3C3C43; line-height: 1.5; margin-bottom: 12px; }
.modal-warn  { font-size: 12px; background: var(--color-warning-bg); color: #C67100; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

/* Transitions */
.modal-bg-enter-active, .modal-bg-leave-active { transition: opacity 0.2s; }
.modal-bg-enter-from, .modal-bg-leave-to       { opacity: 0; }
.modal-up-enter-active, .modal-up-leave-active { transition: opacity 0.25s, transform 0.25s; }
.modal-up-enter-from, .modal-up-leave-to       { opacity: 0; transform: translate(-50%,-48%); }

/* ── Import modal ──────────────────────────────────────────────────── */
.imp-modal {
  position: fixed; top: 50%; left: 50%; z-index: 201;
  transform: translate(-50%,-50%);
  background: #fff; border-radius: 16px;
  width: calc(100vw - 48px); max-width: 560px;
  max-height: 90vh; overflow-y: auto;
  box-shadow: 0 16px 48px rgba(0,0,0,0.18);
}
.imp-header { display:flex; justify-content:space-between; align-items:center; padding:20px 24px 16px; }
.imp-title  { font-size:18px; font-weight:500; color:#1C1C1E; }
.imp-close  { background:none; border:none; cursor:pointer; color:#8E8E93; display:flex; align-items:center; padding:4px; border-radius:6px; transition:background 0.1s; }
.imp-close:hover { background:#F2F2F7; }
.imp-divider { height:1px; background:#F0F0F0; }

.imp-step { display:flex; align-items:flex-start; gap:14px; padding:20px 24px; }
.imp-step-num {
  width:32px; height:32px; border-radius:8px;
  background:var(--color-primary-tint);
  color:var(--color-primary);
  font-size:15px; font-weight:500;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.imp-step-title { font-size:15px; font-weight:500; color:#1C1C1E; margin-bottom:4px; }
.imp-step-sub   { font-size:13px; color:#8E8E93; line-height:1.5; margin-bottom:10px; }

.imp-dl-btn {
  display:inline-flex; align-items:center; gap:5px;
  font-size:14px; font-weight:500;
  color:var(--color-primary);
  background:none; border:none; cursor:pointer; padding:0;
  transition:opacity 0.15s;
}
.imp-dl-btn:active { opacity:0.7; }

/* Drop zone */
.imp-dropzone {
  border: 2px dashed #D0D0D0;
  border-radius: 12px;
  background: #FAFAFA;
  padding: 36px 24px;
  display: flex; flex-direction:column; align-items:center; justify-content:center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  min-height: 150px;
  -webkit-tap-highlight-color: transparent;
}
.imp-dropzone:hover, .imp-dropzone-over {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}
.imp-dropzone-has {
  border-color: var(--color-success);
  background: var(--color-success-bg);
}

.imp-upload-icon {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--color-primary);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.imp-dropzone-text {
  font-size: 14px; color: #3C3C43; text-align: center; line-height: 1.6;
}
.imp-select-link { color: var(--color-primary); font-weight: 500; cursor:pointer; }

/* Instructions */
.imp-instructions {
  margin: 0 24px 20px;
  background: var(--color-primary-tint);
  border-radius: 10px;
  padding: 14px 16px;
}

/* Footer */
.imp-footer {
  display:flex; gap:12px; padding:16px 24px 20px;
  border-top: 1px solid #F0F0F0;
}
.imp-btn-cancel {
  flex:1; height:48px; border-radius:12px;
  border:2px solid var(--color-primary);
  color:var(--color-primary); background:transparent;
  font-size:15px; font-weight:500; cursor:pointer;
  transition:background 0.15s;
}
.imp-btn-cancel:hover { background:var(--color-primary-tint); }

.imp-btn-confirm {
  flex:1; height:48px; border-radius:12px;
  border:none; background:#E5E5EA; color:#AEAEB2;
  font-size:15px; font-weight:500; cursor:not-allowed;
  transition:background 0.15s, color 0.15s;
}
.imp-btn-confirm-active {
  background:var(--color-primary); color:#fff; cursor:pointer;
}
.imp-btn-confirm-active:active { opacity:0.8; }

/* ── Promote modal ──────────────────────────────────────────────────── */
.promo-modal {
  position: fixed; top: 50%; left: 50%; z-index: 201;
  transform: translate(-50%,-50%);
  background: #fff; border-radius: 16px;
  width: calc(100vw - 48px); max-width: 520px;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 16px 48px rgba(0,0,0,0.16);
  overflow: hidden;
}
.promo-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20px 24px 16px;
  flex-shrink: 0;
}
.promo-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 17px; font-weight: 500; color: #1C1C1E; margin-bottom: 4px;
}
.promo-subtitle { font-size: 13px; color: #8E8E93; }
.promo-close {
  background: none; border: none; cursor: pointer;
  color: #8E8E93; padding: 4px; border-radius: 6px;
  display: flex; align-items: center; flex-shrink: 0;
  transition: background 0.1s;
}
.promo-close:hover { background: #F2F2F7; }
.promo-divider { height: 1px; background: #F0F0F0; flex-shrink: 0; }

.promo-body {
  padding: 18px 24px 4px;
  overflow-y: auto;
  flex: 1;
  display: flex; flex-direction: column; gap: 14px;
}

/* Year row */
.promo-year-row { display: flex; gap: 14px; }
.promo-year-col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.promo-label    { font-size: 12px; font-weight: 500; color: #8E8E93; }
.promo-select {
  height: 38px; padding: 0 10px; border-radius: 8px;
  border: 1px solid #E8E8E8; background: #fff;
  font-size: 14px; color: #1C1C1E; outline: none; cursor: pointer;
  font-family: inherit;
}
.promo-select:focus { border-color: var(--color-primary); }
.promo-year-readonly {
  height: 38px; padding: 0 12px; border-radius: 8px;
  border: 1px solid #E8E8E8; background: #F9F9F9;
  font-size: 14px; color: #3C3C43;
  display: flex; align-items: center;
}

/* Search */
.promo-search-wrap {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid #E8E8E8; border-radius: 8px;
  padding: 0 12px; height: 38px; background: #fff;
}
.promo-search {
  border: none; outline: none; flex: 1;
  font-size: 14px; color: #1C1C1E; background: transparent;
  font-family: inherit;
}
.promo-search::placeholder { color: #AEAEB2; }

/* Section title row */
.promo-section-title-row {
  display: flex; align-items: center; justify-content: space-between;
}
.promo-section-title {
  font-size: 13px; font-weight: 500; color: #3C3C43;
}
.promo-select-all-btn {
  font-size: 12px; color: var(--color-primary); background: none;
  border: none; cursor: pointer; padding: 0; font-family: inherit;
  font-weight: 500;
}
.promo-select-all-btn:hover { opacity: 0.8; }

/* Grade list */
.promo-list {
  display: flex; flex-direction: column; gap: 2px;
  border: 1px solid #F0F0F0; border-radius: 10px;
  overflow: hidden;
}
.promo-row-wrap { border-bottom: 1px solid #F0F0F0; }
.promo-row-wrap:last-child { border-bottom: none; }
.promo-row {
  width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: none;
  transition: background 0.1s;
}
.promo-row:hover { background: #F9F9F9; }
.promo-expand-btn {
  background: none; border: none; cursor: pointer; padding: 2px;
  display: flex; align-items: center; flex-shrink: 0;
}
.promo-grade-checkbox {
  width: 15px; height: 15px; cursor: pointer;
  accent-color: var(--color-primary); flex-shrink: 0;
}
.promo-grade-from { font-size: 14px; color: #3C3C43; font-weight: 500; }
.promo-grade-to   { font-size: 14px; color: #059669; font-weight: 500; }
.promo-grade-grad {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 14px; color: #059669; font-weight: 500;
}
.promo-count {
  margin-left: auto;
  font-size: 12px; color: #8E8E93;
  background: #F2F2F7; padding: 2px 10px; border-radius: 100px;
  white-space: nowrap; transition: background 0.15s, color 0.15s;
}
.promo-count-partial {
  background: #EBF5FF; color: var(--color-primary);
}
.promo-student-list {
  padding: 4px 14px 10px 50px;
  display: flex; flex-direction: column; gap: 4px;
  background: #FAFAFA;
}
.promo-student-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 6px; border-radius: 6px; cursor: pointer;
  transition: background 0.1s;
}
.promo-student-row:hover { background: #F0F0F0; }
.promo-student-name { font-size: 13px; color: #1C1C1E; flex: 1; }
.promo-student-uid  { font-size: 11px; color: #AEAEB2; font-family: monospace; }
.promo-empty { padding: 24px; text-align: center; font-size: 13px; color: #AEAEB2; }

/* Graduation warning */
.promo-warn-grad {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; border-radius: 8px;
  background: #FFFBEB; color: #92400E;
  font-size: 13px; border: 1px solid #FDE68A;
}

/* Confirmation checkbox */
.promo-confirm-wrap { padding: 14px 24px 16px; flex-shrink: 0; }
.promo-confirm-label {
  display: flex; align-items: flex-start; gap: 10px;
  cursor: pointer;
}
.promo-checkbox {
  width: 16px; height: 16px; cursor: pointer;
  accent-color: var(--color-primary); flex-shrink: 0; margin-top: 2px;
}
.promo-confirm-title { font-size: 14px; font-weight: 500; color: #1C1C1E; margin-bottom: 2px; }
.promo-confirm-sub   { font-size: 12px; color: #8E8E93; line-height: 1.5; }

/* Footer */
.promo-footer {
  display: flex; gap: 10px; padding: 14px 24px 20px;
  border-top: 1px solid #F0F0F0; flex-shrink: 0;
}
.promo-btn-cancel {
  flex: 1; height: 44px; border-radius: 10px;
  border: 1px solid #E8E8E8; background: #fff;
  font-size: 14px; font-weight: 500; color: #3C3C43;
  cursor: pointer; transition: background 0.1s; font-family: inherit;
}
.promo-btn-cancel:hover { background: #F2F2F7; }
.promo-btn-confirm {
  flex: 2; height: 44px; border-radius: 10px;
  border: none; background: #E5E5EA; color: #AEAEB2;
  font-size: 14px; font-weight: 500; cursor: not-allowed;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: background 0.15s, color 0.15s; font-family: inherit;
}
.promo-btn-confirm-active {
  background: var(--color-primary); color: #fff; cursor: pointer;
}
.promo-btn-confirm-active:hover  { opacity: 0.9; }
.promo-btn-confirm-active:active { opacity: 0.8; }

/* ── Enrollment Code modal ──────────────────────────────────────────── */
.code-modal {
  position: fixed; top: 50%; left: 50%; z-index: 201;
  transform: translate(-50%,-50%);
  background: #fff; border-radius: 16px;
  width: calc(100vw - 48px); max-width: 400px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.16);
  overflow: hidden;
}
.code-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 20px 14px;
}
.code-title { font-size: 16px; font-weight: 500; color: #1C1C1E; }
.code-body  { padding: 18px 20px 14px; display: flex; flex-direction: column; gap: 14px; }

.code-student-name {
  font-size: 18px; font-weight: 500; color: #1C1C1E;
  display: flex; align-items: center; gap: 8px;
}
.code-summary-row {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #6B7280;
  background: #F9FAFB; border: 1px solid #E5E7EB;
  border-radius: 8px; padding: 7px 10px;
}
.code-grade-badge {
  font-size: 11px; font-weight: 500; color: var(--color-primary);
  background: var(--color-primary-tint); padding: 2px 8px; border-radius: 100px;
}

/* Code box */
.code-box-wrap { margin: 2px 0; }
.code-box {
  display: flex; align-items: center; justify-content: space-between;
  background: #F2F2F7; border-radius: 10px; padding: 12px 14px;
  border: 1px solid #E8E8E8;
}
.code-box-empty { justify-content: center; padding: 14px; }
.code-text {
  font-family: 'Courier New', monospace;
  font-size: 18px; font-weight: 500; color: #1C1C1E;
  letter-spacing: 0.04em;
}
.code-copy-btn {
  background: none; border: none; cursor: pointer;
  color: #8E8E93; display: flex; align-items: center;
  padding: 4px; border-radius: 6px; transition: background 0.1s;
  flex-shrink: 0;
}
.code-copy-btn:hover { background: #E8E8E8; }

/* Expiry row */
.code-expiry-row {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #3C3C43;
}
.code-status {
  font-size: 11px; font-weight: 500; padding: 2px 8px;
  border-radius: 100px; white-space: nowrap;
}
.code-status-active  { background: #D1FAE5; color: #065F46; }
.code-status-expired { background: #FEE2E2; color: #991B1B; }
.code-status-used    { background: #F3F4F6; color: #6B7280; }
.code-expiry-text    { font-size: 14px; color: #1C1C1E; }

/* Warning */
.code-warn {
  display: flex; align-items: flex-start; gap: 7px;
  padding: 10px 12px; border-radius: 8px;
  background: #FFFBEB; color: #92400E;
  font-size: 13px; border: 1px solid #FDE68A;
}

/* Footer */
.code-footer {
  padding: 14px 20px 18px;
  border-top: 1px solid #F0F0F0;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.code-generate-btn {
  width: 100%; height: 46px; border-radius: 12px;
  background: var(--color-primary); color: #fff;
  border: none; cursor: pointer; font-size: 15px; font-weight: 500;
  display: flex; align-items: center; justify-content: center; gap: 7px;
  font-family: inherit; transition: opacity 0.15s;
}
.code-generate-btn:hover   { opacity: 0.9; }
.code-generate-btn:active  { opacity: 0.8; }
.code-generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.code-footer-note {
  font-size: 12px; color: #AEAEB2;
}
.code-linked-slots { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.code-linked-row {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: #059669;
  background: #F0FDF4; border: 1px solid #BBF7D0;
  border-radius: 6px; padding: 6px 10px;
}
.code-replace-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 5px;
  background: transparent; border: 1px solid #6B7280;
  color: #6B7280; font-size: 11px; font-family: inherit;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s;
}
.code-replace-btn:hover:not(:disabled) { border-color: var(--color-danger); color: var(--color-danger); }
.code-replace-btn:disabled { opacity: 0.5; cursor: not-allowed; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

/* ── Stat cards ─────────────────────────────────────────────────────── */
.stat-row {
  display: flex; gap: 12px; flex-wrap: wrap;
}
.stat-card {
  flex: 1; min-width: 150px;
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px; border-radius: 12px;
  border: 1px solid transparent;
}
.stat-icon { flex-shrink: 0; opacity: 0.85; }
.stat-body { display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: 12px; font-weight: 400; color: inherit; opacity: 0.75; }
.stat-value { font-size: 22px; font-weight: 500; color: inherit; line-height: 1.1; }

.stat-card-primary {
  background: #fff;
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.stat-card-success {
  background: #fff;
  border-color: var(--color-border-tertiary);
  color: #028A60;
}
.stat-card-info {
  background: #fff;
  border-color: var(--color-border-tertiary);
  color: var(--color-primary-dark);
}
.stat-card-danger {
  background: #fff;
  border-color: var(--color-border-tertiary);
  color: #CC3333;
}
.stat-card-ghost {
  background: #fff;
  border-color: var(--color-border-tertiary);
  color: var(--color-text-secondary);
}

/* ── Edit / RFID fields ─────────────────────────────────────────────── */
.edit-field-row { display: flex; gap: 12px; }
.edit-field     { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.edit-info-row  { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #F0F0F0; }
.edit-info-row:last-child { border-bottom: none; }
.edit-info-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.edit-input {
  height: 38px; padding: 0 12px; border-radius: 8px;
  border: 1px solid #E8E8E8; font-size: 14px; color: #1C1C1E;
  outline: none; font-family: inherit; background: #fff;
  transition: border-color 0.15s;
}
.edit-input:focus { border-color: var(--color-primary); }

/* success action button */
.adm-action-btn.success:hover { background: #D1FAE5; color: #065F46; }
</style>
