// node tools/build.mjs : bundle game.js + hub client into the single deliverable HTML.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILE_STEM, TITLE } from '../src/data/meta.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '..', FILE_STEM + '.html');
const about = join(root, 'tools', 'genabout.mjs');
if (existsSync(about)) await import(about); // regenerates src/data/about.generated.js from exit-interview.json
const r = spawnSync('esbuild', ['game.js', '--bundle', '--format=esm', '--target=es2022', '--charset=utf8', '--legal-comments=none', '--log-level=warning'], { cwd: root, maxBuffer: 1 << 28 });
if (r.status !== 0) { console.error(r.stderr.toString()); process.exit(1); }
const js = r.stdout.toString();
const session = readFileSync(join(root, 'session.js'), 'utf8');
const safe = (s) => s.replace(/<\/script/gi, () => '<\\/script');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${session}</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="8">
<meta name="hub:session-goal" content="Fill the Knell, then slay its Warden together">
<meta name="hub:session-howto" content="Move: stick or WASD. Attack: Cross or click. Skills: face buttons or 1-4.">
<meta name="hub:webgpu" content="required">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<link rel="icon" href="data:,">
<title>${TITLE}</title>
<style>html,body{margin:0;height:100%;background:#0d0b14}#app{position:fixed;inset:0}</style>
</head>
<body>
<div id="app"></div>
<script type="module">
${safe(js)}
</script>
</body>
</html>
`;
writeFileSync(out, html);
console.log('built', out, (html.length / 1e6).toFixed(2) + ' MB');
