// The ward between cases: threequarter view, the people you saved in the beds. Walk with stick or keys, or click to walk (section 11).
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, Glyph = G.Glyph, U = G.U;
G.scenes = G.scenes || {};
const WARDS = {
  ward3: { name: 'Ward 3', music: 'ward', floor: { stones: ['#6a807c', '#62786f'], mortar: '#48584f', hi: '#7c9690', lo: '#54665f', speck: '#5a6c64' }, rows: [
    '####################',
    '#..................#',
    '#..................#',
    '#.@................D',
    '#..................#',
    '#..................#',
    '#..................#',
    '####################'], beds: [[3, 1.4], [6.5, 1.4], [10, 1.4], [13.5, 1.4], [3, 5.7], [6.5, 5.7], [10, 5.7], [13.5, 5.7]], beats: 'patients', spots: { quill: [16.6, 5], percy: [17.6, 1.6], odalys: [16.2, 2], chief: [2, 6.2] }, shapes: [['vending', 18.3, 1.3, 1.57], ['lightbox', 16, 1, 0], ['ivstand', 5, 1.2], ['vitalsmon', 8.6, 1.2], ['ivstand', 12, 1.2], ['crashcart', 15.4, 6.2], ['kenney-furniture:chair-desk', 16.9, 5.6, -1.57], ['kaykit-furniture-bits:cabinet-small', 5, 6.3], ['kaykit-furniture-bits:cabinet-medium', 12, 6.3], ['curtain', 8.3, 3.4, 1.57], ['begonia', 2, 1.3], ['wardtv', 8.6, .7, 0]], window: true },
  ship: { name: 'Ship\'s Ward', music: 'ward', sway: true, floor: { stones: ['#4a544e', '#444e48'], mortar: '#2c3430', hi: '#5a665e', lo: '#3a443e', speck: '#3e4842' }, rows: [
    '##############',
    '#............#',
    '#............#',
    '#.@..........D',
    '#............#',
    '#............#',
    '##############'], beds: [[3, 1.4], [6.5, 1.4], [10, 1.4], [3, 4.9], [6.5, 4.9], [10, 4.9]], bunk: true, beats: 'patients', spots: { quill: [11.8, 4.6], sokolova: [11.6, 1.6] }, shapes: [['crashcart', 12.4, 5.3], ['ivstand', 5, 1.2], ['kaykit-furniture-bits:cabinet-small', 8.5, 5.3]], lamp: true },
};
const CASE_PERSON = { glasshouse: 'agnes', lowbrass: 'slide', crane9: 'tam', whistling: 'harrow', slur: 'ilse', forcenine: 'yusuf', fromthetop: 'perpetua', deadman: 'crane' };
const VIEW_RIG = { quill: 'quill', percy: 'percy', odalys: 'odalys', chief: 'oyelaran', sokolova: 'sokolova' };
G.WARD_MAPS = WARDS;

