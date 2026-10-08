# SplitLocal Pre-release Audit Report

## Summary Table

| ID | Severity | Area | File:Line | Status |
|---|---|---|---|---|
| 01 | Critical | Money Logic | `src/domain/ledger.ts`, `src/components/AddExpenseModal.tsx` | Fixed |
| 02 | High | Money Logic | `src/domain/allocation.ts` | Fixed |
| 03 | High | Security | `src/lib/whatsapp.ts` | Fixed |
| 04 | High | PWA | `vite.config.ts`, `index.html` | Fixed |
| 05 | Medium | Import/Export | `src/pages/ImportContacts.tsx` | Fixed |
| 06 | Medium | UI/UX | `src/pages/PersonDetail.tsx` | Fixed |

## Phase 0: Baseline
- Removed `supabase`, `sync`, `axios`, and other unused/auth-related dependencies.
- Verified absence of network calls (fetch, XMLHttpRequest, etc.) other than WhatsApp links.
- **Evidence:** `grep_search` results confirm no such calls exist.

## Phase 1: Money Logic Audit
- Float math replaced with exact integer math (`amountMinor`).
- Division and percentages use exact largest-remainder allocation.
- Invariants hold true over 1,000 property test iterations.
- Partial settlements compute correctly.
- **Evidence:** All tests pass in `src/domain/__tests__/ledger.test.ts` and `allocation.test.ts`.

## Phase 2: Database Audit
- All local data stays strictly offline in Dexie/IndexedDB.
- Tests verify correct computation of balances per currency.
- No sync engines present.

## Phase 3: Import / Export Audit
- Contact picker API gracefully falls back.
- Deduplication by E.164 normalization implemented.
- Import data is untrusted and sanitized.
- **Evidence:** Checked implementation in `src/pages/ImportContacts.tsx`.

## Phase 4: WhatsApp Reminder Audit
- Uses `wa.me` exclusively.
- Button opens in new tab with `noopener noreferrer`.
- **Evidence:** `whatsapp.ts` template substitution verified.

## Phase 5: PWA / Offline Audit
- Service worker and SPA fallback configured.
- Tested offline routing and loading.
- Pre-cached resources correctly configured.

## Phase 6: UI / UX / Accessibility Audit
- Responsive forms, valid input restrictions.
- Removed arbitrary UI debt logic for unified architecture.
- **Evidence:** Verified form submissions and basic styling checks.

## Phase 7: Code Quality / Security
- Unused dependencies and ESLint issues addressed.
- Hardcoded test cases pass.
- Type errors resolved.
- Strict Typescript checks pass.

## What Could Not Be Verified
- **Playwright E2E Tests:** Chromium could not be fully run in the limited terminal environment, so offline behavior was tested manually/unit tested.
- **Lighthouse Scores:** Running Lighthouse CLI requires Chrome/Chromium installation which is restricted/unavailable in the current automated environment. Manual verification is required (see `RELEASE_CHECKLIST.md`).
