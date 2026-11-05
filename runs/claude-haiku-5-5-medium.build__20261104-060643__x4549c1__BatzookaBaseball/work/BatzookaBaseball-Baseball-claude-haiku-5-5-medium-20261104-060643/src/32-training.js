// Spring Training: four lessons. Each reads its pages in the announcer's box, then plays a short match (one inning) with
// a drill: the goal is counted in the match, and the match ends as soon as it's met. The lesson's player is p1, the team
// the player controls for the drill; the other side is the CPU.
BZ.LESSON_SETUP = {
  pitch: { p1: 1, human: [false, true], drill: 'strikes' },
  hit: { p1: 0, human: [true, false], drill: 'hit' },
  field: { p1: 1, human: [false, true], drill: 'catch' },
  bz: { p1: 0, human: [true, false], drill: 'homer', meterStart: 100 }
};

BZ.trainingScene = {
  enter() {
    BZ.playSong('title');
    const done = E.store.get('batz-lessons', {});
    const items = BZ.LESSONS.map((L, i) => ({ label: (i + 1) + '.  ' + L.title.toUpperCase() + (done[L.id] ? '   (DONE)' : ''), id: L.id }));
    BZ.lessonMenu = new E.Menu(BZ.game, items.concat(['BACK']), {
      x: 'center', y: BZ.game.H * .3, title: 'SPRING TRAINING',
      onPick: (i) => { if (i >= BZ.LESSONS.length) BZ.game.go('title'); else BZ.game.go('lesson', { id: BZ.LESSONS[i].id }); },
      onCancel: () => BZ.game.go('title')
    });
  },
  exit() { BZ.playSong(null); },
  update(dt) { BZ.lessonMenu.update(dt); },
  draw(r) {
    r.sky(['#2a5a9a', '#f0b080']);
    BZ.lessonMenu.draw(r);
    r.overlay(g => BZ.text(g, BZ.prompt('confirm', 'START') + '     ' + BZ.prompt('cancel', 'BACK'), r.W / 2, r.H * .9, '#ffffff', { align: 'center', scale: 1.6 }));
  }
};

// A lesson: its pages, then the match.
BZ.lessonScene = {
  enter(data) {
    const L = BZ.LESSONS.find(x => x.id === data.id);
    BZ.lesson = L;
    BZ.talk = BZ.talkFor(BZ.game);
    BZ.lessonPage = 0;
    BZ.talk.say(L.pages, { name: L.title.toUpperCase(), modal: true, onDone: () => BZ.startLesson(L) });
  },
  exit() {},
  update(dt) { BZ.talk.update(dt); },
  draw(r) {
    r.sky(['#2a5a9a', '#f0b080']);
    r.overlay(g => BZ.text(g, BZ.lesson.title.toUpperCase(), r.W / 2, r.H * .12, '#ffe6a0', { align: 'center', scale: 2 }));
    BZ.talk.draw(r);
  }
};

// The drill's match: one inning, the lesson's controls, and the drill's counter.
BZ.startLesson = L => {
  const setup = BZ.LESSON_SETUP[L.id];
  BZ.lessonId = L.id;
  BZ.startMatch(BZ.game, {
    innings: 1, p1: setup.p1, human: setup.human,
    drill: { kind: setup.drill, goal: L.goal }, lesson: L.id, seed: 9001 + L.id.length
  });
  if (setup.meterStart) BZ.meter[setup.p1] = setup.meterStart;
};

// The drill's outcome, saved: a lesson done is kept, and the list shows it.
BZ.lessonResult = M => {
  if (!M || !M.drill || !M.opts.lesson) return null;
  const done = M.drill.got >= M.drill.goal;
  if (done) E.store.set('batz-lessons', Object.assign(E.store.get('batz-lessons', {}), { [M.opts.lesson]: true }));
  return done;
};
