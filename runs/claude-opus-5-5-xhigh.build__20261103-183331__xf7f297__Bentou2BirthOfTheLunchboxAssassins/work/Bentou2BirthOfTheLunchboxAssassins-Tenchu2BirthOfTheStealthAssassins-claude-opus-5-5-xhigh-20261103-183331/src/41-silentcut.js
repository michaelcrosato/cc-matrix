/* ---- SILENT CUTS (静斬): five kinds, each its own paired E.ACTIONS choreography per character. Back (behind, unseen),
 * Side (calm, not looking), Front (asleep, eating, stunned, blinded or poisoned), From above (on a top over them), Undertow
 * (from the water). Never on an alert guard, never on a boss. Slow motion, a zoom, letterbox and the brush splash ---- */
const SilentCut = { slowT: 0, cand: null };
const CUT_NOISE = { back: 0, side: 15, front: 15, above: 0, undertow: 10 };
const CUT_LABEL = { back: 'Back', side: 'Side', front: 'Front', above: 'From above', undertow: 'Undertow' };
const lp = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z || 0, b.z || 0, u) });
/** the best Silent Cut available now: { kind, victim } or null */
SilentCut.find = (h, M) => {
  if (h.action || h.drag || h.dead || h.eatT > 0) return null;
  const W = M.world, kr = T('killRange'), back = T('killBackAngle') * Math.PI / 180;
  let best = null, bd = 1e9;
  for (const g of M.guards.concat(M.civs)) {
    if (!g.alive || g.kind === 'boss' || g.cutBy || g.sunk || g.asleep && g.kind === 'civ') continue;
    const st = g.mind ? g.mind.state : 'calm', alert = st === 'alert' || g.fighting || g.status.flee > 0;
    const d = Math.hypot(g.x - h.x, g.y - h.y), dz = h.z - g.z;
    const inc = g.asleep || g.status.sleep > 0 || g.status.eat > 0 || g.status.stun > 0 || g.status.blind > 0 || g.status.poison > 0;
    let kind = null;
    if (h.swim) { if (d <= 24 && !alert && Math.abs(dz) < 12 && !W.isDeep(g.x, g.y, g.z) && SilentCut.nearWater(W, g)) kind = 'undertow'; }
    else if (dz >= 14 && d <= 44 && h.onGround && !alert && (inc || st !== 'alert') && W.map.arcClear({ x: h.x, y: h.y, z: h.z }, { x: g.x, y: g.y, z: g.z }, 10)) kind = 'above';
    else if (Math.abs(dz) <= 10 && d <= kr && h.onGround) {
      const rel = Math.abs(E.angDiff(g.facing, Math.atan2(g.y - h.y, g.x - h.x)));
      if (inc && !alert) kind = 'front';
      else if (rel < back && !alert && !g.seesHero) kind = 'back';
      else if (rel < Math.PI * 2 / 3 && st === 'calm' && !g.seesHero) kind = 'side';
    }
    if (kind && d < bd) { bd = d; best = { kind, victim: g }; }
  }
  return best;
};
SilentCut.nearWater = (W, g) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (W.isDeep(g.x + dx * 14, g.y + dy * 14, 0)) return true; return false; };
SilentCut.tryCut = (h, M) => { const c = SilentCut.find(h, M); if (!c) return false; SilentCut.run(h, c.kind, c.victim, M); return true; };
SilentCut.run = (h, kind, v, M) => {
  const ch = h.char === 'kaede' ? 'kaede' : 'sojiro', mark = !!v.mark;
  h.combo.cancel(); Hero.unhug(h); h.crouch = false;
  if (v.drag) { /* dragged bodies are never victims */ }
  const act = h.play('cut_' + kind + '_' + ch, { other: v, map: M.world.map, kind, speed: ch === 'kaede' ? 1.12 : 1 });
  v.cutBy = act; v.vx = v.vy = 0; if (v.atk) v.atk.cancel && v.atk.cancel(); v.fighting = false;
  act.cut = { kind, victim: v, mark, struck: false };
  SilentCut.active = act;
  // presentation: hit-stop, slow motion, a zoom, letterbox and the splash
  game.freeze(.05); SilentCut.slowT = .55; game.timeScale = T('slowmo'); B.Cam.cine(1.8, .9);
  B.Hud.letterbox(1.0); B.Hud.splash(kind, mark);
  Au.sfx('stingCut'); Au.sfx('cutTwang', { vol: .8 });
  if (CUT_NOISE[kind]) B.noise(v.x, v.y, v.z, CUT_NOISE[kind], 'grunt');
  if (!mark && v.kind !== 'civ') B.Voice.bark(pickR(B.Story.barks.hurt), v.voice || 'guard', v.x, v.y, { force: true });
};
/** each step: strike when the choreography reaches its blow, restore time after the slow motion */
SilentCut.update = (dtReal, M) => {
  if (SilentCut.slowT > 0) { SilentCut.slowT -= dtReal; if (SilentCut.slowT <= 0 && game.timeScale < 1) game.timeScale = (B.Dev && B.Dev.timeScale) || 1; }
  const act = SilentCut.active; if (!act) return;
  const c = act.cut, v = c.victim;
  if (!c.struck && (act.beat === 'drop' || act.beat === 'sink' || act.done)) {
    c.struck = true;
    if (c.mark) { v.alive = false; v.marked = true; B.emit('mark', { kind: c.kind, victim: v }); Pt.bits(v.x, v.y, v.z + 18, 14, ['#f4f0e6', '#d8d0c0']); }
    else {
      v.hp = 0; v.alive = false; B.emit('silentCut', { kind: c.kind, victim: v }); B.emit('kill', { victim: v, how: 'cut', kind: c.kind });
      if (game.settings.blood !== 'off') { Pt.bits(v.x, v.y, v.z + 16, 12, ['#8a0a10', '#c81a20', '#3a0406']); M.world.decals.push({ kind: 'ink', x: v.x + (crand() - .5) * 6, y: v.y + (crand() - .5) * 6, z: v.z, r: 3 + crand() * 2, seed: crand() * 999 | 0 }); }
    }
    Au.sfx('thud');
  }
  if (act.done) {
    if (c.kind === 'undertow' && !c.mark) { v.sunk = true; sfxAt('splash', v.x, v.y); }
    v.cutBy = null; SilentCut.active = null; v.vx = v.vy = 0;
    if (!c.struck) { c.struck = true; v.alive = false; }
  }
};
/* ---- the choreographies: beats per kind and character; at(A, beat, u) places both bodies and poses both rigs ---- */
const CUT_BEATS = {
  back: { sojiro: [['grab', .16], ['strike', .24], ['hold', .25], ['drop', .4], ['recover', .18]], kaede: [['hop', .14], ['strike', .16], ['strike2', .16], ['drop', .4], ['recover', .15]] },
  side: { sojiro: [['dash', .2], ['strike', .22], ['drop', .4], ['recover', .2]], kaede: [['dash', .16], ['spin', .3], ['drop', .4], ['recover', .16]] },
  front: { sojiro: [['step', .14], ['rising', .28], ['drop', .45], ['recover', .2]], kaede: [['step', .12], ['xcut', .26], ['drop', .4], ['recover', .16]] },
  above: { sojiro: [['leap', .38], ['strike', .18], ['drop', .45], ['recover', .25]], kaede: [['leap', .34], ['strike', .2], ['drop', .4], ['recover', .2]] },
  undertow: { sojiro: [['rise', .18], ['grab', .22], ['pull', .45], ['sink', .45]], kaede: [['rise', .16], ['grab', .2], ['pull', .42], ['sink', .42]] }
};
const MOVE_OF = { back: { sojiro: 'thrust', kaede: 'thrust' }, side: { sojiro: 'slash', kaede: 'spin' }, front: { sojiro: 'rising', kaede: 'slash' }, above: { sojiro: 'overhead', kaede: 'plunge' } };
const cutSpec = (kind, ch) => ({
  beats: CUT_BEATS[kind][ch],
  setup(A) {
    const v = A.o.other, gap = (A.body.r || 5) + (v.r || 5) - 1, f = v.facing || 0;
    A.vic = { x: v.x, y: v.y, z: v.z || 0, facing: f }; A.from = { x: A.start.x, y: A.start.y, z: A.start.z };
    A.behind = { x: v.x - Math.cos(f) * gap, y: v.y - Math.sin(f) * gap, z: v.z || 0 };
    A.front = { x: v.x + Math.cos(f) * gap, y: v.y + Math.sin(f) * gap, z: v.z || 0 };
    const a = Math.atan2(v.y - A.start.y, v.x - A.start.x); A.toward = a;
    A.past = { x: v.x + Math.cos(a) * 14, y: v.y + Math.sin(a) * 14, z: v.z || 0 };
    A.facing = kind === 'front' ? f + Math.PI : kind === 'side' || kind === 'above' || kind === 'undertow' ? a : f;
    if (kind === 'undertow') { A.wet = { x: A.start.x, y: A.start.y, z: A.start.z }; }
    A.mark = !!v.mark;
  },
  post(A) { if (kind === 'back' && ch === 'sojiro' && (A.beat === 'grab' || A.beat === 'strike' || A.beat === 'hold')) return Rigs.mouthCover(1); if (kind === 'undertow' && A.beat !== 'sink') return Rigs.handsUp(.6); return null; },
  drawZ(A) { if (kind !== 'undertow') return undefined; return A.body.z - (A.beat === 'rise' ? 9 - 4 * A._u : 6); },
  at(A, b, u) {
    A._u = u;
    const st = { facing: A.facing }, vs = { facing: kind === 'undertow' ? A.toward + Math.PI : A.vic.facing }, V = { x: A.vic.x, y: A.vic.y, z: A.vic.z };
    const mv = MOVE_OF[kind] && MOVE_OF[kind][ch], fall = A.mark ? null : 1;
    const victimDown = uu => A.mark ? { pose: 'kneel', expr: 'wince' } : { down: E.ease.inQuad(uu), hurt: uu < .3, expr: 'wince' };
    const out = (pos, s, o) => Object.assign(pos, { state: Object.assign(st, s), other: Object.assign(V, o || {}, { state: Object.assign(vs, (o && o.s) || {}) }) });
    if (kind === 'back') {
      if (b === 'grab' || b === 'hop') return out(Object.assign(lp(A.from, A.behind, E.ease.outQuad(u)), b === 'hop' ? { z: A.behind.z + Math.sin(u * Math.PI) * 5 } : {}), { stance: 'ready', air: b === 'hop' }, { s: { expr: 'shout' } });
      if (b === 'strike' || b === 'strike2') return out(lp(A.behind, A.behind, 0), { attack: E.move('thrust', u) }, { s: { hurt: u > .4, expr: 'wince' } });
      if (b === 'hold') return out(lp(A.behind, A.behind, 0), { attack: E.move('thrust', 1, 'recover') }, { s: { hurt: true, expr: 'wince' } });
      if (b === 'drop') return out(lp(A.behind, A.behind, 0), { attack: E.move(mv, 1, 'recover') }, { s: victimDown(u) });
      return out(lp(A.behind, A.behind, 0), { crouch: u < .6 }, { s: victimDown(1) });
    }
    if (kind === 'side') {
      if (b === 'dash') return out(lp(A.from, A.past, E.ease.inQuad(u) * .55), { sprint: true }, {});
      if (b === 'strike' || b === 'spin') return out(lp(A.from, A.past, .55 + .45 * E.ease.outQuad(u)), { attack: E.move(mv, u) }, { s: { hurt: u > .5, expr: 'wince' } });
      if (b === 'drop') return out(lp(A.past, A.past, 0), { attack: E.move(mv, 1, 'recover'), facing: A.facing + Math.PI * Math.min(1, u * 1.5) }, { s: victimDown(u) });
      return out(lp(A.past, A.past, 0), { facing: A.facing + Math.PI }, { s: victimDown(1) });
    }
    if (kind === 'front') {
      if (b === 'step') return out(lp(A.from, A.front, E.ease.outQuad(u)), { stance: 'ready' }, {});
      if (b === 'rising' || b === 'xcut') return out(lp(A.front, A.front, 0), { attack: E.move(mv, u) }, { s: { hurt: u > .5, expr: 'wince' } });
      if (b === 'drop') return out(lp(A.front, A.front, 0), { attack: E.move(mv, 1, 'recover') }, { x: A.vic.x - Math.cos(A.vic.facing) * 3 * u, y: A.vic.y - Math.sin(A.vic.facing) * 3 * u, s: victimDown(u) });
      return out(lp(A.front, A.front, 0), {}, { x: A.vic.x - Math.cos(A.vic.facing) * 3, y: A.vic.y - Math.sin(A.vic.facing) * 3, s: victimDown(1) });
    }
    if (kind === 'above') {
      if (b === 'leap') { const p = lp(A.from, A.behind, u); p.z = lerp(A.from.z, A.behind.z, u * u) + Math.sin(u * Math.PI) * 12; return out(p, { air: true, attack: E.move(mv, Math.min(1, u * .4), 'wind') }, {}); }
      if (b === 'strike') return out(lp(A.behind, A.behind, 0), { attack: E.move(mv, u), land: u < .25 ? 1 : 0 }, { s: { hurt: u > .3, expr: 'wince' } });
      if (b === 'drop') return out(lp(A.behind, A.behind, 0), { attack: E.move(mv, 1, 'recover') }, { s: victimDown(u) });
      return out(lp(A.behind, A.behind, 0), { crouch: u < .5 }, { s: victimDown(1) });
    }
    // undertow: the ninja rises out of the water, grabs the ankles and pulls the victim under
    if (b === 'rise') return out(lp(A.wet, A.wet, 0), { attack: E.move('claw', u, 'wind') }, {});
    if (b === 'grab') return out(lp(A.wet, A.wet, 0), { attack: E.move('claw', u) }, { s: { hurt: true, expr: 'shout' } });
    if (b === 'pull') return out(lp(A.wet, A.wet, 0), { attack: E.move('claw', 1, 'recover') }, { x: lerp(A.vic.x, A.wet.x, E.ease.inQuad(u)), y: lerp(A.vic.y, A.wet.y, E.ease.inQuad(u)), s: Object.assign(victimDown(u * .8), { air: true }) });
    return out(lp(A.wet, A.wet, 0), {}, { x: A.wet.x, y: A.wet.y, z: -8 * u, s: victimDown(1) });
  }
});
for (const k in CUT_BEATS) for (const ch of ['sojiro', 'kaede']) E.ACTIONS['cut_' + k + '_' + ch] = cutSpec(k, ch);
SilentCut.LABEL = CUT_LABEL;
B.SilentCut = SilentCut;
