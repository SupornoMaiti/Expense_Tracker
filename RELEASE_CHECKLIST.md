# SplitLocal Release Checklist

This document details the manual steps the end-user (QA or the App Owner) must perform on a real mobile device before officially signing off on a production release of "SplitLocal."

## 1. Installation & PWA Manifest Check
- [ ] Open the app URL in Safari (iOS) or Chrome (Android).
- [ ] Tap the "Share" or menu button and select "Add to Home Screen".
- [ ] Verify that the correct app icon (192x192 and 512x512 maskable) and short name ("SplitLocal") appear.
- [ ] Launch the app from the Home Screen and confirm it opens in standalone mode (no browser address bar or navigation UI).

## 2. Airplane Mode (Offline) Test
- [ ] With the app running, turn on Airplane Mode on your device (ensure Wi-Fi is also off).
- [ ] Hard close the app and reopen it from the Home Screen.
- [ ] Verify that the app loads the dashboard completely.
- [ ] Add a new expense ("Coffee", "250 INR") offline.
- [ ] Navigate to a different page (e.g. Friends list) and back to the Dashboard. Verify the UI did not break and the expense persists.
- [ ] Turn off Airplane mode. No "sync" spinner or errors should appear because the app is 100% local by design.

## 3. Contact Import Test
- [ ] Go to the Contacts/Friends page and tap "Import Contact".
- [ ] Use the native Contact Picker to select a real contact.
- [ ] Verify that the name and phone number (e.g., +91 format) import correctly without silent crashes.
- [ ] Add an expense with this contact, confirming the math holds up.

## 4. WhatsApp Reminder Test
- [ ] Open a friend's details page who owes you money.
- [ ] Tap the "Send Reminder" or "WhatsApp" button.
- [ ] Verify that the URL opens a new tab directed to `wa.me/<PhoneNumber>`.
- [ ] Verify that the pre-filled message correctly substitutes `{name}`, `{amount}`, and `{currency}` without leaking placeholder template text.
- [ ] Send the message (optional) and verify the "Last reminded" label updates on the detail page when returning.

## 5. Export / Restore Backup Flow
- [ ] Go to Settings -> Export Data.
- [ ] Save the generated `splitlocal-backup.json` to your local files or iCloud/Google Drive.
- [ ] Open a secondary browser on your device (e.g., Firefox or Brave) where SplitLocal has never been opened.
- [ ] Load the app URL in the new browser.
- [ ] Go to Settings -> Import Data, and select the backup file.
- [ ] Validate that all expenses, friends, and exact balances are 100% identical to the original browser.

## 6. Edge Case and Crash Recovery
- [ ] Try creating an expense with an extremely large number (e.g., above JS `MAX_SAFE_INTEGER`). Confirm the UI rejects it safely instead of computing `NaN` or incorrect bounds.
- [ ] Open the app in two different tabs simultaneously. Make an edit in tab A and switch to tab B. Check if data stays consistent (or requires a simple refresh without data corruption).

## Verdict
*Once all items above are checked without issue, the application is clear for production use.*
