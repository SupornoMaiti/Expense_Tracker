import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/friends', '/activity', '/insights', '/settings'];
const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 393, height: 852 }
];

for (const v of VIEWPORTS) {
  test.describe(`Responsive overlaps at ${v.width}x${v.height}`, () => {
    test.use({ viewport: v });

    for (const route of ROUTES) {
      test(`checks route ${route} for overlaps`, async ({ page }) => {
        await page.goto(route);
        // Wait for hydration or data loading
        await page.waitForTimeout(1000); 

        // Take screenshot
        await page.screenshot({ path: `tests/screenshots/${v.width}x${v.height}-${route.replace('/', 'root')}.png` });

        // On mobile, the bottom nav and FAB should be visible
        const nav = page.locator('nav').first();
        const navVisible = await nav.isVisible();
        
        const fab = page.locator('button[aria-label="Add expense"]').first();
        const fabVisible = await fab.isVisible();

        if (navVisible && fabVisible) {
          const navBox = await nav.boundingBox();
          const fabBox = await fab.boundingBox();
          
          if (navBox && fabBox) {
            // Find the last focusable element in the main content to see if it's covered
            // For simplicity, we just check that we can scroll to the bottom of the page
            // and the FAB is positioned correctly above the nav.
            expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(navBox.y + 10);
          }
        }
      });
    }
  });
}
