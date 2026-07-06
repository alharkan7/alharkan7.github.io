const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto(`file://${path.resolve('src/featured/sebaran-sppg.html')}`);
  await page.waitForTimeout(2000); // Wait for things to render
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
