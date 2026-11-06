// Neighbours: data only. Species looks feed art/critter.js.
export const NEIGHBOURS = [
  { id: 'dorrit', name: 'Dorrit', species: 'wombat', type: 'hearth', tic: '...mmhm', color: 'orange', accent: 'sand', pitch: 0.8, home: [8, 30], house: 'dorrit', loves: ['pear', 'mushroom', 'fish'], hates: ['hat_pot'], hang: [[17, 25], [27, 33]], bed: 22, wake: 7 },
  { id: 'tavi', name: 'Tavi', species: 'quokka', type: 'sunshine', tic: "isn't it?!", color: 'sand', accent: 'orange', pitch: 1.4, home: [16, 34], house: 'tavi', loves: ['hat_straw', 'cabbagebutterfly'], hates: [], hang: [[20, 22], [30, 30]], bed: 23, wake: 6 },
  { id: 'bartleby', name: 'Bartleby', species: 'moose', type: 'grouch', tic: "I'd prefer not.", color: 'slate', accent: 'mist', pitch: 0.6, home: [34, 8], house: 'bartleby', loves: ['rod'], hates: ['hat_top'], hang: [[27, 12], [36, 14]], bed: 21, wake: 8 },
  { id: 'ottoline', name: 'Lady Ottoline', species: 'platypus', type: 'diva', tic: 'darling dear', color: 'plum', accent: 'teal', pitch: 1.1, home: [40, 12], house: 'ottoline', loves: ['seabream', 'goosepearl', 'shell'], hates: ['weed'], hang: [[28, 24], [35, 26]], bed: 24, wake: 9 },
  { id: 'rocco', name: 'Rocco', species: 'armadillo', type: 'gogetter', tic: "let's roll!", color: 'mist', accent: 'red', pitch: 1.0, home: [22, 12], house: 'rocco', loves: ['pike', 'trout', 'sardine'], hates: ['stairs'], hang: [[24, 34], [32, 36]], bed: 22, wake: 5 },
  { id: 'nib', name: 'Nib', species: 'lemur', type: 'dreamer', tic: '...or so the moon says', color: 'lime', accent: 'night', pitch: 1.25, home: [4, 13], house: 'nib', loves: ['firefly', 'moth', 'cricket'], hates: [], hang: [[40, 36], [19, 30]], bed: 25, wake: 10 },
  { id: 'ozzie', name: 'Ozzie', species: 'possum', type: 'schemer', tic: "You didn't hear it from me.", color: 'night', accent: 'sand', pitch: 0.95, home: [48, 24], house: 'ozzie', loves: ['cheese', 'cardboard'], hates: [], hang: [[38, 32], [26, 20]], bed: 24, wake: 8 },
  { id: 'yolanda', name: 'Yolanda', species: 'yak', type: 'auntie', tic: 'hon', color: 'white', accent: 'red', pitch: 0.7, home: [50, 30], house: 'yolanda', loves: ['woollybear', 'hat_wool', 'sweater_orange'], hates: [], hang: [[18, 20], [45, 33]], bed: 22, wake: 7 },
  { id: 'fitch', name: 'Fitch', species: 'ferret', type: 'hustler', tic: 'no refunds', color: 'orange', accent: 'ink', pitch: 1.15, home: [22, 12], house: 'rocco', loves: ['cheese', 'beanbag'], hates: [], hang: [[24, 34], [32, 36]], bed: 24, wake: 9, movesIn: 9 },
];
export const HOSTS = {
  gander: { name: 'Mrs. Gander', species: 'goose', color: 'white', accent: 'orange', pitch: 0.9, tic: 'HONK' },
  clementine: { name: 'Clementine', species: 'capybara', color: 'sand', accent: 'orange', pitch: 0.65 },
  trundle: { name: 'Mayor Trundle', species: 'snail', color: 'lime', accent: 'red', pitch: 0.5 },
  quill: { name: 'Dr. Quill', species: 'pangolin', color: 'orange', accent: 'sand', pitch: 1.3 },
  mothwick: { name: 'Madame Mothwick', species: 'moth', color: 'mist', accent: 'plum', pitch: 1.5 },
  hester: { name: 'Hester', species: 'llama', color: 'white', accent: 'red', pitch: 0.85 },
  vesper: { name: 'Vesper', species: 'bat', color: 'plum', accent: 'sand', pitch: 1.2 },
  rind: { name: 'Old Rind', species: 'stoat', color: 'sand', accent: 'ink', pitch: 0.75 },
  fleece: { name: 'Monsieur Fleece', species: 'alpaca', color: 'sand', accent: 'plum', pitch: 1.1 },
  flavia: { name: 'Flavia Rosé', species: 'flamingo', color: 'red', accent: 'white', pitch: 1.35 },
  magda: { name: 'Magda', species: 'magpie', color: 'ink', accent: 'white', pitch: 1.3 },
  bellows: { name: 'Sir Reginald Bellows', species: 'hippo', color: 'slate', accent: 'red', pitch: 0.55 },
  pemberton: { name: 'Pemberton', species: 'dormouse', color: 'sand', accent: 'blue', pitch: 1.7, fast: true },
  brisket: { name: 'Agent Brisket', species: 'badger', color: 'night', accent: 'white', pitch: 0.7 },
  lou: { name: 'Languid Lou', species: 'sloth', color: 'sand', accent: 'green', pitch: 0.5, slow: true },
  nibbles: { name: 'Madame Nibbles', species: 'goat', color: 'white', accent: 'plum', pitch: 1.0 },
  pimm: { name: 'Inspector Pimm', species: 'hermit', color: 'orange', accent: 'slate', pitch: 1.05 },
};
export const NAME_COLOR = { dorrit: 'orange', tavi: 'sand', bartleby: 'mist', ottoline: 'plum', rocco: 'red', nib: 'lime', ozzie: 'sky', yolanda: 'white', fitch: 'orange' };

export const EXTRA_NPCS = [
  { id: 'trundle', name: 'Mayor Trundle', species: 'snail', type: 'hearth', tic: '...', color: 'lime', accent: 'red', pitch: 0.5, voice: 'gruff', slow: true, home: [8, 16], house: 'hall', hang: [[22, 24], [18, 24], [24, 22], [20, 20]], bed: 24, wake: 6, speedMult: 0.28, host: true },
];
