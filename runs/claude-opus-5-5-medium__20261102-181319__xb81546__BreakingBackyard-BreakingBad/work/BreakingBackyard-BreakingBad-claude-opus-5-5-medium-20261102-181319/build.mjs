// Builds the game: concatenates src/*.js into dist/game.js (one IIFE), writes a dev page, and bundles everything
// (the AI Hub client, the engine, the game) into the single deliverable .html in the run folder's root.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const NAME = 'BreakingBackyard-BreakingBad-claude-opus-5-5-medium-20261102-181319';
const files = readdirSync(join(here, 'src')).filter(f => f.endsWith('.js')).sort();
let game = files.map(f => `// ---- ${f} ----\n` + readFileSync(join(here, 'src', f), 'utf8')).join('\n');
const about = existsSync(join(here, 'about.json')) ? JSON.parse(readFileSync(join(here, 'about.json'), 'utf8')) : [];
game = game.replace('/*ABOUT_JSON*/[]', JSON.stringify(about));
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'game.js'), game);
const meta = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Earn the most cash: cook, sell, dodge the DEA">
<meta name="hub:session-howto" content="Move WASD/stick · E/Cross: cook, sell · Space/Circle: roll · smoke: RMB/R1">`;
const head = (scripts) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${scripts.session}
${meta}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Breaking Backyard: an original spiritual successor to Breaking Bad. Cook, deal, launder and survive in a three-quarter-view crime action-adventure.">
<title>Breaking Backyard</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0a0604;color:#c8b090;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><b style="color:#fff4d0;font-size:16px;letter-spacing:.08em">BREAKING BACKYARD</b><span>Starting · my-3D2dge</span></div>
<canvas id="screen"></canvas>
${scripts.engine}
${scripts.game}
</body>
</html>
`;
const esc = s => s.replace(/<\/script/gi, '<\\/script');
// the dev page (served from this folder)
writeFileSync(join(here, 'dist', 'index.html'), head({ session: '<script src="../hub/session.js"></script>', engine: '<script src="../vendor/my-3d2dge.js"></script>', game: '<script src="game.js"></script>' }));
// the single file
const single = head({
  session: '<script>\n' + esc(readFileSync(join(here, 'hub', 'session.js'), 'utf8')) + '</script>',
  engine: '<script>\n' + esc(readFileSync(join(here, 'vendor', 'my-3d2dge.js'), 'utf8')) + '\n</script>',
  game: '<script>\n' + esc(game) + '\n</script>'
});
writeFileSync(join(here, '..', NAME + '.html'), single);
writeFileSync(join(here, 'dist', NAME + '.html'), single);
console.log('built', files.length, 'files,', (game.length / 1024).toFixed(0) + ' KB game,', (single.length / 1024).toFixed(0) + ' KB single file');
