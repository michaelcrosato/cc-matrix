import {createHeadless} from '../engine/index.ts';
import world from '../labs/game/scenes/world.ts';
import {playPrologue,playReceipts,roundOf} from '../labs/game/bot.ts';
const e=await createHeadless({scene:world,seed:1,settings:{'game.mode':'story','game.detail':0.05}});
playPrologue(e);console.log('Prologue complete',roundOf(e).contract);playReceipts(e);console.log('Receipts complete',roundOf(e).contract);
