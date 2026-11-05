/* DEV MODE (section 6.30): from the pause menu, ` or F1 in any scene, or ?dev=1; never in AI Hub sessions. A drawer on
 * the right with four tabs: TUNE (every EF.T slider, its default, reset one or all, kept until reset), CHEATS, WARP
 * (every deep link, triggers, the animation gallery and the sound test) and INFO. The match plays on behind it with the
 * humans' footballers given to the CPU; FREEZE stops it. */
const DEV = EF.Dev = {
  isOpen: false, tab: 0, focus: 0, scroll: 0, frozenOn: false, step: false, confirmReset: false, show: { hit: false, ai: false, path: false, bones: false }, t: 0,
  TABS: ['TUNE', 'CHEATS', 'WARP', 'INFO'],
  open(fromPause) { if (EF.inSession) return; if (fromPause && game.paused) game.resume(); this.isOpen = true; this.focus = 0; this.scroll = 0; game.input.consumeAll(); EF.sfx('confirm'); },
  close() { this.isOpen = false; this.confirmReset = false; game.input.consumeAll(); EF.sfx('cancel'); },
  takesInput() { return this.isOpen; },
  frozen() { if (this.step) { this.step = false; return false; } return this.frozenOn; },
  m() { return EF.cur && EF.cur.m; },
  rows() {
    const m = this.m(), T = this.tab, R = [];
    if (T === 0) {
      R.push({ kind: 'button', label: 'RESET ALL TO DEFAULTS', run: () => { EF.tuneReset(); EF.toast('TUNING RESET', { sound: 'confirm' }); } });
      let grp = null;
      for (const row of EF.TUNE) { if (row[5] !== grp) { grp = row[5]; R.push({ kind: 'head', label: grp.toUpperCase() }); } R.push({ kind: 'slider', key: row[0], label: row[0], min: row[2], max: row[3], step: row[4], def: row[1], help: row[6] }); }
    } else if (T === 1) {
      const ch = (label, key) => R.push({ kind: 'toggle', label, get: () => !!(m && m.cheats[key]), set: v => { if (m) m.cheats[key] = v; } });
      R.push({ kind: 'toggle', label: 'FREEZE THE MATCH', get: () => this.frozenOn, set: v => { this.frozenOn = v; } });
      R.push({ kind: 'button', label: 'STEP ONE FRAME (FROZEN)', run: () => { this.step = true; } });
      ch('INFINITE STAMINA: HOME', 'stamina0'); ch('INFINITE STAMINA: AWAY', 'stamina1'); ch('EUPHORIA ALWAYS FULL: HOME', 'euphoria0'); ch('EUPHORIA ALWAYS FULL: AWAY', 'euphoria1');
      ch('INVINCIBLE KEEPER: HOME', 'keeper0'); ch('INVINCIBLE KEEPER: AWAY', 'keeper1'); ch('WATCH MODE (CPU PLAYS ALL)', 'watch'); ch('FREEZE THE CLOCK', 'freezeClock');
      R.push({ kind: 'toggle', label: 'PURE FOOTBALL (NO OTT)', get: () => !!(m && m.pure), set: v => { if (m) { m.pure = v; m.eventOn = !v; if (v) { m.europhoria = null; m.euphoria = [0, 0]; } } } });
      R.push({ kind: 'button', label: 'A GOAL FOR HOME', run: () => m && this.goal(0) }); R.push({ kind: 'button', label: 'A GOAL FOR AWAY', run: () => m && this.goal(1) });
      R.push({ kind: 'button', label: "CLOCK TO 44'", run: () => { if (m) { m.half = 1; m.clock = m.halfLen * 43.5 / 45; } } }); R.push({ kind: 'button', label: "CLOCK TO 89'", run: () => { if (m) { if (m.half === 1) { m.half = 2; } m.clock = m.halfLen * 43.5 / 45; } } });
      R.push({ kind: 'toggle', label: 'SLOW MOTION 0.25X', get: () => EF.T.gameSpeed === .25, set: v => EF.tuneSet('gameSpeed', v ? .25 : 1) });
      R.push({ kind: 'toggle', label: 'SHOW HITBOXES', get: () => this.show.hit, set: v => { this.show.hit = v; } }); R.push({ kind: 'toggle', label: 'SHOW THE AI', get: () => this.show.ai, set: v => { this.show.ai = v; } });
      R.push({ kind: 'toggle', label: 'SHOW BALL PATH + AIR WINDOW', get: () => this.show.path, set: v => { this.show.path = v; } }); R.push({ kind: 'toggle', label: 'SHOW SKELETONS', get: () => this.show.bones, set: v => { this.show.bones = v; } });
      R.push({ kind: 'toggle', label: 'MUTE THE CROWD', get: () => !!EF.mutedCrowd, set: v => { EF.mutedCrowd = v; } });
    } else if (T === 2) {
      const go = (label, fn) => R.push({ kind: 'button', label, run: () => { this.close(); fn(); } });
      R.push({ kind: 'head', label: 'SCENES' });
      for (const l of ['title', 'attract', 'setup', 'match', 'cup', 'ending', 'album', 'about', 'training']) go('#' + l, () => EF.go('#' + l));
      R.push({ kind: 'head', label: 'MATCH PARTS' });
      for (const s of EF.CUP_STADIUMS) go('#match/' + s, () => EF.go('#match/' + s));
      for (const p of ['corner', 'freekick', 'penalty', 'shootout', 'super', 'duel', 'halftime', 'extratime', 'results']) go('#match/' + p, () => EF.go('#match/' + p));
      R.push({ kind: 'head', label: 'CUP ROUNDS' });
      for (let i = 1; i <= 5; i++) go('#cup/r' + i + ' (PRE-MATCH)', () => EF.go('#cup/r' + i));
      R.push({ kind: 'head', label: 'TRIGGER NOW (IN A MATCH)' });
      const trig = (label, fn) => R.push({ kind: 'button', label, run: () => { const mm = this.m(); if (!mm) return EF.toast('START A MATCH FIRST', { sound: 'cancel' }); this.close(); fn(mm); } });
      trig('A CORNER', mm => mm.restart('corner', 0, { gx: mm.goalX(0), y: P.Y0 }));
      trig('A FREE KICK', mm => mm.restart('freekick', 0, { x: mm.goalX(0) - mm.dir(0) * 190, y: P.CY + 30 }));
      trig('A PENALTY', mm => mm.restart('penalty', 0, {}));
      trig('A SUPER STRIKE', mm => EF.parts.super(mm)); trig('A SAVE DUEL', mm => EF.parts.duel(mm));
      trig('A FOUL: YELLOW', mm => { const a = mm.outfield(1)[0], v = mm.outfield(0)[0]; mm.foul(a, v, 1.6, { sev: 1.2, kind: 'slide' }); });
      trig('A FOUL: RED', mm => { const a = mm.outfield(1)[0], v = mm.outfield(0)[0]; mm.foul(a, v, 3, { sev: 2, kind: 'slide' }); });
      trig('A DIVE', mm => { const f = mm.outfield(1)[1]; mm.setOwner(f, 'dev'); f.theatrics(); });
      trig('VAR', mm => mm.startVar({ kind: 'penalty', foul: { sev: .6, x: mm.goalX(0) - mm.dir(0) * 40, y: P.CY }, side: 0 }));
      trig('A REPLAY OF THE LAST GOAL', mm => { if (mm.lastGoal) { mm.setMode('replay'); } else EF.toast('NO GOAL YET', { sound: 'cancel' }); });
      for (const ev of EF.all('event')) trig('EVENT: ' + ev.name, mm => { if (ev.id === 'fireworks') EF.cur.view.fireworks(5); else mm.startEvent(ev.id); });
      for (const c of EF.all('celebration')) trig('CELEBRATION: ' + c.name, mm => { const f = mm.outfield(0)[0]; mm.setMode('celebrate'); mm.startCelebration(f); mm.celebration.pick = c; mm.celebration.human = null; mm.celebration.playT = 0; f.clip = c.clip ? { name: c.clip, t: 0, w: 1, speed: c.speed || 1 } : null; f.proc = c.proc || null; mm.lastGoal = mm.lastGoal || { side: 0, t: mm.t }; });
      R.push({ kind: 'head', label: 'GALLERIES' });
      go('ANIMATION GALLERY', () => game.go('devanim', { move: 'pass' })); go('SOUND TEST', () => game.go('soundtest', {}));
      R.push({ kind: 'head', label: 'SAVE' });
      R.push({ kind: 'button', label: 'UNLOCK EVERYTHING', run: () => { if (!this.confirmReset) { this.confirmReset = 'unlock'; EF.toast('PRESS AGAIN TO CONFIRM', { sound: 'cancel' }); return; } this.confirmReset = false; const d = EF.Save.data(); for (const s of EF.all('sticker')) d.stickers[s.id] = s.shiny ? 'shiny' : true; d.unlocks.balls = Object.keys(EF.BALLS); for (const id of EF.DRILLS) d.drills[id] = true; if (!d.cup) EF.Cup.start(); d.cup.prologue = true; EF.Save.write(); EF.toast('EVERYTHING UNLOCKED', { sound: 'confirm' }); } });
      R.push({ kind: 'button', label: 'RESET THE SAVE', run: () => { if (this.confirmReset !== 'reset') { this.confirmReset = 'reset'; EF.toast('PRESS AGAIN TO CONFIRM', { sound: 'cancel' }); return; } this.confirmReset = false; EF.Save.reset(); EF.toast('SAVE RESET', { sound: 'confirm' }); } });
    } else {
      const snap = game.debug.snapshot(), add = (k, v) => R.push({ kind: 'info', label: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) });
      add('VERSION', 'EUROPHORIA ' + EF.version + ' / ' + E.versionLabel().replace(/·/g, '-')); add('SCENE', snap.scene); if (m) { add('SEED', m.seed); add('MODE', m.mode + ' (HALF ' + m.half + ', ' + m.clockText + ')'); add('BODIES', m.players.length + 1 + ' + BALL'); add('FANS', EF.cur.view.crowd.fans.length); add('STADIUM', m.stadium.id); }
      add('PARTICLES', game.particles.list ? game.particles.list.length : '-'); add('LIGHTS', game.lights.list ? game.lights.list.length : '-'); add('FRAME', game.stats ? JSON.stringify(game.stats).slice(0, 60) : '-'); add('HUB', EF.inSession ? 'SESSION' : 'NONE');
      for (const k of Object.keys(snap)) if (!['scene'].includes(k)) add(k.toUpperCase(), snap[k]);
    }
    return R;
  },
  goal(s) { const m = this.m(); if (!m || (m.mode !== 'play' && m.mode !== 'setpiece' && m.mode !== 'kickoff')) return; m.lastKick = m.outfield(s)[0]; m.lastTouch = m.lastKick; m.goalScored(s); },
  update(dt) {
    this.t += dt;
    const I = game.input;
    if (!EF.inSession && (I.pressed('dev'))) { if (this.isOpen) this.close(); else this.open(); return; }
    if (!this.isOpen) return;
    const R = this.rows(), sel = () => R[this.focus];
    const skip = d => { let i = this.focus; for (let k = 0; k < R.length; k++) { i = (i + d + R.length) % R.length; if (R[i].kind !== 'head') { this.focus = i; return; } } };
    if (R[this.focus] && R[this.focus].kind === 'head') skip(1);
    if (I.pressed('switch') || I.pressed('skill')) { this.tab = (this.tab + (I.pressed('switch') ? 3 : 1)) % 4; this.focus = 0; this.scroll = 0; EF.sfx('select'); return; }
    if (I.repeat('up', .3, .06)) skip(-1); if (I.repeat('down', .3, .06)) skip(1);
    const r = sel(); if (!r) return;
    const held = Math.max(I.heldTime ? I.heldTime('left') : 0, I.heldTime ? I.heldTime('right') : 0);
    if (r.kind === 'slider' && (I.repeat('left', .25, .04) || I.repeat('right', .25, .04))) { const d = I.down('left') ? -1 : 1, acc = held > 1.2 ? 5 : 1; EF.tuneSet(r.key, EF.T[r.key] + d * r.step * acc); }
    if (r.kind === 'slider' && I.pressed('shoot')) { EF.tuneReset(r.key); EF.sfx('select'); }
    if (I.pressed('confirm') || I.pressed('pass')) { if (r.kind === 'button') r.run(); else if (r.kind === 'toggle') r.set(!r.get()); }
    if (I.pressed('cancel')) this.close();
    // the mouse: hover moves the focus, a click toggles or runs, a drag sets a slider
    const p = I.pointer && I.pointer(), c = I.clicked && I.clicked(), L = this.layout;
    if (L && p && p[0] >= L.x) { const i = Math.floor((p[1] - L.y0) / L.rh) + this.scroll; if (i >= 0 && i < R.length && R[i].kind !== 'head') this.focus = i; }
    if (L && c && c[0] >= L.x) {
      if (c[1] < L.y0) { const t = Math.floor((c[0] - L.x) / (L.w / 4)); this.tab = clamp(t, 0, 3); this.focus = 0; this.scroll = 0; }
      else { const i = Math.floor((c[1] - L.y0) / L.rh) + this.scroll, rr = R[i]; if (rr) { this.focus = i; if (rr.kind === 'button') rr.run(); else if (rr.kind === 'toggle') rr.set(!rr.get()); else if (rr.kind === 'slider') { const u = clamp((c[0] - L.sx) / L.sw, 0, 1); EF.tuneSet(rr.key, rr.min + u * (rr.max - rr.min)); } } }
    }
    const vis = L ? L.n : 12; if (this.focus < this.scroll) this.scroll = this.focus; if (this.focus >= this.scroll + vis) this.scroll = this.focus - vis + 1;
  },
  draw(r) {
    this.world(r);
    if (!this.isOpen) return;
    const R = this.rows();
    r.overlay(g => {
      const w = Math.max(170, Math.round(r.W * .42)), x = r.W - w, rh = 11, y0 = 22, n = Math.floor((r.H - y0 - 14) / rh);
      this.layout = { x, w, y0, rh, n, sx: x + Math.round(w * .5), sw: Math.round(w * .3) };
      px.blend(g, .9, 'normal', () => px.rect(g, x, 0, w, r.H, '#0a0e20')); px.rect(g, x, 0, 1, r.H, '#ffc83a');
      this.TABS.forEach((t, i) => { const tx = x + i * w / 4; px.rect(g, tx + 1, 2, w / 4 - 2, 14, i === this.tab ? '#ffc83a' : '#1c2448'); E.font.text(g, t, tx + w / 8, 5, i === this.tab ? '#0a0e20' : '#c8d0e8', { align: 'center', font: 'tiny', outline: false }); });
      for (let k = 0; k < n; k++) {
        const i = k + this.scroll, row = R[i]; if (!row) break; const y = y0 + k * rh, foc = i === this.focus;
        if (foc) px.rect(g, x + 2, y - 1, w - 4, rh, '#24305c');
        if (row.kind === 'head') { E.font.text(g, row.label, x + 6, y + 1, '#ffc83a', { font: 'tiny', outline: false }); continue; }
        E.font.text(g, row.label.length > 26 ? row.label.slice(0, 26) : row.label, x + 6, y + 1, foc ? '#ffffff' : '#c8d0e8', { font: row.kind === 'info' || row.kind === 'slider' ? 'tiny' : 'tiny', outline: false });
        if (row.kind === 'slider') { const v = EF.T[row.key], u = (v - row.min) / (row.max - row.min), sx = this.layout.sx, sw = this.layout.sw; px.rect(g, sx, y + 3, sw, 3, '#1a1a2a'); px.rect(g, sx, y + 3, Math.round(sw * u), 3, EF.tuneChanged(row.key) ? '#ff9a3a' : '#7a86c8'); px.rect(g, sx + Math.round(sw * row.def - sw * row.min) / (row.max - row.min) * 0, y + 2, 1, 5, '#ffffff'); E.font.text(g, String(+v.toFixed(3)) + (EF.tuneChanged(row.key) ? ' *' : ''), x + w - 4, y + 1, '#ffe08a', { align: 'right', font: 'tiny', outline: false }); const dx = sx + Math.round((row.def - row.min) / (row.max - row.min) * sw); px.rect(g, dx, y + 1, 1, 7, '#5aff7a'); }
        else if (row.kind === 'toggle') E.font.text(g, row.get() ? 'ON' : 'OFF', x + w - 6, y + 1, row.get() ? '#5aff7a' : '#7a7a8a', { align: 'right', font: 'tiny', outline: false });
        else if (row.kind === 'info') E.font.text(g, row.value.slice(0, 48), x + Math.round(w * .34), y + 1, '#ffe08a', { font: 'tiny', outline: false });
      }
      const foc = R[this.focus], help = foc && foc.help ? foc.help : foc && foc.kind === 'slider' ? '' : '';
      px.rect(g, x, r.H - 12, w, 12, '#141a34'); E.font.text(g, help || 'L1/R1 TABS   ↑↓ ROW   ←→ CHANGE   ✕ RUN   □ RESET   ○ CLOSE'.replace(/✕/g, 'X').replace(/□/g, 'SQ').replace(/○/g, 'O'), x + 4, r.H - 9, '#9aa6c8', { font: 'tiny', outline: false });
    });
  },
  /** the debug views over a match: hitboxes, the AI's spots and decisions, the ball's path, skeletons */
  world(r) {
    const c = EF.cur; if (!c || !(this.show.hit || this.show.ai || this.show.path || this.show.bones)) return;
    const m = c.m;
    if (this.show.hit) for (const f of m.players) { if (f.ghost) continue; r.decal(() => r.groundRing(f.body.x, f.body.y, f.body.r, f.side ? '#ff5a5a' : '#5aa0ff', 1)); if (f.state === 'slide') { const B = f.body; r.queue(B.x, B.y, 2, g => { const a = r.w(B.x, B.y, 2), b = r.w(B.x + Math.cos(f.facing) * 12, B.y + Math.sin(f.facing) * 12, 2); px.line(g, a[0], a[1], b[0], b[1], '#ff3a3a', 2); }, { emissive: true }); } }
    if (this.show.ai) for (const s of [0, 1]) for (const f of m.outfield(s)) { const sp = m.brains[s].spot(f); r.decal(() => r.groundRing(sp[0], sp[1], 4, s ? '#ffa0a0' : '#a0c0ff', .8)); r.textAt(f.body.x, f.body.y, 46, f.slot + (m.brains[s].pressers.includes(f) ? ' P' : ''), '#ffffff'); }
    if (this.show.ai && m.owner) { const mem = m.brains[m.owner.side].memOf(m.owner); if (mem.plan) r.textAt(m.owner.body.x, m.owner.body.y, 56, mem.plan.kind.toUpperCase(), '#ffe040'); }
    if (this.show.path && !m.owner) { const b = m.ball; r.queue(b.x, b.y, 0, g => { let prev = null; for (let t = 0; t <= 1; t += .05) { const p = b.predict(t), q = r.w(p.x, p.y, p.z); if (prev) px.line(g, prev[0], prev[1], q[0], q[1], p.z >= 4 && p.z <= 40 ? '#5aff7a' : '#ffffff'); prev = q; } }, { emissive: true }); }
    if (this.show.bones) for (const f of m.players) { const rig = c.view.rigOf(f); if (rig && !f.ghost) rig.debug(r); }
  }
};
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'F1') e.preventDefault(); }, { capture: true });
const _uiUpdate = EF.UI.update.bind(EF.UI);
EF.UI.update = function (dt) { if (DEV.isOpen) return true; return _uiUpdate(dt); };

