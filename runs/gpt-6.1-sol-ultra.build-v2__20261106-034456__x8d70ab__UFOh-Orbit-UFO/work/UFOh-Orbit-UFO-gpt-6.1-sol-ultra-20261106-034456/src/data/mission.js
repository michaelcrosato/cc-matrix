export const CONTENT_VERSION='orbit-mission-1.0';
const spawn=(at,formation,type,cx,cy,count=1,spacing=52,extra={})=>({at,formation,type,cx,cy,count,spacing,...extra});
const wave=(id,title,learning,spawns)=>({id,title,learning,spawns,complete:'clear',cleanup:'bounded',delay:1.1});
export const MISSION = {
  version:CONTENT_VERSION,
  sectors:[
    {id:'launch',name:'01 · FIRST CONTACT',subtitle:'GOOD NEWS. YOUR SAUCER HAS A SHIELD.',palette:'cyan',repair:true,waves:[
      wave('launch-bead','Flight clearance','Move. Point. Let the bead catch up.',[spawn(.8,'single','drifter',650,190,1,0,{merge:false,speed:.3}),spawn(5,'single','drifter',260,180,1,0,{merge:false,speed:.35})]),
      wave('launch-ring','Safety inspection','A full ring can ram. Firing spends it.',[spawn(0,'line','drifter',480,205,4,100,{merge:false,speed:.45}),spawn(7,'single','hunter',800,320,1)]),
      wave('launch-cascade','One small bang','Explosions invite their neighbours.',[spawn(0,'cluster','drifter',530,170,8,55,{merge:false}),spawn(8,'line','drifter',280,330,4,60,{merge:false})]),
      wave('launch-escape','Clear the gantry','Stop firing. Recharge. Then show off.',[spawn(0,'cross','drifter',480,270,7,64),spawn(8,'pincer','hunter',480,200,2,270)])
    ]},
    {id:'field',name:'02 · THE DRIFTING FIELD',subtitle:'THE SATELLITES ARE MAKING FRIENDS.',palette:'amber',repair:true,waves:[
      wave('field-fusion','A terrible friendship','Linked satellites become hunters.',[spawn(0,'fusion','drifter',670,140,2,30),spawn(3,'ring','drifter',310,245,6,66,{merge:false})]),
      wave('field-braid','The golden braid','Lead the hunter into a cluster.',[spawn(0,'cluster','drifter',360,170,8,59),spawn(2,'pincer','hunter',480,320,2,250)]),
      wave('field-orbit','Unhelpful company','A hunter turns. You turn faster.',[spawn(0,'ring','drifter',650,260,7,72,{merge:false}),spawn(4,'pincer','hunter',300,180,3,120)]),
      wave('field-stair','Cascade staircase','Choose where the chain begins.',[spawn(0,'line','drifter',450,150,10,60,{angle:.3,merge:false}),spawn(5,'fusion','drifter',690,370,2,30)]),
      wave('field-twins','Two bad ideas','Wait for a full ring. Then commit.',[spawn(0,'fusion','drifter',270,150,2,30),spawn(0,'fusion','drifter',700,150,2,30),spawn(3,'cluster','drifter',480,300,9,57,{merge:false})]),
      wave('field-departure','No loitering','Clear the field. Keep your dignity.',[spawn(0,'cross','drifter',480,250,9,62),spawn(7,'pincer','hunter',480,130,4,170)])
    ]},
    {id:'signals',name:'03 · CROSSING SIGNALS',subtitle:'FAST CRAFT. VERY POOR MANNERS.',palette:'violet',repair:true,waves:[
      wave('signals-first','Mind the line','A lane warning comes before missiles.',[spawn(0,'lane','gunship',70,90,1,0,{angle:.36}),spawn(3,'line','drifter',480,300,5,65,{merge:false})]),
      wave('signals-cover','Borrowed cover','Enemy missiles break satellites too.',[spawn(0,'lane','gunship',870,120,1,0,{angle:2.76}),spawn(0,'cluster','drifter',500,270,9,57,{merge:false})]),
      wave('signals-cross','Cross traffic','Shoot a gunship. Leave an escape.',[spawn(0,'lane','gunship',70,110,1,0,{angle:.34}),spawn(6,'lane','gunship',870,390,1,0,{angle:3.48}),spawn(3,'fusion','drifter',500,150,2,30)]),
      wave('signals-rescue','Mutual insurance','Partner down? Touch them with a full ring.',[spawn(0,'ring','drifter',480,270,8,100,{merge:false}),spawn(2,'pincer','hunter',480,150,3,200),spawn(8,'lane','gunship',60,390,1,0,{angle:-.32})]),
      wave('signals-slalom','Flying paperwork','A small gap is still a gap.',[spawn(0,'line','drifter',480,170,9,70,{angle:.12,merge:false}),spawn(0,'lane','gunship',70,400,1,0,{angle:-.4}),spawn(8,'pincer','hunter',480,140,3,180)]),
      wave('signals-last','Permission to panic','Clear every signal. Command is next.',[spawn(0,'lane','gunship',70,120,1,0,{angle:.35}),spawn(4,'lane','gunship',890,400,1,0,{angle:3.5}),spawn(1,'cluster','drifter',480,260,10,57),spawn(8,'pincer','hunter',480,160,2,220)])
    ]},
    {id:'command',name:'04 · COMMAND PERFORMANCE',subtitle:'THE BIG ONE WOULD LIKE A WORD.',palette:'coral',repair:true,waves:[
      wave('command-escort','Executive escort','The usual suspects. In management.',[spawn(0,'pincer','hunter',480,140,3,170),spawn(0,'ring','drifter',480,280,8,90,{merge:false}),spawn(5,'lane','gunship',80,120,1,0,{angle:.32})]),
      wave('command-crown','Command performance','Hit the open emitters. Three phases. No excuses.',[spawn(0,'single','boss',480,170)])
    ]}
  ]
};
export const SCORE_DECK=[
  {formation:'ring',type:'drifter',count:8,spacing:92},
  {formation:'fusion',type:'drifter',count:6,spacing:30},
  {formation:'pincer',type:'hunter',count:3,spacing:160},
  {formation:'lane',type:'gunship',count:2,spacing:170},
  {formation:'cluster',type:'drifter',count:12,spacing:57}
];
