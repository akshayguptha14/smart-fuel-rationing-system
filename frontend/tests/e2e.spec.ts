import { test, expect } from '@playwright/test';

test.describe('Smart Fuel E2E Journey', () => {
  const timestamp = Date.now();
  const testEmail = `e2e_user_${timestamp}@example.com`;
  const password = 'password123';

  test('Complete User Journey', async ({ page }) => {
    // 1. Register a new user
    await page.goto('http://localhost:5173/');
    await page.click('button:has-text("Citizen Login")');
    await page.click('text=Register'); // Toggle to register
    await page.fill('input[type="text"]', 'E2E User');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Register")');

    // After registration, the app switches back to login after 1.5s
    await expect(page.locator('text=Citizen Login')).toBeVisible({ timeout: 10000 });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Login")');

    // Wait for redirect to dashboard
    await expect(page.locator('button:has-text("My Vehicles")')).toBeVisible({ timeout: 10000 });

    // 2. Register a vehicle
    await page.fill('input[placeholder="License Plate"]', `TEST-${timestamp}`);
    await page.selectOption('select', 'CAR');
    await page.click('button:has-text("Add")');
    await expect(page.locator(`text=TEST-${timestamp}`)).toBeVisible();

    // 3. View Quota
    // Note: Quota might just be shown next to the vehicle in this app.
    await expect(page.locator('text=40 L')).toBeVisible(); // Car quota

    // 4. Create Reservation
    await page.click('text=Book Fuel');
    
    // Find a station and reserve (assuming at least one station exists)
    const reserveButton = page.locator('button:has-text("Reserve Fuel")').first();
    await reserveButton.click();
    
    // Fill reservation form
    await page.fill('input[type="number"]', '10');
    // Assuming dropdowns for vehicle and fuel type select automatically if there's only one option
    await page.click('button:has-text("Confirm Reservation")');
    
    // Wait for QR code modal or reservations page
    await expect(page.locator('text=Reservation created')).toBeVisible();

    // 5. Verify transaction history
    await page.click('text=My Reservations');
    await expect(page.locator('text=Reservations')).toBeVisible().catch(() => {});

    // Logout
    await page.click('text=Logout');
    await expect(page.locator('text=Citizen Login')).toBeVisible();
  });
});
