/**
 * @file What is said about results, evenings and days: Tare's scientific surprise, Plumb's adjectives, the five days' opening
 * lines, the cairn's unlocks and the final remark. All chosen by the page from what the sim reports.
 */
export const RESULT_LINES: Readonly<Record<string, string>> = {
  'rank.Present': 'You were present. That has been noted. There is a form.',
  'rank.Adequate': 'That was adequate. I chose that word carefully.',
  'rank.Composed': 'You were composed. You may tell people. I would not.',
  'rank.Serene': 'That was serene. Please do not do it near the other guests.',
  'rank.Unsettling': 'That was unsettling. I have asked the mat if it is all right.',
  first: 'That was your best score so far. It is also your only score so far. Well done on both.',
  best: 'That is your best yet. I have told no one. I have told everyone.',
  worse: 'You have done that better. You know you have. It is written on a stone.',
  'age.first': 'Your Wobble Age is {age}. That is a number. I will not say whose.',
  'age.younger':
    'Your Wobble Age is {age}. Yesterday it was {prev}. You have become {diff} years younger by standing still. Science.',
  'age.older':
    'Your Wobble Age is {age}. Yesterday it was {prev}. You have aged {diff} years overnight. It happens. It happens to you.',
  'age.same': 'Your Wobble Age is {age}. It was {prev} yesterday. Yes. I checked it twice. I don’t know either.',
  'age.best': 'Your Wobble Age is {age}. Old Nan is nineteen. I mention it for no reason.',
  'evening.1': 'Today you wobbled less than you might have. Goodnight.',
  'evening.2': 'The plaques may be in different places tomorrow. They won’t. Goodnight.',
  'evening.3': 'Your drink has been returned to your hut. It got there first. Goodnight.',
  'evening.4': 'I am going to tell you something. There is one rock. I didn’t mention it. Goodnight.',
  'evening.5': 'You may stay as long as you like. The ferry does not return. Goodnight.',
  'evening.6': 'You came back again. Everything is balanced. Please don’t check. Goodnight.',
  'morning.2': 'Guests are reminded to distribute themselves evenly.',
  'morning.3': 'Please note that sliding drinks are a feature of the drink.',
  'morning.4': 'Marbles may roll by themselves today. Please do not assist them.',
  'morning.5': 'Group Class at noon. There is a light chance of everything this evening.',
  'morning.6': 'You may stay as long as you like. The ferry does not return.',
  'arrive.1': 'The ferry leaves. It does not hurry. Please keep to the centre.',
  'arrive.2': 'Sign: Please keep to the centre.',
  'unlock.expert':
    'Your cairn is ten pebbles high. The Noticeboard now offers Expert: a smaller ring. You did this to yourself.',
  'unlock.colours': 'Twenty pebbles. New tracksuit colours are in Settings. Nobody will look at them. Everyone will.',
  'unlock.headband': 'Thirty pebbles. You have earned a headband. It doesn’t do anything. It knows.',
  'unlock.stamps': 'Forty pebbles. The Unsettling stamp set is yours. We ask you to use it sparingly.',
  'final.high':
    'Everybody got uphill. I have written that down, then rubbed it out. Please don’t tell anyone about the rock.',
  'final.mid': 'Enough people got uphill. The island has agreed to let it go.',
  'final.low': 'It came level by itself in the end. It wanted you to feel involved. You did well to be there.',
  after: 'You may stay as long as you like. The ferry does not return.',
};
