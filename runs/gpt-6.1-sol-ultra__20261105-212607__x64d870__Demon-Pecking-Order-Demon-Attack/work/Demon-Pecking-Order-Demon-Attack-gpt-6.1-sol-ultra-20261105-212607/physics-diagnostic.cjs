const R = require('@dimforge/rapier3d-compat');
(async()=>{
  await R.init();
  const mode=process.argv[2]||'ccd', runs=Number(process.argv[3]||5);
  let seed=1982;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  let frames=0,creates=0,contactsCount=0;
  for(let run=0;run<runs;run++) {
    const world=new R.World({x:0,y:0,z:0}),events=new R.EventQueue(true);world.timestep=1/60;
    const handles=new Map();let entities=[];
    const create=(kind,x,y)=>{
      const dynamic=kind==='shot'&&mode!=='kinematic';
      const b=world.createRigidBody((dynamic?R.RigidBodyDesc.dynamic():R.RigidBodyDesc.kinematicPositionBased()).setTranslation(x,y,0).lockRotations().setCanSleep(false));
      if(dynamic){b.setEnabledTranslations(true,true,false,true);if(mode==='ccd')b.enableCcd(true);}
      const member=kind==='shot'?1:2,filter=kind==='shot'?2:9;
      const c=world.createCollider(R.ColliderDesc.cuboid(kind==='shot'?.12:.86,kind==='shot'?.42:.56,.6).setSensor(true).setCollisionGroups((member<<16)|filter).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS).setActiveCollisionTypes(R.ActiveCollisionTypes.ALL),b);
      const e={kind,b,c,x,y,age:0,dead:false,phase:rand()*6.28};entities.push(e);handles.set(c.handle,e);creates++;
      if(dynamic)b.setLinvel({x:0,y:31,z:0},true);
      return e;
    };
    const remove=e=>{if(e.dead)return;e.dead=true;handles.delete(e.c.handle);world.removeRigidBody(e.b);};
    for(let j=0;j<3;j++)create('enemy',rand()*22-11,10.5+j*2.8);
    try {
      for(let f=0;f<36000;f++,frames++) {
        const t=f/60;
        if(f%11===0)create('shot',Math.sin(t*.91)*11,2.7);
        for(const e of entities){if(e.dead)continue;e.age+=1/60;if(e.kind==='enemy'){e.x=Math.sin(e.age*.85+e.phase)*11.4;e.b.setNextKinematicTranslation({x:e.x,y:e.y+Math.sin(t*1.7+e.phase)*.55,z:0});}else{if(e.age>1.5||e.b.translation().y>23){remove(e);continue;}if(mode==='kinematic'){e.y+=31/60;e.b.setNextKinematicTranslation({x:e.x,y:e.y,z:0});}}}
        world.step(events);const pairs=[];events.drainCollisionEvents((a,b,start)=>{if(start)pairs.push([a,b]);});
        for(const[a,b]of pairs){const ea=handles.get(a),eb=handles.get(b);if(!ea||!eb||ea.dead||eb.dead)continue;contactsCount++;remove(ea);remove(eb);create('enemy',rand()*22-11,10.5+Math.floor(rand()*3)*2.8);}
        entities=entities.filter(e=>!e.dead);
      }
    }catch(e){console.error(JSON.stringify({mode,run,frames,creates,contactsCount,error:String(e),stack:e.stack.split('\n').slice(0,14)}));process.exit(1);}
    world.free();events.free();
  }
  console.log(JSON.stringify({mode,runs,frames,creates,contactsCount,result:'pass'}));
})();
