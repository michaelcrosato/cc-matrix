// Reaction pools: barks in surgery, chosen by the comm director. Short and breathless.
export const LINES = {
  reyes: {
    mistake: ["That was a person's. You will want to not do that.", 'Doctor. *Doctor.* Eyes on the patient.', 'I have seen sharper work from the vending machine.', "He's losing blood faster than this hospital loses money. *Drain it.*", 'Did you practise on anything first? Fruit, perhaps?', "That's a mistake. I am writing it down. In pen."],
    clean: ['...Adequate.', "...Adequate. Don't let it go to your head. It's not attached to anything useful.", 'Hm.', 'Again. Exactly like that.', 'Do not look so pleased. Keep going.', 'Somebody taught you something. Who was it, so I can thank them.'],
    lowVitals: ['*Vitals!* Doctor, look at the monitor!', 'Syringe! Now! Quickly, Doctor!', 'He is going. He is going, Doctor!', 'If you are praying, pray with your hands.'],
    wrongTool: ['Wrong instrument, Doctor. That needs the *{want}*.', 'The *{want}*. It is on the wheel. It has always been on the wheel.', 'You are holding that wrong. And it is the wrong thing. *{want}.*'],
    doseWasted: ['In the ring. The *ring*, Doctor. That was somebody\'s dose.', 'You just gave the drape a sedative.'],
    noDose: ['There are no more doses. There is only you.'],
    knock: ['It knocked. Do not you dare knock back.', 'There. It is surfacing!'],
    giftDenied: ['You are out of composure. I can tell from here.'],
  },
  sabine: {
    mistake: ['I saw that.', 'That will be in the report.', 'Show your work. Not that work.'],
    clean: ['Acceptable.', 'Hm. Continue.', 'Adequate.'],
    lowVitals: ['You are losing him. I am telling you, not asking.', 'Stabilise. Then we can discuss your hands.'],
    wrongTool: ['The *{want}*, Doctor.'],
    doseWasted: ['That was wasteful.'],
    noDose: ['No doses left. Interesting.'],
    knock: ["Don't answer it until you're ready."],
    giftDenied: ['You have not earned that yet.'],
  },
  pem: {
    lowVitals: ['Vitals are in the basement. I would take the stairs, Doctor.', 'Patient is going under, and I mean further than I put him.'],
  },
};
export const SPEAKER_NAMES = { ilya: 'DR. MARSH', reyes: 'NURSE REYES', sabine: 'DR. ACHTERBERG', bram: 'CHIEF BRAM', pem: 'DR. OKOYE', hesper: 'DR. LINDQVIST', tomasz: 'MR. DOLAN', zamboni: 'THE GREAT ZAMBONI', anselm: 'MR. ANSELM', ottilie: 'OTTILIE', ollie: 'OLLIE' };
export const TOOL_NAMES = { scalpel: 'SCALPEL', forceps: 'FORCEPS', suture: 'SUTURE', drain: 'DRAIN', syringe: 'SYRINGE', gel: 'GEL', laser: 'LASER', scanner: 'SCANNER', dressing: 'DRESSING', marker: 'MOVE' };
