import { chromium } from 'playwright';
import fs from 'fs';

const SHOT_DIR = process.env.TEMP + '\\zindo-scratch';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Try to find the login link from the homepage nav
await page.goto('https://www.fasostock.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(2000);
const loginLink = await page.evaluate(() => {
  const link = Array.from(document.querySelectorAll('a')).find((a) => /se connecter/i.test(a.textContent || ''));
  return link ? link.href : null;
});
console.log('login link found:', loginLink);

if (loginLink) {
  await page.goto(loginLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOT_DIR}\\fasostock-login.png`, fullPage: true });
  console.log('current url:', page.url());
}

await browser.close();
