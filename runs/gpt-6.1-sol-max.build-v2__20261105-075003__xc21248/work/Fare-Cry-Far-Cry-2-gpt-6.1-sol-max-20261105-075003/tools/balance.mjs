import {WEAPONS,SHOP} from '../src/data/weapons.js';
import {CONTRACTS} from '../src/data/contracts.js';
import {CASES} from '../src/data/world.js';
const pay=CONTRACTS.reduce((n,c)=>n+c.pay,0),twists=CONTRACTS.reduce((n,c)=>n+(c.twist?.pay||0),0),diamonds=CASES.reduce((n,c)=>n+c.value,0),stock=SHOP.reduce((n,i)=>n+i.price,0);
console.log(JSON.stringify({campaignDiamonds:pay,optionalTwists:twists,hiddenCases:diamonds,totalAvailable:pay+twists+diamonds,shopTotal:stock,guardHealth:90,weaponTimeToKill:Object.fromEntries(Object.entries(WEAPONS).filter(([,w])=>!w.ignite&&!w.explosive).map(([id,w])=>[id,+((Math.ceil(90/w.damage)-1)*60/w.rpm).toFixed(2)])),jamChance:{condition50:0,condition25:.01,condition10:.0256},survival:{syringes:3,rescuesEachDay:2,healthBars:5,criticalSurgeryRestores:40,feverWarningSeconds:35}},null,2));
