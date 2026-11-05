/* =====================================================================================
 * 40 MISSIONS — Episode One, "Pilot Light", as data: each chapter names its location, mood, music and rules, sets
 * its people down (setup) and plays as beats (generators run by game.script). Each beat is a checkpoint: a failure
 * restarts the chapter at its beat. A designer writes a new chapter with the M toolkit below; nothing else changes.
 * M toolkit: say, objective, npc, act, waitAct, reach, cook, wave, cut, banner, walk, give, flag.
 * ===================================================================================== */
const M = {
  mission: null, beat: 0, flags: {}, choice: -1, cookObj: null, cut: false, script: null, lastCook: null, waves: 0,
  say(who, lines, o = {}) {
    M.choice = -1;
    const c = CAST[who], name = o.name || (c ? c.name : who === 'NARRATOR' ? '' : who);
    talk.who = who;
    talk.say(Array.isArray(lines) ? lines : [lines], { name, portrait: who === 'NARRATOR' ? null : portraitOf(who), choices: o.choices, onChoice: i => { M.choice = i; }, place: o.place, vars: o.vars });
    return () => !talk.open;
  },
  objective(title, text, at, step) { W.objective = { title, text, at: at || null, step: step || null }; W.marker = at ? Object.assign({ label: o2label(title) }, at) : null; if (title) A.sfx('select', { vol: .5 }); },
  npc(who, cx, cy, o = {}) {
    const b = new E.Body({ x: cx * R16, y: cy * R16, r: 5 });
    const n = Object.assign(b, { who, rig: makeRig(who, o.rig), facing: o.facing === undefined ? Math.PI / 2 : o.facing, pose: o.pose || null, goal: null, speed: o.speed || 60, team: 'npc', expr: null, solid: o.solid !== false });
    W.npcs.push(n); return n;
  },
  act(o) { const a = Object.assign({ r: 20, active: true, used: false, verb: 'Use' }, o); a.x = a.x !== undefined ? a.x : a.cx * R16; a.y = a.y !== undefined ? a.y : a.cy * R16; W.acts.push(a); return a; },
  waitAct(a) { return () => a.used; },
  reach(x, y, r = 18) { return () => W.hero && Math.hypot(W.hero.x - x, W.hero.y - y) < r; },
  walk(n, cx, cy) { n.goal = { x: cx * R16, y: cy * R16 }; return () => !n.goal; },
  cook(o = {}) { M.cookObj = new Cook(Object.assign({ auto: W.attract }, o)); music('cook'); return () => { if (M.cookObj && M.cookObj.done) { M.lastCook = M.cookObj.result; M.cookObj = null; return true; } return false; }; },
  wave(list) { for (const [kind, cx, cy, o] of list) { const e = makeEnemy(kind, cx * R16, cy * R16, o); W.enemies.push(e); P.dust(e.x, e.y, 0, 8); } M.waves++; return () => W.enemies.every(e => e.dead); },
  banner(text, sub, t = 2.4) { W.banner = { text, sub }; W.bannerT = t; },
  give(cash) { STATE.cash += cash; STATE.total += cash; A.sfx('cash'); W.toasts.push([fmtMoney(cash), 'Added to the duffel bag.']); },
  flag(k, v) { if (v !== undefined) M.flags[k] = v; return M.flags[k]; }
};
function o2label(t) { return String(t || '').toUpperCase().split(' ').slice(0, 3).join(' '); }

/* ---- Cast setups used by more than one chapter ---- */
function schoolStudents() {
  return { kyle: M.npc('KYLE', 5.5, 5.4, { facing: -Math.PI / 2, pose: 'hips' }), bri: M.npc('BRIANNA', 8, 3.3, { facing: -Math.PI / 2 }), marcus: M.npc('MARCUS', 10.5, 7.4, { facing: -Math.PI / 2, pose: 'kneel' }) };
}

