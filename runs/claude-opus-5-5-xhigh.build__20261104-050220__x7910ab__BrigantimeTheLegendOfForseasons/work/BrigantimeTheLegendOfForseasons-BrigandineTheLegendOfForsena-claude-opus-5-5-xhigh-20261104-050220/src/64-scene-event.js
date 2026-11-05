// STORY STAGES AND TALK: G.Talk runs lines of dialogue anywhere (battle openings, quest vignettes, story scenes) on
// an E.Dialog with live portraits, names in their realm's colour and Animalese voices; the event scene stands the cast
// on one of eight small sets (brawler view, a backdrop, props), steps the speaker forward, frames them, pops emotes,
// and applies the event's effects and choice through the campaign when it ends. ✕ advances; △ shows the backlog;
// holding ○ skips the scene (its effects still apply).

const TK = G.Talk = { open: false, q: [], log: [] };
const EUP = E.px;
const herald = () => TK._herald || (TK._herald = new G.Vis({ kind: 'knight', ref: 'herald', cls: 'squire' }));
G.EXTRA_LOOKS = {
  herald: { name: 'Herald', look: { build: 'heroic', size: 1.15, outfit: 'tunic', hat: { style: 'cap', color: '#b02a2a' }, hair: 'short', weapon: null, colors: { cloth: '#d8c070', pants: '#3a3a46', hair: '#6a4a2a', trim: '#b02a2a' } } },
  keeper: { name: 'The Keeper', look: { build: 'heroic', size: 1.2, hunch: .3, outfit: 'robe', hat: 'crown', hair: 'long', weapon: 'staff', sleeves: 'long', colors: { cloth: '#f0e8d8', pants: '#d8c070', hair: '#ffffff', trim: '#d8c070', orb: '#ffffff' } } },
  sergeant: { name: 'Patrol Sergeant', look: { build: 'bulky', size: 1.15, outfit: 'tunic', hair: 'spiky', hat: { style: 'band', color: '#2a2a2a' }, weapon: 'sword', colors: { cloth: '#7a6a5a', pants: '#4a3a2a', hair: '#3a2a1a', trim: '#2a2a2a' } } }
};
/** who a speaker is in a realm's story: { id, name, color, vis, voice } */
TK.who = (sp, realm) => {
  if (sp === 'narrator') return { id: 'narrator', name: null, color: '#b8b0c8' };
  let id = sp;
  if (sp === 'ruler') id = G.RULER[realm] || 'gareth';
  if (sp === 'knight') { const sq = { verdance: 'lynette', solmark: 'agravain', amberlyn: 'lamorak', hoarfast: 'ragnell' }[realm]; id = sq || 'lynette'; }
  if (G.EXTRA_LOOKS[id]) { const x = G.EXTRA_LOOKS[id]; TK._ex = TK._ex || {}; const vis = TK._ex[id] || (TK._ex[id] = (() => { const v = new G.Vis({ kind: 'knight', ref: 'gareth', cls: 'squire' }); v.rig = new E.Humanoid(x.look); v.tool = null; return v; })()); return { id, name: x.name, color: '#e8e4f0', vis, voice: G.voice.profileOf(id) }; }
  if (!G.has('knight', id)) return { id, name: id, color: '#ffffff' };
  const d = G.get('knight', id), realmCol = d.realm && G.has('realm', d.realm) ? G.get('realm', d.realm).color : '#e8e4f0';
  return { id, name: d.short, color: E.tones(realmCol).lt, vis: G.knightVis(id), voice: G.voice.profileOf(id) };
};
/** resolve a line's text for a realm (lines may vary by ruler, or by whether Lunete is with you) */
TK.text = (sp, text, realm, ctx) => {
  if (typeof text === 'string') return { sp, text };
  if (sp === 'ruler') return { sp, text: text[G.RULER[realm]] || Object.values(text)[0] };
  if (text.lunete) { const has = ctx && ctx.holds && ctx.holds('lunete'); return has ? { sp: 'lunete', text: text.lunete } : { sp: 'knight', text: text.other }; }
  return { sp, text: Object.values(text)[0] };
};
/** run lines: [[speaker, text, opts]]; o: { realm, choices, onChoice(i), onDone, vars, ctx, auto } */
TK.run = (lines, o = {}) => {
  TK.q = lines.map(l => Object.assign(TK.text(l[0], l[1], o.realm, o.ctx), { opts: l[2] || {} }));
  TK.o = o; TK.open = true; TK.stepped = 0;
  if (!TK.dlg) TK.dlg = new E.Dialog(G.game, { lines: 3, speed: 50, bg: '#141a3a', border: '#e8e4ff' });
  TK.next();
};
TK.next = () => {
  const d = TK.dlg, o = TK.o;
  if (!TK.q.length) { TK.open = false; TK.cur = null; const f = o.onDone; TK.o = {}; if (f) f(); return; }
  const l = TK.q.shift(), w = TK.who(l.sp, o.realm), last = !TK.q.length;
  TK.cur = { who: w, line: l };
  const speed = { Normal: 50, Slow: 30, Fast: 90, Instant: 2000 }[(G.game.settings && G.game.settings.textSpeed) || 'Normal'];
  d.speed = speed;
  d.voice = w.voice ? (ch, i) => G.voice.letter(w.voice, ch, i) : null;
  d.nameColor = w.color;
  TK.log.push((w.name ? w.name + ': ' : '') + l.text.replace(/\{[^}]*\}/g, '')); if (TK.log.length > 60) TK.log.shift();
  if (TK.onLine) TK.onLine(w, l);
  const choices = last && o.choices ? o.choices.map(c => c.text || c) : null;
  d.say(l.text, { name: w.name, portrait: w.vis ? (g, x, y, size) => w.vis.portrait(g, x, y, size, { bg: '#1a1e40', frame: false }) : null, portraitSize: 40, vars: o.vars, choices, auto: o.auto || 0,
    onChoice: i => { TK.choice = i; if (o.onChoice) o.onChoice(i); },
    onDone: () => TK.next() });
};
/** each step: returns true while the talk holds the scene */
TK.update = dt => {
  if (!TK.open) return false;
  const inp = G.inp();
  if (inp.pressed('info')) TK.backlog = !TK.backlog;
  if (TK.backlog) { if (inp.pressed('cancel') || inp.pressed('confirm')) TK.backlog = false; return true; }
  if (TK.o.skippable !== false && G.holdDone('cancel', .8)) { TK.skip(); return true; }
  TK.dlg.update(dt);
  return TK.open;
};
/** skip to the end: the remaining lines are logged; a pending choice takes its first answer */
TK.skip = () => {
  const o = TK.o; TK.q = []; if (TK.dlg) TK.dlg.close();
  if (o.choices && TK.choice === undefined) { TK.choice = 0; if (o.onChoice) o.onChoice(0); }
  TK.open = false; TK.cur = null; TK.o = {}; if (o.onDone) o.onDone();
};
TK.draw = r => {
  if (!TK.open) return;
  TK.dlg.draw(r);
  r.overlay(g => {
    if (TK.backlog) { const k = G.UI.k(), w = Math.min(r.W - 20, 360), h = r.H - 40, x = Math.round((r.W - w) / 2); G.UI.box(g, x, 10, w, h, { alpha: .96 }); G.UI.text(g, 'BACKLOG', x + 8, 14, G.UI.COL.gold); let y = 28; for (const l of TK.log.slice(-Math.floor((h - 24) / (10 * k * 1.6)))) { for (const ln of E.font.wrap(l, w - 16, { scale: k })) { G.UI.text(g, ln, x + 8, y, '#e8e4f0'); y += 10 * k; } y += 2; } }
    const hf = G.holdFrac('cancel', .8); if (hf > .1) { G.UI.box(g, r.W - 74, 6, 68, 12, { alpha: .9 }); G.UI.bar(g, r.W - 70, 9, 60, 6, hf, '#ff6a6a'); }
  });
  G.UI.prompts(r, [['confirm', 'Next'], ['info', 'Backlog'], ['cancel', 'Hold: Skip']], { y: 8 * G.UI.k() });
};

