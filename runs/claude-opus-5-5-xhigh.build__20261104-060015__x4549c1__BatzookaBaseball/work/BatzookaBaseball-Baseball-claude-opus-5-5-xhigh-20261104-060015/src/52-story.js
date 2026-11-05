/* =============================================================================
 * 52-story: the Tour's story, as data. Kernel Field is about to become a parking
 * lot; Mortimer Megamax bets the deed on the Kaboom Cup. Each stop: a pregame
 * scene, its game (a rival, a hazard), a postgame scene for a win or a loss.
 * Steps: ['say', who, text] (who: a cast id or a player id), ['wait', s],
 * ['sfx', name], ['pose', actor, pose, expr], ['fx', kind, x, y], ['call', fn].
 * ========================================================================== */
const P_ = id => 'comets-' + id;
BZ.STOPS = [
  { id: 'home', park: 'kernel', title: 'KERNEL FIELD', sub: 'HOME OF THE COMETS', map: [.14, .78] },
  { id: 'barnacle', park: 'barnacle', rival: 'krakens', title: 'BARNACLE BAY PARK', sub: 'VS THE KRAKENS', map: [.3, .52], reward: ['lumber', 'BARNACLE GRIP TAPE', 'Lumber +1'] },
  { id: 'caldera', park: 'caldera', rival: 'eruptors', title: 'CALDERA FIELD', sub: 'VS THE ERUPTORS', map: [.48, .74], reward: ['cleats', 'MAGMA CLEATS', 'Jet Cleats +1'], scriptRhubarb: true },
  { id: 'tranquility', park: 'tranquility', rival: 'meteors', title: 'TRANQUILITY DOME', sub: 'VS THE METEORS', map: [.62, .4], reward: ['gloves', 'ZERO-G GLOVES', 'Glue Gloves +1'] },
  { id: 'boneyard', park: 'boneyard', rival: 'haunts', title: 'BONEYARD BALLPARK', sub: 'VS THE HAUNTS', map: [.76, .68], reward: ['hype', 'PHANTOM PINE TAR', 'Hype Machine +1'] },
  { id: 'megadome', park: 'megadome', rival: 'mechanicals', title: 'MEGAMAX MEGADOME', sub: 'THE KABOOM CUP FINAL', map: [.88, .3], boss: true }
];
BZ.STORY = {
  prologue: [
    ['music', 'menu'],
    ['say', 'hap', 'Good evening, baseball fans, from Kernel Field, where the corn is high and the stakes are higher!'],
    ['sfx', 'horn'],
    ['say', 'mortimer', 'Enjoy your little cornfield, Comets. Monday it\'s a parking lot. Premium spaces only.'],
    ['say', P_('dot-dynamite-delgado'), 'Over my dead batting glove.'],
    ['say', 'mortimer', 'Win the Kaboom Cup and I\'ll tear up the deed. Lose, and I pave the park AND hang that bat in my lobby.'],
    ['sfx', 'confirm'],
    ['say', 'ike', 'Your grandma\'s BATZOOKA. Hickory, duct tape and a surplus bottle rocket. Summer of \'62.'],
    ['say', P_('dot-dynamite-delgado'), 'What does it do?'],
    ['say', 'ike', 'Nothin\'. Till the crowd gets loud. Then it does EVERYTHING.'],
    ['sfx', 'charge'],
    ['say', 'lou', 'Folks, I haven\'t seen a bat that dangerous since I swung at my own shadow in \'79!']
  ],
  barnacle: {
    pre: [['music', 'barnacle'], ['say', 'krakens-captain-bettina-brine', 'Ahoy, corn-pickers! The tide\'s coming in, and it\'s bringing a whole ocean of hurt!'], ['say', P_('dot-dynamite-delgado'), 'We brought sunscreen.'], ['say', 'lou', 'Watch the gulls, folks. They\'ve got better hands than my old infield.']],
    win: [['say', 'krakens-captain-bettina-brine', 'Blast it all. Take this. Barnacle Grip Tape. Sticks to anything, except a lead.']],
    loss: [['say', 'krakens-captain-bettina-brine', 'Back to the shallow end, landlubbers!']]
  },
  caldera: {
    pre: [['music', 'caldera'], ['say', 'eruptors-iggy-the-igniter-blaze', 'Hope you packed sunscreen. SPF one million.'], ['say', 'ike', 'Don\'t stand on anything that\'s glowing.']],
    win: [['say', 'eruptors-iggy-the-igniter-blaze', 'You\'ve got fire, Delgado. Here. Magma Cleats. They\'re only a little bit on fire.']],
    loss: [['say', 'eruptors-iggy-the-igniter-blaze', 'Too hot to handle? Come back when you\'re fireproof!']]
  },
  tranquility: {
    pre: [['music', 'tranquility'], ['say', 'meteors-commander-cosmo-vega', 'Welcome to the Moon, Comets. Up here every pop fly is a field trip.'], ['say', P_('hank-hambone-hollis'), 'Is there a snack bar on the Moon?'], ['say', 'lou', 'Gravity took the day off, folks. Somebody tell the baseball.']],
    win: [['say', 'meteors-commander-cosmo-vega', 'Mission accomplished, for you. Zero-G Gloves. They catch whatever gravity drops.']],
    loss: [['say', 'meteors-commander-cosmo-vega', 'Houston, you have a problem. Try again, earthlings.']]
  },
  boneyard: {
    pre: [['music', 'boneyard'], ['say', 'haunts-count-rattlebones', 'We\'ve been dying to play you. Literally. Since 1887.'], ['say', P_('pip-porter'), 'I\'m not scared.'], ['say', P_('pep-porter'), 'You\'re holding my hand.'], ['say', P_('pip-porter'), 'You\'re holding MINE.']],
    win: [['say', 'haunts-count-rattlebones', 'A fine game, mortals. Phantom Pine Tar. It makes the crowd scream louder.']],
    loss: [['say', 'haunts-count-rattlebones', 'Rest in pieces, Comets. Visit again soon. We\'ll be here. Forever.']]
  },
  megadome: {
    pre: [['music', 'megadome'], ['say', 'mortimer', 'Meet my ace. Ninety thousand horsepower. Zero feelings. ENFORCER-9000!'], ['say', 'mechanicals-enforcer-9000', 'PREPARE. TO. BE. STRUCK. OUT.'], ['say', P_('dot-dynamite-delgado'), 'Then let\'s give him some feelings.'], ['say', 'ike', 'Swing when they roar, kid.']],
    win: [['sfx', 'explode'], ['say', 'hap', 'The last moonshot hits the MEGA-TRON! It\'s raining sparks!'], ['say', 'mortimer', 'My jumbotron! My deed! My... reputation!'], ['sfx', 'firework'], ['say', 'hap', 'The deed flutters into the Batzooka\'s backblast and burns to confetti!'], ['say', P_('dot-dynamite-delgado'), 'Kernel Field stays. Same time next season?'], ['say', 'mechanicals-enforcer-9000', '...I. LIKE. BASEBALL.']],
    loss: [['say', 'mortimer', 'Pave it! Pave it all!']]
  }
};
BZ.UPGRADES = [
  { id: 'lumber', name: 'LUMBER', what: 'Exit speed +5% a tier', costs: [400, 800, 1400], ike: 'Ash, hickory and a little secret. Swing it like you mean it.' },
  { id: 'gloves', name: 'GLUE GLOVES', what: 'Catch reach +1 and sure hands a tier', costs: [300, 700, 1200], ike: 'Sticky as Grandma\'s caramel corn. Mind your fingers.' },
  { id: 'cleats', name: 'JET CLEATS', what: 'Run and field speed +4% a tier', costs: [300, 700, 1200], ike: 'Faster feet! Don\'t outrun the base, now.' },
  { id: 'arms', name: 'CANNON ARMS', what: 'Throws +5%, pitch speed +3% a tier', costs: [400, 800, 1400], ike: 'Long toss every morning. And these. Mostly these.' },
  { id: 'hype', name: 'HYPE MACHINE', what: 'Meter gain +10% a tier', costs: [500, 1000, 1600], ike: 'Louder crowd, hotter bat. That\'s science. Probably.' }
];