const CHAPTERS = [
  /* ================= 1. CHEMISTRY IS THE STUDY OF CHANGE ================= */
  { id: 'ch1', title: 'Chemistry Is the Study of Change', loc: 'school', night: false, music: 'school', flasks: [], about: 'Teach. Cough. Find out.',
    cold: ['ALAMO VERDE, NEW MEXICO.', 'Leland Gray is fifty years old. A master\'s in chemistry, a mortgage, and a sedan that smells like burnt coffee.', 'This is the last ordinary day of his life.'],
    spawn: [6.5, 2.4],
    setup() { M.flags.s = schoolStudents(); M.npc('MARTY', 25.5, 5, { facing: Math.PI, pose: 'hips' }); },
    beats: [
      { run: function* () {
        yield M.say('GRAY', ['Chemistry. It is, technically, the study of matter.', 'But I prefer to see it as the study of {c=#59c8f0}change{/c}.', 'Growth. Decay. Transformation. ...Kyle, the phone.']);
        const s = M.flags.s, quiz = { right: 0 };
        const student = n => M.act({ x: n.x, y: n.y, name: CAST[n.who].name, verb: 'Talk to', npc: n });
        const aK = student(s.kyle), aB = student(s.bri), aM = student(s.marcus);
        M.objective('Teach the class', 'Talk to Kyle, Brianna and Marcus', null, '0 / 3');
        let done = 0;
        while (done < 3) {
          yield () => aK.used || aB.used || aM.used;
          if (aK.used && !aK.talked) { aK.talked = true; aK.active = false;
            yield M.say('KYLE', ['I\'m, like, looking up the answer, Mr. G.']);
            yield M.say('GRAY', ['Then you\'ll know it. Two atoms share electrons. What holds them together?'], { choices: ['An ionic bond', 'A covalent bond', 'A James bond'] });
            if (M.choice === 1) { quiz.right++; yield M.say('KYLE', ['Covalent. Cool. Can I go back to my phone?']); yield M.say('GRAY', ['No.']); }
            else if (M.choice === 2) yield M.say('GRAY', ['...Shaken, Kyle. Not stirred. Detention.']);
            else yield M.say('GRAY', ['Close. Ionic bonds {c=#e8c040}steal{/c}. Covalent bonds {c=#59c8f0}share{/c}. Write that down.']);
          }
          if (aB.used && !aB.talked) { aB.talked = true; aB.active = false;
            yield M.say('BRIANNA', ['Mr. Gray, is it true chemistry is literally everywhere?']);
            yield M.say('GRAY', ['Everywhere. The coffee. The rust on my car. The—']); A.sfx('cough'); game.shake(2);
            yield M.say('BRIANNA', ['...Are you okay?']);
            yield M.say('GRAY', ['Chalk dust. Question. What does a catalyst do to a reaction?'], { choices: ['Speeds it up', 'Slows it down', 'Gets used up'] });
            if (M.choice === 0) { quiz.right++; yield M.say('GRAY', ['It speeds things along, and walks away {c=#59c8f0}unchanged{/c}. Remember that word. Catalyst.']); }
            else yield M.say('GRAY', ['No. A catalyst speeds things along, and walks away unchanged. Remember that word.']);
          }
          if (aM.used && !aM.talked) { aM.talked = true; aM.active = false; s.marcus.pose = null;
            yield M.say('MARCUS', ['Zzz... five more minutes, Ma...']);
            yield M.say('GRAY', ['Marcus. The most stable form of carbon at room temperature. Go.'], { choices: ['Diamond', 'Graphite', 'Charcoal briquettes'] });
            if (M.choice === 1) { quiz.right++; yield M.say('GRAY', ['Graphite. The thing in your pencil. Which you would know, if you ever held one.']); }
            else if (M.choice === 0) yield M.say('GRAY', ['Diamonds aren\'t forever, Marcus. Thermodynamically, they\'re just... patient.']);
            else yield M.say('MARCUS', ['My uncle says briquettes are the most stable thing in his life.']);
          }
          done = [aK, aB, aM].filter(a => a.talked).length; W.objective.step = done + ' / 3';
        }
        M.flags.quiz = quiz.right;
        A.sfx('bell');
        yield M.say('GRAY', ['Chapter four for Monday. There will be a quiz.', 'There is always a quiz.']);
      } },
      { at: [11, 11.5], run: function* () {
        M.objective('Go to the faculty lounge', 'Your brother-in-law is "visiting"', { x: 24.5 * R16, y: 5 * R16 });
        yield M.reach(24.5 * R16, 5.5 * R16, 40);
        M.cut = true;
        yield M.say('MARTY', ['There he is! Mr. Wizard! Brought you a coffee. It\'s gas station, but it\'s got heart.', 'Saw us on the news? Two hundred grand in a microwave. Cooks are idiots, Lee.', 'Product was garbage, too. Sixty percent, tops.']);
        yield M.say('GRAY', ['Sixty percent is barely a solution.']);
        yield M.say('MARTY', ['Ha! Come on a ride-along sometime. See some real chemistry.']);
        A.sfx('cough'); W.hero.kneel = 1; game.shake(3); yield .6; A.sfx('cough'); game.flash('#ffffff', .2, .4); yield .5;
        yield M.say('MARTY', ['Lee? ...Lee! Somebody call 911!']);
        game.flash('#000000', .6, 1); yield .8;
      } },
      { at: [15, 17], run: function* () {
        M.cut = true; W.hero.kneel = 0; W.dim = 1; music('sad');
        yield M.say('DOCTOR', ['Mr. Gray. The mass in your left lung is... it\'s not good news.', 'Inoperable. With treatment, maybe two years. Without...']);
        yield M.say('GRAY', ['...You have mustard on your coat.']);
        yield M.say('DOCTOR', ['I\'m sorry?']);
        yield M.say('NARRATOR', ['That night, he does the math. The mortgage. The treatment. A son starting college. A family that will need money long after he doesn\'t.', 'The numbers do not balance.', 'The next morning he takes Marty up on the ride-along, and from the back seat he watches a former student climb out of a meth house window with no pants on.']);
        W.dim = 0; music('stealth');
        M.objective('Find Danny', 'He\'s hiding by the old RV in the school lot', { x: M.flags.danny.x, y: M.flags.danny.y });
        M.cut = false;
        const aD = M.act({ x: M.flags.danny.x, y: M.flags.danny.y, name: 'DANNY', verb: 'Talk to' });
        yield M.waitAct(aD); aD.active = false; M.cut = true;
        yield M.say('DANNY', ['Mr. Gray?! Dude! What are you doing here?']);
        yield M.say('GRAY', ['I saw you, Danny. This morning. Out the window.']);
        yield M.say('DANNY', ['Man, you didn\'t see nothin\'. That was... a different guy. With my face.']);
        yield M.say('GRAY', ['You know the business. I know the chemistry.'], { choices: ['"Partner with me."', '"Or I call my brother-in-law."'] });
        yield M.say('DANNY', M.choice === 0 ? ['...You want to COOK? You? Dude, you\'re like the least cool guy I ever met.', 'Fine. FINE. Fifty-fifty. But we need real glassware, not the stuff from the dollar store.'] : ['Whoa. Whoa! Okay! Jeez! Fifty-fifty, okay?', 'But we need real glassware, dude. Lab stuff.']);
        yield M.say('GRAY', ['I know where to get some.']);
      } }
    ]
  },
  /* ================= 2. GLASSWARE ================= */
  { id: 'ch2', title: 'Glassware', loc: 'school', night: true, music: 'stealth', flasks: ['chalk'], stealth: true, about: 'Rob your own school. Quietly.',
    cold: ['11:40 P.M.', 'Alamo Verde High has one night janitor, one security guard, and one chemistry storeroom with a lock older than the students.', 'Mr. Gray has a key to everything but that.'],
    spawn: [14.5, 19],
    setup() {
      W.map.set(17, 7, 2); M.flags.door = true;
      W.guards.push(makeGuard('janitor', [[3, 11.5], [26, 11.5, 1.5], [26, 13], [3, 13, 1.5]]));
      W.guards.push(makeGuard('security', [[2, 16], [27, 16, 1.2], [27, 19.5], [2, 19.5, 1.2]]));
      W.guards.push(makeGuard('security', [[22, 2], [27, 8, 1], [22, 8], [27, 2, 1]]));
      M.npc('DANNY', 15, 20.2, { facing: -Math.PI / 2, pose: 'hips' });
    },
    beats: [
      { run: function* () {
        yield M.say('DANNY', ['Dude. Your big plan is to rob your own school?']);
        yield M.say('GRAY', ['I prefer {c=#59c8f0}"reallocate."{/c} Wait in the RV. Lights off.']);
        W.toasts.push(['Stay out of sight', 'Hold ' + label('sneak') + ' to sneak: slow and quiet. Sprinting is loud.']);
        W.toasts.push(['Throw chalk', label('throw') + ' throws chalk. Guards go and look where it lands.']);
        const keys = M.act({ cx: 27.5, cy: 7.5, name: 'HUGO\'S KEYS', verb: 'Take' });
        M.objective('Take the janitor\'s keys', 'Faculty lounge, on the hook', { x: keys.x, y: keys.y });
        yield M.waitAct(keys); keys.active = false; A.sfx('key'); M.flags.keys = true;
        W.toasts.push(['Keys', 'The storeroom key has a strip of tape on it that says STOREROOM. Of course it does.']);
      } },
      { at: [27, 7.5], run: function* () {
        const door = M.act({ cx: 17, cy: 8.2, name: 'STOREROOM DOOR', verb: 'Unlock' });
        M.objective('Unlock the storeroom', 'Off the hallway, north side', { x: door.x, y: door.y });
        yield M.waitAct(door); door.active = false; W.map.set(17, 7, 0); A.sfx('door'); M.flags.door = false;
        const items = [['ROUND-BOTTOM FLASK', 16, 2.5], ['CONDENSER', 18.5, 2.5], ['HEATING MANTLE', 16, 4.5], ['RESPIRATOR', 18.5, 6.5]].map(([n, cx, cy]) => M.act({ cx, cy, name: n, verb: 'Take', item: true }));
        let got = 0;
        while (got < 4) { M.objective('Take the glassware', 'Storeroom shelves', null, got + ' / 4'); yield () => items.filter(i => i.used).length > got; got = items.filter(i => i.used).length; items.forEach(i => { if (i.used) i.active = false; }); A.sfx('pickup'); }
      } },
      { at: [17, 6], run: function* () {
        bark('DANNY', 'Dude. Dude! Hurry up!');
        M.objective('Get back to the RV', 'Parking lot, by the bench', { x: 15 * R16, y: 20 * R16 });
        yield M.reach(15 * R16, 19.6 * R16, 22);
        M.cut = true;
        yield M.say('DANNY', ['You did it! Mr. Gray, you\'re like a ninja. A really old, really sweaty ninja.']);
        yield M.say('GRAY', ['Drive, Danny.']);
      } }
    ]
  },
  /* ================= 3. THE COOK ================= */
  { id: 'ch3', title: 'The Cook', loc: 'desert', night: false, music: 'title', flasks: [], about: 'Forty miles from anyone. Do it right.',
    cold: ['FORTY MILES OUTSIDE ALAMO VERDE.', 'An RV with a bad transmission. A teacher in his underwear and an apron. A kid with a respirator on backwards.', 'Precision is a choice.'],
    spawn: [21, 19],
    setup() { M.flags.d = M.npc('DANNY', 27.5, 15.6, { facing: Math.PI, pose: 'hips' }); },
    beats: [
      { run: function* () {
        yield M.say('DANNY', ['So... this is it. The middle of nowhere.']);
        yield M.say('GRAY', ['The middle of nowhere is where you go when you\'d like to be left alone with your work.', 'And Danny. Your respirator is on backwards.']);
        const rv = M.act({ cx: 22.6, cy: 16.4, name: 'THE RV', verb: 'Unload gear from' });
        M.objective('Unload the gear', 'From the back of the RV', { x: rv.x, y: rv.y });
        yield M.waitAct(rv); rv.active = false; A.sfx('door');
        const rig = M.act({ cx: 25.5, cy: 18.4, name: 'THE COOK', verb: 'Start' });
        M.objective('Start the cook', 'Fold-out table, beside the RV', { x: rig.x, y: rig.y });
        yield M.waitAct(rig); rig.used = false;
        yield M.say('GRAY', ['Four steps. Measure. Heat. Stir. Crystallize.', 'Every one of them is a chance to be sloppy. We won\'t be.']);
        yield M.cook({ tutorial: true });
        music('title');
        const R = M.lastCook; STATE.product += R.lbs; STATE.best = Math.max(STATE.best, R.purity); STATE.batches++;
        if (R.blue) { yield M.say('DANNY', ['Dude. DUDE. It\'s... blue? Why is it BLUE?']); yield M.say('GRAY', ['Because it\'s ' + R.purity.toFixed(1) + ' percent pure, Danny.', 'Because I am {c=#59c8f0}good{/c} at this.']); }
        else yield M.say('GRAY', [R.purity.toFixed(1) + ' percent. Acceptable. It is not good. Next time it will be good.']);
        M.flags.rig = rig;
      } },
      { at: [24, 19], run: function* () {
        const rig = M.flags.rig || M.act({ cx: 25.5, cy: 18.4, name: 'THE COOK', verb: 'Start' });
        rig.verb = 'Cook another batch'; rig.used = false; rig.active = true;
        const d = M.act({ x: M.flags.d.x, y: M.flags.d.y, name: 'DANNY', verb: 'Pack up with' });
        M.objective('Cook more, or pack up', 'Another batch at the table, or tell Danny you\'re done', null, STATE.product.toFixed(1) + ' lb');
        while (!d.used) {
          yield () => rig.used || d.used;
          if (rig.used) { rig.used = false; yield M.cook({}); music('title'); const R = M.lastCook; STATE.product += R.lbs; STATE.best = Math.max(STATE.best, R.purity); STATE.batches++; W.objective.step = STATE.product.toFixed(1) + ' lb'; bark('DANNY', R.blue ? 'Blue again! Yeah, science!' : 'Kinda cloudy, dude...'); }
        }
        yield M.say('DANNY', [STATE.product.toFixed(1) + ' pounds. I know a guy. Two-Tone Tito. He runs a junkyard.', 'He\'s a little... intense.']);
        yield M.say('GRAY', ['Then we\'ll be very calm.']);
      } }
    ]
  },
  /* ================= 4. TWO-TONE ================= */
  { id: 'ch4', title: 'Two-Tone', loc: 'junk', night: true, dusk: true, music: 'stealth', flasks: ['fulminate', 'phosphine'], combat: true, partner: true, about: 'Sell to a madman. Survive the haggling.',
    cold: ['TWO-TONE TITO\'S SALVAGE.', 'Tito Vargas got his nickname from a car he painted half pink in 2003 and never finished.', 'He finishes other things. Usually people.'],
    spawn: [17, 18],
    setup() {
      if (M.beat > 0) return;
      M.flags.tito = M.npc('TITO', 6, 4.8, { facing: Math.PI / 2, pose: 'hips' });
      M.flags.c1 = M.npc('THUG', 4.2, 5.5, { facing: Math.PI / 2, rig: { weapon: 'staff', colors: { cloth: '#2a5a8a' } } });
      M.flags.c2 = M.npc('GUNMAN', 8, 5.4, { facing: Math.PI / 2 });
    },
    beats: [
      { run: function* () {
        yield M.say('DANNY', ['Okay. Let me do the talking. Tito likes me. Mostly.']);
        M.objective('Meet Two-Tone Tito', 'His trailer, back of the yard', { x: 6 * R16, y: 6 * R16 });
        yield M.reach(6 * R16, 6.5 * R16, 40);
        M.cut = true;
        yield M.say('TITO', ['So YOU\'RE the guy. The teacher! Ha! TEACHER!', 'Let me see it.']);
        A.sfx('glass'); yield .4;
        yield M.say('TITO', ['Ohhhh. Ohhh, look at that. It\'s BLUE. That\'s... that is {shake}TIGHT{/shake}. Tight, tight, tight!', 'How much you got? How much you want?'], { choices: ['"$25,000 a pound."', '"$40,000 a pound."', '"Make me an offer."'] });
        const price = [25000, 40000, 18000][M.choice]; M.flags.price = price;
        yield M.say('TITO', M.choice === 1 ? ['FORTY?! ...Ha! I like you, teacher. You got cojones.'] : M.choice === 0 ? ['Twenty-five. Fair. Fair is boring, but okay.'] : ['Eighteen! See, THAT\'S a businessman.']);
        yield M.say('THUG', ['Tito, man, these guys could be cops. The old one looks like a cop.'], { name: 'GONZO' });
        A.sfx('punch'); game.shake(3); M.flags.c1.pose = 'down';
        yield M.say('TITO', ['Do NOT talk while I\'m doing business!', '...You know what, teacher? Business is business. And my business is... I keep it all.', 'Cousins! Make them disappear!']);
        yield M.say('DANNY', ['Mr. Gray, RUN!']);
        yield M.say('GRAY', ['No. {c=#59c8f0}Chemistry.{/c}']);
        M.flags.tito.goal = { x: 6 * R16, y: 1.4 * R16 }; M.flags.c1.dead = true; M.flags.c2.dead = true;
        W.npcs = W.npcs.filter(n => n.who !== 'THUG' && n.who !== 'GUNMAN');
        M.cut = false; music('fight');
      } },
      { at: [8, 9], run: function* () {
        W.toasts.push(['Throw', (isPad() ? 'Aim with the right stick, ' : 'Aim with the mouse, ') + label('throw') + ' throws the flask you hold.']);
        W.toasts.push(['Two flasks', label('swap') + ' switches: Fulminate explodes, Phosphine chokes.']);
        W.toasts.push(['Get close, get away', label('melee') + ' shoves. ' + label('dodge') + ' rolls through danger.']);
        M.objective('Survive the cousins', 'Wave 1 of 2', null);
        yield M.wave([['thug', 12, 7], ['thug', 15, 4.5], ['thug', 4, 9]]);
        bark('DANNY', 'More coming from the gate!');
        M.objective('Survive the cousins', 'Wave 2 of 2', null);
        yield 1;
        yield M.wave([['thug', 17, 18], ['thug', 19, 18], ['gunman', 18, 17], ['gunman', 25, 16]]);
        bark('TITO', 'You\'re DEAD, teacher! Dead! ...I\'m leaving now!');
      } },
      { at: [10, 12], run: function* () {
        music('stealth');
        const bag = M.act({ cx: 7.5, cy: 7, name: 'THE CASH', verb: 'Take' });
        M.objective('Take the money', 'Tito left in a hurry', { x: bag.x, y: bag.y });
        yield M.waitAct(bag); bag.active = false;
        const pay = Math.round(Math.max(1, STATE.product) * (M.flags.price || 25000) * .5 / 10) * 10; M.give(pay); STATE.product = 0;
        M.objective('Leave by the gate', 'South fence', { x: 18 * R16, y: 18.6 * R16 });
        yield M.reach(18 * R16, 18.6 * R16, 24);
        M.cut = true;
        yield M.say('DANNY', ['We just... we just blew up a junkyard, dude.']);
        yield M.say('GRAY', ['We were paid for half of it. Now we need someone who knows what to do with money like this.']);
      } }
    ]
  },
  /* ================= 5. EVERY DOLLAR NEEDS A STORY ================= */
  { id: 'ch5', title: 'Every Dollar Needs a Story', loc: 'town', night: true, music: 'town', flasks: ['chalk'], stealth: true, heat: true, about: 'Deliver. Don\'t get noticed. Wash it clean.',
    cold: ['CENTRAL AVENUE, 1:15 A.M.', 'Three customers, one duffel bag, and a brother-in-law with a badge who just got a tip about something blue.', 'Keep your head down.'],
    spawn: [3, 9.5],
    setup() {
      M.flags.barry = M.npc('BARRY', 23, 13.4, { facing: Math.PI / 2, pose: 'hips' });
      W.guards.push(makeGuard('agent', [[5, 13.6], [20, 13.6, 1.5], [20, 18.5], [5, 18.5, 1.5]]));
      W.guards.push(makeGuard('agent', [[30, 8.6], [44, 8.6, 1.5], [44, 13.6], [30, 13.6, 1.5]]));
      W.guards.push(makeGuard('cruiser', [[2, 6.5], [44, 6.5, .1], [44, 15.6], [2, 15.6, .1]]));
      W.hides = [[23.5, 13], [9, 18.4]].map(([cx, cy]) => M.act({ cx, cy: cy + .9, name: 'DUMPSTER', verb: 'Hide in', hide: true, keep: true }));
    },
    beats: [
      { run: function* () {
        bark('MARTY', 'All units: someone\'s moving blue product in my town. Find me the cook.');
        const b = M.act({ x: M.flags.barry.x, y: M.flags.barry.y, name: 'BARRY FLEISCHMAN', verb: 'Talk to' });
        M.objective('Meet the lawyer', 'Behind the strip mall. He\'s on the bus benches', { x: b.x, y: b.y });
        yield M.waitAct(b); b.active = false; M.cut = true;
        yield M.say('BARRY', ['Barry Fleischman, attorney at law! You\'ve seen the benches. {c=#e8c040}"Better Call Barry!"{/c}', 'So. A man walks into a lawyer\'s alley with a duffel bag of cash and no story. You know what that man has?']);
        yield M.say('GRAY', ['A problem.']);
        yield M.say('BARRY', ['A PROBLEM! You\'re quick. I like quick. Here\'s the deal: three customers tonight, my referrals, very discreet.', 'Then bring the cash to the car wash on Fourth. Every dollar needs a story, and a car wash tells a beautiful story.']);
        M.cut = false;
        W.toasts.push(['Heat', 'Agents who see you raise the heat. If it fills, you\'re busted. Break line of sight to cool off.']);
        W.toasts.push(['Hide', 'Dumpsters hide you completely. ' + label('interact') + ' to climb in or out.']);
      } },
      { at: [22, 14.4], run: function* () {
        const spots = [[12.5, 2.6], [35, 12.5], [36, 20.5]];
        const buyers = spots.map(([cx, cy], i) => { const n = M.npc('BUYER', cx, cy, { facing: Math.PI / 2, rig: { colors: { coat: ['#4a4a3a', '#3a2a4a', '#5a3a2a'][i] } } }); return M.act({ x: n.x, y: n.y + 4, name: 'CUSTOMER', verb: 'Deliver to', npc: n }); });
        let done = 0;
        while (done < 3) {
          const next = buyers.find(b => !b.used);
          M.objective('Make the deliveries', 'Barry\'s referrals', { x: next.x, y: next.y }, done + ' / 3');
          yield () => buyers.filter(b => b.used).length > done;
          done = buyers.filter(b => b.used).length; buyers.forEach(b => { if (b.used) b.active = false; });
          A.sfx('cash'); M.give(6000 + Math.round(STATE.best * 40)); bark('BUYER', E.pick(['Is it true it\'s blue? ...Whoa.', 'Barry sent me. I never saw you.', 'My guy said ask for "the teacher."']));
        }
      } },
      { at: [38, 17], run: function* () {
        const wash = M.act({ cx: 28, cy: 15, name: 'THE CAR WASH', verb: 'Launder the cash at' });
        M.objective('Wash the money', 'The car wash on Fourth', { x: wash.x, y: wash.y });
        yield M.waitAct(wash); wash.active = false; M.cut = true;
        yield M.say('BARRY', ['Beautiful. Look at that. Soap, water, a little paperwork — and now it\'s {c=#7aff9a}"tips."{/c}', 'Pleasure doing business, Professor. Call me. Better yet... Better Call Barry.']);
        M.give(5000);
      } }
    ]
  },
  /* ================= 6. SAY THE FORMULA ================= */
  { id: 'ch6', title: 'Say the Formula', loc: 'junk', night: true, music: 'boss', flasks: ['fulminate', 'phosphine'], combat: true, partner: false, boss: true, about: 'Tito has Danny. Bring the chemistry.',
    cold: ['3:02 A.M.', 'Tito Vargas has Danny Pike, a sledgehammer, and an idea about what happens to people who make him look stupid.', 'Leland Gray has a bag of crystals that are not what they look like.'],
    spawn: [17, 17.5],
    setup() {
      if (M.beat > 0) { W.partner = makePlayer('DANNY', 16 * R16, 16 * R16, { ai: true, hp: 6 }); W.partner.player = game.players[1] || null; return; }
      M.flags.danny = M.npc('DANNY', 15.5, 11.5, { facing: Math.PI / 2, pose: 'kneel' });
      M.flags.tito = M.npc('TITO', 17, 12.6, { facing: Math.PI / 2, pose: 'hips', rig: { size: 1.7, weapon: 'staff', colors: { metal: '#9a9aa8' } } });
    },
    beats: [
      { run: function* () {
        M.objective('Find Danny', 'By the crusher', { x: 16 * R16, y: 12 * R16 });
        yield M.reach(17 * R16, 13 * R16, 60);
        M.cut = true;
        yield M.say('TITO', ['TEACHER! You came! You bring me the blue?']);
        yield M.say('GRAY', ['I brought you something.'], { choices: ['Hold up the bag', 'Hold up the bag, slowly'] });
        yield M.say('TITO', ['Then give it! GIVE IT!']);
        yield M.say('GRAY', ['This is not blue.']);
        burst('fulminate', 17 * R16, 13.4 * R16, 0, 1.5); game.flash('#ffffff', .25, 1); yield .8;
        yield M.say('TITO', ['WHAT WAS THAT?! WHAT DID YOU DO?!']);
        yield M.say('GRAY', ['{c=#59c8f0}Mercury fulminate.{/c} Unstable. Like you.', 'Danny. Get behind me.']);
        const t = M.flags.tito; W.npcs = W.npcs.filter(n => n !== t && n !== M.flags.danny);
        const boss = makeEnemy('boss', t.x, t.y - 4, {}); boss.name = 'TWO-TONE TITO'; W.enemies.push(boss); M.flags.boss = boss;
        W.partner = makePlayer('DANNY', M.flags.danny.x, M.flags.danny.y, { ai: true, hp: 6 }); W.partner.player = game.players[1] || null;
        W.hero.meter = 1;
        M.cut = false;
        W.toasts.push(['The hat', 'Your Catalyst meter is full. ' + label('catalyst') + ': put on the hat. Enemies scatter, flasks are free, you hit twice as hard.']);
        W.toasts.push(['Tells', 'Tito\'s charge winds up. Roll sideways. If he hits a wall, he\'s dazed.']);
      } },
      { at: [17, 16], run: function* () {
        const boss = M.flags.boss || W.enemies.find(e => e.kind === 'boss');
        if (!boss) { const b2 = makeEnemy('boss', 17 * R16, 12 * R16); b2.name = 'TWO-TONE TITO'; W.enemies.push(b2); M.flags.boss = b2; }
        const B = M.flags.boss;
        M.objective('Defeat Two-Tone Tito', '', null);
        yield () => B.hp <= B.maxHp / 2 || B.dead;
        if (!B.dead) {
          B.phase = 2; game.shake(5); A.sfx('alarm');
          bark('TITO', 'COUSINS! GET IN HERE!');
          M.wave([['thug', 2, 9], ['gunman', 31, 9], ['thug', 18, 18]]);
          W.hero.meter = Math.max(W.hero.meter, .6);
        }
        yield () => B.dead;
        W.enemies.forEach(e => { if (!e.dead) { e.dead = true; e.downT = 0; } });
      } },
      { at: [17, 14], run: function* () {
        M.cut = true; music(null);
        const t = M.npc('TITO', W.flags_bx || 17, W.flags_by || 12, { facing: Math.PI / 2, pose: 'kneel', rig: { size: 1.7, weapon: null } });
        W.enemies = W.enemies.filter(e => e.kind !== 'boss');
        W.hero.catalyst = Math.max(W.hero.catalyst, 6);
        yield M.say('TITO', ['Okay! OKAY! You win, teacher! Who... who ARE you, man?'], { choices: ['"The Catalyst."', '"Your chemistry teacher."'] });
        yield M.say('GRAY', M.choice === 0 ? ['{s=10}Say it.{/s}', 'Say the formula.'] : ['Your chemistry teacher, Tito.', 'And class... is dismissed.']);
        yield M.say('TITO', ['...The Catalyst. You\'re... you\'re the Catalyst.']);
        A.sfx('siren'); yield .5; A.sfx('siren');
        yield M.say('DANNY', ['Sirens! Dude, that\'s DEA! We gotta GO!']);
        yield M.say('MARTY', ['Two-Tone Tito Vargas, on his knees in a junkyard at three in the morning! It\'s Christmas!', 'Anybody see who did this? ...Anybody?']);
        music('sad');
        yield M.say('NARRATOR', ['Across town, the lights are still on at Pollo Sol.']);
        yield M.say('AURELIO', ['A chemistry teacher. Ninety-nine percent.', 'Men who make something that pure rarely stay small. Watch him. Patiently.']);
      } }
    ]
  }
];

function bossDown(e) { W.flags_bx = e.x / R16; W.flags_by = e.y / R16; game.freeze(.25); game.flash('#ffffff', .3, .8); game.timeScale = .4; game.after(.6, () => { game.timeScale = 1; }); P.explosion(e.x, e.y, 0, .8, { shake: 4 }); }
