/* data/lines.js: every word in the game. Tone rules: short sentences; sincere, polite, a little too personal; never a
 * wink, never a sneer; no body-size talk. A box holds 2 lines of about 60 characters. Add a line to any list: no code. */
(() => {
'use strict';
const G = window.G;
G.DATA.lines = {
  boot: ['Zeroing the scale', 'Sanding the instructors', 'Counting the ducks', 'Telling the hippo'],
  arrival: ["You have been gifted a five-day stay at the Institute for Gentle Improvement. The card isn't signed. It only says: 'You know why.'"],
  motto: 'Gently, Or Not At All.',
  tare: {
    hello: ['Oh! Feet. Good morning, feet.', "You came back. I wasn't worried. I was just standing here, on the floor, where I live.", 'It has been one day since you last stepped on me. I counted it twice to be sure.',
      'Good morning. I have been awake. I am always awake. It is fine.', "There you are. I knew it was you. Nobody else stands like that.", 'Welcome back. I saved your number. It was not hard. There is only one.',
      'Hello. I heard you coming from the bungalow. That is not a comment.', 'Oh, good. I was about to start talking to the floor again.'],
    first: ['Hello. I am Tare. I am a scale. Please step on me.', 'I will be measuring you. Please do not take it personally. I take it personally.'],
    still: ['Please stand still. Stiller. That was the wrong way.', 'Stand still, please. Like a lamp.', 'Do not move. I will tell you when. I will not tell you when.', 'A little less of that, please.'],
    leanTest: ['Now lean. I will watch. I am very low down.', 'Lean where I say. Do not lean where I do not say.'],
    leanPraise: ['You lean beautifully. Like a tower people visit.', 'You put more weight on your left foot. Your right foot has noticed.', 'Your balance is very interesting. I wrote that down. I cannot write.', 'You swayed. It was a nice sway. Please do not do it again.',
      'That was almost the same as yesterday. I remember yesterday.', 'Your right side is doing most of it. Your left side should thank it.'],
    number: ['I am not allowed to say whether this is good. It is a number.', 'That is your number. I checked it. I am very sure of it. Please do not look at me like that.', 'Numbers are only numbers. This one is yours.', 'I have told you the number. I will not tell anybody else. I do not know anybody else.'],
    spineDown: ["That's younger than yesterday! Your spine has been through a lot.", 'Younger again. I do not know how this works. I am only a scale.', 'Your spine is going backwards. This is what we want.', 'Your spine has lost a year. Do not go looking for it.'],
    spineSame: ["It hasn't moved. Numbers rest too.", 'The same as yesterday. I find that restful. Do you find that restful?', 'No change. I want you to know I noticed anyway.'],
    gertrude: ["Gertrude's Spine Age is 19. I mention this only for the data.", 'Gertrude is 19, in the spine. I have asked her how. She said, "Thursday."', 'For comparison, Gertrude: 19. I am not comparing. I said "for comparison" by accident.'],
    favorite: ['You are my favorite. You are also my only.', 'I had a dream last night. You were standing on me. It was just that.', 'I would like to say something. I have forgotten it. It was about you.', 'Do you think about me during the day? You do not have to answer. The answer is a number.'],
    idle: ['Are you still there? I can feel you not standing on me.', 'It is quiet. I am choosing to find that relaxing.', 'I can wait. Waiting is most of what I do.', 'If you are thinking about stretching, that also counts. It does not count.'],
    absent: 'It has been {n} days. I kept your spot warm. I am not able to generate heat.',
    paused: "You paused. That's {n} times today. I'm not counting. Three.",
    pausedOne: 'You paused. That is fine. Everyone needs to look at something else sometimes.',
    star0: ["You finished. Some people don't. Those people are probably at lunch.", "That was not your best. I'm saying that with love, and also as data.", 'You were there for all of it. That is what I will tell people.', 'It is not a race. If it were a race, this is the part I would not mention.'],
    star1: ['Good effort! I could tell it was effort.', 'One star. I polished it myself. I do not have hands.', 'That was something. I have decided it was good.', 'You did that on purpose. I could tell. Well done.'],
    star2: ['Well done. I felt that. In a good way. Mostly.', 'Two stars. That is one more than one.', 'Very nice. Please do it again sometime when I am looking. I am always looking.', 'You have improved. I noticed before anybody. There is nobody else.'],
    star3: ['You barely moved. For a moment I thought you had left me. Please don\'t do that.', 'Three stars. There is no fourth. I checked. I wanted to give you one.', 'Perfect. I do not know what to do with my feelings. I put them on the dial.', 'That was very good. I am going to stand here and think about it.'],
    fall: ['You fell. That\'s okay. The floor was expecting you.', 'That was a fall. It was a good one. You should hear it from me first.', 'The floor says hello.', 'Up you get. Nobody saw. I saw.'],
    quit: ["Leaving early? That's fine. I will just file this under 'Thursday.'", 'You can stop whenever you want. I will be right here, knowing about it.', 'All right. It was almost a session.'],
    night: ["Sleep well. I'll be out here. In the dark. Being accurate.", 'Good night. I will keep the number safe. Nobody will come for it.', 'Sleep on your back, or your side, or however you like. I will not be checking. I cannot reach.', 'Rest. Your spine works nights.'],
    earlyBed: ['Bed already? It is still today. All right. I will tell today.', 'You still have sessions left. I will hold them for you. They will not keep.', 'Going to bed early is also a kind of exercise. It is not.'],
    gerald: ["Gerald has swallowed your minutes. He looks pleased. He always looks like that. He's ceramic.", 'Gerald took them. He does not give them back. That is the whole arrangement.', 'Clink. That is the sound of you improving, according to Gerald.', 'Gerald does not speak, but I believe he is proud. I believe it very hard.'],
    tips: ['Tip: Drink water. Your body is mostly water. The rest is opinions.', "Tip: If you can't touch your toes, bring your toes closer.", 'Tip: Stretch before bed. Or after bed. Or in bed. I am not in your bed.', 'Tip: Sitting is just standing with fewer steps.',
      'Tip: Breathing is best done regularly. Most people have found this.', 'Tip: A short walk is a long walk that has given up early. That is also fine.', 'Tip: Stand up straight. Now stop thinking about it. Now you are thinking about it.', 'Tip: The stairs are there whether you use them or not.',
      'Tip: Your knees are listening. Speak well of them.', 'Tip: Eat a vegetable. Any vegetable. They do not check.', 'Tip: Rest days are important. Today is not one. I looked.', 'Tip: If you feel a stretch, that is your body telling you something. Do not ask what.'],
    gentle: "Gentle Mode is on. I won't tell anyone. I don't know anyone.",
    spineTop: "Let's call it 71. It doesn't go higher. It's not allowed.",
    relit: 'It went out. I have relit it. I do not have hands. You owe me fifteen percent.', railEmpty: 'The rail is empty. Gerald will provide. Gerald needs five minutes.', erase: 'Erase this card? I will remember anyway. I remember everything. It is a burden.', noNod: 'Gertrude did not nod today. She will be here tomorrow. She is always here.',
    plateau: ['We call this the plateau. It is on the map. You cannot go around it.', 'Your number has not moved today. That is the plateau. People have camped here.', 'The plateau is very flat. That is how you know it is one.'],
    catchup: ['Oh. Look at that. It all came at once. I knew it would. I did not know it would.', 'Your spine has caught up with you. It was only walking behind.'],
    candleCheat: 'Did you put the controller down? I can tell. This is not that kind of stillness.',
    nod: 'Gertrude nodded at you. I saw it. That was the reward. There is no other reward.',
    suggest: ["Today I suggest {a}. I don't know why. I just have a feeling. I have one feeling.", 'My suggestion today is {a}. It pays half as much again. Gerald insisted.', 'Today, please consider {a}. I have marked the mat with a star. I had help.'],
    bowTie: 'I am wearing a bow tie. It is because of your minutes. Please say nothing. Please notice.',
    attract: ["Nobody's here. I'll just show the room what we do.", 'The room is very interested. It has not said so.', 'This is called a demonstration. I am demonstrating to the floor.', 'Everybody is at lunch. I will keep going.', 'If somebody comes in, please act normal.'],
    attractBack: "Oh! You're back. I wasn't doing anything.",
    day5: ['Today is the Gentle Games. You have prepared for this. You have been here four days.', 'There will be bunting. I am told it is very gentle bunting.'],
    gameOn: ['The Gentle Games! Everybody is very calm about it.', 'First event. Please compete gently.'],
    class: ['A class! Several feet. I do not know where to look. I look up. Always up.', 'Everybody please stand on your own mat. I will be reading you all at once.'],
    podium: ['I have read the results. They are all numbers. Some are larger.', 'Everybody did something. Here is who did it most.'],
    afterDays: ['You are still here. The stay was five days. I did not want to bring it up.', 'Another day. I was not expecting you. I was expecting you.', 'Welcome back. Nothing has changed. I have been very careful about that.']
  },
  tareDay: ['Today I must be recalibrated. It is a routine procedure. I have been dreading it for a year.', 'Please come to Reception. The big scale is there. It is my mother. It is a very old scale.',
    'Please stand me on her. Then press the button to read it.', 'I will close my eyes. I am not able to close my eyes.'],
  tareRead: ['Three grams.', "It's the feelings. They're dense.", 'Please do not tell Gerald. He would swallow it.', 'Thank you for reading me. Nobody has ever read me. I read everybody.'],
  questions: [
    { q: 'Have you recently sat?', a: ['Yes', 'Define recently'], r: ['I can tell. It was a good sit.', 'It is a word that means recently.'] },
    { q: 'Do stairs ever surprise you?', a: ['Often', 'Only the last one'], r: ['They are very sudden.', 'It is always the last one. It is why it is last.'] },
    { q: 'Do you make a small noise when you stand up?', a: ['Yes', 'No (this is a lie)'], r: ['Thank you for your honesty. I also hear it.', 'I have marked this down as yes.'] },
    { q: 'On a scale of one to me, how do you feel?', a: ['One', 'Me'], r: ['I see. I will try not to be hurt.', 'That is the nicest thing anyone has said on me.'] },
    { q: 'When did you last look at your feet?', a: ['Just now', "I'd rather not"], r: ['They look fine from here. I am very close to them.', 'I understand. I will keep an eye on them for you.'] },
    { q: 'Do you know where your hips are?', a: ['Roughly', 'Who is asking'], r: ['Roughly is what most people say.', 'A scale. A scale is asking.'] },
    { q: 'Have you thought about your posture just now?', a: ['Now I have', 'Please stop'], r: ['Everybody sits up at this point. You sat up.', 'I will stop. I have stopped. You are still sitting up.'] }
  ],
  reading: ['Today you weigh {d} ducks. That is a normal number of ducks.', 'You weigh {d} ducks. I weighed them twice. The ducks did not mind.', 'Today: {d} ducks. Do not picture them. Now you are picturing them.', 'The reading is {d} ducks. A goose would be different. Please do not ask about the goose.'],
  ending: {
    reveal: ['I should tell you something.', "The card. The one that wasn't signed. That was me.", "I don't have hands. It took three years.", "I sent one to everybody. You're the one who came."],
    leave: ["Now step off. Go on. I'll be here.", "I'm a scale. That's the whole job."],
    low: 'Gertrude says you may have the hat. She has another one. She has been waiting since Thursday.',
    mid: 'Your spine has stopped asking questions.',
    high: 'Come back. Please. I mean that in a wellness way.',
    free: 'The Institute is open. It was always open. I would have told you, but you did not ask.'
  },
  gertrudeWin: "Well done, dear. I've been waiting since Thursday.",
  gertrudeLose: "That's all right, dear. I had a head start. I started in 1961.",
  duel: ['Gull!', 'That is a blender. Do not look at the blender.', 'A conga line. They are being very gentle about it.', 'Fireworks. Somebody has been saving them.', 'I will now sing. I have been practising. It is one note.', 'Goose. I told you about the goose.'],
  duelTare: 'La. La. La. La. La. La. La.',
  sign: { laundry: 'Please do not walk on the laundry line. Walking on the laundry line: 10:30 daily.', iron: 'You Have Been Doing That Wrong', mirror: 'Objects In Mirror Are You', juice: 'Juice. Ask About The Olive.', reception: 'Please Wait To Be Measured', pier: 'Aerobics Pier. Mind The Gulls.', deck: 'Quiet Please. Quieter.', mount: 'Mount Posture. Elevation: Good.' },
  thoughts: ['Did you lock the door?', 'What is a lumbar?', 'Is that my knee?', 'Dennis.', 'You left the stove on in 2014.', 'Who sent that card?', 'Am I breathing right now?', 'Now I\'m breathing on purpose.', 'Olive?', 'Do hippos sleep?', 'What is the goose doing?', 'Is it still Thursday?'],
  birch: {
    voice: 'birch', name: 'Birch',
    hello: "Welcome. I am Birch. I'm made of wood, so I will be very patient and slightly warped.",
    breathe: "Breathe in. ...I don't breathe. But I've read about it, and it sounds very good.",
    demo: ['Keep your back straight. Mine was sanded.', 'Nice. Now hold that until it stops being nice.', "You're shaking. This means it's working. Or you're cold.", 'Watch me once. I will do it slowly. I do everything slowly.', 'I have held this pose since the shop.', 'It is simple. I will not say easy. I am a professional.'],
    more: 'Two more. I said that two reps ago. It is still true.',
    moreFirst: "You're doing so well, so I've added some.",
    other: 'Other way. The hoop does not mind. Your hips may have a view.',
    lean: 'Lean toward the ring. Slowly. I have been told I am slow. It was a compliment.',
    hold: 'Hold. Good. Now keep doing that, forever, or until I say.',
    recover: 'A gull has landed on you. Do not be flattered. Lean away from it.',
    good: 'Good. That was good. I do not say this often. I do not say many things.',
    tired: 'You look tired. I do not get tired. I get damp.'
  },
  alder: {
    voice: 'alder', name: 'Alder',
    hello: "Hello! I'm Alder. I was a tree, and then I was a lot of very small decisions.",
    breathe: 'And breathe in! Lovely. You look like someone breathing.',
    demo: ["Wonderful! You're doing so well. Please stop shaking.", "Everybody's body is different. Yours is the one wobbling.", "Let's hold this for a moment. A moment is eleven seconds.", 'Smile. It relaxes the jaw. ...Not like that.', "This next pose is the Stork. I knew a stork. We didn't speak.", 'Follow me! I am very easy to follow. I have no knees to speak of.'],
    more: 'Two more! You did not hear me say that earlier, but I thought it.',
    moreFirst: "You're doing so well, so I've added some.",
    other: 'Other way! Your hips will thank you. They will not. They do not speak.',
    lean: 'Lean over to the ring! Lovely. A little more. That is too much. Lovely.',
    hold: 'Hold it there! You are doing it. You are still doing it. You are very still doing it.',
    recover: 'Oh! A gull. How nice for you. Lean the other way, please!',
    good: 'That was wonderful! I have been told to say that. It was also true.',
    tired: "You look tired! That's the muscles saying thank you. Please stop them."
  },
  regulars: {
    gertrude: { name: 'Gertrude', voice: 'gertrude', lines: ["You're doing fine, dear. I've been standing here since Thursday.", "I'm eighty-seven. My spine is nineteen. We don't really talk.", 'Stand up straight, dear. Not for me. I just like to see it.', 'I had a hat like yours. I have it still. I have all the hats.', 'I do not do the exercises any more. I only do the standing.'] },
    dennis: { name: 'Dennis', voice: 'dennis', lines: ["I'm only here for the blender. Don't tell the scale.", 'Olive?', 'People ask why the olives. I ask why the people.', 'I used to exercise. It was a Tuesday.', 'This juice has never been near a fruit. It is very calming.'] },
    marisol: { stitch: 'A stitch! That is your body saying a word. Walk it off.', name: 'Marisol', voice: 'marisol', lines: ["Morning! I've already done today. I'm on to tomorrow.", "Keep your cadence up! I don't know what yours is. Keep it up.", "I ran around the island twice while you were thinking about it.", "Tomorrow's weather is lovely. I was just there."] },
    kevin: { name: 'Young Kevin', voice: 'kevin', lines: ['Everybody calls me Young Kevin. There was an older Kevin. We don\'t talk about how he got so flexible.', "I'm fifty-two. It's a very young fifty-two.", "I'm thinking of taking up the rope. I have been thinking of it for nine years."] },
    okafor: { name: 'Mr. Okafor', voice: 'okafor', lines: ['A hoop is just a circle that believes in you.', 'Hips first! Everything else will catch up. Or it will not. Hips first!', 'This shirt is called Tuesday in the Tropics. I have a Wednesday as well.'] },
    lou: { name: 'Lou', voice: 'lou', lines: ["I'm on a five-minute break. It's been a good one. Three years in March.", 'Wake me if anything changes. Nothing will. That is why I chose this bench.', 'They tell me this bench is very good for the back. I have not checked.'] },
    twins: { name: 'The Twins', voice: 'twins', lines: ["We're not related.", "We've checked.", 'We do everything at the same time. We have not discussed it.', 'People say we look alike. We do not see it. We do not look at each other.'] }
  },
  slalomTimes: [['Gertrude', 58, 'She walked.'], ['Marisol', 41, 'Uphill, she says.'], ['Young Kevin', 73, 'He stopped to rest.'], ['Lou', 600, 'He is still on the chairlift.']],
  nicknames: ['Gentle Doug', 'Sir Slouch', 'Ms. Almost', 'The Other Pat', 'Big Linda', 'Mostly Paul', 'Tall Enough Ann', 'Soft Gary', 'Dame Tilt', 'Uncle Maybe', 'Quiet Sue', 'Young Barry', 'Nearly Nora', 'Wobbly Ted', 'Madame Pause', 'Lord Lumbar'],
  /* said once, at one moment */
  notes: {
    listen: 'Listen. Left and right are in your ears. High and low are forward and back.', otherWay: 'Other way!', noEnd: 'You did not reach the end. The laundry understands.', hold: 'Please hold.', missed: 'Missed. +3 s',
    opensLater: '{a} opens on Day {d}. Please wait to be improved.', whose: 'Whose card is this?', damaged: "This card has been through something. I can't read it.", nobody: 'Nobody yet.', notYet: 'You have not done this yet. It is fine.',
    herFlame: 'Her flame went out.', yourFlame: 'Your flame went out.', duelWon: 'Spine Age -1. It is allowed.', duelLost: 'It is a very old flame.', roundGoal: 'Stay steadiest over 3 exercises. Most points wins.',
    devReset: 'Everything is back. It missed you.', devUnlock: 'All open. Gerald is very full.', devFinish: 'Dev Mode finished this for you. Tare is not fooled.'
  },
  gertrudeDuel: ["It's just the two of us now, dear.", 'I will not move. You should try it.'],
  attractReading: ['Today you weigh {d} ducks.', 'That is a normal number of ducks.'],
  credits: { assets: 'The built-in props of my-3D2dge, such as palms, pines and lamps. No store set was loaded.', tare: 'as himself. He is a scale.', instructors: 'as themselves. They are wood.', gerald: 'ceramic', gertrude: 'since Thursday', dennis: 'the blender', marisol: 'already finished', kevin: 'fifty-two', okafor: 'and his shirts', lou: 'on a break', twins: 'not related', sound: 'Written in code. There are no files.', thanks: 'I sent one to everybody. You are the one who came.', everythingElse: 'Drawn and written in code for this game. Tare would like you to know he is a scale.' },
  /* what each Card says, one sentence, by activity id or tier name */
  cards: {
    'stork': 'Keep the dot in the ring on one leg: you can lean, but you cannot leave.',
    'Eyes Closed': 'The same with your eyes closed: you can listen and shake, but you cannot peek.',
    'flow': 'Hold five poses and breathe with the ring, but you may not skip the Warrior.',
    'Long Exhale': 'In for less and out for longer: the same breath, but you will notice it.',
    'candle': 'Move gently or the candle goes out, and do not follow your thoughts far.',
    'Noisy Candle': 'The same candle, but Dennis is using the blender, and there is also a goose.',
    'squat': 'Your lean is your knees, so ride the bead down and up and stay straight.',
    'Slow Squat': 'Three seconds down, a hold, one second up, and the name is not polite.',
    'pushup': 'Lower yourself and rise with the bead, as the floor is not going anywhere.',
    'Slow Push-Up': 'Slower this time, which builds character, and I am a scale with plenty.',
    'lunge': 'Lean left and right with the bead while your feet stay where they are.',
    'Long Lunge': 'Further and slower, and your feet have been told, so please tell your knees.',
    'step': 'Step on the beat, and everyone behind you will follow, and nobody blames you.',
    'Step Class Two': 'All four directions, faster, and please do not fall off the pier.',
    'hoop': 'Circle your lean to spin the hoop, not too eagerly, and catch what they throw.',
    'Hoop Hips Deluxe': 'More hoops, more often, twice the other way, as Mr. Okafor has been waiting.',
    'jog': "Keep Marisol's pace left and right, lean round the pigeons, and grab the water.",
    'The Long Way': 'The same coast, more of it, and more pigeons, who have heard about you.',
    'slalom': 'Lean through the gates, forward to tuck, back to brake, and please avoid the snowmen.',
    'North Face': 'Narrower gates and fog, on the same mountain, only less friendly.',
    'tray': 'Tilt the tray to roll olives into glasses, as Dennis needs this and cannot say why.',
    'Evening Service': 'The same olives in the evening, with more holes, and nobody knows who is doing that.',
    'laundry': 'Hold the ring, hop the pegs, mind the wind, and please walk on it.',
    'Windy Washday': 'A windier day, and also Monday, which is when the big sheets go out.'
  },
  /* what Tare says when Gerald opens something */
  unlocks: {
    towel: 'A towel. Gerald found it. Please do not ask where he keeps things.',
    headband: 'A headband. It holds your head in. That is what they are for.',
    sunhat: 'A sunhat. For the sun. It is the same sun as before.',
    bowtie: 'I am wearing a bow tie. It is because of your minutes. Please say nothing. Please notice.',
    hat: "Gertrude's spare hat. It is warm. She only took it off this morning.",
    friend: 'Gerald has a friend now. It is a smaller hippo. There is no explanation.'
  },
  class: { titles: ['Most Still', 'Best Wobble', 'Participated', 'Also There'], join: 'Press Start on a pad, or 2 on the keyboard, to take a mat.' },
  hubTitles: { Stillness: 'Most Still', Strength: 'Best Form', Cardio: 'Most Cardio', Balance: 'Best Wobble' }
};

/** pick a line from a list, never the same one twice running. A path: 'tare.hello' or a list */
const lastPick = {};
let lineRng = null;
G.line = (path, vars) => {
  const list = typeof path === 'string' ? path.split('.').reduce((o, k) => o && o[k], G.DATA.lines) : path;
  let s;
  if (Array.isArray(list)) {
    lineRng = lineRng || G.E.rng(4711);
    let i = Math.floor(lineRng() * list.length) % list.length;
    if (list.length > 1 && lastPick[path] === i) i = (i + 1) % list.length;
    lastPick[path] = i; s = list[i];
  } else s = list;
  if (s === undefined) s = '';
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
};
})();
