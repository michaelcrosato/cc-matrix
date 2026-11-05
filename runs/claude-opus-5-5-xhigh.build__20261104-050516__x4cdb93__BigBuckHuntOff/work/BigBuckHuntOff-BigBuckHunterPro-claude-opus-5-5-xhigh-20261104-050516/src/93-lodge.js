// 93-lodge: Whisker Lake Lodge's trophy room, in the engine's own side view: a wood floor and a plank wall, the
// fireplace, lamps and furniture, Uncle Dub by the fire, the hound asleep; the trophy wall (each trophy dark until it's
// bagged, each hunt's best buck), the records chalkboard, the Range badge, the stats. The campaign's ceremony ends here.
bus.on('kill', e => {   // the best buck of each hunt, for its plaque
  const H = G.hunt; if (!H || H.mode === 'attract' || !Records.d) return; const a = e.a, b = Records.d.bestBuck[H.huntId];
  if (!b || e.kill.points > b.score) { Records.d.bestBuck[H.huntId] = { species: a.sp.id, points: a.points, seed: a.o.seed || 1, dist: Math.round(e.kill.dist), score: e.kill.points, rack: a.sp.rack(a.points) }; Records.save(); }
});
const LODGE_ROWS = [
  '========================================================',
  '========================================================',
  '========================================================',
  '========================================================',
  '========================================================',
  '========================================================',
  '========================================================',
  '========================================================',
  '########################################################',
  '########################################################'];
