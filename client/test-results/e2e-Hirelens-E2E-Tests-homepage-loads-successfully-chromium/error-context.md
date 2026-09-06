# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.js >> Hirelens E2E Tests >> homepage loads successfully
- Location: tests\e2e.spec.js:4:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Hirelens E2E Tests', () => {
  4  |   test('homepage loads successfully', async ({ page }) => {
> 5  |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  6  |     
  7  |     // Check that we're on the homepage and problems are listed
  8  |     await expect(page).toHaveTitle(/Hirelens/i).catch(() => {}); // Optional title check
  9  |     
  10 |     // We expect some UI indicating the application has loaded
  11 |     const listVisible = await page.isVisible('text=Two Sum'); // from seed problems
  12 |     if (!listVisible) {
  13 |       console.log('Ensure backend is running and seeded for problems to appear');
  14 |     }
  15 |   });
  16 | 
  17 |   test('can navigate to a problem and view the editor', async ({ page }) => {
  18 |     await page.goto('/');
  19 |     
  20 |     // Navigate to problem 1
  21 |     await page.goto('/problems/1');
  22 |     
  23 |     // Expect the problem description or editor to be visible
  24 |     await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 10000 }).catch(() => {
  25 |         console.log('Monaco editor not found, the test requires the application to render properly.');
  26 |     });
  27 |   });
  28 | 
  29 |   test('admin login flow (mock)', async ({ page }) => {
  30 |     await page.goto('/');
  31 |     
  32 |     // If there is a login form visible
  33 |     const userVisible = await page.isVisible('input[placeholder="Username"]');
  34 |     if (userVisible) {
  35 |       await page.fill('input[placeholder="Username"]', 'admin');
  36 |       await page.fill('input[placeholder="Password"]', 'admin123');
  37 |       await page.click('button[type="submit"]');
  38 |       
  39 |       // Wait for navigation after login
  40 |       await page.waitForURL('**/', { timeout: 5000 }).catch(() => {});
  41 |     }
  42 |   });
  43 | });
  44 | 
```