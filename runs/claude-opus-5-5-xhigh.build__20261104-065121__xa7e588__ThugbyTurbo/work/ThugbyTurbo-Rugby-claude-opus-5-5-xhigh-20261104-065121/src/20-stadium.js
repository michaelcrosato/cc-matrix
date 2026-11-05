/* ---- THE STADIUM: the pitch (a TileMap whose floor is painted with the markings, the venue's grass and the home crest
 * in each in-goal), the stands and their crowd, the sponsor boards, the posts, flags, the sin bin (an actual bin), the
 * dugouts, floodlight towers and the skyline beyond the far stand ---- */
const CREST_ART = {
  bird: ['.....##.....', '....####....', '...##o###...', '..########..', '.###########', '##########..', '.########...', '..######....', '...#..#.....', '...#..#.....'],
  badger: ['..##....##..', '.####..####.', '.##########.', '##w##ww##w##', '##w##ww##w##', '#w#w####w#w#', '.##########.', '..########..', '...######...', '....####....'],
  gull: ['............', '##........##', '.###....###.', '..###..###..', '...######...', '....####....', '....#oo#....', '.....##.....', '....####....', '...#....#...'],
  anvil: ['...#..#.#...', '..#.##.#....', '############', '.##########.', '...######...', '....####....', '....####....', '..########..', '.##########.', '............'],
  m: ['#..........#', '##........##', '###......###', '####....####', '##.##..##.##', '##..####..##', '##...##...##', '##........##', '##........##', '##........##']
};
TT.crestArt = CREST_ART;
const Stadium = TT.Stadium = {
  cache: {},
  /** the stadium for a venue with a home side (its crest is painted in the in-goals) */
  get(venueId, homeId) {
    const k = venueId + ':' + homeId;
    return this.cache[k] || (this.cache[k] = this.build(TT.VENUES[venueId], TT.TEAMS[homeId]));
  },
  build(V, home) {
    const COLS = G.COLS, ROWS = G.ROWS, rows = [];
    for (let r = 0; r < ROWS; r++) {
      let s = '';
      for (let c = 0; c < COLS; c++) {
        const y = r * T + 8, x = c * T + 8;
        if (r <= 2) s += c < 2 || c > COLS - 3 ? '5' : String(5 - r);     // the far stand's three tiers
        else if (r === 3) s += c < 2 || c > COLS - 3 ? '5' : 'b';            // the boards along the far touchline
        else if (r >= ROWS - 3) s += r === ROWS - 3 ? (c >= 41 && c <= 44 ? 't' : (c < 2 || c > COLS - 3 ? 't' : 'k')) : 't';   // the near barrier (a gap at the tunnel), the track
        else if (c < 2 || c > COLS - 3) s += c === 0 || c === COLS - 1 ? '7' : '6';   // the end stands
        else if (y < G.Y0 || y > G.Y1 || x < G.DX0 || x > G.DX1) s += 'a';
        else if (x < G.X0 || x > G.X1) s += 'g';
        else s += '.';
      }
      rows.push(s);
    }
    const st = V.stand, tone = c => E.tones(c);
    const floorTex = this.floorTex(V, home);
    const map = new E.TileMap({
      rows, floorTex, outside: '#141418', ao: 4,
      legend: { '.': { floor: 'grass' }, g: { floor: 'ingoal' }, a: { floor: 'apron' }, t: { floor: 'track' }, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, b: 8, k: 9 },
      types: {
        3: { h: 30, face: st.face, side: st.tiers[2], top: tone(st.tiers[2]).lt },
        4: { h: 42, face: st.face, side: st.tiers[1], top: tone(st.tiers[1]).lt },
        5: { h: 54, face: st.face, side: st.tiers[0], top: tone(st.tiers[0]).lt },
        6: { h: 30, face: st.face, side: st.tiers[2], top: tone(st.tiers[2]).lt },
        7: { h: 44, face: st.face, side: st.tiers[0], top: tone(st.tiers[0]).lt },
        8: { h: 12, face: 'none', side: '#1a1a22', top: '#2a2a34' },
        9: { h: 6, cut: true, cutH: 3, face: 'none', side: '#3a3a44', top: '#6a6a74' }
      }
    });
    // the crowd: two on each stand tile, in the two teams' colours (home 70%), each with its own bob
    const crowd = [];
    const R = TT.makeRng(V.id.length * 131 + 7);
    for (let r = 0; r < 3; r++) for (let c = 2; c < COLS - 2; c++) for (const dx of [4, 12]) if (R() < .25 + .75 * V.crowd) crowd.push({ x: c * T + dx, y: r * T + 10, z: [54, 42, 30][r], row: r, ph: R() * 9, home: R() < .7, shade: R(), skin: ['#f2cfb0', '#e0b090', '#a87050', '#6a4028'][Math.floor(R() * 4)], hat: R() < .2, flag: R() < .05 });
    for (const c of [0, 1, COLS - 2, COLS - 1]) for (let r = 4; r < ROWS - 4; r++) for (const dy of [4, 12]) if (R() < .2 + .6 * V.crowd) crowd.push({ x: c * T + 8 + (R() - .5) * 6, y: r * T + dy, z: c === 0 || c === COLS - 1 ? 44 : 30, row: 3 + (c === 0 || c === COLS - 1 ? 0 : 1), ph: R() * 9, home: R() < .7, shade: R(), skin: ['#f2cfb0', '#e0b090', '#a87050', '#6a4028'][Math.floor(R() * 4)], end: c < 3 ? -1 : 1 });
    return { map, crowd, V, home };
  },
  /** the painted pitch: mown stripes, worn white lines (dashed where the laws dash them), the in-goals' crest, mud */
  floorTex(V, home) {
    const [gr, gg, gb] = V.grass, [ir, ig, ib] = V.ingoal, [ar, ag, ab] = V.apron;
    const crest = CREST_ART[home.crest.art], cb = E.hex(home.crest.bg), cf = E.hex(home.crest.fg);
    const mud = TT.mudBlobsFor(V.id);
    const dash = (v, on = 8) => Math.floor(v / on) % 2 === 0;
    const line = (x, y) => {
      const inField = x >= G.DX0 - 1 && x <= G.DX1 + 1 && y >= G.Y0 - 1 && y <= G.Y1 + 1;
      if (!inField) return false;
      if (Math.abs(y - G.Y0) < 1.1 || Math.abs(y - G.Y1) < 1.1) return true;                       // touchlines (and touch-in-goal)
      if (Math.abs(x - G.X0) < 1.1 || Math.abs(x - G.X1) < 1.1) return true;                       // try lines
      if (Math.abs(x - G.DX0) < 1.1 || Math.abs(x - G.DX1) < 1.1) return true;                     // dead-ball lines
      if (x < G.X0 || x > G.X1) return false;
      if (Math.abs(x - G.CX) < 1.1) return true;                                                     // halfway
      if (Math.abs(x - (G.X0 + G.L22)) < 1.1 || Math.abs(x - (G.X1 - G.L22)) < 1.1) return true;    // the 22s
      if ((Math.abs(x - (G.CX - G.L10)) < 1 || Math.abs(x - (G.CX + G.L10)) < 1) && dash(y, 10)) return true;   // the 10s, dashed
      if ((Math.abs(x - (G.X0 + G.L5)) < 1 || Math.abs(x - (G.X1 - G.L5)) < 1) && dash(y, 10)) return true;     // the 5 m lines, dashed
      for (const ly of [G.Y0 + G.L5, G.Y0 + G.L15, G.Y1 - G.L15, G.Y1 - G.L5]) if (Math.abs(y - ly) < 1 && (Math.abs(x - G.CX) % 102 < 12 || x - G.X0 < 70 || G.X1 - x < 70) && dash(x, 6)) return true;
      if (Math.abs(y - G.CY) < 1 && Math.abs(x - G.CX) < 6) return true;                            // the centre mark
      return false;
    };
    return (x, y, tag) => {
      const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5;
      if (tag === 'track') { const v = 52 + n * 16 + m * 10; return [v, v - 2, v + 4]; }
      if (tag === 'apron') return [ar + n * 14 + m * 12, ag + n * 18 + m * 16, ab + n * 12];
      let [r, g, b] = tag === 'ingoal' ? [ir, ig, ib] : [gr, gg, gb];
      const stripe = Math.floor((x - G.X0) / 32) % 2 === 0 ? 1.1 : .92;
      r = r * stripe + n * 18 + m * 16; g = g * stripe + n * 26 + m * 22; b = b * stripe + n * 14 + m * 10;
      if (tag === 'ingoal') {
        // the home crest, 96 x 80, painted at 60%
        const cx = x < G.CX ? (G.DX0 + G.X0) / 2 : (G.DX1 + G.X1) / 2, u = Math.floor((x - cx + 48) / 8), v = Math.floor((y - G.CY + 40) / 8);
        if (u >= 0 && u < 12 && v >= 0 && v < 10) { const ch = crest[v][u]; if (ch !== '.') { const c = ch === '#' ? cf : ch === 'w' || ch === 'o' ? [240, 240, 240] : cb; r = lerp(r, c[0], .55); g = lerp(g, c[1], .55); b = lerp(b, c[2], .55); } }
        else if (u >= -1 && u <= 12 && v >= -1 && v <= 10) { r = lerp(r, cb[0], .3); g = lerp(g, cb[1], .3); b = lerp(b, cb[2], .3); }
      }
      if (mud) for (const bl of mud) {
        const q = (x - bl.x) ** 2 / (bl.rx * bl.rx) + (y - bl.y) ** 2 / (bl.ry * bl.ry);
        if (q < 1.25) { const k = q < 1 ? 1 : (1.25 - q) * 4; const pud = q < .25 && E.hash2(Math.floor(x / 3), Math.floor(y / 3)) > .6; r = lerp(r, pud ? 120 : 92 + n * 20, k * .9); g = lerp(g, pud ? 112 : 62 + n * 14, k * .9); b = lerp(b, pud ? 120 : 34 + n * 10, k * .9); }
      }
      if (line(x, y)) { const w = 222 + n * 26 + m * 10; return [w, w + 4, w - 6]; }
      return [r, g, b];
    };
  }
};
/** the mud patches at a venue (the same ones the simulation slows players in) */
TT.mudBlobsFor = id => {
  if (id !== 'muddington') return null;
  const R = TT.makeRng(77), out = [], n = 5 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) out.push({ x: G.X0 + 120 + R() * (G.W - 240), y: G.Y0 + 70 + R() * (G.H - 140), rx: 40 + R() * 40, ry: 26 + R() * 24 });
  return out;
};
