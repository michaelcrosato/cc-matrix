// Every visible string of the game: radio, cards, tips, cutscenes, endings, HUD words, help, About.
(() => {
const WP = globalThis.WP;
const L = (who, text) => ({ who, text });
WP.TEXT = {
  title: 'OPERATION BIG BAD WOLF',
  tagline: 'EVERY BULLET COUNTS. BRING THEM HOME.',
  // briefing
  'brief.cards': ['THE BRIMSTONE COAST.', 'GENERAL KRAGG AND HIS HYENA LEGION HAVE TAKEN IT.', 'FIVE RELIEF WORKERS ARE HIS PRISONERS.', 'NO ARMY WILL GO IN. SO THEY SENT THE PACK.'],
  'brief.1': L('DEN', 'WOLFPACK, THIS IS DEN MOTHER. YOUR MISSION: RESCUE THE FIVE HOSTAGES.'),
  'brief.2': L('DEN', 'AMMUNITION IS LIMITED. SHOOT SUPPLY CRATES TO RESTOCK.'),
  'brief.3': L('DEN', 'DO NOT SHOOT CIVILIANS. GOOD HUNTING.'),
  'brief.4': L('LOBO', 'AWOOOO!'),
  // op starts
  'op1.go': L('DEN', 'OPERATION BIG BAD WOLF IS GO. GOOD HUNTING.'),
  'op2.go': L('DEN', 'STAY LOW. THE RIVER IS CRAWLING WITH THEM.'),
  'op3.go': L('DEN', 'THE VILLAGERS ARE STILL INSIDE. WATCH YOUR FIRE!'),
  'op4.go': L('DEN', 'THIS PLACE IS A POWDER KEG. LIGHT IT UP!'),
  'op5.go': L('LOBO', 'THE KENNEL. FIVE HOSTAGES. ZERO MISTAKES.'),
  'op6.go': L('DEN', 'OLD HOWLER IS ON THE RUNWAY. GET THEM ABOARD!'),
  'op6.board': L('DEN', 'EVERYBODY ON THE PLANE!'),
  'op6.lift': L('DEN', 'HANG ON!'),
  'op6.sam': L('FANG', 'MISSILES! SHOOT THEM DOWN!'),
  // map lines (DEN, for the next op)
  'map.1': 'FIRST, SILENCE THEIR RADIO ON THE HILL.',
  'map.2': 'TAKE THE RIVER. FIND OUT WHERE THE HOSTAGES ARE.',
  'map.3': 'PALM VILLAGE STANDS IN THE WAY. SPARE THE PEOPLE.',
  'map.4': 'THE DEPOT HOLDS THEIR AMMUNITION. TAKE WHAT YOU NEED.',
  'map.5': 'THE KENNEL. THE HOSTAGES ARE INSIDE. GO NOW.',
  'map.6': 'KRAGG RUNS FOR THE AIRFIELD. OLD HOWLER WAITS.',
  // tips (first time)
  'tip.aim': L('DEN', 'AIM AND HOLD {fire} TO FIRE!'),
  'tip.items': L('DEN', 'SHOOT ITEMS TO COLLECT THEM!'),
  'tip.grenadeIn': L('DEN', 'GRENADE INCOMING! SHOOT IT DOWN!'),
  'tip.reload': L('DEN', '{reload} TO RELOAD. DON\'T RUN DRY!'),
  'tip.grenade': L('DEN', '{grenade} THROWS A GRENADE.'),
  'tip.knife': L('DEN', 'KNIVES CAN BE SHOT OUT OF THE AIR!'),
  'tip.whistle': L('DEN', 'STOP THAT WHISTLE!'),
  'tip.brute': L('DEN', 'BIG ONES GO DOWN FASTER WITH A HEADSHOT.'),
  'tip.civ': L('DEN', 'CIVILIANS! WATCH YOUR FIRE!'),
  'tip.dynamite': L('DEN', 'DYNAMITE HITS EVERYONE ON SCREEN!'),
  'tip.flare': L('DEN', 'SHOOT THE FLARE TO LIGHT THE YARD!'),
  'tip.masts': L('DEN', 'TOPPLE ALL THREE RADIO MASTS!'),
  'tip.rope': L('FANG', 'SHOOT THE ROPES! DROP THAT BRIDGE!'),
  'tip.searchlight': L('TUNDRA', 'SEARCHLIGHTS! SHOOT THEM OUT!'),
  'tip.fury': L('DEN', 'FURY! UNLIMITED AMMUNITION! GIVE THEM EVERYTHING!'),
  // alerts
  more: L('DEN', 'MORE OF THEM ARE COMING!'),
  air: L('FANG', 'ENEMY AIR SUPPORT IS COMING!'),
  armor: L('TUNDRA', 'ARMOR ON THE ROAD!'),
  bridge: L('FANG', 'BRIDGE OUT!'),
  spotted: L('TUNDRA', 'WE ARE SPOTTED!'),
  breakout: L('LOBO', 'CELLS ARE OPEN! COVER THEM!'),
  resupply: L('DEN', 'EMERGENCY DROP. IT IS NOT FREE, WOLFPACK.'),
  chain: L('MOONSHINE', 'CHAIN REACTION!'),
  press: L('REPORTER', 'THE PRESS THANKS YOU!'),
  thanks: L('VILLAGER', 'THANK YOU!'),
  'hostage.free': L('HOSTAGE', 'YOU CAME FOR US!'),
  'hostage.grab': L('HOSTAGE', 'HELP! THEY HAVE ME!'),
  'hostage.board': L('HOSTAGE', 'GO, GO, GO!'),
  'hostage.lost': L('DEN', 'WE LOST ONE. KEEP GOING.'),
  'kragg.1': L('KRAGG', 'HA HA HA HA! NOBODY LEAVES MY COAST!'),
  'kragg.2': L('KRAGG', 'RUN, LITTLE WOLVES! RUN!'),
  'kragg.3': L('KRAGG', 'MY HYENAS ARE HUNGRY!'),
  'kragg.4': L('KRAGG', 'NOOO! MY BEAUTIFUL GUNSHIP!'),
  'tusk.1': L('TUSK', 'NOBODY BREAKS OUT OF MY KENNEL!'),
  'tusk.2': L('TUSK', 'ENOUGH! I SURRENDER!'),
  // bosses
  'boss.bigEar': L('DEN', 'WARNING! SIGNAL TRUCK \'BIG EAR\' APPROACHING!'),
  'boss.crocodile': L('DEN', 'WARNING! GUNBOAT \'CROCODILE\' DEAD AHEAD!'),
  'boss.warthog': L('DEN', 'WARNING! HALF-TRACK \'WARTHOG\' IN THE PLAZA!'),
  'boss.ironHog': L('DEN', 'WARNING! ARMORED TRAIN \'IRON HOG\' INBOUND!'),
  'boss.tusk': L('DEN', 'WARNING! THE WARDEN, MAJOR TUSK!'),
  'boss.hyenaOne': L('DEN', 'WARNING! GUNSHIP \'HYENA ONE\'! KRAGG IS ABOARD!'),
  // clears
  'clear.1': L('DEN', 'RADIO HILL IS SILENT. THE HYENAS CANNOT CALL FOR HELP!'),
  'clear.2': L('DEN', 'THE RIVER IS OURS. AND WE CAUGHT ONE ALIVE.'),
  'clear.3': L('DEN', 'THE VILLAGE IS FREE! THE VILLAGE DOCTOR PATCHES YOU UP.'),
  'clear.4': L('DEN', 'WE TAKE WHAT WE CAN CARRY. THE REST GOES BOOM.'),
  'clear.5': L('DEN', '{n} OF 5 HOSTAGES ARE FREE. KRAGG IS RUNNING FOR THE AIRFIELD!'),
  'clear.6': L('DEN', 'HYENA ONE IS DOWN. TAKE US HOME, SKIP.'),
  // interrogation
  'int.1': L('LOBO', 'WHERE ARE THE HOSTAGES?'),
  'int.2': L('GIGGS', 'HEE... HEE... I KNOW NOTHING!'),
  'int.3': L('LOBO', 'WRONG ANSWER.'),
  'int.4': L('GIGGS', 'OKAY! OKAY! THE KENNEL! THE OLD PRISON ON THE CLIFFS!'),
  'int.5': L('GIGGS', 'BUT THE ROAD GOES THROUGH PALM VILLAGE AND THE DEPOT. YOU WILL NEVER MAKE IT!'),
  'int.6': L('DEN', 'WE WILL SEE ABOUT THAT. WOLFPACK, MOVE OUT.'),
  // aftermath and endings
  'after.1': '{n} OF 5 HOSTAGES ARE FREE.',
  'end.5': ['ALL FIVE HOSTAGES ARE SAFE. THE COAST IS FREE.', 'THE PACK HOWLS AT THE RISING SUN.', 'CONGRATULATIONS! YOUR MISSION IS A PERFECT SUCCESS.'],
  'end.3': ['{n} HOSTAGES ARE SAFE. NOT EVERYONE CAME HOME.', 'BUT KRAGG WILL NEVER HURT ANYONE AGAIN.', 'MISSION ACCOMPLISHED.'],
  'end.1': ['ONLY {n} MADE IT. THE PACK WILL REMEMBER THE REST.', 'MISSION OVER.'],
  'end.0': ['THE PLANE FLIES HOME WITH EMPTY SEATS.', 'THE HUNT IS NOT OVER.', 'MISSION FAILED.'],
  'end.more': 'THE HUNT CONTINUES...',
  gameover: 'THE HUNT IS OVER... FOR NOW.',
  // op cards
  ops: [
    ['RADIO HILL', 'DESTROY THE ENEMY RADIO STATION'],
    ['MANGROVE RUN', 'BREAK THROUGH THE RIVER PATROL'],
    ['PALM VILLAGE', 'FREE THE VILLAGE. SPARE THE PEOPLE.'],
    ['POWDER KEG DEPOT', 'TAKE THE SUPPLIES. BLOW THE REST.'],
    ['THE KENNEL', 'RESCUE THE HOSTAGES'],
    ['LAST FLIGHT OUT', 'GET THEM ON THE PLANE']
  ],
  perks: {
    commsDown: ['COMMS DOWN', 'FEWER ENEMIES FROM NOW ON. WHISTLES CALL TWO, NOT THREE.'],
    camp: ['CAMP LOCATED', 'SNIPERS AND MORTARS ARE MARKED IN RED.'],
    village: ['VILLAGE LIBERATED', 'DAMAGE REPAIRED. MORE MEDKITS FROM NOW ON.'],
    supplies: ['SUPPLIES SEIZED', 'AMMUNITION REFILLED. YOUR POUCH HOLDS TWO MORE MAGAZINES.'],
    hostages: ['HOSTAGES FREED', '{n} OF 5 COME WITH YOU TO THE AIRFIELD.']
  },
  ranks: ['WOLF PUP', 'LONE WOLF', 'TIMBER WOLF', 'PACK LEADER', 'ALPHA WOLF'],
  hud: { reload: 'RELOAD', reloading: 'RELOADING', noAmmo: 'NO AMMO! SHOOT CRATES!', down: 'DOWN', fury: 'FURY', damage: 'DAMAGE', join: 'PRESS {start} TO JOIN', civ: 'CIVILIAN HIT!', hostageHit: 'HOSTAGE HIT!', headshot: 'HEADSHOT', packFury: 'PACK FURY!', bridgeOut: 'BRIDGE OUT!', spotted: 'SPOTTED!', armored: 'ARMORED', resupplyFee: 'RESUPPLY FEE', warning: 'WARNING!', go: 'GO!', ready: 'GET READY', chain: 'CHAIN!', intercept: 'INTERCEPT', demo: 'DEMO PLAY - PRESS ANY BUTTON', dev: 'DEV' },
  menu: { start: 'START MISSION', squad: 'SQUAD', select: 'MISSION SELECT', scores: 'HIGH SCORES', settings: 'SETTINGS', about: 'ABOUT / CREDITS' },
  touch: ['CONTROLLER OR KEYBOARD REQUIRED', 'CONNECT A CONTROLLER OR PRESS A KEY TO PLAY.'],
  help: [
    'FILL THE ENEMY QUOTA, REACH THE END, BEAT THE BOSS.',
    'SHOOT CRATES, BARRELS AND ANIMALS FOR SUPPLIES. SHOOT ITEMS TO COLLECT THEM.',
    'SHOOT GRENADES, KNIVES, ROCKETS AND SHELLS OUT OF THE AIR.',
    'KILL A SHOOTER BEFORE ITS RING CLOSES, OR YOUR DAMAGE RISES.',
    'DON\'T SHOOT CIVILIANS OR HOSTAGES.',
    'RELOAD BEFORE YOU RUN DRY. GRENADES HIT EVERYTHING NEARBY.'
  ]
};
// speakers: name on the radio, portrait preset, voice profile
WP.SPEAKERS = {
  DEN: { name: 'DEN MOTHER', rig: 'den', voice: 'den' }, LOBO: { name: 'LOBO', rig: 'lobo', voice: 'lobo' },
  FANG: { name: 'FANG', rig: 'fang', voice: 'fang' }, TUNDRA: { name: 'TUNDRA', rig: 'tundra', voice: 'tundra' },
  MOONSHINE: { name: 'MOONSHINE', rig: 'moonshine', voice: 'moonshine' }, KRAGG: { name: 'GEN. KRAGG', rig: 'kragg', voice: 'kragg' },
  TUSK: { name: 'MAJOR TUSK', rig: 'tusk', voice: 'tusk' }, GIGGS: { name: 'PVT. GIGGS', rig: 'giggs', voice: 'giggs' },
  HOSTAGE: { name: 'HOSTAGE', rig: 'h0', voice: 'hostage' }, VILLAGER: { name: 'VILLAGER', rig: 'villager', voice: 'villager' },
  REPORTER: { name: 'L. MARCH', rig: 'h2', voice: 'hostage' }
};
WP.HOSTAGES = [['DR. AMARA OKONJO', 'h0'], ['HAL BRODY', 'h1'], ['LUCIA MARCH', 'h2'], ['"SKIP" TANAKA', 'h3'], ['AMB. GRANT WHITFIELD', 'h4']];
// fill {fire} {reload} {grenade} {start} {n} from an input and values
WP.fill = (s, input, vars = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => vars[k] !== undefined ? vars[k] : input && input.label ? String(input.label(k)).toUpperCase() : k.toUpperCase());
})();
