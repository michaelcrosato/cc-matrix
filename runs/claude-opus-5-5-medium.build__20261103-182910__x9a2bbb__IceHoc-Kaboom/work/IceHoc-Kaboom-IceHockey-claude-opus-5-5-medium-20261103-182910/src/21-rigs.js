/* ---- Rigs: skaters, goalies, referees, staff and fans on the engine's Humanoid, with hockey gear (drawn through the
 * patched gear hook) and hockey motion (a solvePose overlay: skating strides, the stick, goalie stances) (PLAN 8, 9) ---- */
const Rigs = (() => {
  const V3 = E.V3, ik3 = E.ik3, tones = E.tones;
  let bigHeads = false, retro = false;
  /** the gear: stick, skates, numbers, goalie pads, blocker, catcher, mask cage */
  function gear(ops, h) {
    const { g, Sp, Q, J, C, u, cap, classic } = h, rig = this, gd = rig.gearOpts || {};
    const line = (A, B, col, w) => { if (cap && w > 1) cap(A, B, w / 2, w / 2, col); else px.line(g, A[0], A[1], B[0], B[1], col, Math.max(1, Math.round(w))); };
    // skates: a boot and a steel blade under each foot
    if (gd.skates) for (const k of ['footL', 'footR']) {
      if (!J[k]) continue;
      const a = Sp(J[k], -1.6, 0, -.5), b = Sp(J[k], 2.6, 0, -.5), b0 = Sp(J[k], -2, 0, -1.1), b1 = Sp(J[k], 3, 0, -1.1);
      ops.push({ d: Q[k][2] + .004, f: () => { line(a, b, gd.boot || '#1a1a22', Math.max(1, u * 1.4)); px.line(g, b0[0], b0[1] + 1, b1[0], b1[1] + 1, '#d8e4f0', 1); } });
    }
    // goalie pads, blocker and catcher
    if (gd.pads) for (const s of ['L', 'R']) {
      const kn = Q['knee' + s], ft = Q['foot' + s]; if (!kn || !ft) continue;
      const t = tones(gd.pads);
      ops.push({ d: Math.max(kn[2], ft[2]) + .006, f: () => { line(kn, ft, t.sh, Math.max(3, u * 3.6)); line([kn[0] - .6, kn[1] - .6], [ft[0] - .6, ft[1] - .6], t.base, Math.max(2, u * 2.6)); px.line(g, kn[0], kn[1] + 1, ft[0], ft[1] - 1, t.lt, 1); } });
    }
    if (gd.blocker && Q.handR) { const hd = Q.handR, t = tones(gd.pads || '#ffffff'); ops.push({ d: hd[2] + .03, f: () => { const w = Math.max(3, Math.round(u * 2.6)), hh = Math.max(4, Math.round(u * 3.4)); px.rect(g, hd[0] - w / 2, hd[1] - hh / 2, w, hh, t.sh); px.rect(g, hd[0] - w / 2 + 1, hd[1] - hh / 2 + 1, w - 2, hh - 2, t.base); } }); }
    if (gd.catcher && Q.handL) { const hd = Q.handL, t = tones(gd.pads || '#ffffff'); ops.push({ d: hd[2] + .03, f: () => { const rr = Math.max(2, u * 1.9); px.disc(g, hd[0], hd[1], rr, t.sh); px.disc(g, hd[0] - .5, hd[1] - .5, rr - 1, t.base); px.line(g, hd[0] - rr + 1, hd[1], hd[0] + rr - 1, hd[1], t.deep, 1); } }); }
    // the stick: shaft from the top hand to the heel, then the taped blade along its direction
    if (gd.stick && J.blade && !rig.noStick) {
      const top = Sp(J.stickTop), heel = Sp(J.blade), bd = J.bladeDir2 || [1, 0, 0], L = gd.goalie ? 5 : 4.5;
      const toe = Sp([J.blade[0] + bd[0] * L, J.blade[1] + bd[1] * L, J.blade[2] + bd[2] * L]);
      const st = tones(gd.stickColor || '#c89a5a'), tape = gd.tape || '#1a1a22';
      ops.push({ d: (top[2] + heel[2]) / 2 + .02, f: () => {
        px.line(g, top[0], top[1], heel[0], heel[1], st.sh, Math.max(1, Math.round(u * .75)));
        px.line(g, top[0] - .5, top[1] - .5, heel[0] - .5, heel[1] - .5, st.lt, 1);
        px.line(g, heel[0], heel[1], toe[0], toe[1], tape, Math.max(gd.goalie ? 2 : 1, Math.round(u * (gd.goalie ? 1.4 : .9))));
        px.dot(g, top[0], top[1], '#f0f0f0');
      } });
    }
    // the number on the jersey's back (or the letter on the chest)
    if (gd.number !== undefined && u > 1.6 && J.shC && !classic) {
      const mid = Sp(V3.lerp(J.hipC, J.shC, .62), -1.2, 0, 0), front = Sp(V3.lerp(J.hipC, J.shC, .62), 1.2, 0, 0);
      const back = mid[2] > front[2];
      if (back) ops.push({ d: Math.max(Q.shC[2], Q.hipC[2]) + .05, f: () => E.font.text(g, String(gd.number), mid[0], mid[1] - 2, gd.numColor || '#ffffff', { font: 'tiny', align: 'center', outline: false }) });
      else if (gd.letter) ops.push({ d: Math.max(Q.shC[2], Q.hipC[2]) + .05, f: () => E.font.text(g, gd.letter, front[0] + 1, front[1] - 3, gd.numColor || '#ffffff', { font: 'tiny', align: 'center', outline: false }) });
    }
    // the goalie's cage over the face
    if (gd.cage && J.head) {
      const R = rig.o.headR, a = Sp(J.head, R * .95, -R * .6, -R * .1), b = Sp(J.head, R * .95, R * .6, -R * .1), c = Sp(J.head, R * .95, -R * .5, -R * .55), d = Sp(J.head, R * .95, R * .5, -R * .55);
      if (a[2] > Q.head[2]) ops.push({ d: Q.head[2] + .2, f: () => { px.line(g, a[0], a[1], b[0], b[1], '#c8ccd4', 1); px.line(g, c[0], c[1], d[0], d[1], '#c8ccd4', 1); } });
    }
    // the visor: a clear shield across the eyes of a skater's helmet
    if (gd.visor && J.head && !classic) {
      const R = rig.o.headR, a = Sp(J.head, R * 1.02, -R * .7, R * .15), b = Sp(J.head, R * 1.02, R * .7, R * .15);
      if (a[2] > Q.head[2] - .1) ops.push({ d: Q.head[2] + .2, f: () => px.blend(g, .45, 'screen', () => px.line(g, a[0], a[1], b[0], b[1], '#bfe8ff', Math.max(1, Math.round(u * .7)))) });
    }
  }
  /* ---- motion: the overlay on solvePose. rig.hk = { mode, phase, speed (0..1), turbo, stop, back, hand, stick, t, ... } ---- */
  function overlay() {
    const hk = this.hk; if (!hk || this.downW > .3) return;
    const J = this.J, o = this.o, hand = hk.hand || 1;
    if (hk.mode === 'goalie') return goaliePose(this, J, o, hk);
    if (hk.mode !== 'skate') return;
    const sp = clamp(hk.speed || 0, 0, 1), ph = hk.phase || 0, stop = hk.stop || 0, turbo = hk.turbo ? 1 : 0;
    // lower the body into a skating crouch, lean the torso forward
    const low = 1.6 + sp * 1.4 + stop * 1.8, lean = .22 + sp * .25 + turbo * .15 + stop * .1, upper = ['hipC', 'hipL', 'hipR', 'shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR'];
    for (const k of upper) J[k] = [J[k][0], J[k][1], J[k][2] - low];
    const pivot = J.hipC, ca = Math.cos(lean), sa = Math.sin(lean), twist = stop * .9 * (hk.stopSide || 1);
    for (const k of ['shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR']) {
      const p = J[k], dx = p[0] - pivot[0], dz = p[2] - pivot[2]; let x = pivot[0] + dx * ca + dz * sa, z = pivot[2] - dx * sa + dz * ca, y = p[1];
      if (twist) { const tx = x - pivot[0], ty = y - pivot[1], c2 = Math.cos(twist), s2 = Math.sin(twist); x = pivot[0] + tx * c2 - ty * s2; y = pivot[1] + tx * s2 + ty * c2; }
      J[k] = [x, y, z];
    }
    // the legs: each push goes back and out on a diagonal, then the foot recovers under the hip; a stop skids both sideways
    for (const s of [-1, 1]) {
      const p = ph + (s > 0 ? PI : 0), push = Math.max(0, Math.sin(p)), rec = Math.max(0, -Math.sin(p));
      let foot = [(.6 - push * 5.5 + rec * 2) * sp + (1 - sp) * (s > 0 ? .8 : -.4), s * (o.footSpread + .4 + push * 3.4 * sp), rec * 1.6 * sp];
      if (hk.cross && sp > .4 && s === hk.cross && rec > .4) foot[1] -= s * 4;   // crossover: the outside foot crosses in front
      if (stop > 0) foot = V3.lerp(foot, [s * (hk.stopSide || 1) * 2.6 + .5, s * (o.footSpread + 2.4), 0], stop);
      if (hk.back) foot = [Math.cos(p) * 2.2 * sp - .5, s * (o.footSpread + 1.5 + Math.sin(p) * 2 * sp), Math.max(0, Math.sin(p * 2)) * .8 * sp];
      const hip = s > 0 ? J.hipR : J.hipL, [knee, f2] = ik3(hip, foot, o.legUpper, o.legLower, [1, s * .2, .1]);
      J[s > 0 ? 'kneeR' : 'kneeL'] = knee; J[s > 0 ? 'footR' : 'footL'] = f2;
    }
    stickPose(this, J, o, hk, hand, sp);
  }
  /** the stick and the hands: where the blade is for this action, the top hand by the hip, the bottom hand down the shaft */
  function stickPose(rig, J, o, hk, hand, sp) {
    if (rig.noStick || hk.stick === 'none') return;
    const t = hk.t || 0, k = rig.o.size || 1, w = Math.sin((rig.t || 0) * 9) * (hk.carry ? 2.6 : .6);
    let blade, top;
    const st = hk.stick || 'idle', hz = J.hipC[2];
    if (st === 'wind') { const c = clamp(hk.charge || 0, 0, 1); blade = [-5 - c * 3, hand * (6 + c * 2), 8 + c * 10]; top = [3, -hand * 1, hz + 3]; }
    else if (st === 'follow') { const u = clamp(t / .3, 0, 1); blade = [12 - u * 2, -hand * (1 + u * 2), 2 + u * 9]; top = [5, -hand * 2.5, hz + 4 + u * 2]; }
    else if (st === 'pass') { const u = clamp(t / .2, 0, 1); blade = [6 + u * 6, hand * (6 - u * 7), .5 + (hk.saucer ? u * 5 : 0)]; top = [3, -hand * 1.2, hz + 2]; }
    else if (st === 'poke') { const u = Math.sin(clamp(t / .35, 0, 1) * PI); blade = [9 + u * 10, hand * 1.5, .5]; top = [4 + u * 6, -hand * .8, hz + 1]; }
    else if (st === 'check') { blade = [4, -hand * 6, hz + 8]; top = [4, hand * 5, hz + 7]; }
    else if (st === 'raised') { blade = [2, hand * 2, hz + 20]; top = [1, 0, hz + 9]; }
    else if (st === 'guitar') { blade = [3, hand * 9, hz + 2]; top = [3, -hand * 7, hz + 6]; }
    else if (st === 'rifle') { blade = [14, 0, hz + 8]; top = [1, 0, hz + 7]; }
    else if (st === 'faceoff') { blade = [8, hand * 1, .5]; top = [2, -hand * 1, hz + 1]; }
    else { blade = [9.5 + Math.sin((rig.t || 0) * 4.5) * .6, hand * (3.5 + w), .5]; top = [2.5, -hand * 1.2, hz + 1.5]; }
    const dir = V3.norm(V3.sub(blade, top)), len = V3.len(V3.sub(blade, top));
    const topHand = hand > 0 ? 'handL' : 'handR', botHand = hand > 0 ? 'handR' : 'handL';
    J[topHand] = top; J[botHand] = V3.add(top, V3.mul(dir, len * .42));
    J.stickTop = V3.add(top, V3.mul(dir, -1.5)); J.blade = blade;
    const gnd = V3.norm([dir[0] || .01, dir[1], 0]); J.bladeDir2 = V3.norm([gnd[0] * .4 - gnd[1] * hand * .9 * -1, gnd[1] * .4 + gnd[0] * hand * .9 * -1 * -1, 0]);
    for (const [hk2, sh, el] of [['handL', 'shL', 'elbowL'], ['handR', 'shR', 'elbowR']]) {
      const s = sh === 'shR' ? 1 : -1, [elbow, h2] = ik3(J[sh], J[hk2], o.armUpper, o.armLower, [-1, s * .8, -.3]); J[el] = elbow; J[hk2] = h2;
    }
  }
  function goaliePose(rig, J, o, hk) {
    const st = hk.state || 'ready', dy = hk.dy || 0;
    const low = st === 'butterfly' || st === 'stack' || st === 'cover' ? 5.5 : st === 'blasted' ? 0 : 3.2;
    for (const k of ['hipC', 'hipL', 'hipR', 'shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR']) J[k] = [J[k][0] + (st === 'blasted' ? -3 : .8), J[k][1], J[k][2] - low];
    for (const s of [-1, 1]) {
      let foot;
      if (st === 'butterfly' || st === 'cover') foot = [-1.5, s * (o.footSpread + 5.5), 0];
      else if (st === 'stack') foot = [0, (dy > 0 ? 1 : -1) * (4 + (s > 0 ? 2 : 5)), s > 0 ? 2.5 : 0];
      else foot = [.3, s * (o.footSpread + 1.6), 0];
      const hip = s > 0 ? J.hipR : J.hipL, [knee, f2] = ik3(hip, foot, o.legUpper, o.legLower, [1, s * .5, .1]);
      J[s > 0 ? 'kneeR' : 'kneeL'] = st === 'butterfly' || st === 'cover' ? [2.2, s * (o.footSpread + 1.2), .8] : knee; J[s > 0 ? 'footR' : 'footL'] = f2;
    }
    const sh = J.shC[2];
    let gl = [4, -3.8, sh - 1.5], bl = [4, 3.8, sh - 4.5], blade = [7, .5, .5];
    if (st === 'glove') gl = [5, -3 - Math.max(0, -dy) * .4, sh + 2];
    if (st === 'blocker') bl = [5, 3 + Math.max(0, dy) * .4, sh + 1];
    if (st === 'poke') blade = [16, 0, .5];
    if (st === 'cover') { gl = [7, -1, 1.5]; bl = [7, 1, 1.5]; }
    if (st === 'blasted') { gl = [-1, -6, sh + 4]; bl = [-1, 6, sh + 4]; blade = [2, 6, 10]; }
    if (st === 'celebrate') { gl = [2, -4, sh + 8]; bl = [2, 4, sh + 8]; blade = [1, 4, sh + 16]; }
    J.handL = gl; J.handR = bl;
    J.blade = blade; J.stickTop = V3.add(bl, [0, 0, 3]); J.bladeDir2 = [0, -1, 0];
    for (const [hk2, sh2, el] of [['handL', 'shL', 'elbowL'], ['handR', 'shR', 'elbowR']]) { const s = sh2 === 'shR' ? 1 : -1, [elbow, h2] = ik3(J[sh2], J[hk2], o.armUpper, o.armLower, [-1, s * .9, -.3]); J[el] = elbow; J[hk2] = h2; }
  }
  const wrap = rig => { const base = rig.solvePose; rig.solvePose = function () { base.call(this); try { overlay.call(this); } catch (e) { /* a pose the overlay can't solve keeps the engine's */ } }; rig.gear = gear; return rig; };
  /** a skater's rig in a team's dark (home) or white (away) sweater */
  function skater(def, team, home) {
    const t = TEAMS[team], look = def.look || {}, jersey = home ? t.dark : t.light, trim = home ? t.trim : t.dark;
    const rig = new E.Humanoid({ size: (def.build === 'bulky' ? 1.3 : 1.2) * (bigHeads ? 1 : 1), build: def.build || 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', armor: true,
      style: retro ? 'classic' : 'hd',
      hair: look.hair || 'short', hat: { style: 'helmet', color: home ? t.dark : t.trim },
      colors: { skin: look.skin || '#e8b890', hair: look.hairC || '#3a2a1a', cloth: jersey, trim, pants: home ? t.trim === '#141414' ? '#1a1a1a' : t.dark : t.dark, boot: '#141418', belt: trim, glove: trim, plate: jersey, metal: jersey, hat: home ? t.trim : t.dark } });
    if (bigHeads) rig.o.headR = 3.4 * 1.8;
    rig.gearOpts = { skates: true, stick: true, number: def.num, letter: def.role === 'C' ? 'C' : '', numColor: home ? t.light : t.dark, stickColor: ['#c89a5a', '#2a2a30', '#e0e0e0', '#c83a2a'][def.num % 4], tape: '#141418', visor: true };
    return wrap(rig);
  }
  function goalie(def, team, home) {
    const t = TEAMS[team], look = def.look || {}, jersey = home ? t.dark : t.light;
    const rig = new E.Humanoid({ size: def.look && def.look.boss ? 1.75 : 1.3, build: 'bulky', weapon: null, outfit: 'shirt', sleeves: 'long', armor: true, style: retro ? 'classic' : 'hd',
      hair: look.hair || 'short', hat: { style: 'helmet', color: look.mask || t.trim },
      colors: { skin: look.skin || '#e8b890', hair: look.hairC || '#222', cloth: jersey, trim: t.trim, pants: t.dark, boot: '#141418', glove: look.pads || '#f0f0f0', plate: jersey, hat: look.mask || t.trim } });
    if (bigHeads) rig.o.headR = 3.4 * 1.8;
    rig.gearOpts = { skates: true, stick: true, goalie: true, pads: look.pads || '#f0f0f0', blocker: true, catcher: true, cage: true, number: def.num, numColor: home ? t.light : t.dark, stickColor: '#d8c8a8', tape: '#f0f0f0' };
    return wrap(rig);
  }
  function referee(linesman) {
    const rig = new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', hat: { style: 'helmet', color: '#141414' }, hair: 'short',
      colors: { skin: linesman ? '#c89070' : '#f0c8a0', hair: '#3a2a1a', cloth: '#f4f4f4', trim: '#ff7a1a', pants: '#141414', boot: '#141414', glove: '#141414', hat: '#141414' } });
    rig.gearOpts = { skates: true, stripes: true };
    const base = rig.gear = gear;
    // the stripes: vertical black bars over the sweater
    rig.gear = function (ops, h) {
      base.call(this, ops, h); const { g, Sp, J, Q, u } = h; if (!J.shC || u < 1.2) return;
      for (let i = -1; i <= 1; i++) { const a = Sp(J.shC, 0, i * 1.2, -.6), b = Sp(J.hipC, 0, i * 1.2, .8); ops.push({ d: Q.shC[2] + .04, f: () => px.line(g, a[0], a[1], b[0], b[1], '#141414', Math.max(1, Math.round(u * .45))) }); }
    };
    return wrap(rig);
  }
  /** staff and story characters: Coach Marge, Gus, Doris, Goldie Glitterman, Polar Pete, Chuck and Moose */
  const STAFF = {
    marge: () => new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'ponytail', colors: { skin: '#f0d0b8', hair: '#c8c8c8', cloth: '#8a3a3a', coat: '#6a4a8a', trim: '#e8b43a', pants: '#3a3a4a', boot: '#2a1a1a' } }),
    gus: () => new E.Humanoid({ size: 1.1, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'bald', hat: { style: 'cap', color: '#2a5a3a' }, hunch: .5, colors: { skin: '#e0b898', hair: '#e0e0e0', cloth: '#5a6a3a', coat: '#3a4a2a', pants: '#3a3a3a', hat: '#2a5a3a' } }),
    doris: () => new E.Humanoid({ size: 1.1, build: 'heroic', weapon: null, outfit: 'robe', sleeves: 'long', hair: 'long', colors: { skin: '#f4d8c0', hair: '#c86ab0', cloth: '#3a8a8a', trim: '#e8e0d0' } }),
    glitterman: () => new E.Humanoid({ size: 1.2, build: 'bulky', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#f0c8a8', hair: '#f0d060', cloth: '#141414', coat: '#d9a520', trim: '#fff0a0', pants: '#141414', boot: '#d9a520', eye: '#141414', iris: '#141414' } }),
    pete: () => { const r = new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'bald', colors: { skin: '#f4f8ff', hair: '#f4f8ff', cloth: '#f4f8ff', pants: '#f4f8ff', boot: '#e0389a', glove: '#f4f8ff', trim: '#18b5b0' } }); r.o.headR = 5; return r; },
    chuck: () => new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#f0c8a0', hair: '#5a3a1a', cloth: '#f0f0f0', coat: '#2a3a6a', trim: '#c83a2a', pants: '#2a2a3a' } }),
    moose: () => new E.Humanoid({ size: 1.2, build: 'bulky', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#e0a880', hair: '#8a8a8a', cloth: '#f0e8d8', coat: '#6a3a2a', trim: '#e8b43a', pants: '#2a2a2a' } })
  };
  const STAFF_NAMES = { marge: 'COACH MARGE', gus: 'OLD GUS', doris: 'DORIS', glitterman: 'GOLDIE GLITTERMAN', pete: 'POLAR PETE', chuck: 'CHUCK WALLOP', moose: 'MOOSE PLUNKETT' };
  const STAFF_VOICE = { marge: 'marge', gus: 'gus', doris: 'doris', glitterman: 'glitter', pete: 'pete', chuck: 'chuck', moose: 'moose' };
  // story cast ids for team players
  const CAST = { dunny: ['muskrats', 0], snipes: ['muskrats', 1], lou: ['muskrats', 2], lemmy: ['muskrats', 'g'], bigtimber: ['lumberjacks', 2], rocco: ['bruisers', 0], rollo: ['bruisers', 1],
    chad: ['marauders', 0], sterling: ['grizzlies', 0], vault: ['grizzlies', 'g'] };
  const cache = {};
  function cast(id) {
    if (cache[id]) return cache[id];
    let rig, name, voice;
    if (STAFF[id]) { rig = STAFF[id](); name = STAFF_NAMES[id]; voice = STAFF_VOICE[id]; }
    else if (CAST[id]) { const [tm, k] = CAST[id], def = k === 'g' ? TEAMS[tm].goalie : TEAMS[tm].skaters[k]; rig = k === 'g' ? goalie(def, tm, true) : skater(def, tm, true); rig.noStick = true; name = (def.nick || def.name).toUpperCase(); voice = (def.look && def.look.voice) || TEAMS[tm].voice; }
    else { rig = STAFF.chuck(); name = id.toUpperCase(); voice = 'mid'; }
    return (cache[id] = { rig, name, voice, id });
  }
  /* fans: tiny figures (drawn as pixels by the crowd), and the big glass pounders (classic rigs) */
  function pounder(color, skin) { return new E.Humanoid({ size: .9, style: 'classic', weapon: null, colors: { cloth: color, skin, pants: '#2a2a3a' } }); }
  return { skater, goalie, referee, cast, pounder, STAFF_NAMES, wrap, set bigHeads(v) { bigHeads = v; }, get bigHeads() { return bigHeads; }, set retro(v) { retro = v; }, get retro() { return retro; } };
})();
