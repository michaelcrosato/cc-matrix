// Designer data: activities, week, lines, questions, unlocks, classmates.
export const ACTIVITIES = [
  { id:'still-tree', name:'Apologetic Tree', kind:'still', station:'Pavilion', pose:'Tree', ring:0.40, hold:25, breath:0, stars:[45,70,90], day:1, song:'still', clip:'Tree', botKind:'dot' },
  { id:'still-heron', name:'Startled Heron', kind:'still', station:'Pavilion', pose:'Heron', ring:0.36, hold:25, breath:0, bias:0.12, stars:[45,70,90], day:1, song:'still', clip:'Heron', botKind:'dot' },
  { id:'squat', name:'Squats of Regret', kind:'reps', station:'Rep Shed', reps:10, tempo:3.2, stars:[55,75,90], day:1, song:'rep', clip:'SquatRep', botKind:'reps' },
  { id:'hoop', name:'Hoop Economics', kind:'hoop', station:'Beat Beach', dur:60, stars:[35,70,110], day:1, song:'beat', clip:'Idle', botKind:'hoop' },
  { id:'header', name:'Coconut Header', kind:'header', station:'Lagoon', dur:60, stars:[150,400,800], day:2, song:'lagoon', clip:'Idle', botKind:'header' },
  { id:'lunge', name:'Apology Lunges', kind:'reps', station:'Rep Shed', reps:10, tempo:3.2, stars:[55,75,90], day:2, song:'rep', clip:'LungeRep', botKind:'reps' },
  { id:'warrior', name:'Reluctant Warrior', kind:'still', station:'Pavilion', pose:'Warrior', ring:0.32, hold:30, breath:8, noiseY:1.3, stars:[45,70,90], day:2, song:'still', clip:'Warrior', botKind:'dot' },
  { id:'step', name:'Step Class', kind:'step', station:'Beat Beach', dur:74, stars:[55,75,90], day:3, song:'step', clip:'Idle', botKind:'step' },
  { id:'slack', name:'Slackline', kind:'slack', station:'Lagoon', dur:75, dist:30, stars:[1,2,3], day:3, song:'lagoon', clip:'Idle', botKind:'slack' },
  { id:'chair', name:'The Chair Nobody Asked For', kind:'still', station:'Pavilion', pose:'Chair', ring:0.30, hold:30, breath:8, ramp:1.5, stars:[45,70,90], day:3, song:'still', clip:'Chair', botKind:'dot' },
  { id:'tray', name:'Vitamin Tray', kind:'tray', station:'Lagoon', dur:60, stars:[40,60,80], day:4, song:'lagoon', clip:'Idle', botKind:'tray' },
  { id:'press', name:'Overhead Mortgage', kind:'reps', station:'Rep Shed', reps:8, tempo:3.6, stars:[55,75,90], day:4, song:'rep', clip:'Press', botKind:'reps', heavy:true },
  { id:'fold', name:'Tax Season', kind:'still', station:'Pavilion', pose:'Fold', ring:0.28, hold:30, breath:6, bias:0.18, stars:[45,70,90], day:4, song:'still', clip:'Fold', botKind:'dot' },
  { id:'jog', name:'Island Jog', kind:'jog', station:'Jog Path', dur:75, stars:[55,75,90], day:5, song:'jog', clip:'Jog', botKind:'jog' },
  { id:'pier', name:'Pier Jump', kind:'pier', station:'Lagoon', stars:[18,28,38], day:5, song:'lagoon', clip:'Idle', botKind:'pier' },
  { id:'plank', name:'Plank Negotiation', kind:'still', station:'Pavilion', pose:'Plank', ring:0.24, hold:35, breath:6, inst:1.2, stars:[45,70,90], day:5, song:'still', clip:'Plank', botKind:'dot' },
  { id:'longstand', name:'The Long Stand', kind:'longstand', station:'Plaza', dur:90, stars:[45,70,90], day:7, song:'stand', clip:'Idle', botKind:'dot' },
];
export const ACT_BY_ID = Object.fromEntries(ACTIVITIES.map(a => [a.id, a]));
export const STATIONS = [
  { id:'weighin', name:'Weigh-In Terrace', x:0, z:3, color:'cyan' },
  { id:'Pavilion', name:'Pavilion of Holding Still', x:-11, z:3, color:'sky' },
  { id:'Rep Shed', name:'The Rep Shed', x:11, z:3, color:'orange' },
  { id:'Beat Beach', name:'Beat Beach', x:12, z:-10, color:'sand' },
  { id:'Lagoon', name:'Lagoon Games', x:-12, z:-10, color:'teal' },
  { id:'Jog Path', name:'Jogging Path Gate', x:0, z:11, color:'lime' },
  { id:'jar', name:'Sweat Jar', x:4, z:-4, color:'white' },
  { id:'locker', name:'Locker Room', x:-4, z:-4, color:'plum' },
  { id:'hall', name:'Hall of Numbers', x:0, z:-8, color:'slate' },
  { id:'hammock', name:'Hammock', x:14, z:10, color:'green' },
];
export const WEEK = [
  { day:1, test:'Stillness', goal:'Holding Still and one other', goalCheck:(done)=>done.size>=2, beat:'Ferry. Please step on me.' },
  { day:2, test:'Lean', goal:'2 stars in anything', goalCheck:(done,stars)=>Object.values(stars).some(s=>s>=2), beat:'Dennis explains the deck chair. Nobody asked.' },
  { day:3, test:'Chase', goal:'Something you have not done', goalCheck:(done)=>done.size>=1, beat:'Has anyone ever checked that scale?' },
  { day:4, test:'Stillness', goal:'3 activities', goalCheck:(done)=>done.size>=3, beat:'You are leaning. The island is leaning.' },
  { day:5, test:'Lean', goal:'Beat Dennis at anything', goalCheck:()=>false, beat:'Kevin sits on Ounce. The dial reads 7.' },
  { day:6, test:'Chase', goal:'3 stars anywhere', goalCheck:(done,stars)=>Object.values(stars).some(s=>s>=3), beat:'Ounce rehearses a speech, badly.' },
  { day:7, test:'Stillness', goal:'Stand.', goalCheck:(done)=>done.has('longstand'), beat:'The confession.' },
];
export const QUESTIONS = [
  { q:'When you stand up, what sound do you make?', a:['Oof.','Hnng.','I have become the sound.'] },
  { q:'Have you ever apologised to a chair?', a:['Yes.','Not yet.','It started it.'] },
  { q:'How many stairs is too many?', a:['One.','All of them.','Depends who is watching.'] },
  { q:'How do you feel about your ankles?', a:['Fine.','We don\u2019t speak.','Which ones?'] },
  { q:'What is your relationship with the floor?', a:['Distant.','Improving.','It\u2019s complicated.'] },
  { q:'If your knees could talk, what would they say?', a:['Please.','Why.','Nothing. They\u2019ve given up.'] },
  { q:'Are you happy?', a:['Yes.','No.','Is this graded?'] },
];
export const UNLOCKS = [10,25,45,70,100,135,175].map((d,i)=>({ drips:d, name:['Second headband','Towel cape','Confidence: no visible effect','Gold socks','Tiny trophy hat','Disco headband','Crown of Standing'][i], remark:['Noted. A second headband.','A cape. For towels. And now, you.','Confidence fitted. No visible effect.','Gold socks. Your ankles send thanks.','A tiny trophy. It is also a hat.','Disco headband. The light agrees.','A crown. For standing. Mostly.'][i] }));
export const CLASSMATES = {
  Dennis: { skill:'sloppy', score:0.35 }, June: { skill:'good', score:0.75 }, Marguerite: { skill:'expert', score:0.92 },
};
export const LINES = {
  ounce: [
    'Hello! I\u2019m Ounce. Please step on me.','Ow.','That was a joke. I can\u2019t feel pain. I can only keep records.',
    'How old do you feel? This is not binding.','Thank you. I have written that down.',
    'You wobbled 14 times. I only counted the ones you noticed.','Your left side is doing very well. I\u2019ll let your right side know.',
    'No change since yesterday. Which is, in a way, consistent.','Excellent! ...Compared to Dennis.',
    'I\u2019m not angry. Scales don\u2019t get angry. We get accurate.','Have you been stretching? Please don\u2019t lie. I\u2019m very sensitive.',
    'Today\u2019s concern: your ankles. I\u2019ve been concerned all night.','Good morning. You look rested. I can\u2019t see. But you felt rested.',
    'Kevin has been with us eleven years. He has never once held a pose.','This is a recording. The person in it is doing better than you.',
    'I have been adding seven. To everyone. For years. It felt motivating.','See you tomorrow. Bring your knees.',
    'I\u2019d like to weigh in on that.','Noted. Filed. Judged, politely.','Your knees have been noted. Kindly, but noted.',
    'Standing is a team effort. Your left side is carrying.','A wobble is just honesty with momentum.',
  ],
  coach: [
    'You are a tree. A tree does not check its phone.','Your left knee has wandered off. Please collect it.',
    'Breathe in. Not like that.','Good. Again. That was also good. Again.','Hold. You may blink on Thursday.',
    'I am eighty-one. I say this so that you feel something.','Stillness is a muscle. So is regret. We train both here.',
    'The floor is your friend. It has never once let go.','Stand.','You may blink.','Last one.','Last one.','I lied. This is the last one.',
  ],
  classmates: [
    'Marguerite: Both hips, new. Knee, new. Opinions, original.','Dennis: I used to do this professionally. Not this. Something near it.',
    'Dennis: It\u2019s fine. It\u2019s just the one leg.','June: I\u2019m pacing myself.','June: My gran says you\u2019re doing your best. She said it very slowly.',
    'Marguerite: Has anyone ever checked that scale?','Coach: You are leaning.','Ounce: The island is leaning.',
  ],
};
// Activity result lines by stars (0-3). Plus generic pool to reach 120+ lines.
export const RESULT_LINES = {
  0:['Noted. The circle remembers your visit.','A bold interpretation of stillness.','The floor sends its regards.'],
  1:['Recorded. One star, filed with care.','Steady enough to mention at dinner.','Your ankles cooperated. Mostly.'],
  2:['Two stars. Your knees have been informed.','Very steady. Dennis has questions.','Filed under: quietly impressive.'],
  3:['Three stars. I have underlined this.','Excellent. I shall tell the jar.','Marguerite nodded. Once. That is a lot.'],
};
export const EXTRA_LINES = Array.from({length:80},(_,i)=>[
  'Noted.','Filed.','Your posture has been archived.','The circle approves, quietly.','Knees: present.','Balance: witnessed.',
  'A careful wobble.','Standing: achieved.','Your centre sends thanks.','The dial is calm. So are you. Nearly.',
][i%10] + ' (' + (i+1) + ')');
export function allLines(){ return [...LINES.ounce, ...LINES.coach, ...LINES.classmates, ...Object.values(RESULT_LINES).flat(), ...EXTRA_LINES]; }
