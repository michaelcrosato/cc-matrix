import {model} from '../../pixel-engine.js';
import {CAST} from './story.js';
const FACE=[[-.46,.5],[.46,.5],[.5,.08],[.42,-.28],[.2,-.56],[0,-.64],[-.2,-.56],[-.42,-.28],[-.5,.08]];
const FRINGE=[[-.56,.3],[-.59,-.1],[-.42,.06],[-.38,-.12],[-.21,.17],[-.06,-.02],[.08,.15],[.24,-.04],[.36,.13],[.49,-.12],[.58,-.04],[.55,.34],[.3,.58],[0,.64],[-.3,.58]];
export function bustDef(id){const c=CAST[id];return model({id:'bust-'+id,about:'Expressive portrait of '+c.name,tags:['character','portrait','hospital'],floats:true,
 palette:{skin:c.skin,hair:c.hair,scrub:c.scrub,white:'white',dark:'ink',iris:id==='sabine'?'sky':'teal',accent:id==='pem'?'navy':c.glasses||'sky',cap:c.cap||c.hair,shade:'plum'},
 parts:[
  {name:'shoulders',slab:[[-1.05,0],[-1,.45],[-.65,.7],[-.3,.85],[.3,.85],[.65,.7],[1,.45],[1.05,0]],depth:.65,at:[0,.3,-.1],c:'scrub'},
  {box:[.34,.38,.3],at:[0,1.06,0],c:'skin'},
  {box:[.12,.65,.04],at:[-.25,.65,.25],rot:[0,0,-20],c:'white'},
  {box:[.12,.65,.04],at:[.25,.65,.25],rot:[0,0,20],c:'white'},
  {group:[
   {box:[.9,.95,.64],at:[0,.1,-.13],c:'skin'},
   {slab:FACE,depth:.24,at:[0,0,.13],c:'skin'},
   ...(id!=='pem'?[{box:[1,.84,.5],at:[0,.25,-.4],c:'hair'},
    {slab:FRINGE,depth:.12,at:[0,.45,.27],c:'hair'}]:[]),
   ...[-1,1].flatMap(sign=>[
    {box:[.13,.3,.19],at:[sign*.51,-.04,-.04],c:'skin'},
    {group:[{box:[.25,.15,.07],c:'white'},{box:[.11,.14,.07],at:[-.02*sign,0,.05],c:'iris'},{box:[.05,.1,.07],at:[-.02*sign,0,.09],c:'dark'},
    {name:'lid'+sign,box:[.27,.16,.07],at:[0,.14,.06],c:'skin'}],at:[sign*.225,-.015,.29],name:'eye'+sign,pivot:true},
    {group:[{box:[.29,.065,.08],c:'hair'}],at:[sign*.225,.2,.285],rot:[0,0,sign*-12],name:'brow'+sign,pivot:true},
   ]),
   {box:[.105,.21,.16],at:[0,-.15,.31],c:'skin'},
   {group:[{box:[.23,.065,.08],c:'shade'}],at:[0,-.38,.285],name:'mouth',pivot:true},
   ...(c.cap?[{ball:[1.12,.4,.96],half:true,at:[0,.68,-.1],c:'cap'},{box:[1.08,.12,.87],at:[0,.55,-.04],c:id==='pem'?'accent':'cap'}]:[]),
   ...(id==='reyes'?[{ball:[.5,.55,.5],at:[.39,.65,-.42],c:'hair'}]:[]),
   ...(id==='sabine'?[{box:[.22,1.05,.35],at:[-.59,.02,-.19],c:'hair'},{box:[.22,1.05,.35],at:[.59,.02,-.19],c:'hair'},
    {box:[.065,.3,.065],at:[-.28,.14,.4],rot:[0,0,-22],c:'shade'}]:[]),
   ...(id==='bram'?[{ball:[.64,.2,.2],at:[0,-.28,.35],c:'hair'}]:[]),
   ...(c.glasses?[-1,1].flatMap(sign=>[
    {box:[.37,.065,.065],at:[sign*.23,.08,.43],c:'accent'},
    {box:[.37,.065,.065],at:[sign*.23,-.12,.43],c:'accent'},
    {box:[.065,.21,.065],at:[sign*.4,-.02,.43],c:'accent'},
    {box:[.065,.21,.065],at:[sign*.05,-.02,.43],c:'accent'},
   ]):[]),
   ...(id==='hesper'?[{ball:[.12,.12,.08],at:[.55,-.28,0],c:'accent'}]:[]),
  ],at:[0,1.65,0],name:'head',pivot:true},
 ]});}
export const BUSTS=Object.fromEntries(Object.keys(CAST).map(id=>[id,bustDef(id)]));
export const HAND=model({id:'surgeon-glove',about:'Gloved hand gripping an instrument, wrist toward the surgeon',tags:['character','hand','surgery'],floats:true,
 palette:{glove:'sky',fold:'blue',sleeve:'teal'},parts:[
  {box:[.64,.27,.65],at:[0,0,0],c:'glove'},
  ...[-.24,-.08,.08,.24].flatMap((x,i)=>[{box:[.13,.16,.36],at:[x,.04,-.39],rot:[20,0,0],c:'glove'},{box:[.12,.14,.22],at:[x,-.1,-.565],rot:[65,0,0],c:'fold'}]),
  {box:[.18,.18,.42],at:[-.36,-.04,-.19],rot:[12,-28,0],c:'glove'},
  {cyl:[.52,.28,.52],at:[0,0,.38],rot:[90,0,0],c:'fold'},
  {cyl:[.48,1.4,.48],at:[0,0,1.18],rot:[90,0,0],c:'glove'},
  {cyl:[.74,2.4,.74],at:[0,0,2.9],rot:[90,0,0],c:'sleeve'},
 ]});
