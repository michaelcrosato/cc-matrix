export const SETTINGS_DEFAULTS={music:.1,sound:.7,voices:.8,glyphs:'PlayStation',aimAssist:true,cursorSpeed:1,rumble:true,giftToggle:false,look:'Surgical',pixelSize:1,shake:true,reduceFlashes:false,textSpeed:1,difficulty:'Resident'};
export const SETTINGS_KEY='critical-opinion:settings:v1';
export function readSettings(storage){try{return{...SETTINGS_DEFAULTS,...JSON.parse(storage?.getItem(SETTINGS_KEY)||'{}')};}catch{return{...SETTINGS_DEFAULTS};}}
export const LOOK=(sat=1,vig=.28,spread=0)=>({scene:[{id:'vignette',params:{intensity:vig}},{id:'adjust',params:{saturation:sat,contrast:1.04}},{id:'chromatic',params:{spread}}],actors:{pixel:{size:1,outline:.85,crease:.2},filters:[]},environment:{pixel:{size:1,outline:0,crease:0},filters:[]}});
