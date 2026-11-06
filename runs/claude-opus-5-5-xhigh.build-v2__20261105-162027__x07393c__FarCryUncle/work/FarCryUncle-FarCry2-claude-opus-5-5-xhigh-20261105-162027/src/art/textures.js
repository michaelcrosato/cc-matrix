// Textures as plain data (textureDef): the licking grass flame and small sprites.
import { textureDef } from '../../pixel-engine.js';
const FRAMES = [
  ['....a.....', '....aa....', '...aba....', '..aabaa...', '..abba.a..', '.aabbba...', '.abbcbaa..', 'aabccbba..', 'aabccbbaa.', 'abbcdcbba.', 'abccdccba.', 'abccdccba.', 'abccccbba.', 'aabbbbbaa.'],
  ['......a...', '.....aa...', '....aba...', '...aaba.a.', '.a.abbaa..', '.aaabbba..', '..abcbbaa.', '.aabccbba.', '.abbccbba.', 'aabcdcbba.', 'abccdccbaa', 'abccdccbba', 'aabccccba.', '.aabbbbaa.'],
  ['...a......', '...aa...a.', '..aba..aa.', '..abaa.a..', '.aabbaaa..', '.abbbba...', '.abcbbaa..', 'aabccbaa..', 'abbcccba..', 'abccdcbaa.', 'abcddcbba.', 'abccdccba.', 'abbccccba.', 'aabbbbbaa.'],
  ['.....a....', '.a...aa...', '.aa.aba...', '..a.abaa..', '..aaabbaa.', '...abbbba.', '..aabbcba.', '..abbccbaa', '.aabcccbba', '.abbcdccba', 'aabccddcba', 'abbccdccba', 'abbccccbaa', '.aabbbbaa.'],
];
export const grassFlame = textureDef({ id: 'grass-flame', about: 'Licking grass flame', tags: ['fx'], size: [40, 14], frames: 4, palette: { a: 'red', b: 'orange', c: 'sand', d: 'white' },
  layers: [0, 1, 2, 3].map((i) => ({ at: [i * 10, 0], pixels: FRAMES[i], legend: { a: 'a', b: 'b', c: 'c', d: 'd' } })) });
const STAR = [['.', 'a', '.'], ['a', 'b', 'a'], ['.', 'a', '.']].map((r) => r.join(''));
export const starSprite = textureDef({ id: 'night-star', about: 'A small white star', tags: ['fx'], size: [3, 3], palette: { a: 'mist', b: 'white' }, layers: [{ pixels: STAR, legend: { a: 'a', b: 'b' } }] });
export const TEXTURES = [grassFlame, starSprite];
