// The shared pool of Quill's lines by situation, so play never repeats fast. Each case adds its own (phase enter, idle hint, done).
// A bark is at most 40 characters: one line in the box. Barks never pause play.
(() => {
const G = (window.GAME ||= {});
G.BARKS = {
  slip: ['That was the liver, Doctor. We keep that.', 'I have seen worse. He was a plumber.', 'Noted. In ink.', 'Perhaps less of that, Doctor.', 'The patient would object, if able.', 'We do not usually go that way.', 'Mm. Bold.', 'I shall call that exploratory.', 'That is not on the chart.', 'Gently, Doctor. It has feelings. Had.'],
  tear: ['Slower. It is not a tablecloth.', 'That came out with friends.', 'Along the arrow, Doctor.', 'Less haste. More forceps.'],
  nerve: ['That line is gold for a reason, Doctor.', 'He will miss that finger. Do not repeat.', 'Gold means no. It is a short rule.'],
  loose: ['Loose, Doctor. Again.', 'That one will not hold a sneeze.', 'Out the far dot, if you please.'],
  lock: ['Let it cool, Doctor. So must we all.', 'Too hot. Count to one.'],
  low: ['Pulse forty. I mention it only in passing.', 'Thirty, Doctor. Syringe. Bottom of wheel.', 'Breathe, Doctor. One of you should.', 'She is leaving us. Some IV, perhaps.', 'I would not linger, Doctor.', 'Numbers are poor. I have knitted better.', 'He is thinking about going. Dissuade him.'],
  textbook: ['...Hm.', '...Hm.', 'Adequate.', 'I have seen that done worse.', 'Do not let it go to your head.', 'They will not teach you that.', 'Oh. Very good. Do not tell anyone.', 'Year thirty, I would have said. Hm.'],
  found: ['There. On the edge of the lens.', 'Marked. It will not stay marked.', 'Something answered, Doctor.'],
  code: ['Code Blue. Paddles, Doctor.', 'He has stopped. Paddles.', 'Clear, when you are ready. Be ready.'],
  revive: ['There he is. Welcome back.', 'Sinus rhythm. I shall stop holding this.', 'And we are all still here.'],
  breath: ['There it is. Do not say it in the lift.', 'Take your time, Doctor. All of it.'],
  look: ['No. Again.', 'I have seen this one.', 'Once more, from before you did that.'],
  dressing: ['Dressing.', 'Dressing, Doctor.', 'Dressing. Press when the ring meets it.'],
  idle: ['Any time, Doctor. He has all night. No.', 'I can hold this all night. He cannot.', 'I knit in my breaks. This is not one.', 'The clock is decorative, I am sure.', 'Doctor. The patient. There.'],
  tension: ['Slowly. It is listening.', 'Too fast. Feel it, do not yank it.', 'Softly, softly. Catch the monkey.'],
  beat: ['Between beats, Doctor.', 'Wait for the heart. It knows the song.'],
  dome: ['Inside that, nothing moves. Not you.', 'It holds. Wait for it to let go.'],
  giftNo: ['You have not earned it yet, Doctor.'],
};
G.pickBark = (key, rnd = Math.random) => { const list = G.BARKS[key]; if (!list || !list.length) return null; return list[Math.floor(rnd() * list.length) % list.length]; };
})();
