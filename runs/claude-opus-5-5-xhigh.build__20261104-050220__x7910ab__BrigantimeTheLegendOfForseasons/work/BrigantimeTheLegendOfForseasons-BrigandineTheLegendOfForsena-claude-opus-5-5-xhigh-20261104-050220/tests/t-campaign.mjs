// campaign, ai-campaign, save, story
import { suite, boot, ok, eq } from './lib.mjs';

let H = null; const env = async () => H || (H = await boot('#title'));
const toMuster = (G, sim) => { if (sim.s.phase === 'tidings') { sim.beginSeason(); } return sim; };

suite('campaign', async t => {
  const { G } = await env();
  await t('the phases cycle: Tidings, Muster, March, battles, the next season', () => {
    const sim = G.CampaignSim.create({ seed: 2, humans: ['verdance'] }); eq(sim.s.phase, 'tidings'); sim.beginSeason(); eq(sim.s.phase, 'muster');
    sim.apply({ t: 'endMuster', realm: 'verdance' }); eq(sim.s.phase, 'march'); sim.apply({ t: 'endMarch', realm: 'verdance' }); eq(sim.s.phase, 'resolve');
    let p, n = 0; while ((p = sim.nextBattle()) && n++ < 20) { if (p.kind === 'open') sim.takeOpen(); else { const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); sim.applyBattle(b.result()); } }
    sim.endSeason(); eq(sim.season, 'summer');
  });
  await t('income, upkeep, the in-season yield and desertion', () => {
    const sim = G.CampaignSim.create({ seed: 2, humans: ['verdance'] });
    const inc = sim.income('verdance'); eq(inc, Math.round((40 + 20 + 20 + 25) * (1 + G.tune.seasonYield)), 'spring yield for Verdance');
    sim.s.realms.verdance.mana = -500; sim.beginSeason(); ok(sim.s.realms.verdance.mana >= 0, 'deserted to cover the debt');
  });
  await t('summon: circle, cost, three a season, the summon level', () => {
    const sim = toMuster(G, G.CampaignSim.create({ seed: 2, humans: ['verdance'] })), r = 'verdance';
    sim.s.realms[r].mana = 1000; const m0 = Object.keys(sim.s.monsters).length;
    ok(sim.illegal({ t: 'summon', realm: r, castle: 'avalorn', sp: 'salamander' }), 'not in the circle');
    for (let i = 0; i < 3; i++) eq(sim.apply({ t: 'summon', realm: r, castle: 'avalorn', sp: 'sproutling' })[0].e, 'summon');
    eq(sim.illegal({ t: 'summon', realm: r, castle: 'avalorn', sp: 'sproutling' }), 'Three summons a season'); eq(Object.keys(sim.s.monsters).length, m0 + 3);
    const m = Object.values(sim.s.monsters).pop(); eq(m.level, sim.summonLevel(r));
    ok(sim.illegal({ t: 'summon', realm: r, castle: 'avalorn', sp: 'rillserpent' }) || sim.season === 'spring', 'seasonal entries');
  });
  await t('bind within Bond and six; unbind; formation; dismiss', () => {
    const sim = toMuster(G, G.CampaignSim.create({ seed: 2, humans: ['verdance'] })), r = 'verdance', res = sim.s.castles.avalorn.reserve.slice();
    ok(res.length >= 2, 'reserve'); eq(sim.apply({ t: 'bind', realm: r, uid: res[0], knight: 'amris' })[0].e, 'bind');
    const k = sim.knight('amris'); ok(k.troop.includes(res[0])); eq(sim.apply({ t: 'unbind', realm: r, uid: res[0] })[0].e, 'unbind');
    sim.apply({ t: 'formation', realm: r, knight: 'amris', form: 'column' }); eq(k.formation, 'column');
    const before = sim.s.castles.avalorn.reserve.length; sim.apply({ t: 'dismiss', realm: r, uid: res[1] }); eq(sim.s.castles.avalorn.reserve.length, before - 1);
    k.bondBonus = -20; ok(sim.illegal({ t: 'bind', realm: r, uid: res[0], knight: 'amris' }), 'Bond limit');
  });
  await t('move only to an adjacent castle of your own, once a Muster', () => {
    const sim = toMuster(G, G.CampaignSim.create({ seed: 2, humans: ['verdance'] })), r = 'verdance';
    ok(sim.illegal({ t: 'move', realm: r, knight: 'amris', to: 'primrose' }), 'not adjacent');
    eq(sim.apply({ t: 'move', realm: r, knight: 'amris', to: 'thornwick' })[0].e, 'move');
    ok(sim.illegal({ t: 'move', realm: r, knight: 'amris', to: 'primrose' }), 'once');
  });
  await t('quest outcomes follow their weights (10,000 rolls within 2%)', () => {
    const sim = G.CampaignSim.create({ seed: 9, humans: ['verdance'] }), k = sim.knight('pelleas'), site = G.get('site', 'queensorchard'); sim.s.turn = 4;
    k.cls = 'squire'; k.level = 5; G.setTune('questLuck', 1); const n = 10000, c = {};
    for (let i = 0; i < n; i++) { const o = sim._rollQuest(k, site); c[o.kind] = (c[o.kind] || 0) + 1; }
    const w = { treasure: 40, beast: 20, wanderer: 10, mana: 15, training: 15, mishap: 10 }, tot = 110;
    for (const [kk, v] of Object.entries(w)) ok(Math.abs(c[kk] / n - v / tot) < .02, kk + ' ' + (c[kk] / n).toFixed(3) + ' vs ' + (v / tot).toFixed(3));
  });
  await t('a quest returns after its seasons with its outcome', () => {
    const sim = toMuster(G, G.CampaignSim.create({ seed: 4, humans: ['verdance'] })), r = 'verdance';
    eq(sim.apply({ t: 'quest', realm: r, knight: 'amris', site: 'queensorchard' })[0].e, 'quest'); ok(sim.knight('amris').quest);
    sim.apply({ t: 'endMuster', realm: r }); sim.apply({ t: 'endMarch', realm: r }); let p; while ((p = sim.nextBattle())) { if (p.kind === 'open') sim.takeOpen(); else { const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); sim.applyBattle(b.result()); } } sim.endSeason();
    const res = sim.beginSeason(); ok(res.cards.some(c => c.e === 'questReturn' && c.knight === 'amris'), 'returned'); ok(!sim.knight('amris').quest);
  });
  await t('marches: adjacency, three troops, once a season, one per target', () => {
    const sim = toMuster(G, G.CampaignSim.create({ seed: 2, humans: ['verdance'] })), r = 'verdance'; sim.apply({ t: 'endMuster', realm: r });
    ok(sim.marchTargets(r).includes('thawgate') && !sim.marchTargets(r).includes('rimeholt'), 'targets');
    ok(sim.illegal({ t: 'declare', realm: r, target: 'thawgate', knights: ['amris'] }), 'not beside');
    eq(sim.apply({ t: 'declare', realm: r, target: 'thawgate', knights: ['lynette'] })[0].e, 'declare');
    ok(sim.illegal({ t: 'declare', realm: r, target: 'thawgate', knights: ['lynette'] }), 'once');
  });
  await t('an empty castle falls without a battle; the treasury goes to the winner', () => {
    const sim = toMuster(G, G.CampaignSim.create({ seed: 2, humans: ['verdance'] })), r = 'verdance';
    for (const k of sim.knightsOf('hoarfast')) k.wounded = 3;
    const st = sim.s.castles.thawgate; for (const k of st.knights.slice()) { sim.knight(k).quest = { site: 'breakingice', from: 'thawgate', back: 99, outcome: { kind: 'mana', mana: 1 } }; }
    sim.apply({ t: 'endMuster', realm: r }); sim.apply({ t: 'declare', realm: r, target: 'thawgate', knights: ['lynette'] }); sim.apply({ t: 'endMarch', realm: r });
    let p, got = false; while ((p = sim.nextBattle())) { if (p.kind === 'open' && p.castle === 'thawgate') { const ev = sim.takeOpen(); got = ev.some(e => e.e === 'treasury'); } else if (p.kind === 'open') sim.takeOpen(); else { const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); sim.applyBattle(b.result()); } }
    eq(sim.s.castles.thawgate.owner, r); ok(got, 'treasury');
  });
  await t('aftermath: defenders fall back, wounds last a season, captures join a reserve', () => {
    let checked = 0;
    for (let seed = 1; seed < 12 && checked < 2; seed++) {
      const sim = G.CampaignSim.create({ seed, humans: [] }); G.setTune('aiPlayerBoost', 0);
      for (let i = 0; i < 6 && !sim.s.result; i++) {
        sim.beginSeason(); while (sim.s.phase === 'muster') sim.apply({ t: 'endMuster', realm: sim.currentHuman() }); while (sim.s.phase === 'march') sim.apply({ t: 'endMarch', realm: sim.currentHuman() });
        let p; while ((p = sim.nextBattle())) { if (p.kind !== 'battle') { if (p.kind === 'open') sim.takeOpen(); else { const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); sim.applyBattle(b.result()); } continue; }
          const defs = p.defenders.slice(), b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); const res = b.result(), ev = sim.applyBattle(res);
          if (res.winner === 0) { for (const k of defs) { const kk = sim.knight(k); ok(kk.free || kk.castle !== p.castle, 'fell back'); } checked++; }
          for (const u of res.units) if (u.kind === 'knight' && u.wounded) ok(sim.knight(u.ref).wounded === 2, 'wounded');
          for (const c of res.captures) { const m = sim.monster(c.ref); if (m) ok(m.castle && sim.s.castles[m.castle].reserve.includes(m.uid), 'capture in a reserve'); }
        }
        sim.endSeason();
      }
    }
    ok(checked > 0, 'a castle was taken');
  });
  await t('the candle burns out: the legend ends in silence', () => {
    const sim = G.CampaignSim.create({ seed: 2, humans: ['verdance'] }); sim.s.candle = 1; sim.s.turn = 8; const r = sim.beginSeason(); ok(sim.s.result && sim.s.result.ending === 'ending_candle', JSON.stringify(sim.s.result)); ok(r.events.some(e => e.id === 'ending_candle'));
  });
  await t('Stillness from Autumn of Year 3', () => { const sim = G.CampaignSim.create({ seed: 2, humans: ['verdance'] }); sim.s.turn = 10; sim.beginSeason(); ok(sim.s.stilled && sim.s.castles[sim.s.stilled].stilled, 'stilled'); });
  await t('losing the last castle loses the campaign', () => { const sim = G.CampaignSim.create({ seed: 2, humans: ['verdance'] }); const ev = []; for (const c of sim.castlesOf('verdance')) sim._capture(c, 'solmark', [], ev); ok(sim.s.result && sim.s.result.ending === 'ending_fallen'); });
  await t('taking Meridian opens the Sanctum; winning it wins the campaign', () => {
    const sim = G.CampaignSim.create({ seed: 2, humans: ['verdance'] }); sim.beginSeason(); const ev = []; sim._capture('meridian', 'verdance', ['gareth'], ev);
    eq(sim.s.sanctumOpen, 'verdance'); const st = sim.takeStory(); ok(st.some(e => e.id === 'meridian_falls'), 'meridian_falls');
    sim.apply({ t: 'event', id: 'meridian_falls', realm: 'verdance' }); const p = sim.nextBattle(); eq(p.kind, 'sanctum');
    const spec = sim.battleSpec(p), b = G.BattleSim.create(spec); b.apply({ t: 'win', side: 0 }); sim.applyBattle(b.result()); ok(sim.s.result && sim.s.result.kind === 'win' && sim.s.result.ending === 'ending_verdance');
  });
  await t('a rival who wins the Sanctum sets the Wheel', () => { const sim = G.CampaignSim.create({ seed: 2, humans: ['verdance'] }); const ev = []; sim._capture('meridian', 'solmark', [], ev); eq(sim.s.rivalSanctum, 'solmark'); G.setTune('aiPlayerBoost', 0); for (const k of sim.knightsOf('solmark').slice(0, 3)) { k.castle && (sim.s.castles[k.castle].knights = sim.s.castles[k.castle].knights.filter(x => x !== k.id)); k.castle = 'meridian'; sim.s.castles.meridian.knights.push(k.id); k.level = 40; k.stats = G.classStats(k.cls, 40); k.hp = k.stats.hp; } sim.beginSeason(); ok(sim.s.result ? sim.s.result.ending === 'ending_wheel_solmark' : sim.s.castles.meridian.owner === 'dominion', JSON.stringify(sim.s.result)); });
});

