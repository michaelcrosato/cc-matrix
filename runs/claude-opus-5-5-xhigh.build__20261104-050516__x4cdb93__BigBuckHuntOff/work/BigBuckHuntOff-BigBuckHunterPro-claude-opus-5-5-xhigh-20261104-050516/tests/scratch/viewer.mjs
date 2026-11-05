// writes tests/scratch/viewer.html: the engine, the modules and the world files, and a camera at each vantage (#hunt/vantage)
import { writeFileSync } from 'node:fs';
import { read, manifest } from '../../build/lib.mjs';
const files = ['src/00-core.js', 'src/01-game.js', 'src/10-world.js', 'src/11-props.js', 'src/80-hollow.js', 'src/81-bugle.js', 'src/82-muskeg.js'];
const code = files.map(read).join('\n');
const view = `
const [hid, vid] = (location.hash.slice(1) || 'hollow/creekStand').split('/');
const W = worldFor(hid), L = new E.Lens(); const S = regAll('site').find(s => s.vantage === vid);
let b = 0;
game.start({ update(dt) { b += game.input.move()[0] * dt * 20; W.vista.time = game.time; }, draw(r) {
  const e = W.eye(vid), fr = S ? S.frame : { fov: 34, pitch: 4 };
  L.setup({ x: e.x, y: e.y, z: e.z, yaw: e.yaw + b * DEG, pitch: fr.pitch, fov: fr.fov }, r.W, r.H);
  const items = W.gather(L, []); W.vista.draw(r, L, items);
  r.text(hid + '/' + vid + ' gen ' + W.genMs + 'ms all ' + W.ms + 'ms  draw ' + (W.vista.stats.ms||0).toFixed(1) + 'ms items ' + W.vista.stats.items + ' props ' + W.props.length, 4, 4, '#fff', { shadow: '#000' });
} });`;
writeFileSync('tests/scratch/viewer.html', `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#000}#screen{width:100%;height:100%;display:block;image-rendering:pixelated}</style></head><body><canvas id="screen"></canvas>
${manifest.engine.map(f => `<script src="../../${f}"></script>`).join('\n')}
<script>(() => {\n${code}\n${view}\n})();</script></body></html>`);
