// The bundle (plan §19.2 "bundle"): the root HTML exists with the exact name; the client is the first script in <head>,
// byte-identical to vendor/aihub-session.js; the hub tags are there; no external URLs; its inline scripts run headless.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DEV, loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
const NAME = 'Zonefire-Basketball-claude-haiku-5-5-medium-20261104-061830';
const ROOT = join(DEV, '..');
T('bundle.the root deliverable exists with the exact name', () => {
  expect(existsSync(join(ROOT, NAME + '.html')), `missing ${NAME}.html`);
});
T('bundle.the AI Hub client is the first script in head, byte for byte; the hub tags are present', () => {
  const html = readFileSync(join(ROOT, NAME + '.html'), 'utf8');
  const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
  const first = head.match(/<meta charset[^>]*>\s*<script>\n?([\s\S]*?)\n?<\/script>/);
  expect(first, 'the client follows meta charset');
  expect(first[1].trim() === readFileSync(join(DEV, 'vendor/aihub-session.js'), 'utf8').trim(), 'the client is unmodified');
  for (const t of ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto', 'hub:type']) expect(head.includes(`name="${t}"`), `tag ${t}`);
});
T('bundle.no external URLs are loaded at runtime', () => {
  const html = readFileSync(join(ROOT, NAME + '.html'), 'utf8');
  const srcs = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
  expect(srcs.length === 0, `external scripts: ${srcs}`);
  expect(!/(fetch|XMLHttpRequest|new WebSocket)\s*\(\s*['"`]https?:/.test(html), 'no runtime fetch to a URL');
});
T('bundle.the deliverable runs headless: its game boots to the title', () => {
  const html = readFileSync(join(ROOT, NAME + '.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>\n?([\s\S]*?)\n?<\/script>/g)].map(m => m[1]);
  expect(scripts.length === 3, `${scripts.length} inline scripts, want 3 (client, engine, game)`);
  const g = loadGame({ seed: 1 });
  expect(g.game.sceneName === 'title' || g.game.sceneName === 'hubcard', `boots to ${g.game.sceneName}`);
  expect(g.game.errors.length === 0, 'no errors at boot');
});
