/* ---- BATTLE MAPS (§6.10): rows top first, one character per hex (terrain codes in 01); anchors 1 2 3 attacker, 7 8 9
 * defender (or seats 1-4). Odd rows sit half a hex right. flood: shallows become deep water in Spring ---- */
const MAP = (id, name, rows, o = {}) => G.def('map', id, Object.assign({ name, rows, blockShape: 'hexblock' }, o));
MAP('border_meadow', 'Border Meadow', [
  '..f.....h.ff.',
  '.ff.1.....~.f',
  '......f...~h.',
  '..2..f...~...',
  ',,,,,,,,,b,K7',
  '....f....~.8.',
  '.f.......~h..',
  '..h..f...~..f',
  '...f.....~.ff']);
MAP('river_ford', 'River Ford', [
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
  'ff..h..w...hfff'], { flood: true });
MAP('forest_hold', 'Forest Hold', [
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
  '.ff......ff..ff']);
MAP('mountain_pass', 'Mountain Pass', [
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
  'mmmmmmmmmmmmmmm'], { blockShape: 'cliff' });
MAP('hill_fort', 'Hill Fort', [
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
  '...fffff.....ff']);
MAP('marsh_keep', 'Marsh Keep', [
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
  '......sss...ss.'], { flood: true });
MAP('lakeside', 'Lakeside', [
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
  '.ff.ff.......ff']);
MAP('ruined_abbey', 'Ruined Abbey', [
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
  '..ff.........ff']);
MAP('crossroads', 'Crossroads', [
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
  'f......,.....f.'], { blockShape: 'cottage' });
MAP('capital_citadel', 'Capital Citadel', [
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
  '.ff.,,ff......fff']);
MAP('meridian_clockyard', 'Meridian Clockyard', [
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
  '..,,...........rr'], { blockShape: 'gear', hour: true });
MAP('clockwork_sanctum', 'Clockwork Sanctum', [
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
  '###############'], { blockShape: 'gear', hour: true, sanctum: true });
MAP('wheel_shrine', 'Wheel Shrine', [
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
  'F.....F...h....'], { seats: true });
// a map's parsed form: terrain codes per hex and anchors
G.parseMap = id => {
  const m = G.get('map', id), h = m.rows.length, w = m.rows[0].length, cells = [], anchors = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = m.rows[y][x];
    if (/[1-9]/.test(ch)) { anchors[ch] = [x, y]; const nb = G.hex.neighbors([x, y]).filter(([a, b]) => b >= 0 && b < h && a >= 0 && a < w).map(([a, b]) => m.rows[b][a]); cells.push(nb.includes('g') ? 'g' : nb.includes(',') ? ',' : '.'); }
    else cells.push(ch);
  }
  return { id, w, h, cells, anchors, keep: (() => { const out = []; cells.forEach((c, i) => { if (c === 'K') out.push([i % w, Math.floor(i / w)]); }); return out; })() };
};
