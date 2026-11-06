// The five quests, their steps, and the story's lines. Steps are data: the campaign engine checks them.
// step types: kill (n of type or any), reach (zone exit), use (spot kind/npc), defend (timer), boss, coffin, shrine, equip, talk
export const QUESTS = [
  { id: 'q1', name: 'Wipe Your Feet', zone: 'yard', giver: 'crier', steps: [
    { id: 'move', text: 'Climb out of your coffin and walk', type: 'move', n: 6 },
    { id: 'kill3', text: 'Smash three Peatwalkers', type: 'kill', n: 3, mon: 'peatwalker' },
    { id: 'upgrade', text: 'Equip the new weapon', type: 'equip' },
    { id: 'shrine', text: 'Light the votive shrine', type: 'use', kind: 'shrine' },
    { id: 'coffin', text: 'Open the Unquiet Coffin and survive', type: 'coffin' },
    { id: 'gate', text: 'Reach Tollhaven', type: 'reach' },
  ] },
  { id: 'q2', name: 'The Weeping Causeway', zone: 'causeway', giver: 'crier', steps: [
    { id: 'find', text: 'Find Dame Brasse in the gibbet camp', type: 'use', kind: 'npc', npc: 'brasse' },
    { id: 'escort', text: 'Defend the wagon of bells', type: 'defend', t: 90 },
    { id: 'back', text: 'Return with the bells to Tollhaven', type: 'reach' },
  ] },
  { id: 'q3', name: "Saint Gloam's Bones", zone: 'ossuary1', giver: 'ogive', steps: [
    { id: 'bone1', text: 'Take the first relic bone (Nave)', type: 'use', kind: 'relic', n: 1 },
    { id: 'bone2', text: 'Take the second relic bone (Crypts)', type: 'use', kind: 'relic', n: 2 },
    { id: 'bone3', text: 'Take the third relic bone (Deeps)', type: 'use', kind: 'relic', n: 3 },
    { id: 'bursar', text: 'Settle accounts with the Bursar', type: 'boss', boss: 'bursar' },
  ] },
  { id: 'q4', name: 'The Cinder Cloister', zone: 'cloister', giver: 'crier', steps: [
    { id: 'novices', text: 'Defend the novices until the bell tolls', type: 'defend', t: 100 },
    { id: 'ambrose', text: 'Confront Bishop Ambrose Thrice-Buried', type: 'boss', boss: 'ambrose' },
  ] },
  { id: 'q5', name: 'Ring It or Die Trying', zone: 'belfry1', giver: 'crier', steps: [
    { id: 'climb', text: 'Climb the Cracked Belfry', type: 'reach' },
    { id: 'malison', text: 'Ring Old Clemency by hand and silence the Saint', type: 'boss', boss: 'malison' },
  ] },
];
export const NPCS = {
  crier: { name: 'Crier Maudlin', model: 'npc-crier', voice: 'crier', scale: 1, lines: [
    'Hear ye, hear ye! The dead are up, the roads are closed, and the fish is off. Also you. You are dead. Welcome back.',
    'I lost the body at harvest and kept the job. No one told me to stop.',
    'The parish asks that you wipe your feet. You have been in the ground.',
  ] },
  brasse: { name: 'Dame Brasse', model: 'npc-brasse', voice: 'brasse', scale: 1.1, lines: [
    'WHAT? SPEAK UP! I MELT BELLS FOR A LIVING!',
    'THAT SWORD WAS A CHURCH BELL ON TUESDAY. HIT SOMETHING WITH IT AND IT STILL SAYS AMEN.',
  ] },
  ogive: { name: 'Mother Ogive', model: 'npc-ogive', voice: 'ogive', scale: 1, lines: [
    'Bring me the holy bones, child. I will know them by the taste.',
    'A saints knuckle. Very old. A little salty. She died angry.',
  ] },
  penny: { name: 'Pennywhistle', model: 'npc-penny', voice: 'penny', scale: 1, lines: [
    'Everything is half price, dear friend. The other half is your soul, but we can discuss terms.',
    'No refunds. No returns. No survivors, so far.',
  ] },
  ambrose: { name: 'Bishop Ambrose', model: 'npc-ambrose', voice: 'ambrose', scale: 1, lines: [
    'They have buried me three times, my child. One learns to keep a spade in the coffin.',
  ] },
};
export const NARRATION = [
  { who: 'narrator', text: 'For a thousand years Old Clemency tolled at dusk, and the dead of Vespermoor stayed down.' },
  { who: 'narrator', text: 'Forty days ago the Great Bell cracked. It still tolls. It now says something else.' },
  { who: 'narrator', text: 'You were buried on the thirty-ninth day. It did not take.' },
];
export const ENDING = [
  { who: 'narrator', text: 'The bell rings true. Malison comes apart like a held breath.' },
  { who: 'narrator', text: 'Dawn hits the moor. The dead lie down, gently, and thank you for the trouble.' },
  { who: 'narrator', text: 'Far below, much deeper, a bell answers.' },
];
export const TAUNTS = {
  bursar: { enter: 'YOUR SOUL IS OVERDUE!', phase: 'INTEREST COMPOUNDS, LITTLE CORPSE!', mid: 'I HAVE YOU DOWN FOR ONE DEATH. I SEE IT WAS NOT COLLECTED.', low: 'FORECLOSURE!' },
  ambrose: { enter: 'One learns to keep a spade in the coffin.', r2: 'Again, my child. Again.', r3: 'Third time lucky. For one of us.' },
  malison: { enter: 'A THOUSAND YEARS I HAVE BEEN YOUR FOUNDATION STONE. NOW I SHALL BE YOUR CEILING.', p2: 'THEY WALLED ME UP SINGING. DO YOU KNOW WHAT I LEARNED IN THE DARK? EVERY VERSE.', p3: 'RUN, LITTLE RINGER. THE HOUR IS UNRUNG, AND IT IS YOURS.', mid: 'LISTEN. THAT IS EVERY GRAVE YOU EVER WALKED ON, OPENING.', kill: 'DOWN YOU GO. GIVE MY REGARDS TO THE WORMS.' },
};
export const LORE_BOOKS = [
  { title: 'The Third Night', pages: ['THE THIRD NIGHT. THE GRAVES IN THE NEW YARD ARE EMPTY. THE GRAVES IN THE OLD YARD ARE EMPTY. I HAVE BEGUN DIGGING ONE FOR MYSELF, FOR THE COMPANY.'] },
  { title: 'On Bells', pages: ['A BELL IS A PROMISE MADE OF METAL. IT SAYS THE SAME THING EVERY DAY UNTIL IT IS BELIEVED.', 'A CRACKED BELL IS ALSO A PROMISE. IT IS NOT A KIND ONE.'] },
  { title: 'The Foundress', pages: ['SAINT MALISON GAVE HERSELF TO THE BELL. THIS IS THE OFFICIAL ACCOUNT.', 'THE UNOFFICIAL ACCOUNT IS THAT NOBODY ASKED HER, AND THAT SHE SANG THE WHOLE TIME.'] },
  { title: 'Ledger of Bishop Ambrose', pages: ['TO THE BURSAR: ONE BELL, CRACKED. ONE SAINT, UNLOADED. INTEREST TO FOLLOW.', 'I HAVE PAID WITH THE ONLY COIN I HAD LEFT, WHICH WAS EVERYONE ELSE.'] },
  { title: 'Gibbet Etiquette', pages: ['WHEN HANGED, HANG POLITELY. THE NEXT TENANT WILL BE ALONG IN THE MORNING.'] },
  { title: 'A Mourners Guide', pages: ['DO NOT SPEAK ILL OF THE DEAD. THEY HAVE LATELY BEEN ABLE TO HEAR YOU.'] },
  { title: 'Larder Notes', pages: ['TAKE ONE OVERDUE LOAF. LEAVE IT. THE LOAF WILL DECIDE.'] },
  { title: 'The Weeping Road', pages: ['THE CAUSEWAY WEEPS BECAUSE THE MOOR UNDER IT IS COMPOSED OF EVERYONE WHO WALKED IT.'] },
  { title: 'Clapperjaw Notes', pages: ['THE CLAPPERJAW IS A BELL THAT HAS HAD ENOUGH. HANDLE WITH EARPLUGS.'] },
  { title: 'To the Novices', pages: ['THE FIRE IS NOT A PUNISHMENT. IT IS MERELY THE LAST ITEM ON THE LIST.'] },
  { title: 'The Ringers Order', pages: ['RING TRUE, RING SHORT, AND NEVER RING ALONE, FOR THE BELL HAS ALREADY HEARD YOU.'] },
  { title: 'Eventide', pages: ['WHEN THE LAST TOLL SOUNDS, EVERYTHING EVER BURIED SITS UP AND ASKS WHO IS PAYING.'] },
];
export const LORE_ZONES = { yard: [0, 4], causeway: [7, 4, 1], ossuary1: [2, 3], ossuary2: [5], ossuary3: [6, 3], cloister: [8, 9], belfry1: [10, 11] };
export const HOWTO = [
  { title: 'Moving and Fighting', text: 'MOVE WITH THE LEFT STICK OR WASD. HOLD YOUR MAIN ATTACK TO KEEP SWINGING. THE DODGE ROLL MAKES YOU UNTOUCHABLE FOR A MOMENT. RED RINGS AND LINES ON THE GROUND ARE WARNINGS: ROLL THROUGH THEM. TALLOW HEALS. THE POTION NEVER RUNS OUT, ONLY COOLS DOWN.' },
  { title: 'Skills and Tones', text: 'YOU CARRY SIX SKILLS. ANY SKILL FITS ANY SLOT AND SWAPPING IS FREE. EACH SKILL HAS THREE TONES THAT UNLOCK AS YOU LEVEL: PICK ONE TO CHANGE HOW IT WORKS. VOWS ARE PASSIVE CHOICES AT LEVELS 5 AND 15.' },
  { title: 'Loot', text: 'WHITE IS PLAIN. BLUE IS BLESSED. GOLD IS RELIQUARY. ORANGE IS LEGENDARY AND RINGS A BELL. GREEN IS PART OF A SET. WALK OVER LOOT TO TAKE IT. THE EQUIP BUTTON WEARS THE NEWEST UPGRADE AT ONCE. LEGENDARY POWERS CHANGE HOW YOUR SKILLS WORK.' },
  { title: 'Town', text: 'PENNYWHISTLE BUYS AND SELLS. DAME BRASSE SALVAGES, CRAFTS AND REFORGES. MOTHER OGIVE EXTRACTS LEGENDARY POWERS, SOCKETS GEMS AND MERGES THEM. THE COLLECTION BOX HOLDS ITEMS FOR ALL YOUR HEROES. LYCHGATES LET YOU TRAVEL. THE PASSING BELL TAKES YOU HOME AND BACK.' },
  { title: 'Knell Runs', text: 'AFTER THE CREDITS, THE KNELL FONT IN TOWN STARTS A KNELL RUN: KILL TO FILL THE BELL, THEN A WARDEN FALLS. THE GRAND KNELL USES A GRAND KEY AND A TIMER. DEVOTION KEEPS YOU LEVELLING PAST 30. PENANCE TIERS RAISE THE STAKES.' },
  { title: 'Co-op', text: 'ANOTHER PAD CAN JOIN ON THE SAME SCREEN: PRESS OPTIONS ON IT, OR USE PARTY IN THE PAUSE MENU. IN AN AI HUB SESSION, UP TO FOUR PLAYERS SHARE ONE WORLD AND FILL THE KNELL TOGETHER. HOLD THE INTERACT BUTTON ON A FALLEN FRIEND TO REVIVE THEM.' },
];
