/* ---- POWER-UPS (thrown on by the crowd) ---- */
TT.POWERUPS = {
  pie: { id: 'pie', name: 'MEAT PIE', time: 6, desc: 'Turbo refilled and unlimited' },
  iron: { id: 'iron', name: 'IRON SHOULDERS', time: 15, desc: 'Tackles and fends always win; hits are monster hits' },
  boot: { id: 'boot', name: 'MEGA BOOT', time: 60, desc: 'The team\'s next kick goes 1.6x and true' },
  grease: { id: 'grease', name: 'GREASE JERSEY', time: 8, desc: 'Tackles on him fail 70% of the time' },
  horn: { id: 'horn', name: 'AIR HORN', time: 0, desc: '+40 hype at once' }
};
TT.POWERUP_ORDER = ['pie', 'iron', 'boot', 'grease', 'horn'];

/* ---- COMMENTARY: Barry Bellows (play-by-play, breathless) and Ros Rucker (colour, bone-dry). 'R:' marks Ros; a pair
 * [barry, ros] is a line and its reply. {$player} nickname, {$team}, {$score}, {$venue} ---- */
TT.LINES = {
  kickoff: ['And we\'re underway at {$venue}!', 'Big boot to get us going!', 'R:Here we go. Mind the mud.', 'Off we go! Seven a side and no mercy!', 'R:Ball\'s in the air. So are my hopes.', 'Kick-off! Hold onto your pies, folks!', ['Away we go!', 'R:Somebody wake the forwards.']],
  try: ['HE\'S GONE OVER! TRY TIME!', 'Under the sticks! You could drive a bus through that gap!', 'Dotted down! {$player}, take a bow!', 'In at the corner! Somebody check the paint on that touchline!', 'R:Textbook. If the textbook was written by a hurricane.', 'TRY! {$team} are dancing!', 'Over the whitewash! Get in!', ['Five points! FIVE!', 'R:He can count, everyone.']],
  bigHit: ['OH, THAT\'S A BIG ONE!', 'He\'ll feel that in the morning. And the morning after.', 'Absolutely SHUDDERING!', 'R:I felt that in my old knee, Barry.', 'BANG! Bring a mop!', 'Hit him like a falling fridge!', ['WALLOP!', 'R:Medically speaking, that\'s a wallop.']],
  monsterHit: ['MONSTER HIT! That\'s gone into orbit!', 'Put him in Row Z!', 'Somebody get that man a postcode, he\'s lost!', 'R:He\'s seen the curvature of the earth there.', 'Air traffic control want a word!', 'He\'s been posted second class!', ['GOOD NIGHT VIENNA!', 'R:And good morning, physio.']],
  step: ['Left him for dead!', 'Feet like a ballroom dancer!', 'R:Lovely footwork. Questionable haircut. Lovely footwork.', 'Stepped him like a puddle!', 'Ooh, the sidestep! He\'s tackled thin air!', 'Shimmy, shimmy, GONE!', 'R:That defender\'s gone to the wrong postcode.'],
  fend: ['HAND-OFF! Right in the chops!', 'He\'s fended him into next week!', 'R:A palm like a dinner plate.', 'Stiff arm! Talk to the hand!', 'Shoved him away like a bad pint!', 'R:That\'s what we used to call a polite no.'],
  dummy: ['Oh, the dummy! They\'ve bought it, the whole shop!', 'Sold a dummy! Sold it twice!', 'R:They fell for that? I\'m embarrassed for them.', 'The dummy! Hook, line and sinker!', 'Pretended to pass and they ALL went!', 'R:Oldest trick in the book. They clearly can\'t read.'],
  lineBreak: ['He\'s through! There\'s daylight!', 'The line\'s been cut like a birthday cake!', 'R:Defence has gone for a sit down.', 'Clean break! Somebody chase him!', 'He\'s in the clear! Run, lad, RUN!', 'Through the gap like a ferret down a drainpipe!'],
  knockOn: ['Knock-on. Butter fingers.', 'Dropped it like a hot pie!', 'R:Hands like feet, Barry.', 'Oh dear. It\'s gone forward off the hands.', 'Spilled it! Scrum coming!', 'R:Greasy ball. Greasier hands.'],
  forwardPass: ['Forward! The ref\'s not having that.', 'R:Forward by a country mile, Barry.', 'That\'s gone forward. Whistle!', 'Forward pass! Backwards, lads, BACKWARDS!', 'R:It\'s the one rule. The one.', 'Not legal! That\'s gone the wrong way!'],
  turnover: ['JACKAL! He\'s pinched it!', 'Turnover! Stolen like a pie at a buffet!', 'R:Lovely work over the ball.', 'They\'ve won it back at the breakdown!', 'Ripped it clean out of there!', 'R:Possession is nine-tenths of the law. The other tenth is elbows.'],
  ruck: ['They\'ve recycled it!', 'Quick ball from the ruck!', 'R:Lots of bodies. Some of them moving.', 'Good clean ball!', 'In they go! It\'s a pile-on!', 'R:Somewhere under that is a rugby ball.'],
  scrum: ['Crouch... bind... SET! And they\'ve hit like freight trains!', 'R:That scrum\'s going backwards, and so is their dignity.', 'Scrum time! The big lads earn their pies now!', 'Push, push, PUSH!', 'R:Six blokes, one ball, no oxygen.', 'Scrum won! Clean as a whistle!'],
  pushover: ['PUSHOVER TRY! They\'ve shoved them over the line like a wardrobe!', 'They\'ve marched them over! Removal men!', 'R:That\'s the most organised that pack has ever been.', 'PUSHOVER! Furniture removal service!', 'Over they go, the whole pack!', 'R:I\'d like to see the video of that. Slowly.'],
  lineout: ['He\'s been lifted so high he can see his house!', 'Stolen at the lineout! Cheeky!', 'R:Lovely lift. Lovely throw. Lovely.', 'Up he goes! Mind the satellites!', 'Clean take at the lineout!', 'R:They\'ve called that move "The Wardrobe". I don\'t know why.'],
  notStraight: ['Not straight! Wonky throw!', 'R:Straighter lines in a bowl of spaghetti.', 'That throw\'s gone sideways! Scrum!', 'Not straight, says the ref!', 'R:He threw it like he was skimming stones.', 'Crooked! The ref\'s seen that one.'],
  convMade: ['Straight between the sticks!', 'Bang! Two more!', 'R:Over. Never in doubt. I doubted it.', 'Through the middle!', 'Converted! Lovely strike!', 'R:Sweet as a nut.'],
  convMissed: ['Wide! Hooked it like a fisherman.', 'Oh, pushed it wide!', 'R:Not a kicker\'s day.', 'Missed! The crowd groans!', 'Short! Not enough on it!', 'R:Somewhere a goalkicking coach is weeping.'],
  doink: ['DOINK! Off the upright!', 'R:The post took that personally.', 'Off the woodwork! Agony!', 'DOINK! Hear that from the car park!', 'Clattered the upright!', 'R:Wrong sort of contact, that.'],
  pengoal: ['Penalty goal! Three points!', 'Over it goes! Three on the board!', 'R:Points are points, Barry.', 'Slotted! Three more!', 'He\'s nailed it!', 'R:Simple game, sometimes.'],
  dropGoal: ['DROP GOAL! Cheeky, cheeky!', 'Snapped it over! Three points!', 'R:Didn\'t even break sweat.', 'Off the deck and over! Drop goal!', 'He\'s had a pop and it\'s GONE!', 'R:Lovely. Rude, but lovely.'],
  penalty: ['Penalty! The ref\'s arm is out!', 'Penalty given!', 'R:Daft, that. Absolutely daft.', 'The whistle goes! Penalty!', 'Ref\'s seen that one! Penalty!', 'R:Someone\'s getting a talking-to in the dressing room.'],
  advantage: ['Advantage being played...', 'Ref says play on, advantage!', 'R:Arm out. Play on.', 'Advantage! Keep going!', 'Play on, play on!', 'R:The ref\'s being generous today.'],
  advOver: ['Advantage over.', 'R:Advantage over. Back to normal madness.', 'That\'s advantage over!', 'Advantage done!', 'And the arm comes down.', 'R:Advantage, used.'],
  cheapUnseen: ['Ooh... the ref\'s missed that one completely.', ['What the ref doesn\'t see, Ros...', 'R:...is still assault, Barry.'], 'Behind the ref\'s back! Cheeky!', 'R:Nobody saw that. Except everybody.', 'The ref\'s looking at the clouds!', 'Off the ball! Naughty, naughty!'],
  cheapSeen: ['The ref\'s seen that! Off the ball!', 'Caught red-handed!', 'R:Not subtle, that.', 'Right in front of the ref! Daft!', 'Late hit! Whistle!', 'R:Good eyes, Nigel. For once.'],
  yellow: ['YELLOW CARD! Off to the sin bin, and I mean an actual bin!', 'Sin bin! In you get, son!', 'R:Mind the bin juice.', 'Yellow! He\'s binned!', 'Off to the dumpster! Ten minutes of thinking!', 'R:It smells of fish in there, I\'m told.'],
  red: ['RED CARD! Early bath!', 'He\'s off! Red card!', 'R:That\'s his evening sorted then.', 'Sent off! Off you pop!', 'Red! Walk of shame!', 'R:Mum\'s not going to be pleased.'],
  sinOut: ['He\'s back from the bin!', 'Out of the dumpster and back in the fight!', 'R:Smells better than he did.', 'Back to full strength!', 'Released from the sin bin!', 'R:Rehabilitated. Allegedly.'],
  refDown: ['R:THE REF\'S DOWN! Anything goes, Barry!', 'Anything goes, Ros!', 'The referee\'s been flattened!', 'R:Somebody get Nigel a cup of tea.', 'Nobody\'s watching! It\'s CHAOS!', 'Ref down! The lunatics have the asylum!'],
  refUp: ['The ref\'s back on his feet!', 'R:Nigel lives.', 'Order restored! Sort of!', 'And Nigel\'s up!', 'The ref\'s back in business!', 'R:Pretend that never happened.'],
  onFire: ['HE\'S ON FIRE!', 'Somebody call the fire brigade! Actually, don\'t, let it burn!', 'R:Unstoppable. Possibly flammable.', 'He\'s smoking hot!', 'BOOMSHAKALAKA! On fire!', 'R:Health and safety are taking notes.'],
  super: ['THUNDER RUN! Get out of the way!', 'HURRICANE HIT INCOMING!', 'R:This is not a recognised rugby technique.', 'The SUPER\'s on! Batten down the hatches!', 'Full hype! Here it comes!', 'R:I believe this is the bit they practise.'],
  pie: [['Somebody\'s chucked a meat pie on the pitch!', 'R:Is that... gravy?'], 'A pie from the stands! Turbo time!', 'R:Steak and ale. Excellent choice.', 'Pie on the pitch! Grab it!', 'Pastry power!', 'R:Best thing on the field today.'],
  iron: ['IRON SHOULDERS! He\'s a walking wardrobe!', 'Iron shoulders! Don\'t get in his way!', 'R:Rivets and all. Lovely.', 'He\'s armour-plated!', 'Built like a battleship now!', 'R:Health and safety.'],
  boot: ['The MEGA BOOT! Stand well back!', 'Golden boot! It\'s got wings!', 'R:That boot has a pilot\'s licence.', 'Mega boot on the pitch!', 'Next kick goes to the moon!', 'R:Mind the floodlights.'],
  grease: ['Grease jersey! Slippery as a sardine!', 'Greased up! Nobody can hold him!', 'R:I don\'t want to know where that came from.', 'Like trying to catch a bar of soap!', 'Slippery customer!', 'R:Lard. That\'s lard.'],
  horn: ['AIR HORN! The crowd\'s gone barmy!', 'PARP! Hype through the roof!', 'R:My ears, Barry. My ears.', 'Air horn! The place is bouncing!', 'Listen to that racket!', 'R:Ninety decibels of pure nonsense.'],
  chicken: ['It\'s CAPTAIN CLUCKY! The mascot\'s on the pitch again!', 'The chicken! The CHICKEN!', 'R:That chicken has more caps than I do.', 'Captain Clucky\'s flattening everyone!', 'Mind the beak!', 'R:Somebody stop that bird.'],
  flames: ['Mind the flames! That\'s a well-done winger!', 'TOASTED! Medium rare!', 'R:Smells like a barbecue.', 'He\'s been flame-grilled!', 'Fire from below! Hot hot hot!', 'R:Health and safety have left the building.'],
  lightning: ['Lightning strike! That\'s one way to clear a ruck!', 'ZAPPED! I could see his bones!', 'R:That\'s an act of God, Barry.', 'Lightning on the pitch! Ka-BOOM!', 'Struck by lightning! He\'s glowing!', 'R:Not covered by insurance.'],
  mud: ['He\'s in the mud! Half man, half puddle!', 'Bogged down! Wellies required!', 'R:That\'s more mud than pitch.', 'Mud, glorious mud!', 'Stuck in the swamp!', 'R:Lovely day for it.'],
  wind: ['The wind\'s picked up! Watch the high ball!', 'Gusty out there!', 'R:Kickers hate this.', 'Here comes the wind!', 'The flags are standing straight out!', 'R:Hold onto your hats.'],
  hooter: ['There\'s the hooter! Ball has to go dead!', 'HOOTER! Last play!', 'R:Time\'s up. Whoever\'s got it, don\'t drop it.', 'The hooter\'s gone!', 'That\'s the hooter! Next stoppage ends it!', 'R:Here comes the panic.'],
  halftime: ['Half-time here at {$venue}: {$score}.', 'That\'s the half! {$score}.', 'R:Oranges and shouting, then.', 'Half-time! Time for a pie!', 'Break time, {$score}!', 'R:I\'ll get the teas in.'],
  fulltime: ['FULL TIME! {$team} win it, {$score}!', 'That\'s it! Somebody get the kettle on!', 'R:Good game. Mostly legal.', 'FULL TIME! What a match!', 'It\'s all over! {$team} take it!', 'R:I need a lie down.'],
  draw: ['FULL TIME! It\'s a draw, {$score}!', 'Honours even!', 'R:Nobody wins. Everybody hurts.', 'All square at the end!', 'Level pegging! A draw!', 'R:Very diplomatic.'],
  suddenDeath: ['Golden point! Next score wins the lot!', 'SUDDEN DEATH! Nerves of steel!', 'R:I can\'t watch.', 'Extra time! Next score takes it!', 'Golden point, here we go!', 'R:My heart, Barry.'],
  interception: ['INTERCEPTED! He\'s read it like a newspaper!', 'Picked off! And he\'s away!', 'R:Telegraphed that pass, they did.', 'Intercepted! Daylight ahead!', 'Snaffled it out of the air!', 'R:Lovely hands. Wrong team.'],
  offload: ['Offload in the tackle! Keep it alive!', 'Out of the back of the hand!', 'R:Sevens rugby. Never die.', 'Pop pass! Still going!', 'The offload! Gorgeous!', 'R:That\'s the good stuff.'],
  tackle: ['Good tackle!', 'Brought down!', 'R:Solid.', 'Wrapped up!', 'Down he goes!', 'R:Textbook, that.', 'Cut him in half!'],
  brokenTackle: ['He\'s broken the tackle!', 'Bounced off him!', 'R:Ooh, weak arms.', 'Shrugged him off!', 'Not enough! Still going!', 'R:Tackle like a wet tissue.'],
  missedTackle: ['Missed him!', 'Grasped at fresh air!', 'R:That one\'s going on the blooper reel.', 'Whiffed it!', 'Over-committed! Missed!', 'R:Defending like a revolving door.'],
  diveTackle: ['Diving tap tackle! Brilliant!', 'Ankle tap! Down he goes!', 'R:Last ditch. Lovely.', 'Full stretch! Brought him down!', 'Superman dive!', 'R:Fingertips. Enough.'],
  gangHold: ['They\'ve got hold of BIG UNIT... just about!', 'One man isn\'t enough!', 'R:Two men, minimum. Bring a ladder.', 'Hanging off him like a coat!', 'Somebody help him!', 'R:Like tackling a lorry.'],
  touch: ['Out of play!', 'Into touch!', 'R:Lineout coming.', 'Over the line and out!', 'Touch!', 'R:Neat.'],
  kickTouch: ['Great kick to touch!', 'Found the line! Lovely!', 'R:Precise. Annoyingly so.', 'Into touch, deep in their half!', 'A kicker\'s kick, that!', 'R:Nice territory.'],
  bomb: ['Up and under! Bombs away!', 'A garryowen! Get under it!', 'R:Snow on that one.', 'High ball! Who wants it?', 'That\'s up with the seagulls!', 'R:Hang time, Barry. Lovely hang time.'],
  grubber: ['Grubber kick! Chase it!', 'Little dink in behind!', 'R:Bouncing like a drunk ferret.', 'Through the legs! Grubber!', 'Kicked along the deck!', 'R:Oval ball, Barry. Anything can happen.'],
  dropout: ['Twenty-two drop-out!', 'Drop-out coming!', 'R:Long or short? Long, probably.', 'They\'ll restart from the twenty-two!', 'Drop-out!', 'R:Reset.'],
  notTen: ['Not ten! That kick-off\'s gone nowhere!', 'Short kick-off! Free kick!', 'R:Didn\'t get it ten metres. Embarrassing.', 'Not far enough!', 'R:Dreadful.', 'Shanked it short!'],
  freeKick: ['Free kick!', 'R:Free kick. No shot at goal.', 'Free kick awarded!', 'Tap and go from the free kick!', 'Free kick, play on!', 'R:A small mercy.'],
  penTry: ['PENALTY TRY! Seven points!', 'The ref\'s gone under the posts! Penalty try!', 'R:Daft. Absolutely daft.', 'Penalty try awarded!', 'Seven points! No kick needed!', 'R:That\'s what cynical gets you.'],
  replay: ['Let\'s see that again!', 'Have a look at this!', 'R:Slow it down for me.', 'Replay! Watch this!', 'One more time!', 'R:Pause it there. Ouch.'],
  jackal: ['JACKAL! Hands on the ball!', 'Over the ball and stealing!', 'R:Lovely low body position.', 'In like a ferret!', 'Pilfered it!', 'R:Fox in the henhouse.']
};
TT.REF_CALLS = { crouch: 'CROUCH!', bind: 'BIND!', set: 'SET!', useIt: 'USE IT!', advantage: 'ADVANTAGE!', playOn: 'PLAY ON!', hands: 'HANDS AWAY!', penalty: 'PENALTY!', knockOn: 'KNOCK ON!', forward: 'FORWARD!', notStraight: 'NOT STRAIGHT!', try: 'TRY!', scrum: 'SCRUM!', touch: 'LINEOUT!', free: 'FREE KICK!', card: 'IN THE BIN!', red: 'OFF!', ten: 'NOT TEN!', drop: 'DROP-OUT!', offside: 'OFFSIDE!', highShot: 'HIGH SHOT!', offBall: 'OFF THE BALL!', early: 'EARLY!' };

