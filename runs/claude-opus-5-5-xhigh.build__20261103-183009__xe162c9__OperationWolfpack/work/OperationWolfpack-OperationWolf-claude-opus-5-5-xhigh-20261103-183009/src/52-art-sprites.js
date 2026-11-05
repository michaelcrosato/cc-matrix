// String sprites (9.1): every pickup, projectiles, the chute, shell casings, HUD icons, the wolf and hyena emblems.
(() => {
const E = My3D2dge, WP = globalThis.WP;
const SP = WP.SPR = {};
const pal = { k: '#141010', o: '#5c6a3a', O: '#7e8c4e', d: '#3a4426', y: '#e8c040', Y: '#fff0a0', r: '#c8302a', R: '#ff6a50', w: '#f0ece0', W: '#ffffff', g: '#2a9a4a', G: '#7ae08a', b: '#8a6a3a', B: '#b8925a', s: '#9aa0a8', S: '#d8dee6', t: '#c8a060', n: '#5a3a1e', p: '#e8d8b8', c: '#6aa8d8', m: '#4a4a52', f: '#ff9a2a', F: '#ffe06a' };
const mk = (rows, extra) => E.sprite(rows, Object.assign({}, pal, extra || {}));
// ---------- pickups ----------
SP.mag = mk(['..kkkk..', '.kOOOOk.', '.kOooOk.', '.kOooOk.', '..kOooOk', '..kOooOk', '..kOooOk', '...kOooOk', '...kOooOk', '...kyyyk', '....kkkk']);
SP.crate = mk(['kkkkkkkkkkkk', 'kOOOOOOOOOOk', 'kOddddddddOk', 'kOdyyyyyydOk', 'kOdyddddydOk', 'kOdyyyyyydOk', 'kOddddddddOk', 'kOOOOOOOOOOk', 'kooooooooook', 'kkkkkkkkkkkk']);
SP.gren = mk(['...kk...', '..kssk..', '..kkkk..', '.kOOOOk.', 'kOoOoOOk', 'kOOoOoOk', 'koOoOoOk', 'kooOoOok', '.kooook.', '..kkkk..']);
SP.gbox = mk(['kkkkkkkkkkkk', 'kbBBBBBBBBbk', 'kbkOkkOkkOkk', 'kbOoOOoOOoOk', 'kboOokoOokok', 'kbBBBBBBBBbk', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk']);
SP.ration = mk(['.kkkkkk.', 'kSSSSSSk', 'ksssssssk', 'krrrrrrk', 'kRwwwwRk', 'kRwwwwRk', 'krrrrrrk', 'kssssssk', '.kkkkkk.']);
SP.medkit = mk(['...kkkk...', 'kkkwwwwkkk', 'kwwwwwwwwk', 'kwwwggwwwk', 'kwwggggwwk', 'kwwwggwwwk', 'kwwwwwwwwk', 'ksssssssss', 'kkkkkkkkkk']);
SP.fury = mk(['..........kk', '.kkkkkkkkkFk', 'kFYYYYYYYYFk', 'kyyyyyyyyyk.', '.kkykkyyk...', '...kyk.kyk..', '...kyk..kk..', '....k.......']);
SP.dynamite = mk(['..k.k.k...', '.kfkFkfk..', '.krkrkrk..', 'krRrRrRrk.', 'krRrRrRrk.', 'kbbbbbbbk.', 'krRrRrRrk.', 'krRrRrRrk.', '.kkkkkkk..']);
SP.flare = mk(['..FF..', '.FffF.', '..kk..', '.krRk.', '.krRk.', '.krRk.', '.krRk.', '.kkkk.']);
SP.intel = mk(['kkkkk.....', 'kBBBBkkkkk', 'kBBBBBBBBk', 'kBppppppBk', 'kBpkkkkpBk', 'kBppppppBk', 'kBpkkkppBk', 'kBppppppBk', 'kkkkkkkkkk']);
SP.fang = mk(['.kkkkk.', 'kWWWWWk', 'kWwwWWk', '.kWwWk.', '.kWwWk.', '..kWk..', '..kWk..', '...k...']);
// ---------- projectiles ----------
SP.p_grenade = mk(['.kk.', 'kOOk', 'kOok', '.kk.']);
SP.p_knife = mk(['ss.......', 'kSSSSSbbk', 'ss.......']);
SP.p_rocket = mk(['.kkkkkk..', 'kssssssrR', '.kkkkkk..']);
SP.p_missile = mk(['.kkkkkkk..', 'kSSSSSSSrR', '.kkkkkkk..']);
SP.p_mortar = mk(['.k.', 'kmk', 'kmk', 'kmk', 'kmk', 'ksk', '.k.']);
SP.p_shell = mk(['.kkk.', 'kfFfk', 'kFYFk', 'kfFfk', '.kkk.']);
SP.p_pgren = mk(['.kk.', 'kOOk', 'kOok', '.kk.']);
SP.chute = mk(['....kkkkkkkk....', '..kkwwwwrrrrkk..', '.kwwwwwwrrrrrrk.', 'kwwwwwwwrrrrrrrk', 'kkkkkkkkkkkkkkkk', '.k....k..k....k.', '..k...k..k...k..', '...k..k..k..k...', '....k.k..k.k....', '.....kkkkkk.....']);
SP.casing = mk(['FY']);
SP.whistle = mk(['.k.k.', 'k.k.k', '.....', 'kkkk.', 'kssskk', 'kkkk.']);
SP.glint = mk(['..W..', '..W..', 'WWWWW', '..W..', '..W..']);
// ---------- HUD icons (8x8) ----------
SP.i_soldier = mk(['..kkk...', '.kbbbk..', '.kpppk..', '..kpk...', '.kttttk.', 'k.tttt.k', '..t..t..', '.kk..kk.']);
SP.i_jeep = mk(['........', '...kk...', '..ktk...', '.kttttk.', 'ktttttttk', 'kkkkkkkkk', '.kk...kk.', '........']);
SP.i_heli = mk(['kkkkkkkk', '...k....', '..ktttk.', 'kkttttttk', '.kktttk..', '..k...k..', '.kkkkkkk.', '........']);
SP.i_boat = mk(['........', '...kk...', '...kt...', '..kttk..', 'kkkkkkkk', 'ktttttk.', '.kkkkk..', 'cccccccc']);
SP.i_mast = mk(['...r....', '...k....', '..kkk...', '..k.k...', '.kk.kk..', '.k...k..', 'kk...kk.', 'k.....k.']);
SP.i_mag = mk(['.kkk', 'kOOk', 'kook', 'kook', 'kook', '.kook', '.kook', '..kkk']);
SP.i_mag_part = mk(['.kkk', 'kOOk', 'kddk', 'kddk', 'kook', '.kook', '.kook', '..kkk']);
SP.i_bullet = mk(['F.', 'yk', 'yk', 'bk', 'bk']);
SP.i_bullet_off = mk(['k.', 'mk', 'mk', 'mk', 'mk']);
SP.i_gren = mk(['..k..', '.kkk.', 'kOoOk', 'kOOok', 'koOok', '.kkk.']);
SP.i_hostage = mk(['.kkk.', 'kpppk', 'kpppk', '.kwk.', 'kwwwk', 'kwwwk', '.k.k.']);
// ---------- emblems ----------
SP.wolf = mk([
  '......k...............k.........',
  '.....kyk.............kyk........',
  '.....kyyk...........kyyk........',
  '....kyyyyk.........kyyyyk.......',
  '....kyYyyyk.......kyyyYyk.......',
  '...kyyYYyyykkkkkkkyyyYYyyk......',
  '...kyyyYyyyyyyyyyyyyyYyyyk......',
  '...kyyyyyyyyyyyyyyyyyyyyyk......',
  '..kyyyyyyyyyyyyyyyyyyyyyyyk.....',
  '..kyyykkkyyyyyyyyyyykkkyyyk.....',
  '..kyykRRkkyyyyyyyyykkRRkyyk.....',
  '..kyyykkkyyyyyyyyyyykkkyyyk.....',
  '..kyyyyyyyyyyyyyyyyyyyyyyyk.....',
  '...kyyyyyyyyyYYYyyyyyyyyyk......',
  '...kyyyyyyyyYYYYYyyyyyyyyk......',
  '....kyyyyyyYYkkkYYyyyyyyk.......',
  '....kyyyyyYYYkkkYYYyyyyyk.......',
  '.....kyyyyYYYYkYYYYyyyyk........',
  '......kyyyYYWkkkWYYyyyk.........',
  '.......kyyYYkWWWkYYyyk..........',
  '........kyyYYYYYYYyyk...........',
  '.........kkyyyyyyykk............',
  '...........kkkkkkk..............']);
SP.hyena = mk(['k.......k', 'kk.....kk', 'kbkkkkkbk', 'kbbbbbbbk', 'kbkbbbkbk', 'kbbbbbbbk', '.kbWkWbk.', '.kbWWWbk.', '..kkkkk..'], { b: '#8a6a3a', W: '#f0ece0' });
WP.PICKUP_SPR = { mag: SP.mag, crate: SP.crate, gren: SP.gren, gbox: SP.gbox, ration: SP.ration, medkit: SP.medkit, fury: SP.fury, dynamite: SP.dynamite, flare: SP.flare, intel: SP.intel, fang: SP.fang };
})();
