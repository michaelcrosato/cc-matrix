(() => {
const G=window.G;
const defs=[
 ['stork','Stork Stand','Stillness','hold',1,45,[12,5,13,3,1.5,.24],[11,4.5,15,3.6,1.7,.22],'Keep your dot inside the ring. The gull has other plans.','Lean in small nudges. Return before you wobble.','stork','deck',true],
 ['flow','Sun Flow','Stillness','hold',2,80,[12,6,6,3.2,1.3,.28],[12,5.8,9,3.6,1.5,.25],'Balance through five poses. Breathe with the growing ring.','Hold to breathe in. Release to breathe out.','lunge','deck',false],
 ['candle','Quiet Candle','Stillness','candle',3,60,[10,5,11,1.4,.8,.20],[10,5,12,1.8,1,.20],'Protect the flame. Slow corrections beat sudden movements.','Keep still, but stay present. Thoughts can move you.','meditate','raft',true],
 ['squat','Squat Rail','Strength','rep',1,32,[16,8,0,.7,1,.25],[16,8,0,1,1.3,.23],'Follow the bead down and up. Your lean is your squat.','Lean back to lower. Release slowly to stand.','squat','iron',true],
 ['pushup','Push-Up','Strength','rep',2,24,[16,8,0,.7,1,.25],[16,8,0,1,1.3,.23],'Lower with the bead. Keep your shoulders square.','Lean back to lower. Hold halfway to stay halfway.','pushup','iron',false],
 ['lunge','Side Lunge','Strength','rep',3,32,[16,8,0,.7,1,.25],[16,8,0,1.1,1.2,.23],'Move side to side with the bead. Feet stay planted.','Lean left and right. Stay level on the other axis.','lunge','iron',false],
 ['step','Step Class','Cardio','step',1,60,[12,6,3,1,1,.28],[12,6,3,1,1,.26],'Press each direction as its arrow reaches the white line.','Left, right. The bench is not going anywhere.','step','pier',true],
 ['hoop','Hoop Hips','Cardio','hoop',2,60,[12,6,2,.4,1,.3],[12,6,3,.6,1,.27],'Circle your lean. Catch extra hoops when they arrive.','Keep a steady circle. Change direction halfway.','hoop','pier',true],
 ['jog','Coastal Jog','Cardio','jog',3,70,[12,6,2,.4,1,.3],[12,6,3,.6,1,.27],'Alternate steps. Stay beside Marisol and collect water.','J then K. Lean to steer. Rushing gives you a stitch.','run','coast',false],
 ['slalom','Mount Posture Slalom','Balance','slalom',3,60,[12,6,2,.5,1,.3],[12,6,3,.7,1,.27],'Weave through all eighteen gates. Tuck to gain speed.','Lean left or right. Forward tucks. Back brakes.','ski','mountain',false],
 ['tray','Tray Service','Balance','tray',1,60,[14,7,0,.1,1,.3],[14,7,0,.25,1,.3],'Tilt olives into the glasses. Three trays await.','Tip gently toward a glass. Bumpers do not forgive.','idle','bar',false],
 ['laundry','Laundry Line','Balance','laundry',2,70,[10,3.5,16,3.5,1.2,.4],[10,3.5,17,3.8,1.3,.36],'Cross three spans. Balance against gusts and jump the pegs.','Lean to balance. Hold effort to walk. Tap to jump.','rope','laundry',false]
];
for(const [id,name,discipline,family,day,duration,b1,b2,rule,hint,pose,room,cl] of defs){
 const param=b=>Object.fromEntries(['k','c','s','A','nf','R'].map((k,i)=>[k,b[i]]));
 G.activity({id,name,discipline,family,day,duration,rule,hint,pose,room,class:cl,hub:true,view:family==='laundry'?'side':'brawler',camera:{zoom:false},tiers:[param(b1),param(b2)],stars: ['flow','step'].includes(id)?[.5,.75,.92]:null});
}
for(const [id,reps]of [['squat',12],['pushup',10],['lunge',12]])G.activities[id].tiers[1].duration=reps*5;
G.disciplines=[{id:'Stillness',color:'#56bda8',blurb:'The art of almost nothing.'},{id:'Strength',color:'#ef8a6b',blurb:'Small movements. Large feelings.'},{id:'Cardio',color:'#d9ad50',blurb:'A little more alive than before.'},{id:'Balance',color:'#719bc5',blurb:'The floor believes in you.'}];
})();
