// OutBloom's build: `node build.mjs` writes the single-file bundle into the folder above (the deliverable) and
// exit-interview.json beside it; `node build.mjs --dev` writes index.html here, loading the files one by one (file://).
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const here = new URL('./', import.meta.url), up = new URL('../', import.meta.url);
const NAME = 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-xhigh-20261104-035148';
const files = JSON.parse(readFileSync(new URL('src/manifest.json', here), 'utf8'));
const dev = process.argv.includes('--dev');
const session = readFileSync(new URL('vendor/aihub-session.js', here), 'utf8');
const head = (scripts) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${scripts.session}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Fastest to the Flower Sprint goal wins">
<meta name="hub:session-howto" content="Steer stick/←→ · gas R2/✕/W · brake L2/□/S · drift ○/Space">
<meta name="hub:session-minutes" content="4">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
<meta name="description" content="OutBloom 2006: Coast 2 Coast. One day. One road. Every flower in bloom. An arcade road racer across the island of Bellafiore.">
<title>OutBloom 2006: Coast 2 Coast</title>
<style>html, body { margin: 0; height: 100%; background: #0b0716; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:linear-gradient(#2a2a7a,#7a3a8a 45%,#e85a8a 75%,#ffb070);color:#fff0e0;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#fff6d0;font-size:18px;letter-spacing:.08em">OUTBLOOM 2006: COAST 2 COAST</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff24"><span style="display:block;width:30%;height:100%;background:#ffcf4a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
${scripts.body}
</body>
</html>
`;
if (dev) {
  const html = head({ session: '<script src="vendor/aihub-session.js"></script>', body: ['engine/my-3d2dge.js'].concat(files.map(f => 'src/' + f)).map(f => `<script src="${f}"></script>`).join('\n') });
  writeFileSync(new URL('index.html', here), html);
  console.log('index.html written (' + files.length + ' files)');
} else {
  const esc = s => s.replace(/<\/script/gi, '<\\/script');
  const engine = readFileSync(new URL('engine/my-3d2dge.js', here), 'utf8');
  const srcs = files.map(f => ({ f, code: readFileSync(new URL('src/' + f, here), 'utf8') }));
  // the lint: no unfinished markers in the game's code; no network calls; no dialogs
  const bad = [];
  for (const { f, code } of srcs) {
    for (const re of [/\bTODO\b/i, /\bTBD\b/, /\bFIXME\b/i, /\blorem\b/i, /placeholder/i]) if (re.test(code)) bad.push(f + ': ' + re);
    for (const re of [/\bfetch\(/, /new WebSocket/, /RTCPeerConnection/, /XMLHttpRequest/, /\balert\(/, /\bconfirm\(/, /window\.prompt\(/, /window\.open\(/]) if (re.test(code)) bad.push(f + ': ' + re);
  }
  if (bad.length) { console.error('LINT FAILED\n' + bad.join('\n')); process.exit(1); }
  const html = head({ session: '<script>\n' + esc(session) + '\n</script>', body: ['<script>\n' + esc(engine) + '\n</script>'].concat(srcs.map(s => '<script>/* ' + s.f + ' */\n' + esc(s.code) + '\n</script>')).join('\n') });
  if (/<script[^>]+src=|<link[^>]+href=["']?https?:/i.test(html.replace(session, ''))) { console.error('the bundle loads an external file'); process.exit(1); }
  writeFileSync(new URL(NAME + '.html', up), html);
  // the exit interview, from the About data (the same object the About screen shows)
  const ctx = { window: {}, console }; ctx.window.OB = {}; vm.createContext(ctx);
  vm.runInContext('var window = this.window;' + readFileSync(new URL('src/01-data-about.js', here), 'utf8'), ctx);
  const about = ctx.window.OB.ABOUT;
  if (about && about.interview) {
    const json = JSON.stringify(about.interview, null, 2); JSON.parse(json);
    writeFileSync(new URL('exit-interview.json', up), json + '\n');
  }
  console.log('bundle written: ' + NAME + '.html (' + Math.round(html.length / 1024) + ' KB)');
}
