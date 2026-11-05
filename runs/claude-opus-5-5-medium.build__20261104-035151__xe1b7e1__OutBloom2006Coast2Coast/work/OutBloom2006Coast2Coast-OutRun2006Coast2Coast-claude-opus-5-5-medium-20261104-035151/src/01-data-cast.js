/* The cast (rig looks, voices) and every line they say (PLAN §8.5, §8.11). Short, sunny, cheeky: a peppy arcade
 * passenger who is half sweetheart, half backseat driver. OB.line(key, who) picks a variant in turn. */
(() => {
'use strict';
const OB = window.OB;

/* ---- the cast: Humanoid options, colours, the in-car look and the babble voice (31-voice.js) ---- */
OB.CAST = {
  leo: { name: 'Leo', role: 'driver', rig: { build: 'heroic', hair: 'short', outfit: 'shirt', sleeves: 'short', weapon: null, colors: { skin: '#e8b890', hair: '#3a2418', cloth: '#f4f4f0', pants: '#2a3a6a', trim: '#3a8ad8' } }, head: { hair: 'quiff', color: '#3a2418', shades: true, skin: '#e8b890' }, voice: { f0: 150, fmt: .9, rate: 11, wave: 'saw' } },
  lea: { name: 'Lea', role: 'driver', rig: { build: 'heroic', hair: 'ponytail', outfit: 'shirt', sleeves: 'short', weapon: null, colors: { skin: '#f0c8a0', hair: '#e8c060', cloth: '#f4f4f0', pants: '#2a3a6a', trim: '#e84a6a' } }, head: { hair: 'ponytail', color: '#e8c060', shades: true, skin: '#f0c8a0' }, voice: { f0: 240, fmt: 1.05, rate: 12, wave: 'pulse' } },
  marisol: { name: 'Marisol', full: 'Marisol Fontaine', role: 'passenger', bio: 'Florist. Sunny, playful, giggly.', loves: ['balloons', 'gnomes', 'bouquets', 'arches'],
    rig: { hair: 'long', outfit: 'robe', sleeves: 'short', weapon: null, face: { eyes: 'big' }, colors: { skin: '#f0c8a0', hair: '#b8482a', cloth: '#f8d040', trim: '#ffffff' } },
    outfits: [{ name: 'Sundress', cloth: '#f8d040', trim: '#ffffff' }, { name: 'Picnic Gingham', cloth: '#e85a6a', trim: '#ffffff' }],
    head: { hair: 'long', color: '#b8482a', skin: '#f0c8a0', clip: '#f8d040', shades: 'heart' }, voice: { f0: 290, fmt: 1.12, rate: 13, wave: 'pulse', giggle: true }, color: '#f8b030' },
  vivi: { name: 'Vivi', full: 'Vivienne "Vivi" Montclair', role: 'passenger', bio: 'Socialite. Dramatic, demanding, secretly soft.', loves: ['clean', 'speed', 'photo', 'pass'],
    rig: { hair: 'short', outfit: 'coat', sleeves: 'long', weapon: null, colors: { skin: '#f4d8c0', hair: '#141018', cloth: '#f0e8d8', coat: '#f0e8d8', trim: '#e8c060', pants: '#2a2028' } },
    outfits: [{ name: 'Cream Blazer', cloth: '#f0e8d8', trim: '#e8c060' }, { name: 'Gala Gown', cloth: '#8a1a4a', trim: '#f0d080' }],
    head: { hair: 'bob', color: '#141018', skin: '#f4d8c0', scarf: '#e83a6a' }, voice: { f0: 230, fmt: 1, rate: 11, wave: 'saw', swoop: true }, color: '#e83a6a' },
  juni: { name: 'Juni', full: 'Juniper "Juni" Park', role: 'passenger', bio: 'Stunt photographer. Thrill-seeking, fast-talking.', loves: ['close', 'drift', 'ribbons', 'draft'],
    rig: { hair: 'spiky', hat: { style: 'cap', color: '#2a2a3a' }, outfit: 'coat', sleeves: 'long', weapon: null, colors: { skin: '#e8c0a0', hair: '#ff6ab8', cloth: '#6a7a4a', coat: '#6a7a4a', pants: '#3a3a4a' } },
    outfits: [{ name: 'Cargo Jacket', cloth: '#6a7a4a', trim: '#2a2a3a' }, { name: 'Rally Suit', cloth: '#e84a2a', trim: '#f0f0f0' }],
    head: { hair: 'spiky', color: '#ff6ab8', skin: '#e8c0a0', cap: '#2a2a3a' }, voice: { f0: 320, fmt: 1.18, rate: 15, wave: 'pulse', rasp: true }, color: '#ff6ab8' },
  bruno: { name: 'Bruno', full: 'Bruno Brezza', role: 'starter', bio: 'Retired rally champion. Booming, warm, nostalgic.',
    rig: { build: 'bulky', hair: 'short', hat: { style: 'band', color: '#e8d8a8' }, outfit: 'shirt', sleeves: 'short', weapon: null, colors: { skin: '#d8a080', hair: '#b8b8b8', cloth: '#3aa0d8', trim: '#f8d040', pants: '#e8e0c8' } },
    voice: { f0: 110, fmt: .8, rate: 10, wave: 'saw' }, color: '#3aa0d8' },
  kiki: { name: 'Kiki', full: 'Kiki Rapido', role: 'rival', rig: { hair: 'short', weapon: null, colors: { hair: '#5ad04a', cloth: '#2a2a2a', skin: '#f0c8a0' } }, voice: { f0: 270, fmt: 1.1, rate: 14, wave: 'pulse' }, color: '#8ae04a', car: { model: 'gardenia', paint: '#9ae84a' } },
  brambles: { name: 'The Brambles', full: 'Bram and Basil Bramble', role: 'rival', rig: { build: 'bulky', hair: 'short', weapon: null, colors: { hair: '#6a4a2a', cloth: '#3a5a9a' } }, voice: { f0: 125, fmt: .85, rate: 11, wave: 'saw' }, color: '#c87a3a', car: { model: 'magnolia', paint: '#c87a3a' } },
  lustres: { name: 'The Lustres', full: 'Lance and Lacey Lustre', role: 'rival', rig: { hair: 'short', weapon: null, colors: { hair: '#f0d070', cloth: '#d8b040' } }, voice: { f0: 140, fmt: .95, rate: 12, wave: 'saw' }, color: '#e8c040', car: { model: 'magnolia', paint: '#e0b840' } },
  ottavio: { name: 'Ottavio', full: 'Old Ottavio', role: 'rival', rig: { hair: 'bald', hat: { style: 'band', color: '#3a2a4a' }, weapon: null, colors: { hair: '#f0f0f0', cloth: '#8a2a3a' } }, voice: { f0: 100, fmt: .85, rate: 9, wave: 'saw' }, color: '#8a2a3a', car: { model: 'primavera', paint: '#8a2a3a' } },
  lanternSeller: { name: 'Nonna Luce', role: 'local', rig: { hair: 'long', outfit: 'robe', weapon: null, colors: { hair: '#d8d8e0', cloth: '#c83a5a', trim: '#ffcf4a' } }, voice: { f0: 210, fmt: .95, rate: 10, wave: 'saw' }, color: '#ffb040' },
  bride: { name: 'Rosa the Bride', role: 'local', rig: { hair: 'ponytail', outfit: 'robe', weapon: null, colors: { hair: '#5a3a2a', cloth: '#ffffff', trim: '#ffd6e8' } }, voice: { f0: 260, fmt: 1.08, rate: 12, wave: 'pulse' }, color: '#ffd6e8' },
  valet: { name: 'Giacomo the Valet', role: 'local', rig: { hair: 'short', hat: 'cap', outfit: 'coat', weapon: null, colors: { hair: '#2a2a2a', cloth: '#8a1a2a', coat: '#8a1a2a', trim: '#ffd040' } }, voice: { f0: 135, fmt: .9, rate: 11, wave: 'saw' }, color: '#c83a3a' },
  astronomer: { name: 'Dr. Stella Vega', role: 'local', rig: { hair: 'short', outfit: 'coat', weapon: null, colors: { hair: '#8a5a3a', cloth: '#3a3a6a', coat: '#e8e8f0' } }, voice: { f0: 220, fmt: 1, rate: 10, wave: 'saw' }, color: '#a0a0ff' },
  keeper: { name: 'Old Faro', role: 'local', rig: { build: 'bulky', hair: 'bald', hat: { style: 'cap', color: '#2a3a6a' }, weapon: null, colors: { hair: '#e0e0e0', cloth: '#3a5a8a' } }, voice: { f0: 105, fmt: .82, rate: 9, wave: 'saw' }, color: '#5a8ad0' },
  announcer: { name: 'Announcer', voice: { f0: 150, fmt: .9, rate: 9, wave: 'saw' } }
};
OB.PASSENGERS = ['marisol', 'vivi', 'juni'];
OB.DRIVERS = ['leo', 'lea'];
OB.GIVERS = ['bruno', 'marisol', 'vivi', 'juni'];

/* ---- the line bank: LINES[key][who] = [variants] (who 'any' when shared) ---- */
OB.LINES = {
  start: { marisol: ['Coast to coast? With you? Let\'s GO!', 'Sunscreen on, hair up. Drive!', 'Ooh, I packed us snacks!', 'Today is going to bloom!'],
    vivi: ['Darling, do try not to dent anything.', 'Sunset at the far coast. Don\'t be late.', 'I wore white. Choose your puddles wisely.', 'Well? The island won\'t cross itself.'],
    juni: ['Okay okay okay, get me some ACTION!', 'Camera\'s charged. Make it worth it!', 'Floor it! I want motion blur!', 'Best day ever starts... NOW!'],
    bruno: ['Morning, champ! The west coast is waiting!', 'Ho ho! Go chase that sunset!', 'Ready, champ? The road is yours!'] },
  perfect: { marisol: ['Eee! You\'re amazing!', 'Again, again!', 'Perfect! I\'m blushing!', 'Hee! My hero!'], vivi: ['Now THAT is how one arrives!', 'Flawless. As expected of my driver.', 'Bravo, darling. Bravo.', 'I may swoon. Briefly.'],
    juni: ['Best shot of my LIFE!', 'YES! Frame it! Frame it!', 'You\'re a legend, okay?!', 'Chef\'s kiss! Pure chaos!'] },
  great: { marisol: ['Yay! So good!', 'That was lovely!', 'Woo! Nicely done!'], vivi: ['Hmm. Adequate. Barely.', 'Rather good, actually.', 'I\'ll allow it.'], juni: ['Sick! Almost perfect!', 'Nice nice nice!', 'Ooh, that\'s a keeper!'] },
  good: { marisol: ['Not bad! Next one!', 'Good try, sweetie!', 'Ok! We\'ll do better!'], vivi: ['Passable.', 'One has seen worse.', 'Hmm. Fine.'], juni: ['Eh, it\'s a B-roll shot.', 'Okay, okay. More!', 'Meh-plus!'] },
  miss: { marisol: ['Aww... you missed so many.', 'Oh no! Never mind!', 'Pout. Next time!'], vivi: ['Unacceptable.', 'I shall pretend I didn\'t see.', 'Darling. No.'], juni: ['Boooring. Give me danger!', 'Lame! Do it again!', 'Ugh, missed the shot!'] },
  bump: { marisol: ['Eep! Careful!', 'Oof! My snacks!'], vivi: ['Was that a... car? Unacceptable.', 'My hair, darling. MY HAIR.'], juni: ['Ha! Bumper cars!', 'Ooh, crunchy!'] },
  crash: { marisol: ['Kyaaa! My hair!', 'Kyaaa! The world is spinning!'], vivi: ['Kyaaa! Never again!', 'I am NOT amused!'], juni: ['WHOAAA! Do it again!', 'Kyaaa! Got it on camera!'] },
  nearmiss: { marisol: ['Eek! Too close!', 'Heart attack!'], vivi: ['Must you?', 'That was... thrilling.'], juni: ['WHOA, did you see that?!', 'Closer! Closer!'] },
  air: { marisol: ['Wheee!', 'We\'re flying!'], vivi: ['My stomach, darling!', 'Gracefully, please!'], juni: ['We\'re FLYING!', 'AIR TIME!'] },
  drift: { marisol: ['Ooh, sideways!', 'Wheee, so smooth!'], vivi: ['Elegant. Mostly.', 'Very dramatic. I approve.'], juni: ['SMOKE! I love it!', 'Drift king!'], bruno: ['Ho ho! You drift like my rally days!'] },
  slingshot: { marisol: ['Zoom!', 'Bye bye!'], vivi: ['Excuse us.', 'Make way.'], juni: ['Slingshot! YES!', 'See ya!'] },
  forkL: { marisol: ['Left! I want to smell the flowers!', 'Go left, sweetie!'], vivi: ['Left, darling. The view is better.', 'Left. Trust me.'], juni: ['Left! Looks gnarly!', 'Hang a left!'] },
  forkR: { marisol: ['Right! Ooh, right, please!', 'Right way, right way!'], vivi: ['Right, the cliffs. Everyone who matters goes that way.', 'Right. Obviously.'], juni: ['Right! More danger!', 'Go right, go right!'] },
  prefOk: { marisol: ['Yay! You listened!', 'Hee! Thank you!'], vivi: ['Good. You listen.', 'Correct choice.'], juni: ['Yesss! Good call!', 'You get me!'] },
  prefNo: { marisol: ['Hmph.', 'Oh... okay then.'], vivi: ['Hmph. Noted.', 'We\'ll discuss this later.'], juni: ['Boo! Fine.', 'Hmph. Your loss.'] },
  checkpoint: { marisol: ['Smell that? Flowers everywhere!', 'Next stop, sunshine!', 'We made it! Keep going!'], vivi: ['On schedule. Barely.', 'Onward, darling.', 'Another checkpoint. How quaint.'], juni: ['New scenery! New shots!', 'Checkpoint! Let\'s GO!', 'Keep it up!'] },
  lowtime: { marisol: ['Hurry, the sun\'s slipping!', 'Faster, faster!'], vivi: ['Faster. I refuse to arrive second.', 'The clock, darling. THE CLOCK.'], juni: ['Floor it! We\'re out of time!', 'Go go go!'] },
  goal: { marisol: ['We did it! Coast to coast!', 'Eee! We\'re here!'], vivi: ['We have arrived. Splendidly.', 'And not a minute late.'], juni: ['That\'s a wrap! Epic!', 'WE MADE IT!'] },
  timeup: { marisol: ['Oh... the sun set.', 'Aww. Next time?'], vivi: ['Sigh. The sun waits for no one.', 'We are late. How dreadful.'], juni: ['Nooo! The light\'s gone!', 'Lost the golden hour...'] },
  horn: { marisol: ['Beep beep!', 'Hello there!'], vivi: ['Must you honk?', 'Move, please.'], juni: ['HONK HONK!', 'Out of the way!'] },
  fullbloom: { marisol: ['Full bloom! I\'m in love!', 'Everything\'s blooming!'], vivi: ['Now THIS is style.', 'Magnificent.'], juni: ['FULL BLOOM! Insane!', 'We\'re on fire!'] },
  hello: { marisol: ['Hi! I\'m Marisol!', 'Let\'s go see the flowers!'], vivi: ['Vivienne. Charmed.', 'Do drive nicely.'], juni: ['Juni! Let\'s get wild!', 'Ready for action!'] },
  missionWin: { bruno: ['Mamma mia, what a finish!', 'Ho ho! That\'s my champ!', 'Splendido!'], marisol: ['Eee! You did it!', 'Hee! Thank you!'], vivi: ['Splendid. As planned.', 'Well done, darling.'], juni: ['That\'s the shot!', 'You absolute legend!'] },
  missionFail: { bruno: ['Again, champ! Even I spun out in \'79.', 'Close! Have another go!'], marisol: ['Aww, try again?', 'So close!'], vivi: ['Again. Properly this time.', 'We do not speak of this.'], juni: ['Re-take! Again!', 'Almost had it!'] },
  ann: { announcer: ['CHECKPOINT!', 'TIME EXTENDED!', 'GOAL!', 'FULL BLOOM!', 'PERFECT START!', 'NEW RECORD!'] }
};
// the request intro, one per type per passenger
OB.REQ_LINES = {
  pass: { marisol: 'Pass them! Pass them all!', vivi: 'Overtake these slowpokes, darling.', juni: 'Weave through! Fast!' },
  drift: { marisol: 'Slide for me! Pretty please!', vivi: 'Something dramatic, please.', juni: 'DRIFT! Sideways! Now!' },
  ribbons: { marisol: 'Ooh, wedding ribbons! Cut them!', vivi: 'Through the middle. Elegantly.', juni: 'Split \'em right down the middle!' },
  balloons: { marisol: 'Ooh, balloons! Pop them all for me!', vivi: 'Balloons? How festive. Pop them.', juni: 'Pop pop pop! Go!' },
  gnomes: { marisol: 'Gnomes! Bonk them home!', vivi: 'Garden gnomes? Remove them.', juni: 'BONK! Gnome bowling!' },
  bees: { marisol: 'Bees! Don\'t let them sting us!', vivi: 'Insects. Avoid them. At once.', juni: 'Bee swarm! Dodge it!' },
  cones: { marisol: 'Zig-zag the cones!', vivi: 'Slalom, darling. Gracefully.', juni: 'Slalom time! Tight lines!' },
  arches: { marisol: 'Flower arches! Drive through!', vivi: 'Through every arch, please.', juni: 'Thread the arches!' },
  speed: { marisol: 'Faster! I want wind in my hair!', vivi: 'Faster. I refuse to arrive second.', juni: 'Keep it pinned! Flat out!' },
  clean: { marisol: 'Careful now, no bumps!', vivi: 'Not a scratch, darling. Not one.', juni: 'Clean lines only. Pro mode!' },
  draft: { marisol: 'Tuck in behind them!', vivi: 'Follow closely. Like a shadow.', juni: 'Draft! Get in that slipstream!' },
  close: { marisol: 'Eek, so close to the cars!', vivi: 'A little danger. Just a little.', juni: 'Closer! Closer! I need the shot!' },
  bouquets: { marisol: 'Bouquets! Grab them all!', vivi: 'Collect the flowers. For me.', juni: 'Snatch the bouquets!' },
  photo: { marisol: 'Stop! Photo! Smile!', vivi: 'Stop in the box. Pose.', juni: 'Stop in the box, I click, we fly!' }
};
// goal ending lines: ENDING_LINES[goal][mood][passenger]
OB.ENDING_LINES = {
  A: { bloom: { marisol: 'Look! The sky is full of lanterns!', vivi: 'A thousand lanterns. For us? Darling.', juni: 'THE light. THE shot. Perfect.' },
    bud: { marisol: 'Let\'s make a wish together.', vivi: 'One lantern. How intimate.', juni: 'Okay, one lantern is still cute.' },
    wilt: { marisol: 'You owe me gelato.', vivi: 'Gelato. Two scoops. Now.', juni: 'Missed it! Gelato as payment.' } },
  B: { bloom: { marisol: 'I caught it! Don\'t get any ideas. Yet.', vivi: 'The bouquet chose me. Naturally.', juni: 'Caught it! And the photo! Both!' },
    bud: { marisol: 'Cake! I love weddings!', vivi: 'Cake with strangers. Rather fun.', juni: 'Free cake! Best crash ever!' },
    wilt: { marisol: 'We\'re soaked! Hee hee!', vivi: 'My hair! ...Fine, this is funny.', juni: 'Soaked! Run run run!' } },
  C: { bloom: { marisol: 'Fireworks! For us?!', vivi: 'Flashbulbs. At last, the welcome I deserve.', juni: 'Red carpet! Get my good side!' },
    bud: { marisol: 'Ooh, a valet! Fancy!', vivi: 'The valet bowed. Acceptable.', juni: 'Valet parking! So fancy!' },
    wilt: { marisol: 'Noodles are better anyway!', vivi: 'Noodles. Don\'t tell anyone I love them.', juni: 'Street noodles! The real deal!' } },
  D: { bloom: { marisol: 'Make a wish! Make ALL the wishes!', vivi: 'A meteor shower. Very well, I\'m impressed.', juni: 'Long exposure! Hold still!' },
    bud: { marisol: 'One star! I wished for you.', vivi: 'One star is enough for a wish.', juni: 'Got it! One perfect streak!' },
    wilt: { marisol: 'Cocoa! Clouds are cosy too.', vivi: 'Cocoa. With marshmallows, please.', juni: 'Clouds?! ...Cocoa\'s good though.' } },
  E: { bloom: { marisol: 'The green flash! Best. Day. Ever.', vivi: 'The green flash. I\'ll never forget it.', juni: 'GREEN FLASH! Nobody believes it till they see it!' },
    bud: { marisol: 'Just in time! Look, look!', vivi: 'The last sliver. We made it.', juni: 'Last light! Still counts!' },
    wilt: { marisol: 'Brr! Share your jacket?', vivi: 'Your jacket, darling. Now.', juni: 'Freezing! Jacket, please!' } }
};
OB.LOCAL_LINES = { lanternSeller: 'Lanterns! One for the happy couple?', bride: 'Oh! Who invited you? Come in, come in!', valet: 'Welcome to the Grand Hotel Vespera.', astronomer: 'Look up. Keep looking up.', keeper: 'You made it before dark. Mostly.' };
// Tour story beats
OB.TOUR_LINES = {
  intro: ['Welcome to the Coast 2 Coast Tour, champ!', 'The sunniest race on Earth. Postcards come from all over the island.', 'Clear them, earn seeds, plant them in the Garage Garden!'],
  givers: {
    bruno: { intro: 'In my day I won this island\'s rally three times. Let\'s see your stuff!', outro: 'You drive like the wind, champ. I\'m proud.' },
    marisol: { intro: 'Hi! I run the flower stall by the strand. I need help!', outro: 'You\'re the sweetest driver on the island. Hee!' },
    vivi: { intro: 'Vivienne Montclair. I have standards. Meet them.', outro: 'Darling... you\'ve exceeded them. Don\'t let it go to your head.' },
    juni: { intro: 'Juni! Stunt photographer! I need shots nobody else can get!', outro: 'My portfolio is ON FIRE. Thanks, legend!' }
  },
  finale: ['To the road, and to whoever\'s beside you on it!', 'Say "fiori"!', 'Same time next year, champ?']
};

let counters = {};
/** a line for an event and a speaker, in turn through its variants; vars fill {name} */
OB.line = (key, who, vars) => {
  const set = OB.LINES[key]; let list = set && (set[who] || set.any);
  if (!list) return '';
  const k = key + ':' + who, i = (counters[k] = (counters[k] || 0) + 1) - 1;
  let s = list[i % list.length];
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, n) => vars[n] !== undefined ? vars[n] : m);
  return s;
};
OB.resetLines = () => { counters = {}; };
})();
