/* ---- TEAMS: kits, crests, rosters (sevens: three forwards, four backs), AI styles. Designers edit these tables ----
 * a player: [name, nickname, role, build, size, hair, hairColor, skin, hat, stats [SPD, POW, HND, KCK, TKL], extra]
 * roles: P prop, H hooker, SH scrum-half, FH fly-half, C centre, W wing. Stats 1-10 (the boss goes past it on purpose). */
const SKIN = { pale: '#f2cfb0', light: '#e0b090', tan: '#c8946a', brown: '#a87050', dark: '#6a4028', deep: '#4e2e1c' };
TT.ROLE_ORDER = ['P', 'H', 'P', 'SH', 'FH', 'C', 'W'];
TT.ROLE_NAME = { P: 'PROP', H: 'HOOKER', SH: 'SCRUM-HALF', FH: 'FLY-HALF', C: 'CENTRE', W: 'WING' };
const TEAMS = TT.TEAMS = {
  mud: {
    id: 'mud', name: 'MUDDINGTON MUDLARKS', short: 'MUD', place: 'Muddington', venue: 'muddington', diff: 'Pro',
    home: { cloth: '#4aa0e0', trim: '#5a3a1e', pants: '#3a2a1a', boot: '#1a1410' }, away: { cloth: '#e8dcc0', trim: '#4aa0e0', pants: '#3a2a1a', boot: '#1a1410' },
    crest: { bg: '#4aa0e0', fg: '#6a4424', art: 'bird' },
    style: { aggr: .5, pass: .55, kick: .3, cheap: .1, line: 1 },
    blurb: 'The pub side from the Muddy Duck. Big hearts, bigger lunches.',
    players: [
      ['Dougie McAllister', 'The Fridge', 'P', 'bulky', 1.35, 'bald', '#3a2a1a', SKIN.pale, { style: 'helmet', color: '#6a4424' }, [4, 9, 5, 3, 8], { captain: true }],
      ['Kev Boatwright', 'Gravy', 'H', 'bulky', 1.25, 'short', '#c8602a', SKIN.pale, { style: 'band', color: '#e8dcc0' }, [5, 8, 6, 3, 7]],
      ['Sione Taufa', 'Tiny', 'P', 'bulky', 1.42, 'short', '#141010', SKIN.brown, null, [4, 10, 4, 2, 8]],
      ['Priya Nandakumar', 'Pocket Rocket', 'SH', 'heroic', 1.05, 'ponytail', '#141010', SKIN.brown, null, [8, 4, 9, 6, 6]],
      ['Ffion Pritchard', 'Boots', 'FH', 'heroic', 1.12, 'long', '#9a3a1a', SKIN.pale, null, [6, 5, 8, 9, 5]],
      ['Marcus Odhiambo', 'The Bus', 'C', 'heroic', 1.3, 'spiky', '#141010', SKIN.dark, null, [7, 8, 6, 4, 7]],
      ['Jamie Whitlock', 'Wheels', 'W', 'heroic', 1.1, 'spiky', '#f0d070', SKIN.pale, null, [10, 4, 7, 5, 4]]
    ]
  },
  bad: {
    id: 'bad', name: 'BRAMBLEWICK BADGERS', short: 'BAD', place: 'Bramblewick', venue: 'muddington', diff: 'Rookie',
    home: { cloth: '#24242a', trim: '#f0f0f0', pants: '#f0f0f0', boot: '#141414' }, away: { cloth: '#f0f0f0', trim: '#24242a', pants: '#24242a', boot: '#141414' },
    crest: { bg: '#f0f0f0', fg: '#24242a', art: 'badger' },
    style: { aggr: .3, pass: .4, kick: .5, cheap: .05, line: .9 },
    blurb: 'A village side. Their captain is seventy-four and bites.',
    players: [
      ['Edna Pemberton', 'Nan', 'P', 'bulky', 1.25, 'short', '#c8c8c8', SKIN.pale, { style: 'helmet', color: '#e8dcc0' }, [3, 8, 6, 4, 8], { captain: true, hunch: .2, voice: 'nan' }],
      ['Wilf Hollins', 'Wilf', 'H', 'bulky', 1.2, 'short', '#5a3a22', SKIN.light, null, [4, 7, 5, 3, 6]],
      ['Barnaby Pike', 'Barn Door', 'P', 'bulky', 1.38, 'bald', '#3a2a1a', '#e8a890', null, [3, 9, 3, 2, 7]],
      ['Pip Tanner', 'Pip', 'SH', 'heroic', 1.0, 'spiky', '#c8602a', SKIN.pale, null, [7, 3, 7, 5, 5]],
      ['Clementine Ashby', 'Clem', 'FH', 'heroic', 1.1, 'ponytail', '#f0d070', SKIN.pale, null, [5, 4, 7, 8, 4]],
      ['Ollie Brock', 'Badger', 'C', 'heroic', 1.25, 'short', '#202020', SKIN.light, null, [6, 7, 5, 3, 6]],
      ['Tilly Fenwick', 'Tilly', 'W', 'heroic', 1.08, 'long', '#141010', SKIN.tan, null, [8, 3, 6, 4, 4]]
    ]
  },
  gul: {
    id: 'gul', name: 'PORT GRUMBLE GULLS', short: 'GUL', place: 'Port Grumble', venue: 'docks', diff: 'Pro',
    home: { cloth: '#f4f4f0', trim: '#1fa89a', pants: '#1e2a50', boot: '#141820' }, away: { cloth: '#1fa89a', trim: '#f4f4f0', pants: '#1e2a50', boot: '#141820' },
    crest: { bg: '#1fa89a', fg: '#f4f4f0', art: 'gull' },
    style: { aggr: .45, pass: .75, kick: .5, cheap: .1, line: 1, react: .05 },
    blurb: 'A flashy harbour side. Run it, kick it, admire it.',
    players: [
      ['Sal Pereira', 'Salty', 'P', 'bulky', 1.32, 'short', '#141010', SKIN.tan, null, [4, 8, 5, 3, 7]],
      ['Kenji Ito', 'Kipper', 'H', 'bulky', 1.2, 'spiky', '#141010', SKIN.light, null, [6, 7, 7, 3, 6]],
      ['Mo Haddad', 'Anchor', 'P', 'bulky', 1.38, 'bald', '#141010', SKIN.tan, null, [4, 9, 4, 2, 8]],
      ['Lulu Fairweather', 'Lulu', 'SH', 'heroic', 1.02, 'ponytail', '#c8402a', SKIN.pale, null, [8, 4, 9, 6, 5]],
      ['Jonty Swift', 'Silky', 'FH', 'heroic', 1.15, 'long', '#f0c850', SKIN.light, { style: 'band', color: '#1fa89a' }, [7, 5, 9, 9, 4], { captain: true }],
      ['Dexter Okoro', 'Jet', 'C', 'heroic', 1.25, 'short', '#141010', SKIN.dark, null, [8, 7, 7, 4, 6]],
      ['Bree Lindqvist', 'Breeze', 'W', 'heroic', 1.1, 'long', '#f4ecd0', SKIN.pale, null, [10, 4, 8, 5, 4]]
    ]
  },
  irn: {
    id: 'irn', name: 'FURNACE FORGE IRONSIDES', short: 'IRN', place: 'Furnace Forge', venue: 'furnace', diff: 'Pro',
    home: { cloth: '#3a3a44', trim: '#f07a1e', pants: '#18181c', boot: '#101010' }, away: { cloth: '#f07a1e', trim: '#3a3a44', pants: '#18181c', boot: '#101010' },
    crest: { bg: '#3a3a44', fg: '#f07a1e', art: 'anvil' },
    style: { aggr: .85, pass: .35, kick: .25, cheap: .35, line: 1.2 },
    blurb: 'Foundry hard men and women. They hit like a drop forge.',
    players: [
      ['Grigor Petrov', 'The Kiln', 'P', 'bulky', 1.4, 'bald', '#141010', '#b88a6a', { style: 'helmet', color: '#f07a1e' }, [4, 10, 3, 2, 9]],
      ['Rusty Nailor', 'Rusty', 'H', 'bulky', 1.25, 'short', '#a84a1e', SKIN.pale, { style: 'helmet', color: '#f07a1e' }, [5, 8, 5, 3, 8]],
      ['Bertha Blunt', 'Big Bertha', 'P', 'bulky', 1.4, 'ponytail', '#141010', SKIN.light, { style: 'helmet', color: '#f07a1e' }, [4, 10, 4, 2, 9]],
      ['Smudge Cole', 'Smudge', 'SH', 'heroic', 1.05, 'spiky', '#141010', SKIN.tan, null, [7, 5, 7, 5, 6]],
      ['Ingot Ingram', 'Ingot', 'FH', 'heroic', 1.15, 'short', '#f0d070', SKIN.pale, null, [6, 6, 7, 8, 6]],
      ['Adaeze Okafor', 'Anvil', 'C', 'bulky', 1.32, 'short', '#141010', SKIN.dark, { style: 'helmet', color: '#f07a1e' }, [7, 9, 6, 3, 9], { captain: true }],
      ['Flint Mackay', 'Flint', 'W', 'heroic', 1.12, 'spiky', '#a8a8a8', SKIN.pale, null, [9, 6, 6, 4, 6]]
    ]
  },
  meg: {
    id: 'meg', name: 'MEGACORP MAULERS', short: 'MEG', place: 'The Megadome', venue: 'megadome', diff: 'Legend', locked: true,
    home: { cloth: '#e8c040', trim: '#5a2a8a', pants: '#3a1a5a', boot: '#1a1024' }, away: { cloth: '#5a2a8a', trim: '#e8c040', pants: '#3a1a5a', boot: '#1a1024' },
    crest: { bg: '#5a2a8a', fg: '#e8c040', art: 'm' },
    style: { aggr: .7, pass: .6, kick: .45, cheap: .25, line: 1.1, supers: 1 },
    blurb: 'A billionaire\'s bought-in super team. Their prop is a postcode.',
    players: [
      ['Brannigan', 'BIG UNIT', 'P', 'bulky', 2.0, 'bald', '#141010', SKIN.light, { style: 'band', color: '#e8c040' }, [6, 12, 6, 3, 10], { captain: true, boss: true, voice: 'unit' }],
      ['Leverage Lou', 'Lou', 'H', 'bulky', 1.25, 'short', '#2a1a10', SKIN.pale, null, [6, 8, 7, 3, 7]],
      ['Bonus Barrington', 'Bonus', 'P', 'bulky', 1.38, 'short', '#f0d070', SKIN.pale, null, [5, 9, 5, 2, 8]],
      ['Synergy Jones', 'Synergy', 'SH', 'heroic', 1.05, 'ponytail', '#9a5ae0', SKIN.brown, null, [9, 5, 9, 6, 6]],
      ['Chad Sterling III', 'Chad', 'FH', 'heroic', 1.15, 'long', '#f0c850', SKIN.pale, null, [7, 6, 9, 10, 5]],
      ['Vance Capitale', 'Vance', 'C', 'heroic', 1.28, 'spiky', '#141010', SKIN.tan, null, [8, 8, 7, 5, 7]],
      ['Hedge Fundsworth', 'Hedge', 'W', 'heroic', 1.12, 'short', '#d8d8e0', SKIN.pale, null, [10, 5, 8, 6, 5]]
    ]
  }
};
TT.TEAM_ORDER = ['mud', 'bad', 'gul', 'irn', 'meg'];
for (const id in TEAMS) {
  const tm = TEAMS[id];
  tm.roster = tm.players.map(([name, nick, role, build, size, hair, hairC, skin, hat, st, extra], i) => Object.assign({
    i, name, nick, role, build, size, hair, hairC, skin, hat,
    spd: st[0], pow: st[1], hnd: st[2], kck: st[3], tkl: st[4]
  }, extra || {}));
  // sevens order: loosehead prop, hooker, tighthead prop, scrum-half, fly-half, centre, wing
  const props = tm.roster.filter(p => p.role === 'P'), byRole = r => tm.roster.find(p => p.role === r);
  tm.roster = [props[0], byRole('H'), props[1], byRole('SH'), byRole('FH'), byRole('C'), byRole('W')];
  tm.roster.forEach((p, k) => { p.slot = k; });
}
/** the three-bar card numbers for a team (SPEED, POWER, SKILL), 0..1 */
TT.teamBars = id => {
  const R = TEAMS[id].roster, avg = k => R.reduce((a, p) => a + p[k], 0) / R.length;
  return [avg('spd') / 10, Math.min(1, avg('pow') / 10), (avg('hnd') + avg('kck') + avg('tkl')) / 30];
};
/** the off-pitch cast: coach, bus driver, commentators, referee, owner (portraits and cutscenes) */
TT.CAST = {
  gristle: { name: 'COACH GRISTLE', build: 'bulky', size: 1.3, hair: 'bald', hairC: '#b8b8b8', skin: SKIN.pale, hat: { style: 'cap', color: '#5a4430' }, outfit: 'coat', colors: { cloth: '#6a5038', coat: '#6a5038', pants: '#3a3028', trim: '#3a2a1a' }, voice: 'gristle' },
  dave: { name: 'BIG DAVE', build: 'bulky', size: 1.35, hair: 'short', hairC: '#3a2a1a', skin: SKIN.light, hat: { style: 'band', color: '#2a2a3a' }, outfit: 'coat', colors: { cloth: '#e8e030', coat: '#e8e030', pants: '#2a3048', trim: '#c8c8c8' }, voice: 'dave' },
  barry: { name: 'BARRY BELLOWS', build: 'heroic', size: 1.1, hair: 'short', hairC: '#7a5a3a', skin: SKIN.pale, hat: { style: 'band', color: '#202028' }, outfit: 'coat', colors: { cloth: '#f0f0f0', coat: '#7a1a2a', pants: '#2a2a32', trim: '#e8c040' }, voice: 'barry' },
  ros: { name: 'ROS RUCKER', build: 'heroic', size: 1.1, hair: 'short', hairC: '#a8a8b0', skin: SKIN.light, outfit: 'coat', colors: { cloth: '#e8e8f0', coat: '#1e2a50', pants: '#1a1a24', trim: '#c8c8d8' }, voice: 'ros', ear: true },
  nigel: { name: 'NIGEL BLEWITT', build: 'heroic', size: 1.1, hair: 'short', hairC: '#6a4a2a', skin: SKIN.pale, outfit: 'shirt', colors: { cloth: '#1a1a1e', pants: '#1a1a1e', trim: '#3ac850', boot: '#0e0e10' }, voice: 'nigel' },
  rupert: { name: 'SIR RUPERT GOLDBRICK', build: 'heroic', size: 1.15, hair: 'short', hairC: '#e8e8e8', skin: SKIN.pale, hat: { style: 'crown', color: '#e8c040' }, outfit: 'coat', colors: { cloth: '#f0e8d8', coat: '#5a2a8a', pants: '#3a1a5a', trim: '#e8c040' }, voice: 'rupert', monocle: true },
  pa: { name: 'STADIUM PA', voice: 'pa' }
};
