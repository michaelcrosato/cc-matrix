/* scenes/session.js: a session, every activity, every time: Card → the instructor shows it → Breathe in 3-2-1 → play →
 * stars, minutes, a comment → Again or Done. Each registry entry becomes its own pausable scene here. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
G.registerActivities();

/** record one finished run: best stars, best pct, minutes. Returns what it earned */
G.recordRun = (def, tierIdx, pct, stars, minutes) => {
  const s = G.S, id = def.id; s.best[id] = s.best[id] || []; s.bestPct[id] = s.bestPct[id] || [];
  s.best[id][tierIdx] = Math.max(s.best[id][tierIdx] || 0, stars); s.bestPct[id][tierIdx] = Math.max(s.bestPct[id][tierIdx] || 0, pct);
  s.runs++;
  return G.earnMinutes(minutes, stars, id);
};
let leaveTo = null;
function makeScene(def) {
  let d = null, ctx = null, phase = 'card', t = 0, pills = null, results = null, tierIdx = 0, countdown = 0, comment = null, runs = 0, unlocks = [], said = false;
  const scene = {
    view: def.view, camera: { zoom: false }, pausable: true,
    enter(data) {
      d = data || {}; tierIdx = d.tier || 0; runs = 0; said = false;
      G.dbg.activity = def.id; G.dbg.tier = tierIdx; G.dbg.pct = null; G.dbg.stars = null;
      G.talk.close(); G.setDayLight(G.dayPhase());
      if (def.music) G.music(def.music); else G.music(null);
      begin(d.skipCard || d.again ? 'demo' : 'card');
      G.current = { def, restart() { d.restarting = true; G.go(sceneName(def), Object.assign({}, d, { tier: tierIdx, skipCard: true, restarting: false }), { fade: 0 }); }, quitTo: d.from };
    },
    exit() { if (phase === 'play' && !d.restarting && d.from !== 'dev' && !G.inSession) G.pendingLine = G.line('tare.quit'); d.restarting = false; if (ctx && ctx.def.stop) ctx.def.stop(ctx); game.input.zones = null; G.activeReader = null; G.talk.close(); },
    update(dt) {
      t += dt;
      if (G.talk.update(dt)) return;
      if (phase === 'card') { G.previewRun(ctx, dt); pills.update(dt); return; }
      if (phase === 'demo') {
        G.previewRun(ctx, dt);
        if (t > 3 || game.input.pressed('confirm')) { game.input.consumeAll(); go('breathe'); }
        return;
      }
      if (phase === 'breathe') {
        G.previewRun(ctx, dt);
        const k = Math.ceil(3 - t); if (k !== countdown && k > 0) { countdown = k; G.A.sfx('click'); }
        if (t >= 3) { G.A.sfx('clickUp'); G.say1('member', 'hup'); go('play'); }
        return;
      }
      if (phase === 'play') { G.stepRun(ctx, dt); if (ctx.done) finish(); return; }
      if (phase === 'results') { G.previewRun(ctx, dt); results.update(dt); }
    },
    draw(r) {
      G.drawRun(r, ctx);
      r.overlay(g => {
        const W = game.W, H = game.H;
        if (phase === 'card') { G.drawCard(g, def, tierIdx); pills.draw(g); G.prompts(g, [['confirm', 'Pick'], ['cancel', 'Back']]); }
        if (phase === 'demo') { const nm = G.DATA.lines[G.S.instructor || 'birch'].name; G.prompts(g, [['confirm', 'Skip']]); }
        if (phase === 'breathe') {
          const k = Math.max(1, Math.ceil(3 - t)), f = t % 1;
          G.panel(g, W / 2 - 70, H * .24, 140, 54, { r: 10 });
          txt(g, 'Breathe in', W / 2, H * .24 + 6, '#14a8c8', { align: 'center' });
          txt(g, k, W / 2, H * .24 + 19, '#20404c', { align: 'center', scale: f < .2 ? 4 : 3 });
        }
        if (phase === 'results') results.draw(g);
      });
      G.talk.draw(r);
    }
  };
  function fresh() {
    const guided = !!d.guided && runs === 0;
    ctx = G.makeRun(def.id, { tier: tierIdx, mode: 'solo', seed: 1000 + (G.S.runs * 13) + tierIdx, guided, cheat: false });
  }
  function begin(p) { fresh(); go(p); }
  function go(p) {
    phase = p; t = 0; countdown = 0; ctx.showHud = p === 'demo' || p === 'breathe';
    if (p === 'card') {
      const items = [{ label: 'Begin', id: 'begin' }];
      if (def.tiers.length > 1 && !d.guided) { const open = G.tier2Open(def.id); items.push({ label: def.tiers[tierIdx === 0 ? 1 : 0].name, id: 'tier', disabled: !open && tierIdx === 0, sub: !open && tierIdx === 0 ? '2 stars, or Day 4' : undefined }); }
      if (!d.guided) items.push({ label: 'Back', id: 'back' });
      pills = new G.Pills(items, { y: () => Math.min(game.H - 62, 192), w: 118, layout: 'h', h: items.some(i => i.sub) ? 26 : 20, onPick: (i, it) => {
        if (it.id === 'begin') go('demo');
        else if (it.id === 'tier') { tierIdx = tierIdx === 0 ? 1 : 0; G.dbg.tier = tierIdx; d.tier = tierIdx; begin('card'); }
        else leave(true);
      }, onBack: () => { if (!d.guided) leave(true); } });
    }
    if (p === 'demo') {
      const who = G.S.instructor || 'birch';
      G.mutter(who, def.demoLine || G.line(who + '.demo'), { auto: 2.8 });
      if (G.gentle() && !G.S.seen.gentle) { G.S.seen.gentle = 1; game.after(2.9, () => { if (phase === 'demo' || phase === 'breathe') G.mutter('tare', G.DATA.lines.tare.gentle, { face: 'smug', auto: 3 }); }); }
    }
    if (p === 'breathe') { G.talk.close(); G.mutter(G.S.instructor || 'birch', G.DATA.lines[G.S.instructor || 'birch'].breathe, { auto: 2.6 }); }
    if (p === 'play') { game.input.consumeAll(); if (def.begin) def.begin(ctx); G.talk.close(); }
  }
  function finish() {
    const c = ctx.local, pct = c.pct, stars = c.stars; runs++;
    G.dbg.pct = +pct.toFixed(3); G.dbg.stars = stars;
    const earned = G.recordRun(def, tierIdx, pct, stars, Math.max(.25, ctx.time / 60));
    G.lastRun = { id: def.id, tier: tierIdx, pct, stars };
    G.Save.save();
    const inStory = !G.S.freePlay && d.from !== 'dev';
    pills = new G.Pills([{ label: 'Again', id: 'again' }, { label: 'Done', id: 'done' }], { y: () => game.H - 40, x: () => game.W / 2 - 40, w: 90, layout: 'h', i: 1, onPick: (i, it) => { if (it.id === 'again') { d.guided = false; begin('demo'); } else done(); }, onBack: () => done() });
    results = new G.Results(def, tierIdx, pct, stars, c.detail, earned, { pills });
    phase = 'results'; t = 0;
    let line = G.line('tare.star' + stars);
    if (stars >= 2 && G.S.day === 2 && !G.S.nod && inStory) { G.S.nod = true; line = G.DATA.lines.tare.nod; }
    game.after(.9 + stars * .35, () => { if (phase === 'results') G.mutter('tare', line, { face: stars === 0 ? 'worried' : stars === 3 ? 'shocked' : 'happy', auto: 4, y: 144 }); });
    unlocks = earned.got;
    if (unlocks.length) game.after(2.4 + stars * .35, () => { if (phase !== 'results') return; const u = unlocks[0]; G.sting('unlock'); G.mutter('tare', u.say, { face: 'happy', auto: 4, y: 144 }); if (u.wear) G.S.wear[u.id] = true; if (u.wear) G.Save.save(); });
    for (const u of unlocks) if (u.wear) G.S.wear[u.id] = true;
  }
  function leave(early) {
    if (early) G.pendingLine = G.line('tare.quit');
    G.go(d.from === 'free' ? 'freeplay' : d.from === 'dev' ? (d.back || 'island') : 'island', { spot: def.id });
  }
  function done() {
    const s = G.S;
    if (!s.freePlay && d.from !== 'dev' && d.from !== 'free') { s.session++; G.Save.save(); if (s.session >= 3) { G.go('evening'); return; } }
    leave(false);
  }
  scene.run = () => ctx; scene.phase = () => phase; scene.results = () => results;
  return scene;
}
const sceneName = G.actScene = def => 'act_' + (def.id || def);
for (const id of G.order) G.scenes[sceneName(id)] = makeScene(G.activities[id]);
/** open a session */
G.playActivity = (id, o = {}) => G.go(sceneName(id), Object.assign({ from: 'island' }, o), { fade: 'iris', seconds: .4 });
G.restartSession = () => { if (G.current) G.current.restart(); else game.resume(); };
game.hook('enter', () => { G.current = null; const cv = game.screen && game.screen.canvas; if (cv && cv.style) cv.style.cursor = ''; });
G.roomDusk = () => G.dayPhase() === 'dusk';
})();
