/* ---- THE CAST: HD rigs, dressed. Every character has a palette of their own ---- */
const H = o => new E.Humanoid(Object.assign({ size: 1.3, weapon: null }, o, H.extra || {}));
const rigOf = (who, robe, extra) => { H.extra = extra || null; try { return CAST[who].make(robe); } finally { H.extra = null; } };
const CAST = {
  sal: { name: 'SAL BARITONE', voice: { base: 92, wave: 'saw' },
    make: robe => H({ build: 'bulky', size: 1.4, hair: 'short', outfit: robe ? 'robe' : 'coat', sleeves: robe ? 'long' : 'short',
      colors: robe ? { skin: '#e8b48c', hair: '#2a2420', cloth: '#f4f0e8', coat: '#ece6da', trim: '#c8bca8', belt: '#c8bca8', pants: '#e8e2d4', boot: '#5a3a2a', eye: '#3a2a1a' }
                   : { skin: '#e8b48c', hair: '#2a2420', cloth: '#2c3a5a', coat: '#3a3a40', trim: '#c8a860', belt: '#1a1a1e', pants: '#2a2a30', boot: '#1a1414', glove: '#e8b48c', eye: '#3a2a1a' } }) },
  nicky: { name: 'NICKY', voice: { base: 150, wave: 'pulse' },
    make: () => H({ build: 'heroic', hair: 'spiky', outfit: 'coat', sleeves: 'long', colors: { skin: '#f0c4a0', hair: '#1a1410', cloth: '#d8d4cc', coat: '#3a2418', trim: '#5a3a28', pants: '#2a2a34', boot: '#141010', eye: '#2a4a3a' } }) },
  gino: { name: 'GINO "PISTACHIO" PALMIERI', voice: { base: 130, wave: 'square' },
    make: () => H({ build: 'heroic', hair: 'short', sleeves: 'long', colors: { skin: '#e8c0a0', hair: '#e8e8f0', cloth: '#2a2a2a', trim: '#f0f0f0', pants: '#2a2a2a', boot: '#f0f0f0', belt: '#c8c8c8', eye: '#2a2a3a' } }) },
  frankie: { name: 'FRANKIE "THE WIG" VITALE', voice: { base: 120, wave: 'pulse12' },
    make: () => H({ build: 'heroic', hair: 'spiky', outfit: 'coat', colors: { skin: '#e8c0a0', hair: '#141018', cloth: '#5a1a28', coat: '#202024', trim: '#c8c8d0', pants: '#202024', boot: '#141010', eye: '#2a2a3a' } }) },
  donna: { name: 'DONNA', voice: { base: 250, wave: 'triangle' },
    make: () => H({ size: 1.25, hair: 'long', outfit: 'robe', sleeves: 'long', colors: { skin: '#f4d0b0', hair: '#e8c070', cloth: '#e890a8', trim: '#f8c8d8', belt: '#f8c8d8', pants: '#e890a8', boot: '#f0e0e0', eye: '#3a5a8a' } }) },
  melfi: { name: 'DR. MARCHETTI', voice: { base: 220, wave: 'sine' },
    make: () => H({ size: 1.25, hair: 'long', outfit: 'coat', sleeves: 'long', colors: { skin: '#f0c8a8', hair: '#8a3a20', cloth: '#e8e0d0', coat: '#3a3a4a', trim: '#8a8aa0', pants: '#3a3a4a', boot: '#1a1a1e', eye: '#4a3a2a' } }) },
  baker: { name: 'ROSARIA (DOLCE VITA)', voice: { base: 240, wave: 'triangle' },
    make: () => H({ size: 1.2, hair: 'ponytail', sleeves: 'short', colors: { skin: '#e8b890', hair: '#3a2a20', cloth: '#f4f0e8', trim: '#e8a0b0', pants: '#f4f0e8', boot: '#e8e0d8', eye: '#3a2a1a' } }) },
  laundry: { name: 'MURRAY (SPIN CITY)', voice: { base: 170, wave: 'pulse' },
    make: () => H({ size: 1.2, build: 'chibi', hair: 'bald', sleeves: 'short', hunch: .3, colors: { skin: '#f0c8a8', cloth: '#7ab0d8', trim: '#f4f4f4', pants: '#5a5a6a', boot: '#3a3a3a', eye: '#2a2a3a' } }) },
  chef: { name: 'ARTURO (IL GABBIANO)', voice: { base: 145, wave: 'square' },
    make: () => H({ size: 1.3, build: 'bulky', hair: 'short', hat: { style: 'band', color: '#f4f4f4' }, sleeves: 'long', colors: { skin: '#e0b090', hair: '#4a3020', cloth: '#f8f8f4', trim: '#c83030', pants: '#2a2a2a', boot: '#1a1a1a', eye: '#2a2a1a' } }) },
  sully: { name: 'SULLY (PRE-OWNED)', voice: { base: 135, wave: 'saw' },
    make: () => H({ size: 1.3, hair: 'short', sleeves: 'short', colors: { skin: '#f0c0a0', hair: '#c87a3a', cloth: '#e8d050', trim: '#a83030', pants: '#6a5a40', boot: '#3a2a1a', eye: '#3a6a3a' } }) },
  carmine: { name: 'CARMINE "THE TENOR" FALSETTI', voice: { base: 330, wave: 'pulse' },
    make: () => H({ size: 1.6, build: 'heroic', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#e8c0a0', hair: '#6a6a70', cloth: '#1a1a1e', coat: '#e8e4dc', trim: '#c8a040', pants: '#e8e4dc', boot: '#f0f0f0', eye: '#2a2a2a' } }) },
  lenny: { name: 'LENNY THE LEDGER', voice: { base: 290, wave: 'pulse12' },
    make: () => H({ size: 1.2, hair: 'short', outfit: 'coat', sleeves: 'long', hunch: .2, colors: { skin: '#f4d8c0', hair: '#a87a4a', cloth: '#d8d8c8', coat: '#5a6a3a', trim: '#3a4a2a', pants: '#4a4a3a', boot: '#2a2a2a', eye: '#2a2a2a' } }) },
  waitress: { name: 'WAITRESS', voice: { base: 260, wave: 'triangle' },
    make: () => H({ size: 1.2, hair: 'ponytail', sleeves: 'short', colors: { skin: '#f0c8a0', hair: '#b04a2a', cloth: '#f0a0b0', trim: '#ffffff', pants: '#f0a0b0', boot: '#ffffff', eye: '#2a2a3a' } }) },
  meadow: { name: 'GIA', voice: { base: 280, wave: 'triangle' },
    make: () => H({ size: 1.2, hair: 'long', sleeves: 'long', colors: { skin: '#f4d0b0', hair: '#2a1a14', cloth: '#5a4a8a', trim: '#e8d8f0', pants: '#2a2a3a', boot: '#2a2020', eye: '#3a2a1a' } }) },
  aj: { name: 'JUNIOR', voice: { base: 200, wave: 'pulse' },
    make: () => H({ size: 1.15, hair: 'spiky', sleeves: 'short', colors: { skin: '#f4d0b0', hair: '#2a1a14', cloth: '#3a3a3a', trim: '#c83030', pants: '#3a4a6a', boot: '#e8e8e8', eye: '#3a2a1a' } }) }
};
for (const k in CAST) VOICES[k] = CAST[k].voice;
VOICES.goon = { base: 300, wave: 'pulse' }; VOICES.radio = { base: 200, wave: 'square' };

// the Falsettis: tracksuits in their colors; bruisers carry bats; gunmen point
const FOE_KINDS = {
  goon: { hp: 55, speed: 46, dmg: 9, look: () => H({ hair: E.pick(['short', 'spiky', 'bald']), sleeves: 'long', colors: { skin: E.pick(['#e8c0a0', '#d8a888', '#f0c8a8']), hair: '#1a1410', cloth: '#5a2a7a', trim: '#e8e8e8', pants: '#5a2a7a', boot: '#e8e8e8', eye: '#2a2a2a' } }), moves: ['jab', 'hook'], cash: [20, 60] },
  bruiser: { hp: 100, speed: 36, dmg: 16, look: () => H({ build: 'bulky', size: 1.45, weapon: 'staff', hair: 'bald', sleeves: 'none', colors: { skin: '#d8a888', cloth: '#2a6a6a', trim: '#e8e8e8', pants: '#2a2a2a', boot: '#1a1a1a', metal: '#8a6a3a', eye: '#2a2a2a' } }), moves: ['overhead', 'haymaker'], cash: [50, 120] },
  gunman: { hp: 45, speed: 40, dmg: 12, ranged: true, look: () => H({ weapon: 'gun', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#e8c0a0', hair: '#3a2a1a', cloth: '#1a1a1a', coat: '#4a3a5a', trim: '#8a8a8a', pants: '#2a2a2a', boot: '#1a1a1a', metal: '#3a3a3a', eye: '#2a2a2a' } }), moves: [], cash: [40, 90] },
  boss: { hp: 520, speed: 52, dmg: 18, look: () => CAST.carmine.make(), moves: ['haymaker', 'roundhouse', 'uppercut'], cash: [0, 0] },
  bagman: { hp: 140, speed: 44, dmg: 11, look: () => CAST.lenny.make(), moves: ['jab', 'kick'], cash: [0, 0] }
};

/* ---- sprites: money, food, ammo, the newspaper, ducks ---- */
const SPR = {
  cash: E.sprite(['GGGGGG', 'GgWWgG', 'GWggWG', 'GgWWgG', 'GGGGGG'], { G: '#2e8a3a', g: '#5ac060', W: '#e8f8d0' }),
  envelope: E.sprite(['WWWWWWWW', 'WwWWWWwW', 'WWwWWwWW', 'WWWwwWWW', 'WWWWWWWW'], { W: '#f0e8d0', w: '#a89878' }),
  gabagool: E.sprite(['..pppp..', '.pPPPPp.', 'pPwPPwPp', 'pPPPPPPp', '.pPPPPp.', '..pppp..'], { p: '#a83a3a', P: '#e88a8a', w: '#fff0f0' }),
  cannoli: E.sprite(['yy....yy', 'yYwwwwYy', 'yYwwwwYy', 'yy....yy'], { y: '#c88a3a', Y: '#e8b060', w: '#fff8e8' }),
  ammo: E.sprite(['.yy.yy.', '.YY.YY.', '.YY.YY.', '.bb.bb.'], { y: '#f0d060', Y: '#c8a040', b: '#6a5030' }),
  paper: E.sprite(['wwwwwwww', 'wbbwbbbw', 'wwwwwwww', 'wbwbbwbw', 'wwwwwwww'], { w: '#e8e4d8', b: '#5a5a6a' }),
  bread: E.sprite(['..yyy..', '.yYYYy.', 'yYYwYYy', '.yyyyy.'], { y: '#a86a2a', Y: '#d89a4a', w: '#f0d090' }),
  bag: E.sprite(['..bb..', '.bBBb.', 'bB$$Bb', 'bBBBBb', '.bbbb.'], { b: '#6a5a3a', B: '#9a8a5a', $: '#3ac04a' }),
  shoe: E.sprite(['bb....', 'bBbbbb', 'bBBBBb', 'bbbbbb'], { b: '#2a2018', B: '#5a4030' })
};
const DUCK = [0, 1].map(f => E.sprite(f ? ['..gg....', '.gGge...', '..gg....', 'bbbbbb..', 'bBBBBBb.', '.bbbbb..'] : ['..gg....', '.gGgee..', '..gg....', '.bbbbbb.', 'bBBBBBBb', '.bbbbbb.'],
  { g: '#2a7a3a', G: '#5ac06a', e: '#f0b020', b: '#7a5a3a', B: '#b08a5a' }, 1));
const DUCK_FLY = E.sprite(['w......w', 'ww.gg.ww', '.wbGgbw.', '..bbbe..', '...bb...'], { w: '#b08a5a', g: '#2a7a3a', G: '#5ac06a', b: '#7a5a3a', e: '#f0b020' });

/* ---- a car, drawn from its heading: a lower body, a cabin, glass, lights; any view and turn ---- */
const CAR_PAL = {
  suv: { body: '#1a1a20', cabin: '#24242c', glass: '#5a7a9a', trim: '#c8c8d0', len: 16, wid: 8.5, h: 9, roof: 15 },
  sedan: { body: '#8a1a1a', cabin: '#7a1616', glass: '#6a8aaa', trim: '#d8d8d8', len: 15, wid: 7.5, h: 7, roof: 12 },
  cab: { body: '#e8c020', cabin: '#d8b018', glass: '#6a8aaa', trim: '#1a1a1a', len: 15, wid: 7.5, h: 7, roof: 12 },
  van: { body: '#e8e8e0', cabin: '#e0e0d8', glass: '#5a6a8a', trim: '#3a8a3a', len: 17, wid: 8.5, h: 9, roof: 16 },
  truck: { body: '#3a6a3a', cabin: '#e8e8e0', glass: '#5a6a8a', trim: '#e8c020', len: 26, wid: 10, h: 12, roof: 22 },
  cop: { body: '#1a1a3a', cabin: '#f0f0f0', glass: '#5a6a8a', trim: '#e8e8e8', len: 15, wid: 7.5, h: 7, roof: 12 }
};
function drawCar(r, c, kind, o = {}) {
  const K = CAR_PAL[kind] || CAR_PAL.sedan, a = c.angle, ca = Math.cos(a), sa = Math.sin(a), z0 = (c.z || 0) + 2;
  const W = (f, s, z) => r.w(c.x + ca * f - sa * s, c.y + sa * f + ca * s, z);
  r.shadow(c.x, c.y, K.len * .85, .4, '#000000');
  r.queue(c.x, c.y, z0, g => {
    const tb = E.tones(o.color || K.body), tc = E.tones(K.cabin);
    const box = (L0, L1, S, Z0, Z1, top, side, side2) => {
      const P = [[L1, -S], [L1, S], [L0, S], [L0, -S]];
      const faces = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([i, j]) => {
        const p0 = P[i], p1 = P[j], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        return { i, j, d: W(mx, my, Z0)[1], mx };
      }).sort((u, v) => u.d - v.d);
      for (const f of faces) {
        const p0 = P[f.i], p1 = P[f.j];
        const q = [W(p0[0], p0[1], Z0), W(p1[0], p1[1], Z0), W(p1[0], p1[1], Z1), W(p0[0], p0[1], Z1)];
        px.poly(g, q, Math.abs(f.mx) > 1 ? side2 : side);
      }
      px.poly(g, P.map(p => W(p[0], p[1], Z1)), top);
    };
    box(-K.len, K.len, K.wid, z0, z0 + K.h * .55, tb.base, tb.sh, tb.deep);
    if (kind === 'truck') {
      box(-K.len, K.len * .35, K.wid * .98, z0 + K.h * .55, z0 + K.roof, tb.lt, tb.base, tb.sh);   // the compactor body
      box(K.len * .45, K.len, K.wid * .95, z0 + K.h * .55, z0 + K.h * 1.2, tc.base, tc.sh, tc.deep);
      const s = W(K.len + .2, 0, z0 + K.h * 1.05); px.rect(g, Math.round(s[0]) - 2, Math.round(s[1]) - 1, 4, 2, K.glass);
    } else {
      const f0 = kind === 'van' ? -K.len * .9 : -K.len * .55, f1 = K.len * .35;
      box(f0, f1, K.wid * .86, z0 + K.h * .55, z0 + K.roof * .9, tc.lt, K.glass, E.shade(K.glass, -.25));
      px.poly(g, [W(f1 - 1, -K.wid * .8, z0 + K.roof * .9), W(f1 - 1, K.wid * .8, z0 + K.roof * .9), W(f0 + 1, K.wid * .8, z0 + K.roof * .9), W(f0 + 1, -K.wid * .8, z0 + K.roof * .9)], tc.base);
    }
    // lights: head white, tail red; a cop's bar flashes
    for (const s of [-1, 1]) {
      const h = W(K.len + .3, s * K.wid * .62, z0 + K.h * .35), t = W(-K.len - .3, s * K.wid * .62, z0 + K.h * .35);
      px.rect(g, Math.round(h[0]) - 1, Math.round(h[1]) - 1, 2, 2, o.lights ? '#fffbe0' : '#e8e8d0');
      px.rect(g, Math.round(t[0]) - 1, Math.round(t[1]) - 1, 2, 2, o.braking ? '#ff3030' : '#a01818');
    }
    if (kind === 'cop') { const b = W(0, 0, z0 + K.roof * .9 + 1.5), on = Math.floor(game.real * 6) % 2; px.rect(g, Math.round(b[0]) - 3, Math.round(b[1]) - 1, 3, 2, on ? '#ff2020' : '#601010'); px.rect(g, Math.round(b[0]), Math.round(b[1]) - 1, 3, 2, on ? '#202060' : '#3060ff'); }
    if (kind === 'truck') { const t = W(-K.len * .3, K.wid + .1, z0 + K.roof * .55); E.font.text(g, 'BARITONE', Math.round(t[0]), Math.round(t[1]) - 3, '#e8c020', { font: 'tiny', align: 'center' }); }
  }, { solid: true, hides: true });
  if (o.lights && game.lights.enabled) game.lights.add(c.x + ca * (K.len + 14), c.y + sa * (K.len + 14), 6, 40, .7, { color: '#fff4c0' });
}

/* ---- a portrait for the dialog box, from any rig ---- */
const portraitOf = who => CAST[who] ? (CAST[who].rig || (CAST[who].rig = CAST[who].make(who === 'sal' ? false : undefined))) : null;
