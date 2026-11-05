// MASH TV build: node tools/build.mjs
// 1. concatenates src/*.js (name order) into build/game.js: one IIFE opened in 00-core.js and closed in 90-main.js,
//    with src/about.json inlined as MT.ABOUT and MT.BUILD stamped;
// 2. node --check on it;
// 3. writes build/dev.html (separate scripts, fast iteration);
// 4. writes the deliverable ../<OUT>.html (one self-contained file) and ../exit-interview.json.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const OUT = 'MashTV-SmashTV-claude-opus-5-5-xhigh-20261104-050256';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => join(root, ...a);

export function build({ quiet = false } = {}) {
  mkdirSync(P('build'), { recursive: true });
  const files = readdirSync(P('src')).filter(f => f.endsWith('.js')).sort();
  const about = JSON.parse(readFileSync(P('src/about.json'), 'utf8'));
  let js = '';
  for (const f of files) {
    let code = readFileSync(P('src', f), 'utf8');
    if (f.startsWith('00-')) code = code.replace('/*@ABOUT@*/', 'MT.ABOUT = ' + JSON.stringify(about) + ';\nMT.BUILD = ' + JSON.stringify(new Date().toISOString()) + ';');
    js += '\n// ---- ' + f + ' ----\n' + code;
  }
  writeFileSync(P('build/game.js'), js);
  execFileSync(process.execPath, ['--check', P('build/game.js')], { stdio: 'inherit' });

  const engine = readFileSync(P('engine/my-3d2dge.js'), 'utf8');
  const session = readFileSync(P('vendor/hub/session.js'), 'utf8');
  const props = existsSync(P('assets/mash-props.js')) ? readFileSync(P('assets/mash-props.js'), 'utf8') : '';
  if (session.includes('</script')) throw new Error('session.js contains </script: cannot inline it verbatim');
  const safe = s => s.replace(/<\/script/gi, '<\\/script');

  const metas = [
    ['hub:type', 'Game'], ['hub:players', '1–4'], ['hub:session', '1'], ['hub:session-players', '1-4'],
    ['hub:session-mode', 'shared-world'], ['hub:session-minutes', '6'],
    ['hub:session-goal', 'Grab the most cash, and beat Mashy together'],
    ['hub:session-howto', 'Move WASD/L-stick · aim+fire mouse/R-stick · slide Space/L2 · bomb E/R1'],
  ].map(([n, c]) => `<meta name="${n}" content="${c}">`).join('\n');
  const css = readFileSync(P('src/page.css'), 'utf8');
  const splash = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#140a24;color:#c8b8e8;font:14px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#ffcc33;font-size:22px;letter-spacing:.08em">MASH TV</b><span>Warming up the studio lights · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ff2e88;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
  const head = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>MASH TV</title>\n${metas}\n<style>${css}</style>\n`;

  // the deliverable: session.js verbatim as the first script in <head>, then the engine, the props and the game in <body>
  const html = head + `<script>\n${session}</script>\n</head>\n<body>\n${splash}\n<canvas id="screen"></canvas>\n` +
    `<script>\n${safe(engine)}\n</script>\n` + (props ? `<script>\n${safe(props)}\n</script>\n` : '') + `<script>\n${safe(js)}\n</script>\n</body>\n</html>\n`;
  writeFileSync(join(root, '..', OUT + '.html'), html);

  // the dev page: the same head, separate scripts
  const dev = head + `<script src="../vendor/hub/session.js"></script>\n</head>\n<body>\n${splash}\n<canvas id="screen"></canvas>\n` +
    `<script src="../engine/my-3d2dge.js"></script>\n` + (props ? `<script src="../assets/mash-props.js"></script>\n` : '') + `<script src="game.js"></script>\n</body>\n</html>\n`;
  writeFileSync(P('build/dev.html'), dev);

  // the exit interview, from the same about.json the About screen reads
  const ei = about.exitInterview;
  const text = JSON.stringify(ei, null, 2);
  JSON.parse(text);
  writeFileSync(join(root, '..', 'exit-interview.json'), text + '\n');
  if (!quiet) console.log(`built ${OUT}.html (${(html.length / 1024).toFixed(0)} KB), build/game.js (${(js.length / 1024).toFixed(0)} KB)`);
  return { html, js };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();
