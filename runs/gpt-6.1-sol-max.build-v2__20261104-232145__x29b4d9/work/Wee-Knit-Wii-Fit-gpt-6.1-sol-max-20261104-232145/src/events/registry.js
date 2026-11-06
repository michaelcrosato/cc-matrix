import {FruitHat} from './fruit.js';
import {TrainingEvent} from './training.js';
import {Springboard} from './spring.js';
import {TippyRaft} from './raft.js';
import {GrandHold} from './grand.js';
export function createEvent(game,id,tier=1,configs=[{}],opts={}){let C=id==='fruit'?FruitHat:id==='spring'?Springboard:id==='raft'?TippyRaft:id==='grand'?GrandHold:TrainingEvent;return new C(game,id,tier,configs,opts);}