const shaft=(c='steel')=>({cyl:[.13,1.4,.13],at:[0,0,.85],rot:[90,0,0],c});
const common={steel:'mist',dark:'slate',white:'white',grip:'navy',hot:'red',accent:'cyan'};
export const TOOL_MODELS=Object.fromEntries(['scalpel','forceps','suture','drain','syringe','gel','laser','scanner'].map(id=>[id,model({
 id:'tool-'+id,about:'Surgical '+id+' with its working tip at the origin',tags:['surgery','instrument',id],floats:true,palette:common,
 parts:id==='scalpel'?[
  {slab:[[-.03,-.05],[.03,-.05],[.14,.15],[.1,.57],[-.08,.57]],depth:.07,at:[0,.04,.28],rot:[90,0,0],c:'white'},shaft(),{box:[.24,.18,.85],at:[0,0,1.3],c:'grip'},
 ]:id==='forceps'?[
  ...[-1,1].map(sign=>({group:[{box:[.085,.09,1.65],at:[0,0,.83],c:'steel'},{box:[.16,.1,.18],at:[0,0,.08],c:'white'}],at:[sign*.12,0,0],rot:[0,sign*3,0],name:'jaw'+sign,pivot:true})),
  {box:[.36,.14,.32],at:[0,0,1.7],c:'dark'},
 ]:id==='suture'?[
  {torus:[.65,.075,.65],at:[-.15,0,.14],c:'white'},shaft(),{box:[.22,.2,.65],at:[0,0,1.35],c:'grip'},
 ]:id==='drain'?[
  {cyl:[.22,.4,.22],at:[0,0,.2],rot:[90,0,0],c:'white'},shaft(),{box:[.34,.25,.8],at:[0,0,1.35],c:'accent'},
 ]:id==='syringe'?[
  {cyl:[.06,.65,.06],at:[0,0,.32],rot:[90,0,0],c:'white'},
  {cyl:[.39,.85,.39],at:[0,0,1],rot:[90,0,0],c:'accent'},
  ...[.75,.95,1.15].map(z=>({box:[.41,.065,.065],at:[0,.18,z],c:'dark'})),
  {group:[{cyl:[.12,.6,.12],at:[0,0,.2],rot:[90,0,0],c:'steel'},{box:[.55,.15,.13],at:[0,0,.5],c:'white'}],at:[0,0,1.4],name:'plunger',pivot:true},
 ]:id==='gel'?[
  {cone:[.22,.5,.22],at:[0,0,.25],rot:[-90,0,0],c:'white'},
  {ball:[.6,.45,1.05],at:[0,0,1],c:'accent'},{box:[.62,.12,.15],at:[0,0,1.55],c:'grip'},
 ]:id==='laser'?[
  shaft(),{cyl:[.32,1.05,.32],at:[0,0,1.1],rot:[90,0,0],c:'grip'},
  {ball:[.16,.14,.16],at:[0,0,.09],c:'hot',glow:true},{box:[.16,.13,.25],at:[0,.18,.9],c:'hot'},
 ]:[
  {torus:[.85,.13,.85],at:[0,.025,.15],c:'accent'},
  {cyl:[.42,.12,.42],at:[0,-.02,.15],c:'dark'},shaft(),{box:[.3,.22,.7],at:[0,0,1.3],c:'grip'},
 ],
})]));
const limb=(side,x)=>({group:[{box:[.14,.3,.14],at:[0,-.15,0],c:'scrub'},
 {group:[{box:[.12,.28,.12],at:[0,-.14,0],c:'skin'},{group:[{box:[.15,.16,.15],at:[0,-.08,0],c:'glove'}],at:[0,-.27,0],name:'Hand'+side,pivot:true}],at:[0,-.3,0],name:'Forearm'+side,pivot:true}],at:[x,.36,0],name:'Arm'+side,pivot:true});
const leg=(side,x)=>({group:[{box:[.18,.34,.18],at:[0,-.17,0],c:'scrub'},
 {group:[{box:[.16,.25,.16],at:[0,-.12,0],c:'scrub'},{group:[{box:[.18,.12,.3],at:[0,-.05,.08],c:'shoe'}],at:[0,-.25,0],name:'Foot'+side,pivot:true}],at:[0,-.34,0],name:'Shin'+side,pivot:true}],at:[x,0,0],name:'Leg'+side,pivot:true});
export function figureDef(id){const c=CAST[id];return model({id:'figure-'+id,about:'Masked hospital figure with native animation joints',tags:['character','hospital','rig'],palette:{scrub:c.scrub,skin:c.skin,cap:c.cap||c.hair,glove:'sky',shoe:'ink',mask:'white'},parts:[
 {group:[{box:[.4,.2,.27],at:[0,0,0],c:'scrub'},
  {group:[{box:[.44,.46,.29],at:[0,.2,0],c:'scrub'},
   {group:[{ball:[.38,.42,.37],at:[0,.16,0],c:'skin'},{ball:[.43,.2,.43],at:[0,.37,0],c:'cap'},
    {box:[.32,.14,.07],at:[0,.06,.18],c:'mask'},...[-.09,.09].map(x=>({box:[.065,.065,.065],at:[x,.21,.19],c:'shoe'}))],at:[0,.44,0],name:'Head',pivot:true},limb('R',-.28),limb('L',.28)],at:[0,.12,0],name:'Torso',pivot:true},leg('R',-.13),leg('L',.13)],at:[0,.7,0],name:'Pelvis',pivot:true},
 ]});}
export const FIGURES=Object.fromEntries(Object.keys(CAST).map(id=>[id,figureDef(id)]));
