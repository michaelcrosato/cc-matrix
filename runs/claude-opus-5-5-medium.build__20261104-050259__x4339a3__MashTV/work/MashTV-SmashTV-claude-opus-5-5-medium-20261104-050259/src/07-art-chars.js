// ---------------------------------------------------------------- characters: contestant looks, the hosts, enemy rigs and painters
MT.pk = (r, x = 184, y = 120, z = 0) => { const a = r.w(x, y, z), b = r.w(x + 10, y, z); return Math.max(.3, (b[0] - a[0]) / 10); };   // pixels per world unit
const tonesCache = {};
MT.tn = c => tonesCache[c] || (tonesCache[c] = E.tones(c));

MT.looks = (() => {
  const LOOKS = [
    { id: 'rocket', name: 'ROCKET', hair: 'short', hat: null, hairC: '#3a2414', skin: '#e8b48a', trim: '#ffffff', glove: '#1a1a22' },
    { id: 'volt', name: 'VOLT', hair: 'ponytail', hat: { style: 'band', color: '#2ee6ff' }, hairC: '#f0d070', skin: '#f2c8a0', trim: '#c8d0e0', glove: '#c8d0e0' },
    { id: 'moxie', name: 'MOXIE', hair: 'spiky', hat: { style: 'cap', color: '#1a1a22' }, hairC: '#6a2a1a', skin: '#a8724a', trim: '#ffffff', glove: '#1a1a22' },
    { id: 'goldie', name: 'GOLDIE', hair: 'long', hat: { style: 'band', color: '#ff2e88' }, hairC: '#c84a2a', skin: '#f0c098', trim: '#fff7e8', glove: '#fff7e8' }
  ];
  function make(look, color, size = 1.1) {
    const L = LOOKS[look % 4], sh = E.shade ? E.shade(color, -.35) : color;
    return new E.Humanoid({ size, build: 'heroic', weapon: 'gun', outfit: 'shirt', hair: L.hair, hat: L.hat || undefined, sleeves: 'long',
      colors: { skin: L.skin, hair: L.hairC, cloth: color, pants: color, boot: '#1a1a22', belt: '#fff7e8', trim: L.trim, glove: L.glove, metal: '#c8d0e0', hilt: '#3a3a48', eye: '#1a1424' } });
  }
  return { LOOKS, make };
})();

