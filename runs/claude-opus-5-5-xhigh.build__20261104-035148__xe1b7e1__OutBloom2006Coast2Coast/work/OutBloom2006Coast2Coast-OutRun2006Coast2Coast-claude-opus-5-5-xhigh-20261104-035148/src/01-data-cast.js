/* OutBloom — the cast and every line they say. Short, sunny, cheeky: a peppy passenger who is half sweetheart, half
 * backseat driver. Call-outs are caps and short; spoken lines stay under about 40 characters. OB.line(key, vars)
 * picks a variant (seeded, so a moment always sounds the same in a replay). */
(() => {
'use strict';
const OB = window.OB;

/* rig: E.Humanoid options; voice: babble parameters (base pitch, formant scale, syllables a second, wave, quirk) */
OB.CAST = {
  leo: { name: 'Leo', role: 'driver', rig: { build: 'heroic', hair: 'short', outfit: 'shirt', sleeves: 'short', weapon: null, colors: { skin: '#e8b890', hair: '#3a2418', cloth: '#f4f0e8', pants: '#3a4a6a', trim: '#5ab0e8' } }, shades: '#2a2a32', voice: { f0: 125, fs: .85, rate: 11, wave: 'saw' } },
  lea: { name: 'Lea', role: 'driver', rig: { build: 'heroic', hair: 'ponytail', outfit: 'shirt', sleeves: 'short', weapon: null, colors: { skin: '#f0c8a0', hair: '#c8803a', cloth: '#ffffff', pants: '#3a4a6a', trim: '#ff7ab8' } }, shades: '#2a2a32', voice: { f0: 240, fs: 1.05, rate: 12, wave: 'pulse' } },
  marisol: { name: 'Marisol', full: 'Marisol Fontaine', role: 'passenger', bio: 'Florist. Sunny, playful, giggly.', loves: ['balloons', 'gnomes', 'bouquets', 'arches'], color: '#ff9a3a',
    rig: { build: 'heroic', hair: 'long', outfit: 'robe', sleeves: 'short', weapon: null, face: { eyes: 'big' }, colors: { skin: '#f0c8a0', hair: '#a8402a', cloth: '#ffd23a', trim: '#ff7ab8', pants: '#ffd23a' } },
    outfits: [{ name: 'Sundress', cloth: '#ffd23a', trim: '#ff7ab8' }, { name: 'Picnic Gingham', cloth: '#ff6a7a', trim: '#ffffff' }], voice: { f0: 290, fs: 1.12, rate: 13, wave: 'pulse', quirk: 'hee' } },
  vivi: { name: 'Vivi', full: 'Vivienne "Vivi" Montclair', role: 'passenger', bio: 'Socialite. Dramatic, demanding, secretly soft.', loves: ['clean', 'speed', 'photo', 'pass'], color: '#c8a0f0',
    rig: { build: 'heroic', hair: 'short', outfit: 'coat', sleeves: 'long', weapon: null, face: { eyes: 'big' }, colors: { skin: '#f4d8c0', hair: '#141218', cloth: '#f4ead8', coat: '#f0e4d0', trim: '#c8a0f0', pants: '#2a2430' } },
    outfits: [{ name: 'Cream Blazer', cloth: '#f4ead8', coat: '#f0e4d0', trim: '#c8a0f0' }, { name: 'Gala Gown', cloth: '#7a2a8a', coat: '#8a3a9a', trim: '#ffd8f8' }], voice: { f0: 230, fs: 1, rate: 11, wave: 'saw', quirk: 'swoop' } },
  juni: { name: 'Juni', full: 'Juniper "Juni" Park', role: 'passenger', bio: 'Stunt photographer. Thrill-seeking, fast-talking.', loves: ['close', 'drift', 'ribbons', 'draft'], color: '#ff5fa2',
    rig: { build: 'heroic', hair: 'spiky', hat: { style: 'cap', color: '#3a3a4a' }, outfit: 'coat', sleeves: 'long', weapon: null, face: { eyes: 'big' }, colors: { skin: '#e8c0a0', hair: '#ff6ab0', cloth: '#5a6a3a', coat: '#6a7a4a', trim: '#ffd23a', pants: '#3a3a4a' } },
    outfits: [{ name: 'Cargo Jacket', cloth: '#5a6a3a', coat: '#6a7a4a', trim: '#ffd23a' }, { name: 'Rally Suit', cloth: '#ff5a3a', coat: '#ff6a4a', trim: '#ffffff' }], voice: { f0: 320, fs: 1.18, rate: 15, wave: 'pulse12', quirk: 'rasp' } },
  bruno: { name: 'Bruno', full: 'Bruno Brezza', role: 'starter', bio: 'Retired rally champion. Runs the festival tour.', color: '#ffd23a',
    rig: { build: 'bulky', hair: 'short', hat: { style: 'band', color: '#e8d8a8' }, outfit: 'shirt', sleeves: 'short', weapon: null, colors: { skin: '#d8a070', hair: '#d8d8d8', cloth: '#ff7a3a', trim: '#ffd23a', pants: '#e8e0c8' } }, voice: { f0: 110, fs: .8, rate: 10, wave: 'saw', quirk: 'laugh' } },
  kiki: { name: 'Kiki', full: 'Kiki Rapido', role: 'rival', color: '#a8e040', rig: { build: 'heroic', hair: 'short', outfit: 'coat', weapon: null, colors: { skin: '#f0c8a0', hair: '#5ae05a', cloth: '#2a2a32', coat: '#a8e040', trim: '#ffffff' } }, voice: { f0: 270, fs: 1.1, rate: 14, wave: 'pulse' } },
  bram: { name: 'Bram & Basil', full: 'The Bramble Brothers', role: 'rival', color: '#a87a4a', rig: { build: 'bulky', hair: 'short', outfit: 'shirt', weapon: null, colors: { skin: '#e0a880', hair: '#8a5a2a', cloth: '#5a7ab0', pants: '#5a7ab0', trim: '#ffd23a' } }, voice: { f0: 125, fs: .82, rate: 10, wave: 'saw' } },
  lance: { name: 'Lance & Lacey', full: 'Lance and Lacey Lustre', role: 'rival', color: '#e8c050', rig: { build: 'heroic', hair: 'short', outfit: 'coat', weapon: null, colors: { skin: '#f0d0b0', hair: '#f0d070', cloth: '#e8c050', coat: '#e8c050', trim: '#ffffff' } }, voice: { f0: 140, fs: .9, rate: 11, wave: 'saw' } },
  lacey: { name: 'Lacey', role: 'rival', rig: { build: 'heroic', hair: 'long', outfit: 'robe', weapon: null, colors: { skin: '#f0d0b0', hair: '#f8e0a0', cloth: '#e8c050', trim: '#ffffff' } }, voice: { f0: 250, fs: 1.05, rate: 12, wave: 'pulse' } },
  ottavio: { name: 'Ottavio', full: 'Old Ottavio', role: 'rival', color: '#a83a4a', rig: { build: 'heroic', hair: 'bald', hat: { style: 'band', color: '#2a2a3a' }, outfit: 'shirt', weapon: null, hunch: .2, colors: { skin: '#e0b090', hair: '#f4f4f4', cloth: '#7a1a2a', trim: '#f4f4f4', pants: '#3a3a4a' } }, voice: { f0: 100, fs: .78, rate: 8, wave: 'saw', quirk: 'waver' } },
  announcer: { name: 'Announcer', role: 'voice', voice: { f0: 150, fs: .9, rate: 9, wave: 'saw', reverb: true } },
  local: { name: 'Local', role: 'local', rig: { build: 'heroic', hair: 'short', outfit: 'shirt', weapon: null, colors: { skin: '#d8a880', hair: '#2a2a2a', cloth: '#3a8ae8', trim: '#ffffff' } }, voice: { f0: 170, fs: .95, rate: 11, wave: 'pulse' } }
};
OB.PASSENGERS = ['marisol', 'vivi', 'juni'];
OB.DRIVERS = ['leo', 'lea'];

/* ---- the line bank: L[who][event] = [variants] ---- */
const L = OB.LINES = {
  marisol: {
    start: ['Coast to coast? With you? Let\'s GO!', 'Sunrise and you. Perfect start!', 'Hee! I packed snacks. Drive!', 'The whole island is blooming!'],
    req_balloons: ['Ooh, balloons! Pop them all for me!', 'Balloons! Pop pop pop!', 'Get those balloons, sweetie!', 'Heart balloons! For ME?'],
    req_gnomes: ['Gnomes! Bonk the little guys!', 'Boop those gnomes, quick!', 'Little hats everywhere! Get them!', 'Gnome patrol! Go go go!'],
    req_bouquets: ['Flowers! Grab every bouquet!', 'Bouquets! I want them all!', 'Pick me some flowers!', 'Ooh, petals! Scoop them up!'],
    req_arches: ['Drive through the flower arches!', 'Arches! Thread them all!', 'Under the arches, please!', 'Flower arches! So pretty!'],
    req_pass: ['Pass {n} cars! You can do it!', 'Zoom past them! {n} cars!', 'Overtake {n}, sweetie!', 'Leave {n} cars behind us!'],
    req_drift: ['Slide for me! Do the swooshy thing!', 'Drift! Make the tyres sing!', 'Ooh, do a big drift!', 'Sideways, please! Hee!'],
    req_ribbons: ['Cut the ribbons between those cars!', 'Snip the ribbons! Go!', 'Ribbons! Right through the middle!', 'Thread the pink ribbons!'],
    req_bees: ['Bees! Don\'t let them sting us!', 'Eek, bees! Dodge them!', 'Buzz buzz! Swerve, swerve!', 'Bees! Keep my hair safe!'],
    req_cones: ['Weave the cones! Left, right!', 'Slalom! Wiggle wiggle!', 'Cones! Dance around them!', 'Zigzag the cones for me!'],
    req_speed: ['Keep it over {v}! Wheee!', 'Fast! Stay above {v}!', 'Don\'t drop under {v}!', 'Speedy speedy! Over {v}!'],
    req_clean: ['Not a scratch! Promise?', 'Careful now! No bumps!', 'Smooth and clean, okay?', 'Gentle! Not a scratch!'],
    req_draft: ['Tuck behind a car! The wind!', 'Slipstream! Stay close!', 'Hide in their wind!', 'Draft them! Like ducklings!'],
    req_close: ['Close calls! Brush past them!', 'Squeak past those cars!', 'Ooh, get close! Closer!', 'Near misses! Scary fun!'],
    req_photo: ['Stop for a photo! Pretty spot!', 'Photo! Stop in the box!', 'Pull over, picture time!', 'Smile! Stop right there!'],
    perfect: ['Eee! You\'re amazing!', 'Again, again!', 'Perfect! I\'m swooning!', 'Hee! Best driver ever!'],
    great: ['Yay! So good!', 'Great job, sweetie!', 'Ooh, nicely done!', 'That was lovely!'],
    good: ['Not bad! Hee!', 'Okay, okay, cute.', 'Good try, sweetie!', 'Close enough. I guess!'],
    miss: ['Aww… you missed so many.', 'Oh. Oh well!', 'Hmm. Next time, okay?', 'Aww, my balloons…'],
    bump: ['Oof! Careful!', 'Eep! Bumpy!', 'Hey, gently!', 'Watch it, sweetie!'],
    crash: ['Kyaaa! My hair!', 'Kyaa! We\'re spinning!', 'Whoa-whoa-whoa!', 'Kyaaa! My flowers!'],
    nearmiss: ['Eek! So close!', 'Whoosh! Hee!', 'My heart! Again!', 'Squeaky!'],
    air: ['Wheee! We flew!', 'Flying flowers!', 'Hee! My tummy!', 'Up up and away!'],
    fork_left: ['Left! I want to smell the lavender!', 'Go left, please!', 'Left way! Prettier!', 'Left, left, left!'],
    fork_right: ['Right! I hear it\'s lovely!', 'Go right, sweetie!', 'Right way! Trust me!', 'Right, please! Hee!'],
    fork_yes: ['Yay! You listened!', 'Hee! My hero!', 'Good choice!', 'You know me so well!'],
    fork_no: ['Hmph.', 'Oh. Okay then.', 'Fine. Your way.', 'Hmm! Noted.'],
    checkpoint: ['More time! Woo!', 'New view! Look!', 'Ooh, this part\'s pretty!', 'Keep going, keep going!'],
    lowtime: ['Hurry, the sun\'s slipping!', 'Faster! Sunset soon!', 'Time\'s almost up!', 'Go go go!'],
    goal: ['We made it! Hee!', 'Coast to coast! Yay!', 'Best day ever!', 'Look at that view!'],
    timeup: ['Aww. The sun set.', 'Oh… we missed it.', 'Next time, okay?', 'At least the stars came out.']
  },
  vivi: {
    start: ['Darling, do try not to dent anything.', 'Drive. Elegantly, please.', 'Coast to coast. Don\'t bore me.', 'I expect to arrive glowing.'],
    req_balloons: ['Balloons. Pop them. Charmingly.', 'Darling, those balloons. Now.', 'Pop the balloons, would you?', 'How festive. Pop them all.'],
    req_gnomes: ['Those gnomes offend me. Bonk.', 'Gnomes! Remove them, darling.', 'Bonk the tacky gnomes.', 'Gnomes. Ugh. Hit them.'],
    req_bouquets: ['Bouquets! I deserve them.', 'Collect my flowers, darling.', 'Every bouquet. For me.', 'Flowers, darling. All of them.'],
    req_arches: ['Through the arches. Gracefully.', 'Arches, darling. Thread them.', 'Drive under the arches.', 'A grand entrance. Arches!'],
    req_pass: ['Pass {n} cars. I refuse traffic.', '{n} cars. Leave them behind.', 'Overtake {n}, darling.', 'Beneath us. All {n} of them.'],
    req_drift: ['A drift, darling. With flair.', 'Slide. Make it dramatic.', 'Show me a proper drift.', 'Drift. I want to feel it.'],
    req_ribbons: ['Cut those ribbons. Opening night!', 'Ribbons! I\'m the guest of honour.', 'Snip the ribbons, darling.', 'Through the ribbons. Darling!'],
    req_bees: ['Bees? Absolutely not. Dodge.', 'Keep those bees off my silk!', 'Bees! Swerve, darling!', 'If I\'m stung, we\'re done.'],
    req_cones: ['Weave the cones. Daintily.', 'A slalom. Precisely, please.', 'Cones! Left, right, darling.', 'Thread the cones. With poise.'],
    req_speed: ['Faster. I refuse to arrive second.', 'Over {v}, darling. Always.', 'Never below {v}. Never.', 'Speed, darling. Over {v}.'],
    req_clean: ['Not a scratch, darling. Not one.', 'This car is spotless. Keep it.', 'Clean driving. I insist.', 'Touch nothing, darling.'],
    req_draft: ['Follow them. Close. Discreetly.', 'Slipstream, darling. Stay close.', 'Shadow that car, darling.', 'Tuck in. Very chic.'],
    req_close: ['Close calls? How thrilling.', 'Brush past them, darling.', 'Closer. I adore danger.', 'Near misses. Make me gasp.'],
    req_photo: ['Stop. My good side, please.', 'Photo, darling. Stop here.', 'Halt! I must be photographed.', 'Pull in. This is my light.'],
    perfect: ['Now THAT is how one arrives!', 'Divine, darling. Divine.', 'Perfection. As expected.', 'Bravo! Encore!'],
    great: ['Hmm. Adequate. Barely.', 'Rather good, darling.', 'I\'ll allow it.', 'Mm. Not bad at all.'],
    good: ['Passable.', 'Darling… we\'ll work on it.', 'That was… a choice.', 'Fine. Fine.'],
    miss: ['Unacceptable, darling.', 'I\'m not angry. I\'m disappointed.', 'Did you even try?', 'Tragic. Simply tragic.'],
    bump: ['Was that a… car? Unacceptable.', 'Darling! The paint!', 'Must you?', 'Ugh. A bump.'],
    crash: ['Darling! My HAIR!', 'Kyaaa! Not the silk!', 'Stop spinning me!', 'This is NOT a waltz!'],
    nearmiss: ['Ooh. Daring.', 'My, my!', 'Thrilling, darling.', 'Hold my pearls!'],
    air: ['We\'re airborne? Chic.', 'Darling, we flew!', 'Flying first class!', 'Whoa. Glamorous.'],
    fork_left: ['Left, darling. The scenic way.', 'Go left. I\'ve decided.', 'Left. Trust my taste.', 'Left. Obviously.'],
    fork_right: ['Right, the cliffs. Everyone who matters goes that way.', 'Right, darling. Bolder.', 'Go right. Now.', 'Right. It\'s more me.'],
    fork_yes: ['Good. You listen.', 'Excellent taste, darling.', 'Mm. Correct.', 'You may keep driving.'],
    fork_no: ['Hmph.', 'Noted, darling. Noted.', 'Interesting choice. Wrong.', 'I\'ll remember that.'],
    checkpoint: ['More time. How generous.', 'A new scene. Lovely.', 'Keep it up, darling.', 'Marvellous. Onward.'],
    lowtime: ['Darling, the sunset waits for no one!', 'Faster. We\'re nearly late.', 'Tick tock, darling!', 'Hurry. Fashionably, but hurry.'],
    goal: ['Now that\'s an entrance.', 'We\'ve arrived. Gloriously.', 'Darling, you were divine.', 'Applause, please.'],
    timeup: ['We\'re late. Unforgivable.', 'The sun set without me?', 'Darling. Really.', 'Next time. Earlier.']
  },
  juni: {
    start: ['Okay okay okay, get me some ACTION!', 'Camera\'s ready! GO GO GO!', 'Let\'s make some highlights!', 'Floor it! I need footage!'],
    req_balloons: ['Balloons! Pop \'em for the reel!', 'POP POP POP! Go!', 'Smash the balloons!', 'Balloon carnage! Yes!'],
    req_gnomes: ['Gnome bowling! Strike!', 'Bonk the gnomes! Ha!', 'Gnomes! Send them flying!', 'Hit \'em! Gnome-geddon!'],
    req_bouquets: ['Grab the flowers! Fast!', 'Bouquets! Snatch \'em!', 'Flower run! Go!', 'Collect \'em all!'],
    req_arches: ['Thread the arches! Tight!', 'Through the arches! Nail it!', 'Arches! Cinematic!', 'Under under under!'],
    req_pass: ['Pass {n}! Burn \'em!', 'Overtake {n}! Hurry!', '{n} cars! Smoke \'em!', 'Pass, pass, pass! {n}!'],
    req_drift: ['DRIFT! Smoke for the camera!', 'Go sideways! Big angle!', 'Drift! Make it smoky!', 'Slide it! Slide it!'],
    req_ribbons: ['Cut the ribbons! So sick!', 'Ribbons! Split \'em!', 'Through the gap! Ribbon!', 'Snip snip! Go!'],
    req_bees: ['Bees! Dodge! Dodge!', 'Killer bees! Swerve!', 'Bee swarm! Go around!', 'BEES! Not the lens!'],
    req_cones: ['Slalom! Tight lines!', 'Weave! Make it crisp!', 'Cones! Wiggle it!', 'Zigzag! Quick!'],
    req_speed: ['Stay over {v}! Blur it!', 'Fast! Over {v}!', 'Pin it! {v} plus!', 'Max speed! Over {v}!'],
    req_clean: ['Clean run. For once.', 'No scratches, okay?', 'Smooth! The gimbal!', 'Keep it clean!'],
    req_draft: ['Draft \'em! Nose to tail!', 'Slipstream! Get close!', 'Tuck in! Then whip out!', 'Ride their wake!'],
    req_close: ['Closer! Closer! I need the shot!', 'Near misses! Make me scream!', 'Brush \'em! Close!', 'Danger shots! Go!'],
    req_photo: ['Stop! Golden light! Box!', 'Photo! Stop in the box!', 'Freeze! Perfect frame!', 'Brake! Shot of the year!'],
    perfect: ['Best shot of my LIFE!', 'That\'s the cover! YES!', 'Insane! Perfect!', 'Viral! So viral!'],
    great: ['Sick! Great stuff!', 'Nice! Nice nice nice!', 'Ooh, that\'s good footage!', 'Solid! Love it!'],
    good: ['Eh, usable.', 'Meh. Bit blurry.', 'It\'s fine. Probably.', 'Could crop it.'],
    miss: ['Boooring. Give me danger!', 'Nothing! I got nothing!', 'Lens cap was on, right?', 'Ugh. Delete that.'],
    bump: ['Ow! Ha!', 'Bump! Nice texture!', 'Oof! Keep going!', 'Whoa, bumper cars!'],
    crash: ['WHOA! Did you get that?!', 'Spin! I got it on tape!', 'Kyaaa! Awesome!', 'Again! Do it again!'],
    nearmiss: ['WHOA, did you see that?!', 'So close! Yes!', 'Inches! INCHES!', 'That\'s the shot!'],
    air: ['We\'re FLYING!', 'Airtime! Woo!', 'Big air! Money shot!', 'Liftoff!'],
    fork_left: ['Left! Trust me, epic view!', 'Go left! Now now now!', 'Left! Better light!', 'Left left left!'],
    fork_right: ['Right! It\'s gnarlier!', 'Go right! Hairpins!', 'Right! The cliffs!', 'Right! Do it!'],
    fork_yes: ['Yes! Great call!', 'That\'s my driver!', 'Woo! Good pick!', 'Yesss!'],
    fork_no: ['Hmph.', 'Boo. Fine.', 'Wrong way, but okay.', 'Lame. Okay.'],
    checkpoint: ['More time! Keep rolling!', 'New location! Ooh!', 'Checkpoint! Go go!', 'Fresh scenery!'],
    lowtime: ['Clock! Clock! Hurry!', 'Battery\'s dying! Faster!', 'Sunset! Move it!', 'Go! Golden hour ends!'],
    goal: ['That\'s a wrap!', 'Made it! What a reel!', 'Coast to coast! Woo!', 'Best. Shoot. Ever.'],
    timeup: ['Sun\'s down. Shoot\'s over.', 'Aw, lost the light.', 'Night shots then.', 'Cut! We ran out.']
  },
  bruno: {
    start: ['Morning, champ! The west coast is waiting!', 'Ho ho! Sun\'s up, champ! Go!', 'Wave goodbye to the sunrise, champ!', 'Gas down, heart up! Andiamo!'],
    drift: ['Ho ho! You drift like my rally days!', 'Sideways! That\'s my champ!', 'Mamma mia, what a slide!'],
    win: ['Mamma mia, what a finish!', 'Champ! You did it!', 'Ho ho! Magnifico!'],
    fail: ['Again, champ! Even I spun out in \'79.', 'No shame, champ. Try again!', 'Ho ho. The road is patient.'],
    perfectstart: ['Perfect start! Ho ho!', 'Like a rocket, champ!', 'That\'s how we launched in my day!'],
    toast: ['To the road, and to whoever\'s beside you on it!']
  },
  kiki: { taunt: ['Catch me if you can! Wink!', 'Too slow, cutie!', 'Watch and learn!'], lose: ['No way! Rematch!', 'Okay, you\'re good. Hmph.', 'Lucky slide!'], win: ['Kiki wins! Obviously!', 'Better luck next bend!', 'Drift queen, baby!'] },
  bram: { taunt: ['Draft me, brother! Wait, not you!', 'Bram, he\'s behind us!', 'Basil, pedal!'], lose: ['Bram, you braked!', 'Basil, that was YOU!', 'Aw, shucks.'], win: ['Brothers win!', 'Teamwork, Bram!', 'Ha! Wind in our beards!'] },
  lance: { taunt: ['Darling, they\'re so cute.', 'Shall we lose them, Lacey?', 'Glamour is speed, sweetie.'], lose: ['Lacey! My hair!', 'Unthinkable!', 'We let them win. Obviously.'], win: ['Golden, as always.', 'Lustre wins. Again.', 'Ta-ta, darlings!'] },
  ottavio: { taunt: ['Eh? Oh, hello young one.', 'Brakes are for later!', 'In my day, we had no brakes!'], lose: ['Bravo, bravo. Well done.', 'Ah, youth!', 'Next time, I take the shortcut.'], win: ['Ho! The old dog still runs!', 'Late braking, my friend!', 'Grandpa wins!'] },
  announcer: { checkpoint: ['CHECKPOINT!'], extended: ['TIME EXTENDED!'], goal: ['GOAL!'], fullbloom: ['FULL BLOOM!'], perfectstart: ['PERFECT START!'], record: ['NEW RECORD!'], go: ['GO!'] }
};

/* ---- endings: per goal, per mood (bloom, bud, wilt): an arrival line (a local), each passenger's line, a caption ---- */
OB.ENDINGS = {
  A: { local: 'lantern seller', arrive: 'Welcome to Lantern Pier! Just in time!',
    bloom: { scene: 'lanterns', caption: 'A thousand lanterns, and one just for you two.', marisol: 'A thousand lanterns! Kiss for luck!', vivi: 'Darling… fine. One kiss. On the cheek.', juni: 'Lanterns AND fireworks? Framed it!' },
    bud: { scene: 'onelantern', caption: 'One lantern, two wishes, a whole sky.', marisol: 'Let\'s let one go together!', vivi: 'One lantern. Tasteful. I approve.', juni: 'One lantern, perfect silhouette!' },
    wilt: { scene: 'gone', caption: 'The lanterns are gone. The gelato is not.', marisol: 'They\'re gone… You owe me gelato.', vivi: 'Late. You owe me gelato. Two scoops.', juni: 'Missed it. Gelato. Now. Your treat.' } },
  B: { local: 'wedding party', arrive: 'Oh! Are you with the bride?',
    bloom: { scene: 'bouquet', caption: 'You crashed a wedding. She caught the bouquet.', marisol: 'I caught it! Don\'t get any ideas. Yet.', vivi: 'The bouquet. Naturally. Don\'t get ideas. Yet.', juni: 'Caught the bouquet AND the shot!' },
    bud: { scene: 'cake', caption: 'Strangers, cake and a waterfall breeze.', marisol: 'They invited us for cake! Hee!', vivi: 'Cake. Well. I suppose one slice.', juni: 'Free cake! Best detour ever!' },
    wilt: { scene: 'soaked', caption: 'Soaked by the falls, laughing all the way back.', marisol: 'We\'re soaked! Hee hee hee!', vivi: 'My hair! Darling, RUN!', juni: 'Wet lens, worth it! Run!' } },
  C: { local: 'valet', arrive: 'Welcome to the Grand Hotel Vespera.',
    bloom: { scene: 'carpet', caption: 'Red carpet, flashbulbs, fireworks over the bay.', marisol: 'Flashbulbs! Wave, sweetie, wave!', vivi: 'At last. A proper entrance.', juni: 'Paparazzi? I AM the paparazzi!' },
    bud: { scene: 'valet', caption: 'The valet bows. The night is young.', marisol: 'The valet bowed! So fancy!', vivi: 'Keys to the valet. As it should be.', juni: 'Fancy! Don\'t scratch my car, sir!' },
    wilt: { scene: 'noodles', caption: 'No room for dusty cars. Noodles under the neon.', marisol: 'Noodle cart! Secretly my favourite!', vivi: 'Noodles? Hmm. These are… divine.', juni: 'Street noodles! Way better shots!' } },
  D: { local: 'astronomer', arrive: 'Visitors! The dome is opening!',
    bloom: { scene: 'meteors', caption: 'The dome opens to a meteor shower. Make a wish.', marisol: 'So many stars! I wished for you!', vivi: 'I wished for… never mind.', juni: 'Meteor shower! Long exposure! YES!' },
    bud: { scene: 'onestar', caption: 'One shooting star, right on cue.', marisol: 'A shooting star! Quick, wish!', vivi: 'One star. Exclusive. Lovely.', juni: 'Got it! One frame, one star!' },
    wilt: { scene: 'cocoa', caption: 'Clouds rolled in. The astronomer made cocoa.', marisol: 'Clouds… but cocoa! Hee!', vivi: 'Cocoa. Warm. Acceptable.', juni: 'No stars. Cocoa though. Fine.' } },
  E: { local: 'lighthouse keeper', arrive: 'Finisterra! You\'ve run out of road.',
    bloom: { scene: 'greenflash', caption: 'The green flash at sunset. Best. Day. Ever.', marisol: 'The green flash! Best. Day. Ever.', vivi: 'The green flash. Darling… thank you.', juni: 'GREEN FLASH! Nobody gets that!' },
    bud: { scene: 'sliver', caption: 'The last sliver of sun, just for you two.', marisol: 'The last bit of sun! Just for us!', vivi: 'A sliver of sun. Romantic enough.', juni: 'Last light! Gorgeous silhouette!' },
    wilt: { scene: 'jacket', caption: 'The sun is gone, the wind is cold. Share the jacket.', marisol: 'It\'s cold… share your jacket?', vivi: 'Your jacket, darling. Now.', juni: 'Brr! Jacket! Then night shots!' } }
};

/* ---- request call-outs (cards) ---- */
OB.CALLOUTS = { pass: 'PASS {n} CARS!', drift: 'DRIFT FOR ME!', ribbons: 'CUT THE RIBBONS!', balloons: 'POP THE BALLOONS!', gnomes: 'BONK THE GNOMES!', bees: 'DODGE THE BEES!', cones: 'SLALOM THE CONES!',
  arches: 'THROUGH THE ARCHES!', speed: 'KEEP IT OVER {v}!', clean: 'NOT A SCRATCH!', draft: 'STAY IN THE DRAFT!', close: 'CLOSE CALLS!', bouquets: 'GRAB THE BOUQUETS!', photo: 'STOP FOR A PHOTO!' };

/* ---- a line: who + event, with {vars}; seeded by a counter so it varies yet replays the same ---- */
let pickN = 0;
OB.line = (who, event, vars = {}, k) => {
  const list = (L[who] && L[who][event]) || null; if (!list || !list.length) return '';
  const i = k !== undefined ? k : (pickN++ * 7 + OB.hashStr(who + event)) % list.length;
  return list[i % list.length].replace(/\{(\w+)\}/g, (m, v) => vars[v] !== undefined ? vars[v] : m);
};
OB.resetLines = () => { pickN = 0; };
})();
