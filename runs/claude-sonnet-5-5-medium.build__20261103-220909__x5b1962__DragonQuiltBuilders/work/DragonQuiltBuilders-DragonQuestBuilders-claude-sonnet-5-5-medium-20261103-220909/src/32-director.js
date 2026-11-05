// Dialog, cutscenes, siege director, daily events.
(() => {
const { E, T } = DQ;
const ev = DQ.events;
const A = () => DQ.audio;
const cellC = c => c * T + 8;

// ---------- dialog (Dragon Quest-style box, Animalese voices) ----------
const VOICES = {
  granny: DQ.GRANNY.voice, gnarlgrim: { pitch: 70, speed: .8, color: '#ff8a8a' }, buttons: { pitch: 110, speed: 1, color: '#ffe080' }, narrator: { pitch: 170, speed: 1, color: '#fff' },
  hero: { pitch: 190, speed: 1, color: '#fff' }
};
for (const k of Object.keys(DQ.NPCS)) VOICES[k] = DQ.NPCS[k].voice;
DQ.VOICES = VOICES;
const portraitFor = who => {
  const S = DQ.S;
  if (who === 'granny') return (g, x, y, sz) => { const px = E.px, c = x + sz / 2, cy2 = y + sz / 2, t = DQ.game.time; px.disc(g, c, cy2, sz * .42 + Math.sin(t * 3) * 1, '#6a4a10'); px.disc(g, c, cy2, sz * .36, '#ffd36a'); px.disc(g, c, cy2, sz * .22, '#fff3b8'); px.line(g, c - sz * .4, cy2 - sz * .1, c + sz * .4, cy2 + sz * .1, '#c88a2a', 1); px.line(g, c - sz * .4, cy2 + sz * .1, c + sz * .4, cy2 - sz * .1, '#c88a2a', 1); for (let i = 0; i < 5; i++) px.dot(g, Math.round(c + Math.cos(t * 2 + i * 1.3) * sz * .46), Math.round(cy2 + Math.sin(t * 2 + i * 1.3) * sz * .46), '#fff8d0'); };
  const def = DQ.NPCS[who];
  if (def) { const r = S && S.residents.find(r => r.id === who); if (def.blob) return (g, x, y, sz) => { const px = E.px, c = x + sz / 2, cy2 = y + sz * .55; px.disc(g, c, cy2, sz * .38, def.look.colors.base); px.disc(g, c - sz * .12, cy2 - 2, 2, '#222'); px.disc(g, c + sz * .12, cy2 - 2, 2, '#222'); px.rect(g, c - 2, cy2 + 4, 4, 1, '#d070a0'); px.rect(g, c - sz * .3, y + 2, 4, sz * .3, def.look.colors.base); px.rect(g, c + sz * .2, y + 2, 4, sz * .3, def.look.colors.base); };
    return r ? r.rig : (DQ._portraits = DQ._portraits || {})[who] || ((DQ._portraits[who] = new E.Humanoid(def.look))); }
  if (who === 'buttons' || who === 'gnarlgrim') return (g, x, y, sz) => { const px = E.px, c = x + sz / 2, cy2 = y + sz / 2, col = who === 'buttons' ? '#d8b04a' : '#4a3a6a'; px.disc(g, c, cy2, sz * .42, col); px.disc(g, c - sz * .14, cy2 - 2, 3, who === 'buttons' ? '#222' : '#ff5a5a'); px.disc(g, c + sz * .14, cy2 - 2, 3, who === 'buttons' ? '#222' : '#ff5a5a'); if (who === 'buttons') { px.disc(g, c, cy2 + 6, 1, '#222'); px.disc(g, c - 4, cy2 + 6, 1, '#222'); px.disc(g, c + 4, cy2 + 6, 1, '#222'); } else px.rect(g, c - sz * .2, cy2 + 5, sz * .4, 2, '#1a0a20'); };
  return null;
};
DQ.initDialog = function (game) {
  const talk = DQ.talk = new E.Dialog(game, { speed: 42, lines: 3, bg: '#1b1840', border: '#f3e9c8', color: '#fff', nameColor: '#ffd36a', voice: null });
  talk.onLetter = (ch) => { if (DQ.audio && DQ.curVoice) DQ.audio.voiceLetter(DQ.curVoice, ch); };
  return talk;
};
// say(who, lines, {choices,onChoice,onDone})
DQ.say = function (who, lines, o = {}) {
  const talk = DQ.talk, S = DQ.S; if (!talk) return;
  if (S && S.cut && S.cut.skip) { if (o.onDone) o.onDone(); return; }
  const def = DQ.NPCS[who]; const name = who === 'granny' ? 'GRANNY GOSSAMER' : who === 'buttons' ? 'SIR BUTTONSWORTH' : who === 'gnarlgrim' ? 'GNARLGRIM' : who === 'narrator' ? null : def ? def.name.toUpperCase() : who.toUpperCase();
  DQ.curVoice = VOICES[who] || VOICES.narrator;
  talk.color = who === 'granny' ? '#ffe9a0' : '#ffffff'; talk.border = who === 'granny' ? '#ffd36a' : who === 'gnarlgrim' ? '#a070d0' : '#f3e9c8'; talk.nameColor = DQ.curVoice.color;
  talk.say(lines, { name, portrait: portraitFor(who) || undefined, portraitSize: 44, onDone: o.onDone, choices: o.choices, onChoice: o.onChoice });
  if (who === 'granny') A() && A().sfx('harp', { vol: .3 });
};
DQ.dialogOpen = () => !!(DQ.talk && DQ.talk.open);
const waitTalk = () => E.until(() => !DQ.talk.open || (DQ.S.cut && DQ.S.cut.skip));
const wait = s => E.any([s, () => DQ.S.cut && DQ.S.cut.skip]);

// talk to a resident
DQ.talkTo = function (r) {
  const S = DQ.S, def = r.def, id = r.id, h = S.hero;
  r.face = Math.atan2(h.y - r.y, h.x - r.x); r.hi = 3; S.stats.talked[id] = (S.stats.talked[id] || 0) + 1; ev.emit('talk', { id });
  const done = () => { DQ.questTick(); };
  // quest turn-in
  const rq = DQ.readyFor(id);
  if (rq) { const lines = rq.done.length ? rq.done : ['Well done!']; DQ.say(id, lines, { onDone: () => { DQ.finishQuest(rq); done(); } }); return; }
  // offer
  const oq = DQ.offerFor(id);
  if (oq) { DQ.say(id, oq.offer, { onDone: () => { S.quests[oq.id] = 0; DQ.toast('New request: ' + oq.title, '#ffd36a'); ev.emit('questStart', { q: oq }); done(); } }); return; }
  // Mortimer starts the siege
  if (id === 'mortimer' && S.quests.siegeprep === 1 && !S.flags.siegeStarted) {
    DQ.say(id, ['The Knotted army marches at the first crack of dread. Ballistas up? Walls up? Soup up?', 'Say the word and I will sound the horn. You will have ' + DQ.tuning.siegePrep + ' seconds to ready the town.'], { choices: ['I am ready!', 'Not yet...'], onChoice: i => { if (i === 0) { S.flags.siegeStarted = true; DQ.startCutscene('siege'); } } }); return;
  }
  if (id === 'mortimer' && S.siege.phase === 'failed') { DQ.say(id, ['The Banner fell... but we are not beaten.'], { choices: ['Try again from the start of the siege', 'Return to the title'], onChoice: i => { if (i === 0) DQ.siegeRetry('retry'); else DQ.toTitle && DQ.toTitle(); } }); return; }
  // active-request reminder or flavour chat
  const active = DQ.QUESTS.find(q => q.giver === id && typeof S.quests[q.id] === 'number');
  if (active && DQ.chance(.6, 'npc')) { const st = active.steps[Math.min(S.quests[active.id], active.steps.length - 1)]; DQ.say(id, ['About my request: ' + st.text.toLowerCase() + '. Please and thank you!']); return; }
  const mood = []; if (S.town.planted && DQ.roomCount(def.fav) === 0) mood.push('I do miss having a ' + def.fav + '. Just saying. Gently.');
  if (!S.world.list.some(o => o.type === 'bed') && S.town.planted) mood.push('No bed to sleep in... the ground is bumpy.');
  const pool = mood.concat(def.chat); S.chatI = (S.chatI || 0) + 1;
  DQ.say(id, [pool[S.chatI % pool.length]]);
};

// ---------- cutscenes (game.script generators) ----------
DQ.startCutscene = function (kind, arg) {
  const S = DQ.S, game = DQ.game; if (S.cut) return;
  S.cut = { kind, skip: false, skipT: 0 }; DQ.camOverride = null;
  const finish = () => { S.cut = null; DQ.camOverride = null; DQ.fade = 0; };
  const pan = (x, y, secs) => { DQ.camOverride = DQ.camOverride || { x: S.hero.x, y: S.hero.y }; return game.tween(DQ.camOverride, { x, y }, secs, { ease: 'inOutQuad' }); };
  game.script(function* () {
    try {
      if (kind === 'plant') {
        const p = DQ.POI.banner, bx = cellC(p[0]), by = cellC(p[1]);
        yield pan(bx, by, .8); A().sfx('powerup');
        DQ.say('granny', ['Now plant it, dearie! Let the Banner of Mending rise!']); yield waitTalk();
        S.bannerRise = 0; DQ.plantBanner(p[0], p[1]); const t0 = S.time;
        S.ringFx = { x: bx, y: by, t: 0 }; A().sfx('fanfare');
        for (let i = 0; i < 10; i++) { game.particles.glints(bx + (Math.random() - .5) * 30, by + (Math.random() - .5) * 30, 10 + i * 6, 6, '#ffe9a0'); yield wait(.12); }
        game.flash('#fff2b0', .25, .7); S.flags.planted = true; DQ.addCheer(10, 'banner'); DQ.questTick();
        DQ.say('granny', ['Oh, look at it glow! A stitched border now keeps your town together. Rooms inside it bring CHEER, and Cheer grows the town!', 'Residents will come. Build them homes: walls two blocks high, a door and a light make a room!']); yield waitTalk();
      }
      else if (kind === 'arrive') {
        const id = arg, def = DQ.NPCS[id], r = DQ.arriveResident(id); if (!r) return;
        yield pan(r.x, r.y, .6); A().sfx('fanfare', { vol: .5 }); DQ.popup('arrive', def.name + ' has moved into Thimbleton!', def.job, { id });
        DQ.say(id, def.arrive); yield waitTalk(); r.hi = 2; DQ.addCheer(5, 'arrive');
      }
      else if (kind === 'sleep') {
        for (let t = 0; t < 1; t += .05) { DQ.fade = t; yield .03; } DQ.fade = 1; S.hero.sleepFx = 1; A().sfx('lullaby');
        yield wait(.8); DQ.sleepNow(); DQ.residentsDaily('morning'); if (DQ.Save && DQ.Save.autosave) DQ.Save.autosave();
        for (let t = 1; t > 0; t -= .05) { DQ.fade = t; yield .03; } DQ.fade = 0; DQ.toast('You wake refreshed! HP restored.', '#ffe9a0');
      }
      else if (kind === 'siege') {
        yield pan(cellC(S.town.x), cellC(S.town.y), .8);
        DQ.say('mortimer', ['SOUND THE HORN! Thimbleton, to your posts! The Knotted army approaches!']); yield waitTalk(); A().sfx('horn');
        DQ.siegeStart();
      }
      else if (kind === 'buttons') {
        const m = DQ.spawnMonster('buttons', cellC(DQ.POI.arena[0]), cellC(DQ.POI.arena[1]) - 8); m.state = 'idle'; S.boss = m; m.hp = m.maxHp; S.flags.buttonsSeen = true;
        yield pan(m.x, m.y, .6); DQ.say('buttons', ['*clink clink clink* Who dares tread upon my buttons?', 'I am Sir Buttonsworth, keeper of the Golden Needle! You shall not pass, thread-bare Builder!']); yield waitTalk();
      }
      else if (kind === 'gnarlgrim') {
        const spots = DQ.siegeGates(); const g = spots[1] || spots[0];
        const m = DQ.spawnMonster('gnarlgrim', g[0], g[1], { siege: true }); S.boss = m; m.phase = 1;
        yield pan(m.x, m.y, 1); A().sfx('boom'); game.shake(6);
        DQ.say('gnarlgrim', ['TOO... MANY... LOOSE... ENDS.', 'I SHALL KNOT THIS TOWN INTO A BALL OF YARN. WITH YOU INSIDE.']); yield waitTalk();
        DQ.say('mortimer', ['His skin is too tight for our blades! Get on the Ballistas, Builder, and TANGLE him!']); yield waitTalk();
      }
      else if (kind === 'finale') {
        const m = S.finaleAt || { x: S.hero.x, y: S.hero.y };
        yield pan(m.x, m.y, .6); game.particles.glints(m.x, m.y, 30, 40, '#ffd36a'); A().sfx('fanfare'); yield wait(1);
        DQ.say('granny', ['The Golden Thread! It is free! Oh, dearie, you did it! You UNPICKED the Knot!', 'Frayvern still has my other threads, but that is a story for another chapter. Thimbleton is whole again, and so is the Knack.']); yield waitTalk();
        DQ.say('wren', ['You are the best builder in the whole quilt!']); yield waitTalk();
        S.chapterClear = true; ev.emit('chapterClear', {});
      }
    } finally { finish(); }
  }, {});
};

// ---------- siege director ----------
const WAVES = [
  [['lintling', 5], ['pinhog', 2]],
  [['pinhog', 4], ['knight', 3], ['mothlet', 3]],
  [['knight', 5], ['brute', 2], ['lintling', 4]]
];
DQ.siegeGates = function () {
  const w = DQ.S.world, t = DQ.S.town; const gates = [[Math.min(w.W - 4, t.x + 24), t.y], [4 + 8, t.y], [t.x, Math.max(4, t.y - 24)]];
  return gates.map(([x, y]) => { const q = w.nearestWalkable(Math.max(2, Math.min(w.W - 3, x)), Math.max(2, Math.min(w.H - 3, y)), 8) || [x, y]; return [cellC(q[0]), cellC(q[1])]; });
};
DQ.siegeStart = function () {
  const S = DQ.S; S.siege = { phase: 'prep', t: DQ.tuning.siegePrep, wave: 0, queue: [], tries: (S.siege.tries || 0), left: 0 }; S.town.bannerHp = 300;
  ev.emit('siegePrep', {}); DQ.toast('The Knotted army approaches!', '#ff8a8a');
};
DQ.siegeRetry = function (why) {
  const S = DQ.S; for (const m of S.monsters) if (m.siege) m.remove = true; S.shots = [];
  S.siege = { phase: 'prep', t: 30, wave: 0, queue: [], tries: (S.siege.tries || 0) + 1, left: 0 }; S.town.bannerHp = 300; S.hero.hp = S.hero.maxHp; S.boss = null;
  DQ.toast('Again! Ready your defences.', '#ffd36a');
};
function startWave(n) {
  const S = DQ.S, sg = S.siege; sg.phase = 'wave'; sg.wave = n; sg.queue = []; const gates = DQ.siegeGates();
  let gi = 0; for (const [id, c] of WAVES[n - 1]) for (let i = 0; i < c; i++) sg.queue.push({ id, at: sg.queue.length * (10 / 10) * .9, gate: gates[gi++ % gates.length] });
  sg.t = 0; ev.emit('siegeWave', { wave: n }); DQ.toast('Wave ' + n + '!', '#ff8a8a'); A().sfx('horn', { vol: .6 });
}
DQ.siegeTick = function (dt) {
  const S = DQ.S, sg = S.siege; if (sg.phase === 'none' || sg.phase === 'done' || sg.phase === 'failed') return;
  if (S.town.bannerHp <= 0 && sg.phase !== 'prep') { sg.phase = 'failed'; DQ.toast('The Banner has fallen...', '#ff8a8a'); for (const m of S.monsters) if (!m.def.boss) m.remove = true; ev.emit('siegeFailed', {}); DQ.say('mortimer', ['The Banner has fallen...!', 'But there is still stitching to do. Talk to me when you are ready to try again.']); return; }
  if (sg.phase === 'prep') { sg.t -= dt; if (sg.t <= 0) startWave(1); }
  else if (sg.phase === 'wave') {
    sg.t += dt;
    while (sg.queue.length && sg.queue[0].at <= sg.t) { const q = sg.queue.shift(); DQ.spawnMonster(q.id, q.gate[0] + (Math.random() - .5) * 20, q.gate[1] + (Math.random() - .5) * 20, { siege: true }); }
    sg.left = sg.queue.length + S.monsters.filter(m => m.siege && m.hp > 0).length;
    if (!sg.queue.length && !S.monsters.some(m => m.siege && m.hp > 0)) {
      if (sg.wave < WAVES.length) { sg.phase = 'breather'; sg.t = 25; DQ.toast('Wave cleared! Repair and rest.', '#8affd0'); A().sfx('fanfare', { vol: .5 }); DQ.addCheer(5, 'wave'); S.town.bannerHp = Math.min(300, S.town.bannerHp + 60); }
      else { sg.phase = 'boss'; sg.t = 0; sg.pending = true; }
    }
  }
  else if (sg.phase === 'breather') { sg.t -= dt; if (sg.t <= 0) startWave(sg.wave + 1); }
  else if (sg.phase === 'boss') {
    if (sg.pending && !S.cut && !DQ.dialogOpen()) { sg.pending = false; DQ.startCutscene('gnarlgrim'); }
    if (S.flags.boss_gnarlgrim && !S.cut) { sg.phase = 'done'; S.flags.siegeDone = true; for (const m of S.monsters) m.remove = true; ev.emit('siegeDone', {}); S.finaleAt = { x: S.hero.x, y: S.hero.y }; DQ.questTick(); DQ.startCutscene('finale'); }
  }
};

// ---------- daily events ----------
ev.on('hour', ({ hour }) => {
  const S = DQ.S; if (!S) return;
  if (hour === 6) DQ.residentsDaily('morning');
  if (hour === 18) DQ.residentsDaily('supper');
  if (hour === 19 && !S.flags.firstNight && S.mode === 'story') { S.flags.firstNight = 1; DQ.say('granny', DQ.grannyLines.firstNight); }
});
ev.on('newDay', () => { DQ.regrowTick(); });
ev.on('bannerPlanted', () => {});
ev.on('roomFormed', ({ room, inBorder }) => {
  const S = DQ.S; if (!S || S.mode !== 'story') return;
  DQ.popup('room', 'ROOM COMPLETE!', room.type, { cells: room.cells });
  DQ.audio && DQ.audio.sfx('fanfare', { vol: .5 });
  const g = DQ.game; for (let i = 0; i < 3; i++) g.particles.bits(room.cx * T + 8, room.cy * T + 8, 20 + i * 8, 14, ['#ff8ab8', '#ffe9a0', '#8affd0', '#a0c8ff']);
  for (const r of S.residents) r.hi = 2.2;
  DQ.dirtyRooms && 0;
});
ev.on('townLevel', ({ level }) => {
  const S = DQ.S; if (!S || S.mode !== 'story' || level < 2) return;
  DQ.popup('level', 'Thimbleton is now Level ' + level + '!', DQ.LEVELS[level - 1].unlock, { level }); DQ.audio && DQ.audio.sfx('levelup');
  DQ.game.flash('#ffe9a0', .2, .5);
});
ev.on('questStart', ({ q }) => {
  const S = DQ.S; if (!S || S.mode !== 'story') return;
  if (q.giver === 'granny' && q.offer.length && !(S.cut)) { DQ.say('granny', q.offer, { onDone: () => { if (q.id === 'gather') DQ.toast('Open your Satchel (' + DQ.game.input.label('satchel') + ') to craft.', '#ffe9a0'); } }); }
  if (q.id === 'thimbleton') { DQ.inv.add('banner', 1); }
});
ev.on('questDone', ({ q }) => {
  const S = DQ.S; if (!S || S.mode !== 'story') return;
  DQ.popup('quest', 'Quest complete!', q.title, {}); DQ.audio && DQ.audio.sfx('fanfare', { vol: .5 });
  if (q.giver === 'granny' && q.done.length && !S.cut) DQ.say('granny', q.done);
  if (q.id === 'stitch') { S.flags.spinStitch = true; }
});
ev.on('notion', ({ recipe }) => { const S = DQ.S; if (S && S.hero) { S.hero.thought = 1.8; } DQ.audio && DQ.audio.sfx('harp'); });
ev.on('monsterKilled', ({ m }) => { if (m.id === 'buttons') { const S = DQ.S; DQ.questTick(); DQ.say('buttons', ['Oh... buttons... my buttons... *clatter*']); } });
ev.on('bossKilled', () => { DQ.questTick(); });
ev.on('builderRespawn', () => { const S = DQ.S; if (S.mode === 'story' && !S.flags.firstKO) { S.flags.firstKO = 1; DQ.say('granny', DQ.grannyLines.ko); } });
// objects built toward quest counters
ev.on('blockPlaced', () => { const S = DQ.S; if (S) { S.dirtyQ = true; } });
ev.on('blockBroken', () => { const S = DQ.S; if (S) { S.dirtyQ = true; } });
ev.on('itemGained', () => { const S = DQ.S; if (S) S.dirtyQ = true; });
ev.on('crafted', () => { const S = DQ.S; if (S) S.dirtyQ = true; });
ev.on('objectPlaced', () => { const S = DQ.S; if (S) S.dirtyQ = true; });
ev.on('roomFormed', () => { const S = DQ.S; if (S) S.dirtyQ = true; });
ev.on('townLevel', () => { const S = DQ.S; if (S) S.dirtyQ = true; });
})();
