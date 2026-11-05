/* ---- STORY: THE CUP RUN (PLAN 11.3). Chapters, cutscenes, choices and objectives are data ---- */
const STORY = (() => {
  // objectives: { id, text, on: event type, where(e, m) -> bool, need }; 'win' is checked at the final horn
  const us = (e, m) => m.teamOf(e.by) === 0;
  const CHAPTERS = [
    { n: 1, title: 'Home Opener', arena: 'icebox', rival: 'drillers', periods: 3, len: 90, ot: true, shootout: true, diffStep: -1, mech: 'Skating, passing, shooting, one-timers, checks and the BOOM meter',
      pre: 'ch1-pre', post: 'ch1-post', choice: 'tactic', signature: 'onetimer',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'onetimer', text: 'Score a one-timer', on: 'goal', where: (e, m) => us(e, m) && e.kind === 'onetimer', need: 1 },
        { id: 'hits', text: 'Land 3 big hits', on: 'hit', where: (e, m) => e.big && us(e, m), need: 3 }] },
    { n: 2, title: 'Pond Rules', arena: 'pond', rival: 'lumberjacks', periods: 3, len: 90, ot: true, shootout: true, mech: 'KABOOM mode, power-ups, thin ice and snowbanks',
      pre: 'ch2-pre', post: 'ch2-post', choice: 'tactic', signature: 'thin_ice_break',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'ice', text: 'Break the ice under a Lumberjack', on: 'thin_ice_break', where: (e, m) => e.victimTeam === 1, need: 1 },
        { id: 'kaboom', text: 'Trigger KABOOM', on: 'kaboom_start', where: (e) => e.team === 0, need: 1 }] },
    { n: 3, title: 'Gloves Off', arena: 'grindhouse', rival: 'bruisers', periods: 3, len: 90, ot: true, shootout: true, mech: 'Fights, the sin bin, power plays, octopi, rats and chirps',
      pre: 'ch3-pre', post: 'ch3-post', choice: 'lou', signature: 'fight_end', challengy: true,
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'fights', text: 'Win 2 fights', on: 'fight_end', where: (e, m) => e.winnerTeam === 0, need: 2 },
        { id: 'ppg', text: 'Score a power-play goal', on: 'goal', where: (e, m) => us(e, m) && e.ppg, need: 1 }] },
    { n: 4, title: 'Mall Brawl', arena: 'mall', rival: 'marauders', periods: 3, len: 90, ot: false, shootout: true, showcase: true, mech: 'The mascot, the Discount Drop, the shootout and the manual goalie',
      pre: 'ch4-pre', post: 'ch4-post', choice: 'bear', signature: 'mascot_down',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'kgoal', text: 'Score a KABOOM goal', on: 'goal', where: (e, m) => us(e, m) && e.kind === 'kaboom', need: 1 },
        { id: 'pete', text: 'Knock down Polar Pete', on: 'mascot_down', where: (e, m) => us(e, m), need: 1 }] },
    { n: 5, title: 'The Kaboom Cup', arena: 'dome', rival: 'grizzlies', periods: 3, len: 120, ot: true, shootout: true, boss: true, mech: "The boss: Sterling's Golden Twister, The Vault, Gilded Mode and Doris's organ",
      pre: 'ch5-pre', post: 'ch5-post', choice: 'doris', signature: 'vault_cracked',
      objectives: [{ id: 'win', text: 'Win the Kaboom Cup' }, { id: 'deke', text: 'Beat The Vault with a deke goal', on: 'goal', where: (e, m) => us(e, m) && e.kind === 'deke', need: 1 },
        { id: 'hat', text: 'One player scores a hat trick', on: 'hat_trick', where: (e, m) => us(e, m), need: 1 }] }
  ];
  const CHOICES = {
    tactic: { who: 'marge', text: "Captain. Tell 'em how we play tonight.", options: [['CLEAN AND FAST', { tactic: 'finesse', line: 'pass it like it owes us money.' }], ['MEAN AND LOUD', { tactic: 'grit', line: 'hit everything that moves. Twice.' }]] },
    lou: { who: 'marge', text: 'Lou. Your call.', options: [['LET LOU LOOSE', { lou: 'loose' }], ['KEEP IT ON THE ICE', { lou: 'ice' }]] },
    bear: { who: 'marge', text: 'That bear is gonna be out there all game.', options: [['IGNORE THE BEAR', { bear: 'ignore' }], ['HUNT THE BEAR', { bear: 'hunt' }]] },
    doris: { who: 'marge', text: 'Doris, when do you play the song?', options: [['DORIS PLAYS EARLY', { doris: 'early' }], ['DORIS PLAYS LATE', { doris: 'late' }]] }
  };
  // cutscenes: set, music, cast (who stands where on the set), steps: [who, text, expr] lines, { choice }, { sfx }, { pose: [who, pose] }
  const CUTS = {
    'ch1-pre': { set: 'locker', music: 'locker', cast: ['marge', 'dunny', 'snipes', 'lou', 'lemmy', 'glitterman'], steps: [
      ['marge', 'Sit down, shut up, and listen. I got a letter.', 'angry'],
      ['marge', 'Goldie Glitterman bought the land under the Icebox. Wants to pave it for a {c=#ffd36a}Megaplex Parking Experience{/c}.'],
      ['dunny', 'A parking... experience? Beauty. Wait. No. Not beauty.', 'wince'],
      ['snipes', "This barn's got more character than his whole bank account. And his haircut."],
      ['marge', 'Bylaw 1897-B. Any rink that houses the Kaboom Cup stands forever. So we win the Cup.'],
      { pose: ['lou', 'kneel'] }, ['lou', 'Five games, then. Like the five petals of the wild rose.', 'smile'],
      ['lemmy', "Pipesy says we win. Clang's not so sure. Clang's a pessimist."],
      { enter: 'glitterman' }, ['glitterman', "Enjoy the barn, folks. I've ordered the parking meters. Gold ones.", 'smile'], { exit: 'glitterman' },
      { choice: 'tactic' },
      ['dunny', 'We get pucks deep, we get bodies to the net, and we... uh... {$tacticLine}'],
      ['marge', "Warm-up's on. Then we drill the Drillers.", 'shout']] },
    'ch1-post': { set: 'rink', music: 'victory', cast: ['chuck', 'glitterman', 'marge'], steps: [
      ['chuck', "The Muskrats take the opener! The Icebox is ROCKIN'!", 'shout'],
      ['glitterman', 'Beginner\'s luck. The meters are still on order.'],
      ['marge', 'Pack your long johns. Lake Kabonk. Pond rules.']] },
    'ch2-pre': { set: 'pond', music: 'pond', cast: ['bigtimber', 'snipes', 'lemmy', 'marge', 'lou'], steps: [
      ['bigtimber', "Welcome to the woods, Muskrats. We don't check. We FELL.", 'angry'],
      ['snipes', 'Cute beard. Did you grow it, or did a beaver move in?', 'smile'],
      ['lemmy', "The ice is talking. It says 'crack'."],
      ['marge', "Thin ice is a tool. Hit 'em where it's thin."],
      ['marge', "And listen. When the whole team's hummin', hits, passes, the crowd losin' its mind, the ice starts to shake. That's a {c=#ff8a3a}KABOOM{/c}. Fill the meter and let it rip."],
      ['lou', 'Like thunder in a teacup.'],
      { choice: 'tactic' }, ['dunny', 'Got it, Coach. We {$tacticLine}']] },
    'ch2-post': { set: 'pond', music: 'pond', cast: ['bigtimber', 'dunny', 'marge'], steps: [
      ['bigtimber', 'You hit like a falling spruce. Good on ya.', 'smile'],
      ['dunny', 'Thanks! You smell like one!', 'smile'],
      ['marge', 'Next stop, the Grindhouse. Bring a mouthguard. Bring two.']] },
    'ch3-pre': { set: 'locker-dark', music: 'grind', cast: ['rocco', 'rollo', 'lou', 'marge'], steps: [
      ['rocco', 'Well, well. Lou Beaudoin.'], ['rollo', "Lou 'The Library' Beaudoin."], ['rocco', 'Heard you knit now.'], ['rollo', 'Heard you purl.'],
      ['lou', 'I have retired from fisticuffs, gentlemen.'], ['marge', 'Retire after the game.', 'angry'],
      ['marge', "In this barn they drop the gloves, you drop 'em back. Win the scrap, win the barn. Lose it, you sit in the sin bin and think about your choices."],
      { choice: 'lou' }]},
    'ch3-post': { set: 'locker-dark', music: 'locker', cast: ['rollo', 'rocco', 'lou', 'marge'], steps: [
      ['rollo', 'He knitted me a scarf.'], ['rocco', 'For my neck.'], ['rollo', 'Which he bruised.'], ['lou', 'There is an ice pack in the pocket.', 'smile'],
      ['marge', "Next, the Megaplex. Glitterman's turf. Watch your wallets."]] },
    'ch4-pre': { set: 'mall', music: 'mall', cast: ['chad', 'dunny', 'glitterman', 'lemmy', 'pete', 'marge'], steps: [
      ['chad', "What's up, Mall Rats! Smash that glass, bro!", 'shout'], ['dunny', "We're Muskrats."], ['chad', 'Same content, bro.', 'smile'],
      ['glitterman', 'Name your price, goalie.'], ['lemmy', '...Pipesy says no. Clang says no with a curse word.', 'angry'],
      { pose: ['pete', 'wave'] }, ['pete', 'Mmf mrrf! Hmmf mf mmmf!', 'smile'],
      { choice: 'bear' },
      ['marge', "And win or tie, the mall's got a Shootout Showcase after. Mall money. We want it."]] },
    'ch4-post': { set: 'mall', music: 'mall', cast: ['glitterman', 'snipes', 'marge'], steps: [
      ['glitterman', 'Fine. The Final. My Grizzlies. My Dome. My rules.', 'angry'], ['snipes', "Your Dome's gonna need a new roof.", 'smile']] },
    'ch5-pre': { set: 'tunnel', music: 'final', cast: ['sterling', 'snipes', 'vault', 'lemmy', 'marge'], steps: [
      ['sterling', "I've never lost. Not once. Not even at Go Fish.", 'smile'], ['snipes', "There's a first time for everything, Goldilocks."],
      ['vault', '...'], ['lemmy', "He's very big, Pipesy."],
      ['marge', "Forty-six years behind that bench. I've seen better teams. Prettier teams. Teams that could spell."],
      ['marge', 'Never saw one that wanted it more. Go make it go {c=#ff8a3a}KABOOM{/c}.', 'shout'],
      { choice: 'doris' }]},
    'ch5-post': { set: 'rink', music: 'victory', cast: ['dunny', 'chuck', 'glitterman', 'marge', 'gus'], ending: true, steps: [
      { cup: true }, ['chuck', 'THE KABOOM CUP IS... KA-BOOMING!', 'shout'], ['glitterman', 'My parking meters...', 'wince'],
      ['marge', 'Bylaw 1897-B, Goldie. Look it up.', 'smile'], ['gus', 'Yep.']] }
  };
  const PEP = ["Shake it off. The puck doesn't care about yesterday. Neither do I. Again.", "The pond doesn't owe you anything. Go take it.",
    "You got pushed around. So push back. Gloves are optional.", "That mall's all glitter. Find the ice under it.", "Forty-six years. I've lost bigger. Not with a better team. Again."];
  const UNLOCKS = [[3, 'bigheads', 'Big Heads'], [6, 'octorain', 'Octopus Rain'], [9, 'glowpuck', 'Glow Puck'], [12, 'alwayskaboom', 'Always KABOOM'], [15, 'retro', 'Retro Rigs']];
  return { CHAPTERS, CHOICES, CUTS, PEP, UNLOCKS };
})();

/* ---- SAVE: progress, records, unlocks and seen tips (E.store; a session's storage is the hub's sandbox) ---- */
const Save = (() => {
  const KEY = 'ihk:save';
  const fresh = () => ({ v: 1, story: { chapter: 1, stars: {}, choices: {}, done: false }, drills: {}, records: { shot: 0, hit: 0, goals: 0, fights: 0, kabooms: 0 }, tips: {}, flags: {} });
  let data = fresh();
  try { const d = E.store.get(KEY, null); if (d && d.v === 1) data = Object.assign(fresh(), d); } catch (e) { data = fresh(); }
  const api = {
    get data() { return data; },
    write() { if (!HUB) E.store.set(KEY, data); },
    reset() { data = fresh(); api.write(); },
    stars() { let n = 0; for (const k in data.story.stars) n += (data.story.stars[k] || []).filter(Boolean).length; return n; },
    unlocked(id) { const u = STORY.UNLOCKS.find(x => x[1] === id); return !!u && api.stars() >= u[0]; },
    record(key, v) { if (v > (data.records[key] || 0)) { data.records[key] = v; api.write(); return true; } return false; },
    add(key, n = 1) { data.records[key] = (data.records[key] || 0) + n; api.write(); }
  };
  return api;
})();
