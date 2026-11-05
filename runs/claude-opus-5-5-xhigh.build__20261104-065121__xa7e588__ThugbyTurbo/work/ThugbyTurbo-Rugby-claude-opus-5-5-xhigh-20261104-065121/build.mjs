// THUGBY TURBO build: src/*.js (in file-name order) into one IIFE, build/game.js; then the single-file deliverable in the
// parent folder: page.html with the AI Hub session client first in <head> (unmodified), the engine and the game inlined.
// Run: node build.mjs   (test/run.mjs runs it first)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';

const here = new URL('./', import.meta.url), at = f => new URL(f, here);
const read = f => readFileSync(at(f), 'utf8');
export const NAME = 'ThugbyTurbo-Rugby-claude-opus-5-5-xhigh-20261104-065121';
export const OUT = new URL('../' + NAME + '.html', here);

export function build({ quiet = false } = {}) {
  const files = readdirSync(at('src/')).filter(f => f.endsWith('.js')).sort();
  let js = "/* THUGBY TURBO: over-the-top arcade rugby sevens, on the my-3D2dge engine. Built by build.mjs from src/. */\n(() => {\n'use strict';\n";
  for (const f of files) js += '\n/* ==== ' + f + ' ==== */\n' + read('src/' + f) + '\n';
  js += '\n})();\n';
  mkdirSync(at('build/'), { recursive: true });
  writeFileSync(at('build/game.js'), js);
  // the boot splash's markup, from the engine itself
  const ctx = { console: { log() {}, info() {}, warn() {}, error() {} } }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(read('engine/my-3d2dge.js'), ctx, { filename: 'engine' });
  const splash = ctx.My3D2dge.bootSplash('THUGBY TURBO');
  const inline = s => s.replace(/<\/script/gi, '<\\/script');
  const session = read('vendor/aihub-session.js'), engine = read('engine/my-3d2dge.js');
  let html = read('page.html');
  const swap = (from, to) => { if (!html.includes(from)) throw new Error('page.html lacks ' + from); html = html.replace(from, () => to); };
  swap('<script src="vendor/aihub-session.js"></script>', '<script>\n' + inline(session) + '\n</script>');
  swap('<!--BOOT-->', splash);
  swap('<script src="engine/my-3d2dge.js"></script>', '<script>\n' + inline(engine) + '\n</script>');
  swap('<script src="build/game.js"></script>', '<script>\n' + inline(js) + '\n</script>');
  writeFileSync(OUT, html);
  if (!quiet) console.log('built ' + NAME + '.html: ' + (html.length / 1024 / 1024).toFixed(2) + ' MB (' + files.length + ' source files)');
  return { files, size: html.length };
}
if (process.argv[1] && process.argv[1].endsWith('build.mjs')) build();
