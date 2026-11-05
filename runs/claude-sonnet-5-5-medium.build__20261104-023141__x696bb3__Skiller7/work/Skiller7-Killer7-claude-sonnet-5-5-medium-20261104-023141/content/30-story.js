// Story: beats as data. Killer7's register: deadpan, cryptic, euphemistic. Tokens like {go} become the player's own button.
const say = (who, text, o) => Object.assign({ say: who, text }, o);
const BEAT = (id, steps) => { S7.reg.beats[id] = steps; };
S7.NAMES = { oma: 'OMA HOLLE', rosalind: 'SISTER ROSALIND', murmel: 'MURMEL', pim: 'PIM', concierge: 'THE CONCIERGE', grau: 'BELLCAPTAIN GRAU', king: 'THE POWDER KING', sweep: 'THE SWEEP', foehn: 'MISTER FÖHN', narrator: '' };

BEAT('intro', [
  { card: 'PIZ NADA', sub: 'IT HAS SNOWED HERE FOR A HUNDRED YEARS', t: 3.2 },
  say('oma', 'Come closer, dears. Not you, the one behind you. Yes. All seven.'),
  say('oma', 'I am a hundred and four. I am holding the mountain down with a featherbed. It is a very large featherbed.'),
  say('oma', 'Mister Föhn has sent his warm wind. It makes people laugh until they are no longer in the room. We call them Whiteouts.'),
  say('oma', 'The Department of Discretion sends me guests. You will check them out for me.'),
  say('rosalind', 'She means you will shoot them, Sir. Please use the corridor door when you are ready. The Wardrobe is to the right. The Bench is for waxing. The clock is for remembering.'),
  say('rosalind', 'Hold {ring} to choose a coat. Stand at the Clock and press {interact} to save. Mind the cuckoo.'),
  { flag: 'intro_done' }, { dossier: 'd_oma' }, { dossier: 'd_foehn' }, { dossier: 'd_seven' }
]);
BEAT('oma', t => !t.bosses.grau ? [say('oma', 'The Bellcaptain has taken the lift. Go and ask him to ring down.'), say('oma', 'Do wipe your boots. There is a hundred years on them.')]
  : !t.bosses.king ? [say('oma', 'You smell of brass, dear. Good. Now the village. It has been laughing since Thursday.'), say('oma', 'The Powder King sits at the top. He is made of everyone who stayed too long.')]
  : [say('oma', 'You are all still here. How odd. How lovely.')]);
BEAT('rosalind', t => [say('rosalind', 'The Wardrobe holds your coats, Sir. Whoever you are, someone else is wearing you.'), say('rosalind', t.pins.length < 7 ? 'Lift Pins, Sir? You have ' + t.pins.length + ' of seven. They are in the strangest places. I put one in the soup.' : 'Seven pins. The Department will be thrilled. It will not say so.'), say('rosalind', 'Tea is at four. It was always four. There is no tea.')]);
BEAT('coat_mara', [say('mara', 'A hard hat with a lamp. And a note: "Do not light." I will light it later.'), { dossier: 'd_seven' }]);
BEAT('coat_vesper', [say('vesper', 'A coat with a camera in the pocket. How considerate.'), { dossier: 'd_seven' }]);
BEAT('got_key', [say('rurik', 'Brass. Warm. The staff lift will take it.')]);

// ---- Target 00: Turn-Down Service
BEAT('t00_card', [{ card: 'TARGET 00', sub: 'TURN-DOWN SERVICE', t: 3 }, say('concierge', 'Welcome to the Grand Hotel Nada. Checkout is at eleven. Everyone checks out at eleven.'), { music: 'hotel' }]);
BEAT('t00_first', [
  say('rurik', 'Something is laughing. I cannot see it.'),
  say('rurik', 'Hold {aim} to look. Press {scan} and the cold will show me what is laughing. Then {fire} at the glowing Warm Spot.', { mood: 'tutorial' }),
  { dossier: 'd_whiteout' }
]);
BEAT('t00_junction', [say('anselma', 'A junction. Lean on the stick toward the way you want, then hold {go}. Tap {turn} to turn about.')]);
BEAT('t00_phone', [say('concierge', 'The house telephone. How may I direct your call to the afterlife?'), say('concierge', 'The Bellcaptain keeps the lift. He rings when he is lonely. Shoot what glows while the bell is still ringing.')]);
BEAT('murmel_00A', t => [
  say('murmel', 'Psst. Over here. I am a marmot. I am bungeed to a ski rack. This is my professional life.'),
  say('murmel', !t.items.servicekey ? 'The key is in the cloakroom behind a wall of hotel glass. The glass hums one note. Wear the Yodeler and press {skill} at the wall.' : 'You have the brass. The staff lift is north of the middle. Go on.'),
  say('murmel', 'A gentleman in fur can open a rope. It costs Red. Gratuity is customary.'), { dossier: 'd_murmel' }
]);
BEAT('concierge_00A', [say('concierge', 'This is the house telephone. You have been placed on hold. The hold music is the sound of snow.')]);
BEAT('t00_boss', [
  { card: 'THE BELLCAPTAIN', sub: 'AUGUSTIN GRAU, LIFT 1', t: 2.6 },
  say('grau', 'Another guest. How lovely. I carry the luggage of the dead, and I am so very tired of it.'),
  say('grau', 'Ring, ring. Ring, ring. The bell has a warm spot. The warm spot has a bell.'),
  say('rurik', 'When the bell rings, the Warm Spot opens. Shoot it then. Move on the ring between shots.', { mood: 'tutorial' }),
  { boss: 'grau' }
]);
BEAT('t00_boss_down', [
  { wait: .8 }, say('grau', 'Checkout... is... at eleven.'), { shake: 1 },
  say('grau', 'Please leave a review. Someone is always reading.'),
  { unlock: 'baron' }, { result: 0 }, { card: 'CHECKED OUT', sub: 'TARGET 00 COMPLETE', t: 2.6 },
  say('oma', '(From a long way away.) Good, dears. Come back and wax. The mountain has more rooms.'),
  { go: ['room7', 'door'] }
]);

