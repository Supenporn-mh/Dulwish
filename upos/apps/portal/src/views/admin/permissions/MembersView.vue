<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 style="font-size:22px;font-weight:500;color:var(--color-text-primary)">จัดการสมาชิก</h2>
      <div class="flex gap-2 flex-wrap">
        <button class="adm-hdr-btn adm-hdr-btn-soft" :disabled="exportingCodes" @click="downloadCodes">
          <PhDownloadSimple :size="14" />
          {{ exportingCodes ? 'กำลังสร้าง...' : 'ดาวน์โหลด Enrollment Code' }}
        </button>
        <button class="adm-hdr-btn adm-hdr-btn-ghost" @click="showImportModal = true" title="นำเข้าข้อมูล (ดาวน์โหลด template เท่านั้น)">
          <PhUploadSimple :size="14" /> นำเข้าไฟล์ Excel
        </button>
        <button class="adm-hdr-btn adm-hdr-btn-primary" @click="openAddModal">
          <PhPlus :size="14" /> เพิ่มสมาชิก
        </button>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="stat-row">
      <div class="stat-card stat-card-primary">
        <PhUsers :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">สมาชิกทั้งหมด</span>
          <span class="stat-value">{{ members.length }}</span>
        </div>
      </div>
      <div class="stat-card stat-card-success">
        <PhSmiley :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">ติดตาม</span>
          <span class="stat-value">{{ activeCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-card-danger">
        <PhSmileySad :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">ยังไม่ติดตาม</span>
          <span class="stat-value">{{ inactiveCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-card-ghost">
        <PhShieldCheck :size="28" weight="light" class="stat-icon" />
        <div class="stat-body">
          <span class="stat-label">มีบัตร RFID</span>
          <span class="stat-value">{{ withCardCount }}</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="adm-table-wrap p-4" style="border-radius:10px">
      <div class="flex flex-wrap gap-3">
        <input v-model="search" class="adm-filter-input" placeholder="ค้นหาชื่อ / รหัสสมาชิก..." style="min-width:220px" />
        <select v-model="filterRole" class="adm-filter-select">
          <option value="">ประเภททั้งหมด</option>
          <option value="staff">สตาฟ</option>
          <option value="teacher">คุณครู</option>
          <option value="parent">ผู้ปกครอง</option>
        </select>
        <select v-model="filterStatus" class="adm-filter-select">
          <option value="">สถานะทั้งหมด</option>
          <option value="active">เปิดใช้งาน</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
        <button class="adm-search-btn" @click="currentPage = 1">ค้นหา</button>
      </div>
    </div>

    <!-- Error banner -->
    <div v-if="loadError" style="padding:10px 14px;border-radius:8px;background:var(--color-danger-bg,#FEE2E2);color:var(--color-danger,#CC3333);font-size:13px">
      {{ loadError }}
    </div>

    <!-- Table -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th class="center" style="width:52px">ลำดับ</th>
            <th>รหัสสมาชิก</th>
            <th>ชื่อ-นามสกุล</th>
            <th class="center">ประเภท</th>
            <th>บัตร RFID</th>
            <th class="right">ยอดเงิน (฿)</th>
            <th class="center">สิทธิ์</th>
            <th class="center">สถานะ</th>
            <th class="center" style="width:100px">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="center" style="padding:32px;color:var(--color-text-tertiary)">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="paginated.length === 0">
            <td colspan="9" class="center" style="padding:32px;color:var(--color-text-tertiary)">ไม่พบสมาชิก</td>
          </tr>
          <tr v-for="(m, i) in paginated" :key="m.uid">
            <td class="num center">{{ (currentPage-1)*pageSize + i + 1 }}</td>
            <td><span class="adm-code">{{ m.uid }}</span></td>
            <td>
              <div style="font-weight:500;color:var(--color-primary)">{{ m.firstName }} {{ m.lastName }}</div>
              <div v-if="m.email" style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px">{{ m.email }}</div>
            </td>
            <td class="center">
              <span :class="['role-badge', `role-badge-${m.role}`]">{{ roleLabel(m.role) }}</span>
            </td>
            <td>
              <div v-if="m.cardUid" class="flex items-center gap-1.5">
                <span class="adm-code" style="font-size:11px">{{ m.cardUid }}</span>
                <span :class="['adm-badge', m.cardStatus === 'active' ? 'adm-badge-success' : m.cardStatus === 'lost' ? 'adm-badge-void' : 'adm-badge-voided']"
                  style="font-size:10px;padding:2px 7px">
                  {{ m.cardStatus === 'active' ? 'ใช้งาน' : m.cardStatus === 'lost' ? 'หาย' : 'ปิด' }}
                </span>
              </div>
              <span v-else style="color:var(--color-text-tertiary);font-size:12px">ยังไม่มีบัตร</span>
            </td>
            <td class="right">
              <span :style="{ fontWeight:'500', color: m.balance < 200 ? 'var(--color-danger)' : 'var(--color-success)' }">
                ฿{{ m.balance.toLocaleString('th-TH', {minimumFractionDigits:2}) }}
              </span>
              <div v-if="m.balance < 200" style="font-size:10px;color:var(--color-warning);margin-top:1px">⚠ ต่ำกว่า ฿200</div>
            </td>
            <td class="center">
              <div class="flex flex-col items-center gap-1">
                <span
                  v-for="w in enabledWallets"
                  :key="w.id"
                  class="adm-badge adm-badge-topup"
                  style="font-size:10px;padding:2px 8px;white-space:nowrap"
                >{{ w.name }}</span>
                <span v-if="enabledWallets.length === 0" style="font-size:11px;color:var(--color-text-tertiary)">—</span>
              </div>
            </td>
            <td class="center">
              <span class="adm-status">
                <span :class="['adm-dot', m.status === 'active' ? 'adm-dot-success' : 'adm-dot-gray']" />
                <span :style="{color: m.status==='active' ? '#028A60' : '#8E8E93'}">
                  {{ m.status === 'active' ? 'เปิดใช้' : 'ปิดใช้' }}
                </span>
              </span>
            </td>
            <td>
              <div class="adm-actions">
                <button class="adm-action-btn" title="แก้ไข" @click="openEdit(m)">
                  <PhPencilSimple :size="14" />
                </button>
                <button class="adm-action-btn" title="Enrollment Code" @click="openCodeModal(m)">
                  <PhKey :size="14" />
                </button>
                <button
                  :class="['adm-action-btn', m.status === 'active' ? 'danger' : 'success']"
                  :title="m.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'"
                  :disabled="!!togglingStatus[m.uid]"
                  @click="toggleStatus(m)"
                >
                  <PhProhibit v-if="m.status === 'active'" :size="14" />
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

    <!-- Edit Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showEditModal" class="modal-backdrop" @click="showEditModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showEditModal && editTarget" class="imp-modal" style="max-width:460px">
          <div class="imp-header">
            <h3 class="imp-title">{{ editTarget.uid ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิก' }}</h3>
            <button class="imp-close" @click="showEditModal=false"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="imp-divider" />
          <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px">
            <!-- Role select — only for new member creation -->
            <div v-if="!editTarget.uid" class="edit-field">
              <label class="promo-label">ประเภทผู้ใช้งาน</label>
              <select v-model="editTarget.role" class="promo-select" style="width:100%">
                <option value="staff">สตาฟ</option>
                <option value="teacher">คุณครู</option>
                <option value="parent">ผู้ปกครอง</option>
              </select>
            </div>
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
            <div class="edit-field">
              <label class="promo-label">อีเมล</label>
              <input v-model="editTarget.email" class="edit-input" placeholder="email@example.com" />
            </div>
            <div class="edit-field-row" style="align-items:flex-end">
              <div class="edit-field" style="flex:2">
                <label class="promo-label">รหัสบัตร RFID <span style="color:var(--color-text-tertiary);font-weight:400">(ถ้ามี)</span></label>
                <input v-model="editTarget.cardUid" class="edit-input" style="font-family:monospace" />
              </div>
              <div class="edit-field">
                <label class="promo-label">สถานะบัตร</label>
                <select v-model="editTarget.cardStatus" class="promo-select" :disabled="!editTarget.cardUid">
                  <option value="active">ใช้งาน</option>
                  <option value="inactive">ปิด</option>
                  <option value="lost">หาย</option>
                </select>
              </div>
            </div>
          </div>
          <div v-if="saveEditError" style="padding:0 24px 12px;font-size:12px;color:var(--color-danger,#CC3333)">{{ saveEditError }}</div>
          <div class="imp-footer">
            <button class="imp-btn-cancel" :disabled="savingEdit" @click="showEditModal=false">ยกเลิก</button>
            <button class="imp-btn-confirm imp-btn-confirm-active" :disabled="savingEdit" @click="saveEdit">{{ savingEdit ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Member Detail Panel (full-page overlay) -->
    <Teleport to="body">
      <Transition name="pdt-fade">
        <div v-if="showDetailModal && detailMember" class="pdt-panel">

          <!-- Sticky back bar -->
          <div class="pdt-backbar">
            <button class="pdt-back-btn" @click="tryCloseDetail">
              <PhArrowLeft :size="15" weight="bold" /> กลับ
            </button>
            <span class="pdt-backbar-title">ข้อมูลสมาชิก</span>
          </div>

          <div class="pdt-inner">

            <!-- Header card -->
            <div class="pdt-header-card">
              <div class="pdt-avatar-lg">{{ detailMember.firstName.charAt(0) }}</div>
              <div style="flex:1;min-width:0">
                <div class="pdt-fullname">{{ detailMember.firstName }} {{ detailMember.lastName }}</div>
                <div class="pdt-meta">
                  <span :class="['role-badge', `role-badge-${detailMember.role}`]">{{ roleLabel(detailMember.role) }}</span>
                  <span :class="['adm-badge', detailMember.status === 'active' ? 'adm-badge-success' : 'adm-badge-voided']" style="font-size:10px;padding:2px 8px">
                    {{ detailMember.status === 'active' ? 'Active' : 'Inactive' }}
                  </span>
                  <span class="adm-code" style="font-size:11px">{{ detailMember.uid }}</span>
                </div>
              </div>
            </div>

            <!-- Body card -->
            <div class="pdt-body-card">

              <!-- โปรไฟล์ -->
              <div class="pdt-section">
                <div class="pdt-section-header">
                  <div class="pdt-section-title"><PhUser :size="14" weight="fill" style="color:var(--color-primary)" /> โปรไฟล์</div>
                  <button v-if="!detailEditing" class="pdt-edit-btn" @click="startDetailEdit">
                    <PhPencilSimple :size="13" /> แก้ไข
                  </button>
                </div>

                <!-- View mode -->
                <div v-if="!detailEditing" class="pdt-profile-grid">
                  <div class="pdt-profile-item">
                    <div class="pdt-profile-label">ชื่อ-นามสกุล</div>
                    <div class="pdt-profile-value">{{ detailMember.firstName }} {{ detailMember.lastName }}</div>
                  </div>
                  <div class="pdt-profile-item">
                    <div class="pdt-profile-label">อีเมล</div>
                    <div class="pdt-profile-value">{{ detailMember.email || '—' }}</div>
                  </div>
                  <div class="pdt-profile-item">
                    <div class="pdt-profile-label">บทบาท</div>
                    <div class="pdt-profile-value">{{ roleLabel(detailMember.role) }}</div>
                  </div>
                  <div class="pdt-profile-item">
                    <div class="pdt-profile-label">สถานะ</div>
                    <div class="pdt-profile-value">{{ detailMember.status === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}</div>
                  </div>
                  <div v-if="detailMember.role !== 'parent'" class="pdt-profile-item">
                    <div class="pdt-profile-label">รหัสบัตร RFID</div>
                    <div class="pdt-profile-value">
                      <span v-if="detailMember.cardUid" class="adm-code" style="font-size:12px">{{ detailMember.cardUid }}</span>
                      <span v-else style="color:var(--color-text-tertiary)">ยังไม่มีบัตร</span>
                    </div>
                  </div>
                  <div class="pdt-profile-item">
                    <div class="pdt-profile-label">ยอดเงิน</div>
                    <div class="pdt-profile-value" :style="{ color: detailMember.balance < 200 ? 'var(--color-danger)' : 'var(--color-success)' }">
                      ฿{{ detailMember.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 }) }}
                    </div>
                  </div>
                </div>

                <!-- Edit mode -->
                <div v-else class="pdt-edit-form">
                  <div class="pdt-edit-row">
                    <div class="edit-field">
                      <label class="promo-label">ชื่อ</label>
                      <input v-model="detailForm.firstName" class="edit-input" />
                    </div>
                    <div class="edit-field">
                      <label class="promo-label">นามสกุล</label>
                      <input v-model="detailForm.lastName" class="edit-input" />
                    </div>
                  </div>
                  <div class="edit-field">
                    <label class="promo-label">อีเมล</label>
                    <input v-model="detailForm.email" class="edit-input" type="email" />
                  </div>
                  <div v-if="detailMember.role !== 'parent'" class="pdt-edit-row">
                    <div class="edit-field" style="flex:2">
                      <label class="promo-label">รหัสบัตร RFID</label>
                      <input v-model="detailForm.cardUid" class="edit-input" style="font-family:monospace" />
                    </div>
                    <div class="edit-field">
                      <label class="promo-label">สถานะบัตร</label>
                      <select v-model="detailForm.cardStatus" class="promo-select" :disabled="!detailForm.cardUid">
                        <option value="active">ใช้งาน</option>
                        <option value="inactive">ปิด</option>
                        <option value="lost">หาย</option>
                      </select>
                    </div>
                  </div>
                  <div v-if="detailSaveError" style="font-size:12px;color:var(--color-danger)">{{ detailSaveError }}</div>
                  <div class="pdt-edit-actions">
                    <button class="adm-hdr-btn adm-hdr-btn-ghost" style="flex:1" :disabled="detailSaving" @click="detailEditing=false">ยกเลิก</button>
                    <button class="adm-hdr-btn adm-hdr-btn-primary" style="flex:1" :disabled="detailSaving" @click="saveDetailEdit">
                      {{ detailSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Enrollment Code -->
              <div class="pdt-section">
                <div class="pdt-section-header" style="margin-bottom:10px">
                  <div class="pdt-section-title"><PhKey :size="14" weight="fill" style="color:var(--color-primary)" /> Enrollment Code</div>
                </div>
                <div v-if="detailCodeLoading" style="font-size:13px;color:var(--color-text-tertiary)">กำลังโหลด...</div>
                <div v-else>
                  <div class="code-box-wrap" style="margin-bottom:8px">
                    <div v-if="detailCodeData?.code" class="code-box">
                      <span class="code-text">{{ detailCodeData.code }}</span>
                      <button class="code-copy-btn" @click="copyDetailCode">
                        <PhCheckCircle v-if="detailCodeCopied" :size="16" weight="fill" style="color:#059669" />
                        <PhCopy v-else :size="16" />
                      </button>
                    </div>
                    <div v-else class="code-box code-box-empty">
                      <span style="color:var(--color-text-tertiary);font-size:13px">ยังไม่มี Code</span>
                    </div>
                  </div>
                  <div v-if="detailCodeData?.code" class="code-expiry-row" style="margin-bottom:10px">
                    <span :class="['code-status', detailCodeData.used ? 'code-status-used' : detailCodeData.expired ? 'code-status-expired' : 'code-status-active']">
                      {{ detailCodeData.used ? 'ใช้งานแล้ว' : detailCodeData.expired ? 'หมดอายุ' : 'ใช้งานได้' }}
                    </span>
                    <span class="code-expiry-text">หมดอายุ {{ formatExpiry(detailCodeData.expiresAt) }}</span>
                  </div>
                  <div v-if="detailCodeData?._generateError" style="font-size:12px;color:var(--color-danger);margin-bottom:8px">{{ detailCodeData._generateError }}</div>
                  <button class="code-generate-btn" :disabled="detailCodeGenerating" @click="generateDetailCode">
                    <PhArrowClockwise :size="15" :class="{ 'spin': detailCodeGenerating }" />
                    {{ detailCodeGenerating ? 'กำลังสร้าง...' : 'สร้าง Code ใหม่' }}
                  </button>
                  <p class="code-footer-note" style="margin-top:6px;margin-bottom:0">Code มีอายุ 14 วัน</p>
                </div>
              </div>

              <!-- กลุ่มครอบครัว -->
              <div v-if="detailFamilyCodes.length > 0" class="pdt-section">
                <div class="pdt-section-title" style="margin-bottom:12px">
                  <PhUsersThree :size="14" weight="fill" style="color:var(--color-primary)" />
                  กลุ่มครอบครัว
                </div>
                <div v-for="fc in detailFamilyCodes" :key="fc" class="pdt-fam-group">
                  <div class="pdt-fam-code-label">{{ fc }}</div>
                  <div class="pdt-fam-cards">
                    <div class="pdt-fam-card pdt-fam-card-parent">
                      <div class="pdt-fam-avatar">{{ detailMember.firstName.charAt(0) }}</div>
                      <div class="pdt-fam-card-info">
                        <div class="pdt-fam-card-name">{{ detailMember.firstName }} {{ detailMember.lastName }}</div>
                        <div class="pdt-fam-badges">
                          <span :class="['role-badge', `role-badge-${detailMember.role}`]">{{ roleLabel(detailMember.role) }}</span>
                        </div>
                        <div style="font-size:11px;color:var(--color-text-tertiary)">{{ detailMember.uid }}</div>
                      </div>
                    </div>
                    <div v-for="s in detailStudentsByFam(fc)" :key="s.studentUid" class="pdt-fam-card">
                      <div class="pdt-fam-avatar pdt-fam-avatar-student">{{ s.firstName.charAt(0) }}</div>
                      <div class="pdt-fam-card-info">
                        <div class="pdt-fam-card-name">{{ s.firstName }} {{ s.lastName }}</div>
                        <div class="pdt-fam-badges">
                          <span class="adm-badge adm-badge-topup" style="font-size:10px;padding:2px 6px">นักเรียน</span>
                          <span class="adm-badge adm-badge-voided" style="font-size:10px;padding:2px 6px">{{ s.gradeLevel }}</span>
                        </div>
                        <div style="font-size:11px;color:var(--color-text-tertiary)">{{ s.studentUid }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- นักเรียนที่ผูก -->
              <div class="pdt-section">
                <div class="pdt-section-header">
                  <div class="pdt-section-title">
                    <PhLink :size="14" weight="fill" style="color:var(--color-primary)" />
                    นักเรียนที่ผูก
                  </div>
                  <span class="pdt-count">{{ detailStudents.length }} คน</span>
                </div>

                <div v-if="detailLoading" style="padding:24px;text-align:center;color:var(--color-text-tertiary);font-size:13px">กำลังโหลด...</div>
                <div v-else-if="detailStudents.length === 0" style="padding:16px 0;text-align:center;color:var(--color-text-tertiary);font-size:13px">
                  ยังไม่มีนักเรียนที่ผูกกับสมาชิกคนนี้
                </div>
                <div v-else class="adm-table-wrap" style="margin-top:8px">
                  <table class="adm-table">
                    <thead>
                      <tr>
                        <th>ชื่อ-นามสกุล</th>
                        <th class="center">รหัส</th>
                        <th class="center">ชั้น</th>
                        <th class="center">กลุ่มครอบครัว</th>
                        <th>Card UID</th>
                        <th class="center" style="width:70px">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="s in detailStudents" :key="s.studentUid">
                        <td>
                          <div style="font-weight:500;color:var(--color-primary)">{{ s.firstName }} {{ s.lastName }}</div>
                          <div v-if="s.isPrimary" style="font-size:11px;color:var(--color-text-tertiary)">ผู้ปกครองหลัก</div>
                        </td>
                        <td class="center"><span class="adm-code" style="font-size:11px">{{ s.studentUid }}</span></td>
                        <td class="center">
                          <span v-if="s.gradeLevel" class="adm-badge adm-badge-voided" style="font-size:11px;padding:2px 8px">{{ s.gradeLevel }}</span>
                          <span v-else style="color:var(--color-text-tertiary)">—</span>
                        </td>
                        <td class="center">
                          <span v-if="s.familyCode" class="adm-badge adm-badge-topup" style="font-size:11px;padding:2px 8px">{{ s.familyCode }}</span>
                          <span v-else style="color:var(--color-text-tertiary)">—</span>
                        </td>
                        <td>
                          <span v-if="s.cardUid" class="adm-code" style="font-size:11px">{{ s.cardUid }}</span>
                          <span v-else style="color:var(--color-text-tertiary);font-size:12px">ยังไม่มีบัตร</span>
                        </td>
                        <td class="center">
                          <button
                            v-if="!confirmUnlinkId || confirmUnlinkId !== s.linkId"
                            class="adm-action-btn danger"
                            title="ยกเลิกการผูก"
                            :disabled="!!unlinkingId"
                            @click="confirmUnlinkId = s.linkId"
                          >
                            <PhLinkBreak :size="14" />
                          </button>
                          <div v-else class="pdt-unlink-confirm">
                            <span style="font-size:11px;color:var(--color-danger)">ยืนยัน?</span>
                            <button class="pdt-unlink-yes" :disabled="!!unlinkingId" @click="unlinkStudent(s)">
                              {{ unlinkingId === s.linkId ? '...' : 'ใช่' }}
                            </button>
                            <button class="pdt-unlink-no" @click="confirmUnlinkId = null">ไม่</button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div><!-- end pdt-body-card -->
          </div><!-- end pdt-inner -->
        </div>
      </Transition>
    </Teleport>

    <!-- Unsaved Changes Warning -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showUnsavedModal" class="modal-backdrop" @click="showUnsavedModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showUnsavedModal" class="unsaved-modal">
          <div class="unsaved-icon-wrap">
            <PhWarning :size="28" weight="fill" style="color:#F59E0B" />
          </div>
          <h3 class="unsaved-title">ยังไม่ได้บันทึก</h3>
          <p class="unsaved-body">ถ้าออกตอนนี้ ข้อมูลที่แก้ไขจะหายไป</p>
          <div class="unsaved-actions">
            <button class="adm-hdr-btn adm-hdr-btn-ghost" style="flex:1" @click="showUnsavedModal=false">กลับไปแก้ไข</button>
            <button class="adm-hdr-btn" style="flex:1;background:#EF4444;color:#fff;border-color:#EF4444" @click="confirmCloseDetail">ออกโดยไม่บันทึก</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Enrollment Code Modal -->
    <Teleport to="body">
      <Transition name="modal-bg">
        <div v-if="showCodeModal" class="modal-backdrop" @click="showCodeModal=false" />
      </Transition>
      <Transition name="modal-up">
        <div v-if="showCodeModal" class="code-modal">
          <div class="code-header">
            <h3 class="code-title">Enrollment Code</h3>
            <button class="promo-close" @click="showCodeModal=false"><PhX :size="18" weight="bold" /></button>
          </div>
          <div class="promo-divider" />
          <div class="code-body">
            <div v-if="codeData" class="code-student-name">
              {{ codeData.firstName }} {{ codeData.lastName }}
            </div>
            <div class="code-box-wrap">
              <div v-if="codeData?.code" class="code-box">
                <span class="code-text">{{ codeData.code }}</span>
                <button class="code-copy-btn" @click="copyCode">
                  <PhCheckCircle v-if="copied" :size="16" weight="fill" style="color:#059669" />
                  <PhCopy v-else :size="16" />
                </button>
              </div>
              <div v-else class="code-box code-box-empty">
                <span style="color:var(--color-text-tertiary);font-size:13px">ยังไม่มี Code</span>
              </div>
            </div>
            <div v-if="codeData?.code" class="code-expiry-row">
              <span :class="['code-status', codeData.used ? 'code-status-used' : codeData.expired ? 'code-status-expired' : 'code-status-active']">
                {{ codeData.used ? 'ใช้งานแล้ว' : codeData.expired ? 'หมดอายุ' : 'ใช้งานได้' }}
              </span>
              <span class="code-expiry-text">หมดอายุ {{ formatExpiry(codeData.expiresAt) }}</span>
            </div>
          </div>
          <div v-if="codeData?._generateError" style="padding:0 20px 8px;font-size:12px;color:var(--color-danger,#CC3333)">{{ codeData._generateError }}</div>
          <div class="promo-divider" />
          <div class="code-footer">
            <button class="code-generate-btn" :disabled="generatingCode" @click="generateCode">
              <PhArrowClockwise :size="15" :class="{ 'spin': generatingCode }" />
              {{ generatingCode ? 'กำลังสร้าง...' : 'สร้าง Code ใหม่' }}
            </button>
            <p class="code-footer-note">Code มีอายุ 14 วัน</p>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>

  <!-- Import Modal -->
  <Teleport to="body">
    <Transition name="modal-bg">
      <div v-if="showImportModal" class="modal-backdrop" @click="closeImport" />
    </Transition>
    <Transition name="modal-up">
      <div v-if="showImportModal" class="imp-modal-mem">
        <div class="imp-header">
          <h3 class="imp-title">นำเข้าข้อมูล</h3>
          <button class="imp-close" @click="closeImport"><PhX :size="18" weight="bold" /></button>
        </div>
        <div class="imp-divider" />
        <div class="imp-step">
          <div class="imp-step-num">1</div>
          <div class="flex-1">
            <p class="imp-step-title">แก้ไขข้อมูลจากไฟล์ต้นฉบับ</p>
            <p class="imp-step-sub">เพื่อให้แน่ใจว่าข้อมูลของคุณถูกจัดรูปแบบอย่างถูกต้อง</p>
            <button class="imp-dl-btn" @click="downloadTemplate">
              <PhDownloadSimple :size="14" weight="bold" /> ดาวน์โหลดไฟล์ต้นฉบับ
            </button>
          </div>
        </div>
        <div class="imp-divider" />
        <div class="imp-step" style="align-items:flex-start">
          <div class="imp-step-num">2</div>
          <div class="flex-1">
            <p class="imp-step-title">อัปโหลดไฟล์</p>
            <p class="imp-step-sub">รองรับสูงสุด 1,000 รายการต่อไฟล์</p>
            <div class="imp-dropzone" :class="{'imp-dropzone-over':isDragOver,'imp-dropzone-has':!!importFileMem}"
              @dragover="(e)=>{e.preventDefault();isDragOver=true}" @dragleave="isDragOver=false"
              @drop.prevent="(e)=>{isDragOver=false;const f=e.dataTransfer?.files?.[0];if(f&&/\.xlsx$/i.test(f.name))importFileMem=f}"
              @click="memFileInput?.click()">
              <div v-if="!importFileMem" style="display:flex;flex-direction:column;align-items:center;gap:8px">
                <div class="imp-upload-icon"><PhCloudArrowUp :size="26" weight="fill" color="white" /></div>
                <p style="font-size:14px;color:#3C3C43;text-align:center">ลากและวางไฟล์ตรงนี้ หรือ <span style="color:var(--color-primary);font-weight:500">เลือกไฟล์</span></p>
              </div>
              <div v-else style="display:flex;flex-direction:column;align-items:center;gap:6px">
                <PhFileXls :size="36" weight="fill" style="color:var(--color-primary)" />
                <p style="font-size:14px;font-weight:500;color:var(--color-primary)">{{ importFileMem.name }}</p>
              </div>
            </div>
            <input ref="memFileInput" type="file" accept=".xlsx" style="display:none" @change="(e)=>{const f=(e.target as HTMLInputElement).files?.[0];if(f)importFileMem=f;(e.target as HTMLInputElement).value=''}" />
          </div>
        </div>
        <div class="imp-instructions">
          <p style="font-size:13px;font-weight:500;color:var(--color-primary);margin-bottom:8px">คำแนะนำ:</p>
          <ul style="padding-left:16px;display:flex;flex-direction:column;gap:5px">
            <li style="font-size:13px;color:#3C3C43">การอัปโหลดไฟล์ Excel ใช้เพิ่ม/อัปเดต รายการเท่านั้น ไม่สามารถลบได้</li>
            <li style="font-size:13px;color:#3C3C43">รองรับเฉพาะไฟล์ที่มีนามสกุล .xlsx เท่านั้น</li>
            <li style="font-size:13px;color:#3C3C43">รหัสสิทธิ์: W001,W002,W003,W004,W005 คั่นด้วย ,</li>
          </ul>
        </div>
        <div style="padding:0 24px 12px;font-size:12px;color:var(--color-text-tertiary)">
          ⚠ การนำเข้าผ่านไฟล์ Excel ยังไม่รองรับในขณะนี้ (ยังไม่มี endpoint)
        </div>
        <div class="imp-footer">
          <button class="imp-btn-cancel" @click="closeImport">ยกเลิก</button>
          <button class="imp-btn-confirm" disabled title="ยังไม่รองรับ">ยืนยัน</button>
        </div>
      </div>
    </Transition>
  </Teleport>

</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  PhPlus, PhDownloadSimple, PhUploadSimple, PhPencilSimple,
  PhKey, PhProhibit, PhCheckCircle, PhX, PhCopy, PhArrowClockwise,
  PhUsers, PhSmiley, PhSmileySad, PhShieldCheck,
  PhCloudArrowUp, PhFileXls, PhUsersThree, PhLink, PhLinkBreak, PhUser, PhArrowLeft, PhWarning,
} from '@phosphor-icons/vue'
import { useWalletsStore } from '@/stores/wallets'
import api from '@/api/axios'
import * as XLSX from 'xlsx'

interface Member {
  uid:         string
  firstName:   string
  lastName:    string
  email?:      string
  cardUid?:    string
  cardStatus?: 'active' | 'inactive' | 'lost'
  balance:     number
  role:        string
  status:      'active' | 'inactive'
}


const walletsStore   = useWalletsStore()
const enabledWallets = computed(() => walletsStore.wallets.filter(w => w.enabled))

const loading     = ref(false)
const loadError   = ref('')
const members     = ref<Member[]>([])
const search      = ref('')
const filterRole  = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize    = ref(10)

async function fetchMembers() {
  loading.value   = true
  loadError.value = ''
  try {
    const res = await api.get('/users', { params: { role: undefined } })
    const raw: any[] = res.data?.users ?? res.data ?? []
    const SHOW_ROLES = ['staff','teacher','parent']
    const staff = raw.filter((u: any) => SHOW_ROLES.includes(u.role ?? u.Role))
    members.value = staff.map((u: any) => ({
      uid:        u.uid ?? u._id ?? u.id,
      firstName:  u.firstName ?? u.first_name ?? '',
      lastName:   u.lastName  ?? u.last_name  ?? '',
      email:      u.email     ?? undefined,
      cardUid:    u.cardUid   ?? u.card_uid   ?? undefined,
      cardStatus: u.cardStatus ?? u.card_status ?? undefined,
      balance:    typeof u.balance === 'number' ? u.balance : 0,
      role:       u.role      ?? '',
      status:     u.status    ?? 'active',
    }))
  } catch {
    loadError.value = 'โหลดข้อมูลไม่สำเร็จ'
    members.value   = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchMembers)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return members.value.filter(m => {
    const matchQ = !q || m.uid.toLowerCase().includes(q) || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
    const matchR = !filterRole.value   || m.role   === filterRole.value
    const matchS = !filterStatus.value || m.status === filterStatus.value
    return matchQ && matchR && matchS
  })
})
const totalPages    = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginated     = computed(() => filtered.value.slice((currentPage.value-1)*pageSize.value, currentPage.value*pageSize.value))
const activeCount   = computed(() => members.value.filter(m => m.status === 'active').length)
const inactiveCount = computed(() => members.value.filter(m => m.status !== 'active').length)
const withCardCount = computed(() => members.value.filter(m => !!m.cardUid).length)

// Edit
const showEditModal  = ref(false)
const editTarget     = ref<any>(null)
const savingEdit     = ref(false)
const saveEditError  = ref('')
function roleLabel(role: string): string {
  const map: Record<string, string> = {
    staff: 'สตาฟ', teacher: 'คุณครู', parent: 'ผู้ปกครอง',
  }
  return map[role] ?? role
}

function openAddModal() { editTarget.value = { uid:'', firstName:'', lastName:'', email:'', cardUid:'', cardStatus:'active', balance:0, role:'staff', status:'active' }; showEditModal.value = true }
function openEdit(m: Member) {
  if (['staff', 'teacher', 'parent'].includes(m.role)) { openParentDetail(m); return }
  editTarget.value = { ...m }
  showEditModal.value = true
}

async function saveEdit() {
  if (!editTarget.value || savingEdit.value) return
  savingEdit.value    = true
  saveEditError.value = ''
  const role = editTarget.value.role ?? 'staff'

  if (!editTarget.value.uid) {
    if (!editTarget.value.firstName || !editTarget.value.lastName || !editTarget.value.email) {
      saveEditError.value = 'กรุณากรอกชื่อ นามสกุล และอีเมล'
      savingEdit.value = false
      return
    }
    try {
      await api.post('/admin/members', {
        firstName: editTarget.value.firstName,
        lastName:  editTarget.value.lastName,
        email:     editTarget.value.email,
        role,
        cardUid:   editTarget.value.cardUid || undefined,
      })
      await fetchMembers()
      showEditModal.value = false
    } catch (err: any) {
      saveEditError.value = err?.response?.data?.message ?? 'สร้างสมาชิกไม่สำเร็จ กรุณาลองใหม่'
    } finally {
      savingEdit.value = false
    }
    return
  }

  // Existing member
  try {
    const body: Record<string, any> = {
      firstName: editTarget.value.firstName,
      lastName:  editTarget.value.lastName,
      email:     editTarget.value.email,
    }
    if (editTarget.value.cardUid !== undefined) body.cardUid = editTarget.value.cardUid
    await api.patch(`/admin/members/${editTarget.value.uid}`, body)
    await fetchMembers()
    showEditModal.value = false
  } catch (err: any) {
    saveEditError.value = err?.response?.data?.message ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    savingEdit.value = false
  }
}

const togglingStatus = ref<Record<string, boolean>>({})
async function toggleStatus(m: Member) {
  if (togglingStatus.value[m.uid]) return
  const newStatus: 'active' | 'inactive' = m.status === 'active' ? 'inactive' : 'active'
  togglingStatus.value[m.uid] = true
  // Optimistic local update
  const idx = members.value.findIndex(x => x.uid === m.uid)
  if (idx >= 0) members.value[idx] = { ...members.value[idx], status: newStatus }
  try {
    await api.patch(`/users/${m.uid}/status`, { status: newStatus })
  } catch {
    // Revert on error
    if (idx >= 0) members.value[idx] = { ...members.value[idx], status: m.status }
    loadError.value = 'เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    togglingStatus.value[m.uid] = false
  }
}

// Enrollment Code
const showCodeModal   = ref(false)
const codeData        = ref<any>(null)
const generatingCode  = ref(false)
const copied          = ref(false)
let copiedTimer: any  = null

async function openCodeModal(m: Member) {
  showCodeModal.value = true
  codeData.value = null
  try {
    const res = await api.get(`/admin/members/${m.uid}/code`)
    codeData.value = { ...res.data, uid: m.uid, firstName: m.firstName, lastName: m.lastName }
  } catch {
    codeData.value = { uid: m.uid, firstName: m.firstName, lastName: m.lastName, code: null, expiresAt: null, used: false, expired: false }
  }
}
async function generateCode() {
  if (!codeData.value || generatingCode.value) return
  generatingCode.value = true
  try {
    const res = await api.post(`/admin/members/${codeData.value.uid}/code/generate`)
    codeData.value = { ...res.data, uid: codeData.value.uid, firstName: codeData.value.firstName, lastName: codeData.value.lastName }
  } catch (err: any) {
    // Surface the real error — do not fabricate a fake code
    const msg = err?.response?.data?.message ?? 'สร้าง Code ไม่สำเร็จ กรุณาลองใหม่'
    codeData.value = { ...codeData.value, _generateError: msg }
  } finally { generatingCode.value = false }
}
function copyCode() {
  if (!codeData.value?.code) return
  navigator.clipboard.writeText(codeData.value.code).then(() => {
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 2000)
  })
}
function formatExpiry(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('th-TH', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) + ' น.'
}

// Detail Panel — unsaved guard
const showUnsavedModal = ref(false)

function tryCloseDetail() {
  if (detailEditing.value) { showUnsavedModal.value = true; return }
  showDetailModal.value = false
}
function confirmCloseDetail() {
  detailEditing.value   = false
  showDetailModal.value = false
  showUnsavedModal.value = false
}

// Detail Panel — Enrollment Code (inline)
const detailCodeData       = ref<any>(null)
const detailCodeLoading    = ref(false)
const detailCodeGenerating = ref(false)
const detailCodeCopied     = ref(false)
let detailCodeCopiedTimer: any = null

async function generateDetailCode() {
  if (!detailMember.value || detailCodeGenerating.value) return
  detailCodeGenerating.value = true
  try {
    const res = await api.post(`/admin/members/${detailMember.value.uid}/code/generate`)
    detailCodeData.value = { ...res.data, _generateError: undefined }
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? 'สร้าง Code ไม่สำเร็จ'
    detailCodeData.value = { ...(detailCodeData.value ?? {}), _generateError: msg }
  } finally { detailCodeGenerating.value = false }
}

function copyDetailCode() {
  if (!detailCodeData.value?.code) return
  navigator.clipboard.writeText(detailCodeData.value.code).then(() => {
    detailCodeCopied.value = true
    if (detailCodeCopiedTimer) clearTimeout(detailCodeCopiedTimer)
    detailCodeCopiedTimer = setTimeout(() => { detailCodeCopied.value = false }, 2000)
  })
}

// Parent Detail Panel
interface LinkedStudent {
  linkId:       string
  studentUid:   string
  firstName:    string
  lastName:     string
  gradeLevel:   string
  familyCode:   string
  cardUid:      string | null
  cardStatus:   string | null
  isPrimary:    boolean
  relationship: string
  boundAt:      string | null
}

const showDetailModal  = ref(false)
const detailMember     = ref<Member | null>(null)
const detailStudents   = ref<LinkedStudent[]>([])
const detailLoading    = ref(false)
const confirmUnlinkId  = ref<string | null>(null)
const unlinkingId      = ref<string | null>(null)

const detailEditing    = ref(false)
const detailSaving     = ref(false)
const detailSaveError  = ref('')
const detailForm       = ref({ firstName: '', lastName: '', email: '', cardUid: '', cardStatus: 'active' as string })

const detailFamilyCodes = computed(() => {
  const codes = detailStudents.value.map(s => s.familyCode).filter(Boolean)
  return [...new Set(codes)]
})

function detailStudentsByFam(fc: string) {
  return detailStudents.value.filter(s => s.familyCode === fc)
}

async function openParentDetail(m: Member) {
  detailMember.value    = m
  detailStudents.value  = []
  detailLoading.value   = true
  detailCodeData.value  = null
  detailCodeLoading.value = true
  confirmUnlinkId.value = null
  detailEditing.value   = false
  detailSaveError.value = ''
  showDetailModal.value = true
  const [studentsRes, codeRes] = await Promise.allSettled([
    api.get(`/admin/members/${m.uid}/linked-students`),
    api.get(`/admin/members/${m.uid}/code`),
  ])
  detailStudents.value  = studentsRes.status === 'fulfilled' ? (studentsRes.value.data?.students ?? []) : []
  detailLoading.value   = false
  detailCodeData.value  = codeRes.status === 'fulfilled' ? codeRes.value.data : { code: null, expiresAt: null, used: false, expired: false }
  detailCodeLoading.value = false
}

function startDetailEdit() {
  if (!detailMember.value) return
  detailForm.value = {
    firstName:  detailMember.value.firstName,
    lastName:   detailMember.value.lastName,
    email:      detailMember.value.email ?? '',
    cardUid:    detailMember.value.cardUid ?? '',
    cardStatus: detailMember.value.cardStatus ?? 'active',
  }
  detailSaveError.value = ''
  detailEditing.value   = true
}

async function saveDetailEdit() {
  if (!detailMember.value || detailSaving.value) return
  detailSaving.value    = true
  detailSaveError.value = ''
  try {
    const body: Record<string, any> = {
      firstName: detailForm.value.firstName,
      lastName:  detailForm.value.lastName,
      email:     detailForm.value.email,
    }
    if (detailForm.value.cardUid !== undefined) body.cardUid = detailForm.value.cardUid || undefined
    await api.patch(`/admin/members/${detailMember.value.uid}`, body)
    // update local state
    const idx = members.value.findIndex(m => m.uid === detailMember.value!.uid)
    if (idx >= 0) {
      members.value[idx] = {
        ...members.value[idx],
        firstName:  detailForm.value.firstName,
        lastName:   detailForm.value.lastName,
        email:      detailForm.value.email || undefined,
        cardUid:    detailForm.value.cardUid || undefined,
        cardStatus: detailForm.value.cardStatus as any,
      }
      detailMember.value = members.value[idx]
    }
    detailEditing.value = false
  } catch (err: any) {
    detailSaveError.value = err?.response?.data?.message ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    detailSaving.value = false
  }
}

async function unlinkStudent(s: LinkedStudent) {
  if (!s.studentUid || unlinkingId.value) return
  unlinkingId.value = s.linkId
  try {
    await api.delete(`/admin/students/${s.studentUid}/parents/${s.linkId}`)
    detailStudents.value = detailStudents.value.filter(x => x.linkId !== s.linkId)
    // update parentCount in members list
    const idx = members.value.findIndex(m => m.uid === detailMember.value?.uid)
    if (idx >= 0) {
      const m = { ...members.value[idx] } as any
      if (typeof m.parentCount === 'number' && m.parentCount > 0) m.parentCount -= 1
      members.value[idx] = m
    }
  } catch { /* silently ignore */ }
  finally {
    unlinkingId.value    = null
    confirmUnlinkId.value = null
  }
}

function buildMemberSheet() {
  const headers  = ['รหัสสมาชิก*','ชื่อ*','นามสกุล*','ประเภท*','อีเมล','รหัสบัตร RFID','รหัสสิทธิ์']
  const noteRow  = ['หมายเหตุ:','ชื่อจริง','นามสกุล','staff / teacher / parent','email','UID บัตร (ถ้ามี)','W001,W002 คั่นด้วย ,']
  const examples = [
    ['MEM-001','สมชาย','ใจดี','staff','somchai@dulwich.ac.th','04A1B2C3','W001,W002'],
    ['TCH-001','Anna','Brown','teacher','anna@dulwich.ac.th','RFID-ANNA01','W001'],
    ['PRT-001','สุชาติ','ใจดี','parent','suchat@dulwich.ac.th','','W001'],
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, noteRow, ...examples])
  ws['!cols'] = [{wch:14},{wch:12},{wch:14},{wch:12},{wch:28},{wch:18},{wch:22}]
  return ws
}
function buildInstrSheet() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['คำแนะนำ'],[''],
    ['ประเภทที่ใช้ได้:'],
    ['staff = สตาฟ'],['teacher = คุณครู'],['parent = ผู้ปกครอง'],
    [''],
    ['รหัสสิทธิ์ที่ใช้ได้:'],
    ['W001 = กระเป๋าหลัก (เติมเงิน)'],['W002 = ชำระค่าอาหาร'],
    ['W003 = Pre-order'],['W004 = Buffet (Primary ฿170)'],['W005 = Buffet (Secondary ฿150)'],
    [''],['หากมีหลายสิทธิ์ให้คั่นด้วย , เช่น W001,W003'],
  ])
  ws['!cols'] = [{wch:50}]
  return ws
}

// Export
const exportingCodes = ref(false)
async function downloadCodes() {
  exportingCodes.value = true
  try {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, buildMemberSheet(), 'รายชื่อสมาชิก')
    XLSX.utils.book_append_sheet(wb, buildInstrSheet(), 'คำแนะนำ')
    XLSX.writeFile(wb, 'Members_Import_Template.xlsx')
  } finally { exportingCodes.value = false }
}

const showImportModal = ref(false)
const importFileMem   = ref<File | null>(null)
const isDragOver      = ref(false)
const memFileInput    = ref<HTMLInputElement | null>(null)

function closeImport()  { showImportModal.value=false; importFileMem.value=null }
function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildMemberSheet(), 'รายชื่อสมาชิก')
  XLSX.utils.book_append_sheet(wb, buildInstrSheet(), 'คำแนะนำ')
  XLSX.writeFile(wb, 'Members_Import_Template.xlsx')
}
</script>

