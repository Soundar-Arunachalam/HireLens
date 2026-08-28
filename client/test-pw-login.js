import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);
  
  // Login as admin
  const userVisible = await page.isVisible('input[placeholder="Username"]');
  if (userVisible) {
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  }
  
  console.log('Navigating to problem 2');
  await page.goto('http://localhost:3000/problems/2');
  
  await page.waitForTimeout(5000);
  console.log('Test complete, closing browser.');
  await browser.close();
})();
