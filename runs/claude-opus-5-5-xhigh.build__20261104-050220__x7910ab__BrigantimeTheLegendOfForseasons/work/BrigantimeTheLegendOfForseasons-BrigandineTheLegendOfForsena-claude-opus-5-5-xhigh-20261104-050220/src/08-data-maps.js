// BATTLE MAPS (13): rows top first, one character per hex (terrain codes in 01-data-rules.js); anchors 1 2 3 attacker,
// 7 8 9 defender, 1 2 3 4 seats (shrine). Odd rows sit half a hex right. flood: shallows flood in Spring. blockShape:
// how '#' hexes are drawn (hexblock, cottage, gear, cliff). The data suite checks every row, anchor and season.

const MAP = (id, o) => G.def('map', id, Object.assign({ flood: false, blockShape: 'hexblock', mode: 'siege' }, o));
MAP('border_meadow', { name: 'Border Meadow', desc: 'A meadow with a stream, a bridge on the road and a ruined watchtower Keep.', rows: [
  '..f.....h.ff.',
  '.ff.1.....~.f',
  '......f...~h.',
  '..2..f...~...',
  ',,,,,,,,,b,K7',
  '....f....~.8.',
  '.f.......~h..',
  '..h..f...~..f',
  '...f.....~.ff'] });
MAP('river_ford', { name: 'River Ford', flood: true, desc: 'A river splits the field: two fords and one bridge. Spring floods the fords; Winter freezes the river.', rows: [
  'ff..h..w...hfff',
  '.f.1...w....ff.',
  '.....h.~..8..f.',
  'f......w...h...',
  '..2.f..w..h....',
  ',,,,,,,b,,,K7..',
  '..3.f..w..h....',
  'f......w...h...',
  '.....h.~..9..f.',
  '.f.....w....ff.',
  'ff..h..w...hfff'] });
MAP('forest_hold', { name: 'Forest Hold', desc: 'Thick woods, a winding road and a clearing Keep between two hills.', rows: [
  '...ff....ff..ff',
  '..fff...fff.fff',
  '..1ff.ff.f8..ff',
  '.....fff..h.h..',
  '......f,,,.....',
  ',2...,,..,,K7..',
  '..,,,,..ff.....',
  '....ff.fffh.h..',
  '.f3.fff.ff9..ff',
  'fff.ff..fff.fff',
  '.ff......ff..ff'] });
MAP('mountain_pass', { name: 'Mountain Pass', blockShape: 'cliff', desc: 'Peaks squeeze the field into a pass. Fliers cross the peaks.', rows: [
  'mmmmmmmmmmmmmmm',
  'mmmmmmmmmmmmmmm',
  '...mmmmmmmmm...',
  '..f.hmm.mm.8h..',
  '..1...r........',
  ',2,,,,,,,,,K7,.',
  '.f3.....r......',
  '....hmm.mm.9h..',
  '...mmmmmmmmm...',
  'mmmmmmmmmmmmmmm',
  'mmmmmmmmmmmmmmm'] });
MAP('hill_fort', { name: 'Hill Fort', desc: 'The Keep crowns a ring of hills, with woods on both flanks.', rows: [
  '..ff.fff.....ff',
  '.fff.ff.....fff',
  '..ff.........ff',
  '.1..h....8hh...',
  '.........hhhh..',
  ',2,,,,,,,hK7hf.',
  '.........hhhh..',
  '.3..h....9hh...',
  '...ff........ff',
  '..fffff.....fff',
  '...fffff.....ff'] });
MAP('marsh_keep', { name: 'Marsh Keep', flood: true, desc: 'Bogs and pools around a causeway road. Summer dries the swamp; Spring floods the pools.', rows: [
  '...............',
  '..fss.fss......',
  '...sss.sss.8.f.',
  '.1.ss~.ss~..h..',
  '...............',
  ',2,,,,,,,,,K7..',
  '......sss......',
  '.3ss.ss~s...9..',
  '..ssssssss.~ss.',
  '..ss.sss~..sss.',
  '......sss...ss.'] });
MAP('lakeside', { name: 'Lakeside', desc: 'A lake fills the north; in Winter it freezes and opens a straight path to the Keep.', rows: [
  '.fff........ff.',
  '.ff..LLLL..fff.',
  '.....LLLLLh.ff.',
  '.1...LLLLL..8..',
  '......LLLL.....',
  '..2...LLL..K7..',
  '...........,...',
  ',3,.....,,,9...',
  '.ff,,,,,,h...ff',
  'ffffff......fff',
  '.ff.ff.......ff'] });
