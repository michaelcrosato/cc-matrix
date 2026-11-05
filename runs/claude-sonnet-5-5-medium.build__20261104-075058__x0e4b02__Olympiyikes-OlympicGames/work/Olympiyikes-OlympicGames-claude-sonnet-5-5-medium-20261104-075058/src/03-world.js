// Olympiyikes! world: the eight nations, flags, pictograms, rigs, figures, venues' backdrops, commentators.
(() => {
'use strict';
const E = My3D2dge, O = OLY, { px } = E, game = O.game;

// ---------------------------------------------------------------- nations
// skills: 0..1 per event id (CPU strength), anthem: seed/scale/root/bpm
const MAJ = [0, 2, 4, 7, 9], MIN = [0, 3, 5, 7, 10], LYD = [0, 2, 4, 6, 7, 9];
const N = (id, name, a, b, c, flag, ath, bio, skills, anth) => ({ id, name, colors: { a, b, c }, flag, athlete: ath, bio, skills, anthem: anth });
O.NATIONS = [
  N('SUN', 'SUNVALE', '#f2b632', '#e8541e', '#fff1a8', { kind: 'sun' }, { name: 'BEA SUNNYSIDE', skin: '#f1c9a0', hair: '#c0561e', hairStyle: 'ponytail', build: 'heroic' },
    'Beach volleyball legend who took up ski jumping on a dare.', { sprint: .84, javelin: .8, swim: .9, diving: .88, archery: .75, weights: .7, skijump: .78, downhill: .72, bobsled: .7, figure: .8, curling: .7, hockey: .72 }, { seed: 11, scale: MAJ, root: 0, bpm: 118 }),
  N('FRM', 'FROSTMARK', '#4aa8ff', '#f4fbff', '#1b3a7a', { kind: 'cross' }, { name: 'INGRID ICECLEAT', skin: '#f4d6c0', hair: '#f2e08a', hairStyle: 'long', build: 'heroic' },
    'Has never once felt cold. Bobsled, curling and a suspicious number of pies.', { sprint: .72, javelin: .74, swim: .74, diving: .72, archery: .8, weights: .82, skijump: .9, downhill: .9, bobsled: .92, figure: .88, curling: .94, hockey: .9 }, { seed: 22, scale: MIN, root: 2, bpm: 96 }),
  N('TRB', 'TURBONIA', '#e8443a', '#15151c', '#ffd23a', { kind: 'bolt' }, { name: 'MAX OVERDRIVE', skin: '#e0ac86', hair: '#161616', hairStyle: 'spiky', build: 'bulky' },
    'Defending champion of everything. Will tell you so. Repeatedly.', { sprint: .96, javelin: .9, swim: .92, diving: .86, archery: .86, weights: .94, skijump: .88, downhill: .9, bobsled: .9, figure: .66, curling: .74, hockey: .88 }, { seed: 33, scale: MAJ, root: 7, bpm: 140 }),
  N('GRV', 'GRAVELIA', '#2fb36a', '#f4f4f4', '#7a4a22', { kind: 'vstripes' }, { name: 'GUS GRAVEL', skin: '#c68a5c', hair: '#3a2410', hairStyle: 'short', build: 'bulky' },
    'Hammer thrower retrained as a weightlifter. Lifts the bar, the team and the mood.', { sprint: .74, javelin: .86, swim: .6, diving: .62, archery: .7, weights: .95, skijump: .6, downhill: .66, bobsled: .84, figure: .5, curling: .7, hockey: .78 }, { seed: 44, scale: MIN, root: 9, bpm: 104 }),
  N('PAL', 'PALMIRA', '#18c5b0', '#ff6fa8', '#fff3c0', { kind: 'hstripes' }, { name: 'COCO PALMER', skin: '#8a5a3a', hair: '#1c1008', hairStyle: 'long', build: 'heroic' },
    'Surf champion. Takes the diving board personally.', { sprint: .8, javelin: .66, swim: .96, diving: .95, archery: .66, weights: .6, skijump: .5, downhill: .58, bobsled: .6, figure: .74, curling: .56, hockey: .5 }, { seed: 55, scale: LYD, root: 5, bpm: 124 }),
  N('DRG', 'DRAKONIA', '#8a2be2', '#ffb300', '#2a0f4a', { kind: 'diag' }, { name: 'DRAGOMIR FLAME', skin: '#e9c0a0', hair: '#7a1c1c', hairStyle: 'spiky', build: 'bulky' },
    'Archer, weightlifter and part-time knight. Insists on a dramatic entrance.', { sprint: .66, javelin: .84, swim: .64, diving: .6, archery: .96, weights: .86, skijump: .66, downhill: .7, bobsled: .72, figure: .6, curling: .62, hockey: .74 }, { seed: 66, scale: MIN, root: 4, bpm: 112 }),
  N('BLZ', 'BLIZZARIA', '#7de0ff', '#2a4fa8', '#ffffff', { kind: 'stars' }, { name: 'BLITZ SNOWDEN', skin: '#f0d0b8', hair: '#4aa8ff', hairStyle: 'spiky', build: 'heroic' },
    'Ski jumper with a wingspan problem (a good problem).', { sprint: .6, javelin: .62, swim: .6, diving: .66, archery: .7, weights: .66, skijump: .96, downhill: .94, bobsled: .8, figure: .82, curling: .8, hockey: .84 }, { seed: 77, scale: MAJ, root: 2, bpm: 132 }),
  N('WHL', 'WHEELMARK', '#ff9f1c', '#2b6cb0', '#e8f0ff', { kind: 'disc' }, { name: 'PENNY PEDAL', skin: '#d9a77c', hair: '#8a4b1c', hairStyle: 'ponytail', build: 'heroic' },
    'Cyclist who got lost and ended up at the figure skating.', { sprint: .9, javelin: .6, swim: .7, diving: .76, archery: .72, weights: .62, skijump: .6, downhill: .74, bobsled: .66, figure: .96, curling: .66, hockey: .6 }, { seed: 88, scale: LYD, root: 10, bpm: 120 })
];
O.NAT = {}; O.NATIONS.forEach(n => { O.NAT[n.id] = n; });
O.natIdx = id => O.NATIONS.findIndex(n => n.id === id);

// ---------------------------------------------------------------- flags (w x h pixels; no assets)
O.flag = (g, x, y, w, h, nat, wave = 0) => {
  const { a, b, c } = nat.colors, k = nat.flag.kind;
  px.rect(g, x, y, w, h, a);
  if (k === 'hstripes') { px.rect(g, x, y + h / 3, w, h / 3, b); px.rect(g, x, y + 2 * h / 3, w, h / 3, c); }
  else if (k === 'vstripes') { px.rect(g, x + w / 3, y, w / 3, h, b); px.rect(g, x + 2 * w / 3, y, w / 3, h, c); }
  else if (k === 'cross') { px.rect(g, x, y, w, h, b); px.rect(g, x + w * .28, y, w * .16, h, a); px.rect(g, x, y + h * .4, w, h * .2, a); px.rect(g, x + w * .32, y, w * .08, h, c); px.rect(g, x, y + h * .45, w, h * .1, c); }
  else if (k === 'sun') { px.rect(g, x, y, w, h, b); px.disc(g, x + w / 2, y + h / 2, h * .32, a); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; px.line(g, x + w / 2 + Math.cos(an) * h * .36, y + h / 2 + Math.sin(an) * h * .36, x + w / 2 + Math.cos(an) * h * .5, y + h / 2 + Math.sin(an) * h * .5, c, 1); } }
  else if (k === 'bolt') { px.rect(g, x, y, w, h, b); px.poly(g, [[x + w * .55, y + 1], [x + w * .25, y + h * .55], [x + w * .5, y + h * .55], [x + w * .4, y + h - 1], [x + w * .75, y + h * .4], [x + w * .5, y + h * .4]], c); px.rect(g, x, y, w, 2, a); px.rect(g, x, y + h - 2, w, 2, a); }
  else if (k === 'diag') { px.rect(g, x, y, w, h, b); px.poly(g, [[x, y], [x + w * .7, y], [x, y + h]], a); px.poly(g, [[x + w, y + h], [x + w * .3, y + h], [x + w, y]], c); }
  else if (k === 'stars') { px.rect(g, x, y, w, h, b); for (let i = 0; i < 5; i++) px.rect(g, x + 4 + (i % 3) * w * .3, y + 4 + Math.floor(i / 3) * h * .45, 3, 3, c); px.rect(g, x, y + h * .85, w, h * .15, a); }
  else if (k === 'disc') { px.rect(g, x, y, w, h, c); px.disc(g, x + w / 2, y + h / 2, h * .34, a); px.disc(g, x + w / 2, y + h / 2, h * .2, b); }
  px.rect(g, x, y, w, 1, 'rgba(255,255,255,.35)'); px.rect(g, x, y + h - 1, w, 1, 'rgba(0,0,0,.35)');
  px.rect(g, x - 1, y - 1, w + 2, 1, '#10142c'); px.rect(g, x - 1, y + h, w + 2, 1, '#10142c'); px.rect(g, x - 1, y, 1, h, '#10142c'); px.rect(g, x + w, y, 1, h, '#10142c');
};

// ---------------------------------------------------------------- pictograms (the Games' look)
O.PICTO = {
  sprint: (g, cx, cy, s, c) => { px.disc(g, cx + 1 * s, cy - 6 * s, 1.6 * s, c); px.line(g, cx + 1 * s, cy - 4 * s, cx - 1 * s, cy + 1 * s, c, 2 * s); px.line(g, cx - 1 * s, cy + 1 * s, cx + 3 * s, cy + 4 * s, c, 1.5 * s); px.line(g, cx - 1 * s, cy + 1 * s, cx - 5 * s, cy + 5 * s, c, 1.5 * s); px.line(g, cx, cy - 3 * s, cx + 4 * s, cy - 1 * s, c, 1.5 * s); px.line(g, cx, cy - 3 * s, cx - 4 * s, cy - 5 * s, c, 1.5 * s); },
  javelin: (g, cx, cy, s, c) => { px.line(g, cx - 7 * s, cy + 4 * s, cx + 7 * s, cy - 5 * s, c, 1.4 * s); px.poly(g, [[cx + 7 * s, cy - 5 * s], [cx + 3 * s, cy - 5 * s], [cx + 5 * s, cy - 1 * s]], c); px.disc(g, cx - 5 * s, cy - 4 * s, 1.6 * s, c); px.line(g, cx - 5 * s, cy - 2 * s, cx - 5 * s, cy + 3 * s, c, 1.6 * s); },
  swim: (g, cx, cy, s, c) => { px.disc(g, cx + 5 * s, cy - 2 * s, 1.5 * s, c); px.line(g, cx + 3 * s, cy - 1 * s, cx - 4 * s, cy, c, 2 * s); px.line(g, cx - 4 * s, cy, cx - 7 * s, cy + 1 * s, c, 1.4 * s); for (let i = 0; i < 3; i++) px.line(g, cx - 7 * s + i * 5 * s, cy + 4 * s, cx - 4 * s + i * 5 * s, cy + 3 * s, c, 1.1 * s); },
  diving: (g, cx, cy, s, c) => { px.rect(g, cx - 7 * s, cy - 6 * s, 6 * s, 1.5 * s, c); px.disc(g, cx + 2 * s, cy + 3 * s, 1.5 * s, c); px.line(g, cx + 1 * s, cy + 1 * s, cx - 1 * s, cy - 4 * s, c, 2 * s); px.line(g, cx + 1 * s, cy + 2 * s, cx + 4 * s, cy + 5 * s, c, 1.3 * s); },
  archery: (g, cx, cy, s, c) => { px.disc(g, cx + 2 * s, cy, 6 * s, c); px.disc(g, cx + 2 * s, cy, 4 * s, '#10142c'); px.disc(g, cx + 2 * s, cy, 2.4 * s, c); px.line(g, cx - 8 * s, cy + 6 * s, cx + 2 * s, cy, c, 1.2 * s); },
  weights: (g, cx, cy, s, c) => { px.rect(g, cx - 8 * s, cy - 1 * s, 16 * s, 1.6 * s, c); px.rect(g, cx - 8 * s, cy - 4 * s, 2 * s, 8 * s, c); px.rect(g, cx + 6 * s, cy - 4 * s, 2 * s, 8 * s, c); px.disc(g, cx, cy + 3 * s, 1.6 * s, c); px.line(g, cx, cy + 4 * s, cx, cy + 7 * s, c, 2 * s); },
  skijump: (g, cx, cy, s, c) => { px.line(g, cx - 8 * s, cy - 4 * s, cx + 1 * s, cy + 2 * s, c, 1.6 * s); px.line(g, cx - 4 * s, cy - 8 * s, cx + 6 * s, cy - 2 * s, c, 1.2 * s); px.disc(g, cx + 6 * s, cy - 4 * s, 1.5 * s, c); },
  downhill: (g, cx, cy, s, c) => { px.poly(g, [[cx - 8 * s, cy + 5 * s], [cx, cy - 6 * s], [cx + 8 * s, cy + 5 * s]], c); px.poly(g, [[cx - 3 * s, cy + 5 * s], [cx, cy], [cx + 3 * s, cy + 5 * s]], '#10142c'); px.line(g, cx - 6 * s, cy + 6 * s, cx + 6 * s, cy + 6 * s, c, 1.2 * s); },
  bobsled: (g, cx, cy, s, c) => { px.rect(g, cx - 8 * s, cy - 2 * s, 16 * s, 4 * s, c); px.poly(g, [[cx + 8 * s, cy - 2 * s], [cx + 8 * s, cy + 2 * s], [cx + 10 * s, cy]], c); px.line(g, cx - 8 * s, cy + 5 * s, cx + 8 * s, cy + 5 * s, c, 1.2 * s); px.disc(g, cx - 2 * s, cy - 4 * s, 1.6 * s, c); px.disc(g, cx + 3 * s, cy - 4 * s, 1.6 * s, c); },
  figure: (g, cx, cy, s, c) => { px.disc(g, cx, cy - 6 * s, 1.6 * s, c); px.line(g, cx, cy - 4 * s, cx, cy + 1 * s, c, 2 * s); px.line(g, cx, cy - 3 * s, cx - 6 * s, cy - 6 * s, c, 1.3 * s); px.line(g, cx, cy - 3 * s, cx + 6 * s, cy - 6 * s, c, 1.3 * s); px.line(g, cx, cy + 1 * s, cx + 4 * s, cy + 5 * s, c, 1.4 * s); px.line(g, cx, cy + 1 * s, cx - 5 * s, cy + 3 * s, c, 1.4 * s); },
  curling: (g, cx, cy, s, c) => { px.disc(g, cx, cy + 1 * s, 6 * s, c); px.disc(g, cx, cy + 1 * s, 4 * s, '#10142c'); px.rect(g, cx - 1 * s, cy - 7 * s, 2 * s, 3 * s, c); px.rect(g, cx - 3 * s, cy - 8 * s, 6 * s, 1.5 * s, c); },
  hockey: (g, cx, cy, s, c) => { px.line(g, cx - 6 * s, cy - 6 * s, cx + 1 * s, cy + 4 * s, c, 1.8 * s); px.line(g, cx + 1 * s, cy + 4 * s, cx + 6 * s, cy + 4 * s, c, 2 * s); px.ell ? px.ell(g, cx + 6 * s, cy + 7 * s, 3 * s, 1.5 * s, c) : px.disc(g, cx + 6 * s, cy + 7 * s, 1.6 * s, c); }
};
O.picto = (g, id, cx, cy, s, c = '#fff', ring = '#f2b632') => { px.disc(g, cx, cy, 10 * s + 1, ring); px.disc(g, cx, cy, 10 * s - 1, '#10285a'); O.PICTO[id](g, cx, cy, s * .85, c); };
// the emblem: five rings with a flame
O.emblem = (g, cx, cy, s = 1) => {
  const cols = ['#3b82f6', '#fcd34d', '#222', '#22c55e', '#ef4444'], pos = [[-12, -3], [0, -3], [12, -3], [-6, 4], [6, 4]];
  pos.forEach(([dx, dy], i) => { px.disc(g, cx + dx * s, cy + dy * s, 6 * s, cols[i]); px.disc(g, cx + dx * s, cy + dy * s, 4 * s, '#0b0f24'); });
  px.poly(g, [[cx, cy - 18 * s], [cx - 3 * s, cy - 11 * s], [cx + 3 * s, cy - 11 * s]], '#ff8a1c'); px.poly(g, [[cx, cy - 15 * s], [cx - 1.5 * s, cy - 11 * s], [cx + 1.5 * s, cy - 11 * s]], '#ffe27a');
};

// ---------------------------------------------------------------- rigs (HD humanoids dressed per nation)
O.makeRig = (nat, o = {}) => {
  const a = nat.athlete;
  return new E.Humanoid({ size: o.size || 1.2, build: a.build || 'heroic', weapon: null, outfit: 'shirt', sleeves: o.sleeves || 'none', hair: a.hairStyle, hat: o.hat || null,
    colors: { skin: a.skin, hair: a.hair, cloth: nat.colors.a, coat: nat.colors.a, pants: o.pants || nat.colors.b, boot: o.boot || '#f4f4f4', trim: nat.colors.c, belt: nat.colors.c, glove: o.glove || nat.colors.c } });
};
// generic crowd member colors
O.CROWD = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700', '#ff8fd8', '#7fe0ff', '#ffffff', '#ff9f1c'];

// ---------------------------------------------------------------- stick-puppet figure used for rotated bodies (dives, flights, skating)
// pose: angles in radians relative to the torso axis; ang = torso direction (0 = pointing right). Draws limbs with volume.
O.drawFig = (g, x, y, ang, pose, nat, s = 1) => {
  const L = 7 * s, c = nat.colors, skin = nat.athlete.skin, hair = nat.athlete.hair;
  const P = (dx, dy) => { const ca = Math.cos(ang), sa = Math.sin(ang); return [x + dx * ca - dy * sa, y + dx * sa + dy * ca]; };
  const limb = (from, an, len, col, w) => { const a2 = ang + an, to = [from[0] + Math.cos(a2) * len, from[1] + Math.sin(a2) * len]; px.line(g, from[0], from[1], to[0], to[1], col, w); return to; };
  const hip = P(-L * .8, 0), sh = P(L * .8, 0), hd = P(L * 1.55, 0);
  const o = Object.assign({ armA: 0, armB: 0, legA: Math.PI, legB: Math.PI, head: 0, kneeA: 0, kneeB: 0, elbA: 0, elbB: 0 }, pose);
  const knA = limb(hip, o.legA, L * .9, c.b, 3.2 * s); limb(knA, o.legA + o.kneeA, L * .9, c.b, 2.8 * s);
  const knB = limb(hip, o.legB, L * .9, c.b, 3.2 * s); limb(knB, o.legB + o.kneeB, L * .9, c.b, 2.8 * s);
  px.line(g, hip[0], hip[1], sh[0], sh[1], c.a, 5 * s); px.line(g, hip[0] + (sh[0] - hip[0]) * .1, hip[1] + (sh[1] - hip[1]) * .1, sh[0], sh[1], c.c, 1.5 * s);
  const elA = limb(sh, o.armA, L * .75, skin, 2.4 * s); limb(elA, o.armA + o.elbA, L * .7, skin, 2.2 * s);
  const elB = limb(sh, o.armB, L * .75, skin, 2.4 * s); limb(elB, o.armB + o.elbB, L * .7, skin, 2.2 * s);
  px.disc(g, hd[0], hd[1], 3.4 * s, skin); const hh = P(L * 1.55 + 1.2 * s, -1 * s); px.disc(g, hh[0], hh[1], 3.1 * s, hair);
  px.disc(g, hd[0] + Math.cos(ang) * 0.5, hd[1] + Math.sin(ang) * 0.5, 1.9 * s, skin);
};

// ---------------------------------------------------------------- commentators (two hyperventilating pros)
O.COMMS = {
  BIFF: { name: 'BIFF BANNISTER', pitch: 190, wave: 'square', color: '#7fe0ff' },
  ELOISE: { name: 'DAME ELOISE GASP', pitch: 330, wave: 'triangle', color: '#ffb0e8', lilt: true }
};
const B = {
  start: [['BIFF', 'We are LIVE from Mount Glory-Sunny Bay, where the snow meets the sunscreen!'], ['ELOISE', 'Oh my stars, oh my stars, I need a paper bag. Ready? Ready!'], ['BIFF', 'Faster! Higher! And, statistically, Yikes-er!']],
  good: [['BIFF', 'Now THAT is what the brochure promised!'], ['ELOISE', 'Poetry! Poetry in a very small shorts!'], ['BIFF', 'Smooth as a freshly polished cauldron!']],
  great: [['ELOISE', 'I am physically unable to blink!'], ['BIFF', 'Somebody call the record books and tell them to sit down!'], ['ELOISE', 'GOLD-ish! Definitely gold-ish!']],
  bad: [['BIFF', 'That did not go to plan. Or to any plan.'], ['ELOISE', 'Oh, the humanity! Oh, the hamstring!'], ['BIFF', 'Well. We can all agree that was a choice.']],
  yikes: [['ELOISE', 'OLYMPIYIKES! I said OLYMPIYIKES!'], ['BIFF', 'And the crowd goes: ooooh-ahhh-OW!'], ['ELOISE', 'My eyes! The replay! Not the replay!']],
  record: [['BIFF', 'A WORLD RECORD! Fetch the fireworks! Fetch ALL of the fireworks!'], ['ELOISE', 'Is it legal for a human to do that? Check the rule book! Never mind!']],
  rival: [['BIFF', 'And there goes Max Overdrive, telling the judges how good he is.'], ['ELOISE', 'He is wearing sunglasses on a glacier, Biff.']],
  hype: [['ELOISE', 'The flame! The hype flame is FULL!'], ['BIFF', 'Hit the turbo! Hit the turbo! Hit it with a big hammer!']],
  qual: [['BIFF', 'No qualifying mark. The torch dims. A moment of silence, please.'], ['ELOISE', 'Sad trombone, maestro.']]
};
O.COMMS_BANK = B;
O.Comms = {
  cur: null, q: [], last: {},
  say(kind, who) {
    if (game.settings.commentary === 'Off') return;
    const bank = B[kind]; if (!bank) return; const r = O.rng('comms:' + kind + ':' + Math.floor(game.real * 3));
    let i = Math.floor(r() * bank.length); if (this.last[kind] === i) i = (i + 1) % bank.length; this.last[kind] = i;
    const [w, t] = bank[i]; this.sayRaw(w, t);
  },
  sayRaw(w, t, dur) {
    if (game.settings.commentary === 'Off') return;
    const c = O.COMMS[w] || O.COMMS.BIFF; this.cur = { w, name: c.name, col: c.color, txt: t, t: dur || Math.max(2.6, t.length * .06), age: 0 };
    O.Voice.say(t, c);
  },
  update(dt) { if (this.cur) { this.cur.age += dt; this.cur.t -= dt; if (this.cur.t <= 0) this.cur = null; } },
  clear() { this.cur = null; },
  draw(g, r) {
    const c = this.cur; if (!c) return;
    const s = game.settings.textSize === 'Huge' ? 2 : 1, w = Math.min(r.W - 140, 280), lines = E.font.wrap(c.txt, w - 16, { scale: s }), h = 14 + lines.length * (7 * s + 3);
    const pos = O.cur === 'play' ? 'top' : (O.cur === 'opening' || O.cur === 'podium') ? 'bottom' : 'none'; if (pos === 'none') return;
    const y = pos === 'top' ? 30 : r.H - 28 - h, x0 = pos === 'top' ? 8 : (r.W - w) / 2; px.rect(g, x0, y, w, h, 'rgba(10,12,44,.9)'); px.rect(g, x0, y, 3, h, c.col);
    O.T(g, c.name, x0 + 8, y + 3, c.col, { s: 1 });
    lines.forEach((l, i) => O.T(g, l, x0 + 8, y + 12 + i * (7 * s + 3), '#fff', { s }));
  }
};

// ---------------------------------------------------------------- backdrops per venue
const bd = {};
O.backdrop = id => {
  if (bd[id]) return bd[id];
  const defs = {
    stadium: { sky: ['#ff9f5a', '#ffd7a0', '#fff1c8'], sun: { x: .72, y: .3, color: '#fff6c8' }, layers: [{ kind: 'clouds', color: '#fff4e0', y: .12, parallax: .1 }, { kind: 'hills', color: '#7a9a6a', y: .62, height: .2, parallax: .2 }, { kind: 'city', color: '#6f7aa8', y: .66, height: .16, parallax: .3 }] },
    pool: { sky: ['#6ec6ff', '#a8e4ff', '#e0f6ff'], layers: [{ kind: 'clouds', color: '#fff', y: .14, parallax: .1 }, { kind: 'city', color: '#7aa8d8', y: .6, height: .2, parallax: .25 }] },
    range: { sky: ['#8ad0ff', '#c8ecff', '#f0ffe8'], layers: [{ kind: 'clouds', color: '#fff', y: .1, parallax: .08 }, { kind: 'hills', color: '#5aa860', y: .55, height: .24, parallax: .2 }, { kind: 'forest', color: '#2f7a48', y: .66, height: .14, parallax: .3 }] },
    hall: { sky: ['#1a1646', '#2a2468', '#4a3a88'], layers: [{ kind: 'city', color: '#241f5a', y: .5, height: .3, parallax: .1 }] },
    snow: { sky: ['#bfe3ff', '#e6f6ff', '#ffffff'], layers: [{ kind: 'clouds', color: '#fff', y: .1, parallax: .08 }, { kind: 'mountains', color: '#9fc0e8', y: .5, height: .28, parallax: .15 }, { kind: 'forest', color: '#3a6a58', y: .68, height: .12, parallax: .3 }] },
    ice: { sky: ['#101a40', '#223a78', '#4a6ab0'], layers: [{ kind: 'city', color: '#1a2860', y: .55, height: .22, parallax: .1 }] },
    night: { sky: ['#07091e', '#101a48', '#243a82'], layers: [{ kind: 'mountains', color: '#16224e', y: .55, height: .22, parallax: .12 }] }
  };
  const d = defs[id] || defs.stadium; bd[id] = new E.Backdrop(d); return bd[id];
};
// lamp-lit crowd stands drawn as a band of colored pixels with waves; excitement 0..1
O.stands = (g, r, y, h, seed, excite = .3, camx = 0) => {
  const rn = E.rng(seed); px.rect(g, 0, y, r.W, h, '#1a1d3e');
  for (let row = 0; row < h / 5; row++) {
    for (let x = -((camx * (.4 + row * .02)) % 7); x < r.W; x += 7) {
      const k = Math.floor(rn() * 8), bob = Math.sin(game.real * (3 + excite * 8) + x * .4 + row) * excite * 2;
      px.rect(g, x, y + row * 5 + 1 + bob, 4, 4, O.CROWD[k]); px.rect(g, x + 1, y + row * 5 - 1 + bob, 2, 2, '#f1c9a0');
    }
  }
  px.rect(g, 0, y + h, r.W, 3, '#0c0f2a');
};
// fireworks: list of bursts with a simple particle spray
O.Fireworks = {
  list: [],
  burst(x, y, col) { const n = 22; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, sp = 30 + (i % 3) * 14; this.list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 1.2, col: col || O.CROWD[i % 8] }); } O.sfx('ol_firework'); },
  update(dt) { for (const p of this.list) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; } this.list = this.list.filter(p => p.t < p.life); },
  draw(g) { for (const p of this.list) { const a = 1 - p.t / p.life; px.rect(g, p.x, p.y, a > .5 ? 2 : 1, a > .5 ? 2 : 1, p.col); } },
  clear() { this.list = []; }
};
})();
