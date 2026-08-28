import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);
  
  const userVisible = await page.isVisible('input[placeholder="Username"]');
  if (userVisible) {
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  }
  
  await page.goto('http://localhost:3000/problems/2');
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: 'screenshot.png' });
  
  await browser.close();
})();
