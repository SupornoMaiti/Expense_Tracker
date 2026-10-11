# Graph Report - Finance Tracker  (2026-10-12)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 523 nodes · 1372 edges · 28 communities (20 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0c5c88ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- PersonDetail.tsx
- db.ts
- AddFriendModal.tsx
- react
- App.tsx
- package.json
- devDependencies
- repositories.ts
- components.json
- dependencies
- compilerOptions
- compilerOptions
- drawer.tsx
- chart.tsx
- dropdown-menu.tsx
- sheet.tsx
- navigation-menu.tsx
- notifications.test.mjs
- scripts
- eslint.config.js
- @playwright/test
- vite.config.ts
- tsconfig.json
- final_check.sh
- final_check2.sh
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `Button()` - 39 edges
2. `react` - 33 edges
3. `PersonDetail()` - 25 edges
4. `cn` - 24 edges
5. `lucide-react` - 24 edges
6. `db` - 23 edges
7. `Analyze()` - 21 edges
8. `SettleUp()` - 21 edges
9. `Dashboard()` - 19 edges
10. `vitest` - 19 edges

## Surprising Connections (you probably didn't know these)
- `run()` --calls--> `ensureMe()`  [EXTRACTED]
  test_ensureme.ts → src/db/repositories.ts
- `bench()` --calls--> `calculateShares()`  [EXTRACTED]
  bench.ts → src/domain/allocation.ts
- `bench()` --calls--> `computeBalances()`  [EXTRACTED]
  bench.ts → src/domain/ledger.ts
- `seedAndMeasure()` --calls--> `calculateShares()`  [EXTRACTED]
  seed-measure.ts → src/domain/allocation.ts
- `seedAndMeasure()` --calls--> `computeBalances()`  [EXTRACTED]
  seed-measure.ts → src/domain/ledger.ts

## Import Cycles
- None detected.

## Communities (28 total, 8 thin omitted)

### Community 0 - "PersonDetail.tsx"
Cohesion: 0.10
Nodes (52): dexie-react-hooks, react-router-dom, sonner, AddExpenseModal(), Props, AddRefundModal(), Alert(), AlertDescription() (+44 more)

### Community 1 - "db.ts"
Cohesion: 0.08
Nodes (36): bench(), fake-indexeddb, @testing-library/react, vitest, seedAndMeasure(), Props, db, exportBackup() (+28 more)

### Community 2 - "AddFriendModal.tsx"
Cohesion: 0.08
Nodes (29): @base-ui/react, class-variance-authority, cn, AddFriendModal(), COLORS, EditFriendModal(), ImportBackupModal(), ImportBackupModalProps (+21 more)

### Community 3 - "react"
Cohesion: 0.15
Nodes (12): react, CategoriesManager(), COLOR_PRESETS, EMOJI_PRESETS, Card(), CardContent(), CardDescription(), CardHeader() (+4 more)

### Community 4 - "App.tsx"
Cohesion: 0.12
Nodes (16): lucide-react, react-dom, App(), AppShell(), NAV_ITEMS, ScrollToTop(), initialState, Theme (+8 more)

### Community 5 - "package.json"
Cohesion: 0.08
Nodes (25): name, private, type, version, autoprefixer, clsx, date-fns, dexie (+17 more)

### Community 6 - "devDependencies"
Cohesion: 0.08
Nodes (26): devDependencies, autoprefixer, clsx, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, fake-indexeddb (+18 more)

### Community 7 - "repositories.ts"
Cohesion: 0.14
Nodes (18): zod, createRefundForSettlement(), DEFAULT_CATEGORIES, ensureDefaultCategories(), ensureMe(), resetDatabase(), seedSampleData(), AmountMinorSchema (+10 more)

### Community 8 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, @base-ui/react, class-variance-authority, cn, date-fns, dexie, dexie-react-hooks, framer-motion (+13 more)

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

### Community 15 - "sheet.tsx"
Cohesion: 0.22
Nodes (3): SheetContent(), SheetOverlay(), SheetPortal()

### Community 16 - "navigation-menu.tsx"
Cohesion: 0.24
Nodes (4): NavigationMenu(), NavigationMenuPositioner(), NavigationMenuTrigger(), navigationMenuTriggerStyle

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

## Knowledge Gaps
- **18 isolated node(s):** `autoprefixer`, `clsx`, `date-fns`, `framer-motion`, `@hookform/resolvers` (+13 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 257 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `PersonDetail.tsx`, `AddFriendModal.tsx`, `App.tsx`, `package.json`, `repositories.ts`, `drawer.tsx`, `chart.tsx`, `dropdown-menu.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `clsx`, `date-fns` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PersonDetail.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10491228070175439 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08005427408412483 - nodes in this community are weakly interconnected._
- **Why does `cn` connect `AddFriendModal.tsx` to `PersonDetail.tsx`, `react`, `App.tsx`, `package.json`, `drawer.tsx`, `chart.tsx`, `dropdown-menu.tsx`, `sheet.tsx`, `navigation-menu.tsx`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Should `AddFriendModal.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08315863032844165 - nodes in this community are weakly interconnected._