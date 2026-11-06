/* data/island.js: Lumbar Island as text, 44 x 26. ~ sea, , grass, . sand, = pier, ^ snow, p path, d deck, i iron room
 * floor, k park. R B J are buildings. 1-9 a b c are mats. E Tare's scale, @ the door, Z the bed, W the rail, G D M K O L T
 * the Regulars. Move a letter and the thing moves: nothing else to change. */
(() => {
const G = window.G;
G.DATA.island = { rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~,,,,,,,,,,~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~^^^,,,,,,,,,,,,,,,~~~~~~~~~~~~~',
    '~~~~~~~~~~^^^^^^,RRRRRRR,,,,dddddddddd~~~~~~',
    '~~~~~~~~^^^^^^^^^RRRRRRR,,,,d1dd2dd3dd~~~~~~',
    '~~~~~~^^^^^^^^^^^RRRRRRR,,,,dddddddddd~~~~~~',
    '~~~~~^^^^^^^^^^^^,,,pp,,T,,,dddddddddd,~~~~~',
    '~~~~^^^^^^^^^^^^,,,,Ep,,,,,,ddddpddddd,,~~~~',
    '~~~^^^^^^^^^^^^^K,,,,p,,,,G,,,,,p,,,,,,,,~~~',
    '~~,^^^^^^^^^^^,,,,,,,p,,,,,,,,,,p,,,,,,,,,~~',
    '~~,,,^^^pppppppppppppp,,,,,,,,,,piiiiiiii,~~',
    '~~,BBBBBB,,,,,,,,,,,,p,,,,,,,,,,pii4ii5ii,~~',
    '~~,BBBBBB,pppppppppppppppppppppppiiiiiiii,~~',
    '~~.BBBBBB,p,,,,,,,,,,p,,,,,,,,M,,iiiiiiii.~~',
    '~~.BBBBBB,p,,,,,,,,,,p,,,,,,,,,,,ii6iiiii.~~',
    '~~,,Z,@,,,p,,,,,,,,JJJJJJ,,,,,,,,iiiiiiii.~~',
    '~~,,,,ppWpp,,,,,,,,JJJJJJ,,,,,,,,,,,,,,...~~',
    '~~,,,,,,,,,,,L,,,,,,,D,,,,,,,,,,,,,,,,...~~~',
    '~~~~...,,,,,,,pppppppp,,pppbpppO,,,,,...~~~~',
    '~~~~~...,kkkkkkkkkkkkp,,,,,,,p,,,,,,...~~~~~',
    '~~~~~~...kkakkkkkkckk,,,,,==7====8====~~~~~~',
    '~~~~~~~~.kkkkkkkkkkkk,,,,,============~~~~~~',
    '~~~~~~~~~~......,,,,,,,,,,,,...=======~~~~~~',
    '~~~~~~~~~~~~~..................====9==~~~~~~',
    '~~~~~~~~~~~~~~~~~..........~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~' ],
  mats: { 1: 'stork', 2: 'flow', 3: 'candle', 4: 'squat', 5: 'pushup', 6: 'lunge', 7: 'step', 8: 'hoop', 9: 'jog', a: 'tray', b: 'laundry', c: 'slalom' },
  floors: { 1: 'deck', 2: 'deck', 3: 'deck', 4: 'iron', 5: 'iron', 6: 'iron', 7: 'pier', 8: 'pier', 9: 'pier', a: 'park', b: 'path', c: 'park' },
  people: { G: 'gertrude', D: 'dennis', M: 'marisol', K: 'kevin', O: 'okafor', L: 'lou', T: 'twins' }
};
})();
