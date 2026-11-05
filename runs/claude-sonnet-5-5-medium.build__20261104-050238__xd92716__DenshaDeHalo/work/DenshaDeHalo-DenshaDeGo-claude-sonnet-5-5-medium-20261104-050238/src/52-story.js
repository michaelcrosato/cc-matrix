/* The story: one day on the Halo Line. Short, polite, a little dry, like the source: terse arcade calls, formal announcements. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH;

DH.CAST = {
  hoshino: { name: 'HOSHINO', full: 'Chief Instructor Tetsuo Hoshino', voice: 'hoshino', color: '#ffd36a', rig: () => new E.Humanoid({ size: 1.3, hat: { style: 'cap', color: '#1b3a5c' }, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { cloth: '#1b3a5c', coat: '#1b3a5c', hair: '#d4d4d4', trim: '#d6b24a', pants: '#1b2a3a', skin: '#e2bd98' } }) },
  rookie: { name: 'YOU', full: 'Rookie Driver', voice: 'rookie', color: '#9fd8ff', rig: () => new E.Humanoid({ size: 1.3, hat: { style: 'cap', color: '#27b3c6' }, outfit: 'shirt', hair: 'spiky', sleeves: 'long', colors: { cloth: '#f0f4f8', hair: '#3a2a22', trim: '#27b3c6', pants: '#1b2a3a', skin: '#e8c4a0' } }) },
  mimi: { name: 'CONTROL', full: 'Dispatcher Mimi Ota', voice: 'mimi', color: '#ffb0d0', rig: () => new E.Humanoid({ size: 1.3, hair: 'ponytail', outfit: 'shirt', sleeves: 'short', colors: { cloth: '#d9e4f0', hair: '#5a2a3a', trim: '#e8607a', skin: '#f0d0b0' } }) },
  daichi: { name: 'CONDUCTOR', full: 'Conductor Daichi', voice: 'conductor', color: '#a0ffd0', rig: () => new E.Humanoid({ size: 1.3, hat: { style: 'cap', color: '#0e6f86' }, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { cloth: '#0e6f86', coat: '#0e6f86', hair: '#222', trim: '#fff', skin: '#e6c09c' } }) },
  haloru: { name: 'HALORU', full: 'Haloru the Station Mascot', voice: 'halo', color: '#fff2a0', rig: () => new E.Humanoid({ size: 1.1, build: 'chibi', hat: { style: 'band', color: '#ffd23a' }, outfit: 'tunic', hair: 'bald', weapon: null, colors: { cloth: '#ffd23a', skin: '#fff6d0', trim: '#fff' } }) }
};

DH.STORY = {
  S0: { brief: [
    ['hoshino', 'Good morning. I am Hoshino. For thirty-eight years I have driven this ring, and I have never once been late.'],
    ['hoshino', 'Today is my last day. You are my last student. Please do not make it a short career.'],
    ['hoshino', 'The rules are few. Read the line. Stop on the mark. Arrive on the second. Point at everything, and say what you see.'],
    ['hoshino', 'You cannot steer, open the doors, or reverse. The track steers, the conductor opens doors, and reversing is for people who missed the mark. We will be kind about it.'],
    ['rookie', 'Understood, Chief. Point at everything.']],
    arrive: ['hoshino', 'Mm. Acceptable. The mark is not a suggestion, it is a promise to the passengers.'],
    outro: [['hoshino', 'Orientation is over. Tomorrow the ring has real people on it. They will wave. Do not wave back until the doors are shut.']] },
  S1: { brief: [
    ['mimi', 'Control to Halo Line driver. The 07:40 is full. A slow train is ahead of you, so watch the signals.'],
    ['hoshino', 'A red signal is not an opinion. Slow before it, stop at it, wait. The train ahead will leave when it is ready.'],
    ['rookie', 'And if I am late?'],
    ['hoshino', 'Then you are late. Better late than a story in the newspaper.']],
    outro: [['mimi', 'Good work this morning. A passenger left a note. It says, "Thank you for the smooth stop." Frame it.']] },
  S2: { brief: [
    ['daichi', 'Conductor Daichi here. Rain since dawn. The wheels slip, the passengers do not.'],
    ['hoshino', 'Wet rails stretch every brake. Begin earlier than you think, and ease off before you stop.'],
    ['daichi', 'There is a school trip waiting at Neko Market. Twenty-eight children. Very excited. Very loud.']],
    rush: ['daichi', 'Doors! The children are still boarding. Hold the train, please.'],
    outro: [['daichi', 'Twenty-eight children, all seated. One asked if you were a real train driver. I said yes. Do not make a liar of me.']] },
  S3: { brief: [
    ['hoshino', 'The Comet X7. Eight cars, two hundred tons of opinion. It does not like being told to stop.'],
    ['mimi', 'Note: the crossing at Matsu Garden has had a stalled vehicle twice this month. If you see one, use the horn and be ready to brake.'],
    ['hoshino', 'Sound the horn at the board. Always. It is polite, and sometimes it saves a life.']],
    obstruction: ['mimi', 'Driver, a vehicle is stopped on the crossing ahead. Use the horn!'],
    outro: [['hoshino', 'The horn is not rude. Remember that. It is the opposite of rude.']] },
  S4: { brief: [
    ['mimi', 'Fog over the whole ring. A slow order is in force near Akari: twenty-five, track crew on the line.'],
    ['hoshino', 'Fog hides the signals until they are close. Slow before you can see. A good driver trusts the timetable, not the window.'],
    ['rookie', 'Chief, you are very calm.'],
    ['hoshino', 'I am nervous. I have only ever been nervous at night. It is the same nerves, only darker.']],
    outro: [['hoshino', 'One more shift. The last train of my life. I would like to take it with you.']] },
  S5: { brief: [
    ['hoshino', 'The Last Train. Storm, signals, the slow order and one very important stop.'],
    ['mimi', 'Control to Last Train: the ring is yours. Every light on the line is green for you, if you earn it.'],
    ['hoshino', 'The final station is Akari Central. Sixty-one years ago, my father drove the first train out of it. Please stop on the mark.']],
    outro: [] },
  PR: { brief: [['mimi', 'Parallel Run! Everyone starts at Akari Central. Best stops and timetable win the day.']], outro: [] },
  ENDING: [
    ['hoshino', 'Akari Central. Doors open. The ring is closed.'],
    ['hoshino', 'You stopped on the mark. You arrived on the second. You pointed at everything, and even the signals felt seen.'],
    ['mimi', 'Control to Halo Line: thank you, Chief. Thirty-eight years. The ring is quiet without you already.'],
    ['daichi', 'We have a small cake in the staff room. It is shaped like a train. It is a little crooked, like all the best things.'],
    ['hoshino', 'Rookie. The line is yours now. Be on time. Be kind. Be on time.'],
    ['rookie', 'Hello, Halo Line. Densha de Halo!']]
};

DH.RANKS = { S: 'Halo of Gold', A: 'Silver Halo', B: 'Bronze Halo', C: 'Tin Halo', F: 'No Halo' };
DH.POSTCARDS = {
  S0: 'A paper crane left on the lever. "Welcome to the ring. - H."', S1: 'A commuter\'s note: "Thank you for the smooth stop. I made my meeting."', S2: 'A child\'s crayon drawing of a train with a very long smile.',
  S3: 'A driver\'s card, signed by a man who once stalled his car on the crossing. "Sorry. Thanks for the horn."', S4: 'A bowl of ramen, delivered to the cab window at Hikari Gate. Still warm.', S5: 'The Chief\'s old brass whistle. On the tag: "Be on time. Be kind."'
};
DH.TIPS = [
  'Brake early, ease off late. The best stops feel like nothing at all.', 'A yellow signal means slow down to 45 by the signal. Red means stop short of it.',
  'Wet rails make every brake notch weaker. Begin earlier in the rain.', 'Point and call at every signal and at the stop marker. It earns points and keeps you honest.',
  'Hold the horn at the blue boards before crossings and tunnels.', 'Release the brake gently just before you stop to avoid the lurch.', 'The ATS brakes for you when you ignore it, and takes Halo Time as its fee.'
];
DH.ANNOUNCE = {
  arrive: n => 'We will soon be arriving at ' + n + '. Please mind the gap.', depart: n => 'This is the Halo Line. The next station is ' + n + '.', doors: 'The doors are closing. Please stand clear.'
};
})();
