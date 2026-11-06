(() => {
const E = My3D2dge, G = (window.GAME ||= {});
const GAME_TITLE = 'Trauma Sector: Second Signal';
const DEFAULTS = {
 drain:1, slipDamage:1, healing:1, syringeDose:18, clock:1,
 cursorSpeed:330, fine:.35, curve:1.7, assist:.6, magnet:22, tolerance:1,
 strainSpeed:1, strainHealth:1, spawnRate:1, strainDamage:1, staccatoBeat:1.6,
 charge:1, breathDrain:16, breathFactor:.25, rewindSeconds:6,
 bleed:1, suction:60, cauteryHeat:.5
};
const TUNING = {...DEFAULTS};
const TOOLS = ['forceps','scalpel','suture','salve','syringe','cautery','suction','sonar'];
const TOOL_NAMES = ['Forceps','Scalpel','Suture','Salve','Syringe','Cautery','Suction','Sonar'];
const TOOL_COLORS = ['#eaf6ed','#c799ff','#8fcfff','#9ce0a2','#ffcf82','#ff9962','#93cced','#68e9dc'];
const TOOL_VERBS = ['Grip and pull','Trace the guide','Cross and release','Paint the patch','Charge and release','Hold to cauterize','Hold to drain','Hold to reveal'];
const COLORS = ['#e8443a','#3b82f6','#22c55e','#f5b700'];
const {attack,dash,skill,jump,...base} = E.Input.DEFAULT;
const INPUT = {...base,
 useTool:['Pad7','Pad0','Mouse0','Space'],fine:['Pad6','ShiftLeft','ShiftRight'],gift:['Pad3','KeyF','Mouse1'],consult:['Pad2','KeyC'],
 toolPrev:['Pad4','KeyQ','WheelUp'],toolNext:['Pad5','KeyE','WheelDown'],wheelHold:['Mouse2'],
 curU:['KeyW','ArrowUp'],curD:['KeyS','ArrowDown'],curL:['KeyA','ArrowLeft'],curR:['KeyD','ArrowRight'],
 nudgeU:['Pad12'],nudgeD:['Pad13'],nudgeL:['Pad14'],nudgeR:['Pad15'],
 tool1:['Digit1'],tool2:['Digit2'],tool3:['Digit3'],tool4:['Digit4'],tool5:['Digit5'],tool6:['Digit6'],tool7:['Digit7'],tool8:['Digit8'],
 interact:['Pad0','KeyE','Enter'],skip:['Pad2','ControlLeft','ControlRight'],log:['Pad3','KeyB'],more:['Pad3','KeyM']
};
const DIFFICULTY = {Intern:{drain:.7,clock:1.3,dose:24,assist:.2},Resident:{drain:1,clock:1,dose:18,assist:0},Attending:{drain:1.3,clock:.8,dose:12,assist:0}};
const clone = o => JSON.parse(JSON.stringify(o));
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const hash = o => { const s=JSON.stringify(o); let h=2166136261; for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(16); };
const rng = S => {S.rng=(S.rng+0x6d2b79f5)>>>0;let t=Math.imul(S.rng^(S.rng>>>15),S.rng|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
Object.assign(G,{GAME_TITLE,VERSION:'1.0.0',DEFAULTS,TUNING,TOOLS,TOOL_NAMES,TOOL_COLORS,TOOL_VERBS,COLORS,INPUT,DIFFICULTY,clone,dist,hash,rng,cases:[],sites:{},objects:{},strains:{},stories:{},barks:{},cheats:{},defCase:d=>G.cases.push(d),defObject:(id,d)=>G.objects[id]=d});
})();
