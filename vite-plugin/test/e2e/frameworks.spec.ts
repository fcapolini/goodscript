import { test, expect } from '@playwright/test';

test.describe('React App E2E', () => {
  test('should render React components from -gs.tsx files', async ({ page }) => {
    await page.goto('/');
    
    // Check that the React app loaded
    await expect(page.locator('h1')).toHaveText('React + GoodScript');
    
    // Check initial count
    await expect(page.locator('p')).toContainText('Count: 0');
    
    // Click increment button
    await page.locator('button', { hasText: 'Increment' }).click();
    
    // Check updated count
    await expect(page.locator('p')).toContainText('Count: 1');
  });

  test('should support HMR for -gs.tsx files', async ({ page }) => {
    await page.goto('/');
    
    // Initial load
    await expect(page.locator('h1')).toBeVisible();
    
    // HMR would require file system modifications during test
    // This is a placeholder for HMR testing
    // In a real scenario, you'd modify a -gs.tsx file and check that the page updates
  });
});

test.describe('Vue App E2E', () => {
  test('should render Vue app with GoodScript utilities', async ({ page }) => {
    await page.goto('/');
    
    // Check that the Vue app loaded
    await expect(page.locator('h1')).toHaveText('Vue + GoodScript');
    
    // Check initial count
    await expect(page.locator('p')).toContainText('Count: 0');
    
    // Click increment button
    await page.locator('button', { hasText: 'Increment' }).click();
    
    // Check updated count
    await expect(page.locator('p')).toContainText('Count: 1');
  });
});
