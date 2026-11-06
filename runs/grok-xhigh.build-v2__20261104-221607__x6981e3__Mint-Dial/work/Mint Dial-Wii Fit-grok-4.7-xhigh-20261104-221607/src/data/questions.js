/** Morning questions. The answer changes the remark. It is filed. It is not saved as health data. */
export const QUESTIONS = [
  {
    id: 'sound',
    q: 'When you stand up, what sound do you make?',
    answers: ['Oof.', 'Hnng.', 'I have become the sound.'],
    remarks: [
      'Oof. I have a column for that now.',
      'Hnng. Noted, with sympathy.',
      'You have become the sound. I will file you under audio.',
    ],
  },
  {
    id: 'chair',
    q: 'Have you ever apologised to a chair?',
    answers: ['Yes.', 'Not yet.', 'It started it.'],
    remarks: [
      'The chair has not replied. I checked.',
      'There is still time. The chair is patient.',
      'I will mark the chair as the aggressor. This once.',
    ],
  },
  {
    id: 'stairs',
    q: 'How many stairs is too many?',
    answers: ['One.', 'All of them.', 'Depends who is watching.'],
    remarks: [
      'One. A modest number. I respect it.',
      'All of them. The building will be informed.',
      'An audience changes the stairs. I have seen it.',
    ],
  },
  {
    id: 'ankles',
    q: 'How do you feel about your ankles?',
    answers: ['Fine.', 'We do not speak.', 'Which ones?'],
    remarks: [
      'Fine. I will pretend I did not hear the pause.',
      'Silence is a kind of answer. I have written silence.',
      'There are two. This is not a trick. Usually.',
    ],
  },
  {
    id: 'floor',
    q: 'What is your relationship with the floor?',
    answers: ['Distant.', 'Improving.', 'It is complicated.'],
    remarks: [
      'Distant. The floor remains available.',
      'Improving. The floor is cautiously pleased.',
      'Complicated. I will not take sides.',
    ],
  },
  {
    id: 'knees',
    q: 'If your knees could talk, what would they say?',
    answers: ['Please.', 'Why.', 'Nothing. They have given up.'],
    remarks: [
      'Please. A complete sentence, for a knee.',
      'Why. I ask myself this every morning.',
      'Given up is still a position. It is a low one.',
    ],
  },
  {
    id: 'happy',
    day: 7,
    q: 'Are you happy?',
    answers: ['Yes.', 'No.', 'Is this graded?'],
    remarks: ['I am glad. I think.', 'I have the form for that.', 'It is all graded.'],
  },
];

export function questionFor(day) {
  if (day === 7) return QUESTIONS[QUESTIONS.length - 1];
  return QUESTIONS[(Math.max(1, day) - 1) % (QUESTIONS.length - 1)];
}
