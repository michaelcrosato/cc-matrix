/* SKILLER7 content — personas, weapons, enemies, items, tutorial tips. Plain data: adding one never changes src/. */
S7.persona('ansel', { n: 1, name: 'Ansel Holle', epithet: 'THE SWEEP', hp: 120, weapon: 'patrol38', skill: 'flare', skillName: 'Flare', skillCost: 12, voice: 'ansel',
  about: 'Ski patrol. Quiet, procedural. Lifts patrol ropes; chips frozen family out of the ice.',
  rig: { build: 'heroic', hunch: .15, outfit: 'coat', hair: 'short', hat: { style: 'beanie', color: '#18181c', pom: '#f06a1e' }, acc: [{ kind: 'goggles', color: '#f0a020' }], weapon: 'revolver', colors: { skin: '#e6c8b0', hair: '#9a9aa0', cloth: '#d2461e', coat: '#d2461e', pants: '#1c1c22', boot: '#2a2420', trim: '#f4f4f4', metal: '#5a5a62' } },
  barks: { in: ['Sweep\'s on.', 'Nobody stays on the mountain.'], crit: 'Clear.', low: 'Patrol needs patrol.', frozen: '...log it...', revived: 'Back on shift.' } });
S7.persona('dagny', { n: 2, name: 'Dagny Holle', epithet: 'SCHUSS', hp: 80, weapon: 'poleguns', skill: 'tuck', skillName: 'Tuck (hold)', skillCost: 2, speedK: 1.15, voice: 'dagny',
  about: 'Downhill racer. Impatient. Tuck doubles her speed; only she can make a jump.',
  rig: { build: 'heroic', outfit: 'shirt', hair: 'ponytail', hat: { style: 'racehelmet', color: '#c0c8d0', visor: '#ff8a1e' }, weapon: 'poles', colors: { skin: '#f0d0b8', hair: '#f0d890', cloth: '#1e5cff', pants: '#1e5cff', trim: '#ffffff', boot: '#101014', metal: '#c8ccd4' } },
  barks: { in: ['Late. Everyone\'s always late.', 'Point me downhill.'], crit: 'Gone.', low: 'Slower is worse.', frozen: '...cold...', revived: 'I owe you a coffee.' } });
S7.persona('ignaz', { n: 3, name: 'Ignaz Holle', epithet: 'TELEMARK', hp: 90, weapon: 'gamsbock', skill: 'longlook', skillName: 'Long Look (scope)', skillCost: 0, speedK: .9, voice: 'ignaz',
  about: 'An old hunter of the old school. Formal. His scope reaches what nobody else can.',
  rig: { build: 'heroic', hunch: .1, outfit: 'coat', hair: 'short', hat: { style: 'felt', color: '#2e4a2a', feather: '#e8e0c0' }, face: { bangs: 0 }, acc: [{ kind: 'moustache', color: '#f0f0f0' }], weapon: 'rifle', colors: { skin: '#e2c2a8', hair: '#e8e8e8', cloth: '#7a5a3a', coat: '#7a5a3a', pants: '#6a4a2a', boot: '#8a1a1a', trim: '#3a2a1a', metal: '#3a3a40', wood: '#6a4a2a' } },
  barks: { in: ['Ah. Weather for it.', 'One shot is a conversation.'], crit: 'Clean.', low: 'I have bled before. In better company.', frozen: '...how undignified...', revived: 'Hm. Thawed.' } });
S7.persona('rurik', { n: 4, name: 'Rurik Holle', epithet: 'MOGUL', hp: 150, weapon: 'bullion', skill: 'makeitrain', skillName: 'Make It Rain', skillCost: 10, speedK: .9, voice: 'rurik', size: 1.4,
  about: 'A fur-coated tycoon. Pays velvet ropes and turnstiles. Throws coins; they kneel for them.',
  rig: { build: 'bulky', outfit: 'coat', hair: 'short', hat: { style: 'ushanka', color: '#4a3a2a' }, acc: [{ kind: 'beard', color: '#1a1410' }, { kind: 'cigar' }], weapon: 'shotgun', colors: { skin: '#d8b498', hair: '#1a1410', cloth: '#3a2a20', coat: '#3a2a20', trim: '#d8b040', pants: '#141416', boot: '#1a1410', metal: '#d8b040' } },
  barks: { in: ['Everything has a price. Even this.', 'I\'ll buy the next round.'], crit: 'Paid in full.', low: 'Bad investment.', frozen: '...put it on my tab...', revived: 'Worth every coin.' } });
