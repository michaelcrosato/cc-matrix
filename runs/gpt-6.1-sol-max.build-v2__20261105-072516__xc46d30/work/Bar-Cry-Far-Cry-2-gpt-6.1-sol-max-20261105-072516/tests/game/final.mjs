/** @file tests/game/final.mjs: the acceptance check, reading TASK.md itself: names, title pick, one file, hub client and tags, the exit-interview file, no stubs, engine untouched, and in a browser: boots, music at 10%, touch notice, About. */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { chromium, devices } from '@playwright/test';

let [passed, failed] = [0, 0];
const check = (name, ok, why = '') => {
  if (ok) passed += 1;
  else {
    failed += 1;
    console.log(`FAIL ${name}${why ? `: ${String(why).slice(0, 200)}` : ''}`);
  }
};
const alnum = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
const task = readFileSync('../TASK.md', 'utf8');
const line = (label) => new RegExp(`^- ${label}: (.*)$`, 'm').exec(task)?.[1].trim();
const questions = (head) =>
  (new RegExp(`^${head}\\n\\n((?:- .*\\n?)+)`, 'm').exec(task)?.[1] ?? '').trim().split('\n').length;
const name = basename(process.cwd());
const deliverable = `../${name}.html`;
const html = existsSync(deliverable) ? readFileSync(deliverable, 'utf8') : '';
const title =
  /TITLE = '([^']+)'/.exec(existsSync('labs/game/title.ts') ? readFileSync('labs/game/title.ts', 'utf8') : '')?.[1] ??
  '';
const source = /^SOURCE: (.*)$/m.exec(task)[1].trim();

// Names and the title.
check('title constant in labs/game/title.ts', title !== '');
check('deliverable beside the dev folder', html !== '', deliverable);
check(
  'names follow the pattern in TASK.md',
  alnum(name) === alnum(`${title}${source}${/\[GameTitle-SOURCE-([^\]]+)\]\.html/.exec(task)[1]}`),
  name,
);
const pick = existsSync('out/title-pick.json') ? JSON.parse(readFileSync('out/title-pick.json', 'utf8')) : {};
check('title picked by a real RNG from 50', pick.count === 50 && pick.title === title, JSON.stringify(pick));
check('title in the page', (/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '').includes(title));

// One file, with the hub's client and tags.
const outside = html.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>|<style>[\s\S]*?<\/style>/g, ''); // inline code only: a script loaded from elsewhere stays to be counted
const refs = [...outside.matchAll(/\b(?:src|href)="([^"]*)"/g)]
  .map((match) => match[1])
  .filter((ref) => !ref.startsWith('data:'));
check('one file: nothing loaded from outside', refs.length === 0, refs.join(' '));
const client = existsSync('.cache/hub/session.js') ? readFileSync('.cache/hub/session.js', 'utf8') : '?';
check(
  'hub client first in the head, byte for byte',
  html.includes(`<meta charset="utf-8" />\n<script>${client}</script>`),
);
for (const [meta, value] of Object.entries({
  session: '1',
  'session-players': '1-4',
  'session-mode': 'shared-world',
  webgpu: 'required',
}))
  check(`tag hub:${meta}`, html.includes(`<meta name="hub:${meta}" content="${value}">`));
for (const meta of ['session-goal', 'session-howto', 'session-minutes'])
  check(`tag hub:${meta}`, new RegExp(`<meta name="hub:${meta}" content="[^"]+">`).test(html));
