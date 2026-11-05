/* The Seven (§7.8, §8.3, §11.9 barks). rig: E.Humanoid options (the hats, accessories, weapons and skis are the
 * S7 PATCHes in engine/my-3d2dge.js). */
S7.persona('ansel', {
  n: 1, name: 'Ansel Holle', short: 'ANSEL', epithet: 'THE SWEEP', hp: 120, weapon: 'patrol38', walk: 1, startUnlocked: true,
  look: 'Ski patrolman. Orange parka, black beanie, goggles up.',
  skill: { id: 'flare', name: 'Flare', cost: 12, cooldown: 20, about: 'A flare overhead shows every Whiteout within 30 m for 8 s.' },
  extra: 'Patrol: crosses patrol ropes. Rescue: chips frozen personas free.',
  rig: { build: 'heroic', size: 1.3, hunch: .15, outfit: 'coat', hair: 'short', hat: { style: 'beanie', color: '#18181c', pom: '#f06a1e' }, acc: ['goggles', 'pack'], weapon: 'revolver', sleeves: 'long',
    colors: { skin: '#e6c8b0', hair: '#9a9aa0', cloth: '#d2461e', coat: '#d2461e', pants: '#1c1c22', boot: '#2a2420', trim: '#f4f4f4', glove: '#1c1c22', metal: '#4a4a52', lens: '#f0a020', pack: '#c81e2a' } },
  voice: 'ansel', color: '#d2461e',
  barks: { switch: ['Sweep\'s on.', 'Nobody stays on the mountain.'], crit: 'Clear.', low: 'Patrol needs patrol.', frozen: '...log it...', revived: 'Back on shift.' }
});
S7.persona('dagny', {
  n: 2, name: 'Dagny Holle', short: 'DAGNY', epithet: 'SCHUSS', hp: 80, weapon: 'poleguns', walk: 1.15, startUnlocked: true,
  look: 'Downhill racer. Electric-blue speed suit, silver helmet, orange visor.',
  skill: { id: 'tuck', name: 'Tuck', cost: 2, hold: true, about: 'Hold: double speed on rails, 260 on skis. 2 Red a second. Needed for jumps.' },
  rig: { build: 'heroic', size: 1.3, outfit: 'shirt', hair: 'ponytail', hat: { style: 'racehelmet', color: '#c0c8d0', visor: '#ff8a1e' }, weapon: 'poles', sleeves: 'long',
    colors: { skin: '#f0d0b8', hair: '#f0d890', cloth: '#1e5cff', pants: '#1e5cff', trim: '#ffffff', boot: '#101014', glove: '#101014', metal: '#c8ccd4' } },
  voice: 'dagny', color: '#1e5cff',
  barks: { switch: ['Late. Everyone\'s always late.', 'Point me downhill.'], crit: 'Gone.', low: 'Slower is worse.', frozen: '...cold...', revived: 'I owe you a coffee.' }
});
S7.persona('ignaz', {
  n: 3, name: 'Ignaz Holle', short: 'IGNAZ', epithet: 'TELEMARK', hp: 90, weapon: 'gamsbock', walk: .9, startUnlocked: true,
  look: 'Old aristocrat hunter. Tweed, knickerbockers, red socks, a feathered felt hat.',
  skill: { id: 'longlook', name: 'Long Look', cost: 0, about: 'In aim: a ×3.5 scope. Sway halved, range 250 m. Rings far bells.' },
  rig: { build: 'heroic', size: 1.3, hunch: .1, outfit: 'coat', hair: 'short', hat: { style: 'felt', color: '#2e4a2a', feather: '#e8e0c0' }, acc: ['moustache'], weapon: 'rifle', sleeves: 'long',
    colors: { skin: '#ead0b8', hair: '#e8e8e8', cloth: '#7a5a3a', coat: '#7a5a3a', pants: '#6a4a2a', boot: '#8a1a1a', trim: '#3a2a1a', glove: '#5a3a22', metal: '#3a3030', stache: '#f0f0f0', wood: '#6a3a1a' } },
  voice: 'ignaz', color: '#2e4a2a',
  barks: { switch: ['Ah. Weather for it.', 'One shot is a conversation.'], crit: 'Clean.', low: 'I have bled before. In better company.', frozen: '...how undignified...', revived: 'Hm. Thawed.' }
});
S7.persona('rurik', {
  n: 4, name: 'Rurik Holle', short: 'RURIK', epithet: 'MOGUL', hp: 150, weapon: 'bullion', walk: .9, startUnlocked: true,
  look: 'Fur-coated tycoon. Ushanka, black beard, gold tooth, cigar.',
  skill: { id: 'makeitrain', name: 'Make It Rain', cost: 10, cooldown: 6, about: 'Throws coins: Whiteouts within 12 m kneel to grab them for 3 s.' },
  extra: 'Buyout: pays velvet ropes, turnstiles and Murmel.',
  rig: { build: 'bulky', size: 1.4, outfit: 'coat', hair: 'short', hat: { style: 'ushanka', color: '#4a3a2a' }, acc: ['beard', 'cigar'], weapon: 'shotgun', sleeves: 'long',
    colors: { skin: '#e2c0a2', hair: '#1a1410', cloth: '#3a2a20', coat: '#3a2a20', trim: '#d8b040', pants: '#141416', boot: '#141416', glove: '#2a1a12', metal: '#d8b040', beard: '#1a1410' } },
  voice: 'rurik', color: '#d8b040',
  barks: { switch: ['Everything has a price. Even this.', 'I\'ll buy the next round.'], crit: 'Paid in full.', low: 'Bad investment.', frozen: '...put it on my tab...', revived: 'Worth every coin.' }
});
S7.persona('kasimir', {
  n: 5, name: 'Kasimir Holle', short: 'KASIMIR', epithet: 'YODEL', hp: 110, weapon: 'alphorn', walk: 1, startUnlocked: false,
  look: 'Yodeler. White shirt, lederhosen, green braces, the alphorn on his back.',
  skill: { id: 'echo', name: 'Echo', cost: 10, cooldown: 4, about: 'A yodel: opens Echo Walls (25 m), shatters ice crystals (15 m), marks Whiteouts through walls (40 m).' },
  rig: { build: 'heroic', size: 1.3, outfit: 'shirt', hair: 'short', hat: { style: 'felt', color: '#6a6a6a', feather: '#3a3a3a' }, acc: ['moustache', 'braces'], weapon: 'alphorn', sleeves: 'short',
    colors: { skin: '#eccab0', hair: '#5a3a1e', cloth: '#f0f0e8', pants: '#5a3a1e', trim: '#2e5a2e', boot: '#4a2e18', metal: '#8a5a2a', stache: '#5a3a1e', wood: '#8a5a2a' } },
  voice: 'kasimir', color: '#2e5a2e',
  barks: { switch: ['Yo-di-ah... hoo.', 'The mountain sings back if you\'re rude enough.'], crit: 'Encore!', low: 'Sour note.', frozen: '...hoo...', revived: 'From the top!' }
});
S7.persona('mireille', {
  n: 6, name: 'Mireille Holle', short: 'MIREILLE', epithet: 'SNAPSHOT', hp: 85, weapon: 'lady25', walk: 1, startUnlocked: false,
  look: 'Press photographer. Trench coat, black beret, black bob, press badge.',
  skill: { id: 'flash', name: 'Flash', cost: 8, cooldown: 2, aimOnly: true, about: 'In aim: stuns Whiteouts in a 35° cone for 2.5 s and reveals them. Develops Exposures.' },
  extra: 'Her warm-spot shots have 25% more room.',
  rig: { build: 'heroic', size: 1.3, outfit: 'coat', hair: 'short', hat: { style: 'beret', color: '#141414' }, acc: ['badge', 'camera'], weapon: 'pistol', sleeves: 'long',
    colors: { skin: '#f2d6c4', hair: '#141414', cloth: '#c8b48a', coat: '#c8b48a', pants: '#2a2a2e', boot: '#1a1a1e', trim: '#8a7a5a', glove: '#1a1a1e', metal: '#2a2a2e', lips: '#c81e2a' } },
  voice: 'mireille', color: '#c8b48a',
  barks: { switch: ['Smile. No, not you.', 'Light is a confession.'], crit: 'Developed.', low: 'Overexposed.', frozen: '...out of focus...', revived: 'Back in frame.' }
});
S7.persona('brigid', {
  n: 7, name: 'Brigid Holle', short: 'BRIGID', epithet: 'AVALANCHE', hp: 110, weapon: 'avalauncher', walk: 1, startUnlocked: false,
  look: 'Avalanche engineer. Red hard-shell, yellow hard hat with a lamp, a red braid.',
  skill: { id: 'charge', name: 'Control Charge', cost: 15, cooldown: 3, aimOnly: true, about: 'In aim: a long lob with a 5 m blast. The only thing that brings down cornices and seracs.' },
  rig: { build: 'heroic', size: 1.3, outfit: 'coat', hair: 'ponytail', hat: { style: 'hardhat', color: '#f0c020' }, acc: ['bandolier'], weapon: 'launcher', sleeves: 'long',
    colors: { skin: '#f0d0b8', hair: '#c8501e', cloth: '#c81e1e', coat: '#c81e1e', trim: '#d0d8e0', pants: '#141416', boot: '#2a2420', glove: '#2a2420', metal: '#5a6068' } },
  voice: 'brigid', color: '#c81e1e',
  barks: { switch: ['Fire in the hole. Gently.', 'Snow\'s just water that hasn\'t decided.'], crit: 'Controlled.', low: 'Load\'s shifting.', frozen: '...buried...', revived: 'Dug out. Cheers.' }
});