S7.persona('kasimir', { n: 5, name: 'Kasimir Holle', epithet: 'YODEL', hp: 110, weapon: 'alphorn', skill: 'echo', skillName: 'Echo', skillCost: 10, voice: 'kasimir',
  about: 'A yodeler with menace. His Echo opens singing walls, shatters humming ice, marks them through stone.',
  rig: { build: 'heroic', outfit: 'shirt', hair: 'short', hat: { style: 'felt', color: '#6a6a6a', feather: '#3a3a3a' }, acc: [{ kind: 'moustache', color: '#5a3a1e' }], weapon: 'alphorn', colors: { skin: '#e8c8a8', hair: '#5a3a1e', cloth: '#f0f0e8', pants: '#5a3a1e', trim: '#2e5a2e', boot: '#4a2e18', wood: '#8a5a2a', metal: '#8a5a2a' } },
  barks: { in: ['Yo-di-ah... hoo.', 'The mountain sings back if you\'re rude enough.'], crit: 'Encore!', low: 'Sour note.', frozen: '...hoo...', revived: 'From the top!' } });
S7.persona('mireille', { n: 6, name: 'Mireille Holle', epithet: 'SNAPSHOT', hp: 85, weapon: 'lady25', skill: 'flash', skillName: 'Flash', skillCost: 8, voice: 'mireille',
  about: 'Press photographer. Wry. Her Flash stuns, reveals and develops secrets in the dark.',
  rig: { build: 'heroic', outfit: 'coat', hair: 'short', hat: { style: 'beret', color: '#141414' }, weapon: 'pistol', colors: { skin: '#f2d8c4', hair: '#141414', cloth: '#c8b48a', coat: '#c8b48a', pants: '#2a2a2e', boot: '#1a1a1e', trim: '#8a7a5a', metal: '#2a2a30' } },
  barks: { in: ['Smile. No, not you.', 'Light is a confession.'], crit: 'Developed.', low: 'Overexposed.', frozen: '...out of focus...', revived: 'Back in frame.' } });
S7.persona('brigid', { n: 7, name: 'Brigid Holle', epithet: 'AVALANCHE', hp: 110, weapon: 'avalauncher', skill: 'charge', skillName: 'Control Charge', skillCost: 15, voice: 'brigid',
  about: 'Avalanche-control engineer. Dry. Only her Control Charge brings down cornices and seracs.',
  rig: { build: 'heroic', outfit: 'coat', hair: 'ponytail', hat: { style: 'hardhat', color: '#f0c020' }, weapon: 'launcher', colors: { skin: '#f0d4c0', hair: '#c8501e', cloth: '#c81e1e', coat: '#c81e1e', trim: '#d0d8e0', pants: '#141416', boot: '#202024', metal: '#5a6068' } },
  barks: { in: ['Fire in the hole. Gently.', 'Snow\'s just water that hasn\'t decided.'], crit: 'Controlled.', low: 'Load\'s shifting.', frozen: '...buried...', revived: 'Dug out. Cheers.' } });

S7.weapon('patrol38', { name: 'Patrol .38', kind: 'hitscan', dmg: 24, interval: .4, mag: 6, reload: 1.8, spread: .4, range: 60, recoil: 1.2, burn: true, sfx: 'shot38' });
S7.weapon('poleguns', { name: 'Pole Guns', kind: 'hitscan', auto: true, dmg: 6, interval: .07, mag: 50, reload: 1.5, spread: 2, range: 35, recoil: .3, sfx: 'shotPole' });
S7.weapon('gamsbock', { name: 'Gamsbock', kind: 'hitscan', dmg: 90, interval: 1.2, mag: 5, reload: 2.4, spread: 0, range: 120, scopeRange: 250, recoil: 3, pierce: 1, sfx: 'shotRifle' });
S7.weapon('bullion', { name: 'Bullion', kind: 'pellets', pellets: 10, dmg: 9, interval: .95, mag: 6, reload: .45, perShell: true, spread: 8, range: 25, recoil: 4, sfx: 'shotShotgun' });
S7.weapon('alphorn', { name: 'Alphorn', kind: 'cone', dmg: 40, cone: 25, interval: 1, mag: 5, heat: true, reload: 2.5, range: 18, recoil: 2, sfx: 'alphorn' });
S7.weapon('lady25', { name: 'Lady .25', kind: 'hitscan', dmg: 15, interval: .2, mag: 9, reload: 1.1, spread: .3, range: 70, recoil: .6, sfx: 'shot25' });
S7.weapon('avalauncher', { name: 'Avalauncher', kind: 'lob', dmg: 70, splash: 2.5, speed: 300, interval: 1.1, mag: 4, reload: 2.8, range: 90, recoil: 3.5, sfx: 'lob' });

