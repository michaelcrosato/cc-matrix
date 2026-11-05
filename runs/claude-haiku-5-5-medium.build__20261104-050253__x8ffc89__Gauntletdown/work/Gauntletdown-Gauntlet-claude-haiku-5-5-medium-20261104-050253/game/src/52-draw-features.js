// The drawing of the features: force fields, spikes, plates, runes, pads, the bell, the lobbed crocks, the fireballs, the
// King and his fog, the monsters' rigs, and the HUD parts for the King's health, the amulets and the specials.

const FIELD_SPR = E.sprite(['.bb.', 'bBBb', 'bBBb', '.bb.'], { b: '#6ad8ff', B: '#e8ffff' }, 2);
const SPIKE_UP = E.sprite(['.s.s.s.', 'sSsSsSs', 'SSSSSSS'], { s: '#9a9aa8', S: '#d8d8e8' }, 2);
const SPIKE_DOWN = E.sprite(['.......', '.......', 'sssssss'], { s: '#4a4a58' }, 2);
const PLATE_SPR = E.sprite(['........', '.pppppp.', '.pPPPPp.', '.pPPPPp.', '.pppppp.'], { p: '#6a5a4a', P: '#9a8a7a' }, 2);
const RUNE_SPR = E.sprite(['..ccc..', '.cCCCc.', 'cCcccCc', '.cCCCc.', '..ccc..'], { c: '#4a7ad0', C: '#9ad0ff' }, 2);
const PAD_SPR = E.sprite(['..pp..', '.pPPp.', 'pPwwPp', 'pPwwPp', '.pPPp.', '..pp..'], { p: '#6a3ad0', P: '#b08aff', w: '#e8dcff' }, 2);
const BELL_SPR = E.sprite(['..bbbb..', '.bBBBBb.', '.bBBBBb.', 'bBBBBBBb', 'bbbbbbbb', '...yy...'], { b: '#6a5a20', B: '#e8c050', y: '#fff4a0' }, 2);
const CROCK_SPR = E.sprite(['.uu.', 'uUUu', '.uu.'], { u: '#6a4a2a', U: '#c8a070' }, 1);
const FIREBALL = E.sprite(['.oo.', 'oOOo', '.oo.'], { o: '#ff6020', O: '#ffe080' }, 1);

// The heroes' gear, drawn on the rigs: an axe head on the berserker's blade, a shield and a bow in the off hand.
const AXE_SPR = E.sprite(['..ss..', '.sSSs.', 'sSSSs.', 'sSSSs.', '.sSs..'], { s: '#c8c8d8', S: '#ffffff' }, 1);
const SHIELD_SPR = E.sprite(['.bbbbbb.', 'bBBBBBBb', 'bBrrrrBb', 'bBrwwrBb', 'bBrrrrBb', 'bBBBBBBb', '.bbbbbb.'], { b: '#4a4a5a', B: '#9aa8c0', r: '#c83a32', w: '#f0f0f0' }, 1);
const BOW_SPR = E.sprite(['..b', '.b.', 'b..', 'b..', 'b..', '.b.', '..b'], { b: '#8a5a2a' }, 1);
function drawGear(r, h) {
  const rig = h.rig;
  if (h.cls === 'berserker') { const t = rig.tip(); r.sprite(t[0], t[1], t[2], AXE_SPR, { anchor: 'center' }); }
  else if (h.cls === 'shieldmaiden') { const p = rig.hand('L'); r.sprite(p[0], p[1], p[2], SHIELD_SPR, { anchor: 'center' }); }
  else if (h.cls === 'ranger') { const p = rig.hand('L'); r.sprite(p[0], p[1], p[2], BOW_SPR, { anchor: 'center' }); }
}

