# AUDIT_REPORT

## Summary table

| ID | Severity | Area | file:line | Status |
|---|---|---|---|---|
| AUDIT-01 | Medium | Money input validation | src/lib/money.ts:27-29 | Fixed (commit: pending, test: `parseDecimalToMinor rejects inputs with more than two decimal places`) |
| AUDIT-02 | High | Dependency security | package-lock.json (npm audit --omit=dev) | Open |

## Bugs

### AUDIT-01: Amount parser silently truncates extra decimal places
- Description: `parseDecimalToMinor` truncates decimals beyond 2 places instead of rejecting invalid money input.
- Reproduction: `parseDecimalToMinor("1.999")` returns `199` instead of invalid input.
- Root cause: `decPart` is sliced with `substring(0, 2)`.
- Impact: User can enter amounts with more than 2 decimals and app silently changes value.
- Fix: reject inputs where the decimal part has more than 2 digits in `parseDecimalToMinor`.
- Regression test: `src/lib/__tests__/money.test.ts` → `parseDecimalToMinor > rejects inputs with more than two decimal places`.

### AUDIT-02: High-severity production dependency vulnerabilities
- Description: `npm audit --omit=dev` reports high vulnerabilities in production dependency tree.
- Reproduction: Run `npm audit --omit=dev`.
- Root cause: Transitive dependency versions include vulnerable ranges.
- Impact: Security risk remains in shipped dependency graph.

