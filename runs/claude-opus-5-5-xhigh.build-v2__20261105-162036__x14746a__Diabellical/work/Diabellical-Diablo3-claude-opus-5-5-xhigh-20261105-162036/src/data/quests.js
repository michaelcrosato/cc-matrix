// The story, in five quests. The sim (src/sim/quests.js) runs them; text and order live here.
export const QUESTS = [
  { id: 'wipe_feet', name: 'WIPE YOUR FEET', steps: [
    { id: 'wake', text: 'PUT THE PEATWALKERS BACK DOWN' },
    { id: 'east', text: 'FOLLOW THE WALL EAST' },
    { id: 'coffin', text: 'THE GATE IS SHUT. OPEN THE UNQUIET COFFIN' },
    { id: 'gate', text: 'GO THROUGH THE GATE TO TOLLHAVEN' },
    { id: 'crier', text: 'SPEAK TO CRIER MAUDLIN' },
  ] },
  { id: 'weeping_causeway', name: 'THE WEEPING CAUSEWAY', steps: [
    { id: 'to_causeway', text: 'TAKE THE ROAD GATE TO THE CAUSEWAY' },
    { id: 'find_brasse', text: 'FIND DAME BRASSE AT THE FAR END OF THE CAUSEWAY' },
    { id: 'escort', text: 'GET THE WAGON OF BELLS HOME. STAY NEAR IT' },
    { id: 'brasse_home', text: 'SPEAK TO DAME BRASSE IN TOLLHAVEN' },
  ] },
  { id: 'saint_gloam', name: "SAINT GLOAM'S BONES", steps: [
    { id: 'see_ogive', text: 'SPEAK TO MOTHER OGIVE' },
    { id: 'bone1', text: 'FIND THE FIRST BONE IN THE OSSUARY' },
    { id: 'bone2', text: 'FIND THE SECOND BONE, A FLOOR DOWN' },
    { id: 'bone3', text: 'FIND THE THIRD BONE, A FLOOR DOWN AGAIN' },
    { id: 'bursar', text: 'SOMETHING IS KEEPING ACCOUNTS. FIND THE COUNTING HOUSE' },
    { id: 'ledger', text: "TAKE THE LEDGER FROM THE BURSAR'S BODY" },
    { id: 'ogive_home', text: 'BRING THE BONES TO MOTHER OGIVE' },
  ] },
  { id: 'cinder_cloister', name: 'THE CINDER CLOISTER', steps: [
    { id: 'see_crier', text: 'TELL THE CRIER ABOUT THE LEDGER' },
    { id: 'to_cloister', text: 'TRAVEL TO THE CINDER CLOISTER' },
    { id: 'novices', text: 'FIND THE LAST NOVICES AND DEFEND THEM' },
    { id: 'bishop', text: 'CONFRONT BISHOP AMBROSE IN THE CHAPTER HOUSE' },
    { id: 'crier_truth', text: 'HEAR WHAT THE CRIER HAS TO READ' },
  ] },
  { id: 'ring_it', name: 'RING IT OR DIE TRYING', steps: [
    { id: 'to_belfry', text: 'TRAVEL TO THE CRACKED BELFRY' },
    { id: 'climb', text: 'CLIMB TO THE BELL CHAMBER' },
    { id: 'malison', text: 'FACE MALISON BENEATH THE BELL' },
    { id: 'ring', text: 'RING OLD CLEMENCY. HOLD ON THE ROPES' },
  ] },
];
export const stepOf = (q, s) => QUESTS[q]?.steps[s] ?? null;

export const WRIT_TEMPLATES = [
  { k: 'kill', zone: 'causeway', n: 40, text: 'CLEAR 40 THINGS OFF THE CAUSEWAY' },
  { k: 'kill', zone: 'ossuary', n: 60, text: 'CLEAR 60 THINGS OUT OF THE OSSUARY' },
  { k: 'kill', zone: 'cloister', n: 50, text: 'PUT DOWN 50 THINGS IN THE CLOISTER' },
  { k: 'kill', zone: 'yard', n: 15, text: 'TIDY 15 THINGS IN ST. CLEMENT\'S YARD' },
  { k: 'boss', boss: 'bursar', zone: 'ossuary', text: 'DISSOLVE THE BURSAR AGAIN' },
  { k: 'boss', boss: 'cellarer', zone: 'pantry', text: 'EVICT THE CELLARER' },
  { k: 'coffin', zone: 'causeway', text: 'OPEN AN UNQUIET COFFIN ON THE CAUSEWAY' },
  { k: 'coffin', zone: 'ossuary', text: 'OPEN AN UNQUIET COFFIN IN THE OSSUARY' },
  { k: 'coffin', zone: 'cloister', text: 'OPEN AN UNQUIET COFFIN IN THE CLOISTER' },
];

export const KNELL_MODS = {
  crowded: { name: 'CROWDED', desc: '+40% MONSTERS', icon: 'summon-icon' },
  swift: { name: 'SWIFT', desc: '+20% MONSTER SPEED', icon: 'dash-icon' },
  haunted: { name: 'HAUNTED', desc: 'EXTRA ELITES', icon: 'curse-icon' },
  golden: { name: 'GOLDEN', desc: '+100% GOLD', icon: 'gold-icon' },
  dark: { name: 'DARK', desc: 'ONLY YOUR OWN LIGHT', icon: 'lock' },
  volatile: { name: 'VOLATILE', desc: 'THE DEAD EXPLODE', icon: 'fireball-icon' },
};
export const KNELL_MOD_IDS = Object.keys(KNELL_MODS);
