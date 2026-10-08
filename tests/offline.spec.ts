import { test, expect } from '@playwright/test';

test.describe('SplitLocal Offline Smoke Test', () => {
  test('app loads, initializes DB, and works offline', async ({ page, context }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for DB initialization (Me user should be created)
    await page.waitForSelector('text=Dashboard', { state: 'visible', timeout: 10000 });
    
    // Ensure we can see "No activity yet" which means DB query executed
    await expect(page.locator('text=No activity yet')).toBeVisible();

    // Now disconnect the network to simulate offline mode
    await context.setOffline(true);

    // Navigate to Friends
    await page.click('text=Friends');
    await expect(page.locator('h1')).toHaveText('Friends');
    await expect(page.locator('text=No friends yet')).toBeVisible();

    // Navigate to Import Contacts
    await page.click('text=Import Contacts');
    await expect(page.locator('h1')).toHaveText('Import Contacts');
    
    // Wait for a little bit to ensure no network calls crash the app
    await page.waitForTimeout(1000);

    // Verify it's still working
    await page.click('text=Dashboard');
    await expect(page.locator('text=Net Balance')).toBeVisible();

    // Navigate to Settings
    await page.click('text=Settings');
    await expect(page.locator('h1')).toHaveText('Settings');
    await expect(page.locator('text=Storage & Persistence')).toBeVisible();
  });
});
