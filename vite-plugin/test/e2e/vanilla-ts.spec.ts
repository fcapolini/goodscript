import { test, expect } from '@playwright/test';

test.describe('Vanilla TypeScript E2E', () => {
  test('should load and execute GoodScript code', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loaded
    await expect(page.locator('#app')).toBeVisible();
    
    // Check that GoodScript functions executed
    // (Add assertions based on what your main-gs.ts does in the DOM)
    await expect(page).toHaveTitle('Vanilla TS Test');
  });

  test('should show GoodScript validation errors in overlay', async ({ page }) => {
    // This would require modifying the test fixture to include invalid code
    // and checking for Vite's error overlay
    await page.goto('/');
    
    // If there are errors, Vite's error overlay should appear
    const errorOverlay = page.locator('vite-error-overlay');
    // Add assertions for error scenarios
  });
});
