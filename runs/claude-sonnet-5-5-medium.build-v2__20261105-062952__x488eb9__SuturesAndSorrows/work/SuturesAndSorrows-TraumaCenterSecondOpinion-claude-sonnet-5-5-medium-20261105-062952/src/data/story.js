// Story as data. Lines: [who, expression, text]. A line fits two rows of the box (90 characters).
(() => {
const G = (window.GAME ||= {});
const N = { vale: 'DR. VALE', quill: 'NURSE QUILL', oyelaran: 'CHIEF OYELARAN', sokolova: 'DR. SOKOLOVA', percy: 'DR. WHITLOCK', odalys: 'ODALYS', hale: 'DR. HALE', clementine: 'CLEMENTINE' };
G.WHO = id => N[id] || (id && id.startsWith('pt:') ? id.slice(3).toUpperCase() : '');
const S = G.STORY = {};
const sc = (id, bg, lines, o = {}) => { S[id] = { id, bg, lines, ...o }; };
sc('intro', 'harbor', [
  ['', '', 'Port Anselm. Rain on the cranes. Rain on the harbor. Rain, mostly, on St. Erasmus Harbor Hospital.'],
  ['', '', 'To the staff it is St. Raz\'s. It is old, underfunded and proud. Tonight it is also short of surgeons.'],
  ['vale', 'shock', 'Okay okay okay. First solo shift. Sorry! Sorry. Nobody is even here. Sorry.'],
  ['quill', 'neutral', 'Doctor. I have been in Theatre 3 for thirty-one years. It has never once been listening.'],
  ['vale', 'smile', 'You must be Nurse Quill. They said you were... a legend?'],
  ['quill', 'neutral', 'They said I was "furniture". Both are accurate. Scrub in, Doctor.'],
], { card: 'CHAPTER 1: FIRST INCISION' });
sc('c1pre', 'theatre', [
  ['quill', 'neutral', 'Agnes Pellow, seventy-four. She fell through her greenhouse roof. Mostly glass, some begonia.'],
  ['vale', 'shock', 'She wants me to keep the glass. For the grandchildren. Is that... allowed?'],
  ['quill', 'smile', 'I will find a dish. You find the glass. Forceps are north on the wheel, Doctor. Top takes.'],
  ['vale', 'neutral', 'Top takes. Right closes, bottom medicates, left clears. I read the pamphlet.'],
  ['quill', 'neutral', 'There is a pamphlet. Remarkable. Hands, Doctor.'],
]);
sc('c1post', 'scrub', [
  ['vale', 'tired', 'It\'s done. She\'s okay. I\'m okay. My hands won\'t stop shaking.'],
  ['quill', 'neutral', 'They stop around year thirty, Doctor. I\'m told.'],
  ['pt:Agnes Pellow', 'smile', 'Did you keep my glass, dear? The green bits. They catch the light.'],
  ['vale', 'smile', 'Every piece. Sorry. In a dish. Quill labeled it.'],
  ['quill', 'neutral', 'It says "Glass". I am a poet.'],
]);
sc('c2pre', 'office', [
  ['percy', 'smirk', 'Slide Achebe. Trombonist. Hernia. Obviously. Hold the retractor and try not to talk.'],
  ['vale', 'angry', 'It\'s not a hernia. His pain moves when he breathes in. Odalys, can you pull his film?'],
  ['percy', 'shock', 'You argue with a first opinion? From a senior fellow? Who wrote it?'],
  ['odalys', 'smile', 'Okay so don\'t freak out, but your X-ray is humming.'],
  ['quill', 'neutral', 'Lightbox, Doctor. Point at what is really wrong. You get three tries.'],
]);
sc('c2post', 'corridor', [
  ['pt:Slide Achebe', 'smile', 'A cork? From a trombone? Nineteen eighty-seven. I wondered where that went.'],
  ['vale', 'smile', 'You swallowed it in a jazz hall.'],
  ['pt:Slide Achebe', 'smile', 'I swallowed it during a very sincere solo.'],
  ['oyelaran', 'neutral', 'A surgeon who argues with a chart. How tiresome. Do it again, Dr. Vale. The next one, too.'],
  ['vale', 'shock', 'Was that... a compliment?'],
  ['quill', 'neutral', 'From the Chief, Doctor, that was a parade.'],
]);
sc('c3pre', 'corridor', [
  ['', '', 'A crane falls into the harbor yard. Every light in St. Raz\'s turns toward the doors.'],
  ['quill', 'shock', 'Gurney! Big Tam Rennie. Foreman. Chief is away at the Foundation, Doctor.'],
  ['vale', 'shock', 'Then it\'s me. It\'s... me. Okay. Okay okay okay.'],
  ['quill', 'neutral', 'Triage. Bleeders first, then the metal. And Doctor? If he goes, you shock him.'],
  ['vale', 'shout', 'He is not going! He is not going!'],
], { cine: 'gurney' });
sc('c3post', 'scrub', [
  ['vale', 'shock', 'He died. I felt him die. And then everything... went quiet. The rain stopped. Quill, how long was that?'],
  ['quill', 'neutral', 'How long did it feel, Doctor?'],
  ['vale', 'neutral', 'A minute?'],
  ['quill', 'neutral', 'Eleven seconds. We don\'t discuss it in the lift.'],
  ['oyelaran', 'neutral', 'There is an old word in the theatre, Dr. Vale. Sit down. I will say it once.'],
  ['oyelaran', 'smile', 'The Steady.'],
], { chapterEnd: true });
sc('c4pre', 'ward3', [
  ['', '', 'Chapter 2. THE QUIET ONES.', ],
  ['pt:Captain Ned Harrow', 'smile', 'Don\'t fuss, miss. A gaff through the side. I\'m due back at sea on the tide.'],
  ['vale', 'shock', 'Captain, you\'re whistling. You have a hook in your ribs.'],
  ['pt:Captain Ned Harrow', 'smile', 'Does it hurt? Funny. It really doesn\'t.'],
  ['odalys', 'shock', 'Okay so his chart says "superficial". His film says something is moving in there.'],
  ['quill', 'neutral', 'Lightbox, Doctor. Before the scalpel.'],
], { card: 'CHAPTER 2: THE QUIET ONES' });
sc('c4post', 'radiology', [
  ['vale', 'shock', 'Quill, did you hear it? It was singing. A little tk-tk-tk. Like a beat.'],
  ['quill', 'neutral', ''],
  ['vale', 'neutral', 'Quill?'],
  ['quill', 'neutral', 'For the first time in thirty-one years, Doctor, I have nothing to say.'],
  ['odalys', 'shock', 'It\'s not in any database. I checked. Twice. Then I ate something.'],
  ['oyelaran', 'angry', 'No one speaks of this until I have spoken to the Foundation. Is that understood?'],
]);
sc('c5pre', 'ward3', [
  ['pt:Ilse Brandt', 'smile', 'Please, no treatment. My left hand feels nothing. I\'ve never played better.'],
  ['vale', 'sad', 'Ilse, you\'re nineteen. You can\'t feel your hand. That isn\'t a gift.'],
  ['pt:Ilse Brandt', 'smile', 'It is to me. It stopped hurting.'],
  ['odalys', 'shock', 'Vale. Her chart. Every case so far went to an Anodyne clinic. Every single one.'],
  ['percy', 'tired', 'You\'ve been up forty hours. Go home. Please.'],
]);
sc('c5post', 'ward3', [
  ['pt:Ilse Brandt', 'cry', 'It hurts. Oh, it hurts. Thank you.'],
  ['vale', 'cry', 'I know. I know. That\'s good. That\'s so good.'],
  ['quill', 'neutral', 'Pain is information, Doctor. I\'d have you remember that.'],
  ['vale', 'neutral', 'Pain means you\'re still here.'],
  ['quill', 'smile', '...Hm.'],
]);
sc('c6pre', 'gala', [
  ['', '', 'The Anodyne Foundation\'s gala. The new east wing blazes with chandeliers.'],
  ['hale', 'smile', 'Pain is the last disease, friends. I only ask the world to stop defending it.'],
  ['vale', 'neutral', 'He\'s very good. It\'s unsettling.'],
  ['oyelaran', 'shock', 'Imogen. I need... a moment.'],
  ['', '', 'Her cane rolls across the marble. The room goes quiet. Then it goes loud.'],
  ['vale', 'shout', 'Chief! Quill, the east wing theatre, now! I\'m operating!'],
], { cine: 'gala' });
sc('c6post', 'ward3', [
  ['oyelaran', 'tired', 'I took the Foundation\'s money to keep the doors open. And I took Lull for my hands.'],
  ['oyelaran', 'neutral', 'The disease is called HUSH. It sings, Doctor, so we name the strains like songs.'],
  ['oyelaran', 'neutral', 'There is one surgeon who can fight it. Yevgenia Sokolova, on the hospital ship Samaritan\'s Wake.'],
  ['quill', 'shock', ''],
  ['vale', 'shock', 'Quill, you dropped a tray.'],
  ['quill', 'neutral', 'First time in thirty-one years, Doctor. Do not tell anyone.'],
  ['hale', 'smile', 'I hear Dr. Oyelaran is recovering. Wonderful.'],
], { chapterEnd: true });
sc('c7pre', 'shipward', [
  ['', '', 'Chapter 3. SECOND LOOK. A North Atlantic storm. The Samaritan\'s Wake.'],
  ['sokolova', 'smile', 'You are late, Bartholomew.'],
  ['quill', 'neutral', 'Thirty-one years, Yevgenia.'],
  ['sokolova', 'smile', 'At my age, dear, everything happens twice. A winch has crushed a deckhand. Scrub in.'],
  ['vale', 'shock', 'You do this with a pipe in your mouth?'],
  ['sokolova', 'neutral', 'It is not lit. I am not a barbarian.'],
], { card: 'CHAPTER 3: SECOND LOOK', cine: 'storm' });
sc('c7post', 'shipward', [
  ['vale', 'shock', 'You un-happened it. I watched you. The whole table went backward.'],
  ['sokolova', 'smile', 'Second Look. I take back six seconds. Never more. Never less.'],
  ['sokolova', 'neutral', 'No. Again. That is the only prayer a surgeon needs.'],
  ['pt:Yusuf Demir', 'smile', 'Doc? Is it still raining?'],
]);
sc('c8pre', 'chapel', [
  ['pt:Sister Perpetua', 'smile', 'My patients have never been happier, Doctor. They don\'t ask for anything.'],
  ['sokolova', 'angry', 'They are dying with a smile on their faces, Sister.'],
  ['sokolova', 'neutral', 'It regrows from the top. Da Capo. Study the pattern. Rewind once and plan.'],
  ['quill', 'neutral', 'She means it, Doctor. She has rewound me.'],
]);
sc('c8post', 'chapel', [
  ['pt:Sister Perpetua', 'sad', 'You would give them back their pain?'],
  ['sokolova', 'neutral', 'I would give them back their choice.'],
  ['pt:Sister Perpetua', 'cry', 'Then... give them the choice.'],
]);
sc('c9pre', 'shipward', [
  ['pt:Hollis Crane', 'sad', 'I came aboard to confess. My pacemaker is rigged. If my heart stops, or you force the can, it goes.'],
  ['sokolova', 'angry', 'We are doctors. We do not walk away from a bomb in a man.'],
  ['quill', 'neutral', 'I\'ll fetch the other forceps.'],
], {});
sc('c9post', 'shipward', [
  ['pt:Hollis Crane', 'smile', 'You saved me. Then here is the last piece. It began with Hale\'s daughter.'],
  ['pt:Hollis Crane', 'sad', 'Everything is singing to her.'],
  ['sokolova', 'neutral', 'We sail for Port Anselm.'],
  ['vale', 'neutral', 'Together.'],
], { chapterEnd: true });
sc('c10pre', 'office', [
  ['', '', 'Chapter 4. CODA.'],
  ['percy', 'smile', 'It\'s finally quiet. Vale, it\'s finally... quiet.'],
  ['vale', 'shout', 'Percy! Quill, gurney, now!'],
  ['odalys', 'shock', 'His chart. In his own hand. It says "migraine". He wrote it on himself.'],
  ['sokolova', 'angry', 'He took Lull to keep up. Foolish boy. Both of us, Immy. Hands together.'],
], { card: 'CHAPTER 4: CODA' });
sc('c10post', 'ward3', [
  ['percy', 'tired', 'Your stitches are crooked.'],
  ['vale', 'cry', 'You\'re alive.'],
  ['percy', 'smirk', 'Hernia. Obviously.'],
  ['vale', 'smile', 'You are so annoying. I\'m so glad.'],
]);
sc('c11pre', 'er', [
  ['', '', 'Across the city, every Anodyne patient begins to fail at once.'],
  ['hale', 'sad', 'I only wanted her not to hurt. Please. Dr. Vale. Please.'],
  ['vale', 'neutral', 'Put her on the table, Dr. Hale.'],
  ['sokolova', 'smile', 'Everyone is here.'],
  ['oyelaran', 'neutral', 'Chief of Surgery, in a wheelchair, in the gallery. Begin.'],
  ['percy', 'neutral', 'Monitors are mine.'],
  ['odalys', 'smile', 'And I have the film. She\'s humming.'],
  ['quill', 'neutral', 'Forceps, Doctor. Whenever you are ready.'],
], { cine: 'final' });
sc('ending', 'er', [
  ['', '', 'Silence. A beep.'],
  ['clementine', 'cry', 'It hurts. It hurts! Dad... I can feel my hands.'],
  ['hale', 'cry', 'You can feel them.'],
  ['clementine', 'smile', 'It hurts. It\'s wonderful!'],
  ['', '', 'Port Anselm wakes up in pain. St. Raz\'s ER is the happiest, loudest, most furious place on earth.'],
  ['pt:Mrs. Okafor', 'shout', 'Doctor, I have a headache!'],
  ['vale', 'smile', 'Wonderful!'],
  ['hale', 'smile', 'I surrender, Dr. Oyelaran. Gently.'],
  ['vale', 'neutral', 'Quill. Look at my hands.'],
  ['quill', 'neutral', 'They\'ve stopped shaking, Doctor.'],
  ['vale', 'shock', 'No, they haven\'t.'],
  ['quill', 'smile', 'Good.'],
], { ending: true, cine: 'er' });
G.CASE_STORY = { c1: ['c1pre', 'c1post'], c2: ['c2pre', 'c2post'], c3: ['c3pre', 'c3post'], c4: ['c4pre', 'c4post'], c5: ['c5pre', 'c5post'], c6: ['c6pre', 'c6post'], c7: ['c7pre', 'c7post'], c8: ['c8pre', 'c8post'], c9: ['c9pre', 'c9post'], c10: ['c10pre', 'c10post'], c11: ['c11pre', 'ending'] };
// ward chatter: new lines per chapter
G.WARD_TALK = {
  odalys: [['odalys', 'smile', 'Okay so don\'t freak out, but I found a pattern. I\'ll tell you when I can pronounce it.'], ['odalys', 'shock', 'Every patient went to an Anodyne clinic. I\'m eating about it.'], ['odalys', 'smile', 'You\'re the only doctor who looks at my films. I love you. Professionally.'], ['odalys', 'neutral', 'The hum has a key. It\'s A minor. I checked with a piano.']],
  percy: [['percy', 'smirk', 'The vending machine ate my coin. Obviously the machine is wrong.'], ['percy', 'tired', 'I\'m fine. I\'m fine. Don\'t look at my hands.'], ['percy', 'sad', 'Do you ever feel like everyone else got a manual?'], ['percy', 'smile', 'Two minutes. I\'m going to sit very quietly for two minutes. Quietly.']],
  quill: [['quill', 'neutral', 'I am knitting a scarf. It is for no one. It is for everyone.'], ['quill', 'neutral', 'In the merchant navy we had a saying. I have forgotten it. It was rude.'], ['quill', 'smile', 'Your last stitch. Hm. Yes. Hm.'], ['quill', 'neutral', 'Pulse forty. I mention it only in passing. Sit down, Doctor.']],
  agnes: [['pt:Agnes Pellow', 'smile', 'The grandchildren brought begonias. I told them: mind the glass.'], ['pt:Agnes Pellow', 'smile', 'Doctor, you must come for tea when I have my greenhouse back.']],
  slide: [['pt:Slide Achebe', 'smile', 'I\'m practicing with a mute. Out of respect for the other patients.'], ['pt:Slide Achebe', 'smile', 'Nineteen eighty-seven. I think about that cork every day.']],
  chief: [['oyelaran', 'neutral', 'Stop dawdling in my corridor, Doctor. The theatre door is lit for a reason.'], ['oyelaran', 'tired', 'I am resting. Do not tell the board I said that.']],
  tam: [['pt:Big Tam Rennie', 'smile', 'They tell me I died. I tell them I was only resting my eyes.']],
};
// barks: a shared pool of Quill lines by situation, plus per-case lines
G.BARKS = {
  slip: ['That was the liver, Doctor. We keep that one.', 'Hm. I will pretend that did not happen.', 'Steady, Doctor.', 'I have seen worse. He was a plumber.', 'Pulse is not a suggestion, Doctor.', 'Ah. Yes. Well.', 'Breathe, Doctor. One of you should.', 'Sloppy. But honest.'],
  low: ['Pulse forty. I mention it only in passing.', 'Doctor, the number is falling.', 'The patient is leaving, Doctor. Gently, but leaving.', 'Critical. I say that in my calm voice.', 'Syringe, Doctor. South. Bottom medicates.'],
  good: ['...Hm.', 'Neat. Do not look pleased.', 'That stitch could be framed.', 'Quite steady, Doctor.', 'The patient approves. Silently.', 'Textbook, Doctor.', 'That will go in the journal.', 'Lovely. I shall tell no one.', 'Splendid. I remain unmoved.'],
  idle: ['Forceps are north, Doctor.', 'Scalpel, north-east. Do not wave it.', 'Syringe is south. South is hope.', 'The clock does not knit, Doctor.', 'The patient is on a clock, Doctor.', 'North takes, east closes.', 'Hands, Doctor.', 'Whenever you are ready. Which is now.', 'I can knit while you think.'],
  tool: { forceps: 'Forceps.', scalpel: 'Scalpel.', suture: 'Suture.', salve: 'Salve.', syringe: 'Syringe.', cautery: 'Cautery.', suction: 'Suction.', sonar: 'Sonar.' },
  rank: { S: 'I would frame it, Doctor. I won\'t, but I would.', A: 'Well done. Do not let it go to your hands.', B: 'Competent. The nicest thing I say.', C: 'He lives. That is the main thing.', D: 'We shall call that a learning experience.' },
  phase: ['Next.', 'Onward, Doctor.', 'Good. Now the next thing.', 'One more, Doctor.'],
  lost: ['Time of death, oh-four-twelve.', 'We go again, Doctor. Gently.', 'Sit a moment. Then we retry.'],
  code: ['Clear!', 'Paddles. Clear!'],
};
G.CHART = {
  c1: 'Fell through greenhouse roof. Glass in forearm. Wants the glass kept. First opinion: routine.', c2: 'Abdominal pain, trombonist. First opinion: hernia (Whitlock).', c3: 'Crush injury, crane collapse. Multiple trauma. Surgeon away.', c4: 'Gaff through flank, whistling. Feels nothing. First opinion: superficial.', c5: 'Numb left hand, violinist. Declines treatment. Smiling.', c6: 'Cardiac collapse at gala. Concealed illness. The Chief.', c7: 'Winch injury, abdomen. Hospital ship in a gale.', c8: 'Hospice patient, regrowing mass. Never happier.', c9: 'Foundation researcher. Implant rigged to detonate.', c10: 'Collapse, "migraine" (self-diagnosed). Percy.', c11: 'Clementine Hale, 19. Patient zero. Everyone is here.',
};
G.RANK_LINES = G.BARKS.rank;
})();
