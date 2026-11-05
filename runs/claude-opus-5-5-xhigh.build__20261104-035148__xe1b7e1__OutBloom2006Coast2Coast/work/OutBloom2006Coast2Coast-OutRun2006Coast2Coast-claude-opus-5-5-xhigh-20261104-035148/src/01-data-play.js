/* OutBloom — play data: the 14 Love in Bloom request types, the 14 Coast 2 Coast Tour missions (givers, routes,
 * rules, rank thresholds, rewards, briefs and story lines), the Garage Garden's beds and the economy. */
(() => {
'use strict';
const OB = window.OB;
/* requests: window in segments, thresholds for Perfect / Great / Good, and what the objects are */
OB.REQUESTS = {
  pass: { window: 230, label: 'Pass cars', icon: 'car', n: [6, 10], tiers: [1, .75, .5], measure: 'count', traffic: 1.6 },
  drift: { window: 260, label: 'Drift', icon: 'drift', target: 6500, tiers: [1, .7, .4], measure: 'drift' },
  ribbons: { window: 240, label: 'Ribbons', icon: 'ribbon', n: [4, 6], tiers: [1, .7, .4], measure: 'ratio', objects: 'ribbon' },
  balloons: { window: 200, label: 'Balloons', icon: 'balloon', n: [10, 16], tiers: [.9, .7, .45], measure: 'ratio', objects: 'balloon' },
  gnomes: { window: 210, label: 'Gnomes', icon: 'gnome', n: [8, 12], tiers: [.9, .7, .45], measure: 'ratio', objects: 'gnome' },
  bees: { window: 200, label: 'Bees', icon: 'bee', n: [6, 10], tiers: [0, 1, 2], measure: 'hits', objects: 'bee' },
  cones: { window: 200, label: 'Cones', icon: 'cone', n: [8, 12], tiers: [.9, .7, .45], measure: 'ratio', objects: 'cone' },
  arches: { window: 210, label: 'Arches', icon: 'arch', n: [6, 8], tiers: [1, .75, .5], measure: 'ratio', objects: 'arch' },
  speed: { window: 230, label: 'Speed', icon: 'speed', v: [215, 240], tiers: [.95, .8, .6], measure: 'share' },
  clean: { window: 230, label: 'Clean', icon: 'shield', tiers: [0, 0, 1], measure: 'contacts', traffic: 1.5 },
  draft: { window: 240, label: 'Draft', icon: 'draft', secs: 6, tiers: [1, .67, .33], measure: 'draft', traffic: 1.5 },
  close: { window: 240, label: 'Close calls', icon: 'close', n: [5, 6], tiers: [1, .7, .4], measure: 'count', traffic: 1.7 },
  bouquets: { window: 220, label: 'Bouquets', icon: 'bouquet', n: [10, 14], tiers: [.9, .7, .45], measure: 'ratio', objects: 'bouquet' },
  photo: { window: 200, label: 'Photo', icon: 'camera', tiers: [3, 2, 1], measure: 'photo', objects: 'photo' }
};
OB.REQ_ORDER = Object.keys(OB.REQUESTS);
OB.PETALS = { Perfect: 5, Great: 3, Good: 2, Miss: 0 };
OB.GRADES = [['AAA', .92, 'Full Bloom'], ['AA', .82, ''], ['A', .7, ''], ['B', .55, ''], ['C', .4, ''], ['D', .25, ''], ['E', 0, '']];
OB.gradeOf = ratio => (OB.GRADES.find(g => ratio >= g[1]) || OB.GRADES[OB.GRADES.length - 1])[0];
OB.moodOfGrade = g => ['AAA', 'AA', 'A'].includes(g) ? 'bloom' : ['B', 'C'].includes(g) ? 'bud' : 'wilt';

/* the Tour: four givers, fourteen postcards */
OB.GIVERS = { bruno: 'Bruno Brezza', marisol: 'Marisol', vivi: 'Vivi', juni: 'Juni' };
OB.MISSIONS = [
  { id: 'B1', giver: 'bruno', title: 'First Light Sprint', route: ['S1'], end: 'junction', kind: 'sprint', params: { start: 72 }, ranks: [0, 5, 9, 13], unit: 's left', seeds: 150, map: [.86, .5],
    brief: ['Morning, champ! One stage, the sun at your back.', 'Reach the fork before my watch says stop.'], rules: 'Reach the checkpoint with time to spare. The clock starts at 72.', opens: ['B2'] },
  { id: 'B2', giver: 'bruno', title: 'Drift Duel', route: ['S2'], kind: 'driftduel', rival: 'kiki', ranks: [0, .1, .25, .45], unit: 'margin', seeds: 200, unlockBed: 'gardenia', map: [.7, .3],
    brief: ['Kiki Rapido thinks she owns the lavender.', 'Out-drift her by the end of the ridge!'], rules: 'Score more drift points than Kiki by the stage\'s end.', opens: ['B3'] },
  { id: 'B3', giver: 'bruno', title: 'Draft Dash', route: ['S4'], kind: 'draftdash', rival: 'brambles', ranks: [0, .1, .25, .4], unit: 'margin', seeds: 250, map: [.56, .22],
    brief: ['The Bramble Brothers live in each other\'s wind.', 'Steal their draft and beat them home!'], rules: 'Slipstream points (seconds × speed), plus finishing first.', opens: ['B4'] },
  { id: 'B4', giver: 'bruno', title: 'Last One Wilts', route: ['S5', 'S8', 'S12'], goal: 'B', kind: 'knockout', rivals: ['kiki', 'brambles', 'lustres', 'ottavio'], ranks: [2, 1, 2, 5], unit: 'place', seeds: 300, unlockBed: 'song5', map: [.4, .5],
    brief: ['Five cars, three stages. Last at each gate is out.', 'In my day we called it Last One Wilts. Ho ho!'], rules: 'Last at each checkpoint is out. Win at Petal Falls.', opens: [] },
  { id: 'M1', giver: 'marisol', title: 'Balloon Bonanza', route: ['S1'], end: 'junction', kind: 'collect', params: { obj: 'balloon', n: 40 }, ranks: [20, 26, 32, 38], unit: 'popped', seeds: 150, map: [.9, .62],
    brief: ['I tied forty heart balloons along the strand!', 'Pop them all? Pretty please?'], rules: 'Pop the balloons along Sunrise Strand.', opens: ['M2'] },
  { id: 'M2', giver: 'marisol', title: 'Gnome Patrol', route: ['S9'], kind: 'collect', params: { obj: 'gnome', n: 24, bees: 10, beeCost: 2 }, ranks: [10, 14, 18, 22], unit: 'net', seeds: 200, unlockBed: 'outfitMarisol', map: [.42, .66],
    brief: ['The vineyard gnomes ran away again!', 'Bonk them home. Mind the bees!'], rules: 'Bonk the gnomes. Each bee sting costs two.', opens: ['M3'] },
  { id: 'M3', giver: 'marisol', title: 'Memory Lane', route: ['S2'], kind: 'memory', params: { sets: 5 }, ranks: [3, 4, 5, 5], unit: 'gates', seeds: 250, unlockBed: 'song6', map: [.68, .4],
    brief: ['Remember my flower order? Five colours!', 'Drive through the right gate each time.'], rules: 'Watch five colours, then pick the right gate in each set.', opens: [] },
  { id: 'V1', giver: 'vivi', title: 'Not a Scratch', route: ['S8'], kind: 'clean', params: { par: 64 }, ranks: [12, 6, 2, 0], unit: 's over par', seeds: 200, map: [.5, .72],
    brief: ['Through the old town, darling. Spotless.', 'One scratch and I walk.'], rules: 'Zero contacts. Ranked by your time against par.', opens: ['V2'] },
  { id: 'V2', giver: 'vivi', title: 'Fashionably Fast', route: ['S10'], kind: 'speedkeep', params: { v: 240 }, ranks: [.7, .8, .88, .95], unit: 'share', seeds: 250, unlockBed: 'magnolia', map: [.35, .78],
    brief: ['The causeway is a runway, darling.', 'Never below 240. Wind or no wind.'], rules: 'Stay above 240 km/h for as much of the stage as you can.', opens: ['V3'] },
  { id: 'V3', giver: 'vivi', title: 'Heartbreakers', route: ['S11'], goal: 'A', kind: 'heartbreak', rival: 'lustres', params: { petals: 20 }, ranks: [1, 10, 18, 99], unit: 'petals', seeds: 300, unlockBed: 'outfitVivi', map: [.14, .3],
    brief: ['The Lustres are SO smug. Break their hearts.', 'Stay ahead and steal their petals.'], rules: 'Behind them, you lose petals; pass them to steal two.', opens: [] },
  { id: 'J1', giver: 'juni', title: 'Close Calls', route: ['S3'], kind: 'count', params: { what: 'nearmiss' }, ranks: [8, 12, 15, 20], unit: 'near misses', seeds: 150, map: [.72, .6],
    brief: ['Lemon Cliffs, tight roads, big traffic!', 'Brush past them. I need the shot!'], rules: 'Near misses: pass cars with inches to spare.', opens: ['J2'] },
  { id: 'J2', giver: 'juni', title: 'Ribbon Cutter', route: ['S7'], kind: 'count', params: { what: 'ribbon', n: 16 }, ranks: [8, 11, 14, 16], unit: 'ribbons', seeds: 200, unlockBed: 'outfitJuni', map: [.48, .3],
    brief: ['Sixteen ribbon pairs up Cherry Pass!', 'Split every single one!'], rules: 'Drive between the pairs to cut the ribbons.', opens: ['J3'] },
  { id: 'J3', giver: 'juni', title: 'The Perfect Shot', route: ['S6'], kind: 'photo3', params: { n: 3 }, ranks: [3, 7, 9, 15], unit: 'photo points', seeds: 250, unlockBed: 'mirror', map: [.55, .82],
    brief: ['Three photo spots in Rosa Canyon.', 'Stop dead in the box. Golden light!'], rules: 'Stop in each photo box. Perfect: slow, whole car in, quick.', opens: [] },
  { id: 'F', giver: 'bruno', title: 'Coast 2 Coast', route: null, kind: 'love', ranks: ['B', 'A', 'AA', 'AAA'], unit: 'grade', seeds: 500, unlockBed: 'girasole', map: [.24, .55], finale: true,
    brief: ['Everyone\'s waiting at the coast, champ.', 'Your passenger, your route. Make her day!'], rules: 'Love in Bloom, forks open. Reach any goal with a high grade.', opens: [] }
];
OB.MISSION = Object.fromEntries(OB.MISSIONS.map(m => [m.id, m]));
OB.RANKS = ['C', 'B', 'A', 'AAA'];
OB.RANK_MUL = { C: 1, B: 1.25, A: 1.5, AAA: 2 };
OB.FINALE_AT = 9;
OB.STORY = {
  opening: [['bruno', 'Welcome to the Coast 2 Coast Tour, the sunniest race on Earth!'], ['bruno', 'Fourteen postcards. Four friends. One island in bloom.'], ['bruno', 'Clear them, earn seeds, and plant them in the Garage Garden!']],
  intro: { bruno: [['bruno', 'Ho ho! My postcards are about racing, champ.'], ['bruno', 'Sprints, duels, and the old Last One Wilts.'], ['bruno', 'Show me what the sunrise taught you!']],
    marisol: [['marisol', 'Hi hi! I\'m Marisol, I run the flower stall!'], ['marisol', 'My postcards are the fun ones. Balloons! Gnomes!'], ['marisol', 'Help me and I\'ll owe you a sunflower!']],
    vivi: [['vivi', 'Vivienne Montclair. Charmed, I\'m sure.'], ['vivi', 'My postcards require… elegance.'], ['vivi', 'Do try to keep up, darling.']],
    juni: [['juni', 'Juni! Stunt photographer! Hi!'], ['juni', 'I need danger, speed, the perfect frame!'], ['juni', 'You drive, I shoot. Deal? Deal!']] },
  outro: { bruno: [['bruno', 'You won the Last One Wilts! Like me in \'79!'], ['bruno', 'My old flag is yours now, champ.'], ['bruno', 'Now… the coast is calling.']],
    marisol: [['marisol', 'You remembered my flower order!'], ['marisol', 'That\'s it. You\'re officially my favourite.'], ['marisol', 'See you at the coast? Hee!']],
    vivi: [['vivi', 'The Lustres, heartbroken. Delicious.'], ['vivi', 'You\'ve been… rather wonderful, darling.'], ['vivi', 'Don\'t tell anyone I said so.']],
    juni: [['juni', 'THE PERFECT SHOT! It\'s going on the cover!'], ['juni', 'You\'re a natural stunt driver, you know?'], ['juni', 'Finale! I\'m bringing my best lens!']] },
  finale: [['bruno', 'Everyone together! Juni, the camera!'], ['juni', 'Say "bloooom"!'], ['bruno', 'To the road, and to whoever\'s beside you on it!']]
};
/* the Garage Garden: one unlock a bed */
OB.BEDS = [
  { id: 'gardenia', name: 'Gardenia GT Targa', cost: 600, kind: 'car', car: 'gardenia', needs: 'B2', icon: 'car' },
  { id: 'magnolia', name: 'Magnolia V12 Barchetta', cost: 900, kind: 'car', car: 'magnolia', needs: 'V2', icon: 'car' },
  { id: 'girasole', name: 'Girasole Hyper Spider', cost: 1500, kind: 'car', car: 'girasole', needs: 'F', icon: 'car' },
  { id: 'edPrimavera', name: 'Primavera Bloom Edition', cost: 400, kind: 'edition', car: 'primavera', icon: 'flower' },
  { id: 'edOrchidea', name: 'Orchidea Bloom Edition', cost: 500, kind: 'edition', car: 'orchidea', icon: 'flower' },
  { id: 'song5', name: 'Song: Lemon Drop Rush', cost: 300, kind: 'song', song: 5, needs: 'B4', icon: 'note' },
  { id: 'song6', name: 'Song: Moonflower', cost: 300, kind: 'song', song: 6, needs: 'M3', icon: 'note' },
  { id: 'pastel', name: 'Pastel paint pack', cost: 100, kind: 'paint', pack: 'pastel', icon: 'star' },
  { id: 'metallic', name: 'Metallic paint pack', cost: 100, kind: 'paint', pack: 'metallic', icon: 'star' },
  { id: 'retro', name: 'Retro paint pack', cost: 100, kind: 'paint', pack: 'retro', icon: 'star' },
  { id: 'neon', name: 'Neon paint pack', cost: 100, kind: 'paint', pack: 'neon', icon: 'star' },
  { id: 'outfitMarisol', name: 'Marisol: Picnic Gingham', cost: 150, kind: 'outfit', who: 'marisol', needs: 'M2', icon: 'heart' },
  { id: 'outfitVivi', name: 'Vivi: Gala Gown', cost: 150, kind: 'outfit', who: 'vivi', needs: 'V3', icon: 'heart' },
  { id: 'outfitJuni', name: 'Juni: Rally Suit', cost: 150, kind: 'outfit', who: 'juni', needs: 'J2', icon: 'heart' },
  { id: 'mirror', name: 'Mirror Roads', cost: 800, kind: 'mirror', needs: 'J3', icon: 'drift' }
];
OB.BED = Object.fromEntries(OB.BEDS.map(b => [b.id, b]));
OB.ECONOMY = { scorePerSeed: 10000, goalSeeds: 50, endingSeeds: 100 };
})();
