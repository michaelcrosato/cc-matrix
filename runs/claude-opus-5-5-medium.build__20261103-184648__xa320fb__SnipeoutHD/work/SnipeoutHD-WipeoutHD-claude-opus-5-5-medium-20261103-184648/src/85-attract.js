// Attract mode (§3.14): after 10 s with no input on the title or a front-end screen, a looping AI demo (cheating freely:
// infinite energy, every weapon forced in rotation, a barrel roll on every jump) shown by the TV director; any input
// (a key, a pad button or stick, a mouse move or click, a touch) returns to the title within one step
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px;
const T = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
const PLAYLIST = [
  { track: 'solenne', mode: 'race', cls: 'spark', secs: 34, forced: SN.WEAPONS.map(w => w.id), label: 'QUICK RACE • PORT SOLENNE' },
  { track: 'meridian', mode: 'snipeout', cls: 'storm', secs: 30, forced: ['rail', 'swarm', 'seeker', 'cannon', 'tremor', 'mine', 'siphon', 'bulwark', 'nitro'], label: 'SNIPEOUT • MERIDIAN STACK' },
  { track: 'karakum', mode: 'overclock', cls: 'spark', secs: 28, label: 'OVERCLOCK • KARAKUM SPIRE' },
  { track: 'borealis', mode: 'race', cls: 'flare', secs: 30, forced: ['nitro', 'auto', 'swarm', 'bulwark', 'seeker', 'rail'], label: 'RACE • BOREALIS VAULT', startAt: .2 },
  { card: true, secs: 6 }
];
const Attract = SN.Attract = {
  i: 0, sound: true, seen: { weapons: new Set(), tracks: new Set() },
  start() { this.i = 0; SN.game.go('attract', null, { fade: 'dissolve', seconds: .3 }); },
  hud(r, R) {
    r.overlay(g => {
      const Wd = r.W, H = r.H, sc = SN.scenes.attract, I = SN.game.input, seg = PLAYLIST[sc.i];
      px.rect(g, Wd / 2 - 22, 4, 44, 14, '#ff3ab4'); T(g, 'DEMO', Wd / 2, 7, '#ffffff', { align: 'center' });
      SN.drawLogo(g, 70, 4, 2, SN.game.real || 0);
      if (seg && seg.label) T(g, seg.label, Wd / 2, 22, '#bff8ff', { align: 'center', font: 'tiny' });
      if (R && R.order && R.mode !== 'overclock') R.order.slice(0, 4).forEach((sh, k) => T(g, (R.mode === 'snipeout' ? sh.points + ' ' : (k + 1) + ' ') + sh.name, 8, 34 + k * 10, k ? '#ffffff' : '#ffd23f', { font: 'tiny' }));
      if (R && R.mode === 'overclock') E.font.title(g, 'ZONE ' + R.zone, 8, 30, { scale: 3, colors: ['#ffffff', '#ff8ad8', '#ff3ab4'] });
      const cs = SN.HUD.p && SN.HUD.p[0]; if (cs) cs.callouts.forEach((c, k) => E.font.title(g, c.text, Wd / 2, H * .3 + k * 20, { scale: 2, align: 'center', colors: ['#ffffff', c.color] }));
      if (Math.floor((SN.game.real || 0) * 2) % 2) { const it = [['confirm', 'PRESS ANY BUTTON']], w = SN.glyph.rowWidth(I, it); SN.glyph.row(g, I, it, (Wd - w) / 2, H - 20); }
    });
  }
};
SN.scenes.attract = {
  input: SN.INPUT,
  enter() { this.i = 0; this.begin(); SN.Audio && SN.Audio.music('zero'); },
  exit() { SN.game.timeScale = 1; },
  begin() {
    const seg = PLAYLIST[this.i]; this.t = 0; this.race = null;
    if (seg.card) return;
    const view = this.vw = SN.loadView(seg.track, seg.mode === 'overclock' ? 'overclock' : 'normal');
    const entrants = seg.mode === 'overclock' ? [{ pilot: 'kaizero', team: 'nullset', control: 'ai' }] : SN.field([]);
    const R = this.race = new SN.Race({ track: seg.track, mode: seg.mode, cls: seg.cls, laps: 3, seed: 77 + this.i * 13, entrants, intro: false, attract: true, target: 99 });
    R.state = 'racing'; R.t = 0; R.weapons.forced = seg.forced || null;
    if (seg.startAt) for (const sh of R.ships) { const s = SN.wrap(seg.startAt * R.track.L + sh.i * 40 * (sh.i % 2 ? 1 : -1), R.track.L); SN.Ship.place(sh, R, s, ((sh.i % 3) - 1) * 80, sh.st.top * .6); sh.p = s; sh._lastS = s; }
    if (seg.mode === 'race') for (const sh of R.ships) sh.weapon = null;
    view.bind(R); const c = view.cams[0]; c.tv = true; c.tvTarget = () => this.interest(R); c.ship = R.ships[0];
    SN.HUD.reset(R, { vw: view, race: R }); SN.Audio && SN.Audio.raceStart(R, {});
    if (seg.mode === 'race') SN.Audio && SN.Audio.go();
    Attract.seen.tracks.add(seg.track);
  },
  /** the most interesting craft: a weapon fired lately, a close fight, a jump, else the leader */
  interest(R) {
    const L = R.track.L; let best = R.order[0], score = -1;
    for (const sh of R.ships) { if (sh.elim) continue; let k = 0; if (sh.firedT && R.t - sh.firedT < 2) k += 3; if (!sh.grounded) k += 2; for (const o of R.ships) if (o !== sh && Math.abs(SN.wrapDiff(sh.s, o.s, L)) < 300) k += 1; if (sh.place === 1) k += 1.5; if (k > score) { score = k; best = sh; } }
    if (this.lastTarget && !this.lastTarget.elim && R.t - (this.switchT || 0) < 6) return this.lastTarget;
    if (best !== this.lastTarget) { this.switchT = R.t; this.lastTarget = best; }
    return best;
  },
  update(dt) {
    const I = SN.game.input, seg = PLAYLIST[this.i];
    const any = SN.anyRaw() || I.anyPressed() || I.clicked() || (I.padPrev || []).some(Boolean) || Math.hypot(...(I.padMove || [0, 0])) > .3 || (I.pointer() && this._pp && (I.pointer()[0] !== this._pp[0] || I.pointer()[1] !== this._pp[1]));
    this._pp = I.pointer() ? I.pointer().slice() : null;
    if (any && this.t > .1) { I.consumeAll(); SN.Audio && SN.Audio.raceEnd(); SN.game.go('title', null, { fade: 0 }); return; }
    this.t += dt;
    if (this.t >= seg.secs) { this.i = (this.i + 1) % PLAYLIST.length; SN.Audio && SN.Audio.raceEnd(); this.begin(); return; }
    if (seg.card) return;
    const R = this.race; R.step(dt);
    for (const e of R.events) { if (e.t === 'fire' || e.t === 'pickup') { Attract.seen.weapons.add(e.weapon); if (e.t === 'fire') e.ship.firedT = R.t; } }
    SN.Present.events(R, this);
    this.vw.step(dt);
    if (SN.Audio && R.steps % 4 === 0) SN.Audio.update(R, this.vw);
  },
  draw(r) {
    const seg = PLAYLIST[this.i];
    if (seg.card) { r.sky(['#05060c', '#141a2e', '#29c8e8']); r.overlay(g => { SN.drawLogo(g, r.W / 2, r.H * .3, 5, this.t); T(g, 'ANTI-GRAVITY. ANTI-EVERYONE.', r.W / 2, r.H * .3 + 48, '#bff8ff', { align: 'center' }); if (Math.floor(this.t * 2) % 2) T(g, 'PRESS START', r.W / 2, r.H * .7, '#ffffff', { align: 'center', scale: 2 }); }); return; }
    if (this.vw.world) this.vw.world.draw(r);
    Attract.hud(r, this.race);
  }
};
})();
