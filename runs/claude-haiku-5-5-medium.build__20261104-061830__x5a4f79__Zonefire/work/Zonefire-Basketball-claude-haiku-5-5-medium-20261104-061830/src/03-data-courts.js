/* ---- COURTS (plan §10.1): each court is one data entry. The painter, the backdrop, the crowd's colors, the lights, the
 * ambient light, the dribble sound, the song and the twist are the court's; the arena and the systems are shared. ---- */
const LOGO_SNEAKER = [
  '..........', '.wwwwwwww.', 'wwwwwwwwww', 'wwwwwwwwww', '..wwwwwwww', '....wwwwww', '..wwwwwwww', 'wwwwwwwwww', '.wwwwwwww.', '..........'
];
/** a logo mask for a floor: the string rows scaled x4 into the centre of the court (court-local units), a colour per letter */
const logoAt = (rows, cx, cy, scale, colors) => (lx, ly) => {
  const w = rows[0].length * scale, h = rows.length * scale, u = Math.floor((lx - (cx - w / 2)) / scale), v = Math.floor((ly - (cy - h / 2)) / scale);
  if (u < 0 || v < 0 || u >= rows[0].length || v >= rows.length) return null;
  const ch = rows[v][u];
  return ch === '.' || ch === ' ' ? null : colors[ch] || colors.w;
};
const rgbOf = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const COURT_FLOOR = (base, dark, out, line, three) => ({
  out: rgbOf(out), line: rgbOf(line), three: rgbOf(three),
  base: (lx, ly, n, m) => { const k = Math.floor(lx / 48) % 2 ? 1 : 0, g = 1 + (k ? .06 : -.02) + n * .08 + m * .06; const c = rgbOf(base); return [c[0] * g, c[1] * g, c[2] * g]; }
});

const COURTS = {};
const courtDef = (id, d) => { COURTS[id] = Object.assign({ id }, d); return COURTS[id]; };

courtDef('skybox', {
  name: 'THE SKYBOX', home: 'hightops', song: 'skybox', dribble: 'dribble_asphalt', twist: 'jackpot',
  floor: COURT_FLOOR('#1c1a2e', '#14122a', '#2de2ff', '#ff3ca6', '#2de2ff'),
  logoMask: logoAt(LOGO_SNEAKER, 320, 144, 4, { w: [255, 255, 255], '.': null }),
  stand: { low: '#2a2440', mid: '#312a4c', high: '#3a3258', back: '#1d1836', top: '#4a4068' },
  outside: '#0c0a18', ambient: .45, sky: ['#07061a', '#1d1240', '#3a1a5a'], stars: 60, moon: { x: .82, y: .18, r: 10, color: '#f4e8ff' },
  crowd: ['#ff3ca6', '#2de2ff', '#1a1a1a', '#ffd23a'], skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'],
  lights: [[52, 0, 150, 180, .9, '#fff0d0'], [588, 0, 150, 180, .9, '#fff0d0'], [52, 288, 150, 180, .9, '#fff0d0'], [588, 288, 150, 180, .9, '#fff0d0']]
});

