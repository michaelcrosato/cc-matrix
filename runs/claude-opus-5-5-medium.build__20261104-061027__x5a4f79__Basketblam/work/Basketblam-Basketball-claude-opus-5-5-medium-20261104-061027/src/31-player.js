/* PLAYERS: the entity (body, ratings, state machine fields, turbo, juice), the rig factory (jerseys, shorts, numbers,
 * hair), the pose layer over the engine's solvePose (hands that hold, dribble, shoot, dunk, swat, shove and celebrate,
 * solved by IK), and the input sources that write each slot's command every step (local device, CPU, network, script). */
const juiceK = p => .85 + .15 * p.juice;
const rate = (p, k) => p.r[k] * (k === 'slam' && p.def.team === 'blambots' && S.match && S.match.overclock > 0 ? 1.1 : 1);
const fac = {
  zoom: p => (.86 + .028 * rate(p, 'zoom')) * juiceK(p), splash: p => (.78 + .045 * rate(p, 'splash')) * juiceK(p), deep: p => (.70 + .06 * rate(p, 'deep')) * juiceK(p),
  slam: p => (.75 + .05 * rate(p, 'slam')) * juiceK(p), swipe: p => (.55 + .09 * rate(p, 'swipe')) * juiceK(p)
};

/** a rig dressed from a player's or npc's spec */
function dressRig(spec, team, o = {}) {
  const rg = spec.rig || spec, tm = team ? get('team', team) : null;
  const colors = { skin: rg.skin, hair: rg.hairColor || '#1a1410', cloth: rg.cloth || (tm ? tm.jersey : '#8a8a94'), trim: rg.trim || (tm ? tm.trim : '#ffffff'), pants: tm ? tm.shorts : '#3a3a44',
    boot: tm ? tm.sneaker : '#f4f4f4', glove: tm ? tm.trim : rg.skin, belt: rg.belt || (tm ? tm.shorts : '#2a2a2a'), coat: rg.coat };
  if (rg.robot) Object.assign(colors, { skin: rg.skin, cloth: tm.jersey, glove: '#8a909a' });
  if (rg.gorilla) Object.assign(colors, { cloth: tm ? tm.jersey : '#f4f0ea' });
  const rig = new E.Humanoid(Object.assign({ size: rg.size || 1.6, build: rg.build || 'heroic', weapon: null, outfit: rg.outfit || 'shirt', sleeves: rg.outfit === 'coat' ? 'long' : 'none', hair: rg.hair || 'short',
    hat: rg.hat, colors, hunch: rg.hunch || 0, eyeGlow: rg.eyeGlow, speedRef: 90 }, rg.outfit === 'coat' ? {} : { shorts: { len: .78, sock: tm ? tm.sock : '#ffffff', sockLen: .4 } }, rg.legs ? { legUpper: 7.4 * rg.legs, legLower: 7.4 * rg.legs } : {}, o));
  rig.bb = { targets: null };
  const base = rig.solvePose;
  rig.solvePose = function () { base.call(this); poseLayer(this); };
  rig._headR0 = rig.o.headR;
  return rig;
}
function setBigHeads(rig, on) { rig.o.headR = rig._headR0 * (on ? 1.9 : 1); }

/** the pose layer: hand targets ([forward, right, up] at size 1, in the rig's frame) solved by IK on top of the
 *  engine's pose. rig.bb.targets = { R, L } (either may be missing: that arm keeps the engine's pose) */
function poseLayer(rig) {
  const T = rig.bb && rig.bb.targets; if (!T) return;
  const o = rig.o, J = rig.J, kz = (o.hipZ + o.torso) / 23.9, kr = (o.armUpper + o.armLower) / 10.9;
  for (const side of ['R', 'L']) {
    const t = T[side]; if (!t) continue;
    const sh = J['sh' + side], s = side === 'R' ? 1 : -1;
    const target = [t[0] * kr + (T.lean || 0), t[1] * kr, t[2] * kz];
    const [el, hd] = E.ik3(sh, target, o.armUpper, o.armLower, [-.4, s * 1, -.6]);
    J['elbow' + side] = el; J['hand' + side] = hd;
  }
}
/** a local point of the rig in the world */
function rigPoint(rig, p) { const w = rig.worldOffset(p); return [rig.x + w[0], rig.y + w[1], rig.z + w[2]]; }
function handWorld(rig, side) { return rigPoint(rig, rig.J['hand' + side]); }

