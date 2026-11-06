export function random(s){let t=s.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);s.rng>>>=0;return((t^t>>>14)>>>0)/4294967296;}
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function hash(value){let h=2166136261;for(const c of JSON.stringify(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}
