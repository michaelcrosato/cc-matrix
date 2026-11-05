/* COMMENTARY LINES (section 7.4): every pool, original lines only. b = BARRY BELLOW, t = TREV BRICKLEY; a third item
 * is the partner\'s reply; a fourth a condition on the match. */
const LN = (pool, arr) => EF.lines(pool, arr.map(a => ({ who: a[0] === 'b' ? 'barry' : 'trev', text: a[1], reply: a[2] ? { who: a[2][0] === 'b' ? 'barry' : 'trev', text: a[2][1] } : null, when: a[3] || null })));
const KIP = (m, ev) => ev.who && ev.who.team && ev.who.team.id === 'kipperton';
const RAIN = m => m.weather && m.weather.kind === 'rain', SNOW = m => m.weather && m.weather.kind === 'snow';
LN('kickoff', [
  ['b', "And we\'re underway at {$stadium}! Lovely evening for it, Trev.", ['t', "It\'s raining sideways, Barry."], RAIN],
  ['b', "We\'re off! The ball is round, the grass is green, and {$team} are ready."],
  ['b', 'Here we go again! The referee checks his watch, and we are LIVE.', ['t', 'He checked it twice. Thorough man.']],
  ['t', "Kick-off. Let\'s see who\'s had a proper pre-match meal."],
  ['b', "The whistle goes and so do we! Welcome to {$stadium}!"],
  ['b', 'Ninety minutes of football. Well, five of yours, but it feels like ninety!', ['t', 'Feels like a hundred and ninety at my age.']],
  ['t', 'Big game, this. Bigger than my first car.'],
  ['b', "Off we go! {$opp} in their famous kit, {$team} in theirs."],
  ['b', "They\'re away! And the crowd are making a racket!", ['t', "Racket\'s a tennis word, Barry."]],
  ['t', 'Kick-off. Eyes on the ball, everyone. Even the linesmen. Especially the linesmen.'],
  ['b', 'Snow on the pitch, steel in the stands, and here we GO!', null, SNOW],
  ['b', 'The second half is underway!', ['t', 'Same pitch. Different direction. Football.'], m => m.half === 2],
  ['b', 'Restart! {$team} need something special now.', null, m => m.half === 2 && m.score[0] !== m.score[1]],
  ['t', 'Back underway. Somebody tell the substitutes to stop eating.']
]);
LN('goal', [
  ['b', 'OH, YOU BEAUTY! {$player} has absolutely LEATHERED it!'],
  ['b', 'GET IN! Back of the net from {$player}!', ['t', 'Keeper had no chance. None. Nada. Zilch.']],
  ['b', '{$team} score, and the away end is a washing machine!'],
  ['b', 'GOOOAL! {$player}! What a moment! What a MAN!', ['t', 'Decent finish, that.']],
  ['b', "It\'s in! It\'s in! {$player} sticks it in the onion bag!"],
  ['b', "THAT is why you pay the entrance fee! {$player}!", ['t', 'Some of them got in free, Barry.']],
  ['t', "Lovely. Picked his spot, didn\'t panic. Like parking a car."],
  ['b', 'GOAL! {$score}! You could not write it!', ['t', 'Somebody just did, on the scoreboard.']],
  ['b', 'Top bins! TOP BINS! {$player} has found the corner!'],
  ['b', "He\'s done it! {$player}! The net is still wobbling!"],
  ['t', "That\'s a goal. I\'ve checked. Twice."],
  ['b', 'Unbelievable! {$player} with the coolest finish since the invention of the fridge!'],
  ['b', 'OH MY COD! KIPPERTON HAVE SCORED!', ['t', "I\'ll allow the pun. Just this once."], KIP],
  ['b', "That\'s a plaice in history for {$player}!", null, KIP],
  ['b', 'Fish and chips for everyone! {$player} scores for the Kippers!', ['t', "I\'ll have mushy peas, ta."], KIP],
  ['b', "The harbour will be shaking tonight! {$player}!", null, KIP],
  ['b', "Reel it in! {$player} has hooked a big one!", ['t', "That\'s fishing, Barry. This is football."], KIP],
  ['t', 'Kipperton score. Somewhere a lighthouse is flashing on and off.', null, KIP],
  ['b', 'GOLDEN GOAL! {$player} WINS IT!', ['t', "Game over. Everybody go home. Carefully."], m => m.golden]
]);
LN('ownGoal', [
  ['b', "OH NO! It\'s gone in off {$player}! An own goal!", ['t', 'He will want the ground to swallow him. It might, in this mud.']],
  ['t', "Own goal. Wrong end, son. Wrong end entirely."],
  ['b', 'Disaster! {$player} turns it into his own net!'],
  ['b', "You can\'t legislate for that! {$player}, of all people!", ['t', 'You could, actually. Kick it the other way.']],
  ['t', 'That will be on a blooper tape until the end of time.'],
  ['b', "An own goal! The worst kind of goal! Unless it\'s yours!"],
  ['t', "Unlucky. Well. Not unlucky. Bad. But unlucky."],
  ['b', 'Oh dear oh dear. {$player} has given them a present!']
]);
LN('super', [
  ['b', 'WHAT HAS HE DONE TO THAT BALL?!', ['t', "That\'s not football. That\'s sorcery."]],
  ['b', 'A SUPER STRIKE! The ball is on FIRE, Trev!', ['t', 'Somebody fetch a bucket.']],
  ['b', 'Physics has left the building!'],
  ['t', "I\'d like to see the science on that. Actually, no I wouldn\'t."],
  ['b', 'Is it a bird? Is it a plane? It is a FOOTBALL with ideas!'],
  ['b', 'He has hit that so hard the ball needs a lie down!'],
  ['t', 'In my day the ball went in straight lines. Mostly.'],
  ['b', 'EUROPHORIA! And {$player} has unleashed the SUPER STRIKE!'],
  ['b', 'The crowd are on their feet! The ball is on a JOURNEY!', ['t', 'Has it packed a lunch?']],
  ['b', 'That ball has just been given a ticket to the moon!'],
  ['t', 'If I tried that my hamstring would emigrate.'],
  ['b', 'THE SMOKED KIPPER! Daz Pilchard, you magnificent fish!', null, (m, ev) => ev.super === 'smoked-kipper'],
  ['b', "ROW Z RETURN! He\'s hoofed it into orbit!", ['t', "And it\'s coming back. Duck."], (m, ev) => ev.super === 'row-z'],
  ['b', 'EL PASODOBLE! The ball is DANCING!', null, (m, ev) => ev.super === 'pasodoble'],
  ['b', 'DER HAMMERSCHLAG! Bang! Bang! BANG!', ['t', 'My fillings felt that.'], (m, ev) => ev.super === 'hammerschlag'],
  ['b', "LA CHIAVE! It\'s picking its way through everybody!", null, (m, ev) => ev.super === 'chiave'],
  ['b', "LA BOTTE D\'OR! Three balls! Which one is real?!", ['t', "The one that counts, Barry."], (m, ev) => ev.super === 'botte-dor']
]);
LN('superSaved', [
  ['b', 'SAVED! He has stopped the unstoppable!', ['t', "Don\'t tell the ball. It\'ll be devastated."]],
  ['b', 'The keeper has said NO to physics!'],
  ['t', 'Big gloves. Bigger heart. Biggest save.'],
  ['b', 'Unbelievable! The super strike is denied!'],
  ['t', "I\'ve seen some saves. That\'s a save."],
  ['b', 'He has eaten that super strike for breakfast!']
]);
LN('duel-perfect', [
  ['b', "AND THE KEEPER\'S GOT IT! FINGERTIPS! UNBELIEVABLE!"],
  ['b', 'PERFECT! Timing like a Swiss railway!', ['t', 'Better than my railway.']],
  ['t', "Caught it clean. Didn\'t even blink."],
  ['b', 'He has read it like a bedtime story!'],
  ['b', 'A PERFECT SAVE! The crowd do not know what to do with themselves!'],
  ['t', 'Textbook. If the textbook was written by a wizard.']
]);
LN('duel-good', [
  ['b', 'PUSHED AWAY! Not caught, but it is not in!', ['t', 'Not pretty. Effective.']],
  ['b', 'A strong hand! The keeper gets a touch!'],
  ['t', "Got enough on it. That\'s all you need."],
  ['b', 'Parried! Somebody clear it!'],
  ['b', 'Good save! Good save! Is there a rebound?!'],
  ['t', 'He will feel that in the morning.']
]);
LN('duel-miss', [
  ['b', "OH! He\'s gone the wrong way, and so has his dignity!", ['t', 'The ball and the keeper are both in the net.']],
  ['b', 'Too late! The keeper is beaten by the super strike!'],
  ['t', 'Mistimed. Happens to the best. Happened to me every week.'],
  ['b', 'He dived at the right time! Just in the wrong century!'],
  ['b', 'In it goes, and the keeper goes with it!'],
  ['t', 'Unlucky, son. That was never yours.']
]);
LN('penalty', [
  ['b', 'PENALTY! The referee points to the spot!', ['t', 'Clumsy. Very clumsy.']],
  ['b', "It\'s a penalty! The crowd can\'t believe it! Half of them, anyway!"],
  ['t', 'Stonewall penalty, that. Like a stone wall falling on a man.'],
  ['b', 'Spot kick! Who has the nerve?'],
  ['b', '{$ref} has given it! There will be letters about this!', ['t', 'Strongly worded ones.']],
  ['t', 'You cannot do that in the box. Or anywhere, really.'],
  ['b', 'PENALTY! Hold onto your scarves, everybody!'],
  ['b', 'The referee had no doubt! None whatsoever!'],
  ['t', 'Nervy moment, this. For everyone except the referee.'],
  ['b', 'Twelve yards. One kick. A whole town watching!'],
  ['t', 'Pick a corner and stick to it. That is my advice. I missed four.'],
  ['b', "It\'s a penalty and the keeper is doing star jumps on his line!"]
]);
LN('woodwork', [
  ['b', 'DOINK! Off the woodwork!', ['t', 'You could hear that in the car park.']],
  ['b', 'Off the post! So close! SO close!'],
  ['b', "The bar! It\'s rattled the bar!", ['t', 'The bar is fine. The striker is not.']],
  ['t', 'Inch to the left and we are all celebrating.'],
  ['b', 'The woodwork denies {$player}! The goalposts are on their side!'],
  ['b', 'CLANG! The frame of the goal is still vibrating!'],
  ['t', "Hit the post. That\'s a bad day at the office."],
  ['b', 'OHHH! It came back off the upright!'],
  ['t', 'Posts never get the credit they deserve.'],
  ['b', 'That one rang out like the church bells in {$city}!'],
  ['b', 'Off the bar and out! Somebody get the striker a hug!'],
  ['t', 'Painted white so you can see them. Should paint them invisible.']
]);
LN('var', [
  ['b', 'Here we go. VAR. Put the kettle on.', ['t', 'Put two on.']],
  ['b', 'The referee has his finger to his ear. Somebody is talking to him.'],
  ['t', 'VAR. Three people in a van watching telly.'],
  ['b', 'A VAR check! The crowd hold their breath!', ['t', 'They are going a bit blue, Barry.']],
  ['b', 'The screens are rolling. The tension is unbearable!'],
  ['t', 'In my day the only video was of the Christmas party.'],
  ['b', 'Checking. Checking. Still checking!'],
  ['t', "Take your time, lads. Not like there\'s a match on."],
  ['b', 'The longest seconds in football! VAR is looking at it!'],
  ['t', "They\'re zooming in. They\'ll find a pixel to blame."],
  ['b', "Is it? Isn\'t it? Only the van knows!"],
  ['t', 'Thousands of people, all looking at one man listening to his ear.']
]);
LN('diveBooked', [
  ['t', 'Yellow card for the amateur dramatics. Quite right.'],
  ['b', 'SIMULATION! Nobody was within a mile of him!', ['t', 'The nearest man was in the car park.']],
  ['b', 'He has been booked for diving! The crowd are booing the house down!'],
  ['t', 'If you want to act, join a theatre.'],
  ['b', 'Not this time! The referee was not fooled!'],
  ['t', "That\'s the worst dive I\'ve seen since my holiday in Margate."],
  ['b', 'Down he went with nobody near him, and up goes the yellow card!'],
  ['t', 'Embarrassing. Good. He deserves to be embarrassed.']
]);
LN('diveWon', [
  ['b', 'Down he goes, and the referee buys it!', ['t', 'There was a touch. A whisper of a touch.']],
  ['t', "He\'s made the most of that. Made a meal of it. Made a three-course meal."],
  ['b', 'Free kick given! Some in here will call that clever!'],
  ['t', 'Clever, I call it cheating with a smile.'],
  ['b', 'The referee has fallen for it! Hook, line and sinker!'],
  ['b', 'A free kick! And that is the dark arts, ladies and gentlemen!'],
  ['t', 'He went down like he was shot. By a pea.'],
  ['b', 'Given! The crowd think it was soft! Very soft!', ['t', 'Softer than a feather pillow.']]
]);
LN('dive', [
  ['b', "Oh, he\'s gone down like a sack of spuds!", ['t', 'There was more contact at my wedding, Barry.']],
  ['b', 'Down he goes! Is that a dive?'],
  ['t', 'Theatrical, that. Somebody hand him an award.'],
  ['b', 'He has thrown himself to the turf!'],
  ['t', 'Gravity did not need that much help.'],
  ['b', 'What a tumble! Triple salchow and a forward roll!'],
  ['t', 'And the referee waves play on. Get up, son.'],
  ['b', 'Is he hurt? Is he acting? Is he both?'],
  ['t', 'I have seen better acting in a school nativity.'], ['b', 'He is rolling! Once, twice, three times!', ['t', 'Four. I counted four.']], ['b', 'Down like a felled tree!'], ['t', 'Get up. The grass is wet.'], ['b', 'Clutching his shin! Or is it his knee? Or the other shin?']
]);
LN('save', [
  ['b', 'What a save by {$keeper}!', ['t', 'Big hands. You need big hands.']],
  ['b', 'SAVED! {$keeper} says not today!'],
  ['t', 'Good positioning. Did his homework, that lad.'],
  ['b', 'Fingertip save! He has stretched every inch of himself!'],
  ['b', '{$keeper} gets down well to that!', ['t', 'At his age, getting down is easy. Getting up is the hard part.']],
  ['t', 'Should have scored. Keeper made it look easy. It was not easy.'],
  ['b', "He\'s saved it! The wall of {$stadium}!"],
  ['b', 'A wonderful stop from {$keeper}!'],
  ['t', 'Right hand, left hand. Doesn\'t matter. Stop it.'],
  ['b', 'Denied! {$keeper} is having the game of his life!'],
  ['t', "Keepers are a strange breed, Barry. I\'ve met several."],
  ['b', 'He has smothered it! Safe hands!'],
  ['t', "Caught. Cuddled. Put to bed."],
  ['b', 'Superb! {$keeper} keeps them in it!']
]);
LN('nearMiss', [
  ['b', 'OHHH! Inches! INCHES!', ['t', "He\'ll see that one in his sleep."]],
  ['b', 'Wide! So close!'],
  ['t', 'Should be hitting the target from there. Every time.'],
  ['b', "Over the bar! That\'s gone into the crowd!", ['t', 'Somebody in row Z has a souvenir.']],
  ['b', 'Just past the post! The crowd were already celebrating!'],
  ['t', 'Wrong side of the post. The side with no net.'],
  ['b', 'Agonising! That was nearly a goal for the ages!'],
  ['t', 'Snatched at it. Calm down, take a breath, then shoot.'],
  ['b', 'Off target! But what an effort!'],
  ['t', 'Effort, yes. Goal, no.'],
  ['b', 'Whoosh! Past the post like a train!'],
  ['b', 'Everybody in {$city} just went OOOH!'],
  ['t', "If that\'s going in, it\'s going in. It wasn\'t going in."],
  ['b', 'Close! Close enough to smell it!']
]);
LN('launched', [
  ['b', "He\'s taken man, ball, and most of the grass!", ['t', "That\'s a booking in any country."]],
  ['b', 'He has sent him into orbit! Houston, we have a problem!'],
  ['t', 'Cartwheel and a half, that. Seven out of ten.'],
  ['b', 'Up in the air he goes! Like a pancake on Shrove Tuesday!'],
  ['t', "That\'s a tackle from the old days. The bad old days."],
  ['b', 'OOF! The whole stadium felt that one!'],
  ['t', "He\'ll want to have a word with whoever did that. A short word."],
  ['b', 'He has been flattened! Is there a stretcher in the building?']
]);
LN('foul', [
  ['b', 'Foul! The referee has seen that!'],
  ['t', 'Clumsy. Late. All the things your mum told you not to be.'],
  ['b', "Free kick! That\'s a cynical one!", ['t', 'Cynical is a big word for a little kick.']],
  ['b', '{$ref} blows up! He was having none of that!'],
  ['t', 'Went right through him. Like a hot knife through a kipper.'],
  ['b', 'A foul in a dangerous position!'],
  ['t', 'Professional foul. Not very professional.'],
  ['b', 'He has clipped his heels! Down he goes!'],
  ['t', 'That will annoy the manager. Everything annoys the manager.'],
  ['b', 'The whistle goes! Somebody has been naughty!'],
  ['t', "You can\'t do that. You just can\'t. Ever."],
  ['b', 'Tasty challenge! Too tasty for the referee!']
]);
LN('card', [
  ['b', 'The referee reaches for his pocket... and it is YELLOW!'],
  ['t', 'Deserved. Should have been a lecture as well.'],
  ['b', 'Yellow card for {$player}! He is walking a tightrope now!', ['t', 'In football boots. Never easy.']],
  ['b', 'Into the book he goes! {$player} is cautioned!'],
  ['t', "That\'s his name in the little book. Every referee loves his little book."],
  ['b', 'A yellow card, and {$player} cannot believe it!'],
  ['t', 'He can believe it. He just does not want to.'],
  ['b', 'Booked! The crowd are booing, but the referee is unmoved!'],
  ['t', 'A referee is like a lighthouse. Unmoved, and slightly flashing.'],
  ['b', 'Yellow card! {$ref} is having a busy evening!'],
  ['t', 'One more of those and he is having an early bath.'],
  ['b', "A caution! He\'ll have to be careful now!"],
  ['b', 'Shirt over his head, and a yellow card for the trouble!', ['t', 'Worth it, he says. Probably.'], (m, ev) => ev.why === 'shirt']
]);
LN('red', [
  ['b', "It\'s RED! {$player} is off!", ['t', 'Early bath. Bring a towel.']],
  ['b', 'A red card! The referee has had enough!'],
  ['t', "That\'s a long walk, that. Longest walk in football."],
  ['b', "Off he goes! {$team} are down to four outfield players!"],
  ['t', "He\'ll be watching the rest on the telly. In the dressing room. Alone."],
  ['b', 'Second yellow, and that means RED!', null, (m, ev) => ev.who && ev.who.cards >= 2],
  ['b', 'Sent off! The crowd are stunned!'],
  ['t', "Brainless. Absolutely brainless. I\'ve done it myself."]
]);
LN('europhoria', [
  ['b', 'EUROPHORIA! The fans have lifted them to another level!', ['t', "Never seen a crowd like it. Except last week."]],
  ['b', 'Listen to that noise! {$team} are in EUROPHORIA!'],
  ['t', 'The crowd is worth a goal start here. Maybe two.'],
  ['b', 'The tifo is up! The flares are lit! This is EUROPHORIA!'],
  ['b', 'You can feel it in the commentary box! The floor is shaking!', ['t', 'That might be the pies, Barry.']],
  ['t', "When the crowd\'s like this, your legs don\'t get tired. Mine did, but yours won\'t."],
  ['b', '{$team} are flying! Euphoria has turned to EUROPHORIA!'],
  ['b', 'The noise! The colour! The sheer, glorious nonsense of it all!'],
  ['t', 'They can smell a goal. I can smell onions. One of us is right.'],
  ['b', 'Here comes the surge! {$team} are unstoppable right now!'],
  ['t', 'Now is the time. Strike while the iron is hot.'],
  ['b', 'EUROPHORIA! Somebody has turned the stadium up to eleven!']
]);
LN('bus', [
  ['b', "They\'ve only gone and LITERALLY parked the bus!", ['t', 'Has it got a ticket?']],
  ['b', 'A BUS! In front of the goal! Is that allowed?!', ['t', "I\'ve checked the rules. Nothing about buses."]],
  ['t', 'Classic Lucchetto. One-nil up, and out comes the bus.'],
  ['b', 'The bus is parked! The handbrake is ON!'],
  ['t', "Clever. Diabolical. Clever. That\'s catenaccio for you."],
  ['b', 'You will need to go round it, over it, or THROUGH it!'],
  ['b', 'The driver has got out and he is not moving it!', ['t', 'Union rules, Barry.']],
  ['t', 'Shoot round the sides, or chip it. Or bring a tow truck.']
]);
LN('busSmashed', [
  ['b', 'THE BUS HAS BEEN SMASHED! THE WINDOWS ARE GONE!', ['t', "That\'s the deposit lost."]],
  ['b', 'The super strike has sent the bus packing!'],
  ['t', 'Never mind parking it. Somebody call a scrapyard.'],
  ['b', 'The bus is reversing out of there! Beep beep beep!'],
  ['t', "Insurance company won\'t like that one."],
  ['b', 'They parked the bus and Kipperton have STOLEN it!']
]);
LN('goldenMoment', [
  ['b', "The Golden Moment! {$team} have decided it\'s their time!", ['t', 'Money cannot buy you love. But it can buy you this.']],
  ['b', "Maximilien D\'Or raises his arm, and the crowd go GOLDEN!"],
  ['t', "Here it comes. The bit where the rich get richer."],
  ['b', 'Uh oh. Uh oh. The Golden Moment has arrived!'],
  ['t', "Brace yourselves, Kipperton. Here\'s the bill."]
]);
LN('halftime', [
  ['b', "That\'s the half-time whistle. Time for a pie, Trev?", ['t', 'Two pies, Barry.']],
  ['b', 'Half time at {$stadium}! {$score}!'],
  ['t', "Half time. The managers will be having words. Short ones, with feeling."],
  ['b', 'The players trudge off! What a half that was!', ['t', 'It was a half. Yes. That is what it was.']],
  ['b', "Half time, and {$team} have plenty to think about!"],
  ['t', 'Orange slices and a hairdryer. The two pillars of half time.'],
  ['b', 'Half time! Go and put the kettle on, everybody at home!'],
  ['t', "Pies, tea, a quick stretch, and a long think. I\'ll do the first two."],
  ['b', 'That is the end of the first half! Phew!'],
  ['t', 'Score is {$score}. Plenty of football left. Well. Half of it.'],
  ['b', 'Half time! The fans are queuing for the toilets already!', ['t', "Smart fans. Smarter than the players."]],
  ['b', 'The whistle goes for the break with the crowd on their feet!']
]);
LN('fulltime', [
  ['b', "They\'ll be dancing on the harbour wall in Kipperton tonight!", ['t', 'Mind the gulls.'], m => (m.teams[0].id === 'kipperton' && m.score[0] > m.score[1]) || (m.teams[1].id === 'kipperton' && m.score[1] > m.score[0])],
  ['b', "It\'s all over! {$score}!"],
  ['t', 'Full time. Good game. Bit of everything. Including a lot of nothing.'],
  ['b', 'The final whistle goes! What a match!', ['t', 'It was a match. I agree.']],
  ['b', "That\'s the end! The players fall to the turf!"],
  ['t', "Final whistle. Shake hands, swap shirts, don\'t swap the smelly ones."],
  ['b', 'FULL TIME! The crowd are going home happy! About half of them!'],
  ['t', 'Over. Done. In the history books. The small history books.'],
  ['b', 'It is over! Football, bloody football!', ['t', 'Language, Barry.']],
  ['t', 'A draw. Nobody loses. Nobody wins. Everybody goes home damp.', null, m => m.score[0] === m.score[1]],
  ['b', 'Honours even! Nothing to separate them!', null, m => m.score[0] === m.score[1]],
  ['b', 'Full time, and Kipperton have done it again!', null, m => (m.teams[0].id === 'kipperton' && m.score[0] > m.score[1])],
  ['t', "That\'s football. Ninety minutes, two teams, one ball, and a lot of shouting."],
  ['b', 'The referee blows for time! What a night at {$stadium}!']
]);
LN('extratime', [
  ['b', 'Level at full time! Golden goal extra time! Next goal WINS!', ['t', 'No pressure, lads.']],
  ['b', 'Extra time! The legs are heavy, the hearts are heavier!'],
  ['t', 'Golden goal. First one to score goes home with the biscuits.'],
  ['b', 'We go again! Sudden death... I mean golden goal!'],
  ['t', "I hated extra time. Mostly because I always got cramp."],
  ['b', 'Fifteen more minutes! Who has the nerve?']
]);
LN('shootout', [
  ['b', "It\'s PENALTIES! The cruellest way to lose, the sweetest way to win!", ['t', "Nobody wants to take one. Everybody wants to take one."]],
  ['b', 'A shootout! Hide behind your sofas!'],
  ['t', 'Pick your spot. Don\'t change your mind. Simple. Not simple.'],
  ['b', 'Penalties! Five each, then sudden death!'],
  ['t', "I missed one in a cup final once. Still think about it in the bath."],
  ['b', 'Twelve yards! A whole season comes down to twelve yards!'],
  ['t', "It\'s a lottery, they say. It isn\'t. It\'s nerve."],
  ['b', 'The tension in here could power the floodlights!', ['t', 'Better than fish oil.']]
]);
LN('shootoutScore', [
  ['b', 'SCORES! Cool as you like!'], ['b', 'In! Into the corner!', ['t', 'Keeper went the right way. Too slowly.']],
  ['t', 'Never in doubt. Well. Slightly in doubt.'], ['b', 'Buried it! Ice in the veins!'],
  ['b', "He\'s scored! Pressure? What pressure?"], ['t', 'Good penalty, that. Hard and low.'],
  ['b', 'Top corner! Unstoppable!'], ['t', 'That one was in before he hit it.'],
  ['b', 'GOAL! The shootout goes on!'], ['b', 'Smashed it home! What a penalty!']
]);
LN('shootoutMiss', [
  ['b', 'SAVED! The keeper is the hero!', ['t', 'Read it like a book. A short book.']],
  ['b', 'Missed! Oh, the agony!'], ['t', 'Changed his mind. Never change your mind.'],
  ['b', "Over the bar! That\'s gone into orbit!", ['t', 'Leaned back. Always lean back, always over.']],
  ['b', 'The keeper guesses right and keeps it out!'], ['t', 'He looked nervous walking up. Very nervous.'],
  ['b', 'Off the post! Oh no!'], ['b', 'Saved! The crowd go wild!'],
  ['t', "Nobody remembers the ones who scored. Everyone remembers that."], ['b', 'Denied! The shootout swings!']
]);
LN('panenka', [
  ['b', 'A PANENKA! He chipped it down the middle! The CHEEK of it!', ['t', 'Either a genius or a lunatic. Often both.']],
  ['b', 'The cheekiest penalty you will ever see!'],
  ['t', 'Chipped it. In a shootout. I need a lie down.'],
  ['b', 'Oh he has dinked it! The keeper is lying on the floor in shame!'],
  ['t', 'If that was saved he would never be forgiven. It was not saved.'],
  ['b', 'Ice cold! A Panenka! Somebody give that man a medal!']
]);
LN('advantage', [
  ['b', 'Advantage! The referee waves play on!', ['t', 'Good refereeing, that. Let it flow.']],
  ['b', 'Play on! {$ref} is letting the game breathe!'],
  ['t', "He\'ll come back to that. Referees always come back to it."],
  ['b', 'The referee spreads his arms! Advantage!'],
  ['t', 'Sensible. A free kick is less than what they have.'],
  ['b', 'No whistle! Advantage played!']
]);
LN('corner', [
  ['b', 'Corner kick! Everybody up!', ['t', 'Big lads in the box. Big lads only.']],
  ['b', 'A corner! Danger here!'], ['t', "Get it in the mixer. That\'s all you can do."],
  ['b', 'Corner! The keeper is shouting at everybody!'], ['t', 'Near post, far post, or the head of a defender. Usually the last one.'],
  ['b', 'A corner! The crowd behind the goal are on their feet!'], ['t', 'Corners win cups. And lose them.'],
  ['b', 'Another corner! The pressure is building!']
]);
LN('refHit', [
  ['b', 'OH! The referee has been hit by the ball!', ['t', 'Best touch of the game, that.']],
  ['b', 'Down goes the referee! Is there a referee for the referee?'],
  ['t', "Ball hit the ref. Ref hit the floor. Nobody\'s sure what to do."],
  ['b', 'The referee is flat out! The crowd are delighted!'],
  ['t', "He\'ll be fine. Referees are made of tough stuff. And whistles."],
  ['b', "Right in the whistle! He won\'t forget that!"]
]);
LN('celebrate', [
  ['b', 'And what a celebration!', ['t', 'He practised that in the mirror.']],
  ['b', 'Look at him go! The fans love it!'], ['t', 'Celebrations were a handshake in my day. Two if it was a cup tie.'],
  ['b', 'The whole team pile on! Somebody check he can breathe!'], ['t', 'Careful. Hamstrings are fragile things.'],
  ['b', 'He is milking it! And why not!'], ['b', 'The fish slap! The legendary Kipperton fish slap!', ['t', "I\'ll never get used to that."], (m, ev) => ev.id === 'fishslap'],
  ['b', 'A backflip! The man is a gymnast!', null, (m, ev) => ev.id === 'backflip'], ['b', 'The robot! Beep boop, goal!', null, (m, ev) => ev.id === 'robot'],
  ['t', 'Shirt over the head. He knows that is a booking. He does not care.', null, (m, ev) => ev.id === 'shirt']
]);
LN('stoppage', [
  ['b', 'The board goes up! Added time!', ['t', 'Squeaky bum time, this.']],
  ['b', 'A few more minutes to play!'], ['t', 'Added time. The longest minutes there are.'],
  ['b', "The fourth official has his board out! Plenty of time, if you\'re quick!"],
  ['t', 'Concentrate now. Games are lost in added time. I lost several.'],
  ['b', 'Into the final minutes we go!']
]);
LN('replay', [
  ['b', "Let\'s see that again!", ['t', 'Watch the run. Watch the finish. Watch me nod.']],
  ['b', 'Here it is again! Look at that!'], ['t', 'Slow it down, and it still looks good.'],
  ['b', 'One more time for the people at the back!'], ['t', 'See the keeper there? He went the wrong way. Then the other wrong way.'],
  ['b', 'In glorious slow motion!'], ['t', 'Look at the defending. Actually, do not look at the defending.'],
  ['b', 'Roll the tape! What a goal!']
]);
LN('nutmeg', [
  ['b', "Through the legs! He\'ll hear about that in the canteen.", ['t', 'Nutmegged. Worst feeling in football. After losing.']],
  ['b', 'NUTMEG! The crowd give him an OLÉ!'], ['t', 'Legs open, ball through. Close your legs, son.'],
  ['b', 'Megs! He has gone right through him!'], ['t', "That\'s going on social media. Whatever that is."],
  ['b', "He\'s put it through his legs and run round him!"], ['t', 'Embarrassing for the defender. Very embarrassing.'],
  ['b', 'A nutmeg! Pure cheek!'], ['t', "I got nutmegged once in 1987. I\'m still not over it."],
  ['b', 'Olé! Through the legs and away!']
]);
LN('skill', [
  ['b', 'Look at the feet on that!', ['t', 'Quick feet. Quick brain. Quick everything.']],
  ['b', 'A step-over! And another! And he is gone!'], ['t', 'Show-boating. I like it. Do not tell anyone.'],
  ['b', 'Over his head! A rainbow flick! Outrageous!'], ['t', 'You do not see that in the lower leagues. You see it in the hospital.'],
  ['b', 'Silky! Absolutely silky!'], ['t', "He\'s bamboozled him. Totally bamboozled."],
  ['b', 'A spin turn! He has left his man for dead!'], ['t', 'Turned him inside out, then outside in.'],
  ['b', 'Tricks! Flicks! The crowd love it!'], ['t', 'Very nice. Now pass it.'],
  ['b', 'Samba on the snow!', null, SNOW]
]);
LN('tackle', [
  ['b', 'What a tackle! Took the ball clean!', ['t', "Timing. That\'s all a tackle is. Timing and a bit of madness."]],
  ['b', 'Slide tackle! Ball first, man second!'], ['t', 'That is how you tackle. Show the kids that one.'],
  ['b', 'He has won it back with a crunching challenge!'], ['t', 'Fair and square. And loud.'],
  ['b', 'In he goes! Wins the ball!'], ['t', 'Went to ground. Got the ball. Got up. Textbook.'],
  ['b', 'A sliding tackle in the snow! He has cleared a path!', null, SNOW], ['b', 'Sliding through the puddles! What a tackle!', null, RAIN],
  ['t', 'Superb. Absolutely superb. I would buy that man a pint.'], ['b', 'Crunch! That was felt in the back row!', ['t', 'Clean though. Clean as a whistle.']], ['b', 'He has nicked it off his toes!'], ['b', 'Clean as a whistle! Not like the referee\'s!']
]);
LN('header', [
  ['b', 'Rises like a salmon! A kipper, actually, but you get the idea.', null, KIP],
  ['b', 'A header! He has met it with his forehead!', ['t', "Eyes open. Always eyes open."]],
  ['b', 'Up he goes! Bullet header!'], ['t', 'Attacked the ball. Wanted it more.'],
  ['b', 'A diving header! He has thrown himself at it!'], ['t', 'Brave. You need to be brave. And have a hard head.'],
  ['b', 'He has nodded it goalwards!'], ['t', 'Good contact. Good direction. Good lad.'],
  ['b', "Headed at goal! He\'s won the aerial battle!"], ['t', "Big lad. Big jump. Big head. In a good way."],
  ['b', 'The Nodder rises! Needham at full stretch!', null, (m, ev) => ev.who && ev.who.data.id === 'needham'],
  ['b', 'Up like a rocket! What a leap!']
]);
LN('volley', [
  ['b', 'ON THE VOLLEY! He has hit it before it bounced!', ['t', 'Watch the ball onto the foot. That is all a volley is.']],
  ['b', 'A volley! Sweet as you like!'], ['t', "Didn\'t let it bounce. Never let it bounce."],
  ['b', 'He has leathered it on the half volley!'], ['t', 'Timing. Pure timing.'],
  ['b', 'Side-foot volley! Technique!'], ['t', 'That is a hard skill. Harder than it looks.'],
  ['b', 'Bang! First time!'], ['t', "Hit it first time. No thinking. Thinking\'s for defenders."],
  ['b', 'A volley from the edge of the box!'], ['t', "If that\'s on target it\'s a goal. It might be."],
  ['b', 'Smashed on the volley!']
]);
LN('bicycle', [
  ['b', 'AN OVERHEAD KICK! ARE YOU KIDDING ME?!', ['t', 'I tried that once. Spent a week in traction.']],
  ['b', 'A BICYCLE KICK! Upside down and brilliant!'], ['t', 'Back of the neck. That is where you land. Every time.'],
  ['b', 'He has gone over the top! Overhead!'], ['t', "That\'s for the highlights reel. And his physio."],
  ['b', 'SCISSOR KICK! The crowd can not believe it!'], ['t', 'I would not try that at home. Or anywhere.'],
  ['b', 'Acrobatics! Gymnastics! Football!'], ['t', 'Show-off. Brilliant show-off.']
]);
LN('keeperEarly', [
  ['b', 'The keeper has gone early!', ['t', 'Patience, son. Patience.']], ['t', 'Gone before the kick. The taker saw it.'],
  ['b', 'He has committed! Will the taker change his mind?'], ['t', 'Dive too early and you look daft. Dive too late and you look dafter.']
]);
LN('event-seagull', [
  ['b', 'And a seagull has taken possession!', ['t', 'Better first touch than some I have seen.']],
  ['b', 'A seagull is sitting on the ball! The referee does not know what to do!'], ['t', 'Gulls in Kipperton. Bigger than the full-backs.'],
  ['b', 'The seagull is not giving it back! Somebody shoo it!'], ['t', "Typical gull. Takes your chips, takes your ball."],
  ['b', 'Off it flies! The gull has had its fun!']
]);
LN('event-beachball', [
  ['b', 'A beach ball is on the pitch! Two balls! Chaos!', ['t', 'Which one do they kick? Both, apparently.']],
  ['b', 'Somebody has thrown a beach ball on! It is bouncing all over!'], ['t', "Holiday atmosphere. I\'d like a deckchair."],
  ['b', 'The real ball has just bounced off the beach ball!'], ['t', 'Pop it, ref. Go on. Pop it.']
]);
LN('event-invader', [
  ['b', 'A pitch invader! Is that... is that a giant kipper?!', ['t', 'That is Kipper Keith. He does this every week.']],
  ['b', 'Somebody is on the pitch! The stewards are giving chase!'], ['t', 'Hi-vis jackets. Not built for speed.'],
  ['b', "He\'s dodging the stewards! He\'s got better feet than the midfield!"], ['t', 'Somebody tackle him. Anybody.'],
  ['b', 'A stag on the pitch! Antlers and everything!', ['t', 'The Steel Stag. Club mascot. Legally a mascot.'], m => m.stadium.id === 'stahlpresse']
]);
LN('invaderTackled', [
  ['b', "He\'s been TACKLED by a player! The crowd are loving it!", ['t', 'Best tackle of the night, that.']],
  ['b', 'Brought down by {$player}! The invader is out of the game!'], ['t', "That\'s a sticker for the album, that."],
  ['b', 'Justice! {$player} has flattened the pitch invader!']
]);
LN('event-floodlight', [
  ['b', "And the floodlights have gone! We can\'t see a thing!", ['t', 'The fish-oil generator, I expect.']],
  ['b', 'Lights out at the stadium! Is there a fuse box?'], ['t', 'Somebody put fifty pence in the meter.'],
  ['b', "They\'re back! The lights are back on!"], ['t', 'Football in the dark. Like my Sunday league.']
]);
LN('event-flaresmoke', [
  ['b', 'Red smoke is pouring across the pitch from the curva!', ['t', "Atmospheric. Can\'t see a thing, but atmospheric."]],
  ['b', 'The Lucchetto fans have lit the flares! The pitch is a red mist!'], ['t', "Smells like a barbecue. A sad barbecue."],
  ['b', 'Through the smoke he comes!'], ['t', 'Good for hiding a foul, that smoke.'],
  ['b', 'The curva are making it look like a volcano in here!']
]);
LN('event-drone', [
  ['b', "There\'s a drone over the pitch! Somebody wants a better view!", ['t', 'Probably the owner. Watching his money.']],
  ['b', 'A camera drone buzzes over the Euphorium!'], ['t', 'In my day the cameraman sat on a ladder.'],
  ['b', 'The drone is getting the aerial shot of a lifetime!']
]);
LN('event-fireworks', [
  ['b', 'FIREWORKS! The Euphorium is lit up!', ['t', 'They do like a fuss here.']],
  ['b', 'Bang! Fizz! The sky is gold and silver!'], ['t', 'Very nice. Is anyone watching the football?']
]);
LN('weather-rain', [
  ['t', 'Proper weather, this. Separates the men from the boys. And the boys from their boots.'],
  ['b', 'The rain is coming down in sheets!', ['t', 'Fitted sheets.']],
  ['t', 'Wet ball, wet pitch. Shoot from anywhere. The keeper hates this.'],
  ['b', 'Puddles all over the pitch! The ball keeps stopping dead!'],
  ['t', 'You need studs on a night like this. Long ones. And a snorkel.'],
  ['b', "It\'s a proper northern night at the Smokehouse!", ['t', 'Wet, windy, and smelling of fish. Lovely.']]
]);
LN('weather-snow', [
  ['b', "It\'s a winter wonderland! The orange ball is out!", ['t', 'Never trust a white ball in the snow.']],
  ['t', 'Snow slows the ball down. Pass it harder. Or get a sledge.'],
  ['b', 'The groundstaff have cleared the lines! Heroes, the lot of them!'],
  ['t', 'Cold enough to freeze the eyebrows off a polar bear.'],
  ['b', 'Footprints in the snow! You can see every run!', ['t', "And every mistake. That one\'s mine."]],
  ['b', 'The snow keeps falling! The steel keeps pressing!']
]);
LN('weather-fog', [
  ['b', "The fog\'s rolled in! I can barely see the far touchline!", ['t', 'Use the radar, lads. Use the radar.']],
  ['t', 'Fog. Perfect for a team that likes to hide.'],
  ['b', 'Shapes in the mist! Is that a player or a lamppost?', ['t', 'Could be both. Lucchetto have tall defenders.']],
  ['t', 'In fog you shout. Call for it. Loud.'],
  ['b', 'The mist is thick at Castelfortezza!']
]);
LN('weather-sun', [
  ['b', 'Glorious sunshine! Not a cloud in the sky!', ['t', 'I forgot my sun cream. Again.']],
  ['t', 'Hard pitch. Ball runs quick. Keep it on the floor.'],
  ['b', 'The heat is shimmering off the stands!'],
  ['t', 'Weather for a siesta. Not for chasing a ball.'],
  ['b', 'Sunshine and football! Is there anything better?', ['t', 'Shade, Barry. Shade is better.']]
]);
LN('idle', [
  ['b', "What do you make of it so far, Trev?", ['t', "It\'s football, Barry. I make football of it."]],
  ['t', 'The key is to keep the ball. If you have the ball, they cannot score. Usually.'],
  ['b', 'Fascinating tactical battle here!', ['t', 'Is it?']],
  ['t', 'Back in my day we had a ball made of leather and regret.'],
  ['b', 'The fans are in fine voice tonight!'],
  ['t', 'Shape is important. Diamond, square, whatever. Just have a shape.'],
  ['b', 'Any predictions, Trev?', ['t', 'Somebody will score. Probably. Or not.']],
  ['t', "Midfield\'s like a kitchen. Somebody\'s got to do the washing up."],
  ['b', 'A cagey spell, this.', ['t', 'Cagey. Like a parrot.']],
  ['t', 'Communication. You have to talk. My wife says I never talk.'],
  ['b', 'The Europhoria Cup. The grandest prize in European football!'],
  ['t', 'The cup is heavier than it looks. I held one once. I was carrying it for someone.'],
  ['b', 'Five against five! Every player matters!', ['t', 'Even the keeper. Especially the keeper.']],
  ['t', 'Patience. Pass, pass, pass, then bang.'],
  ['b', 'What a stadium this is!', ['t', 'Nice seats. Bit small for my knees.']],
  ['t', 'If in doubt, kick it out. Old saying. Bad saying.'],
  ['b', 'Tell us about your playing days, Trev.', ['t', 'Short, Barry. Very short. Mostly in the bath.']]
]);
LN('idle-lead', [
  ['b', '{$score} it is, and the game is still alive!'], ['t', 'A one-goal lead is a dangerous thing. Two is worse. Trust me.'],
  ['b', "The team behind need to throw the kitchen sink at it now!", ['t', 'And the fridge.']], ['t', 'Game management, they call it. I call it kicking it into row Z.'],
  ['b', 'There is a long way to go at {$score}!'], ['t', 'Never write anyone off. Except me, in a sprint.']
]);
LN('idle-smokehouse', [['b', 'The Smokehouse, home of the Kippers. You can smell the smokehouse from here!', ['t', 'I can smell it from home.']], ['t', 'Floodlights powered by fish oil. True story.'], ['b', 'The lighthouse is sweeping its beam over the terraces!']]);
LN('idle-pasapasa', [['b', 'The Estadio Pasapasa, cathedral of the short pass!', ['t', 'Four hundred passes a match. I counted once. Fell asleep.']], ['t', 'They wave white handkerchiefs here. At good play. And at bad referees.'], ['b', 'Solera in the sunshine! What a setting!']]);
LN('idle-stahlpresse', [['b', 'The Stahlpresse Arena! Fifty-two thousand and not one of them sitting down!', ['t', 'The seats are just for decoration.']], ['t', 'They run here. They never stop running. My legs hurt watching.'], ['b', 'The steelworks are glowing behind the stand!']]);
LN('idle-lucchetto', [['b', 'Stadio Lucchetto. The fortress. The padlock. The place where goals come to die.', ['t', 'Cheerful.']], ['t', 'The curva drum has not stopped since the warm-up.'], ['b', 'The old bell tower watches over Castelfortezza!']]);
LN('idle-euphorium', [['b', 'The Euphorium! Gold everywhere! Even the pies are gold!', ['t', 'Twelve quid for a gold pie. I checked.']], ['t', 'Built with money. Lots of money. All of the money.'], ['b', 'Ninety thousand in the Euphorium tonight!']]);
LN('idle-rec', [['t', 'The rec. Where it all began. Mud, cones and a dog called Brian.'], ['b', 'Training at the rec!'], ['t', 'Keep the mud off your kit. Mags does the washing.']]);
/* the PA\'s lines (section 6.17): attendance, scorers, jokes */
EF.PA_LINES = [
  "Good evening, and welcome to {$stadium}. Tonight\'s attendance: {$crowd}.",
  'Would the owner of a minibus with three wheels please move it. It is blocking a tractor.',
  'Lost child at the north stand. His name is Darren. He is forty-four.',
  'The pie stand is now serving. The pies are hot. Some of them.',
  'Please do not feed the seagulls. They are already fed. By you. Every week.',
  'A reminder: flares are not permitted. That includes the big ones.',
  'Will the gentleman who parked his bus in front of the goal please move it.',
  'The half-time draw: ticket number four four seven. Your prize is a kipper.',
  "Today\'s man of the match sponsor is Smoky Joe\'s Kippers. Smoky Joe: we smoke so you don\'t have to.",
  'Please remain in your seats. Please. We are asking nicely.',
  'The referee would like to remind everyone that he can hear you.',
  'Will a member of the medical staff please report to the dugout. Bring biscuits.',
  'A big welcome to our visitors. Please enjoy the weather. You have no choice.',
  'The lost property office has a left boot, a scarf, and a man called Kevin.',
  'Goal for the home side. Scored by {$player}. Time: {$minute} minutes.',
  'Goal scored by {$player}, at {$minute} minutes. Please do not climb the floodlights.',
  'Five minutes of added time. Five. Count them.',
  'Thank you for coming. Mind the steps. Mind the gulls. Mind each other.',
  'The tea bar is closing. The tea bar is always closing.',
  'Would whoever is beating the drum please let somebody else have a go.'
];
