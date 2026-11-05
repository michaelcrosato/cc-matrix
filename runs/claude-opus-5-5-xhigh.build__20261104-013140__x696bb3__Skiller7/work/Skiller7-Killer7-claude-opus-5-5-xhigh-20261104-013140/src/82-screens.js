/* SCREENS: canvas modals (the sim freezes behind them): difficulty, the Wax Bench, the Wardrobe, the map, Items &
 * Dossier, Personas, the code lock, the window's postcard, an Exposure, About & Credits, the skip prompt. Big type,
 * at most seven focusable things, one idea per screen (§6.4). */
const WAX_COST = [3, 5, 8, 12, 16];
const STAT_INFO = { power: ['POWER', '+12% damage a level'], speed: ['SPEED', '+8% movement and reload a level'], critical: ['CRITICAL', '+10% warm-spot room; from level 3, +1 Rime a crit'], steady: ['STEADY', '-15% sway, +0.4 s reveal a level'] };

class DifficultyModal extends Modal {
  constructor(o) { super(o); const ids = Object.keys(DIFF); this.menu = new ListMenu(ids.map(id => ({ label: DIFF[id].label, hint: DIFF[id].line, on: () => { this.result = id; } })), { i: 1, onBack: () => { this.result = 'back'; } }); }
  update(nv) { this.menu.update(nv); return this.result ? 'close' : null; }
  draw(g, r) { UI.veil(g, r, .78); UI.big(g, 'HOW STEEP?', r.W / 2, r.H * .2, 3); this.menu.draw(g, r.W / 2, r.H * .4, { scale: 2, lh: 30, gap: 14 }); UI.prompt(g, [['confirm', 'CHOOSE'], ['cancel', 'BACK']], r.W / 2, r.H * .9, { align: 'center' }); }
}

