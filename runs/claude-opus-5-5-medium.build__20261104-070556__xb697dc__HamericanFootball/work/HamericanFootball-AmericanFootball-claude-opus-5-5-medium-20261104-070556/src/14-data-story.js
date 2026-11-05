/* THE STORY (data only): THE FIASCO CUP's chapters, their scenarios, the cutscene scripts, halftime choices, rewards and
 * loss lines. A cutscene: { set, cast: [who], lines: [[speaker, text] | ['@', stage direction]] }. Speakers are ids in
 * FF.data.cast; stage directions are events the cutscene player stages (sfx, camera, title cards, moves). */
(() => {
'use strict';
const FF = window.FF;
const L = (who, text) => [who, text], D = (ev, arg) => ['@', ev, arg];
FF.data.story = {
  cutscenes: {
    prologue: { set: 'field', stadium: 'tumbleweed', night: true, cast: ['pearl', 'bluster', 'hap', 'sterling', 'brock'], lines: [
      D('title', 'TUMBLEWEED FIELD, 11:58 PM'), D('sfx', 'crickets'),
      L('chet', 'LIVE FROM TUMBLEWEED JUNCTION... WHERE FOOTBALL COMES TO DIE!'), L('lou', 'Ninety-nine losses in a row, Chet. You have to admire the consistency.'),
      L('pearl', "Ninety-nine losses, one leaky roof, and zero quit. That's my Fiascos."), D('enter', 'sterling'), D('sfx', 'cannon'),
      L('sterling', 'Pearl! Sign the papers. This dirt patch would make a lovely parking lot.'), L('pearl', 'Over my pickled body, Montgomery.'),
      L('brock', 'Dad, it smells like a pickle barrel exploded out here.'), L('sterling', 'Fine. The Fiasco Cup. Win it, keep your field. Lose it... and I pave it.'),
      L('bluster', "You got yourself a bet! ...Wait. What's the Fiasco Cup?"), L('lou', 'Only the most over-the-top football tournament on Earth, Gus.'),
      L('chet', "FOUR GAMES! NO RULES! ONE TROPHY! IT'S THE FIASCO CUP!"), L('pearl', 'Then we need a quarterback. A real one.'), D('spot', 'hap'),
      L('hap', 'I can throw a pickle barrel sixty yards. Does that count?'), L('bluster', 'Kid... tryouts are at dawn.'), D('title', 'THE FIASCO CUP')] },
    ch1_intro: { set: 'field', stadium: 'tumbleweed', cast: ['bluster', 'hap'], lines: [D('title', 'CHAPTER 1: TRYOUTS'), L('bluster', 'Listen up, Hazard! This is tryouts. You fail, you go back to pickles.'), L('bluster', 'First drill: run the cones. Then hit the turbo like it owes you money!')] },
    ch1_outro: { set: 'office', team: 'fiascos', cast: ['bluster', 'hap', 'pearl'], lines: [L('bluster', 'Hazard, you might be the worst thing to happen to this franchise...'), L('bluster', '...which makes you the best thing to happen to this franchise.'), L('pearl', "Here, sugar. Pearl's Five-Alarm Hot Sauce. For emergencies only."), D('reward', 'HOT_SAUCE,SUPER_FOOT')] },
    ch2_intro: { set: 'press', team: 'mudhogs', cast: ['gator', 'bertha', 'bluster', 'hap'], lines: [D('title', 'CHAPTER 2: THE MUD BOWL'), D('sfx', 'thunder'), L('chet', 'ROUND ONE! THE FIASCOS VISIT THE BAYOU MUDHOGS IN THE HOG WALLOW!'), L('gator', "Y'all ever play in mud this deep? We got crawdads livin' in the end zone."), L('bertha', "I'm gonna run through y'all like hot butter through grits."), L('bluster', "Grits don't tackle, ma'am. ...Do they?"), L('hap', 'Coach, why are we wearing snorkels?'), L('bluster', 'Mud management, son. Tackle low, hold the ball tight, watch for the MUDSLIDE.'), L('lou', "Rain's coming in sideways, Chet. Fumbles are gonna fly like bats.")] },
    ch2_half: { set: 'locker', team: 'fiascos', cast: ['bluster', 'hap'], lines: [L('bluster', "We're {score} at the half! Somebody tell me what we do about it!"), D('choice', 'half')] },
    ch2_win: { set: 'field', stadium: 'hogwallow', cast: ['bertha', 'gator', 'hap'], lines: [L('bertha', "Well I'll be. Y'all hit like a family reunion. Respect."), L('gator', 'Come on back for the crawfish boil. Bring that rookie.'), L('chet', 'THE FIASCOS WIN A FOOTBALL GAME! I REPEAT! THE FIASCOS WIN A FOOTBALL GAME!'), D('reward', 'MEGA_HIT')] },
    ch3_intro: { set: 'field', stadium: 'afterglow', cast: ['hoot', 'lumen', 'zap', 'bluster', 'wheels'], lines: [D('title', 'CHAPTER 3: LIGHTS OUT'), L('chet', 'THE QUARTERFINAL! THE NEON NITE OWLS AT THE AFTERGLOW!'), L('hoot', 'Welcome to the Afterglow, small town. Hope your eyes can keep up.'), L('lumen', 'I see the open man in the dark. I AM the open man in the dark.'), L('zap', "You blinked. I'm already in the end zone."), D('title', '3RD QUARTER. OWLS 21, FIASCOS 7'), L('bluster', "We're down fourteen because SOMEBODY slept through the first half!"), L('wheels', '...I needed my beauty rest, Coach.')] },
    ch3_lights: { radio: true, lines: [L('chet', 'WAIT, THE LIGHTS! THE LIGHTS ARE OUT AT THE AFTERGLOW!'), L('lou', 'Looks like a tumbleweed tripped over the power cable, Chet.'), L('fumbles', 'Hoo... hooo... sorry...'), L('bluster', 'Glow paint! Everybody rub on the glow paint!')] },
    ch3_win: { set: 'field', stadium: 'afterglow', cast: ['hoot', 'zap', 'hap'], lines: [L('hoot', 'Respect, Tumbleweed. That comeback was a banger.'), L('zap', "...Can I get your rookie's autograph? For my cousin. Not for me."), D('reward', 'ROCKET_CLEATS,GLUE_GLOVES')] },
    ch4_intro: { set: 'field', stadium: 'frostbite', cast: ['iceberg', 'bluster', 'avalanche'], lines: [D('title', 'CHAPTER 4: FROSTBITE'), L('chet', "THE SEMIFINAL! IT'S MINUS TWELVE AND THE HOT DOGS ARE FROZEN SOLID!"), L('iceberg', 'The glacier does not hurry. Yet it carves the valley.'), L('bluster', '...Is that a threat or a fortune cookie?'), L('avalanche', 'GRRRRRRRR.'), L('lou', "That's Avalanche. Seven feet tall. Speaks only in growls and sacks."), D('title', '4TH QUARTER, 1:30 LEFT. YETIS 20, FIASCOS 17'), L('bluster', 'Ninety seconds, eighty yards. Get out of bounds to stop the clock!')] },
    ch4_win: { set: 'field', stadium: 'frostbite', cast: ['avalanche', 'hap'], lines: [L('avalanche', 'grrr... (he hands Hap a hand-knitted scarf)'), L('lou', 'He knits, Chet. The big fella knits.'), D('reward', 'MASCOT_MAYHEM')] },
    ch5_intro: { set: 'press', team: 'dynasty', cast: ['brock', 'hap', 'mountain', 'sterling', 'pearl'], lines: [D('title', 'CHAPTER 5: THE FIASCO BOWL'), D('flash'), L('chet', 'THE FIASCO BOWL! SEVENTY THOUSAND FANS AND ONE BULLDOZER!'), L('brock', "I've got a golden arm, a golden helmet, and a golden future."), L('brock', "You've got... pickles."), L('hap', "And you've never been hit by a guy who hauls pickle barrels for a living."), L('mountain', 'I will fall on you. Like a mountain. Because I am THE MOUNTAIN.'), L('sterling', "Win and keep your little field, Pearl. Lose, and the bulldozer's warming up."), L('pearl', "Warm it up all you like, Montgomery. It's gonna be a long, cold night.")] },
    ch5_half: { set: 'locker', team: 'fiascos', cast: ['pearl', 'bluster', 'hap'], lines: [L('pearl', 'Ninety-nine losses taught us one thing: how to get back up.'), L('bluster', "So get back up! What's the plan?"), D('choice', 'half')] },
    ch5_win: { set: 'field', stadium: 'megadome', cast: ['bluster', 'pearl', 'sterling', 'brock', 'hap'], lines: [D('confetti'), L('chet', 'THE TUMBLEWEED FIASCOS ARE FIASCO CUP CHAMPIONS! I NEED TO SIT DOWN!'), L('lou', 'You ARE sitting down, Chet.'), D('bucket', 'bluster'), L('bluster', "AAAAH! IT'S ORANGE! WHY IS IT ALWAYS ORANGE?!"), L('sterling', 'This is a... a FIASCO!'), D('cake', 'sterling'), L('pearl', "Keep your bulldozer, Montgomery. We're keeping our field."), L('brock', '...Hey. Rookie. Nice arm.'), L('hap', 'Nice cake, Brock.'), D('title', 'TUMBLEWEED FIELD, ONE YEAR LATER. ATTENDANCE: SOLD OUT.'), D('reward', 'BIGHEADS')] }
  },
  loss: { 2: 'We got mud in places mud shouldn\'t go. Again!', 3: 'Somebody turn the lights back on in your heads! Again!', 4: 'Frozen solid. Thaw out and run it back!', 5: 'Not today! Run it back!' },
  halfChoices: [{ id: 'ground', label: 'GROUND AND POUND', sub: 'Run blocking and broken tackles up' }, { id: 'air', label: 'AIR IT OUT', sub: 'Catches up, throws truer' }, { id: 'hit', label: "HIT 'EM HARDER", sub: 'Tackles up, more Big Hit fumbles' }, { id: 'trick', label: 'TRICKERY', sub: 'Draw a Fiasco Card' }],
  chapters: [
    { n: 0, title: 'PROLOGUE', stadium: 'tumbleweed', intro: 'prologue', kind: 'cutscene', rewards: [] },
    { n: 1, title: 'TRYOUTS', stadium: 'tumbleweed', opponent: 'scrubs', intro: 'ch1_intro', outro: 'ch1_outro', kind: 'drills', rewards: ['HOT_SAUCE', 'SUPER_FOOT'], bonus: 'Finish every drill', shows: 'every control' },
    { n: 2, title: 'THE MUD BOWL', stadium: 'hogwallow', opponent: 'mudhogs', intro: 'ch2_intro', half: 'ch2_half', outro: 'ch2_win', kind: 'match', rewards: ['MEGA_HIT'], bonus: 'Force 2 fumbles', bonusFn: r => r.forced >= 2,
      scenario: { home: 'mudhogs', away: 'fiascos', qLen: 90, difficulty: 'rookie', start: 'kickoff', kicking: 0 } },
    { n: 3, title: 'LIGHTS OUT', stadium: 'afterglow', opponent: 'owls', intro: 'ch3_intro', outro: 'ch3_win', kind: 'match', rewards: ['ROCKET_CLEATS', 'GLUE_GLOVES'], bonus: 'Win by 7 or more', bonusFn: r => r.margin >= 7,
      scenario: { home: 'owls', away: 'fiascos', qLen: 90, difficulty: 'pro', quarter: 3, clock: 90, score: [21, 7], start: 'kickoff', kicking: 0, lightsAt: { quarter: 3, play: 3, plays: 3 } } },
    { n: 4, title: 'FROSTBITE', stadium: 'frostbite', opponent: 'yetis', intro: 'ch4_intro', outro: 'ch4_win', kind: 'match', rewards: ['MASCOT_MAYHEM'], bonus: 'Score with 20+ seconds left', bonusFn: r => r.scoredWithTime >= 20,
      scenario: { home: 'yetis', away: 'fiascos', qLen: 90, difficulty: 'pro', quarter: 4, clock: 90, score: [20, 17], start: { possession: 1, los: 20, down: 1, toGo: 20 } } },
    { n: 5, title: 'THE FIASCO BOWL', stadium: 'megadome', opponent: 'dynasty', intro: 'ch5_intro', half: 'ch5_half', outro: 'ch5_win', kind: 'match', rewards: ['TROPHY'], bonus: 'Hold the Dynasty to 14 or fewer', bonusFn: r => r.oppScore <= 14,
      scenario: { home: 'dynasty', away: 'fiascos', qLen: 120, difficulty: 'pro', start: 'kickoff', kicking: 0 } }
  ]
};
/* THE DRILLS (ch1 tryouts and PRACTICE): each a scenario and a goal; the drill scene (55) runs them */
FF.data.drills = [
  { id: 'cones', title: 'RUN THE CONES', teach: 'Move with the stick. Hold turbo to sprint.', chips: [['up', 'MOVE'], ['turbo', 'TURBO']], coach: 'First drill: run the cones. Then hit the turbo like it owes you money!', time: 9 },
  { id: 'handoff', title: 'HIKE & HANDOFF', teach: 'Hike, hand off, and run for 10 yards.', chips: [['b1', 'HIKE'], ['turbo', 'TURBO']], coach: 'Hike it! The ball goes to the man in the backfield, not the man in the stands!' },
  { id: 'moves', title: 'MOVES', teach: 'Spin, stiff-arm and hurdle past them, then dive in.', chips: [['b3', 'SPIN'], ['b2', 'STIFF ARM'], ['b4', 'HURDLE'], ['b1', 'DIVE']], coach: 'Spin, stiff arm, hurdle! Like a ballerina with anger issues!' },
  { id: 'passing', title: 'PASSING', teach: 'Throw to a receiver with his button. Turbo + button is a Rocket Pass.', chips: [['b1', 'THROW'], ['turbo', 'ROCKET']], coach: "See the button over his head? Press it! Football is easy!", need: 2 },
  { id: 'catching', title: 'CATCHING', teach: 'Run under the ball, then jump to catch it.', chips: [['b4', 'JUMP'], ['b1', 'DIVE CATCH']], coach: "Jump at the top! The ball's shadow tells you where!", need: 2, of: 3 },
  { id: 'defense', title: 'DEFENSE', teach: 'Switch to the nearest man and tackle. Turbo + tackle is a Big Hit.', chips: [['b2', 'SWITCH'], ['b1', 'TACKLE'], ['turbo', '+ BIG HIT']], coach: 'Defense wins championships! Offense wins... also championships. Hit somebody!', need: 2 },
  { id: 'kicking', title: 'KICKING', teach: 'Three taps: start, set the power, set the aim.', chips: [['b1', 'KICK']], coach: "Three taps, son. Power, then aim. Don't kick the holder. AGAIN." },
  { id: 'playcall', title: 'PLAY CALL', teach: 'Pick a PASS play, flip it, and play the HOT SAUCE card.', chips: [['b3', 'FLIP'], ['b4', 'CARDS'], ['b1', 'PICK']], coach: "Pick a play. Flip it. And Pearl's hot sauce? That's for emergencies." },
  { id: 'scrimmage', title: 'SCRIMMAGE', teach: 'One drive against the Scrubs. Score a touchdown.', chips: [['b1', 'HIKE']], coach: "One drive. Score, and you're my quarterback." }
];
})();