/* ---- the entity ---- */
function makePlayer(slot, id, team) {
  const def = get('player', id);
  const p = {
    slot, id, team, def, name: def.name, r: def.ratings, rig: dressRig(def, def.team),
    x: XM, y: YM, z: 0, vx: 0, vy: 0, vz: 0, facing: team === 0 ? 0 : Math.PI, state: 'run', st: 0,
    turbo: 1, turboIdle: 0, juice: 1, src: null, cmd: emptyCmd(), cool: { steal: 0, shove: 0, spin: 0, pass: 0, catch: 0 },
    nova: null, powerup: null, knock: 0, dizzy: 0, celebrate: 0, celebKind: null, taunt: 0, act: null, jump: null, dunk: null,
    dribPh: 0, dribSide: 1, cross: 0, hold: 0, stats: { PTS: 0, FGM: 0, FGA: 0, TPM: 0, TPA: 0, DNK: 0, REB: 0, AST: 0, STL: 0, BLK: 0, KD: 0, SHT: 0, NOVA: 0 },
    knocks: [], reboot: 0, intent: '', human: null, onCourt: true, lastX: 0, slipT: 0, land: 0, expr: null
  };
  p.rig.update(0, { x: p.x, y: p.y, z: 0, facing: p.facing });
  return p;
}
const emptyCmd = () => ({ mx: 0, my: 0, sD: false, sP: false, sR: false, pP: false, pD: false, tD: false, vP: false, oP: false, aP: false });
const reach = p => 35 * p.rig.o.size * ((p.rig.o.hipZ + p.rig.o.torso + p.rig.o.armUpper + p.rig.o.armLower) / 34.8);   // standing reach (z of the raised hands)
const handsZ = p => p.z + reach(p);
const mates = p => S.players.filter(q => q.team === p.team && q !== p);
const mate = p => mates(p)[0];
const foes = p => S.players.filter(q => q.team !== p.team);
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isAir = p => p.z > .5 || p.vz > 0;
const busy = p => ['dunk', 'hang', 'knocked', 'reboot', 'layup', 'jumpshot'].includes(p.state);

/* ---- input sources: each writes p.cmd every step ---- */
/** a local device (game.players[i]); the screen direction of the stick turns into the ground direction */
function LocalSource(input) {
  return { kind: 'local', input, read(p) {
    const I = input, c = p.cmd, m = I.move(), d = game.view.screenDirToGround(m[0], m[1]);
    c.mx = d[0]; c.my = d[1]; c.sD = I.down('shoot'); c.sP = I.pressed('shoot'); c.sR = I.released('shoot');
    c.pP = I.pressed('pass'); c.pD = I.down('pass'); c.tD = I.down('turbo'); c.vP = I.pressed('shove'); c.oP = I.pressed('oop'); c.aP = I.pressed('taunt');
  } };
}
/** a network seat: the host applies the stick, held bits and each edge event once (50-hub.js fills it) */
function NetSource(seat) {
  const st = { mx: 0, my: 0, held: 0, edges: [] };
  return { kind: 'net', seat, st, read(p) {
    const c = p.cmd, h = st.held, bit = k => !!(h & (1 << k)), ev = st.edges.splice(0);
    c.mx = st.mx; c.my = st.my; c.sD = bit(0); c.pD = bit(1); c.tD = bit(2);
    c.sP = c.sR = c.pP = c.vP = c.oP = c.aP = false;
    for (const [a, down] of ev) { if (a === 0) { if (down) c.sP = true; else c.sR = true; } if (a === 1 && down) c.pP = true; if (a === 3 && down) c.vP = true; if (a === 4 && down) c.oP = true; }
    if (c.sP && c.sR) { c.sR = false; st.edges.push([0, 0]); }   // a tap within one packet: release next step
  } };
}
/** the CPU (34-ai.js) */
function CpuSource() { return { kind: 'cpu', read(p) { brainStep(p); } }; }
/** a scripted human for tests and the attract director: fn(p, cmd) */
function ScriptSource(fn) { return { kind: 'script', read(p) { const c = p.cmd; Object.assign(c, emptyCmd()); fn(p, c); } }; }
