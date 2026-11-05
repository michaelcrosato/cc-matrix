// core suites: the bundle, 3D math, the rasterizer, determinism, audio data
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const NAME = 'TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153';
export default {
  build(t) {
    const html = readFileSync(new URL('../' + NAME + '.html', t.root), 'utf8'), sess = readFileSync(t.at('hub/session.js'), 'utf8');
    t.check('meta charset first', /^<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">/i.test(html));
    const firstScript = html.indexOf('<script>'), body = html.slice(firstScript + 8, html.indexOf('</script>', firstScript)).trim();
    t.check('session client is the first script, unmodified', createHash('sha256').update(body).digest('hex') === createHash('sha256').update(sess.trim().replace(/<\/script/gi, '<\\/script')).digest('hex'));
    const tag = n => (html.match(new RegExp('<meta name="' + n + '" content="([^"]*)"')) || [])[1];
    t.check('hub tags', tag('hub:session') === '1' && tag('hub:session-players') === '1-4' && tag('hub:session-mode') === 'shared-world');
    const goal = tag('hub:session-goal').replace(/&amp;/g, '&'), howto = tag('hub:session-howto').replace(/&amp;/g, '&');
    t.check('goal <= 60 chars', goal.length <= 60, goal.length); t.check('howto <= 80 chars', howto.length <= 80, howto.length);
    t.check('engine before game', html.indexOf('const E = My3D2dge') > html.indexOf('My3D2dge = ') || html.indexOf('"use strict";\nconst E = My3D2dge') > 0);
    t.check('no fetch / network URLs in the game', !/fetch\(|new WebSocket|RTCPeerConnection/.test(readFileSync(t.at('build/game.js'), 'utf8')));
    const ex = JSON.parse(readFileSync(new URL('../exit-interview.json', t.root), 'utf8'));
    const si = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
    t.check('exit interview: every source field', si.every(k => typeof ex.sourceInformation[k] === 'string' && ex.sourceInformation[k].length > 0));
    t.check('exit interview: feedback counts', ex.testingFeedback.length === 4 && ex.engineFeedback.length === 6 && ex.promptFeedback.length === 4);
    const hub = ex.aiHub; t.check('exit interview: aiHub', hub && hub.name && hub.tagline && hub.description && ['Game', 'Tech demo', 'Tool'].includes(hub.type) && hub.genre === 'Shooter' && hub.players && hub.controls && hub.tags.length >= 3 && hub.tags.length <= 6 && hub.tags.every(x => x === x.toLowerCase()));
    const src = readdirSync(t.at('src')).map(f => readFileSync(t.at('src/' + f), 'utf8')).join('\n');
    t.check('no TODO / FIXME / placeholder / stub in the source', !/\b(TODO|FIXME|placeholder|lorem|stub)\b/i.test(src));
  },
  math3d(t) {
    const { TC } = t.load(), V3 = TC.V3;
    const cam = { x: 10, y: 20, z: 24, yaw: .7, pitch: -.1, fov: 55 }, B = TC.camBasis(cam, 400, 240, {});
    const p = [200, 140, 30], s = TC.project(B, ...p), a = TC.worldToAim(cam, p), r = TC.aimRay(cam, a[0], a[1]), d = V3.norm(V3.sub(p, r.o));
    t.check('aim -> ray -> aim round trip', V3.dot(d, r.d) > .99999, V3.dot(d, r.d));
    t.check('project lands where aim says', Math.abs(s[0] - (200 + a[0] * 120)) < .01 && Math.abs(s[1] - (120 - a[1] * 120)) < .01);
    const east = TC.camBasis({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, 2, 2, {});
    t.check('yaw 0 looks east, right is +y', east.fx === 1 && Math.abs(east.ry - 1) < 1e-9);
    t.check('ray vs sphere', Math.abs(TC.raySphere([0, 0, 0], [1, 0, 0], [10, 0, 0], 2) - 8) < 1e-9);
    t.check('ray vs capsule', Math.abs(TC.rayCapsule([0, 0, 5], [1, 0, 0], [10, 0, 0], [10, 0, 10], 1) - 9) < 1e-6);
    t.check('ray vs box', Math.abs(TC.rayBox([0, 0, 1], [1, 0, 0], [5, -1, 0, 6, 1, 2]) - 5) < 1e-9);
    t.check('ray misses box', TC.rayBox([0, 5, 1], [1, 0, 0], [5, -1, 0, 6, 1, 2]) < 0);
    t.check('oriented box', TC.rayCollider([0, 0, 1], [1, 0, 0], { box: [-10, -1, 0, 10, 1, 2], yaw: Math.PI / 2, cx: 20, cy: 0 }) < 0 && TC.rayCollider([20, -50, 1], [0, 1, 0], { box: [10, -1, 0, 30, 1, 2], yaw: Math.PI / 2, cx: 20, cy: 0 }) > 0);
  },
  raster(t) {
    const { TC } = t.load(), R = new TC.Rail3D();
    R.size(32, 24); R.begin({ x: 0, y: 0, z: 10, yaw: 0, pitch: 0, fov: 55 }, { ambient: .5, fog: ['#000000', 1e4, 2e4] }, 0);
    const near = new TC.Builder({ local: true }); near.quad('crate', [40, -4, 6], [40, -4, 14], [40, 4, 14], [40, 4, 6]);
    const far = new TC.Builder({ local: true }); far.quad('brick', [200, -400, -300], [200, -400, 300], [200, 400, 300], [200, 400, -300]);
    R.drawMesh(far.mesh(), TC.mat34(0, 0, 0, 0), {}); const farZ = R.dep[12 * 32 + 16];
    R.drawMesh(near.mesh(), TC.mat34(0, 0, 0, 0), {}); const nearZ = R.dep[12 * 32 + 16];
    t.check('the far wall fills the screen', R.dep.every(v => v > 0));
    t.check('a nearer quad wins the depth test', nearZ > farZ, nearZ + ' vs ' + farZ);
    // near-plane clipping: a triangle through the camera gives no NaN
    const B = new TC.Builder({ local: true }); B.tri('crate', [-50, -20, 0], [80, -20, 0], [80, 20, 20], [0, 0], [1, 0], [1, 1]);
    R.begin({ x: 0, y: 0, z: 10, yaw: 0, pitch: 0, fov: 55 }, { ambient: .5 }, 0); R.drawMesh(B.mesh(), TC.mat34(0, 0, 0, 0), {});
    t.check('near clipping: no NaN depth', R.dep.every(v => !isNaN(v)));
    t.check('a texture bank tile has 5 bands', TC.texOf('planks').bands.length === 5 && TC.texOf('planks').bands[4].length === 64 * 64);
    const T = TC.texOf('planks'); t.check('bands get brighter', (T.bands[0][100] & 255) <= (T.bands[4][100] & 255));
  },
  determinism(t) {
    const { TC } = t.load();
    const run = () => { const s = t.sim(TC, { stage: 1, scene: '1-1', seed: 99 }), bot = new TC.Autopilot('fair'); t.step(s, 30, sim => [bot.command(sim, 0, 1 / 120)]); return s.hash() + ':' + s.players[0].score; };
    const { TC: TC2 } = t.load(); const run2 = () => { const s = new TC2.Sim({ mode: 'stage', stage: 1, scene: '1-1', seed: 99, skipIntro: true }), bot = new TC2.Autopilot('fair'); for (let i = 0; i < 3600; i++) s.step(1 / 120, [bot.command(s, 0, 1 / 120)]); return s.hash() + ':' + s.players[0].score; };
    const a = run(), b = run2();
    t.check('same seed and commands, same hash (two contexts)', a === b, a + ' vs ' + b);
    for (const f of readdirSync(t.at('src')).filter(f => /^(1[0-9]|2[0-9]|3[0-9]|60|62)-/.test(f))) t.check('no Math.random in ' + f, !/Math\.random/.test(readFileSync(t.at('src/' + f), 'utf8')));
    const hud = readFileSync(t.at('src/50-hud.js'), 'utf8') + readFileSync(t.at('src/51-screens.js'), 'utf8');
    t.check('no hardcoded key names in prompts', !/'(PRESS|HOLD) (SPACE|ENTER|R|X|Z|SHIFT|LEFT CLICK|RIGHT CLICK)\b/.test(hud));
  },
  audio(t) {
    const { TC } = t.load(), notes = /^([A-G](#|b)?[0-9]|-|\.|[kshoct])$/;
    for (const s of Object.values(TC.REG.song)) {
      const bad = s.tracks.flatMap(tr => tr.notes.replace(/\|/g, ' ').trim().split(/\s+/).filter(x => !notes.test(x)));
      t.check('song ' + s.id + ' tokens', bad.length === 0, bad.slice(0, 3).join(','));
      t.check('song ' + s.id + ' has tracks', s.tracks.length > 0);
    }
    const src = readdirSync(t.at('src')).map(f => readFileSync(t.at('src/' + f), 'utf8')).join('\n');
    const used = new Set([...src.matchAll(/Audio3\.play\('([a-z_0-9]+)'/g)].map(m => m[1]).filter(n => !n.endsWith('_')));
    for (const u of used) t.check('sfx ' + u + ' exists', !!TC.SFX[u]);
    for (const st of Object.values(TC.REG.stage)) t.check('stage ' + st.id + ' song', !!TC.REG.song[st.music]);
    t.check('voice syllables', TC.Voice.syllables('Hostiles on the pier!').length >= 5);
    t.check('voice headless returns a duration', TC.Voice.say('Hello there, agent.', 'kai') > .2);
  }
};