/** the Wax Bench: one persona at a time, four big five-segment bars, the cost, your Rime */
class WaxModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.pi = Math.max(0, PERSONA_ORDER.indexOf(this.sim.st.persona)); this.si = 0; this.boxes = []; this.msg = ''; this.msgT = 0; }
  ids() { return PERSONA_ORDER.filter(id => this.sim.st.roster[id].unlocked || CHEAT.allPersonas); }
  update(nv) {
    const ids = this.ids(), keys = Object.keys(STAT_INFO);
    if (nv.left || nv.pageL) { this.pi = (this.pi + ids.length - 1) % ids.length; S7.sfx('tick'); }
    if (nv.right || nv.pageR) { this.pi = (this.pi + 1) % ids.length; S7.sfx('tick'); }
    if (nv.up) { this.si = (this.si + 3) % 4; S7.sfx('tick'); }
    if (nv.down) { this.si = (this.si + 1) % 4; S7.sfx('tick'); }
    this.boxes.forEach((b, i) => { if (nv.moved && UI.hit(nv.ptr, ...b)) this.si = i; if (UI.hit(nv.click, ...b)) { this.si = i; this.buy(ids, keys); } });
    if (this.arrows) { if (UI.hit(nv.click, ...this.arrows[0])) { this.pi = (this.pi + ids.length - 1) % ids.length; } if (UI.hit(nv.click, ...this.arrows[1])) this.pi = (this.pi + 1) % ids.length; }
    if (nv.confirm) this.buy(ids, keys);
    this.msgT -= 1 / 60;
    if (nv.back) { S7.sfx('back'); return 'close'; }
    return null;
  }
  buy(ids, keys) {
    const id = ids[this.pi % ids.length], st = this.sim.st, s = st.roster[id].stats, k = keys[this.si], lv = s[k];
    if (lv >= 5) { this.msg = 'WAXED AS FAR AS IT GOES.'; this.msgT = 2; S7.sfx('back'); return; }
    const cost = WAX_COST[lv];
    if (st.rime < cost && !CHEAT.infRed) { this.msg = 'NOT ENOUGH RIME.'; this.msgT = 2; S7.sfx('back'); return; }
    if (!CHEAT.infRed) st.rime -= cost;
    s[k] = lv + 1; this.msg = STAT_INFO[k][0] + ' ' + (lv + 1) + '. Wax them well. The mountain notices.'; this.msgT = 3;
    S7.bus.emit('sfx', { name: 'wax' }); S7.bus.emit('wax', { persona: id, stat: k, level: lv + 1 });
    this.sim.tut('wax', true);
  }
  draw(g, r) {
    const ids = this.ids(), id = ids[this.pi % ids.length], P = S7.PERSONAS[id], st = this.sim.st, s = st.roster[id].stats;
    UI.veil(g, r, .85, '#120a0c');
    UI.big(g, 'THE WAX BENCH', r.W / 2, r.H * .06, 2);
    UI.text(g, 'RIME ' + st.rime, r.W - r.W * .06, r.H * .07, '#9af0ff', { scale: 2, align: 'right' });
    const px0 = r.W * .12, py0 = r.H * .2;
    UI.portrait(g, S7.personaRig(id), px0, py0, 64);
    UI.text(g, P.short, px0 + 32, py0 + 70, '#ffffff', { scale: 2, align: 'center' }); UI.text(g, P.epithet, px0 + 32, py0 + 86, RED, { align: 'center' });
    this.arrows = [[px0 - 16, py0 + 20, 14, 24], [px0 + 66, py0 + 20, 14, 24]];
    UI.text(g, '←', px0 - 12, py0 + 26, MUTED, { scale: 2 }); UI.text(g, '→', px0 + 68, py0 + 26, MUTED, { scale: 2 });
    this.boxes = [];
    Object.keys(STAT_INFO).forEach((k, i) => {
      const x = r.W * .38, y = py0 + i * 34, f = i === this.si, lv = s[k];
      if (f) UI.rect(g, x - 10, y, 5, 22, RED);
      UI.text(g, STAT_INFO[k][0], x, y, f ? '#ffffff' : '#c8c4cc', { scale: 2 });
      UI.segBar(g, x + 80, y + 2, lv, 5, 16, 9);
      UI.text(g, lv >= 5 ? 'MAX' : WAX_COST[lv] + ' RIME', x + 180, y + 2, lv >= 5 ? MUTED : '#9af0ff');
      if (f) UI.text(g, STAT_INFO[k][1], x, y + 15, MUTED);
      this.boxes.push([x - 12, y - 2, r.W * .55, 30]);
    });
    if (this.msgT > 0) UI.text(g, this.msg, r.W / 2, r.H * .78, '#ffe0a0', { align: 'center' });
    UI.prompt(g, [['confirm', 'WAX'], ['left', 'PERSONA'], ['cancel', 'BACK']], r.W / 2, r.H * .9, { align: 'center', labels: { left: S7.Input.family() === 'gamepad' ? '← →' : 'A D' } });
  }
}

