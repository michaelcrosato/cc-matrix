/* 15-anim: volleyball moves, celebrations, emotes and photo poses on the rigs. The rig's own walk, run, idle and jump
 * stay underneath; on top, rig.solvePose is wrapped so a timed move re-solves the arms with E.ik3 toward targets in the
 * rig's own frame ([forward, right, up] at size 1), blended by a weight curve (wind in, hold, release), and can bend the
 * upper body (a bow, a lean). Moves are driven from the simulation's plan: a spike's jump starts at t* minus its rise
 * time and the hitting hand reaches for the ball at t*. rig.vb = { kind, u, w, aim } is set each step by its owner. */
const V = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const bendUpper = (J, ang, keys) => {   // lean the body above the hips forward by ang radians
  const c = Math.cos(ang), s = Math.sin(ang), h = J.hipC;
  for (const k of keys) { const p = J[k]; if (!p) continue; const f = p[0] - h[0], z = p[2] - h[2]; J[k] = [h[0] + f * c + z * s, p[1], h[2] - f * s + z * c]; }
};
const UPPER = ['shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR'];
/** hand targets per move: [left, right] as [f, r, z] (z above the feet, at size 1), or null to keep the rig's own */
G.MOVES = {
  ready: u => [[4.5, -1.6, 12.5], [4.5, 1.6, 12.5]],
  bump: u => { const sw = Math.min(1, u * 1.6); return [[5.5, -.4, 10.5 + sw * 4], [5.5, .4, 10.5 + sw * 4]]; },
  dig: u => [[6.5, -.4, 7], [6.5, .4, 7]],
  set: u => { const p = u < .4 ? u / .4 : 1; return [[1.6 + p * .8, -1.3, 26 + p * 3.5], [1.6 + p * .8, 1.3, 26 + p * 3.5]]; },
  spike: u => u < .55 ? [[4, -1.6, 28 + u * 4], [-2.5, 2, 26 + u * 8]] : [[3, -1.8, 20], [6 - (u - .55) * 4, 1.2, 31 - (u - .55) * 24]],
  shot: u => u < .55 ? [[4, -1.6, 28], [0, 2, 30]] : [[3, -1.8, 22], [5, 1, 31 - (u - .55) * 10]],
  block: u => [[1.8, -1.9, 33], [1.8, 1.9, 33]],
  toss: u => [[4 - u, -1.2, 16 + u * 14], [-1, 2.4, 20 + u * 8]],
  serve: u => u < .5 ? [[3, -1.6, 24], [-2, 2.2, 30]] : [[2, -1.8, 18], [6, 1, 30 - (u - .5) * 20]],
  dive: u => [[8, -2, 8], [8, 2, 8]],
  call: u => [[1, -2.2, 31], null],
  whiff: u => [[5, -.6, 9 + u * 6], [5, .6, 9 + u * 6]],
  highfive: u => [null, [4.2, 2.2, 26]],
  clap: u => { const o = Math.abs(Math.sin(u * 18)) * 1.6; return [[4.5, -o - .2, 18], [4.5, o + .2, 18]]; },
  fistpump: u => [null, [1.5, 2.3, 22 + Math.abs(Math.sin(u * 14)) * 8]],
  salute: u => [null, [3.2, 1.3, 26.5]],
  peace: u => [null, [3.6, 1.9, 25.5]],
  facepalm: u => [null, [3.2, .6, 25]],
  shaka: u => [null, [3, 3 + Math.sin(u * 20) * .6, 24]],
  stretch: u => [[-.5, -1.4, 33], [-.5, 1.4, 33]],
  give: u => [[6, -1, 16], [6, 1, 16]],
  hips: null, wave: null, cheer: null, sit: null, victory: null, sunbathe: null, shrug: u => [[2, -3.2, 18], [2, 3.2, 18]],
  // moves a motion clip plays (the arms are left to it)
  bow: () => [null, null], nod: () => [null, null], dance: () => [null, null], backflip: () => [null, null], lookback: () => [null, null], hop: () => [null, null], reject: () => [null, null],
  fall: () => [null, null], foldarms: () => [null, null], cheer2: () => [null, null], confused: () => [null, null], angry: () => [null, null], cartwheel: () => [null, null], partydance: () => [null, null]
};
/* ---- motion-capture clips (vendor/mocap/aoa-clips.js, cut from the engine's Quaternius, Mesh2Motion and CMU sets with
 * tools/anim-set.mjs): a move with a clip plays it on the rig at its own build, faded by the move's weight; upper body
 * only while the rig is moving ---- */
G.CLIP_OF = { bow: 'Bow', fistpump: 'Victory Fist Pump', nod: 'Head Nod', clap: 'Dance Charleston', dance: 'Dance Charleston', partydance: 'Dance Body Roll', shaka: 'Wave_Hello', wave: 'Wave_Hello',
  salute: 'Salute', backflip: 'Backflip', shrug: 'Shrug', reject: 'Reject', hop: 'Cheer_One_arm', cheer2: 'Cheering_Two_Hands', fall: 'Fall_On_Face', stretch: 'Stretch_Yawn',
  foldarms: 'Idle_FoldArms_Loop', confused: 'Confused', angry: 'Angry', cartwheel: 'Cartwheel', groove: 'Dance_Loop' };
