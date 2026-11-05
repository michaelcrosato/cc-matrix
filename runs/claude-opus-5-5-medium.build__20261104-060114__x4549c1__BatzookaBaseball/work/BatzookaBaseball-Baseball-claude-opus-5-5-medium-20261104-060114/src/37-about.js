/* ABOUT / CREDITS: pages turned by L1/R1, left/right or clicks: About, Source Information, Testing Feedback, Engine
 * Feedback, Prompt Feedback, Credits. The text lives in ABOUT_DATA (95-about-data.js), the same words as the build's
 * final report and exit-interview.json. */
const AB = { page: 0, scroll: 0 };
SCENES.about = {
  input: KEYS, camera: { zoom: false },
  enter() { AB.page = 0; AB.scroll = 0; IDLE.t = 0; music('menu'); MENUBG.park = 'kernel'; },
  update(dt) {
    commonTick(dt); if (idleTick(dt)) return game.go('attract');
    const I = game.input, n = aboutPages().length;
    if (I.pressed('right') || I.pressed('r1')) { AB.page = (AB.page + 1) % n; AB.scroll = 0; sfx('menu'); }
    if (I.pressed('left') || I.pressed('l1')) { AB.page = (AB.page + n - 1) % n; AB.scroll = 0; sfx('menu'); }
    if (I.repeat('down', .25, .08)) AB.scroll++; if (I.repeat('up', .25, .08)) AB.scroll = Math.max(0, AB.scroll - 1);
    const c = I.clicked && I.clicked(); if (c) { AB.page = (AB.page + (c[0] > game.W / 2 ? 1 : n - 1)) % n; AB.scroll = 0; }
    if (I.pressed('cancel')) { I.consumeAll(); game.go('title'); }
    if (I.pressed('confirm') && AB.page === n - 1) { I.consumeAll(); game.go('credits'); }
  },
  draw(r) {
    menuBackdrop(r, .72);
    r.overlay(g => {
      const W = r.W, H = r.H, pages = aboutPages(), [name, lines] = pages[AB.page];
      title(g, name, W / 2, 8, 2);
      text(g, '← ' + (AB.page + 1) + ' / ' + pages.length + ' →', W / 2, 28, '#a8a8c8', { align: 'center' });
      const x = 24, w = W - 48, y0 = 42, maxY = H - 34;
      panel(g, x - 8, y0 - 6, w + 16, maxY - y0 + 8);
      let y = y0, skip = AB.scroll;
      for (const L of lines) {
        const [head, body] = Array.isArray(L) ? L : [null, L];
        const wrapped = wrapText((head ? head + ': ' : '') + body, w);
        for (let i = 0; i < wrapped.length; i++) { if (skip > 0) { skip--; continue; } if (y > maxY - 10) break; text(g, wrapped[i], x, y, i === 0 && head ? '#ffe680' : '#e8e8f0'); y += 10; }
        y += 3;
      }
      if (y > maxY - 10) text(g, '↓ more', W - 30, maxY - 10, '#ffe680');
      legend(g, W, H, [[null, '←→ PAGE'], [null, '↑↓ SCROLL'], AB.page === pages.length - 1 ? ['confirm', 'ROLL CREDITS'] : null, ['cancel', 'BACK']]);
    });
  }
};
function aboutPages() {
  const D = ABOUT_DATA, si = D.sourceInformation;
  return [
    ['ABOUT', [['BATZOOKA BASEBALL', 'An original over-the-top arcade baseball game.'], ['Version', 'Game ' + BZ.version + ' · engine ' + (E.versionLabel ? E.versionLabel() : E.version)], ['Controls', D.aiHub.controls], ['Story', 'Kernel Field is about to become a parking lot. Win the Kaboom Cup on a barnstorming tour of the wildest parks in baseball, swinging Grandma Delgado\'s rocket-powered bat.']]],
    ['SOURCE INFORMATION', [['Date', si.date], ['Source', si.source], ['Plan', si.plan], ['Genre', si.genre], ['Perspective', si.perspective], ['Tech', si.tech], ['Art Direction', si.artDirection], ['Animation', si.animation], ['Audio', si.audio], ['Online', si.online], ['Testing', si.testing], ['Research', si.research], ['Environment', si.environment], ['Model', si.model], ['Usage', si.usage]]],
    ['TESTING FEEDBACK', D.testingFeedback.map((a, i) => [['Issues caught', 'Critical issues', 'Most helpful test', 'Least helpful test'][i], a])],
    ['ENGINE FEEDBACK', D.engineFeedback.map((a, i) => [['Liked most', 'Stuck or guessed wrong', 'Built myself', 'Hardest part', 'Engine changes', 'One change'][i], a])],
    ['PROMPT FEEDBACK', D.promptFeedback.map((a, i) => [['Liked most', 'Confusing', 'Hardest', 'Would change'][i], a])],
    ['CREDITS', [['Design, code, art, music and writing', 'Claude (claude-opus-5-5, Anthropic), building from PLAN.md'], ['Engine', 'my-3D2dge v0.85.2 (MIT), github.com/michaelcrosato/my-3d2dge'], ['Online', 'AI Hub Session client 1.4.0 (michaelcrosato/ai-hub)'], ['Sound', 'Every sound, song and voice synthesized in code: no audio files'], ['Thanks', 'Thanks for playing!']]]
  ];
}

