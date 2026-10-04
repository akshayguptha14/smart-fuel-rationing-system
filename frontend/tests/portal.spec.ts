import { test, expect } from '@playwright/test';

test.describe('Landing Page Portals', () => {
  test('Portals exist and go to respective login forms', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    // Check title
    await expect(page.locator('h2', { hasText: 'SMART FUEL' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'RATIONING & OPTIMIZATION SYSTEM' })).toBeVisible();

    // Check Government
    await page.click('button:has-text("Government Login")');
    await expect(page.locator('text=Government Administrator Login')).toBeVisible();
    await page.locator('.lucide-arrow-left').click(); // Back button

    // Check Station
    await page.click('button:has-text("Station Login")');
    await expect(page.locator('text=Fuel Station Login')).toBeVisible();
    await page.locator('.lucide-arrow-left').click(); // Back button

    // Check Citizen
    await page.click('button:has-text("Citizen Login")');
    await expect(page.locator('text=Citizen Login')).toBeVisible();
    await page.locator('.lucide-arrow-left').click(); // Back button
  });
});
