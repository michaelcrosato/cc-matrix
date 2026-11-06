import {writeFileSync} from 'node:fs';
import {SOURCE_INFORMATION,TESTING_FEEDBACK,ENGINE_FEEDBACK,PROMPT_FEEDBACK} from '../src/content/about.js';
import {GAME_TITLE} from '../src/content/title.js';
const interview={sourceInformation:SOURCE_INFORMATION,testingFeedback:TESTING_FEEDBACK,engineFeedback:ENGINE_FEEDBACK,promptFeedback:PROMPT_FEEDBACK,aiHub:{name:GAME_TITLE,tagline:'Every road has a price.',description:'An original first-person survival shooter in the Sorrel. Read the wind, clear a rusted gun, survive the fever, and decide who deserves the only honest map.',type:'Game',genre:'Shooter',source:'Far Cry 2',series:'Far Cry',players:'1–4',controls:'WASD/mouse or standard pad; R2/LMB fire, L2/RMB aim, Square/E use, R reload, L1/Q heal, H tablet, M map, G bottle, Esc pause.',tags:['first-person','pixel art','story','vehicles','co-op','versus']}};
writeFileSync('../exit-interview.json',JSON.stringify(interview,null,2)+'\n');
