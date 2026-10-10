# Settle Logic & Notification Positioning Investigation & Fix Plan

## 1. Problem Analysis

### A. Settle Logic Issues
1. **Global Debt Simplification Leak (`simplifyDebts`)**:
   - `Friends.tsx`, `PersonDetail.tsx`, `SettleUp.tsx`, `Dashboard.tsx`, and `whatsapp.ts` were running `simplifyDebts(balances, currency)` over the entire database globally.
   - When independent friends are added (e.g. Rahul, Priya, Amit, Sneha), `simplifyDebts` cancels debts between unrelated friends (e.g. assigning Amit's debt to Sneha).
   - This caused Sneha and Rahul to show "Settled up" (0 balance) even though direct transactions existed between Me and them.
   - Because `netBalance` was 0, `PersonDetail` hid the "Settle Up" button, and `/settle` showed an immovable "All Settled Up!" screen, making it impossible to settle!
   - For friends who did have debts (like Amit), the amount was distorted (showed ₹875 instead of ₹1000).
2. **Rigid / Buggy SettleUp Flow**:
   - `SettleUp.tsx` did not allow entering a custom settlement amount for partial payments.
   - If balance was 0, it completely blocked recording any settlement or advance.
   - Did not provide clear toggle of payer/recipient ("Friend paid Me" vs "I paid Friend").
   - Notification after settling was standard without proper bottom positioning.

### B. Notification / Alert Placement
- The user requested:
  "for every alerts like a transaction is added or a contact is added, please take transaction that, sorry that alert message it will be shown in bottom and center aligned, center aligned bottom and just above the nav bar."
- Need to ensure `<Toaster />` (Sonner):
  - Is `position="bottom-center"`.
  - On mobile: bottom offset is `calc(var(--nav-height) + 12px + env(safe-area-inset-bottom, 0px))` so it sits cleanly and centered right above the bottom navigation bar without overlapping the nav buttons.
  - Horizontally center-aligned.

---

## 2. Solution Plan

1. **Implement Direct Pairwise Calculation in `src/domain/ledger.ts`**:
   - Add `computePairwiseBalance(expenses, settlements, personAId, personBId, currency)`.
   - Calculate exact shares and payments between two individuals without third-party interference.
   - Add comprehensive unit tests in `src/domain/__tests__/ledger.test.ts`.

2. **Update Consumer Pages**:
   - **`Friends.tsx`**: Use `computePairwiseBalance` between `myId` and each friend.
   - **`PersonDetail.tsx`**: Use `computePairwiseBalance` between `myId` and `friendId`. Always show Settle Up button (with quick settle or custom payment option).
   - **`Dashboard.tsx`**: Sum `totalOwedToMe` (friends with positive balance) and `totalIOwe` (friends with negative balance) based on direct pairwise balances.
   - **`whatsapp.ts`**: Use pairwise impact so reminder messages always match the exact balance shown on screen.

3. **Revamp `src/pages/SettleUp.tsx`**:
   - Use `computePairwiseBalance` to determine current debt.
   - Allow customizable settlement amount with quick "Full Balance" chips or presets.
   - Support both "Friend paid Me" and "I paid Friend" with intuitive UI.
   - Support recording a settlement even if current balance is 0.
   - Show clear success toast and navigate back.

4. **Fix Alert / Toast Positioning in `src/components/ui/sonner.tsx` and `src/index.css`**:
   - Center-aligned at bottom.
   - Just above the mobile bottom nav bar (`--nav-height: 4rem`).
   - Clean styling with no overlap of nav bar buttons.

5. **Visual and Functional Verification via Browser Subagent & Vitest**:
   - Run Vitest & build checks.
   - Test settling up with Rahul, Priya, Sneha, Amit in browser.
   - Test adding an expense and adding a contact to verify the toast alert renders center-bottom just above the nav bar.