// ---- Target 01: Après
BEAT('t01_card', [{ card: 'TARGET 01', sub: 'APRÈS', t: 3 }, say('narrator', 'Oberglück. Six chalets. Four hundred ghosts. It is après-ski, forever.'), { music: 'village' }]);
BEAT('t01_arrive', [say('anselma', 'The snow is trying very hard to look like nothing happened.')]);
BEAT('murmel_01A', t => [
  say('murmel', 'A new village, the same marmot. I live everywhere. It is a tragedy of leasing.'),
  say('murmel', !t.items.tbar ? 'To go up, you need a T-Bar token. The shop east of the red phone has one. The shop is frozen. Frozen things shatter at the right note.' : 'Token in hand. The lift station is behind an ice serac. The Engineer knows ice. She likes ice. Ice does not like her.'),
  say('murmel', 'A gardener at the west hedge wants thirty Red to look the other way. Behind it hangs a coat for ice. A tycoon looks the other way for free but charges for it.'), { dossier: 'd_murmel' }
]);
BEAT('pim_01A', [
  say('pim', 'Hello! I am Pim. I am the lift boy. It is 1926. There are no chairs today, only the chair.'),
  say('pim', 'I wait. Someone always sits eventually. Not today. Today the warm wind sits for me.'),
  say('pim', 'Press {scan} when you hear laughing. Do not look for them. Look for what they leave: feet in the snow, breath in the air.'), { dossier: 'd_whiteout' }
]);
BEAT('t01_pim', [say('pim', '(A whisper from nowhere.) Two Warm Spots on the big one. Front and back. It is shy.')]);
BEAT('concierge_01A', [say('concierge', 'Red telephone. Reservations for the afterlife. Your table is by the window. The window is a snowdrift.')]);
BEAT('t01_lift', [say('mara', 'The T-bar. Four hundred meters of cable and nowhere to hide. {aim} works up here too.'), { dossier: 'd_accord' }]);
BEAT('murmel_01C', [say('murmel', 'Top of the Black Run. It is black because nobody has returned the colour.'), say('murmel', 'Ski it, hold {go}. Tap {turn} for a hockey stop and you can aim. Or tuck and trust the mountain.')]);
BEAT('t01_boss', [
  { card: 'THE POWDER KING', sub: 'MADE OF EVERYONE WHO STAYED TOO LONG', t: 2.8 },
  say('king', 'Ha. Ha. Ha. I am the party at the end of the world. Stay. The snow is lovely. It has your name on it.'),
  say('foehn', '(A warm breeze.) Laugh with him. Everyone does, in the end.'),
  say('vesper', 'He breathes in before every slide. When his chest opens, I will have a picture of it. So will you.', { mood: 'tutorial' }),
  { boss: 'king' }
]);
BEAT('t01_boss_down', [
  { wait: .8 }, say('king', 'Ha... ha... ha.'), { shake: 1 }, say('king', 'Is this the part where it stops snowing?'),
  { result: 1 }, { card: 'THAWED', sub: 'TARGET 01 COMPLETE', t: 2.6 },
  say('foehn', 'Oh, that one was sweet. Do come again. The wind is always warm somewhere.'),
  { go: ['room7', 'door'] }
]);
BEAT('epilogue', [
  { card: 'ROOM 7', sub: 'THURSDAY, AGAIN', t: 2.6 },
  say('oma', 'Seven coats. One body. Zero guests. That is a good number.'),
  say('rosalind', 'Tea, Sir? ... There is still no tea. But I made the effort.'),
  say('sweep', '...', { name: 'THE SWEEP' }),
  say('oma', 'It will snow again tomorrow. It always does. Go to sleep, dears. I will hold the mountain.'),
  { credits: true }
]);
