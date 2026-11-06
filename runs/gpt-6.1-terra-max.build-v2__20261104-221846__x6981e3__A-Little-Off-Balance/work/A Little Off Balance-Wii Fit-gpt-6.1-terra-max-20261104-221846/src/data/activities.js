export const ACTIVITIES = [
  { id:'tree', name:'Apologetic Tree', family:'still', place:'Pavilion', day:1, duration:25, ring:.40, instruction:'KEEP YOUR DOT IN THE RING', quip:'THE TREE ACCEPTS YOUR APOLOGY.' },
  { id:'heron', name:'Startled Heron', family:'still', place:'Pavilion', day:1, duration:25, ring:.36, instruction:'LEAN AGAINST THE WANDERING WIND', quip:'A MOST RESPECTABLE BIRD.' },
  { id:'squats', name:'Squats of Regret', family:'reps', place:'Rep Shed', day:1, duration:38.4, instruction:'MATCH THE MOVING MARKER', quip:'THAT WAS THE LAST ONE. PROBABLY.' },
  { id:'hoop', name:'Hoop Economics', family:'hoop', place:'Beat Beach', day:1, duration:40, instruction:'CIRCLE YOUR STICK OR ROLL W D S A', quip:'THE ECONOMY REMAINS CIRCULAR.' },
  { id:'header', name:'Coconut Header', family:'header', place:'Beat Beach', day:2, duration:40, instruction:'LEAN LEFT OR RIGHT TO HEAD COCONUTS', quip:'A SOUND FINANCIAL HEADBUTT.' },
  { id:'lunges', name:'Apology Lunges', family:'reps', place:'Rep Shed', day:2, duration:38.4, instruction:'MATCH THE MARKER AND ALTERNATE SIDES', quip:'YOUR LEGS HAVE BEEN NOTIFIED.' },
  { id:'warrior', name:'Reluctant Warrior', family:'still', place:'Pavilion', day:2, duration:30, ring:.32, breath:8, instruction:'HOLD THE RING. BREATHE WITH THE BAR', quip:'A WARRIOR, UNDER PROTEST.' },
  { id:'step', name:'Step Department', family:'step', place:'Town Square', day:3, duration:40, instruction:'PRESS F OR J WHEN NOTES HIT THE LINE', quip:'YOUR STEPS HAVE BEEN FILED.' },
  { id:'slackline', name:'Slackline of Doubt', family:'slack', place:'Lookout', day:3, duration:45, instruction:'STAY CENTERED. STEP TO WALK', quip:'THE ROPE BELIEVES IN YOU.' },
  { id:'chair', name:'The Chair Nobody Asked For', family:'still', place:'Pavilion', day:3, duration:30, ring:.30, breath:8, instruction:'HOLD THE RING. BREATHE WITH THE BAR', quip:'SOMEWHERE A CHAIR FEELS SEEN.' },
  { id:'tray', name:'Vitamin Tray', family:'tray', place:'Cafe', day:4, duration:40, instruction:'KEEP THE VITAMINS ON THE TRAY', quip:'NUTRITION HAS NEVER BEEN SO TENSE.' },
  { id:'mortgage', name:'Overhead Mortgage', family:'reps', place:'Rep Shed', day:4, duration:36, instruction:'PUSH UP TO MATCH THE MARKER', quip:'INTEREST COMPOUNDS. SO DOES SWEAT.' },
  { id:'tax', name:'Tax Season', family:'still', place:'Pavilion', day:4, duration:30, ring:.28, breath:6, instruction:'LEAN AND BREATHE THROUGH THE AUDIT', quip:'YOUR EXTENSION HAS BEEN APPROVED.' },
  { id:'jog', name:'Island Jog', family:'jog', place:'Island Trail', day:5, duration:45, instruction:'ALTERNATE F AND J TO RUN', quip:'YOU HAVE LAPSED A COCONUT.' },
  { id:'pier', name:'Pier Jump', family:'jump', place:'Pier', day:5, duration:40, instruction:'STEP TO THE EDGE. BREATHE TO JUMP', quip:'THE WATER GIVES YOU A TEN.' },
  { id:'plank', name:'Plank Negotiation', family:'still', place:'Pavilion', day:5, duration:35, ring:.24, breath:6, instruction:'KEEP THE DOT IN THE RING. BREATHE', quip:'YOUR CORE HAS COUNTEROFFERED.' },
];

export const DAY_NAMES = ['A FRESH START','THE HEAD OF IT','A NARROW VIEW','WEALTH AND HEALTH','THE LONG WAY ROUND','A LITTLE MORE','THE LONG STAND'];
export const FRIENDS = ['COACH PLUMB','MABEL','FRANK','KEVIN'];
export function activityForDay(day) { return ACTIVITIES.filter(activity => activity.day <= Math.min(day, 5)); }
