# UPOS — Dulwich School Canteen System

Cashless canteen platform for Dulwich School.

## Architecture

| App | URL | Role |
|---|---|---|
| API | http://localhost:4000 | Backend (Bun + Elysia + MongoDB) |
| Parent Web | http://localhost:3001 | Parent |
| Admin Portal | http://localhost:3002 | Admin / Supervisor |
| POS Terminal | http://localhost:3003 | Cashier / Supervisor |
| Kiosk | http://localhost:3004 | Student / Visitor |
| MongoDB | localhost:27017 | Database |
| Swagger | http://localhost:4000/swagger | API docs |

## Quick Start

### 1. Start MongoDB (requires Docker)
```bash
docker-compose up -d
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Seed demo data
```bash
pnpm seed
```

### 4. Start all apps
```bash
pnpm dev
```

---

## Demo Accounts

| Role | Email | Password | App |
|---|---|---|---|
| Parent | suchart@example.com | Demo1234! | localhost:3001 |
| Admin | admin@dulwich.ac.th | Admin1234! | localhost:3002 |
| Supervisor | patcha@school.local | Super123! | localhost:3002 |
| Cashier | nong@school.local | Cashier123! | localhost:3003 |
| Teacher | anna@dulwich.ac.th | Teacher123! | localhost:3003 |
| Kiosk (student card) | UID: STD-K1-0001 | tap card | localhost:3004 |
| Kiosk (teacher card) | UID: STF-ANNA-01 | tap card | localhost:3004 |

---

## POS Electron App

```bash
# Dev mode (Electron + Vite dev server)
pnpm --filter pos dev:electron

# Build Windows installer
pnpm --filter pos build:electron
```

Requires: `electron` + `electron-builder` installed (via `pnpm install`)

---

## Key Flows

### Parent
1. Login at localhost:3001
2. View child wallet balance (สมหญิง K1-A — ฿850)
3. Top-up: select amount → PromptPay → mock QR shows → auto-confirms in 3s
4. Pre-order: pick date/meal/items → confirm → wallet deducts

### POS Cashier
1. Login at localhost:3003
2. Select items from menu grid
3. "แตะบัตร" → type `STD-K1-0001` → shows student + balance
4. PAY → wallet deducts → receipt shown

### Buffet Mode
1. POS → Buffet tab
2. Tap card `STD-K1-0001` → resolves K1 student → price ฿170
3. Check-in → deducts wallet, records session
4. Tap same card again → "เข้าใช้แล้ว" (no double charge)

### Admin
1. Login at localhost:3002
2. Dashboard: today's revenue, buffet entries, low-balance count
3. Manage users, menu, policies
4. View all transactions + audit logs

### Kiosk
1. Open localhost:3004
2. Tap card / enter UID `STD-K1-0001`
3. See balance, history, top-up QR, feedback

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun 1.x |
| Backend | Elysia + TypeScript |
| ORM | Mongoose |
| Database | MongoDB 7 |
| Frontend | Vue 3 + Vite |
| State | Pinia |
| UI (Parent/POS/Kiosk) | Tailwind CSS |
| UI (Admin) | Element Plus |
| POS Shell | Electron 27 |
| Auth | JWT (jsonwebtoken) |

---

## Mocked / Simplified

- **Payment**: SCB gateway mocked — topup auto-confirms after 3s
- **RFID**: Manual card UID input (type in text field)  
- **Email/SMS**: console.log only
- **PDF Receipts**: browser print dialog
- **Redis**: in-memory (no separate Redis needed)
