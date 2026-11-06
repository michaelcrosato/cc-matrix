// About 45 category sprites (rows of '#','a','b' colours), recoloured per item.
const S = {
  fish: ['..........aaa...', '.....aaaaaaaaa.a', '...aaaaaaaaaaaaa', '.aaaaaaaa#aaaaaa', '..aaaaaaaaaaaaa.', '....aaabbbaaaa..', '.......bb..aa...'],
  fish2: ['................', '...aaaa.....a...', '.aaaaaaaa..aaa..', 'aaaaaaaaaaaaaa..', '.aa#aaaaaaaaaa..', '..aaabbbbaaaa...', '....bb....aa....'],
  fish3: ['.....aa.........', '...aaaaaa...a...', '.aaaaaaaaaaaaaa.', 'aaaa#aaaaaaaaaaa', '.aaaaabbbaaaaaa.', '...aaaabbaaa.a..'],
  fish4: ['......aaaa......', '....aaaaaaaa....', '...aaaaaaaaaa...', '..aaaa#aa#aaaa..', '..aaaaaaaaaaaa..', '...aabbbbbbaa...', '....aaaaaaaa....'],
  boot: ['..aaa...', '..aaa...', '..aaa...', '..aaa...', '.aaaaaa.', 'aaaaaaaa.', 'bbbbbbbb.'],
  bug1: ['.#....#.', '..#..#..', '..aaaa..', '.aabbaa.', '.aabbaa.', '..aaaa..', '.#.##.#.'],
  bug2: ['aa....aa', 'aaa..aaa', '.aaaaaa.', '..abba..', '..abba..', '...aa...', '..#..#..'],
  bug3: ['..#..#..', '...##...', '.aaaaaa.', 'aaabbaaa', 'aaabbaaa', '.aaaaaa.', '..a..a..'],
  bug4: ['.a.....a.', '..a...a..', '.aaaaaaa.', 'aabbbbbaa', '.aaaaaaa.', '..a...a..'],
  bug5: ['...#.#...', '..aaaaa..', '.aabbbaa.', '.aabbbaa.', '..aaaaa..', '.#.a.a.#.'],
  fossil: ['..aaaaa..', '.aabbbaa.', 'aab###baa', 'aab#a#baa', 'aab###baa', '.aabbbaa.', '..aaaaa..'],
  art: ['aaaaaaaaaa', 'abbbbbbbba', 'abbb##bbba', 'abb####bba', 'abbbbbbbba', 'aaaaaaaaaa'],
  chair: ['aa......', 'aa......', 'aaaaaaa.', 'aaaaaaa.', 'a.....a.', 'a.....a.'],
  lamp: ['..aaaa..', '.aaaaaa.', '.aaaaaa.', '...##...', '...##...', '..####..'],
  shirt: ['aa.aa.aa', 'aaaaaaaa', '.aaaaaa.', '.aaaaaa.', '.aaaaaa.', '.aaaaaa.'],
  hat: ['..aaaa..', '..aaaa..', '..aaaa..', 'aaaaaaaa', 'bbbbbbbb'],
  bed: ['aa......', 'aaaaaaaaa', 'bbbbbbbbb', 'bbbbbbbbb', 'a.......a', 'a.......a'],
  table: ['aaaaaaaa', 'aaaaaaaa', '.a....a.', '.a....a.', '.a....a.'],
  plant: ['..a.a...', '.aaaaa..', '..aaa...', '...#....', '..bbb...', '..bbb...'],
  rug: ['aaaaaaaa', 'abbbbbba', 'abaaaaba', 'abbbbbba', 'aaaaaaaa'],
  tv: ['aaaaaaaa', 'abbbbbba', 'abbbbbba', 'abbbbbba', 'aaaaaaaa', '..aaaa..'],
  stereo: ['aaaaaaaa', 'abbaabba', 'abbaabba', 'aaaaaaaa'],
  wall: ['abababab', 'babababa', 'abababab', 'babababa'], floor: ['aaaabbbb', 'bbbbaaaa', 'aaaabbbb', 'bbbbaaaa'],
  pear: ['...#....', '..aaa...', '.aaaaa..', '.aaaaa..', '.aaaaa..', '..aaa...'], beans: ['..bbb...', '.aaaaa..', 'aaaaaaa.', 'aaaaaaa.', 'aaaaaaa.', '.aaaaa..'],
  weed: ['a..a..a.', '.a.a.a..', '..aaa...', '...a....', '...a....'], cheese: ['..aaaaa.', '.aaaaaaa', 'aab#aaaa', 'aaaaa#aa', 'bbbbbbbb'], mail: ['aaaaaaaa', 'aab..baa', 'aaabbaaa', 'aaaaaaaa'], shell: ['..aaa...', '.aabbaa.', 'aabbbbaa', 'aaaaaaaa', '.a.aa.a.'],
  seed: ['..a..a..', '.aaaaaa.', '..aaaa..', '...bb...', '...bb...'], sapling: ['..aaa...', '.aaaaa..', '..aaa...', '...b....', '...b....'], record: ['.aaaaaa.', 'aabbbbaa', 'abbaabba', 'abbaabba', 'aabbbbaa', '.aaaaaa.'], paper: ['aaaaaaa.', 'abbbbba.', 'abbbbba.', 'abbbbba.', 'aaaaaaa.'],
  med: ['..aaa...', '..aaa...', '.aaaaa..', '.abbba..', '.aaaaa..'], umbrella: ['..aaaa..', '.aaaaaa.', 'aaaaaaaa', '...b....', '...b....', '...bb...'], glasses: ['aaa.aaa.', 'a.a.a.a.', 'aaaaaaa.'],
  tool_net: ['.....aa.', '....a..a', '...a...a', '..#.a.a.', '.#...aa.', '#.......'], tool_rod: ['......#.', '.....#..', '....#a..', '...#.a..', '..#..a..', '.#...b..', '#.......'],
  tool_shovel: ['....aa..', '....aa..', '....#...', '....#...', '...###..', '..#####.'], tool_axe: ['..aaa...', '.aaaa#..', '.aaaa.#.', '..aa...#', '.......#', '........#'],
  tool_can: ['...aaaa.', '.aaaaaaa', 'aa.aaaa.', 'a..aaaaa', '...aaaa.', '...aaaa.'], tool_sling: ['a...a...', 'a...a...', '.a.a....', '..a.....', '..#.....', '..#.....'],
  star: ['...a...', '..aaa..', 'aaaaaaa', '.aaaaa.', '.aa.aa.', 'aa...aa'], bell: ['...a...', '..aaa..', '.aaaaa.', '.aaaaa.', 'aaaaaaa', '...b...'], coin: ['.aaaa.', 'abbbba', 'abaaba', 'abaaba', 'abbbba', '.aaaa.'],
  heart: ['.aa.aa.', 'aaaaaaa', 'aaaaaaa', '.aaaaa.', '..aaa..', '...a...'], key: ['.aaa....', 'a...a...', '.aaa....', '..a.....', '..aaa...', '..a.a...'],
};
const COL = {};
export const iconNames = () => Object.keys(S);
export function drawIcon(d, x, y, name, scale = 1, c1 = 'sand', c2 = 'orange') {
  const rows = S[name] ?? S[name.replace(/[0-9]$/, '')] ?? S.coin; const sprite = scale === 1 ? rows : rows.map(r => [...r].map(ch => ch.repeat(scale)).join(''));
  const all = scale === 1 ? sprite : sprite.flatMap(r => Array(scale).fill(r));
  d.hud.sprite(x, y, all, { a: c1, b: c2, '#': 'ink' }, { shadow: false });
}
export function iconFor(it) {
  if (!it) return ['coin', 'sand', 'orange']; const k = it.kind;
  if (k === 'fish') return [it.junk ? 'boot' : ['fish', 'fish2', 'fish3', 'fish4'][it.size ?? 0], ['sky', 'orange', 'sand', 'cyan', 'mist', 'lime', 'red', 'plum'][(it.price / 100 | 0) % 8], 'white'];
  if (k === 'bug') return [['bug1', 'bug2', 'bug3', 'bug4', 'bug5'][it.price / 50 % 5 | 0], ['lime', 'orange', 'sky', 'red', 'plum', 'sand'][(it.price / 50 | 0) % 6], 'ink'];
  if (k === 'fossil') return ['fossil', 'sand', 'orange']; if (k === 'art') return ['art', 'sand', 'sky'];
  if (k === 'furniture') { const m = it.fn; const nm = m === 'bed' ? 'bed' : m === 'seat' ? 'chair' : m === 'lamp' ? 'lamp' : m === 'tv' ? 'tv' : m === 'stereo' ? 'stereo' : it.rug ? 'rug' : it.grows ? 'plant' : 'table'; return [nm, it.tint ?? 'orange', 'sand']; }
  if (k === 'clothes') return [it.slot === 'hat' ? 'hat' : it.slot === 'glasses' ? 'glasses' : it.slot === 'umbrella' ? 'umbrella' : 'shirt', it.color, 'white'];
  if (k === 'wall') return ['wall', it.color, 'white']; if (k === 'floor') return ['floor', it.color, 'mist'];
  if (k === 'tool') return ['tool_' + it.id, 'mist', 'orange'];
  const map = { fruit: 'pear', weed: 'weed', beans: 'beans', mushroom: 'plant', shell: 'shell', cheese: 'cheese', seed: 'seed', sapling: 'sapling', medicine: 'med', paper: 'paper', record: 'record', junk: 'coin' };
  return [map[k] ?? 'coin', k === 'fruit' ? 'lime' : k === 'weed' ? 'teal' : k === 'cheese' ? 'sand' : 'sand', 'orange'];
}
export function drawItemIcon(d, x, y, it, scale = 2) { const [n, a, b] = iconFor(it); drawIcon(d, x, y, n, scale, a, b); }
