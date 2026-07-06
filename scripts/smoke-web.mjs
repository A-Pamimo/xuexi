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
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const t0 = Date.now();
await page.goto(url, { waitUntil: 'load' });
// Onboarding should render the welcome copy quickly.
await page.getByText('Welcome to xuexi').waitFor({ timeout: 8000 });
const tReady = Date.now() - t0;

// Drive onboarding -> tone primer -> finish -> lands in Tone Dojo (a completable action).
await page.getByText("Let's go").click();
await page.getByText('The four tones').waitFor({ timeout: 4000 });
await page.getByText('I hear the difference').click();
await page.getByText('Enter the Tone Dojo').click();
await page.getByText('Tone Dojo').first().waitFor({ timeout: 4000 });

// Tabs present?
await page.getByText('Feed').first().waitFor({ timeout: 4000 });

// Start a Dojo round: exercises the audio_refs data (empty refs would throw)
// and the expo-audio playback path.
await page.getByText('Start').first().click();
await page.getByText('tap to replay').waitFor({ timeout: 5000 });
await page.getByText('1 flat').click(); // answer once (right or wrong both fine)

// Visit each tab and confirm it renders something meaningful.
await page.getByText('Reviews').first().click();
await page.getByText('Show answer').waitFor({ timeout: 5000 }); // a review is preloaded
await page.getByText('Stats').first().click();
await page.getByText('Your progress').waitFor({ timeout: 5000 });
await page.getByText('Feed').first().click();
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
