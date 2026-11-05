/* ---- ITEMS, TEA TREATS AND CHAOS EVENTS (Kerfuffle rules). Items auto-apply on their next relevant event: the HUD
 * shows a held item as ARMED. Chaos events fire between balls with a per-ground pool and end by themselves. ---- */
const ITEMS = {
  teapot: { name: 'Golden Teapot', side: 'bat', text: 'Next scoring shot: runs x2', color: '#ffd23a' },
  horseshoe: { name: 'Lucky Horseshoe', side: 'bat', text: 'Next dismissal overturned', color: '#c8ccd8' },
  giantbat: { name: 'Giant Bat', side: 'bat', text: 'Bigger bat for 2 balls', color: '#e2c890' },
  cake: { name: 'Cake Slice', side: 'any', text: 'Hype +40', color: '#ff8ad8' },
  sticky: { name: 'Sticky Gloves', side: 'bowl', text: 'Next catch guaranteed', color: '#ffb347' },
  banana: { name: 'Banana Peel', side: 'bowl', text: 'Next run: the batters slip', color: '#ffe060' },
  fog: { name: 'Fog Machine', side: 'bowl', text: 'Next ball: marker hidden', color: '#a8b8c8' }
};
const BAT_ITEMS = ['teapot', 'horseshoe', 'giantbat', 'cake'], BOWL_ITEMS = ['sticky', 'banana', 'fog', 'cake'];
const TEA_TREATS = [
  { id: 'sponge', name: 'Victoria Sponge', text: 'Hype +40' },
  { id: 'tea', name: "Builder's Tea", text: 'Timing windows +10% for 2 overs' },
  { id: 'sandwich', name: 'Cucumber Sandwiches', text: 'Run speed +10% for the innings' }
];
const CHAOS = {
  cow: { name: 'Doris the cow', overs: 2, chance: .3, line: 'cow' },
  bees: { name: 'Bees!', overs: 1, chance: .2, line: 'bees' },
  bells: { name: 'Church bells', overs: 0, chance: .2, line: 'bells' },
  peacocks: { name: 'Peacocks', overs: 2, chance: .3, line: 'peacocks' },
  tray: { name: "Fortescue's tea tray", overs: 0, chance: .25, line: 'tray' },
  gulls: { name: 'Seagulls', overs: 1, chance: .3, line: 'gulls' },
  tide: { name: 'The tide', overs: 99, chance: .5, line: 'tide' },
  rain: { name: 'Rain delay', overs: 0, chance: .25, line: 'rain' },
  dustdevil: { name: 'Dust devil', overs: 1, chance: .25, line: 'dustdevil' },
  rabbits: { name: 'Rabbits', overs: 0, chance: .25, line: 'rabbits' },
  fog: { name: 'Fog bank', overs: 2, chance: .35, line: 'fog' },
  ghosts: { name: 'Ghost fielders', overs: 99, chance: .5, line: 'ghosts' },
  fireworks: { name: 'Fireworks', overs: 0, chance: .3, line: 'fireworks' },
  advert: { name: 'Advert break', overs: 0, chance: .4, line: 'advert' },
  mascot: { name: 'Pitch invader', overs: 1, chance: .12, line: 'mascot' }
};
K.ITEMS = ITEMS; K.TEA_TREATS = TEA_TREATS; K.CHAOS = CHAOS; K.BAT_ITEMS = BAT_ITEMS; K.BOWL_ITEMS = BOWL_ITEMS;
