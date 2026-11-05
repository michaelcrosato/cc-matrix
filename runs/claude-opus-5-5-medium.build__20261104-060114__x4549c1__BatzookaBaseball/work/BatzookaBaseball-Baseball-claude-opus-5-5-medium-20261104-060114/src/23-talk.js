/* COMMENTARY: HAP HARRIGAN (play-by-play), "BIG" LOU BOMBECK (color, tall tales from '79), GLORIA VOX (the PA) and
 * UMPIRE BARB HAMMERSMITH. Old-time radio, turned up: short punchy lines, baseball slang, warm hyperbole, never mean.
 * Lines carry a priority; at most one every 2.5 s; no repeats within 20; {batter} {pitcher} {team} {dist} {park}. */
const LINES = {
  batter_up: [[3, 'pa', 'Now batting... {batter}!'], [3, 'pa', 'Stepping in... number {num}... {batter}!'], [3, 'pa', 'Let\'s hear it for... {batter}!'], [3, 'pa', 'At the plate... {batter}... of the {team}!'], [3, 'pa', 'Your batter... {batter}!'], [3, 'pa', 'Here comes... {batter}!']],
  strike_called: [[1, 'hap', 'Strike, right on the black. You could hang a picture on that one.'], [1, 'hap', 'Caught looking! Barb rings him up with feeling.'], [1, 'lou', 'He watched that one go by like a parade.'], [1, 'hap', 'Painted the corner. Somebody frame it.'], [1, 'lou', 'In 1979 I took a pitch like that. Still thinking about it.'], [1, 'hap', 'Strike! The bat never left the shoulder.'], [1, 'hap', 'Called strike. That one had a ticket and a seat number.'], [1, 'lou', 'You can\'t hit it with your eyes, kid.'], [1, 'hap', 'Right down Broadway, and nobody waved.'], [1, 'hap', 'Strike on the inside corner. Chin music with a happy ending.']],
  strike_swinging: [[1, 'hap', 'Swing and a miss! He unscrewed himself from the box!'], [1, 'lou', 'He swung so hard the breeze cooled the third row.'], [1, 'hap', 'Whiff! That bat went looking and came home empty.'], [1, 'hap', 'Swung through it! That pitch had a trap door.'], [1, 'lou', 'Missed it by a county mile. Maybe two counties.'], [1, 'hap', 'Fanned the air! The ball was gone before the thought.'], [1, 'lou', 'That\'s a lot of swing for no souvenir.'], [1, 'hap', 'Swing and nothing! Uncle Charlie strikes again.'], [1, 'hap', 'Big cut, no contact. The crowd felt the wind, though.'], [1, 'lou', 'He was early. He was so early he was yesterday.']],
  ball: [[1, 'hap', 'Ball, low. That one was dragging its feet.'], [1, 'hap', 'Ball, outside. Missed by a whisker and a half.'], [1, 'lou', 'Wide. The catcher had to lean into next week.'], [1, 'hap', 'Ball. Barb wasn\'t buying it.'], [1, 'hap', 'High and tight. Ball.'], [1, 'lou', 'That pitch got lost on the way to the plate.'], [1, 'hap', 'In the dirt, ball. Good block back there.'], [1, 'hap', 'Ball. The batter didn\'t even blink.'], [1, 'lou', 'He\'s nibbling. Nibble nibble.'], [1, 'hap', 'Just off the plate. Ball.']],
  foul: [[1, 'hap', 'Fouled straight back! Duck, Lou!'], [1, 'lou', 'I\'ve been ducking since \'79.'], [1, 'hap', 'Foul ball into the seats! Somebody got a souvenir with mustard.'], [1, 'hap', 'Just foul! Missed the line by a hair.'], [1, 'hap', 'Fought that one off. Still alive.'], [1, 'lou', 'Foul ball. Keep your eyes up, folks, they bite.'], [1, 'hap', 'Foul tip! He got a piece, just a piece.'], [1, 'hap', 'Hooked foul. Right idea, wrong zip code.'], [1, 'lou', 'That\'s a foul. That\'s also my seat.'], [1, 'hap', 'Spoiled it! A battle at the plate.']],
  strikeout: [[2, 'hap', 'Strike three! Back to the dugout to think about what he\'s done.'], [2, 'hap', 'Punched out! Barb nearly threw her shoulder out with that one.'], [2, 'lou', 'Struck out. Happens to the best. Happened to me twice a game.'], [2, 'hap', 'He struck him out! Grab a seat, friend.'], [2, 'hap', 'K! Sit down, son, the bench is warm.'], [2, 'lou', 'That\'s a backwards K for the scorebook.'], [2, 'hap', 'Three strikes, he\'s out! The pitcher strikes a pose.']],
  walk: [[2, 'hap', 'Ball four. Take your base, and take a sandwich while you\'re at it.'], [2, 'lou', 'A free pass. The best kind of free.'], [2, 'hap', 'He walks! Patience pays at the plate.'], [2, 'hap', 'Ball four, and the trot is on.'], [2, 'lou', 'Walk him? I wouldn\'t have walked me either.'], [2, 'hap', 'Base on balls. The pitcher talks to his glove.']],
  single: [[2, 'hap', 'Seeing-eye single through the right side! That ball had a map and a flashlight.'], [2, 'hap', 'Base hit! A frozen rope into center.'], [2, 'lou', 'A Texas leaguer! Dropped in like a lost pigeon.'], [2, 'hap', 'Worm-burner through the hole! Base hit.'], [2, 'hap', 'Lined into left for a single. Clean as a whistle.'], [2, 'lou', 'That\'s a hit. I\'ve seen it. I\'ve done it. Twice.'], [2, 'hap', 'Bloop and a blessing! He\'s on.'], [2, 'hap', 'Up the middle, base hit! Right past the pitcher\'s ear.'], [2, 'lou', 'Single! Hit \'em where they ain\'t, I always said.'], [2, 'hap', 'Grounder finds grass! He\'s safe at first.']],
  double: [[2, 'hap', 'Into the gap! {batter} is digging for second like there\'s buried treasure!'], [2, 'hap', 'Off the wall, and in with a double!'], [2, 'lou', 'Two-bagger! That\'s what we call a doubles hitter, folks.'], [2, 'hap', 'Down the line, fair ball! He\'s in standing up.'], [2, 'hap', 'Split the outfielders! Stand-up double!'], [2, 'lou', 'He\'ll be at second before the ball gets home.']],
  triple: [[2, 'hap', 'Off the wall, he\'s rounding second, he\'s going for three! He\'s SAFE!'], [2, 'lou', 'A triple! Rarest bird in the ballpark.'], [2, 'hap', 'All the way to third! Legs like a jackrabbit!'], [2, 'hap', 'Triple! The relay is late and the crowd is loud!'], [2, 'lou', 'Three bases. I never hit a triple. I ran out of gas at two.'], [2, 'hap', 'Into the corner, and he\'s off to the races! Triple!']],
  homer: [[3, 'hap', 'Swung on and BELTED! Deep! Way back! That ball has left the zip code!'], [3, 'hap', '{dist} feet! They\'ll need a passport to bring that one back!'], [3, 'lou', 'That\'s a tater, folks! Mashed like Sunday potatoes!'], [3, 'hap', 'GOODBYE BASEBALL! A moonshot for {batter}!'], [3, 'lou', 'That ball had a map and a lunch box.'], [3, 'hap', 'It\'s outta here! Dinger! {dist} feet of pure joy!'], [3, 'lou', 'I hit one that far in \'79. In a dream. Still counts.'], [3, 'hap', 'Gone! Somebody call the airport, there\'s a ball in the flight path!']],
  batzooka_ready: [[3, 'hap', 'The crowd is ROARING! You know what that means... it\'s BATZOOKA TIME!'], [3, 'lou', 'The bat is humming, folks. Stand back.'], [3, 'hap', 'Meter\'s full! Grandma Delgado\'s secret recipe is cooking!'], [3, 'hap', 'Listen to this place! The Batzooka is READY!'], [3, 'lou', 'When the crowd gets loud, the lumber gets loud.'], [3, 'hap', 'Full meter! Somebody hold onto their hats!']],
  batzooka_hit: [[3, 'hap', 'KA-BLAMMO! That\'s not a home run, that\'s a space program!'], [3, 'lou', 'That ball is going to land in next season!'], [3, 'hap', 'BATZOOKA! Rocket boosters ENGAGED!'], [3, 'hap', 'Fire, smoke and a baseball headed for orbit!'], [3, 'lou', 'I felt that one in my fillings.'], [3, 'hap', 'Liftoff! We have liftoff at the ballpark!']],
  fizzle: [[3, 'hap', 'Fizzle! That\'s the loudest nothing I\'ve ever heard.'], [3, 'lou', 'All boom and no ball. Happens to the best rockets.'], [3, 'hap', 'Pfffft. The Batzooka coughs and the pitcher grins.'], [3, 'hap', 'Missed! The smoke clears and the ball is in the mitt.'], [3, 'lou', 'That\'s a dud. Like my 1980 season.'], [3, 'hap', 'Swing and a FIZZLE! The crowd goes quiet as a library.']],
  super_pitch: [[3, 'hap', '{pitcher} just threw a pitch that\'s probably illegal in three states!'], [3, 'lou', 'What in the name of rosin was THAT?'], [3, 'hap', 'Super pitch! The ball is doing things balls shouldn\'t do!'], [3, 'lou', 'They didn\'t have those pitches in \'79. We had spitballs and hope.'], [3, 'hap', 'Here comes the special! Hold onto your hot dogs!'], [3, 'hap', 'That pitch had a soundtrack!']],
  catch_dive: [[2, 'hap', 'Laid out like a welcome mat! What a grab!'], [2, 'lou', 'He dove like he dropped his wallet!'], [2, 'hap', 'Diving catch! Full extension, full grass stains!'], [2, 'hap', 'Snow cone at the end of the glove! Unbelievable!'], [2, 'lou', 'That\'s a highlight. That\'s a poster. That\'s a lunch box.'], [2, 'hap', 'He sold out and he got it!']],
  robbery: [[3, 'hap', 'He climbed the wall and STOLE it! Call the sheriff!'], [3, 'lou', 'Robbery! In broad daylight! Well, stadium light.'], [3, 'hap', 'Up the fence like a spider and he\'s got it! Home run ROBBED!'], [3, 'lou', 'That\'s grand larceny with a glove.'], [3, 'hap', 'Taken away! He brought that one back from the bleachers!'], [3, 'hap', 'NO! He climbed the ladder and snatched it!']],
  catch_fly: [[1, 'hap', 'Can of corn. Easy out.'], [1, 'hap', 'Under it, and he squeezes it.'], [1, 'lou', 'A lazy fly. Even I could catch that. Probably.'], [1, 'hap', 'Fly ball, caught. Two hands, like Mama taught.'], [1, 'hap', 'Pop-up, put away.'], [1, 'lou', 'He camped under that like a tent.']],
  ground_out: [[1, 'hap', 'Grounder, scooped and fired. Out at first.'], [1, 'hap', 'Routine play, routine out.'], [1, 'lou', 'Chopped it right at him. Out.'], [1, 'hap', 'Fielded cleanly, thrown out by a step.'], [1, 'hap', 'Bang-bang at first... OUT!'], [1, 'lou', 'That\'s a ground ball with no ambition.']],
  error: [[2, 'hap', 'Clank! You could hear that one in the next county.'], [2, 'lou', 'Glove\'s got a hole in it. A big hole. A ball-sized hole.'], [2, 'hap', 'Booted it! An error on the play.'], [2, 'lou', 'Butterfingers! I know the feeling. I invented the feeling.'], [2, 'hap', 'Dropped it! The crowd groans.'], [2, 'hap', 'Off the heel of the glove. That\'ll be an E in the book.']],
  double_play: [[2, 'hap', 'Two for the price of one! Around the horn and back for a nap!'], [2, 'lou', 'Double play! Tidy as a church picnic.'], [2, 'hap', 'Six-four-three, and two are gone!'], [2, 'hap', 'Turned two! Smooth as butter.'], [2, 'lou', 'That\'s a twin killing. Nobody actually gets hurt, folks.'], [2, 'hap', 'Double play! The pitcher tips his cap.']],
  steal: [[2, 'hap', 'He\'s stealing! ...SAFE! Lock up your valuables, folks.'], [2, 'lou', 'Stolen base! He\'s got wheels and a getaway car.'], [2, 'hap', 'Swipes the bag! Not even close!'], [2, 'hap', 'He\'s running... and he\'s in! A stolen base!'], [2, 'lou', 'Nobody stole bases in \'79. We were too heavy.'], [2, 'hap', 'Grand theft second base!']],
  bowl_over: [[3, 'hap', 'COLLISION AT THE PLATE! Somebody check the catcher\'s warranty!'], [3, 'lou', 'He ran through that catcher like a screen door!'], [3, 'hap', 'Boom! Dust everywhere! What\'s the call?!'], [3, 'lou', 'That\'s football. That\'s a different channel.'], [3, 'hap', 'He bowled him over! The crowd is on its feet!'], [3, 'hap', 'Freight train at home plate!']],
  rhubarb_start: [[3, 'hap', 'Here come the benches! It\'s a rhubarb, folks, a genuine dust-up!'], [3, 'lou', 'Uh-oh, the benches are emptying! Somebody fetch a referee!'], [3, 'hap', 'They\'re pouring out of both dugouts! Cartoon dust cloud!'], [3, 'lou', 'In \'79 we settled this with a pie-eating contest.'], [3, 'hap', 'It\'s a donnybrook at the dish!'], [3, 'hap', 'Everybody\'s in it! Even the bat boy!']],
  rhubarb_end: [[3, 'ump', 'Everybody back in your dugouts before I eject the ballpark!'], [3, 'hap', 'Barb\'s breaking it up. Everybody\'s dusting off.'], [3, 'lou', 'Nobody\'s going home, though everybody\'s going home dirty.'], [3, 'hap', 'Order restored! Mostly. Somebody find that cap.'], [3, 'ump', 'That\'s ENOUGH! Play ball!'], [3, 'hap', 'The dust settles. Let\'s play some baseball.']],
  walkoff: [[3, 'hap', 'WALK-OFF! The {team} win it! Pile on, pile on!'], [3, 'lou', 'Game over! Pop the corn and dance in the aisles!'], [3, 'hap', 'They win it in their last at-bat! Pandemonium!'], [3, 'lou', 'A walk-off! The sweetest words in baseball!'], [3, 'hap', 'That\'s the ballgame! The {team} walk it off!'], [3, 'hap', 'Home team wins! Somebody tell the organist!']],
  lead_change: [[2, 'hap', 'And just like that, we\'ve got ourselves a brand-new ballgame!'], [2, 'lou', 'Lead change! Hold onto your peanuts.'], [2, 'hap', 'The {team} take the lead!'], [2, 'hap', 'Flip the scoreboard! New leader!'], [2, 'lou', 'The momentum just switched dugouts.'], [2, 'hap', 'They\'re out in front now!']],
  tie: [[2, 'hap', 'All tied up! Anybody\'s ballgame!'], [2, 'lou', 'Even Steven! My favorite cousin.'], [2, 'hap', 'Knotted up! The tension in here could hold a bat up.'], [2, 'hap', 'We are TIED!'], [2, 'lou', 'Tie game. Nobody leave.'], [2, 'hap', 'The equalizer! Even ballgame!']],
  inning: [[1, 'hap', 'Side retired. Stretch those legs, folks.'], [1, 'lou', 'Time for a hot dog. Or three. I\'m not counting.'], [1, 'hap', 'Three up, three down... or something like it.'], [1, 'hap', 'And that\'ll do it for the half-inning.'], [1, 'lou', 'Change of scenery, change of luck.'], [1, 'hap', 'Teams change sides, the organ warms up.']],
  between: [[1, 'hap', 'Time for the Mascot Race! My money\'s on the popcorn.'], [1, 'lou', 'The mascots are racing. One of them always trips. Always.'], [1, 'hap', 'Dance Cam! Show us your moves, folks!'], [1, 'hap', 'T-shirt cannon! Hands up in the bleachers!'], [1, 'lou', 'The grounds crew is dancing. Best footwork in the park.'], [1, 'hap', 'Between innings fun, and the vendor is SOLD OUT again.']],
  hazard_gull: [[2, 'hap', 'A seagull just stole a fly ball! Is that legal? Barb says it\'s in play!'], [2, 'lou', 'Those gulls have better hands than my old infield.'], [2, 'hap', 'Bird in the flight path! The ball\'s been relocated!'], [2, 'lou', 'That gull should get a contract.'], [2, 'hap', 'Snatched out of the sky! Only at Barnacle Bay!'], [2, 'hap', 'The gull drops it like a hot clam!']],
  hazard_vents: [[2, 'hap', 'The ground just sneezed lava, and the baseball went with it!'], [2, 'lou', 'Don\'t stand on anything that\'s glowing, folks.'], [2, 'hap', 'ERUPTION! The vents are live in the gaps!'], [2, 'lou', 'That\'s a hot corner. Literally.'], [2, 'hap', 'Lava vent! The outfielders are dancing!'], [2, 'hap', 'Caldera Field clears its throat!']],
  hazard_meteor: [[2, 'hap', 'Meteor shower in the outfield! The grounds crew is going to need a bigger rake!'], [2, 'lou', 'Gravity took the day off and the sky\'s falling. Normal moon stuff.'], [2, 'hap', 'Craters in the outfield! Watch those hops!'], [2, 'lou', 'No air, no wind, no excuses.'], [2, 'hap', 'Incoming! Space rocks on the warning track!'], [2, 'hap', 'Meteor strike! The lunar lawn takes another hit!']],
  hazard_fog: [[2, 'hap', 'Where\'d it go?! The ball just turned into a rumor!'], [2, 'lou', 'Phantom fog! Watch the shadow, kid, watch the shadow!'], [2, 'hap', 'Lost in the spooky soup!'], [2, 'lou', 'I lost a ball in fog once. Found it in \'82.'], [2, 'hap', 'Into the mist! Somebody turn on the lanterns!'], [2, 'hap', 'Now you see it, now you... don\'t!']],
  hazard_drone: [[2, 'hap', 'Off the security drone! Corporate airspace, folks!'], [2, 'lou', 'Those drones don\'t pay for tickets either.'], [2, 'hap', 'Deflected! MegaMax\'s robots are playing defense!'], [2, 'lou', 'A drone with a glove. What\'s next, a robot umpire?'], [2, 'hap', 'Pinball in the sky!'], [2, 'hap', 'Clang! Right off the flying toaster!']],
  drone_down: [[3, 'hap', 'The Batzooka just KNOCKED A DRONE OUT OF THE SKY!'], [3, 'lou', 'Somebody owes MegaMax a new drone. Not me.'], [3, 'hap', 'Drone down! Sparks and confetti!'], [3, 'hap', 'Kaboom! One less robot in the outfield!'], [3, 'lou', 'That\'s what you get for watching.'], [3, 'hap', 'Downed! The crowd loves it!']],
  silo: [[3, 'hap', 'OFF THE SILO! It\'s raining POPCORN at Kernel Field!'], [3, 'lou', 'Free snacks for everybody!'], [3, 'hap', 'Silo shot! The whole county smells like butter!'], [3, 'hap', 'Popped the silo! What a blast!'], [3, 'lou', 'That\'s the best thing to happen to corn since butter.'], [3, 'hap', 'Kernels everywhere! Fan Bucks for the Comets!']],
  megatron: [[3, 'hap', 'OFF THE MEGA-TRON! Sparks are flying in center field!'], [3, 'lou', 'MegaMax is going to need a bigger TV.'], [3, 'hap', 'Right off the big screen!'], [3, 'hap', 'Picture\'s fuzzy now! Nice shot!'], [3, 'lou', 'That\'s what I call a high-definition home run.'], [3, 'hap', 'Jumbotron JACKPOT!']],
  short_circuit: [[3, 'lou', 'He\'s smoking! I mean really smoking! Somebody unplug that fella!'], [3, 'hap', 'ENFORCER-9000 is short-circuiting!'], [3, 'hap', 'Sparks on the mound! The big robot is rattled!'], [3, 'lou', 'Have you tried turning him off and on again?'], [3, 'hap', 'Error 404: fastball not found!'], [3, 'hap', 'The machine is glitching!']],
  rally_cap: [[3, 'hap', 'Listen! Krakens, Eruptors, Meteors, even the Haunts! They\'re ALL chanting for the Comets!'], [3, 'lou', 'Rally caps on! The whole league is here!'], [3, 'hap', 'The meter\'s FULL! Kernel Field magic in the MegaDome!'], [3, 'hap', 'RALLY CAPS! Inside out and upside down!'], [3, 'lou', 'I\'ve got goosebumps on my goosebumps.'], [3, 'hap', 'This crowd will not let them lose!']]
};
const TALK = { next: 0, recent: [], last: null, prio: 0 };
const WHO = { hap: 'HAP HARRIGAN', lou: '"BIG" LOU BOMBECK', pa: 'GLORIA VOX (PA)', ump: 'UMPIRE BARB', dot: 'DOT', ike: 'GRANDPA IKE', mort: 'MORTIMER MEGAMAX' };
function say(tag, vars = {}) {
  if (!M || M.fast) return;
  const mode = game.settings.commentary || 'on'; if (mode === 'off') return;
  const pool = LINES[tag]; if (!pool) return;
  const prio = pool[0][0]; if (mode === 'big' && prio < 3) return;
  if (game.real < TALK.next && prio <= TALK.prio) return;
  const opts = pool.filter(l => !TALK.recent.includes(l[2])); const L = (opts.length ? opts : pool)[Math.floor(RF() * (opts.length || pool.length))];
  TALK.recent.push(L[2]); if (TALK.recent.length > 20) TALK.recent.shift();
  const b = M.ball && M.play ? M.play.batter : batterNow();
  const v = Object.assign({ batter: b ? b.name : '', pitcher: defense().pitcher.name, team: offense().def.name, num: b ? (b.idx + 1) * 3 % 50 + 2 : 7, park: M.park.name, dist: '' }, vars);
  const line = L[2].replace(/\{(\w+)\}/g, (_, k) => v[k] !== undefined ? v[k] : '');
  radio(L[1], line); TALK.next = game.real + 2.5; TALK.prio = prio;
}
/* the radio box: top centre, between the scorebug and the meters, typing at the voice's pace; non-modal */
const RADIO = { who: null, line: '', t: 0, life: 0 };
function radio(who, line, o = {}) {
  BZ.lastLine = { who, line };
  Object.assign(RADIO, { who, line, t: 0, life: 1.6 + line.length / 30 });
  babble.say(line, who);
}
function radioTick(dt) { if (RADIO.who) { RADIO.t += dt; if (RADIO.t > RADIO.life) RADIO.who = null; } }
function radioDraw(g, W, H) {
  if (!RADIO.who) return;
  const x0 = SAFE + 124, x1 = W - SAFE - cornerW() - 102, w = Math.max(150, x1 - x0), x = x0 + Math.max(0, (x1 - x0 - w) / 2), shown = RADIO.line.slice(0, Math.floor(RADIO.t * 40));
  const lines = wrapText(shown, w - 34), h = 14 + Math.max(2, wrapText(RADIO.line, w - 34).length) * 9;
  E.ui.box(g, x, SAFE, w, h, { bg: ['#1a1c2a', '#0c0d14'], border: '#e8c070', alpha: .88 });
  const rig = portraitOf(RADIO.who); try { rig.drawPortrait(g, x + 3, SAFE + 3, 24, { bg: '#2a2c3a' }); } catch (e) { /* first frame */ }
  E.font.text(g, WHO[RADIO.who] || RADIO.who.toUpperCase(), x + 30, SAFE + 3, '#ffd36a', { shadow: '#000', outline: false });
  lines.forEach((l, i) => E.font.text(g, l, x + 30, SAFE + 12 + i * 9, '#ffffff', { shadow: '#000', outline: false }));
}
function portraitOf(who) {
  if (['hap', 'lou', 'pa', 'ump', 'mort'].includes(who)) return castRig(who);
  const p = { dot: TEAMS.COM.roster[0], ike: TEAMS.COM.roster[8], hank: TEAMS.COM.roster[7], pip: TEAMS.COM.roster[2], kid: TEAMS.COM.roster[9] }[who];
  if (p) return makeRig(p, 'field');
  const t = { brine: 'HCK', iggy: 'MCE', cosmo: 'MBM', bones: 'HMH', robo: 'MMX' }[who]; if (t) return makeRig(TEAMS[t].captain, 'field');
  return castRig('hap');
}
BZ.bus.on('batterUp', d => { if (M && M.phase !== 'final' && !M.derby && RF() < .5) say('batter_up', { batter: d.batter.name.replace(/"[^"]*" /, '') }); });
BZ.bus.on('call', d => { if (!M || M.derby) return; if (d.kind === 'strike' && !d.three) say(d.swinging ? 'strike_swinging' : 'strike_called'); else if (d.kind === 'ball' && !d.four && RF() < .5) say('ball'); else if (d.kind === 'foul' && RF() < .6) say('foul'); });
BZ.bus.on('strikeout', () => say('strikeout'));
BZ.bus.on('walk', () => say('walk'));
BZ.bus.on('hit', d => say(['', 'single', 'double', 'triple', 'triple'][d.bases]));
BZ.bus.on('homer', d => say(d.batzooka ? 'batzooka_hit' : 'homer', { dist: d.dist }));
BZ.bus.on('meterFull', d => { if (M && d.team === M.half) say('batzooka_ready'); });
BZ.bus.on('fizzle', () => say('fizzle'));
BZ.bus.on('super', d => { if (d.kind === 'pitch') say('super_pitch'); });
BZ.bus.on('catch', d => say(d.robbed ? 'robbery' : d.dive || d.wall ? 'catch_dive' : 'catch_fly'));
BZ.bus.on('forceOut', () => { if (RF() < .5) say('ground_out'); });
BZ.bus.on('error', () => say('error'));
BZ.bus.on('doublePlay', () => say('double_play'));
BZ.bus.on('safeSteal', () => say('steal'));
BZ.bus.on('bowlOver', () => say('bowl_over'));
BZ.bus.on('rhubarbStart', () => say('rhubarb_start'));
BZ.bus.on('rhubarbEnd', () => say('rhubarb_end'));
BZ.bus.on('walkoff', () => say('walkoff', { team: M.teams[1].def.name }));
BZ.bus.on('leadChange', () => say('lead_change'));
BZ.bus.on('tieGame', () => say('tie'));
BZ.bus.on('halfEnd', () => say(M && M.show ? 'between' : 'inning'));
BZ.bus.on('hazard', d => say({ gull: 'hazard_gull', vents: 'hazard_vents', ventLaunch: 'hazard_vents', meteor: 'hazard_meteor', fog: 'hazard_fog', drone: 'hazard_drone' }[d.kind]));
BZ.bus.on('droneDown', () => say('drone_down'));
BZ.bus.on('siloPop', () => say('silo'));
BZ.bus.on('megatron', () => say('megatron'));
BZ.bus.on('shortCircuit', () => say('short_circuit'));
BZ.bus.on('rallyCap', () => say('rally_cap'));
BZ.bus.on('bullpenReady', () => radio('lou', 'Bullpen\'s ready! Pitching Change is in the pause menu.'));
BZ.bus.on('pitchingChange', d => { if (M && !M.fast) radio('pa', 'Now pitching... ' + d.in.name + '!'); });
// steals: a runner safe at the base he stole
BZ.bus.on('playOver', () => { const P_ = M && M.lastPlay; if (P_ && P_.steal) { const ok = !P_.outs.length; emit(ok ? 'safeSteal' : 'caughtStealing', {}); if (ok) { for (const r of M.runners) pStat(r.p).sb++; } } });
BZ.LINES = LINES;
