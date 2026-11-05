/* 04-data-world: the island's places (walkable maps, NPC spots, interactables), the map pins, the calendar, weather and
 * the schedule weights. Rows are TileMap rows: '#' a wall, '.' the floor, letters are spawn tags (see legend). */
G.PLACES = {
  beach: { id: 'beach', name: 'Sunset Courts', open: ['morning', 'afternoon'], tod: 'sunset', music: 'island', ambience: 'waves',
    pin: [0.30, 0.50], blurb: 'Two courts, a tiki bar and the Match Board.',
    rows: ['~~~~~~~~~~~~~~~~~~~~~~~~', '~~~~~~~~~~~~~~~~~~~~~~~~', '~~~~~~~~~~~~~~~~~~~~~~~~', ',,,,,,,,,,,,,,,,,,,,,,,,', '................................', '..............b.........a......', '...................ccc..........', '................................', '................................', '..o.................d...........', '................................', '................................', '................................', '..p.......................q.....', '................................', '.............................r...', '................................', '................................', '................................'],
    legend: { '~': { floor: 'sea', block: true }, ',': { floor: 'wet' }, '.': { floor: 'sand' }, a: 'match_board', b: 'hut_beach', c: 'npc_court', d: 'npc_bar', o: 'npc_lounger', p: 'npc_lounger', q: 'npc_shore', r: 'npc_shore', 'x': 'hero' } },
  pool: { id: 'pool', name: 'Lagoon Pool', open: ['morning', 'afternoon'], tod: 'sunset', music: 'lagoon', ambience: 'pool', pin: [0.56, 0.28],
    blurb: 'A free-form pool, the Pool Hop deck, and palms.' },
  promenade: { id: 'promenade', name: 'Fortuna Promenade', open: ['morning', 'afternoon'], tod: 'sunset', music: 'island', ambience: 'crowd', pin: [0.70, 0.62],
    blurb: 'Three shopfronts on the boardwalk.' },
  villa: { id: 'villa', name: 'Your Villa', open: ['morning', 'afternoon', 'night'], tod: 'night', music: 'siesta', ambience: 'crickets', pin: [0.40, 0.22],
    blurb: 'Your room: a bed, a closet, a desk and a balcony.' },
  casino: { id: 'casino', name: 'Casino Fortuna', open: ['night'], tod: 'night', music: 'neon', ambience: 'casino', pin: [0.82, 0.36], blurb: 'Slots, blackjack, roulette and the cashier. Night only.' },
  dock: { id: 'dock', name: 'The Dock', open: [], tod: 'sunset', music: 'island', ambience: 'waves', pin: [0.18, 0.72], blurb: 'Departures only.', storyOnly: true }
};
G.PLACE_ORDER = ['beach', 'pool', 'promenade', 'villa', 'casino', 'dock'];
/* the places' interactables: what happens when the hero walks up to a tag */
G.INTERACT = {
  match_board: { label: 'Match Board', kind: 'board' }, hut_beach: { label: 'Changing hut', kind: 'wardrobe' },
  pool_deck: { label: 'Pool Hop', kind: 'poolhop' }, hut_pool: { label: 'Changing hut', kind: 'wardrobe' },
  shop_riptide: { label: 'Riptide Sports', kind: 'shop', shop: 'riptide' }, shop_coral: { label: 'Coral Couture', kind: 'shop', shop: 'coral' },
  shop_sundries: { label: 'Sundries & Smiles', kind: 'shop', shop: 'sundries' }, bed: { label: 'Bed', kind: 'bed' }, closet: { label: 'Closet', kind: 'wardrobe' },
  desk: { label: 'Desk', kind: 'desk' }, album_frame: { label: 'Album', kind: 'album' }, mailbox: { label: 'Mailbox', kind: 'mail' },
  cashier: { label: 'Cashier', kind: 'cashier' }, slot_1: { label: 'Slots', kind: 'slots' }, slot_2: { label: 'Slots', kind: 'slots' }, slot_3: { label: 'Slots', kind: 'slots' },
  blackjack: { label: 'Blackjack', kind: 'blackjack' }, roulette: { label: 'Roulette', kind: 'roulette' }, prize: { label: 'Prize counter', kind: 'prize' }, vip: { label: 'VIP lounge', kind: 'vip' }
};
/* the calendar and the weather table */
G.WEATHER = { 1: ['sunny'], 2: ['sunny', 'cloudy'], 3: ['cloudy', 'rain', 'clear'], 4: ['sunny'], 5: ['sunny', 'golden'] };
G.WEATHER_LABEL = { sunny: 'Sunny', cloudy: 'Cloudy', rain: 'Rain', clear: 'Clear', golden: 'Golden' };
/* the schedule: per NPC, weights over places in each slot (beach, pool, promenade, away) and night (casino, away) */
G.SCHED = {
  rin: { morning: [4, 2, 3, 1], afternoon: [4, 3, 2, 1], night: [3, 7] },
  lola: { morning: [5, 2, 2, 1], afternoon: [5, 2, 2, 1], night: [6, 4] },
  ingrid: { morning: [3, 4, 2, 1], afternoon: [2, 5, 2, 1], night: [2, 8] },
  amara: { morning: [3, 2, 4, 1], afternoon: [3, 3, 3, 1], night: [7, 3] },
  tess: { morning: [6, 2, 1, 1], afternoon: [5, 3, 1, 1], night: [4, 6] },
  mei: { morning: [2, 3, 4, 1], afternoon: [3, 2, 4, 1], night: [8, 2] }
};
G.SCHED_PLACES = { morning: ['beach', 'pool', 'promenade', 'away'], afternoon: ['beach', 'pool', 'promenade', 'away'], night: ['casino', 'away'] };
G.NPCS = G.FIGHTERS;
/* where each NPC stands in each place: spot tags in the maps (the spawn tags above) */
G.SPOTS = { beach: ['npc_court', 'npc_bar', 'npc_lounger', 'npc_shore'], pool: ['npc_pool', 'npc_lounger', 'npc_edge'], promenade: ['npc_bench', 'npc_window', 'npc_cart'], villa: ['npc_visitor'], casino: ['npc_slots', 'npc_roulette', 'npc_bar'] };
G.MOOD_SHIFT = { rain: -1, cloudy: 0, sunny: 0, clear: 0, golden: 0 };
/* the letters rolled for the day's rain: rain multiplies the beach, the pool and the outside places */
G.rainMul = { beach: .2, pool: .5, promenade: 1.5, away: 1.5 };
/* the day's events: story triggers by day and slot (story data lives in 34-story.js) */
G.DAY_START_WEATHER = function (day, rng) {
  const list = G.WEATHER[day] || ['sunny'];
  return list[Math.floor(rng() * list.length) % list.length];
};
G.slotName = function (i) { return G.SLOTS[i]; };
/* the walkable maps of the other places: '#' walls (type 1), '~' pool water (blocks), ',' deck, '.' floor; letters are
 * spawn tags (interactables and NPC spots) */
