// browser checks: deep links load clean (screenshots in tests/out/b-*.png), the pick-agreement (WYSIWYG) check, a
// touch-only phone, and a controller's glyphs. Prints JSON lines for tests/run.mjs.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), url = pathToFileURL(resolve(root, '../BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-xhigh-20261104-050516.html')).href;
const out = [], ok = (name, pass, detail = '') => out.push({ suite: 'browser', name, pass: !!pass, detail: pass ? '' : String(detail).slice(0, 600) });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  for (const hash of ['#title', '#menu', '#hunt/hollow/1', '#hunt/bugle/2', '#hunt/muskeg/3', '#trophy/muskeg', '#bonus/crow', '#range', '#lodge', '#about', '#attract', '#party/2', '#animallab', '#soundlab']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
    p.on('pageerror', e => errs.push(String(e.message || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(url + hash); await p.waitForTimeout(hash.startsWith('#hunt') || hash.startsWith('#trophy') || hash.startsWith('#bonus') || hash === '#party/2' ? 7000 : 3500);
    const info = await p.evaluate(() => { const g = My3D2dge.current; return { scene: g.sceneName, errors: g.errors.map(e => e.message), drawn: g.fps > 0 }; });
    await p.screenshot({ path: join(root, 'tests/out/b-' + hash.slice(1).replace(/\//g, '-') + '.png') });
    ok('deep link ' + hash + ' loads with no errors', !errs.length && !info.errors.length && info.drawn, errs.concat(info.errors).join(' | ') + ' scene ' + info.scene);
    await p.close();
  }
  // the pick-agreement check: rays through the drawn silhouette hit the animal drawn there
  { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.goto(url + '#hunt/hollow/1'); await p.waitForTimeout(3000);
    const r = await p.evaluate(async () => {
      const g = My3D2dge.current, E = My3D2dge, X = g.debug.internals, H = g.debug.hunt(); for (let i = 0; i < 40 && !(H.seg && H.seg.kind === 'site'); i++) await new Promise(r => setTimeout(r, 100));
      const S = H.site; let ins = 0, insHit = 0, outs = 0, outHit = 0, animals = 0;
      const pose = [[-20, 30, 'buck'], [8, 40, 'doe'], [22, 26, 'buck'], [-6, 50, 'buck']];
      for (const [b, d, kind] of pose) { const a = S.spawn(kind, { at: [b, d], orders: [['hold']], hidden: false, points: 9 }); a.appear(); a.orders = [['graze', { secs: 99 }]]; a.nextOrder(); }
      await new Promise(r => setTimeout(r, 600));
      H.setupLens(); const L = H.lens, W = H.W, Ht = H.H;
      for (const p of H.world.props) p.hide = true;
      for (const a of H.actors) {
        if (a.cat !== 'animal' || !a.alive) continue; animals++;
        const others = H.actors.filter(o => o !== a && o.alive); for (const o of others) { o._s = o.state; o.state = 'gone'; }
        const it = a.item(), q = L.project(it.x, it.y, it.z); if (!q) continue;
        const k = q[2] * it.scale, dx = it.x - L.x, dy = it.y - L.y, gd = Math.hypot(dx, dy), yaw = -Math.atan2(dy, dx) * 180 / Math.PI - 90, pit = Math.atan2(L.z - it.z - it.box[1] * .45, gd) * 180 / Math.PI;
        const view = E.vistaExactView(E.vistaView(k, yaw, Math.max(0, pit)), L, { sx: q[0], sy: q[1], D: q[3] }, k, it), cv = document.createElement('canvas'); cv.width = W; cv.height = Ht; const cg = cv.getContext('2d', { willReadFrequently: true });
        const ant = a.rig.antlers; a.rig.antlers = null; a.rig.draw(cg, q[0], q[1], view); a.rig.antlers = ant;
        // what the renderer really shows of it: its own frame, with and without the animal (water hides a wader's legs)
        const V = H.world.vista, T0 = V.target(W, Ht, 'pick0'), T1 = V.target(W, Ht, 'pick1'); V.render(T0, L, []); a.rig.antlers = null; V.render(T1, L, [it]); a.rig.antlers = ant;
        const wy = V._wadeY(it), shown = (x, y) => y !== wy && T0.buf[y * W + x] !== T1.buf[y * W + x];
        const px = cg.getImageData(0, 0, W, Ht).data, m = (x, y) => x >= 0 && y >= 0 && x < W && y < Ht && px[(y * W + x) * 4 + 3] > 100 && shown(x, y);
        const inside = [], ring = [];
        for (let y = 0; y < Ht; y++) for (let x = 0; x < W; x++) { if (m(x, y)) { inside.push([x, y]); continue; } let near3 = false, near2 = false; for (let oy = -3; oy <= 3 && !near2; oy++) for (let ox = -3; ox <= 3; ox++) { if (!m(x + ox, y + oy)) continue; const d = Math.max(Math.abs(ox), Math.abs(oy)); if (d <= 2) { near2 = true; break; } if (d === 3) near3 = true; } if (near3 && !near2) ring.push([x, y]); }
        const pick = (l, n) => { const o = []; for (let i = 0; i < n && l.length; i++) o.push(l[(i * 7919) % l.length]); return o; };
        let ai = 0, ah = 0; for (const [x, y] of pick(inside, 75)) { const ray = L.ray(x + .5, y + .5), tg = H.world.hf.rayHit(ray, ray, q[3] * .98); if (tg !== null) continue; ins++; ai++; const R = X.resolveRay(H, ray); if (R.actor === a) { insHit++; ah++; } } window.__lastIns = ah + '/' + ai;
        for (const [x, y] of pick(ring, 75)) { const ray = L.ray(x + .5, y + .5), R = X.resolveRay(H, ray); if (R.actor === a && R.zone === 'antler') continue; outs++; if (R.actor === a) { outHit++; (window.__outZ = window.__outZ || {})[R.zone] = (window.__outZ[R.zone] || 0) + 1; } }
        (window.__per = window.__per || []).push(a.kind + ' d' + Math.round(q[3] / 16) + ' rel' + Math.round(((a.heading - Math.atan2(dy, dx)) * 180 / Math.PI + 540) % 360 - 180) + ' ' + (window.__lastIns || 0));
        for (const o of others) o.state = o._s;
      }
      for (const p of H.world.props) p.hide = false;
      return { ins, insHit, outs, outHit, animals, outZones: window.__outZ || {}, per: window.__per };
    });
    ok('pick: rays inside the drawn silhouettes hit the animal (>= 95%)', r.ins > 100 && r.insHit / r.ins >= .95, JSON.stringify(r));
    ok('pick: rays 3 px outside them miss it (<= 5%)', r.outs > 100 && r.outHit / r.outs <= .05, JSON.stringify(r));
    await p.close(); }
  // a touch-only phone: the message, no game from a tap, the attract mode still runs
  { const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }), p = await c.newPage(); await p.goto(url); await p.waitForTimeout(3000);
    const s1 = await p.evaluate(() => My3D2dge.current.debug.snapshot()); await p.screenshot({ path: join(root, 'tests/out/b-touch.png') });
    ok('touch: a phone gets "Controller or keyboard required"', s1.touchOnly === true && s1.scene === 'title', JSON.stringify({ t: s1.touchOnly, s: s1.scene }));
    await p.touchscreen.tap(195, 500); await p.waitForTimeout(800); const s2 = await p.evaluate(() => My3D2dge.current.sceneName); ok('touch: a tap does not start a game', s2 === 'title', s2);
    await p.waitForTimeout(11000); const s3 = await p.evaluate(() => My3D2dge.current.sceneName); ok('touch: the attract mode runs', s3 === 'attract', s3);
    await c.close(); }
  // a controller: PlayStation glyphs, Xbox with the setting, the mouse after it moves
  { const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    await p.addInitScript(() => { const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; window.__pad = pad; navigator.getGamepads = () => [pad]; });
    await p.goto(url); await p.waitForTimeout(2500);
    await p.evaluate(() => { window.__pad.buttons[0] = { pressed: true, value: 1 }; window.__pad.timestamp++; }); await p.waitForTimeout(200); await p.evaluate(() => { window.__pad.buttons[0] = { pressed: false, value: 0 }; window.__pad.timestamp++; }); await p.waitForTimeout(200);
    const g1 = await p.evaluate(() => { const g = My3D2dge.current, X = g.debug.internals; return { dev: g.input.lastDevice, fam: X.Glyph.family(g.input), fire: X.Glyph.code('fire', g.input) }; });
    ok('glyphs: a controller shows PlayStation glyphs by default', g1.dev === 'gamepad' && g1.fam === 'ps' && g1.fire === 'Pad7', JSON.stringify(g1));
    const g2 = await p.evaluate(() => { const g = My3D2dge.current; g.settings.set('glyphs', 'xbox'); return g.debug.internals.Glyph.family(g.input); }); ok('glyphs: Xbox letters after the setting', g2 === 'xbox', g2);
    await p.evaluate(() => My3D2dge.current.settings.set('glyphs', 'playstation'));
    await p.mouse.move(300, 300); await p.mouse.move(340, 330); await p.waitForTimeout(200);
    const g3 = await p.evaluate(() => { const g = My3D2dge.current, X = g.debug.internals; return { dev: g.input.lastDevice, fam: X.Glyph.family(g.input), fire: X.Glyph.code('fire', g.input) }; });
    ok('glyphs: the mouse switches prompts to the mouse icon', g3.fam === 'keys' && g3.fire === 'Mouse0', JSON.stringify(g3));
    await p.close(); }
} catch (e) { ok('browser checks ran', false, e.stack || e); }
await b.close();
for (const r of out) process.stdout.write(JSON.stringify(r) + '\n');
