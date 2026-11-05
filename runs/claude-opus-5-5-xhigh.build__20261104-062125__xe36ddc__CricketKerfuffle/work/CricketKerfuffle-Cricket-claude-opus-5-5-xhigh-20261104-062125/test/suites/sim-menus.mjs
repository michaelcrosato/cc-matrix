import { load, until } from '../lib.mjs';
/* Every menu item in the game, pressed in a fresh game, must do something you can observe: change the scene, open a
 * menu or sub-menu, change its own value (rows with arrows), a setting, the saved story or profile, or the screen's
 * state. A row that does nothing is a stub. Menus: the title's main, story and extras menus, Quick Match and Versus
 * setup, the results screen, the story map's chapter menu, the Nets, the Showdown, and the pause menu. */
export async function run(check) {
  const fresh = () => { const env = load({ seed: 3 }); env.game.advance(.5); env.K.Tuning.persist = false; return env; };
  // what an item can change, read without advancing time (so nothing changes on its own between the two readings)
  const state = env => {
    const { game, K } = env, S = K.scenes[game.sceneName] || {}, own = {};
    for (const [k, v] of Object.entries(S)) {
      if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) own[k] = v;
      else if (v && v.constructor && v.constructor.name === 'UIList') own[k] = 'list:' + v.items.map(i => i.label).join('/') + '@' + v.i;
    }
    const settings = game.settings.keys().map(k => game.settings[k]);
    return JSON.stringify({ scene: game.sceneName, own, settings, paused: game.paused, dev: K.dev.isOpen, info: K.infoOpen, story: K.Story.data, profile: K.Profile.data });
  };
  const spy = env => { const calls = [], g = env.game; for (const fn of ['go', 'menu']) { const o = g[fn].bind(g); g[fn] = (...a) => { calls.push(fn + ':' + a[0]); return o(...a); }; } return calls; };
  const visible = list => list.items.filter(it => !(it.hidden && it.hidden()));
  let pressed = 0; const dead = [], crashed = [];
  /** press every visible row of the list reach(env) returns, each in its own fresh game */
  const sweep = (where, reach, opts = {}) => {
    const probe = fresh(), list0 = reach(probe); if (!list0) { dead.push(where + ': menu not reached'); return; }
    const labels = visible(list0).map(it => it.label);
    for (const label of labels) {
      const env = fresh(), list = reach(env), it = list && visible(list).find(x => x.label === label); if (!it) { dead.push(where + ' > ' + label + ': not found again'); continue; }
      const before = state(env), val0 = it.value ? it.value() : null, calls = spy(env);
      try {
        if (it.act && !it.disabled) it.act(); else if (it.right) it.right(); else if (it.left) it.left();
        const val1 = it.value ? it.value() : null, after = state(env);
        if (!calls.length && before === after && val0 === val1) dead.push(where + ' > ' + label);
        env.game.advance(.6); pressed++;
      } catch (e) { crashed.push(where + ' > ' + label + ': ' + e.message); }
    }
  };
  // the title's menus
  sweep('main menu', env => env.K.scenes.title.menu);
  sweep('story menu', env => { env.K.scenes.title.menu.items[0].act(); return env.K.scenes.title.sub; });
  sweep('story menu with a save', env => { env.K.Story.newGame(); env.K.Story.save(); env.K.scenes.title.menu.items[0].act(); return env.K.scenes.title.sub; });
  sweep('extras menu', env => { env.K.scenes.title.menu.items[5].act(); return env.K.scenes.title.sub; });
  // match setup, both modes
  sweep('quick match setup', env => { env.game.go('setup', { mode: 'quick' }, { fade: 0 }); env.game.advance(.2); return env.K.scenes.setup.list; });
  sweep('versus setup', env => { env.game.go('setup', { mode: 'versus' }, { fade: 0 }); env.game.advance(.2); return env.K.scenes.setup.list; });
  // the Nets and the Showdown
  sweep('nets menu', env => { env.game.go('nets', {}, { fade: 0 }); env.game.advance(.2); return env.K.scenes.nets.menu; });
  sweep('showdown menu', env => { env.game.go('showdown', {}, { fade: 0 }); env.game.advance(.2); return env.K.scenes.showdown.menu; });
  // the story map's chapter menu
  sweep('story map chapter menu', env => { env.K.Story.newGame(); env.game.go('storymap', {}, { fade: 0 }); env.game.advance(.2); const S = env.K.scenes.storymap; S.openMenu(); return S.menu; });
  // the results screen, after a real (autopilot) one-over match: Highlights, Rematch and Menu
  sweep('results', env => {
    env.D.startMatch({ overs: 1, humans: {}, cheat: { autoBat: true, autoBowl: true }, seed: 4 }); env.game.advance(.2);
    if (until(env.game, () => env.game.sceneName === 'results', 400, 1 / 30) < 0) return null;
    env.game.advance(.2); return env.K.scenes.results.list;
  });
  // the pause menu's items ([label, fn]) in a match
  { const labels = fresh().game.o.menu.items.map(i => i[0]);
    for (const label of labels) {
      const env = fresh(); env.D.startMatch({ seed: 5 }); env.game.advance(.5); env.I.press('Escape'); env.game.advance(1 / 60); env.I.release('Escape'); env.game.advance(.1);
      const before = state(env), calls = spy(env);
      try { env.game.o.menu.items.find(i => i[0] === label)[1](); const after = state(env); if (!calls.length && before === after) dead.push('pause menu > ' + label); env.game.advance(.6); pressed++; }
      catch (e) { crashed.push('pause menu > ' + label + ': ' + e.message); }
    } }
  // with only two teams unlocked (a new profile), YOUR TEAM's arrow swaps the sides instead of doing nothing
  { const env = fresh(); env.game.go('setup', { mode: 'quick' }, { fade: 0 }); env.game.advance(.2); const L = env.K.scenes.setup.list, a = L.items[0], b = L.items[1];
    const v0 = [a.value(), b.value()]; a.right(); const v1 = [a.value(), b.value()];
    check('quick match with two teams unlocked: picking the opponents\' team swaps the sides', env.K.Profile.data.unlocked.length === 2 && v1[0] === v0[1] && v1[1] === v0[0], { v0, v1 }); }
  check('every menu item was pressed (at least 40 rows across 11 menus)', pressed >= 40, pressed); if (process.env.MENU_COUNT) console.log('  pressed ' + pressed + ' rows');
  check('no menu item does nothing', !dead.length, dead);
  check('no menu item throws', !crashed.length, crashed);
}
