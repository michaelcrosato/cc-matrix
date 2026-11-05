/* ---- RIGS: every character is an HD Humanoid dressed for the period (masks, jingasa, kabuto, yari, yumi, kanabo and
 * sashimono come from engine patch 3), plus a quadruped Hound drawn from its own 3D skeleton. New poses are joint
 * post-processing: rig._post(J, rig) runs after the rig solves its pose each step (the ninja run, the wall hug, eating,
 * sleeping, a hand over a mouth) ---- */
const FACTION = { kanemori: '#8a6a2a', redlantern: '#7a2228', kokaku: '#2a3a6a', trial: '#3e5a32', sakubei: '#5a4a3a' };
const H = o => { const r = new E.Humanoid(o); Rigs.post(r); return r; };
const Rigs = {};
Rigs.post = rig => {
  if (rig._postWrapped) return rig; rig._postWrapped = true;
  const base = rig.solvePose;
  rig.solvePose = function () { base.call(this); if (this._post) { try { this._post(this.J, this); } catch (e) { this._post = null; } } };
  return rig;
};
/** move one arm's hand to a target in the rig's frame (re-solved with the engine's IK) */
Rigs.arm = (rig, side, target, k = 1) => {
  const J = rig.J, o = rig.o, sh = J['sh' + side]; if (!sh) return;
  const cur = J['hand' + side], t = k >= 1 ? target : [lerp(cur[0], target[0], k), lerp(cur[1], target[1], k), lerp(cur[2], target[2], k)];
  const [el, hd] = E.ik3(sh, t, o.armUpper, o.armLower, [-1, side === 'R' ? .7 : -.7, -.2]); J['elbow' + side] = el; J['hand' + side] = hd;
};
/** poses as joint post-processing (k: 0..1 how much) */
Rigs.ninjaRun = k => (J, rig) => { if (k <= .01) return; Rigs.arm(rig, 'L', [J.shL[0] - 5.5, J.shL[1] - 1.8, J.shL[2] - 5], k); Rigs.arm(rig, 'R', [J.shR[0] - 5.2, J.shR[1] + 1.8, J.shR[2] - 5.4], k); };
Rigs.wallHug = k => (J, rig) => { Rigs.arm(rig, 'L', [J.shL[0] - 1.2, J.shL[1] - 4, J.shL[2] - 4], k); Rigs.arm(rig, 'R', [J.shR[0] - 1.2, J.shR[1] + 4, J.shR[2] - 4], k); J.head = [J.head[0] - .6, J.head[1] + .8 * k, J.head[2]]; };
Rigs.eating = t => (J, rig) => { const bob = Math.sin(t * 9) * .8; Rigs.arm(rig, 'R', [J.head[0] + 2.2, J.head[1] + .4, J.head[2] - 2.2 + bob], 1); };
Rigs.sleeping = t => (J, rig) => { J.head = [J.head[0] + 1.4, J.head[1], J.head[2] - 1.2 + Math.sin(t * 1.6) * .5]; };
Rigs.mouthCover = k => (J, rig) => { Rigs.arm(rig, 'L', [J.shL[0] + 6.5, J.shL[1] + 3, J.shL[2] + 2.5], k); };
Rigs.drag = k => (J, rig) => { Rigs.arm(rig, 'L', [J.shL[0] - 4, J.shL[1] + 1, J.shL[2] - 8], k); Rigs.arm(rig, 'R', [J.shR[0] - 4, J.shR[1] - 1, J.shR[2] - 8], k); };
Rigs.handsUp = k => (J, rig) => { Rigs.arm(rig, 'L', [J.shL[0] + 1, J.shL[1], J.shL[2] + 9], k); Rigs.arm(rig, 'R', [J.shR[0] + 1, J.shR[1], J.shR[2] + 9], k); };
Rigs.swim = t => (J, rig) => { const a = Math.sin(t * 6), b = Math.cos(t * 6); Rigs.arm(rig, 'L', [J.shL[0] + 3 + a * 3, J.shL[1] - 3, J.shL[2] + b * 3], 1); Rigs.arm(rig, 'R', [J.shR[0] + 3 - a * 3, J.shR[1] + 3, J.shR[2] - b * 3], 1); };
Rigs.cower = t => (J, rig) => { Rigs.arm(rig, 'L', [J.head[0] + 1.5, J.head[1] - 1.5, J.head[2] + .5], 1); Rigs.arm(rig, 'R', [J.head[0] + 1.5, J.head[1] + 1.5, J.head[2] + .5 + Math.sin(t * 20) * .3], 1); };
Rigs.chat = t => (J, rig) => { const w = Math.sin(t * 2.3); if (w > .2) Rigs.arm(rig, 'R', [J.shR[0] + 5, J.shR[1] + 2, J.shR[2] - 1 + w * 2], (w - .2) / .8); };
Rigs.paddleTap = t => (J, rig) => { const u = Math.max(0, Math.sin(t * 7)); Rigs.arm(rig, 'R', [J.shR[0] + 4.5, J.shR[1] + .5, J.shR[2] + 1 + u * 3.5], 1); };   // Granny taps her rice paddle
Rigs.toast = k => (J, rig) => { Rigs.arm(rig, 'R', [J.head[0] + 3.2, J.head[1] + 1.6, J.head[2] - .6], k); };   // the lord raises his cup
Rigs.bow = k => (J) => { const d = 3.5 * k; for (const n of ['shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR']) { J[n] = [J[n][0] + d * (J[n][2] - J.hipC[2]) / 10, J[n][1], J.hipC[2] + (J[n][2] - J.hipC[2]) * (1 - .25 * k)]; } };
Rigs.combine = (...fs) => (J, rig) => { for (const f of fs) if (f) f(J, rig); };

