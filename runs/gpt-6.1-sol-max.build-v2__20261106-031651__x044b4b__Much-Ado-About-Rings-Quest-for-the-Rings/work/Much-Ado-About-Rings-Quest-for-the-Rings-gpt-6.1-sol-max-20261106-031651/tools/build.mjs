import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = JSON.parse(readFileSync(resolve(root, 'project.json'), 'utf8'));
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const inline = (source) => source.replace(/<\/script/gi, '<\\/script');
const parts = [
  'vendor/engine/my-3d2dge.js',
  'src/content/content.js',
  'src/sim/world.js',
  'src/view/assets.js',
  'src/view/view.js',
  'src/audio/audio.js',
  'src/net/hub.js',
  'src/ui/ui.js',
  'src/entry.js',
];
const interview = readFileSync(resolve(root, '../exit-interview.json'), 'utf8');
JSON.parse(interview);
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>${read('vendor/hub/session.js')}</script>\n<title>${project.title}</title>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n<meta name="theme-color" content="#152232">\n<meta name="hub:session" content="1">\n<meta name="hub:session-players" content="1-2">\n<meta name="hub:session-mode" content="shared-world">\n<meta name="hub:session-goal" content="Steal four rings together, bind the deathless dragon at four stations, and escape.">\n<meta name="hub:session-howto" content="Left stick / WASD move; right stick / mouse aim; R2 / click primary; L2 / right click power; Cross / Space evade; Triangle / E interact; R1 / Q companion ping; Square / Tab map; Options / Escape local menu.">\n<meta name="hub:session-minutes" content="25">\n<style id="game-css">${read('src/ui/style.css')}</style></head><body>\n<canvas id="screen" aria-label="${project.title} game world"></canvas>\n<div id="demo-label" hidden>THE RINGMASTER IS WATCHING<small>AI DEMONSTRATION · Any input returns to the title</small></div>\n<!-- my-3D2dge dependency license:\n${read('vendor/engine/LICENSE')} -->\n<script>globalThis.MA = { INTERVIEW: ${inline(interview)} };</script>\n${parts.map((path) => `<script>\n${inline(read(path))}\n</script>`).join('\n')}\n</body></html>\n`;
writeFileSync(resolve(root, `../${project.base}.html`), html);
writeFileSync(resolve(root, 'index.html'), html);
writeFileSync(
  resolve(root, 'docs/build-manifest.json'),
  JSON.stringify(
    {
      title: project.title,
      files: parts,
      engine: project.engineCommit,
      hub: project.hubCommit,
      bytes: Buffer.byteLength(html),
      externalRuntimeDependencies: [],
    },
    null,
    2,
  ),
);
if (!process.argv.includes('--quiet'))
  console.log(`Built ${project.base}.html (${Math.round(Buffer.byteLength(html) / 1024)} KiB)`);