G.Mocap = () => (typeof Mocap !== 'undefined' ? Mocap : null);   // (mocap.js declares it at the top level: shared by name, not on window)
G.clipLib = () => { if (G._clips !== undefined) return G._clips; try { G._clips = G.Mocap() && window.MOCAP && window.MOCAP.AOA ? G.Mocap().load(window.MOCAP.AOA) : null; } catch (e) { G._clips = null; G.game && G.game.fail('mocap', e); } return G._clips; };
G.clipPlaying = rig => !!(rig._mocapOn && rig.mocapW > 0 && rig._clipName);
const MOVE_POSE = { cheer: 'cheer', wave: 'wave', hips: 'hips', victory: 'cheer', sit: 'kneel', sunbathe: 'down', dance: 'cheer', kneel: 'kneel' };
G.anim = {
  /** wrap a rig's solvePose once */
  rig(rig) {
    if (rig._vbWrapped) return rig; rig._vbWrapped = true;
    // the clip player first (Mocap.drive installs its own update and solvePose from the prototype), then ours on top
    const lib0 = G.clipLib(); if (lib0) { G.Mocap().drive(rig, lib0); rig._mocapOn = true; rig.mocap = null; }
    const baseUpdate = rig.update;
    rig.update = function (dt, st) {
      const vb = this.vb, lib = G.clipLib(), name = vb && vb.kind && G.CLIP_OF[vb.kind], clip = name && lib && lib.clip(name);
      if (clip) {
        const u = clamp(vb.u || 0, 0, 1), tt = clip.loop ? (this.t || 0) : u * clip.dur;
        this.mocap = lib.sample(clip, tt); this.mocapW = clamp(vb.w === undefined ? 1 : vb.w, 0, 1); this._clipName = name;
        this.mocapMask = st && Math.hypot(st.vx || 0, st.vy || 0) > 5 ? 'upper' : null;
      } else if (this._mocapOn) { this.mocapW = 0; this.mocap = null; this._clipName = null; }
      return baseUpdate.call(this, dt, st);
    };
    const base = rig.solvePose;
    rig.solvePose = function () {
      base.call(this);
      const vb = this.vb; if (!vb || !vb.kind || !(vb.w > 0)) return;
      const J = this.J, o = this.o, w = clamp(vb.w, 0, 1), kind = vb.kind;
      if (kind === 'bow') bendUpper(J, .75 * w, UPPER);
      else if (kind === 'nod') { const h = J.head; J.head = [h[0] + Math.sin(vb.u * 18) * .7 * w, h[1], h[2] - Math.abs(Math.sin(vb.u * 18)) * .4 * w]; }
      else if (kind === 'dig' || kind === 'bump') bendUpper(J, (kind === 'dig' ? .45 : .22) * w, UPPER);
      else if (kind === 'dive') bendUpper(J, 1.1 * w, UPPER);
      else if (kind === 'lookback') { for (const k of UPPER) { const p = J[k]; J[k] = [p[0] * (1 - .4 * w), p[1] + (k === 'head' ? .8 : .3) * w, p[2]]; } }
      else if (kind === 'facepalm') bendUpper(J, .25 * w, UPPER);
      const f = G.MOVES[kind]; if (!f) return;
      const tg = f(vb.u || 0, vb), sides = [['shL', 'elbowL', 'handL', -1], ['shR', 'elbowR', 'handR', 1]];
      sides.forEach(([sh, el, hd, s], i) => {
        let t = tg[i]; if (!t) return;
        if (vb.aim && i === 1 && (kind === 'spike' || kind === 'set' || kind === 'bump' || kind === 'serve')) t = V(t, vb.aim, .5 * Math.min(1, vb.u * 2));
        const S = J[sh], [e2, h2] = E.ik3(S, t, o.armUpper, o.armLower, [-.4, s * 1, -.7]);
        J[el] = V(J[el], e2, w); J[hd] = V(J[hd], h2, w);
      });
    };
    return rig;
  },
  /** the pose and body state for a move (fed to rig.update) */
  pose(kind) { return MOVE_POSE[kind] || null; },
  /** a weight curve: in over `win` of the move, hold, out over `wout` */
  weight(u, win = .15, wout = .2) { return u < win ? E.ease.outQuad(u / win) : u > 1 - wout ? E.ease.inQuad((1 - u) / wout) : 1; }
};
/** each fighter's signature celebration (1.2 s) */
G.CELEB = {
  bow: { move: 'bow', dur: 1.4 }, fistpump: { move: 'fistpump', dur: 1.2, hop: 4 }, nod: { move: 'nod', dur: 1.2, pose: 'hips' }, dance: { move: 'dance', dur: 1.6 },
  shaka: { move: 'shaka', dur: 1.2 }, backflip: { move: 'backflip', dur: 1.4 }, cheer2: { move: 'cheer2', dur: 1.6 }, salute: { move: 'salute', dur: 1.2 }
};
/** a small speech bubble over someone's head ("MINE!") */
G.bubble = (r, x, y, z, text, col = '#ffffff') => {
  r.queue(x, y, z, g => {
    const [sx, sy] = r.w(x, y, z), w = E.font.width(text) + 6, X = Math.round(sx - w / 2), Y = Math.round(sy - 12);
    px.rect(g, X, Y, w, 10, '#101820'); px.rect(g, X + 1, Y + 1, w - 2, 8, col); px.rect(g, Math.round(sx) - 1, Y + 10, 3, 2, '#101820');
    E.font.text(g, text, X + 3, Y + 2, '#101820', { outline: false });
  }, { bias: 50 });
};
