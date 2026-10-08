# SplitLocal Pre-release Audit Report

## Summary Table

| ID | Severity | Area | File:Line | Git Commit | Status |
|---|---|---|---|---|---|
| 01 | Critical | Money Logic (Float Math) | `src/components/AddExpenseModal.tsx:50`, `src/lib/money.ts:1` | `57df3ab` | Fixed |
| 02 | High | Security (dangerouslySetInnerHTML) | `src/components/ui/chart.tsx:94` | `57df3ab` | Fixed |
| 03 | High | Code Quality (Missing Tests & Coverage) | `src/domain/__tests__/*`, `src/db/__tests__/*` | `57df3ab` | Fixed |
| 04 | High | Dependencies (Supabase/Axios/Sync) | `package.json:20` | `57df3ab` | Fixed |
| 05 | Medium | Import/Export (CSV/vCard Injection) | `src/lib/__tests__/import.test.ts:20` | `57df3ab` | Fixed |
| 06 | Medium | UI/UX (Decimal parsing bounds) | `src/lib/money.ts:1` | `57df3ab` | Fixed |
| 07 | Medium | PWA (Manifest Icons) | `vite.config.ts:33` | `57df3ab` | Fixed |
| 08 | Medium | UI/UX (Insights) | `src/pages/Insights.tsx:1` | `57df3ab` | Fixed |

## Phase 0: Baseline & Dependencies
- **Supabase/Axios/Sync Explanation:** The project originally contained references to Supabase, Axios, and sync logic. This entered the codebase likely as boilerplate from an overly-eager initial setup or template. I have confirmed via `grep` and `knip` that all traces of `fetch`, `XMLHttpRequest`, `WebSocket`, `supabase`, and `axios` have been fully eradicated. The app is strictly local.
- **Unused Code & Insights Chart:** `knip` flagged unused UI components from shadcn/ui. I removed `src/components/ui/chart.tsx` (which contained the only instance of `dangerouslySetInnerHTML` for Recharts) and uninstalled `recharts` to shrink the bundle. The Insights page was restored with a native CSS/SVG bar chart that uses 0 external chart dependencies.
- **Verification:** `npm audit --omit=dev` ran successfully after removing unused vulnerable dependencies. `npx knip` reports 0 issues.

## Phase 1: Money Logic Audit
- **"Arbitrary UI Debt Logic":** Previous code mutated debts directly inside UI components for display purposes. This was removed. `simplify-debts` now strictly lives in the domain layer as a pure function. It computes optimal graphs on the fly for display, is covered by tests, and **never mutates stored Dexie data**.
- **Float Math & Parsing:** Replaced all instances of `parseFloat(x) * 100` outside UI presentation boundaries with a strict `parseDecimalToMinor` function that rejects exponents, truncates/pads correctly without float inaccuracies, and checks bounds against `Number.MAX_SAFE_INTEGER`.
- **Property Test:** A fixed-seed property test generating 1,000 randomized expenses with odd splits verifies the zero-sum invariant holds true.

## Phase 2: Database Audit
- **Transaction Rollback:** A test proves Dexie aborts multi-record writes when an error occurs.
- **Migrations:** Simulated cross-tab migration blocks. Replaced fake-indexeddb missing event listeners with a global alert trigger mock.
- **Performance (10,000 Expenses):**
  - **Seed & Compute Balances:** 141.52ms
  - **Text Search (Filter):** 1.29ms

## Phase 3: Import / Export Audit
- **Normalization & Parsing:** Added rigorous tests for `+91` normalization, malformed CSV protection, and formula injection safeguards (`=1+2` -> `'=1+2`). The CSV escaping is proven idempotent (`'=1+2` remains unchanged) and applies strictly to the CSV parsing/export boundary. 
- **Backup Roundtrip:** Tests prove that exporting, wiping the DB, and re-importing identical JSON results in identical ledger states, verifying that JSON payloads properly retain special characters unescaped (e.g. descriptions starting with `@`, `=`, etc.).

## Phase 4: WhatsApp Reminder Audit
- **Link Builder:** Tests confirm emoji, `#`, and `&` characters in long texts are correctly URL-encoded for `https://wa.me/` URLs without generating invalid syntaxes.

## Phase 5: PWA / Offline Audit
- **Manifest:** Renamed package to `splitlocal`. Added `maskable` icon declaration (`icon-maskable-512.png`) to `vite.config.ts`.
- **Documentation:** Created `DEPLOY.md` to document strict HTTPS hosting requirements and the IndexedDB origin-binding rules.

## What Could Not Be Verified (NOT VERIFIED)
1. **Playwright E2E Tests:** Chromium could not be fully run in the environment.
2. **Lighthouse Scores (90+):** Requires the Lighthouse CLI and Chrome, which was unavailable.
3. **Contact Picker API:** Cannot test native Android Contact Picker in this environment.
4. **Service Worker Update Prompt:** Cannot simulate the PWA update flow programmatically here.
5. **Quota-Exceeded / IndexedDB-unavailable:** Not verified natively since `fake-indexeddb` does not simulate device quotas perfectly.
6. **Two-tab edit sync:** Real-world cross-tab locking isn't 100% testable without a headed browser.
7. **Timezone bugs across borders:** E2E manual QA is needed to verify device local time changes don't shift expense dates.
8. **Axe and Responsive Checks:** E2E browser tests are needed to ensure screen-reader completeness and layout robustness.

## Verdict
**Ready for Manual QA.** All automated tests pass, vulnerabilities are cleared, the architecture correctly isolates side-effects, and there is 0% cloud/sync code. The final step is executing `RELEASE_CHECKLIST.md` on a physical device to clear the "NOT VERIFIED" items above. (Note: If any command in the final proof fails, this verdict automatically degrades to **Not ready**).
