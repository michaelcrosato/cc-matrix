// Pixel textures as data (for check.mjs --sheets). A flame strip for the fire grid.
import { textureDef } from '../../pixel-engine.js';
const FRAMES = [
  ['....a.....', '....aa....', '...abba...', '...abba.a.', '..aabbaaa.', '..abbcbaa.', '.aabccbba.', '.abbccdcba', '.abccdddba', '.abbcdddba', '.aabccdcba', '..abbccbba', '..aabbbba.', '...aaaaa..'],
  ['.....a....', '....aa.a..', '...abbaa..', '..aabbba..', '..abbbbaa.', '.aabbcbba.', '.abbcccba.', '.abcccdcba', '.abccdddba', '.abbcdddba', '.aabcccbba', '..abbcbbba', '..aabbbba.', '...aaaaa..'],
  ['......a...', '.....aa...', '....abba..', '.a..abba..', '.aa.abbaa.', '.aabbbcba.', '..abbccba.', '.abbcccbba', '.abcdddcba', '.abcdddcba', '.aabccdcba', '..abbccbba', '..aabbbba.', '...aaaaa..'],
  ['...a......', '...aa.....', '..abba....', '..abbaa...', '.aabbbaa..', '.abbbcba..', '.abbccbba.', '.abbcccbba', '.abcddcbba', '.abcdddcba', '.aabccdcba', '..abbccbba', '..aabbbba.', '...aaaaa..'],
];
export const grassFlame = textureDef({ id: 'grass-flame', about: 'Licking grass flame, four frames', tags: ['fx', 'fire'], size: [40, 14], frames: 4, palette: { a: 'red', b: 'orange', c: 'sand', d: 'white' },
  layers: [0, 1, 2, 3].map((i) => ({ at: [i * 10, 0], pixels: FRAMES[i], legend: { a: 'a', b: 'b', c: 'c', d: 'd' } })) });
export const smokePuff = textureDef({ id: 'smoke-puff', about: 'Soft grey smoke puff', tags: ['fx'], size: [12, 12], palette: { a: 'slate', b: 'mist' },
  layers: [{ pixels: ['....aaaa....', '..aabbbbaa..', '.abbbbbbbba.', '.abbbbbbbba.', 'abbbbbbbbbba', 'abbbbbbbbbba', 'abbbbbbbbbba', '.abbbbbbbba.', '.abbbbbbbba.', '..aabbbbaa..', '....aaaa....', '............'], legend: { a: 'a', b: 'b' } }] });
export const TEXTURES = [grassFlame];
