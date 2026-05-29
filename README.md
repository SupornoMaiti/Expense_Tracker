# FinTrack — Personal Finance Tracker

> Offline-first PWA · Zero cost · Modern Terminal UI

---

## Quick Start (Dev)

```bash
# 1. Install dependencies (already done if you're reading this)
npm install

# 2. Start dev server
npm run dev
# → http://localhost:5173
```

---

## Setup: Supabase (Cloud Sync)

Without Supabase the app works fully offline. To enable cross-device sync:

### Step 1 — Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. **GitHub Student Pack:** Link your account at [supabase.com/github-education](https://supabase.com/github-education) to get Pro free for 12 months (eliminates free-tier auto-pause)

### Step 2 — Run schema

Open Supabase Dashboard → **SQL Editor** → New Query → paste contents of `supabase-schema.sql` → Run.

### Step 3 — Configure credentials

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these at: Supabase Dashboard → Project Settings → API.

---

## Deploy: Cloudflare Pages (Free)

```bash
# Build the app
npm run build
```

1. Push this repo to GitHub
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → New Project → Connect GitHub
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output:** `dist`
4. Add environment variables (same as `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy — get a free `*.pages.dev` URL

---

## Install as PWA

- **Android/Chrome:** Open the app URL → menu → *Add to Home Screen*
- **Desktop:** Click the install icon in the browser address bar

Works fully **offline** after first install.

---

## Features (Phase 1)

| Feature | Status |
|---|---|
| Add income / expense transactions | ✅ |
| Category tagging (food, transport, rent…) | ✅ |
| Net balance + monthly spend summary | ✅ |
| Filter by type / category | ✅ |
| Offline-first (IndexedDB) | ✅ |
| Outbox sync to Supabase when online | ✅ |
| Add contacts / debt tracking | ✅ |
| Net balance per person | ✅ |
| Settle / delete debts | ✅ |
| WhatsApp quick-message link | ✅ |
| PWA installable | ✅ |
| Modern Terminal dark UI | ✅ |

## Roadmap (Phase 2)

- [ ] Supabase Auth (magic-link email login)
- [ ] Expense split calculator
- [ ] WhatsApp pre-filled breakdown message
- [ ] Realtime cross-device sync (Supabase Realtime)
- [ ] Monthly budget goals

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript |
| Styling | Vanilla CSS (CSS variables) |
| Local DB | IndexedDB via `idb` |
| Cloud DB | Supabase (PostgreSQL) |
| Hosting | Cloudflare Pages |
| PWA | vite-plugin-pwa + Workbox |

---

*Built for zero cost with GitHub Student Developer Pack.*
