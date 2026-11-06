import { textureDef, TEXTURE_LIBRARY } from '../../pixel-engine.js';
export const tile = textureDef({id:'clinic-tile',size:[16,16],tile:true,palette:{grout:'mist',a:'white',b:'white'},layers:[{pattern:'tiles',colors:['grout','a','b'],w:16,h:16,mortar:1,seed:3}],about:'Spotless square clinic tiles with a fine grey grout',tags:['floor']});
TEXTURE_LIBRARY.add(tile);
