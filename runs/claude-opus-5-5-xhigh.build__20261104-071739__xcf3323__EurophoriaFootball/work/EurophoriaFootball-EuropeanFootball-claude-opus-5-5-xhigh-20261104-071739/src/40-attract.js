/* THE ATTRACT MODE (section 6.29): after 10 s without input on the title or a menu, a looping AI showcase that cheats
 * freely: MATCHDAY LIVE (Europhoria, a super strike, the Save Duel, a goal, a celebration, the replay), SET-PIECE
 * SPECIAL (a corner and a bicycle kick), THE DARK ARTS (a dive, a penalty, VAR, a booking), SHOOTOUT (with a Panenka),
 * WEATHER REPORT (rain, snow, fog and flares, fireworks), TITLE CARD. Any input goes back to the title. */
EF.Attract = {
  idle: 0, segment: null, poked: false, lastPtr: null, loops: 0,
  reset() { this.idle = 0; this.poked = false; },
  /** any input at all: a key, the mouse, a click, the wheel, a touch, a pad's button or stick */
  input() {
    if (this.poked) { this.poked = false; return true; }
    for (const I of game.players) { if (I.anyPressed && I.anyPressed()) return true; const mv = I.move ? I.move() : [0, 0]; if (Math.hypot(mv[0], mv[1]) > .3) return true; for (const a of ['confirm', 'cancel', 'start', 'pass', 'shoot', 'up', 'down', 'left', 'right']) if (I.down(a)) return true; }
    const I = game.input, p = I.pointer && I.pointer(); if (p && this.lastPtr && Math.abs(p[0] - this.lastPtr[0]) + Math.abs(p[1] - this.lastPtr[1]) > 4) { this.lastPtr = p.slice(); return true; } this.lastPtr = p ? p.slice() : null;
    if (I.clicked && I.clicked()) return true;
    try { for (const pad of navigator.getGamepads ? navigator.getGamepads() : []) if (pad && (pad.buttons.some(b => b.pressed) || pad.axes.some(a => Math.abs(a) > .3))) return true; } catch (e) { /* none */ }
    return false;
  },
  /** on the title and menus: count the idle time, start the attract mode at 10 s */
  watch(dt, on) {
    if (EF.inSession || !on || game.paused || (EF.Dev && EF.Dev.isOpen)) { this.idle = 0; return; }
    if (this.input()) { this.idle = 0; return; }
    this.idle += dt;
    if (this.idle >= 10) { this.idle = 0; game.go('attract', {}); }
  }
};
if (typeof addEventListener === 'function') for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, () => { EF.Attract.poked = true; }, { capture: true, passive: true });
const SEGMENTS = [
  { id: 'live', title: 'MATCHDAY LIVE', dur: 30 }, { id: 'setpiece', title: 'SET-PIECE SPECIAL', dur: 15 }, { id: 'dark', title: 'THE DARK ARTS', dur: 15 },
  { id: 'shootout', title: 'SHOOTOUT', dur: 15 }, { id: 'weather', title: 'WEATHER REPORT', dur: 10 }, { id: 'card', title: 'EUROPHORIA FOOTBALL', dur: 5 }
];
EF.scenes.attract = Object.assign(EF.sceneBase(), {
  enter() { this.seg = -1; this.t = 0; EF.Attract.loops = (EF.Attract.loops || 0); this.next(); game.input.consumeAll(); EF.Attract.poked = false; EF.Attract.lastPtr = null; },
  exit() { if (EF.cur) EF.scenes.match.exit(); EF.Attract.segment = null; },
  /** start a match for a segment, cheating */
  match(o, sub) {
    if (EF.cur) EF.scenes.match.exit();
    const opts = Object.assign({ kind: 'attract', seed: 1000 + this.seg * 7 + EF.Attract.loops, halfLength: 120, humans: [], cheats: { stamina0: true, stamina1: true }, draws: 'allowed' }, o);
    EF.scenes.match.enter({ opts, attract: true, label: sub, onEnd: () => {} });
    EF.cur.m.o.noReplay = false; game.setView('broadcast');
    return EF.cur.m;
  },
  next() {
    this.seg = (this.seg + 1) % SEGMENTS.length; if (this.seg === 0) EF.Attract.loops++;
    const S = SEGMENTS[this.seg]; this.t = 0; this.st = {}; EF.Attract.segment = S.id;
    const stads = EF.CUP_STADIUMS, L = EF.Attract.loops;
    if (S.id === 'live') { const sd = stads[L % 5], opp = ['hoofington', 'pasapasa', 'stahlpresse', 'lucchetto', 'opulence'][L % 5]; const m = this.match({ home: 'kipperton', away: opp, stadium: sd }); m.attractDuel = true; m.attractSave = 0; }
    else if (S.id === 'setpiece') { const m = this.match({ home: 'kipperton', away: 'stahlpresse', stadium: 'stahlpresse' }); m.cheats.nokeeper1 = true; }
    else if (S.id === 'dark') { const m = this.match({ home: 'lucchetto', away: 'kipperton', stadium: 'lucchetto', referee: 'severo' }); m.cheats.nokeeper1 = true; m.forceVar = 'stand'; }
    else if (S.id === 'shootout') { const m = this.match({ home: 'kipperton', away: 'opulence', stadium: 'euphorium', shootoutOnly: true }); m.forcePanenka = true; }
    else if (S.id === 'weather') { this.weatherCut(0); }
    else { if (EF.cur) EF.scenes.match.exit(); EF.Stage.enter(); EF.music('anthem'); }
  },
  weatherCut(i) {
    this.st.cut = i; this.st.cutT = 0;
    const C = [{ stadium: 'smokehouse', time: 'night' }, { stadium: 'stahlpresse' }, { stadium: 'lucchetto', time: 'night' }, { stadium: 'euphorium' }][i];
    const m = this.match(Object.assign({ home: 'kipperton', away: ['hoofington', 'stahlpresse', 'lucchetto', 'opulence'][i] }, C), ['RAIN AT THE SMOKEHOUSE', 'SNOW AND THE ORANGE BALL', 'FOG AND FLARES', 'FIREWORKS IN THE EUPHORIUM'][i]);
    m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; }
    if (i === 2) { m.fog = .6; m.fogTarget = .6; m.euphoria[0] = 100; m.triggerEuphoria(0); m.startEvent('flaresmoke'); }
    if (i === 3) EF.cur.view.fireworks(6);
    m.setOwner(m.side[0][4], 'attract');
  },
  update(dt) {
    if (EF.Attract.input() || (EF.touchOnly() && game.input.clicked && game.input.clicked())) { game.input.consumeAll(); EF.Attract.idle = 0; game.timeScale = 1; game.go('title', { menu: !EF.touchOnly(), focus: 0, press: EF.touchOnly() }); return; }
    const S = SEGMENTS[this.seg]; this.t += dt;
    if (S.id === 'card') { EF.Stage.update(dt); if (this.t > S.dur) this.next(); return; }
    const c = EF.cur; if (!c) return;
    EF.scenes.match.update(dt);
    const m = c.m, st = this.st;
    if (S.id === 'live') {
      if (!st.given && this.t > .8 && m.mode === 'kickoff') { m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; } }
      if (!st.given && this.t > 1.2) { st.given = true; const cap = m.side[0].find(f => f.data.captain); cap.body.x = m.goalX(0) - m.dir(0) * 230; cap.body.y = P.CY + 20; cap.facing = m.dir(0) > 0 ? 0 : Math.PI; m.setOwner(cap, 'attract'); m.euphoria[0] = 100; st.cap = cap; }
      if (st.given && !st.eu && this.t > 2) { st.eu = m.triggerEuphoria(0, st.cap); }
      if (st.eu && !st.shot && this.t > 2.8 && m.owner === st.cap) { st.shot = true; m.script = (f) => { if (f === st.cap && m.owner === f && !m.superUsed) { const it = EF.Intent.make(); it.shoot.down = true; it.power = .97; return it; } return null; }; }
    } else if (S.id === 'setpiece') {
      if (!st.corner && this.t > 1) { st.corner = true; m.setpiece = null; m.startSetpiece('corner', 0, { gx: m.goalX(0), y: P.Y0 }); }
      const b = m.ball;
      if (st.corner && !st.bike && b.pass && b.pass.kind === 'cross' && b.vz < 0 && b.z < 50) {
        const land = b.pass.land || [b.x, b.y], f = m.outfield(0).filter(q => q !== m.lastKick).sort((p, q) => H.d2(p.body.x, p.body.y, land[0], land[1]) - H.d2(q.body.x, q.body.y, land[0], land[1]))[0];
        const w = f && f.airWindow(); if (w) { st.bike = true; f.facing = Math.atan2(P.CY - f.body.y, m.goalX(0) - f.body.x) + Math.PI; const it = EF.Intent.make(); f.airMove(w, 'finish', it); f.air.kind = 'bicycle'; m.slow(.35, .6); m.emit('air', { who: f, kind: 'bicycle' }); }
      }
    } else if (S.id === 'dark') {
      if (!st.dive && this.t > 1) {
        st.dive = true; m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; }
        const fallo = m.side[0].find(f => f.data.id === 'fallo'), d = m.outfield(1)[0], gx = m.goalX(0);
        fallo.body.x = gx - m.dir(0) * 70; fallo.body.y = P.CY - 20; fallo.facing = m.dir(0) > 0 ? 0 : Math.PI; d.body.x = fallo.body.x - m.dir(0) * 6; d.body.y = fallo.body.y + 3;
        m.setOwner(fallo, 'attract'); m.ref.data = Object.assign({}, m.ref.data, { gullibility: 1, varHappy: 1 }); st.fallo = fallo; st.def = d; st.diveAt = this.t + .6;
      }
      if (st.diveAt && this.t > st.diveAt && st.fallo.state === 'run') { st.diveAt = null; st.fallo.contactT = m.t; st.fallo.contactBy = st.def; st.fallo.theatrics(); }
      if (!st.sim && this.t > 11) { st.sim = true; m.setpiece = null; m.setMode('play'); m.pendingCards = []; for (const f of m.players) { f.order = null; f.frozen = false; f.setState('run'); } const x = m.side[0][3]; x.body.x = P.CX; x.body.y = P.CY + 100; for (const o of m.side[1]) if (H.d(o.body, x.body) < 40) o.body.x += 80; m.setOwner(x, 'attract'); game.after(.5, () => { if (EF.cur && EF.cur.m === m) x.theatrics(); }); }
    } else if (S.id === 'weather') {
      st.cutT += dt; if (st.cutT > 2.5 && st.cut < 3) this.weatherCut(st.cut + 1);
    }
    if (this.t > S.dur) this.next();
  },
  draw(r) {
    const S = SEGMENTS[this.seg];
    if (S.id === 'card') {
      EF.Stage.draw(r, { dim: .3 });
      r.overlay(g => { E.font.title(g, 'EUROPHORIA', r.W / 2, Math.round(r.H * .2), { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffc83a', '#e0662a'], depth: 3 }); E.font.title(g, 'FOOTBALL', r.W / 2, Math.round(r.H * .2) + 40, { align: 'center', scale: 3, colors: ['#ffffff', '#c8d8ff', '#6a8aff'], depth: 2 }); if (Math.floor(game.real * 2) % 2) EF.prompts(g, r.W / 2, Math.round(r.H * .62), [['start', 'PRESS START']], { input: game.input, scale: 2 }); const rec = EF.Save.data().records; E.font.text(g, rec.fastestCup ? 'FASTEST CUP: ' + H.mmss(rec.fastestCup) : 'FASTEST CUP: NOT YET WON', r.W / 2, Math.round(r.H * .74), '#ffe08a', { align: 'center', outline: '#000' }); E.font.text(g, rec.biggestWin ? 'BIGGEST WIN: ' + rec.biggestWin.score.join('-') + ' V ' + EF.get('team', rec.biggestWin.opp).short : 'BIGGEST WIN: -', r.W / 2, Math.round(r.H * .74) + 11, '#ffe08a', { align: 'center', outline: '#000' }); });
    } else if (EF.cur) EF.scenes.match.draw(r);
    r.overlay(g => {
      const y = r.H - Math.max(5, Math.round(r.H * .035)) - 14, w = Math.min(r.W - 20, 260);
      E.ui.box(g, Math.round(r.W / 2 - w / 2), y - 4, w, 18, { bg: '#0a0c18', border: '#ffc83a', alpha: .85 });
      if (Math.floor(game.real * 1.5) % 2) E.font.text(g, EF.touchOnly() ? 'DEMO  -  TAP FOR THE TITLE' : 'DEMO  -  PRESS ANY BUTTON', r.W / 2, y + 1, '#ffffff', { align: 'center', outline: false });
      if (S.id !== 'card') E.font.title(g, S.title, r.W / 2, Math.round(r.H * .14), { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'], depth: 1 });
      if (S.id === 'weather' && EF.cur && EF.cur.label) E.font.text(g, EF.cur.label, r.W / 2, Math.round(r.H * .14) + 20, '#c8d0e8', { align: 'center', outline: '#000' });
    });
  }
});
/* the attract match: a scripted Save Duel with nobody pressing (it fails), forced VAR and Panenka, a beaten keeper */
EF.attractOverlay = null;
