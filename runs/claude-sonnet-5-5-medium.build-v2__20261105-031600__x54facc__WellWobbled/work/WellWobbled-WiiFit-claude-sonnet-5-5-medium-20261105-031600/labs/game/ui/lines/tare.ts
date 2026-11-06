/**
 * @file Tare's lines, keyed by id. The sim emits ids; the page says them. A value that is a list is a pool (one is chosen by
 * the day and the count). No line is longer than two short sentences.
 * @example
 * TARE['tare.check.welcome']; // 'Please step on me. ...'
 */
export const TARE: Record<string, string | string[]> = {
  'tare.intro.1': "Welcome to Little Fulcrum. I am Tare. I used to weigh people. We don't talk about that.",
  'tare.intro.2':
    'I no longer measure weight. It made people sad, and it made me sad. Now I only measure how much you wobble.',
  'tare.intro.3': 'Please step on me. Not like that. Actually, like that is fine.',
  'tare.check.welcome': [
    'Good morning. One question, then three small tests. Press ✕ for yes.',
    'Good morning again. Same question as yesterday. It may not be the same question.',
  ],
  'tare.check.ring': 'Stand in the ring. It is smaller than it looks. It is also smaller than it will look.',
  'tare.check.reach': 'Now reach for the lights, one at a time. Hold each until it is sure of you.',
  'tare.check.footL': 'Lift your right foot. Hold the left. I am not allowed to say which one is which.',
  'tare.check.footR': 'Hold the right foot down and lift the other. You know the one. Everyone does.',
  'tare.age.better':
    'Your Wobble Age is {age}. Yesterday it was {prev}. You have become {diff} years younger by standing still. Science.',
  'tare.age.worse':
    'Your Wobble Age is {age}. Yesterday it was {prev}. That is {diff} years older. It is a little your fault.',
  'tare.age.same':
    'Your Wobble Age is {age}. It is the same as yesterday. I checked twice. I am very proud of the number.',
  'tare.age.first': 'Your Wobble Age is {age}. It is your first. You will want a second.',
  'tare.best': 'That was your best score so far. It is also your only score so far. Well done on both.',
  'tare.back': 'You came back. A lot of people say they will.',
  'tare.q.1': 'Have you been leaning toward anything lately? A person? A decision?',
  'tare.q.2': "Did you sleep on your left side? You don't have to answer. I can tell. I can't tell. Did you?",
  'tare.q.3': 'Have you ever stood on one foot when nobody was looking?',
  'tare.q.yes': 'I know.',
  'tare.q.no': 'I know.',
  'tare.keep': 'Please keep to the centre. No reason.',
  'tare.fine': 'Everything is fine. If anyone asks, everything was always fine.',
  'tare.line.begin': 'Forty metres of rope. Three flags. The rope has never once complained.',
  'tare.line.gull': 'The Gull has landed on your arm. It has been waiting for you. Flick it off, gently, urgently.',
  'tare.line.fall': 'You have left the line. The line is fine.',
  'tare.line.closed': 'The line closes at this time.',
  'tare.paddle.begin': 'Twelve buoys, one lagoon. Lean to go, lean sideways to turn. The water has opinions.',
  'tare.paddle.wake': "That was the ferry's wake. It is leaving. It is always leaving.",
  'tare.paddle.turtle': 'A turtle is crossing. It has right of way. It has always had right of way.',
  'tare.garden.0': 'One marble. One hole. The tray is level. The tray is level-ish.',
  'tare.garden.1': 'Two marbles. A ridge. Marbles prefer holes they did not choose.',
  'tare.garden.2': 'There is a gap in the rim. It is not a feature. It is a feature of the rim.',
  'tare.garden.3': "Three marbles and a moving rake. The rake is not on your side. The rake is on the tray's side.",
  'tare.garden.4': 'The last tray. Some of these marbles are rolling by themselves. I did not say that.',
  'tare.cliff.0': 'Fourteen metres. Hold your breath, hold your ring. Let go when the gauge is proud.',
  'tare.cliff.1': 'Second dive. The Gulls remember the first one. They are not unkind about it.',
  'tare.cliff.2': 'Last dive. One judge always scores four. We do not discuss the judge.',
  'tare.hoop.begin': 'Spin your stick in circles. Not too fast. Not too slow. The hoops can tell.',
  'tare.hoop.incoming': 'Hoop incoming. Lean that way, if you would like to be liked by it.',
  'tare.jog.begin': 'Stay near Gerald. He is always already there. He is always already finished.',
  'tare.tilt.carts':
    'Crank the carts, one foot then the other. Lean into the slope. The cairn is on the cart. All of it.',
  'tare.tilt.dawn': 'Everything is balanced now. Please do not tell anyone about the rock.',
  'tare.rock': "We don't mention it to guests. You're a guest. I didn't mention it.",
  'tare.sleep': 'Sleep well. I will stand here. I do not sleep. I recalibrate.',
  'tare.free': 'You may stay as long as you like. The ferry does not return.',
  'tare.talk.1': 'I am only a scale in the sense that I am round and sad.',
  'tare.talk.2': 'Plumb says my name is Tare because it is what is left when everything else is subtracted.',
  'tare.talk.3': 'Do you ever feel the island lean? No? Me neither. Me neither.',
  'tare.talk.4': 'The pebbles are not for spending. They are for having.',
  'tare.pebble': [
    'A pebble. It was waiting.',
    'Another pebble. The island has plenty of them, for now.',
    'You found a pebble. I did not move it. I did, a bit.',
  ],
  'tare.hop': 'Hop! That was not on the programme. Do it again.',
  'tare.mash': 'Please stop pressing everything. It is only a button. It is not even your button.',
};
