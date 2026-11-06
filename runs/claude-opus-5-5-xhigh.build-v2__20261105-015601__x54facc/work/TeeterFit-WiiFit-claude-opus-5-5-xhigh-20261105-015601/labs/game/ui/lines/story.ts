/**
 * @file The five-day story, in one-liners (PLAN.md section 2), notices on the Noticeboard, evening remarks, and what the
 * Wobble Age comparison says, in a tone of mild scientific surprise.
 *
 * Game code, a page's data.
 *
 * @example
 * LINES_STORY['day.1.intro'][0];
 */

/** The lines, by id. */
export const LINES_STORY: Readonly<Record<string, readonly string[]>> = {
  'day.1.intro': ['Welcome to Little Fulcrum. The ferry has left. Please step on me when you are ready.'],
  'day.2.intro': [
    'Good morning. The plaques have moved. They have not. Guests are reminded to distribute themselves evenly.',
  ],
  'day.3.intro': ['Good morning. Today is about water. Drinks may slide along tables. That is a feature of the drink.'],
  'day.4.intro': ['Good morning. The marbles have started without you. Please do not encourage them.'],
  'day.5.intro': ['Good morning. There is a class. Then there may be some weather. Please stand further east.'],
  'day.6.intro': ['You stayed. Good morning. Everything is level. Your Morning Check is ready. It always is.'],

  'evening.1': [
    'Today you wobbled less than you might have. Goodnight.',
    'Your first day. You stood on a lot of things. Goodnight.',
  ],
  'evening.2': [
    'Today your plaques stayed roughly where you left them. Goodnight.',
    'You were adequately distributed today. Goodnight.',
  ],
  'evening.3': [
    'Today the water held you, mostly. Goodnight.',
    'You came back from the sea twice as yourself. Goodnight.',
  ],
  'evening.4': [
    "The island sits on one rock. We don't mention it to guests. You're a guest. I didn't mention it. Goodnight.",
  ],
  'evening.5': ['Everything is balanced now. Goodnight, I suppose.'],
  'evening.6': ['Another day, and you are still here. Goodnight.', 'Tomorrow will be level. Goodnight.'],

  'age.first': [
    "This is your first Wobble Age. It is terrible. Everyone's is. Yours is especially so, but in a promising way.",
    'Your Wobble Age is {age}. This is high. You are welcome to feel something about that.',
  ],
  'age.younger': [
    'Your Wobble Age is {age}. Yesterday it was {before}. You have become {diff} years younger by standing still. Science.',
    'Your Wobble Age is {age}. Yesterday: {before}. We cannot explain it, and we have stopped trying.',
  ],
  'age.older': [
    'Your Wobble Age is {age}. Yesterday it was {before}. That is {diff} years in one night. Did you do something? You do not have to tell me.',
    'Your Wobble Age is {age}. Yesterday: {before}. I will write that down in pencil.',
  ],
  'age.same': [
    'Your Wobble Age is {age}. It was {age} yesterday. You have not aged at all. We will be looking into you.',
  ],

  'notice.1': ['Please keep to the centre.'],
  'notice.2': ['Notice: Guests are reminded to distribute themselves evenly.'],
  'notice.3': ['Notice: If your drink slides, that is a feature of the drink.'],
  'notice.4': ['Notice: Marbles found moving should be left alone. They know what they are doing.'],
  'notice.5': ['Notice: The east lawn is fully booked. Please enjoy the east lawn.'],
  'notice.6': ['Notice: The ferry timetable has been removed. It was upsetting people.'],

  'unlock.expert': ['Ten pebbles. Expert classes are open: a smaller ring, and more sway. Nobody asked for this.'],
  'unlock.color': ['Twenty pebbles. There is a new tracksuit in your hut. It was always there.'],
  'unlock.headband': ['Thirty pebbles. There are new tracksuits. They will not help.'],
  'unlock.stamps': ['Forty pebbles. You have the Unsettling stamp set. We do not know who approved it.'],
};