G.scenes.ward = {
  pausable: true, view: 'threequarter', camera: { zoom: false, wheel: false }, propSize: 1.3,
  enter(d = {}) {
    const game = G.game; this.d = d; this.t = 0; const W = this.W = WARDS[d.ward] || WARDS.ward3, ch = this.ch = d.chapter || G.Flow.prog.chapter; G.Music.play(W.music);
    const rows = W.rows;
    this.map = new E.TileMap({ rows, legend: { '#': 1, '@': 'hero', 'D': { tile: 2, spawn: 'door' } }, types: { 1: { h: 40, cut: true, cutH: 5, top: d.ward === 'ship' ? '#2a322e' : '#2c3a38', side: d.ward === 'ship' ? '#46524c' : '#7a908a', face: 'plaster', roof: 'plain' }, 2: { h: 40, cut: false, top: '#2c3c3c', side: '#16343a', face: 'plaster', roof: 'plain' } }, floorTex: (x, y) => E.tex.checker ? E.tex.checker(x, y, { a: E.hex(W.floor.stones[0]), b: E.hex(W.floor.stones[1]) }) : E.tex.flagstone(x, y, { stones: W.floor.stones.map(E.hex), mortar: E.hex(W.floor.mortar), hi: E.hex(W.floor.hi), lo: E.hex(W.floor.lo), speck: E.hex(W.floor.speck) }), outside: '#0a1012' });
    game.cam.bounds = v => this.map.bounds(v);
    const sp = this.map.find('hero'); this.hero = new E.Body({ x: sp.x, y: sp.y, r: 5, friction: 0 }); this.heroRig = G.makeRig(ch === 3 ? 'vale' : 'vale'); this.face = 0; this.path = null; this.flow = new E.FlowField(this.map);
    const door = this.map.find('door'); this.door = { id: 'door', name: d.ward === 'ship' ? 'SICK BAY' : 'NEXT CASE', x: door.x - 12, y: door.y, rig: null };
    // people: saved patients in the beds, and the staff
    this.people = []; const beds = W.beds, solid = (id, cx, cy, f) => { const x = cx * 16 + 8, y = cy * 16 + 8; this.map.solid && this.map.solid(id, x, y, 0, { facing: f ?? 0 }); return { id, x, y, f: f ?? 0 }; };
    this.shapes = W.shapes.map(s => solid(s[0], s[1], s[2], s[3] ?? (s[2] > 3 ? -1.57 : 1.57)));
    const seen = G.Flow.prog.patients || []; let bi = 0; this.beds = beds.map(b => solid(W.bunk ? 'shipbunk' : 'hospbed', b[0], b[1], b[1] > 3 ? -1.57 : 1.57));
    for (const c of seen) { const who = CASE_PERSON[c]; if (!who || !(G.WARD_TALK[who] && G.WARD_TALK[who][ch])) continue; const b = this.beds[bi++]; if (!b) break; this.people.push({ id: who, name: G.castName(who), x: b.x, y: b.y, rig: G.makeRig(who), z: 9, down: 1, bed: b, talk: who }); }
    for (const k in W.spots) { if (!(G.WARD_TALK[k] && G.WARD_TALK[k][ch])) continue; const [cx, cy] = W.spots[k]; this.people.push({ id: k, name: k === 'chief' ? 'CHIEF OYELARAN' : G.castName(VIEW_RIG[k]), x: cx * 16 + 8, y: cy * 16 + 8, rig: G.makeRig(VIEW_RIG[k], k === 'quill' ? {} : {}), z: 0, pose: k === 'quill' ? 'knit' : undefined, talk: k, solid: true }); }
    this.talked = {}; this.talk = new E.Dialog(game, { lines: 2, width: Math.min(404, game.W - 16), bg: '#06181c', border: '#4fd0c4', nameColor: '#ffd36a', speed: 52, voice: (ch2, i, t) => G.Babble.letter(this.talkWho || 'quill', ch2, i, t._page ? t._page.join(' ') : '') });
    this.focus = null; this.lit = 0; this.goal = null; this.hp = null; this.moraleShown = false; G.Flow.prog.morale = false;
    game.lights.enabled = true; game.lights.ambient = W.lamp ? .6 : .72; if (W.sway) { const L = G.Sfx.loop('creak'); if (L) L.set(.02); }
    if (game.saves) { game.saves.canSave = true; try { game.saves.autosave(); } catch (e) { game.fail('autosave', e); } }
    G.Screen.cursor(game, true); game.input.consumeAll();
  },
  exit() { G.Sfx.stopLoops(); G.game.lights.enabled = false; if (G.game.saves) G.game.saves.canSave = false; G.game.cam.bounds = null; },
  list() { return [...this.people, this.door]; },
  near() { let best = null, bd = 30; for (const p of this.list()) { const d = U.dist(this.hero.x, this.hero.y, p.x, p.y); if (d < bd) { bd = d; best = p; } } return best; },
  pick(sx, sy) { const r = G.game.r; if (!r) return null; let best = null, bd = 18; for (const p of this.list()) { const q = r.w(p.x, p.y, 12); const d = U.dist(sx, sy, q[0], q[1]); if (d < bd) { bd = d; best = p; } } return best; },
  use(p) {
    const game = G.game, ch = this.ch;
    if (p === this.door) { G.Sfx.door(); game.input.consumeAll(); const all = this.people.length > 0 && this.people.every(q => this.talked[q.id]); if (all) { G.Flow.prog.morale = true; } G.Flow.advance(); return; }
    const lines = (G.WARD_TALK[p.talk] || {})[ch] || (G.WARD_TALK[p.talk] || {})[Object.keys(G.WARD_TALK[p.talk] || { 1: 0 })[0]] || [['quill', '...']], n = (this.talkN = this.talkN || {}), i = (n[p.id] || 0) % lines.length; n[p.id] = (n[p.id] || 0) + 1; const line = lines[i];
    this.talkWho = line[0]; this.talked[p.id] = true; game.saves && (game.saves.canSave = false);
    this.talk.say(line[1], { name: G.castName(line[0]), portrait: (g, x, y, s) => { const cv = G.bust(line[0], { expr: line[2] || 'neutral', talk: this.talk.typing && (this.t * 11 | 0) % 2 ? 1 : 0, blink: (this.t % 3.3) < .1 ? 1 : 0 }); if (g.drawImage) { g.imageSmoothingEnabled = false; g.drawImage(cv, 38, 22, 36, 42, x, y, s, s); px.reset(g); } }, portraitSize: 40, onDone: () => { game.saves && (game.saves.canSave = true); if (this.people.every(q => this.talked[q.id]) && !this.moraleShown && this.people.length) { this.moraleShown = true; G.Flow.prog.morale = true; this.note = { t: 3, text: '"Morale," Quill says, as if it were a diagnosis.  +10 Steady' }; G.Sfx.chime(); } } });
  },
  update(dt) {
    const game = G.game, I = game.input, H = this.hero; this.t += dt; if (this.note) { this.note.t -= dt; if (this.note.t <= 0) this.note = null; }
    if (this.talk.update(dt)) { this.heroRig.update(dt, { x: H.x, y: H.y, z: H.z, vx: 0, vy: 0, facing: this.face }); this.stepPeople(dt); game.follow && 0; game.focus(H.x, H.y, 10); return; }
    const m = I.move(); let d = game.view.screenDirToGround(m[0], m[1]), sp = 96; const hasMove = Math.hypot(d[0], d[1]) > .1;
    if (hasMove) this.goal = null;
    // the mouse: hover moves the focus, click walks there and talks
    const p = I.lastDevice === 'mouse' ? I.pointer() : null; let hover = null; if (p) hover = this.pick(p[0], p[1]);
    const c = I.clicked();
    if (c) { const t = this.pick(c[0], c[1]); if (t) { this.goal = { x: t.x, y: t.y, then: t }; } else { const g2 = game.mouseGround(); if (g2) this.goal = { x: g2[0], y: g2[1], then: null }; } }
    if (this.goal) { const g2 = this.goal, gx = g2.x, gy = g2.y; if (!g2.fu) { g2.fu = true; this.flow.update(gx, gy); } const dir = this.flow.dir(H.x, H.y, gx, gy); const dist = U.dist(H.x, H.y, gx, gy), reach = g2.then ? 24 : 6; if (dist <= reach || !dir) { if (g2.then) this.use(g2.then); this.goal = null; d = [0, 0]; } else d = dir; }
    H.vx = d[0] * sp; H.vy = d[1] * sp; H.update(dt, this.map); if (Math.hypot(d[0], d[1]) > .1) this.face = Math.atan2(d[1], d[0]);
    const sway = this.W.sway ? Math.sin(this.t * 1.2) * .12 : 0;
    this.heroRig.update(dt, { x: H.x, y: H.y, z: H.z, vx: H.vx, vy: H.vy, facing: this.face, roll: sway });
    this.stepPeople(dt);
    this.focus = hover || this.near();
    if (this.focus && !this.goal && (I.pressed('interact') || I.pressed('confirm'))) this.use(this.focus);
    game.focus(H.x, H.y, 10);
  },
  stepPeople(dt) { const H = this.hero, sway = this.W.sway ? Math.sin(this.t * 1.2) * .12 : 0; for (const p of this.people) { const f = p.bed ? -1.57 : Math.atan2(H.y - p.y, H.x - p.x); p.rig.t = this.t; p.rig.update(dt, { x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, facing: f, pose: p.pose, down: p.down || 0, roll: p.bed ? 0 : sway }); } },
  draw(r) {
    const game = G.game, W = this.W; this.map.drawFloor(r); this.map.queueWalls(r);
    const shape = (s, o = {}) => r.shape(s.id, s.x, s.y, 0, Object.assign({ facing: s.f, light: true }, o));
    for (const s of this.beds) shape(s); for (const s of this.shapes) shape(s);
    r.shape('nextsign', this.door.x + 6, this.door.y - 2, 0, { facing: Math.PI, light: true });
    const H = this.hero; r.shadow(H.x, H.y, 6); r.actor(H.x, H.y, H.z, (g, ox, oy) => this.heroRig.draw(g, ox, oy, r.view));
    for (const p of this.people) { if (!p.bed) r.shadow(p.x, p.y, 5); r.actor(p.x, p.y, p.z || 0, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view), this.focus === p ? { outline: '#ffd36a' } : {}); }
    // lights: fluorescent panels, the door's glow, a warm desk lamp or the swinging lamp
    const L = game.lights; const cols = this.map.width ? this.map.width : 320; if (W.lamp) { const lx = (7 * 16) + Math.sin(this.t * 1.2) * 60; L.add(lx, 48, 40, 100, .3, { color: '#ffd890' }); } else { for (let i = 0; i < 5; i++) L.add(32 + i * 64, 64, 40, 70, .28, { color: '#e8fff8' }); L.add(this.door.x, this.door.y, 30, 50, .7, { color: '#6cf0a0' }); }
    this.talk.draw(r);
    r.overlay(g => {
      const WW = r.W, HH = r.H; if (W.window) { const wx = 0; }
      Pix.text(g, W.name, 8, 6, '#e8fbf6');
      const f = this.focus, I = game.input;
      if (f && !this.talk.open) { const q = r.w(f.x, f.y, 34); Pix.text(g, f.name, q[0], q[1] - 10, f === this.door ? '#6cf0a0' : '#ffd36a', { align: 'center' }); const lw = Glyph.width(I, 'interact'), tw = E.font.width(f === this.door ? 'Go in' : 'Talk'), x = Math.round(q[0] - (lw + tw + 4) / 2); Glyph.action(g, I, 'interact', x, q[1]); Pix.text(g, f === this.door ? 'Go in' : 'Talk', x + lw + 3, q[1] + 1, '#ffffff'); }
      if (this.note) { const tw = E.font.width(this.note.text) + 10; Pix.panel(g, Math.round(WW / 2 - tw / 2), 24, tw, 13, { alpha: .9 }); Pix.text(g, this.note.text, WW / 2, 27, '#ffd36a', { align: 'center' }); }
      const doorScr = r.w(this.door.x + 6, this.door.y, 36); if (Math.sin(this.t * 4) > -.3) Pix.text(g, this.door.name, doorScr[0] - 12, doorScr[1] - 8, '#6cf0a0', { align: 'center' });
    });
  },
};
})();