## Checks run
\n### Command: npx tsc -b --noEmit\n
\n### Command: npx eslint .\n
\n### Command: npx knip; echo "knip exit: 0"\n
Unused files (10)
seed-measure.ts                      
src/components/ui/avatar.tsx         
src/components/ui/badge.tsx          
src/components/ui/drawer.tsx         
src/components/ui/navigation-menu.tsx
src/components/ui/scroll-area.tsx    
src/components/ui/sheet.tsx          
src/components/ui/skeleton.tsx       
src/components/ui/table.tsx          
test_ensureme.ts                     
Unused dependencies (3)
@hookform/resolvers  package.json:17:6
framer-motion        package.json:23:6
react-hook-form      package.json:28:6
Unused devDependencies (4)
clsx            package.json:46:6
shadcn          package.json:55:6
sharp           package.json:56:6
tailwind-merge  package.json:57:6
Unlisted dependencies (1)
glob  src/__tests__/no-stubs.test.ts:4:26
Unresolved imports (1)
../src/lib/notifications.ts  tests/notifications.test.mjs:4:35
Unused exports (48)
ErrorBoundary                  class     src/components/ErrorBoundary.tsx:15:14              
PersonActivityFeed             function  src/components/person/PersonActivityFeed.tsx:22:17  
PersonBalanceSummary           function  src/components/person/PersonBalanceSummary.tsx:31:17
PersonHeader                   function  src/components/person/PersonHeader.tsx:21:17        
AlertAction                              src/components/ui/alert.tsx:75:47                   
buttonVariants                           src/components/ui/button.tsx:57:18                  
CardFooter                               src/components/ui/card.tsx:97:3                     
CardAction                               src/components/ui/card.tsx:99:3                     
ChartLegend                              src/components/ui/chart.tsx:368:3                   
ChartLegendContent                       src/components/ui/chart.tsx:369:3                   
ChartStyle                               src/components/ui/chart.tsx:370:3                   
ConfirmDialog                  function  src/components/ui/ConfirmDialog.tsx:23:17           
CurrencyIcon                   function  src/components/ui/CurrencyIcon.tsx:7:17             
DialogClose                              src/components/ui/dialog.tsx:149:3                  
DialogOverlay                            src/components/ui/dialog.tsx:154:3                  
DialogPortal                             src/components/ui/dialog.tsx:155:3                  
DialogTrigger                            src/components/ui/dialog.tsx:157:3                  
DropdownMenuPortal                       src/components/ui/dropdown-menu.tsx:253:3           
DropdownMenuGroup                        src/components/ui/dropdown-menu.tsx:256:3           
DropdownMenuLabel                        src/components/ui/dropdown-menu.tsx:257:3           
DropdownMenuCheckboxItem                 src/components/ui/dropdown-menu.tsx:259:3           
DropdownMenuRadioGroup                   src/components/ui/dropdown-menu.tsx:260:3           
DropdownMenuRadioItem                    src/components/ui/dropdown-menu.tsx:261:3           
DropdownMenuSeparator                    src/components/ui/dropdown-menu.tsx:262:3           
DropdownMenuShortcut                     src/components/ui/dropdown-menu.tsx:263:3           
DropdownMenuSub                          src/components/ui/dropdown-menu.tsx:264:3           
DropdownMenuSubTrigger                   src/components/ui/dropdown-menu.tsx:265:3           
DropdownMenuSubContent                   src/components/ui/dropdown-menu.tsx:266:3           
PopoverDescription                       src/components/ui/popover.tsx:83:3                  
PopoverHeader                            src/components/ui/popover.tsx:84:3                  
PopoverTitle                             src/components/ui/popover.tsx:85:3                  
SelectGroup                              src/components/ui/select.tsx:190:3                  
SelectLabel                              src/components/ui/select.tsx:192:3                  
SelectScrollDownButton                   src/components/ui/select.tsx:193:3                  
SelectScrollUpButton                     src/components/ui/select.tsx:194:3                  
SelectSeparator                          src/components/ui/select.tsx:195:3                  
tabsListVariants                         src/components/ui/tabs.tsx:79:52                    
Tooltip                                  src/components/ui/tooltip.tsx:63:10                 
TooltipTrigger                           src/components/ui/tooltip.tsx:63:19                 
TooltipContent                           src/components/ui/tooltip.tsx:63:35                 
SplitLocalDB                   class     src/db/db.ts:15:14                                  
updateExpense                  function  src/db/repositories.ts:32:23                        
getActiveExpensesByGroupId     function  src/db/repositories.ts:220:23                       
getActiveSettlementsByGroupId  function  src/db/repositories.ts:343:23                       
getPersonByPhone               function  src/db/repositories.ts:354:23                       
seedSampleData                 function  src/db/repositories.ts:506:23                       
MONTH_SHORT                              src/lib/date.ts:104:23                              
formatWhatsAppDate             function  src/lib/whatsapp.ts:6:17                            
Unused exported types (1)
ConfirmDialogProps  interface  src/components/ui/ConfirmDialog.tsx:11:18
Duplicate exports (6)
ErrorBoundary|default         src/components/ErrorBoundary.tsx              
PersonActivityFeed|default    src/components/person/PersonActivityFeed.tsx  
PersonBalanceSummary|default  src/components/person/PersonBalanceSummary.tsx
PersonHeader|default          src/components/person/PersonHeader.tsx        
ConfirmDialog|default         src/components/ui/ConfirmDialog.tsx           
CurrencyIcon|default          src/components/ui/CurrencyIcon.tsx            
knip exit: 1
\n### Command: npx vitest run --reporter=verbose\n

 RUN  v5.0.3 /home/runner/work/Expense_Tracker/Expense_Tracker

 ✓ src/__tests__/backup.test.tsx > Backup Import/Export > merge twice gives no duplicates 325ms
 ✓ src/__tests__/backup.test.tsx > Backup Import/Export > Replace with a corrupt file leaves data untouched 73ms
 ✓ src/__tests__/backup.test.tsx > Backup Import/Export > a backup containing a Me, merged into a DB that has its own Me, results in exactly one Me 264ms
 ✓ src/__tests__/backup.test.tsx > Backup Import/Export > a newer schemaVersion is rejected with a clear message 51ms
 ✓ src/__tests__/backup.test.tsx > Backup Import/Export > export then import into an empty DB gives identical balances 352ms
 ✓ src/__tests__/activityAndSettlementReset.test.tsx > Activity Share View and Friend Settlement Reset > Feature 1: Activity Tab (My Share & User Transactions) > shows user share by default and filters to transactions involving user 279ms
 ✓ src/__tests__/activityAndSettlementReset.test.tsx > Activity Share View and Friend Settlement Reset > Feature 2: Friend Section (Amount to be Settled & Reset after Settlement) > shows Amount to be Settled and resets subcards after settlement 92ms
 ✓ src/__tests__/layout.test.tsx > App Layout Navigation > renders all nav items and settings at both widths 358ms
 ✓ src/__tests__/ensureMe.test.tsx > ensureMe logic > an existing DB with only "Raj" gets a Me after startup 19ms
 ✓ src/__tests__/ensureMe.test.tsx > ensureMe logic > two concurrent startups create exactly one Me 4ms
 ✓ src/__tests__/ensureMe.test.tsx > ensureMe logic > duplicate Me rows are merged with their data repointed 7ms
 ✓ src/__tests__/ensureMe.test.tsx > ensureMe logic > the Add Expense form renders Me checked and selected on open 202ms
 ✓ src/__tests__/ensureMe.test.tsx > ensureMe logic > "Biryani 100, Me paid, split Me and Raj" gives Raj a balance of 50 owed to me 33ms
 ✓ src/__tests__/dashboardCurrency.test.tsx > Dashboard Currency (H1) > renders configured USD currency symbol instead of hardcoded INR 142ms
 ✓ src/db/__tests__/repositories.test.ts > repositories > creates and retrieves an expense 10ms
 ✓ src/db/__tests__/repositories.test.ts > repositories > fails to create an expense if invariants are violated 2ms
 ✓ src/db/__tests__/repositories.test.ts > repositories > soft deletes an expense 6ms
 ✓ src/db/__tests__/repositories.test.ts > repositories > cascades soft-delete to linked refund expenses and restores both on undo 17ms
 ✓ src/db/__tests__/repositories.test.ts > repositories > cascades soft-delete to linked refund settlements when parent expense is deleted 8ms
 ✓ src/db/__tests__/repositories.test.ts > repositories > cascades soft-delete to refund settlements when parent settlement is deleted 11ms
 ✓ src/db/__tests__/repositories.test.ts > repositories > resets database to clean slate or sample data 10ms
 ✓ src/db/__tests__/repositories.test.ts > repositories > createRefundForExpense correctly assigns payers and shares summing to amountMinor (C1) 8ms
 ✓ src/db/__tests__/repositories.test.ts > repositories > getActiveExpenses excludes soft-deleted items (H3) 2ms
 ✓ src/db/__tests__/repositories.test.ts > repositories > restoreExpense throws when trying to restore child refund whose parent is deleted (M4) 4ms
 ✓ src/__tests__/errorBoundary.test.tsx > ErrorBoundary > renders children when no error occurs 21ms
 ✓ src/__tests__/errorBoundary.test.tsx > ErrorBoundary > catches render error and displays fallback UI 32ms
 ✓ src/__tests__/errorBoundary.test.tsx > ErrorBoundary > renders custom fallback if provided 4ms
 ✓ src/db/__tests__/backup.test.ts > Backup and restore logic > exports, wipes, and imports with identical data 25ms
 ✓ src/db/__tests__/backup.test.ts > Backup and restore logic > JSON backup round trip preserves descriptions starting with = + - @ 2ms
 ✓ src/db/__tests__/backup.test.ts > Backup and restore logic > deduplicates duplicate phone numbers in people to avoid ConstraintError 4ms
 ✓ src/lib/__tests__/whatsapp.test.ts > whatsapp url building > buildReminderMessage - Two dates with two entries and one entry, exact expected string 16ms
 ✓ src/lib/__tests__/whatsapp.test.ts > whatsapp url building > Date conversion: 2026-01-05 becomes 5 Jan 26, with no off-by-one in UTC-8 or UTC+14 1ms
 ✓ src/lib/__tests__/whatsapp.test.ts > whatsapp url building > Entries before a zero balance point are excluded 1ms
 ✓ src/lib/__tests__/whatsapp.test.ts > whatsapp url building > A payment appears as a negative line, and the total matches the screen balance 1ms
 ✓ src/lib/__tests__/whatsapp.test.ts > whatsapp url building > When a transaction ties the balance to zero, that tying transaction is included in the message 1ms
 ✓ src/lib/__tests__/whatsapp.test.ts > whatsapp url building > Zero and negative balance builds correctly 1ms
 ✓ src/lib/__tests__/whatsapp.test.ts > whatsapp url building > Long list truncates, keeps the newest dates, and the total still covers everything 4ms
 ✓ src/lib/__tests__/whatsapp.test.ts > whatsapp url building > Unknown template variables do not leak raw placeholders 0ms
 ✓ src/lib/__tests__/whatsapp.test.ts > whatsapp url building > Formats 11 Oct 26 date, +/- amounts with [what for], and directional totals 1ms
 ✓ src/lib/__tests__/whatsapp.test.ts > whatsapp url building > Emoji, "&", "#" and newlines in descriptions survive URL encoding in buildWhatsAppUrl 0ms
 ✓ src/lib/__tests__/whatsapp.test.ts > whatsapp url building > sendWhatsAppReminder logic > logs exactly one reminder immediately 4ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > computes correct balances for a simple equal split expense 2ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > computes correct balances with multi-payer 0ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > computes correctly after a partial settlement 0ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > ignores deleted expenses and settlements 1ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > simplifyDebts > simplifies debts efficiently 1ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > simplifyDebts > handles multiple currencies separately 0ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > property test: 1,000 randomized ledgers > always maintains zero sum invariant 15ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > computePairwiseBalance > computes correct balance when A pays for B 1ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > computePairwiseBalance > settlement settles the pairwise balance 0ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > computePairwiseBalance > does not get affected by unrelated third-party expenses 0ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > computePairwiseBalance > computeBalances does not throw on imbalanced data and logs a warning (C2) 3ms
 ✓ src/domain/__tests__/ledger.test.ts > ledger > computePairwiseBalance > getExpensePairwiseImpact distributes shares without rounding artifacts using largest remainder (L1) 0ms
 ✓ src/__tests__/no-stubs.test.ts > Stub-proofing > scans all src files for stubs and alerts 21ms
 ✓ src/domain/__tests__/property.test.ts > property test: 1,000 randomized ledgers (fixed seed) > always maintains zero sum invariant 17ms
 ✓ src/lib/__tests__/money.test.ts > formatMoney > formats exactly 0 15ms
 ✓ src/lib/__tests__/money.test.ts > formatMoney > formats 1 minor unit 0ms
 ✓ src/lib/__tests__/money.test.ts > formatMoney > formats 99 minor units 0ms
 ✓ src/lib/__tests__/money.test.ts > formatMoney > formats 100 minor units 0ms
 ✓ src/lib/__tests__/money.test.ts > formatMoney > formats 10000000 minor units as 1,00,000.00 0ms
 ✓ src/lib/__tests__/money.test.ts > formatMoney > formats negative amounts 0ms
 ✓ src/lib/__tests__/money.test.ts > formatMoney > formats non-INR currency 0ms
 ✓ src/lib/__tests__/money.test.ts > formatMoney > formats large non-INR currency with standard 3-digit grouping 0ms
 ✓ src/lib/__tests__/money.test.ts > formatMoney > WhatsApp amount string equals on-screen string 1ms
 ✓ src/db/__tests__/transactions.test.ts > Dexie Database tests > rolls back a multi-record transaction completely if an error is thrown 18ms
 ✓ src/domain/__tests__/allocation.test.ts > calculateShares > splits exactly among 3 equal parts (100 -> 34, 33, 33) 9ms
 ✓ src/domain/__tests__/allocation.test.ts > calculateShares > splits 1 paisa among 3 people 0ms
 ✓ src/domain/__tests__/allocation.test.ts > calculateShares > calculates percentage accurately and assigns remainders 0ms
 ✓ src/domain/__tests__/allocation.test.ts > calculateShares > throws on exact split if total does not match 1ms
 ✓ src/domain/__tests__/allocation.test.ts > calculateShares > accepts exact splits that match exactly 0ms
 ✓ src/domain/__tests__/allocation.test.ts > calculateShares > splits using shares accurately 0ms
 ✓ src/domain/__tests__/analyze.test.ts > analyze domain logic > equal split spend equals my share 2ms
 ✓ src/domain/__tests__/analyze.test.ts > analyze domain logic > I paid but am not a participant is excluded 0ms
 ✓ src/domain/__tests__/analyze.test.ts > analyze domain logic > deleted and settlements excluded 0ms
 ✓ src/domain/__tests__/analyze.test.ts > analyze domain logic > two currencies separate 0ms
 ✓ src/domain/__tests__/analyze.test.ts > analyze domain logic > 2026-01-31 vs 2026-02-01 land in different months 0ms
 ✓ src/domain/__tests__/analyze.test.ts > analyze domain logic > category totals sum exactly to the period total 7ms
 ✓ src/domain/__tests__/analyze.test.ts > analyze domain logic > empty period has no NaN 0ms
 ✓ src/lib/__tests__/utils.test.ts > generateId > generates a valid UUID v4 using native crypto.randomUUID 5ms
 ✓ src/lib/__tests__/utils.test.ts > generateId > generates unique IDs across successive calls 1ms
 ✓ src/lib/__tests__/utils.test.ts > generateId > falls back to crypto.getRandomValues when crypto.randomUUID is not a function (e.g. non-secure HTTP / LAN) 1ms
 ✓ src/lib/__tests__/utils.test.ts > generateId > falls back to RFC4122 v4 generator when crypto is completely undefined 0ms
 ✓ src/domain/__tests__/date.test.ts > UTC date handling & DD-MM-YYYY formatting > does not have off-by-one errors across timezones 2ms
 ✓ src/domain/__tests__/date.test.ts > UTC date handling & DD-MM-YYYY formatting > formats YYYY-MM-DD to unambiguous DD-MM-YYYY 0ms
 ✓ src/domain/__tests__/date.test.ts > UTC date handling & DD-MM-YYYY formatting > preserves existing DD-MM-YYYY 0ms
 ✓ src/domain/__tests__/date.test.ts > UTC date handling & DD-MM-YYYY formatting > formats ISO timestamps to DD-MM-YYYY 0ms
 ✓ src/domain/__tests__/date.test.ts > UTC date handling & DD-MM-YYYY formatting > normalizes DD-MM-YYYY to ISO YYYY-MM-DD for DB storage 0ms
 ✓ src/lib/__tests__/import.test.ts > CSV and parsing logic > parses CSV with commas and quotes inside fields 2ms
 ✓ src/lib/__tests__/import.test.ts > CSV and parsing logic > protects against formula injection in exports and is idempotent 0ms
 ✓ src/db/__tests__/migration.test.ts > Database Migration and Upgrade Events > handles blocked upgrades when another tab is open 2ms
 ✓ src/lib/__tests__/phone.test.ts > phone normalization > normalizes +91 numbers correctly 2ms
 ✓ src/lib/__tests__/phone.test.ts > phone normalization > rejects invalid numbers 0ms

 Test Files  21 passed (21)
      Tests  92 passed (92)
   Start at  13:59:43
   Duration  12.95s (environment 33%, import 29%, tests 24%, transform 9%, setup 4%, worker 1%)

     Import  97 modules were evaluated 219 times · 3.10s total, 29% of tracked time
             ~1.72s faster with isolate: false — shared modules are evaluated once per worker instead of once per file
             learn more: https://vitest.dev/guide/improving-performance#test-isolation

