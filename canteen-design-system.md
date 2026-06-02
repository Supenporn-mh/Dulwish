# School Canteen — Design System

ระบบบริหารโรงอาหารโรงเรียน · Primary `#1264E3` · White `#FFFFFF`

---

## 1. Color Tokens

### Brand

| Token | Hex | ใช้กับ |
|---|---|---|
| `primary` | `#1264E3` | ปุ่มหลัก, ราคา, link, tab active, toggle, quota bar |
| `primary-light` | `#3D82F0` | hover state |
| `primary-dark` | `#0A4BAD` | pressed / text on tint |
| `primary-tint` | `#EAF1FD` | badge bg, card placeholder, input focus |
| `white` | `#FFFFFF` | text บน primary bg, card surface |

### Semantic

| Token | Hex | Bg | ใช้กับ |
|---|---|---|---|
| `success` | `#03BA81` | `#E0FAF3` | badge เปิดใช้งาน, dot ออนไลน์, ยืนยัน |
| `danger` | `#FF5252` | `#FFEBEB` | ปุ่มลบ, badge ปิด, บัตรถูกปฏิเสธ |
| `warning` | `#FF9800` | `#FFF3E0` | ใกล้หมดโควต้า, แจ้งเตือน |

---

## 2. Typography Scale

| Token | Size | Weight | Line Height | ใช้กับ |
|---|---|---|---|---|
| `display` | 28px | 400 | 1.3 | ชื่อร้าน, hero text |
| `heading-xl` | 22px | 500 | 1.3 | page title, section header |
| `heading-lg` | 18px | 500 | 1.4 | card title, modal header |
| `heading-md` | 16px | 500 | 1.4 | ชื่อเมนูอาหาร, ชื่อโปรโมชัน |
| `body-lg` | 15px | 400 | 1.6 | คำอธิบาย, รายละเอียด |
| `body-md` | 14px | 400 | 1.6 | table cell, form input, placeholder |
| `body-sm` | 13px | 400 | 1.5 | secondary info, promo row |
| `label` | 12px | 500 | 1.4 | badge, tab, button, nav |
| `caption` | 11px | 400 | 1.4 | helper text, quota, note |
| `code` | 12px mono | 400 | — | promo code, token, รหัสบัตร |

> **กฎ weight:** ใช้แค่ 2 ค่า — `400` สำหรับ body/caption และ `500` สำหรับ heading/label/price ไม่ใช้ 600 หรือ 700

---

## 3. Buttons

### Variants

| Variant | Background | Text | Border | ใช้กับ |
|---|---|---|---|---|
| `primary` | `#1264E3` | `#FFFFFF` | — | สั่งอาหาร, ยืนยัน |
| `secondary` | transparent | `#1264E3` | `1px #1264E3` | จองล่วงหน้า, ดูเมนู |
| `ghost` | transparent | text-secondary | `0.5px border-secondary` | ยกเลิก |
| `success` | `#03BA81` | `#FFFFFF` | — | ยืนยันการชำระ |
| `danger` | `#FF5252` | `#FFFFFF` | — | ลบ, ปฏิเสธ |
| `warning` | `#FF9800` | `#FFFFFF` | — | แจ้งเตือน |

### Sizes

| Size | Height | Font | Padding-x | Border Radius |
|---|---|---|---|---|
| `sm` | 30px | 13px | 12px | 6px |
| `md` (default) | 36px | 14px | 16px | 8px |
| `lg` | 44px | 15px | 20px | 10px |

> `btn-icon` — width = height (square) · `btn-pill` — border-radius: 20px

---

## 4. Badges

### Roles

| Role | Background | Text Color |
|---|---|---|
| นักเรียน (student) | `#EAF1FD` | `#0A4BAD` |
| ผู้ปกครอง (parent) | `#EEEDFE` | `#3C3489` |
| ครู/พนักงาน (teacher) | `#E0FAF3` | `#028A60` |
| บุคคลภายนอก (visitor) | `#F1EFE8` | `#5F5E5A` |
| พนักงานขาย (cashier) | `#FFF3E0` | `#C67100` |
| ผู้ดูแล (supervisor) | `#FAECE7` | `#993C1D` |
| Admin | `#FFEBEB` | `#CC3333` |

### Status

| Status | Background | Text Color |
|---|---|---|
| เปิดใช้งาน | `#E0FAF3` | `#028A60` |
| ปิดใช้งาน | `#FFEBEB` | `#CC3333` |
| รอยืนยัน | `#FFF3E0` | `#C67100` |

### Payment Method

| Method | Background | Text Color |
|---|---|---|
| RFID / Card | `#EAF1FD` | `#0A4BAD` |
| QR Code | `#EEEDFE` | `#3C3489` |
| บุฟเฟต์ | `#E0FAF3` | `#028A60` |

> Badge ทุกตัว: `border-radius: 20px` · `font-size: 12px` · `font-weight: 500` · `padding: 3px 10px`

---

## 5. Search Input

```css
/* Flexbox wrapper — ไม่ใช้ position: absolute */
.search-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--color-border-secondary);
  background: transparent;
}

/* Reset input browser default */
.search-box input {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  min-width: 0;
  border: none !important;
  outline: none !important;
  background: transparent !important;
  box-shadow: none !important;
  font-size: 14px;
}
```

