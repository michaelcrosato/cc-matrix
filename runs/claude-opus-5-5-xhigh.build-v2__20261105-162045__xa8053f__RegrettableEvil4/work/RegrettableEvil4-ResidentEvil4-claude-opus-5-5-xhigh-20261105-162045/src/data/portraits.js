// 16x16 radio portraits, shown doubled.
const face = (rows, colors) => ({ rows, colors });
export const PORTRAITS = {
  pym: face([
    '................', '....oooooooo....', '...oooooooooo...', '...oookkkkooo...', '...okkkkkkkko...', '...kkkkkkkkkk...',
    '...kbbkkkkbbk...', '...kbwbkkbwbk...', '...kkkkkkkkkk...', '...kkkknkkkkk...', '....kkkkkkkk....', '....kkmmmmkk....',
    '.....kkkkkk.....', '...ttssssss tt..', '..tttsswwsstttt.', '..tttsswwsstttt.',
  ].map((r) => r.replace(/ /g, 't')), { o: 'slate', k: 'mist', b: 'ink', w: 'white', n: 'slate', m: 'plum', s: 'white', t: 'night' }),
  max: face([
    '.....hhhhhh.....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhkkkkkkkkhh..', '..hkkkkkkkkkkh..', '..kkkkkkkkkkkk..',
    '..bbbbbbbbbbbb..', '..bbbbkkkkbbbb..', '..kkkkkkkkkkkk..', '...kkkknnkkkk...', '...kkkkkkkkkk...', '....kkmmmmkk....',
    '.....kkkkkk.....', '...rrrrrrrrrr...', '..sssrrrrrrsss..', '..ssssswwsssss..',
  ], { h: 'sand', k: 'mist', b: 'ink', n: 'slate', m: 'plum', r: 'red', s: 'slate', w: 'white' }),
  dame: face([
    '...pppppppppp.f.', '..pppppppppppff.', '.pppppppppppppf.', '...kkkkkkkkkk...', '...kkkkkkkkkk...', '...kbbkkkkbbk...',
    '...kkkkkkkkkk...', '...kkkknkkkkk...', '...kkkkkkkkkk...', '....krrrrrrk....', '....kkkkkkkk....', '.....kkkkkk.....',
    '...wwwwwwwwww...', '..wwwwwwwwwwww..', '..sswwwwwwwwss..', '..ssssssssssss..',
  ], { p: 'plum', f: 'red', k: 'white', b: 'night', n: 'mist', r: 'red', w: 'white', s: 'sand' }),
  commodore: face([
    '...nnnnnnnnnn...', '..nnnnnnnnnnnn..', '..yyyyyyyyyyyy..', '...iiiiiiiiii...', '...kkkkkkkkkk...', '...koookkoook...',
    '...kkkkkkkkkk...', '...kkkknkkkkk...', '...kkkkkkkkkk...', '....kmmmmmmk....', '....kkkkkkkk....', '.....kkkkkk.....',
    '...nnnnnnnnnn...', '..nyrnnnnnnrnn..', '..nrynnnnnnynn..', '..nyrnnnnnnrnn..',
  ], { n: 'navy', y: 'sand', i: 'ink', k: 'white', o: 'orange', m: 'plum', r: 'red' }),
  fathom: face([
    '.....bbbbbb.....', '...bbbbbbbbbb...', '..bbbbbbbbbbbb..', '..bbboooooobbb..', '.dbboggggggobbd.', '.dbbogggggwobbd.',
    '.dbbogggggwobbd.', '..bboggggggobb..', '..bbboooooobbb..', '...bbbbbbbbbb...', '....bbbbbbbb....', '...oooooooooo...',
    '..nnnnnnnnnnnn..', '..nnnnnnnnnnnn..', '..nnnnnnnnnnnn..', '..nnnnnnnnnnnn..',
  ], { b: 'sand', o: 'orange', g: 'lime', w: 'white', d: 'plum', n: 'navy' }),
};
