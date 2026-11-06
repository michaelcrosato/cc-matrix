export const ENEMY_DEFS = Object.freeze({
  drifter:{r:17,score:1,merge:true,speedKey:'drifterSpeed',hitShape:'circle',color:'#edc56d',arming:0},
  hunter:{r:21,score:3,merge:false,speedKey:'hunterSpeed',hitShape:'circle',color:'#ed688c',arming:1.15},
  gunship:{r:27,score:10,merge:false,speedKey:'gunshipSpeed',hitShape:'circle',color:'#bc94ff',arming:1.5},
  boss:{r:78,score:500,merge:false,hitShape:'components',color:'#ff855f',arming:2}
});
export const FORMATIONS = ['single','line','cluster','ring','fusion','cross','pincer','lane'];
