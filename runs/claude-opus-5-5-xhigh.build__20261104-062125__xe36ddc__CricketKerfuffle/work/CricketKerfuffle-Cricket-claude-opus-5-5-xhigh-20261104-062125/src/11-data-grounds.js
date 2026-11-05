/* ---- GROUNDS (5) and the Nets. Each is a recipe: the boundary ellipse (rx x ry, centred on the pitch's middle,
 * (0, 160)), the pitch (bounce, turn, seam, pace), the outfield's rolling decay, the default time of day and weather,
 * the palette the floor is painted from, stadium targets (beyond the rope: a ball that flies through one scores a
 * KERFUFFLE BONUS), props (KERFUFFLE: shapes and engine shapes), stands, ends and the chaos pool. To add a ground:
 * a new entry here (and any new shapes in 07-assets-kerfuffle.js); Quick Match lists it. ---- */
const GROUNDS = {
  green: { id: 'green', name: 'Kerfuffle Village Green', short: 'THE VILLAGE GREEN', ends: ['Pavilion End', 'Leaning Wicket End'], rx: 560, ry: 600,
    pitch: { bounce: 1, turn: 1, seam: 1.2, pace: .95 }, k: .55 * 1.25, slope: .08, time: 'day', weather: 'clear', music: 'green', crowd: .6,
    pal: { g1: '#6fae4a', g2: '#5e9c3e', pitch: '#c9b98a', worn: '#b39f6c', out: '#4f8a3a', outTag: 'lane', sky: ['#8fc4ff', '#cfe6ff', '#ffe6b0'], accent: '#2f6b3a', accent2: '#8a2a2a', rope: '#f4f4f0' },
    targets: [
      { id: 'pub', label: 'THE PUB WINDOW', at: [-120, 850, 26], size: [90, 30, 40], bonus: 6, line: 'pub', fx: 'glass', shape: 'KERFUFFLE:pubFront', face: Math.PI * 1.5 },
      { id: 'greenhouse', label: 'THE VICARAGE GREENHOUSE', at: [560, 560, 16], size: [80, 50, 36], bonus: 10, line: 'greenhouse', fx: 'glass', shape: 'KERFUFFLE:greenhouse', face: Math.PI },
      { id: 'weathervane', label: 'THE CHURCH WEATHERVANE', at: [-620, 330, 96], size: [40, 40, 50], bonus: 12, line: 'weathervane', fx: 'spin', shape: 'KERFUFFLE:church', face: 0 },
      { id: 'hive', label: 'THE BEEHIVE', at: [-330, 560, 44], size: [36, 36, 30], bonus: 4, line: 'hive', fx: 'bees', inside: true }
    ],
    props: [['KERFUFFLE:pavilion', 0, -620, Math.PI / 2], ['KERFUFFLE:scoreboardHut', 330, -540, Math.PI / 2], ['KERFUFFLE:oakTree', -330, 560, 0], ['KERFUFFLE:phantomCar', 470, 760, Math.PI],
      ['KERFUFFLE:deckchair', -200, -470, Math.PI / 2], ['KERFUFFLE:deckchair', -170, -478, Math.PI / 2], ['KERFUFFLE:deckchair', 210, 795, -Math.PI / 2], ['KERFUFFLE:roller', 560, -260, 0],
      ['tree', -700, -300, 0], ['tree', 720, 120, 0], ['tree', 680, -380, 0], ['tree', -760, 700, 0], ['bench', 400, -470, Math.PI / 2], ['bench', -420, 760, -Math.PI / 2], ['KERFUFFLE:tent', -560, -360, Math.PI / 2]],
    stands: 'village', chaos: ['cow', 'bees', 'bells', 'mascot'], umpire: 'hollis' },
  hall: { id: 'hall', name: 'Thrumpton Hall', short: 'THRUMPTON HALL', ends: ['Orangery End', 'Hall End'], rx: 620, ry: 620,
    pitch: { bounce: 1, turn: .9, seam: 1.1, pace: 1 }, k: .55 * .8, slope: 0, time: 'day', weather: 'overcast', music: 'hall', crowd: .5,
    pal: { g1: '#5f9f55', g2: '#4f8c48', pitch: '#c4b892', worn: '#ae9f78', out: '#8a8a7a', outTag: 'gravel', sky: ['#9aa6b4', '#b8c2cc', '#cfd6dc'], accent: '#22305a', accent2: '#d8b04a', rope: '#d8b04a', diagonal: true },
    targets: [
      { id: 'fountain', label: 'THE FOUNTAIN', at: [-560, 640, 14], size: [70, 70, 30], bonus: 6, line: 'fountain', fx: 'splash', shape: 'KERFUFFLE:fountain', face: 0 },
      { id: 'carwindscreen', label: "THRUMPTON'S WINDSCREEN", at: [590, 540, 16], size: [70, 40, 26], bonus: 10, line: 'car', fx: 'glass', shape: 'KERFUFFLE:phantomCar', face: Math.PI },
      { id: 'hallwindow', label: 'THE HALL WINDOW', at: [0, 900, 56], size: [160, 30, 50], bonus: 8, line: 'hallwindow', fx: 'glass' }
    ],
    props: [['KERFUFFLE:hallFacade', 0, 960, -Math.PI / 2], ['KERFUFFLE:scoreboardHut', -380, -620, Math.PI / 2], ['KERFUFFLE:peacock', 480, -380, 0], ['pine', -760, -200, 0], ['pine', 760, -100, 0], ['pine', -760, 120, 0], ['KERFUFFLE:deckchair', 300, -640, Math.PI / 2], ['bench', -200, -640, Math.PI / 2]],
    stands: 'terrace', chaos: ['peacocks', 'tray', 'mascot'], umpire: 'neutral' },
  bay: { id: 'bay', name: 'Sunburnt Bay', short: 'SUNBURNT BAY', ends: ['Dunes End', 'Pier End'], rx: 640, ry: 520, seaSide: -1,
    pitch: { bounce: 1.25, turn: .9, seam: 1, pace: 1.15 }, k: .55 * 1.6, slope: 0, runSlow: .85, time: 'day', weather: 'clear', music: 'bay', crowd: .7,
    pal: { g1: '#e8d39a', g2: '#dcc287', pitch: '#d8c49a', worn: '#c4ae80', out: '#e0c88a', outTag: 'sand', sky: ['#3fb8ff', '#7fd4ff', '#bff0ff'], accent: '#1fb5a8', accent2: '#ffd23a', rope: '#ff5a3a', sand: true },
    targets: [
      { id: 'ferris', label: 'THE FERRIS WHEEL', at: [-330, 760, 70], size: [70, 30, 90], bonus: 12, line: 'ferris', fx: 'spin', shape: 'KERFUFFLE:ferrisWheel', face: 0 },
      { id: 'icecream', label: 'THE ICE-CREAM VAN', at: [520, 560, 18], size: [70, 40, 36], bonus: 6, line: 'icecream', fx: 'icecream', shape: 'KERFUFFLE:iceCreamVan', face: Math.PI },
      { id: 'shark', label: 'THE INFLATABLE SHARK', at: [-800, 220, 10], size: [60, 50, 26], bonus: 8, line: 'shark', fx: 'splash', shape: 'KERFUFFLE:inflatableShark', face: 0 }
    ],
    props: [['KERFUFFLE:beachHut', 300, -520, Math.PI / 2], ['KERFUFFLE:beachHut', 360, -520, Math.PI / 2], ['KERFUFFLE:beachHut', 420, -510, Math.PI / 2], ['KERFUFFLE:beachHut', 480, -490, Math.PI / 2], ['KERFUFFLE:pier', -480, 760, 0],
      ['palm', 700, 0, 0], ['palm', 680, 300, 0], ['palm', 640, -300, 0], ['KERFUFFLE:deckchair', 600, 420, Math.PI], ['KERFUFFLE:deckchair', 610, 380, Math.PI], ['KERFUFFLE:scoreboardHut', 60, -560, Math.PI / 2]],
    stands: 'beach', chaos: ['gulls', 'tide', 'mascot'], umpire: 'neutral' },
  downs: { id: 'downs', name: 'Dustbowl Downs', short: 'DUSTBOWL DOWNS', ends: ['Water Tower End', 'Top Hat End'], rx: 600, ry: 600,
    pitch: { bounce: 1.05, turn: 1.3, seam: .9, pace: .9, rough: 1.3 }, k: .55 * .85, slope: 0, bumpy: true, time: 'day', weather: 'clear', storm: true, music: 'downs', crowd: .55,
    pal: { g1: '#a8a85a', g2: '#97974e', pitch: '#d4b37a', worn: '#b8915a', out: '#c8a868', outTag: 'dirt', sky: ['#ffcf8a', '#ffe0b0', '#fff0d0'], accent: '#5a2a7a', accent2: '#c8ccd8', rope: '#c8ccd8' },
    targets: [
      { id: 'tophat', label: 'THE GIANT TOP HAT', at: [-440, 720, 30], size: [70, 70, 60], bonus: 8, line: 'tophat', fx: 'doves', shape: 'KERFUFFLE:topHat', face: 0 },
      { id: 'watertower', label: 'THE WATER TOWER', at: [580, 520, 70], size: [60, 60, 60], bonus: 10, line: 'watertower', fx: 'splash', shape: 'KERFUFFLE:waterTower', face: 0 },
      { id: 'balloon', label: 'THE HOT-AIR BALLOON', at: [0, 900, 130], size: [80, 80, 90], bonus: 15, line: 'balloon', fx: 'pop', moving: true, shape: 'KERFUFFLE:hotAirBalloon', face: 0 }
    ],
    props: [['KERFUFFLE:caravan', 420, -580, Math.PI / 2], ['KERFUFFLE:scoreboardHut', -320, -580, Math.PI / 2], ['KERFUFFLE:umbrellaOpen', 200, -640, 0], ['KERFUFFLE:umbrellaOpen', 240, -650, 0], ['KERFUFFLE:umbrellaOpen', -620, 420, 0], ['cactus', 700, 100, 0], ['cactus', -720, -100, 0], ['rock', 690, -300, 0], ['rock', -700, 300, 0]],
    stands: 'bleachers', chaos: ['rain', 'dustdevil', 'rabbits', 'mascot'], umpire: 'neutral' },
  dome: { id: 'dome', name: 'The Thrumpton Megadome', short: 'THE MEGADOME', ends: ['Old Pavilion End', 'Jumbotron End'], rx: 760, ry: 760,
    pitch: { bounce: 1.1, turn: 1, seam: 1, pace: 1.2 }, k: .55 * .7, slope: 0, time: 'night', weather: 'fog', music: 'dome', crowd: 1,
    pal: { g1: '#2f7a3a', g2: '#286a32', pitch: '#b8a888', worn: '#a09070', out: '#2a2a3a', outTag: 'track', sky: ['#05050f', '#0a0a1e', '#1a1040'], accent: '#7a3aff', accent2: '#ffcf3a', rope: '#7a3aff' },
    targets: [
      { id: 'jumbotron', label: 'THE JUMBOTRON', at: [0, 1060, 110], size: [220, 30, 110], bonus: 15, line: 'jumbotron', fx: 'glitch', shape: 'KERFUFFLE:jumbotron', face: -Math.PI / 2 },
      { id: 'vip', label: 'THE VIP BOX', at: [800, 520, 70], size: [80, 60, 50], bonus: 12, line: 'vip', fx: 'glass', shape: 'KERFUFFLE:vipBox', face: Math.PI },
      { id: 'bell', label: 'THE GHOST BELL', at: [-780, 420, 100], size: [50, 50, 50], bonus: 12, line: 'bell', fx: 'bell', shape: 'KERFUFFLE:ghostBell', face: 0 },
      { id: 'laser', label: 'THE LASER RIG', at: [-560, 980, 110], size: [60, 60, 50], bonus: 8, line: 'laser', fx: 'spark', shape: 'KERFUFFLE:laserRig', face: 0 }
    ],
    props: [['KERFUFFLE:floodlight', -820, -380, 0], ['KERFUFFLE:floodlight', 820, -380, 0], ['KERFUFFLE:floodlight', -820, 720, 0], ['KERFUFFLE:floodlight', 820, 720, 0]],
    stands: 'dome', chaos: ['fog', 'ghosts', 'fireworks', 'advert'], umpire: 'neutral', lights: true },
  nets: { id: 'nets', name: 'The Nets', short: 'THE NETS', ends: ['Net End', 'Machine End'], rx: 520, ry: 560, nets: true,
    pitch: { bounce: 1, turn: 1, seam: 1, pace: 1 }, k: .55, slope: 0, time: 'day', weather: 'clear', music: 'tea', crowd: .15,
    pal: { g1: '#6fae4a', g2: '#62a042', pitch: '#c9b98a', worn: '#b39f6c', out: '#4f8a3a', outTag: 'lane', sky: ['#8fc4ff', '#cfe6ff', '#ffe6b0'], accent: '#2f6b3a', accent2: '#8a2a2a', rope: '#f4f4f0' },
    targets: [], props: [['KERFUFFLE:pavilion', 0, -660, Math.PI / 2], ['tree', -620, -200, 0], ['tree', 640, -100, 0], ['KERFUFFLE:stumps', -110, 0, Math.PI / 2], ['KERFUFFLE:thrumptonator', -110, 330, -Math.PI / 2]], stands: 'village', chaos: [], umpire: 'none',
    // two netted lanes: the one you play in (back and side nets round the batter, open in front so shots run free) and a
    // full practice lane beside it with its own stumps and bowling machine: [x0, y0, x1, y1] panels, 50 units high
    netPanels: [[-26, -40, 26, -40], [-26, -40, -26, 40], [26, -40, 26, 40], [-136, -40, -84, -40], [-136, -40, -136, 300], [-84, -40, -84, 300]] }
};
const GROUND_IDS = ['green', 'hall', 'bay', 'downs', 'dome'];
const UMPIRES = {
  hollis: { name: 'Rev. Hollis', accuracy: .86, slowFinger: 1.2, voice: 150, look: { build: 'heroic', size: 1.18, hair: 'short', hairC: '#d8d8d0', skin: '#f2d0b0', glasses: true, collar: true } },
  neutral: { name: 'Mr Prendergast', accuracy: .92, slowFinger: .5, voice: 140, look: { build: 'heroic', size: 1.18, hair: 'short', hairC: '#5a3a22', skin: '#e0b090' } },
  none: null
};
K.GROUNDS = GROUNDS; K.GROUND_IDS = GROUND_IDS; K.UMPIRES = UMPIRES;
