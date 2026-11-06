// Minutes in Gerald, and what they buy. Cumulative, never spent.
G.UNLOCKS = [
  { at: 5, id: 'towel', name: 'Towel' }, { at: 10, id: 'headband', name: 'Headband' }, { at: 15, id: 'sunhat', name: 'Sunhat' },
  { at: 20, id: 'bowtie', name: "Tare's Bow Tie" }, { at: 25, id: 'spareHat', name: "Gertrude's Spare Hat" }, { at: 30, id: 'friend', name: "Gerald's Friend" }
];
G.LOOKS = {
  hair: ['short', 'spiky', 'long', 'ponytail', 'bald'], hairNames: ['Short', 'Spiky', 'Long', 'Ponytail', 'None'],
  skins: ['#ffdfc4', '#f0c8a0', '#d8a878', '#b98858', '#8e6240', '#5e4030'],
  tops: ['#ff7a59', '#2cc6e6', '#7bd389', '#f5c84b', '#c79be8', '#f6fafa', '#e85d8a', '#5a7fe0'],
  bottoms: ['#20404c', '#6b7a8a', '#3b6ea5', '#8a5a44'],
  names: ['Gentle Doug', 'Sir Slouch', 'Ms. Almost', 'The Other Pat', 'Quiet Alan', 'Big Lorraine', 'Soft Trevor', 'Aunt Maybe', 'Doctor Later', 'Tall Enough', 'Mostly Jan', 'Barely Bruce', 'Humble Gail', 'Mr. Tomorrow', 'Sincere Carol', 'Formerly Dave']
};
G.CAST = {
  gertrude: { name: 'Gertrude', voice: { base: 300, speed: 1.1, wave: 'triangle', vib: 16 }, rig: { hair: 'short', colors: { skin: '#f0d8c8', hair: '#e8e8f0', cloth: '#c7a7e8', coat: '#c7a7e8', pants: '#b08ad8', belt: '#b08ad8', trim: '#ffffff' } }, wear: { spareHat: true } },
  dennis: { name: 'Dennis', voice: { base: 165, speed: .9, wave: 'triangle', vib: 0 }, rig: { hair: 'short', colors: { skin: '#e8c0a0', hair: '#50403a', cloth: '#7bd389', coat: '#7bd389', pants: '#556070', belt: '#556070' } } },
  marisol: { name: 'Marisol', voice: { base: 340, speed: 1.5, wave: 'sine', vib: 0 }, rig: { hair: 'ponytail', hat: { style: 'band', color: '#e85d8a' }, colors: { skin: '#c89868', hair: '#2a1a14', cloth: '#f5c84b', coat: '#f5c84b', pants: '#20404c', belt: '#20404c' } } },
  kevin: { name: 'Young Kevin', voice: { base: 210, speed: 1, wave: 'sine', vib: 3 }, rig: { hair: 'spiky', colors: { skin: '#f0c8a0', hair: '#8a8a88', cloth: '#5a7fe0', coat: '#5a7fe0', pants: '#6b7a8a', belt: '#6b7a8a' } } },
  okafor: { name: 'Mr. Okafor', voice: { base: 150, speed: .95, wave: 'triangle', vib: 2 }, rig: { hair: 'short', colors: { skin: '#6e4a30', hair: '#20181a', cloth: '#ff7a59', coat: '#ff7a59', pants: '#f5c84b', belt: '#f5c84b', trim: '#2cc6e6' } } },
  lou: { name: 'Lou', voice: { base: 120, speed: .7, wave: 'sine', vib: 0 }, rig: { hair: 'bald', colors: { skin: '#e8c8a8', hair: '#a0a0a0', cloth: '#90a4a8', coat: '#90a4a8', pants: '#607078', belt: '#607078' } } },
  twins: { name: 'The Twins', voice: { base: 400, speed: 1.2, wave: 'sine', vib: 0 }, rig: { hair: 'long', colors: { skin: '#ffdfc4', hair: '#c8602a', cloth: '#2cc6e6', coat: '#2cc6e6', pants: '#f6fafa', belt: '#f6fafa' } } }
};
