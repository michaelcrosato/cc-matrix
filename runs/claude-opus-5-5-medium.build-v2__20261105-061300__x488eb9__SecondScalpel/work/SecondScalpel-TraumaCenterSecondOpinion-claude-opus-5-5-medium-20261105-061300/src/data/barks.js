// Quill's lines by situation. Barks never pause play, and a shared pool keeps them from repeating fast.
(() => {
const G = (window.GAME ||= {});
G.BARKS = {
  slip: ['That was the liver, Doctor. We keep that one.', 'A bold line. Not the one we drew.', 'I have seen worse. He was a plumber.', 'Noted, Doctor. I shall not write it down.', 'The other way would have been traditional.', 'Mm.', 'Breathe, Doctor. One of you should.', 'She will not feel that. You might.'],
  tear: ['Slower. It is not going anywhere.', 'It tore. They do that when hurried.', 'That came out in two parts, Doctor.', 'Along the axis. The way it went in.'],
  low: ['Pulse forty. I mention it only in passing.', 'Getting quiet, Doctor. Syringe.', 'I would dose the IV now, if I were you.', 'Thirty and falling. No rush. Some rush.', 'Stimulant, Doctor. He is using his up.'],
  textbook: ['...Hm.', 'Acceptable.', 'I have seen that done worse. Rarely.', 'I shall tell no one. They would only ask you to do it again.', 'Nice.', 'That one goes in the book, Doctor.'],
  idle: ['Any time, Doctor.', 'The next tool, if it pleases you.', 'I could recite something, while we wait.', 'He is not getting any younger.'],
  phase: ['Next.', 'Good. Keep going.', 'Moving on.', 'That is one thing fixed. There are others.'],
  flow: ['You are in it now, Doctor. Do not look down.', 'Steady hands tonight.', 'Keep that going.'],
  heat: ['It runs hot, Doctor. Let it rest.', 'That is the cautery telling you something.'],
  revived: ['Welcome back, sir. Doctor, you may breathe now.', 'He is with us. Do not make a habit of it.'],
  gift: ['We don\'t discuss it in the lift.', 'There it is.'],
  look: ['No. Again.', 'At my age, everything happens twice.', 'I\'ve seen this one.'],
  bite: ['Something bit him. He has not noticed.', 'They are landing, Doctor. Watch the rings.'],
  readout: ['{v}, Doctor.', 'Pulse {v}.', '{v}. Holding.', 'I have {v}, Doctor.'],
  wrongwire: ['That was not the wire, Doctor. It is still a ship. For now.'],
  loose: ['Loose. Take it out. Do it again.', 'That will not hold, Doctor.'],
  close: ['Dressing.'],
};
G.LOST_LINES = { vitals: ['Time of death, oh-four-twelve. Shall we go again, Doctor?', 'He is gone, Doctor. Take a breath. Take it again.'], time: ['Time of death, oh-four-twelve.', 'We ran out of night, Doctor.'], bomb: ['The ship went, Doctor. I had just washed that apron. Again?'] };
G.RANK_LINES = { S: ['I have nothing to add. Mark the date.', 'I passed instruments to three who could do that. Four.'], A: ['Very nearly dull, Doctor. That is high praise.', 'I would let you operate on my cat.'], B: ['It held. Most things do, if you stitch them.', 'A solid night. Go and shake somewhere private.'], C: ['The patient lived. We shall lead with that.', 'I have seen worse. He was a plumber.'], D: ['Alive is a grade, Doctor. It is the lowest one.', 'I shall file this under "Eventually".'] };
})();
// Each case's own lines for idle, slip, low vitals and phase done; the shared pool fills in between.
(() => {
const G = (window.GAME ||= {});
G.CASE_BARKS = {
  c1: { idle: ['The glass will not pull itself, Doctor.'], slip: ['Mrs. Pellow will want that arm back.'], low: ['She is seventy-four, Doctor. Syringe.'], phase: ['That is for the heron.'] },
  c2: { idle: ['He is holding a long note in there, Doctor.'], slip: ['Flat, Doctor. Very flat.'], low: ['Pressure is dropping a third. Syringe.'], phase: ['Dr. Whitlock will be so pleased.'] },
  c3: { idle: ['Big Tam is not getting any smaller.'], slip: ['There is plenty of him. Not that much.'], low: ['Morag expects him for tea, Doctor.'], phase: ['One thing at a time. All of them.'] },
  c4: { idle: ['Something is humming, Doctor. I am not.'], slip: ['He felt nothing. That is the trouble.'], low: ['He is still whistling. His pulse is not.'], phase: ['He has missed his tide.'] },
  c5: { idle: ['She plays with that hand, Doctor.'], slip: ['That was nearly Brahms, Doctor.'], low: ['Nineteen, and fading. Syringe.'], phase: ['Her mother is in the corridor. Keep going.'] },
  c6: { idle: ['She would have told you to hurry. Hurry.'], slip: ['She will read about that in the notes.'], low: ['Chief. Forty. Do not be sentimental.'], phase: ['She taught you that. Do not tell her.'] },
  c7: { idle: ['The Atlantic is waiting. So is he.'], slip: ['That was the ship. Mostly.'], low: ['He wants a sandwich. Keep him able.'], phase: ['Hold on to something, Doctor.'] },
  c8: { idle: ['It will begin again without you.'], slip: ['She has prayed for worse hands.'], low: ['Sister is slipping. Syringe.'], phase: ['Amen, Doctor. Next.'] },
  c9: { idle: ['It is still a bomb, Doctor.'], slip: ['Gently. I have only just washed this apron.'], low: ['Twenty-five and the ship goes. Syringe.'], phase: ['Still a ship. Good.'] },
  c10: { idle: ['He would have finished by now. He would say.'], slip: ['That was his crosswords, Doctor.'], low: ['Dr. Whitlock is smiling. That is not good.'], phase: ['He will complain. We shall enjoy it.'] },
  c11: { idle: ['Everyone is watching, Doctors. No pressure.'], slip: ['It heard that, Doctor.'], low: ['Don\'t let it go quiet.'], phase: ['Next movement.'] },
  grandrounds: { idle: ['Someone is idle. I shall not say who.'], slip: ['Mind the elbows.'], low: ['Everyone, stimulant. One of you.'], phase: ['Next. Together, if you can bear it.'] },
};
})();