/* ---- THE MEGA CUP STORY (E.Story nodes: { who, say, choices }; ALL CAPS shouts shake; {w=.4} pauses) ---- */
TT.STORY = {
  prologue: { set: 'pub', music: 'pub', nodes: [
    { who: 'dave', say: 'So I\'m filling in the form, right. \'Mega Cup.\' I thought it was a tea thing.' },
    { who: 'gristle', say: 'It\'s the {shake}TURBO SEVENS MEGA CUP{/shake}, Dave. Live on Channel Thud. Against teams with dieticians.' },
    { who: 'fridge', say: 'We\'ve got a dietician.{w=.4} (He nods at the pie warmer.)' },
    { who: 'gristle', say: 'Gristle\'s Rule Number One: nobody laughs at the Mudlarks.{w=.3} Rule Number Two: we train. Now.{w=.3} Yes, you too, Dave.' },
    { who: 'dave', say: 'I drive the bus, Gordon.', choices: [{ text: 'TRAIN WITH GRISTLE', set: 'train' }, { text: 'SKIP TO THE CUP' }] }
  ] },
  r1: { set: 'pitch', music: 'mud', home: 'mud', away: 'bad', nodes: [
    { who: 'barry', say: 'Welcome to a damp Muddington Park, where the Mudlarks open their Mega Cup against the Bramblewick Badgers!' },
    { who: 'ros', say: 'Damp is generous, Barry. I\'ve seen drier rivers.' },
    { who: 'nan', say: 'I\'ve propped since before your dad had teeth, sonny. I\'ve had hip replacements tougher than you.' },
    { who: 'gristle', say: 'She\'s seventy-four, lads. Do {shake}NOT{/shake} go easy on her. She bites.' }
  ] },
  r1h: { nodes: [{ who: 'gristle', say: 'Rule Three: hold the ball.{w=.3} Rule Four: see Rule Three.' }] },
  r1w: { nodes: [{ who: 'barry', say: 'The Mudlarks are through! Ros, are they any good?' }, { who: 'ros', say: 'They\'re...{w=.5} present, Barry.' }] },
  r2: { set: 'pitch', music: 'shanty', home: 'mud', away: 'gul', nodes: [
    { who: 'barry', say: 'The quarter-finals! Port Grumble Docks at sunset, and the Gulls are strutting!' },
    { who: 'jonty', say: 'Gorgeous evening. Gorgeous ground. Gorgeous me. Do try to keep up, darlings.' },
    { who: 'gristle', say: 'Watch the wind. Watch the chicken.{w=.3} Don\'t ask about the chicken.' }
  ] },
  r2h: { nodes: [{ who: 'gristle', say: 'Pass it like it\'s hot.{w=.3} It IS hot. It\'s Port Grumble. Everything here\'s been deep-fried.' }] },
  r2w: { nodes: [{ who: 'barry', say: 'The Mudlarks are into the semis! Unbelievable!' }, { who: 'ros', say: 'That chicken has more caps than I do.' }] },
  r3: { set: 'pitch', music: 'forge', home: 'mud', away: 'irn', nodes: [
    { who: 'barry', say: 'Semi-final night at The Furnace! You can smell the hot metal from here!' },
    { who: 'anvil', say: 'We forge champions here. Everyone else, we melt down for scrap.' },
    { who: 'gristle', say: 'Don\'t stand on the glowing bits.{w=.3} Wheels. Wheels, look at me. The {shake}GLOWING{/shake} bits.' }
  ] },
  r3h: { nodes: [{ who: 'gristle', say: 'They hit hard? Hit harder.{w=.3} Then hide behind Tiny.' }] },
  r3w: { nodes: [{ who: 'barry', say: '{shake}A PUB TEAM IN THE MEGA CUP FINAL!{/shake} Somebody pinch me!' }, { who: 'ros', say: 'Gladly, Barry.' }] },
  r4: { set: 'tunnel', music: 'mega', home: 'mud', away: 'meg', nodes: [
    { who: 'rupert', say: 'Charming little pub team. I\'ll buy the lot of you. The pub, the pies, the muddy bird. Name your price.' },
    { who: 'fridge', say: 'Not for sale.' },
    { who: 'gristle', say: 'The pies are for sale. Two-fifty.{w=.3} {shake}WE\'RE{/shake} not.' },
    { who: 'unit', say: 'RAAAAAAAAAAARGH!', spotlight: true },
    { who: 'barry', say: '{shake}BIG UNIT BRANNIGAN!{/shake} Two metres of pure invoice!' },
    { who: 'ros', say: 'You\'ll need two men to bring him down, minimum. Bring a ladder.' }
  ] },
  r4h: { nodes: [{ who: 'gristle', say: 'I\'ve written the big speech. In my head. It\'s very moving. Pretend I said it.{w=.4} {shake}NOW GET OUT THERE!{/shake}' }] },
  lost: { nodes: [{ who: 'gristle', say: 'Rule Six: we go again.' }] },
  victory: { set: 'podium', music: 'victory', nodes: [
    { who: 'barry', say: '{shake}THE MUDDINGTON MUDLARKS ARE MEGA CUP CHAMPIONS!{/shake} A PUB TEAM, ROS! A PUB TEAM!' },
    { who: 'ros', say: 'I need a lie down, Barry.' },
    { who: 'rupert', say: 'I\'ll buy the trophy, then.' },
    { who: 'gristle', say: 'Rule Five: no.' }
  ] },
  third: { set: 'pub', music: 'third', party: true, nodes: [
    { who: 'barry', say: 'And so to the third half, back at the Muddy Duck. Everybody\'s here. Even the chicken.' },
    { who: 'nan', say: 'Somebody get these children a shandy.' },
    { who: 'choir', say: '{wave}Oh Muddington, oh Muddington, your mud is in my soul...{/wave}' },
    { who: 'choir', say: '{wave}We lost our boots, we lost our teeth, we never lost the ball...{/wave}' },
    { who: 'gristle', say: 'Last orders!' }
  ] }
};
/** who speaks in the story: a cast id (TT.CAST) or [teamId, slot]; the voice is looked up from it */
TT.SPEAKERS = {
  dave: 'dave', gristle: 'gristle', barry: 'barry', ros: 'ros', rupert: 'rupert', nigel: 'nigel',
  fridge: ['mud', 0], nan: ['bad', 0], jonty: ['gul', 4], anvil: ['irn', 5], unit: ['meg', 0], choir: 'choir'
};