// The game's own moves, added to the engine's table: the ranger's bow draw, the shieldmaiden's shield bash, and the
// berserker's axe swing. They play through the engine's rig, like the engine's own.
Object.assign(E.MOVES, {
  bowdraw: { rel: true, a0: .35, a1: -.35, z0: -2, z1: 0, reach: 6, wind: .2, active: .08, recover: .3, lean: .2 },
  shieldbash: { rel: true, a0: .8, a1: -.2, z0: -4, z1: -6, reach: 8, wind: .1, active: .08, recover: .25, lunge: 3 },
  axeswing: { rel: true, a0: 2.2, a1: -1.2, z0: 4, z1: -6, reach: 9, wind: .15, active: .1, recover: .3, lean: .3 }
});
// The attack a hero's rig plays this step: the class's melee move while swinging, its throw while shooting.
function heroAttack(h) {
  if (h.melee > 0) {
    const move = h.cls === 'berserker' ? 'axeswing' : h.cls === 'shieldmaiden' ? 'shieldbash' : 'overhead';
    return E.move(move, 1 - h.melee / .42, 'active');
  }
  if (h.throwT > 0) return E.move(h.cls === 'ranger' ? 'bowdraw' : 'throw', 1 - h.throwT / .3, 'active');
  return null;
}

// The monsters' rigs: each kind dressed from the engine's own characters.
function monsterRig(kind) {
  switch (kind) {
    case 'gnasher': return new E.Humanoid({ size: .95, build: 'bulky', hair: 'bald', eyeGlow: '#ffd84a', colors: { cloth: '#6a7a56', skin: '#8ab070', trim: '#4a5a3a' } });
    case 'lobber': return new E.Humanoid({ size: .9, build: 'chibi', hat: { style: 'band', color: '#f4f4f0' }, outfit: 'robe', colors: { cloth: '#f0f0ea', skin: '#e0b890', trim: '#8a6a40' } });
    case 'imp': return new E.Humanoid({ size: 1.0, build: 'chibi', hair: 'bald', eyeGlow: '#ff8040', colors: { cloth: '#8a2a10', skin: '#c05a30', trim: '#ffb040' } });
    case 'fryar': return new E.Humanoid({ size: 1.0, build: 'heroic', hood: true, outfit: 'robe', eyeGlow: '#c0a0ff', colors: { cloth: '#4a3a6a', hair: '#2a2a3a', skin: '#c8b8a8' } });
    case 'snatcher': return new E.Humanoid({ size: .8, build: 'chibi', hood: true, eyeGlow: '#ffe060', colors: { cloth: '#6a5028', skin: '#c8a070' } });
    case 'tithe': return new E.Humanoid({ size: 1.3, build: 'skeleton', hood: true, outfit: 'robe', eyeGlow: '#ff2040', colors: { cloth: '#2a0a2a', skin: '#e8e0d8' } });
    default: return new E.Humanoid({ size: .95, build: 'bulky', hair: 'bald', colors: { cloth: '#6a7a56', skin: '#8ab070' } });
  }
}