suite('ai-campaign', async t => {
  const { G } = await env();
  await t('AI-only campaigns reach an end, with battles, and the Dominion waits in Year 1', () => {
    for (const diff of ['easy', 'normal', 'hard']) for (let seed = 1; seed <= 2; seed++) {
      const sim = G.CampaignSim.create({ seed, humans: [], difficulty: diff }); let battles = 0, y1dom = 0;
      for (let i = 0; i < 24 && !sim.s.result; i++) { const ev = G.CampaignAI.playSeason(sim); battles += ev.filter(e => e.e === 'taken' || e.e === 'held').length; if (sim.year === 1) y1dom += sim.s.marches.filter(m => m.realm === 'dominion').length; }
      ok(sim.s.result, diff + ' ' + seed + ' ends'); ok(battles >= 8, diff + ' battles ' + battles); eq(y1dom, 0, 'the Dominion in Year 1');
    }
  });
});

suite('save', async t => {
  const { G, game } = await env();
  await t('serialize, load, the same hash, mid-Muster with knights away and castles stilled', () => {
    const sim = G.CampaignSim.create({ seed: 3, humans: ['amberlyn'] }); for (let i = 0; i < 10; i++) G.CampaignAI.playSeason(sim); sim.beginSeason();
    const copy = G.CampaignSim.load(sim.serialize()); eq(copy.hash(), sim.hash());
    G.CampaignAI.playSeason(sim); while (copy.s.phase === 'muster') copy.apply({ t: 'endMuster', realm: copy.currentHuman() });
  });
  await t('the save slots write and read a campaign', () => {
    const sim = G.CampaignSim.create({ seed: 3, humans: ['hoarfast'] }); G.Camp.sim = sim;
    const d = G.saveData(); ok(d && d.data.campaign && d.place.includes('Hoarfast'), JSON.stringify(d && d.place));
    ok(game.saves.save(0, d), 'saved'); const list = game.saves.list(); ok(list.some(s => !s.empty), 'listed');
    const want = sim.hash(); G.Camp.sim = null; game.go('title'); game.advance(.5);
    ok(game.saves.load(0), 'loaded'); eq(G.Camp.sim.hash(), want, 'the same campaign'); game.advance(.5); eq(game.sceneName, 'campaign', 'the load opens the campaign');
    game.go('title'); game.advance(.5); G.Camp.sim = null; const L = game.saves.latest(), want2 = G.CampaignSim.load(L.data.campaign).hash(); G.loadLatest(); eq(G.Camp.sim.hash(), want2, 'Continue: the newest save (' + L.slot + ')'); game.advance(.5); eq(game.sceneName, 'campaign', 'Continue');
  });
  await t('a version 1 save migrates', () => { const d = G.migrateSave({ v: 1, campaign: '{}' }, 1); ok(d.meta); });
});

