// ---- story: The Grand Kerfuffle (5 chapters), cutscenes as lists of [speaker, line] (speaker ids from VOICES; '*' is
// a stage direction drawn as a caption), and the commentary pools.
const PROLOGUE = [
  ['aubrey', 'Kerfuffle-on-the-Wold. Population: two hundred and twelve,{w=.3} and a cow called Doris.'],
  ['aubrey', 'Nothing of note has happened here since the hailstorm of 1953,{w=.4} which was rained off.'],
  ['*', 'A long black motor car crunches across the square. Mrs Crumb drops a scone.'],
  ['thrumpton', 'Fourth of June, 1975. First ball.{w=.3} Given out leg before by a vicar{w=.3} who was looking at a butterfly.'],
  ['edie', 'That was my grandfather umpiring.{w=.3} He still talks about that butterfly.'],
  ['thrumpton', 'I have purchased the deeds to this green.{w=.3} On Monday it becomes the Thrumpton Parking Plaza.'],
  ['thrumpton', 'Four hundred spaces.{w=.3} {shake}No cricket.{/shake}'],
  ['crumb', 'Over my dead sponge.'],
  ['thrumpton', 'Unless... you beat my teams in the Grand Kerfuffle.{w=.3} Five matches. My grounds. My rules.'],
  ['thrumpton', "Your umpires. I'm not a monster."],
  ['edie', "Done. We'll play you anywhere.{w=.3} {wave}Bring cake.{/wave}"]
];
// each chapter: a MatchConfig scenario, its scenes (pre, mid, win), the Kerfuffle Goals (stars: a test on the match)
const CHAPTERS = [
  { n: 1, title: 'A Gentle Knock', opp: 'mud', ground: 'green', overs: 2, wickets: 5, batFirst: 'ker', kerfuffle: false, lessons: ['aim', 'loft', 'defend', 'run', 'bowl'],
    blurb: 'A friendly against Lower Muddleford, on the green, before the parking plaza.',
    pre: [['gaz', 'Oi, Kerfuffle! Fancy a warm-up before his Lordship flattens you?{w=.3} By warm-up I mean a thrashing.'], ['crumb', 'Into the nets first, dear. Watch the ball, not the cake.']],
    mid: [['*', 'Lord Thrumpton watches from his car.'], ['aubrey', 'With the heater on, I notice. In July.']],
    win: [['thrumpton', 'Beginner\'s luck.{w=.3} Thrumpton Hall next.{w=.3} Dress code: impeccable.']],
    goals: [['Win the match', m => m.won], ['Smash the pub window', m => m.targetsHit.includes('pub')], ['Hit a six', m => m.sixes[0] > 0]] },
  { n: 2, title: 'Tea on the Lawn', opp: 'gen', ground: 'hall', overs: 2, wickets: 5, scenario: { innings: 2, target: 25, battingFirst: 'ker', firstRuns: 24 }, kerfuffle: true, lessons: ['aftertouch', 'special', 'catch', 'throw', 'review'],
    blurb: 'Kerfuffle posted 24 after a top-order collapse, chiefly due to peacocks. Bowl them out, or keep them under 25.',
    pre: [['peregrine', 'Do mind the peacocks.{w=.3} They bite.'], ['fortescue', 'Tea will be served at the fall of the third wicket,{w=.2} or at four,{w=.2} whichever is more dignified.']],
    mid: [['*', 'The ball comes back from the boundary strangely sticky.'], ['pip', 'Is that... marmalade?']],
    win: [['peregrine', 'I shall have Fortescue polish your trophy.{w=.3} With marmalade.'], ['edie', 'Two down. Where next?'], ['thrumpton', 'The seaside. I do hope you burn.']],
    goals: [['Win the match', m => m.won], ['Take a PERFECT-ring catch', m => m.flags.perfectCatch], ['Take a wicket with a special', m => m.flags.specialWicket]] },
  { n: 3, title: 'Sand in the Sandwiches', opp: 'lar', ground: 'bay', overs: 2, wickets: 5, scenario: { innings: 2, target: 30, battingFirst: 'lar', firstRuns: 29 }, kerfuffle: true, lessons: [],
    blurb: 'The Larrikins made 29 on a pitch like a trampoline. Chase 30 from two overs against pure pace.',
    pre: [['*', 'The minibus breaks down on the coast road. The team pushes.'], ['dev', "Statistically, sunscreen doesn't melt at-"], ['shazza', 'Mate.']],
    mid: [['aubrey', 'The tide is on the turn. The boundary on the sea side is, I am told, negotiable.']],
    win: [['shazza', "Good on ya. Watch out for his Lordship's lot.{w=.3} He's been buying ringers.{w=.3} Weird ones.{w=.3} See-through ones."]],
    goals: [['Win the match', m => m.won], ['Hook or pull a six', m => m.flags.hookSix], ['Make your ground with a dive', m => m.flags.diveSafe]] },
  { n: 4, title: 'Now You See It', opp: 'mag', ground: 'downs', overs: 2, wickets: 5, batFirst: 'mag', kerfuffle: true, rain: true, lessons: ['charge'],
    blurb: 'A full match against the Magic Circle XI, on a dustbowl that turns square. Rain is forecast. Of course it is.',
    pre: [['spinaldo', 'Pick a card.{w=.3} It will be the card of your downfall.'], ['basil', 'I bowled leg-spin to a magician once.{w=.3} He sawed my stumps in half.']],
    mid: [['*', 'Thunder over the Downs. The covers come on.'], ['crumb', 'Not to worry. I have done the sums.{w=.3} Carry the scone...']],
    win: [['spinaldo', 'Bravo. But for the final, his Lordship has booked the Megadome.{w=.3} At midnight.{w=.3} With the Eternal Eleven of 1882.'], ['basil', 'Ghosts. I knew it would be ghosts.']],
    goals: [['Win the match', m => m.won], ['Stump a batter', m => m.flags.stumping], ['Hit the hot-air balloon', m => m.targetsHit.includes('balloon')]] },
  { n: 5, title: 'The Midnight Final', opp: 'thr', ground: 'dome', overs: 3, wickets: 5, batFirst: 'thr', kerfuffle: true, boss: true, lessons: [],
    blurb: 'The Megadome. Midnight. Fog. Ghosts. And the Thrumptonator bowls the last over of the chase.',
    pre: [['thrumpton', 'Welcome to the Megadome.{w=.3} No tea.{w=.2} No cake.{w=.2} No interval.{w=.3} Just {shake}ADVERTS.{/shake}'], ['ghost', 'We have waited one hundred and forty-four years for a match that wasn\'t rained off.'], ['edie', "Then let's give you one."]],
    mid: [['*', 'The fog rolls in. A great brass machine is wheeled out, steaming.'], ['thrumpton', 'Steam-powered. Never misses.{w=.3} Never gives anyone out leg before on a butterfly.']],
    win: [['thrumpton', 'One more ball.{w=.3} An exhibition.{w=.3} Against the Reverend.'], ['*', 'Rev. Hollis bowls a gentle off break. It hits the pad. He raises his finger.'], ['hollis', "That's out."],
      ['thrumpton', '...{w=.6}Plumb.{w=.4} Absolutely plumb.{w=.3} {wave}Ha. Ha ha ha!{/wave}'], ['*', 'Lord Thrumpton tears up the deeds. The ghosts drift up into the floodlights.'], ['ghost', 'Worth the wait.'],
      ['aubrey', 'Lord Thrumpton-Vane now polishes the tea urn on Saturdays,{w=.3} and is said to be adequate at fine leg.']],
    goals: [['Win the Grand Kerfuffle', m => m.won], ['Survive the Thrumptonator\'s over without losing a wicket', m => m.flags.bossSurvived], ['Hit the jumbotron', m => m.targetsHit.includes('jumbotron')]] }
];
const LOSS_LINES = [['crumb', 'Never mind, dear. Even the best of us get a golden duck.{w=.3} Have a scone and go again.']];