/** the Wardrobe: seven coats in a row; the focused one large with its card. The Sweep is picked here. */
class WardrobeModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.i = Math.max(0, PERSONA_ORDER.indexOf(this.sim.st.persona)); this.boxes = []; }
  update(nv) {
    if (nv.left) { this.i = (this.i + 6) % 7; S7.sfx('tick'); } if (nv.right) { this.i = (this.i + 1) % 7; S7.sfx('tick'); }
    this.boxes.forEach((b, i) => { if (nv.moved && UI.hit(nv.ptr, ...b)) this.i = i; if (UI.hit(nv.click, ...b)) { this.i = i; nv.confirm = true; } });
    if (nv.confirm) {
      const id = PERSONA_ORDER[this.i], r = this.sim.st.roster[id];
      if (!r.unlocked && !CHEAT.allPersonas) { this.msg = 'THAT COAT IS STILL WET.'; S7.sfx('back'); return null; }
      if (r.frozen) { this.msg = 'FROZEN. FETCH THEM FIRST.'; S7.sfx('back'); return null; }
      if (id !== this.sim.st.persona) this.sim.trySwitch(id, true);
      S7.sfx('confirm'); return 'close';
    }
    if (nv.back) { S7.sfx('back'); return 'close'; }
    return null;
  }
  draw(g, r) {
    UI.veil(g, r, .85, '#0e0a10');
    UI.big(g, 'THE WARDROBE', r.W / 2, r.H * .05, 2);
    this.boxes = [];
    const w = r.W * .86 / 7, x0 = r.W * .07;
    PERSONA_ORDER.forEach((id, i) => {
      const f = i === this.i, x = x0 + i * w, y = r.H * .16, rr = this.sim.st.roster[id], why = !rr.unlocked && !CHEAT.allPersonas ? 'WET' : rr.frozen ? 'FROZEN' : '';
      UI.portrait(g, S7.personaRig(id), x + w / 2 - (f ? 20 : 14), y + (f ? 0 : 6), f ? 40 : 28, { tint: why ? '#505058' : undefined, bg: id === this.sim.st.persona ? '#4a1018' : '#1a1418' });
      if (f) UI.rect(g, x + 4, y + 44, w - 8, 2, RED);
      UI.text(g, String(i + 1), x + w / 2, y - 9, f ? RED : MUTED, { align: 'center' });
      if (why) UI.text(g, why, x + w / 2, y + 48, '#8ae0ff', { align: 'center' });
      this.boxes.push([x, y - 4, w, 54]);
    });
    const id = PERSONA_ORDER[this.i], P = S7.PERSONAS[id], W = S7.WEAPONS[P.weapon], st = this.sim.st.roster[id];
    const cy = r.H * .46;
    UI.text(g, P.name.toUpperCase(), r.W / 2, cy, '#ffffff', { scale: 2, align: 'center' });
    UI.text(g, P.epithet + ' · HP ' + Math.ceil(st.hp) + '/' + P.hp, r.W / 2, cy + 16, RED, { align: 'center' });
    UI.text(g, W.name + ' · ' + P.skill.name, r.W / 2, cy + 28, '#e0dcd4', { align: 'center' });
    UI.text(g, P.skill.about, r.W / 2, cy + 40, MUTED, { align: 'center', wrap: r.W * .8 });
    if (P.extra) UI.text(g, P.extra, r.W / 2, cy + 62, MUTED, { align: 'center', wrap: r.W * .8 });
    if (this.msg) UI.text(g, this.msg, r.W / 2, r.H * .8, '#ffe0a0', { align: 'center' });
    UI.prompt(g, [['confirm', 'WEAR'], ['cancel', 'BACK']], r.W / 2, r.H * .9, { align: 'center' });
  }
}