check('no audio files', !/data:audio|\.(mp3|ogg|wav|m4a|flac)["'`]/i.test(html));

// The exit-interview file, against the shape and the questions in TASK.md.
const exitFile = `../${/save these answers as (\S+\.json)/.exec(task)[1]}`;
let exit = {};
try {
  exit = JSON.parse(readFileSync(exitFile, 'utf8'));
  check('exit-interview file parses', true);
} catch (error) {
  check('exit-interview file parses', false, error.message);
}
const shape = JSON.parse(/^\{\n[\s\S]*?\n\}$/m.exec(task)[0]);
const kind = (value) => (Array.isArray(value) ? 'array' : typeof value);
const walk = (want, got, path) => {
  for (const key of new Set([...Object.keys(want), ...Object.keys(got ?? {})])) {
    const at = `${path}.${key}`;
    check(`exit-interview shape: ${at}`, key in want && kind(want[key]) === kind(got?.[key]));
    if (kind(want[key]) === 'object') walk(want[key], got?.[key], at);
    else if (key !== 'series') check(`exit-interview value: ${at}`, (got?.[key] ?? '').length > 0);
  }
};
walk(shape, exit, 'file');
const info = exit.sourceInformation ?? {};
const hub = exit.aiHub ?? {};
check('usage is "added on import"', info.usage === 'added on import', info.usage);
check(
  'date, environment and model as in TASK.md',
  info.date === line('Date') && info.environment === line('Environment') && info.model === line('Model'),
);
check('source as in TASK.md', info.source === source && hub.source === source);
check('plan names a file', /\.md$/.test(info.plan ?? ''), info.plan);
for (const [key, head] of [
  ['testingFeedback', 'Testing Feedback'],
  ['engineFeedback', 'Engine Feedback'],
  ['promptFeedback', 'Prompt Feedback'],
])
  check(
    `${head}: one answer a question`,
    exit[key]?.length === questions(head),
    `${exit[key]?.length} of ${questions(head)}`,
  );
check('catalogue name is the title', hub.name === title, hub.name);
check('catalogue type', ['Game', 'Tech demo', 'Tool'].includes(hub.type), hub.type);
check('catalogue genre', /one of (.*)/.exec(shape.aiHub.genre)[1].split(', ').includes(hub.genre), hub.genre);
check('catalogue players', ['1', '1–2', '1–4'].includes(hub.players), hub.players);
check(
  'catalogue tags',
  hub.tags?.length >= 3 && hub.tags?.length <= 6 && hub.tags.every((tag) => tag === tag.toLowerCase()),
  hub.tags,
);
check(
  'About data is the exit-interview file',
  html.includes(`window.__about = ${JSON.stringify(exit).replaceAll('</script', '<\\/script')};`),
);

// No stubs; the engine as shipped.
const scan = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? scan(path) : [path];
  });
const stubs = scan('labs/game').filter(
  (path) =>
    !path.endsWith('.test.ts') &&
    !path.includes('replays') &&
    /\b(TODO|FIXME|XXX|placeholder|stubbed)\b/i.test(readFileSync(path, 'utf8')),
);
check('no TODOs, placeholders or stubs in labs/game', stubs.length === 0, stubs.join(' '));
check('engine as shipped', spawnSync('node', ['x', 'engine'], { encoding: 'utf8' }).status === 0);

// In a browser: from file://, on a first run.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader'],
});
const url = `file://${resolve(deliverable)}`;
if (html) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(url);
  await page.waitForFunction(() => window.__engine?.ready === true, undefined, { timeout: 120000 }).catch(() => {});
  check('boots from file://', await page.evaluate(() => window.__engine?.ready === true));
  const engineErrors = await page.evaluate(() => window.__engine?.errors?.length ?? 1);
  check('no errors at start', errors.length === 0 && engineErrors === 0, errors[0]);
  check('music at 10% on a first run', await page.evaluate(() => window.__game?.audio?.volume('music') === 0.1));
  await page.evaluate(() => window.__game?.open('about'));
  const shown = await page.evaluate(() => document.querySelector('[data-screen="about"]')?.textContent ?? '');
  for (const [key, value] of Object.entries(info)) check(`About shows ${key}`, shown.includes(value));
  for (const key of ['testingFeedback', 'engineFeedback', 'promptFeedback'])
    for (const answer of exit[key] ?? []) check(`About shows ${key}`, shown.includes(answer));
  await page.close();
  const phone = await browser.newContext({ ...devices['Pixel 7'] });
  const touch = await phone.newPage();
  await touch.goto(url);
  await touch
    .waitForFunction(() => document.body.textContent.includes('Controller or keyboard required'), undefined, {
      timeout: 60000,
    })
    .catch(() => {});
  const notice = await touch.evaluate(() => ({
    text: document.body.textContent.includes('Controller or keyboard required'),
    settings: [...document.querySelectorAll('button')].some((button) => button.textContent.includes('Settings')),
  }));
  check('touch notice', notice.text);
  check('touch Settings button', notice.settings);
  await phone.close();
}
await browser.close();
console.log(`COUNT ${passed} ${failed}`);
