import {SAVE_KEY,VERSION} from '../data/config.js';
export const defaultSettings=()=>({music:10,sfx:80,voice:80,glyphs:'PlayStation',rumble:true,autoBreathe:false,offset:0,uiScale:1,ink:1,reduceShake:false,difficulty:'Standard'});
export function freshProfile(name='Gentle Margaret',colour='#e76b57'){return {name,colour,hat:0,day:1,steps:0,done:[],checkDone:false,ages:[],medals:{},marbles:0,falls:0,minutes:0,stamps:[],lastVisit:Date.now(),tutorial:false,levelled:false};}
export function parseSave(raw){try{const x=JSON.parse(raw);if(x.version!==VERSION||!Array.isArray(x.profiles)||x.profiles.length>4)throw Error('version');return {version:VERSION,profiles:x.profiles.map(p=>p?{...freshProfile(),...p}:null),settings:{...defaultSettings(),...x.settings},selected:x.selected||0};}catch{return {version:VERSION,profiles:[null,null,null,null],settings:defaultSettings(),selected:0};}}
export class Save{
 constructor(){try{this.data=parseSave(localStorage.getItem(SAVE_KEY));this.available=true;}catch{this.data=parseSave(null);this.available=false;}}
 get profile(){return this.data.profiles[this.data.selected];}
 get settings(){return this.data.settings;}
 write(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.data));}catch{this.available=false;}}
 reset(){this.data=parseSave(null);this.write();}
}
