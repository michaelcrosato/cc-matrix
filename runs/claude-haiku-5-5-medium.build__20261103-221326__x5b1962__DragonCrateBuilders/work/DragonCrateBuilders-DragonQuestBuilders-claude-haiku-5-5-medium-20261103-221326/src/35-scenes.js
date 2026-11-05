// The scenes: title, the intro, play, attract (the AI plays), the Quilting Bee round (a timed score, playable solo or in an
// AI Hub session), Dev Tools, About & Credits, and the chapter's end. Plus the dialog pump and the touch-only notice.
(() => {
const E = My3D2dge, DQ = globalThis.DQ;
let game = null;

// ---- sound: presets for the effects, and the audio wrapper the systems call ----------------------------------------------
DQ.audio = {
  sfx(name, vol = 1) { if (game) game.audio.sfx(name, { vol }); },
  music(key) { if (game && DQ.SONGS[key]) game.audio.music(DQ.SONGS[key]); },
};
DQ.defineSounds = g => {
  g.audio.define('rrip', { wave: 'noise', dur: 0.2, vol: 0.32, vary: 0.2 });
  g.audio.define('rip', { wave: 'noise', dur: 0.05, vol: 0.12 });
  g.audio.define('stitch', { wave: 'square', freq: 880, to: 1320, dur: 0.08, vol: 0.2 });
  g.audio.define('craft', { wave: 'triangle', freq: 523, to: 784, arp: [0, 4, 7], step: 0.06, dur: 0.2, vol: 0.2 });
  g.audio.define('hurt', { wave: 'saw', freq: 240, to: 90, dur: 0.25, vol: 0.3 });
  g.audio.define('defeat', { wave: 'square', freq: 660, to: 220, dur: 0.3, vol: 0.2 });
  for (const k of Object.keys(DQ.VOICES)) g.audio.define('voice_' + k, DQ.VOICES[k]);
};
// which voice a speaker has: the names they're called by in the dialog box
DQ.voiceFor = name => {
  if (!name) return 'voice_builder';
  if (/GRANNY/.test(name)) return 'voice_granny';
  const n = DQ.NPCS.find(p => p.name.toUpperCase() === name);
  return 'voice_' + (n ? n.voice : 'mid');
};

// ---- the dialog: one talk box, a queue of speeches, pumped each step ---------------------------------------------------
DQ.talkStep = dt => {
  const S = DQ.session; if (!S || !S.talk) return false;
  if (!S.talk.open && S.queue.length) {
    const q = S.queue.shift();
    S.talk.voice = null;
    S.talk.onLetter = DQ.animalese(q.o.name);
    S.talk.say(q.lines, { name: q.o.name, portrait: q.o.portrait, onDone: () => {} });
  }
  if (S.talk.open) { S.talk.update(dt); return true; }
  return false;
};
DQ.talkDraw = r => { const S = DQ.session; if (S && S.talk && S.talk.open) S.talk.draw(r); };

// ---- a session: the Play, the talk box, the queued speeches, and the flags of the chapter ---------------------------------
DQ.newSession = (opts = {}) => {
  const play = new DQ.Play({ stream: opts.stream || 'main', bee: opts.bee });
  play.game = game; DQ.game = game;
  const talk = new E.Dialog(game, { speed: 46, voice: 'voice_builder', bg: '#14122a', border: '#d9b77c', nameColor: '#ffe27a' });
  return { play, talk, queue: [], mode: opts.mode || 'story' };
};

// the play's own speeches go to the session's queue
const wirePlay = S => {
  const p = S.play;
  p.say = (lines, o) => {
    S.queue.push({ lines, o: o || {} });
    if (DQ.net && DQ.net.host && DQ.net.on) DQ.net.outSay.push({ lines, name: (o && o.name) || null });
  };
  p.onCraft = () => { DQ.modal = DQ.openCraft(p, game, () => { DQ.modal = null; }); };
};

// ---- the Quilting Bee: a timed round, scored, reported to AI Hub when there is one ---------------------------------------
DQ.beeScore = p => Math.round(p.stats.broken + p.stats.kills * 5 + p.cheer * 2 + p.stats.rooms * 10 + p.townLevel * 20 + p.stats.crafted * 2);
DQ.BEE_SECONDS = 180;

// ---- the scenes ---------------------------------------------------------------------------------------------------------
DQ.scenes = () => {
  const title = {
    enter() { DQ.idle = 0; DQ.titleMenu = null; DQ.titleItems = null; DQ.buildTitle(); },
    update(dt) {
      const I = game.input;
      if (I.anyPressed && I.anyPressed()) DQ.idle = 0; else DQ.idle += dt;
      if (DQ.idle > 10 && !DQ.touchOnly) { game.go('attract'); return; }
      if (DQ.titleMenu) DQ.titleMenu.update(dt);
    },
    draw(r) {
      r.sky(['#2a1d5a', '#6c4a9e']);
      const m = Math.round(r.H / 2);
      r.overlay(g => {
        E.font.title(g, DQ.TITLE.toUpperCase(), r.W / 2, m - 74, { scale: 3, align: 'center', colors: ['#ffe27a', '#ffb3d9'], depth: 2, depthColor: '#2a1d5a' });
        E.font.text(g, 'Stitch the realm back together', r.W / 2, m - 36, '#e8e4ff', { align: 'center', shadow: '#000' });
      });
      if (DQ.touchOnly) {
        r.text('CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H - 40, '#ffe27a', { align: 'center', shadow: '#000' });
        r.text('Open OPTIONS above, or plug in a controller.', r.W / 2, r.H - 28, '#e8e4ff', { align: 'center', shadow: '#000' });
      }
      if (DQ.titleMenu) DQ.titleMenu.draw(r);
      r.text('v' + DQ.VERSION + '  ·  ' + (globalThis.AIHub && AIHub.active ? 'AI Hub session' : 'Solo'), 6, r.H - 10, '#9c96c4', { shadow: '#000', font: 'tiny' });
    },
  };

  const intro = {
    enter() { DQ.newGameIntro = true; },
    update(dt) { if (DQ.talkStep(dt)) return; if (!DQ.session || !DQ.session.queue.length) game.go('play', { fresh: false }); },
    draw(r) { r.sky(['#1a1438', '#3a2870']); DQ.talkDraw(r); },
  };

  const play = {
    pausable: true,
    enter(data) {
      game.lights.enabled = true;
      if (!DQ.session || (data && data.fresh)) {
        DQ.session = DQ.newSession();
        wirePlay(DQ.session);
        DQ.session.queue.push({ lines: ['Oh! You\'re awake, my dear Builder. The Knack went out of the world with Frayvern, and the patchwork came unpicked.', 'Break a block, mend a patch. Each one you make is a little of the world coming back.', 'Go on, then. I\'ll be right here, stitching.'], o: { name: 'GRANNY GOSSAMER' } });
      }
      DQ.session.play.game = game;
      DQ.game = game;
      DQ.modal = null;
    },
    update(dt) {
      const I = game.input, S = DQ.session, p = S.play;
      if (DQ.talkStep(dt)) return;
      if (DQ.modal) { DQ.modal.update(dt); return; }
      if (I.pressed('satchel')) { DQ.modal = DQ.openSatchel(p, game, () => { DQ.modal = null; }); return; }
      p.update(dt, I);
      // the camera follows the Builder; the turn keys swing it a quarter round
      const b = p.builder;
      game.focus(b.x, b.y, b.z + 8);
      if (I.pressed('turnL')) game.rotateView(-90);
      if (I.pressed('turnR')) game.rotateView(90);
      if (I.pressed('view') && game.nextView) game.nextView();
      // the light: a dusk over the meadow, and a bright day
      game.lights.enabled = true;
      game.lights.ambient = p.isNight ? 0.42 : p.hour < 8 || p.hour > 17 ? 0.7 : 0.95;
      if (p.chapterClear && !S.cleared) { S.cleared = true; game.go('end'); }
    },
    draw(r) { DQ.drawPlay(r); if (DQ.modal && DQ.modal.draw) DQ.modal.draw(r); DQ.talkDraw(r); },
    exit() { if (DQ.session) DQ.session.talk && DQ.session.talk.close && DQ.session.talk.close(); },
  };

  const attract = {
    enter() {
      const S = DQ.newSession({ stream: 'attract' });
      S.play.attract = true; DQ.attractSession = S; DQ.session = S;
      S.play.onCraft = () => {};
      // the cheat: the attract demo can't be beaten, and it keeps its Builder on its feet
      game.lights.enabled = true;
      DQ.attractT = 0;
    },
    update(dt) {
      const I = game.input, S = DQ.session, p = S.play;
      if (I.anyPressed && I.anyPressed()) { game.go('title'); return; }
      DQ.attractT += dt;
      if (p.dead) p.respawn();
      p.builder.hp = p.builder.maxHp; p.builder.belly = 100;
      // the AI: walk, mine and swing, place a block, sleep at night when near a bed (the Builder is cheated)
      const b = p.builder, ai = p.ai || (p.ai = { turn: 0, place: 0 });
      ai.turn -= dt;
      if (ai.turn <= 0) { ai.turn = 1.5 + Math.random() * 2; b.facing += (Math.random() - 0.5) * 2.6; }
      const near = p.monsters.find(m => !m.dead && Math.hypot(m.x - b.x, m.y - b.y) < 22 * DQ.T);
      if (near) b.facing = Math.atan2(near.y - b.y, near.x - b.x);
      const fake = {
        move: () => [Math.cos(b.facing) * 0.9, Math.sin(b.facing) * 0.9],
        pressed: name => name === 'attack' ? (DQ.attractT % 0.9 < dt) : name === 'jump' ? (Math.random() < 0.01) : name === 'place' ? (DQ.attractT % 4 < dt) : false,
        down: () => false, lastDevice: 'keyboard', label: () => '', anyPressed: () => false, repeat: () => false,
      };
      p.update(dt, fake);
      game.focus(b.x, b.y, b.z + 8);
      game.lights.ambient = p.isNight ? 0.42 : 0.9;
    },
    draw(r) {
      DQ.drawPlay(r, true);
      r.overlay(g => {
        E.font.title(g, DQ.TITLE.toUpperCase(), r.W / 2, 22, { scale: 2, align: 'center', colors: ['#ffe27a', '#ffb3d9'] });
        E.font.text(g, 'DEMO · PRESS ANY BUTTON TO PLAY', r.W / 2, r.H - 20, '#ffe27a', { align: 'center', shadow: '#000' });
      });
    },
    exit() { DQ.attractSession = null; },
  };

  const dev = {
    update(dt) {
      const I = game.input, S = DQ.session; if (!S) { game.go('title'); return; }
      DQ.devUpdate(I, S.play);
      if (I.pressed('cancel')) game.go('play', { fresh: false });
    },
    draw(r) { DQ.drawPlay(r); DQ.devDraw(r, DQ.session && DQ.session.play); },
  };

  const about = {
    enter(data) { DQ.aboutFrom = data && data.from ? data.from : 'title'; DQ.aboutPage = 0; },
    update(dt) {
      const I = game.input;
      if (I.pressed('confirm') || I.pressed('cancel')) { if (DQ.aboutFrom === 'play') game.go('play', { fresh: false }); else game.go('title'); }
      if (I.pressed('right') || I.pressed('down')) DQ.aboutPage = Math.min(DQ.REPORT_PAGES.length - 1, DQ.aboutPage + 1);
      if (I.pressed('left') || I.pressed('up')) DQ.aboutPage = Math.max(0, DQ.aboutPage - 1);
    },
    draw(r) {
      r.sky(['#14122a', '#2a1d5a']);
      DQ.drawAbout(r);
    },
  };

  const end = {
    enter() { DQ.endT = 0; },
    update(dt) {
      DQ.endT += dt;
      const I = game.input;
      if (DQ.endT > 1 && (I.pressed('confirm') || I.pressed('cancel'))) game.go('play', { fresh: false });
    },
    draw(r) {
      r.sky(['#2a2a1a', '#6a5a2a']);
      const p = DQ.session && DQ.session.play;
      r.overlay(g => {
        E.font.title(g, 'CHAPTER ONE DONE', r.W / 2, r.H / 2 - 60, { scale: 2, align: 'center', colors: ['#ffe27a', '#ffb3d9'] });
        E.font.text(g, 'Gnarlgrim is unpicked. The realm is stitching itself back together.', r.W / 2, r.H / 2 - 26, '#ffffff', { align: 'center', shadow: '#000' });
        if (p) E.font.text(g, 'Blocks mended ' + p.stats.broken + '   Monsters ' + p.stats.kills + '   Cheer ' + Math.floor(p.cheer) + '   Town level ' + p.townLevel, r.W / 2, r.H / 2 - 4, '#e8e4ff', { align: 'center', shadow: '#000' });
        E.font.text(g, 'Free play goes on. Press ' + DQ.glyph('attack') + ' to keep building.', r.W / 2, r.H / 2 + 22, '#c8c2e6', { align: 'center', shadow: '#000' });
      });
    },
  };

  const bee = {
    enter() {
      DQ.bee = { t: 0, phase: 'wait', score: 0, reported: false, timeUp: false, lastSec: -1 };
      DQ.session = null;
      DQ.beeConnect();
    },
    update(dt) {
      const I = game.input, B = DQ.bee, hub = AIHub_active(), N = DQ.net;
      if (!B) return;
      if (B.phase === 'wait') { if (B.go || (!hub && I.pressed('confirm'))) DQ.beeStart(); return; }
      if (B.phase === 'play') {
        if (hub && AIHub.time() < 0) return;                 // the hub's countdown
        const p = DQ.session.play;
        DQ.talkStep(dt);
        if (DQ.modal) DQ.modal.update(dt);
        if (N.client) N.clientStep(dt, p, I);                // a client shows the host's town
        else { p.update(dt, I); N.hostStep(dt, p); }         // solo, or the host of a shared round
        B.t = hub ? Math.max(0, AIHub.time() / 1000) : B.t + dt;
        game.focus(p.builder.x, p.builder.y, p.builder.z + 8);
        B.score = hub ? (p.builder.score || 0) : DQ.beeScore(p);
        if (!hub && Math.floor(B.t) !== B.lastSec) { B.lastSec = Math.floor(B.t); DQ.beeProgress(B.score); }
        if (!N.client && (B.t >= DQ.BEE_SECONDS || B.timeUp)) { B.phase = 'done'; N.finish(p); DQ.beeFinish(); }
      }
      // in a hub session the round ends by the hub's word; solo, a press leaves for the title
      if (B.phase === 'done' && !hub && B.t > 0 && (I.pressed('confirm') || I.pressed('cancel'))) game.go('title');
    },
    draw(r) {
      const B = DQ.bee, hub = AIHub_active();
      if (DQ.session && DQ.session.play) DQ.drawPlay(r);
      if (DQ.modal && DQ.modal.draw) DQ.modal.draw(r);
      DQ.talkDraw(r);
      r.overlay(g => {
        if (hub && B.phase === 'play') {
          E.ui.box(g, 6, r.H - 52, 200, 20, { bg: '#14122a', border: '#ffe27a', alpha: 0.8 });
          const left = Math.max(0, Math.ceil(DQ.BEE_SECONDS - (B ? B.t : 0)));
          E.font.text(g, 'SHARED TOWN  ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + '  YOUR SCORE ' + (B ? B.score : 0), 12, r.H - 46, '#ffe27a', { shadow: '#000' });
        } else if (!hub) {
          E.ui.box(g, 6, r.H - 52, 180, 20, { bg: '#14122a', border: '#ffe27a', alpha: 0.8 });
          const left = Math.max(0, Math.ceil(DQ.BEE_SECONDS - (B ? B.t : 0)));
          E.font.text(g, 'QUILTING BEE  ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + '  SCORE ' + (B ? B.score : 0), 12, r.H - 46, '#ffe27a', { shadow: '#000' });
        }
        if (B && B.phase === 'wait') {
          E.ui.box(g, r.W / 2 - 150, r.H / 2 - 40, 300, 60, { bg: '#14122a', border: '#ffe27a', alpha: 0.95 });
          E.font.text(g, B.hubText || 'QUILTING BEE', r.W / 2, r.H / 2 - 30, '#ffe27a', { align: 'center', shadow: '#000', scale: 2 });
          E.font.text(g, B.hubSub || 'Press ' + DQ.glyph('confirm') + ' to start', r.W / 2, r.H / 2 - 4, '#e8e4ff', { align: 'center', shadow: '#000' });
        }
        if (B && B.phase === 'done') {
          E.ui.box(g, r.W / 2 - 150, r.H / 2 - 50, 300, 90, { bg: '#14122a', border: '#ffe27a', alpha: 0.95 });
          E.font.text(g, 'ROUND OVER', r.W / 2, r.H / 2 - 40, '#ffe27a', { align: 'center', shadow: '#000', scale: 2 });
          E.font.text(g, 'Your score ' + B.score + '. Thank you for stitching with us.', r.W / 2, r.H / 2 - 12, '#ffffff', { align: 'center', shadow: '#000' });
        }
      });
    },
  };
  return { title, intro, play, attract, dev, about, end, bee };
};
const AIHub_active = () => !!(globalThis.AIHub && AIHub.active);

// the title's menu, built from the saves and the mode
DQ.buildTitle = () => {
  const hub = AIHub_active();
  const items = [
    { label: 'NEW GAME', disabled: DQ.touchOnly },
    { label: 'CONTINUE', disabled: DQ.touchOnly || !(game.saves && game.saves.any) },
    { label: 'QUILTING BEE', disabled: DQ.touchOnly },
    { label: 'ABOUT & CREDITS' },
    { label: 'OPTIONS' },
  ];
  DQ.titleItems = items;
  DQ.titleMenu = new E.Menu(game, items, {
    x: 'center', y: 100, box: true, title: 'DRAGON CRATE BUILDERS',
    onPick(i) {
      if (items[i].disabled) return;
      if (i === 0) { DQ.session = null; game.go('intro'); }
      if (i === 1) { const s = game.saves.latest && game.saves.latest(); if (s) { DQ.loadFromSave(s); game.go('play', { fresh: false }); } }
      if (i === 2) game.go('bee');
      if (i === 3) game.go('about', { from: 'title' });
      if (i === 4) game.menu('settings');
    },
  });
};
DQ.loadFromSave = s => {
  const p = DQ.Play.restore(s.data);
  DQ.session = { play: p, talk: null, queue: [], mode: 'story' };
  DQ.session.talk = new E.Dialog(game, { speed: 46, voice: 'voice_builder', bg: '#14122a', border: '#d9b77c', nameColor: '#ffe27a' });
  wirePlay(DQ.session);
  DQ.session.play.game = game;
};
// the Quilting Bee's hub round: parallel, each copy plays its own. The hub's card shows; the round starts with 'start'.
// the round: a solo timed Bee, or a shared town over AI Hub (mode shared-world)
DQ.beeStart = () => {
  const B = DQ.bee, N = DQ.net, hub = AIHub_active();
  DQ.session = DQ.newSession({ stream: 'round', mode: 'bee' });
  wirePlay(DQ.session);
  DQ.session.queue = [];
  const p = DQ.session.play;
  B.phase = 'play'; B.t = 0; B.lastSec = -1;
  if (hub && N.on) {
    p.builder.id = N.me;
    if (N.host) N.hostStart(p, N.info);
    else if (N.pendingWorld) { N.applyWorld(p, N.pendingWorld); N.pendingWorld = null; }
  }
};
DQ.beeConnect = () => {
  const hub = globalThis.AIHub;
  if (!hub) return;
  hub.connect({ mode: 'shared-world', seats: [1, 4] }).then(info => {
    if (!info) return;
    const N = DQ.net;
    Object.assign(N, { on: true, info, me: info.me, host: !!info.isHost, server: !!info.server, client: !info.isHost });
    DQ.bee.hub = info;
    DQ.bee.hubText = 'QUILTING BEE';
    DQ.bee.hubSub = 'Waiting for the round to start';
    hub.on('message', (d, from) => N.onMessage(d, from));
    hub.on('start', () => { DQ.bee.go = true; });
    hub.on('time-up', () => { DQ.bee.timeUp = true; });
    hub.on('leave', ({ id }) => { if (DQ.session && DQ.session.play) DQ.session.play.remotes.delete(id); delete N.inbox[id]; });
    hub.on('end', () => { DQ.bee.phase = 'done'; });
    hub.ready();
  });
};
DQ.beeProgress = score => { if (globalThis.AIHub && AIHub.active) AIHub.progress({ score, label: 'Score ' + score }); };
DQ.beeFinish = () => {
  const B = DQ.bee; if (!B || B.reported) return; B.reported = true;
  if (globalThis.AIHub && AIHub.active) AIHub.result({ score: B.score, stats: { blocks: DQ.session.play.stats.broken, monsters: DQ.session.play.stats.kills } });
};

DQ.setGame = g => { game = g; DQ.game = g; };
DQ.getGame = () => game;
})();
