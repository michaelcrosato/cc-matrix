/* scenes/ending.js: the reveal, the credits, and Free Play opens. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
let t = 0, phase = 'talk', tare, rig, poser, x = 0, z = 12, roll = 0, pills = null, gert = null, gertP = null, gx = 200, hat = false;
function beats() {
  const s = G.S, L = G.DATA.lines.ending, age = G.spineAge(); s.finalAge = age; s.history.push(age);
  const extra = age <= 24 ? L.low : age <= 45 ? L.mid : L.high;
  G.say('tare', L.reveal, { face: 'sad', onDone() {
    G.say('tare', L.leave, { face: 'neutral', onDone() {
      phase = 'off'; t = 0;
      game.after(1.6, () => G.say('tare', extra, { face: age <= 24 ? 'happy' : 'neutral', onDone() { if (age <= 24) { hat = true; s.wear.hat = true; G.A.sfx('ok'); } s.ended = true; s.freePlay = true; G.Save.save(); phase = 'credits'; t = 0; roll = 0; G.music('ending'); } }));
    } });
  } });
}
const CREDITS = () => [
  ['A stay at', G.TITLE], ['Motto', G.DATA.lines.motto], ['Tare', G.DATA.lines.credits.tare], ['Birch and Alder', G.DATA.lines.credits.instructors], ['Gerald', G.DATA.lines.credits.gerald], ['Gertrude', G.DATA.lines.credits.gertrude],
  ['Dennis', G.DATA.lines.credits.dennis], ['Marisol', G.DATA.lines.credits.marisol], ['Young Kevin', G.DATA.lines.credits.kevin], ['Mr. Okafor', G.DATA.lines.credits.okafor], ['Lou', G.DATA.lines.credits.lou], ['The Twins', G.DATA.lines.credits.twins],
  ['Engine', 'my-3D2dge ' + E.version], ['Motion', 'Mesh2Motion and Quaternius (CC0), CMU Graphics Lab Motion Capture Database'], ['Sound', G.DATA.lines.credits.sound], ['Thank you', G.DATA.lines.credits.thanks]
];
G.scenes.ending = {
  view: 'brawler', camera: { zoom: false }, pausable: true,
  enter() {
    t = 0; phase = 'talk'; x = 0; z = 12; roll = 0; hat = false; G.dbg.activity = 'ending'; G.talk.close(); G.setDayLight('dusk'); G.music('raft');
    tare = new G.TareBody(0, 4); tare.scale = 2.2; tare.say('sad', 60); rig = G.playerRig({ size: 2 }); poser = new G.Poser(rig); poser.clip('Idle_Subtle', { loop: true, tgt: 1.4 });
    pills = new G.Pills([{ label: 'Free Play', id: 'free' }, { label: 'Title', id: 'title' }], { layout: 'h', y: () => game.H - 36, w: 110, h: 22, onPick(i, it) { if (it.id === 'free') G.go('freeplay'); else G.go('title'); } });
    game.after(.6, beats);
  },
  update(dt) {
    t += dt; G.stageCam(30, 8); tare.update(dt); poser.update(dt);
    if (phase === 'off') { const k = clamp(t / .9, 0, 1); x = 66 * k; z = 12 * (1 - k) + Math.sin(k * Math.PI) * 18; if (k >= 1 && !poser.waved) { poser.waved = true; poser.clip('Wave_Hello', { tgt: 1.6, loop: true }); } tare.say('sad', 3); }
    rig.update(dt, { x, y: 4, z, vx: 0, vy: 0, facing: poser.facing, expr: 'smile' });
    if (G.talk.update(dt)) return;
    if (phase === 'credits') { roll += dt * 16; const end = CREDITS().length * 34 + game.H; if (roll > end || game.input.pressed('confirm') && t > 1) { game.input.consumeAll(); phase = 'done'; t = 0; G.mutter('tare', G.DATA.lines.ending.free, { auto: 6 }); } }
    if (phase === 'done') pills.update(dt);
  },
  draw(r) {
    G.ROOMS.studio(r, { dusk: true }); G.drawMat(r, 0, 4, 46, 12, '#bfeee0'); G.L.add(0, 0, 30, 130, .5, { color: '#ffb860' });
    tare.draw(r, { scale: 2.2 }); G.drawRig(r, rig, x, 4, z, { noShadow: true });
    r.overlay(g => {
      const W = game.W, H = game.H;
      if (phase === 'credits' || phase === 'done') {
        px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, W, H, '#6a7a94'));
        const list = CREDITS(); if (phase === 'credits') list.forEach(([a, b], k) => { const y = H + k * 34 - roll; if (y < -20 || y > H + 10) return; txt(g, a, W / 2, y, '#7fe6f8', { align: 'center', shadow: '#20404c' }); G.wrapText(g, b, W / 2, y + 11, W - 60, '#ffffff', { align: 'center', shadow: '#20404c' }); });
        if (phase === 'credits') G.prompts(g, [['confirm', 'Skip']]);
        if (phase === 'done') { G.title(g, G.TITLE, W / 2, H * .26, 3); txt(g, 'Final Spine Age: ' + (G.S.finalAge || G.spineAge()), W / 2, H * .26 + 32, '#ffffff', { align: 'center', shadow: '#20404c' }); pills.draw(g); G.prompts(g, [['confirm', 'Pick']]); }
      }
    });
    G.talk.draw(r);
  }
};

G.endingPhase = () => phase;
/* ---- Free Play: every activity, no limit. Two short screens, never a grid ---- */
let fp = null, fpStage = 'disc', fpTare = null;
function discMenu() {
  fpStage = 'disc';
  fp = new G.Pills([...G.DISCIPLINES.map(d => ({ label: d, id: d, sub: Math.round(G.disciplineScore(d)) + ' of 100' })), { label: 'Walk the island', id: 'island' }, { label: 'Title', id: 'title' }], { x: () => game.W * .66, y: () => 16, w: 170, h: 26, gap: 5, onPick(i, it) { if (it.id === 'island') G.go('island'); else if (it.id === 'title') G.go('title'); else actMenu(it.id); }, onBack() { G.go('title'); } });
}
function actMenu(d) {
  fpStage = d; const ids = G.order.filter(id => G.activities[id].discipline === d);
  fp = new G.Pills([...ids.map(id => ({ label: G.activities[id].short || G.activities[id].name, id, sub: '★'.repeat(G.bestStars(id)) || 'Not yet' })), { label: 'Back', id: 'back' }], { x: () => game.W * .66, y: () => 30, w: 170, h: 28, gap: 6, onPick(i, it) { if (it.id === 'back') discMenu(); else G.playActivity(it.id, { from: 'free' }); }, onBack() { discMenu(); } });
}
G.scenes.freeplay = {
  view: 'brawler', camera: { zoom: false }, pausable: false,
  enter() { G.dbg.activity = null; G.L.enabled = false; G.music('studio'); G.S.freePlay = true; fpTare = new G.TareBody(-96, 6); fpTare.scale = 2; discMenu(); G.talk.close(); if (G.pendingLine) { G.mutter('tare', G.pendingLine); G.pendingLine = null; } },
  update(dt) { G.stageCam(30, 8); fpTare.update(dt); if (Math.floor(game.real / 1.6) !== Math.floor((game.real - dt) / 1.6)) fpTare.hop(30); fp.update(dt); },
  draw(r) {
    G.ROOMS.studio(r); G.drawMat(r, -96, 6, 40, 10, '#bfeee0'); fpTare.draw(r, { scale: 2 });
    r.overlay(g => { const W = game.W; G.panel(g, 12, 12, W * .36, 100, { r: 8 }); txt(g, 'Free Play', 12 + W * .18, 18, '#14a8c8', { align: 'center', scale: 2 }); txt(g, 'Spine Age', 12 + W * .18, 44, '#5f7f8a', { align: 'center' }); txt(g, G.spineAge(), 12 + W * .18, 56, '#ff7a59', { align: 'center', scale: 3 }); txt(g, Math.floor(G.S.minutes) + ' minutes', 12 + W * .18, 90, '#20404c', { align: 'center' }); fp.draw(g); G.prompts(g, [['confirm', 'Pick'], ['cancel', 'Back']]); });
  }
};
})();
