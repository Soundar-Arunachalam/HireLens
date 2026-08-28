import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // Listen to console logs and errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR]: ${msg.text()}`);
    } else {
      console.log(`[BROWSER LOG]: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`[PAGE UNCAUGHT ERROR]: ${err.toString()}`);
  });

  try {
    console.log("Navigating to http://localhost:3000/ ...");
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

    console.log("Checking if login is needed...");
    const loginForm = await page.$('input[placeholder="Username"]');
    if (loginForm) {
      console.log("Logging in as admin...");
      await page.type('input[placeholder="Username"]', 'admin');
      await page.type('input[placeholder="Password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    console.log("Navigating to Admin Dashboard...");
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });

    console.log("Waiting for Global Submissions tab...");
    // Click on "Global Submissions" tab
    const tabs = await page.$$('.tabs button');
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text === 'Global Submissions') {
        await tab.click();
        break;
      }
    }
    
    await new Promise(r => setTimeout(r, 1000));

    console.log("Looking for Design View button (🎨 View)...");
    // Find the button with text "🎨 View" and click it
    const viewButtons = await page.$$('button');
    let clicked = false;
    for (const btn of viewButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('View')) { // "🎨 View"
        await btn.click();
        clicked = true;
        console.log("Clicked View Button!");
        break;
      }
    }

    if (!clicked) {
      console.log("No design submission found to test.");
    } else {
      console.log("Waiting 3 seconds to see if Excalidraw throws an error...");
      await new Promise(r => setTimeout(r, 3000));
      console.log("Checking for errors complete.");
    }

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