| Variant | Border Radius | ใช้กับ |
|---|---|---|
| pill | 20px | mobile app |
| rect | 8px | admin / cashier dashboard |

### Sizes

| Size | Height | Font | Icon | Gap |
|---|---|---|---|---|
| `sm` | 30px | 13px | 13px | 6px |
| `md` | 36px | 14px | 15px | 8px |
| `lg` | 44px | 15px | 17px | 10px |

---

## 6. Payment Method Selector

Card แสดงวิธีชำระเงิน 3 ตัวเลือก

| State | Border | Background |
|---|---|---|
| default | `1px border-secondary` | transparent |
| selected | `1px #1264E3` | `#EAF1FD` |

```
RFID / Card  →  icon: ti-credit-card
QR Code      →  icon: ti-qrcode
บุฟเฟต์      →  icon: ti-bowl
```

---

## 7. Food Card

```
┌────────────────┐
│   food image   │  h: 90px · bg: #EAF1FD
│   or emoji     │
├────────────────┤
│ ชื่อเมนูอาหาร  │  body-sm / 500
│ ฿50      [+]  │  price: body-md/500/#1264E3
└────────────────┘
width: 148px · border-radius: 12px · border: 0.5px
```

---

## 8. Quota Bar

แสดงการใช้สิทธิ์ / โควต้า

| สถานะ | สี bar | เงื่อนไข |
|---|---|---|
| ปกติ | `#03BA81` | < 80% |
| ใกล้หมด | `#FF9800` | 80–99% |
| เต็ม | `#FF5252` | 100% |

```
h: 4px · border-radius: 2px · background track: border-tertiary
```

---

## 9. Notifications

| Type | Border | Icon bg | Icon color | ใช้กับ |
|---|---|---|---|---|
| `info` | `#A8C4F5` | `#EAF1FD` | `#1264E3` | ยืนยัน Pre-order |
| `success` | `#03BA81` | `#E0FAF3` | `#03BA81` | ชำระเงินสำเร็จ |
| `warning` | `#FF9800` | `#FFF3E0` | `#FF9800` | แจ้งผู้ปกครอง, ใกล้หมดสิทธิ์ |
| `danger` | `#FF5252` | `#FFEBEB` | `#FF5252` | ยกเลิก, บัตรถูกปฏิเสธ |

Structure: `icon (32px circle) + title (body-sm/500) + desc (caption) + time (caption/tertiary)`

---

## 10. Toggle

| State | Background | Knob position |
|---|---|---|
| on | `#1264E3` | right: 3px |
| off | `border-secondary` | left: 3px |

```
width: 40px · height: 22px · border-radius: 20px
knob: 16×16px · background: #FFFFFF · border-radius: 50%
```

---

## 11. Stat Cards

```
background: var(--color-background-secondary)
border-radius: 8px · padding: 14px 16px
label: caption / text-secondary
value: 22px / 500
sub: caption
```

sub text color ตามความหมาย: success `#03BA81` · warning `#FF9800` · danger `#FF5252`

---

## 12. Tabs

```
border-bottom: 0.5px solid border-tertiary
tab active: color #1264E3 · border-bottom: 2px solid #1264E3 · font-weight: 500
tab default: color text-secondary · border-bottom: transparent
font-size: 13px · padding: 8px 16px
```

---

## 13. Bottom Navigation (Mobile)

5 items: หน้าแรก · เมนู · จอง · ประวัติ · แจ้งเตือน

```
icon active: color #1264E3 · font-size: 20px
icon default: color text-tertiary
label: 10px / text-tertiary → active: #1264E3
border-top: 0.5px solid border-tertiary
```

---

## 14. Spacing Scale

| Token | Value |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-6` | 24px |
| `space-8` | 32px |

## 15. Border Radius

| Token | Value | ใช้กับ |
|---|---|---|
| `radius-sm` | 4px | promo code tag, quota bar |
| `radius-md` | 8px | button, input rect, stat card |
| `radius-lg` | 12px | food card, modal |
| `radius-pill` | 20px | badge, search pill, toggle |
| `radius-full` | 50% | avatar, toggle knob, dot |

---

## Icon Library

ใช้ **Tabler Icons** (outline only) — `<i class="ti ti-{name}">` 

| ใช้กับ | Icon |
|---|---|
| ค้นหา | `ti-search` |
| บัตร / RFID | `ti-credit-card` |
| QR Code | `ti-qrcode` |
| บุฟเฟต์ | `ti-bowl` |
| จองอาหาร | `ti-calendar` |
| ตะกร้า | `ti-shopping-cart` |
| ประวัติ | `ti-receipt` |
| แจ้งเตือน | `ti-bell` |
| นักเรียน | `ti-school` |
| ผู้ปกครอง | `ti-users` |
| ครู/พนักงาน | `ti-briefcase` |
| บุคคลภายนอก | `ti-user` |
| พนักงานขาย | `ti-cash` |
| ผู้ดูแล | `ti-eye` |
| Admin | `ti-settings` |
| เมนูอาหาร | `ti-tools-kitchen-2` |
| ยืนยัน | `ti-check` |
| ลบ | `ti-trash` |
| แจ้งเตือน | `ti-alert-triangle` |

---

*School Canteen Design System · v1.0*