MT.cast = {
  lance: null, penny: null, annc: null, mashy: null, network: null,
  build() {
    if (this.lance) return;
    this.lance = new E.Humanoid({ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: 'spiky', sleeves: 'long',
      colors: { skin: '#f0c098', hair: '#d8dce8', cloth: '#7a2a9a', coat: '#6a1a8a', pants: '#14101c', boot: '#0a0a10', trim: '#ffcc33', glove: '#ffffff', eye: '#1a1424' }, face: { eyes: 'big' } });
    this.penny = new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'robe', hair: 'long', sleeves: 'long',
      colors: { skin: '#f6d0b0', hair: '#ff7ac8', cloth: '#1ab0a8', coat: '#1ab0a8', pants: '#1ab0a8', boot: '#fff7e8', trim: '#ffffff', glove: '#ffffff', eye: '#1a1424' }, face: { eyes: 'big' } });
    this.robo = new E.Humanoid({ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: 'bald', sleeves: 'long',
      colors: { skin: '#9aa0b0', hair: '#5a5a6a', cloth: '#7a2a9a', coat: '#6a1a8a', pants: '#14101c', boot: '#0a0a10', trim: '#ffcc33', glove: '#ffffff', eye: '#ff3344' }, eyeGlow: '#ff3344' });
    this.annc = (g, x, y, size) => { px.rect(g, x, y, size, size, '#1a0a24'); const c = x + size / 2, m = y + size / 2; px.disc(g, c, m, size * .32, '#3a3a48'); px.disc(g, c, m, size * .22, '#14141c'); for (let i = 0; i < 4; i++) px.rect(g, c - size * .18, m - size * .15 + i * size * .1, size * .36, 1, '#5a5a6a'); E.font.text(g, 'ANNC', c, y + size - 8, '#ffcc33', { align: 'center', font: 'tiny', outline: false }); };
    this.mashyP = (g, x, y, size) => MT.paint.mashyFace(g, x + size / 2, y + size / 2 + 2, size / 34);
    this.networkP = (g, x, y, size) => { px.rect(g, x, y, size, size, '#0a0a12'); const c = x + size / 2, m = y + size / 2; px.disc(g, c, m, size * .36, '#2a2a3a'); px.disc(g, c, m, size * .26, '#ff3344'); px.disc(g, c, m, size * .12, '#14040a'); px.dot(g, c - size * .08, m - size * .1, '#ffffff'); };
    this.sponsorP = (g, x, y, size) => { px.rect(g, x, y, size, size, '#ffcc33'); E.font.text(g, 'KRUNCH', x + size / 2, y + size / 2 - 7, '#c8202a', { align: 'center', font: 'tiny', outline: false }); E.font.text(g, '-O!', x + size / 2, y + size / 2 + 1, '#c8202a', { align: 'center', outline: false }); };
    for (const [rig, f] of [[this.lance, 0], [this.penny, .3], [this.robo, 0]]) rig.update(0, { x: 0, y: 0, z: 0, facing: Math.PI / 2 });
  },
  portraitOf(sp) {
    this.build();
    if (sp === 'LANCE') return MT.run && MT.run.lanceRobot ? this.robo : this.lance;
    if (sp === 'PENNY') return this.penny;
    return null;
  },
  drawPortrait(g, sp, x, y, size, o = {}) {
    this.build();
    const rig = this.portraitOf(sp);
    if (rig) { if (!MT.cfg.skipRigs) rig.drawPortrait(g, x, y, size, Object.assign({ zoom: 2.6, bg: '#2a1446', frame: true }, o)); return; }
    const f = { ANNC: this.annc, MASHY: this.mashyP, NETWORK: this.networkP, SPONSOR: this.sponsorP }[sp];
    if (f) f(g, x, y, size);
    else if (/^P\d$/.test(sp) && MT.W) { const c = MT.W.contestants.find(c => 'P' + (c.slot + 1) === sp); if (c && c.rig && !MT.cfg.skipRigs) c.rig.drawPortrait(g, x, y, size, { zoom: 2.6, bg: '#2a1446', frame: true }); }
  },
  tick(dt) {   // the hosts' rigs keep blinking for their portraits
    this.build(); const talking = MT.lines && MT.lines.current;
    for (const [rig, sp] of [[this.lance, 'LANCE'], [this.penny, 'PENNY'], [this.robo, 'LANCE']]) rig.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, expr: talking && talking.speaker === sp ? (Math.floor(MT.game.real * 9) % 2 ? 'shout' : 'smile') : 'smile' });
  }
};

// enemy rigs (Humanoids and Blobs), shared looks per kind
MT.enemyRig = (kind) => {
  switch (kind) {
    case 'goon': return new E.Humanoid({ size: 1.0, build: 'bulky', weapon: 'sword', outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#1a2448' }, sleeves: 'short',
      colors: { skin: '#d8a078', hair: '#2a1a10', cloth: '#2a3a6a', pants: '#1a2244', boot: '#0a0a10', belt: '#ffcc33', metal: '#1a1a20', hilt: '#3a3a48' } });
    case 'popper': return new E.Humanoid({ size: 1.0, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'pointed', color: '#ff2e88' },
      colors: { skin: '#f0c8a0', hair: '#c84a2a', cloth: '#ffcc33', pants: '#2ee6ff', boot: '#ff2e88' } });
    case 'mime': return new E.Humanoid({ size: 1.0, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#101014' }, sleeves: 'long',
      colors: { skin: '#f4f2f0', hair: '#101014', cloth: '#e8e8ee', trim: '#101014', pants: '#101014', boot: '#101014', glove: '#ffffff', eye: '#101014' } });
    case 'heckler': case 'hecklerKing': return new E.Humanoid({ size: kind === 'hecklerKing' ? 1.15 : .95, build: 'chibi', weapon: null, outfit: 'shirt', hair: kind === 'hecklerKing' ? 'spiky' : 'short',
      hat: kind === 'hecklerKing' ? { style: 'crown', color: '#ffcc33' } : undefined, colors: { skin: '#e0b090', hair: '#4a2a1a', cloth: kind === 'hecklerKing' ? '#c8202a' : '#2a8a4a', pants: '#3a3a5a', boot: '#ffffff', glove: '#ffcc33' } });
    case 'brute': return new E.Humanoid({ size: 1.6, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'none',
      colors: { skin: '#8a5a2a', hair: '#6a3a1a', cloth: '#ffcc33', pants: '#8a5a2a', boot: '#5a3a1a', glove: '#8a5a2a' } });
    case 'paparazzi': return new E.Humanoid({ size: .9, build: 'chibi', weapon: null, outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#3a3a30' },
      colors: { skin: '#e0b090', cloth: '#8a7a5a', coat: '#8a7a5a', pants: '#3a3a40', boot: '#1a1a1a' } });
    case 'clapbot': return new E.Blob({ R: 6, colors: { dk: '#4a5060', base: '#9aa4b8', lt: '#d8e0f0', spec: '#ffffff', eye: '#2ee6ff', pupil: '#0a2a3a' }, feet: true, mouth: true, face: 'front' });
    default: return null;
  }
};