/* ---- deep links (section 4.4): #scene/part, used by tests, the checker and the WARP tab ---- */
EF.parts = {
  /** nobody of the other side within 70 of the striker: the dev trigger shows its moment every time */
  clear(m, f) { for (const o of m.side[1 - f.side]) { if (o.role === 'GK') continue; const d = H.d(o.body, f.body); if (d < 70) { const a = d > 1 ? H.ang(f.body, o.body) : Math.PI / 2; o.body.x = clamp(f.body.x + Math.cos(a) * 80, P.X0 + 10, P.X1 - 10); o.body.y = clamp(f.body.y + Math.sin(a) * 80, P.Y0 + 10, P.Y1 - 10); o.body.vx = o.body.vy = 0; o.stun = .8; } } },
  super(m) { m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; } const cap = m.side[0].find(f => f.data.captain); cap.body.x = m.goalX(0) - m.dir(0) * 200; cap.body.y = P.CY; cap.facing = m.dir(0) > 0 ? 0 : Math.PI; this.clear(m, cap); m.setOwner(cap, 'dev'); const h = m.humans.find(q => q.side === 0); if (h) m.giveTo(h, cap); m.euphoria[0] = 100; m.triggerEuphoria(0, cap); },
  duel(m) { m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; } const cap = m.side[1].find(f => f.data.captain); cap.body.x = m.goalX(1) - m.dir(1) * 190; cap.body.y = P.CY; cap.facing = m.dir(1) > 0 ? 0 : Math.PI; this.clear(m, cap); m.setOwner(cap, 'dev'); m.euphoria[1] = 100; m.triggerEuphoria(1, cap); m.script = f => f === cap && m.owner === f ? Object.assign(EF.Intent.make(), { shoot: { down: true, pressed: false, released: false }, power: .97 }) : null; }
};
EF.deepLink = L => {
  const s = L.scene, p = L.part;
  const mo = o => ({ opts: Object.assign(EF.defaultMatchOpts(), { humans: [{ input: game.input, side: 0 }] }, o) });
  if (s === 'match') {
    if (p && EF.get('stadium', p)) { const st = EF.get('stadium', p), opp = { smokehouse: 'hoofington', pasapasa: 'pasapasa', stahlpresse: 'stahlpresse', lucchetto: 'lucchetto', euphorium: 'opulence' }[p] || 'hoofington'; return ['match', mo({ stadium: p, away: opp })]; }
    if (p === 'shootout') return ['match', mo({ shootoutOnly: true, kind: 'penalties', stadium: 'euphorium', away: 'opulence' })];
    if (p) { EF.pendingPart = p; return ['match', mo({})]; }
    return ['match', mo({})];
  }
  if (s === 'cup') { if (p) { const i = p === 'final' ? 4 : Math.max(0, +p.replace('r', '') - 1); if (!EF.Save.data().cup) EF.Cup.start(); return ['cup', { round: i, beat: 'r' + (i + 1) + '-pre' }]; } return ['cup', {}]; }
  if (s === 'training') return p && EF.get('drill', p) ? (EF.pendingDrill = p, ['training', {}]) : ['training', {}];
  if (s === 'dev' && p === 'anim') return ['devanim', { move: L.extra || 'pass' }];
  if (s === 'dev' && p === 'sound') return ['soundtest', {}];
  if (s === 'setup') return ['setup', { mode: p === 'penalties' ? 'penalties' : 'kickabout' }];
  if (EF.scenes[s]) return [s, {}];
  return null;
};
EF.go = hash => { const [scene, part, extra] = hash.replace(/^#/, '').split('/'); const r = EF.deepLink({ scene, part, extra }); if (r) game.go(r[0], r[1]); };
/* a match part from a deep link, once the match exists */
const _mEnter2 = EF.scenes.match.enter;
EF.scenes.match.enter = function (d) {
  _mEnter2.call(this, d);
  const p = EF.pendingPart, m = EF.cur && EF.cur.m; EF.pendingPart = null; if (!p || !m) return;
  if (p === 'corner') m.startSetpiece('corner', 0, { gx: m.goalX(0), y: P.Y0 });
  else if (p === 'freekick') m.startSetpiece('freekick', 0, { x: m.goalX(0) - m.dir(0) * 190, y: P.CY + 30 });
  else if (p === 'penalty') m.startSetpiece('penalty', 0, {});
  else if (p === 'super') EF.parts.super(m);
  else if (p === 'duel') EF.parts.duel(m);
  else if (p === 'halftime') { m.clock = m.halfLen * 1.2; m.stoppageShown = true; m.stoppage = 1; m.ball.x = P.CX; m.endHalf(); }
  else if (p === 'extratime') { m.half = 2; m.draws = 'golden'; m.score = [1, 1]; m.endHalf(); }
  else if (p === 'results') { m.score = [2, 1]; m.goals = [{ side: 0, name: 'DAZ PILCHARD', minute: 12 }, { side: 1, name: 'NORMAN NEEDHAM', minute: 40 }, { side: 0, name: 'TOMMY TRAN', minute: 77 }]; m.half = 2; m.fullTime(); }
};
const _tEnter = EF.scenes.training.enter;
EF.scenes.training.enter = function (d) { _tEnter.call(this, d); if (EF.pendingDrill) { const id = EF.pendingDrill; EF.pendingDrill = null; game.after(.05, () => EF.startDrill(id, null)); } };

/* ---- the animation gallery: every move on a loop, on a chosen rig, in every view, at 1x, 0.25x or frame by frame ---- */
const GALLERY = ['pass', 'shot', 'shotHard', 'chip', 'volley', 'header', 'bicycle', 'divingHeader', 'slide', 'poke', 'barge', 'launched', 'getup', 'keeperLow', 'keeperHigh', 'catch', 'parry', 'tip', 'throw', 'theatrics', 'stepover', 'spin', 'rainbow', 'tired', 'refCard', 'refAdvantage', 'refVar', 'refWhistle'].concat(EF.all('celebration').map(c => 'cel:' + c.id));
EF.scenes.devanim = Object.assign(EF.sceneBase(), {
  views: ['broadcast', 'threequarter', 'topdown', 'side', 'iso'],
  enter(d) {
    this.i = Math.max(0, GALLERY.indexOf(d.move)); this.t = 0; this.speed = 1; this.rigI = 0; this.vi = 0;
    this.m = new EF.Match({ home: 'kipperton', away: 'opulence', stadium: 'rec', kind: 'title', seed: 1, halfLength: 999, humans: [], events: false });
    for (const f of this.m.players) f.ghost = true; this.m.ref.body.x = -999;
    this.view = new EF.MatchView(this.m); EF.Stage.enter(); game.setZoom(2.2); game.cam.smooth = 0; EF.music(null);
  },
  exit() { this.view.dispose(); game.setView('broadcast'); },
  update(dt) {
    const I = game.input;
    if (I.pressed('cancel')) return game.go('title', { menu: true });
    if (I.pressed('right')) { this.i = (this.i + 1) % GALLERY.length; this.t = 0; } if (I.pressed('left')) { this.i = (this.i + GALLERY.length - 1) % GALLERY.length; this.t = 0; }
    if (I.pressed('up')) this.rigI = (this.rigI + 1) % 4; if (I.pressed('down')) { this.vi = (this.vi + 1) % this.views.length; game.setView(this.views[this.vi]); }
    if (I.pressed('confirm')) this.speed = this.speed === 1 ? .25 : this.speed === .25 ? 0 : 1;
    if (this.speed === 0 && I.pressed('pass')) this.t += 1 / 30;
    this.t += dt * this.speed;
    const name = GALLERY[this.i], dur = 1.6, u = (this.t % dur) / dur, f = this.m.side[this.rigI === 3 ? 1 : 0][[4, 0, 2, 4][this.rigI]], rig = this.view.rigOf(f);
    f.ghost = true; this.shown = { f, rig };
    const st = EF.galleryState(name, u, this.t), S = Object.assign({ x: P.CX, y: P.CY, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }, st);
    if (st.clip) EF.Anim.sample(rig, { clip: st.clip }); else rig.mocap = null;
    rig.update(dt * Math.max(this.speed, .001), S); if (st.proc) EF.Anim.post(rig, st.proc, this.t);
    this.ball = st.ball || null;
    game.focus(P.CX, P.CY, 12);
  },
  draw(r) {
    r.sky(['#2a3a5a', '#4a6a8a', '#8aa0b0']); this.m.pitch.map.drawFloor(r); this.m.pitch.map.queueWalls(r);
    const s = this.shown; if (s) { r.shadow(P.CX, P.CY, 6, .4); r.actor(P.CX, P.CY, s.rig.z || 0, (g, ox, oy) => s.rig.draw(g, ox, oy, r.view)); if (this.ball) r.sprite(P.CX + this.ball[0], P.CY + this.ball[1], this.ball[2], EF.BALLS.classic.frames[0], { anchor: 'center' }); }
    r.overlay(g => { E.ui.box(g, 6, 6, 220, 30, { bg: '#0d1430', border: '#ffc83a' }); E.font.text(g, 'ANIMATION: ' + GALLERY[this.i].toUpperCase(), 12, 11, '#ffc83a', { outline: false }); E.font.text(g, (this.i + 1) + '/' + GALLERY.length + '  VIEW ' + this.views[this.vi].toUpperCase() + '  SPEED ' + (this.speed || 'STEP'), 12, 22, '#c8d0e8', { font: 'tiny', outline: false }); EF.prompts(g, r.W / 2, r.H - 16, [['left', 'MOVE'], ['up', 'RIG'], ['down', 'VIEW'], ['confirm', 'SPEED'], ['cancel', 'BACK']], { input: game.input }); });
  }
});
/** a gallery move's rig state at u (0..1 of its loop) */
EF.galleryState = (name, u, t) => {
  const kick = n => ({ attack: EF.kickState(n, u * (EF.KICKS[n].total + .3)) });
  if (EF.KICKS[name]) return Object.assign(kick(name), { ball: [6, 0, name === 'header' ? 26 : 2] });
  switch (name) {
    case 'divingHeader': return { tilt: { axis: 'right', angle: Math.min(1, u * 2) * 1.3, pivot: 'hips', lift: 6 * Math.sin(Math.min(1, u * 1.5) * Math.PI) } };
    case 'bicycleKick': return {};
    case 'slide': return { clip: { name: 'Slide_Loop', t: u * 2, w: 1 } };
    case 'barge': return { attack: { spec: { a0: 0, a1: 0, z0: 9, z1: 9, reach: 6, lunge: 4, blade: 0 }, phase: u < .3 ? 'wind' : u < .6 ? 'active' : 'recover', u: u < .3 ? u / .3 : u < .6 ? (u - .3) / .3 : (u - .6) / .4 } };
    case 'launched': return { tilt: { axis: 'forward', angle: u * TAU * 1.5, pivot: 'hips', lift: Math.sin(u * Math.PI) * 18 } };
    case 'getup': return { clip: { name: 'Get_Up_From_Side', t: u * 2, w: 1 } };
    case 'keeperLow': return { pose: 'cheer', tilt: { axis: 'forward', angle: 1.55 * Math.min(1, u * 2.2), pivot: 'feet', lift: 2 * Math.sin(u * Math.PI) } };
    case 'keeperHigh': return { pose: 'cheer', tilt: { axis: 'forward', angle: 1.35 * Math.min(1, u * 2.2), pivot: 'feet', lift: 14 * Math.sin(Math.min(1, u * 1.2) * Math.PI) } };
    case 'catch': return { pose: u < .5 ? 'cast' : 'guard', crouch: 1 };
    case 'parry': return { attack: EF.kickState('throwIn', u * .6) ? { spec: { a0: .2, a1: -.4, z0: 20, z1: 24, reach: 8, blade: 0 }, phase: u < .3 ? 'wind' : 'active', u: u < .3 ? u / .3 : Math.min(1, (u - .3) / .3) } : null };
    case 'tip': return { pose: 'cheer', z: Math.sin(u * Math.PI) * 10 };
    case 'throw': return { clip: { name: 'OverhandThrow', t: u * 1.3, w: 1, mask: 'upper' } };
    case 'theatrics': return u < .4 ? { tilt: { axis: 'right', angle: u / .4 * 1.4, pivot: 'hips', lift: 8 * Math.sin(u / .4 * Math.PI) } } : { tilt: { axis: 'forward', angle: (u - .4) / .6 * TAU * 2, pivot: 'hips' }, expr: 'wince' };
    case 'spin': return { facing: Math.PI / 2 - u * TAU };
    case 'tired': return { pose: 'kneel', expr: 'wince' };
    case 'refCard': return { pose: 'cheer', expr: 'angry' };
    case 'refAdvantage': return { pose: 'cast' };
    case 'refVar': return { point: true, aim: Math.sin(u * TAU) * .6 };
    case 'refWhistle': return { point: true, expr: 'shout' };
  }
  if (name.startsWith('cel:')) { const c = EF.get('celebration', name.slice(4)); return { clip: c.clip ? { name: c.clip, t: t * (c.speed || 1), w: 1 } : null, proc: c.proc || null, pose: c.clip ? null : 'cheer', expr: 'shout' }; }
  return {};
};
/* ---- the sound test: every effect, song, chant and voice ---- */
EF.scenes.soundtest = front({ music: null, enter() {
  const list = [].concat(Object.keys(SFX).map(k => ['SFX', k, () => EF.sfx(k)]), Object.keys(EF.SONGS).map(k => ['SONG', k, () => EF.music(k)]), EF.all('chant').map(c => ['CHANT', c.id, () => { EF.crowdAudio.start(800); EF.crowdAudio.chant(c.id); }]), Object.keys(EF.CAST).concat(['kipperton:pilchard', 'opulence:dor']).map(id => ['VOICE', id, () => { const v = EF.babble.voiceFor(id), line = 'Hello! This is ' + EF.Cast.name(id) + ', how are you today?'; for (let i = 0; i < line.length; i++) game.after(i * .03, () => v(line[i], i, line)); }]), [['CROWD', 'ooh', () => { EF.crowdAudio.start(800); EF.crowdAudio.react('ooh'); }], ['CROWD', 'roar', () => { EF.crowdAudio.start(800); EF.crowdAudio.react('roar'); }], ['CROWD', 'boo', () => { EF.crowdAudio.start(800); EF.crowdAudio.react('boo'); }], ['CROWD', 'whistles', () => EF.crowdAudio.react('whistles')], ['CROWD', 'clap', () => EF.crowdAudio.react('clap')], ['MUSIC', 'stop', () => EF.music(null)]]);
  EF.UI.set([{ id: 'sounds', widgets: list.map(([k, n, fn], i) => ({ id: k + n, kind: 'button', title: k + ': ' + n, align: 'left', scale: 1, onPick: fn })), page: 0,
    layout(r) { const per = Math.floor((r.H - 60) / 13), f = this.focus, p0 = Math.floor(f / per) * per; this.widgets.forEach((w, i) => { const k = i - p0; w.noFocus = false; if (k < 0 || k >= per) { w.x = -999; w.y = -999; w.w = 0; w.h = 0; } else { w.x = r.W / 2 - 110; w.y = 40 + k * 13; w.w = 220; w.h = 12; } }); },
    draw: (g, r) => EF.UI.panel(g, r, 'SOUND TEST', 'EVERY SOUND IS MADE IN CODE'), footer: () => [['confirm', 'PLAY'], ['cancel', 'BACK']], onBack: () => { EF.music(null); EF.crowdAudio.stop(); game.go('title', { menu: true }); } }]);
} });
