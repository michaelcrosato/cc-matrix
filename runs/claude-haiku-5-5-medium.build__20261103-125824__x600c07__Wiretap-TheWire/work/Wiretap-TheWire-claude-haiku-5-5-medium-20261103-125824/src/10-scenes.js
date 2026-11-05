// Scenes: the title (menus and the touch-only notice), the field, the About pages and the episode start.
let IDLE = 0;                 // seconds without input on the title or a menu (attract starts at 10)
const ATTRACT_AFTER = 10;

// Begin Episode 1 from a clean slate, through its episode card.
function startEpisode1() {
  resetState();
  game.go('field', { fresh: true });
}
function continueEpisode() {
  loadState();
  game.go('field', { fresh: false });
}
function hasSave() { const s = E.store.get(SAVE_KEY, null); return !!(s && s.beat && !s.done); }

// The title: a live view of the neighbourhood behind the menu, rain, and the menu on E.Shell.
const titleScene = {
  enter() {
    IDLE = 0;
    game.weather = { kind: 'rain', amount: .5, wind: .2 };
    game.lights.enabled = true; game.lights.ambient = .5;
    showTitle();
    game.audio.music('title');
  },
  exit() { ui.hide(); },
  update(dt) {
    const [tx, ty] = cellWorld([34, 32]);
    game.focus(tx, ty, 12);
    if (game.input.anyPressed() || (ui.screen && ui.screen !== 'title')) IDLE = 0;
    else IDLE += dt;
    if (IDLE > ATTRACT_AFTER && (!ui.screen || ui.screen === 'title')) game.go('attract');   // touch-only devices too
  },
  draw(r) {
    MAP.drawFloor(r); MAP.queueWalls(r);
    drawDressing(r, mood(STATE.clock).lamps);
  },
};

// The title's Shell screen: which actions it offers depends on the device (touch-only shows the notice).
function showTitle() {
  const touch = touchOnlyNow();
  if (touch) {
    ui.show('title', {
      name: TITLE, subtitle: 'Controller or keyboard required',
      meta: 'Connect a controller or keyboard to play. The demo will run in the meantime.',
      actions: [['Settings', () => ui.show('settings')]],
    });
    return;
  }
  const actions = [
    hasSave() && ['Continue the case', () => continueEpisode()],
    ['New case', () => { ui.show('title', { kicker: 'Episode 1', name: 'EYES ON', subtitle: EP1_EPIGRAPH, actions: [['Begin', () => startEpisode1()]] }); }],
    ['About & credits', () => openAbout(0)],
    ['Settings', () => ui.show('settings')],
  ];
  ui.show('title', { name: TITLE, subtitle: "Somebody's always listening.", actions: actions.filter(Boolean) });
}

// About & credits: pages from credits.json, one heading and text each.
function openAbout(i) {
  const pages = CREDITS.pages;
  const p = pages[i];
  ui.show('help', {
    kicker: 'About · ' + (i + 1) + ' / ' + pages.length,
    title: p.heading,
    sections: p.sections.map(s => [s[0], s[1]]),
    actions: [i > 0 && ['Previous page', () => openAbout(i - 1)], i < pages.length - 1 && ['Next page', () => openAbout(i + 1)], ['Back to the title', () => showTitle()]].filter(Boolean),
  });
}

// The field scene: Dana, the crew, the civilians, the Board and the mission's objectives.
const fieldScene = {
  pausable: true,
  enter(data) {
    ui.hide();                                          // close the title's menu: the field has its own HUD
    const fresh = !!(data && data.fresh);
    if (fresh) { resetState(); MISSION.beat = 'cold'; }
    game.weather = { kind: 'rain', amount: .5, wind: .2 };
    game.lights.enabled = true;
    setupField(fresh);
    game.cam.bounds = v => MAP.bounds(v);
    game.setZoom(1);
    game.audio.music('field');
    if (MISSION.beat === 'cold' && !STATE.tips.cold_start) {   // the cold open starts with Lou at the tape
      STATE.tips.cold_start = 1;
      game.after(.4, () => coldOpenLou());
    }
  },
  exit() { game.lights.enabled = false; game.weather = null; ui.hud({}); },
  update(dt) {
    if (TALK.update(dt)) { hudFor(null); return; }   // a dialogue box is open: the world waits
    lampsAndLights();
    fieldUpdate(dt, game.input);
    const focus = FIELD.watching ? [DANA.x + (FIELD.reticle.x - DANA.x) * .35, DANA.y + (FIELD.reticle.y - DANA.y) * .35] : [DANA.x, DANA.y];
    game.focus(focus[0], focus[1], 14);
    game.setZoom(FIELD.watching ? 1.5 : 1);
  },
  draw(r) {
    fieldDraw(r);
    TALK.draw(r);
  },
};

function lampsAndLights() {
  const m = mood(STATE.clock);
  game.lights.ambient = m.ambient;
}

// The attract reel: the field with a bot at the controls. Captions tell what the reel is showing.
const attractScene = {
  enter() {
    ui.hide();
    ATTRACT.on = true;
    ATTRACT.stashed = STATE;
    STATE = freshState();
    game.weather = { kind: 'rain', amount: .4, wind: .15 };
    game.lights.enabled = true;
    setupField(false);
    ATTRACT.start(game);
    ui.hud({});
  },
  exit() {
    ATTRACT.on = false;
    STATE = ATTRACT.stashed || STATE;
    game.lights.enabled = false; game.weather = null;
  },
  update(dt) {
    if (game.input.anyPressed()) { game.go('title'); return; }
    ATTRACT.update(dt, game);
    game.focus(DANA.x, DANA.y, 14);
    game.setZoom(FIELD.watching ? 1.5 : 1);
  },
  draw(r) {
    fieldDraw(r);
    ATTRACT.draw(r);
  },
};
