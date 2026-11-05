// season: the scripted playthrough of the whole game, headless, on the real screens. Boot -> title -> attract -> title
// -> menu -> SEASON: sign with a team, the prologue, every event E1..E10 through the season hub with the bot driving
// (the academy's drill bot for E1), briefings and debriefs advanced by button presses, the promotions unlocking FLARE and
// STORM, the Grand Prix's four rounds with its standings, the ending and the credits, SINGULARITY unlocked; then a quick
// race at SINGULARITY with its replay, About's five pages, and no errors throughout. The bot drives in god mode: this
// is the flow's test, not the balance's.
import { load } from '../lib/vm.mjs';
import { bot, drillBot, drive } from '../lib/bot.mjs';
export async function run(T) {
  const { SN, game } = load({ quiet: true }); await game.booted;
  const I = game.input, snap = () => game.debug.snapshot(), adv = s => game.advance(s), tap = (a, s = .25) => { I.tap(a); adv(s); };
  const dialogs = (max = 80) => { let n = 0; while (SN.story.active && n < max) { tap('confirm', .3); n++; } return n; };
  adv(1); T.check('boot -> title', snap().scene === 'title');
  adv(10.6); T.check('10 s idle -> attract', snap().scene === 'attract', snap().scene); adv(60); tap('confirm', .5); T.check('a press -> back to the title', snap().scene === 'title', snap().scene);
  tap('start', 1); T.check('title -> main menu', snap().screen === 'main', snap().screen);
  SN.cheats.god = true;
  // SEASON: sign with a team (Sora-Tek), then the prologue
  tap('confirm', .5); T.check('SEASON asks for a team first', snap().screen === 'team', snap().screen);
  tap('right'); tap('right'); tap('down'); tap('down'); tap('confirm', .5);
  T.check('the prologue plays', SN.story.active, snap()); const pages = dialogs(); T.check('the prologue has its pages', pages >= 4, pages);
  T.check('the season hub opens', snap().screen === 'season', snap().screen); T.check('signed with Sora-Tek', SN.save.data.team === 'soratek', SN.save.data.team);
  const evTile = id => SN.UI.top().items.findIndex(it => it && it.ev && it.ev.id === id);
  const results = {};
  const runEvent = (id, o = {}) => {
    const scr = SN.UI.top(); if (!scr || scr.id !== 'season') return 'not in the hub: ' + (scr && scr.id);
    const k = evTile(id); scr.focus = k; tap('confirm', .4); dialogs();
    adv(1.2); if (snap().state === 'intro') tap('confirm', .2);
    const mode = SN.SEASON.events[id].mode, b = mode === 'academy' ? drillBot(SN, game) : bot(SN, game);
    let t = 0; while (snap().scene !== 'results' && t < 700) {
      drive(game, [b], .5); t += .5;
      const R = game.debug.race();
      if (R && R.mode === 'overclock' && R.zone >= 11) R.endRun();
      if (R && R.mode === 'hotlap' && R.player.laps.length >= 2) R.endRun();
    }
    b.stop(); adv(5.2);
    const top = SN.UI.top(); results[id] = { medal: SN.save.data.medals[id] || (id === 'gp' ? SN.save.data.gp.medal : null), t };
    if (!top || top.id !== 'results') return 'no results screen';
    tap('confirm', .6); dialogs(); adv(1.2); dialogs(); adv(.6);
    return 'ok';
  };
  for (const id of ['e1', 'e2', 'e3', 'e4']) { let r, tries = 0; do { r = runEvent(id); tries++; } while (!SN.save.data.medals[id] && tries < 3 && r === 'ok'); T.check('season ' + id + ' earns a medal', !!SN.save.data.medals[id], { r, res: results[id], tries }); }
  T.check('three tier-1 medals unlock FLARE', SN.save.classUnlocked('FLARE'), SN.save.data.unlocked.classes);
  for (const id of ['e5', 'e6', 'e7', 'e8']) { let r, tries = 0; do { r = runEvent(id); tries++; } while (!SN.save.data.medals[id] && tries < 3 && r === 'ok'); T.check('season ' + id + ' earns a medal', !!SN.save.data.medals[id], { r, res: results[id], tries }); }
  T.check('three tier-2 medals unlock STORM', SN.save.classUnlocked('STORM'), SN.save.data.unlocked.classes);
  for (const id of ['e9', 'e10']) { let r, tries = 0; do { r = runEvent(id); tries++; } while (!SN.save.data.medals[id] && tries < 3 && r === 'ok'); T.check('season ' + id + ' earns a medal', !!SN.save.data.medals[id], { r, res: results[id], tries }); }
  T.check('both STORM WARNING medals open the Grand Prix', SN.save.tierOpen('t4'));
  // the Grand Prix: four rounds, standings between them, the ending and the credits
  { const scr = SN.UI.top(); scr.focus = evTile('gp'); tap('confirm', .4); dialogs(); let rounds = 0, standings = 0;
    for (let k = 0; k < 4; k++) {
      adv(1.2); if (snap().state === 'intro') tap('confirm', .2);
      const b = bot(SN, game); let t = 0; while (snap().scene !== 'results' && t < 400) { drive(game, [b], .5); t += .5; } b.stop(); adv(5.2);
      if (snap().scene === 'results') rounds++;
      tap('confirm', .6); dialogs(); adv(1); if (SN.UI.top() && SN.UI.top().id === 'gp') standings++; dialogs();
      if (k < 3) tap('confirm', .5);
    }
    T.check('the Grand Prix runs four rounds', rounds === 4, rounds); T.check('the standings show between rounds', standings >= 3, standings);
    T.check('the Grand Prix scores every pilot', Object.keys(SN.save.data.gp.points).length === 8, SN.save.data.gp.points);
    T.check('the Grand Prix ends with a medal', !!SN.save.data.gp.medal, SN.save.data.gp);
    tap('confirm', .8); dialogs(); T.check('the ending plays and the credits roll', SN.save.data.unlocked.ending && (snap().screen === 'credits' || snap().screen === 'season'), snap().screen);
    adv(60); dialogs(); T.check('SINGULARITY is unlocked', SN.save.classUnlocked('SINGULARITY'), SN.save.data.unlocked.classes); }
  // a quick race at SINGULARITY on Borealis, and its replay
  { SN.flow.start({ mode: 'race', track: 'borealis', cls: 'SINGULARITY', laps: 1, team: 'soratek', pilot: 'takahara', seed: 31 }); adv(1.2); tap('confirm', .2);
    const b = bot(SN, game); let t = 0; while (snap().scene !== 'results' && t < 300) { drive(game, [b], .5); t += .5; } b.stop();
    T.check('a SINGULARITY race finishes', snap().scene === 'results', snap()); const R = game.debug.race(); const v = SN.Replay.verify(R.recording); T.check('its replay re-sims exactly', v.ok, [v.hash, v.want]); }
  // About's five pages
  { SN.flow.toMenu(); adv(1); SN.UI.push(SN.screens.about()); adv(.3); let pages = new Set(); for (let k = 0; k < 6; k++) { pages.add(SN.UI.top().page); tap('right', .2); } T.check('About has five pages', pages.size === 5, [...pages]);
    T.check('About answers every Source Information field', SN.ABOUT.sourceRows().length === 15 && SN.ABOUT.sourceRows().every(([k, v]) => v && v.length), SN.ABOUT.sourceRows().filter(([k, v]) => !v)); }
  SN.cheats.god = false;
  T.check('no errors in the whole playthrough', game.errors.length === 0, game.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  T.check('the season saved (autosave)', !!game.saves.latest(), game.saves.list().map(s => s.empty));
}
