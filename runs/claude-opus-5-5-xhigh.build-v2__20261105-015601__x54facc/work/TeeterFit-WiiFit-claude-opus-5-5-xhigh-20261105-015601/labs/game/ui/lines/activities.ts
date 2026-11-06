/**
 * @file What is said during the activities (PLAN.md section 13). Polite, level, a beat too honest. Never about bodies, only
 * about wobble. Plumb never uses an exclamation mark.
 *
 * Game code, a page's data.
 *
 * @example
 * LINES_ACTIVITIES['pose.rest'][0];
 */

/** The lines, by id. */
export const LINES_ACTIVITIES: Readonly<Record<string, readonly string[]>> = {
  'results.present': [
    'You were present. Attendance is a kind of score.',
    'You attended. We have made a note.',
    'That was your best score so far. It is also your only score so far. Well done on both.',
  ],
  'results.adequate': [
    'That was adequate. I chose that word carefully.',
    'Adequate. Many people go their whole lives.',
    'You fell. The mat forgives you. The mat is not me.',
  ],
  'results.composed': [
    'Composed. I mention it because it is rare.',
    'Good. Now do that again, but as though you meant it.',
    'Your knee is where it should be. I mention it because it is rare.',
  ],
  'results.serene': [
    'Serene. I would ask you to stop, but I would not mean it.',
    'That was quite steady. Nobody will believe you.',
    'Serene. You may tell people. They will not ask.',
  ],
  'results.unsettling': [
    'Unsettling. Please do that less near the other guests.',
    'I have stopped taking notes. There is nothing to write.',
    'Unsettling. The frog has asked for your name.',
  ],

  'ring.start': [
    'Stand on your mat. Stay inside the ring. It will get smaller. So will you.',
    'A ring. You, inside it. That is the whole class.',
  ],
  'pose.demo.nothing': ['Seated Nothing. We sit, and we do it. Watch me not do anything.'],
  'pose.demo.chair': ['The Patient Chair. There is no chair. Be patient about that.'],
  'pose.demo.heron': ['The Heron. One leg, hands up. Herons do this for hours. Herons have nowhere to be.'],
  'pose.demo.archer': ['The Archer. Long lunge, arms wide. There is no bow. Hold it anyway.'],
  'pose.demo.comma': ['The Sideways Comma. Bend to one side, then the other. Pause, as a comma would.'],
  'pose.demo.napkin': ['The Folded Napkin. Forward from the hips. Neatly. As if someone were coming to dinner.'],
  'pose.demo.bridge': ['The Polite Bridge. On your back. Lift your hips with your breath. Do not make a fuss.'],
  'pose.demo.lighthouse': ['The Lighthouse. Tiptoe, arms straight up. Be visible from some distance.'],
  'pose.now': ['Now you.', 'Your turn. Follow the dot.', 'Now you. I will wait. I am very good at it.'],
  'pose.start': ['We will call that a start.', 'I will call that a start. I have called worse things a start.'],
  'pose.hold': [
    'Hold. Breathe in. Breathe out. You have been doing this for years, and yet.',
    'Stay there. Breathe with the ring.',
    'Good. Stay. Nobody is watching. I am watching.',
    'Hold. Your weight goes where your thumb goes.',
  ],
  'pose.other': ['Now the other side. The first side has been told.', 'And across. Slowly. It will still be there.'],
  'pose.rest': [
    'And rest. You may stop wobbling now. Thank you for stopping.',
    'And rest.',
    'Rest. You did not need to look at me like that.',
  ],
  'pose.gull': [
    'There is a gull on you. Please do not make it a whole thing.',
    'That is the Gull. It likes you. It likes everyone. It is not personal.',
  ],

  'morning.question.1': ['Have you ever stood on one foot when nobody was looking?'],
  'morning.question.2': [
    'Did you sleep on your left side? You do not have to answer. I can tell. I cannot tell. Did you?',
  ],
  'morning.question.3': ['Have you been leaning toward anything lately? A person? A decision?'],
  'morning.question.4': ['If everyone else went east, would you also go east? For no reason?'],
  'morning.question.5': ['Do you feel the floor is where it was yesterday?'],
  'morning.question.6': ['Are you staying? You do not have to answer. The ferry has answered.'],
  'morning.yes': ['I know.', 'I thought so. It shows in your ankles. I am joking. I do not know what ankles do.'],
  'morning.no': ['I know.', 'That is what people say.', 'Fine. I will put down "probably".'],
  'morning.silent': ['You did not answer. That is also an answer. I have written it down.'],
  'morning.ring': ['Please stand still.', 'Stay inside the ring. No reason.', 'Please keep to the centre. No reason.'],
  'morning.teach.ring': [
    'Please step on me. Not like that. Actually, like that is fine. Now use the lean to stay in the ring.',
  ],
  'morning.reach': [
    'Now reach for each one. Do not stretch. Lean.',
    'Each target in turn, please. They are not going anywhere. Probably.',
  ],
  'morning.teach.reach': [
    'That was still. Now lean to each target and stay a moment. Your weight is the whole game. Well, the whole test.',
  ],
  'morning.foot.left': ['Left foot only now. Hold it. The other one can have the morning off.'],
  'morning.foot.right': ['Right foot only now. Hold it. The other one can have the morning off.'],

  'pond.start': [
    'Sit. Breathe with the ring. Press nothing. That is the entire exercise.',
    'This is Still Pond. There is one rule, and you already know it, and you are about to break it.',
  ],
  'pond.end': ['You did nothing for seventy-five seconds. Nobody has ever been prouder of you. Nobody was watching.'],
  'pond.lure.psst': ['Psst. Is this on? Press the button for yes.'],
  'pond.lure.stone': ['Your stone is buzzing. Mine is buzzing. Check it. Everyone is checking theirs.'],
  'pond.lure.wrong': ['You are doing it wrong.'],

  'group.start': [
    'Today we are a class. Do not look at each other. You will look at each other.',
    'Three classes. Find a mat. There are enough mats. I counted them twice.',
  ],
  'group.podium': ['One of you was the least wobbly. There is a sash. It is not a large sash.'],

  'reps.start': [
    'Reps. The band goes down. You go down. That is how it has always been.',
    'Follow the band with your thumb. Your body will find out afterwards.',
  ],
  'reps.knees': ['Deep Knees. Pull back to sink. Do not rush. The floor is not going anywhere. Today.'],
  'reps.pushups': ['Polite Push-Ups. Hold both feet. Palms on the floor. Say sorry to the floor, if you like.'],
  'reps.lunges': ['Side Lunges. Lean left, lean right, and back. Gerald finished these on Tuesday.'],
  'reps.lying': ['Four more. I may be lying. We will both find out.', 'Nearly. I have said nearly before.'],

  'step.start': [
    'Step Class. Feet on the beat. The others will follow you. I am sorry to tell you that.',
    'Left, right, both. The class does what you do. Please think of the class.',
  ],

  'line.start': [
    'Left foot, right foot. Lean against whatever happens. I am in the boat if you need me. I am not sure what I would do.',
  ],
  'line.flag': [
    'That is a flag. You are allowed to feel something about it.',
    'A flag. I will bring you back to this one, later, when you fall.',
  ],
  'line.gull': [
    'A gull is on your arm. It adds some weight. Flick the stick quickly to tell it no.',
    'Is that the Gull? Flick the stick. Do not hit the Gull. We have rules about the Gull.',
  ],
  'line.flicked': ['It has gone. It has not forgiven you.', 'The Gull has left. It will be back when you are busy.'],
  'line.fall': [
    'You have left the line. The line is fine.',
    'That was a large splash. I have written "large".',
    'You are in the water. The line has asked me to tell you it feels nothing.',
  ],
  'line.done': ['You crossed. The rock is pleased. It will not say so.'],
  'line.closes': ['The line closes at this time.'],

  'paddle.start': ['Lean forward to go. Lean sideways to turn. Your feet can paddle, if they want to be useful.'],
  'paddle.done': ['Twelve gates. Very tidy. I will not tell the buoys, they get ideas.'],
  'paddle.wake': ['That is the ferry wake. There is no ferry. Please do not think about it.'],
  'paddle.turtle': ['A turtle is crossing. It has right of way. It has always had right of way.'],
  'paddle.fall': [
    'Back on the board, please. The sea is not for standing in.',
    'That was a splash. Remount when you feel ready. You have three seconds.',
  ],
  'paddle.time': ['The lagoon is closing. We did not tell you it could do that.'],

  'garden.start': ['Tilt the tray. Roll the marbles home. Nothing is alive in it. Be gentle anyway.'],
  'garden.tray': [
    'Good. I will rake that.',
    'Next tray. They are all quite similar. So are we all.',
    'That marble has somewhere to be now. That is more than most.',
  ],

  'plunge.compose': [
    'Stand at the lip. Hold the ring and breathe. Nobody will push you. I have checked the rota.',
    'Compose yourself. There is water at the bottom. I checked this morning.',
  ],
  'plunge.go': [
    'Now. Let go when the gauge is at the top.',
    'Let go at the top. Only at the top. That is the only advice I have ever had.',
  ],
  'plunge.slip': [
    'You have waited long enough for the cliff to make the decision.',
    'Ah. You are slipping. That is also a way to do it.',
  ],
  'plunge.slipped': ['A small splash. A small splash is a splash.'],
  'plunge.great': [
    'Very clean. The Gulls are confused. One of them still gave you a four.',
    'That was a very good dive. One judge always gives a four. It is his only number.',
  ],
  'plunge.dive': [
    'That was a dive. Mostly in the sense that you went down.',
    'You have reached the water. Everybody does. You did it in your own way.',
  ],

  'hoop.start': [
    'Spin your stick in circles. Not too slow, not too fast. Catch what I throw. I have no arms. Do not ask.',
  ],

  'jog.start': ['Morning.'],
  'jog.chatter': [
    'That is the pier. It is very nearly straight.',
    'We jog past this plaque every day. It used to be over there.',
    'Gerald has done this eleven thousand times. I am not sure he knows.',
    'The sea is flat today. Slightly flat. In one direction.',
    'That is the lighthouse. It leans to the right. It is a matter of perspective.',
    'Keep up with Gerald, please. Nobody has caught him. Nobody has asked him why.',
    'Your feet can help. Left, right, quickly. It makes you faster. I do not understand it either.',
  ],
  'jog.end': ['Nice weather for it.'],

  'tilt.outOfTrue': ['The island is now six degrees out of true. Please remain calm. Calm is mandatory.'],
  'tilt.east': ['Guests are reminded to distribute themselves evenly. Guests are reminded to go east.'],
  'tilt.calmed': [
    'They are following you. I do not recommend looking back. They are very polite.',
    'Good. They think you know where you are going. Do not tell them.',
  ],
  'tilt.calmedNobody': ['You calmed nobody. A lounger seems calmer. Stand closer.'],
  'tilt.shuffle': ['Those who remain may now shuffle uphill by themselves. We will call that a start.'],
  'tilt.nan': ['I have been here since Tuesday.'],
  'tilt.weights': ['There are carts. Your cairn is in one. Crank with your feet, and lean into the slope.'],
  'tilt.start': ['We will call that a start. Please go to the stone.'],
  'tilt.stone': ['Go to the stone. It says "Do not". Please do. Now it is your balance. All of it.'],
  'tilt.again': ['Again, please.', 'Again.'],
  'tilt.balanced': ['Everything is balanced now. Please do not tell anyone about the rock.'],
  'tilt.hm': ['Hm.'],
  'tilt.rock': ['Everything is fine. If anyone asks, everything was always fine.'],
  'after.stay': ['You may stay as long as you like. The ferry does not return.'],
};