// commentary pools (8.9.1): event -> [[speaker, line], ...]. {batter} {bowler} {fielder} {team} {opp} {ground} {runs}
// {need} {balls} {kmh} {item} {winner} fill from the match.
const LINES = {
  start: [['aubrey', 'Good afternoon from {ground}, where the tea is stewed and {team} are about to play cricket, after a fashion.'], ['dazza', 'Should be a cracker. Or a shambles. Probably both.'], ['aubrey', 'A fine day for it at {ground}. The pigeons have taken their seats.']],
  dot: [['aubrey', 'Defended. A stroke of great dignity and no ambition whatsoever.'], ['dazza', 'Nothing doing.'], ['aubrey', 'Left alone. The ball goes by like a gossip past a closed door.'], ['dazza', 'Dot ball. Pressure building, mate.'], ['aubrey', 'No run. {batter} pats the pitch as if it owes him money.']],
  beaten: [['aubrey', "Beaten all ends up! He couldn't have missed that more if he'd brought a map."], ['dazza', 'Played and missed. Dreadful. Lovely ball, mind.'], ['aubrey', 'Past the outside edge! {bowler} looks to the heavens, who are not interested.'], ['dazza', 'Squared him up there. Beauty.']],
  single: [['dazza', 'Tip and run.'], ['aubrey', 'A quick single, taken with all the urgency of a vicar late for a fete.'], ['dazza', 'Just the one. Keeps the board ticking.'], ['aubrey', 'Pushed for one. Polite, unhurried, almost apologetic.']],
  runs: [['dazza', '{runs} runs! Good running, that.'], ['aubrey', 'They come back for {runs}. Splendid hustle, for a Saturday.'], ['dazza', 'Pushing hard. {runs} more on the board.']],
  four: [['aubrey', 'FOUR! Struck with the elegance of a swan, and the violence of an angry swan.'], ['dazza', 'Too short, too wide, too bad. Four.'], ['aubrey', 'Racing away to the rope! The fielder gives chase in a purely ceremonial capacity.'], ['dazza', 'Cracking shot. Four all the way.']],
  six: [['aubrey', 'That is MAXIMUM! Somebody alert the air-traffic people.'], ['dazza', "That's gone into the next postcode, mate."], ['aubrey', 'SIX! Up, up, and into the crowd, where a gentleman catches it in his hat.'], ['dazza', 'Massive! Get that ball back, someone.']],
  bowled: [['aubrey', 'Bowled him! The stumps are doing cartwheels, which is more than the batsman managed.'], ['dazza', 'Timber!'], ['aubrey', 'Through the gate and the bails go flying! {bowler}, you beauty.'], ['dazza', 'Castled. Off you go.']],
  caught: [['dazza', 'Up, up... and taken. Safe as houses.'], ['aubrey', 'A catch of quiet magnificence. Someone get {fielder} a scone.'], ['dazza', 'Straight down his throat. Out.'], ['aubrey', 'Caught! {batter} departs, muttering about the light.']],
  screamer: [['aubrey', 'OH, WHAT A CATCH! {fielder} has taken a screamer and will be talked about in the pub for decades.'], ['dazza', "Full stretch! You don't see that every day, mate."], ['aubrey', 'A catch of such outrageous athleticism that I have spilled my tea.']],
  dropped: [['aubrey', 'Dropped! Butter, I think, would have had a firmer grip.'], ['dazza', "Oh, he'll be buying the drinks tonight."], ['aubrey', 'Put down! The ball escapes like a cat from a bath.']],
  lbw: [['aubrey', 'A huge appeal! The Reverend raises... raises... yes, eventually, the finger.'], ['dazza', 'Plumb. Plumber than a plumber.'], ['aubrey', 'Leg before! Trapped in front like a hedgehog on the B-road.']],
  runout: [['aubrey', 'Yes! No! Wait! Sorry! The four stages of grief, conducted at a sprint.'], ['dazza', 'Run out by a country mile.'], ['aubrey', 'Direct hit! He was still in the next county.']],
  stumped: [['aubrey', 'Down the pitch, through the gate, and the bails are off before you can say Kerfuffle.'], ['dazza', 'Stumped! Lightning hands behind the sticks.'], ['aubrey', 'He has wandered down the track like a man looking for his car keys. Stumped.']],
  hitwicket: [['aubrey', 'Oh, he has trodden on his own stumps. Hit wicket. One feels for him, but only slightly.'], ['dazza', 'Hit wicket! Kicked his own castle down.']],
  wide: [['dazza', 'Wide. Wide enough to land a plane.'], ['aubrey', 'Wide. The umpire spreads his arms like a man describing a fish.'], ['dazza', 'Way down leg. Extra.']],
  noball: [['aubrey', "No-ball! He's overstepped, which in this village is practically a felony. Free hit to come."], ['dazza', 'No-ball. Free hit, mate. Get swinging.'], ['aubrey', 'A beamer! Head high and frankly rude. No-ball.']],
  freehit: [['dazza', 'Free hit. He can only be run out. Have a go!'], ['aubrey', 'The free hit. Even the cow is watching.']],
  fire: [['dazza', 'The bat is literally smoking. Someone fetch a bucket.'], ['aubrey', 'Willow ablaze! Health and Safety will want a word.'], ['dazza', "He's ON FIRE! Can't bowl to him!"]],
  firebowl: [['dazza', "{bowler}'s on fire! The ball's leaving scorch marks on the pitch."], ['aubrey', 'The ball is ablaze. The groundsman is weeping into his roller.']],
  special: [['aubrey', "Oh, he's going for something special. I can't look. I'm looking."], ['dazza', "Here it comes. {item}!"], ['aubrey', "The {item}! I've only read about it in the Almanack."]],
  review: [['priya', 'Owl-Eye has it... pitching in line... hitting... and the verdict is in.'], ['priya', 'Let us see what the owl saw. The owl, I promise you, never blinks.']],
  overturned: [['priya', 'Overturned! The owl is unimpressed by the umpire.'], ['aubrey', 'The decision is reversed. The Reverend polishes his spectacles, thoughtfully.']],
  stands: [['priya', "Umpire's call. By a whisker of a whisker. The decision stands."], ['priya', 'Clipping the bails by a whisker of a whisker. It stands.'], ['aubrey', 'The review is lost. The captain kicks a daisy.']],
  rain: [['aubrey', 'And down it comes. The covers are on, the umbrellas are up, and the crowd discuss the weather.'], ['dazza', 'Rain. Course it is.']],
  item: [['aubrey', 'The ball has collected the {item}! Do not ask me how. I have no idea how.'], ['dazza', '{item} in play! That changes things.']],
  bonus: [['dazza', 'Kerfuffle bonus! {runs} extra for that, mate!']],
  maiden: [['aubrey', 'A maiden over. Six balls, no runs, and a great deal of meaningful staring.'], ['dazza', 'Maiden. Tight as a drum.']],
  hattrick: [['aubrey', 'A HAT-TRICK! Three in three! I may need to lie down.'], ['dazza', 'HAT-TRICK! Unbelievable scenes!']],
  overEnd: [['aubrey', 'End of the over. {team} {score}.'], ['dazza', "That's the over. {score}, and all to play for."], ['aubrey', 'Over completed. The fielders change ends at the pace of a church procession.']],
  chase: [['dazza', '{need} needed from {balls}. Game on.'], ['aubrey', 'They need {need} from {balls}. I shall be hiding behind the sofa.']],
  idle: [['aubrey', 'A Mrs Hepplewhite of Lower Muddleford has sent in a lemon drizzle. Mrs Hepplewhite, you are a saint.'], ['aubrey', 'There is a pigeon at short leg who has, I think, been there since Tuesday.'], ['dazza', 'Lovely day for it.'], ['aubrey', "Is it? I hadn't noticed. I've been looking at this cake."], ['aubrey', 'My late Aunt Hermione once bowled a googly to a bishop. He never recovered.'], ['aubrey', 'The number 47 bus has just gone past. It, too, looked disappointed with that over.']],
  edge: [['dazza', 'Edged! Through the gap!'], ['aubrey', 'A thick edge, which counts exactly the same as a thin one in the scorebook. Bless the scorebook.']],
  win: [['aubrey', 'And that is the match! Victory for {winner}, for common sense, and for the scone.'], ['dazza', "{winner} win it! Get the kettle on!"]],
  loss: [['dazza', "That's that, then. Shake hands, have a sandwich, try again."], ['aubrey', 'A defeat, but a dignified one. Mostly dignified. Partially.']],
  tie: [['aubrey', 'A TIE! Scores level! We go to a Super Over and I go to a darkened room.'], ['dazza', "Tied! Super Over! You couldn't write it, mate."]],
  ghost: [['aubrey', 'The ball has passed straight through the ghost fielder. That is surely a Law 42 matter.']]
};
const LOADING_LINES = ['Rolling the pitch', 'Whitening the creases', 'Brewing the tea', 'Polishing the ball on a trouser leg', "Counting the crowd's umbrellas", 'Moving Doris off the square', 'Oiling the Thrumptonator'];
// match report templates (8.9.3): picked by the shape of the result
const REPORTS = {
  bigWin: '{winner} were indebted to {topBat} ({topRuns}{notOut}, {sixes} six{sixPl}). {loser} never recovered from {collapse}.',
  bowlWin: '{loser} never recovered from {collapse}. {topBowl} took {wkts} for {bowlRuns} with a mixture of guile, swing and, in one instance, marmalade.',
  chase: '{winner} chased {target} with {spare} to spare, {topBat} making {topRuns}{notOut}. Play was briefly held up by {chaosThing}, who had to be persuaded off the square.',
  tie: 'A tie, decided by a Super Over of almost unbearable tension, at the end of which {topBat} was carried from the field on the shoulders of the scorer.',
  close: 'A finish of quite unreasonable tension. {winner} squeaked home by {margin}; {topBat} ({topRuns}{notOut}) is to have a bench named after him.'
};