S7.enemy('giggler', { name: 'Giggler', hp: 30, speed: [32, 42], contact: 20, red: [8, 14], rime: 1, size: 1, ai: 'walker' });
S7.enemy('bellboy', { name: 'Bellboy', hp: 18, speed: [85, 100], contact: 14, red: [6, 12], rime: 1, size: .95, ai: 'runner', warm: ['head'], hat: 'pillbox' });
S7.enemy('tobogganer', { name: 'Tobogganer', hp: 26, speed: [130, 170], contact: 26, red: [10, 18], rime: 1, size: 1, ai: 'sled', warm: ['chest'], sled: true });
S7.enemy('snowballer', { name: 'Snowballer', hp: 25, speed: [0, 0], red: [8, 14], rime: 1, size: 1, ai: 'thrower', projectile: 'snowball' });
S7.enemy('icecuber', { name: 'Snowballer', hp: 25, speed: [0, 0], red: [8, 14], rime: 1, size: 1, ai: 'thrower', projectile: 'icecube' });
S7.enemy('twins', { name: 'Twins', hp: 40, speed: [30, 30], contact: 20, red: [12, 20], rime: 2, size: 1.05, ai: 'twins', warm: ['chest'] });
S7.enemy('plow', { name: 'Plow', hp: 90, speed: [26, 26], contact: 30, red: [20, 30], rime: 2, size: 1.15, ai: 'plow', warm: ['back'] });
S7.enemy('inspector', { name: 'Inspector', hp: 50, speed: [60, 60], red: [15, 25], rime: 2, size: 1, ai: 'inspector', warm: ['head', 'chest'] });
S7.enemy('bloom', { name: 'Bloom', hp: 300, speed: [18, 18], contact: 45, red: [40, 60], rime: 4, size: 1.8, ai: 'bloom', spots: ['a', 'b', 'c'] });
S7.enemy('dancer', { name: 'Dancing Giggler', hp: 30, speed: [34, 40], contact: 18, red: [8, 14], rime: 1, size: 1, ai: 'dancer' });
S7.enemy('crawler', { name: 'Cable Crawler', hp: 30, speed: [30, 38], contact: 20, red: [8, 14], rime: 1, size: .9, ai: 'walker' });

// items (§7.12)
S7.item('servicekey', { kind: 'key', name: 'Service Key', icon: 'key', about: 'Brass. Says STAFF ONLY in three languages and means it in all of them.' });
S7.item('edelweiss', { kind: 'key', name: 'Edelweiss Pass', icon: 'flower', about: 'A delegate\'s pass, pressed flat. Three open the gondola.' });
S7.item('ember', { kind: 'key', name: 'Ember Charm', icon: 'ember', about: 'A coal that never cools. Ice weeps when it meets it.' });
S7.item('red5', { kind: 'red', name: 'Red snow' }); S7.item('rime', { kind: 'rime', name: 'Rime crystal' });
const PINS = [
  ['pin1', 'PIZ NADA — HIGHER THAN YOU THINK', 'They say three thousand metres. The mountain says otherwise.'],
  ['pin2', 'GRAND HOTEL NADA — ROOMS 1–316', 'There is no Room 7. There never was. Don\'t knock.'],
  ['pin3', 'OBERGLÜCK CHRISTMAS MARKET', 'The Glühwein is warm. That\'s how they get you.'],
  ['pin4', 'THAW ACCORD — SIGN HERE', 'Treaties are written in pencil and signed in pen.'],
  ['pin5', 'I SURVIVED THE BLACK RUN', 'Seven didn\'t.'],
  ['pin6', 'HIMMELSBAHN — HOLD ON TIGHT', 'I held on. The lift let go.'],
  ['pin7', '1926 TEAM — EIGHT FOR GOLD', 'Eight on the lift. Seven on the wall. One in the bed.']];
