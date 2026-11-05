/* BATZOOKA BASEBALL: rigs and animation. Humanoid players dressed per team, with baseball motion (swing, windup,
   throw, dive, jump, slide, cheer, sulk) layered over the engine's rig. Rigs are cosmetic: gameplay never reads joints. */
const HAIRS = ['short', 'spiky', 'long', 'ponytail', 'short', 'spiky', 'bald'];
BZ.rigCache = new Map();
BZ.makeRig = (team, p, bat) => {
  const hs = Math.abs([...p.name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % HAIRS.length;
  const hatStyle = team.hat === 'visor' ? 'helmet' : team.hat === 'helmet' ? 'helmet' : 'cap';
  const rig = new E.Humanoid({
    size: p.build === 'bulky' ? 1.28 : 1.12, build: p.build, weapon: bat ? 'staff' : null, outfit: 'shirt', sleeves: 'short', hair: HAIRS[hs],
    hat: { style: hatStyle, color: team.cap2 === '#303848' ? '#c8a030' : team.cap2 }, speedRef: 90,
    colors: Object.assign({}, team.colors, { hair: p.hair, skin: p.skin, metal: '#c89a5a', hilt: '#8a5a2a', glove: '#8a5a2a', staff: '#c89a5a', orb: '#a8743a' })
  });
  rig.lefty = p.lefty; return rig;
};
BZ.rigFor = (a, team, bat) => {
  const key = a.side + ':' + a.i + (bat ? 'b' : '') + ':' + team.id;
  let r = BZ.rigCache.get(key); if (!r) { r = BZ.makeRig(team, a.st, bat); BZ.rigCache.set(key, r); }
  return r;
};
BZ.umpireRig = new E.Humanoid({ size: 1.15, weapon: null, outfit: 'shirt', hat: 'cap', sleeves: 'short', colors: { cloth: '#1c1c24', pants: '#2a2a34', hair: '#888888', skin: '#e8b890', belt: '#101010', boot: '#101010' } });
const SWING = { rel: true, hand: 'both', a0: 2.4, a1: -1.5, z0: 2, z1: 0, reach: 9, wind: .12, active: .1, recover: .34, lunge: 1.6, twist: 1.2, blade: 1 };
const BUNT = { rel: true, hand: 'both', a0: .3, a1: .1, z0: -1, z1: -1, reach: 7, wind: .1, active: .15, recover: .4, blade: 0 };
const PITCH_WIND = E.MOVES.overhead, THROW = E.MOVES.throw;
function atk(spec, t) { const w = spec.wind, ac = spec.active, rc = spec.recover; if (t < w) return { spec, phase: 'wind', u: t / w }; if (t < w + ac) return { spec, phase: 'active', u: (t - w) / ac }; if (t < w + ac + rc) return { spec, phase: 'recover', u: (t - w - ac) / rc }; return null; }
BZ.animState = (a, dt, M) => {
  const o = { x: a.x, y: a.y, z: a.z, vx: a.vx || 0, vy: a.vy || 0, facing: a.facing };
  const t = a.animT || 0;
  switch (a.anim) {
    case 'swing': o.attack = atk(SWING, t); if (!o.attack && t > .8) a.anim = null; o.vx = o.vy = 0; break;
    case 'bunt': o.attack = atk(BUNT, t); if (!o.attack && t > .9) a.anim = null; o.vx = o.vy = 0; break;
    case 'pitch': { const T = .48, u = clamp(t / T, 0, 1); o.attack = { spec: PITCH_WIND, phase: 'wind', u: u * .95 }; o.vx = o.vy = 0; break; }
    case 'pitchrel': o.attack = t < .1 ? { spec: PITCH_WIND, phase: 'active', u: t / .1 } : t < .45 ? { spec: PITCH_WIND, phase: 'recover', u: (t - .1) / .35 } : null; o.vx = o.vy = 0; break;
    case 'throw': o.attack = atk(THROW, t); if (!o.attack) a.anim = null; break;
    case 'jump': o.air = true; if (t > 1.2) a.anim = null; break;
    case 'dive': o.pose = 'down'; o.down = .95; if (t > 1) a.anim = null; break;
    case 'slide': o.pose = 'down'; o.down = .8; if (t > .7) a.anim = null; break;
    case 'out': o.pose = 'kneel'; if (t > 1.4) a.anim = null; break;
    case 'burn': o.pose = 'down'; o.down = .6; o.hurt = true; if (t > 1.4) a.anim = null; break;
    case 'sulk': o.pose = 'kneel'; if (t > 1.6) a.anim = null; break;
    default: break;
  }
  if (a.mood === 'cheer') o.pose = 'cheer';
  if (a.sup > 0) o.dash = true;
  return o;
};
/* run every rig's update (called once per step by the match scene when BZ.cosmetic) */
BZ.updateRigs = (dt, M) => {
  const bs = M.sides[M.half], ds = M.sides[1 - M.half];
  const all = [];
  for (const a of ds.actors) {
    if (M.mode === 'derby' && a.pos !== 'P' && a.pos !== 'C') continue;
    all.push([a, ds, false]);
  }
  for (const a of bs.actors) {
    const run = M.runners.find(r => r.actor === a);
    if (run || a === M.batter) all.push([a, bs, a === M.batter && !run && M.phase !== 'play']);
  }
  for (const [a, sd, bat] of all) {
    const rig = BZ.rigFor(a, sd.team, bat); a.rig = rig;
    const st = BZ.animState(a, dt, M);
    if (a.pos === 'C' && sd === ds && !a.anim) st.pose = 'crouch';
    if (bat && !st.attack) { st.stance = 'ready'; }
    const spd = hyp(st.vx, st.vy); st.run = clamp(spd / 100, 0, 1);
    rig.update(dt, st);
  }
};
BZ.umpireUpdate = dt => BZ.umpireRig.update(dt, { x: 0, y: 34, z: 0, facing: -PI / 2, vx: 0, vy: 0, pose: 'crouch' });

/* ---- the world draw for a match ---- */
BZ.drawActor = (r, a, rig, M) => {
  if (!rig) return;
  const X = G.HX + a.x, Y = G.HY + a.y, Z = a.z;
  r.shadow(X, Y, 8, .45);
  r.actor(X, Y, Z, (g, ox, oy) => {
    rig.draw(g, ox, oy, r.view);
    if (a.sup > 0) { px.ddisc(g, ox, oy - 14, 16, '#ffd070', .35 + Math.sin(M.clock * 30) * .15); }
  }, { flash: a.stun > 0 ? '#ff6a30' : null, flashMix: .5, outline: a === M.primary && M.phase === 'play' && M.sides[1 - M.half].human ? '#ffee66' : undefined, key: a });
  if (M.attractLabel) { }
};
BZ.drawBall = (r, M) => {
  const b = M.ball; if (b.state === 'none' || b.state === 'held' && !b.holder) return;
  let x = b.x, y = b.y, z = b.z;
  if (b.state === 'held' && b.holder) { x = b.holder.x + Math.cos(b.holder.facing) * 6; y = b.holder.y + Math.sin(b.holder.facing) * 6; z = 16; }
  if (b.state === 'catcher') { const C = fielderOf('C'); x = C.x; y = C.y - 4; z = 14; }
  const X = G.HX + x, Y = G.HY + y;
  if (z > .5) r.shadow(X, Y, 3, .5, '#000000', 0);
  if (b.trail && b.trail.length > 2 && (b.state === 'hit' || b.state === 'homer' || b.state === 'pitch' || b.state === 'throw')) {
    const tr = b.trail;
    r.queue(X, Y, z, g => {
      for (let i = 0; i < tr.length - 1; i++) { const p = r.w(G.HX + tr[i][0], G.HY + tr[i][1], tr[i][2]); const k = i / tr.length; px.disc(g, p[0], p[1], b.fire ? 1 + k * 2.5 : 1, b.fire ? (k > .6 ? '#ffd050' : k > .3 ? '#ff7a20' : '#a02010') : 'rgba(255,255,255,' + (k * .5) + ')'); }
    }, { emissive: b.fire, bias: -1 });
  }
  r.queue(X, Y, z + 2, g => {
    const w = r.w(X, Y, z), big = M.phase === 'pitch' || M.phase === 'windup' ? 1 : 0;
    px.disc(g, w[0], w[1], b.fire ? 4 : 3, b.fire ? '#ffd050' : '#f6f6f0'); px.disc(g, w[0], w[1], b.fire ? 3 : 2, b.fire ? '#ff7a20' : '#ffffff');
    px.dot(g, w[0] - 1, w[1] + 1, b.fire ? '#c03010' : '#d84a3a');
  }, { emissive: b.fire, bias: 2 });
  if (b.fire && (b.state === 'hit' || b.state === 'pitch' || b.state === 'homer')) { game_.particles.fire(X, Y, z, 1, { size: 3 }); }
};
let game_ = null; BZ.bindGame = g => { game_ = g; };

/* ---- the mascot: a blob that patrols the foul line and hops when the crowd goes wild ---- */
const MASCOTS = { corn: { dk: '#b89818', base: '#f2d544', lt: '#fff0a0', spec: '#ffffff', eye: '#ffffff', pupil: '#201810' }, moon: { dk: '#5a4a98', base: '#a888f0', lt: '#d8c8ff', spec: '#ffffff', eye: '#ffffff', pupil: '#201840' }, magma: { dk: '#a02a10', base: '#ff6a30', lt: '#ffb070', spec: '#ffffff', eye: '#ffffff', pupil: '#301008' }, mega: { dk: '#a08020', base: '#e8c860', lt: '#fff0b0', spec: '#ffffff', eye: '#ffffff', pupil: '#101018' } };
BZ.mascotInit = M => {
  const blob = new E.Blob({ R: 7, colors: MASCOTS[M.parkDef.id] || MASCOTS.corn, ears: M.parkDef.id === 'moon' ? 'rabbit' : null, horns: M.parkDef.id === 'magma', feet: true, mouth: true, face: 'front' });
  BZ.mascot = { blob, x: 140, y: -40, dir: 1, t: 0, hop: 0,
    tick(dt) { this.t += dt; this.x += this.dir * 14 * dt; if (this.x > 230) this.dir = -1; if (this.x < 110) this.dir = 1; this.y = -this.x + 50; const hype = BZ.hud.hype; this.hop = hype > .4 ? Math.abs(Math.sin(this.t * 7)) * 10 : 0; blob.update(dt, { squash: Math.sin(this.t * 6) * .12, walk: hype > .4 ? 0 : 1, look: [this.dir, 1] }); },
    draw(r) { const x = G.HX + this.x, y = G.HY + this.y; r.shadow(x, y, 6, .4); r.actor(x, y, this.hop, (g, ox, oy) => blob.draw(g, ox, oy, r.view)); } };
};
