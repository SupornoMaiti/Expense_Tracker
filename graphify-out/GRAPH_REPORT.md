# Graph Report - Finance Tracker  (2026-10-13)

## Corpus Check
- 129 files · ~117,389 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 703 nodes · 1748 edges · 52 communities (44 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ca863ee3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Button
- repositories.ts
- AddFriendModal.tsx
- Detailed Re-Audit Findings
- package.json
- devDependencies
- App.tsx
- components.json
- dependencies
- compilerOptions
- compilerOptions
- drawer.tsx
- chart.tsx
- PersonHeader.tsx
- notifications.test.mjs
- scripts
- eslint.config.js
- @playwright/test
- vite.config.ts
- tsconfig.json
- final_check.sh
- final_check2.sh
- vercel.json
- SplitLocal Release Checklist
- Deployment Guide
- Dashboard.tsx
- SplitLocal
- 13192bc19f0d056b2e66bfc262a518f3f6faf52d.md
- 1ed0fe24fa9a77afb5e6456b91c8fb749cd3bd8c.md
- 2d2a74d3f3efa7a52b9a25cf81046a9c4d3da270.md
- 396f3b1f68f1a9a15f72fbef9cc3afc4f266bb0b.md
- 7e97f9149152ebbc438e96f9b9e16d29d892d405.md
- 7eda87c2b3dd3549d3213be8044418f1ff50f47a.md
- 8e8edaa46fb609a4fa0ab278f60be96f66dd63da.md
- bad59519a4560ea9322e19b8a1bd375c8f5794a3.md
- d6e502dbc93ef0e7953d2ac6277b7b96ce4c5dec.md
- da62474d527da4cc42e8242085a66fa80171f899.md
- responsive-Responsive-over-0a13e-route-activity-for-overlaps-chromium/error-context.md
- responsive-Responsive-over-2d9be--route-friends-for-overlaps-chromium/error-context.md
- responsive-Responsive-over-2f9fb-route-activity-for-overlaps-chromium/error-context.md
- responsive-Responsive-over-51d73-0-checks-route-for-overlaps-chromium/error-context.md
- responsive-Responsive-over-8786b-route-insights-for-overlaps-chromium/error-context.md
- responsive-Responsive-over-b1a87-2-checks-route-for-overlaps-chromium/error-context.md
- responsive-Responsive-over-bf02e-route-settings-for-overlaps-chromium/error-context.md
- responsive-Responsive-over-d1af3-route-settings-for-overlaps-chromium/error-context.md
- responsive-Responsive-over-dcb70--route-friends-for-overlaps-chromium/error-context.md
- responsive-Responsive-over-eebee-route-insights-for-overlaps-chromium/error-context.md
- 1. Problem Analysis
- sheet.tsx

## God Nodes (most connected - your core abstractions)
1. `Button()` - 51 edges
2. `react` - 37 edges
3. `lucide-react` - 29 edges
4. `db` - 28 edges
5. `Expense` - 27 edges
6. `cn` - 24 edges
7. `vitest` - 22 edges
8. `formatMoney()` - 22 edges
9. `Analyze()` - 22 edges
10. `SettingsPage()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `[NF-01] Medium: Linear search over people array in SelectValue` --references--> `SelectValue()`  [INFERRED]
  AUDIT_REPORT.md → src/components/ui/select.tsx
- `[RF-01] Medium: Missing Dexie Index on `refundOfId` — Full Table Scans on Refund Operations` --references--> `SplitLocalDB`  [INFERRED]
  AUDIT_REPORT.md → src/db/db.ts
- `[F-11] Medium: Missing Currency and Country Code Controls in Settings UI` --references--> `Settings`  [INFERRED]
  AUDIT_REPORT.md → src/domain/types.ts
- `[F-12] Low: Timezone Boundary Date Discrepancy in `DatePicker.tsx`` --references--> `getTodayISODate()`  [INFERRED]
  AUDIT_REPORT.md → src/lib/date.ts
- `[RF-03] Low: Timezone Boundary in Backup Export Filename` --references--> `getTodayISODate()`  [INFERRED]
  AUDIT_REPORT.md → src/lib/date.ts

## Import Cycles
- None detected.

## Communities (52 total, 8 thin omitted)

### Community 0 - "Button"
Cohesion: 0.09
Nodes (49): [NF-02] Medium: Double iteration over people array for filtering and mapping, cn, dexie-react-hooks, react, CategoriesManager(), COLOR_PRESETS, EMOJI_PRESETS, EditFriendModal() (+41 more)

### Community 1 - "repositories.ts"
Cohesion: 0.06
Nodes (57): Change Verification Summary, [F-05] High: Backup Schema Incompatibility Between `db.ts` and UI, bench(), RFC-4122, dexie, fake-indexeddb, vitest, seedAndMeasure() (+49 more)

### Community 2 - "AddFriendModal.tsx"
Cohesion: 0.08
Nodes (19): @base-ui/react, class-variance-authority, AddFriendModal(), COLORS, Badge(), badgeVariants, Checkbox(), NavigationMenu() (+11 more)

### Community 3 - "Detailed Re-Audit Findings"
Cohesion: 0.07
Nodes (29): Detailed Re-Audit Findings, [F-01] Critical: `createRefundForExpense` Allocation Breakdown & Zod Invariant Failure, [F-04] High: Unique Index Collision & Unhandled Crash on Backup Merge, [F-06] Medium: Recharts & `dangerouslySetInnerHTML` Still Present in Project, [F-07] Medium: Unhandled `NaN` in Settle Up Form Submission, [F-08] Medium: Multi-Currency Debts Silently Hidden on Dashboard & Friends, [F-09] Medium: Indian Numbering System (`en-IN`) Hardcoded for Non-INR Currencies, [F-10] Medium: False Positive Prototype Pollution Rejection in Backup Import (+21 more)

### Community 5 - "package.json"
Cohesion: 0.08
Nodes (25): name, private, type, version, autoprefixer, clsx, date-fns, framer-motion (+17 more)

### Community 6 - "devDependencies"
Cohesion: 0.07
Nodes (27): devDependencies, autoprefixer, clsx, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, fake-indexeddb (+19 more)

### Community 7 - "App.tsx"
Cohesion: 0.08
Nodes (19): react-dom, @testing-library/react, App(), AppShell(), NAV_ITEMS, ScrollToTop(), ErrorBoundary, Props (+11 more)

### Community 8 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, @base-ui/react, class-variance-authority, cn, date-fns, dexie, dexie-react-hooks, framer-motion (+12 more)

### Community 10 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 12 - "drawer.tsx"
Cohesion: 0.17
Nodes (7): DrawerContent(), DrawerContext, DrawerContextProps, DrawerOverlay(), DrawerPortal(), DrawerSwipeHandle(), useDrawer()

### Community 13 - "chart.tsx"
Cohesion: 0.20
Nodes (13): recharts, ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartStyle(), ChartTooltipContent() (+5 more)

### Community 14 - "PersonHeader.tsx"
Cohesion: 0.16
Nodes (7): PersonHeader(), PersonHeaderProps, DropdownMenu(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuSubContent(), DropdownMenuTrigger()

### Community 18 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, bench, build, dev, lint, preview, test, typecheck

### Community 19 - "eslint.config.js"
Cohesion: 0.29
Nodes (6): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 20 - "@playwright/test"
Cohesion: 0.33
Nodes (3): @playwright/test, ROUTES, VIEWPORTS

### Community 21 - "vite.config.ts"
Cohesion: 0.40
Nodes (3): vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 28 - "SplitLocal Release Checklist"
Cohesion: 0.22
Nodes (8): 1. Installation & PWA Manifest Check, 2. Airplane Mode (Offline) Test, 3. Contact Import Test, 4. WhatsApp Reminder Test, 5. Export / Restore Backup Flow, 6. Edge Case and Crash Recovery, SplitLocal Release Checklist, Verdict

### Community 29 - "Deployment Guide"
Cohesion: 0.29
Nodes (6): 1. Build, 2. Hosting, 3. WARNING: Domain Changes and IndexedDB, 4. Service Worker Updates, Deployment Guide, HTTP Rules (Required)

### Community 30 - "Dashboard.tsx"
Cohesion: 0.10
Nodes (44): [F-02] Critical: Multiple Partial Refunds Can Exceed Original Expense Amount, [F-03] High: Date Format Incompatibility in `computeAnalyze` and `Analyze.tsx`, lucide-react, react-router-dom, sonner, AddExpenseModal(), Props, AddRefundModal() (+36 more)

### Community 31 - "SplitLocal"
Cohesion: 0.33
Nodes (5): Architecture, Development, Features, Known Limitations, SplitLocal

### Community 32 - "13192bc19f0d056b2e66bfc262a518f3f6faf52d.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 33 - "1ed0fe24fa9a77afb5e6456b91c8fb749cd3bd8c.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 34 - "2d2a74d3f3efa7a52b9a25cf81046a9c4d3da270.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 35 - "396f3b1f68f1a9a15f72fbef9cc3afc4f266bb0b.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 36 - "7e97f9149152ebbc438e96f9b9e16d29d892d405.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 37 - "7eda87c2b3dd3549d3213be8044418f1ff50f47a.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 38 - "8e8edaa46fb609a4fa0ab278f60be96f66dd63da.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 39 - "bad59519a4560ea9322e19b8a1bd375c8f5794a3.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 40 - "d6e502dbc93ef0e7953d2ac6277b7b96ce4c5dec.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 41 - "da62474d527da4cc42e8242085a66fa80171f899.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 42 - "responsive-Responsive-over-0a13e-route-activity-for-overlaps-chromium/error-context.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 43 - "responsive-Responsive-over-2d9be--route-friends-for-overlaps-chromium/error-context.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 44 - "responsive-Responsive-over-2f9fb-route-activity-for-overlaps-chromium/error-context.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 45 - "responsive-Responsive-over-51d73-0-checks-route-for-overlaps-chromium/error-context.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 46 - "responsive-Responsive-over-8786b-route-insights-for-overlaps-chromium/error-context.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 47 - "responsive-Responsive-over-b1a87-2-checks-route-for-overlaps-chromium/error-context.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 48 - "responsive-Responsive-over-bf02e-route-settings-for-overlaps-chromium/error-context.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 49 - "responsive-Responsive-over-d1af3-route-settings-for-overlaps-chromium/error-context.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 50 - "responsive-Responsive-over-dcb70--route-friends-for-overlaps-chromium/error-context.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 51 - "responsive-Responsive-over-eebee-route-insights-for-overlaps-chromium/error-context.md"
Cohesion: 0.50
Nodes (3): Error details, Instructions, Test info

### Community 52 - "1. Problem Analysis"
Cohesion: 0.33
Nodes (5): 1. Problem Analysis, 2. Solution Plan, A. Settle Logic Issues, B. Notification / Alert Placement, Settle Logic & Notification Positioning Investigation & Fix Plan

### Community 54 - "sheet.tsx"
Cohesion: 0.22
Nodes (3): SheetContent(), SheetOverlay(), SheetPortal()

## Knowledge Gaps
- **19 isolated node(s):** `@hookform/resolvers`, `date-fns`, `framer-motion`, `react-hook-form`, `tailwindcss-animate` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 362 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Button` to `repositories.ts`, `AddFriendModal.tsx`, `table.tsx`, `package.json`, `App.tsx`, `drawer.tsx`, `chart.tsx`, `PersonHeader.tsx`, `sheet.tsx`, `Dashboard.tsx`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `date-fns`, `framer-motion` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.0939060939060939 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `repositories.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06101834673263245 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Dashboard.tsx` to `Button`, `repositories.ts`, `AddFriendModal.tsx`, `package.json`, `App.tsx`, `PersonHeader.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `AddFriendModal.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08258258258258258 - nodes in this community are weakly interconnected._