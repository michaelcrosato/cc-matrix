// Everyone with a name: how they look (critter generator options) and how they sound.
const V = (arch, pitch, speed = 1, lilt = 1) => ({ arch, pitch, speed, lilt });
export const CAST = {
  dorrit: { name: 'Dorrit', type: 'hearth', tic: 'mmhm', look: { species: 'wombat', c1: 'orange', c2: 'sand', shirt: 'red', trousers: 'orange', shoes: 'plum' }, voice: V(1, -5, 0.9) },
  tavi: { name: 'Tavi', type: 'sunshine', tic: "isn't it?!", look: { species: 'quokka', c1: 'sand', c2: 'white', shirt: 'lime', trousers: 'sand', shoes: 'orange' }, voice: V(0, 6, 1.2, 1.4) },
  bartleby: { name: 'Bartleby', type: 'grouch', tic: "I'd prefer not.", look: { species: 'moose', c1: 'plum', c2: 'orange', shirt: 'slate', trousers: 'plum', shoes: 'ink' }, voice: V(2, -9, 0.75, 0.5) },
  ottoline: { name: 'Lady Ottoline', short: 'Ottoline', type: 'diva', tic: 'darling dear', look: { species: 'platypus', c1: 'orange', c2: 'sand', shirt: 'plum', trousers: 'orange', shoes: 'sand' }, voice: V(3, 3, 0.95, 1.5) },
  rocco: { name: 'Rocco', type: 'gogetter', tic: "let's roll!", look: { species: 'armadillo', c1: 'mist', c2: 'white', shirt: 'red', trousers: 'slate', shoes: 'white' }, voice: V(4, 0, 1.25, 1.1) },
  nib: { name: 'Nib', type: 'dreamer', tic: '…or so the moon says', look: { species: 'lemur', c1: 'mist', c2: 'white', shirt: 'navy', trousers: 'mist', shoes: 'ink' }, voice: V(5, 4, 0.85, 1.3) },
  ozzie: { name: 'Ozzie', type: 'schemer', tic: "You didn't hear it from me.", look: { species: 'possum', c1: 'slate', c2: 'white', shirt: 'ink', trousers: 'slate', shoes: 'ink' }, voice: V(2, 1, 1.15, 0.8) },
  yolanda: { name: 'Yolanda', type: 'auntie', tic: 'hon', look: { species: 'yak', c1: 'orange', c2: 'sand', c3: 'orange', shirt: 'blue', trousers: 'plum', shoes: 'ink' }, voice: V(1, -3, 1, 1.2) },
  fitch: { name: 'Fitch', type: 'hustler', tic: 'no refunds', look: { species: 'ferret', c1: 'sand', c2: 'white', shirt: 'teal', trousers: 'navy', shoes: 'ink' }, voice: V(4, 5, 1.35, 0.9) },
  gander: { name: 'Mrs. Gander', type: 'host', look: { species: 'goose', c1: 'white', c2: 'white', shirt: 'navy', trousers: 'white', shoes: 'orange' }, voice: V(3, 1, 1, 0.7), honk: true },
  clementine: { name: 'Clementine', type: 'host', look: { species: 'capybara', c1: 'orange', c2: 'sand', shirt: 'teal', trousers: 'orange', shoes: 'plum' }, voice: V(1, -6, 0.8, 0.4) },
  trundle: { name: 'Mayor Trundle', type: 'host', look: { species: 'snail', c1: 'lime', c2: 'white', shirt: 'lime', trousers: 'lime' }, voice: V(5, -7, 0.45, 0.5) },
  quill: { name: 'Dr. Quill', type: 'host', look: { species: 'pangolin', c1: 'orange', c2: 'sand', shirt: 'white', trousers: 'orange', shoes: 'plum' }, voice: V(0, 3, 1.15, 1.5) },
  mothwick: { name: 'Madame Mothwick', short: 'Mothwick', type: 'host', look: { species: 'moth', c1: 'mist', c2: 'white', shirt: 'plum', trousers: 'plum', shoes: 'ink' }, voice: V(3, 2, 0.95, 1.6) },
  hester: { name: 'Hester', type: 'host', look: { species: 'llama', c1: 'sand', c2: 'white', shirt: 'navy', trousers: 'navy', shoes: 'ink' }, voice: V(5, -2, 0.95, 1.2) },
  vesper: { name: 'Vesper', type: 'host', look: { species: 'bat', c1: 'plum', c2: 'sand', shirt: 'ink', trousers: 'plum', shoes: 'ink' }, voice: V(5, 5, 0.9, 1.4) },
  rind: { name: 'Old Rind', type: 'host', look: { species: 'stoat', c1: 'orange', c2: 'white', shirt: 'slate', trousers: 'orange', shoes: 'ink' }, voice: V(2, -1, 0.8, 0.5) },
  pimm: { name: 'Inspector Pimm', short: 'Pimm', type: 'host', look: { species: 'crab', c1: 'red', c2: 'orange', shirt: 'red', trousers: 'red', shoes: 'red' }, voice: V(2, 3, 1.3, 0.3) },
  fleece: { name: 'Monsieur Fleece', short: 'Fleece', type: 'host', look: { species: 'alpaca', c1: 'white', c2: 'white', c3: 'plum', shirt: 'ink', trousers: 'ink', shoes: 'ink' }, voice: V(3, 0, 1.05, 1.5) },
  flavia: { name: 'Flavia Rosé', short: 'Flavia', type: 'host', look: { species: 'flamingo', c1: 'red', c2: 'white', shirt: 'red', trousers: 'red', shoes: 'sand' }, voice: V(3, 4, 0.9, 1.6) },
  magda: { name: 'Magda', type: 'host', look: { species: 'magpie', c1: 'ink', c2: 'white', shirt: 'white', trousers: 'ink', shoes: 'ink' }, voice: V(2, 4, 1.1, 0.9) },
  bellows: { name: 'Sir Reginald Bellows', short: 'Bellows', type: 'host', look: { species: 'hippo', c1: 'plum', c2: 'mist', shirt: 'navy', trousers: 'plum', shoes: 'ink' }, voice: V(1, -10, 0.8, 1.6) },
  pemberton: { name: 'Pemberton', type: 'host', look: { species: 'dormouse', c1: 'sand', c2: 'white', shirt: 'teal', trousers: 'sand', shoes: 'ink' }, voice: V(0, 7, 2, 0.6) },
  brisket: { name: 'Agent Brisket', short: 'Brisket', type: 'host', look: { species: 'badger', c1: 'white', c2: 'white', shirt: 'navy', trousers: 'navy', shoes: 'ink' }, voice: V(2, -5, 1, 0.3) },
  lou: { name: 'Languid Lou', short: 'Lou', type: 'host', look: { species: 'sloth', c1: 'plum', c2: 'sand', shirt: 'orange', trousers: 'plum', shoes: 'plum' }, voice: V(1, -8, 0.4, 0.4) },
  nibbles: { name: 'Madame Nibbles', short: 'Nibbles', type: 'host', look: { species: 'goat', c1: 'mist', c2: 'white', shirt: 'plum', trousers: 'mist', shoes: 'ink' }, voice: V(5, 1, 0.9, 1.3) },
  you: { name: 'You', type: 'host', look: {}, voice: V(0, 0, 1, 1) },
  gran: { name: 'Gran', type: 'host', look: {}, voice: V(1, 4, 1, 1) },
  narrator: { name: '', type: 'host', look: {}, voice: V(5, 0, 1, 1), silent: true },
};
export const NEIGHBOURS = ['dorrit', 'tavi', 'bartleby', 'ottoline', 'rocco', 'nib', 'ozzie', 'yolanda', 'fitch'];
export const STAFF_ROOM = { gander: 'store', clementine: 'hall', quill: 'museum', mothwick: 'mothwick', fleece: 'salon', flavia: 'couture', magda: 'magda', bellows: 'theatre', pemberton: 'auction', brisket: 'bureau', lou: 'cafe', nibbles: 'tent' };
export const nameOf = (id) => CAST[id]?.short ?? CAST[id]?.name ?? id;
export const LOVES = { dorrit: ['soup', 'food', 'fruit', 'mushroom', 'cosy'], tavi: ['flower', 'fruit', 'fish', 'bug', 'shell', 'loud', 'plain', 'clean'], bartleby: ['plain', 'wool', 'pine'], ottoline: ['fancy', 'shell', 'pearl', 'art'], rocco: ['fish', 'food', 'loud', 'practical'], nib: ['bug', 'evening', 'flower'], ozzie: ['cheese', 'city', 'junk'], yolanda: ['wool', 'cosy', 'flower'], fitch: ['bag', 'fancy', 'art', 'cheese'] };
export const HATES = { dorrit: ['loud'], tavi: [], bartleby: ['loud', 'fancy'], ottoline: ['junk', 'boot', 'practical'], rocco: ['cosy'], nib: ['loud', 'practical'], ozzie: ['clean'], yolanda: ['fancy'], fitch: ['junk'] };
