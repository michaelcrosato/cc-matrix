/* ---- RIGS: skaters, goalies, refs and set-piece people on the engine's Humanoid, with hockey gear drawn over them ---- */
const Rigs = (() => {
  const lum = c => { const h = E.hex(c); return (h[0] * .3 + h[1] * .59 + h[2] * .11); };
  const contrast = c => lum(c) > 130 ? '#141414' : '#ffffff';
  /** hockey skating posture: wraps solvePose to pitch the torso, head and arms forward by rig._lean and drop the hips */
  function leanOverlay(rig) {
    const base = rig.solvePose; if (typeof base !== 'function') return;
    rig.solvePose = function () { base.call(this); const k = this._lean || 0, J = this.J, sk = this._skid || 0; if (J && sk) { for (const n of ['shC', 'shL', 'shR', 'head', 'handL', 'handR', 'elbowL', 'elbowR']) { const q = J[n]; if (q) { const h = clamp(q[2] / 30, 0, 1.4); q[1] += sk * h * 6; } } for (const n of ['footL', 'footR']) { const q = J[n]; if (q) q[1] -= sk * 3; } } if (!k || !J) return; for (const n of ['shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR']) { const q = J[n]; if (q) { const h = clamp(q[2] / 30, 0, 1.4); q[0] += k * h * 7; q[2] -= k * h * 1.6; } } };
  }
  function skater(def, side, team, away, retro) {
    const [name, nick, num, role, rt, hand, bulky, hair, hairC, skin] = def, k = away ? team.away : team.home;
    const rig = new E.Humanoid({ size: bulky ? 1.28 : 1.18, build: bulky ? 'bulky' : 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', hair, armor: true, style: retro ? 'classic' : 'hd',
      hat: { style: 'helmet', color: k.trim === '#141414' ? '#2a2a2a' : k.trim },
      colors: { skin, hair: hairC, cloth: k.cloth, pants: k.pants, boot: '#1c1c20', belt: k.trim, trim: k.trim, glove: k.trim, plate: k.cloth, metal: k.trim } });
    leanOverlay(rig);
    return rig;
  }
  function goalie(def, team, away) {
    const k = away ? team.away : team.home;
    const rg = new E.Humanoid({ size: 1.34, build: 'bulky', weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'short', armor: true, hat: { style: 'helmet', color: team.mask },
      colors: { skin: '#e0b090', hair: '#3a2a1a', cloth: k.cloth, pants: k.pants, boot: team.pads, belt: k.trim, trim: k.trim, glove: team.pads, plate: team.pads, metal: team.mask } });
    const base = rg.solvePose; if (typeof base === 'function') rg.solvePose = function () { base.call(this); const f = this._flare || 0, J = this.J; if (!f || !J) return; for (const [n, sd] of [['footL', -1], ['footR', 1], ['kneeL', -1], ['kneeR', 1]]) { const q = J[n]; if (q) q[1] += sd * f * (n.startsWith('foot') ? 7 : 4); } };
    return rg;
  }
  const ref = () => new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'short', hat: { style: 'helmet', color: '#141414' }, colors: { skin: '#e0b090', hair: '#222', cloth: '#f2f2f2', pants: '#141414', boot: '#141414', trim: '#f08a1a', belt: '#141414', glove: '#141414' } });
  const person = (o) => new E.Humanoid(Object.assign({ size: 1.2, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short' }, o));
  const PEOPLE = {
    marge: () => person({ outfit: 'coat', hair: 'long', sleeves: 'long', colors: { skin: '#e8c4a0', hair: '#b8b8c0', cloth: '#7a5a8a', coat: '#7a5a8a', pants: '#3a3a4a', boot: '#2a2a2a' }, face: { eyes: 'big' } }),
    dunny: () => skater(TEAM.muskrats.skaters[0], 0, TEAM.muskrats, false), snipes: () => skater(TEAM.muskrats.skaters[1], 0, TEAM.muskrats, false), lou: () => skater(TEAM.muskrats.skaters[2], 0, TEAM.muskrats, false), lemmy: () => goalie(TEAM.muskrats.goalie, TEAM.muskrats, false),
    glitterman: () => person({ outfit: 'coat', hair: 'spiky', hat: null, colors: { skin: '#f0c8a0', hair: '#e8d080', cloth: '#ffd36a', coat: '#ffd36a', pants: '#2a2a2a', boot: '#1a1a1a' } }),
    chuck: () => person({ outfit: 'coat', hair: 'short', colors: { skin: '#e8c0a0', hair: '#3a2a1a', cloth: '#2a3a6a', coat: '#2a3a6a', pants: '#2a3a6a', boot: '#1a1a1a' } }),
    moose: () => person({ outfit: 'coat', hair: 'bald', build: 'bulky', colors: { skin: '#d8a880', hair: '#222', cloth: '#6a2a2a', coat: '#6a2a2a', pants: '#2a2a2a', boot: '#1a1a1a' } }),
    gus: () => person({ outfit: 'tunic', hair: 'bald', hat: 'cap', hunch: .3, colors: { skin: '#d8b090', hair: '#ddd', cloth: '#4a6a3a', pants: '#3a3a2a', boot: '#2a2a2a' } }),
    doris: () => person({ outfit: 'robe', hair: 'long', colors: { skin: '#e8c4a0', hair: '#7a9ac8', cloth: '#a04a8a', pants: '#a04a8a', boot: '#2a2a2a' } }),
    pete: () => person({ build: 'bulky', size: 1.5, outfit: 'shirt', hair: 'bald', hat: { style: 'cap', color: '#ffffff' }, colors: { skin: '#f4f4f4', cloth: '#f4f4f4', pants: '#f4f4f4', boot: '#c8d8f0', hair: '#fff' } }),
    sterling: () => skater(TEAM.grizzlies.skaters[0], 1, TEAM.grizzlies, false), vault: () => goalie(TEAM.grizzlies.goalie, TEAM.grizzlies, false)
  };
  const VOICE_OF = { MARGE: 'marge', DUNNY: 'dunny', SNIPES: 'snipes', LOU: 'lou', LEMMY: 'lemmy', GLITTERMAN: 'glitter', CHUCK: 'chuck', MOOSE: 'moose', GUS: 'gus', STERLING: 'glitter', CHAD: 'glitter', ROCCO: 'big', ROLLO: 'big', 'BIG TIMBER': 'big', 'THE VAULT': 'lou', 'POLAR PETE': 'gen', DORIS: 'gen' };
  const PORTRAIT_OF = { MARGE: 'marge', DUNNY: 'dunny', SNIPES: 'snipes', LOU: 'lou', LEMMY: 'lemmy', GLITTERMAN: 'glitterman', CHUCK: 'chuck', MOOSE: 'moose', GUS: 'gus', STERLING: 'sterling', 'THE VAULT': 'vault', 'POLAR PETE': 'pete', DORIS: 'doris' };
  const cache = {};
  const portrait = (name) => { const k = PORTRAIT_OF[name]; if (!k) { const t = ['drillers', 'lumberjacks', 'bruisers', 'marauders'][name === 'BIG TIMBER' ? 1 : name === 'ROCCO' || name === 'ROLLO' ? 2 : name === 'CHAD' ? 3 : 0]; return cache[name] || (cache[name] = skater(TEAM[t].skaters[0], 1, TEAM[t], false)); } return cache[k] || (cache[k] = PEOPLE[k]()); };
  // --- drawing ---
  function stickPoint(s) { const c = Math.cos(s.heading), sn = Math.sin(s.heading), h = s.def ? s.def[5] : 1; return [s.x + c * 11 - sn * h * 4, s.y + sn * 11 + c * h * 4]; }
  function drawSkater(r, s, view, opts = {}) {
    const rig = s.rig, show = !opts.hide;
    r.shadow(s.x, s.y, s.big ? 8 : 6.5, .38);
    r.actor(s.x, s.y, s.z, (g, ox, oy) => {
      if (s.glow) r.glowDisc(g, Math.round(ox), Math.round(oy - 12), 16, s.glow, .5);
      rig.draw(g, ox, oy, view);
      const [bx, by] = r.w(s.x, s.y, s.z), rel = (dx, dy, dz) => { const [qx, qy] = r.w(s.x + dx, s.y + dy, s.z + dz); return [Math.round(ox + qx - bx), Math.round(oy + qy - by)]; };
      const J = rig.J; if (!J) return;
      // stick: shaft from the hand to the blade heel, blade along the heading
      if (!s.noStick) {
        const hp = rig.worldOffset(J.handR || J.handL), sp = stickPoint(s), c = Math.cos(s.heading), sn = Math.sin(s.heading);
        const a = rel(hp[0], hp[1], hp[2]), b = rel(sp[0] - s.x, sp[1] - s.y, 0.6), t = rel(sp[0] - s.x + c * 6, sp[1] - s.y + sn * 6, 0.6);
        const shaft = s.items && s.items.lumber ? '#ffd020' : '#caa468';
        px.line(g, a[0], a[1], b[0], b[1], shaft, 1); px.line(g, b[0], b[1], t[0], t[1], '#2a2a2a', 1); px.dot(g, t[0], t[1], '#ffffff');
        if (s.swing > 0) px.line(g, b[0], b[1], b[0] + Math.round(c * 4), b[1] - 3, '#ffffff', 1);
      }
      // skate blades
      for (const f of [J.footL, J.footR]) { if (!f) continue; const fp = rig.worldOffset(f), p = rel(fp[0], fp[1], fp[2] - 1); px.rect(g, p[0] - 2, p[1] + 1, 5, 1, '#c8d8e8'); }
      // number on the back (facing away) or chest
      if (s.num != null && J.shC) { const sp = rig.worldOffset(J.hipC), hp = rig.worldOffset(J.shC), p = rel((sp[0] + hp[0]) / 2, (sp[1] + hp[1]) / 2, (sp[2] + hp[2]) / 2 - 1); const col = contrast(s.jersey || '#888'); E.font.text(g, String(s.num), p[0], p[1] - 3, col, { align: 'center', font: 'tiny', outline: false }); }
      if (s.hood) { const hp = rig.worldOffset(J.head), p = rel(hp[0], hp[1], hp[2]); px.disc(g, p[0], p[1], 4, s.jersey || '#888'); }
      if (s.state === 'frozen') { const p = rel(0, 0, 14); px.blend(g, .45, 'normal', () => px.rect(g, p[0] - 7, p[1] - 17, 14, 34, '#9fd8ff')); }
      if (s.state === 'buried') { const p = rel(0, 0, 8); px.rect(g, p[0] - 9, p[1] - 4, 18, 8, '#f4f8ff'); }
    }, opts.fx);
  }
  function drawGoalie(r, g_, view, k = 1) {
    const rig = g_.rig;
    r.shadow(g_.x, g_.y, 8, .4);
    r.actor(g_.x, g_.y, g_.z || 0, (g, ox, oy) => {
      rig.draw(g, ox, oy, view);
      const [bx, by] = r.w(g_.x, g_.y, g_.z || 0), rel = (dx, dy, dz) => { const [qx, qy] = r.w(g_.x + dx, g_.y + dy, (g_.z || 0) + dz); return [Math.round(ox + qx - bx), Math.round(oy + qy - by)]; };
      const J = rig.J; if (!J) return;
      const pads = g_.def.padCol;
      for (const [kn, ft] of [[J.kneeL, J.footL], [J.kneeR, J.footR]]) { if (!kn || !ft) continue; const a = rig.worldOffset(kn), b = rig.worldOffset(ft), pa = rel(a[0], a[1], a[2] + 2), pb = rel(b[0], b[1], b[2]); px.poly(g, [[pa[0] - 4, pa[1]], [pa[0] + 4, pa[1]], [pb[0] + 4, pb[1] + 1], [pb[0] - 4, pb[1] + 1]], pads); px.line(g, pa[0], pa[1], pb[0], pb[1], '#00000055', 1); }
      const hl = rig.worldOffset(J.handL), hr = rig.worldOffset(J.handR), pl = rel(hl[0], hl[1], hl[2]), pr = rel(hr[0], hr[1], hr[2]);
      px.disc(g, pl[0], pl[1], 3, pads); px.rect(g, pr[0] - 2, pr[1] - 3, 5, 6, '#2a2a2a'); px.rect(g, pr[0] - 2, pr[1] - 3, 5, 1, pads);
      const sp = rel(Math.cos(g_.heading) * 8, Math.sin(g_.heading) * 8, 1); px.line(g, pr[0], pr[1], sp[0], sp[1], '#caa468', 1); px.rect(g, sp[0] - 3, sp[1], 7, 1, '#caa468');
      const hp = rig.worldOffset(J.head), ph = rel(hp[0], hp[1], hp[2]); for (let i = -2; i <= 2; i++) px.line(g, ph[0] + i * 2, ph[1] - 3, ph[0] + i * 2, ph[1] + 4, '#2a2a2acc', 1);
      if (g_.num != null && J.shC) { const p = rel(0, 0, 18); E.font.text(g, String(g_.num), p[0], p[1] - 3, contrast(g_.jersey || '#888'), { align: 'center', font: 'tiny', outline: false }); }
    });
  }
  const prc = {};
  const pr = (s) => { const k = (s.kind || 's') + s.side + (s.nick || ''); if (!prc[k]) { prc[k] = s.kind === 'g' ? goalie(TEAM[s.team.id].goalie, s.team, s.side === 1) : skater(s.def, s.side, s.team, s.side === 1, false); prc[k].update(1 / 60, { x: 0, y: 0, z: 0, facing: PI / 2 }); } return prc[k]; };
  const face = (g, rig, x, y, size, o) => { const f = rig.facing, sp = rig.spin; rig.facing = PI / 2; rig.spin = 0; try { rig.drawPortrait(g, x, y, size, o || {}); } finally { rig.facing = f; rig.spin = sp; } };
  return { pr, face, skater, goalie, ref, person, PEOPLE, VOICE_OF, portrait, stickPoint, drawSkater, drawGoalie, contrast };
})();
