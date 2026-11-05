// Data suite: every id the data names exists, and every battle map is a rectangle of known glyphs.
export function run({ check, G }) {
  for (const k of G.ids('knight')) {
    const kn = G.get('knight', k);
    check('knight ' + k + ' realm exists', G.has('realm', kn.realm), kn.realm);
    check('knight ' + k + ' class exists', G.has('class', kn.cls), kn.cls);
    check('knight ' + k + ' element exists', G.has('element', kn.element), kn.element);
    if (kn.skill) check('knight ' + k + ' skill exists', G.has('skill', kn.skill), kn.skill);
    if (kn.start) check('knight ' + k + ' start castle exists', G.has('castle', kn.start), kn.start);
    for (const it of kn.items) check('knight ' + k + ' item exists', G.has('item', it), it);
  }
  for (const c of G.ids('castle')) {
    const ca = G.get('castle', c);
    check('castle ' + c + ' realm exists', G.has('realm', ca.realm), ca.realm);
  }
  for (const [a, b] of G.ROADS) {
    check('road ' + a + '-' + b + ' is two castles', G.has('castle', a) && G.has('castle', b), a + '-' + b);
  }
  for (const s of G.ids('species')) {
    const sp = G.get('species', s);
    check('species ' + s + ' element exists', G.has('element', sp.element), sp.element);
    check('species ' + s + ' has three forms', sp.forms.length === 3, String(sp.forms.length));
    for (const f of sp.forms) if (f.skill) check('species ' + s + ' skill exists', G.has('skill', f.skill), f.skill);
  }
  for (const m of G.ids('map')) {
    const map = G.get('map', m);
    check('map ' + m + ' is 11 wide', map.rows.every(r => r.length === G.MAP_ROWS_WIDTH), map.rows.map(r => r.length).join(','));
    check('map ' + m + ' has a keep', map.rows.some(r => r.includes('K')));
    check('map ' + m + ' has start cells for both sides', map.rows.join('').includes('a') && map.rows.join('').includes('b'));
    const cells = map.rows.join('');
    const countA = [...cells].filter(c => c === 'a').length, countB = [...cells].filter(c => c === 'b').length;
    check('map ' + m + ' has room for 6 units a side', countA >= 6 && countB >= 6, countA + '/' + countB);
  }
  check('the content counts match the plan (25 castles, 36 knights, 30 species, 13 maps)', G.ids('castle').length === 25 && G.ids('knight').length === 36 && G.ids('species').length === 30 && G.ids('map').length === 13, [G.ids('castle').length, G.ids('knight').length, G.ids('species').length, G.ids('map').length].join('/'));
  check('the item count matches the plan (33)', G.ids('item').length === 33, String(G.ids('item').length));
  check('seasons cover the four elements', G.SEASON_ORDER.every(s => G.has('season', s)));
  check('realms: four playable', G.PLAYABLE_REALMS.length === 4);
  check('Meridian is the goal castle', G.get('castle', 'meridian').goal === true);
}