/** the map: the area's rail graph, schematic, big and sparse; L1/R1 visit other areas you have seen */
class MapModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.areas = Object.keys(this.sim.st.visited).filter(a => a !== 'room7' && S7.AREAS[a]); this.ai = Math.max(0, this.areas.indexOf(this.sim.st.area)); }
  update(nv) {
    if (nv.pageL || nv.left) this.ai = (this.ai + this.areas.length - 1) % this.areas.length;
    if (nv.pageR || nv.right) this.ai = (this.ai + 1) % this.areas.length;
    if (nv.back || nv.confirm || (nv.click && !this.inMap(nv.click))) { S7.sfx('back'); return 'close'; }
    return null;
  }
  inMap() { return true; }
  draw(g, r) {
    const sim = this.sim, id = this.areas[this.ai] || sim.st.area, A = S7.AREAS[id];
    UI.veil(g, r, .9, '#0a0a0e');
    UI.big(g, A.title, r.W / 2, r.H * .05, 2); if (A.sub) UI.text(g, A.sub, r.W / 2, r.H * .05 + 16, RED, { align: 'center' });
    // project the graph into the box
    const grid = id === sim.st.area ? sim.grid : new LevelGrid(A), G = id === sim.st.area ? sim.rails : new RailGraph(A, grid);
    const ns = Object.values(G.nodes); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const n of ns) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const bx = r.W * .1, by = r.H * .2, bw = r.W * .8, bh = r.H * .58, k = Math.min(bw / Math.max(1, x1 - x0), bh / Math.max(1, y1 - y0));
    const P = (x, y) => [bx + (bw - (x1 - x0) * k) / 2 + (x - x0) * k, by + (bh - (y1 - y0) * k) / 2 + (y - y0) * k];
    for (const eid in G.edges) {
      const e = G.edges[eid]; if (e.hidden) continue;
      const seen = sim.st.seenEdges[id + ':' + eid], n = 12;
      for (let i = 0; i < n; i++) { if (!seen && i % 2) continue; const a = e.path.at(e.length * i / n), b = e.path.at(e.length * (i + 1) / n), pa = P(a.x, a.y), pb = P(b.x, b.y); E.px.line(g, pa[0], pa[1], pb[0], pb[1], e.gate && !sim.st.gates[id + ':' + e.gate] ? '#c83a3a' : seen ? '#f4f1ea' : '#6a6570', seen ? 2 : 1); }
    }
    let icons = 0;
    for (const n of ns) {
      const p = P(n.x, n.y); E.px.disc(g, p[0], p[1], 2, '#c8c4cc');
      if (icons > 20) continue;
      if (n.kind === 'door') { UI.text(g, '7', p[0] - 2, p[1] - 12, RED, { scale: 1 }); icons++; }
      if (n.kind === 'exit' && n.to) { UI.text(g, '→ ' + (S7.AREAS[n.to[0]] ? S7.AREAS[n.to[0]].title : ''), p[0] + 4, p[1] - 4, '#ffe0a0'); icons++; }
    }
    for (const s of A.spots || []) {
      if (icons > 20) break;
      const sp = s.node ? G.nodes[s.node] : s.edge && G.edges[s.edge] ? G.edges[s.edge].path.at((s.s || .5) * G.edges[s.edge].length) : s.at ? { x: s.at[0] * M, y: s.at[1] * M } : null; if (!sp) continue;
      const p = P(sp.x, sp.y), used = sim.st.spots[id + ':' + s.id];
      const kind = { murmel: 'murmel', pim: 'pin', phone: 'phone', pin: 'pin', dossier: 'paper', item: 'key', rime: null }[s.kind];
      if (kind && !(used && ['pin', 'dossier', 'item'].includes(s.kind))) { S7.drawIcon(g, kind, p[0] - 5, p[1] - 14, 10); icons++; }
    }
    for (const pid of PERSONA_ORDER) { const st = sim.st.roster[pid].statue; if (st && st.area === id) { const p = P(st.at[0], st.at[1]); UI.diamond(g, p[0], p[1], 5, '#8ae0ff', true); } }
    if (id === sim.st.area) { const p = P(sim.hero.x, sim.hero.y); UI.portrait(g, S7.personaRig(sim.st.persona), p[0] - 8, p[1] - 8, 16, { frame: false }); UI.diamond(g, p[0], p[1] + 10, 3, RED, true); }
    UI.text(g, S7.objective(sim), r.W / 2, r.H * .82, '#ffffff', { align: 'center', wrap: r.W * .86 });
    UI.prompt(g, [['pageL', 'AREA'], ['cancel', 'CLOSE']], r.W / 2, r.H * .92, { align: 'center', labels: { pageL: S7.Input.family() === 'gamepad' ? 'L1 R1' : 'Q E' } });
  }
}