G.PLACES.pool.rows = ['########################', '#,,,,,,,,,,,,,,,,,,,,,,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,,,,,,,,,,,,,,,,,,,,,,#', '#,,,,,,,,,,,,,,,,,,,,,,#', '#,,,,,,,,,,,,,,,,,,,,,,#', '########################'];
G.PLACES.pool.legend = { '#': 1, '~': { floor: 'pool', block: true }, ',': { floor: 'deck' }, a: 'pool_deck', b: 'hut_pool', c: 'npc_edge', d: 'npc_lounger', e: 'npc_lounger', f: 'npc_pool' };
G.PLACES.pool.rows = G.PLACES.pool.rows.map((s, r) => (r === 1 ? '#,a,,,,,,,,,,,,,,,,,,,,,#' : r === 8 ? '#,,,c,,,,,,,,,,,,,,,,d,,,,#' : r === 9 ? '#,,,,e,,,,,,,,,,,,,,,,f,,#' : s));
G.PLACES.promenade.rows = ['##########################################', '#.....#.....#......#.....#....#....#####', '#.........................................#', '#.........................................#', '#..a.....b.........c............d.........#', '#.........................................#', '#..........e......f.....................g..#', '##########################################'];
G.PLACES.promenade.legend = { '#': 1, '.': { floor: 'boardwalk' }, a: 'shop_riptide', b: 'shop_coral', c: 'shop_sundries', d: 'npc_bench', e: 'npc_window', f: 'npc_window', g: 'npc_cart' };
G.PLACES.villa.rows = ['##############', '#............#', '#..a.........#', '#............#', '#.bcdefg.....#', '#............#', '#............#', '#....h.......#', '#............#', '##############'];
G.PLACES.villa.legend = { '#': 1, '.': { floor: 'tile' }, a: 'closet', b: 'bed', c: 'desk', d: 'album_frame', e: 'mailbox', f: 'npc_visitor', g: 'npc_visitor', h: 'hero_entry' };
G.PLACES.casino.rows = ['##############################', '#............................#', '#.a....b....c.....d.....e...f#', '#............................#', '#..g.g.g.....h....i......j...#', '#............................#', '#...k....l.....m.....n...o...#', '#............................#', '#............................#', '##############################'];
G.PLACES.casino.legend = { '#': 1, '.': { floor: 'carpet' }, a: 'cashier', b: 'slot_1', c: 'slot_2', d: 'slot_3', e: 'blackjack', f: 'roulette', g: 'npc_slots', h: 'npc_bar', i: 'npc_roulette', j: 'prize', k: 'npc_slots', l: 'npc_roulette', m: 'npc_bar', n: 'vip', o: 'npc_slots' };
G.PLACES.beach.entry = [3, 9];
G.PLACES.pool.entry = [2, 10];
G.PLACES.promenade.entry = [8, 6];
G.PLACES.villa.entry = [6, 7];
G.PLACES.casino.entry = [14, 9];
