/* DICK WHITMAN'S WILD RIDE: the cast, the slides, the clients and every word of the day. ASCII only: the pixel font has no curly quotes. */
(() => {
'use strict';
const game = window.__game, M = game.MAD, E = M.E;

/* ---------- the cast ---------- */
const SKIN = ['#f2cfae', '#e7b992', '#d9a57e', '#c58d66'];
M.CAST = {
  you:    { name: 'DICK',    color: '#ffd36a', rig: { build: 'heroic', hair: 'short', outfit: 'coat', colors: { hair: '#3b2a1e', cloth: '#3a4256', coat: '#3a4256', pants: '#2c3242', boot: '#15121a', trim: '#8a2a2a', skin: SKIN[0] } } },
  gwen:   { name: 'GWEN',    color: '#ff9bb0', rig: { hair: 'long', outfit: 'tunic', colors: { hair: '#c9622e', cloth: '#b84a62', pants: '#b84a62', boot: '#4a2a2a', skin: SKIN[0] } } },
  joyce:  { name: 'JOYCE',   color: '#ff8a5c', rig: { build: 'heroic', hair: 'ponytail', outfit: 'tunic', colors: { hair: '#9a3a1e', cloth: '#2f6a58', pants: '#2f6a58', boot: '#2a1a1a', trim: '#e8d27a', skin: SKIN[0] } } },
  margie: { name: 'MARGIE',  color: '#8ad0ff', rig: { hair: 'ponytail', outfit: 'shirt', colors: { hair: '#4a2e1e', cloth: '#e8e0d0', pants: '#5a4a6a', boot: '#2a1a1a', skin: SKIN[1] } } },
  percy:  { name: 'PERCY',   color: '#d8d890', rig: { build: 'heroic', hair: 'short', outfit: 'coat', colors: { hair: '#d8b45a', cloth: '#6a7080', coat: '#6a7080', pants: '#50566a', boot: '#1a1418', trim: '#2a4a8a', skin: SKIN[0] } } },
  roland: { name: 'ROLAND',  color: '#c0c8e0', rig: { build: 'heroic', hair: 'short', outfit: 'coat', colors: { hair: '#d8d8e0', cloth: '#2a2e3a', coat: '#2a2e3a', pants: '#232632', boot: '#15121a', trim: '#c8a24a', skin: SKIN[0] } } },
  dunn:   { name: 'MR. DUNN', color: '#b8d8a0', rig: { build: 'chibi', hair: 'bald', outfit: 'coat', colors: { hair: '#e0e0e0', cloth: '#6a5a3a', coat: '#6a5a3a', pants: '#4a4030', boot: '#f2cfae', skin: SKIN[0] } } },
  archie: { name: 'ARCHIE',  color: '#c8a888', rig: { hair: 'spiky', hat: 'cap', outfit: 'coat', colors: { hair: '#3b2a1e', cloth: '#6a5a46', coat: '#6a5a46', pants: '#4a4036', boot: '#3a2a1a', skin: SKIN[0] } } },
  hollis: { name: 'HOLLIS',  color: '#ffb870', rig: { build: 'bulky', hair: 'short', outfit: 'coat', colors: { hair: '#5a4a3a', cloth: '#7a5a3a', coat: '#7a5a3a', pants: '#5a4430', boot: '#1a1418', trim: '#d8a040', skin: SKIN[1] } } },
  teague: { name: 'TEAGUE',  color: '#e0a080', rig: { build: 'heroic', hair: 'short', outfit: 'coat', colors: { hair: '#b8b8b8', cloth: '#3e4a3e', coat: '#3e4a3e', pants: '#2e362e', boot: '#15121a', trim: '#b8862a', skin: SKIN[2] } } },
  sully:  { name: 'SULLY',   color: '#e8e0d0', rig: { hair: 'short', outfit: 'shirt', colors: { hair: '#6a3a1e', cloth: '#f0ece0', pants: '#1a1a22', boot: '#15121a', skin: SKIN[0] } } },
  vera:   { name: 'VERA',    color: '#ff6a7a', rig: { build: 'heroic', hair: 'long', outfit: 'tunic', colors: { hair: '#1a1218', cloth: '#b01e3a', pants: '#b01e3a', boot: '#2a1218', skin: SKIN[1] } } },
  grace:  { name: 'GRACE',   color: '#e8d8b8', rig: { hair: 'long', outfit: 'robe', colors: { hair: '#e8cf8a', cloth: '#7a9ab0', pants: '#7a9ab0', skin: SKIN[0] } } },
  typist: { name: 'TYPIST',  color: '#c8b0e0', rig: { hair: 'ponytail', outfit: 'shirt', colors: { hair: '#6a4a2e', cloth: '#d8c8e0', pants: '#4a3a5a', skin: SKIN[0] } } },
  narrator: { name: '', color: '#c8c0d8', rig: {} }
};

/* ---------- tags, slides, clients ---------- */
M.TAGS = {
  nostalgia: { n: 'Nostalgia', c: '#e0a85a', k: 'N' }, glamour: { n: 'Glamour', c: '#e0609a', k: 'G' }, honesty: { n: 'Honesty', c: '#6ac0a0', k: 'H' },
  novelty: { n: 'Novelty', c: '#5aa8f0', k: 'V' }, family: { n: 'Family', c: '#a0d060', k: 'F' }, status: { n: 'Status', c: '#b08ae0', k: 'S' }
};
M.SLIDES = {
  carousel:  { t: 'The Carousel',       tag: 'nostalgia', p: 2, b: 'A slide projector hums. The way it was, and never will be again.' },
  kitchen:   { t: 'Kitchen Table',      tag: 'family',    p: 2, b: 'Dinner at six. Somebody always gets the last roll.' },
  jetage:    { t: 'Jet Age',            tag: 'novelty',   p: 2, b: 'Tomorrow, delivered by Tuesday.' },
  penthouse: { t: 'Penthouse Cocktail', tag: 'glamour',   p: 2, b: 'Ice, silk, and a view of everyone else.' },
  plain:     { t: 'Plain Talk',         tag: 'honesty',   p: 2, b: 'We say what it is. Then we say it again, slower.' },
  corner:    { t: 'Corner Office',      tag: 'status',    p: 2, b: 'Every man wants to be seen being wanted.' },
  headline:  { t: "Margie's Headline",  tag: 'honesty',   p: 3, b: 'Eight words that fit on a matchbook.', earned: true },
  martini:   { t: 'A Round of Martinis', tag: 'glamour',  p: 3, b: 'Roland swears nothing closes like an olive.', earned: true },
  quiet:     { t: 'The Quiet Truth',    tag: 'honesty',   p: 3, b: 'Mr. Dunn: say less. Mean all of it.', earned: true },
  numbers:   { t: 'Hard Numbers',       tag: 'status',    p: 3, b: 'Percy\'s charts. Ugly, correct, and borrowed.', earned: true },
  farm:      { t: 'The Farm',           tag: 'nostalgia', p: 3, b: 'A porch, a dog, a boy who left. It is not in the file.', earned: true, secret: true }
};
M.CLIENTS = {
  hollis: { name: 'Hollis Brandt', firm: 'Sonora Hi-Fi', who: 'hollis', rounds: 4, target: 78, start: 28, love: ['novelty', 'status'], hate: ['nostalgia'],
    tells: { great: ['Hollis taps the table in time with a song only he can hear.', 'He leans in. The cigar goes out and he lets it.'], good: ['Hollis nods like a man agreeing with his own idea.', 'A small, approving grunt.'],
      meh: ['Hollis checks his watch. It is a nice watch.', 'He studies the ceiling tiles.'], bad: ['Hollis winces as if the stereo had skipped.', 'He says: "My father sold radios. I do not need to be told how that ends."'] } },
  teague: { name: 'Harlan Teague', firm: 'Ember Gold Cigarettes', who: 'teague', rounds: 5, target: 100, start: 28, love: ['nostalgia', 'honesty'], hate: ['glamour'],
    tells: { great: ['Teague takes off his glasses. That is how you know.', 'For a second the whole room is a porch in Carolina.'], good: ['Teague turns his lighter over once.', 'He nods without looking at anyone.'],
      meh: ['Teague taps ash into a tray that is already full.', 'Somebody coughs. It is not Teague.'], bad: ['Teague stares at the slide the way you stare at a bill.', '"I have been sold to by better men than this," he says, mildly.'] } }
};

/* ---------- the day, as lines. [who, text] | { ask: [{ t, fx, then }] } | { fn } ---------- */
const L = (who, text) => [who, text];
const A = (...opts) => ({ ask: opts });
const S = () => M.S;

M.T = {
  gwen() {
    const f = S().flags;
    if (!f.gwen) {
      f.gwen = 1;
      return [
        L('gwen', 'Good morning, Mr. Whitman. You look like a man who slept in a chair.'),
        L('you', 'The chair and I have an understanding.'),
        L('gwen', 'Joyce has your messages. Also, Mr. Brandt of Sonora Hi-Fi telephoned. He wants lunch, not a presentation. He says he is allergic to presentations.'),
        A({ t: 'Anything else I should know?', fx: { know: 'hollis:nostalgia:hate', rep: 1 }, then: [L('gwen', 'He fired his last agency over a jingle. Said it sounded like his grandmother\'s radio. Whatever you do, do not be sentimental at him.'), L('you', 'Noted. Sentiment stays in my coat.')] },
          { t: 'Coffee. Black. Immediately.', fx: { composure: 6 }, then: [L('gwen', 'Already poured. I have been here since seven. Nobody counts that.')] },
          { t: 'Smile and keep walking.', fx: { composure: 2 }, then: [L('gwen', 'That one works on everybody but me.')] })
      ];
    }
    return [L('gwen', ['The elevator is at the end of the lobby, if you are looking to leave early.', 'Mr. Dunn asked if you had your shoes on. I did not ask why.', 'Coffee is a nickel. Courage is free but rare.'][Math.floor(game.time) % 3])];
  },
  joyce() {
    const f = S().flags;
    if (!f.joyce) {
      f.joyce = 1;
      return [
        L('joyce', 'Dick. Three things. The Ember Gold people are here at three o\'clock. Not 3:05. Mr. Teague has opinions about clocks.'),
        L('joyce', 'Second, Percy has been asking about your personnel file again. Third, there is lipstick on your collar.'),
        A({ t: 'It is the new tie. It runs.', fx: { composure: -3, rep: 1 }, then: [L('joyce', 'It is a very honest tie.')] },
          { t: 'I need you to be my friend today.', fx: { composure: 8, know: 'teague:glamour:hate' }, then: [L('joyce', 'I am always your friend. That is why I tell you things. Teague\'s wife left him for a lounge singer. Nothing shiny, nothing smooth. He will smell it.')] },
          { t: 'Whose lipstick?', fx: { heat: 1, composure: -5 }, then: [L('joyce', 'Not mine. I have standards and a husband. Fix it before Percy finds the shade.')] }),
        L('joyce', 'Margie has the copy for Ember Gold. Mr. Dunn would like a word. Take the long way if you have to.')
      ];
    }
    if (!f.margie || !f.dunn) return [L('joyce', 'Margie is in the bullpen with the copy. Mr. Dunn is in his office, shoes in the hall. Go. I will pretend you were here.')];
    if (!f.pitch1 && !f.lunch) return [L('joyce', 'You have lunch with Sonora at 12:30. The elevator is in the lobby. The Gilded Fig, a booth in the back.')];
    if (f.pitch1 && !f.pitch2) return [L('joyce', S().clock > 14 * 60 ? 'Three o\'clock, Dick. The conference room. Do not make Teague wait in a room with a clock.' : 'Everything is on the table. Do not touch your hair.')];
    if (f.pitch2 && !f.grace) return [L('joyce', 'There is a call for you on your own line. She sounded tired. Be kind.')];
    return [L('joyce', 'Go home, Dick. The work will still be here, being work.')];
  },
  margie() {
    const f = S().flags;
    if (!f.margie) {
      return [
        L('margie', 'I have a line for Ember Gold. It is not a good line yet. It is a line that wants to be good.'),
        L('you', 'That is how all of them start.'),
        L('margie', 'Mr. Teague grew up on a tobacco farm. Whatever else we say, it should sound like he already believed it.'),
        { fn: () => { f.margie_hint = 1; S().known['teague:nostalgia:love'] = 1; } },
        A({ t: 'Show me. Type it up while I watch.', fx: {}, then: [{ fn: () => M.startSprint() }] },
          { t: 'Read it to me.', fx: { composure: 2 }, then: [L('margie', 'No. You will fix it before it is finished, and then it is yours. Type it with me.'), { fn: () => M.startSprint() }] })
      ];
    }
    if (f.margie && !f.margie_credit) return [L('margie', 'It is yours now, Mr. Whitman. Please say my name when you use it.')];
    return [L('margie', ['I am not tired. I am just thinking with my eyes closed.', 'Somebody has to want the work more than the credit. It is usually me, and I am tired of it.'][Math.floor(game.time) % 2])];
  },
  margieAfter(grade) {
    const f = S().flags; f.margie_credit = 0;
    const pw = grade === 'C' ? 1 : grade === 'B' ? 2 : 3;
    return [
      L('margie', grade === 'S' || grade === 'A' ? 'That is it. That is the line. I will not sleep, but I will be proud.' : grade === 'B' ? 'It will do. It needs a day and a bad night.' : 'We both know that was a first draft.'),
      { fn: () => { S().headlinePower = pw; M.giveSlide('headline'); } },
      L('margie', 'If it works, who gets the credit?'),
      A({ t: '"Margie wrote it. I just stood near it."', fx: { composure: 6, rep: 2, flag: 'margie_credit' }, then: [L('margie', 'Thank you, Mr. Whitman. Do not say that to Percy. He will frame it.')] },
        { t: '"The agency wrote it. Us. Together."', fx: { rep: 3 }, then: [L('margie', 'That is what they say right before it is theirs.')] },
        { t: '"I wrote it. You typed."', fx: { rep: 6, composure: -8, heat: 1 }, then: [L('margie', 'Of course. You are the creative director.'), L('narrator', 'She goes back to her desk. The typewriter sounds like a small argument.')] })
    ];
  },
  roland() {
    const f = S().flags;
    if (!f.roland) {
      f.roland = 1;
      return [
        L('roland', 'Dick. Come in, sit, take a drink. It is eleven in Tokyo and I never argue with the Japanese.'),
        L('you', 'It is half past eight here.'),
        L('roland', 'And yet the ice is already awake.'),
        A({ t: 'One finger. Neat.', fx: { composure: 14, haze: 12, flag: 'roland_drink' }, then: [{ fn: () => game.audio.sfx('clink') }, L('roland', 'Look at that. A man with a plan. Sonora\'s Hollis loves the whole new thing. The shiny future and who is in front of whom. Sell him the order of things.'), { fn: () => { S().known['hollis:novelty:love'] = 1; S().known['hollis:status:love'] = 1; } }] },
          { t: 'Water, Roland. And advice.', fx: { composure: 4, rep: 2 }, then: [L('roland', 'The two worst things I can pour. Fine. Hollis wants novelty and wants to be above the other men in the room. Give him both.'), { fn: () => { S().known['hollis:novelty:love'] = 1; S().known['hollis:status:love'] = 1; } }] },
          { t: 'I need a favor, not a drink.', fx: { composure: 2 }, then: [L('roland', 'Those are the same thing in this building. Take the olives. They closed the Chrysler account.')] }),
        L('roland', 'Take this. A round of martinis. Do not drink it, sell it.'),
        { fn: () => M.giveSlide('martini') }
      ];
    }
    return [L('roland', ['The ice is on me. Go on, win something.', 'I have been in this business thirty years. It has never once been about the product. Remember that, and burn the rest.'][Math.floor(game.time) % 2])];
  },
  percy() {
    const f = S().flags;
    if (!f.percy) {
      f.percy = 1;
      return [
        L('percy', 'Dick. Good morning. Do you have a minute? I have a question about Springfield.'),
        L('you', 'I have never been to Springfield.'),
        L('percy', 'Neither has your file. That is my question.'),
        A({ t: '"Ask Mr. Dunn. He hired me."', fx: { composure: 4, heat: 1, rep: 1 }, then: [L('percy', 'Mr. Dunn hires people the way other men buy hats. By the feel.')] },
          { t: '"Be careful, Percy. Files can be lost."', fx: { composure: -6, heat: 2, rep: 2 }, then: [L('percy', 'Was that a threat? I would like it in writing.')] },
          { t: 'Offer a cigarette. Change the subject.', fx: { composure: 3, cig: -1, rep: 1 }, then: [{ fn: () => game.audio.sfx('lighter') }, L('percy', 'You never smoke Luckies. What have you got? Oh. These are foreign. Interesting.')] }),
        L('percy', 'Listen. The Ember Gold account is yours to lose. Here are the numbers. Use them or do not.'),
        { fn: () => M.giveSlide('numbers') },
        L('percy', 'If you lose it, I will be very sorry for about a minute.')
      ];
    }
    return [L('percy', ['Still here. Still watching. Still very sorry in advance.', 'I find a man\'s whole story in what he does not say. You say very little, Dick.'][Math.floor(game.time) % 2])];
  },
  dunn() {
    const f = S().flags;
    if (!f.dunn) {
      f.dunn = 1;
      return [
        L('narrator', 'Mr. Dunn\'s shoes are lined up outside his door. Inside, he is in stocking feet, reading a Japanese novel upside down.'),
        L('dunn', 'Mr. Whitman. Thank you for coming. Please remove your shoes.'),
        A({ t: 'Take them off.', fx: { composure: 8, rep: 2 }, then: [L('dunn', 'Better. A man cannot lie in his socks. Mr. Teague. A single piece of advice.'), L('dunn', 'He does not want to be impressed. He wants to be told the truth by someone who is not afraid of him. Say less. Mean all of it.')] },
          { t: 'Keep them on.', fx: { composure: -4, rep: -1 }, then: [L('dunn', 'Then you will tell me less than you could. That is permitted.'), L('dunn', 'Mr. Teague does not want to be impressed. He wants to be told the truth. Say less. Mean all of it.')] }),
        { fn: () => { S().known['teague:honesty:love'] = 1; M.giveSlide('quiet'); } },
        L('dunn', 'Also. A young man came to the lobby asking for you by a different name. I told Gwen to be polite.'),
        L('you', 'What name?'),
        L('dunn', 'The one you have been sleeping on top of for ten years, I imagine. Good day.')
      ];
    }
    return [L('dunn', ['Is it afternoon? It feels like afternoon.', 'The world is mostly a lobby. Go and be brave in it.'][Math.floor(game.time) % 2])];
  },
  archie() {
    const f = S().flags;
    if (!f.archie) {
      f.archie = 1;
      return [
        L('archie', 'Dick? Dickie. Look at you. They told me it was a Mr. Whitman and I said, that is a funny way to spell my brother.'),
        L('you', 'You should not be here. Not today.'),
        L('archie', 'The farm is gone. Dad is gone. I took a bus, I have eleven dollars, and I thought you might want to know.'),
        A({ t: '"I do not know you. Gwen, a cab."', fx: { composure: -14, heat: 3, rep: 1, flag: 'archie_denied' }, then: [L('archie', 'Okay. Okay. That is okay. I understand that you understand. Tell Mom you did not.'), L('narrator', 'He puts the eleven dollars back in his pocket with great care. It takes a long time.')] },
          { t: 'Buy him breakfast at the corner.', fx: { composure: 6, heat: 2, rep: 2, min: 20, slide: 'farm', know: 'teague:nostalgia:love', flag: 'archie_helped' }, then: [L('archie', 'You still do the thing with your jaw when you lie to yourself.'), L('you', 'Tell me about the porch.'), L('archie', 'There was a dog. There was a Christmas. You left before the second one.'), L('narrator', 'You write nothing down. You will remember all of it.')] },
          { t: '"Wait here. I will be back after lunch."', fx: { composure: -4, heat: 1, flag: 'archie_waits' }, then: [L('archie', 'Back after lunch. Sure. I have been waiting ten years. I can do an afternoon.')] })
      ];
    }
    return f.archie_denied ? [L('archie', 'You do not have to say anything. I will not say anything either.')] : [L('archie', 'Go to your lunch. I will be right here, being a stranger.')];
  },
  vera() {
    const f = S().flags;
    if (!f.vera) {
      f.vera = 1;
      return [
        L('vera', 'You are alone at a bar at half past noon with a face like a closed door. Either you are very rich or very sad.'),
        A({ t: '"A little of both. And you?"', fx: { composure: 6, heat: 1, rep: 1, haze: 4 }, then: [L('vera', 'I am an actress. That means I am whatever you are not.'), L('vera', 'I was in the Ember Gold commercials in 1959. They never use the same girl twice. Mr. Teague hated every glamorous one of us. Wanted a "real woman". Nobody has ever found one.'), { fn: () => { S().known['teague:glamour:hate'] = 1; } }] },
          { t: '"Excuse me. I have a client."', fx: { composure: 2, rep: 1 }, then: [L('vera', 'They always do. Come back when you have a day off.')] },
          { t: 'Buy her a drink and a story.', fx: { composure: 8, heat: 2, haze: 10, rep: 2, cig: -1 }, then: [{ fn: () => game.audio.sfx('clink') }, L('vera', 'You are a very good listener. It is going to ruin your life.')] })
      ];
    }
    return [L('vera', 'Go sell something, Mr. Whitman. I will be here, being looked at.')];
  },
  sully() {
    const f = S().flags;
    return [
      L('sully', f.sully ? 'Same as before?' : 'You are early. Hollis is in the back booth, doing his stare at the menu.'),
      A({ t: 'A rye, neat.', fx: { composure: 14, haze: 14, min: 10 }, then: [{ fn: () => game.audio.sfx('clink') }, L('sully', 'On the house. Nobody pays at noon. That is how we know it is noon.')] },
        { t: 'Club soda with a lime.', fx: { composure: 5, haze: -6, min: 5 }, then: [L('sully', 'A man in the middle of a decision.')] },
        { t: 'Nothing, thanks.', fx: {}, then: [] }),
      { fn: () => { f.sully = 1; } }
    ];
  },
  typist(name) {
    const lines = {
      dot: ['Mr. Whitman, Percy asked me what time you got in. I said the usual. He said "which usual?"', 'I am typing as fast as I can. The ribbon is the one that is slow.'],
      lois: ['If you hear a bell, that is not the elevator. That is me finishing a page.', 'Roland sent his secretary home for a reason I will not repeat.'],
      bev: ['They say the new computers will do all this. I will believe it when one brings me a coffee.', 'Eight pages by ten. Nobody ever says thank you. I say it to myself.']
    }[name];
    return [L('typist', lines[Math.floor(game.time * .7) % 2])];
  },
  hollisIntro() {
    const f = S().flags;
    return [
      L('hollis', f.late1 ? 'You are late, young man. In my business that is a rest. I do not like rests.' : 'Mr. Whitman. Sit. Good. I have two rules. I do not read slides and I do not like surprises. Which do you have?'),
      L('you', 'Both. But I promise to be brief.'),
      L('hollis', 'Then talk. I will tell you with my face when to stop.'),
      { fn: () => M.startPitch('hollis') }
    ];
  },
  hollisAfter(win) {
    return win ? [L('hollis', 'Sonora is yours, Whitman. Do not send me a card at Christmas. Send me a better sound.'), L('narrator', 'He signs on the back of a napkin. The napkin is more binding than the contract.')]
      : [L('hollis', 'No, I think not. It is not you. It is the part where you tried so hard.'), L('narrator', 'He pays for the olives and leaves. The bartender watches him go like a man watching weather.')];
  },
  teagueIntro() {
    const f = S().flags;
    return [
      L('narrator', 'The conference room smells of lemon polish and old smoke. Teague sits at the head of the table with a lighter he never lights.'),
      L('teague', f.late2 ? 'Three-oh-seven. I measured. What are you going to say that is worth seven minutes?' : 'Mr. Whitman. I hear you are the best there is. I hear that about a great many men.'),
      L('percy', 'Mr. Teague, if I may. Dick is a bit unorthodox. I have the numbers if the creative gets loose.'),
      L('you', 'Thank you, Percy. Mr. Teague, I will not sell you anything. I will show you something.'),
      { fn: () => M.startPitch('teague') }
    ];
  },
  percyInterrupt() {
    return [
      L('percy', 'Excuse me. The deck, with respect, is a lovely story. But where are the numbers? Mr. Teague has shareholders, not memories.'),
      L('narrator', 'The room goes quiet. Everyone looks at Dick, and at the hand Percy has put on his own file.'),
      A({ t: 'Quote his own numbers back, kindly.', fx: { composure: 2, ping: 14, rep: 3 }, then: [L('you', 'Percy is right. Thirty-one percent of Ember Gold smokers cannot say why. That is the number. That is the story.')] },
        { t: 'Make a joke at his expense.', fx: { composure: -6, ping: -4, rep: 1, heat: 1 }, then: [L('you', 'Percy loves a spreadsheet. It never talks back.'), L('teague', 'Hm.')] },
        { t: '"Springfield, Percy. Finish that thought."', fx: { composure: -10, ping: 8, heat: -1, rep: 4 }, then: [L('percy', 'No. I think I will let you go on.'), L('narrator', 'He sits. You will pay for that, but not today.')] })
    ];
  },
  grace() {
    return [
      L('narrator', 'The phone rings at the pitch of a held breath.'),
      L('grace', 'It is me. Did I catch you at a bad time? I have been wondering what kind of man I married.'),
      L('you', 'A busy one. I am sorry.'),
      A({ t: '"I will be home for dinner. I promise."', fx: { composure: 6, rep: 0, flag: 'promised' }, then: [L('grace', 'You always do. Then you stay for the second martini. I am asking you to come home.')] },
        { t: '"There is something I should tell you."', fx: { composure: -12, heat: 2, rep: 1, flag: 'honest' }, then: [L('grace', 'Do not tell me on a telephone, Dick. Tell me over a table. Tonight.'), L('narrator', 'You put the receiver down very gently, like it might still be listening.')] },
        { t: '"I have a late meeting."', fx: { composure: -4, heat: 1, flag: 'late_night' }, then: [L('grace', 'Of course. Tell the meeting I said hello.')] })
    ];
  }
};

/* ---------- endings ---------- */
M.endings = (S, sc) => {
  const won = (S.flags.won1 ? 1 : 0) + (S.flags.won2 ? 1 : 0);
  if (S.haze >= 85) return { id: 'weekend', title: 'THE LOST WEEKEND', lines: ['You wake up on Saturday in a suit.', 'Someone has signed a napkin on your behalf. It may be a contract.', 'Nobody in the building will describe Thursday to you, and you do not ask.'] };
  if (won === 2 && S.heat <= 4) return { id: 'corner', title: 'THE CORNER OFFICE', lines: ['Mr. Dunn takes his shoes off in your office and says nothing, which means yes.', 'The partners drink to you at six. You drink with them at seven.', 'Somewhere in a farmhouse, a dog sleeps through all of it.'] };
  if (won >= 1 && S.heat > 4) return { id: 'mirror', title: 'THE MAN IN THE MIRROR', lines: ['You won. Percy knows.', 'There is a manila folder on Mr. Dunn\'s desk with a name on it that is not yours.', 'You adjust your tie. It was never really your tie.'] };
  if (won === 0) return { id: 'elevator', title: 'THE LONG ELEVATOR', lines: ['You lost both. Joyce does not say I told you so; she says "Good night, Dick."', 'The elevator takes eleven floors to be a metaphor.', 'Tomorrow, the same office. A little less of you in it.'] };
  return { id: 'thursday', title: 'ANOTHER THURSDAY', lines: ['One pitch won, one lost, and your tie still crooked.', 'That is called a good day, in the trade.', 'You take the late train home and look at the lights like they owe you something.'] };
};
})();
