import { load } from '../lib/load.mjs';
export default async t => {
  const { G, game } = load(); game.advance(.5); const T = game.debug.tools;
  const S = T.newVacation('rin', 11);
  t('day 1 morning', S.day === 1 && S.slot === 0); t('five NPCs with affinity', Object.keys(S.affinity).length === 5);
  t('weather table day 3 rain afternoon', G.WEATHER_TABLE[3][1] === 'rain');
  t('a pair at the beach by day', S.teams.some(tm => S.where[tm[0]] === 'beach' && S.where[tm[1]] === 'beach'));
  const same = JSON.stringify(S.where); G.scheduleSlot(); t('same seed, same places', JSON.stringify(S.where) === same);
  t('teams go together', S.teams.every(tm => S.where[tm[0]] === S.where[tm[1]]));
  // gifts
  S.bag = { plush_seal: 1, energy_drink: 1, hot_sauce: 1 }; S.mood.mei = 'normal'; S.mood.lola = 'normal';
  const a0 = G.aff('mei'), r1 = G.giveGift('mei', 'plush_seal'); t('a liked gift is accepted', r1.accepted && G.aff('mei') > a0, JSON.stringify(r1));
  t('one gift a slot', !G.canGift('mei'));
  S.affinity.lola = 10; S.mood.lola = 'gloomy'; const r2 = G.giveGift('lola', 'energy_drink'); t('a neutral gift to a gloomy stranger is refused', !r2.accepted && S.bag.energy_drink === 1, JSON.stringify(r2));
  t('known likes are recorded', S.known.mei.plush_seal === 'like');
  // invites
  S.affinity.tess = 10; S.mood.tess = 'normal'; t('a stranger declines', !G.invite('tess').ok);
  S.affinity.tess = 70; const inv = G.invite('tess'); t('a friend teams up', inv.ok && S.partner === 'tess');
  // slots and days
  G.endSlot('test'); t('the slot advances', S.slot === 1);
  S.slot = 2; S.lostToday = true; S.affinity.tess = 20; game.advance(.1); G.nextDay(); t('a partner who lost and likes you less than 35 walks', S.partner === null && S.day === 2);
  // money
  const m0 = S.money; G.earn(1000); t('prize money with prizeMul', S.money === m0 + 1000); t('cannot overspend', !G.spend(S.money + 1));
  // save and load in the middle of a day
  G.setupSaves(); S.slot = 1; S.money = 12345; game.saves.save(0); G.state = null; game.saves.load(0); t('save and load mid-slot', G.state && G.state.money === 12345 && G.state.slot === 1 && G.state.day === 2);
  // the vacation match flow pays and moves on
  const S2 = G.state; S2.partner = 'mei'; const cfg = G.vacationMatchCfg(['lola', 'tess']); t('a vacation match config', cfg.teams[0][1].id === 'mei' && cfg.partnerAff === G.aff('mei'));
  // without the test calling setupSaves: the game's own autosave and Continue
  { const L2 = load(); L2.game.advance(.5); const S3 = L2.game.debug.tools.newVacation('amara', 21); S3.money = 777; L2.G.autosave(); L2.G.state = null;
    L2.G.go('menu', null, { fade: 0 }); L2.game.advance(.3); const items = L2.G.SCENES.menu.items().map(i => i.id);
    t('the menu offers Continue after an autosave', items.includes('continue'), items.join(','));
    const sv = L2.game.saves.latest(); t('Continue loads the vacation', sv && L2.game.saves.load(sv.slot) && L2.G.state && L2.G.state.money === 777 && L2.G.state.me === 'amara'); }
  t('no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
};