// ---------------------------------------------------------------- painters for bodies that are not people (read only the render state)
MT.paint = {
  shade(g, x, y, rad, c, rs = 1) { const t = MT.tn(c); px.disc(g, x, y, rad + 1, '#140c1c'); px.disc(g, x, y, rad, t.sh); px.disc(g, x - rad * .15, y - rad * .2, rad * .78, t.base); px.disc(g, x - rad * .35, y - rad * .4, rad * .35, t.lt); px.dot(g, x - rad * .45, y - rad * .5, t.hi); },
  disco(r, e) {
    const s = e.rs, big = e.big, R = big ? 11 : 7.5;
    r.shadow(s.x, s.y, R, .4);
    r.queue(s.x, s.y, 4 + R, g => {
      const p = r.w(s.x, s.y, 4 + R), k = MT.pk(r), rad = R * k, t = MT.game.time + s.x * .01, fl = s.flash > 0;
      px.disc(g, p[0], p[1], rad + 1, '#140c1c'); px.disc(g, p[0], p[1], rad, fl ? '#ffffff' : '#7a8098');
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
        const u = i / 3.5, v = j / 3.5; if (u * u + v * v > .9) continue;
        const lit = ((i + j + Math.floor(t * 6)) % 3 + 3) % 3;
        px.rect(g, p[0] + u * rad - k, p[1] + v * rad - k, Math.max(1, k * 1.6), Math.max(1, k * 1.6), lit === 0 ? '#ffffff' : lit === 1 ? '#c8d0e0' : '#5a6078');
      }
      if (s.state === 'flare') for (let a = 0; a < 4; a++) { const an = a * Math.PI / 2 + (e.cross ? Math.PI / 4 : 0); px.line(g, p[0], p[1], p[0] + Math.cos(an) * rad * 1.8, p[1] + Math.sin(an) * rad * 1.8, '#ffcc33'); }
      px.dot(g, p[0] - rad * .4, p[1] - rad * .5, '#ffffff');
    }, { emissive: s.state === 'flare' });
  },
  tank(r, e) {
    const s = e.rs, c = Math.cos(s.face), sn = Math.sin(s.face), T = MT.tn('#5a5a6a'), Y = MT.tn('#e8c020');
    r.shadow(s.x, s.y, 14, .45);
    r.queue(s.x, s.y, 0, g => {
      const P = (f, w, z) => r.w(s.x + c * f - sn * w, s.y + sn * f + c * w, z);
      const fl = s.flash > 0;
      for (const side of [-1, 1]) { const q = [P(12, side * 9, 0), P(12, side * 6, 0), P(-12, side * 6, 0), P(-12, side * 9, 0)]; px.poly(g, [P(12, side * 9, 5), P(12, side * 6, 5), P(-12, side * 6, 5), P(-12, side * 9, 5)], '#1a1a20'); px.poly(g, q, '#2a2a30');
        for (let i = 0; i < 6; i++) { const f = -12 + ((i * 4 + (e.tread || 0)) % 24); const a = P(f, side * 9, 5), b = P(f, side * 6, 5); px.line(g, a[0], a[1], b[0], b[1], '#5a5a62'); } }
      const top = [P(11, -7, 10), P(11, 7, 10), P(-11, 7, 10), P(-11, -7, 10)];
      px.poly(g, [P(11, -7, 4), P(11, 7, 4), P(11, 7, 10), P(11, -7, 10)], fl ? '#ffffff' : Y.sh); px.poly(g, top, fl ? '#ffffff' : Y.base);
      const tc = Math.cos(s.aim || s.face), ts = Math.sin(s.aim || s.face), cam = r.w(s.x, s.y, 14), lens = r.w(s.x + tc * 14, s.y + ts * 14, 15);
      px.rect(g, cam[0] - 6, cam[1] - 6, 12, 9, '#1a1a22'); px.rect(g, cam[0] - 5, cam[1] - 5, 10, 7, T.base); px.line(g, cam[0], cam[1] - 1, lens[0], lens[1], '#1a1a22', 4);
      px.disc(g, lens[0], lens[1], 3, '#1a1a22'); px.disc(g, lens[0], lens[1], 2, s.state === 'aim' ? (Math.floor(MT.game.time * 20) % 2 ? '#ffffff' : '#ff3344') : '#2ee6ff');
      px.dot(g, cam[0] + 3, cam[1] - 4, '#ff3344');
    });
    if (s.state === 'aim') r.decal(() => { const tc = Math.cos(s.aim), ts = Math.sin(s.aim); for (let d = 16; d < 200; d += 8) r.groundDisc(s.x + tc * d, s.y + ts * d, 1.2, '#ff3344', .6); });
  },
  snakeSeg(r, x, y, flash, i) {
    r.shadow(x, y, 5, .3);
    r.queue(x, y, 5, g => { const p = r.w(x, y, 5), k = MT.pk(r); MT.paint.shade(g, p[0], p[1], 4.6 * k, flash ? '#ffffff' : (i % 2 ? '#3a3a3a' : '#e8c020')); });
  },
  snakeHead(r, e) {
    const s = e.rs; r.shadow(s.x, s.y, 7, .35);
    r.queue(s.x, s.y, 6, g => {
      const p = r.w(s.x, s.y, 6 + (s.state === 'rear' ? 4 : 0)), k = MT.pk(r), c = Math.cos(s.face), sn = Math.sin(s.face);
      MT.paint.shade(g, p[0], p[1], 6.5 * k, s.flash > 0 ? '#ffffff' : '#2a2a32');
      const tip = [p[0] + c * 7 * k, p[1] + sn * 5 * k];
      px.line(g, tip[0] - sn * 2 * k, tip[1] + c * 2 * k, tip[0] + c * 4 * k - sn * 2 * k, tip[1] + sn * 3 * k + c * 2 * k, '#c8d0e0', 2);
      px.line(g, tip[0] + sn * 2 * k, tip[1] - c * 2 * k, tip[0] + c * 4 * k + sn * 2 * k, tip[1] + sn * 3 * k - c * 2 * k, '#c8d0e0', 2);
      px.disc(g, p[0] - sn * 3 * k, p[1] - 2 * k, 1.5 * k, '#ff3344'); px.disc(g, p[0] + sn * 3 * k, p[1] - 2 * k, 1.5 * k, '#ff3344');
    });
  },
  clapHands(r, e) {   // drawn over the clapbot's blob: two clapper hands and an antenna
    const s = e.rs, t = s.clap || 0;
    r.queue(s.x, s.y + .5, 10, g => {
      const p = r.w(s.x, s.y, 9), k = MT.pk(r), gap = (1 + Math.cos(t * 18)) * 2.2 * k;
      px.rect(g, p[0] - 9 * k - gap / 2, p[1] - 3 * k, 4 * k, 6 * k, '#ffcc33'); px.rect(g, p[0] + 5 * k + gap / 2, p[1] - 3 * k, 4 * k, 6 * k, '#ffcc33');
      const a = r.w(s.x, s.y, 16); px.line(g, a[0], a[1], a[0] + 2 * k, a[1] - 5 * k, '#c8d0e0'); px.disc(g, a[0] + 2 * k, a[1] - 5 * k, 1.3 * k, Math.floor(MT.game.time * 6) % 2 ? '#ff3344' : '#ffcc33');
    }, { bias: 2 });
  },
  mascotHead(r, e, rig) {   // the Cereal Killer's giant bear head and cereal-box emblem
    const s = e.rs;
    r.queue(s.x, s.y + .5, 34, g => {
      const p = r.w(s.x, s.y, 34), k = MT.pk(r), fl = s.flash > 0;
      MT.paint.shade(g, p[0], p[1] - 2 * k, 9 * k, fl ? '#ffffff' : '#9a6a3a');
      px.disc(g, p[0] - 7 * k, p[1] - 9 * k, 3 * k, '#7a4a2a'); px.disc(g, p[0] + 7 * k, p[1] - 9 * k, 3 * k, '#7a4a2a');
      px.disc(g, p[0], p[1] + 2 * k, 4 * k, '#e8c8a0'); px.dot(g, p[0], p[1] + 1 * k, '#1a0a0a');
      const angry = s.state === 'tele' || s.state === 'charge';
      px.disc(g, p[0] - 3.5 * k, p[1] - 4 * k, 1.6 * k, angry ? '#ff3344' : '#ffffff'); px.disc(g, p[0] + 3.5 * k, p[1] - 4 * k, 1.6 * k, angry ? '#ff3344' : '#ffffff');
      px.dot(g, p[0] - 3.5 * k, p[1] - 4 * k, '#000'); px.dot(g, p[0] + 3.5 * k, p[1] - 4 * k, '#000');
      const ch = r.w(s.x, s.y, 20); px.rect(g, ch[0] - 4 * k, ch[1] - 4 * k, 8 * k, 7 * k, '#c8202a'); E.font.text(g, 'K', ch[0] - 2, ch[1] - 3, '#ffcc33', { outline: false });
      if (s.state === 'stun') for (let i = 0; i < 3; i++) { const a = MT.game.time * 5 + i * 2.1; px.dot(g, p[0] + Math.cos(a) * 10 * k, p[1] - 12 * k + Math.sin(a) * 3 * k, '#ffcc33'); }
    }, { bias: 3 });
  },
  partyHorn(r, e) {   // the popper's swelling party popper (drawn over its rig)
    const s = e.rs, sw = s.state === 'fuse' ? 1 + (s.t || 0) * 1.2 : 1;
    r.queue(s.x, s.y + .5, 14, g => {
      const p = r.w(s.x, s.y, 13), k = MT.pk(r) * sw;
      px.poly(g, [[p[0] - 5 * k, p[1] + 3 * k], [p[0] + 5 * k, p[1] + 3 * k], [p[0], p[1] - 7 * k]], s.flash > 0 || (s.state === 'fuse' && Math.floor(MT.game.time * 16) % 2) ? '#ffffff' : '#ff2e88');
      px.line(g, p[0] - 3 * k, p[1], p[0] + 3 * k, p[1] - 2 * k, '#ffcc33'); px.line(g, p[0] - 2 * k, p[1] - 3 * k, p[0] + 2 * k, p[1] - 5 * k, '#2ee6ff');
      if (s.state === 'fuse') { const f = [p[0] + Math.sin(MT.game.time * 30) * 2, p[1] - 8 * k]; px.dot(g, f[0], f[1], '#ffffff'); px.dot(g, f[0] + 1, f[1] - 1, '#ffcc33'); }
    }, { bias: 2, emissive: s.state === 'fuse' });
  },
  foamFinger(r, e) {
    const s = e.rs;
    r.queue(s.x, s.y + .5, 20, g => { const p = r.w(s.x + Math.cos(s.face + 1.2) * 5, s.y + Math.sin(s.face + 1.2) * 5, 22), k = MT.pk(r); px.rect(g, p[0] - 2 * k, p[1] - 6 * k, 4 * k, 7 * k, '#ffcc33'); px.rect(g, p[0] - .8 * k, p[1] - 10 * k, 2 * k, 4 * k, '#ffcc33'); E.font.text(g, '1', p[0] - 1, p[1] - 5 * k, '#c8202a', { font: 'tiny', outline: false }); }, { bias: 2 });
  },
  crate(r, e) {
    const s = e.rs, C = MT.tn(s.flash > 0 ? '#ffffff' : '#c84a2a'), R = MT.tn('#ffcc33');
    r.shadow(s.x, s.y, 9, .4);
    r.queue(s.x, s.y, 0, g => { r.box(g, s.x - 8, s.y - 8, 0, s.x + 8, s.y + 8, 14 - (1 - (s.hp / s.max)) * 3, C.lt, C.sh); const a = r.w(s.x, s.y - 8, 14), b = r.w(s.x, s.y + 8, 14); px.line(g, a[0], a[1], b[0], b[1], R.base, 2); const c1 = r.w(s.x, s.y + 8, 0), c2 = r.w(s.x, s.y + 8, 14); px.line(g, c1[0], c1[1], c2[0], c2[1], R.base, 2); const t = r.w(s.x, s.y, 15); px.disc(g, t[0] - 3, t[1] - 2, 2.5, R.lt); px.disc(g, t[0] + 3, t[1] - 2, 2.5, R.lt); });
  },
  lock(r, e) {
    const s = e.rs;
    r.queue(s.x, s.y, 0, g => { const p = r.w(s.x, s.y, 16), k = MT.pk(r); px.rect(g, p[0] - 5 * k, p[1] - 6 * k, 10 * k, 12 * k, '#1a1a22'); px.rect(g, p[0] - 4 * k, p[1] - 5 * k, 8 * k, 10 * k, s.flash > 0 ? '#ffffff' : '#c8d0e0'); px.disc(g, p[0], p[1], 2.5 * k, '#3a3a48'); px.rect(g, p[0] - 4 * k, p[1] + 3 * k, 8 * k * (s.hp / s.max), 1.5 * k, '#22c55e'); });
  }
};
