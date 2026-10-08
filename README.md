# SplitLocal

SplitLocal is a production-grade shared-expense tracker designed exclusively for one person's own use. It runs entirely offline with absolutely no backend, no authentication, and no data syncing.

## Features
- **100% Offline**: All data is stored locally in IndexedDB using Dexie.js. 
- **Zero Auth**: No signup, no login. A local "Me" profile is created automatically.
- **Advanced Splitting**: Support for equal, exact, percentage, and share-based splits with robust largest-remainder rounding allocation to ensure zero-sum ledgers.
- **WhatsApp Reminders**: Instantly send pre-filled WhatsApp messages to friends you owe or who owe you.
- **Contact Import**: Import friends using the native Web Contact Picker API (where supported) or via `.vcf` and `.csv` files.
- **Backup & Restore**: Easily export your entire database to a JSON file and restore it later.

## Architecture
Built with Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui, and Dexie.js.

- **Domain Logic**: Pure TypeScript functions handle all mathematical allocations and ledger derivations (`/src/domain`).
- **Database**: `dexie` handles all IndexedDB storage and `dexie-react-hooks` provides live UI updates.
- **UI State**: Zustand is used purely for transient UI state (if needed), while all persistent data flows directly from IndexedDB.

## Development

```bash
npm install
npm run dev
npm run build
```

To run the Playwright smoke tests:
```bash
npx playwright test
```

## Known Limitations
1. **Contact Picker API**: The native `navigator.contacts.select` API works only on Chrome for Android over HTTPS. iOS and desktop browsers must rely on the `.vcf` / `.csv` file upload fallback.
2. **Local Storage Limits**: If the browser's storage quota is exceeded, or if the user clears their browsing data without granting permanent persistence, the data will be lost. Regular backups via the Settings page are highly recommended.
3. **Receipt Photos**: Storing many high-resolution receipt photos can consume local storage quickly. Receipts are stored separately from expenses to keep ledger derivations fast.
4. **Single Currency View**: Debt simplification and net balance calculations assume a single currency. Multi-currency ledgers calculate balances independently per currency.
5. **No Sync**: There is no way to sync this data across multiple devices. The app is intentionally built for an isolated, single-device experience.
