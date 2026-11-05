/* ---- MISSIONS: metadata over the levels: titles, the briefing and debrief scenes, the suggested bento, par times, the
 * order of the story. The Shadow Trial ("Night Delivery") is a mission of its own outside the story ---- */
B.def('mission', 'training', { title: 'The Trial of the Second Tier', level: 'training', briefing: 'prologue', debrief: 'training_end', par: 420, next: 'm1', chapter: 'Prologue',
  loadoutHint: [['riceball', 2], ['firecracker', 1], ['poisonball', 1], ['smoke', 1], ['shuriken', 6]], objectivesCard: ['Pass Granny\'s trial in the back yard', 'Three Silent Marks, a sleeping radish, a sparring monk'] });
B.def('mission', 'm1', { title: 'Rice and Ash', level: 'm1', briefing: 'briefing1', debrief: 'debrief1', par: 720, next: 'm2', chapter: 'Chapter One',
  loadoutHint: [['riceball', 3], ['shuriken', 10], ['smoke', 2], ['poisonball', 2], ['firecracker', 2], ['caltrops', 1]], objectivesCard: ['Silence Magistrate Kanemori at his feast', 'Find what he hides', 'Escape by the canal boat'] });
B.def('mission', 'm2', { title: 'The Fort at Kiri Lake', level: 'm2', briefing: 'briefing2', debrief: 'debrief2', par: 900, next: 'm3', chapter: 'Chapter Two',
  loadoutHint: [['riceball', 3], ['shuriken', 10], ['smoke', 2], ['caltrops', 2], ['firecracker', 2], ['dango', 2]], objectivesCard: ['Free Tobei from the Red Lanterns\' fort', 'Open the water gate and bring him home', 'Cut the rice barges loose'] });
B.def('mission', 'm3', { title: 'Moon over Kokaku', level: 'm3', briefing: 'briefing3', debrief: 'ending', par: 960, next: null, chapter: 'Chapter Three',
  loadoutHint: [['riceball', 3], ['shuriken', 10], ['smoke', 2], ['firepot', 1], ['plum', 2], ['firecracker', 2]], objectivesCard: ['Find the poisoned sake before the moon is high', 'Climb the keep', 'Face Kurogane at the top'] });
B.def('mission', 'delivery', { title: 'Night Delivery', level: 'delivery', briefing: null, debrief: null, par: 300, next: null, chapter: 'Shadow Trial', trial: true,
  loadoutHint: [['riceball', 2], ['shuriken', 10], ['smoke', 2], ['poisonball', 1], ['firecracker', 2], ['caltrops', 1]], objectivesCard: ['Silence Sakubei the rice broker', 'Leave by the canal gate', 'Fast, unseen, and with Silent Cuts'] });
const STORY_ORDER = ['training', 'm1', 'm2', 'm3'];
B.STORY_ORDER = STORY_ORDER;
