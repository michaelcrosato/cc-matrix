import {OPS} from '../content/ops.js';
import {results} from './op.js';
export const emptySave=()=>({version:1,next:0,cleared:{},quiet:false,look:false,finished:false,failures:0});
export function recordResult(save,s){
 if(s.status!=='saved')return save;const i=OPS.findIndex(x=>x.id===s.id);if(i<0)return save;const r=results(s);
 if(!save.cleared[s.id]||save.cleared[s.id].total<r.total)save.cleared[s.id]=r;
 save.next=Math.min(10,Math.max(save.next,i+1));save.quiet=save.next>=3;save.look=save.next>=6;save.finished=save.next>=10;save.failures=0;return save;
}
export function readSave(storage,key){try{const o=JSON.parse(storage?.getItem(key)||'null');if(o?.version===1&&o.cleared)return{...emptySave(),...o};}catch{}return emptySave();}
