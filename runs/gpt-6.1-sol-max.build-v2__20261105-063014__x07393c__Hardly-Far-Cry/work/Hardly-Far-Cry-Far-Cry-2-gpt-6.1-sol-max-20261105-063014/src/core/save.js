export class SaveStore {
 constructor(){this.disabled=false;this.memory=null;this.key='hardly-far-cry-campaign-v1';}
 read(){try{if(typeof localStorage!=='undefined'){const raw=localStorage.getItem(this.key);if(raw){const s=JSON.parse(raw);return s.version===1?s:null;}}}catch{}return this.memory;}
 write(data){if(this.disabled)return false;const s=JSON.parse(JSON.stringify(data));this.memory=s;try{if(typeof localStorage!=='undefined')localStorage.setItem(this.key,JSON.stringify(s));}catch{}return true;}
}
