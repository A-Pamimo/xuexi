/**
 * Headless smoke test of the exported web build (verification #2): the app must
 * cold-load with no JS errors and reach a completable action quickly.
 * Serves ./dist and drives it with the pre-installed Chromium.
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
    // The web export is built with baseUrl '/xuexi', so index.html requests
    // assets under that prefix; serve DIST at the root by stripping it.
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
const port = server.address().port;
const url = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({
  // CI installs Chromium via playwright and injects its path; the hardcoded path
  // is the local dev-container fallback.
  executablePath:
    process.env.PW_EXECUTABLE_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const t0 = Date.now();
await page.goto(url, { waitUntil: 'load' });
// A brand-new visitor lands on the marketing page first.
await page.getByText('Get started').waitFor({ timeout: 8000 });
const tReady = Date.now() - t0;

// Enter as a guest -> onboarding welcome.
await page.getByText('Get started').click();
await page.getByText('Welcome to xuexi').waitFor({ timeout: 4000 });

// Drive onboarding -> first-word win -> tone primer -> finish -> lands in Tone
// Dojo (a completable action).
await page.getByText("Let's go").click();
// "Your first word": tap the correct gloss ("tea"), then advance.
await page.getByText('Your first word').waitFor({ timeout: 4000 });
await page.getByRole('button', { name: 'tea' }).click();
await page.getByText('Keep going').click();
await page.getByText('The four tones').waitFor({ timeout: 4000 });
await page.getByText('I hear the difference').click();
// "You just read Chinese" comprehensible-input reveal, then advance.
await page.getByText('You just read Chinese').waitFor({ timeout: 4000 });
await page.getByText("Let's train").click();
await page.getByText('Enter the Tone Dojo').click();
await page.getByText('Tone Dojo').first().waitFor({ timeout: 4000 });

// Tabs present? Target the tab bar by role so screen copy can't shadow a label.
const tab = (name) => page.getByRole('tab', { name });
await tab('Feed').waitFor({ timeout: 4000 });

// Visit each tab and confirm it renders something meaningful.
await tab('Learn').click();
// A fresh session leads with new words ("Got it — next") but may also surface a
// due review ("Show answer"); accept either so the check isn't state-brittle.
await page
  .getByText('Got it — next →')
  .or(page.getByText('Show answer'))
  .first()
  .waitFor({ timeout: 6000 });
await tab('Stats').click();
// Exact match: the account card's "Save your progress" also contains this text.
await page.getByText('Your progress', { exact: true }).waitFor({ timeout: 5000 });
await tab('Feed').click();
// Feed shows either sentences or the warm-up message.
await page.waitForTimeout(800);

const realErrors = errors.filter(
  (e) => !/autoplay|play\(\) failed|NotAllowedError|AudioContext|user gesture/i.test(e),
);

console.log(`ready in ${tReady}ms`);
console.log(`JS errors: ${realErrors.length}`);
if (realErrors.length) console.log(realErrors.slice(0, 8).join('\n'));

await browser.close();
server.close();
process.exit(realErrors.length === 0 && tReady < 10000 ? 0 : 1);