/* ---- weapons (§7.4) ---- */
S7.weapon('patrol38', { name: 'Patrol .38', kind: 'hitscan', dmg: 24, interval: .4, mag: 6, reload: 1.8, spread: .4, range: 60, recoil: 1.2, burn: true, sfx: 'shot38' });
S7.weapon('poleguns', { name: 'Pole Guns', kind: 'hitscan', dmg: 6, interval: .07, mag: 50, reload: 1.5, spread: 2, range: 35, recoil: .3, auto: true, sfx: 'shotpole' });
S7.weapon('gamsbock', { name: 'Gamsbock', kind: 'hitscan', dmg: 90, interval: 1.2, mag: 5, reload: 2.4, spread: 0, range: 120, recoil: 3, pierce: 1, sfx: 'shotrifle' });
S7.weapon('bullion', { name: 'Bullion', kind: 'pellets', pellets: 10, dmg: 9, interval: .95, mag: 6, reload: .45, perShell: true, spread: 8, range: 25, recoil: 4, knock: 70, sfx: 'shotgun' });
S7.weapon('alphorn', { name: 'Alphorn', kind: 'cone', cone: 25, dmg: 40, interval: 1, mag: 5, reload: 2.5, heat: true, range: 18, recoil: 2, knock: 90, sfx: 'alphorn' });
S7.weapon('lady25', { name: 'Lady .25', kind: 'hitscan', dmg: 15, interval: .2, mag: 9, reload: 1.1, spread: .3, range: 70, recoil: .6, sfx: 'shot25' });
S7.weapon('avalauncher', { name: 'Avalauncher', kind: 'lob', dmg: 70, interval: 1.1, mag: 4, reload: 2.8, range: 90, recoil: 3.5, sfx: 'launcher' });
