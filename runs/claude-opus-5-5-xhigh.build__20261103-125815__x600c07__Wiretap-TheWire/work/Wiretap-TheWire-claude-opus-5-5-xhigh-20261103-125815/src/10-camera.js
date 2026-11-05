/* 10-camera: Watch mode (hold L2 / right mouse), the reticle (R-stick or the mouse itself), the focus ring, reading a
   person's role, and photos scored ★Face ★Focus ★Act. A photo shows the subject from your angle: the back of a head if
   they faced away. Polaroids carry an orange date stamp. */
const ACTS = ['sale-money', 'sale-product', 'reup-handoff', 'payphone', 'stash-access', 'count-handoff', 'robbery'];
const ACT_NAMES = { 'sale-money': 'hand-to-hand (cash)', 'sale-product': 'hand-to-hand (product)', 'reup-handoff': 're-up hand-off', payphone: 'on the payphone', 'stash-access': 'at the stash', 'count-handoff': 'the count', robbery: 'a robbery' };
function placeName(x, y) {
  const c = [x / T, y / T], near = (a, b, r) => Math.hypot(c[0] - a, c[1] - b) < r;
  if (near(28.5, 26, 2.5)) return 'P1, Gaither Market'; if (near(35.5, 26, 2.5)) return 'P2, Suds City'; if (near(42, 30, 2.5)) return 'P3, the bus stop';
  if (c[0] > 25.5 && c[0] < 30 && c[1] > 34.5 && c[1] < 38) return 'the 1412 vacant'; if (c[0] > 59 && c[1] > 43) return 'Arundel Gas'; if (c[0] > 49 && c[0] < 57 && c[1] > 47 && c[1] < 55) return 'the garage';
  if (c[0] > 28 && c[0] < 35 && c[1] > 29 && c[1] < 37) return 'Gaither & Ridley'; if (c[1] > 41 && c[1] < 44) return 'the south alley'; if (c[0] > 10 && c[0] < 26 && c[1] > 44) return 'the court';
  if (c[1] > 19 && c[1] < 22) return 'the alley behind Ridley'; if (c[1] > 25 && c[1] < 31) return 'Ridley Avenue'; return 'Penn Row';
}
const LCD = h => { const d = new Date(2004, 9, 12 + STATE.ep * 3); return String(d.getMonth() + 1).padStart(2, '0') + ' ' + String(d.getDate()).padStart(2, '0') + " '04 " + clockStr(h); };
const Cam = {
  on: false, k: 0, ret: null, target: null, focus: 0, read: 0, readT: null, film: 30, range: 220, pan: 14 * T / 2, long: false, last: null, flash: 0, base: 1.2, moved: 0, prevRet: null,
  /** setup per mission: film, lens */
  reset(o = {}) { this.on = false; this.k = 0; this.film = o.film || 30; this.long = !!o.long; this.range = this.long ? 360 : 220; this.panMax = (this.long ? 14 : 7) * T; this.target = null; this.focus = 0; this.read = 0; this.ret = null; this.base = o.base || 1.2; this.readable = o.readable || null; this.onRead = o.onRead || null; this.onShot = o.onShot || null; this.tags = o.tags || []; this.offset = [0, 0]; this.forceOn = false; this.noShoot = !!o.noShoot; },
  /** each step, from the player's controller */
  tick(dt, P, ctl, clockH) {
    const want = (ctl.watching() || this.forceOn) && !P.busy && !P.inside;
    if (want && !this.on) { this.on = true; this.ret = null; this.focus = 0; Snd.play('ui_tick', { pitch: .6 }); if (tip('watch')) Tut.say('Watch', 'Hold ' + Prompts.label('watch') + ' to raise the camera. Aim at a person. ' + Prompts.label('photo') + ' takes the picture. Staring at a lookout gets you made.'); }
    if (!want && this.on) { this.on = false; this.target = null; this.read = 0; }
    this.k = approach(this.k, this.on ? 1 : 0, dt * 4);
    if (!HEADLESS) { try { game.setZoom(this.base * (1 + .6 * this.k)); } catch (e) { /* zoom off */ } }
    P.watching = this.on; P.aimAt = this.on && this.target ? this.target : this.on ? this.aimWorld : null;
    if (!this.on) { this.offset = [approach(this.offset[0], 0, dt * 200), approach(this.offset[1], 0, dt * 200)]; return; }
    // reticle: the mouse is the reticle; a pad's right stick moves it at 220 px/s
    const W0 = game.W, H0 = game.H; if (!this.ret) this.ret = [W0 / 2, H0 / 2 - 10];
    const ptr = ctl.pointer && ctl.pointer(), st = ctl.aimStick && ctl.aimStick();
    if (ptr && game.input.lastDevice !== 'gamepad') this.ret = [ptr[0], ptr[1]];
    else if (st) this.ret = [clamp(this.ret[0] + st[0] * 220 * dt, 8, W0 - 8), clamp(this.ret[1] + st[1] * 220 * dt, 8, H0 - 8)];
    if (ctl.botAim) this.ret = ctl.botAim();
    // keep the reticle in the middle 60%: the view pans toward it (7 tiles, 14 with the long lens)
    const ex = (this.ret[0] - W0 / 2) / (W0 * .3), ey = (this.ret[1] - H0 / 2) / (H0 * .3);
    const sp = 160 * dt; if (Math.abs(ex) > 1) this.offset[0] = clamp(this.offset[0] + Math.sign(ex) * sp, -this.panMax, this.panMax);
    if (Math.abs(ey) > 1) this.offset[1] = clamp(this.offset[1] + Math.sign(ey) * sp, -this.panMax, this.panMax);
    const pr = this.prevRet || this.ret; this.moved = Math.hypot(this.ret[0] - pr[0], this.ret[1] - pr[1]) / Math.max(dt, 1e-4); this.prevRet = this.ret.slice();
    if (this.target && this.moved < 30) this.focus = Math.min(1, this.focus + dt / .4); else if (this.moved > 60) this.focus = Math.max(0, this.focus - dt * 3);
    // reading a role
    const t = this.target;
    if (t && this.readable && this.readable(t) && dist2(P, t) <= this.range) {
      if (this.readT !== t) { this.readT = t; this.read = 0; }
      this.read = Math.min(1, this.read + dt / 3);
      if (this.read >= 1 && this.onRead) { const done = this.onRead(t); if (done !== false) { this.read = 0; this.readT = null; this.doneRead = t; } }
    } else { this.read = Math.max(0, this.read - dt); if (!t) this.readT = null; }
    if (ctl.pressed('photo')) this.shoot(P, clockH);
  },
  /** pick the subject under the reticle (drawing knows the projection) */
  pickTarget(r, P, cands) {
    if (!this.on || !this.ret) { this.target = null; return; }
    let best = null, bd = 12;
    for (const a of cands) {
      if (a === P || a.hidden) continue;
      const z = a.photoZ !== undefined ? a.photoZ : (a.z || 0) + 22, [sx, sy] = r.w(a.x, a.y, z), d = Math.hypot(sx - this.ret[0], sy - this.ret[1]);
      if (d < bd) { bd = d; best = a; }
    }
    if (best !== this.target) { this.target = best; this.focus = 0; }
    const g = game.mouseGround && game.mouseGround(); this.aimWorld = this.target || (g ? { x: g[0], y: g[1] } : null);
  },
  score(P, a) {
    const s = { face: false, focus: false, act: null, blurry: false };
    const d = dist2(P, a); if (d > this.range || P.burnedUntil > game.time) { s.blurry = true; return s; }
    const map = World.cur || World.map, see = map.sight(P, a, { eye: P.eye, target: a.chest }) || (a.photoZ !== undefined);
    const toP = Math.atan2(P.y - a.y, P.x - a.x), off = Math.abs(angDiff(a.facing, toP));
    s.turn = off; s.face = see && off <= 1.31 && !a.noFace; s.focus = this.focus >= 1;
    const act = a.act && ACTS.includes(a.act.kind) ? a.act.kind : null; s.act = see ? act : null;
    return s;
  },
  shoot(P, clockH) {
    if (this.noShoot) return null;
    if (this.film <= 0) { Snd.play('bump'); Toast('Out of film', 'Nothing left on the roll.'); return null; }
    this.film--; STATE.stats.photos++; Snd.shutter(); this.flash = .1;
    const a = this.target; if (!a) { Toast('Photo', 'Nobody in the frame.'); return null; }
    const s = this.score(P, a), stars = s.blurry ? 0 : (s.face ? 1 : 0) + (s.focus ? 1 : 0) + (s.act ? 1 : 0);
    const subj = a.person || a.photoTag || null;
    const ph = { id: 'ph' + (STATE.photos.length + 1) + '_' + STATE.ep, subject: subj, t: clockStr(clockH || 12), place: placeName(a.x, a.y), stars, face: s.face && !s.blurry, focus: s.focus, act: s.blurry ? null : s.act, turn: s.turn || 0, ep: STATE.ep, tag: a.photoTag || null, night: World.dark, role: a.role };
    STATE.photos.push(ph);
    if (this.onShot) this.onShot(ph, a);
    showPolaroid(ph);
    if (stars >= 2) Snd.sting('photoGood');
    return ph;
  },
  draw(r, P) {
    if (this.k <= .01) return;
    const k = this.k;
    r.overlay(g => {
      const bar = Math.round(r.H * .07 * k); px.rect(g, 0, 0, r.W, bar, '#000'); px.rect(g, 0, r.H - bar, r.W, bar, '#000');
      if (!this.ret) return; const [x, y] = this.ret.map(Math.round), c = this.target ? (this.focus >= 1 ? '#45d6a0' : '#ffb347') : '#f2ead8';
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.line(g, x + dx * 7, y + dy * 7, x + dx * 3, y + dy * 7, c); px.line(g, x + dx * 7, y + dy * 7, x + dx * 7, y + dy * 3, c); }
      px.dot(g, x, y, c);
      if (this.target) {
        const rr = Math.round(14 - 8 * this.focus);
        for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; if (i % 2) px.dot(g, Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr), c); }
        const t = this.target, nm = t.person && (STATE.facts.includes('face:' + t.person) || STATE.facts.includes('name:' + t.person)) ? nameOf(t.person) : t.photoTag ? t.photoLabel || t.photoTag : 'Unknown';
        const role = t.person && STATE.facts.find(f => f.startsWith('obs:' + t.person + ':'));
        E.font.text(g, nm + (role ? '  ' + role.split(':')[2].toUpperCase() : ''), x, y + 18, '#f2ead8', { align: 'center', shadow: '#000', outline: false });
        if (this.read > 0) { E.ui.bar(g, x - 16, y + 28, 32, 3, this.read, '#8fe388'); E.font.text(g, 'READING', x, y + 33, '#8fe388', { align: 'center', font: 'tiny', outline: false }); }
        const d = dist2(P, t); if (d > this.range) E.font.text(g, 'TOO FAR', x, y - 26, '#ff8a7a', { align: 'center', shadow: '#000', outline: false });
      }
      E.font.text(g, 'FILM ' + this.film + (this.long ? '  LONG LENS' : ''), r.W - 8, r.H - bar - 12, '#f2ead8', { align: 'right', shadow: '#000', outline: false });
      if (P.burnedUntil > game.time) E.font.text(g, 'MADE: WALK IT OFF', r.W / 2, bar + 6, '#ff5a4a', { align: 'center', shadow: '#000' });
      if (this.flash > 0) { this.flash -= 1 / 60; px.rect(g, 0, 0, r.W, 2, '#fff'); px.rect(g, 0, r.H - 2, r.W, 2, '#fff'); px.rect(g, 0, 0, 2, r.H, '#fff'); px.rect(g, r.W - 2, 0, 2, r.H, '#fff'); }
    });
  }
};
/** the polaroid that slides in after a shot */
function polaroidHTML(ph, big) {
  const turn = ph.turn > 2.2 ? Math.PI : ph.turn > 1.31 ? 1.4 : ph.turn * .5;
  const img = ph.subject && PEOPLE[ph.subject] ? portraitURL(ph.subject, { turn, bg: ph.night ? '#1e2230' : '#5a5650', blur: ph.stars === 0 }) : '';
  const tilt = ((hashStr(ph.id) % 7) - 3) * .8;
  const name = ph.subject && PEOPLE[ph.subject] ? (STATE.facts.includes('face:' + ph.subject) || STATE.facts.includes('name:' + ph.subject) ? nameOf(ph.subject) : 'UNKNOWN') : ph.tag ? ph.tag.toUpperCase() : 'NOBODY';
  return `<div class="polaroid" style="transform:rotate(${tilt}deg);width:${big ? '14em' : '100%'}">${img ? `<img src="${img}" alt="">` : `<div style="height:${big ? '12em' : '8em'};background:#2a2620;display:flex;align-items:center;justify-content:center;color:#8a8070">${esc(ph.tag ? ph.tag.toUpperCase() : 'no one')}</div>`}
    <span style="position:absolute;right:.6em;bottom:1.6em;font:700 .7em ui-monospace,monospace;color:#ff8a2a;text-shadow:0 0 3px #ff6a00">${esc(LCD(parseClock(ph.t)))}</span>
    <div class="cap">${esc(name)} <span class="stars">${'★'.repeat(ph.stars)}${'☆'.repeat(3 - ph.stars)}</span> ${ph.act ? 'ACT' : ph.stars === 0 ? 'BLURRY' : ''}</div></div>`;
}
function showPolaroid(ph) {
  if (HEADLESS || !UI.root) return;
  const el = document.createElement('div'); el.className = 'photo-pop'; el.innerHTML = polaroidHTML(ph); UI.root.appendChild(el);
  setTimeout(() => el.remove(), 3300);
}
