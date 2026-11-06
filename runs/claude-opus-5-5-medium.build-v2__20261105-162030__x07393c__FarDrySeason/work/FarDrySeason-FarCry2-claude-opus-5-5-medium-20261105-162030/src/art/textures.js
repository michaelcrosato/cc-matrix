// Hand-drawn textures, as data.
import { textureDef } from '../../pixel-engine.js';
export const grassFlame = textureDef({
  id: 'grass-flame', about: 'Licking grass flame', tags: ['fx'], size: [40, 14], frames: 4, palette: { a: 'red', b: 'orange', c: 'sand', d: 'white' },
  layers: [
    ['...aa.....', '...aba....', '..abba....', '..abba.a..', '.abbbaab..', '.abcbbabb.', 'abccbbbba.', 'abcccbcba.', 'abccdcbba.', 'abcddcbba.', 'abcddccba.', '.abcdcbba.', '.abccbbba.', '..aabbaa..'],
    ['......a...', '.....aa...', '.a...aba..', '.aa.abba..', '.aba.abba.', 'abba.abbba', 'abbbabcba.', 'abcbbccba.', 'abccccdcba', '.abcddcba.', '.abcddcbba', '.abcdccba.', '..abccbba.', '...aabaa..'],
    ['....a.....', '...aa.....', '...aba.a..', '..abba.a..', '..abbaaba.', '.abcbbabba', '.abccbbcba', 'abcccbcba.', 'abcdccdcba', 'abcddddcba', '.abcddcbba', '.abcdccba.', '.abbccbba.', '..aabbaa..'],
    ['.......a..', '.a....aa..', '.aa...aba.', '.aba.abba.', 'abba.abbba', 'abbaabcbba', '.abbbbccba', '.abcbccba.', 'abccccdba.', 'abcdddcba.', 'abcddccba.', '.abcdcbba.', '..abcbbaa.', '...aabaa..'],
  ].map((rows, i) => ({ at: [i * 10, 0], pixels: rows, legend: { a: 'a', b: 'b', c: 'c', d: 'd' } })),
});
