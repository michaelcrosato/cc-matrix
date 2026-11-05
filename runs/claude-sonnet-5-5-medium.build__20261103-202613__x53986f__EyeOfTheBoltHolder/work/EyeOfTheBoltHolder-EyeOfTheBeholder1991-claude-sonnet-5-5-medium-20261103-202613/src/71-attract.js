/* ATTRACT MODE: after 10 s idle on the title, a looping AI-played demo (the bot, with cheats). Any input exits. Never saves. */
(() => {
  const V2 = B.View;
  const DEMO = () => { B.premade(); const ms = B.PREMADE.map(p => B.makeMember(Object.assign({}, p, { lvl: 5 }))); const st = B.startGame(99, ms, 'normal'); for (const m of st.party.members) { m.book = m.cls === 'mage' ? Object.keys(B.SPELLS).filter(k => B.SPELLS[k].cls === 'mage') : m.book; if (B.casterType(m.cls)) B.autoPrep(m); } B.give('potion'); B.give('potion'); B.give('wand'); B.npcJoin('tamsin'); st.flags.joined_durgan = false; B.npcJoin('durgan'); return st; };
  /* vignettes: name, floor, at [x,y,dir], seconds, goals, setup */
  const VIG = [
    { name: 'The Drains', f: 'f1', at: [3, 11, 0], secs: 18, goals: [['useAt', 5, 10, 0], ['go', 8, 11], ['clear', 7, 11, 13, 11], ['useAt', 3, 12, 0]], setup: () => { B.F().gates.gS = false; } },
    { name: 'Latchkins', f: 'f1', at: [3, 4, 1], secs: 16, goals: [['clear', 1, 1, 8, 4]], setup: () => { B.F().gates.gP = true; UI.say(['Snick keeps the key. Mind his hat.'], { name: 'Tamsin Pell', voice: B.VOICES.tamsin, auto: 2.4, modal: false, portrait: new My3D2dge.Humanoid({ hood: true, colors: { cloth: '#3a6a3e', skin: '#d8a888' } }) }); } },
    { name: 'Stones and plates', f: 'f1', at: [3, 8, 0], secs: 14, goals: [['put', 3, 8, 0], ['go', 3, 4], ['go', 3, 7], ['go', 8, 7]], setup: () => { B.S.party.hand = B.ref('rock'); } },
    { name: 'Spellcraft', f: 'f2', at: [8, 7, 0], secs: 14, goals: [['clear', 6, 5, 10, 7]], setup: () => { B.F().doors['8,8'].open = true; B.F().doors['8,8'].locked = false; } },
    { name: 'The Party screen', f: 'f1', at: [3, 11, 0], secs: 12, goals: [], ui: true },
    { name: 'Clockwork', f: 'f2', at: [13, 3, 1], secs: 14, goals: [['clear', 13, 2, 18, 4]], setup: () => { B.F().mons.forEach(m => { if (m.type === 'sentinel') m.state = 'hunt', m.aware = true; }); } },
    { name: 'The Gauntlet', f: 'f3', at: [13, 11, 1], secs: 14, goals: [['clear', 13, 10, 18, 11]] },
    { name: 'The Bolt-Holder', f: 'f4', at: [6, 9, 0], secs: 24, goals: [['useAt', 1, 5, 3], ['useAt', 11, 5, 1], ['useAt', 4, 2, 0], ['boss']], setup: () => { B.S.boss.awake = true; } },
    { name: 'Title', f: 'f1', at: [3, 12, 0], secs: 5, goals: [], title: true }
  ];
  const AT = { vi: 0, t: 0, ui: 0, noteT: 0 }; B.AT = AT;
  B.scenes.attract = {
    view: 'iso', input: UI.INPUT(),
    enter() {
      UI.attract = true; UI.screen = null; UI.logs = []; UI.dlg.close && UI.dlg.close(); game.timeScale = 1; AT.vi = -1; AT.exitT = .4; B.CHEATS.god = true; B.CHEATS.spells = true; B.CHEATS.nohunger = true; B.CHEATS.nocool = false; DEMO(); B.opt.hints = false; B.attractNext();
    },
    exit() { B.CHEATS.god = false; B.CHEATS.spells = false; B.CHEATS.nohunger = false; B.Bot.stop(); UI.attract = false; B.opt.hints = game.settings.hints !== false; if (UI.screen) UI.close(); UI.dlg.close && UI.dlg.close(); },
    update(dt) {
      const inp = game.input; AT.exitT -= dt; AT.t += dt;
      if (AT.exitT < 0) { const anyIn = inp.anyPressed() || (inp.held && inp.held.size > 0) || (inp.padAxes || []).some(a => Math.abs(a) > .3) || UI.pointerMoved(); if (anyIn) { inp.consumeAll(); game.go('title'); return; } }
      const S = B.S; try {
        if (UI.dlg.open) { UI.dlg.update(dt); B.babble.track(UI.dlg, UI.dlg.voiceProf || B.VOICES.tamsin); }
        const v = VIG[AT.vi]; if (v && v.ui) B.attractUi(dt);
        B.Bot.step(dt); B.update(dt); UI.pump(); B.Music.update(dt, UI.engaged()); V2.update(dt); UI.updateHud(dt);
        AT.vt += dt; if (AT.vt > v.secs || S.over || (!B.Bot.active && !v.ui && !v.title && AT.vt > 4 && !UI.engaged())) B.attractNext();
      } catch (e) { game.fail('attract', e); B.attractNext(); }
    },
    draw(r) {
      if (V2.cur) V2.cur.draw(r);
      r.overlay(g => {
        UI.hud(g, r); if (UI.screen) UI.screen.draw(g, r); if (UI.dlg.open) UI.dlg.draw(r); const cx = Math.round(r.W / 2), v = VIG[AT.vi] || VIG[0];
        UI.panel(g, 4, 22, 54, 16); UI.text(g, 'DEMO', 31, 26, '#ff9a7a', { align: 'center' });
        if (Math.floor(game.real * 1.6) % 2 === 0 || v.title) { const lab = game.input.lastDevice === 'gamepad' ? 'a button' : 'any key'; UI.text(g, 'Press ' + lab, cx, r.H - 56, UI.PAL.focus, { align: 'center', shadow: '#000' }); }
        if (v.title) { UI.veil(g, r, .4); UI.title(g, 'EYE OF THE', cx, 40, { scale: 2 }); UI.title(g, 'BOLT-HOLDER', cx, 62, { scale: 4 }); UI.text(g, B.TAGLINE, cx, 104, '#ffd8a0', { align: 'center' }); }
        UI.text(g, v.name, r.W - 6, 22, UI.PAL.dim, { align: 'right', font: 'tiny' });
      });
    }
  };
  B.attractNext = () => {
    AT.vi = (AT.vi + 1) % VIG.length; AT.vt = 0; const v = VIG[AT.vi], S = B.S; B.Bot.stop(); if (UI.screen) UI.close(); UI.dlg.close && UI.dlg.close(); S.over = false; for (const m of S.party.members) if (m.state !== 'ok') { m.state = 'ok'; m.hp = m.max; } S.camp = null;
    S.floors[v.f] = B.initFloor(v.f); S.floors[v.f].visited = true; if (v.f === 'f4') { S.boss = null; } B.warp(v.f, v.at[0], v.at[1], v.at[2]); B.CHEATS.god = true; B.CHEATS.spells = true;
    if (v.f !== 'f4') S.boss = S.boss; if (v.setup) v.setup(); V2.enter(v.f); S.events.length = 0; UI.floorToast = null;
    B.Music.cur = null; B.Music.play(B.FLOORS[v.f].song);
    if (v.goals && v.goals.length) { B.WALK.__attract = v.goals; B.Bot.start({ cheats: true }); B.Bot.goals = v.goals.map(g => g.slice()); B.Bot.gi = 0; B.Bot.floor = S.floor; }
    AT.ui = 0;
  };
  /** the Party screen vignette: open, move the focus, equip, open the map, close */
  B.attractUi = (dt) => {
    AT.ui += dt; const t = AT.ui;
    if (t > 1 && !AT.o1) { AT.o1 = 1; UI.open('party'); } if (UI.screen && UI.screen.id === 'party') { const F = UI.screen.F; if (t > 2.2 && !AT.o2) { AT.o2 = 1; F.set('p:0'); } if (t > 3.2 && !AT.o3) { AT.o3 = 1; F.set('s:main'); } if (t > 4.2 && !AT.o4) { AT.o4 = 1; F.set('t:2'); UI.screen.m = 2; } if (t > 5.2 && !AT.o5) { AT.o5 = 1; UI.close(); UI.open('map'); } }
    if (t > 8 && !AT.o6) { AT.o6 = 1; if (UI.screen) UI.close(); }
    if (t < .1) { AT.o1 = AT.o2 = AT.o3 = AT.o4 = AT.o5 = AT.o6 = 0; }
  };
})();
