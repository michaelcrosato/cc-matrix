// WP.Bot: the AI player (12.2) for the attract mode, the dev autopilot and the playthrough tests.
// frame(world, p, dt) -> InputFrame. It never fires when the frontmost shape at its aim is a civilian or a hostage.
(() => {
const E = My3D2dge, WP = globalThis.WP, { clamp } = WP;
const kindOf = s => WP.TYPES[s.e.type].kind;
const Bot = WP.Bot = {
  make(o = {}) { return { fair: !!o.fair, x: WP.W / 2, y: WP.PLAY_H * .5, vx: 0, vy: 0, tgt: null, retarget: 0, react: 0, R: E.rng(o.seed || 99), gcd: 0, holdT: 0, pick: o.pick !== false }; },
  /** what to shoot now */
  choose(b, world, p) {
    const S = world.shapes || [], lowAmmo = p.mag + p.spares.length * 30 < 60, hurt = p.damage > 60;
    let best = null, bs = -1e9;
    for (const s of S) {
      const k = kindOf(s), e = s.e; if (s.cover && k !== 'prop') continue;
      const c = WP.Hit.center(s); if (c[0] < 4 || c[0] > WP.W - 4 || c[1] < 4 || c[1] > WP.PLAY_H - 4) continue;
      let sc = null;
      if (k === 'proj') sc = 100 + (e.u || 0) * 50;
      else if (k === 'infantry') { const a = e.atk || e.throwing || e.whistle; sc = 30 - s.D * .02 + (a ? 30 + (a.t / (a.T || 1)) * 20 : 0);
        if (e.beh === 'chase') { const h = world.byId ? world.byId(e.target) : null; if (e.st === 'drag') sc += 70; else if (h && Math.hypot(h.x - e.x, h.y - e.y) < 70) sc += 45; } if (s.part === 'head') sc += e.type === 'brute' ? 12 : 1; if (s.part === 'legs') sc -= 3; if (s.part === 'chute') sc -= 2; }
      else if (k === 'vehicle' || k === 'boat' || k === 'air') { if (WP.TYPES[e.type].friendly || WP.TYPES[e.type].scenery) continue; const a = s.pp && s.pp.atk; sc = 24 + (s.pp ? 8 : 0) + (a ? 30 : 0) - s.D * .01; }
      else if (k === 'boss') {
        if (s.part === 'shield') continue; const pp = s.pp; if (pp && (pp.phase !== e.phase || pp.kind === 'armor')) continue;
        if (!pp && !(s.part || '').startsWith('tusk')) { const d = WP.BOSS_DEF[e.type]; if (!d.hullPart || !d.hullPart(e)) continue; }
        const glow = pp && ((e.flame && e.flame.side === pp.name) || (e.canGlow && pp.name === 'cannon') || (e.vent && pp.name === 'boiler') || (e.noseGlow && pp.name === 'nose'));
        sc = 40 + (pp && pp.atk ? 20 : 0) + (glow ? 45 : 0) + (s.part === 'tuskHead' ? 10 : 0);
      }
      else if (k === 'pickup') { if (e.ptype === 'dynamite' && world.ents.some(q => (WP.TYPES[q.type].kind === 'civ' && !q.wounded || WP.TYPES[q.type].kind === 'hostage' && !q.saved && !q.lost) && world.view.depth(q.x, q.y) > 14)) continue; sc = (lowAmmo && (e.ptype === 'mag' || e.ptype === 'crate') ? 70 : hurt && (e.ptype === 'ration' || e.ptype === 'medkit') ? 70 : 26) + (e.ptype === 'dynamite' ? 10 : 0); }
      else if (k === 'prop') { const tp = WP.TYPES[e.type]; if (tp.hp >= 9999 || e.type === 'sandbags' || e.type === 'shutter') continue; sc = e.type === 'mast' ? 34 : e.type === 'searchlight' ? 38 : tp.blast ? (world.ents.some(q => !q.dead && WP.TYPES[q.type].kind === 'infantry' && Math.hypot(q.x - e.x, q.y - e.y) < tp.blast.r) ? 45 : 2) : (e.type === 'crate' || e.type === 'ammoCrate') ? (lowAmmo ? 40 : 18) : e.type === 'rope' ? 36 : 5; if (tp.blast && world.ents.some(q => (WP.TYPES[q.type].kind === 'civ' || WP.TYPES[q.type].kind === 'hostage') && !q.wounded && Math.hypot(q.x - e.x, q.y - e.y) < tp.blast.r * 1.3)) continue; }
      else if (k === 'animal') sc = e.carry ? 22 : -1;
      else continue;
      if (sc === null) continue;
      sc -= Math.hypot(c[0] - b.x, c[1] - b.y) * .03;
      if (b.tgt && b.tgt.e === e && b.tgt.part === s.part) sc += 6;   // a little stickiness
      if (sc > bs) { bs = sc; best = s; }
    }
    return best;
  },
  frame(b, world, p, dt) {
    b.retarget -= dt; b.gcd -= dt;
    if (b.retarget <= 0 || !b.tgt || !world.shapes.includes(b.tgt)) {
      const n = Bot.choose(b, world, p);
      if (n && (!b.tgt || n.e !== b.tgt.e)) b.react = b.fair ? .15 + b.R() * .15 : 0;
      b.tgt = n; b.retarget = .1;
    }
    // refresh the target shape (it moves each step)
    if (b.tgt) { const t = b.tgt; b.tgt = (world.shapes || []).find(s => s.e === t.e && s.part === t.part && s.pp === t.pp) || null; }
    let tx = b.x, ty = b.y;
    if (b.tgt) {
      const c = WP.Hit.center(b.tgt); tx = c[0]; ty = c[1]; if (b.tgt.kind === 'r') ty = Math.min(ty, b.tgt.y0 + (b.tgt.y1 - b.tgt.y0) * .4);
      // a covered centre: look for a point of the target that is in front
      const front = world.pick ? world.pick(tx, ty) : null;
      if (front && front.e !== b.tgt.e && b.tgt.kind === 'p') {
        const bb = b.tgt.bb; let found = false;
        for (let gy = 0; gy < 4 && !found; gy++) for (let gx = 0; gx < 5 && !found; gx++) {
          const x = bb[0] + (bb[2] - bb[0]) * (.1 + .2 * gx), y = bb[1] + (bb[3] - bb[1]) * (.12 + .25 * gy);
          if (!WP.Hit.contains(b.tgt, x, y)) continue; const f = world.pick(x, y); if (f && f.e === b.tgt.e) { tx = x; ty = y; found = true; }
        }
      }
    }
    else { tx = WP.W / 2 + Math.sin(world.t * .7) * 80; ty = WP.PLAY_H * .5; }
    // a critically damped spring, speed-capped
    const max = b.fair ? 600 : 900, w = b.fair ? 26 : 34;
    const ax = (tx - b.x) * w * w - 2 * w * b.vx, ay = (ty - b.y) * w * w - 2 * w * b.vy;
    b.vx += ax * dt; b.vy += ay * dt; const sp = Math.hypot(b.vx, b.vy); if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
    b.x = clamp(b.x + b.vx * dt, 0, WP.W - 1); b.y = clamp(b.y + b.vy * dt, 0, WP.PLAY_H - 1);
    if (b.react > 0) b.react -= dt;
    // fire when inside the target, never when a civilian or hostage is frontmost there
    let fire = false;
    if (b.tgt && b.react <= 0 && WP.Hit.contains(b.tgt, b.x, b.y, 1)) {
      const front = world.pick ? world.pick(b.x, b.y) : null;
      const bad = s => s && (kindOf(s) === 'civ' || kindOf(s) === 'hostage');
      const near = (world.shapes || []).some(s => (kindOf(s) === 'civ' || kindOf(s) === 'hostage') && WP.Hit.contains(s, b.x, b.y, 10) && s.D <= (b.tgt.D + 4));
      fire = !bad(front) && !near && !(front && front.cover && kindOf(b.tgt) !== 'prop' && front.e !== b.tgt.e && front.D < b.tgt.D - 1);
      if (fire && b.fair && b.R() < .005) { b.x += (b.R() - .5) * 24; b.y += (b.R() - .5) * 24; }
    }
    // grenades: 3+ hostiles in the blast, or a vehicle or boss weak point, no friendlies near
    let grenade = 0;
    if (b.gcd <= 0 && p.grenades > 0 && b.tgt && b.react <= 0) {
      const k = kindOf(b.tgt), e = b.tgt.e;
      let n = 0; for (const q of world.ents) if (!q.dead && WP.TYPES[q.type].kind === 'infantry' && Math.hypot(q.x - e.x, q.y - e.y) < WP.T.grenadeRadius) n++;
      const friend = world.ents.some(q => (WP.TYPES[q.type].kind === 'civ' || WP.TYPES[q.type].kind === 'hostage') && !q.wounded && !q.saved && Math.hypot(q.x - e.x, q.y - e.y) < WP.T.grenadeRadius * 1.6);
      if (!friend && (n >= 3 || ((k === 'vehicle' || k === 'air' || k === 'boat' || k === 'boss') && b.tgt.D < 400 && (world.t % 3 < dt * 2 || k === 'boss')))) { grenade = 1; b.gcd = b.fair ? 3 : 2; }
    }
    // reload when low and nothing is about to fire
    let reload = 0;
    const bestSpare = p.spares.length ? Math.max(...p.spares) : 0;
    if (p.mag < 6 && p.spares.length && p.reloadT <= 0 && (p.mag === 0 || bestSpare >= p.mag + 10)) {
      const danger = world.ents.some(q => (q.atk && q.atk.phase === 'tele' && q.atk.T - q.atk.t < .9) || (q.parts && q.parts.some(pp => pp.atk && pp.atk.T - pp.atk.t < .9)));
      if (!danger || p.mag === 0) reload = 1;
    }
    return { x: b.x, y: b.y, fire, grenade, reload, snap: 0, device: 'bot' };
  }
};
})();
