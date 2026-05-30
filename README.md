<div align="center">

# FinTrack

**Offline-first personal finance & debt tracker — built as a Progressive Web App**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-00ff88?style=flat-square)](LICENSE)

*Track expenses · Manage debts · Get reminded · Works offline · Zero cost*

</div>

---

## Overview

FinTrack is a zero-cost, offline-first personal finance PWA designed for students and young professionals. It tracks daily transactions, manages peer-to-peer debts, and sends reminders for money lent — all without requiring an internet connection.

Data is written locally to **IndexedDB** first and synced to **Supabase** when connectivity is restored, using an **Outbox Pattern** to guarantee no data loss across devices.

---

## Key Features

| Feature | Details |
|---|---|
| **Offline-first** | All reads/writes go through IndexedDB — no network required |
| **Cross-device sync** | Outbox pattern drains to Supabase PostgreSQL when online |
| **Debt tracking** | Per-person ledger with net balance, settle/delete actions |
| **Smart reminders** | Due-date alerts on Dashboard + browser/PWA push notifications |
| **WhatsApp nudge** | One-tap `wa.me` deeplink with pre-filled reminder message |
| **PWA installable** | Service worker via Workbox — installs as native app on Android/iOS |
| **Modern Terminal UI** | High-contrast dark theme, Fira Code, CRT scanlines, phosphor glow |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                Browser / PWA                │
│                                             │
│  ┌──────────────┐      ┌─────────────────┐  │
│  │   React UI   │◄────►│   IndexedDB     │  │
│  │  (optimistic │      │  (local truth)  │  │
│  │   updates)   │      │  + Outbox queue │  │
│  └──────────────┘      └────────┬────────┘  │
│                                 │            │
│                        Service Worker        │
│                        (Workbox / BGSync)    │
│                                 │            │
└─────────────────────────────────┼────────────┘
                                  │  (when online)
                          ┌───────▼────────┐
                          │   Supabase     │
                          │  PostgreSQL    │
                          │  + RLS + RT    │
                          └───────────────┘
```

**Outbox Pattern:**
1. User writes a transaction → saved to IndexedDB instantly
2. If offline → operation queued in an `outbox` store with timestamp
3. On reconnect → Service Worker fires `sync`, outbox drains to Supabase
4. Conflict resolution: **Last-Write-Wins by `created_at`** timestamp

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 19 + TypeScript | Strict typing, concurrent features |
| Build | Vite 8 | Sub-second HMR, native ESM |
| Styling | Vanilla CSS (custom properties) | Zero runtime overhead, full control |
| Local DB | IndexedDB via `idb` | Structured offline storage |
| Cloud DB | Supabase (PostgreSQL) | Open-source, RLS, free tier |
| PWA | vite-plugin-pwa + Workbox | Precaching, background sync |
| Hosting | Vercel / Cloudflare Pages | Push-to-deploy, global CDN |

---

## Data Model

```sql
transactions  (id, user_id, amount, type, category, description, created_at, synced_at, device_id)
people        (id, user_id, name, phone, created_at)
debts         (id, user_id, person_id, amount, note, settled, due_date, created_at)
outbox        (id, table, operation, payload, created_at)   -- IndexedDB only
```

Row-Level Security enforced on all Supabase tables — users can only read/write their own data.

---

## Local Development

```bash
git clone https://github.com/SupornoMaiti/fintrack.git
cd fintrack
npm install
npm run dev          # → http://localhost:5173
```

The app works **fully offline** without any environment variables. Supabase is optional.

### Enable Cloud Sync (optional)

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

Run `supabase-schema.sql` in your Supabase SQL Editor, then restart the dev server.

---

## Deployment

```bash
npm run build        # output → dist/
```

Deploy `dist/` to **Vercel** or **Cloudflare Pages**. Add the two environment variables in the platform dashboard — no other configuration needed.

---

## Project Structure

```
src/
├── lib/
│   ├── db.ts              # IndexedDB wrapper — all stores + CRUD + outbox
│   ├── sync.ts            # Outbox drain engine + background sync registration
│   ├── supabase.ts        # Supabase client (null-guarded — works without config)
│   └── notifications.ts   # Web Notifications API — permission + push logic
├── hooks/
│   ├── useTransactions.ts # Loads from IDB, triggers sync on reconnect
│   ├── useDebts.ts        # Per-person net balance computation
│   ├── useReminders.ts    # Due-date filtering + push notification dispatch
│   └── useOnlineStatus.ts # Reactive navigator.onLine
├── components/
│   ├── TransactionList    # Ledger table with pending-sync indicator
│   ├── AddTransactionModal
│   ├── DebtLedger         # Quick-add form + active debt table with DUE column
│   ├── PersonCard         # Net balance card + WhatsApp deeplink
│   ├── ReminderBanner     # Overdue/upcoming alert with settle + notify actions
│   ├── SyncStatusBar      # ● SYNCED / ◌ PENDING(n) / ✗ OFFLINE
│   └── CategoryBadge      # Color-coded terminal-style category tags
└── pages/
    ├── Dashboard          # Stats grid + reminder banner + recent transactions
    ├── Transactions       # Full ledger with type/category filters
    ├── Debts              # People tab + ledger tab
    └── PersonDetail       # Per-person debt history + inline entry form
```

---

## Design System

The UI follows a **"Modern Terminal"** aesthetic:

- **Font:** Fira Code (monospaced)
- **Palette:** `#080808` background · `#00ff88` phosphor-green accent · `#ff4757` expense red
- **Effects:** CRT scanlines via `repeating-linear-gradient`, phosphor glow via `text-shadow` / `box-shadow`
- **Layout:** CSS custom properties for all tokens — no Tailwind, no CSS-in-JS

---

## Roadmap

- [ ] Supabase Auth (magic-link email login)
- [ ] Real-time cross-device sync (Supabase Realtime subscriptions)
- [ ] Expense split calculator
- [ ] WhatsApp breakdown message generator
- [ ] Monthly budget goals + overspend alerts
- [ ] Capacitor wrapper → Android APK

---

## License

MIT © [Suporno Maiti](https://github.com/SupornoMaiti)
