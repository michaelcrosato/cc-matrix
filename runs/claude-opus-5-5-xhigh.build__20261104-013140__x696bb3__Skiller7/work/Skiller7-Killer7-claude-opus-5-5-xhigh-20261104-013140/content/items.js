/* Items, Lift Pins and Dossier pages (§7.12, §11.10). */
S7.item('servicekey', { name: 'Service Key', kind: 'key', icon: 'key', line: 'A brass key on a red tassel. STAFF ONLY, it says, in a hand that never smiled.' });
S7.item('edelweiss', { name: 'Edelweiss Pass', kind: 'key', icon: 'flower', line: 'A delegate\'s pass, pressed like a flower. The gondola wants three.' });
S7.item('ember', { name: 'Ember Charm', kind: 'key', icon: 'ember', line: 'A coal that never cooled, in a cage of silver. Ice weeps when it comes near.' });
S7.item('grauBell', { name: 'Grau\'s Bell', kind: 'story', icon: 'bell', line: 'A small brass service bell. It rings by itself at seven.' });

S7.PINS = [
  { name: 'PIZ NADA — HIGHER THAN YOU THINK', line: 'They say three thousand metres. The mountain says otherwise.', area: '00A' },
  { name: 'GRAND HOTEL NADA — ROOMS 1–316', line: 'There is no Room 7. There never was. Don\'t knock.', area: '00B' },
  { name: 'OBERGLÜCK CHRISTMAS MARKET', line: 'The Glühwein is warm. That\'s how they get you.', area: '01A' },
  { name: 'THAW ACCORD — SIGN HERE', line: 'Treaties are written in pencil and signed in pen.', area: '01B' },
  { name: 'I SURVIVED THE BLACK RUN', line: 'Seven didn\'t.', area: '01C' },
  { name: 'HIMMELSBAHN — HOLD ON TIGHT', line: 'I held on. The lift let go.', area: '01D' },
  { name: '1926 TEAM — EIGHT FOR GOLD', line: 'Eight on the lift. Seven on the wall. One in the bed.', area: '01E' }
];

S7.DOSSIER = {
  t00: { title: 'TARGET 00 — AUGUSTIN GRAU', tab: 'targets', text: 'Bell captain, Grand Hotel Nada. Forty-one years of service. Never late. Never smiled.\n\nSmiling since Tuesday.' },
  t01: { title: 'TARGET 01 — HANSI PULVER', tab: 'targets', text: 'Three Olympic golds. The face of Nada chocolate. Instructor to presidents.\n\nListed by the Department: WARM FRONT — COMMANDER.' },
  graufile: { title: 'Grau\'s employee file', tab: 'documents', text: 'Hired 1984. Promoted 1991. Commended for discretion eleven times.\n\nNotes: carries guests\' luggage without asking what is inside. Recommended.' },
  roomservice: { title: 'Room service: the Bellcaptain\'s specials', tab: 'documents', text: 'Turn-down service. Wake-up call. Late checkout.\n\nEarly checkout. Very early. Ask at the desk.' },
  accord: { title: 'The Thaw Accord, Article Nine', tab: 'documents', text: 'The Free Canton of Piz Nada shall open the Glacier Archive. Every account. Every name.\n\nEvery body. In trust.' },
  avalanche1926: { title: 'The Avalanche of 1926', tab: 'documents', text: 'A clipping. A chairlift of eight young skiers, the national team, caught on the Black Run. One survivor, a girl of four... no. Of fourteen.\n\nThe photograph shows eight. Count again.' },
  standingorders: { title: 'Department of Discretion: Standing Orders', tab: 'documents', text: '1. Discretion.\n2. See 1.' },
  pricelist: { title: 'The ski school price list', tab: 'documents', text: 'Group lesson: 40.\nPrivate lesson: 80.\nPrivate lesson, no questions: 800.' },
  exposure1: { title: 'Exposure: the blackboard', tab: 'exposures', text: 'Under a cartoon of a chairlift, in invisible ink:\n\nTHE DAY THE EIGHT WENT UP: 26 · 01' },
  exposure2: { title: 'Exposure: the ledger', tab: 'exposures', text: 'ACCOUNT 7 — HOLDER: H. HOLLE\nCONTENTS: SEVEN (7) PERSONS, DECEASED 26.1.1926\n— IN TRUST.' },
  hansiShot: { title: 'Note: the interview (shot)', tab: 'targets', text: 'He talked. You listened. Then you didn\'t.\n\nThe chairlift kept swinging.' },
  hansiFell: { title: 'Note: the interview (fell)', tab: 'targets', text: 'You hesitated. He noticed.\n\nHe let go of the chair. The fog took the rest.' }
};
