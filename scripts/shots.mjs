import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = join(process.cwd(), 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  let file = normalize(join(DIST, p));
  let body;
  try { body = await readFile(file); } catch { body = await readFile(join(DIST, 'index.html')); file = 'index.html'; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(body);
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'load' });
await page.getByText('Welcome to xuexi').waitFor({ timeout: 8000 });
await page.screenshot({ path: 'scripts/.cache/shot-onboarding.png' });
await page.getByText("Let's go").click();
await page.getByText('The four tones').waitFor();
await page.screenshot({ path: 'scripts/.cache/shot-tones.png' });
await page.getByText('I hear the difference').click();
await page.getByText('Enter the Tone Dojo').click();
await page.getByText('Start').first().waitFor();
await page.getByText('Reviews').first().click();
await page.getByText('Show answer').waitFor();
await page.screenshot({ path: 'scripts/.cache/shot-review.png' });
await page.getByText('Stats').first().click();
await page.getByText('Your progress').waitFor();
await page.waitForTimeout(600);
await page.screenshot({ path: 'scripts/.cache/shot-stats.png' });
await browser.close();
server.close();
console.log('shots written');