PINS.forEach(([id, slogan, line], i) => S7.item(id, { kind: 'pin', n: i + 1, name: 'Lift Pin ' + (i + 1), slogan, about: '"' + line + '" — Pim' }));
const DOCS = [
  ['doc_t00', 'TARGET 00: AUGUSTIN GRAU', 'Bell captain. Forty-one years of service. Never late. Never smiled. Smiling since Tuesday.'],
  ['doc_t01', 'TARGET 01: HANSI PULVER', 'Three Olympic golds. The face of Nada chocolate. Instructor to presidents. Listed: WARM FRONT — COMMANDER.'],
  ['doc_grau', 'GRAU: EMPLOYEE FILE', 'Punctual. Discreet. Carries luggage for guests who do not leave. Commendation, 1971: for not asking.'],
  ['doc_menu', 'ROOM SERVICE: THE BELLCAPTAIN\'S SPECIALS', 'Turn-down service. Late checkout. Early checkout. Permanent checkout. Ask at the desk.'],
  ['doc_art9', 'THE THAW ACCORD, ARTICLE NINE', 'The Canton shall open the Glacier Archive. Every account. Every name. Every body. Signed in pen, at midnight.'],
  ['doc_1926', 'THE AVALANCHE OF 1926', 'A clipping. Eight young skiers on the chairlift for the team photograph. The snow came down. One was found alive.'],
  ['doc_orders', 'DEPARTMENT OF DISCRETION: STANDING ORDERS', '1. Discretion. 2. See 1.'],
  ['doc_prices', 'SKI SCHOOL PRICE LIST', 'Private lesson: 80. Private lesson, no questions: 800. Lesson in falling: priceless.']];
DOCS.forEach(([id, name, text]) => S7.item(id, { kind: 'doc', name, text, about: text }));
S7.item('exp_board', { kind: 'exposure', name: 'Exposure: the press room blackboard', text: 'Under a cartoon of a chairlift, in invisible ink: THE DAY THE EIGHT WENT UP: 26 · 01', about: 'THE DAY THE EIGHT WENT UP: 26 · 01' });
S7.item('exp_ledger', { kind: 'exposure', name: 'Exposure: the frozen ledger', text: 'ACCOUNT 7 — HOLDER: H. HOLLE — CONTENTS: SEVEN (7) PERSONS, DECEASED 26.1.1926 — IN TRUST.', about: 'ACCOUNT 7 — HOLDER: H. HOLLE — SEVEN (7) PERSONS — IN TRUST.' });

/* tutorial tips: a big glyph and a verb; each clears when its action is done */
S7.TIPDEFS = {
  walk: { act: 'move', text: 'HOLD {move} TO WALK' }, junction: { act: 'left', text: '{left} {right} PICK A WAY · HOLD {move} TO GO' },
  aim: { act: 'aim', text: 'HOLD {aim} TO AIM' }, scan: { act: 'scan', text: '{scan} SCAN FOR LAUGHTER' }, fire: { act: 'fire', text: '{fire} SHOOT THE WARM SPOT' },
  heal: { act: 'heal', text: 'HOLD {heal} TO DRINK RED' }, ring: { act: 'ring', text: 'HOLD {ring}: THE FEATHERBED' }, turn: { act: 'turn', text: '{turn} QUICK TURN' },
  interact: { act: 'interact', text: '{interact} CHECK' }, skill: { act: 'skill', text: '{skill} SKILL' }, rescue: { act: 'interact', text: 'HOLD {interact} AT THE STATUE TO CHIP IT FREE' },
  room7: { act: 'interact', text: 'THE CLOCK SAVES · THE BENCH WAXES · THE WARDROBE CHANGES' }, plow: { act: 'fire', text: 'THE SHIELD STOPS SHOTS · WAIT FOR ITS BACK, OR BLAST IT ROUND' },
  ski: { act: 'move', text: 'HOLD {move} TO TUCK · {turn} HOCKEY STOP, THEN AIM' }, seven: { act: 'ring', text: 'THE FEATHERBED NOW HOLDS SEVEN' }, map: { act: 'map', text: '{map} MAP' }
};