/* ---- the cast ---- */
const CAST = {
  sojiro: () => H({ size: 1.25, build: 'heroic', hood: true, mask: { color: '#232a44' }, outfit: 'coat', sleeves: 'long', weapon: 'sword', bladeLen: 8, cape: { len: 4, width: 3, seg: 2 },
    colors: { hair: '#232a44', cloth: '#2a3050', coat: '#2a3050', pants: '#1e2236', belt: '#b0302a', boot: '#2a2a2e', glove: '#2a2a2e', cape: '#b0302a', capeIn: '#6a1a18', metal: '#d8dce8', trim: '#b0302a' } }),
  kaede: () => H({ size: 1.2, build: 'heroic', hair: 'ponytail', mask: { color: '#2a1a2a' }, outfit: 'tunic', sleeves: 'long', weapon: 'sword', bladeLen: 5.5, offhand: { len: 5.5 }, cape: { len: 3, width: 2, seg: 1.6 },
    colors: { hair: '#18141c', cloth: '#4a2a44', pants: '#2a1a2a', belt: '#2a8a8a', trim: '#2a8a8a', boot: '#221a22', glove: '#221a22', cape: '#2a8a8a', capeIn: '#1a5a5a', metal: '#e0e4f0' }, face: { eyes: 'big' } }),
  granny: () => H({ size: 1.0, build: 'chibi', hunch: .35, outfit: 'robe', hair: 'ponytail', weapon: 'staff', sleeves: 'long',
    colors: { hair: '#b8b0a8', cloth: '#5a4030', trim: '#e8dcc0', belt: '#e8dcc0', skin: '#e0c0a0', staff: '#c8a070', orb: '#f4ead5', pants: '#4a3426' } }),
  takanori: () => H({ size: 1.2, build: 'heroic', outfit: 'robe', hair: 'ponytail', weapon: null, sleeves: 'long', colors: { hair: '#1a1418', cloth: '#2a3a6a', trim: '#e8b04a', belt: '#e8b04a', pants: '#20284a' } }),
  kuroganeRobe: () => H({ size: 1.6, build: 'bulky', outfit: 'robe', hair: 'ponytail', weapon: null, sleeves: 'long', colors: { hair: '#2a2420', cloth: '#5a5a60', trim: '#2a2a30', belt: '#2a2a30', skin: '#c8a888' } }),
  kurogane: () => H({ size: 1.8, build: 'bulky', armor: true, hat: { style: 'kabuto', color: '#2a2a30', crest: '#c8a040' }, weapon: 'sword', bladeLen: 14, sleeves: 'long', outfit: 'coat',
    colors: { cloth: '#2a2a30', coat: '#2a2a30', plate: '#3a3a44', trim: '#8a1c1c', belt: '#8a1c1c', metal: '#d8dce8', pants: '#1e1e24', skin: '#c8a888' } }),
  kuroganeOni: () => H({ size: 2.1, build: 'bulky', armor: true, hat: { style: 'kabuto', color: '#1e1e24', crest: '#e8602a' }, mask: { style: 'oni', color: '#b0201a' }, eyeGlow: '#ff5a2a', weapon: 'sword', bladeLen: 15, sleeves: 'long', outfit: 'coat',
    colors: { cloth: '#1e1e24', coat: '#1e1e24', plate: '#4a1a1a', trim: '#e8602a', belt: '#e8602a', metal: '#ffb080', pants: '#141418' } }),
  kanemori: () => H({ size: 1.25, build: 'bulky', outfit: 'robe', hat: { style: 'band', color: '#2a1a10' }, hair: 'bald', weapon: null, sleeves: 'long', colors: { cloth: '#6a4422', trim: '#e8b04a', belt: '#e8b04a', skin: '#e0b890', pants: '#4a2e16' } }),
  gonroku: () => H({ size: 1.9, build: 'bulky', hair: 'spiky', sleeves: 'none', weapon: 'club', outfit: 'tunic', colors: { hair: '#2a1a10', cloth: '#5a4030', pants: '#3a2a1e', skin: '#c89070', metal: '#3a3a42', belt: '#2a1a10' } }),
  hotaru: () => H({ size: 1.2, build: 'heroic', hair: 'ponytail', mask: { color: '#1a1018' }, weapon: 'sword', bladeLen: 5, offhand: { len: 5 }, outfit: 'tunic', sleeves: 'long', cape: { len: 3.5, width: 2, seg: 1.7 },
    colors: { hair: '#2a0a10', cloth: '#8a1a2a', pants: '#3a0a14', belt: '#1a1018', trim: '#1a1018', cape: '#1a1018', capeIn: '#e83a2a', metal: '#e8e0f0', glove: '#1a1018' }, face: { eyes: 'big' } }),
  tobei: () => H({ size: 1.1, build: 'chibi', outfit: 'tunic', hat: { style: 'band', color: '#e8dcc0' }, weapon: null, cape: { len: 2.6, width: 4, seg: 1.4 }, colors: { cloth: '#6a5030', pants: '#3a5a3a', cape: '#3a6a3a', capeIn: '#2a4a2a', hair: '#1a1410', belt: '#3a6a3a' } }),
  ittetsu: () => H({ size: 1.4, build: 'bulky', hair: 'bald', outfit: 'robe', weapon: 'sword', bladeLen: 10, sleeves: 'long', colors: { cloth: '#6a5a40', trim: '#2a2a2a', belt: '#2a2a2a', metal: '#8a6a4a', skin: '#d8a880' } }),
  sakubei: () => H({ size: 1.2, build: 'bulky', outfit: 'robe', hat: { style: 'band', color: '#3a2a1a' }, weapon: null, sleeves: 'long', colors: { cloth: '#5a4a3a', trim: '#c8a040', belt: '#c8a040', skin: '#e0b890' } }),
  disciple: c => H({ size: 1.15, build: 'heroic', hood: true, mask: { color: '#1e1e22' }, weapon: 'sword', bladeLen: 6, outfit: 'tunic', sleeves: 'long', colors: { hair: c, cloth: c, pants: '#1e2220', belt: '#e8dcc0', metal: '#8a6a4a' } }),
  daikon: () => H({ size: 1.4, build: 'bulky', hat: { style: 'jingasa', color: '#8a7a50' }, armor: true, weapon: 'spear', colors: { cloth: '#e8e0c8', pants: '#5a6a3a', plate: '#6a6a50', metal: '#a8a8b0', skin: '#e8c8a0' } }),
  ashigaru: f => H({ size: 1.15, build: 'heroic', hat: { style: 'jingasa', color: '#3a3430' }, armor: true, weapon: 'spear', sleeves: 'long', colors: { cloth: FACTION[f] || '#6a5a3a', pants: '#2a2622', plate: '#4a4640', metal: '#b8bcc8', belt: '#1e1a16', skin: '#d8b090' } }),
  archer: f => H({ size: 1.15, build: 'heroic', hat: { style: 'jingasa', color: '#3a3430' }, armor: true, weapon: 'bow', sleeves: 'long', colors: { cloth: FACTION[f] || '#6a5a3a', pants: '#2a2622', plate: '#4a4640', staff: '#4a2a18', belt: '#1e1a16', skin: '#d8b090' } }),
  samurai: f => H({ size: 1.25, build: 'heroic', hat: { style: 'kabuto', color: '#2a2622', crest: '#c8a040' }, armor: true, sashimono: FACTION[f] || '#8a2a2a', weapon: 'sword', bladeLen: 9, sleeves: 'long', outfit: 'coat',
    colors: { cloth: FACTION[f] || '#6a5a3a', coat: shadeHex(FACTION[f] || '#6a5a3a', -.2), pants: '#1e1a18', plate: '#3a3634', metal: '#e0e4f0', belt: '#8a1c1c', skin: '#d8b090' } }),
  ninja: () => H({ size: 1.2, build: 'heroic', hood: true, mask: { color: '#1a1418' }, weapon: 'sword', bladeLen: 6, outfit: 'tunic', sleeves: 'long', colors: { hair: '#6a1a1a', cloth: '#1a1418', pants: '#141014', belt: '#c8242a', trim: '#c8242a', metal: '#c8ccd8', glove: '#141014' } }),
  merchant: () => H({ size: 1.1, build: 'chibi', outfit: 'robe', hat: { style: 'band', color: '#3a2a1a' }, weapon: null, colors: { cloth: '#6a5a3a', trim: '#3a2a1a', belt: '#3a2a1a' } }),
  maid: i => H({ size: 1.05, build: 'chibi', outfit: 'robe', hair: 'ponytail', weapon: null, sleeves: 'long', colors: { hair: '#1a1410', cloth: ['#c84a6a', '#4a8ac8', '#d8a03a'][i % 3], trim: '#f4ead5', belt: '#f4ead5' } }),
  monk: () => H({ size: 1.1, build: 'chibi', outfit: 'robe', hair: 'bald', weapon: 'staff', colors: { cloth: '#d88a2a', trim: '#8a4a1a', belt: '#8a4a1a', staff: '#6a4a2a', orb: '#e8d8a0' } }),
  drunk: () => H({ size: 1.1, build: 'chibi', outfit: 'tunic', hair: 'spiky', weapon: null, colors: { cloth: '#7a6a5a', pants: '#4a3a2a', skin: '#e8a890', hair: '#2a1a10' } }),
  noble: i => H({ size: 1.1, build: 'chibi', outfit: 'robe', hair: i % 2 ? 'ponytail' : 'short', weapon: null, sleeves: 'long', colors: { hair: '#14100c', cloth: ['#6a2a6a', '#2a5a6a', '#8a3a2a', '#3a6a3a'][i % 4], trim: '#e8b04a', belt: '#e8b04a' } }),
  servant: () => H({ size: 1.05, build: 'chibi', outfit: 'tunic', weapon: null, colors: { cloth: '#6a6a6a', pants: '#3a3a3a', belt: '#2a2a2a' } }),
  clerk: () => H({ size: 1.05, build: 'chibi', outfit: 'robe', hat: { style: 'band', color: '#2a2a2a' }, weapon: null, colors: { cloth: '#4a4a5a', trim: '#2a2a2a' } }),
  spirit: () => null
};
function shadeHex(h, k) { const t = E.tones(h); return k < 0 ? t.sh : t.lt; }
Rigs.make = (id, arg) => { const f = CAST[id]; if (!f) throw new Error('no rig ' + id); return f(arg); };
Rigs.CAST = CAST; Rigs.FACTION = FACTION;