/** Items & Dossier: tabs (L1/R1): Items · Targets · Documents · Lift Pins · Exposures; a grid of big icons, a page each */
class DossierModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.tab = 0; this.i = 0; this.open = null; this.boxes = []; this.tabBoxes = []; }
  tabs() { return ['ITEMS', 'TARGETS', 'DOCUMENTS', 'LIFT PINS', 'EXPOSURES']; }
  entries() {
    const st = this.sim.st, t = this.tab;
    if (t === 0) return Object.keys(st.items).filter(k => st.items[k] > 0 && S7.ITEMS[k]).map(k => ({ title: S7.ITEMS[k].name + (st.items[k] > 1 ? ' ×' + st.items[k] : ''), text: S7.ITEMS[k].line, icon: S7.ITEMS[k].icon }));
    if (t === 4) return st.dossier.filter(d => S7.DOSSIER[d] && S7.DOSSIER[d].tab === 'exposures').map(d => ({ title: S7.DOSSIER[d].title, text: S7.DOSSIER[d].text, icon: 'paper' }));
    if (t === 3) return S7.PINS.map((p, i) => st.pins.includes(i + 1) ? { title: p.name, text: 'Pim: "' + p.line + '"', icon: 'pin' } : { title: '— PIN ' + (i + 1) + ' —', text: 'Not found yet. ' + (S7.AREAS[p.area] ? S7.AREAS[p.area].title : ''), icon: null });
    const tab = t === 1 ? 'targets' : 'documents';
    return st.dossier.filter(d => S7.DOSSIER[d] && S7.DOSSIER[d].tab === tab).map(d => ({ title: S7.DOSSIER[d].title, text: S7.DOSSIER[d].text, icon: 'paper' }));
  }
  update(nv) {
    const L = this.entries();
    if (this.open !== null) { if (nv.back || nv.confirm || nv.click) { this.open = null; S7.sfx('back'); } return null; }
    if (nv.pageL) { this.tab = (this.tab + 4) % 5; this.i = 0; S7.sfx('tick'); } if (nv.pageR) { this.tab = (this.tab + 1) % 5; this.i = 0; S7.sfx('tick'); }
    this.tabBoxes.forEach((b, i) => { if (UI.hit(nv.click, ...b)) { this.tab = i; this.i = 0; } });
    const n = L.length, cols = 4;
    if (n) { if (nv.left) this.i = (this.i + n - 1) % n; if (nv.right) this.i = (this.i + 1) % n; if (nv.up) this.i = (this.i + n - cols) % n; if (nv.down) this.i = (this.i + cols) % n; }
    this.boxes.forEach((b, i) => { if (nv.moved && UI.hit(nv.ptr, ...b)) this.i = i; if (UI.hit(nv.click, ...b)) { this.i = i; this.open = i; } });
    if (nv.wheel) this.i = clamp(this.i + nv.wheel * cols, 0, Math.max(0, n - 1));
    if (nv.confirm && n) { this.open = this.i; S7.sfx('confirm'); }
    if (nv.back) { S7.sfx('back'); return 'close'; }
    return null;
  }
  draw(g, r) {
    UI.veil(g, r, .9, '#0c0a0e');
    const tabs = this.tabs(); this.tabBoxes = [];
    let tx = r.W * .06;
    tabs.forEach((t, i) => { const w = UI.width(t, 1) + 12; UI.rect(g, tx, r.H * .06, w, 13, i === this.tab ? RED : '#2a2428'); UI.text(g, t, tx + 6, r.H * .06 + 3, '#ffffff'); this.tabBoxes.push([tx, r.H * .06, w, 13]); tx += w + 4; });
    const L = this.entries();
    if (this.open !== null && L[this.open]) {
      const e = L[this.open];
      UI.big(g, e.title, r.W / 2, r.H * .2, 2);
      UI.text(g, e.text, r.W * .1, r.H * .34, '#f0ece4', { scale: 2, wrap: r.W * .8 });
      UI.prompt(g, [['cancel', 'BACK']], r.W / 2, r.H * .92, { align: 'center' });
      return;
    }
    this.boxes = [];
    if (!L.length) UI.text(g, 'NOTHING HERE YET.', r.W / 2, r.H * .45, MUTED, { align: 'center', scale: 2 });
    const cols = 4, cw = r.W * .88 / cols, ch = 46, start = Math.max(0, Math.floor(this.i / cols) - 2) * cols;
    L.slice(start, start + 12).forEach((e, k) => {
      const i = start + k, x = r.W * .06 + (k % cols) * cw, y = r.H * .2 + Math.floor(k / cols) * (ch + 6), f = i === this.i;
      UI.panel(g, x + 2, y, cw - 4, ch, f ? .95 : .6, f ? '#3a1018' : '#1a1418');
      if (e.icon) S7.drawIcon(g, e.icon, x + 6, y + 6, 22);
      UI.text(g, e.title, x + 32, y + 6, f ? '#ffffff' : '#c8c4cc', { wrap: cw - 40 });
      this.boxes[i] = [x + 2, y, cw - 4, ch];
    });
    const e = L[this.i]; if (e) UI.text(g, e.text.split('\n')[0], r.W / 2, r.H * .8, MUTED, { align: 'center', wrap: r.W * .86 });
    UI.prompt(g, [['confirm', 'READ'], ['pageL', 'TAB'], ['cancel', 'BACK']], r.W / 2, r.H * .92, { align: 'center', labels: { pageL: S7.Input.family() === 'gamepad' ? 'L1 R1' : 'Q E' } });
  }
}

