/**
 * Screenshot walkthrough of the exported web build (landing → onboarding →
 * dojo → reviews → stats), written to scripts/.cache/. Serves ./dist the same
 * way smoke-web.mjs does (strips the '/xuexi' baseUrl prefix) and uses the
 * same PW_EXECUTABLE_PATH override so it runs anywhere a Chromium exists.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = join(process.cwd(), 'dist');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.wav': 'audio/wav', '.png': 'image/png', '.css': 'text/css', '.map': 'application/json',
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (p.startsWith('/xuexi')) p = p.slice('/xuexi'.length) || '/';
    if (p === '/') p = '/index.html';
    let file = normalize(join(DIST, p));
    if (!file.startsWith(DIST)) return res.writeHead(403).end();
    let body;
    try {
      body = await readFile(file);
    } catch {
      body = await readFile(join(DIST, 'index.html')); // SPA fallback
      file = 'index.html';
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(500).end();
  }
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  executablePath:
    process.env.PW_EXECUTABLE_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'load' });

// A brand-new visitor lands on the marketing page first.
await page.getByText('Get started').waitFor({ timeout: 8000 });
await page.screenshot({ path: 'scripts/.cache/shot-landing.png' });
await page.getByText('Get started').click();

await page.getByText('Welcome to xuexi').waitFor({ timeout: 4000 });
await page.screenshot({ path: 'scripts/.cache/shot-onboarding.png' });
await page.getByText("Let's go").click();

// "Your first word": tap the correct gloss, then advance.
await page.getByText('Your first word').waitFor({ timeout: 4000 });
await page.getByRole('button', { name: 'tea' }).click();
await page.getByText('Keep going').click();

await page.getByText('The four tones').waitFor({ timeout: 4000 });
await page.screenshot({ path: 'scripts/.cache/shot-tones.png' });
await page.getByText('I hear the difference').click();

await page.getByText('You just read Chinese').waitFor({ timeout: 4000 });
await page.getByText("Let's train").click();
await page.getByText('Enter the Tone Dojo').click();
// Exact + uppercase (Button uppercases labels in the DOM): a loose 'Start'
// would also match the landing page's hidden "GET STARTED".
await page.getByText('START', { exact: true }).waitFor();

const tab = (name) => page.getByRole('tab', { name });
await tab('Learn').click();
await page
  .getByText('Got it — next →')
  .or(page.getByText('Show answer'))
  .first()
  .waitFor({ timeout: 6000 });
await page.screenshot({ path: 'scripts/.cache/shot-review.png' });

await tab('Stats').click();
await page.getByText('Your progress', { exact: true }).waitFor({ timeout: 5000 });
await page.waitForTimeout(600);
await page.screenshot({ path: 'scripts/.cache/shot-stats.png' });

await browser.close();
server.close();
console.log('shots written');
