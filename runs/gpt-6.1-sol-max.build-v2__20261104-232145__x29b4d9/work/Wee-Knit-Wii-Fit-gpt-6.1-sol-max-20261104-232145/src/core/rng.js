const streams=new Map();let baseSeed=0x4e43f;
export function setSeed(seed){baseSeed=seed>>>0;streams.clear();}
export function mulberry(seed){return ()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function rng(label='game'){if(globalThis.AIHub?.active)return AIHub.rng(label);if(!streams.has(label))streams.set(label,mulberry(hash(label)^baseSeed));return streams.get(label);}
export const cosmetic=mulberry(0x533774);
export function pick(arr,label='dialogue'){return arr[Math.floor(rng(label)()*arr.length)];}
export function shuffled(arr,label){const r=rng(label),out=[...arr];for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
