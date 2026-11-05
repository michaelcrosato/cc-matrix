import { load } from '../lib/load.mjs';
const L = load({}), { E } = L;
for (const s of ['ABOUT & CREDITS', 'PRACTICE RANGE', 'CONTINUE HUNT-OFF', 'NEW HUNT-OFF', 'BONUS GAMES', 'Three hunts. The trophy wall.', 'Start over at Hollow Creek']) console.log(s, E.font.width(s, { scale: 2 }), E.font.width(s, { scale: 1 }));
