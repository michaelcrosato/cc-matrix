// The track editor's palette and the puzzles. A road is a list of pieces; its turtle program is the pieces' texts, then
// a closing straight (so every road ends on a finish gate). Puzzles fix a piece budget and a distance to reach.
export const PIECES = [
  { id: 'f10', label: 'Straight 10 m', text: 'F 10' },
  { id: 'f30', label: 'Straight 30 m', text: 'F 30' },
  { id: 'bl', label: 'Bend left', text: 'Y -30 25' },
  { id: 'br', label: 'Bend right', text: 'Y 30 25' },
  { id: 'cr', label: 'Corner right', text: 'Y 90 25' },
  { id: 'hu', label: 'Hill up', text: 'P 15 40' },
  { id: 'hd', label: 'Hill down', text: 'P -15 40' },
  { id: 'ku', label: 'Kicker up', text: 'P 25 25' },
  { id: 'kd', label: 'Kicker down', text: 'P -25 25' },
  { id: 'bo', label: 'Boost 30 m', text: 'B 30' },
  { id: 'ck', label: 'Checkpoint', text: 'C' },
];
export const END_STRAIGHT = 'F 20';

/** the turtle program for a list of piece ids */
export function programOf(ids) {
  const texts = ids.map(id => PIECES.find(p => p.id === id).text);
  return texts.concat(END_STRAIGHT).join('; ');
}

export const PUZZLES = [
  { id: 'p1', name: 'Three Straights', env: 'DUSTBOWL', max: 3, goal: 100,
    blurb: 'Reach 100 m with three pieces.', solution: ['f30', 'f30', 'f30'] },
  { id: 'p2', name: 'Over the Hill', env: 'DUSTBOWL', max: 3, goal: 70,
    blurb: 'Jump a hill and reach 70 m with three pieces.', solution: ['ku', 'kd', 'f30'] },
  { id: 'p3', name: 'The Corner', env: 'DUSTBOWL', max: 2, goal: 50,
    blurb: 'Turn once and reach 50 m with two pieces.', solution: ['cr', 'f30'] },
];