class Lodge {
  constructor() {
    this.level = new E.PlatformMap({ rows: LODGE_ROWS, legend: { '#': 1, '=': 2 }, types: { 1: { style: 'wood', side: '#6a4426', top: '#8a5a32' }, 2: { kind: 'back', style: 'plank', side: '#5a3a22' } } });
    this.floorZ = 32; this.t = 0; this.i = 0; this.camX = 120; this.dub = castRig('dub'); this.hound = new E.Blob({ R: 7, ears: 'rabbit', tail: true, feet: true, colors: { dk: '#5a3a1e', base: '#a8743a', lt: '#d8a868', spec: '#fff0d8', eye: '#1a0e08', pupil: '#1a0e08' } });
    this.reset();
  }
  reset(attract) {
    const R = Records.d, tro = ['iron-rack', 'duke', 'bigmo'];
    this.items = [];
    let x = 92;
    for (const id of tro) { const T2 = reg('trophy', id), rec = R.trophies[id] || {}; this.items.push({ kind: 'trophy', id, x, z: 96, name: T2.name, bagged: !!rec.bagged, rec, rig: this.mountRig(T2, id) }); x += 72; }
    for (const h of HUNT_ORDER) { const b = R.bestBuck[h]; this.items.push({ kind: 'best', id: h, x, z: 84, name: 'BEST ' + reg('species', reg('hunt', h).species).label.toUpperCase(), b, rig: b ? new E.Quadruped({ species: b.species, sex: 'm', antlers: Object.assign(reg('species', b.species).antlers(b.points), { seed: b.seed }) }) : null }); x += 56; }
    this.items.push({ kind: 'board', x: x + 20, z: 92, name: 'THE RECORDS BOARD' }); x += 96;
    this.items.push({ kind: 'badge', x, z: 92, name: 'RANGE BADGE', got: !!R.badge }); x += 52;
    this.items.push({ kind: 'champ', x, z: 92, name: 'HUNT-OFF CHAMPION', got: !!R.champion }); x += 52;
    this.items.push({ kind: 'stats', x, z: 70, name: 'YOUR STATS' });
    this.i = Math.min(this.i, this.items.length - 1); this.camX = this.items[this.i].x; this.attract = attract;
  }
  mountRig(T2, id) { const sp = T2.species, pts = id === 'iron-rack' ? 14 : id === 'duke' ? 14 : 72; return new E.Quadruped({ species: sp, sex: 'm', antlers: Object.assign(reg('species', sp).antlers(pts), { seed: 7, kicker: id === 'iron-rack', drop: id === 'iron-rack' }) }); }
  update(dt, attract) {
    this.t += dt;
    if (attract) { this.camX = 100 + (this.t / 6) * (this.items[this.items.length - 1].x - 60); }
    else { const it = this.items[this.i]; this.camX = lerp(this.camX, it.x, Math.min(1, dt * 5)); }
    this.dub.update(dt, { x: 40, y: 0, z: this.floorZ, vx: 0, vy: 0, facing: 0, pose: this.items[this.i] && !attract && this.t < 3 ? 'wave' : null, expr: 'smile' });
    this.hound.update(dt, { squash: Math.sin(this.t * 1.4) * .08 - .15, squint: true });
  }
  draw(r, attract) {
    const L = this.level, g0 = G.game;
    const hw = r.W / 2 / (r.view && r.view.scale || 1), roomW = LODGE_ROWS[0].length * 16;   // the camera stays inside the room
    g0.focus(clamp(this.camX, hw, Math.max(hw, roomW - hw)), 0, 86);
    r.sky(['#1a0e08', '#2a1a0e']);
    L.draw(r);
    // the fireplace: a stone chimney, the fire's light flickering
    const fx = 18, fl = .85 + Math.sin(this.t * 9) * .08 + Math.sin(this.t * 23) * .05;
    r.queue(fx, 2, this.floorZ, g => { const [sx, sy] = r.w(fx, 2, this.floorZ); const S = E.tones('#7a7068'); px.rect(g, sx - 22, sy - 90, 44, 90, S.sh); for (let yy = 0; yy < 90; yy += 6) for (let xx = (yy / 6) % 2 ? -22 : -19; xx < 22; xx += 7) px.rect(g, sx + xx, sy - 90 + yy, 6, 5, (xx + yy) % 3 ? S.base : S.lt); px.rect(g, sx - 14, sy - 28, 28, 28, '#140a06'); px.rect(g, sx - 26, sy - 32, 52, 4, '#5a4a40'); }, { bias: -5 });
    r.prop('brazier', fx, 0, this.floorZ, { light: true, size: 1.2 });
    g0.lights.add(fx, 0, this.floorZ + 20, 80 * fl, .75 * fl, { color: '#ff9a4a' });
    // furniture and lamps
    r.shape('bench', 70, 6, this.floorZ, { facing: Math.PI / 2 }); r.shape('table', 210, 4, this.floorZ, { facing: Math.PI / 2 }); r.shape('chair', 190, 6, this.floorZ, { facing: 0 }); r.shape('chair', 232, 6, this.floorZ, { facing: Math.PI });
    r.shape('bookcase', 300, 10, this.floorZ, { facing: Math.PI / 2 }); r.shape('barrel', 340, 6, this.floorZ, {}); r.shape('barrel', 520, 6, this.floorZ, {}); r.shape('table', 460, 4, this.floorZ, { facing: Math.PI / 2 });
    for (const lx of [140, 380, 600]) { r.prop('lamp', lx, 4, this.floorZ, { light: true }); g0.lights.add(lx, 0, this.floorZ + 40, 56, .55, { color: '#ffd090' }); }
    // Dub and the hound
    r.actor(40, 0, this.floorZ, (g, ox, oy) => this.dub.draw(g, ox, oy, r.view));
    r.actor(70, -8, this.floorZ, (g, ox, oy) => this.hound.draw(g, ox, oy, r.view));
    if (Math.floor(this.t * 1.2) % 3 === 0) r.textAt(78, -8, this.floorZ + 18, 'z', '#e8e0d0');
    // the trophy wall
    this.items.forEach((it, j) => {
      const on = !attract && j === this.i;
      r.queue(it.x, 8, it.z, g => {
        const [sx, sy] = r.w(it.x, 8, it.z);
        if (it.kind === 'trophy' || it.kind === 'best') {
          const size = it.kind === 'trophy' ? 54 : 40;
          if (it.rig && (it.bagged || it.kind === 'best' && it.b)) it.rig.drawMount(g, sx, sy - size * .2, size);
          else { E.tones('#5a3a22'); px.ell(g, sx, sy + size * .1, size * .42, size * .28, '#3a2414'); px.disc(g, sx, sy - size * .05, size * .18, '#120a06'); E.font.text(g, '?', sx, sy - size * .12, '#5a4a3a', { align: 'center', scale: 2, outline: false }); }
          px.rect(g, sx - 20, sy + size * .42, 40, 7, '#c8a050'); E.font.text(g, it.kind === 'trophy' ? (it.bagged ? it.name.split(' ').pop().toUpperCase() : '???') : it.id.toUpperCase(), sx, sy + size * .42 + 1, '#3a2410', { align: 'center', font: 'tiny', outline: false });
        } else if (it.kind === 'board') {
          px.rect(g, sx - 44, sy - 34, 88, 64, '#5a3a20'); px.rect(g, sx - 41, sy - 31, 82, 58, '#1e2a24');
          E.font.text(g, 'RECORDS', sx, sy - 28, '#f0ece0', { align: 'center', outline: false });
          const tb = G.cab.table('campaign').slice(0, 5); tb.forEach((e, q) => E.font.text(g, e.name + ' ' + fmt(e.score), sx, sy - 16 + q * 8, '#d8d8d0', { align: 'center', font: 'tiny', outline: false }));
        } else if (it.kind === 'badge' || it.kind === 'champ') {
          const got = it.got; px.disc(g, sx, sy, 15, got ? '#c8a050' : '#2a1e14'); px.disc(g, sx, sy, 12, got ? (it.kind === 'badge' ? '#c83a2a' : '#3a5a9a') : '#1a120c');
          if (got) { if (it.kind === 'badge') { for (let k = 3; k > 0; k--) px.disc(g, sx, sy, k * 3, k % 2 ? '#f4ecd8' : '#c83a2a'); } else drawRackIcon(g, sx, sy, 'bagged', '#ffd040'); } else E.font.text(g, '?', sx, sy - 5, '#5a4a3a', { align: 'center', scale: 2, outline: false });
        } else if (it.kind === 'stats') { px.rect(g, sx - 26, sy - 30, 52, 40, '#e8dcc0'); for (let q = 0; q < 5; q++) px.rect(g, sx - 20, sy - 24 + q * 7, 40, 1, '#8a7a60'); px.rect(g, sx - 3, sy - 34, 6, 6, '#c83a2a'); }
        if (on) { const k = Math.sin(this.t * 6) * .5 + .5; px.rect(g, sx - 34, sy + 34, 68, 1, k > .5 ? '#ffe0a0' : '#ff8a3a'); px.poly(g, [[sx - 4, sy + 40], [sx + 4, sy + 40], [sx, sy + 36]], '#ff8a3a'); }
      }, { bias: -10 });
    });
    r.overlay(g => {
      const W = r.W, Ht = r.H;
      E.font.title(g, 'THE LODGE', 12, 10, { scale: 2, colors: ['#fff6d8', '#f0b050', '#c86a20'], outline: '#1a0c08', depth: 2, depthColor: '#4a2a10' });
      if (attract) return;
      const it = this.items[this.i]; if (!it) return;
      const bw = Math.min(W - 40, 320), x = W / 2 - bw / 2, y = Ht - 84;
      E.ui.box(g, x, y, bw, 56, { bg: ['#2e2014', '#160e08'], border: '#c8843a', alpha: .94 });
      E.font.text(g, it.kind === 'trophy' && !it.bagged ? 'A TROPHY NOT YET TAKEN' : it.name.toUpperCase(), x + 10, y + 6, '#ffd040', { outline: false });
      const lines = this.info(it); lines.forEach((l, q) => E.font.text(g, l, x + 10, y + 18 + q * 10, '#e8dcc8', { outline: false }));
      promptBar(g, W, Ht, [['left', 'BROWSE'], ['cancel', 'BACK']]);
    });
  }
  info(it) {
    const R = Records.d, st = R.stats;
    if (it.kind === 'trophy') { const T2 = reg('trophy', it.id); return it.bagged ? [T2.mount.story, 'Bagged at ' + Math.round(it.rec.best || 0) + ' m' + (it.rec.date ? ' on ' + it.rec.date : '') + '.'] : ['Seen ' + (it.rec.seen || 0) + ' times. Hunt ' + reg('hunt', T2.hunt).name + ' to take him.']; }
    if (it.kind === 'best') return it.b ? [it.b.rack + ', ' + it.b.dist + ' m, worth ' + fmt(it.b.score) + ' points.', 'From ' + reg('hunt', it.id).name + '.'] : ['Nothing on this plaque yet. Bag a buck at ' + reg('hunt', it.id).name + '.'];
    if (it.kind === 'board') { const t = G.cab.table('campaign')[0]; return ['Best Hunt-Off: ' + (t ? t.name + ' ' + fmt(t.score) : '---'), 'Best hunts: ' + HUNT_ORDER.map(h => (R.best[h] ? fmt(R.best[h]) : '-')).join(' / ')]; }
    if (it.kind === 'badge') return [it.got ? 'Earned on Uncle Dub\'s range. He says you\'ll do.' : 'Finish all seven stations of the Practice Range.'];
    if (it.kind === 'champ') return [it.got ? 'First place in the 41st Annual Hunt-Off!' : 'Win the Hunt-Off campaign to hang this plaque.'];
    const acc = st.shots ? Math.round(st.hits / st.shots * 100) : 0;
    return ['Hunts ' + st.hunts + '  Shots ' + st.shots + '  Accuracy ' + acc + '%  Bucks ' + st.bucks, 'Does shot ' + st.does + '  Longest ' + Math.round(st.longest) + ' m  Favourite sound: the pump.'];
  }
}
const lodgeScene = {
  view: 'side', camera: { zoom: false }, touch: [],
  enter(o = {}) { G.scene = 'lodge'; G.game.lights.enabled = true; G.game.lights.ambient = .42; G.game.setView('side'); G.lodge = G.lodge || new Lodge(); G.lodge.reset(); G.game.cam.snap = true; this.o = o; this.cer = null; this.t = 0; if (G.sfx) { G.sfx.music('lodgefire', { fade: .6 }); G.sfx.ambience('lodge'); }
    if (o.ceremony) { const total = Object.values((o.campaign || {}).scores || {}).reduce((a, b) => a + b, 0), rivals = RIVALS.map(id => HUNT_ORDER.reduce((s, h) => s + reg('hunt', h).rivals[id], 0)), win = total > Math.max(...rivals); if (win) { Records.d.champion = true; Records.save(); G.lodge.reset(); } this.cer = { lines: reg('beat', win ? 'ceremony-win' : 'ceremony-lose').lines.slice(), i: -1, total, win }; if (G.cab.qualifies(total, 'campaign')) this.cer.entry = true; this.nextLine(); } },
  exit() { G.game.lights.enabled = false; },
  nextLine() { const c = this.cer; c.i++; if (c.i >= c.lines.length) { c.done = true; if (c.entry) G.cab.enter(c.total, 'campaign', () => { c.entry = false; G.sfx && G.sfx.play('confirm'); }); return; } const [who, line] = c.lines[c.i]; G.talk.say(line, { name: CAST[who].name, portrait: castRig(who), portraitSize: 44, onDone: () => this.nextLine() }); G.talk.nameColor = CAST[who].color; G.bab.say(line, CAST[who].voice); },
  update(dt) {
    this.t += dt; const L = G.lodge; L.update(dt, false); if (G.sfx) G.sfx.update(dt);
    if (this.cer) { if (!this.cer.done) { castRig(this.cer.lines[Math.max(0, this.cer.i)][0]).update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, expr: 'smile' }); G.talk.update(dt); return; } if (G.cab.entry) { G.cab.update(dt); return; } if (uiPressed('confirm') || uiPressed('cancel')) G.game.go('about', { credits: true }); return; }
    if (G.ui.screen) return;
    if (uiRepeat('left')) { L.i = Math.max(0, L.i - 1); UISND.focus(); }
    if (uiRepeat('right')) { L.i = Math.min(L.items.length - 1, L.i + 1); UISND.focus(); }
    const I = G.game.input, m = I.pointer && I.pointer(); if (m && this.lastM && Math.abs(m[0] - this.lastM[0]) > 2) { const r = G.game.r; if (r) { let bj = -1, bd = 30; L.items.forEach((it, j) => { const p = r.w(it.x, 8, it.z); const d = Math.abs(p[0] - m[0]) + Math.abs(p[1] - m[1]) * .5; if (d < bd) { bd = d; bj = j; } }); if (bj >= 0 && bj !== L.i) { L.i = bj; UISND.focus(); } } } this.lastM = m && m.slice();
    if (uiPressed('cancel') && this.t > .3) { UISND.back(); G.game.go('menu', { page: 'main' }); }
  },
  draw(r) { G.lodge.draw(r, false); if (this.cer) { G.talk.draw(r); if (G.cab.entry) r.overlay(g => G.cab.draw({ overlay: f => f(g), W: r.W, H: r.H, bw: r.W + 2, bh: r.H + 2 })); else if (this.cer.done) r.overlay(g => { E.font.title(g, this.cer.win ? 'HUNT-OFF CHAMPION!' : 'THE 41ST HUNT-OFF', r.W / 2, 36, { scale: 2, colors: ['#fff6d8', '#ffd040', '#c87a10'], outline: '#1a0c08', align: 'center' }); E.font.text(g, 'TOTAL ' + fmt(this.cer.total), r.W / 2, 60, '#ffffff', { align: 'center', scale: 2, shadow: '#000' }); Glyph.cue(g, 'confirm', 'THE CREDITS', r.W / 2, r.H - 14, G.game.input); }); } }
};