/* ---- TRAINING GROUND: Coach Gristle's nine drills (each also a tutorial; SHOW ME plays its auto script) ---- */
TT.DRILLS = [
  { id: 'legs', name: 'LEGS', teach: 'Run, turbo, and ground it', goal: 'Turbo to the line and dive over', coach: 'Run. Faster. Hold {b:turbo} for turbo. In the in-goal, {b:x} to dive.' },
  { id: 'hands', name: 'HANDS', teach: 'Pass backwards, both ways', goal: 'Five passes, both ways, then a long one', coach: '{b:l1} passes up the line, {b:r1} down it. Hold for a long one. Never forwards!' },
  { id: 'feet', name: 'FEET', teach: 'Sidestep, spin and fend', goal: 'Two sidesteps, one spin, one fend', coach: '{b:x} sidesteps. Tap it twice to spin. {b:sq} fends the big lad off.' },
  { id: 'hit', name: 'HIT', teach: 'Tackle, big hit, dive, switch', goal: 'A tackle, a BIG HIT, a dive tackle and a switch', coach: '{b:x} tackles. HOLD {b:x} and let go for a BIG HIT. {b:sq} dives. {b:ci} switches.' },
  { id: 'ruck', name: 'RUCK', teach: 'Win the breakdown', goal: 'Win two rucks by mashing, then jackal one', coach: 'MASH {b:x} at the ruck. First man in on defence: {b:sq} to jackal!' },
  { id: 'boot', name: 'BOOT', teach: 'Grubber, punt to touch, drop goal', goal: 'A grubber, a kick to touch, a drop goal', coach: 'Tap {b:ci} for a grubber. Hold it for a punt. In their 22, hold it for a drop goal.' },
  { id: 'set', name: 'SET PIECES', teach: 'Scrum and lineout', goal: 'Win a scrum and a lineout', coach: 'Scrum: {b:x} on SET, then {b:l1} {b:r1} {b:l1} {b:r1}. Lineout: pick a pod, {b:x} to throw.' },
  { id: 'posts', name: 'POSTS', teach: 'Conversions', goal: 'Convert a try from out wide', coach: 'Move the tee back for a better angle, aim, then hold {b:ci} and let go in the band.' },
  { id: 'turbo', name: 'TURBO TIME', teach: 'Power-ups and supers', goal: 'Take the pie, then THUNDER RUN to score', coach: 'Grab the pie. Hype\'s full: {b:tri} for THUNDER RUN. Straight through them!' }
];

/* ---- records (E.Arcade tables), seeded with the cast's initials ---- */
TT.RECORD_SEED = {
  margin: [['NAN', 34], ['BIG', 31], ['JON', 28], ['ANV', 24], ['GRI', 21], ['DAV', 17], ['ROS', 14], ['BAR', 12], ['PIP', 9], ['CLU', 5]],
  tries: [['WHE', 9], ['BRE', 8], ['HED', 7], ['JET', 6], ['FRI', 5], ['NAN', 4], ['SAL', 4], ['TIL', 3], ['LUL', 3], ['BUS', 2]],
  hit: [['BIG', 84], ['ANV', 71], ['KIL', 66], ['TIN', 60], ['BER', 55], ['FRI', 48], ['NAN', 40], ['BUS', 36], ['RUS', 30], ['MOH', 24]]
};
TT.RECORD_TITLES = { margin: 'BIGGEST WINS (MARGIN)', tries: 'MOST TRIES IN A MATCH', hit: 'BIGGEST HIT (METRES FLOWN x10)' };
