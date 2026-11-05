/* ---- STORY (11.3): THE CUP RUN. Five chapters, five barns, five rivals; a cutscene before and after each game, one
 * choice per chapter (it sets the game's tactic), three objectives (stars) per chapter, a boss final and an ending.
 * Speakers map to the cast (voices, portraits). Cutscene steps: say, choice, move, pose, sfx, wait, cam (Appendix C) ---- */
const SPEAKERS = {
  marge: 'marge', dunny: 'muskrats-dunny', snipes: 'muskrats-snipes', lou: 'muskrats-biglou', lemmy: 'muskrats-lemmy', glitterman: 'glitterman', chuck: 'chuck', moose: 'moose',
  gus: 'gus', doris: 'doris', pete: 'pete', timber: 'lumberjacks-bigtimber', axel: 'lumberjacks-axel', rocco: 'bruisers-rocco', rollo: 'bruisers-rollo', chad: 'marauders-chad',
  sterling: 'grizzlies-sterling', vault: 'grizzlies-thevault', rig: 'drillers-rig'
};
const STORY = {
  chapters: [
    { n: 1, title: 'HOME OPENER', arena: 'icebox', rival: 'drillers', periodLen: 90, cpuStep: -1, objectives: ['win', 'onetimer', 'bighits3'], pre: 'ch1-pre', post: 'ch1-post', warmup: [1, 2, 3], at: [.12, .62],
      spotlight: 'Skating, passing, one-timers, checking, the BOOM meter, the Flood Wagon' },
    { n: 2, title: 'POND RULES', arena: 'pond', rival: 'lumberjacks', periodLen: 90, objectives: ['win', 'breakice', 'kaboom'], pre: 'ch2-pre', post: 'ch2-post', at: [.3, .38], spotlight: 'KABOOM mode, power-ups, thin ice, snowbanks' },
    { n: 3, title: 'GLOVES OFF', arena: 'grindhouse', rival: 'bruisers', periodLen: 90, objectives: ['win', 'fights2', 'ppg'], pre: 'ch3-pre', post: 'ch3-post', fightsOften: true, at: [.5, .66], spotlight: 'Fights, the sin bin, power plays, octopi and rats, chirps' },
    { n: 4, title: 'MALL BRAWL', arena: 'mall', rival: 'marauders', periodLen: 90, objectives: ['win', 'kaboomgoal', 'pete'], pre: 'ch4-pre', post: 'ch4-post', ot: 'none', showcase: true, at: [.7, .36], spotlight: 'Polar Pete, the Discount Drop, the Shootout Showcase, the manual goalie' },
    { n: 5, title: 'THE KABOOM CUP', arena: 'dome', rival: 'grizzlies', periodLen: 120, objectives: ['win', 'vaultdeke', 'hattrick'], pre: 'ch5-pre', post: 'ch5-post', boss: true, at: [.88, .6], spotlight: 'The boss: Golden Twister, The Vault, Gilded Mode, the Gilded Boost and Doris\'s organ' }
  ],
  /** each chapter's choice: [label, flags] (the tactic, Lou's rating, the bear, when Doris plays) */
  choices: {
    1: [['CLEAN AND FAST', { tactic: 'finesse', line: 'pass it like it owes us money.' }], ['MEAN AND LOUD', { tactic: 'grit', line: 'hit everything that moves. And some stuff that doesn\'t.' }]],
    2: [['CLEAN AND FAST', { tactic: 'finesse', line: 'dance around the cracks.' }], ['MEAN AND LOUD', { tactic: 'grit', line: 'make the lake shake.' }]],
    3: [['LET LOU LOOSE', { lou: 'loose' }], ['KEEP IT ON THE ICE', { lou: 'ice' }]],
    4: [['IGNORE THE BEAR', { bear: 'ignore' }], ['HUNT THE BEAR', { bear: 'hunt' }]],
    5: [['DORIS PLAYS EARLY', { doris: 'early' }], ['DORIS PLAYS LATE', { doris: 'late' }]]
  },
  cutscenes: {
    'ch1-pre': { set: 'locker', music: 'locker', cast: [['marge', 150, 60], ['dunny', 110, 84], ['snipes', 135, 92], ['lou', 175, 92], ['lemmy', 200, 84]], steps: [
      { say: 'marge', text: 'Sit down, shut up, and listen. I got a letter.', expr: 'angry' },
      { say: 'marge', text: 'Goldie Glitterman bought the land under the Icebox. Wants to pave it for a {c=#ffd36a}Megaplex Parking Experience{/c}.' },
      { say: 'dunny', text: 'A parking… experience? Beauty. Wait. No. Not beauty.' },
      { say: 'snipes', text: "This barn's got more character than his whole bank account. And his haircut." },
      { say: 'marge', text: 'Bylaw 1897-B. Any rink that houses the Kaboom Cup stands forever. So we win the Cup.' },
      { pose: 'lou', p: 'kneel' }, { say: 'lou', text: 'Five games, then. Like the five petals of the wild rose.' },
      { say: 'lemmy', text: "Pipesy says we win. Clang's not so sure. Clang's a pessimist." },
      { enter: 'glitterman', at: [260, 70], to: [215, 64] },
      { say: 'glitterman', text: "Enjoy the barn, folks. I've ordered the parking meters. {w=.3}Gold ones." },
      { exit: 'glitterman' },
      { choice: { who: 'marge', text: "Captain. Tell 'em how we play tonight." } },
      { say: 'dunny', text: 'We get pucks deep, we get bodies to the net, and we— uh— {$tacticLine}' },
      { say: 'marge', text: "Warm-up's on. Then we drill the Drillers." }] },
    'ch1-post': { set: 'locker', music: 'locker', cast: [['marge', 150, 60], ['dunny', 110, 84], ['snipes', 135, 92], ['lou', 175, 92], ['lemmy', 200, 84], ['glitterman', 230, 66]], steps: [
      { say: 'chuck', text: "The Muskrats take the opener! The Icebox is ROCKIN'!" },
      { say: 'glitterman', text: 'Beginner\'s luck. The meters are still on order.' },
      { say: 'lemmy', text: 'Pipesy did most of the work tonight. Clang helped.' },
      { say: 'marge', text: 'Pack your long johns. Lake Kabonk. Pond rules.' }] },
    'ch2-pre': { set: 'pond', music: 'pond', cast: [['marge', 140, 70], ['snipes', 110, 86], ['dunny', 165, 90], ['lou', 190, 80], ['lemmy', 90, 74], ['timber', 245, 76]], steps: [
      { say: 'timber', text: "Welcome to the woods, Muskrats. We don't check. We FELL." },
      { say: 'snipes', text: 'Cute beard. Did you grow it, or did a beaver move in?' },
      { say: 'lemmy', text: "The ice is talking. It says 'crack'." },
      { say: 'marge', text: "Thin ice is a tool. Hit 'em where it's thin." },
      { say: 'marge', text: "And listen. When the whole team's hummin' — hits, passes, the crowd losin' its mind — the ice starts to shake. That's a {c=#ff8a3a}KABOOM{/c}. Fill the meter and let it rip." },
      { say: 'lou', text: 'Like thunder in a teacup.' },
      { choice: { who: 'marge', text: 'So. How do we play the pond?' } },
      { say: 'dunny', text: 'Easy. We {$tacticLine}' }] },
    'ch2-post': { set: 'pond', music: 'pond', cast: [['marge', 140, 70], ['dunny', 165, 90], ['timber', 215, 80], ['snipes', 110, 86]], steps: [
      { say: 'timber', text: 'You hit like a falling spruce. Good on ya.' },
      { say: 'dunny', text: 'Thanks! You smell like one!' },
      { say: 'marge', text: 'Next stop, the Grindhouse. Bring a mouthguard. Bring two.' }] },
    'ch3-pre': { set: 'grind', music: 'locker', cast: [['marge', 120, 66], ['lou', 160, 86], ['dunny', 95, 88], ['rocco', 220, 74], ['rollo', 250, 84]], steps: [
      { say: 'rocco', text: 'Well, well. Lou Beaudoin.' }, { say: 'rollo', text: "Lou 'The Library' Beaudoin." },
      { say: 'rocco', text: 'Heard you knit now.' }, { say: 'rollo', text: 'Heard you purl.' },
      { say: 'lou', text: 'I have retired from fisticuffs, gentlemen.' },
      { say: 'marge', text: 'Retire after the game.' },
      { say: 'marge', text: "In this barn they drop the gloves, you drop 'em back. Win the scrap, win the barn. Lose it, you sit in the sin bin and think about your choices." },
      { choice: { who: 'marge', text: 'Lou. What\'s it gonna be?' } }] },
    'ch3-post': { set: 'grind', music: 'locker', cast: [['lou', 160, 86], ['rocco', 200, 78], ['rollo', 230, 84], ['marge', 110, 66]], steps: [
      { say: 'rollo', text: 'He knitted me a scarf.' }, { say: 'rocco', text: 'For my neck.' }, { say: 'rollo', text: 'Which he bruised.' },
      { say: 'lou', text: 'There is an ice pack in the pocket.' },
      { say: 'marge', text: "Next, the Megaplex. Glitterman's turf. Watch your wallets." }] },
    'ch4-pre': { set: 'mall', music: 'mall', cast: [['chad', 220, 72], ['dunny', 120, 86], ['lemmy', 150, 80], ['glitterman', 190, 64], ['pete', 260, 86], ['marge', 90, 70]], steps: [
      { say: 'chad', text: "What's up, Mall Rats! Smash that glass, bro!" }, { say: 'dunny', text: "We're Muskrats." }, { say: 'chad', text: 'Same content, bro.' },
      { say: 'glitterman', text: 'Name your price, goalie.' },
      { say: 'lemmy', text: '…Pipesy says no. Clang says no with a {c=#ff6a6a}*beep*{/c}.' },
      { pose: 'pete', p: 'wave' }, { say: 'pete', text: 'Hmmf mmf! Hmmf hmmf hmmf!' },
      { say: 'marge', text: "That bear's on the ice all game. Treat him like furniture." },
      { choice: { who: 'marge', text: 'Or do we?' } },
      { say: 'marge', text: "And win or tie, the mall's got a Shootout Showcase after. Mall money. We want it." }] },
    'ch4-post': { set: 'mall', music: 'mall', cast: [['glitterman', 200, 66], ['snipes', 130, 86], ['dunny', 160, 90], ['pete', 250, 86]], steps: [
      { say: 'glitterman', text: 'Fine. The Final. My Grizzlies. My Dome. My rules.' },
      { say: 'snipes', text: "Your Dome's gonna need a new roof." },
      { pose: 'pete', p: 'wave' }, { say: 'pete', text: 'Hmmf! Hmf hmf.' }] },
    'ch5-pre': { set: 'tunnel', music: 'final', cast: [['sterling', 220, 74], ['vault', 255, 82], ['snipes', 130, 86], ['lemmy', 100, 80], ['marge', 160, 66], ['dunny', 185, 90]], steps: [
      { say: 'sterling', text: "I've never lost. Not once. Not even at Go Fish." },
      { say: 'snipes', text: "There's a first time for everything, Goldilocks." },
      { say: 'vault', text: '…' }, { say: 'lemmy', text: "He's very big, Pipesy." },
      { say: 'marge', text: "Forty-six years behind that bench. I've seen better teams. Prettier teams. Teams that could spell." },
      { say: 'marge', text: 'Never saw one that wanted it more. Go make it go {shake}KABOOM{/shake}.' },
      { choice: { who: 'doris', text: 'Marge, hon. When do you want the song?' } }] },
    'ch5-post': { set: 'ending', music: 'victory', cast: [['dunny', 150, 80], ['snipes', 120, 88], ['lou', 180, 88], ['lemmy', 95, 82], ['marge', 205, 72], ['glitterman', 250, 70], ['gus', 70, 70], ['sterling', 270, 84]], steps: [
      { handshake: true },
      { say: 'chuck', text: 'THE KABOOM CUP IS… {shake}KA-BOOMING!{/shake}' },
      { cup: 'dunny' },
      { say: 'glitterman', text: 'My parking meters…' },
      { say: 'marge', text: 'Bylaw 1897-B, Goldie. Look it up.' },
      { say: 'gus', text: 'Yep.' },
      { say: 'sterling', text: 'Can… can I come skate at your barn sometime?' },
      { say: 'dunny', text: "Beauty. Bring skates. Leave the gold." },
      { wagon: true }] },
    teaser: { set: 'locker', music: 'locker', cast: [['marge', 150, 60], ['dunny', 110, 84], ['glitterman', 215, 64]], steps: [
      { say: 'marge', text: 'Bylaw 1897-B. Any rink that houses the Kaboom Cup stands forever.' },
      { say: 'glitterman', text: "I've ordered the parking meters. Gold ones." },
      { say: 'dunny', text: 'So we win the Cup. Beauty.' }] }
  }
};
/* ---- Story: the run's state and its game configs ---- */
const Story = (() => {
  const st = { chapter: 1, step: 'map', flags: {}, attempt: 0 };
  const ch = n => STORY.chapters[n - 1];
  /** the Match config for chapter n */
  function matchCfg(n) {
    const c = ch(n), f = Save.data.choices[n] || {}, cfg = {
      mode: 'story', chapter: n, home: 'muskrats', away: c.rival, arena: c.arena, periods: 3, periodLen: c.periodLen, cpuStep: c.cpuStep || 0, ot: c.ot || 'sudden', shootout: true, showcase: !!c.showcase,
      seed: n * 1000 + st.attempt, humans: [{ team: 0, input: game.input, name: 'P1' }], objectives: Objectives.list(c.objectives), tactic: { 0: f.tactic || null }, events: [], fightsOften: !!c.fightsOften, forceFights: !!c.fightsOften
    };
    if (f.lou === 'loose') cfg.mods = { 'muskrats:2': [0, 0, 0, 0, 1, 0] }; if (f.lou === 'ice') cfg.mods = { 'muskrats:2': [0, 0, 1, 0, 0, 0] };
    if (f.bear === 'hunt') cfg.huntBear = 0;
    if (c.boss) { cfg.events.push({ period: 3, kind: 'boost' }); cfg.events.push(f.doris === 'late' ? { period: 3, clock: c.periodLen / 2, kind: 'organ', k: 1.5 } : { period: 2, kind: 'organ', k: 1 }); }
    cfg.onFinal = m => game.go('results', { m }, { fade: 'wipe' });
    return cfg;
  }
  /** the boss's moments: Glitterman's Gilded Boost, Doris's organ */
  function matchEvent(m, ev) {
    if (ev.kind === 'boost') { m.boostOn = true; for (const s of m.teams[1].skaters) s.boost = 1.1; Bus.emit('boost_start', {}); Talk.speak('c', 'Glitterman on the jumbotron: "Synergy, boys!"'); }
    if (ev.kind === 'organ') { const k = ev.k || 1; Boom.add(m, 0, 30 * k); for (const s of m.teams[0].skaters) s.boost = 1 + .1 * k; m.organOn = 20; Bus.emit('organ_boost', {}); Talk.speak('c', 'DORIS! PLAY THE SONG!'); }
  }
  function validate() {
    for (const c of STORY.chapters) { if (!ARENAS[c.arena] || !TEAMS[c.rival]) throw new Error('chapter ' + c.n + ' names an unknown arena or team'); for (const o of c.objectives) if (!Objectives.KINDS[o]) throw new Error('chapter ' + c.n + ' objective ' + o + ' is unknown'); for (const id of [c.pre, c.post]) if (!STORY.cutscenes[id]) throw new Error('cutscene ' + id + ' is missing'); }
    for (const id in STORY.cutscenes) for (const [who] of STORY.cutscenes[id].cast) if (!SPEAKERS[who] || !CAST[SPEAKERS[who]]) throw new Error('cutscene ' + id + ': unknown cast ' + who);
    return true;
  }
  /** apply a chapter's choice (from the cutscene) */
  function choose(n, i) { const opt = STORY.choices[n][i]; Save.data.choices[n] = Object.assign({}, opt[1], { pick: i }); st.flags.tacticLine = opt[1].line || ''; Save.write(); return opt; }
  return { st, ch, matchCfg, matchEvent, validate, choose, get chapter() { return st.chapter; }, set chapter(v) { st.chapter = v; }, get step() { return st.step; }, set step(v) { st.step = v; } };
})();
