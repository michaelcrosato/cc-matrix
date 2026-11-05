// ---- sprites: string sprites for pickups, HUD icons, prize icons and room-type icons ----
const SP = (rows, pal, s = 1) => E.sprite(rows, pal, s);
const PAL = { k: '#140a24', w: '#fff7e8', W: '#ffffff', g: '#3fbf5f', G: '#9cf0a8', d: '#1f7a3a', y: '#ffcc33', Y: '#fff0a0', o: '#c88a10', O: '#8a5a08',
  r: '#e8443a', R: '#ff8a7a', b: '#3b82f6', B: '#9cc4ff', s: '#c8d0e0', S: '#7c86a0', p: '#ff2e88', P: '#ffa0cc', c: '#2ee6ff', C: '#a0f6ff', n: '#5a3a20', m: '#8a5a32', v: '#7a4ae0', V: '#c0a0ff', e: '#2a2140', t: '#ff9a3c', T: '#ffd0a0' };
const SPR = MT.spr = {};
/** world sprites keep their designed pixel size at any camera zoom (the engine scales them by the zoom alone) */
const unzoom = r => 1 / ((r && r.view && r.view.zoom) || 1);
SPR.bill = SP(['kkkkkkkkkkkk', 'kGGGGGGGGGGk', 'kGdggyyggdGk', 'kGggykkyggGk', 'kGdggyyggdGk', 'kGGGGGGGGGGk', 'kkkkkkkkkkkk'], PAL);
SPR.stack = SP(['.kkkkkkkkkkk', 'kGGGGGGGGGGk', 'kGgggyygggGk', 'kkkkkyykkkkk', 'kGgggyygggGk', 'kGGGGyyGGGGk', 'kddddyydddk.', '.kkkkkkkkkk.'], PAL);
SPR.gold = SP(['...kkkkkkk..', '..kYYYYYYyk.', '.kYYyyyyyyok', 'kYyyyyyyyook', 'kyyyyyyyooOk', 'koooooooooOk', 'kkkkkkkkkkkk'], PAL);
SPR.case = SP(['....kkkk....', '....k..k....', 'kkkkkkkkkkkk', 'ksssssssssSk', 'ksSSsyysSSSk', 'kssssykssssk', 'ksSSsyysSSSk', 'ksssssssssSk', 'kSSSSSSSSSSk', 'kkkkkkkkkkkk'], PAL);
const box = c => SP(['...kk..kk...', '..kYYkkYYk..', '...kYYYYk...', 'kkkkkYYkkkkk', 'k' + c + c + c + c + 'YY' + c + c + c + 'Ck', 'k' + c + c + c + c + 'YY' + c + c + c + 'Ck', 'kkkkkYYkkkkk', 'k' + c + c + c + c + 'YY' + c + c + c + 'Ck', 'k' + c + c + c + c + 'YY' + c + c + c + 'Ck', 'k' + c + c + c + c + 'YY' + c + c + c + 'Ck', 'kkkkkkkkkkkk'], Object.assign({}, PAL, { C: '#00000055' }));
SPR.boxR = box('r'); SPR.boxB = box('b'); SPR.boxG = box('p');
SPR.key = SP(['.kkk........', 'kYyok.......', 'kyOykkkkkkkk', 'kyOyYYYYYYYk', 'kYyokkkyokyk', '.kkk...kk.k.'], PAL);
SPR.tv = SP(['..k......k..', '...k....k...', '....k..k....', 'kkkkkkkkkkkk', 'kssssssssssk', 'ksCCCCCCCCsk', 'ksCCCCCCCCsk', 'ksCCCCCCCCsk', 'ksCCCCCCCCsk', 'ksCCCCCCCCsk', 'ksssssssrrsk', 'kkkkkkkkkkkk', '.kk......kk.'], Object.assign({}, PAL, { C: '#1a2a3a' }));
SPR.bulb = SP(['..kkkkk..', '.kWWWWWk.', 'kWWYYWWWk', 'kWYYYYWWk', 'kWWYYWWWk', '.kWWWWWk.', '..kSSSk..', '..kSsSk..', '..kSSSk..', '...kkk...'], PAL);
SPR.star = SP(['.....k.....', '....kYk....', '....kyk....', 'kkkkyyykkkk', 'kYyyyyyyyok', '.kyykkkyok.', '..kyywyyk..', '.kyyokoyyk.', '.kyok.koyk.', 'kook...kook', 'kkk.....kkk'], PAL);
SPR.statue = SP(['...kkkk...', '..kYYYYk..', '..kYyyok..', '...kyok...', '.kkYyyokk.', 'kYkYyyokYk', 'kyokYyokyk', '.k.kYyok.k', '...kYyok..', '...kyyok..', '...kyyok..', '..kYyyyok.', '..kyyyyok.', '...kyook..', '..kkkkkkk.', '.knnmmmnnk', '.knmmmmmnk', '.kkkkkkkkk'], PAL);
SPR.heart = SP(['.kk.kk.', 'kRrkrrk', 'krrrrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'], PAL);
SPR.heartOff = SP(['.kk.kk.', 'keekeek', 'keeeeek', 'keeeeek', '.keeek.', '..kek..', '...k...'], PAL);
SPR.bulbS = SP(['.kkk.', 'kWYWk', 'kYYYk', '.kSk.', '.kkk.'], PAL);
SPR.keyS = SP(['kkk.....', 'kYkkkkkk', 'kyyyyyyk', 'kkk.k.k.'], PAL);
SPR.kernel = SP(['.ww.', 'wYYw', 'wYYw', '.ww.'], PAL);
SPR.bag = SP(['.kkkkk.', 'kwYwYwk', 'krwrwrk', 'kwrwrwk', 'krwrwrk', 'kwrwrwk', '.kkkkk.'], PAL);
// room-type icons (map card, exit signs): 9 x 9
SPR.ico = {
  start: SP(['..kk.....', '..kGk....', '..kGGk...', '..kGGGk..', '..kGGGGk.', '..kGGGk..', '..kGGk...', '..kGk....', '..kk.....'], PAL),
  battle: SP(['.......kk', '......kWk', '.....kWk.', 'kk..kWk..', '.kkkWk...', '..kyk....', '.kyokk...', 'kok..kk..', 'kk.......'], PAL),
  cash: SP(['...kyk...', '..kyyyk..', '.kyokkk..', '..kyyyk..', '...kkyok.', '..kkkyk..', '...kyk...', '...kyk...', '.........'], PAL),
  armory: SP(['.........', 'kkkkkkkk.', 'ksssssssk', 'kSSSSSSkk', 'kkkksk...', '...kSk...', '...kk....', '.........', '.........'], PAL),
  hazard: SP(['....k....', '...kyk...', '..kyyk...', '..kytyk..', '.kyttyk..', '.kyttTyk.', 'kyttTTtyk', 'kyttTTtyk', '.kkkkkkk.'], PAL),
  key: SP(['....k....', '...kyk...', 'kkkyyykkk', 'kyyyyyyyk', '.kyywyyk.', '..kyyyk..', '.kyykyyk.', 'kyk...kyk', 'kk.....kk'], PAL),
  boss: SP(['.kkkkkkk.', 'kwwwwwwwk', 'kwkkwkkwk', 'kwkkwkkwk', 'kwwwkwwwk', '.kwwwwwk.', '.kwkwkwk.', '..kkkkk..', '.........'], PAL),
  bonus: SP(['....k....', '...kGk...', 'kkkGGGkkk', 'kGGGGGGGk', '.kGGwGGk.', '..kGGGk..', '.kGGkGGk.', 'kGk...kGk', 'kk.....kk'], PAL),
};
// 18 prizes + the grand prize: 12 x 12 icons
SPR.prize = {
  toaster: SP(['............', '...kk..kk...', '...kn..kn...', '.kkkkkkkkkk.', 'kssssssssssk', 'ksWsssssssSk', 'kssskkkssssk', 'ksssk.kssssk', 'kssssssssrSk', 'kSSSSSSSSSSk', '.kk......kk.', '............'], PAL),
  blender: SP(['...kkkkkk...', '...kCCCCk...', '...kCrrCk...', '...kCrrCk...', '...kCCCCk...', '....kCCk....', '...kssssk...', '..kssyysk...', '..kssssssk..', '..kSSSSSSk..', '.kkkkkkkkkk.', '..k......k..'], PAL),
  laughter: SP(['...kkkkkk...', '..kssssssk..', '..kkkkkkkk..', '..kyyyyyyk..', '..kykwkwyk..', '..kyyyyyyk..', '..kykwwkyk..', '..kyykkyyk..', '..kyyyyyyk..', '..kkkkkkkk..', '..kSSSSSSk..', '...kkkkkk...'], PAL),
  thermostat: SP(['...kkkkkk...', '..kppppppk..', '.kpkkkkkkpk.', 'kpkCCCCCCkpk', 'kpkCyyCCCkpk', 'kpkCyyCCCkpk', 'kpkCCCCCCkpk', 'kpkCCCCCCkpk', '.kpkkkkkkpk.', '..kppppppk..', '...kkkkkk...', '............'], PAL),
  jetski: SP(['............', '......kk....', '.....krk....', '....krrk....', '...kkkkkkk..', '..krrrrrrrk.', '.krrwwwrrrrk', 'krrrrrrrrrrk', 'kSSSSSSSSSk.', '.kkkkkkkkk..', '..t...t.....', '............'], PAL),
  butler: SP(['....kkkk....', '...kssssk...', '...kcskck...', '...kssssk...', '....kkkk....', '..kkkkkkkk..', '.kskwwwwksk.', '.kskwkkwksk.', '.k.kwwwwk.k.', '...kkkkkk...', '...kk..kk...', '...kk..kk...'], PAL),
  fridge: SP(['.kkkkkkkkkk.', '.kssssssssk.', '.kskkskkssk.', '.kssssssssk.', '.ksskkkkssk.', '.kkkkkkkkkk.', '.kssssssssk.', '.ksssssskSk.', '.ksssssskSk.', '.kssssssssk.', '.kkkkkkkkkk.', '..k......k..'], PAL),
  jetpack: SP(['............', '.kkk....kkk.', 'kssskkkksssk', 'ksrsk..ksrsk', 'kssskkkksssk', 'ksrsk..ksrsk', 'kssskkkksssk', '.kkk....kkk.', '.ktk....ktk.', '.tTt....tTt.', '..t......t..', '............'], PAL),
  megatv: SP(['kkkkkkkkkkkk', 'kSSSSSSSSSSk', 'kSbbbbbbbbSk', 'kSbBBbbbbbSk', 'kSbBbbbppbSk', 'kSbbbbbppbSk', 'kSbbbbbbbbSk', 'kSSSSSSSSSSk', 'kkkkkkkkkkkk', '....kSSk....', '..kkkkkkkk..', '............'], PAL),
  laundry: SP(['............', '..kkkkkkkk..', '.kVVVVVVVVk.', 'kVVVVVVVVvk.', 'kkkkkkkkkvk.', 'kVkwwwwkVvk.', 'kVkwPPwkVvk.', 'kVkwwwwkVvk.', 'kVVVVVVVVk..', 'kkkkkkkkkk..', '............', '............'], PAL),
  remote: SP(['....kkkk....', '...kYYYyk...', '...kyrryk...', '...kyyyyk...', '...kykykk...', '...kyyyyk...', '...kykykk...', '...kyyyyk...', '...kykykk...', '...kyyyok...', '...kyyook...', '....kkkk....'], PAL),
  inflatable: SP(['............', '....kkkkk...', '...kRRRRRk..', '..kRwwRwwRk.', '.kRRRRRRRRRk', 'kRRRRRRRRRRk', 'krrrrrrrrrrk', '.kkkkkkkkkk.', '.kek....kek.', '..k......k..', '............', '............'], PAL),
  moon: SP(['....kkkk....', '..kkwwwwkk..', '.kwwSwwwwwk.', '.kwSSwwwSwk.', 'kwwwwwwwSSwk', 'kwwwSwwwwwwk', 'kwwSSSwwwwwk', 'kwwwSwwwSwwk', '.kwwwwwSSwk.', '.kwwwwwwwwk.', '..kkwwwwkk..', '....kkkk....'], PAL),
  weather: SP(['...kkkkk....', '..kwwwwwk...', '.kwwwwwwwkk.', 'kwwwwwwwwwwk', 'kSSSSSSSSSSk', '.kkkkkkkkkk.', '..c..c..c...', '.c..c..c....', '...c..c..c..', '..kkkkkkkk..', '..kyrbgyrk..', '..kkkkkkkk..'], PAL),
  toothbrush: SP(['..........kk', '.........kCk', '........kCk.', '.......kCk..', '......kWk...', '.....kCk....', '....kCk.....', '...kCk......', '..kpk.......', '.kppk.......', 'kppk........', 'kkk.........'], PAL),
  clone: SP(['............', '..kkk..kkk..', '.kmmmkkmmmk.', '.kmkmkkmkmk.', '.kmmmkkmmmk.', '.kmkkmmkkmk.', '..kmmk.kmmk.', '..k..k.k..k.', '............', '..kkkkkkkk..', '..kCCwwCCk..', '..kkkkkkkk..'], PAL),
  champagne: SP(['..k.....k...', '...k.k.k....', '..kkkkkkk...', '..kYYYYYk...', '..kYyYyYk...', '...kYYYk....', '....kyk.....', '....kWk.....', '....kWk.....', '....kWk.....', '..kkkkkkk...', '..kWWWWWk...'], PAL),
  speedboat: SP(['............', '.......k....', '......kwk...', '.....kkwk...', '..kkkkkkkkk.', '.kwwwwbbwwwk', 'kwwwwwwwwwk.', 'kbbbbbbbbk..', '.kkkkkkkk...', 'cc.cc.cc.cc.', '.cc.cc.cc.cc', '............'], PAL),
  network: SP(['.....kk.....', '....kyyk....', '.....kk.....', '....kssk....', '...kskksk...', '...kskksk...', '..ksk..ksk..', '..kskkkksk..', '.ksk....ksk.', '.ksk....ksk.', 'kskkkkkkkksk', 'kkk......kkk'], PAL),
};
