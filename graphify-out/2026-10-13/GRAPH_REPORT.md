# Graph Report - Finance Tracker  (2026-10-13)

## Corpus Check
- 131 files · ~120,384 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 719 nodes · 1775 edges · 55 communities (46 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d0b88e74`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SettleUp.tsx
- db.ts
- navigation-menu.tsx
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
- schemas.ts
- repositories.ts
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
- Button
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
- Bug Auditor

## God Nodes (most connected - your core abstractions)
1. `Button()` - 51 edges
2. `react` - 37 edges
3. `db` - 29 edges
4. `lucide-react` - 29 edges
5. `Expense` - 27 edges
6. `cn` - 24 edges
7. `vitest` - 23 edges
8. `Analyze()` - 22 edges
9. `SettingsPage()` - 22 edges
10. `SettleUp()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `[RF-01] Medium: Missing Dexie Index on `refundOfId` — Full Table Scans on Refund Operations` --references--> `SplitLocalDB`  [INFERRED]
  AUDIT_REPORT.md → src/db/db.ts
- `[F-11] Medium: Missing Currency and Country Code Controls in Settings UI` --references--> `Settings`  [INFERRED]
  AUDIT_REPORT.md → src/domain/types.ts
- `[NF-01] Medium: Linear search over people array in SelectValue` --references--> `SelectValue()`  [INFERRED]
  AUDIT_REPORT.md → src/components/ui/select.tsx
- `[F-03] High: Date Format Incompatibility in `computeAnalyze` and `Analyze.tsx`` --references--> `computeAnalyze()`  [INFERRED]
  AUDIT_REPORT.md → src/domain/analyze.ts
- `[F-12] Low: Timezone Boundary Date Discrepancy in `DatePicker.tsx`` --references--> `getTodayISODate()`  [INFERRED]
  AUDIT_REPORT.md → src/lib/date.ts

## Import Cycles
- None detected.

## Communities (55 total, 9 thin omitted)

### Community 0 - "SettleUp.tsx"
Cohesion: 0.07
Nodes (52): [NF-02] Medium: Double iteration over people array for filtering and mapping, RFC-4122, cn, react, AddExpenseModal(), Props, CategoriesManager(), COLOR_PRESETS (+44 more)

### Community 1 - "db.ts"
Cohesion: 0.08
Nodes (38): Change Verification Summary, [F-05] High: Backup Schema Incompatibility Between `db.ts` and UI, bench(), fake-indexeddb, react-router-dom, @testing-library/react, vitest, seedAndMeasure() (+30 more)

### Community 2 - "navigation-menu.tsx"
Cohesion: 0.24
Nodes (4): NavigationMenu(), NavigationMenuPositioner(), NavigationMenuTrigger(), navigationMenuTriggerStyle

### Community 3 - "Detailed Re-Audit Findings"
Cohesion: 0.05
Nodes (37): Detailed Re-Audit Findings, [F5-01] Medium: React 19 State Cascade in AddExpenseModal Hydration, [F5-02] Medium: IndexedDB Unique Constraint Collision on `importBackup()`, [F5-03] Low: Variable Naming Discrepancy on Dashboard Spend Card, [F5-04] Low: Search Filter Linear Scan in Activity Feed, [F-01] Critical: `createRefundForExpense` Allocation Breakdown & Zod Invariant Failure, [F-03] High: Date Format Incompatibility in `computeAnalyze` and `Analyze.tsx`, [F-04] High: Unique Index Collision & Unhandled Crash on Backup Merge (+29 more)

### Community 5 - "package.json"
Cohesion: 0.07
Nodes (26): name, private, type, version, autoprefixer, clsx, date-fns, dexie (+18 more)

### Community 6 - "devDependencies"
Cohesion: 0.07
Nodes (27): devDependencies, autoprefixer, clsx, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, fake-indexeddb (+19 more)

### Community 7 - "App.tsx"
Cohesion: 0.08
Nodes (25): lucide-react, App(), AppShell(), NAV_ITEMS, ScrollToTop(), ErrorBoundary, Props, State (+17 more)

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

### Community 15 - "schemas.ts"
Cohesion: 0.22
Nodes (8): zod, AmountMinorSchema, CurrencySchema, DateSchema, ExpensePayerSchema, ExpenseSchema, ExpenseShareSchema, SettlementSchema

### Community 16 - "repositories.ts"
Cohesion: 0.18
Nodes (26): [F-02] Critical: Multiple Partial Refunds Can Exceed Original Expense Amount, dexie-react-hooks, sonner, AddRefundModal(), Props, PersonActivityFeed(), CurrencyIcon(), CurrencyIconProps (+18 more)

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

### Community 30 - "Button"
Cohesion: 0.10
Nodes (36): @base-ui/react, class-variance-authority, AddFriendModal(), COLORS, EditFriendModal(), hasPrototypePollution(), ImportBackupModal(), ImportBackupModalProps (+28 more)

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

### Community 53 - "Bug Auditor"
Cohesion: 0.25
Nodes (7): Bug Auditor, Final output, Project context (do not violate), Rules of evidence, Stage 1: FIND, Stage 2: REPORT, Stage 3: FIX

## Knowledge Gaps
- **19 isolated node(s):** `RFC-4122`, `autoprefixer`, `clsx`, `date-fns`, `framer-motion` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 374 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `SettleUp.tsx` to `table.tsx`, `package.json`, `App.tsx`, `drawer.tsx`, `chart.tsx`, `PersonHeader.tsx`, `repositories.ts`, `avatar.tsx`, `Button`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `RFC-4122`, `autoprefixer`, `clsx` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SettleUp.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07031463748290014 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0848982785602504 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `App.tsx` to `SettleUp.tsx`, `db.ts`, `navigation-menu.tsx`, `package.json`, `PersonHeader.tsx`, `repositories.ts`, `Button`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `Detailed Re-Audit Findings` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._