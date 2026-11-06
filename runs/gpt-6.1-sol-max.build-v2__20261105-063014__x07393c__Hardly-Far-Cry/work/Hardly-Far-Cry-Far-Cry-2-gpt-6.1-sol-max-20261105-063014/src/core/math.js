export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp = (a,b,t)=>a+(b-a)*t;
export const smooth = (a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const dist = (a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const angle = a=>Math.atan2(Math.sin(a),Math.cos(a));
export function segment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return {d:Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t),x:a[0]+dx*t,z:a[1]+dz*t,t};}
export function polyDistance(x,z,poly){let best={d:Infinity};for(let i=1;i<poly.length;i++){const p=segment(x,z,poly[i-1],poly[i]);if(p.d<best.d)best=p;}return best;}
export const hash = text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export function rle(values){const out=[];let v=values[0],n=0;for(const x of values){if(x!==v){out.push(v,n);v=x;n=0;}n++;}out.push(v,n);return out;}
export function unrle(data,target){let i=0;for(let k=0;k<data.length;k+=2){target.fill(data[k],i,i+data[k+1]);i+=data[k+1];}return target;}
export const clean = s=>String(s).replace(/[^a-zA-Z0-9 .,!?':;()\-+/#&]/g,'').slice(0,28);
export function alongPolyline(points,distance){let d=Math.max(0,distance);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=len||i===points.length-1){const t=clamp(d/(len||1),0,1);return {x:lerp(a[0],b[0],t),z:lerp(a[1],b[1],t),yaw:Math.atan2(b[0]-a[0],b[1]-a[1])};}d-=len;}return {x:points[0][0],z:points[0][1],yaw:0};}