/** Personas: the seven cards, read-only outside Room 7 */
class PersonasModal extends WardrobeModal {
  update(nv) { if (nv.left) this.i = (this.i + 6) % 7; if (nv.right) this.i = (this.i + 1) % 7; this.boxes.forEach((b, i) => { if (nv.moved && UI.hit(nv.ptr, ...b)) this.i = i; }); if (nv.back || nv.confirm) { S7.sfx('back'); return 'close'; } return null; }
  draw(g, r) {
    super.draw(g, r);
    UI.rect(g, 0, r.H * .03, r.W, 18, '#0e0a10'); UI.big(g, 'THE SEVEN', r.W / 2, r.H * .05, 2);
    const id = PERSONA_ORDER[this.i], s = this.sim.st.roster[id].stats;
    UI.rect(g, 0, r.H * .86, r.W, 30, '#0e0a10');
    let x = r.W * .14; for (const k of Object.keys(STAT_INFO)) { UI.text(g, STAT_INFO[k][0], x, r.H * .74, MUTED); UI.segBar(g, x, r.H * .74 + 10, s[k], 5, 9, 5); x += r.W * .19; }
    UI.prompt(g, [['cancel', 'BACK']], r.W / 2, r.H * .91, { align: 'center' });
  }
}

/** the code lock: four dials; up/down change one, left/right move, confirm opens; the mouse clicks the arrows or wheels */
class CodeLockModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.spot = this.sim.spots.find(s => s.id === o.spot); this.d = [0, 0, 0, 0]; this.i = 0; this.boxes = []; this.msg = ''; }
  update(nv) {
    const I = this.sim.game.input;
    if (nv.left) this.i = (this.i + 3) % 4; if (nv.right) this.i = (this.i + 1) % 4;
    if (nv.up) { this.d[this.i] = (this.d[this.i] + 1) % 10; S7.sfx('tick'); } if (nv.down) { this.d[this.i] = (this.d[this.i] + 9) % 10; S7.sfx('tick'); }
    for (let k = 0; k <= 9; k++) if (I.pressed(k >= 1 && k <= 7 ? 'p' + k : 'd' + k)) { this.d[this.i] = k; this.i = Math.min(3, this.i + 1); S7.sfx('tick'); }
    if (nv.wheel) { this.d[this.i] = (this.d[this.i] + 10 - Math.sign(nv.wheel)) % 10; }
    this.boxes.forEach((b, i) => { if (nv.moved && UI.hit(nv.ptr, b[0], b[1], b[2], b[3] * 3)) this.i = i; if (UI.hit(nv.click, b[0], b[1], b[2], b[3])) { this.i = i; this.d[i] = (this.d[i] + 1) % 10; } if (UI.hit(nv.click, b[0], b[1] + b[3] * 2, b[2], b[3])) { this.i = i; this.d[i] = (this.d[i] + 9) % 10; } });
    if (this.openBox && UI.hit(nv.click, ...this.openBox)) nv.confirm = true;
    if (nv.confirm) {
      const code = this.d.join('');
      if (code === this.spot.code) { this.sim.solveSpot(this.spot); S7.bus.emit('sfx', { name: 'gateok' }); return 'close'; }
      this.msg = 'CLICK. CLICK. Nothing.'; S7.bus.emit('sfx', { name: 'gateno' });
    }
    if (nv.back) { S7.sfx('back'); return 'close'; }
    return null;
  }
  draw(g, r) {
    UI.veil(g, r, .88, '#0a0c10');
    UI.big(g, this.spot.label || 'THE SAFE', r.W / 2, r.H * .12, 2);
    this.boxes = [];
    for (let i = 0; i < 4; i++) {
      const x = r.W / 2 - 92 + i * 48, y = r.H * .3, f = i === this.i;
      UI.text(g, '↑', x + 16, y, f ? RED : MUTED, { scale: 2 });
      UI.panel(g, x, y + 18, 40, 40, 1, f ? '#3a1018' : '#2a2a30'); UI.rect(g, x, y + 18, 40, 2, f ? RED : '#4a4a52');
      UI.text(g, String(this.d[i]), x + 20, y + 26, '#ffffff', { scale: 4, align: 'center' });
      UI.text(g, '↓', x + 16, y + 62, f ? RED : MUTED, { scale: 2 });
      this.boxes.push([x, y - 2, 40, 18]);
    }
    this.openBox = [r.W / 2 - 40, r.H * .7, 80, 18];
    UI.panel(g, ...this.openBox, 1, '#3a1018'); UI.text(g, 'OPEN', r.W / 2, r.H * .7 + 2, '#ffffff', { scale: 2, align: 'center' });
    if (this.msg) UI.text(g, this.msg, r.W / 2, r.H * .62, '#ffb0a0', { align: 'center' });
    UI.prompt(g, [['up', 'DIAL'], ['confirm', 'OPEN'], ['cancel', 'LEAVE']], r.W / 2, r.H * .9, { align: 'center', labels: { up: S7.Input.family() === 'gamepad' ? 'D-PAD' : '↑↓ 0-9' } });
  }
}

