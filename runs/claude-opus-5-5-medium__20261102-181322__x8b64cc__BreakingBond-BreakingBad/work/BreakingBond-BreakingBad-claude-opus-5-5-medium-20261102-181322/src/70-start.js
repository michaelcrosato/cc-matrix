/* =====================================================================================
 * 70 START — the About / Credits text (also in the run's chat reply), the scenes, the AI Hub connection, the boot.
 * ===================================================================================== */
const ABOUT_SRC = [
  '# BREAKING BOND',
  'Episode One: Pilot Light. A spiritual successor to Breaking Bad (2008-2013).',
  'An original story and cast. Not affiliated with the show or its makers.',
  '',
  ...ABOUT_INFO
];
const ABOUT_TEXT = [];
for (const l of ABOUT_SRC) { if (l.startsWith('# ') || !l) ABOUT_TEXT.push(l); else for (const w of wrapText(l, 62)) ABOUT_TEXT.push(w); }

// text the pixel font can draw: dashes, quotes and accents brought down to ASCII
const clean = s => String(s).replace(/[—–]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/¡/g, '').replace(/[é]/g, 'e').replace(/[ñ]/g, 'n').replace(/…/g, '...');
const _say = M.say; M.say = (who, lines, o) => _say(who, (Array.isArray(lines) ? lines : [lines]).map(clean), o && o.choices ? Object.assign({}, o, { choices: o.choices.map(clean) }) : o);
const _bark = bark; bark = (who, line) => _bark(who, clean(line));
for (const ch of CHAPTERS) ch.cold = ch.cold.map(clean);
const _cb = caughtBy; caughtBy = g => { if (M.cookObj) return; _cb(g); };

const hubWait = {
  enter() { },
  update() { },
  draw(r) { r.sky(['#0c0a08', '#1a140e']); r.overlay(g => { E.font.title(g, 'BREAKING BOND', r.W / 2, r.H / 2 - 24, { scale: 2, align: 'center', colors: ['#ffffff', '#cfe8c0'] }); E.font.text(g, 'COOK-OFF  •  joining the round...', r.W / 2, r.H / 2 + 4, '#e8c890', { align: 'center' }); }); }
};
const scenes = { title: titleScene, chapters: chaptersScene, card: cardScene, play: playScene, results: resultsScene, lab: labScene, over: overScene, ending: endingScene, about: aboutScene, cookoff: cookoffScene, hubwait: hubWait };

// the hub's round: ghost mode, 1-4 players, straight into the Cook-Off
const _coEnter = cookoffScene.enter;
cookoffScene.enter = function (d) { _coEnter.call(this, d); if (HUB && HUBSTATE.info && !HUBSTATE.readied) { HUBSTATE.readied = true; try { window.AIHub.ready(); } catch (e) { } } };
function hubConnect() {
  window.AIHub.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    if (!info) { game.go('title', null, { fade: 0 }); return; }
    HUBSTATE.info = info;
    window.AIHub.on('message', hubGhost);
    window.AIHub.on('leave', e => { if (W && W.ghosts && e) delete W.ghosts[e.id]; });
    window.AIHub.on('time-up', () => { if (co && !co.over) endCookoff(); else report(true); });
    window.AIHub.on('end', () => { HUBSTATE.ended = true; music(null); try { A.mute(true); } catch (e) { } game.input.clear(); ui.hud({}); });
    game.go('cookoff', {}, { fade: 0 });
  }).catch(() => game.go('title', null, { fade: 0 }));
}

game.debug = {
  snapshot: () => ({ scene: game.sceneName, chapter: M.mission ? M.mission.id : null, beat: M.beat, hero: W && W.hero ? [Math.round(W.hero.x), Math.round(W.hero.y), W.hero.hp] : null, enemies: W ? W.enemies.filter(e => !e.dead).length : 0, heat: W ? Math.round(W.heat * 100) / 100 : 0, cash: STATE.cash, cooking: !!M.cookObj, talk: talk.open, attract: W ? W.attract : false, objective: W && W.objective ? W.objective.title : null }),
  teleport(x, y) { if (W && W.hero) { W.hero.x = x; W.hero.y = y; } },
  go: (scene, data) => game.go(scene, data, { fade: 0 }),
  state: () => ({ W, M, STATE, CHAPTERS, talk, game })
};
window.__bb = game.debug;
window.__bbTitleItems = () => titleMenu ? titleMenu.items.map(i => typeof i === 'string' ? i : i.label) : null;

game.start({ scenes, scene: HUB ? 'hubwait' : 'title', boot: { title: 'BREAKING BOND', version: VERSION, steps: [['Cleaning the glassware', () => buildLocation('school')], ['Driving out to the flats', () => buildLocation('desert')], ['Paying off the junkyard dog', () => buildLocation('junk')], ['Printing bus bench ads', () => buildLocation('town')]], messages: ['Calibrating the burner', 'Turning the respirator the right way round', 'Checking for mustard stains'] } });
if (HUB) hubConnect();
