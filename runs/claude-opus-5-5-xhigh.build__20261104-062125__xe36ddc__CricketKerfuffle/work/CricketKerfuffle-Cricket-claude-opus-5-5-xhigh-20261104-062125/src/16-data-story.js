/* ---- THE STORY: The Grand Kerfuffle, 5 chapters. Lord Thrumpton-Vane, given out LBW first ball on this green on
 * 4 June 1975, has bought the deeds to the village green to make a car park; Kerfuffle CC must beat his teams at his
 * grounds. Each chapter is a MatchConfig scenario plus scripted beats (scenes played on bus events) and three
 * Kerfuffle Goals (stars). Scenes are lines [speaker, text] with markup ({w=.4}, {shake}); speakers map to portraits
 * and voices. Dry, affectionate, digressive; no line over 2 x 42 characters. ---- */
const SPEAKERS = {
  aubrey: { name: 'THE ALMANACK', rig: 'aubrey', voice: 'aubrey' }, thrumpton: { name: 'LORD THRUMPTON', rig: 'thrumpton', voice: 'thrumpton' }, edie: { name: 'EDIE', rig: 'edie', voice: 'edie' },
  crumb: { name: 'MRS CRUMB', rig: 'crumb', voice: 'crumb' }, gaz: { name: 'GAZ', rig: 'gaz', voice: 'gaz' }, peregrine: { name: 'PEREGRINE', rig: 'peregrine', voice: 'peregrine' }, fortescue: { name: 'FORTESCUE', rig: 'fortescue', voice: 'fortescue' },
  shazza: { name: 'SHAZZA', rig: 'shazza', voice: 'shazza' }, dev: { name: 'DEV', rig: 'dev', voice: 'dev' }, spinaldo: { name: 'THE GREAT SPINALDO', rig: 'spinaldo', voice: 'spinaldo' }, basil: { name: 'BASIL', rig: 'basil', voice: 'basil' },
  ghost: { name: 'DR GRIMBLE', rig: 'grimble', voice: 'ghost' }, pip: { name: 'PIP', rig: 'pip', voice: 'pip' }, hollis: { name: 'REV. HOLLIS', rig: 'hollis', voice: 'hollis' }, kev: { name: 'KEV', rig: 'kev', voice: 'gaz' }
};
const SCENES = {
  prologue: { place: 'green', time: 'dawn', cast: ['edie', 'crumb', 'thrumpton', 'basil', 'dev', 'pip'], props: ['phantomCar'], lines: [
    ['aubrey', 'Kerfuffle-on-the-Wold. Population: two hundred and twelve, and a cow called Doris.'],
    ['aubrey', 'Nothing of note has happened here since the hailstorm of 1953,{w=.4} which was rained off.'],
    ['thrumpton', 'Fourth of June, 1975. First ball. Given out leg before by a vicar{w=.3} looking at a butterfly.'],
    ['edie', 'That was my grandfather. He still talks about that butterfly.'],
    ['thrumpton', 'I have bought the deeds to this green. On Monday: the Thrumpton Parking Plaza.'],
    ['thrumpton', 'Four hundred spaces.{w=.3} No cricket.'],
    ['crumb', '{shake}Over my dead sponge.{/shake}'],
    ['thrumpton', 'Unless... you beat my teams in the Grand Kerfuffle. Five matches. My grounds. My rules.'],
    ['thrumpton', 'Your umpires.{w=.3} I am not a monster.'],
    ['edie', 'Done. We will play you anywhere.{w=.3} Bring cake.']] },
  c1pre: { place: 'green', cast: ['edie', 'gaz', 'crumb'], lines: [
    ['gaz', 'Oi, Kerfuffle! Fancy a warm-up? By warm-up I mean a thrashing.'],
    ['edie', 'Lower Muddleford. Lovely. Did you bring a cow of your own this year?'],
    ['crumb', 'Nets first, dear. Watch the ball, not the cake.']] },
  c1mid: { place: 'green', cast: ['thrumpton'], lines: [['aubrey', 'Lord Thrumpton watches from his motor car. With the heater on.'], ['thrumpton', 'Hmph. Village cricket. All elbows and optimism.']] },
  c1win: { place: 'green', cast: ['thrumpton', 'edie'], lines: [['thrumpton', 'Beginner\'s luck. Thrumpton Hall next.{w=.3} Dress code: impeccable.'], ['edie', 'We have a blazer. Somewhere. Basil is sitting on it.']] },
  c2pre: { place: 'hall', cast: ['peregrine', 'fortescue', 'edie'], lines: [
    ['aubrey', 'Kerfuffle posted 24 after a top-order collapse, chiefly due to peacocks.'],
    ['peregrine', 'Do mind the peacocks. They bite. Twenty-five to win, I believe? How quaint.'],
    ['fortescue', 'Tea will be served at the fall of the third wicket, or at four,{w=.3} whichever is more dignified.'],
    ['edie', 'Right. We bowl, we field, we keep it under twenty-five. Pip, stop chirping.']] },
  c2mid: { place: 'hall', cast: ['pip', 'crumb'], lines: [['pip', 'Is that... marmalade on the ball? It\'s sticky!'], ['crumb', 'If the umpire gets it wrong, dear, press REVIEW. That is what it is for.']] },
  c2win: { place: 'hall', cast: ['peregrine', 'fortescue'], lines: [['peregrine', 'Well. I shall have Fortescue polish your trophy.{w=.3} With marmalade.'], ['fortescue', 'Sir.']] },
  c3pre: { place: 'bay', cast: ['dev', 'edie', 'shazza', 'basil'], props: ['minibus'], lines: [
    ['aubrey', 'The minibus breaks down three miles from Sunburnt Bay. The team push it.'],
    ['dev', 'Statistically, sunscreen doesn\'t melt at-'],
    ['shazza', 'Mate.'],
    ['shazza', 'Twenty-six to win off two overs. Against me. Good luck, sunshine.']] },
  c3mid: { place: 'bay', cast: ['shazza'], lines: [['aubrey', 'The tide is coming in. The sea-side boundary creeps closer by the over.'], ['shazza', 'Duck the bouncers or hook \'em. Your funeral either way.']] },
  c3win: { place: 'bay', cast: ['shazza', 'edie'], lines: [['shazza', 'Fair dinkum. One thing: Thrumpton\'s been buying ringers.'], ['shazza', 'Weird ones.{w=.4} See-through ones.']] },
  c4pre: { place: 'downs', cast: ['spinaldo', 'basil', 'edie'], lines: [
    ['spinaldo', 'Pick a card. Any card. It will be the card of your downfall.'],
    ['basil', 'I bowled leg-spin to a magician once. He sawed my stumps in half.'],
    ['edie', 'Charge the spinners, everyone. And mind the keeper. He\'s quick.']] },
  c4rain: { place: 'downs', cast: ['crumb', 'dev'], lines: [['aubrey', 'Rain. The covers come on. The tea room fills with steam and gossip.'], ['crumb', 'Now then. Overs lost, wickets down, carry the scone...'], ['dev', 'That is not how arithmetic works.'], ['crumb', 'It is today, dear.']] },
  c4win: { place: 'downs', cast: ['spinaldo', 'edie'], lines: [['spinaldo', 'You see through my tricks. Then see this: the Megadome. Midnight.'], ['spinaldo', 'His Lordship has booked the Eternal XI of 1882.{w=.3} They are dead.{w=.3} Mostly.']] },
  c5pre: { place: 'dome', time: 'night', cast: ['thrumpton', 'ghost', 'edie'], lines: [
    ['thrumpton', 'Welcome to the Megadome. No tea. No cake. No interval. Just ADVERTS.'],
    ['ghost', 'We have waited one hundred and forty-four years for a match that wasn\'t rained off.'],
    ['edie', 'Then let\'s give you one.']] },
  c5mid: { place: 'dome', time: 'night', cast: ['thrumpton'], lines: [['thrumpton', 'Behold the Thrumptonator 3000. Steam-powered. Never misses.'], ['thrumpton', 'Never gives anyone out leg before on a butterfly.']] },
  c5win: { place: 'green', time: 'dusk', cast: ['thrumpton', 'hollis', 'edie', 'ghost', 'crumb'], lines: [
    ['thrumpton', 'One more ball. An exhibition. Me, against the vicar\'s son.{w=.3} No butterflies.'],
    ['aubrey', 'Rev. Hollis bowls a gentle half-volley. It hits the pad. He raises the finger.'],
    ['hollis', 'That\'s out, I\'m afraid. Plumb.'],
    ['thrumpton', '...{w=.6} Ha.{w=.4} HA!{w=.3} Plumb. Absolutely plumb.'],
    ['aubrey', 'Lord Thrumpton laughs for the first time in fifty-one years. He tears up the deeds.'],
    ['ghost', 'Worth the wait. Thank you for the game.'],
    ['crumb', 'Tea, everyone. And you, your Lordship. Sit down before I change my mind.'],
    ['aubrey', 'Lord Thrumpton-Vane now polishes the tea urn on Saturdays,{w=.3} and is adequate at fine leg.']] },
  loss: { place: 'green', cast: ['crumb'], lines: [['crumb', 'Never mind, dear. Even the best of us get a golden duck.'], ['crumb', 'Have a scone and go again.']] }
};
const CHAPTERS = [
  { n: 1, title: 'A Gentle Knock', opp: 'mud', ground: 'green', overs: 2, wickets: 5, kerfuffle: false, battingFirst: 0, pre: 'c1pre', mid: 'c1mid', win: 'c1win', lessons: [1, 2, 3, 4, 6], tutorial: true,
    goals: [['Win the match', (m, r) => r.won], ['Smash the pub window', m => !!m.targetsHit.pub], ['Hit a six', m => m.innings.some(i => i.bat === 'ker' && i.sixes > 0)]] },
  { n: 2, title: 'Tea on the Lawn', opp: 'gen', ground: 'hall', overs: 2, wickets: 5, kerfuffle: true, scenario: { innings: 1, battingFirst: 0, firstRuns: 24, firstWkts: 6 }, pre: 'c2pre', mid: 'c2mid', win: 'c2win', lessons: [7, 8, 9, 10, 11], weather: 'overcast',
    goals: [['Win the match', (m, r) => r.won], ['Take a PERFECT-ring catch', m => !!m.flags.perfectCatch], ['Win a review', m => !!m.flags.wonReview]] },
  { n: 3, title: 'Sand in the Sandwiches', opp: 'lar', ground: 'bay', overs: 2, wickets: 5, kerfuffle: true, scenario: { innings: 1, battingFirst: 1, firstRuns: 25, firstWkts: 3 }, pre: 'c3pre', mid: 'c3mid', win: 'c3win', chaos: ['tide'],
    goals: [['Win the match', (m, r) => r.won], ['Hook a six', m => !!m.flags.hookSix], ['Win with a dive making the crease', m => !!m.flags.diveWin]] },
  { n: 4, title: 'Now You See It', opp: 'mag', ground: 'downs', overs: 2, wickets: 5, kerfuffle: true, battingFirst: 1, pre: 'c4pre', mid: 'c4rain', win: 'c4win', lessons: [5], rain: true,
    goals: [['Win the match', (m, r) => r.won], ['Stump a batter', m => !!m.flags.stumpedOne], ['Hit the hot-air balloon', m => !!m.targetsHit.balloon]] },
  { n: 5, title: 'The Midnight Final', opp: 'thr', ground: 'dome', overs: 3, wickets: 5, kerfuffle: true, battingFirst: 1, pre: 'c5pre', mid: 'c5mid', win: 'c5win', boss: true, time: 'night', weather: 'fog',
    goals: [['Win the match', (m, r) => r.won], ["Survive the Thrumptonator's over without losing a wicket", m => !!m.flags.bossClean], ['Hit the jumbotron', m => !!m.targetsHit.jumbotron]] }
];
const LESSONS = [
  null,
  { n: 1, title: 'Aim and ground shot', text: 'Aim with the stick, WASD or the mouse, then play a ground shot as the ball arrives. Hit 2 good shots.', goal: 'good', count: 2, btn: 'shot' },
  { n: 2, title: 'The lofted shot', text: 'Loft goes in the air: big runs, but a fielder under it can catch it. Loft 2 balls clean.', goal: 'loft', count: 2, btn: 'loft' },
  { n: 3, title: 'Defend and leave', text: 'Defend the straight ones; let the wide ones go by with no button. Survive 3 balls.', goal: 'survive', count: 3, btn: 'block' },
  { n: 4, title: 'Running', text: 'After a shot, RUN calls a run; press it again at the crease for another; BACK sends you home. Score 2 runs.', goal: 'runs', count: 2, btn: 'run' },
  { n: 5, title: 'Charge the spinner', text: 'Against spin, CHARGE down the pitch before the ball lands to make it a half-volley. Miss, and the keeper may stump you. Charge and hit 1.', goal: 'charge', count: 1, btn: 'charge' },
  { n: 6, title: 'Bowling: marker and meter', text: 'Move the marker where the ball should land, pick a delivery, then release in the green of the meter. 2 green releases.', goal: 'green', count: 2, bowl: true },
  { n: 7, title: 'Aftertouch', text: 'Just after release, push the stick sideways to bend the ball in the air. Swing 2 balls.', goal: 'aftertouch', count: 2, bowl: true },
  { n: 8, title: 'Hype and specials', text: 'Good play fills your KERFUFFLE meter. Full, press SPECIAL for a signature delivery or shot. Use one.', goal: 'special', count: 1, bowl: true },
  { n: 9, title: 'The catch ring', text: 'When a catch comes, an outer ring shrinks onto the ball: press CATCH as they meet. Take 1 catch.', goal: 'catch', count: 1, field: true },
  { n: 10, title: 'Throws', text: "With the ball, throw to the keeper's end, the bowler's end, or lob it in. A quick throw is a rocket. Make 2 throws.", goal: 'throw', count: 2, field: true },
  { n: 11, title: 'Reviews', text: 'Think the umpire erred? Press SPECIAL within 4 seconds to REVIEW. Owl-Eye decides. Review 1 decision.', goal: 'review', count: 1, bowl: true }
];
K.SCENES = SCENES; K.CHAPTERS = CHAPTERS; K.LESSONS = LESSONS; K.SPEAKERS = SPEAKERS;
