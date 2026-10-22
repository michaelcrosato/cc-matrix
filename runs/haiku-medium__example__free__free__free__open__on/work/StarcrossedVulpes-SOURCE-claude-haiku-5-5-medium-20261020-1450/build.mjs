// Bundles src/ into one self-contained HTML file in the parent folder.
// Usage: node build.mjs   (run from this folder; needs `npm install`)
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_NAME = 'StarcrossedVulpes-SOURCE-claude-haiku-5-5-medium-20261020-1450.html';
const OUT = path.resolve(here, '..', OUT_NAME);

const result = await build({
  entryPoints: [path.join(here, 'src', 'main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2020',
  write: false,
  legalComments: 'none',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await readFile(path.join(here, 'src', 'style.css'), 'utf8');
const template = await readFile(path.join(here, 'src', 'index.html'), 'utf8');

const comment = `<!--
  SOURCE INFORMATION
  - Date: 2026-10-20 14:50
  - Source: Starfox 64 for N64
  - Tech: three.js 0.186.1 (WebGL, shadows, UnrealBloomPass via EffectComposer); esbuild 0.28.2 bundled into one HTML file; vanilla ES modules; Web Audio API; DOM UI
  - Art Direction: low-poly, flat-shaded, N64-inspired; sunset Plains, gunmetal Fortress, deep-space Asteroid Belt and Dreadnought; neon accents and bloom
  - Animation: procedural (critically damped flight/camera smoothing, instanced particle pool, shockwave and flash pools, timed boss sequences)
  - Testing: the prompt placed no restriction on testing
  - Environment: Claude Code CLI (headless); Linux; browser unknown
  - Model: Anthropic, claude-haiku-5-5, reasoning effort medium
  - Usage: unknown

  ENGINE FEEDBACK
  - Liked most: three.js shadows, fog and bloom with little setup; procedural geometry removes the need for assets
  - Stuck or guessed: tone mapping and color space for custom shaders and post passes (OutputPass needed once bloom is on)
  - Built myself: stage runtime (event timeline), lock-on and homing, medal rules, boss phases, input layer
  - Hardest part: keeping the DOM HUD in step with the three.js frame (target projection after camera moves)
  - Would overhaul: per-frame allocations in projection and steering helpers
  - Would change: a built-in screen-projection helper that stays in sync with the camera

  PROMPT FEEDBACK
  [PROMPT]
  - Liked most: the 10-foot controller-first brief and the explicit "no TODOs or stubs" completion rule
  - Confusing: whether CDN use and the single-file rule both hold; resolved by inlining everything
  - Hardest: fitting a feature-complete demo (route, boss, attract, settings, medals) into one bundle without a real controller to test
  - One test I'd want: a real PlayStation or Xbox pad on Chrome and Safari, checking inversion and lock-on feel
-->`;

const html = `${comment}\n${template
  .replace('/*SOURCE_COMMENT*/\n', '')
  .replace('/*STYLE*/', () => css)
  .replace('</body>', () => `<script>\n${js}\n</script>\n</body>`)}`;

await writeFile(OUT, html);
console.log(`wrote ${OUT} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
