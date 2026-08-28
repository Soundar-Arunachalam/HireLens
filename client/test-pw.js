import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  await page.goto('http://localhost:3000/');
  // Wait for problems to load
  await page.waitForTimeout(2000);
  
  // Go to problem 2 (Design URL shortener)
  await page.goto('http://localhost:3000/problems/2');
  console.log('Navigated to problem 2');
  
  // Wait for Excalidraw to load and potentially crash
  await page.waitForTimeout(5000);
  console.log('Test complete, closing browser.');
  await browser.close();
})();