/* ---- the animation gallery (dev WARP): every baseball motion on rigs, in turn, at normal speed or slowed ---- */
const GAL = { t: 0, slow: false, rigs: null };
SCENES.gallery = {
  input: KEYS, view: 'brawler', camera: { zoom: false },
  enter() { GAL.t = 0; music('training'); const p = TEAMS.COM.roster; GAL.rigs = [['SWING', makeRig(p[0], 'bat')], ['BUNT', makeRig(p[1], 'bat')], ['PITCH', makeRig(p[8], 'field')], ['THROW', makeRig(p[4], 'field')], ['CATCHER', makeRig(p[5], 'catch')], ['DIVE', makeRig(p[2], 'field')], ['SLIDE', makeRig(p[6], 'run')], ['CLIMB', makeRig(p[7], 'field')], ['PUNCH', makeRig(p[3], 'brawl')], ['CHEER', makeRig(TEAMS.HCK.roster[0], 'field')], ['UMPIRE', castRig('ump')]]; },
  update(dt) {
    commonTick(dt); const I = game.input; if (I.pressed('south') || I.pressed('confirm')) GAL.slow = !GAL.slow; if (I.pressed('cancel')) { I.consumeAll(); return game.go('title'); }
    const d = dt * (GAL.slow ? .25 : 1); GAL.t += d; const u = (GAL.t % 1.6) / 1.6;
    const ph = (spec, a, b) => u < a ? { spec, phase: 'wind', u: u / a } : u < b ? { spec, phase: 'active', u: (u - a) / (b - a) } : { spec, phase: 'recover', u: Math.min(1, (u - b) / (1 - b)) };
    GAL.rigs.forEach(([n, rig], i) => {
      const st = { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 };
      if (n === 'SWING') st.attack = ph(SWING_SPEC, .35, .5);
      if (n === 'BUNT') st.attack = { spec: BUNT_SPEC, phase: 'active', u: 1 };
      if (n === 'PITCH') st.attack = ph(PITCH_SPEC, .55, .65);
      if (n === 'THROW') st.attack = ph(THROW_SPEC, .4, .55);
      if (n === 'CATCHER') st.pose = 'crouch';
      if (n === 'DIVE') st.down = u < .3 ? 0 : Math.min(.8, (u - .3) * 3);
      if (n === 'SLIDE') { st.down = u > .2 && u < .7 ? .7 : 0; st.vx = 80; }
      if (n === 'CLIMB') { st.climb = true; st.vz = 40; st.z = 0; }
      if (n === 'PUNCH') st.attack = ph(E.MOVES.cross || E.MOVES.jab, .3, .45);
      if (n === 'CHEER') st.pose = 'cheer';
      if (n === 'UMPIRE') { st.attack = ph(E.MOVES.cross, .3, .4); st.expr = 'shout'; }
      rig.update(d, st);
    });
  },
  draw(r) {
    r.sky(['#1a3060', '#3a6aa0', '#7aa8e0']);
    r.overlay(g => {
      const W = r.W, H = r.H; title(g, 'ANIMATION GALLERY', W / 2, 8, 2);
      GAL.rigs.forEach(([n, rig], i) => { const col = i % 6, row = Math.floor(i / 6), x = 30 + col * ((W - 60) / 5), y = 110 + row * 90; px.rect(g, x - 24, y, 48, 3, '#3a6a3a'); try { rig.draw(g, Math.round(x), y, E.VIEWS.brawler); } catch (e) { /* first frame */ } text(g, n, x, y + 8, '#ffffff', { align: 'center' }); });
      legend(g, W, H, [['south', GAL.slow ? 'NORMAL SPEED' : 'SLOW x0.25'], ['cancel', 'BACK']]);
    });
  }
};
