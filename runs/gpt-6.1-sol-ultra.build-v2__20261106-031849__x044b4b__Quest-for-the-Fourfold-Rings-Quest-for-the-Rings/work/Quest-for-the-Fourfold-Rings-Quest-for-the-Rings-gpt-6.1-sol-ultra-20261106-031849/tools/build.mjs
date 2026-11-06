import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dev=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.dirname(dev),stem=path.basename(dev);
const read=f=>fs.readFileSync(path.join(dev,f),'utf8');
const js=s=>s.replace(/<\/script/gi,'<\\/script');
const interview=JSON.parse(fs.readFileSync(path.join(root,'exit-interview.json'),'utf8'));
const modules=['vendor/engine/my-3d2dge.js','src/content/content.js','src/sim/sim.js','src/view/view.js','src/audio/audio.js','src/net/hub.js','src/ui/ui.js','src/entry.js'];
const html=`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><script>${read('vendor/hub/session.js')}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2"><meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Steal four rings with your companion, bind the undying dragon at four seals, and escape together.">
<meta name="hub:session-howto" content="Move: left stick/WASD. Aim: right stick/mouse. R2/left mouse: primary. L2/right mouse: class. Cross/Space: dodge. Triangle/E: interact, hold to revive. R1/Q: companion. Square/Tab: objective. Options/Esc: local menu. Touch: left drag move, right drag aim; contextual actions.">
<meta name="hub:session-minutes" content="25"><meta name="description" content="An original cooperative fantasy expedition inspired by Quest for the Rings (1981)."><title>Quest for the Fourfold Rings</title>
<style>${read('src/ui/style.css')}</style></head><body>
<canvas id="screen" aria-label="Quest for the Fourfold Rings native pixel game"></canvas><div id="loading">Forging the fourfold compact…</div><div id="caption" aria-live="polite"></div><div id="demo" hidden>THE RINGMASTER IS WATCHING<small>DEMONSTRATION · press any button to return</small></div><div id="touchActions" hidden></div>
<script>globalThis.RingInterview=${js(JSON.stringify(interview))};</script>
${modules.map(file=>`<script>/* ${file} */\n${js(read(file))}\n</script>`).join('\n')}
</body></html>`;
fs.writeFileSync(path.join(root,stem+'.html'),html);
fs.writeFileSync(path.join(dev,'docs/build.json'),JSON.stringify({title:interview.aiHub.name,output:stem+'.html',engine:'0.89.1',engineCommit:'8ecc2f62353761187bdfe226f327b7ea5d2eb691',hub:'1.4.0',hubCommit:'35a1047f2067b2af3de3943f0fe452f39105d869',bytes:Buffer.byteLength(html),modules},null,2));
if(!process.argv.includes('--quiet'))console.log('Built '+stem+'.html ('+Buffer.byteLength(html)+' bytes)');
