export const defaultSettings={music:.1,sfx:.8,voice:.8,glyphs:'playstation',rumble:true,aimAssist:.35,swapSticks:false,tipSpeed:1.9,shake:true,lineBoil:true,textSpeed:1,ink:true,halftone:true,shadows:true};
const key='st-alder-operative-record-v1';
export function loadSave(){try{const value=JSON.parse(localStorage.getItem(key)||'null');return{progress:0,best:{},...value,settings:{...defaultSettings,...value?.settings}};}catch{return{progress:0,best:{},settings:{...defaultSettings}};}}
export function writeSave(save){if(globalThis.AIHub?.active)return;try{localStorage.setItem(key,JSON.stringify(save));}catch{}}
