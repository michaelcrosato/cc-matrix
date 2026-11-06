export const PAD = {0:'PadCross',1:'PadCircle',2:'PadSquare',3:'PadTriangle',4:'PadL1',5:'PadR1',6:'PadL2',7:'PadR2',8:'PadCreate',9:'PadOptions',10:'PadL3',11:'PadR3',12:'PadUp',13:'PadDown',14:'PadLeft',15:'PadRight'};
export const ACTIONS = {fire:['MouseLeft','PadR2'],aim:['MouseRight','PadL2'],use:['KeyE','PadSquare'],reload:['KeyR'],jump:['Space','PadCross'],crouch:['KeyC','PadCircle'],sprint:['ShiftLeft','PadL3'],melee:['KeyF','PadR3'],weapon:['PadTriangle'],throw:['KeyG','PadR1'],heal:['KeyQ','PadL1'],map:['KeyM','Tab','PadUp'],tablet:['KeyH','PadDown'],tracker:['KeyT','PadLeft'],scope:['KeyV','PadRight'],pause:['Escape','PadOptions'],ledger:['KeyJ','PadCreate']};
export const down = (i,a)=>i.anyDown(ACTIONS[a]||[a]);
export const press = (i,a)=>i.consumeAny(ACTIONS[a]||[a]);
export const tapped = (i,a)=>i.wasPressed(...(ACTIONS[a]||[a]));
export const KB = {fire:'LMB',aim:'RMB',use:'E',reload:'R',jump:'SPACE',crouch:'C',sprint:'SHIFT',melee:'F',weapon:'1-4',throw:'G',heal:'Q',map:'M',tablet:'H',tracker:'T',scope:'V',pause:'ESC',ledger:'J',confirm:'ENTER',back:'ESC',finish:'F'};
export const PS = {fire:'R2',aim:'L2',use:'SQUARE',reload:'SQUARE',jump:'CROSS',crouch:'CIRCLE',sprint:'L3',melee:'R3',weapon:'TRIANGLE',throw:'R1',heal:'L1',map:'UP',tablet:'DOWN',tracker:'LEFT',scope:'RIGHT',pause:'OPTIONS',ledger:'CREATE',confirm:'CROSS',back:'CIRCLE',finish:'TRIANGLE'};
export const XB = {fire:'RT',aim:'LT',use:'X',reload:'X',jump:'A',crouch:'B',sprint:'LS',melee:'RS',weapon:'Y',throw:'RB',heal:'LB',map:'UP',tablet:'DOWN',tracker:'LEFT',scope:'RIGHT',pause:'MENU',ledger:'VIEW',confirm:'A',back:'B',finish:'Y'};
export const keyLabel=(g,a)=>g.device==='pad'?(g.settings.glyphs==='Xbox'?XB:PS)[a]:KB[a];
