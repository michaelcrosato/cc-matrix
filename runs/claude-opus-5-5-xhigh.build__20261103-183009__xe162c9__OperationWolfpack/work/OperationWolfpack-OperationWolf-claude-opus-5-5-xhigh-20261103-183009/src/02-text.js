// WP.TEXT: every visible line (radio, tips, cards, cutscenes, endings). Each radio line has a speaker (a voice and a
// portrait); the text is the subtitle. Written like the source: terse ALL CAPS military calls, a little 80s arcade.
(() => {
const WP = globalThis.WP;
const T = WP.TEXT = {};
const say = (key, who, text) => { T[key] = { who, text }; };
// ---------- radio and tips ----------
say('op1.go', 'DEN', 'OPERATION WOLFPACK IS GO. GOOD HUNTING.');
say('op2.go', 'DEN', 'STAY LOW. THE RIVER IS CRAWLING WITH THEM.');
say('op3.go', 'DEN', 'THE VILLAGERS ARE STILL INSIDE. WATCH YOUR FIRE!');
say('op4.go', 'DEN', 'THIS PLACE IS A POWDER KEG. LIGHT IT UP!');
say('op5.go', 'LOBO', 'THE KENNEL. FIVE HOSTAGES. ZERO MISTAKES.');
say('op6.go', 'DEN', 'OLD HOWLER IS ON THE RUNWAY. GET THEM ABOARD!');
say('tip.aim', 'DEN', '{fire} FIRES. HOLD IT DOWN!');
say('tip.items', 'DEN', 'SHOOT ITEMS TO COLLECT THEM!');
say('tip.grenadeIn', 'DEN', 'GRENADE INCOMING! SHOOT IT DOWN!');
say('tip.reload', 'DEN', '{reload} TO RELOAD. DON\'T RUN DRY!');
say('tip.grenade', 'DEN', '{grenade} THROWS A GRENADE.');
say('tip.knife', 'DEN', 'KNIVES CAN BE SHOT OUT OF THE AIR!');
say('tip.whistle', 'DEN', 'STOP THAT WHISTLE!');
say('tip.headshot', 'DEN', 'BIG ONES GO DOWN FASTER WITH A HEADSHOT.');
say('tip.civilians', 'DEN', 'CIVILIANS! WATCH YOUR FIRE!');
say('tip.barrel', 'FANG', 'RED BARRELS GO BOOM. NICE.');
say('tip.dynamite', 'DEN', 'DYNAMITE HITS EVERYONE ON SCREEN!');
say('tip.flare', 'DEN', 'SHOOT THE FLARE TO LIGHT THE YARD!');
say('tip.noammo', 'DEN', 'NO AMMO! SHOOT CRATES! A SUPPLY DROP IS COMING!');
say('tip.mast', 'DEN', 'BRING DOWN THE RADIO MASTS! SHOOT THE JUNCTION BOX!');
say('tip.bridge', 'FANG', 'SHOOT THE ROPES! DROP THE BRIDGE!');
say('tip.searchlight', 'DEN', 'SEARCHLIGHTS! SHOOT THEM OUT OR THEY SPOT YOU!');
say('tip.escort', 'DEN', 'COVER THE HOSTAGES! DON\'T LET THEM GRAB ANYONE!');
say('tip.fury', 'DEN', 'FURY! UNLIMITED AMMO! LET THEM HAVE IT!');
say('tip.vehicle', 'DEN', 'ENEMY VEHICLE! SHOOT THE GUNNER, THEN THE ENGINE!');
say('tip.air', 'DEN', 'ENEMY AIR SUPPORT IS COMING!');
say('reinf', 'DEN', 'MORE OF THEM ARE COMING!');
say('emergency', 'DEN', 'YOU ARE DRY! EMERGENCY DROP INBOUND!');
say('press.thanks', 'REPORTER', 'THE PRESS THANKS YOU!');
say('hostage.free0', 'HOSTAGE', 'YOU CAME FOR US!');
say('hostage.free1', 'HOSTAGE', 'WOLVES! THANK GOD!');
say('hostage.grab', 'HOSTAGE', 'HELP! THEY HAVE ME!');
say('hostage.board', 'HOSTAGE', 'GO, GO, GO!');
say('chain', 'FANG', 'CHAIN REACTION! BEAUTIFUL!');
say('packFury', 'LOBO', 'PACK FURY! AWOOOO!');
say('spotted', 'DEN', 'YOU ARE SPOTTED! KILL THE LIGHTS!');
say('bridgeOut', 'FANG', 'BRIDGE OUT!');
say('quota', 'DEN', 'TARGETS DOWN. PUSH TO THE OBJECTIVE!');
say('air.in', 'DEN', 'ENEMY AIR SUPPORT IS COMING!');
say('tank.in', 'DEN', 'TANK! HIT IT WITH EVERYTHING!');
say('cargo.in', 'TUNDRA', 'CARGO PLANE OVERHEAD! PARATROOPERS!');
say('op2.bridge', 'FANG', 'ROPE BRIDGE AHEAD. FULL OF HYENAS.');
say('op5.breakout', 'LOBO', 'CELLS ARE OPEN! RUN TO THE BREACH!');
say('op6.escort', 'DEN', 'HOSTAGES ARE ON THE APRON! COVER THEM!');
say('op6.board', 'DEN', 'EVERYBODY ON THE PLANE!');
say('op6.hang', 'DEN', 'HANG ON!');
say('op6.chase', 'MOONSHINE', 'JEEPS ON THE RUNWAY! KEEP THEM OFF THE RAMP!');
say('op6.sam', 'DEN', 'MISSILE TRUCK AT THE END! SHOOT THEM DOWN!');
// ---------- bosses ----------
say('warn.bigEar', 'DEN', "WARNING! SIGNAL TRUCK 'BIG EAR' APPROACHING!");
say('warn.crocodile', 'DEN', "WARNING! GUNBOAT 'CROCODILE' DEAD AHEAD!");
say('warn.warthog', 'DEN', "WARNING! HALF-TRACK 'WARTHOG' IN THE PLAZA!");
say('warn.ironHog', 'DEN', "WARNING! ARMORED TRAIN 'IRON HOG' INBOUND!");
say('warn.tusk', 'DEN', 'WARNING! THE WARDEN, MAJOR TUSK!');
say('warn.hyenaOne', 'DEN', "WARNING! GUNSHIP 'HYENA ONE'! KRAGG IS ABOARD!");
say('bigEar.call', 'DEN', 'THE DISH IS CALLING PARATROOPERS! KILL IT!');
say('bigEar.dish', 'DEN', 'DISH IS DOWN! NOW THE ENGINE!');
say('croc.skiffs', 'FANG', 'IT IS CALLING ITS LITTLE FRIENDS!');
say('croc.bridge', 'DEN', 'GUNS ARE SILENT! HIT THE BRIDGE!');
say('warthog.p2', 'DEN', 'NO MORE FIRE! FINISH THE HULL!');
say('ironHog.p2', 'DEN', 'THE CARS ARE DOWN! THE BOILER! WATCH THE STEAM!');
say('tusk.p2', 'TUSK', 'NOBODY ESCAPES MY KENNEL!');
say('tusk.charge', 'TUSK', 'RAAAH!');
say('hyena.p2', 'DEN', 'PODS ARE GONE! THE NOSE CANNON!');
say('kragg.taunt0', 'KRAGG', 'HA HA HA HA! NOBODY LEAVES MY COAST!');
say('kragg.taunt1', 'KRAGG', 'RUN, LITTLE WOLVES! RUN!');
say('kragg.taunt2', 'KRAGG', 'MY HYENAS ARE HUNGRY!');
say('defeat.bigEar', 'DEN', 'BIG EAR IS DEAF!');
say('defeat.crocodile', 'FANG', 'THE CROCODILE SINKS!');
say('defeat.warthog', 'DEN', 'THE WARTHOG IS SCRAP!');
say('defeat.ironHog', 'TUNDRA', 'END OF THE LINE!');
say('defeat.tusk', 'TUSK', 'I... SURRENDER...');
say('defeat.hyenaOne', 'KRAGG', 'NOOO! MY BEAUTIFUL GUNSHIP!');
// ---------- clears (tally) ----------
T.clear = {
  op1: 'RADIO HILL IS SILENT. THE HYENAS CANNOT CALL FOR HELP!', op2: 'THE RIVER IS OURS. AND WE CAUGHT ONE ALIVE.',
  op3: 'THE VILLAGE IS FREE! THE VILLAGE DOCTOR PATCHES YOU UP.', op4: 'WE TAKE WHAT WE CAN CARRY. THE REST GOES BOOM.',
  op5: '{n} OF 5 HOSTAGES ARE FREE. KRAGG IS RUNNING FOR THE AIRFIELD!', op6: 'OLD HOWLER IS IN THE AIR!'
};
T.perk = {
  commsDown: ['COMMS DOWN', 'FEWER ENEMIES IN LATER OPS. WHISTLES CALL 2, NOT 3.'],
  campLocated: ['CAMP LOCATED', 'SNIPERS AND MORTARS ARE MARKED IN RED.'],
  villageLiberated: ['VILLAGE LIBERATED', 'DAMAGE REPAIRED 40. MORE MEDKITS.'],
  suppliesSeized: ['SUPPLIES SEIZED', 'AMMO AND GRENADES FULL. +2 MAGAZINE POUCH.'],
  hostagesFreed: ['HOSTAGES FREED', '{n} OF 5 COME TO THE AIRFIELD.']
};
// ---------- the briefing ----------
T.briefCards = ['THE BRIMSTONE COAST.', 'GENERAL KRAGG AND HIS HYENA LEGION HAVE TAKEN IT.', 'FIVE RELIEF WORKERS ARE HIS PRISONERS.', 'NO ARMY WILL GO IN. SO THEY SENT THE PACK.'];
T.briefLines = [['DEN', 'WOLFPACK, THIS IS DEN MOTHER. YOUR MISSION: RESCUE THE FIVE HOSTAGES.'], ['DEN', 'AMMUNITION IS LIMITED. SHOOT SUPPLY CRATES TO RESTOCK.'], ['DEN', 'DO NOT SHOOT CIVILIANS. GOOD HUNTING.'], ['LOBO', 'AWOOOO!']];
// ---------- cutscenes ----------
T.interrogation = [['LOBO', 'WHERE ARE THE HOSTAGES?'], ['GIGGS', 'HEE... HEE... I KNOW NOTHING!'], ['LOBO', 'WRONG ANSWER.'], ['GIGGS', 'OKAY! OKAY! THE KENNEL! THE OLD PRISON ON THE CLIFFS!'], ['GIGGS', 'BUT THE ROAD GOES THROUGH PALM VILLAGE AND THE DEPOT. YOU WILL NEVER MAKE IT!'], ['DEN', 'WE WILL SEE ABOUT THAT. WOLFPACK, MOVE OUT.']];
T.aftermath = [['DEN', '{n} OF 5 HOSTAGES ARE FREE.'], ['LOBO', 'NOW WE GET THEM OUT. TO THE AIRFIELD.']];
T.map = {
  op1: 'FIRST, THE RADIO HILL. CUT THEIR EARS OFF.', op2: 'THE MANGROVE RIVER. A PATROL WAITS ON THE WATER.', op3: 'PALM VILLAGE. THE PEOPLE NEED YOU.',
  op4: 'THE POWDER KEG DEPOT. TAKE THEIR SUPPLIES.', op5: 'THE KENNEL. THE HOSTAGES ARE THERE.', op6: 'THE AIRFIELD. OLD HOWLER IS WAITING.'
};
T.ops = {
  op1: ['RADIO HILL', 'DESTROY THE ENEMY RADIO STATION'], op2: ['MANGROVE RUN', 'BREAK THROUGH THE RIVER PATROL'], op3: ['PALM VILLAGE', 'FREE THE VILLAGE. SPARE THE PEOPLE.'],
  op4: ['POWDER KEG DEPOT', 'TAKE THE SUPPLIES. BLOW THE REST.'], op5: ['THE KENNEL', 'RESCUE THE HOSTAGES'], op6: ['LAST FLIGHT OUT', 'GET THEM ON THE PLANE']
};
// ---------- endings ----------
T.endings = {
  5: ['ALL FIVE HOSTAGES ARE SAFE. THE COAST IS FREE.', 'THE PACK HOWLS AT THE RISING SUN.', 'CONGRATULATIONS! YOUR MISSION IS A PERFECT SUCCESS.'],
  3: ['{n} HOSTAGES ARE SAFE. NOT EVERYONE CAME HOME.', 'BUT KRAGG WILL NEVER HURT ANYONE AGAIN.', 'MISSION ACCOMPLISHED.'],
  1: ['ONLY {n} MADE IT. THE PACK WILL REMEMBER THE REST.', 'MISSION OVER.'],
  0: ['THE PLANE FLIES HOME WITH EMPTY SEATS.', 'THE HUNT IS NOT OVER.', 'MISSION FAILED.']
};
T.ending = n => n >= 5 ? T.endings[5] : n >= 3 ? T.endings[3] : n >= 1 ? T.endings[1] : T.endings[0];
T.ranks = ['WOLF PUP', 'LONE WOLF', 'TIMBER WOLF', 'PACK LEADER', 'ALPHA WOLF'];
T.gameOver = 'THE HUNT IS OVER... FOR NOW.';
T.hunt = 'THE HUNT CONTINUES...';
// ---------- the cast ----------
T.hostages = [['DR. AMARA OKONJO', 'DOCTOR'], ['HAL BRODY', 'ENGINEER'], ['LUCIA MARCH', 'REPORTER'], ['"SKIP" TANAKA', 'PILOT'], ['AMB. GRANT WHITFIELD', 'AMBASSADOR']];
T.speakers = { DEN: 'DEN MOTHER', LOBO: 'LOBO', FANG: 'FANG', TUNDRA: 'TUNDRA', MOONSHINE: 'MOONSHINE', KRAGG: 'GEN. KRAGG', TUSK: 'MAJ. TUSK', GIGGS: 'PVT. GIGGS', HOSTAGE: 'HOSTAGE', REPORTER: 'REPORTER', VILLAGER: 'VILLAGER' };
// ---------- HUD words and help ----------
T.hud = { reload: 'RELOAD', reloading: 'RELOADING', noAmmo: 'NO AMMO! SHOOT CRATES!', down: 'DOWN', fury: 'FURY', civHit: 'CIVILIAN HIT!', hostageHit: 'HOSTAGE HIT!', headshot: 'HEADSHOT', armored: 'ARMORED', spotted: 'SPOTTED!', chain: 'CHAIN!', packFury: 'PACK FURY!', join: 'PRESS {start} TO JOIN', demo: 'DEMO PLAY - PRESS ANY BUTTON', grenade: 'GRENADE', snap: 'SNAP', dev: 'DEV' };
T.howto = [
  ['FILL THE QUOTA, BEAT THE BOSS', 'Each operation has counters: soldiers, vehicles, boats, aircraft. Bring them to zero and reach the end. Then the boss comes.'],
  ['SHOOT ITEMS TO COLLECT THEM', 'Crates, barrels and animals carry magazines, grenades and rations. Shoot what drops to take it.'],
  ['SHOOT THE PROJECTILES', 'Grenades, knives, rockets and shells can be shot out of the air. Kill a gunman before his ring closes.'],
  ['DON\'T SHOOT CIVILIANS', 'Villagers and hostages cross the line of fire. Hitting them costs damage and points.'],
  ['RELOAD', 'Magazines run out. Reload by hand, or let it reload itself when empty. Don\'t run dry.'],
  ['GRENADES HIT EVERYTHING NEARBY', 'A grenade lands where you aim. It hurts everyone in the blast, friend or foe.']
];
})();