courtDef('pier', {
  name: 'THE PIER', home: 'breakers', song: 'pier', dribble: 'dribble_planks', twist: 'wind',
  floor: { out: rgbOf('#f2e0b0'), line: rgbOf('#ffffff'), three: rgbOf('#ffffff'), base: (lx, ly, n, m) => { const plank = Math.floor(ly / 12) % 2 ? 1 : 0, g = 1 + plank * .07 + n * .1 + m * .06, c = rgbOf('#b8844a'); return [c[0] * g, c[1] * g, c[2] * g]; } },
  logoMask: logoAt(['..aaaa..', '.aa..aa.', 'aaaaaaaa', '.aaaaaa.', '..aaaa..'], 320, 144, 4, { a: [40, 160, 220], '.': null }),
  stand: { low: '#d8b080', mid: '#c89a64', high: '#b88a58', back: '#a07448', top: '#e8c8a0' },
  outside: '#2a4a6a', ambient: .8, sky: ['#2a1a4a', '#ff7a5c', '#ffd27a'], stars: 0, moon: { x: .5, y: .6, r: 18, color: '#ffe4a0' },
  crowd: ['#ff5a8a', '#ffd23a', '#3ab0ff', '#ffffff'], skin: ['#f0c8a0', '#d8a070', '#a86a40'],
  lights: [[52, 0, 150, 200, .8, '#ffd0a0'], [588, 288, 150, 200, .8, '#ffd0a0']]
});
courtDef('scrapyard', {
  name: 'THE SCRAPYARD', home: 'crushers', song: 'scrapyard', dribble: 'dribble_concrete', twist: 'slick',
  floor: { out: rgbOf('#ffd23a'), line: rgbOf('#ffd23a'), three: rgbOf('#ffd23a'), base: (lx, ly, n, m) => { const g = .7 + n * .16 + m * .18, c = rgbOf('#4a4640'); return [c[0] * g, c[1] * g, c[2] * g]; } },
  logoMask: logoAt(['.wwwwww.', 'ww.ww.ww', '.wwwwww.', '...ww...', '.wwwwww.', 'ww.ww.ww'], 320, 144, 4, { w: [240, 200, 60] }),
  stand: { low: '#4a3a2a', mid: '#5a4632', high: '#6a5238', back: '#3a2c20', top: '#7a6040' },
  outside: '#2a2420', ambient: .6, sky: ['#120e1a', '#4a2e36', '#b0603a'], stars: 0, moon: null,
  crowd: ['#2a5ab8', '#ffd23a', '#d8641e', '#7a7a7a'], skin: ['#e0b090', '#a87050', '#6a4028'],
  lights: [[120, 0, 120, 160, .6, '#ffb070'], [520, 288, 120, 160, .6, '#ffb070']]
});
courtDef('caldera', {
  name: 'THE CALDERA', home: 'magma', song: 'caldera', dribble: 'dribble_stone', twist: 'eruption',
  floor: { out: rgbOf('#ffb020'), line: rgbOf('#ffb020'), three: rgbOf('#ffb020'), base: (lx, ly, n, m) => { const seam = (Math.floor(lx / 24) + Math.floor(ly / 24)) % 2 ? 1 : 0, g = .6 + seam * .15 + n * .08; const c = rgbOf('#2a1a1e'); return [c[0] * g + seam * 60, c[1] * g + seam * 14, c[2] * g]; } },
  logoMask: logoAt(['..rr....', '.rrrr...', 'rrrrrr..', '.rrrrrr.', '..rrrr..', '.rrrrrr.'], 320, 144, 4, { r: [255, 90, 40] }),
  stand: { low: '#3a1a14', mid: '#4a2218', high: '#5a2a1e', back: '#2a1010', top: '#6a3020' },
  outside: '#1a0404', ambient: .4, sky: ['#0c0408', '#3a0c10', '#7a1e10'], stars: 0, moon: null,
  crowd: ['#f0c040', '#ff7a2a', '#40c080', '#f4f0ea'], skin: ['#c89060', '#8a5030', '#f0c090'],
  lights: [[80, 0, 60, 140, .9, '#ff7a30'], [560, 288, 60, 140, .9, '#ff7a30']]
});
courtDef('dome', {
  name: 'THE BLAM DOME', home: 'blambots', song: 'dome', dribble: 'dribble_maple', twist: 'boss',
  floor: { out: rgbOf('#ff3a3a'), line: rgbOf('#ffd23a'), three: rgbOf('#ffd23a'), base: (lx, ly, n, m) => { const g = 1.02 + n * .06 + m * .05, c = rgbOf('#c89a5a'); return [c[0] * g, c[1] * g, c[2] * g]; } },
  logoMask: logoAt(['wwwwwwwwww', 'wrrrrrrrrw', 'wrwwwwwwrw', 'wrwwwwwwrw', 'wrrrrrrrrw', 'wwwwwwwwww'], 320, 144, 4, { w: [255, 255, 255], r: [200, 30, 40] }),
  stand: { low: '#1a1828', mid: '#24203a', high: '#2e2848', back: '#100e1e', top: '#3a3260' },
  outside: '#080612', ambient: .7, sky: ['#05040a', '#100e24', '#1d1a40'], stars: 0, moon: null,
  crowd: ['#ff3ca6', '#2de2ff', '#ffd23a', '#7af0a0', '#ffffff'], skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'],
  lights: [[64, 0, 160, 220, .7, '#ffffff'], [640, 0, 160, 220, .7, '#ffffff'], [64, 288, 160, 220, .7, '#ffffff'], [640, 288, 160, 220, .7, '#ffffff']]
});
