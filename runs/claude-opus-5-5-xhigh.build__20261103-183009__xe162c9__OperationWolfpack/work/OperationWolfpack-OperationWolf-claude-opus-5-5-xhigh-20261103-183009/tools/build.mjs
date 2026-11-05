// Bundles everything into the single-file game in the work folder's root: the hub client first (byte for byte), the
// hub metas, the engine and the game's scripts inlined (with </script escaped in them).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const R = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, R), 'utf8');
const m = JSON.parse(rd('manifest.json'));
const NAME = 'OperationWolfpack-OperationWolf-claude-opus-5-5-xhigh-20261103-183009';
const session = rd(m.hub);
if (/<\/script/i.test(session)) throw new Error('session.js holds </script: it cannot be inlined unmodified');
const esc = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const code = [m.engine, ...m.src].map(f => `<script>/* ${f} */\n${esc(rd(f))}\n</script>`).join('\n');
const ctx = { console: { log() {}, warn() {}, error() {} } }; vm.createContext(ctx); vm.runInContext(rd(m.engine), ctx);
const splash = ctx.My3D2dge.bootSplash ? ctx.My3D2dge.bootSplash('OPERATION WOLFPACK') : '';
const meta = (n, c) => `<meta name="${n}" content="${c}">`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${session}</script>
${meta('hub:session', '1')}
${meta('hub:session-players', '1-4')}
${meta('hub:session-mode', 'shared-world')}
${meta('hub:session-goal', 'Clear the operation as a team; top score wins')}
${meta('hub:session-howto', 'Aim: mouse or stick • Fire: click/R2 • Grenade: right click/L2 • Reload: R/□')}
${meta('hub:session-minutes', '5')}
${meta('hub:type', 'Game')}${meta('hub:players', '1–4')}${meta('hub:genre', 'Shooter')}${meta('hub:source', 'Operation Wolf')}${meta('hub:model', 'claude-opus-5-5 (xhigh)')}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Operation Wolfpack: a first-person light-gun rail shooter for 1-4 players, an original game inspired by Operation Wolf.">
<title>Operation Wolfpack</title>
<style>html,body{margin:0;height:100%;background:#141a0c;overflow:hidden}body{background:#141a0c url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cpath d='M30 70 L36 40 L32 22 L42 34 L54 34 L64 22 L60 40 L66 70 L48 60 Z' fill='%23202a14'/%3E%3C/svg%3E")}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head>
<body>
${splash}
<canvas id="screen"></canvas>
${code}
</body>
</html>
`;
const out = new URL('../' + NAME + '.html', R);
writeFileSync(out, html);
const h = createHash('sha256').update(session).digest('hex').slice(0, 12);
console.log('built', NAME + '.html', (html.length / 1024).toFixed(0) + ' KB', 'session.js sha256 ' + h);
