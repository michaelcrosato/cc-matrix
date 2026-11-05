/* =====================================================================================
 * 60 COOK-OFF — the score attack, played three ways from the same code:
 *  - on its own from the title: one player, or two on one machine (a second player presses Start or 2 and is Danny);
 *  - in an AI Hub session (protocol v1, ghost mode, 1-4 players): no title, straight into the round; each copy plays
 *    the same desert (Math.random is seeded by the hub), sends its cook's position, and shows the others as ghosts.
 * Grab precursor crates around the flats (two at a time), cook them at the RV's table, sell. DEA patrols take
 * what you carry. Highest cash when time runs out wins.
 * ===================================================================================== */
const CRATE_SPR = E.sprite(['.bbbbbb.', 'bBBBBBBb', 'bByyyyBb', 'bBBBBBBb', '.bbbbbb.'], { b: '#6a4a2a', B: '#a87848', y: '#e8c040' });
const HUBSTATE = { info: null, ended: false, reported: false, sendT: 0, progT: 0, started: false };
let co = null;
const COOK_SPOTS = [[8, 12], [12, 8], [15, 22], [30, 6], [34, 18], [28, 26], [9, 20], [38, 10], [21, 6], [24, 26], [36, 27], [5, 16], [14, 15], [31, 15]];
const cookoffScene = {
  pausable: !HUB, camera: { zoom: [.75, 2], start: 1, tall: 1.4 },
  enter(d) {
    newWorld('desert', { flasks: ['chalk'], stealth: true, attract: false });
    W.mode = 'cookoff';
    W.hero = makePlayer('GRAY', 21 * R16, 19 * R16, { hp: 3 });
    W.partner = null;
    W.crates = []; W.carry = 0; W.pcarry = 0;
    W.guards.push(makeGuard('cruiser', [[4, 4], [40, 4, .2], [40, 28, .2], [4, 28, .2]]));
    W.guards.push(makeGuard('agent', [[10, 10], [34, 10, 1], [34, 22], [10, 22, 1]]));
    const rnd = HUB && window.AIHub.rng ? window.AIHub.rng('deal') : Math.random;
    co = { t: 0, limit: HUB && HUBSTATE.info && HUBSTATE.info.limitMs ? Math.max(60, Math.min(180, HUBSTATE.info.limitMs / 1000 - 8)) : 180, score: 0, batches: 0, best: 0, busts: 0, rnd, stun: 0, over: false, countdown: HUB ? null : 3 };
    for (let i = 0; i < 6; i++) spawnCrate();
    W.rigAct = M.act({ cx: 25.5, cy: 18.4, name: 'THE COOK', verb: 'Cook', keep: true, on: (a) => { a.used = false; startQuickCook(); } });
    M.cookObj = null; M.cut = false; M.mission = null; talk.close();
    music('cook'); L.enabled = false; game.weather = W.loc.weather; game.cam.bounds = v => W.map.bounds(v);
    if (!HUB) game.allowJoin({ max: 2, onJoin: input => { W.partner = makePlayer('DANNY', W.hero.x + 12, W.hero.y, { hp: 3 }); W.partner.player = input; input.glyphs = game.settings.glyphs; W.toasts.push(['Player 2 joined', 'Danny grabs crates too. Bring them to the table.']); } });
    W.toasts.push(['Cook-Off', 'Grab precursor crates (two at a time), cook them at the table, beat the clock. DEA takes what you carry.']);
  },
  exit() { ui.hud({}); game.allowJoin(false); game.weather = null; },
  back() { return HUB; },
  update(dt) {
    if (HUBSTATE.ended) return;
    if (HUB) { const t = window.AIHub.time(); if (!(t >= 0)) { co.countdown = isFinite(t) ? Math.ceil(-t / 1000) : null; hudCookoff(); return; } co.countdown = null; }
    else if (co.countdown > 0) { co.countdown -= dt; hudCookoff(); return; }
    voiceTick(); barkTalk.update(dt);
    if (game.input.pressed('view') && !M.cookObj) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (!co.over) co.t += dt;
    if (!co.over && co.t >= co.limit) endCookoff();
    if (M.cookObj) {
      M.cookObj.update(dt);
      if (M.cookObj.done) { const R = M.cookObj.result; M.cookObj = null; const n = W.cooking || 1, cash = Math.round(n * R.lbs * (R.purity * R.purity / 100) * 60 / 10) * 10; co.score += cash; co.batches++; co.best = Math.max(co.best, R.purity); A.sfx('cash'); P.text(W.hero.x, W.hero.y, 30, '+' + fmtMoney(cash), '#7aff9a', { scale: 2 }); W.cooking = 0; music('cook'); report(); }
      W.hero.inv = 1; updateWorld(dt, false); hudCookoff(); netTick(dt); return;
    }
    if (co.stun > 0) { co.stun -= dt; updateWorld(dt, false); } else updateWorld(dt, !co.over);
    computeFocus();
    // crates: walk over to pick up, two at a time
    for (const c of W.crates) { if (c.taken) continue; for (const a of players()) { const isP2 = a === W.partner, have = isP2 ? W.pcarry : W.carry; if (have < 2 && Math.hypot(a.x - c.x, a.y - c.y) < 12) { c.taken = true; if (isP2) W.pcarry++; else W.carry++; A.sfx('pickup'); P.glints(c.x, c.y, 8, 5, '#e8c040'); break; } } }
    if (W.partner && W.pcarry && Math.hypot(W.partner.x - W.rigAct.x, W.partner.y - W.rigAct.y) < 24) { W.carry += W.pcarry; W.pcarry = 0; A.sfx('coin'); W.toasts.push(['Handed over', 'Danny dropped his crates at the table.']); }
    E.prune(W.crates, c => c.taken);
    while (W.crates.length < 6) spawnCrate();
    if (toastCool > 0) toastCool -= dt; else if (W.toasts.length) { const [t, x] = W.toasts.shift(); ui.toast(t, x, 5); toastCool = 4; }
    const h = W.hero, p2 = W.partner && !W.partner.dead ? W.partner : null;
    game.focus(p2 ? (h.x + p2.x) / 2 : h.x, p2 ? (h.y + p2.y) / 2 : h.y, 14);
    hudCookoff(); netTick(dt);
  },
  draw(r) {
    drawPlay(r);
    for (const c of W.crates) { r.decal(() => r.groundArc(c.x, c.y, 8, 11, 0, TAU, '#e8c040', .35 + .2 * Math.sin(game.time * 4))); r.shape('crate', c.x, c.y, 0, { scale: .7, facing: c.cx }); }
    r.overlay(g => {
      const left = Math.max(0, co.limit - co.t), mm = Math.floor(left / 60), ss = Math.floor(left % 60);
      E.font.text(g, mm + ':' + String(ss).padStart(2, '0'), r.W / 2, 34, left < 20 ? '#ff6a5a' : '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      E.font.text(g, fmtMoney(co.score), r.W / 2, 52, '#7aff9a', { align: 'center', shadow: '#000' });
      const carry = 'CARRYING ' + W.carry + ' / 2' + (W.partner ? '   DANNY ' + W.pcarry + ' / 2' : '');
      E.font.text(g, carry, r.W / 2, 62, '#e8c040', { align: 'center', shadow: '#000' });
      if (!HUB && !W.partner && Math.floor(game.time) % 6 < 3) E.font.text(g, 'Player 2: press Start on a second pad (or 2 on the keyboard)', r.W / 2, r.H - 12, '#b8a888', { align: 'center' });
      if (co.countdown !== null && co.countdown > 0) E.font.title(g, String(Math.ceil(co.countdown)), r.W / 2, r.H / 2 - 20, { scale: 4, align: 'center', colors: ['#ffffff', '#9ae4ff', '#59c8f0'] });
      if (co.stun > 0) E.font.title(g, 'BUSTED', r.W / 2, r.H / 2 - 30, { scale: 3, align: 'center', colors: ['#ffe0e0', '#ff7a6a', '#c8202a'] });
      if (co.over) {
        px.blend(g, .7, 'normal', () => px.rect(g, 0, r.H / 2 - 40, r.W, 84, '#000'));
        E.font.title(g, 'TIME', r.W / 2, r.H / 2 - 34, { scale: 3, align: 'center', colors: ['#ffffff', '#9ae4ff', '#59c8f0'] });
        E.font.text(g, fmtMoney(co.score) + '  •  ' + co.batches + ' batches  •  best ' + (co.best ? co.best.toFixed(1) + '%' : '-'), r.W / 2, r.H / 2 - 2, '#ffffff', { align: 'center' });
        const best = E.store.get('bb:cookoff', 0); E.font.text(g, 'Best on this machine: ' + fmtMoney(Math.max(best, co.score)), r.W / 2, r.H / 2 + 12, '#e8c040', { align: 'center' });
        if (!HUB) promptPill(g, label('confirm'), 'Title', r.W / 2, r.H / 2 + 28);
      }
    });
    if (M.cookObj) M.cookObj.draw(r);
    if (!HUB && co.over && game.input.pressed('confirm')) game.go('title');
  }
};
function spawnCrate() {
  const free = COOK_SPOTS.filter(([cx, cy]) => !W.crates.some(c => Math.abs(c.cx - cx) < .5 && Math.abs(c.cy - cy) < .5));
  const s = free[Math.floor(co.rnd() * free.length)] || COOK_SPOTS[0];
  W.crates.push({ cx: s[0], cy: s[1], x: (s[0] + .5) * R16, y: (s[1] + .5) * R16, taken: false });
}
function startQuickCook() {
  if (W.carry <= 0) { A.sfx('cancel'); W.toasts.push(['Nothing to cook', 'Bring precursor crates first.']); toastCool = 0; return; }
  W.cooking = W.carry; W.carry = 0; M.cookObj = new Cook({ fast: true, auto: false });
}
// a bust in the Cook-Off: the crates are gone and the cook sits out a moment back at the RV
const _caughtStory = caughtBy;
caughtBy = function (g) {
  if (W.mode !== 'cookoff') return _caughtStory(g);
  if (co.stun > 0 || co.over) return;
  co.busts++; co.stun = 3; W.carry = 0; W.pcarry = 0; A.sfx('siren'); game.shake(4);
  W.hero.x = 21 * R16; W.hero.y = 19 * R16; for (const gd of W.guards) gd.mind.reset();
  bark('AGENT', 'Precursors confiscated. Move along, sir.');
};
function hudCookoff() {
  if (M.cookObj || co.over) { ui.hud({}); return; }
  ui.hud({ objective: { title: W.carry ? 'Cook it' : 'Grab precursor crates', text: W.carry ? 'Bring them to the table by the RV' : 'Yellow-banded crates around the flats', at: W.carry ? { x: W.rigAct.x, y: W.rigAct.y, z: 0 } : undefined, from: W.hero },
    counts: [['Cash', fmtMoney(co.score)], ['Batches', String(co.batches)]], status: W.alarmOn ? { text: 'Spotted', color: '#ff4a3a' } : null });
}
function endCookoff() {
  co.over = true; music('win'); A.sfx('bell');
  E.store.set('bb:cookoff', Math.max(E.store.get('bb:cookoff', 0), co.score));
  report(true);
}
function report(final) {
  if (!HUB) return;
  try {
    window.AIHub.progress({ score: co.score, label: fmtMoney(co.score) });
    if (final && !HUBSTATE.reported) { HUBSTATE.reported = true; window.AIHub.result({ score: co.score, stats: { Batches: co.batches, 'Best purity': co.best ? co.best.toFixed(1) + '%' : '-', Busts: co.busts }, awards: co.best >= 96 ? [{ title: 'Blue Glass', detail: 'Cooked a batch at ' + co.best.toFixed(1) + '%' }] : [] }); }
  } catch (e) { }
}
// ghost mode: send where my cook is ~8 times a second; show the others where they are
function netTick(dt) {
  if (!HUB || HUBSTATE.ended) return;
  HUBSTATE.sendT -= dt; HUBSTATE.progT -= dt;
  if (HUBSTATE.sendT <= 0) { HUBSTATE.sendT = .125; const h = W.hero; try { window.AIHub.send({ k: 'p', x: Math.round(h.x), y: Math.round(h.y), f: Math.round(h.facing * 100) / 100, c: W.carry, s: co.score, ck: M.cookObj ? 1 : 0 }, { reliable: false }); } catch (e) { } }
  if (HUBSTATE.progT <= 0) { HUBSTATE.progT = 1; report(false); }
  for (const id in W.ghosts) { const gh = W.ghosts[id]; gh.x += (gh.tx - gh.x) * Math.min(1, dt * 10); gh.y += (gh.ty - gh.y) * Math.min(1, dt * 10); gh.rig.update(dt, { x: gh.x, y: gh.y, z: 0, vx: (gh.tx - gh.x) * 8, vy: (gh.ty - gh.y) * 8, facing: gh.f, pose: gh.ck ? 'cast' : null }); }
}
function hubGhost(data, from) {
  if (!W || W.mode !== 'cookoff' || !data || data.k !== 'p') return;
  const pl = (HUBSTATE.info && HUBSTATE.info.players || []).find(p => p.id === from) || { name: 'P' + (from + 1), color: '#ffffff' };
  let gh = W.ghosts[from];
  if (!gh) gh = W.ghosts[from] = { x: data.x, y: data.y, tx: data.x, ty: data.y, f: 0, name: String(pl.name).slice(0, 16), color: pl.color || '#ffffff', rig: makeRig('GRAY', { colors: { cloth: pl.color || '#ffffff' } }) };
  gh.tx = data.x; gh.ty = data.y; gh.f = data.f || 0; gh.ck = data.ck; gh.s = data.s;
}
