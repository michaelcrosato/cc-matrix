import {readFileSync,writeFileSync} from 'node:fs';
import {GAME_TITLE,TAGLINE} from '../src/config/identity.js';
const about=JSON.parse(readFileSync('src/data/about.json','utf8'));
const data={...about,aiHub:{name:GAME_TITLE,tagline:TAGLINE,description:'A rain-soaked medical drama where the heartbeat is the clock. Master eight instruments, confront seven musical parasites, and save St. Alder’s night shift alone or with a surgical team.',type:'Game',genre:'Simulation',source:'Trauma Center: Second Opinion',series:'Trauma Center',players:'1–4',controls:'Right stick or mouse to aim, left stick or 1-8 for tools, R2 or left click to use',tags:['3d','co-op','story','sci-fi','boss fights']}};
writeFileSync('../exit-interview.json',JSON.stringify(data,null,2)+'\n');JSON.parse(readFileSync('../exit-interview.json','utf8'));
