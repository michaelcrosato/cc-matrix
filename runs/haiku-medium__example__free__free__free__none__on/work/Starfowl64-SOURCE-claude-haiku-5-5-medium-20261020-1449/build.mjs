// Bundles src/ into one HTML file in the parent folder (the task folder root).
// Modules are concatenated in dependency order into one inline module script.
// Only project-internal import/export lines are rewritten; Three.js comes from the import map.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, 'src');
const out = join(here, '..', 'Starfowl64-SOURCE-claude-haiku-5-5-medium-20261020-1449.html');

const ORDER = ['world.js', 'audio.js', 'input.js', 'entities.js', 'player.js', 'stages.js', 'hud.js', 'wingmen.js', 'menus.js', 'text.js', 'game.js', 'main.js'];

const SOURCE_COMMENT = `<!--
  Starfowl 64 — single-file bundle.

  SOURCE INFORMATION
  - Date: 2026-10-20 14:49
  - Source: Starfox 64 for N64
  - Tech: vanilla ES modules, Three.js 0.160.0 (CDN), Web Audio API, Canvas 2D HUD, Gamepad API
  - Art Direction: flat-shaded low-poly ships and terrain with modern lighting, shadows and additive particles
  - Animation: per-frame procedural transforms (banking, barrel roll, U-turn orbit), pooled particle system, scripted stage timelines
  - Testing: none performed. The prompt said to write no tests and do no tests; testing is done separately.
  - Environment: Claude Code CLI (headless); Linux; browser unknown
  - Model: Anthropic, claude-haiku-5-5, reasoning effort medium
  - Usage: unknown

  ENGINE FEEDBACK
  - Liked most: Three.js gives shadows, fog and additive points with very little setup.
  - Stuck or guessed wrong: the CDN version and import map had to be right before anything else worked.
  - Built myself: the stage timeline, the U-turn facing logic and the lock-on system.
  - Hardest: keeping world-space scrolling consistent when the ship flies backwards after a U-turn.
  - Remove or overhaul: nothing core. No built-in input layer, so input is hand-rolled.
  - Change one thing: a built-in gamepad helper with axis-inversion and deadzone settings.

  PROMPT FEEDBACK
  - Liked most: the 10-foot controller-first rules and the explicit reference demos gave a clear bar.
  - Confusing: the directory rules and the filename template had several fill-in fields to work out first.
  - Hardest: fitting a full on-rails shooter with branching routes, a boss and attract mode into one file without testing.
  - One test to run: a controller-only playthrough on a PS5 pad in Chromium, to confirm the axis inversion toggles fix the reported problem.
-->`;

const modules = ORDER.map((name) => ({ name, text: readFileSync(join(src, name), 'utf8') }));

// Project-internal imports are removed (everything is one scope). Three.js is the only external import.
const IMPORT_RE = /^import\s[\s\S]*?from\s+['"]\.\/[^'"]+['"];?\s*$/gm;
const THREE_IMPORT = "import * as THREE from 'three';";

let body = '';
const seen = new Map();
for (const m of modules) {
  let text = m.text.replace(/^import \* as THREE from 'three';\s*$/m, '');
  text = text.replace(IMPORT_RE, '');
  text = text.replace(/^export \{[^}]*\};?\s*$/gm, '');
  text = text.replace(/^export (?=(?:async\s+)?(?:function|const|let|class)\b)/gm, '');

  // Top-level names must be unique once everything shares one scope.
  for (const d of text.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    const name = d[1];
    if (seen.has(name)) throw new Error(`duplicate top-level name "${name}" in ${m.name} (first in ${seen.get(name)})`);
    seen.set(name, m.name);
  }
  body += `\n// ---- ${m.name} ----\n${text.trim()}\n`;
}

const css = readFileSync(join(src, 'style.css'), 'utf8');
const html = readFileSync(join(src, 'index.html'), 'utf8');

const importMap = html.match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
const bodyMarkup = html.match(/<body>([\s\S]*?)<script type="importmap">/)[1];

const page = `<!DOCTYPE html>
${SOURCE_COMMENT}
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Starfowl 64</title>
<style>
${css}
</style>
${importMap}
</head>
<body>${bodyMarkup}<script type="module">
${THREE_IMPORT}
${body}
</script>
</body>
</html>
`;

writeFileSync(out, page);
console.log(`wrote ${out} (${page.length} bytes)`);