/* ---- the stage sets ---- */
const STAGES = {
  orchard: { sky: ['#7ac0f0', '#a8d8f0', '#f0f8ff'], floor: (x, y) => E.tex.grass(x, y, { base: '#5aae46', dark: '#3e8a3a', light: '#8ad06a', flower: '#f4b8d0' }), layers: [{ kind: 'hills', color: '#6aa85a', y: .55 }, { kind: 'forest', color: '#4a8a4a', y: .62 }], props: [['tree', 30, 18, { l: '#f4b8d0 foliage' }], ['tree', 250, 14, { l: '#f4b8d0 foliage' }], ['sundial', 210, 30], ['shrine', 60, 34]], light: '#fff8e0', weather: { kind: 'petals', amount: .4, wind: .2 }, music: 'spring' },
  sunhall: { sky: ['#c8784a', '#f0b860', '#ffe8c0'], floor: (x, y) => E.tex.checker(x, y, { a: '#d8b878', b: '#c8a060', size: 16 }), layers: [{ kind: 'castle', color: '#b8885a', y: .55 }], props: [['p:brazier', 40, 28], ['p:brazier', 240, 28], ['p:pillar', 20, 10], ['p:pillar', 260, 10], ['p:banner', 140, 4]], light: '#ffd8a0', music: 'summer' },
  harvesthall: { sky: ['#3a2418', '#5a3a24', '#7a5030'], floor: (x, y) => E.tex.planks(x, y, { base: '#9d6a3f', dark: '#7a4a28', line: '#4a2e1c' }), layers: [{ kind: 'castle', color: '#5a3a24', y: .5 }], props: [['haybale', 30, 20], ['pumpkin', 54, 30], ['pumpkin', 230, 32], ['sundial', 250, 18], ['p:lantern', 100, 8], ['p:lantern', 180, 8]], light: '#ffb060', music: 'autumn' },
  icehall: { sky: ['#5a7aa8', '#8aa8d0', '#d8e8f8'], floor: (x, y) => E.tex.checker(x, y, { a: '#c8e0f0', b: '#a8c8e0', size: 16 }), layers: [{ kind: 'mountains', color: '#b8c8e0', y: .45 }, { kind: 'castle', color: '#8a98b0', y: .55 }], props: [['p:crystal', 30, 14], ['p:crystal', 250, 14], ['p:pillar', 80, 6], ['p:pillar', 200, 6]], light: '#c8dcff', weather: { kind: 'snow', amount: .3, wind: .1 }, music: 'winter' },
  clock: { sky: ['#0a0810', '#14121c', '#2a2836'], floor: (x, y) => E.tex.flagstone(x, y, { stones: ['#3a3a46', '#4a4a56', '#2e2e3a'].map(E.hex), mortar: E.hex('#14121c'), hi: E.hex('#6a6a76'), lo: E.hex('#22222e'), speck: E.hex('#d8c070') }, 14), layers: [{ kind: 'city', color: '#1a1824', y: .5 }], props: [['bier', 140, 8], ['gear', 30, 4], ['gear', 250, 6], ['p:lamp', 90, 20], ['p:lamp', 190, 20]], light: '#ffe0a0', clock: true, music: 'hourless' },
  tent: { sky: ['#2a3a5a', '#5a6a8a', '#c8a878'], floor: (x, y) => E.tex.dirt(x, y), layers: [{ kind: 'hills', color: '#4a5a3a', y: .6 }], props: [['tent', 40, 6], ['tent', 240, 8], ['maptable', 140, 26], ['p:torch', 100, 30], ['p:torch', 180, 30]], light: '#ffc080', music: 'event' },
  road: { sky: ['#6a90c0', '#a8c8e0', '#e8f0f8'], floor: (x, y) => (Math.abs(y - 40) < 12 ? E.tex.dirt(x, y, { base: '#a88a5a' }) : E.tex.grass(x, y)), layers: [{ kind: 'hills', color: '#5a8a4a', y: .55 }, { kind: 'forest', color: '#3a6a3a', y: .62 }], props: [['tree', 20, 10], ['p:sign', 200, 20], ['rock', 260, 26], ['watermill', 240, 2]], light: '#fff8e0', music: 'event' },
  stable: { sky: ['#5a7aa0', '#90b0d0', '#e0e8f0'], floor: (x, y) => E.tex.dirt(x, y, { base: '#b09060', dark: '#8a6a40', light: '#c8a878' }), layers: [{ kind: 'hills', color: '#6a8a5a', y: .55 }], props: [['p:fence', 30, 10], ['p:fence', 60, 10], ['haybale', 230, 20], ['haybale', 250, 30], ['p:barrel', 200, 8]], light: '#fff0d0', music: 'event' }
};
G.STAGES = STAGES;
const SEASON_STAGE = { verdance: 'orchard', solmark: 'sunhall', amberlyn: 'harvesthall', hoarfast: 'icehall' };
class Stage {
  constructor(id) {
    const st = STAGES[id] || STAGES.road; this.id = id; this.st = st;
    this.map = new E.TileMap({ w: 18, h: 5, floorTex: (x, y) => st.floor(x, y), outside: undefined, ao: 0 });
    this.bg = new E.Backdrop({ sky: st.sky, layers: st.layers || [] });
  }
  draw(r, t, cast) {
    this.bg.draw(r); this.map.drawFloor(r);
    for (const [p, x, y, mats] of this.st.props) { if (p.startsWith('p:')) r.prop(p.slice(2), x, y, 0, { light: true, size: 1.2 }); else r.shape(p, x, y, 0, { mats }); }
    if (this.st.clock) r.queue(140, 2, 0, g => { const q = r.w(140, 2, 70); EUP.disc(g, q[0], q[1], 26, '#d8c070'); EUP.disc(g, q[0], q[1], 24, '#f0e8d8'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; EUP.dot(g, q[0] + Math.cos(a) * 21, q[1] + Math.sin(a) * 21, '#14121c'); } const a = Math.sin(t * 4) * .03 - 1.57; EUP.line(g, q[0], q[1], q[0] + Math.cos(a) * 18, q[1] + Math.sin(a) * 18, '#14121c', 2); EUP.line(g, q[0], q[1], q[0] + Math.cos(a + .02) * 12, q[1] + Math.sin(a + .02) * 12, '#c83a2a', 2); }, { bias: -50 });
    const L = G.game.lights; L.add(140, 30, 40, 220, .5, { color: this.st.light });
  }
}
G.Stage = Stage;

