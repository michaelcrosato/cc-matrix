export const CAST={
 ilya:{name:'DR. ILYA MARSH',role:'SECOND-YEAR RESIDENT',skin:'sand',hair:'night',scrub:'teal',cap:'sky',voice:0,pitch:3,speed:1.15},
 reyes:{name:'NURSE ODALYS REYES',role:'SCRUB NURSE',skin:'orange',hair:'ink',scrub:'navy',cap:null,glasses:'red',voice:1,pitch:-3,speed:1.1},
 sabine:{name:'DR. SABINE ACHTERBERG',role:'CONSULTING SURGEON',skin:'sand',hair:'mist',scrub:'plum',cap:null,voice:2,pitch:-6,speed:.8},
 bram:{name:'CHIEF CORNELIUS BRAM',role:'CHIEF OF SURGERY',skin:'sand',hair:'mist',scrub:'white',cap:null,glasses:'slate',voice:2,pitch:-10,speed:.7},
 pem:{name:'DR. PEM OKOYE',role:'ANAESTHETIST',skin:'orange',hair:'ink',scrub:'teal',cap:'orange',voice:1,pitch:-4,speed:.85},
 hesper:{name:'DR. HESPER LINDQVIST',role:'THE MERCY FOUNDATION',skin:'sand',hair:'white',scrub:'white',cap:null,voice:0,pitch:-2,speed:.75},
};
const B=(who,say,emo='neutral')=>({who,say,emo});
export const SCENES=[
 {id:'night',title:'03:07 / NIGHT SHIFT',set:'or',beats:[
 B('reyes','YOU. YES, YOU. THE ONE HOLDING THE COFFEE.','stern'),
 B('ilya','I AM AWAKE. THE COFFEE IS A PRECAUTION.','panic'),
 B('reyes','TOMASZ DOLAN. DECKHAND. ELEVEN FISHHOOKS.'),
 B('ilya','IN ONE ARM? HOW DOES THAT HAPPEN?'),
 B('pem','IT WAS A LONG NET. PATIENT IS UNDER.','smile'),
 B('reyes','HIS DAUGHTER GETS MARRIED ON SATURDAY.'),
 B('ilya','I CAN DO THIS. NURSE REYES, CAN I DO THIS?','panic'),
 B('reyes','YOU CAN SCRUB IN. LET US START THERE.','stern'),
 ]},
 {id:'rounds',title:'08:15 / MORNING ROUNDS',set:'ward',beats:[
 B('ilya','THE GREAT ZAMBONI. AGE FORTY-THREE.'),B('pem','HE MADE A KEY DISAPPEAR. INTO HIMSELF.','smile'),
 B('reyes','AND A COIN. AND A PLAYING CARD. AND MAGNETS.','stern'),B('ilya','DOES HE HAVE A LICENCE FOR THIS?'),
 B('pem','HIS INSURANCE ASKED THE SAME QUESTION.','smile'),B('bram','EVERY PATIENT HAS SOMETHING TO HIDE.'),
 B('reyes','THIS ONE HID HIS ENTIRE ACT.'),B('bram','THEN LOOK CAREFULLY. ALL OF YOU.'),
 ]},
 {id:'collision',title:'02:42 / MASS CASUALTY',set:'corridor',beats:[
 B('reyes','A FERRY HIT THE BREAKWATER. THREE INCOMING.','angry'),B('ilya','THREE TABLES? WHERE IS THE OTHER DOCTOR?','panic'),
 B('bram','YOU ARE THE OTHER DOCTOR, SON.'),B('ilya','YOUR HAND, CHIEF. IT IS SHAKING.'),
 B('bram','THESE CHARTS ARE HEAVY. TAKE THEM.'),B('pem','VITALS IN THE BASEMENT. TAKE THE STAIRS.','stern'),
 B('reyes','ONE PAIR OF HANDS. THREE HEARTBEATS.'),B('ilya','THEN I NEED THE WORLD TO SLOW DOWN.','stern'),
 ]},
 {id:'audit',title:'06:10 / THE SECOND OPINION',set:'office',beats:[
 B('bram','HOW LONG DID THE ROOM GO QUIET?'),B('ilya','LONG ENOUGH. HOW DID YOU KNOW?'),
 B('bram','MEDICINE IS SHOWING UP AGAIN TOMORROW.'),B('reyes','THE BOARD SENT A CONSULTANT.'),
 B('sabine','SABINE ACHTERBERG. SHOW ME THE FERRY FILES.'),B('ilya','YOU ARE HERE TO HELP?','smile'),
 B('sabine','YOU HAVE TWO OPTIONS. BOTH ARE WRONG.','stern'),B('reyes','OLLIE BRANDT. SIXTEEN. BROKEN FOREARM.'),
 B('sabine','I WILL BE IN THE GALLERY. DO NOT RUSH.'),
 ]},
 {id:'smile',title:'11:30 / THE SMILING WARD',set:'ward',beats:[
 B('reyes','ANSELM. HARBOUR PILOT. ABDOMINAL PAIN.'),B('ilya','HE SAYS THERE IS NO PAIN AT ALL.'),
 B('pem','HIS LIVER DISAGREES. EMPHATICALLY.','stern'),B('ilya','WHY IS HE SMILING?'),
 B('sabine','ASK WHICH CHARITY PAID FOR HIS TREATMENT.','stern'),B('reyes','THE MERCY FOUNDATION.'),
 B('ilya','THE LIVER MOVED. NURSE, IT KNOCKED.','shock'),B('sabine','DO NOT ANSWER UNTIL YOU ARE READY.'),
 ]},
 {id:'file',title:'01:18 / THE FILE',set:'scrub',beats:[
 B('sabine','MERC-Y. METABOLIC ENDO-RECEPTOR CYTOFORM.'),B('ilya','YOU KNEW. ALL THIS TIME, YOU KNEW.'),
 B('sabine','A RELIEF CAMP. EVERYONE STOPPED HURTING.','sad'),B('reyes','AND THEN?'),
 B('sabine','THEY KEPT SMILING. WHILE IT ATE THEM.'),B('pem','ADA NEEDS THAT DONOR KIDNEY. MY SISTER.','sad'),
 B('sabine','I TAKE THIS TABLE. I KNOW WHERE TO LOOK.'),B('ilya','AND IF WE MAKE A MISTAKE?'),
 B('sabine','THEN WE LOOK A SECOND TIME.'),
 ]},
 {id:'flowers',title:'14:00 / A VISIT',set:'atrium',beats:[
 B('hesper','YOUR HOSPITAL IS SO BRAVE. SO UNDERFUNDED.','smile'),B('reyes','WE ARE NOT ACCEPTING FLOWERS TODAY.','stern'),
 B('hesper','PAIN IS ONLY THE BODY BEGGING.'),B('ilya','PAIN TELLS US SOMETHING IS WRONG.'),
 B('hesper','I SIMPLY TAUGHT IT TO STOP.'),B('reyes','OTTILIE MARR WAS JUST ADMITTED.','shock'),
 B('ilya','YOUR FRIEND FROM THE HOSPICE?'),B('reyes','SHE IS SMILING. GET MY TRAY.','angry'),
 ]},
 {id:'confession',title:'04:50 / THE CONFESSION',set:'office',beats:[
 B('bram','I CO-WROTE THE PAPER. ELEVEN YEARS AGO.','sad'),B('ilya','THE MERCY PAPER? CHIEF...'),
 B('bram','WE WANTED PEOPLE TO STOP SUFFERING.'),B('sabine','SHE IS RELEASING IT ON THE FERRIES. AT DAWN.','stern'),
 B('reyes','CHIEF? YOUR HAND HAS STOPPED SHAKING.','shock'),B('bram','IT FED ON MY QUIET. NOW IT IS HUNGRY.'),
 B('ilya','PUT HIM ON MY TABLE. NOW!','angry'),B('bram','DO NOT YOU DARE BE GENTLE, SON.','stern'),
 ]},
 {id:'roof',title:'05:41 / BEFORE THE DAWN',set:'roof',beats:[
 B('hesper','YOU CANNOT CURE ME OF BEING RIGHT.'),B('sabine','STEP AWAY FROM THE CANISTER.','stern'),
 B('ilya','THE SEAL. IT IS BREAKING!','shock'),B('reyes','GET THE PATIENT BEHIND ME!','angry'),
 B('ilya','REYES? ODALYS? ANSWER ME!','panic'),B('reyes','START WITHOUT ME, DOCTOR.','sad'),
 B('sabine','TWO PAIRS OF HANDS. ONE TABLE.'),B('ilya','I DO NOT KNOW HOW TO DO THIS WITHOUT HER.','sad'),
 B('sabine','THEN WE LEARN. NOW.'),
 ]},
 {id:'stretcher',title:'06:23 / DO NO HARM',set:'or',beats:[
 B('pem','ONE MORE STRETCHER. LINDQVIST.','stern'),B('ilya','SHE TOOK IT HERSELF?'),
 B('hesper','FIRST. ELEVEN YEARS AGO.'),B('sabine','SHE IS DYING. IT HAS NOTHING LEFT TO EAT.'),
 B('reyes','THEY ARE ALL LOOKING AT YOU, DOCTOR.'),B('ilya','SCRUB IN. ALL OF YOU.','stern'),
 B('hesper','AFTER EVERYTHING. WHY?','sad'),B('ilya','BECAUSE IT IS MY SHIFT.'),
 ]},
 {id:'morning',title:'07:00 / MORNING',set:'roof',beats:[
 B('pem','THE RAIN STOPPED. I SHOULD BUY THAT BOAT.','smile'),B('sabine','YOU SAY THAT EVERY MORNING.'),
 B('bram','THE TRICK IS SHOWING UP AGAIN TOMORROW.','smile'),B('ilya','WE TOLD THE TRUTH. IT HURT.'),
 B('sabine','THAT IS HOW WE KNEW IT WAS WORKING.','smile'),B('reyes','YOUR SUTURES ARE CROOKED, DOCTOR.','smile'),
 B('ilya','I WILL FIX THEM NEXT SHIFT.','smile'),B('reyes','YOU HAVE A SEVEN A.M.','stern'),
 ]},
];
export const REACTIONS={
 clean:['ADEQUATE. KEEP GOING.','GOOD HANDS, DOCTOR. DO NOT GET USED TO IT.','THAT IS WHAT I ASKED FOR.'],
 mistake:['THAT WAS HEALTHY TISSUE, DOCTOR.','WE NEED THE PATIENT IN ONE PIECE.','BREATHE. THEN TRY AGAIN.'],
 low:['VITALS ARE FALLING. USE A SYRINGE.','WE ARE LOSING BLOOD. STABILISE.'],
 wrong:['CHECK YOUR INSTRUMENT, DOCTOR.','THE OTHER END OF THE TRAY.'],
};