\n### Command: npm run build; ls -la dist\n

> splitlocal@0.0.0 build
> tsc -b && vite build

[36mvite v8.0.14 [32mbuilding client environment for production...[36m[39m
[2Ktransforming...✓ 3007 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js                          0.13 kB
dist/manifest.webmanifest                   0.56 kB
dist/index.html                             1.30 kB │ gzip:   0.58 kB
dist/assets/index-f3H0ZoJ0.css             74.79 kB │ gzip:  13.81 kB
dist/assets/rolldown-runtime-QTnfLwEv.js    0.69 kB │ gzip:   0.42 kB
dist/assets/db-BSoB6Zkd.js                 96.49 kB │ gzip:  31.75 kB
dist/assets/vendor-BSYE_lqH.js            220.23 kB │ gzip:  70.76 kB
dist/assets/charts-CDlSQnbZ.js            398.30 kB │ gzip: 114.03 kB
dist/assets/index-DLYHHxEo.js             606.03 kB │ gzip: 174.63 kB

[32m✓ built in 1.98s[39m
[33m[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m

[36mPWA v1.3.0[39m
mode      [35mgenerateSW[39m
precache  [32m20 entries[39m [2m(2916.44 KiB)[22m
files generated
  [2mdist/sw.js[22m
  [2mdist/workbox-9c191d2f.js[22m
total 1316
drwxrwxr-x  4 runner runner   4096 Oct 13 14:00 .
drwxr-xr-x 12 runner runner   4096 Oct 13 13:58 ..
-rw-rw-r--  1 runner runner 515002 Oct 13 14:00 SplitLocal Brush Logo Light.png
-rw-rw-r--  1 runner runner 762857 Oct 13 14:00 SplitLocal Brush Logo.png
-rw-rw-r--  1 runner runner     19 Oct 13 14:00 _redirects
drwxrwxr-x  2 runner runner   4096 Oct 13 14:00 assets
-rw-rw-r--  1 runner runner   3243 Oct 13 14:00 favicon.png
drwxrwxr-x  2 runner runner   4096 Oct 13 14:00 icons
-rw-rw-r--  1 runner runner   5031 Oct 13 14:00 icons.svg
-rw-rw-r--  1 runner runner   1308 Oct 13 14:00 index.html
-rw-rw-r--  1 runner runner    561 Oct 13 14:00 manifest.webmanifest
-rw-rw-r--  1 runner runner    134 Oct 13 14:00 registerSW.js
-rw-rw-r--  1 runner runner   2112 Oct 13 14:00 sw.js
-rw-rw-r--  1 runner runner  15112 Oct 13 14:00 workbox-9c191d2f.js
\n### Command: grep -rnEi "TODO|FIXME|coming soon|not implemented|alert\(|confirm\(|prompt\(" src\n
src/components/ui/alert.tsx:21:function Alert({
src/components/ui/ConfirmDialog.tsx:54:              await onConfirm();
src/components/WelcomeModal.tsx:40:      setInstallPrompt(e as BeforeInstallPromptEvent);
src/components/WelcomeModal.tsx:60:        setInstallPrompt(null);
src/__tests__/no-stubs.test.ts:16:      if (/TODO|FIXME|coming soon|not implemented/i.test(line)) return true;
\n### Command: grep -rnE "as any|@ts-ignore|dangerouslySetInnerHTML|parseFloat|toFixed|fetch\(|XMLHttpRequest|WebSocket|supabase|axios|console\.log" src\n
src/lib/__tests__/utils.test.ts:26:      getRandomValues: (arr: Uint8Array) => originalCrypto.getRandomValues(arr as any),
src/pages/SettleUp.tsx:53:  const amountStr = userAmountStr ?? (netBalance !== 0 ? (Math.abs(netBalance) / 100).toFixed(2) : '');
src/pages/SettleUp.tsx:155:                setUserAmountStr((fullOutstandingMinor / 100).toFixed(2));
src/pages/Settings.tsx:166:    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
\n### Command: npm audit --omit=dev\n
# npm audit report

brace-expansion  2.0.0 - 2.1.6 || 3.0.0 - 5.0.11
Severity: high
brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups - https://github.com/advisories/GHSA-3jxr-9vmj-r5cp
brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups - https://github.com/advisories/GHSA-3jxr-9vmj-r5cp
brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash - https://github.com/advisories/GHSA-mh99-v99m-4gvg
brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash - https://github.com/advisories/GHSA-mh99-v99m-4gvg
brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation - https://github.com/advisories/GHSA-rgw5-rvv9-x895
brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation - https://github.com/advisories/GHSA-rgw5-rvv9-x895
brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service - https://github.com/advisories/GHSA-q2hr-2g5m-vwhr
brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service - https://github.com/advisories/GHSA-q2hr-2g5m-vwhr
brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion - https://github.com/advisories/GHSA-qhr7-859c-m2p7
brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion - https://github.com/advisories/GHSA-qhr7-859c-m2p7
brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion - https://github.com/advisories/GHSA-6j4f-fj2g-mc7p
brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion - https://github.com/advisories/GHSA-6j4f-fj2g-mc7p
fix available via `npm audit fix`
node_modules/brace-expansion
node_modules/filelist/node_modules/brace-expansion

braces  *
Severity: high
braces vulnerable to stack-exhaustion denial of service through deeply nested patterns - https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
fix available via `npm audit fix --force`
Will install tailwindcss@4.3.3, which is a breaking change
node_modules/braces
  chokidar  2.0.0 - 3.6.0
  Depends on vulnerable versions of braces
  node_modules/chokidar
    tailwindcss  <=0.0.0-oxide-insiders.ff2c25f || 0.5.0 - 3.4.19
    Depends on vulnerable versions of chokidar
    Depends on vulnerable versions of fast-glob
    Depends on vulnerable versions of micromatch
    Depends on vulnerable versions of postcss-nested
    Depends on vulnerable versions of postcss-selector-parser
    node_modules/tailwindcss
  micromatch  >=0.2.0
  Depends on vulnerable versions of braces
  node_modules/micromatch
    fast-glob  *
    Depends on vulnerable versions of micromatch
    node_modules/fast-glob

fast-uri  3.0.0 - 3.1.7
Severity: high
fast-uri vulnerable to host confusion via literal backslash authority delimiter - https://github.com/advisories/GHSA-v2hh-gcrm-f6hx
fast-uri vulnerable to host confusion via backslash authority introducer - https://github.com/advisories/GHSA-7p8r-x3mc-p8w7
fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization - https://github.com/advisories/GHSA-f65p-4m7j-42xc
fast-uri vulnerable to server-side request forgery via repeated hostname percent-decoding - https://github.com/advisories/GHSA-fph4-wmhf-6fwf
fast-uri vulnerable to host confusion via percent-encoded scheme normalization - https://github.com/advisories/GHSA-jqff-g426-hqxp
fast-uri vulnerable to host confusion via failed IDN canonicalization - https://github.com/advisories/GHSA-4c8g-83qw-93j6
fast-uri vulnerable to authority injection via an unvalidated port in serialize - https://github.com/advisories/GHSA-qw65-cvwx-89v3
fast-uri vulnerable to inconsistent host case normalization via percent-encoded octets - https://github.com/advisories/GHSA-hrr3-gc8f-f4qj
fix available via `npm audit fix`
node_modules/fast-uri

postcss-selector-parser  <7.1.6
Severity: moderate
PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion - https://github.com/advisories/GHSA-rj75-hqrm-r3gf
fix available via `npm audit fix --force`
Will install tailwindcss@4.3.3, which is a breaking change
node_modules/postcss-selector-parser
  postcss-nested  2.0.3 - 6.2.0
  Depends on vulnerable versions of postcss-selector-parser
  node_modules/postcss-nested

react-router  6.0.0 - 7.18.1
Severity: high
React Router: Open redirect via backslash in <Link> and useNavigate (CVE-2025-68470 bypass) - https://github.com/advisories/GHSA-wrjc-x8rr-h8h6
React Router: RSCErrorHandler Missing Protocol Validation (XSS) - https://github.com/advisories/GHSA-h8fp-f39c-q6mh
React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration - https://github.com/advisories/GHSA-337j-9hxr-rhxg
React Router: Unauthenticated Denial of Service via Inefficient Route Matching - https://github.com/advisories/GHSA-chx6-hx7r-mcp5
React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response - https://github.com/advisories/GHSA-qwww-vcr4-c8h2
fix available via `npm audit fix`
node_modules/react-router
  react-router-dom  6.0.0-alpha.0 - 7.17.0
  Depends on vulnerable versions of react-router
  node_modules/react-router-dom

source-map-js  1.0.0 - 1.2.1
Severity: high
source-map-js allows event-loop denial of service through indexed source-map section offsets - https://github.com/advisories/GHSA-68fv-2mgg-jv7q
fix available via `npm audit fix`
node_modules/source-map-js

vite  8.0.0 - 8.0.15
Severity: high
launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows - https://github.com/advisories/GHSA-v6wh-96g9-6wx3
vite: `server.fs.deny` bypass on Windows alternate paths - https://github.com/advisories/GHSA-fx2h-pf6j-xcff
fix available via `npm audit fix`
node_modules/vite

13 vulnerabilities (3 moderate, 10 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

## NOT VERIFIED
- None.
