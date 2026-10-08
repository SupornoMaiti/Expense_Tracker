# SplitLocal Pre-release Audit Report

## Summary Table

| ID | Severity | Area | Status |
|---|---|---|---|
| 01 | Critical | Money Logic (Float Math) | Fixed |
| 02 | High | Security (dangerouslySetInnerHTML) | Fixed |
| 03 | High | Code Quality (Missing Tests & Coverage) | Fixed |
| 04 | High | Dependencies (Supabase/Axios/Sync) | Fixed |
| 05 | Medium | Import/Export (CSV/vCard Injection) | Fixed |
| 06 | Medium | UI/UX (Decimal parsing bounds) | Fixed |
| 07 | Medium | PWA (Manifest Icons) | Fixed |
| 08 | Low | Lighthouse & Playwright E2E | NOT VERIFIED |

## Phase 0: Baseline & Dependencies
- **Supabase/Axios/Sync Explanation:** The project originally contained references to Supabase, Axios, and sync logic. This entered the codebase likely as boilerplate from an overly-eager initial setup or template. I have confirmed via `grep` and `knip` that all traces of `fetch`, `XMLHttpRequest`, `WebSocket`, `supabase`, and `axios` have been fully eradicated. The app is strictly local.
- **Unused Code:** `knip` flagged unused UI components from shadcn/ui. We removed `src/components/ui/chart.tsx` (which contained the only instance of `dangerouslySetInnerHTML` for Recharts) and uninstalled `recharts` to shrink the bundle.
- **Verification:** `npm audit --omit=dev` ran successfully after removing unused vulnerable dependencies. `npx knip` reports 0 issues.

## Phase 1: Money Logic Audit
- **"Arbitrary UI Debt Logic":** Previous code mutated debts directly inside UI components for display purposes. This was removed. `simplify-debts` now strictly lives in the domain layer as a pure function (`simplifyDebts` in `src/domain/ledger.ts`). It computes optimal graphs on the fly for display, is covered by tests, and **never mutates stored Dexie data**.
- **Float Math & Parsing:** Replaced all instances of `parseFloat(x) * 100` with a strict `parseDecimalToMinor` function that rejects exponents, truncates/pads correctly without float inaccuracies, and checks bounds against `Number.MAX_SAFE_INTEGER`.
- **Property Test:** A fixed-seed property test generating 1,000 randomized expenses with odd splits verifies the zero-sum invariant holds true.

## Phase 2: Database Audit
- **Transaction Rollback:** A test proves Dexie aborts multi-record writes when an error occurs.
- **Migrations:** Simulated cross-tab migration blocks. Replaced fake-indexeddb missing event listeners with a global alert trigger mock.
- **Performance (10,000 Expenses):**
  - **Seed & Compute Balances:** 141.52ms
  - **Text Search (Filter):** 1.29ms

## Phase 3: Import / Export Audit
- **Normalization & Parsing:** Added rigorous tests for `+91` normalization, malformed CSV protection, and formula injection safeguards (`'=1+2` -> `''=1+2`).
- **Backup Roundtrip:** Tests prove that exporting, wiping the DB, and re-importing identical JSON results in identical ledger states.

## Phase 4: WhatsApp Reminder Audit
- **Link Builder:** Tests confirm emoji, `#`, and `&` characters in long texts are correctly URL-encoded for `https://wa.me/` URLs without generating invalid syntaxes.

## Phase 5: PWA / Offline Audit
- **Manifest:** Renamed package to `splitlocal`. Added `maskable` icon declaration (`icon-maskable-512.png`) to `vite.config.ts`.
- **Offline / Service Worker:** While we tested the manifest, actual service-worker update prompts cannot be simulated easily in the terminal.

## Phase 6 & 7: Code Quality / Security
- 26 tests written and passing, including all missing cases outlined in the review.
- Strict TypeScript (`npx tsc`) passes. Lint passes completely.

## What Could Not Be Verified (NOT VERIFIED)
1. **Playwright E2E Tests:** Chromium could not be fully run in the environment.
2. **Lighthouse Scores (90+):** Requires the Lighthouse CLI and Chrome, which was unavailable.
3. **Contact Picker API:** Cannot test native Android Contact Picker in this environment.
4. **Service Worker Update Prompt:** Cannot simulate the PWA update flow programmatically here.

## Verdict
**Ready for Manual QA.** All automated tests (26/26) pass, vulnerabilities are cleared, the architecture correctly isolates side-effects, and there is 0% cloud/sync code. The final step is executing `RELEASE_CHECKLIST.md` on a physical device to clear the "NOT VERIFIED" items above.
