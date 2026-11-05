/* ---- STORY: all the words (ASCII only: the pixel font has no macrons). The register is earnest, terse feudal drama;
 * the jokes are deadpan and come from the world. A line may be one text, or { sojiro, kaede } where they differ.
 * In a scene's cast and lines, 'hero' is the apprentice played and 'other' the one who is not ---- */
const Story = {};
Story.speakers = {
  granny: { name: 'GRANNY OSHIMA', rig: 'granny', voice: 'granny' }, sojiro: { name: 'SOJIRO', rig: 'sojiro', voice: 'sojiro' }, kaede: { name: 'KAEDE', rig: 'kaede', voice: 'kaede' },
  takanori: { name: 'LORD TAKANORI', rig: 'takanori', voice: 'takanori' }, kuroganeRobe: { name: 'KUROGANE', rig: 'kuroganeRobe', voice: 'kurogane' }, kurogane: { name: 'KUROGANE', rig: 'kurogane', voice: 'kurogane' },
  oni: { name: 'KUROGANE', rig: 'kuroganeOni', voice: 'oni' }, kanemori: { name: 'KANEMORI', rig: 'kanemori', voice: 'kanemori' }, gonroku: { name: 'GONROKU', rig: 'gonroku', voice: 'gonroku' },
  hotaru: { name: 'HOTARU', rig: 'hotaru', voice: 'hotaru' }, tobei: { name: 'TOBEI', rig: 'tobei', voice: 'tobei' }, ittetsu: { name: 'BROTHER ITTETSU', rig: 'ittetsu', voice: 'ittetsu' },
  sakubei: { name: 'SAKUBEI', rig: 'sakubei', voice: 'sakubei' }, ume: { name: 'UME', rig: 'disciple', voice: 'disciple', arg: '#3e6a3a' }, kiku: { name: 'KIKU', rig: 'disciple', voice: 'disciple', arg: '#2a4a7a' },
  masa: { name: 'MASA', rig: 'disciple', voice: 'disciple', arg: '#6a4a2a' }, daikon: { name: 'BIG DAIKON', rig: 'daikon', voice: 'gonroku' }
};
Story.crawl = [
  'The Sengoku era. Lords devour lords, and the land devours the poor.',
  'In Kasugai Province the granaries are full, and the people starve.',
  'In the shadow of Kokaku Castle stands a humble shop, the Jubako-ya.',
  'It sells lunchboxes to the lord\'s household. Every box has two tiers.',
  'So does the shop.'
];
Story.lines = {
  // ---- the Trial (Granny teaches by doing) ----
  t_move: 'Walk softly. A guard hears your feet before he sees your face.',
  t_fence: 'Over the fence. A ninja does not use the gate.',
  t_ki: 'The gauge in your belly is your ki. When it shouts, you whisper.',
  t_bamboo: 'Bamboo hides a crouching child. It does not hide a strolling fool.',
  t_mark: 'Ume walks the grove with her lantern. Come up behind her. Take her token with a Silent Mark.',
  t_mark_done: 'One. Do not smile. Smiles are loud.',
  t_swim: 'Kiku guards the koi pond. Swim. Dive under. Pull her in from the water.',
  t_roof: 'The roof is a road for those with a rope. Hook the storehouse.',
  t_above: 'Masa stands below the kura\'s edge. Drop on her from above.',
  t_tools: 'Big Daikon eats anything. Pull him off his post with a firecracker, then leave him a rice ball.',
  t_herb: 'I swapped the poison for a sleeping herb. This is a trial, not a funeral.',
  t_front: 'He sleeps. Now the front cut. Even a sleeping radish deserves respect.',
  t_smoke: 'Lanterns have found you. Smoke, and gone. Do not stand there admiring it.',
  t_spar: 'Brother Ittetsu waits in the gravel ring. Block. Parry. Roll. Then strike.',
  t_return: 'Enough. Come back to the porch.',
  t_end: 'Your rice is cooked. Whether it is seasoned, the world will decide.',
  t_hungry: 'Hungry men are careless men.',
  ittetsu_intro: 'Ha! The old woman sends me children. Draw, little dumplings.',
  ittetsu_defeat: '...Well struck. She was right about you.',
  // ---- Rice and Ash ----
  m1_start: { sojiro: 'The canal is quiet. The magistrate is not.', kaede: 'Smell that? Roast eel. He eats while the town boils grass.' },
  m1_inside: 'The compound wall. Inside, the feast hall. Kanemori eats with his back to the garden.',
  gonroku_intro: 'The magistrate pays me by the bowl. Tonight, I eat well.',
  gonroku_phase2: 'RAAAH! Stand still, mosquito!',
  gonroku_defeat: 'The rice... was always... his...',
  kanemori_cornered: 'W-wait! I only followed orders! The man with the iron seal promised me a castle!',
  m1_kill: { sojiro: 'Heaven was too slow.', kaede: 'You should have shared.' },
  m1_ledger: 'A letter, sealed in black iron. Granny will want this.',
  m1_escape: 'The boat waits at the west end of the canal.',
  // ---- The Fort at Kiri Lake ----
  m2_start: { sojiro: 'Rain. Good. Rain eats footsteps.', kaede: 'Rain. Wonderful. My boots are rice porridge.' },
  m2_cage: 'A bamboo cage by the storehouses. That shape inside is either Tobei or a sack of turnips.',
  tobei_freed: 'You came! I knew you would. I mean, I hoped. I mean... is that a rice ball?',
  m2_gate: 'The water gate. The lever inside opens it. Tobei swims like a stone, but he can wade.',
  m2_barges: 'The rice barges. Cut the ropes and the river carries them to the villages.',
  hotaru_intro: 'The Jubako-ya sends its children to fetch its fool. How sweet. Like bean paste.',
  hotaru_phase2: 'Which of me will you cut?',
  hotaru_clones: 'Which of me will you cut?',
  hotaru_defeat: 'Hm. Sharper than you look. Tell your grandmother: on the night of the full moon, your lord drinks his last.',
  // ---- Moon over Kokaku ----
  m3_start: { sojiro: 'The moat. Then the wall. Then the sake. Then him.', kaede: 'A moon-viewing. Everyone looking up. Nobody looking down.' },
  m3_bailey: 'The festival garden. Nobles, servants, lanterns. Three of the servants walk like ninja. Focus your ki to see them.',
  m3_swapped: 'The flask is swapped. The lord will drink plain sake and complain about it. Now, up.',
  m3_keep: 'The keep. Three tiers. A man like Kurogane always waits at the top.',
  kurogane_intro: 'Little boxes. Do you know what a lord is? A mouth. Feed it fear, and it rules a hundred years. Takanori feeds it rice. I will be the new mouth. ...Shuten. Wake.',
  kurogane_phase2: 'THE MOON... TASTES OF IRON!',
  kurogane_defeat: 'The mask... was hungrier... than I...',
  m3_timer: 'The lord raises his cup...',
  // ---- the round ----
  d_start: 'Sakubei the rice broker counts his coins by the canal. Silence him and leave by the canal gate.',
  d_target: 'The broker is down. Now the canal gate.'
};
Story.scenes = {
  prologue: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI], ['other', 55, Math.PI]], steps: [
    ['say', 'granny', 'Rice that is never tested is only seed. Tonight, you two are tested.'],
    ['say', 'kaede', 'Finally. Six years of folding boxes.'], ['say', 'sojiro', '...We are ready, Master.'],
    ['pose', 'granny', 'tap'], ['say', 'granny', 'Ready? The rice says when it is ready. Not the cook. Go.']] },
  training_end: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI]], steps: [
    ['say', 'granny', 'Your rice is cooked. Whether it is seasoned, the world will decide.'],
    ['say', 'hero', { sojiro: 'I will not shame the shop.', kaede: 'Seasoned. Ha. I am practically pickled.' }],
    ['say', 'granny', 'Tomorrow the lord sends for a delivery. Wash your hands. Sharpen your knives.']] },
  briefing1: { bg: 'garden', music: 'shop', cast: [['takanori', -30, 0], ['kuroganeRobe', -60, 0], ['granny', 40, Math.PI]], steps: [
    ['say', 'takanori', 'Magistrate Kanemori swears the harvest failed. Yet his storehouses groan with rice.'],
    ['say', 'kuroganeRobe', 'My lord, Kanemori has served your house for twenty years. To accuse without proof is--'],
    ['say', 'takanori', 'Enough, Kurogane. Leave us.'], ['exit', 'kuroganeRobe'],
    ['say', 'takanori', 'Grandmother. The law cannot reach him. Can your boxes?'],
    ['say', 'granny', 'Every box reaches its table, my lord.'],
    ['say', 'granny', 'He feasts tonight by the canal. He will not finish his meal. And bring me any letter he keeps. A man who hides rice also hides paper.'],
    ['say', 'hero', { sojiro: 'It will be done.', kaede: 'He will not even taste dessert.' }]] },
  debrief1: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI]], steps: [
    ['say', 'granny', 'Black iron. Kurogane\'s seal.'],
    ['say', 'granny', 'The rice was sold to the Red Lanterns. Sake-house ninja. They are paid in silver, and they pay in poison.'],
    ['say', 'hero', { sojiro: 'The lord\'s own chamberlain.', kaede: 'The man who bowed so nicely in the garden.' }],
    ['say', 'granny', 'Tobei carried a copy to the lake. He has not come home.']] },
  debrief1_noletter: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI]], steps: [
    ['say', 'granny', 'No letter. Then we guess. A magistrate does not grow this fat on his own.'],
    ['say', 'granny', 'Tobei went to Kiri Lake to listen. He has not come home.']] },
  briefing2: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI]], steps: [
    ['say', 'granny', 'Tobei is a fool with good feet. The Red Lanterns hold him at Kiri Lake. Bring him home.'],
    ['say', 'kaede', 'And the rice barges?'],
    ['say', 'granny', 'Rice belongs in bellies, not in a traitor\'s war chest. Cut them loose. The river knows the way to the villages.'],
    ['say', 'sojiro', 'Tobei first. Then the rice.']] },
  debrief2: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['tobei', 0, Math.PI], ['hero', 40, Math.PI]], steps: [
    ['say', 'tobei', 'I told them nothing! Mostly because I know nothing. But I said it bravely.'],
    ['say', 'hero', 'Hotaru said the lord drinks his last on the night of the full moon.'],
    ['say', 'granny', 'The moon-viewing. Tomorrow night.']] },
  briefing3: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI]], steps: [
    ['say', 'granny', 'Kurogane hosts the moon-viewing. The Red Lanterns pour the sake. Find the poisoned flask before the lord raises his cup.'],
    ['say', 'granny', 'Then go up. A man like Kurogane always waits at the top.'],
    ['say', 'sojiro', 'And if he wears the castle\'s colors?'], ['say', 'granny', 'Then cut through the colors.'],
    ['say', 'kaede', { sojiro: 'Bring me back a moon cake.', kaede: 'If there are moon cakes, I am taking one.' }]] },
  m3_fail: { bg: 'teahouse', music: null, cast: [['takanori', -20, 0]], steps: [['pose', 'takanori', 'toast'], ['say', 'takanori', 'The moon is generous tonight. A cup to its health...'], ['caption', 'The lord raises his cup... The Red Lanterns have won.']] },
  ending: { bg: 'town', music: 'ending', cast: [['takanori', -30, 0], ['granny', 30, Math.PI]], steps: [
    ['caption', 'Dawn. Lord Takanori opens the granaries of Kokaku.'],
    ['pose', 'takanori', 'toast'], ['say', 'takanori', 'Every bowl in Kasugai will be full by the next moon. See that it is, Grandmother.'],
    ['say', 'granny', 'Rice goes where it is carried, my lord.']] },
  ending2: { bg: 'shop', music: 'ending', cast: [['granny', -40, 0], ['hero', 25, Math.PI], ['other', 50, Math.PI]], steps: [
    ['say', 'granny', 'Black lacquer. The clan\'s crest. You are apprentices no longer.'],
    ['say', 'granny', 'You are Lunchbox Assassins. Seen by none.'],
    ['say', 'kaede', '...Fed by all.'], ['pose', 'sojiro', 'bow'], ['wait', 1.2]] },
  postcredits: { bg: 'sakehouse', music: null, cast: [['hotaru', 0, Math.PI / 2]], steps: [
    ['caption', 'A sake house with red lanterns.'],
    ['say', 'hotaru', 'Two tiers... Then I shall be the lid.']] }
};
Story.barks = {
  idle: ['Another cold night...', 'The barracks rice tastes of sand.', 'When does my watch end?', 'Haaah... (yawn)', 'My feet hurt.', 'My mother said: be a monk. Monks eat.', 'Is that the moon or a rice cake? I am too hungry to know.'],
  chat: ['Did you hear? The magistrate has eel tonight.', 'Eel. And we get millet.', 'Keep your voice down.', 'They say the Red Lanterns pay in silver.', 'Silver does not fill a belly.'],
  notice: ['Hm? What was that?', 'Is someone there?', 'A cat...?', 'Did that shadow move?'],
  search: ['Show yourself!', 'I know I heard something.', 'Check the shadows!', 'Come out, little rat.'],
  lost: ['...Must have been the wind.', 'Bah. My eyes play tricks.', 'Nothing. Back to my post.', 'Too much sake last night.'],
  alert: ['Intruder!', 'Ninja! Over here!', 'Sound the bell!', 'There! Get him!'],
  bell: ['To the bell!', 'Ring the alarm!'],
  body: ['He\'s... dead?!', 'Assassin! Wake the garrison!', 'Who did this?!'],
  bait: ['Oh? A rice ball... nobody will miss it.', 'Free food? Heaven is kind tonight.', 'Just one bite...'],
  poisoned: ['Ugh... my stomach...', 'This rice... is... wrong...'],
  sleepy: ['So... sleepy...', 'Just... resting... my eyes...'],
  hurt: ['Ngh--', 'M-mother...', 'Gah!', 'Hrk...'],
  civilian: ['Eek! Murderer!', 'Please, spare me!', 'Guards! Guards!', 'Help! A ninja!'],
  civIdle: ['Such a pretty night.', 'The rice price went up again.', 'Are the lanterns not lovely?', 'Hush, the guards can hear you.'],
  drunk: ['Another bowl! ...Where is the bowl?', 'I can see two moons. Lucky me.', 'Sing with me! No? Rude.'],
  kanemori: ['More eel! And the good sake!', 'Rice is for those who can pay.', 'Let them eat bark. Bark is free.'],
  tobei: ['Waiting. Quietly. Like a pickle in a jar.', 'Is that a rice ball? ...Later. Yes. Later.', 'I am being very brave right now.', 'My feet are wet. I am fine. Go on.'],
  tobeiWait: ['Waiting. Quietly. Like a pickle in a jar.', 'I will be a rock. A frightened rock.'],
  tobeiFollow: ['Following!', 'Right behind you. Not too close. Is this too close?'],
  tobeiFreed: ['You came! I knew you would.'],
  unmask: ['A Jubako rat.', 'Your lunch is over.', 'You saw through me? Then see this!'],
  ninja: ['A Jubako rat.', 'Your lunch is over.']
};
Story.results = { 'Grand Kaiseki': 'Not one grain out of place.', Makunouchi: 'Well packed.', Ekiben: 'Edible.', Hinomaru: 'Plain rice and one plum. Hm.', Leftovers: 'Even the dogs would refuse this box.' };
/** a line by id or the text itself, the variant for this character */
Story.text = (id, char) => { const t = Story.lines[id] !== undefined ? Story.lines[id] : id; return typeof t === 'object' && t ? (t[char] || t.sojiro) : t; };
Story.speaker = (id, char) => { if (id === 'hero') id = char; if (id === 'other') id = char === 'kaede' ? 'sojiro' : 'kaede'; return Object.assign({ id }, Story.speakers[id] || Story.speakers.granny); };
B.Story = Story;
