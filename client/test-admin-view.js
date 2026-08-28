import { chromium } from 'playwright';

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  // 1. Login
  console.log("Navigating to login page...");
  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(1000);
  
  console.log("Logging in as admin...");
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();

  // 2. Go to problem 2 (Design URL shortener)
  console.log("Navigating to problem 2 to create a submission...");
  await page.goto('http://localhost:3000/problems/2');
  
  // Wait for the whiteboard to mount
  await page.waitForTimeout(3000);

  // 3. Click "Submit Design"
  console.log("Clicking 'Submit Design'...");
  await page.click('button:has-text("Submit Design")');
  
  // Wait for submission to complete (e.g. recent subs list updates)
  await page.waitForTimeout(3000);
  
  // 4. Go to Admin Dashboard
  console.log("Navigating to Admin Dashboard...");
  await page.goto('http://localhost:3000/admin');
  await page.waitForTimeout(2000);
  
  // 5. Go to Global Submissions Tab
  console.log("Clicking 'Global Submissions' tab...");
  await page.click('text="Global Submissions"');
  await page.waitForTimeout(2000);
  
  // 6. Click on the first "🎨 View" button
  console.log("Clicking '🎨 View' on the first design submission...");
  const viewButton = page.locator('button:has-text("🎨 View")').first();
  await viewButton.click();
  
  // 7. Wait for WhiteboardViewer to load and render the data
  await page.waitForTimeout(5000);
  
  // 8. Take a screenshot
  console.log("Taking screenshot of Admin Viewer...");
  await page.screenshot({ path: 'admin-view.png' });
  
  console.log("Test complete. Browser closed.");
  await browser.close();
})();