/** the window: the current area as a postcard of falling snow, and its Lift Pin count */
class PostcardModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.flakes = []; for (let i = 0; i < 90; i++) this.flakes.push([Math.random(), Math.random(), .3 + Math.random()]); }
  update(nv) { this.t += 1 / 60; if (nv.back || nv.confirm || nv.click) { S7.sfx('back'); return 'close'; } return null; }
  draw(g, r) {
    const sim = this.sim, d = sim.st.room7Door, A = S7.AREAS[d ? d.area : '00A'] || S7.AREAS['00A'];
    UI.veil(g, r, .92, '#0a0a12');
    const x = r.W * .15, y = r.H * .12, w = r.W * .7, h = r.H * .62;
    UI.rect(g, x - 4, y - 4, w + 8, h + 8, '#f4f1ea');
    const top = A.world.postcard || ['#1a2440', '#4a6a9a'];
    for (let i = 0; i < h; i++) UI.rect(g, x, y + i, w, 1, i < h * .6 ? top[i < h * .3 ? 0 : 1] : '#e8ecf4');
    for (let k = 0; k < 6; k++) { const mx = x + w * (k / 6), mh = h * (.25 + .2 * Math.sin(k * 2.1)); E.px.poly(g, [[mx, y + h * .6], [mx + w / 12, y + h * .6 - mh], [mx + w / 6, y + h * .6]], '#2a3450'); E.px.poly(g, [[mx + w / 24, y + h * .6 - mh * .55], [mx + w / 12, y + h * .6 - mh], [mx + w / 8, y + h * .6 - mh * .55]], '#f4f4ff'); }
    for (const f of this.flakes) { const fx = x + ((f[0] * w + this.t * 6) % w), fy = y + ((f[1] * h + this.t * 18 * f[2]) % h); UI.rect(g, fx, fy, 1, 1, '#ffffff'); }
    UI.text(g, 'GREETINGS FROM ' + A.title, r.W / 2, y + h + 10, '#ffffff', { scale: 2, align: 'center' });
    const pins = sim.st.pins.filter(p => S7.PINS[p - 1] && S7.PINS[p - 1].area === (d ? d.area : '00A')).length;
    UI.text(g, 'LIFT PINS HERE: ' + pins + ' / 1   ·   ALL PINS: ' + sim.st.pins.length + ' / 7', r.W / 2, y + h + 28, MUTED, { align: 'center' });
  }
}

/** an Exposure developed by Mireille's flash: a full-screen picture with the secret */
class ExposureModal extends Modal {
  constructor(o) { super(o); this.id = o.id; }
  update(nv) { this.t += 1 / 60; if (this.t > .8 && (nv.back || nv.confirm || nv.click)) { S7.sfx('back'); return 'close'; } return null; }
  draw(g, r) {
    const D = S7.DOSSIER[this.id], k = Math.min(1, this.t / 1.2);
    UI.rect(g, 0, 0, r.W, r.H, '#000');
    g.save(); g.globalAlpha = k; UI.rect(g, r.W * .1, r.H * .1, r.W * .8, r.H * .7, '#e8e0cc'); g.restore();
    UI.text(g, 'EXPOSURE', r.W / 2, r.H * .14, RED, { align: 'center', scale: 2 });
    if (k > .5) UI.text(g, D.text, r.W * .15, r.H * .3, '#1a1418', { scale: 2, wrap: r.W * .7, outline: false });
    if (this.t > .8) UI.prompt(g, [['confirm', 'DONE']], r.W / 2, r.H * .9, { align: 'center' });
  }
}