function drawFeatures(r) {
  const W = WORLD, t = game.time;
  // force fields: lit beams while on, dim while off (and flickering just before)
  for (const f of W.fields) for (const c of f.cells) {
    if (f.on) { r.sprite(c.x, c.y, 0, FIELD_SPR, { anchor: 'center', glow: .8 }); game.lights.add(c.x, c.y, 8, 26, .6, { color: '#6ad8ff' }); }
    else if (f.flicker && Math.floor(t * 20) % 2) r.sprite(c.x, c.y, 0, FIELD_SPR, { anchor: 'center', alpha: .35 });
  }
  for (const s of W.spikes) r.sprite(s.x + (s.tremble ? Math.sin(t * 60) * .8 : 0), s.y, 0, s.up ? SPIKE_UP : SPIKE_DOWN, { anchor: 'center' });
  for (const [key, p] of W.plates) if (!p.used) { const [x, y] = key.split(',').map(Number); r.sprite((x + .5) * T, (y + .5) * T, 0, PLATE_SPR, { anchor: 'center' }); }
  for (const r0 of W.runes.values()) { r.sprite(r0.x, r0.y, 0, RUNE_SPR, { anchor: 'center', glow: .6 }); game.lights.add(r0.x, r0.y, 6, 22, .5, { color: '#7aa8ff' }); }
  for (const p of W.pads.values()) { r.sprite(p.x, p.y, 0, PAD_SPR, { anchor: 'center', glow: .6 }); game.lights.add(p.x, p.y, 6, 20, .5, { color: '#b08aff' }); }
  if (W.bell && W.bell.alive) r.sprite(W.bell.x, W.bell.y, 0, BELL_SPR, { anchor: 'bottom' });
  // the lobbed crocks: an arc from the lobber to the landing point, with its shadow on the ground
  for (const c of W.crocks) {
    const k = Math.min(1, c.t / c.dur), x = c.sx + (c.tx - c.sx) * k, y = c.sy + (c.ty - c.sy) * k, z = Math.sin(k * Math.PI) * 40;
    r.shadow(c.tx, c.ty, 9, .35);
    r.sprite(x, y, z + 8, CROCK_SPR, { anchor: 'center' });
  }
  W.foeShots && W.foeShots.draw(r);
  // the King, his throne's shadow, his charge's line, and his fog
  const b = W.boss;
  if (b && (b.alive || b.dying < 1.5)) {
    if (b.charge && b.charge.t < .6) r.decal(() => r.groundArc(b.x, b.y, 14, 220, Math.atan2(b.charge.dy, b.charge.dx) - .05, Math.atan2(b.charge.dy, b.charge.dx) + .05, '#ff4040', .4));
    if (b.fog > 0) r.decal(() => r.groundArc(b.x, b.y, 40, 80, 0, Math.PI * 2, '#8aff8a', .35));
    if (b.alive) {
      r.shadow(b.x, b.y, 18, .45);
      // phase three: the ribcage is open, and the gauntlet glows inside it
      if (b.phase === 3) { const c = [b.x, b.y - 10]; r.sprite(c[0], c[1], 14, BELL_SPR, { anchor: 'center', glow: .9 }); game.lights.add(c[0], c[1], 14, 40, .8, { color: '#ffd060' }); }
      const rig = b.rig;
      r.actor(b.x, b.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { flash: b.flash > 0 ? '#ffffff' : undefined, xray: true });
    } else {
      r.shadow(b.x, b.y, 18, .45 * Math.max(0, 1 - b.dying));
      r.sprite(b.x, b.y, 0, BELL_SPR, { anchor: 'bottom', alpha: Math.max(0, 1 - b.dying) });
    }
  }
}

// The monsters are rigs; the ghosts and the bell and the rest are sprites. The HUD parts below read the same state.
function drawHudExtra(r) {
  const W = WORLD, b = W.boss;
  if (b && b.alive) {
    const f = Math.max(0, b.hp / b.max), w = r.W * .5;
    r.text('KING FAMISH', r.W / 2, 26, '#ffe08a', { align: 'center', shadow: '#000' });
    r.overlay(g => { E.px.rect(g, r.W / 4, 36, w, 6, '#000'); E.px.rect(g, r.W / 4 + 1, 37, Math.max(0, (w - 2) * f), 4, b.phase === 3 ? '#ff4040' : b.phase === 2 ? '#ffb040' : '#e0c060'); });
  }
  W.heroes.forEach((h, i) => {
    const x = Math.round(i * (r.W / 4) + 6);
    if (h.amulet) r.text(AMULETS[h.amulet.type].name + ' ' + Math.ceil(h.amulet.t), x, 50, '#ffe0a0', { scale: 1, shadow: '#000' });
    if (h.specials && h.specials.length) r.text(h.specials.map(s => SPECIALS[s].name.split(' ')[0]).join(' ').toUpperCase(), x, 60, '#c8d8ff', { scale: 1, shadow: '#000' });
    if (h.stun > 0) r.text('STUNNED', x, 70, '#7aa8ff', { scale: 1, shadow: '#000' });
  });
  if (W.hoard && W.hoard.left > 0) r.text('HOARD ' + Math.ceil(W.hoard.left), r.W / 2, 28, '#ffd060', { align: 'center', scale: 2, shadow: '#000' });
  if (W.bellT > 0 && W.bellHero) r.text('ON THE MENU: ' + W.bellHero.name, r.W / 2, 42, '#ffb0b0', { align: 'center', shadow: '#000' });
}