/* ---- HOUND: a 3D skeleton (spine, head, four two-part legs on a trot, a curled tail) drawn through the view ---- */
class Hound {
  constructor(o = {}) { this.size = o.size || 1; this.C = Object.assign({ fur: '#c88a4a', cream: '#f0e0c0', dark: '#5a3a20', eye: '#1a1010', collar: '#c8242a' }, o.colors || {}); this.phase = 0; this.x = this.y = this.z = 0; this.facing = 0; this.state = 'walk'; this.speed = 0; this.t = 0; this.down = 0; this.hurtT = 0; }
  update(dt, s) { this.x = s.x; this.y = s.y; this.z = s.z || 0; this.facing = s.facing; this.speed = Math.hypot(s.vx || 0, s.vy || 0); this.state = s.state || 'walk'; this.t += dt; this.phase += dt * (2 + this.speed * .16); this.down = approach(this.down, s.down ? 1 : 0, dt * 3); this.hurtT = s.hurt ? .2 : Math.max(0, this.hurtT - dt); }
  draw(g, ox, oy, view) {
    const k = this.size, a = this.facing, ca = Math.cos(a), sa = Math.sin(a), dn = this.down;
    const P = (f, r, z) => { const wx = (f * ca - r * sa) * k, wy = (f * sa + r * ca) * k, q = view.p(wx, wy, z * k * (1 - dn * .6) + (dn ? 0 : 0)); return [ox + q[0], oy + q[1]]; };
    const fur = E.tones(this.C.fur), cr = E.tones(this.C.cream), sniff = this.state === 'sniff' || this.state === 'eat', bark = this.state === 'bark' && Math.floor(this.t * 8) % 2 === 0;
    const run = this.speed > 60, ph = this.phase, sw = run ? 3.2 : 2.2, lift = run ? 2.2 : 1.4, roll = dn ? Math.min(1, dn) : 0;
    const legs = [[5, -2.2, 0], [5, 2.2, Math.PI], [-5.5, -2.2, Math.PI], [-5.5, 2.2, 0]];
    const hz = 9 - roll * 6, headZ = sniff ? 5 : bark ? 13 : 11.5, headF = sniff ? 9.5 : 8.6;
    const draws = [];
    for (const [f, r, off] of legs) {
      const p = ph + off + (f < 0 ? .6 : 0), st = this.speed > 4 && !dn ? Math.sin(p) : 0, up = this.speed > 4 && !dn ? Math.max(0, Math.cos(p)) * lift : 0;
      const hip = P(f, r * (1 - roll), hz), knee = P(f + st * sw * .5 + (f > 0 ? .6 : -.8), r * (1 - roll) + roll * 3, hz * .5 + up), foot = P(f + st * sw, r * (1 - roll) + roll * 6, up * .6 + roll * 1);
      const far = (r < 0) !== (Math.sin(a - Math.atan2(view.fy || 1, view.fx || 0)) > 0);
      draws.push([far ? 0 : 3, () => { px.line(g, hip[0], hip[1], knee[0], knee[1], far ? fur.sh : fur.base, 2); px.line(g, knee[0], knee[1], foot[0], foot[1], far ? fur.sh : fur.base, 2); px.dot(g, foot[0], foot[1], cr.sh); }]);
    }
    const sp0 = P(-6.5, 0, hz + .5), sp1 = P(0, 0, hz + 1), sp2 = P(5.5, 0, hz + 1.6), head = P(headF, 0, headZ), snout = P(headF + 3.4, 0, headZ - 1.4), tail = P(-8.5, 0, hz + 4.5 - roll * 3), tip = P(-6.5, 1.5, hz + 7 - roll * 4);
    draws.push([1, () => {
      px.line(g, sp0[0], sp0[1], sp2[0], sp2[1], fur.sh, 6); px.line(g, sp0[0], sp0[1] - 1, sp2[0], sp2[1] - 1, fur.base, 4); px.line(g, sp0[0] + 1, sp0[1] + 1.5, sp2[0], sp2[1] + 1.5, cr.base, 2);
      px.disc(g, sp1[0], sp1[1] - 1, 1.2, fur.lt);
      px.line(g, sp0[0], sp0[1], tail[0], tail[1], fur.base, 2); px.line(g, tail[0], tail[1], tip[0], tip[1], cr.base, 2);
    }]);
    draws.push([2, () => {
      const nk = P(6, 0, hz + 2.2); px.line(g, nk[0], nk[1], head[0], head[1], fur.base, 4);
      px.disc(g, head[0], head[1], 3, fur.sh); px.disc(g, head[0] - .5, head[1] - .5, 2.3, fur.base);
      px.line(g, head[0], head[1], snout[0], snout[1], cr.base, 3); px.dot(g, snout[0], snout[1], '#1a1010');
      const e1 = P(headF + 1, -1.4, headZ + 1), e2 = P(headF + 1, 1.4, headZ + 1), ea = P(headF - 1, -1.6, headZ + 3.4), eb = P(headF - 1, 1.6, headZ + 3.4);
      px.line(g, P(headF - .5, -1.4, headZ + 1.5)[0], P(headF - .5, -1.4, headZ + 1.5)[1], ea[0], ea[1], fur.sh, 2); px.line(g, P(headF - .5, 1.4, headZ + 1.5)[0], P(headF - .5, 1.4, headZ + 1.5)[1], eb[0], eb[1], fur.sh, 2);
      if (!dn) { px.dot(g, e1[0], e1[1], this.C.eye); px.dot(g, e2[0], e2[1], this.C.eye); }
      if (bark) { const m = P(headF + 2.6, 0, headZ - 2.6); px.rect(g, m[0] - 1, m[1], 2, 2, '#5a1418'); }
      const col = P(6.2, 0, hz + 1.8); px.rect(g, col[0] - 1, col[1] - 1, 3, 2, this.C.collar);
    }]);
    draws.sort((p, q) => p[0] - q[0]); for (const d of draws) d[1]();
  }
}
B.Hound = Hound; B.Rigs = Rigs;
