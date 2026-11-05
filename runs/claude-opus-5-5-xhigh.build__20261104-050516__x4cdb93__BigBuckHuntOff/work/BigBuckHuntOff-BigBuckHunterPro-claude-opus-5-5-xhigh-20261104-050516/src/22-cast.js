// 22-cast: the people of the Hunt-Off as engine Humanoids (portraits in dialog, the Lodge, the bonus hosts) and their names.
const CAST = {
  emcee: { name: 'THE EMCEE', color: '#ffd04a', voice: 'emcee', rig: { size: 1.3, build: 'chibi', weapon: null, outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#e8443a' }, colors: { skin: '#e8b48a', hair: '#3a2418', cloth: '#f0e8d8', coat: '#2a3a6a', pants: '#2a2a3a', boot: '#1a1414', trim: '#e8443a', belt: '#1a1414' } } },
  dub: { name: 'UNCLE DUB', color: '#f0a040', voice: 'dub', rig: { size: 1.3, build: 'bulky', weapon: null, outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#ff6a1a' }, colors: { skin: '#d8a078', hair: '#c8c4bc', cloth: '#7a5a3a', coat: '#8a6a3a', pants: '#4a4a3a', boot: '#3a2a1a', belt: '#2a1e14', trim: '#5a4228' } } },
  granny: { name: 'GRANNY MAE', color: '#f080b0', voice: 'granny', rig: { size: 1.3, build: 'chibi', weapon: null, outfit: 'robe', hair: 'long', colors: { skin: '#f0c8a8', hair: '#d8d4d0', cloth: '#6a7ab8', pants: '#4a4a6a', boot: '#3a2a2a', trim: '#e8d8c8', belt: '#8a4a6a' } } },
  dwayne: { name: 'COUSIN DWAYNE', color: '#7ad04a', voice: 'dwayne', rig: { size: 1.3, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'spiky', colors: { skin: '#e0a880', hair: '#e8c060', cloth: '#5a6a3a', pants: '#4a5a32', boot: '#2a2418', belt: '#1a1a14', trim: '#3a4a28' } } },
  loretta: { name: 'LORETTA PRUITT', color: '#e85a4a', voice: 'loretta', rig: { size: 1.3, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'ponytail', colors: { skin: '#c88a64', hair: '#5a2a1a', cloth: '#c83a2a', pants: '#2a3a5a', boot: '#3a2418', belt: '#2a1a12', trim: '#1e1a1a' } } },
  earl: { name: 'BIG EARL', color: '#8ac8f0', voice: 'earl', rig: { size: 1.3, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', colors: { skin: '#e8b08a', hair: '#6a4a2a', cloth: '#4a6a9a', pants: '#3a5a8a', boot: '#2a1e18', belt: '#3a5a8a', trim: '#e8e0d0' } } }
};
const castRigs = {};
/** a cast member's rig (made once; posed by whoever shows it) */
function castRig(id) { return castRigs[id] || (castRigs[id] = new E.Humanoid(CAST[id].rig)); }
const RIVALS = ['earl', 'loretta', 'dwayne'];
