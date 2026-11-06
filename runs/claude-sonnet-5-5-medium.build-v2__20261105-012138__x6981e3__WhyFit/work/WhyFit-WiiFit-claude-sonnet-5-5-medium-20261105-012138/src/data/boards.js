// Vitamin Tray boards: '#' wall, '.' floor, 'o' vitamin start, 'g' gap in the rail (a drop), R/B/Y cups.
export const CELL = 0.4;
export const BOARDS = [
  { name: 'First tray', colors: ['R', 'B'], rows: [
    '############', '#R........B#', '#..........#', '#...oooo...#', '#...oooo...#', '#..........#', '#..........#', '############'] },
  { name: 'Second tray', colors: ['R', 'B', 'Y'], rows: [
    '############', '#R...##...B#', '#....##....#', '#...oooo...#', '#...oooo...#', '#....##....#', '#Y...##....#', '############'] },
  { name: 'Third tray', colors: ['R', 'B', 'Y'], rows: [
    '######gg####', '#R........B#', '#....##....#', 'g...oooo...g', '#...oooo...#', '#....##....#', '#Y.........#', '######gg####'] },
];
export const boardDims = (b) => ({ w: b.rows[0].length, h: b.rows.length });
