/* Authored expedition data. Coordinates are ground-world units; one tile = 16. */
(function (G) {
  'use strict';
  const at = (x,y) => ({x:x*16+8,y:y*16+8});
  const tuning = {
    heroSpeed:{label:'Hero speed',value:66,min:35,max:110,step:1},
    recovery:{label:'Primary recovery',value:.65,min:.2,max:1.5,step:.05},
    powerCooldown:{label:'Class cooldown',value:7,min:2,max:15,step:.5},
    powerDuration:{label:'Class duration',value:2.8,min:1,max:6,step:.1},
    stunDuration:{label:'Stun duration',value:2.5,min:.5,max:5,step:.1},
    enemySpeed:{label:'Enemy movement',value:22,min:10,max:45,step:1},
    attackCadence:{label:'Enemy attack cadence',value:2.6,min:1.5,max:6,step:.1},
    telegraph:{label:'Hazard warning',value:1.8,min:1,max:4,step:.1},
    damage:{label:'Incoming damage',value:1,min:.5,max:2,step:.5},
    reviveTime:{label:'Revive hold time',value:1.5,min:.5,max:3,step:.1},
    companionResponse:{label:'Companion response',value:.2,min:.05,max:.8,step:.05},
    directorCadence:{label:'Ringmaster cadence',value:15,min:8,max:30,step:1},
    dreadInfluence:{label:'Dread influence',value:1,min:0,max:2,step:.1},
  };
  const heroes = {
    warrior:{name:'Warrior',epithet:'The Oath of Iron',symbol:'◆',color:'#e9b55c',primary:'Sword arc',power:'Facing shield',description:'Cut lesser foes. Brace a shield for your companion.',role:'Guard the crossing; the great horrors cannot be slain.'},
    wizard:{name:'Wizard',epithet:'The Last Ember',symbol:'✦',color:'#86b9ff',primary:'Stunning rune',power:'Flame ward',description:'Still a foe. Raise a ward to break fire and bolts.',role:'Your spell buys time; it does not take life.'},
    phantom:{name:'Phantom',epithet:'The Unfinished Knight',symbol:'◇',color:'#8af3d9',primary:'Revealing pulse',power:'Walk through stone',description:'Reveal hidden ways. Phase through interior walls.',role:'Stone yields. Boundaries, seals and lava do not.'},
    changeling:{name:'Changeling',epithet:'The Mirror’s Heir',symbol:'◈',color:'#dca0e9',primary:'Decoy echo',power:'Mirrorcloak',description:'Lure the hunt away. Vanish, but beware its touch.',role:'A carried ring shines even beneath the cloak.'},
  };
  // Build layouts from explicit rectangles/segments: a designer can inspect each tile.
  function layout(rects=[],lava=[],crystal=[],shiftA=[],shiftB=[]) {
    const a=Array.from({length:19},(_,y)=>Array.from({length:25},(_,x)=>x===0||y===0||x===24||y===18?'#':'.'));
    const put=(rs,c)=>rs.forEach(([x,y,w,h])=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)a[j][i]=c;});
    put(rects,'w');put(lava,'~');put(crystal,'c');put(shiftA,'s');put(shiftB,'t');
    return a.map(r=>r.join(''));
  }
  const prop=(kind,x,y,extra={})=>({kind,...at(x,y),z:0,...extra});
  const enemy=(kind,x,y)=>({kind,...at(x,y)});
  const lane=(id,x,y,w,h,offset=0,period=9)=>({id,x:x*16,y:y*16,w:w*16,h:h*16,offset,period,duration:1.65});
  const room=(id,name,family,rows,entry,exit,ring,enemies,extra={})=>({
    id,name,family,rows,entry:at(...entry),fallback:at(...entry),exit:at(...exit),ring:ring?at(...ring):null,
    enemies,hazards:[],props:[],reveal:{period:8,duration:2.2},shiftPeriod:10,
    navigation:{regions:'tile-grid',radius:4.2},camera:{margin:40,zoom:[.6,1]},
    enemyBudget:enemies.length+2,directorEvents:['lane','reinforcement','echo'],
    tutorial:'',...extra,
  });
  const rooms = {
    courtyard:room('courtyard','Courtyard of the Unforgotten','courtyard',layout([[6,4,3,2],[16,4,3,2],[6,12,3,2],[16,12,3,2]]),[4,14],[20,4],null,[],{
      tutorial:'WASD / left stick: move. Aim with the mouse / right stick. Try your primary, class power and dodge. Reach the golden waystone.',
      props:[prop('statue',12,5),prop('brazier',5,9),prop('brazier',19,9),prop('tree',3,4),prop('tree',21,14),prop('banner',8,4),prop('banner',17,4)],directorEvents:[],
      fiction:'Two shadows cross the threshold. Let one become the other’s shelter.',
    }),
    dungeon1:room('dungeon1','I · The Broken Gatehouse','dungeon',layout([[7,3,2,8],[15,8,2,8],[7,14,4,2],[18,3,3,2]]),[3,15],[21,3],[20,14],[enemy('fighter',12,5)],{
      practice:true,tutorial:'Take the small oath-ring at the far shrine, then carry it to the lit north gate. The companion will cover your path.',
      props:[prop('torch',6,3),prop('torch',16,8),prop('banner',8,3),prop('bones',13,12),prop('crate',4,5),prop('pillar',21,7)],
      fiction:'The first gate remembers every hand that failed to open it.',directorEvents:['reinforcement'],
    }),
    dungeon2:room('dungeon2','II · Vault of the Hollow Crown','dungeon',layout([[6,2,2,10],[13,6,2,10],[18,3,3,2],[19,10,2,5]]),[3,15],[3,15],[21,3],[enemy('fighter',10,8),enemy('fire',20,8),enemy('fighter',17,15)],{
      tutorial:'The true ring calls the hunt. Take it, then return to the golden exit. Hold context near a fallen companion to revive.',
      hazards:[lane('vault',9,3,3,1,3,11)],props:[prop('brazier',3,3),prop('torch',12,6),prop('statue',22,2),prop('bones',18,16),prop('banner',7,2)],
      fiction:'Beneath the hollow crown, the first circle waits for living hands.',
    }),
    crystal1:room('crystal1','III · The Remembering Grotto','crystal',layout([[11,7,3,2]],[],[[6,3,1,11],[16,5,1,11],[7,13,5,1]]),[3,15],[21,3],null,[enemy('spider',12,4)],{
      tutorial:'Crystal walls fade, never their weight. Watch the recurring ripple; contact reveals an edge. Phantom’s pulse remembers more.',
      props:[prop('crystal',4,3),prop('crystal',20,15),prop('mushroom',10,15),prop('cobweb',13,3)],directorEvents:['lane','echo'],
      fiction:'The stone forgets its face. Remember the way with your feet.',
    }),
    crystal2:room('crystal2','IV · The Choir Without Voices','crystal',layout([[10,8,4,2]],[],[[6,2,1,10],[6,14,10,1],[16,4,1,8],[20,9,1,6]]),[3,15],[3,15],[21,3],[enemy('spider',11,4),enemy('nightmare',18,12),enemy('spider',10,16)],{
      tutorial:'A spider’s shadow marks its fall. Leave the circle before it closes. The ring must return through the fading choir.',
      hazards:[lane('choir',17,7,5,1,3,12)],props:[prop('crystal',3,3),prop('crystal',21,16),prop('crystal',13,12),prop('bones',9,3)],
      fiction:'Their silent choir sings only for the treasure that leaves.',
    }),
    inferno1:room('inferno1','V · The Ashen Causeway','inferno',layout([[10,4,2,3],[16,12,2,3]],[[6,2,2,10],[6,14,2,3],[13,7,2,10],[20,2,2,6]]),[3,15],[21,12],null,[enemy('fire',17,4)],{
      tutorial:'Chevrons foretell flame. Wait on pale stone, then cross after the breath. Neither cloak nor phase protects against lava.',
      hazards:[lane('causeway',8,11,5,2,0,9),lane('furnace',15,8,8,2,4.5,10)],
      props:[prop('brazier',3,4),prop('brazier',18,16),prop('pillar',11,4),prop('bones',18,10)],directorEvents:['lane'],
      fiction:'The mountain lends you a heartbeat between each breath.',
    }),
    inferno2:room('inferno2','VI · The Furnace of Lost Suns','inferno',layout([[10,3,2,5],[17,11,2,4]],[[6,2,2,11],[6,15,2,2],[13,8,2,9],[20,5,2,9]]),[3,15],[3,15],[22,3],[enemy('fire',17,5),enemy('fighter',10,14),enemy('nightmare',18,16)],{
      tutorial:'The furnace breathes in turns. A Wizard’s ward can shelter a crossing; every hero may use its quiet interval.',
      hazards:[lane('sunA',8,12,5,2,1,10),lane('sunB',15,8,5,2,6,10),lane('sunC',20,2,2,3,4,12)],
      props:[prop('brazier',3,3),prop('brazier',18,3),prop('door',11,3),prop('bones',23,16)],fiction:'Steal a sun’s last circle. Leave the ashes to their king.',
    }),
    shifting1:room('shifting1','VII · The Patient Engine','shifting',layout([[11,4,2,4],[11,12,2,4]],[],[],[[6,3,1,10],[17,7,1,10]],[[6,7,1,10],[17,2,1,10]]),[3,15],[21,3],null,[enemy('nightmare',13,9)],{
      tutorial:'Floor arrows warn before a partition moves. Stand clear. Both positions preserve a road; the shortest road changes.',
      props:[prop('pillar',4,3),prop('lamp',12,3),prop('lamp',12,16),prop('banner',21,15)],directorEvents:['shift','echo'],
      fiction:'The halls obey a clock whose hands are buried in the walls.',
    }),
    shifting2:room('shifting2','VIII · The Clock That Hunts','shifting',layout([[10,7,4,2],[3,3,2,2],[20,14,2,2]],[],[],[[7,2,1,11],[17,7,1,10]],[[7,7,1,10],[17,2,1,10]]),[3,15],[3,15],[21,3],[enemy('nightmare',13,4),enemy('fire',20,10),enemy('fighter',10,15)],{
      tutorial:'An echo wears your outline, never your will. Its crimson wind-up is a warning: step aside, then reclaim the road.',
      hazards:[lane('clock',9,11,7,1,2,12)],props:[prop('lamp',4,10),prop('lamp',21,5),prop('statue',12,3),prop('bones',15,16)],
      fiction:'The clock has counted your steps. Give it one it did not foresee.',
    }),
    cacheCrystal:room('cacheCrystal','The Hidden Mercy','crystal',layout([[10,8,4,2]],[],[[7,4,1,10],[17,4,1,10]]),[3,15],[3,15],[21,3],[enemy('spider',12,4)],{
      cache:true,reward:'heal',tutorial:'Optional mercy: retrieve the silver ember and return. The detour costs one Dread. Full team healing awaits.',
      props:[prop('chest',21,3),prop('crystal',3,3),prop('crystal',21,15)],fiction:'Even in the hidden places, a little mercy remains.',
    }),
    cacheShift:room('cacheShift','The Turnkey’s Promise','shifting',layout([[11,6,2,7]],[],[],[[6,3,1,10]],[[17,6,1,11]]),[3,15],[3,15],[21,3],[enemy('nightmare',14,4)],{
      cache:true,reward:'ward',tutorial:'Optional shelter: retrieve the turnkey’s ward and return. One Dread buys one blow of protection for each hero.',
      props:[prop('chest',21,3),prop('lamp',5,4),prop('lamp',19,14)],fiction:'The turnkey swore one door would never close upon the lost.',
    }),
    final:room('final','IX · The Mouth of the Ringmaster','final',layout([[7,5,2,2],[16,5,2,2],[7,12,2,2],[16,12,2,2]],[[11,8,3,3]],[[4,6,1,5]],[[20,6,1,4]],[[20,10,1,4]]),[12,16],[12,16],null,[enemy('dragon',12,3)],{
      stations:[at(3,3),at(21,3),at(21,15),at(3,15)],
      hazards:[lane('breathW',2,7,9,2,0,10),lane('breathE',14,10,9,2,5,10)],
      props:[prop('brazier',6,3),prop('brazier',18,3),prop('pillar',7,5),prop('pillar',16,12)],
      tutorial:'First, read the dragon’s breath. Shelter behind the pale stones. Four stolen rings shall bind what no sword can kill.',
      fiction:'I lent the dark its kingdoms. Who among you dares return the dawn?',directorEvents:['lane','shift','echo'],
    }),
  };
  const sites = [
    {id:'dungeon',name:'Hollow Crown',family:'dungeon',index:0,rooms:['dungeon1','dungeon2'],x:22,y:65,hazard:'Stone arches · lesser fighters',shortcut:'The King’s Bridge',description:'The first theft. An oath-ring teaches the burden of gold.'},
    {id:'crystal',name:'The Silent Choir',family:'crystal',index:1,rooms:['crystal1','crystal2'],x:43,y:29,hazard:'Fading crystal · falling spiders',shortcut:'The Glass Causeway',description:'Walls vanish from sight, but not beneath your hands.'},
    {id:'inferno',name:'Lost Suns',family:'inferno',index:2,rooms:['inferno1','inferno2'],x:68,y:65,hazard:'Flame lanes · firewraths',shortcut:'The Ember Stair',description:'Pale stone rests between the mountain’s breaths.'},
    {id:'shifting',name:'The Hunting Clock',family:'shifting',index:3,rooms:['shifting1','shifting2'],x:81,y:29,hazard:'Moving partitions · flying nightmares',shortcut:'The Unmoving Road',description:'The way you entered shall not be the way you leave.'},
    {id:'cacheCrystal',name:'Hidden Mercy',family:'crystal',rooms:['cacheCrystal'],x:24,y:24,hazard:'Optional · full team heal',description:'One additional Dread. Return carrying a silver ember.',cache:true},
    {id:'cacheShift',name:'Turnkey’s Promise',family:'shifting',rooms:['cacheShift'],x:87,y:76,hazard:'Optional · one-hit team ward',description:'One additional Dread. Rescue a promise from the clock.',cache:true},
    {id:'final',name:'The Ringmaster',family:'final',rooms:['final'],x:58,y:13,hazard:'Four seals · an undying dragon',description:'The four recovered rings open the final threshold.',final:true},
  ];
  const dialogue={
    board:'Choose a castle. Bring its ring home. Four circles shall close the mouth of night.',
    ring:'Carry it, little thief. Every shadow knows the weight of gold.',
    secured:'One circle broken from my crown. The road remembers your defiance.',
    echo:'Behold your borrowed shape. It serves the dark; it holds no claim upon your hand.',
    down:'Kneel only a moment. Your companion’s hand may yet find yours.',
    revive:'A hand against the dark. Rise; the road is not finished.',
    final:'Four circles, four stations. Bind the breath that no blade may silence.',
    bound:'The seals have answered. Now flee together, before the shadow learns your names.',
    victory:'The mountain closes its dreaming eye. Two small shadows carry morning home.',
  };
  G.RingContent={title:'Quest for the Fourfold Rings',version:'1.0.0',tile:16,at,heroes,rooms,sites,tuning,dialogue,
    defaults:()=>Object.fromEntries(Object.entries(tuning).map(([k,v])=>[k,v.value]))};
})(typeof window!=='undefined'?window:globalThis);
