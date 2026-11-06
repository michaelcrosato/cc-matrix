/** Original authored campaign content. Source values are distinguished from additions. */
export const FIELD = Object.freeze({ width:480,height:270,left:18,right:462,top:30,bottom:258,breach:230,shipY:246 });
export const TUNING = Object.freeze([
 {key:'playerSpeed',label:'Cannon speed',min:70,max:280,step:5,default:155,description:'Horizontal cannon movement, logical pixels per second.'},
 {key:'shotRecovery',label:'Shot recovery',min:0.1,max:0.8,step:0.02,default:0.28,description:'Seconds between launches; two missiles per cannon remain the limit.'},
 {key:'marchInterval',label:'March interval',min:0.12,max:1.2,step:0.02,default:0.66,description:'Opening beat length; surviving troops accelerate from this value.'},
 {key:'descent',label:'Reversal descent',min:2,max:16,step:1,default:7,description:'Pixels descended whenever the living formation reverses.'},
 {key:'fireInterval',label:'Volley interval',min:0.8,max:5,step:0.1,default:2.8,description:'Seconds between enemy attack orders; authored recovery windows still apply.'},
 {key:'playerShotSpeed',label:'Missile speed',min:100,max:400,step:10,default:195,description:'Upward missile speed; applies to all missiles immediately.'},
 {key:'bombSpeed',label:'Enemy bomb speed',min:35,max:160,step:5,default:67,description:'Falling bomb speed; broad bombs are a little slower. Applies immediately.'},
 {key:'salvageEvery',label:'Salvage cadence',min:1,max:8,step:1,default:4,description:'Every N ordinary formation kills releases guaranteed salvage.'},
 {key:'repairYield',label:'Repair cells',min:8,max:64,step:2,default:26,description:'Maximum missing bunker cells restored by one charge.'},
 {key:'bossHealth',label:'Flagship core health',min:8,max:60,step:2,default:26,description:'Core maximum health. Live change preserves its damaged proportion; emitters use one third.'}
]);
export const DIFFICULTIES = Object.freeze([
 {name:'CADET',description:'Broad recovery windows. The full campaign.',march:1.2,fire:1.3,bomb:0.83,descent:0.8,boss:0.77},
 {name:'STANDARD',description:'The intended planetary defense.',march:1,fire:1,bomb:1,descent:1,boss:1},
 {name:'VETERAN',description:'A more impatient sky.',march:0.85,fire:0.84,bomb:1.12,descent:1.12,boss:1.15},
 {name:'PANIC',description:'Keep a lane. Keep your nerve.',march:0.72,fire:0.7,bomb:1.24,descent:1.28,boss:1.3}
]);
export const LOCATIONS = Object.freeze([
 {name:'TIDAL OUTPOST',short:'01 / TIDAL OUTPOST',palette:['#08192d','#193a50','#54e5d1','#f8b86d'],alert:'KEEP THE SKY OFF OUR BEACH.'},
 {name:'EMBER FOUNDRY',short:'02 / EMBER FOUNDRY',palette:['#201128','#52263e','#ffa76b','#e464b6'],alert:'HOT METAL. COOL HEADS.'},
 {name:'AURORA CITADEL',short:'03 / AURORA CITADEL',palette:['#141831','#343455','#b7a3ff','#7ef5d9'],alert:'LAST WALL. BIG ATTITUDE.'}
]);
// 0 ordinary, A armour, B bombardier, . intentional gap; values remain row-based.
export const WAVES = Object.freeze([
 {name:'THE DOORBELL',location:0,startY:46,spacingX:40,spacingY:20,rows:['00000000','00000000','00000000','00000000'],march:1,fire:1.2,volley:1,telegraph:0.8,saucerAt:999,recoveryEvery:4,recoveryFor:2.1,alert:'MOVE. FIRE. CUT YOUR OWN FIRING LANE.'},
 {name:'CHEEKY VISITORS',location:0,startY:50,spacingX:40,spacingY:20,rows:['00000000','00.00.00','00000000','00000000'],march:0.95,fire:1.08,volley:2,telegraph:0.78,saucerAt:8,recoveryEvery:4,recoveryFor:2,alert:'BONUS SAUCER INBOUND. RISK THE OPEN SKY?'},
 {name:'TIN HATS',location:1,startY:54,spacingX:40,spacingY:20,rows:['00A00A00','00000000','0A0000A0','00000000'],march:0.92,fire:1,volley:2,telegraph:0.78,saucerAt:15,recoveryEvery:4,recoveryFor:2,alert:'ARMOURED CONTACTS. CRACK, THEN ZAP.'},
 {name:'RAIN CHECK',location:1,startY:58,spacingX:40,spacingY:20,rows:['0B0000B0','00A00A00','00000000','0B0000B0'],march:0.88,fire:0.95,volley:2,telegraph:0.92,saucerAt:13,recoveryEvery:3,recoveryFor:2.4,alert:'BROAD BOMBS. REPAIR BEFORE THE RAIN.'},
 {name:'RUDE COMPANY',location:2,startY:64,spacingX:40,spacingY:20,rows:['A0B00B0A','0A.00.A0','0B0AA0B0','00000000'],march:0.84,fire:0.92,volley:3,telegraph:0.88,saucerAt:11,recoveryEvery:3,recoveryFor:2.8,alert:'PICK YOUR TARGET. KEEP YOUR COVER.'},
 {name:'THE LAST WORD',location:2,startY:70,spacingX:40,spacingY:20,rows:['AB0AA0BA','0B0AA0B0','AA0000AA','0B0000B0'],march:0.8,fire:0.88,volley:3,telegraph:0.9,saucerAt:9,recoveryEvery:3,recoveryFor:2.8,alert:'HOLD THE BREACH. MAKE EVERY REPAIR COUNT.'}
]);
export function tuningForDifficulty(index=1) {
 const d=DIFFICULTIES[Math.max(0,Math.min(3,Math.trunc(index)))];
 const t=Object.fromEntries(TUNING.map(v=>[v.key,v.default]));
 t.marchInterval*=d.march; t.fireInterval*=d.fire; t.bombSpeed*=d.bomb; t.descent*=d.descent; t.bossHealth=Math.round(t.bossHealth*d.boss);
 return t;
}
export function validateContent() {
 if(WAVES.length!==6) throw new Error('Campaign requires six formations.');
 WAVES.forEach((w,i)=>{
  if(w.rows.length!==4||w.rows.some(row=>row.length!==8||/[^0AB.]/.test(row))) throw new Error(`Formation ${i+1}: expected four eight-character rows using 0/A/B/.`);
  if(!LOCATIONS[w.location]||!Number.isFinite(w.startY)||w.startY<32||w.startY>100) throw new Error(`Formation ${i+1}: invalid location or starting height.`);
 });
 TUNING.forEach(t=>{if(!(t.min<t.max&&t.default>=t.min&&t.default<=t.max&&t.step>0)) throw new Error(`Invalid tuning bounds: ${t.key}`);});
 return true;
}
validateContent();
