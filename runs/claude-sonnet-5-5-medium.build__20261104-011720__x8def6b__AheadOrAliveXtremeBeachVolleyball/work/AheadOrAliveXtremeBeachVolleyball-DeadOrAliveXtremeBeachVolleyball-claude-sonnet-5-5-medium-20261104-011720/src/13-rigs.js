/* 13-rigs: the rig factory. A fighter + a swimsuit + a hat = a Humanoid. Portraits for dialog. */
G.rigCache = {};
G.makeRig = (charId, o = {}) => {
  const c = G.CAST[charId] || G.CAST.you, st = o.suit ? G.SUITS.find(s => s.id === o.suit) : null, hat = o.hat ? G.HATS.find(h => h.id === o.hat) : null;
  const cloth = st ? st.top : c.cloth, pants = st ? st.bottom : c.pants;
  const hatDef = hat && hat.style ? { style: hat.style, color: hat.color } : (charId === 'sonny' ? { style: 'cap', color: '#ffe14a' } : undefined);
  const hs = c.hairStyle;
  const extras = [];
  if (o.hat === 'visor') { }
  if (charId === 'sonny') extras.push({ at: 'head', draw(g, x, y) { px.rect(g, x - 4, y - 1, 8, 2, '#10101a'); px.rect(g, x - 3, y - 1, 2, 1, '#6ac8ff'); px.rect(g, x + 1, y - 1, 2, 1, '#6ac8ff'); } });          // sunglasses
  if (charId === 'mika' || charId === 'hana') extras.push({ at: 'head', draw(g, x, y) { px.rect(g, x + 2, y - 6, 2, 2, charId === 'mika' ? '#ffffff' : '#ff8ac8'); px.dot(g, x + 3, y - 6, '#ffd24a'); } });   // hair flower
  if (charId === 'gwen') extras.push({ at: 'head', draw(g, x, y) { px.rect(g, x - 4, y - 5, 8, 1, '#ffffff'); } });                                                                                      // sweat band
  if (charId === 'you') extras.push({ at: 'head', draw(g, x, y) { px.rect(g, x - 4, y - 1, 8, 2, '#10101a'); } });                                                                                                      // shades
  const rig = new E.Humanoid({
    size: o.size || 1.0, build: charId === 'ruby' || charId === 'gwen' ? 'heroic' : charId === 'sonny' ? 'bulky' : 'heroic', weapon: null, outfit: 'shirt', sleeves: 'none',
    hair: hs, hat: hatDef, colors: { skin: c.skin, hair: c.hair, cloth, pants, boot: c.skin, belt: pants, trim: cloth, glove: c.skin }
  });
  rig.extras = extras; return rig;
};
// one rig per (character, suit, hat); reused by every scene
G.rig = (charId, suit, hat, size) => {
  const k = charId + '|' + (suit || '') + '|' + (hat || '') + '|' + (size || 1);
  return G.rigCache[k] || (G.rigCache[k] = G.makeRig(charId, { suit, hat, size }));
};
// the player's current look (from the save, or defaults)
G.look = id => {
  const s = G.state;
  if (id === 'you') return { suit: s ? s.suit : 'coral', hat: s ? s.hat : 'none' };
  if (s && s.npcSuit && s.npcSuit[id]) return { suit: s.npcSuit[id], hat: null };
  return { suit: null, hat: null };
};
G.rigOf = (id, size) => { const l = G.look(id); return G.rig(id, l.suit, l.hat, size); };
