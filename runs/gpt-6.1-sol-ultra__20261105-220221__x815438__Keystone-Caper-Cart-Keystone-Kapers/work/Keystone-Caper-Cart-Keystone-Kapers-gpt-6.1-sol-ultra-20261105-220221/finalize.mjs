import fs from 'node:fs';
import {SOURCE_INFO,FEEDBACK} from './metadata.js';
const exit={sourceInformation:SOURCE_INFO,...FEEDBACK,aiHub:{name:'Keystone Caper Cart',tagline:'One crook. Four floors. Absolutely no running.',description:'Clock in as Officer Pip for a slapstick chase through the Grand Keystone Emporium. Jump runaway carts, duck toy planes, recover the takings and use the lift to corner Sid Slip across three escalating cases, solo or with a co-op patrol.',type:'Game',genre:'Action',source:'Keystone Kapers (1983)',series:'',players:'1–4',controls:'Left stick/D-pad or A/D: move; Cross/A or Space: jump; Circle/B or S: duck; Square/X or E: cuff/lift; Up: lift; Options/Esc: pause. Touch: drag left, tap right, assisted evasion/cuffs. Couch P2: arrows, Right Ctrl, Enter.',tags:['3d','arcade','co-op','retro','comedy','low-poly']}};
fs.writeFileSync('../exit-interview.json',JSON.stringify(exit,null,2)+'\n');
const read=JSON.parse(fs.readFileSync('../exit-interview.json','utf8'));
if(Object.keys(read).join(',')!=='sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub'||read.testingFeedback.length!==4||read.engineFeedback.length!==6||read.promptFeedback.length!==4)throw Error('Exit interview structure invalid');
console.log('Exit interview JSON validated.');