/** About & Credits: pages of large text: Source Information, Testing, Engine and Prompt Feedback, then the credits */
class AboutModal extends Modal {
  constructor(o) { super(o); this.page = 0; this.scroll = 0; this.pages = S7.ABOUT_PAGES; }
  update(nv) {
    if (nv.left || nv.pageL) { this.page = (this.page + this.pages.length - 1) % this.pages.length; this.scroll = 0; S7.sfx('tick'); }
    if (nv.right || nv.pageR || nv.confirm) { this.page = (this.page + 1) % this.pages.length; this.scroll = 0; S7.sfx('tick'); }
    if (nv.up) this.scroll = Math.max(0, this.scroll - 1); if (nv.down) this.scroll++;
    if (nv.wheel) this.scroll = Math.max(0, this.scroll + nv.wheel);
    if (nv.click) { if (nv.click[0] < this.W * .3) this.page = (this.page + this.pages.length - 1) % this.pages.length; else this.page = (this.page + 1) % this.pages.length; this.scroll = 0; }
    if (nv.back) { S7.sfx('back'); return 'close'; }
    return null;
  }
  draw(g, r) {
    this.W = r.W;
    UI.veil(g, r, .95, '#0b0a0c');
    const P = this.pages[this.page];
    UI.big(g, P.title, r.W / 2, r.H * .05, 2);
    UI.text(g, (this.page + 1) + ' / ' + this.pages.length, r.W - r.W * .06, r.H * .06, MUTED, { align: 'right' });
    const x = r.W * .07, w = r.W * .86, y0 = r.H * .16, pad = 4;
    // a page is a few thousand glyphs: lay it out and draw it once into a canvas of its own, then copy that each frame
    const key = this.page + ':' + r.W + 'x' + r.H;
    if (this._key !== key) {
      this._key = key; let h = 0;
      for (const [hd, t] of P.items) { const lines = E.font.wrap(t, w, { scale: 1 }); h += (hd ? 10 : 0) + (Array.isArray(lines) ? lines.length : 1) * 9 + 5; }
      this._h = h; this._cv = null;
      if (typeof document !== 'undefined') {
        const c = document.createElement('canvas'); c.width = Math.ceil(r.W); c.height = Math.ceil(h + pad * 2); const cg = c.getContext('2d');
        if (cg) { let y = pad; for (const [hd, t] of P.items) { if (hd) { UI.text(cg, hd, x, y, RED); y += 10; } const lines = E.font.wrap(t, w, { scale: 1 }); UI.text(cg, t, x, y, '#f0ece4', { wrap: w }); y += (Array.isArray(lines) ? lines.length : 1) * 9 + 5; } this._cv = c; }
      }
    }
    g.save(); g.beginPath(); g.rect(0, r.H * .14, r.W, r.H * .72); g.clip();
    if (this._cv) g.drawImage(this._cv, 0, Math.round(y0 - this.scroll * 10 - pad));
    else { let y = y0 - this.scroll * 10; for (const [hd, t] of P.items) { if (hd) { UI.text(g, hd, x, y, RED); y += 10; } const lines = E.font.wrap(t, w, { scale: 1 }); UI.text(g, t, x, y, '#f0ece4', { wrap: w }); y += (Array.isArray(lines) ? lines.length : 1) * 9 + 5; } }
    g.restore();
    this.maxScroll = Math.max(0, Math.ceil((y0 + this._h - r.H * .86) / 10));
    if (this.scroll > this.maxScroll) this.scroll = this.maxScroll;
    UI.prompt(g, [['left', 'PAGE'], ['down', 'SCROLL'], ['cancel', 'BACK']], r.W / 2, r.H * .92, { align: 'center', labels: { left: S7.Input.family() === 'gamepad' ? '← →' : '← →', down: S7.Input.family() === 'gamepad' ? '↑ ↓' : '↑ ↓' } });
  }
}

/** the game's modals by name (the play scene opens them for the sim's uiRequest and the pause menu's items) */
S7.MODALS = { difficulty: DifficultyModal, wax: WaxModal, wardrobe: WardrobeModal, map: MapModal, dossier: DossierModal, personas: PersonasModal, codelock: CodeLockModal, postcard: PostcardModal, exposure: ExposureModal, about: AboutModal };
