import { chromium } from 'playwright';

const SHOT_DIR = process.env.TEMP + '\\zindo-scratch';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

await page.goto('https://www.fasostock.com/register', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SHOT_DIR}\\fasostock-register.png`, fullPage: true });
console.log('url:', page.url());

await browser.close();
