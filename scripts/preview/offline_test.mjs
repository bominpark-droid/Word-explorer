// Checks that the web build opens and searches with the network cut off after
// one online visit. Usage: CHROMIUM_PATH=... node offline_test.mjs [url]
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:8081/Word-explorer/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('input', { timeout: 60000 });
console.log('online load: ok');
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForTimeout(1500);
const controlled = await page.evaluate(async () => {
  const keys = await caches.keys();
  return { sw: !!navigator.serviceWorker.controller, keys };
});
console.log('service worker + caches:', JSON.stringify(controlled));

// Save a word, then go offline and reload.
await page.fill('input', 'tribe');
await page.press('input', 'Enter');
await page.getByText('☆ 단어장에 넣기').click();
await ctx.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('input', { timeout: 60000 });
console.log('offline reload: ok');
await page.fill('input', 'glaciers');
await page.press('input', 'Enter');
await page.waitForTimeout(800);
const title = await page.getByText('glacier', { exact: true }).first().isVisible();
console.log('offline search glaciers -> glacier visible:', title);
await page.getByText('⭐ 단어장').click();
const saved = await page.getByText('tribe', { exact: true }).first().isVisible();
console.log('wordbook kept after reload:', saved);
console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
process.exit(title && saved && controlled.sw ? 0 : 1);
