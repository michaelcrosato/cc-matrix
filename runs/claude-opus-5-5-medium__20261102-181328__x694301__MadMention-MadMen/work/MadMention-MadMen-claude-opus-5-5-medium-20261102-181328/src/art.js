// MAD MENTION: art and sound. Mid-century office furniture as engine shapes (data, drawn in every view), the
// original jazz loops, the Simlish voice, controller glyphs, idea cards and the projector's slides.
(() => {
const MM = window.MM = window.MM || {};
const E = My3D2dge, px = E.px;

// ---------------------------------------------------------------- furniture (E.SHAPES entries, 16 units = 1 m)
MM.registerShapes = () => {
  const S = E.SHAPES;
  S.mm_desk = { about: 'walnut executive desk, two pedestals, brass pulls', tags: 'office', mats: { w: '#6a4026 planks bw=3', t: '#4e2e1a glaze', b: 'gold' },
    parts: [['box','t',[0,0,12],[32,15,2]], ['mirror','x',['box','w',[11,0,0],[9,14,12]]], ['box','w',[0,-5,3],[14,2,9]],
      ['mirror','x',['row',3,[0,0,3.5],['box','b',[11,7.2,4],[3,.6,.8]]]]] };
  S.mm_secdesk = { about: 'steel secretary desk with a typewriter', tags: 'office', mats: { d: '#7f8f86 metal', t: '#b8bfb4 none', k: '#2a2a2e glaze', p: '#f4f1e6 none' },
    parts: [['box','t',[0,0,11],[26,13,1.5]], ['box','d',[8,0,0],[9,12,11]], ['mirror','x',['box','d',[-11.5,0,0],[1.5,12,11]]],
      ['box','k',[-2,1,12.5],[10,7,3]], ['box','k',[-2,-2.5,15.5],[10,2,1.5]], ['box','p',[-2,-3.5,16],[7,.4,4]]] };
  S.mm_chair = { about: 'leather swivel chair', tags: 'office', mats: { m: 'steel', l: '#3a2418 cloth' },
    parts: [['ring',5,4,['box','m',[0,0,0],[2,1,1]]], ['cyl','m',[0,0,1],1,6], ['box','l',[0,0,7],[9,9,2.5]], ['box','l',[0,-4.5,9],[9,2,9]]] };
  S.mm_sofa = { about: 'low teak sofa, three cushions', tags: 'office lounge', mats: { f: '#7a4a28 planks', c: '#c7652d cloth' },
    parts: [['box','f',[0,0,2],[38,14,3]], ['mirror','x',['box','f',[17,0,0],[2,13,2]]], ['row',3,[12,0,0],['box','c',[0,1,5],[11.5,11,3.5]]],
      ['row',3,[12,0,0],['box','c',[0,-5.5,8.5],[11.5,3,7]]], ['mirror','x',['box','f',[18.5,0,5],[1.5,14,5]]]] };
  S.mm_barcart = { about: 'brass bar cart with decanters', tags: 'office bar', mats: { m: 'gold', g: '#a8c8c8 glaze', a: '#c87a28 glaze', c: '#e8e8f0 glaze' },
    lights: [[0,0,18,'#ffc070',18]],
    parts: [['mirror','xy',['cyl','m',[6,3.5,0],.6,16]], ['box','g',[0,0,5],[14,9,1]], ['box','g',[0,0,13],[14,9,1]],
      ['lathe','a',[-3,0,14],[[0,0],[2,0],[2.2,3],[1.4,5],[.6,6],[.6,8],[0,8]]], ['lathe','c',[2,1,14],[[0,0],[1.8,0],[1.8,4],[.5,5],[.5,7],[0,7]]],
      ['ring',3,1.5,['cyl','c',[4,-2,14],.8,2]], ['cyl','a',[-2,1,6],2,5]] };
  S.mm_cabinet = { about: 'four-drawer steel filing cabinet', tags: 'office', mats: { s: '#8a9288 metal', h: 'steel' },
    parts: [['box','s',[0,0,0],[10,11,24]], ['row',4,[0,0,5.6],['box','h',[0,5.6,11.5],[3,.6,.8]]]] };
  S.mm_plant = { about: 'rubber plant in a white planter', tags: 'office plant', mats: { p: '#e8e2d4 glaze', l: '#3e7a3a foliage size=2.5', s: 'bark' },
    parts: [['cyl','p',[0,0,0],4,7,{r2:5}], ['cyl','s',[0,0,7],.6,10], ['ball','l',[0,0,16],5,{sz:1.2}], ['ball','l',[2.5,1,12],3.5], ['ball','l',[-2.5,-1,13],3.5]] };
  S.mm_conftable = { about: 'long walnut conference table', tags: 'office', mats: { t: '#5a321c planks bw=4 len=30', b: '#3a2010 none' },
    parts: [['box','t',[0,0,12],[80,26,2]], ['mirror','x',['box','b',[24,0,0],[6,14,12]]]] };
  S.mm_hifi = { about: 'walnut hi-fi console with a turntable', tags: 'office lounge', mats: { w: '#6a4026 planks dir=v', c: '#c8b48a cloth', k: '#1a1a1a glaze', s: 'steel' },
    parts: [['mirror','xy',['box','w',[13,4,0],[1.5,1.5,4]]], ['box','w',[0,0,4],[30,11,9]], ['mirror','x',['box','c',[9,5.6,5],[10,.4,7]]],
      ['cyl','k',[0,0,13],4.5,.6], ['cyl','s',[0,0,13.6],.6,.8], ['box','s',[5,-3,13],[1,6,.8]]] };
  S.mm_cooler = { about: 'water cooler, blue bottle', tags: 'office', mats: { b: '#e8e6dc glaze', w: '#7ab8e8 glaze' },
    parts: [['box','b',[0,0,0],[9,9,18]], ['lathe','w',[0,0,18],[[0,0],[4,0],[4.5,6],[3,8],[1,9],[0,9]]]] };
  S.mm_arclamp = { about: 'arc floor lamp, marble base', tags: 'office light', mats: { m: '#e8e4dc glaze', s: 'steel', h: '#f0e8c8 glaze' },
    lights: [[10,0,30,'#ffe0a0',60]],
    parts: [['box','m',[0,0,0],[6,6,4]], ['cyl','s',[0,0,4],.6,26], ['box','s',[5,0,30],[10,1,1]], ['cyl','h',[10,0,26],4,4,{r2:2}]] };
  S.mm_projector = { about: 'slide projector with a round tray', tags: 'office', mats: { b: '#c8c0a8 glaze', k: '#2a2a2a glaze', t: '#8a6a3a none' },
    parts: [['box','b',[0,0,0],[8,9,4]], ['cyl','k',[0,5,1.5],1.5,2,{sq:1}], ['cyl','t',[0,0,4],5,1.5], ['cyl','k',[0,0,5.5],1.5,.5]] };
  S.mm_coffee = { about: 'counter with coffee urn and cups', tags: 'office kitchen', mats: { c: '#d8d0b8 none', t: '#c86a3a glaze', u: 'steel', p: '#f0ece0 glaze' },
    parts: [['box','c',[0,0,0],[30,10,13]], ['box','t',[0,0,13],[31,11,1]], ['cyl','u',[-8,0,14],3,9], ['cyl','u',[-8,0,23],1.2,1], ['row',3,[4,0,0],['cyl','p',[6,1,14],1.3,2.5]]] };
  S.mm_credenza = { about: 'low walnut credenza', tags: 'office', mats: { w: '#6a4026 planks dir=v bw=4', b: 'gold', d: '#c8a050 glaze' },
    parts: [['box','w',[0,0,2],[30,10,10]], ['mirror','x',['box','w',[13,0,0],[2,8,2]]], ['row',3,[10,0,0],['box','b',[0,5.1,8],[2,.4,.6]]], ['cyl','d',[9,0,12],2,6,{r2:1}]] };
  S.mm_coatrack = { about: 'bentwood coat rack with a hat', tags: 'office', mats: { w: '#5a3a20 none', h: '#3a3a40 cloth', c: '#5a5040 cloth' },
    parts: [['ring',3,3,['box','w',[0,0,0],[1,4,1]]], ['cyl','w',[0,0,0],.8,32], ['cyl','h',[0,0,32],3.5,.5], ['cyl','h',[0,0,32.5],2.2,3], ['box','c',[1.5,0,14],[3,4,14]]] };
  S.mm_easel = { about: 'wooden easel with a layout board', tags: 'office studio', mats: { w: '#a07a4a none', p: '#f2eee2 none', i: '#3a3a3a none' },
    parts: [['mirror','x',['box','w',[5,0,0],[1,1,30],{rot:[0,-8,0]}]], ['box','w',[0,4,0],[1,1,26],{rot:[14,0,0]}], ['box','w',[0,-1,12],[14,2,1]],
      ['box','p',[0,-1,13],[18,1,14]], ['box','i',[-3,-1.6,18],[6,.3,5]], ['box','i',[4,-1.6,16],[5,.3,1]]] };
  S.mm_elevator = { about: 'brass elevator doors and floor dial', tags: 'office', mats: { f: 'gold', d: '#b89850 metal', k: '#2a2010 none', n: '#f0d890 glaze' },
    lights: [[0,1,38,'#ffd890',26]],
    parts: [['box','f',[0,0,0],[26,2,36]], ['mirror','x',['box','d',[5.6,.6,0],[10.5,1.4,32]]], ['box','k',[0,1.4,0],[.4,.6,32]], ['cyl','n',[0,1,38],4,1,{sq:.3}]] };
  S.mm_logo = { about: 'agency name plate', tags: 'office', mats: { b: '#1a1a1a glaze', g: 'gold' },
    parts: [['box','b',[0,0,22],[44,1.5,10]], ['box','g',[0,.9,23],[40,.3,1]], ['box','g',[0,.9,30],[40,.3,1]]] };
  S.mm_table = { about: 'round tulip table', tags: 'office kitchen', mats: { w: '#f0ece2 glaze' },
    parts: [['cyl','w',[0,0,0],5,1,{r2:1}], ['cyl','w',[0,0,1],1,9], ['cyl','w',[0,0,10],8,1]] };
  S.mm_board = { about: 'cork bulletin board', tags: 'office', mats: { c: '#b8875a speck', f: '#5a3a20 none', p: '#f2eee2 none', r: '#e0505e none', b: '#5aa8ea none' },
    parts: [['box','f',[0,0,14],[30,1.2,18]], ['box','c',[0,.4,15],[28,1,16]], ['box','p',[-8,1,20],[7,.3,8]], ['box','r',[0,1,17],[6,.3,6]], ['box','b',[8,1,22],[6,.3,7]], ['box','p',[3,1,25],[5,.3,4]]] };
};

// ---------------------------------------------------------------- music (original, code-written loops)
MM.SONGS = {
  title: { bpm: 88, steps: 2, tracks: [
    { wave: 'sine', vol: .22, notes: 'A4 - C5 - E5 - - D5 | C5 - A4 - - - . . | Bb4 - D5 - F5 - E5 D5 | E5 - - - C5 - . . | A4 - C5 - E5 - G5 - | F5 - E5 - C5 - . . | D5 - C5 - Bb4 - A4 - | G4 - - - - - . .' },
    { wave: 'triangle', vol: .32, notes: 'F2 . A2 . C3 . E3 . | D2 . F2 . A2 . C3 . | G2 . Bb2 . D3 . F3 . | C3 . E3 . G2 . Bb2 . | F2 . A2 . C3 . E3 . | D2 . F2 . A2 . C3 . | G2 . Bb2 . D3 . F3 . | C3 . E3 . G2 . E2 .' },
    { wave: 'pulse12', vol: .045, notes: '. A3 . . . C4 . . | . F3 . . . A3 . . | . Bb3 . . . D4 . . | . E3 . . . Bb3 . . | . A3 . . . C4 . . | . F3 . . . A3 . . | . Bb3 . . . D4 . . | . E3 . . . Bb3 . .' },
    { wave: 'pulse12', vol: .04, notes: '. E4 . . . A4 . . | . C4 . . . F4 . . | . F4 . . . A4 . . | . G3 . . . E4 . . | . E4 . . . A4 . . | . C4 . . . F4 . . | . F4 . . . A4 . . | . G3 . . . E4 . .' },
    { wave: 'drums', vol: .07, notes: 'k . h h s . h h | k . h h s . h h | k . h h s . h h | k . h h s . h o' } ] },
  office: { bpm: 118, steps: 2, tracks: [
    { wave: 'sine', vol: .18, notes: 'G5 - E5 - . D5 E5 - | C5 - - - A4 - . . | F5 - D5 - . C5 D5 - | B4 - - - G4 - . . | E5 - C5 - . B4 C5 - | A4 - - - E5 - . . | D5 - F5 - A5 - G5 - | G5 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . . G2 C3 . . G2 | A2 . . E2 A2 . . E2 | D3 . . A2 D3 . . A2 | G2 . . D3 G2 . . B2 | C3 . . G2 C3 . . G2 | A2 . . E2 A2 . . E2 | D3 . . A2 D3 . . A2 | G2 . . D3 G2 . . B2' },
    { wave: 'pulse12', vol: .04, notes: '. E4 . G4 . . E4 . | . C4 . E4 . . C4 . | . F4 . A4 . . F4 . | . F4 . B4 . . D4 . | . E4 . G4 . . E4 . | . C4 . E4 . . C4 . | . F4 . A4 . . F4 . | . F4 . B4 . . D4 .' },
    { wave: 'drums', vol: .06, notes: 'k h . h k h s h | k h . h k h s h | k h . h k h s h | k h . h k h s c' } ] },
  pitch: { bpm: 96, steps: 2, tracks: [
    { wave: 'triangle', vol: .32, notes: 'D2 . D2 . D2 . F2 E2 | D2 . D2 . D2 . A1 C2 | Bb1 . Bb1 . Bb1 . D2 C2 | A1 . A1 . A1 . C#2 E2' },
    { wave: 'pulse12', vol: .035, notes: 'A4 . . . A4 . . . | A4 . . . G4 . . . | F4 . . . F4 . . . | E4 . . . E4 . . .' },
    { wave: 'sine', vol: .07, notes: 'D5 - - - - - - - | C5 - - - - - - - | Bb4 - - - - - - - | C#5 - - - - - - -' },
    { wave: 'drums', vol: .05, notes: 'k . h . k . h h | k . h . k . h h | k . h . k . h h | k . h . k s h h' } ] },
  closer: { bpm: 72, steps: 2, tracks: [
    { wave: 'sine', vol: .2, notes: 'D5 - - - F5 - - - | E5 - - - A4 - - - | Bb4 - - - D5 - - - | C#5 - - - - - - -' },
    { wave: 'triangle', vol: .28, notes: 'D2 - - - - - - - | C2 - - - - - - - | Bb1 - - - - - - - | A1 - - - - - - -' } ] },
  evening: { bpm: 66, steps: 2, tracks: [
    { wave: 'sine', vol: .22, notes: 'G4 - Bb4 - Eb5 - D5 - | C5 - - - G4 - - - | Ab4 - C5 - Bb4 - Ab4 - | G4 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'Eb2 - - - Bb2 - - - | C3 - - - G2 - - - | Ab2 - - - Bb2 - - - | Eb2 - - - - - - -' },
    { wave: 'pulse12', vol: .04, notes: 'Bb3 . G3 . Bb3 . G3 . | Eb4 . C4 . Eb4 . C4 . | C4 . Ab3 . D4 . Bb3 . | Bb3 . G3 . Bb3 . . .' },
    { wave: 'drums', vol: .05, notes: 'h . . . h . . h | h . . . h . . h | h . . . h . . h | h . . . h . . .' } ] },
  win: { bpm: 132, steps: 2, loop: false, tracks: [
    { wave: 'sine', vol: .26, notes: 'C5 E5 G5 - C6 - - - B5 - A5 - G5 - - - C6 - - - - - - -' },
    { wave: 'triangle', vol: .3, notes: 'C3 - - - F2 - - - G2 - - - G2 - - - C3 - - - - - - -' } ] },
  lose: { bpm: 80, steps: 2, loop: false, tracks: [
    { wave: 'sine', vol: .24, notes: 'E5 - D5 - C5 - B4 - Bb4 - - - A4 - - - - - - -' },
    { wave: 'triangle', vol: .3, notes: 'A2 - - - G2 - - - F2 - - - E2 - - - A1 - - -' } ] }
};

// ---------------------------------------------------------------- sounds
MM.defineSounds = audio => {
  audio.define('typekey', { wave: 'noise', freq: 2400, to: 900, dur: .035, vol: .18 });
  audio.define('carriage', [{ wave: 'noise', freq: 1800, to: 300, dur: .12, vol: .15 }, { wave: 'triangle', freq: 'A6', dur: .18, vol: .12 }]);
  audio.define('ring', { wave: 'square', freq: 'E6', dur: .5, vol: .07, vib: [24, .06] });
  audio.define('clink', [{ wave: 'sine', freq: 'C7', dur: .25, vol: .14 }, { wave: 'sine', freq: 'G7', dur: .2, vol: .08 }]);
  audio.define('pour', { wave: 'noise', freq: 600, to: 300, dur: .5, vol: .1 });
  audio.define('click', { wave: 'noise', freq: 3000, to: 1200, dur: .05, vol: .22 });
  audio.define('ding', [{ wave: 'sine', freq: 'E6', dur: .7, vol: .16 }, { wave: 'sine', freq: 'C6', dur: .9, vol: .1 }]);
  audio.define('card', { wave: 'triangle', freq: 'C5', to: 'G5', dur: .08, vol: .16 });
  audio.define('idea', { wave: 'sine', freq: 'G5', arp: [0, 4, 7, 12], step: .06, dur: .3, vol: .18 });
  audio.define('murmur', { wave: 'triangle', freq: 'A3', to: 'E3', dur: .25, vol: .1 });
  audio.define('applause', { wave: 'noise', freq: 5000, to: 2000, dur: 1.2, vol: .14 });
  audio.define('gasp', { wave: 'noise', freq: 1200, to: 500, dur: .3, vol: .1 });
  audio.define('needle', { wave: 'square', freq: 'C7', dur: .03, vol: .05 });
};

// Simlish: a syllable per two letters, pitched by the speaker and the letter, so the same line always sounds the same.
MM.babble = (audio, pitch, ch, i) => {
  const c = ch.toLowerCase().charCodeAt(0);
  if (c < 97 || c > 122) return;
  const vowel = 'aeiouy'.includes(ch.toLowerCase());
  const f = pitch * (1 + ((c * 7 + i * 3) % 9) / 14) * (vowel ? 1.25 : 1);
  audio.sfx({ wave: vowel ? 'triangle' : 'square', freq: f, to: f * (vowel ? 1.18 : .82), dur: .055, vol: vowel ? .16 : .06 }, { vary: .02 });
};

// ---------------------------------------------------------------- tag icons (8x8 sprites) and glyphs
const ICONS = {
  clock: ['..###...', '.#...#..', '#..#..#.', '#..##.#.', '#.....#.', '.#...#..', '..###...', '........'],
  star: ['...#....', '...#....', '#######.', '.#####..', '..###...', '.##.##..', '.#...#..', '........'],
  heart: ['.##.##..', '#######.', '#######.', '.#####..', '..###...', '...#....', '........', '........'],
  house: ['...#....', '..###...', '.#####..', '#######.', '.##.##..', '.##.##..', '.#####..', '........'],
  wing: ['#.......', '##......', '###.....', '.####...', '..#####.', '...####.', '....##..', '........'],
  shield: ['#######.', '#######.', '#######.', '.#####..', '.#####..', '..###...', '...#....', '........']
};
MM.icon = (g, name, x, y, color, scale = 1) => {
  const rows = ICONS[name]; if (!rows) return;
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) if (rows[j][i] === '#') px.rect(g, x + i * scale, y + j * scale, scale, scale, color);
};

// A controller button drawn as the player's pad shows it (PlayStation shapes or Xbox letters), or a key cap.
const PS_COL = ['#8ab4f8', '#f28b82', '#f4a6d8', '#7fd8b0'], XB_COL = ['#6cc04a', '#e0483e', '#3a8ee8', '#f0c020'];
MM.drawButton = (g, code, x, y, family) => {
  const T = (s, cx, cy, c) => E.font.text(g, s, cx, cy, c, { outline: false });
  const m = /^Pad(\d+)$/.exec(code || '');
  if (!g) {   // measure only
    if (m && +m[1] <= 3) return 12;
    return E.font.width(MM.buttonText(code, family)) + 7;
  }
  if (m) {
    const b = +m[1];
    if (b <= 3) {
      px.disc(g, x + 5, y + 5, 6, '#101018'); px.disc(g, x + 5, y + 5, 5, '#2a2a36');
      if (family === 'xbox') { const L = 'ABXY'[b]; px.disc(g, x + 5, y + 5, 5, XB_COL[b]); T(L, x + 5 - Math.floor(E.font.width(L) / 2), y + 2, '#101010'); }
      else {
        const c = PS_COL[b], cx = x + 5, cy = y + 5;
        if (b === 0) { px.line(g, cx - 3, cy - 3, cx + 3, cy + 3, c); px.line(g, cx - 3, cy + 3, cx + 3, cy - 3, c); }
        else if (b === 1) { px.disc(g, cx, cy, 3, c); px.disc(g, cx, cy, 2, '#2a2a36'); }
        else if (b === 2) { px.rect(g, cx - 3, cy - 3, 7, 1, c); px.rect(g, cx - 3, cy + 3, 7, 1, c); px.rect(g, cx - 3, cy - 3, 1, 7, c); px.rect(g, cx + 3, cy - 3, 1, 7, c); }
        else { px.line(g, cx, cy - 3, cx - 3, cy + 2, c); px.line(g, cx, cy - 3, cx + 3, cy + 2, c); px.line(g, cx - 3, cy + 2, cx + 3, cy + 2, c); }
      }
      return 12;
    }
    const s = MM.buttonText(code, family), w = E.font.width(s) + 6;
    px.rect(g, x, y, w, 11, '#101018'); px.rect(g, x + 1, y + 1, w - 2, 9, '#3a3a4a'); T(s, x + 3, y + 2, '#f0f0f0');
    return w + 1;
  }
  const s = MM.buttonText(code, family), w = E.font.width(s) + 6;
  px.rect(g, x, y, w, 11, '#d8d4c8'); px.rect(g, x + 1, y + 1, w - 2, 8, '#f4f0e4'); px.rect(g, x, y + 10, w, 1, '#8a867a');
  T(s, x + 3, y + 1, '#1a1a1a');
  return w + 1;
};
MM.buttonText = (code, family) => {
  const m = /^Pad(\d+)$/.exec(code || '');
  if (m) {
    const b = +m[1];
    const names = family === 'xbox' ? ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'Up', 'Down', 'Left', 'Right']
                                    : ['X', 'O', 'Sq', 'Tri', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'Up', 'Down', 'Left', 'Right'];
    return names[b] || ('B' + b);
  }
  let s = code || '?';
  if (code === 'Mouse0') s = 'Click'; else if (code === 'Mouse2') s = 'R-Click';
  else if (/^Key[A-Z]$/.test(code)) s = code.slice(3); else if (code === 'Escape') s = 'Esc'; else if (code === 'ShiftLeft') s = 'Shift';
  else if (code === 'Space') s = 'Space'; else if (code === 'Enter') s = 'Enter'; else if (code === 'Tab') s = 'Tab'; else if (code === 'Backspace') s = 'Bksp';
  else if (code === 'ArrowUp') s = 'Up'; else if (code === 'ArrowDown') s = 'Dn'; else if (code === 'ArrowLeft') s = 'Lt'; else if (code === 'ArrowRight') s = 'Rt';
  return s;
};

// ---------------------------------------------------------------- idea cards
MM.wrap = (s, w) => E.font.wrap(s, w);
MM.drawCard = (g, card, x, y, w, h, o = {}) => {
  const tag = MM.TAGS[card.tag], sel = o.sel, lift = sel ? -3 : 0;
  y += lift;
  px.blend(g, .4, 'normal', () => px.rect(g, x + 2, y + 3, w, h, '#000000'));
  px.rect(g, x, y, w, h, sel ? '#fff8e0' : '#f2ead2');
  px.rect(g, x, y, w, 1, '#ffffff'); px.rect(g, x, y + h - 1, w, 1, '#b8a888');
  for (let ly = y + 18; ly < y + h - 4; ly += 6) px.rect(g, x + 3, ly, w - 6, 1, '#cfd8e6');
  px.rect(g, x, y, w, 12, tag.color); px.rect(g, x, y + 12, w, 1, E.tones(tag.color).sh);
  MM.icon(g, tag.icon, x + 3, y + 2, '#1a1410');
  E.font.text(g, tag.label.toUpperCase(), x + 13, y + 3, '#1a1410', { outline: false, font: 'tiny' });
  for (let i = 0; i < card.power; i++) MM.icon(g, 'star', x + w - 9 - i * 8, y + 2, '#fff8d0');
  const lines = E.font.wrap(card.title, w - 6).slice(0, o.big ? 3 : 2);
  lines.forEach((l, i) => E.font.text(g, l, x + 3, y + 15 + i * 9, '#1a1410', { outline: false }));
  if (o.big) {
    const body = E.font.wrap('"' + card.line + '"', w - 8);
    body.slice(0, 7).forEach((l, i) => E.font.text(g, l, x + 4, y + 46 + i * 9, '#3a3028', { outline: false }));
    E.font.text(g, card.src, x + 4, y + h - 12, '#7a6a58', { outline: false, font: 'tiny' });
  }
  if (sel) { px.rect(g, x - 2, y - 2, w + 4, 2, '#ffd36a'); px.rect(g, x - 2, y + h, w + 4, 2, '#ffd36a'); px.rect(g, x - 2, y, 2, h, '#ffd36a'); px.rect(g, x + w, y, 2, h, '#ffd36a'); }
  if (o.picked) { px.rect(g, x + w - 14, y + h - 14, 12, 12, '#1a7a3a'); E.font.text(g, 'v', x + w - 11, y + h - 13, '#ffffff', { outline: false }); }
  if (o.dim) px.blend(g, .55, 'normal', () => px.rect(g, x, y, w, h, '#20202a'));
};

// ---------------------------------------------------------------- the projector's slides (drawn in pixels, w x h)
MM.drawSlide = (g, kind, i, x, y, w, h) => {
  const R = (a, b, c, d, col) => px.rect(g, x + Math.round(a * w), y + Math.round(b * h), Math.max(1, Math.round(c * w)), Math.max(1, Math.round(d * h)), col);
  const D = (a, b, r, col) => px.disc(g, x + Math.round(a * w), y + Math.round(b * h), Math.max(1, Math.round(r * h)), col);
  i = i % 3;
  if (kind === 'lips') {
    if (i === 0) { R(0, 0, 1, 1, '#2a1018'); R(.1, .1, .35, .8, '#c8b8a8'); D(.28, .35, .18, '#f0d0b8'); R(.18, .55, .2, .1, '#c81a2a'); R(.55, .2, .35, .6, '#e8d8c0'); D(.72, .5, .15, '#3a2a2a'); }
    else if (i === 1) { R(0, 0, 1, 1, '#f2e2d2'); R(.42, .25, .16, .55, '#1a1a1a'); R(.44, .12, .12, .16, '#c81a2a'); R(.44, .42, .12, .06, '#d8b04a'); }
    else { R(0, 0, 1, 1, '#c81a2a'); R(.2, .4, .6, .08, '#f4e8d8'); R(.3, .55, .4, .05, '#f4e8d8'); D(.5, .25, .08, '#f4e8d8'); }
  } else if (kind === 'plane') {
    if (i === 0) { R(0, 0, 1, 1, '#6aa8e0'); R(0, .7, 1, .3, '#e8f0f8'); D(.25, .75, .2, '#ffffff'); D(.6, .78, .25, '#ffffff'); R(.3, .38, .45, .07, '#e8e8f0'); R(.48, .25, .07, .33, '#c8c8d8'); R(.7, .3, .04, .12, '#c8c8d8'); }
    else if (i === 1) { R(0, 0, 1, 1, '#f0d8a8'); R(0, .6, 1, .4, '#4a6a3a'); R(.15, .35, .25, .3, '#f8f0e0'); D(.27, .3, .09, '#e8c8a8'); R(.55, .35, .12, .3, '#2a3a5a'); D(.61, .3, .08, '#e8c8a8'); R(.68, .4, .14, .25, '#8a4a4a'); }
    else { R(0, 0, 1, 1, '#1a2a5a'); D(.8, .25, .12, '#f0e8c0'); R(.1, .5, .8, .05, '#c8c8d8'); R(.45, .35, .08, .35, '#a8a8b8'); for (let k = 0; k < 9; k++) D(.05 + k * .11, .12 + (k % 3) * .08, .015, '#ffffff'); }
  } else {
    if (i === 0) { R(0, 0, 1, 1, '#e8d0a0'); R(0, .65, 1, .35, '#6a8a4a'); R(.55, .3, .3, .35, '#f0e8d8'); R(.52, .22, .36, .1, '#8a3a2a'); R(.65, .45, .08, .2, '#5a3a2a'); R(.15, .45, .06, .2, '#e8c8a8'); D(.18, .4, .06, '#e8c8a8'); }
    else if (i === 1) { R(0, 0, 1, 1, '#f0c890'); R(.1, .55, .8, .1, '#7a4a2a'); for (let k = 0; k < 4; k++) { R(.16 + k * .19, .3, .1, .25, ['#c84a3a', '#3a6aa8', '#e8c84a', '#5aa85a'][k]); D(.21 + k * .19, .25, .07, '#f0c8a8'); } }
    else { R(0, 0, 1, 1, '#4a8ac8'); R(0, .6, 1, .4, '#e8d8a8'); R(0, .55, 1, .08, '#8ac8e8'); D(.3, .7, .1, '#d84a3a'); R(.55, .5, .06, .25, '#f0c8a8'); D(.58, .45, .06, '#f0c8a8'); R(.68, .55, .04, .2, '#f0c8a8'); D(.7, .52, .045, '#f0c8a8'); }
  }
  px.rect(g, x, y, w, 1, '#2a2a2a'); px.rect(g, x, y + h - 1, w, 1, '#2a2a2a');
};
})();
