/**
 * @file What the people say when you walk up to them, by person and day. Each has new lines each day; Gerald says only
 * "Morning." until Day 4.
 *
 * Game code, a page's data.
 *
 * @example
 * LINES_PEOPLE['talk.gerald.1'][0]; // 'Morning.'
 */

/** The lines, by id. */
export const LINES_PEOPLE: Readonly<Record<string, readonly string[]>> = {
  'talk.tare.1': [
    "Welcome to Little Fulcrum. I am Tare. I used to weigh people. We don't talk about that.",
    'I no longer measure weight. It made people sad, and it made me sad. Now I only measure how much you wobble.',
    'The ferry has gone. It does that. Your things are in your hut. Some of your things.',
    'Please keep to the centre. No reason.',
  ],
  'talk.tare.2': [
    'You came back. A lot of people say they will.',
    'The plaques have moved. They have not. Please do not mention it to them.',
    'Everything is fine. It is very fine. I am fine.',
    'Some guests like to wave at Gerald. Gerald allows it.',
  ],
  'talk.tare.3': [
    'If your drink slides, that is a feature of the drink.',
    'The water looks level from here. I recommend staying here.',
    'Have you been up to the Centre Stone? Please do not. It says so on the plate.',
    'I am told I hum when I am nervous. I do not have a mouth.',
  ],
  'talk.tare.4': [
    "We don't mention it to guests. You're a guest. I didn't mention it.",
    'The marbles do that by themselves now. It is a new kind of garden.',
    'I weighed the island once. Do not tell Instructor Plumb. It was the most anyone has ever weighed.',
    'One rock. It is a good rock. I would not say anything against that rock.',
  ],
  'talk.tare.5': [
    'Today is a very normal day. Please stand further east.',
    'Everything is fine. If anyone asks, everything was always fine.',
    'If you see a lot of people on the east lawn, you did not. It is fully booked.',
    'I have stopped being able to read my own needle.',
  ],
  'talk.tare.6': [
    'You stayed. I did not think anyone would. I will not weigh you. I promise.',
    'It is level now. I would know. I checked it with myself.',
    'Same time tomorrow? There is only the same time, now.',
    'That was your best morning so far. I will say that every morning.',
  ],
  'talk.plumb.1': [
    'Welcome. You are wobbling. It is all right. Everyone is, at first.',
    'Your first class is at the Pavilion. It is the white one. They are all white.',
    'Breathe in. Breathe out. You have been doing this for years, and yet.',
  ],
  'talk.plumb.2': [
    'Good. Now do that again, but as though you meant it.',
    'You look taller today. No. I have looked again.',
    'I do not get tired. I have tried.',
  ],
  'talk.plumb.3': [
    'Water is only a floor that has stopped trying.',
    'The line is for the balance. The boat is for the rest of you.',
    'I have never fallen. I once sat down quite quickly.',
  ],
  'talk.plumb.4': [
    'Some of the marbles have left. Let them go.',
    'I see you have been talking to the scale. It talks.',
    'Your knee is where it should be. I mention it because it is rare.',
  ],
  'talk.plumb.5': [
    'Class is at the usual time. Please arrive from the east.',
    'There will be weather. I do not call it weather. I do not call it anything.',
    'My hair is not moving. That is the correct number of times for it to move.',
  ],
  'talk.plumb.6': [
    'You remained. Good. I have no further remarks.',
    'Do not tell me about the storm. I was there. I was perfectly still.',
    'Tomorrow, we will do this again. It will be the same. It will be better.',
  ],
  'talk.gerald.1': ['Morning.'],
  'talk.gerald.2': ['Morning.'],
  'talk.gerald.3': ['Morning.'],
  'talk.gerald.4': ['Afternoon.', 'Still afternoon.', 'Over there. East.'],
  'talk.gerald.5': ['East.', 'Morning. East.', 'Bit steep.'],
  'talk.gerald.6': ['Morning.', 'Still here.', 'Nice weather for it.'],
  'talk.bex.1': [
    'My mum says this is good for me.',
    "I got a 98. I wasn't trying.",
    'This is a stone. It looks like a phone. There is no signal here. It is also a stone.',
    'Are you going to do the thing on the mat? Everyone does the thing on the mat.',
  ],
  'talk.bex.2': [
    'Plaques move here. Nobody cares. I care a bit. Not a lot.',
    'I can do the Heron for an hour. I did it by accident.',
    'My stone says you are doing fine. I typed that.',
  ],
  'talk.bex.3': [
    'The drinks go that way. All of them. I have started betting on them.',
    'Have you noticed the sea looks sort of wrong? No? Cool. Me neither.',
    "If you fall in, it is warmer than it looks. Don't ask how I know.",
  ],
  'talk.bex.4': [
    'The scale told you too, right? About the rock? It told me and it told the frog.',
    'I got a 99. Annoying. I was trying.',
    'Nothing is level here. Have you ever seen a level? I found one. It left.',
  ],
  'talk.bex.5': [
    'Everyone is walking east like it is normal. It is normal. It is fine.',
    'My mum says to stay away from weather. I think she means this.',
    'I am going to stand here until it stops being a problem.',
  ],
  'talk.bex.6': [
    'So that happened. Nobody is going to believe my stone.',
    "My mum still says this is good for me. I'm starting to worry she is right.",
    'Why are you still here? No, same.',
  ],
  'talk.nan.1': [
    "I've been standing here since Tuesday.",
    'Which Tuesday? Yes.',
    'I am ninety-one. My Wobble Age is nineteen. I do not know what it means either.',
    "You are young. You will get steadier, or you won't.",
  ],
  'talk.nan.2': [
    'You keep moving about. Why is that?',
    'Nobody has seen me arrive. I like it that way.',
    'I knew the scale when it was still weighing. A different person. Very sad.',
  ],
  'talk.nan.3': [
    'Water is lovely. I stay out of it.',
    'There is a turtle in there older than I am. We nod.',
    'My late husband fell over in 1962. Once. He never heard the end of it.',
  ],
  'talk.nan.4': [
    'The rock. Yes. We all know about the rock. It was my idea.',
    'There are worse things to stand on than one rock.',
    "You will want to know what to do. You will do it. Don't ask me.",
  ],
  'talk.nan.5': [
    "I'm going east. I may already be there.",
    "Don't worry about me, dear. Worry about the deckchairs.",
    'When it comes, keep your knees soft and your opinions to yourself.',
  ],
  'talk.nan.6': [
    "There you are. I've been here since Tuesday.",
    'That was a good one. Nineteen sixty-two was better.',
    'You may stay. I did.',
  ],
  'hut.early': [
    'The day is not finished. Your hut knows. Please see the Programme.',
    'You still have things on today. I will tell the bed.',
  ],
  'stone.donot': ['It says "Do not". I would not. Today.', 'Please do not stand there. No reason.'],
  'station.notyet': [
    'That is for another day. You may look at it. Looking is free.',
    'Nobody is teaching that yet. Please see the Programme.',
  ],
};
