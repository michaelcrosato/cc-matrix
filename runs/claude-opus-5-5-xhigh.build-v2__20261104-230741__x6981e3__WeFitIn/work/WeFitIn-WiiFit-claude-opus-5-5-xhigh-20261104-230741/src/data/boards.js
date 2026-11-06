// Vitamin Tray boards, ASCII. # wall, . floor, o start, R B Y cups, _ a gap in the rail.
export const BOARDS = [
  { name: 'Morning Dose', count: 8, rows: [
    '##############',
    '#R...oooo...B#',
    '#............#',
    '#....####....#',
    '#............#',
    '#B...oooo...R#',
    '##############',
  ] },
  { name: 'Second Opinion', count: 8, rows: [
    '##############',
    '#R..#....#..B#',
    '#....oooo....#',
    '#............#',
    '#....oooo....#',
    '#Y..#....#..R#',
    '##__######__##',
  ] },
  { name: 'Full Prescription', count: 8, rows: [
    '#####_###_####',
    '#R....#.....B#',
    '#oooo.#..##..#',
    '#.....#......#',
    '#..##...#oooo#',
    '#Y......#...R#',
    '####_###_#####',
  ] },
];
export const TRAY_CELL = 0.5;
