/* 14-court: the beach. One TileMap (44 x 28 cells of 16 units): sea on the top rows, a wet line, then sand. The court's
 * rope lines are painted into the floor. Surroundings are engine props, a backdrop and a few boxes (bleachers, the DJ
 * booth, the scoreboard, the net). */
G.courtRows = function () {
  const rows = [];
  for (let r = 0; r < 28; r++) {
    let s = '';
    for (let c = 0; c < 44; c++) s += r <= 5 ? '~' : r === 6 ? ',' : '.';
    rows.push(s);
  }
  return rows;
};
G.courtLegend = { '~': { floor: 'sea', block: true }, ',': { floor: 'wet' }, '.': { floor: 'sand' } };
G.courtFloorTex = function (x, y, tag) {
  const C = G.C, n = (Math.sin(x * .37) * Math.cos(y * .29) + 1) * 4;
  if (tag === 'sea') {
    const u = G.clamp((y) / 96, 0, 1);
    return [Math.round(11 + 35 * u), Math.round(90 + 60 * u), Math.round(122 + 0.4 * (1 - u) * 50)];
  }
  if (tag === 'wet') return [201 + n, 160 + n, 106 + n];
  // sand, with the rope lines painted over the court
  const onLineX = (Math.abs(x - C.X0) < 2.2 || Math.abs(x - C.X1) < 2.2) && y >= C.Y0 - 2 && y <= C.Y1 + 2;
  const onLineY = (Math.abs(y - C.Y0) < 2.2 || Math.abs(y - C.Y1) < 2.2) && x >= C.X0 - 2 && x <= C.X1 + 2;
  if (onLineX || onLineY) return [42, 111, 208];
  const inCourt = x >= C.X0 && x <= C.X1 && y >= C.Y0 && y <= C.Y1;
  if (inCourt) return [236 + n * .3, 205 + n * .3, 140 + n * .3];
  return [243 + n * .4, 217 + n * .4, 164 + n * .4];
};
G.courtMap = function () {
  if (G._courtMap) return G._courtMap;
  G._courtMap = new E.TileMap({ rows: G.courtRows(), legend: G.courtLegend, types: {}, floorTex: G.courtFloorTex, outside: '#0a2d3d', ao: 0 });
  return G._courtMap;
};
/* the backdrop: the sea, the sun and far islands, by time of day */
G.courtBackdrop = function (tod) {
  if (!G._bg) G._bg = {};
  const k = tod === 'night' ? 'night' : tod === 'sunset' ? 'dusk' : 'day';
  if (!G._bg[k]) G._bg[k] = new E.Backdrop(k);
  return G._bg[k];
};
/* the set dressing on the far strip and the sides: boxes and props, each a queue so it sorts with the players */
G.drawCourtSet = function (r, tod) {
  const C = G.C, night = tod === 'night';
  // bleachers (far strip): three tiers of seats with the crowd in them
  const bx0 = C.X0 - 40, bx1 = C.X1 + 40;
  for (let tier = 0; tier < 3; tier++) {
    const y0 = 118 + tier * 0, z0 = tier * 6, z1 = tier * 6 + 6;
    r.queue(bx0, y0, z0, g => r.box(g, bx0, y0, z0, bx1, y0 + 12, z1, '#cfa77a', '#8a6242'), { bias: 0 });
  }
  // DJ booth (Sonny) and the scoreboard (Pepper)
  r.queue(C.NET_X - 110, 124, 0, g => r.box(g, C.NET_X - 130, 120, 0, C.NET_X - 90, 132, 18, '#2a2a3a', '#14141e'));
  r.queue(C.NET_X + 70, 124, 0, g => r.box(g, C.NET_X + 52, 120, 0, C.NET_X + 88, 128, 22, '#f6f0dc', '#c8b8a0'));
  // umbrellas and loungers on the sand
  const props = [['palm', 28, 150], ['palm', 680, 150], ['palm', 40, 400], ['palm', 668, 404], ['flowers', 60, 350], ['flowers', 640, 350], ['rock', 180, 104], ['rock', 540, 102]];
  for (const [nm, x, y] of props) r.prop(nm, x, y, 0, { size: 1.1 });
  if (night) { r.prop('torch', 230, 120, 0, { light: true, size: 1.2 }); r.prop('torch', 470, 120, 0, { light: true, size: 1.2 }); }
};
G.drawNet = function (r) {
  const C = G.C, y0 = C.Y0 - 10, y1 = C.Y1 + 10;
  r.queue(C.NET_X, C.CY, 0, g => {
    const a = r.w(C.NET_X, y0, 52), b = r.w(C.NET_X, y1, 52), c = r.w(C.NET_X, y0, 0), d = r.w(C.NET_X, y1, 0);
    E.px.line(g, a[0], a[1], c[0], c[1], '#2a2a32', 1); E.px.line(g, b[0], b[1], d[0], d[1], '#2a2a32', 1);
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, yy = y0 + (y1 - y0) * t, p1 = r.w(C.NET_X, yy, C.NET_H), p2 = r.w(C.NET_X, yy, C.NET_H - 16);
      E.px.line(g, p1[0], p1[1], p2[0], p2[1], '#f4f4f8', 1);
    }
    const t1 = r.w(C.NET_X, y0, C.NET_H), t2 = r.w(C.NET_X, y1, C.NET_H);
    E.px.line(g, t1[0], t1[1], t2[0], t2[1], '#fff8e8', 1);
  }, { bias: 2 });
};