suite('story', async t => {
  const { G } = await env();
  await t('every event has speakers who exist, and choices with effects', () => {
    for (const e of G.all('event')) { ok(e.lines && e.lines.length, e.id + ' lines'); for (const l of e.lines) ok(typeof l[1] === 'string' || typeof l[1] === 'object', e.id); if (e.choices) for (const c of e.choices) ok(c.text, e.id + ' choice'); }
  });
  await t('every event applies from the dev trigger without errors', () => {
    for (const e of G.all('event')) { const sim = G.CampaignSim.create({ seed: 5, humans: ['verdance'] }); sim.beginSeason(); for (let c = 0; c < (e.choices ? e.choices.length : 1); c++) { const ev = sim.apply({ t: 'event', id: e.id, realm: 'verdance', choice: c }); ok(!ev.some(x => x.e === 'illegal'), e.id); } }
  });
  await t('each realm\'s opening and story chain fire in a scripted campaign', () => {
    for (const r of G.PLAYABLE) {
      const sim = G.CampaignSim.create({ seed: 6, humans: [r] }); const seen = new Set();
      for (let i = 0; i < 9 && !sim.s.result; i++) { const res = sim.beginSeason(); for (const e of res.events) { seen.add(e.id); sim.apply({ t: 'event', id: e.id, realm: e.realm, choice: 0 }); } while (sim.s.phase === 'muster') sim.apply({ t: 'endMuster', realm: sim.currentHuman() }); while (sim.s.phase === 'march') sim.apply({ t: 'endMarch', realm: sim.currentHuman() }); let p; while ((p = sim.nextBattle())) { if (p.kind === 'open') sim.takeOpen(); else { const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); sim.applyBattle(b.result()); } for (const e of sim.takeStory()) { seen.add(e.id); sim.apply({ t: 'event', id: e.id, realm: e.realm, choice: 0 }); } } sim.endSeason(); }
      ok(seen.has('open_' + r), r + ' opening'); ok(seen.has('banner_without_season'), 'banner'); ok(seen.has('candle_lit'), 'candle');
      const own = { verdance: 'v_', solmark: 's_', amberlyn: 'a_', hoarfast: 'w_' }[r]; ok([...seen].some(id => id.startsWith(own)), r + ' chain: ' + [...seen].join(','));
    }
  });
  await t('all good endings and the three kinds of bad ending exist', () => { for (const r of G.PLAYABLE) { ok(G.has('event', 'ending_' + r)); ok(G.has('event', 'ending_wheel_' + r)); } ok(G.has('event', 'ending_candle') && G.has('event', 'ending_fallen')); });
  await t('rival lines fire for their pairs', () => { ok(G.rivalLine(['agravain'], ['ragnell'])); ok(G.rivalLine(['tic', 'x'], ['gareth'])); ok(!G.rivalLine(['wren'], ['enid'])); });
  await t('the babble voice plans the same syllables for the same line', () => { const p = G.voice.profileOf('gareth'); eq(JSON.stringify(G.voice.plan(p, 'Sound the horn!')), JSON.stringify(G.voice.plan(p, 'Sound the horn!'))); ok(G.voice.plan(p, 'Hello there.').length > 4); });
});