<style scoped>
/* Import modal */
.modal-backdrop { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.4); }
.imp-modal-mem { position:fixed; top:50%; left:50%; z-index:201; transform:translate(-50%,-50%); background:#fff; border-radius:16px; width:calc(100vw - 48px); max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:0 16px 48px rgba(0,0,0,0.18); }
.imp-header  { display:flex; justify-content:space-between; align-items:center; padding:20px 24px 16px; }
.imp-title   { font-size:18px; font-weight:500; color:#1C1C1E; }
.imp-close   { background:none; border:none; cursor:pointer; color:#8E8E93; display:flex; align-items:center; padding:4px; border-radius:6px; }
.imp-close:hover { background:#F2F2F7; }
.imp-divider { height:1px; background:#F0F0F0; }
.imp-step    { display:flex; align-items:flex-start; gap:14px; padding:20px 24px; }
.imp-step-num { width:32px; height:32px; border-radius:8px; background:var(--color-primary-tint); color:var(--color-primary); font-size:15px; font-weight:500; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.imp-step-title { font-size:15px; font-weight:500; color:#1C1C1E; margin-bottom:4px; }
.imp-step-sub   { font-size:13px; color:#8E8E93; line-height:1.5; margin-bottom:10px; }
.imp-dl-btn { display:inline-flex; align-items:center; gap:5px; font-size:14px; font-weight:500; color:var(--color-primary); background:none; border:none; cursor:pointer; padding:0; font-family:inherit; }
.imp-dropzone { border:2px dashed #D0D0D0; border-radius:12px; background:#FAFAFA; padding:32px 24px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:border-color 0.15s, background 0.15s; min-height:130px; }
.imp-dropzone:hover, .imp-dropzone-over { border-color:var(--color-primary); background:var(--color-primary-tint); }
.imp-dropzone-has { border-color:var(--color-success); background:var(--color-success-bg); }
.imp-upload-icon { width:52px; height:52px; border-radius:50%; background:var(--color-primary); display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
.imp-instructions { margin:0 24px 20px; background:var(--color-primary-tint); border-radius:10px; padding:14px 16px; }
.imp-footer { display:flex; gap:12px; padding:16px 24px 20px; border-top:1px solid #F0F0F0; }
.imp-btn-cancel { flex:1; height:48px; border-radius:12px; border:2px solid var(--color-primary); color:var(--color-primary); background:transparent; font-size:15px; font-weight:500; cursor:pointer; font-family:inherit; }
.imp-btn-cancel:hover { background:var(--color-primary-tint); }
.imp-btn-confirm { flex:1; height:48px; border-radius:12px; border:none; background:#E5E5EA; color:#AEAEB2; font-size:15px; font-weight:500; cursor:not-allowed; font-family:inherit; }
.imp-btn-confirm-active { background:var(--color-primary); color:#fff; cursor:pointer; }
.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from, .modal-bg-leave-to { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from, .modal-up-leave-to { opacity:0; transform:translate(-50%,-48%); }

/* Stat cards */
.stat-row { display:flex; gap:12px; flex-wrap:wrap; }
.stat-card {
  flex:1; min-width:150px; display:flex; align-items:center; gap:14px;
  padding:16px 18px; border-radius:12px; border:1px solid transparent; background:#fff;
}
.stat-card-primary { border-color:var(--color-primary); color:var(--color-primary); }
.stat-card-success { border-color:var(--color-border-tertiary); color:#028A60; }
.stat-card-danger  { border-color:var(--color-border-tertiary); color:#CC3333; }
.stat-card-ghost   { border-color:var(--color-border-tertiary); color:var(--color-text-secondary); }
.stat-icon { flex-shrink:0; opacity:0.85; }
.stat-body { display:flex; flex-direction:column; gap:2px; }
.stat-label { font-size:12px; opacity:0.75; }
.stat-value { font-size:22px; font-weight:500; line-height:1.1; }

/* Edit fields */
.edit-field-row { display:flex; gap:12px; }
.edit-field { flex:1; display:flex; flex-direction:column; gap:5px; }
.edit-input {
  height:38px; padding:0 12px; border-radius:8px;
  border:1px solid var(--color-border-tertiary); font-size:14px;
  color:var(--color-text-primary); outline:none; font-family:inherit; background:#fff;
}
.edit-input:focus { border-color:var(--color-primary); }

/* Modal shared styles */
.modal-backdrop { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.4); }
.modal-bg-enter-active, .modal-bg-leave-active { transition:opacity 0.2s; }
.modal-bg-enter-from, .modal-bg-leave-to { opacity:0; }
.modal-up-enter-active, .modal-up-leave-active { transition:opacity 0.25s,transform 0.25s; }
.modal-up-enter-from, .modal-up-leave-to { opacity:0; transform:translate(-50%,-48%); }

/* Enrollment code modal */
.unsaved-modal {
  position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
  z-index:201; background:#fff; border-radius:16px;
  padding:28px 24px 20px; width:min(360px, calc(100vw - 48px));
  box-shadow:0 20px 60px rgba(0,0,0,0.18);
  text-align:center;
}
.unsaved-icon-wrap { margin-bottom:12px; }
.unsaved-title { font-size:16px; font-weight:600; color:var(--color-text-primary); margin:0 0 8px; }
.unsaved-body { font-size:14px; color:var(--color-text-secondary); margin:0 0 20px; }
.unsaved-actions { display:flex; gap:10px; }

.code-modal {
  position:fixed; top:50%; left:50%; z-index:201; transform:translate(-50%,-50%);
  background:#fff; border-radius:16px; width:calc(100vw - 48px); max-width:400px;
  box-shadow:0 16px 48px rgba(0,0,0,0.16); overflow:hidden;
}
.code-header { display:flex; justify-content:space-between; align-items:center; padding:18px 20px 14px; }
.code-title { font-size:16px; font-weight:500; color:var(--color-text-primary); }
.code-body { padding:18px 20px 14px; display:flex; flex-direction:column; gap:14px; }
.code-student-name { font-size:17px; font-weight:500; color:var(--color-text-primary); }
.code-box-wrap { margin:2px 0; }
.code-box { display:flex; align-items:center; justify-content:space-between; background:#F2F2F7; border-radius:10px; padding:12px 14px; border:1px solid #E8E8E8; }
.code-box-empty { justify-content:center; padding:14px; }
.code-text { font-family:monospace; font-size:18px; font-weight:500; letter-spacing:0.04em; }
.code-copy-btn { background:none; border:none; cursor:pointer; color:#8E8E93; padding:4px; border-radius:6px; display:flex; align-items:center; }
.code-copy-btn:hover { background:#E8E8E8; }
.code-expiry-row { display:flex; align-items:center; gap:8px; font-size:13px; }
.code-status { font-size:11px; font-weight:500; padding:2px 8px; border-radius:100px; }
.code-status-active  { background:#D1FAE5; color:#065F46; }
.code-status-expired { background:#FEE2E2; color:#991B1B; }
.code-status-used    { background:#F3F4F6; color:#6B7280; }
.code-expiry-text { font-size:14px; color:var(--color-text-primary); }
.promo-close { background:none; border:none; cursor:pointer; color:#8E8E93; padding:4px; border-radius:6px; display:flex; align-items:center; }
.promo-close:hover { background:#F2F2F7; }
.promo-divider { height:1px; background:#F0F0F0; }
.code-footer { padding:14px 20px 18px; border-top:1px solid #F0F0F0; display:flex; flex-direction:column; align-items:center; gap:8px; }
.code-generate-btn { width:100%; height:46px; border-radius:12px; background:var(--color-primary); color:#fff; border:none; cursor:pointer; font-size:15px; font-weight:500; display:flex; align-items:center; justify-content:center; gap:7px; font-family:inherit; }
.code-generate-btn:disabled { opacity:0.5; cursor:not-allowed; }
.code-footer-note { font-size:12px; color:#AEAEB2; }
@keyframes spin { to { transform:rotate(360deg); } }
.spin { animation:spin 0.8s linear infinite; }

/* Imp modal reuse */
.imp-modal {
  position:fixed; top:50%; left:50%; z-index:201; transform:translate(-50%,-50%);
  background:#fff; border-radius:16px; width:calc(100vw - 48px);
  max-height:90vh; overflow-y:auto; box-shadow:0 16px 48px rgba(0,0,0,0.18);
}
.imp-header { display:flex; justify-content:space-between; align-items:center; padding:20px 24px 16px; }
.imp-title  { font-size:18px; font-weight:500; color:var(--color-text-primary); }
.imp-close  { background:none; border:none; cursor:pointer; color:#8E8E93; display:flex; align-items:center; padding:4px; border-radius:6px; }
.imp-close:hover { background:#F2F2F7; }
.imp-divider { height:1px; background:#F0F0F0; }
.imp-footer { display:flex; gap:12px; padding:16px 24px 20px; border-top:1px solid #F0F0F0; }
.imp-btn-cancel { flex:1; height:48px; border-radius:12px; border:2px solid var(--color-primary); color:var(--color-primary); background:transparent; font-size:15px; font-weight:500; cursor:pointer; }
.imp-btn-confirm { flex:1; height:48px; border-radius:12px; border:none; background:#E5E5EA; color:#AEAEB2; font-size:15px; font-weight:500; cursor:not-allowed; }
.imp-btn-confirm-active { background:var(--color-primary); color:#fff; cursor:pointer; }

/* Role badges */
.role-badge {
  font-size:10px; font-weight:500; padding:2px 7px;
  border-radius:100px; white-space:nowrap; flex-shrink:0;
}
.role-badge-admin      { background:#EEF2FF; color:#3730A3; }
.role-badge-supervisor { background:#F0FDF4; color:#166534; }
.role-badge-cashier    { background:#FFF7ED; color:#9A3412; }
.role-badge-staff      { background:#F0F9FF; color:#0C4A6E; }
.role-badge-teacher    { background:#FDF4FF; color:#6B21A8; }
.role-badge-parent     { background:#FFF1F2; color:#9F1239; }

/* promo-label, promo-select */
.promo-label { font-size:12px; color:var(--color-text-secondary); font-weight:400; }
.promo-select { height:38px; padding:0 10px; border-radius:8px; border:1px solid var(--color-border-tertiary); font-size:14px; color:var(--color-text-primary); outline:none; font-family:inherit; background:#fff; }
.promo-select:focus { border-color:var(--color-primary); }

/* Member Detail Panel (content overlay — sidebar stays visible) */
.pdt-panel {
  position:fixed; top:0; left:240px; right:0; bottom:0; z-index:150;
  background:#F2F2F7; overflow-y:auto;
}
.pdt-backbar {
  position:sticky; top:0; z-index:1;
  display:flex; align-items:center; gap:12px;
  padding:12px 20px; background:#fff;
  border-bottom:1px solid #E8E8ED;
}
.pdt-back-btn {
  display:inline-flex; align-items:center; gap:6px;
  font-size:13px; font-weight:500; color:var(--color-primary);
  background:none; border:none; cursor:pointer; padding:4px 8px;
  border-radius:8px; font-family:inherit;
}
.pdt-back-btn:hover { background:var(--color-primary-tint); }
.pdt-backbar-title { font-size:14px; font-weight:500; color:var(--color-text-secondary); }
.pdt-inner {
  max-width:860px; margin:0 auto; padding:20px 20px 48px;
  display:flex; flex-direction:column; gap:12px;
}
.pdt-header-card {
  display:flex; align-items:center; gap:16px;
  background:#fff; border-radius:14px; padding:20px 24px;
  box-shadow:0 1px 4px rgba(0,0,0,0.06);
}
.pdt-body-card {
  background:#fff; border-radius:14px; overflow:hidden;
  box-shadow:0 1px 4px rgba(0,0,0,0.06);
}
.pdt-avatar-lg {
  width:52px; height:52px; border-radius:50%; flex-shrink:0;
  background:var(--color-primary); color:#fff;
  font-size:20px; font-weight:600;
  display:flex; align-items:center; justify-content:center;
}
.pdt-fullname { font-size:18px; font-weight:500; color:var(--color-text-primary); margin-bottom:5px; }
.pdt-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.pdt-fade-enter-active, .pdt-fade-leave-active { transition:opacity 0.2s; }
.pdt-fade-enter-from, .pdt-fade-leave-to { opacity:0; }

.pdt-section { padding:16px 24px 20px; border-top:1px solid #F0F0F0; }
.pdt-body-card .pdt-section:first-child { border-top:none; }
.pdt-section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.pdt-section-title { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:var(--color-text-primary); }
.pdt-count { font-size:12px; color:var(--color-text-tertiary); background:#F2F2F7; padding:2px 8px; border-radius:100px; }
.pdt-edit-btn {
  display:inline-flex; align-items:center; gap:5px;
  font-size:12px; font-weight:500; color:var(--color-primary);
  background:var(--color-primary-tint); border:none; cursor:pointer;
  border-radius:7px; padding:4px 10px; font-family:inherit;
}
.pdt-edit-btn:hover { opacity:0.8; }
.pdt-profile-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 24px; }
.pdt-profile-item { display:flex; flex-direction:column; gap:3px; }
.pdt-profile-label { font-size:11px; color:var(--color-text-tertiary); }
.pdt-profile-value { font-size:14px; color:var(--color-text-primary); font-weight:400; }
.pdt-edit-form { display:flex; flex-direction:column; gap:12px; }
.pdt-edit-row { display:flex; gap:12px; }
.pdt-edit-actions { display:flex; gap:10px; margin-top:4px; }

.pdt-fam-group { margin-bottom:12px; }
.pdt-fam-code-label {
  font-size:11px; font-weight:600; color:var(--color-primary);
  background:var(--color-primary-tint); padding:2px 8px; border-radius:6px;
  display:inline-block; margin-bottom:10px;
}
.pdt-fam-cards { display:flex; gap:10px; flex-wrap:wrap; }
.pdt-fam-card {
  display:flex; align-items:center; gap:10px;
  padding:10px 14px; border-radius:10px;
  border:1px solid var(--color-border-tertiary);
  background:#FAFAFA; min-width:180px; flex:1;
}
.pdt-fam-card-parent { border-color:var(--color-primary); background:var(--color-primary-tint); }
.pdt-fam-avatar {
  width:36px; height:36px; border-radius:50%; flex-shrink:0;
  background:var(--color-primary); color:#fff;
  font-size:15px; font-weight:600;
  display:flex; align-items:center; justify-content:center;
}
.pdt-fam-avatar-student { background:#8B5CF6; }
.pdt-fam-card-info { display:flex; flex-direction:column; gap:3px; }
.pdt-fam-card-name { font-size:13px; font-weight:500; color:var(--color-text-primary); }
.pdt-fam-badges { display:flex; gap:4px; flex-wrap:wrap; }

.pdt-unlink-confirm { display:flex; align-items:center; gap:4px; }
.pdt-unlink-yes {
  font-size:11px; font-weight:500; color:#fff;
  background:var(--color-danger,#CC3333); border:none; cursor:pointer;
  border-radius:5px; padding:2px 7px; font-family:inherit;
}
.pdt-unlink-yes:disabled { opacity:0.5; cursor:not-allowed; }
.pdt-unlink-no {
  font-size:11px; font-weight:500; color:var(--color-text-secondary);
  background:#F2F2F7; border:none; cursor:pointer;
  border-radius:5px; padding:2px 7px; font-family:inherit;
}
.pdt-unlink-no:hover { background:#E5E5EA; }
</style>