MAP('ruined_abbey', { name: 'Ruined Abbey', desc: 'Broken walls and ruins around an abbey-tower Keep.', rows: [
  '.ff........ffff',
  'fff........ffff',
  '.ff..#..#....ff',
  '.1...#.r...r8..',
  '........r.r....',
  ',2,,,,,,,,,K7..',
  '..........r....',
  '.3...r.r.#.r9..',
  '..ff..#..#...ff',
  '.fff........fff',
  '..ff.........ff'] });
MAP('crossroads', { name: 'Crossroads', blockShape: 'cottage', desc: 'Two roads cross among fields, with houses making lanes. Summer wheat hides units.', rows: [
  'f......,.....f.',
  '..FF...,FF.....',
  '..FFF..,FFF.#..',
  '.1FF.#.,FF.8...',
  '.......,.#.....',
  ',2,,,,,,,,,K7,,',
  '.......,.#.....',
  '.3FF.#.,FF.9...',
  '..FFF..,FFF.#..',
  '..FF...,FF.....',
  'f......,.....f.'] });
MAP('capital_citadel', { name: 'Capital Citadel', desc: 'Ramparts round a courtyard and Keep, with gates on the road. Fliers cross the walls.', rows: [
  '..fffff.......fff',
  '.fffff........ff.',
  '..ff.............',
  '......h...####...',
  '.1........#8gg#..',
  '.....h...#gggg#ff',
  ',,,,,,,,,,ggK7g#f',
  '.2.......#gggg#ff',
  '..........#g9g#..',
  '......h..,g###...',
  '.ff3....,,.......',
  'fff..,,,......ff.',
  '.ff.,,ff......fff'] });
MAP('meridian_clockyard', { name: 'Meridian Clockyard', blockShape: 'gear', hour: true, desc: 'The clock-city: an outer wall, gear blocks, and the Great Clock tower as the Keep.', rows: [
  '..,,...........rr',
  '...,,,,.......rrr',
  '...rr..,g####..rr',
  '..rrr..#gg8g#....',
  '.1.rr..#g#gg##...',
  '......#gggggg#...',
  ',2,,,,,gggK7g##..',
  '......#gggggg#...',
  '.3.rr..#g#gg##...',
  '..rrr..#gg9g#....',
  '...rr..,g####..rr',
  '...,,,,.......rrr',
  '..,,...........rr'] });
MAP('clockwork_sanctum', { name: 'Clockwork Sanctum', blockShape: 'gear', hour: true, mode: 'sanctum', desc: 'A round dial chamber. Light the four Season Dials and the Wheel will turn.', rows: [
  '###############',
  '####gggggg#####',
  '####gggDggg####',
  '###gggggggg####',
  '###gg#ggg#gg###',
  '##gggg8ggggg###',
  '##gDgggK7ggDg##',
  '##gggg9ggggg###',
  '###gg#ggg#gg###',
  '###gggggggg####',
  '####gggDggg####',
  '####g1g2g3#####',
  '###############'] });
MAP('wheel_shrine', { name: 'Wheel Shrine', mode: 'shrine', desc: 'Four corners around the Hour Shrine. The season turns every bell.', rows: [
  '..........~....',
  'f4.f..f..~...1~',
  '........~......',
  '..f..f.~....~..',
  '...........~...',
  '.f..f.gg..~....',
  'F.....gKg...h..',
  '....F.gg......h',
  '..F......h.....',
  'F.....F....h...',
  '....F..........',
  '.3......h....2.',
  'F.....F...h....'] });

/** a map's rows parsed: { w, h, codes (terrain per cell, anchors as plain), anchors { '1': [cx, cy], ... }, keep } */
G.parseMap = id => {
  const m = G.get('map', id), h = m.rows.length, w = m.rows[0].length, codes = [], anchors = {};
  let keep = null; const dials = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let ch = m.rows[y][x];
    if (/[1-9]/.test(ch)) { anchors[ch] = [x, y]; ch = '?'; }
    if (ch === 'K') keep = [x, y];
    if (ch === 'D') dials.push([x, y]);
    codes.push(ch);
  }
  // an anchor stands on the terrain most common around it (courtyard inside walls, plain in the open)
  for (const [x, y] of Object.values(anchors)) {
    const n = {}; for (const c of G.hex.neighbours([x, y])) { if (!G.hex.inside(c, w, h)) continue; const t = codes[c[1] * w + c[0]]; if ('.,ghfrF'.includes(t)) n[t] = (n[t] || 0) + 1; }
    const best = Object.entries(n).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    codes[y * w + x] = best && best[0] !== 'f' && best[0] !== 'h' ? best[0] : '.';
  }
  return { w, h, codes, anchors, keep, dials };
};
/** the map a battle uses in a season: codes after the season's transforms */
G.seasonCodes = (id, season) => { const p = G.parseMap(id), m = G.get('map', id); return p.codes.map(c => G.seasonTerrain(c, season, m.flood)); };
