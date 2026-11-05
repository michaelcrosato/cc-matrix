/* Things drawn with the pen every frame (they move, glow or flicker), and the people's idle motion. A thing's function
 * gets the pen already at its place: (pen, thing, time, world, sim, presenter). Units: 16 = 1 m. */
Object.assign(S7.THINGS3D, {
  chandelier(pen, th, t) {
    const sw = Math.sin(t * .8 + th.x) * .03;
    pen.at(th.x, th.y, th.z, sw);
    pen.tube(0, 0, 0, 0, 0, 30, .5, '#2a2018');
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, x = Math.cos(a) * 14, y = Math.sin(a) * 14; pen.tube(0, 0, 2, x, y, -2, .5, '#c8a040').ball(x, y, -1, 1.5, 1.5, 1.5, '#e0b040').glow(x, y, 2, 1.6, '#ffe0a0'); }
    pen.ball(0, 0, 0, 5, 5, 4, '#e0b040');
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; pen.ball(Math.cos(a) * 9, Math.sin(a) * 9, -7, .9, .9, 2.4, '#e8f4ff'); }
  },
  runner(pen, th) { const o = th.o; pen.box(0, 0, o.stairs ? 34 : .4, o.w * M, o.d * M, o.stairs ? .6 : .6, o.color || '#8a1420'); if (!o.stairs) { pen.box(-o.w * M / 2 + 1, 0, .6, 1, o.d * M, .4, '#d0a040'); pen.box(o.w * M / 2 - 1, 0, .6, 1, o.d * M, .4, '#d0a040'); } },
  r7window(pen, th, t, w) {
    // a tall bay window: frame, moonlit panes, the snow falling past outside
    pen.box(0, 0, 40, 60, 3, 4, '#2a1a14').box(0, 0, 4, 60, 3, 4, '#2a1a14').box(-30, 0, 22, 4, 3, 40, '#2a1a14').box(30, 0, 22, 4, 3, 40, '#2a1a14').box(0, 0, 22, 2, 3, 36, '#2a1a14');
    pen.box(0, -1, 22, 56, .5, 34, '#1a2850');
    for (let i = 0; i < 26; i++) { const x = ((i * 37.3) % 54) - 27, z = 40 - ((t * (8 + (i % 5) * 2) + i * 11) % 34); pen.box(x + Math.sin(t + i) * 2, -2, z, 1, .5, 1, '#ffffff'); }
    pen.glow(0, -4, 30, 6, '#5a7aff');
  },
  r7lamp(pen, th, t) { pen.tube(0, 0, 0, 0, 0, 12, .3, '#2a2018').cone(0, 0, -6, 0, 0, 2, 9, '#d8b080').glow(0, 0, -4, 3.4 + Math.sin(t * 13) * .1, '#ffd8a0'); },
  bellbig(pen, th, t, w, sim) { const ring = sim.st.flags.bellRung ? Math.sin(t * 6) * .2 * Math.max(0, 1 - (t % 8) / 4) : 0; pen.at(th.x, th.y, th.z, 0, 1, ring); pen.box(0, 0, 40, 40, 3, 3, '#3a3030'); pen.cone(0, 0, 0, 0, 0, 30, 16, '#e0b040').ball(0, 0, 30, 5, 5, 4, '#c8a030').glow(0, 0, 14, 3, '#fff0b0'); },
  stringlights(pen, th, t) { const o = th.o, n = o.n || 12; for (let i = 0; i < n; i++) { const u = i / (n - 1), x = (o.dx || 0) * M * u, y = (o.dy || 0) * M * u, z = Math.sin(u * Math.PI) * -12; pen.glow(x, y, z, 1.4, ['#ff4040', '#ffd040', '#40ff80', '#4080ff'][i % 4]); } },
  fire(pen, th, t) { const k = .8 + Math.sin(t * 17 + th.x) * .1 + Math.sin(t * 29) * .08; pen.glow(0, 0, 6, 4 * k, '#ff8030').glow(0, 0, 10, 2.4 * k, '#ffe080'); },
  beacon(pen, th, t) { const a = t * 4; pen.ball(0, 0, 0, 3, 3, 3, '#801010').glow(Math.cos(a) * 3, Math.sin(a) * 3, 0, 3, '#ff2020'); },
  sign(pen, th) { const o = th.o; pen.at(th.x, th.y, th.z, o.yaw || 0).tube(0, 0, 0, 0, 0, 30, 1, '#3a3030').box(0, 0, 32, 3, 22, 14, o.color || '#2a5ac8'); },
  icewall(pen, th, t) { const o = th.o; for (let i = 0; i < (o.n || 6); i++) pen.box(i * 18 - (o.n || 6) * 9, 0, 30 + Math.sin(i * 2.3) * 10, 16, 8, 60 + Math.cos(i * 1.7) * 20, i % 2 ? '#9ad8f0' : '#bfeaff'); pen.glow(0, 6, 40, 6, '#7ad8ff'); },
  frozenperson(pen, th, t) { pen.box(0, 0, 18, 14, 12, 38, '#bfeaff').ball(0, 0, 30, 4, 4, 4, '#d8c8b8').box(0, 0, 12, 6, 4, 22, th.o.color || '#4a5a70'); }
});
/** people's idle motion: Murmel bobs on his bungee, Pim rocks on a floating chair, Rosalind knits */
S7.peopleAnim = (sim, d, t) => {
  if (d.epilogue) return { hidden: !sim.epilogue, state: { pose: 'kneel', expr: 'smile' } };
  if (d.cabinRoof) return { hidden: sim.W.node !== 'mid', dz: Math.sin(t * 1.4) * 2, fade: .6 };
  if (d.who === 'pim') { const seen = sim.spots.some(s => s.kind === 'pim' && !sim.spotUsed(s)) || d.always; return { dz: 20 + Math.sin(t * 1.2) * 3, hidden: !seen && !d.always, fade: .55 + Math.sin(t * 2) * .1, state: { pose: 'kneel' } }; }
  if (d.who === 'murmel') return { dz: Math.sin(t * 2.2) * 2, facing: Math.atan2(sim.hero.y - d.at[1] * M, sim.hero.x - d.at[0] * M) };
  if (d.knit) return { state: { pose: 'kneel', attack: E.move('cast', (t * .7) % 1) } };
  if (d.who === 'holle') return { state: { down: 1 } };
  return {};
};
/** per-frame extras: Pim's chair, Murmel's bungee cords and ski rack, Holle's heaving featherbed */
S7.drawExtra = (R, pres, pen, t) => {
  const sim = pres.sim;
  for (const p of R.people) {
    const d = p.def;
    if (d.who === 'pim' && p.a.visible) { const z = p.a.z; pen.at(p.a.x, p.a.y, z); pen.box(0, 0, -2, 16, 12, 2, '#3a5a8a').box(-6, 0, 8, 2, 12, 18, '#3a5a8a').tube(0, 0, 18, 0, 0, 90, .5, '#4a4a52').glow(0, 0, 4, 3, '#c8f0ff'); }
    if (d.who === 'murmel') { pen.at(p.x, p.y, p.z); pen.box(-14, 0, 14, 4, 30, 30, '#5a3a22').tube(0, -5, 12, -12, -10, 22, .5, '#e02020').tube(0, 5, 12, -12, 10, 22, .5, '#20a0e0'); }
  }
  if (R.id === 'room7') {
    const shake = sim.st && sim.st.flags.coldOpenShake ? Math.sin(t * 20) * 1.5 : 0;
    pen.at(2.2 * M, 3.2 * M, 0);
    for (let i = 0; i < 9; i++) { const a = i * 1.7; pen.ball(Math.cos(a) * 8 + (i % 3) * 4 - 6, Math.sin(a) * 9, 18 + (i % 2) * 3 + Math.sin(t * 1.3 + i) * .6 + shake, 7, 7, 4, '#f4f4f8'); }
  }
};
/** Murmel is a marmot: a Blob (§8.3), drawn as an actor beside his rack */
S7.peopleBlob = (who) => who === 'murmel' ? new E.Blob({ R: 9, ears: 'cat', feet: true, mouth: true, face: 'front', colors: { dk: '#c8c4bc', base: '#f4f4f0', lt: '#ffffff', spec: '#ffffff', eye: '#1a1010', pupil: '#000000' } }) : null;
