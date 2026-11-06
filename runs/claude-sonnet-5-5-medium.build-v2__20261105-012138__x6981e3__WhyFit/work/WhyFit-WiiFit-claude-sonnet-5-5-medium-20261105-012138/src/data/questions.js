// Morning questions. Three answers each; they change only the remark, and Ounce files them.
export const QUESTIONS = [
  { q: 'When you stand up, what sound do you make?', a: ['Oof.', 'Hnng.', 'I have become the sound.'] },
  { q: 'Have you ever apologised to a chair?', a: ['Yes.', 'Not yet.', 'It started it.'] },
  { q: 'How many stairs is too many?', a: ['One.', 'All of them.', 'Depends who\'s watching.'] },
  { q: 'How do you feel about your ankles?', a: ['Fine.', 'We don\'t speak.', 'Which ones?'] },
  { q: 'What is your relationship with the floor?', a: ['Distant.', 'Improving.', 'It\'s complicated.'] },
  { q: 'If your knees could talk, what would they say?', a: ['Please.', 'Why.', 'Nothing. They\'ve given up.'] },
  { q: 'Are you happy?', a: ['Yes.', 'No.', 'Is this graded?'], day7: true },
];
export const questionFor = (day) => (day >= 7 ? 6 : (day - 1) % 6);
