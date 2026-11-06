import { HERO_RIG, HERO_CLIPS, placeFeet, gaitClip, mirror } from '../../pixel-engine.js';
const hold=(name,pose)=>({name,frames:60,loop:true,keys:[[0,pose],[60,pose]]});
const feet=(pose,R={z:0},L={z:0})=>placeFeet(pose,HERO_RIG,{R,L});
export const POSES = [
 hold('Tree',{Pelvis:{p:[.03,-.02,0]},ArmR:[-172,0,-6],ForearmR:[-14,0,0],ArmL:[-172,0,6],ForearmL:[-14,0,0],LegR:[-62,0,-58],ShinR:[150,0,0],FootR:[30,0,0]}),
 hold('Heron',{Pelvis:{p:[0,-.02,0]},Torso:[10,0,0],Head:[-14,0,0],ArmR:[-20,0,-80],ArmL:[-20,0,80],ForearmR:[-30,0,0],ForearmL:[-30,0,0],LegR:[-85,0,0],ShinR:[95,0,0],FootR:[35,0,0]}),
 hold('Warrior',feet({Pelvis:{p:[0,-.2,0]},Torso:[0,25,0],Head:[0,40,0],ArmR:[0,0,-90],ArmL:[0,0,90]},{z:.38},{z:-.38})),
 hold('Chair',feet({Pelvis:{p:[0,-.28,-.06]},Torso:[24,0,0],Head:[-18,0,0],ArmR:[-110,0,-8],ArmL:[-110,0,8]})),
 hold('Fold',feet({Pelvis:{p:[0,-.03,-.03]},Torso:[88,0,0],Head:[10,0,0],ArmR:[-70,0,-6],ArmL:[-70,0,6],ForearmR:[-8,0,0],ForearmL:[-8,0,0]})),
 hold('Plank',{Pelvis:{r:[66,0,0],p:[0,-.2,0]},Head:[-48,0,0],ArmR:[-63,0,-5],ArmL:[-63,0,5],HandR:[-40,0,0],HandL:[-40,0,0],FootR:[55,0,0],FootL:[55,0,0]})
];
const squatTop={Pelvis:{p:[0,-.02,0]},Torso:[2,0,0],ArmR:[6,0,-9],ArmL:[6,0,9]},squatLow={Pelvis:{p:[0,-.3,-.05]},Torso:[26,0,0],Head:[-20,0,0],ArmR:[-85,0,-8],ArmL:[-85,0,8]};
const feetTrack=[[0,{R:{z:0},L:{z:0}}],[30,{R:{z:0},L:{z:0}}]];
export const REPS=[
 {name:'SquatRep',frames:30,grounded:true,keys:[[0,feet(squatTop)],[30,feet(squatLow)]],feet:feetTrack},
 {name:'LungeRep',frames:30,grounded:true,keys:[[0,feet(squatTop)],[30,feet({Pelvis:{p:[0,-.24,0]},Torso:[6,0,0],ArmR:[-35,0,-12],ArmL:[-35,0,12]},{z:.34},{z:-.32,pitch:25,pivot:'ball'})]],feet:[[0,{R:{z:0},L:{z:0}}],[30,{R:{z:.34},L:{z:-.32,pitch:25,pivot:'ball'}}]]},
 {name:'Press',frames:30,keys:[[0,feet({ArmR:[0,0,-80],ForearmR:[-90,0,0],ArmL:[0,0,80],ForearmL:[-90,0,0]})],[30,feet({ArmR:[-174,0,-10],ArmL:[-174,0,10],ForearmR:[-8,0,0],ForearmL:[-8,0,0]})]],feet:feetTrack}
];
const gesture=(name,pose,frames=36)=>({name,frames,loop:false,keys:[[0,{}],[frames*.45,pose],[frames,{}]]});
export const GESTURES=[
 gesture('HeaderNod',{Torso:[-18,0,0],Head:[30,0,0],ArmR:[-30,0,-20],ArmL:[-30,0,20]},18),
 gesture('Daze',{Torso:[0,0,15],Head:[0,20,-18],ArmR:[-70,0,-40],ArmL:[-70,0,40]}),
 gesture('Bow',{Torso:[35,0,0],Head:[10,0,0]}),gesture('SlowClap',{ArmR:[-75,0,24],ArmL:[-75,0,-24],ForearmR:[-60,0,0],ForearmL:[-60,0,0]},72),
 gesture('Sneeze',{Torso:[35,0,0],Head:[20,0,0],ArmR:[-85,0,0],ForearmR:[-110,0,0]}),gesture('Point',{ArmR:[-85,0,-30],Head:[0,-20,0]},60),
 gesture('StepL',{Pelvis:{p:[0,.12,0]},LegL:[-35,0,0],ShinL:[45,0,0],ArmR:[-25,0,0]},24),gesture('StepR',{Pelvis:{p:[0,.12,0]},LegR:[-35,0,0],ShinR:[45,0,0],ArmL:[-25,0,0]},24),
 hold('Tuck',feet({Pelvis:{p:[0,-.25,0]},Torso:[50,0,0],ArmR:[-70,0,-20],ArmL:[-70,0,20]})),
 gesture('Cannonball',{Pelvis:{r:[45,0,0],p:[0,.1,0]},LegR:[-110,0,-10],LegL:[-110,0,10],ShinR:[135,0,0],ShinL:[135,0,0],ArmR:[-120,0,-20],ArmL:[-120,0,20]},60),
 gesture('Paddle',{ArmR:[-165,0,-20]},60),gesture('WeighStep',{Pelvis:{p:[0,.12,0]},LegR:[-40,0,0],ShinR:[45,0,0]},60),gesture('Disembark',{Pelvis:{p:[0,.12,0]},LegR:[-40,0,0],ShinR:[45,0,0],ArmL:[-20,0,0]},60),
 gaitClip(HERO_RIG,{name:'Jog',frames:16,speed:3,stance:.42,hip:-.04,bob:.03,lift:.1,lean:6,sway:2,arms:{swing:30,elbow:75}})
];
export const OWN_CLIPS=[...POSES,...REPS,...GESTURES];
export const CLIPS=[...HERO_CLIPS,...OWN_CLIPS];
