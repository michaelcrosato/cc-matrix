// Bundles the game into one HTML file in the work folder's root: session.js first and unmodified, then the engine and
// the sources in manifest order, inlined (with </script escaped in inlined code only). Also writes dev/index.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, root), 'utf8');
export const NAME = 'OperationBigBadWolf-OperationWolf-claude-opus-5-5-medium-20261103-184337';
export const OUT = new URL('../' + NAME + '.html', root);
const man = JSON.parse(rd('manifest.json')).scripts;
const session = rd('hub/session.js');
if (/<\/script/i.test(session)) throw new Error('session.js holds </script: it cannot be inlined unmodified');
const esc = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const metas = [['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'shared-world'], ['hub:session-goal', 'Clear the operation as a team; top score wins'],
  ['hub:session-howto', 'Aim: mouse or stick · Fire: click/R2 · Grenade: right click/L2 · Reload: R/□'], ['hub:session-minutes', '5'],
  ['hub:type', 'Game'], ['hub:players', '1–4'], ['hub:genre', 'Shooter'], ['hub:source', 'Operation Wolf'], ['hub:model', 'claude-opus-5-5 (medium)'], ['hub:title', 'Operation Big Bad Wolf'],
  ['hub:tagline', 'Every bullet counts. Bring them home.']];
const css = 'html,body{margin:0;height:100%;overflow:hidden;background:#12160c radial-gradient(circle at 50% 50%,#2a3020 0,#12160c 75%)}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}';
const body = man.filter(f => f !== 'hub/session.js').map(f => '<script>/* ' + f + ' */\n' + esc(rd(f)) + '\n</script>').join('\n');
const html = '<!doctype html>\n<html lang="en"><head>\n<meta charset="utf-8">\n<script>' + session + '</script>\n' + metas.map(([n, c]) => '<meta name="' + n + '" content="' + c + '">').join('\n') +
  '\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>Operation Big Bad Wolf</title>\n<style>' + css + '</style>\n</head>\n<body><canvas id="screen"></canvas>\n' + body + '\n</body></html>\n';
writeFileSync(OUT, html);
const dev = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script src="../hub/session.js"></script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>Operation Big Bad Wolf</title>\n<style>' + css + '</style></head>\n<body><canvas id="screen"></canvas>\n' + man.filter(f => f !== 'hub/session.js').map(f => '<script src="../' + f + '"></script>').join('\n') + '\n</body></html>\n';
writeFileSync(new URL('dev/index.html', root), dev);
if (process.argv.includes('--quiet')) process.exit(0);
console.log('built', NAME + '.html', (html.length / 1024).toFixed(0) + ' KB', 'session sha1', createHash('sha1').update(session).digest('hex').slice(0, 10));
