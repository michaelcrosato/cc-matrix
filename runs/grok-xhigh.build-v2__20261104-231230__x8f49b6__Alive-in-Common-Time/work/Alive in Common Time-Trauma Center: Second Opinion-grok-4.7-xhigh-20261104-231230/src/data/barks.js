/** In-operation lines. Bea never says the forbidden word here. Op 7 is read aloud by Pip. */

const pack = (text, mood = 'stern') => ({ text, mood });

export const BARKS = {
  start: [
    pack('Gel first, child. The harbor is in that wound.'),
    pack('Lamp is hot. Hands are cold. We fix the second one by moving.'),
    pack('Count with me. Four. Then you touch the patient.'),
    pack('Eyes on the field. The gallery can wait.'),
  ],
  nextPhase: [
    pack('Next thing. Do not admire the last thing.'),
    pack('That part is done. The patient did not notice. Keep it that way.'),
    pack('Onward. Smaller movements now.'),
    pack('Phase is closed. Your shoulders are not. Drop them.'),
  ],
  idle: [
    pack('The wound is not going to climb onto the tray, child.'),
    pack('You are thinking. Think with the instrument.'),
    pack('Stillness is for the dead. You are not dead. Move.'),
  ],
  timerLow: [
    pack('Clock, child.'),
    pack('The timer is not a suggestion.'),
    pack('Less poetry. More hands.'),
  ],
  clampReminder: [
    pack('Your clamps are still in. Would you like to sign for them?'),
    pack('Clamps come out before you close. This is not a souvenir shop.'),
    pack('I count metal. You are still wearing the patient.'),
  ],
  vitalsLow: [
    pack("Pressure's falling, child. Stabilizer."),
    pack('The trace is getting rude. Syringe.'),
    pack('Vitals. Now. Then we argue.'),
  ],
  vitalsCritical: [
    pack('We are losing the room. Stabilizer, then the work.'),
    pack('That number is a shout. Answer it.'),
    pack('If you freeze, I will not. Syringe.'),
  ],
  bleeding: [
    pack('You are swimming in it. Suction.'),
    pack('Red is not a design choice. Clear it.'),
    pack('Suction, child. I cannot see your mistake, which is worse.'),
  ],
  fail: [
    pack('Call it. Then go and tell the family. No. You. That is the job.'),
    pack('We stop. We say the time. We do not decorate it.'),
    pack('Hands off. The lesson is the one you hate.'),
  ],
  success: [
    pack('Closed. Count the sponges like you mean it.'),
    pack('The patient keeps the ending. You keep the mess.'),
    pack('Adequate work. Do not bow.'),
  ],
  miss: [
    pack('That was not on the line.'),
    pack('I saw that. The lamp saw that.'),
    pack('Again, and on the line this time.'),
    pack('A miss is a sentence. Do not write another.'),
  ],
  streak: [
    pack('…Adequate.'),
    pack('Keep that. Do not grin.'),
    pack('Your hands have remembered. Let them.'),
  ],
  overflow: [
    pack('It is spilling past the drape. That is how people remember you.'),
    pack('Too much blood for the tray. Suction and a quieter hand.'),
  ],
  hushReady: [
    pack('The quiet is full. Spend it when the room deserves it.'),
    pack('Composure is at the top. Do not waste the breath on pride.'),
  ],
  toolHint: {
    scalpel: pack('Scalpel. Trace the ink, not your nerves.'),
    forceps: pack('Forceps. Pinch, pull along the grain, and do not tear.'),
    suction: pack('Suction. Drink the pool. Do not drink the patient.'),
    gel: pack('Gel. Cover the field until it shines, then stop.'),
    suture: pack('Suture. Gate to gate. Tie when it asks.'),
    laser: pack('Laser. On the target. Bare tissue is not a target.'),
    scanner: pack('Scanner. If you cannot see it, you have not looked.'),
    clamp: pack('Clamp on the beat. Off the beat is a story we will not tell.'),
    syringe: pack('Stabilizer. The vial, then the patient.'),
    defib: pack('Paddles. Charge, and let go inside the gold.'),
  },
  strainIntro: {
    adagio: pack('Adagio. It crawls. Burn it, then lift it out.'),
    staccato: pack('Staccato. The holes sing. Seal them before the choir arrives.'),
    tremolo: pack('Tremolo. It shakes the vessels. Pin it before it spreads.'),
    legato: pack('Legato. A chain. Cut the links from the tail, and do not let them kiss.'),
    crescendo: pack('Crescendo. Starve the feeders before the bloom.'),
    fermata: pack('Fermata. The heart is holding. You shock it back onto the bar.'),
    coda: pack('Coda. Two arms, one core. Drop an arm or the downbeat lands.'),
  },
};

export function barkText(key, arg, n = 0) {
  const row = BARKS[key];
  if (!row) return 'Stay with the field.';
  if (Array.isArray(row)) return row[Math.abs(n) % row.length].text;
  const leaf = (arg && row[arg]) || row.scalpel || row.adagio;
  return leaf?.text || 'Stay with the field.';
}

export function barkMood(key, arg, n = 0) {
  const row = BARKS[key];
  if (!row) return 'stern';
  if (Array.isArray(row)) return row[Math.abs(n) % row.length].mood;
  const leaf = (arg && row[arg]) || null;
  return leaf?.mood || 'stern';
}