/* ---- the event scene ---- */
const EVS = { t: 0 };
G.SCENES.event = {
  pausable: true, view: 'brawler', input: G.PRESET, camera: { zoom: [1, 1.6], start: 1.15 },
  /** data: { id, realm, sim (a CampaignSim), onDone(choice) } */
  enter(data) {
    const ev = G.get('event', data.id); Object.assign(EVS, { data, ev, t: 0, done: false, choice: 0 });
    const stageId = ev.stage === 'court' ? SEASON_STAGE[data.realm] || 'road' : ev.stage;
    EVS.stage = new Stage(stageId);
    const ctx = data.sim ? data.sim.ctx(data.realm) : null; EVS.ctx = ctx;
    // the cast: who is on stage (the speakers in order, at most six)
    const ids = []; for (const l of ev.lines) { const t = TK.text(l[0], l[1], data.realm, ctx); if (t.sp !== 'narrator' && !ids.includes(t.sp)) ids.push(t.sp); }
    for (const c of ev.cast || []) if (!ids.includes(c) && c !== 'lunete' && c !== 'keeper' && ids.length < 6) ids.push(c);
    EVS.cast = ids.slice(0, 6).map((sp, i, a) => { const w = TK.who(sp, data.realm); const x = 140 + (i - (a.length - 1) / 2) * 30; return { sp, w, x, y: 44, hx: x, hy: 44, facing: Math.PI / 2 + (i < a.length / 2 ? -.8 : .8), pose: null, expr: null, emote: null, et: 0 }; });
    EVS.focus = [140, 40];
    G.game.lights.enabled = true; G.game.lights.ambient = stageId === 'clock' ? .5 : .78;
    G.game.weather = EVS.stage.st.weather || null;
    G.music(stageId === 'clock' ? 'hourless' : ev.ending ? 'ending' : 'event');
    TK.onLine = (w, l) => {
      const c = EVS.cast.find(c => c.w.id === w.id); for (const o of EVS.cast) { o.y = o.hy; o.pose = null; }
      if (c) { c.y = c.hy - 6; c.pose = l.opts.pose || null; c.expr = l.opts.expr || null; if (l.opts.emote) { c.emote = l.opts.emote; c.et = 0; } const others = EVS.cast.filter(o => o !== c), mx = others.length ? G.sum(others, o => o.x) / others.length : c.x; c.facing = Math.PI / 2 + (mx > c.x ? -.9 : .9); EVS.focus = [c.x * .5 + 70, 40]; }
      else EVS.focus = [140, 40];
    };
    TK.run(ev.lines, { realm: data.realm, ctx, choices: data.attract ? null : ev.choices, auto: data.attract ? 2.4 : 0, onChoice: i => { EVS.choice = i; }, onDone: () => this.after() });
  },
  /** after the lines: a choice's follow-up lines, then done */
  after() {
    const ev = EVS.ev, ch = ev.choices && ev.choices[EVS.choice];
    if (ch && ch.lines && !EVS.followed) { EVS.followed = true; TK.run(ch.lines, { realm: EVS.data.realm, ctx: EVS.ctx, onDone: () => this.after() }); return; }
    EVS.done = true; TK.onLine = null;
    const d = EVS.data; EVS.followed = false;
    if (d.onDone) d.onDone(EVS.choice);
  },
  exit() { TK.onLine = null; G.game.weather = null; },
  update(dt) {
    G.inputTick(dt); EVS.t += dt;
    if (EVS.data.attract && G.Attract.watch()) { TK.open = false; TK.q = []; return; }
    for (const c of EVS.cast) { const v = c.w.vis; if (!v) continue; c.et += dt; v.update(dt, { x: c.x, y: c.y, z: 0, vx: 0, vy: 0, facing: c.facing, act: c.pose ? { move: c.pose, k: .5, dur: 9 } : null, expr: c.expr }); }
    G.game.focus(EVS.focus[0], EVS.focus[1], 20);
    TK.update(dt);
  },
  draw(r) {
    EVS.stage.draw(r, EVS.t, EVS.cast);
    for (const c of EVS.cast) {
      if (!c.w.vis) continue;
      r.shadow(c.x, c.y, 7); r.actor(c.x, c.y, 0, (g, ox, oy) => c.w.vis.draw(g, ox, oy, r.view));
      if (c.emote && c.et < 1.6) r.overlay(g => { const q = r.w(c.x, c.y, c.w.vis.headZ() + 14 + Math.sin(c.et * 8) * 1.5); emote(g, q[0], q[1], c.emote); });
    }
    r.overlay(g => { if (EVS.ev.title) G.UI.title(g, EVS.ev.title.toUpperCase(), r.W / 2, 10, { scale: 2 }); });
    TK.draw(r);
  }
};
/** an emote balloon: '!' '?' dots heart note */
function emote(g, x, y, kind) {
  x = Math.round(x); y = Math.round(y);
  EUP.rect(g, x - 7, y - 9, 14, 11, '#14121c'); EUP.rect(g, x - 6, y - 8, 12, 9, '#ffffff'); EUP.poly(g, [[x - 2, y + 1], [x + 2, y + 1], [x, y + 4]], '#ffffff');
  if (kind === '!') { EUP.rect(g, x - 1, y - 7, 2, 5, '#c83a2a'); EUP.rect(g, x - 1, y - 1, 2, 1, '#c83a2a'); }
  else if (kind === '?') E.font.text(g, '?', x, y - 8, '#2a4a8a', { align: 'center' });
  else if (kind === 'heart') E.font.text(g, '♥', x, y - 8, '#e04a6a', { align: 'center' });
  else if (kind === 'note') E.font.text(g, '♪', x, y - 8, '#2a6a3a', { align: 'center' });
  else for (let i = -1; i <= 1; i++) EUP.rect(g, x + i * 3, y - 4, 2, 2, '#3a3a46');
}
G.emote = emote;
