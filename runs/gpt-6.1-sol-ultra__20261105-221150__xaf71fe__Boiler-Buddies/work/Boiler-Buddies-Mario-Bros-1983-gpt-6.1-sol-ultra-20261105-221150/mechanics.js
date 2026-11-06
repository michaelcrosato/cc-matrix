export const DEFAULT_TUNING = Object.freeze({
  speed: 7.6,
  jump: 15.2,
  gravity: 24,
  enemySpeed: 1,
  flipTime: 9,
  acceleration: 64,
  timeScale: 1,
});

export const PHASES = Object.freeze([
  { name: 'The night shift', subtitle: 'BUMP the deck. KICK the pest.', enemyTypes: ['beetle','beetle','beetle','beetle'], interval: 5.0 },
  { name: 'Crabby customers', subtitle: 'Copper crabs need TWO bumps!', enemyTypes: ['crab','beetle','crab','beetle','crab','beetle'], interval: 4.8 },
  { name: 'Loose change!', subtitle: 'A coin rush! Collect all 18 before the whistle.', bonus: true, duration: 25 },
  { name: 'Hop to it', subtitle: 'Hoppers only flip with their feet on a deck.', enemyTypes: ['hopper','beetle','hopper','crab','hopper','crab','hopper'], interval: 4.5 },
  { name: 'Cold comfort', subtitle: 'Frost slugs ice the decks. Bump them before they settle!', enemyTypes: ['frost','beetle','crab','frost','hopper','crab','frost','beetle'], interval: 4.5 },
  { name: 'The Kettle King', subtitle: 'Bump all THREE seals. Then kick the open core — or use a pulse!', boss: true },
]);

const HALF_W = .39;
const HALF_H = .67;
const FIXED = 1 / 120;
const WIDTH = 13.6;
const PLAYER_GROUP = (1 << 16) | 6;
const DROP_GROUP = (1 << 16) | 4;
const FLOOR_GROUP = (4 << 16) | 1;
const DECK_GROUP = (2 << 16) | 1;
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const toward = (n,target,amount) => n < target ? Math.min(target,n+amount) : Math.max(target,n-amount);

/** Arcade simulation. Rapier integrates gravity and all player/deck contacts;
 * enemy behaviour deliberately uses the original's predictable tier routes. */
export class GameSimulation {
  constructor(RAPIER, { onEvent = () => {} } = {}) {
    this.R = RAPIER;
    this.onEvent = onEvent;
    this.tuning = { ...DEFAULT_TUNING };
    this.seed = 0x1963;
    this.uid = 0;
    this.players = [];
    this.enemies = [];
    this.coins = [];
    this.hazards = [];
    this.platforms = [];
    this.boss = null;
    this.mode = 'title';
    this.phase = 1;
    this.score = 0;
    this.lives = 5;
    this.pulseCharges = 3;
    this.combo = 0;
    this.comboTimer = 0;
    this.time = 0;
    this.phaseTime = 0;
    this.message = '';
    this.messageTimer = 0;
    this.god = false;
    this.attract = false;
    this.accumulator = 0;
    this._lastInputs = [];
    this._remote = null;
    this.stats = this.emptyStats();
    this.buildWorld();
  }

  emptyStats() { return { bumps:0, flips:0, kicks:0, coins:0, pulses:0, hits:0, phases:0, bossHits:0, wraps:0, drops:0 }; }
  random() { this.seed = (Math.imul(this.seed,1664525)+1013904223) >>> 0; return this.seed/4294967296; }
  event(type, data = {}) { this.onEvent({ ...data, type, time: this.time }); }
  say(text, duration = 4) { this.message = text; this.messageTimer = duration; this.event('message',{text}); }

  buildWorld() {
    if (this.world) this.world.free();
    this.world = new this.R.World({ x:0, y:-this.tuning.gravity, z:0 });
    this.world.timestep = FIXED;
    this.platforms = [
      { id:0,x1:-14,x2:14,y:.7,thickness:.55,frozen:0 },
      { id:1,x1:-13.9,x2:-3,y:4.4,thickness:.36,frozen:0 },
      { id:2,x1:3,x2:13.9,y:4.4,thickness:.36,frozen:0 },
      { id:3,x1:-8.8,x2:8.8,y:8.2,thickness:.36,frozen:0 },
      { id:4,x1:-13.9,x2:-2.5,y:12,thickness:.36,frozen:0 },
      { id:5,x1:2.5,x2:13.9,y:12,thickness:.36,frozen:0 },
      { id:6,x1:-9,x2:9,y:15.8,thickness:.36,frozen:0 },
    ];
    for (const p of this.platforms) {
      p.collider = this.world.createCollider(this.R.ColliderDesc
        .cuboid((p.x2-p.x1)/2,p.thickness/2,.85)
        .setTranslation((p.x1+p.x2)/2,p.y-p.thickness/2,0)
        .setFriction(0).setRestitution(0)
        .setCollisionGroups(p.id === 0 ? FLOOR_GROUP : DECK_GROUP));
      p.bump = 0;
    }
    this.players = [];
  }

  createPlayer(index) {
    const x = index === 0 ? -1.3 : 1.3;
    const rb = this.world.createRigidBody(this.R.RigidBodyDesc.dynamic()
      .setTranslation(x,.7+HALF_H+.05,0)
      .enabledTranslations(true,true,false)
      .lockRotations().setCanSleep(false).setCcdEnabled(true));
    const collider = this.world.createCollider(this.R.ColliderDesc
      .cuboid(HALF_W,HALF_H,.33).setFriction(0).setRestitution(0)
      .setCollisionGroups(PLAYER_GROUP),rb);
    const p = { id:index,x,y:.7+HALF_H+.05,vx:0,vy:0,facing:index===0?1:-1,
      grounded:false,platformId:0,anim:'idle',invulnerable:2.5,deadTime:0,
      coyote:0,jumpBuffer:0,dropTime:0,kickTime:0,kickCooldown:0,bumpCooldown:0,
      rb,collider,alive:true,aiTimer:0,aiGoal:null };
    this.players.push(p);
    return p;
  }

  start({players=1,attract=false,phase=1}={}) {
    this._remote = null;
    this.attract = !!attract;
    this.playerCount = clamp(players,1,2);
    this.seed = 0x1963;
    this.uid = 0;
    this.score = 0;
    this.lives = this.playerCount===2 ? 7 : 5;
    this.pulseCharges = 3;
    this.combo = 0;
    this.comboTimer = 0;
    this.time = 0;
    this.stats = this.emptyStats();
    this.accumulator = 0;
    this._lastInputs = [];
    this._attractDemo = { wrapStarted:false,wrapUntil:0,dropStarted:false,dropUntil:0 };
    this.buildWorld();
    for(let i=0;i<this.playerCount;i++) this.createPlayer(i);
    this.phase = clamp(phase,1,PHASES.length);
    this.beginPhase();
    this.event('start',{players:this.playerCount,attract:this.attract});
  }

  beginPhase() {
    const phase = PHASES[this.phase-1];
    this.phaseName = phase.name;
    this.mode = phase.bonus ? 'bonus' : 'playing';
    this.phaseTime = 0;
    this.intermission = 0;
    this.enemies = [];
    this.coins = [];
    this.hazards = [];
    this.boss = null;
    this.spawnIndex = 0;
    this.spawnTimer = 1.25;
    this.hazardTimer = this.phase >= 4 ? 11 : Infinity;
    this.combo = 0;
    this.comboTimer = 0;
    this.bonusCollected = 0;
    this.bonusTotal = phase.bonus ? 18 : 0;
    for(const p of this.platforms) p.frozen=0;
    for(const p of this.players) {
      p.invulnerable=Math.max(p.invulnerable,2);
      p.aiGoal=null;
      p.aiTimer=0;
      if (!p.alive && !p.disconnected) this.respawn(p);
    }
    if (phase.bonus) {
      this.pulseCharges = 3;
      const spots = [[-11,1.45],[-7,1.45],[-2,1.45],[2,1.45],[7,1.45],[11,1.45],
        [-10,5.2],[-6,5.2],[6,5.2],[10,5.2],[-6,9.0],[0,9.0],[6,9.0],
        [-10,12.8],[-5,12.8],[5,12.8],[10,12.8],[0,16.6]];
      for(const [x,y] of spots) this.coins.push({id:++this.uid,x,y,vx:0,vy:0,life:99,bonus:true});
      this.bonusRemaining=phase.duration;
    }
    if (phase.boss) {
      this.pulseCharges=3;
      this.boss={id:++this.uid,x:0,y:17,hp:3,maxHp:3,open:0,seals:[{x:-5,lit:false},{x:0,lit:false},{x:5,lit:false}],state:'sealed',hitTime:0,attackTimer:7};
      this.spawnTimer=6;
    }
    this.say(phase.subtitle,6);
    this.event('phase',{phase:this.phase,name:phase.name,bonus:!!phase.bonus,boss:!!phase.boss});
  }

  nextPhase() {
    if(this.phase>=PHASES.length) { this.win(); return; }
    this.phase++;
    this.stats.phases++;
    this.beginPhase();
  }

  restartPhase() {
    for(const p of this.players) this.respawn(p);
    this.lives=Math.max(this.lives,3);
    this.beginPhase();
  }

  win() {
    if(this.mode==='won') return;
    this.mode='won';
    if(this.attract)this.attractRestart=4;
    this.stats.phases=PHASES.length;
    this.score+=2500+this.lives*500;
    this.say('SHIFT COMPLETE! Hot water, happy city.',99);
    this.event('win',{score:this.score});
  }

  setTuning(key,value) {
    const ranges={speed:[3,14],jump:[11,22],gravity:[10,40],enemySpeed:[.25,2.5],flipTime:[3,25],acceleration:[15,120],timeScale:[.25,2]};
    if(!ranges[key]||!Number.isFinite(Number(value)))return;
    this.tuning[key]=clamp(Number(value),...ranges[key]);
    if(key==='gravity') this.world.gravity={x:0,y:-this.tuning.gravity,z:0};
  }
  resetTuning() { this.tuning={...DEFAULT_TUNING}; this.world.gravity={x:0,y:-this.tuning.gravity,z:0}; }
  toggleGod() { this.god=!this.god;return this.god; }
  addLife() { this.lives=Math.min(this.lives+1,99); }
  refillPulse() { this.pulseCharges=3; }
  clearEnemies() { for(const e of [...this.enemies]) this.defeatEnemy(e,this.players[0]); }

  spawnEnemy(type='beetle',options={}) {
    if(!['beetle','crab','hopper','frost'].includes(type)) type='beetle';
    const side = this.spawnIndex%2===0 ? -1 : 1;
    const introductory=this.phase===1&&this.spawnIndex<2;
    const x=options.x ?? side*(introductory?8.5:12.2);
    const y=options.y ?? (introductory?5.05:12.65);
    const e={id:++this.uid,type,x,y,vx:0,vy:0,dir:options.dir ?? -side,
      state:'walking',hits:0,grounded:false,platformId:introductory?(side<0?1:2):(side<0?4:5),
      flipTimer:0,hurtTimer:0,hopTimer:1+this.random(),age:0,freezeTimer:0,angry:false,
      radius:type==='crab'?.61:type==='frost'?.5:.53};
    Object.assign(e,options);
    this.enemies.push(e);
    this.event('spawn',{x:e.x,y:e.y,enemyType:e.type});
    return e;
  }

  step(dt,inputs=[]) {
    if(this._remote) return;
    if(!Number.isFinite(dt)||dt<=0)return;
    if(this.attract&&this.mode==='won') {
      this.attractRestart-=dt;
      if(this.attractRestart<=0)this.start({players:this.playerCount,attract:true});
      return;
    }
    if(!['playing','bonus','intermission'].includes(this.mode))return;
    this.accumulator+=Math.min(dt,.1)*this.tuning.timeScale;
    let guard=0;
    while(this.accumulator>=FIXED&&guard++<30) {
      this.tick(FIXED,this.attract?this.autoInputs():inputs);
      this.accumulator-=FIXED;
    }
  }

  tick(dt,inputs) {
    this.time+=dt;
    this.phaseTime+=dt;
    this.messageTimer=Math.max(0,this.messageTimer-dt);
    if(this.messageTimer===0)this.message='';
    this.comboTimer=Math.max(0,this.comboTimer-dt);
    if(this.comboTimer===0)this.combo=0;
    for(const pl of this.platforms){pl.bump=Math.max(0,pl.bump-dt);pl.frozen=Math.max(0,pl.frozen-dt);}
    if(this.mode==='intermission') {
      this.intermission-=dt;
      if(this.intermission<=0){this.nextPhase();return;}
    }
    for(let i=0;i<this.players.length;i++) {
      const p=this.players[i];
      const inp=inputs[i]||{};
      const previous=this._lastInputs[i]||{};
      const edge={jump:!!inp.jump&&!previous.jump,kick:!!inp.kick&&!previous.kick,drop:!!inp.drop&&!previous.drop,pulse:!!inp.pulse&&!previous.pulse};
      this._lastInputs[i]={jump:!!inp.jump,kick:!!inp.kick,drop:!!inp.drop,pulse:!!inp.pulse};
      this.beforePlayer(p,inp,edge,dt);
    }
    this.world.step();
    for(const p of this.players)this.afterPlayer(p,dt);
    if(this.mode==='playing') {
      this.updateSpawns(dt);
      this.updateEnemies(dt);
      this.updateBoss(dt);
      this.updateHazards(dt);
    }
    this.updateCoins(dt);
    if(this.mode==='bonus') {
      this.bonusRemaining=Math.max(0,PHASES[this.phase-1].duration-this.phaseTime);
      if(this.bonusRemaining<=0||this.bonusCollected>=this.bonusTotal) {
        const perfect=this.bonusCollected>=this.bonusTotal;
        const bonus=perfect?3000:500;
        this.score+=bonus;
        this.say(perfect?'PERFECT HAUL! +3000':'COINS IN THE TILL! +500',3);
        this.completePhase();
      }
    }
    if(this.attract&&this.phaseTime>38&&this.mode==='playing'&&!this.boss)this.completePhase();
  }

  beforePlayer(p,inp,edge,dt) {
    p.invulnerable=Math.max(0,p.invulnerable-dt);
    p.dropTime=Math.max(0,p.dropTime-dt);
    p.kickTime=Math.max(0,p.kickTime-dt);
    p.kickCooldown=Math.max(0,p.kickCooldown-dt);
    p.bumpCooldown=Math.max(0,p.bumpCooldown-dt);
    if(p.deadTime>0) {
      p.deadTime-=dt;
      p.anim='hurt';
      if(p.deadTime<=0&&this.mode!=='lost')this.respawn(p);
      return;
    }
    if(!p.alive)return;
    p.collider.setCollisionGroups(p.dropTime>0?DROP_GROUP:PLAYER_GROUP);
    const pos=p.rb.translation();
    const vel=p.rb.linvel();
    p.x=pos.x;p.y=pos.y;
    p._before={x:pos.x,y:pos.y,vy:vel.y};
    let grounded=false;
    for(const pl of this.platforms) {
      if((pl.id===0||p.dropTime<=0)&&pos.x>pl.x1-HALF_W*.7&&pos.x<pl.x2+HALF_W*.7&&Math.abs(pos.y-HALF_H-pl.y)<.09&&vel.y<1.2){
        grounded=true;p.platformId=pl.id;break;
      }
    }
    p.grounded=grounded;
    p.coyote=grounded?.12:Math.max(0,p.coyote-dt);
    p.jumpBuffer=edge.jump?.13:Math.max(0,p.jumpBuffer-dt);
    const x=clamp(Number(inp.x)||0,-1,1);
    if(Math.abs(x)>.1)p.facing=x>0?1:-1;
    const icy=grounded&&this.platforms[p.platformId]?.frozen>0;
    const accel=grounded?(icy?14:this.tuning.acceleration):this.tuning.acceleration*.55;
    const friction=icy?4.2:this.tuning.acceleration*1.25;
    let vx=toward(vel.x,x*this.tuning.speed,(Math.abs(x)>.08?accel:friction)*dt);
    let vy=vel.y;
    if(p.jumpBuffer>0&&p.coyote>0) {
      vy=this.tuning.jump;p.jumpBuffer=0;p.coyote=0;p.grounded=false;
      this.event('jump',{x:p.x,y:p.y,player:p.id});
    }
    if(edge.drop&&p.grounded&&p.platformId!==0) {
      p.dropTime=.3;p.collider.setCollisionGroups(DROP_GROUP);
      p.rb.setTranslation({x:p.x,y:p.y-.14,z:0},true);vy=-4;
      p.coyote=0;p.grounded=false;this.stats.drops++;
      this.event('drop',{x:p.x,y:p.y,player:p.id});
    }
    if(edge.kick&&p.kickCooldown<=0) {
      p.kickTime=.24;p.kickCooldown=.33;
      this.event('swing',{x:p.x+p.facing*.5,y:p.y,player:p.id});
      if(this.boss?.open>0&&Math.abs(p.x-this.boss.x)<2.1&&Math.abs(p.y-this.boss.y)<2.2)this.hitBoss(p);
    }
    if(edge.pulse)this.pulse(p);
    p.rb.setLinvel({x:vx,y:vy,z:0},true);
    p.anim=p.kickTime>0?'kick':!p.grounded?(vy>0?'jump':'fall'):Math.abs(vx)>.3?'run':'idle';
  }

  afterPlayer(p,dt) {
    if(!p.alive)return;
    const pos=p.rb.translation(),v=p.rb.linvel();
    p.x=pos.x;p.y=pos.y;p.vx=v.x;p.vy=v.y;
    if(p.x>WIDTH||p.x<-WIDTH) {
      p.x=p.x>0?-WIDTH+.03:WIDTH-.03;
      p.rb.setTranslation({x:p.x,y:p.y,z:0},true);
      this.stats.wraps++;
      this.event('wrap',{x:p.x,y:p.y,player:p.id});
    }
    const before=p._before;
    if(before&&before.vy>1&&p.bumpCooldown<=0&&p.dropTime<=0) {
      for(const pl of this.platforms) {
        if(pl.id===0)continue;
        const bottom=pl.y-pl.thickness;
        if(p.x>pl.x1-HALF_W*.55&&p.x<pl.x2+HALF_W*.55&&
          before.y+HALF_H<=bottom+.07&&p.y+HALF_H>=bottom-.075&&p.y<bottom) {
          p.bumpCooldown=.19;
          this.bump(pl.id,p.x,p);
          break;
        }
      }
    }
    if(p.y<-2)this.hurtPlayer(p);
  }

  respawn(p) {
    p.alive=true;p.deadTime=0;p.x=p.id===0?-1.3:1.3;p.y=.7+HALF_H+.04;
    p.vx=0;p.vy=0;p.invulnerable=3;p.dropTime=0;p.kickTime=0;p.coyote=0;p.jumpBuffer=0;
    p.rb.setEnabled(true);p.rb.setTranslation({x:p.x,y:p.y,z:0},true);p.rb.setLinvel({x:0,y:0,z:0},true);
    p.collider.setCollisionGroups(PLAYER_GROUP);
    this.event('respawn',{x:p.x,y:p.y,player:p.id});
  }

  hurtPlayer(p) {
    if(!p.alive||p.invulnerable>0||this.god||this.attract||this.mode!=='playing')return;
    this.stats.hits++;this.lives--;this.combo=0;
    p.alive=false;p.deadTime=.8;p.rb.setEnabled(false);p.anim='hurt';
    this.event('hurt',{x:p.x,y:p.y,player:p.id,lives:this.lives});
    if(this.lives<=0){this.mode='lost';this.say('SHIFT OVER! The pipes demand a rematch.',99);this.event('lose',{score:this.score});}
  }

  bump(platformId,x,player=this.players[0],range=1.9) {
    const platform=this.platforms[platformId];
    if(!platform)return;
    platform.bump=.32;this.stats.bumps++;
    this.event('bump',{x,y:platform.y,platformId,player:player?.id??0});
    if(platform.frozen>0) {
      platform.frozen=Math.max(0,platform.frozen-5);
      this.event('crack',{x,y:platform.y});
    }
    for(const e of this.enemies) {
      if(e.state==='dead'||e.platformId!==platformId||Math.abs(e.x-x)>range)continue;
      if(!e.grounded||e.y-e.radius>platform.y+.18)continue;
      this.hitEnemy(e,player);
    }
    if(this.boss&&platformId===6&&this.boss.open<=0) {
      const seal=this.boss.seals.find(s=>Math.abs(s.x-x)<2.2&&!s.lit);
      if(seal) {
        seal.lit=true;
        this.event('seal',{x:seal.x,y:platform.y,remaining:this.boss.seals.filter(s=>!s.lit).length});
        if(this.boss.seals.every(s=>s.lit)) {
          this.boss.open=10;this.boss.state='open';
          this.say('CORE OPEN! Reach the top and KICK — or fire a PULSE!',5);
          this.event('bossOpen',{x:0,y:17});
        }
      }
    }
  }

  hitEnemy(e,player=this.players[0],isPulse=false) {
    if(e.state==='dead'||e.hurtTimer>0)return;
    if(e.state==='flipped') {
      e.state='walking';e.flipTimer=0;e.hits=0;e.vy=4.5;e.grounded=false;
      e.hurtTimer=.25;this.event('unflip',{x:e.x,y:e.y,id:e.id});return;
    }
    e.hits++;
    e.hurtTimer=.22;
    if(e.type==='crab'&&e.hits<2&&!isPulse) {
      e.angry=true;e.vy=3;e.grounded=false;
      this.event('angry',{x:e.x,y:e.y,id:e.id});
      if(this.phase===2)this.say('ONE MORE BUMP! That crab is getting cross.',3);
      return;
    }
    e.state='flipped';e.flipTimer=this.tuning.flipTime;e.vy=4.8;e.grounded=false;
    this.stats.flips++;
    this.event('flip',{x:e.x,y:e.y,enemyType:e.type,id:e.id,player:player?.id??0});
    if(this.stats.flips===1)this.say('BELLY UP! Touch it — or press KICK — to boot it out!',4);
  }

  pulse(player=this.players[0]) {
    if(this.pulseCharges<=0||!['playing','bonus'].includes(this.mode)) {
      this.event('empty',{x:player?.x??0,y:player?.y??0});return false;
    }
    this.pulseCharges--;this.stats.pulses++;
    this.event('pow',{x:player?.x??0,y:player?.y??0,charges:this.pulseCharges});
    for(const pl of this.platforms){pl.bump=.4;pl.frozen=0;}
    for(const e of this.enemies)if(e.grounded&&e.state==='walking')this.hitEnemy(e,player,true);
    this.hazards=[];
    if(this.boss?.open>0)this.hitBoss(player);
    if(this.mode==='bonus') {
      for(const c of [...this.coins])if(Math.abs(c.x-(player?.x??0))<5)this.collectCoin(c,player);
    }
    return true;
  }

  defeatEnemy(e,player=this.players[0]) {
    if(e.state==='dead')return;
    e.state='dead';e.life=.75;e.vx=(player?.facing??1)*10;e.vy=9;
    this.combo=this.comboTimer>0?Math.min(this.combo+1,8):1;
    this.comboTimer=4;
    const points=100*this.combo*(e.type==='crab'?2:1);
    this.score+=points;this.stats.kicks++;
    this.event('kick',{x:e.x,y:e.y,enemyType:e.type,id:e.id,points,combo:this.combo,player:player?.id??0});
    this.coins.push({id:++this.uid,x:e.x,y:e.y+.5,vx:0,vy:7,life:12,collectDelay:.3,bonus:false});
    if(this.stats.kicks===1)this.say('THAT’S THE TRICK! Clear every pest to finish the shift.',5);
    if(this.combo>=2)this.event('combo',{x:e.x,y:e.y+1,text:`${this.combo}× COMBO!`});
  }

  updateSpawns(dt) {
    const phase=PHASES[this.phase-1];
    if(phase.boss) {
      this.spawnTimer-=dt;
      if(this.spawnTimer<=0&&this.enemies.filter(e=>e.state!=='dead').length<4) {
        this.spawnEnemy(this.boss?.hp===1?'hopper':'beetle');this.spawnIndex++;
        this.spawnTimer=10;
      }
      return;
    }
    this.spawnTimer-=dt;
    if(this.spawnIndex<phase.enemyTypes.length&&this.spawnTimer<=0) {
      this.spawnEnemy(phase.enemyTypes[this.spawnIndex]);
      this.spawnIndex++;this.spawnTimer=phase.interval;
    }
    if(this.spawnIndex>=phase.enemyTypes.length&&!this.enemies.some(e=>e.state!=='dead'))this.completePhase();
  }

  completePhase() {
    if(this.mode==='intermission'||this.mode==='won'||this.mode==='lost')return;
    if(this.phase===PHASES.length){this.win();return;}
    this.mode='intermission';this.intermission=2.8;
    this.score+=500;
    if(!PHASES[this.phase-1].bonus)this.say('PIPES CLEAR! +500',2.5);
    this.event('clear',{phase:this.phase,score:this.score});
  }

  updateEnemies(dt) {
    for(const e of this.enemies) {
      e.age+=dt;e.hurtTimer=Math.max(0,e.hurtTimer-dt);
      if(e.state==='dead') {e.life-=dt;e.vy-=this.tuning.gravity*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;continue;}
      const wasGrounded=e.grounded;
      if(e.state==='flipped') {
        e.flipTimer-=dt;
        if(e.flipTimer<=0){e.state='walking';e.hits=0;e.angry=true;e.vy=4;e.grounded=false;this.event('recover',{x:e.x,y:e.y,id:e.id});}
      }
      const speed=(e.type==='crab'?1.65:e.type==='hopper'?1.8:e.type==='frost'?1.25:1.9)*this.tuning.enemySpeed*(e.angry?1.5:1);
      const oldY=e.y;
      e.vy-=this.tuning.gravity*dt;
      if(e.state==='walking') {
        if(e.type==='hopper'&&e.grounded) {
          e.hopTimer-=dt;
          if(e.hopTimer<=0){e.vy=5.6;e.grounded=false;e.hopTimer=.65+this.random()*.4;this.event('hop',{x:e.x,y:e.y});}
        }
        e.vx=e.dir*speed;
      } else e.vx=toward(e.vx,0,15*dt);
      e.x+=e.vx*dt;e.y+=e.vy*dt;e.grounded=false;
      if(e.vy<=0) {
        let landing=null;
        for(const pl of this.platforms)if(e.x>=pl.x1-.1&&e.x<=pl.x2+.1&&oldY-e.radius>=pl.y-.08&&e.y-e.radius<=pl.y&&(!landing||pl.y>landing.y))landing=pl;
        if(landing) {
          const previousPlatform=e.platformId;
          e.y=landing.y+e.radius;e.vy=0;e.grounded=true;e.platformId=landing.id;
          if(previousPlatform!==landing.id&&e.state==='walking') {
            if([1,2,4,5].includes(landing.id))e.dir=e.x<0?1:-1;
            else if(landing.id===3)e.dir=e.x<0?-1:1;
            else if(landing.id===0)e.dir=e.x<0?-1:1;
          }
        }
      }
      if(e.x>WIDTH+.4||e.x<-WIDTH-.4) {
        if(e.platformId===0) {
          const side=e.x<0?-1:1;e.x=side*12.2;e.y=12.7;e.vy=0;e.dir=-side;e.platformId=side<0?4:5;e.grounded=false;e.angry=true;
          this.event('recycle',{x:e.x,y:e.y,id:e.id});
        } else {e.x=e.x>0?-WIDTH:WIDTH;}
      }
      if(e.type==='frost'&&e.state==='walking'&&e.grounded&&e.platformId!==0) {
        e.freezeTimer+=dt;
        if(e.freezeTimer>3.7&&this.platforms[e.platformId].frozen<=0) {
          this.platforms[e.platformId].frozen=16;
          e.freezeTimer=0;e.angry=true;
          this.event('freeze',{x:e.x,y:e.y,platformId:e.platformId});
        }
      }
      for(const p of this.players) {
        if(!p.alive||Math.abs(p.y-e.y)>1.04)continue;
        const reach=p.kickTime>0?1.55:.88;
        if(e.state==='flipped'&&Math.abs(p.x-e.x)<reach) {this.defeatEnemy(e,p);break;}
        if(e.state==='walking'&&Math.abs(p.x-e.x)<.78&&e.hurtTimer<=0) {
          if(p.kickTime>0&&Math.sign(e.x-p.x||p.facing)===p.facing) {
            e.dir=p.facing;e.x+=p.facing*.5;e.hurtTimer=.3;
            this.event('shove',{x:e.x,y:e.y});
          } else this.hurtPlayer(p);
        }
      }
      if(e.y<-3){e.y=12.7;e.x=12.2;e.dir=-1;e.vy=0;e.platformId=5;}
      // Keep the local variable useful to animation consumers via a landing event.
      if(!wasGrounded&&e.grounded&&e.type==='hopper')this.event('land',{x:e.x,y:e.y});
    }
    this.enemies=this.enemies.filter(e=>e.state!=='dead'||e.life>0);
  }

  hitBoss(player=this.players[0]) {
    const b=this.boss;
    if(!b||b.open<=0||b.hitTime>0||b.hp<=0)return false;
    b.hp--;b.open=0;b.hitTime=.9;b.state='hurt';this.stats.bossHits++;this.score+=1500;
    this.event('bossHit',{x:b.x,y:b.y,hp:b.hp,player:player?.id??0});
    if(b.hp<=0) {
      b.state='defeated';
      for(const e of this.enemies)this.defeatEnemy(e,player);
      this.win();
    } else {
      for(const seal of b.seals)seal.lit=false;
      this.say(b.hp===1?'LAST ROUND! Three seals. One very cross kettle.':'GOOD HIT! Vent the three seals again!',5);
    }
    return true;
  }

  updateBoss(dt) {
    const b=this.boss;if(!b)return;
    b.hitTime=Math.max(0,b.hitTime-dt);
    if(b.open>0) {
      b.open=Math.max(0,b.open-dt);
      if(b.open===0){for(const seal of b.seals)seal.lit=false;b.state='sealed';this.say('TOO SLOW! Bump those three seals again.',4);}
    } else if(b.hitTime<=0&&b.hp>0)b.state='sealed';
    b.attackTimer-=dt;
    if(b.attackTimer<=0&&b.hp>0) {
      b.attackTimer=6+b.hp;
      this.makeHazard(b.x,b.y-1,this.players[0]?.x<0?-1:1);
      this.event('bossAttack',{x:b.x,y:b.y});
    }
  }

  makeHazard(x,y,dir=1) {
    const h={id:++this.uid,type:'ember',x,y,originY:y,vx:dir*4.2,life:9,age:0};
    this.hazards.push(h);this.event('ember',{x,y});return h;
  }
  updateHazards(dt) {
    this.hazardTimer-=dt;
    if(this.hazardTimer<=0&&!this.boss){this.makeHazard(-13,2.4+(this.random()<.5?0:7.5),1);this.hazardTimer=13;}
    for(const h of this.hazards) {
      h.life-=dt;h.age+=dt;h.x+=h.vx*dt;h.y=h.originY+Math.sin(h.age*3.4)*.7;
      for(const p of this.players)if(p.alive&&Math.abs(p.x-h.x)<.85&&Math.abs(p.y-h.y)<1)this.hurtPlayer(p);
    }
    this.hazards=this.hazards.filter(h=>h.life>0&&Math.abs(h.x)<15);
  }

  collectCoin(c,player=this.players[0]) {
    if(c.collected)return;
    c.collected=true;this.score+=c.bonus?100:200;this.stats.coins++;
    if(c.bonus)this.bonusCollected++;
    this.event('coin',{x:c.x,y:c.y,player:player?.id??0,bonus:c.bonus});
  }
  updateCoins(dt) {
    for(const c of this.coins) {
      c.life-=dt;c.collectDelay=Math.max(0,(c.collectDelay||0)-dt);
      if(!c.bonus) {
        const old=c.y;c.vy-=this.tuning.gravity*dt;c.y+=c.vy*dt;
        if(c.vy<0)for(const pl of this.platforms)if(c.x>pl.x1&&c.x<pl.x2&&old-.35>=pl.y-.08&&c.y-.35<=pl.y){c.y=pl.y+.35;c.vy=0;break;}
      }
      for(const p of this.players)if(p.alive&&c.collectDelay<=0&&Math.abs(p.x-c.x)<.9&&Math.abs(p.y-c.y)<1.05){this.collectCoin(c,p);break;}
    }
    this.coins=this.coins.filter(c=>!c.collected&&c.life>0);
  }

  /** Attract actors cheat with occasional relocation, while every displayed
   * bump, flip, coin, kick and boss hit still passes through normal mechanics. */
  autoInputs() {
    return this.players.map((p,index)=>{
      // Give the kiosk audience a readable lap through the two shortcuts before
      // the first pest arrives; later a pulse demonstrates the limited rescue.
      if(index===0&&this.phase===1) {
        const demo=this._attractDemo;
        if(!demo.wrapStarted) {
          demo.wrapStarted=true;demo.wrapUntil=this.time+1.05;
          this.teleportPlayer(p.id,10.8,1.4);
          p.rb.setLinvel({x:this.tuning.speed,y:0,z:0},true);
        }
        if(this.time<demo.wrapUntil)return {x:1};
        if(!demo.dropStarted) {
          demo.dropStarted=true;demo.dropUntil=this.time+.85;
          this.teleportPlayer(p.id,-6,5.12);
        }
        if(this.time<demo.dropUntil)return {x:0,drop:this.stats.drops===0&&p.grounded};
      }
      if(index===0&&this.phase===4&&this.phaseTime>1.6&&this.stats.pulses===0&&this.enemies.some(e=>e.grounded&&e.state==='walking'))return {pulse:true};
      p.aiTimer-=FIXED;
      if(p.aiTimer<=0) {
        p.aiTimer=.8+this.random()*.5;
        if(this.mode==='bonus') {
          const c=this.coins[(index+Math.floor(this.phaseTime))%Math.max(1,this.coins.length)];
          if(c) {this.teleportPlayer(p.id,c.x,c.y);p.aiGoal={type:'coin',x:c.x};}
        } else if(this.boss) {
          const seal=this.boss.seals.find(s=>!s.lit);
          if(this.boss.open>0) {
            this.teleportPlayer(p.id,0,17.1);p.aiGoal={type:'boss',x:0};
            this.hitBoss(p);
          } else if(seal) {
            this.teleportPlayer(p.id,seal.x,14.4);p.rb.setLinvel({x:0,y:10,z:0},true);p.aiGoal={type:'seal',x:seal.x};
          }
        } else {
          const target=this.enemies.find(e=>e.state==='flipped')||this.enemies.find(e=>e.state==='walking'&&e.grounded&&(e.type!=='frost'||e.age>4.2));
          if(target) {
            if(target.state==='flipped') {
              this.teleportPlayer(p.id,target.x-.65,target.y+.2);p.aiGoal={type:'kick',x:target.x};
            } else {
              const deck=this.platforms[target.platformId];
              if(deck&&deck.id!==0) {
                this.teleportPlayer(p.id,target.x,deck.y-deck.thickness-HALF_H-.3);
                p.rb.setLinvel({x:0,y:10,z:0},true);
                p.aiGoal={type:'bump',x:target.x};
              } else {
                this.hitEnemy(target,p,true);p.aiGoal={type:'kick',x:target.x};
              }
            }
          } else p.aiGoal={type:'wander',x:Math.sin(this.phaseTime)*10};
        }
      }
      const goal=p.aiGoal||{x:0};
      return {x:clamp((goal.x-p.x)*2,-1,1),jump:goal.type==='seal'&&p.grounded&&Math.sin(this.time*7)>0,kick:goal.type==='kick'||goal.type==='boss',drop:false,pulse:false};
    });
  }

  teleportPlayer(index,x,y) {
    const p=this.players[index];if(!p)return;
    p.x=x;p.y=y;p.vx=0;p.vy=0;p.alive=true;p.deadTime=0;p.dropTime=0;
    p.rb.setEnabled(true);p.rb.setTranslation({x,y,z:0},true);p.rb.setLinvel({x:0,y:0,z:0},true);
  }

  snapshot() {
    if(this._remote)return this._remote;
    const {mode,phase,phaseName,score,lives,pulseCharges,combo,comboTimer,time,phaseTime,message,messageTimer,bonusCollected,bonusTotal,bonusRemaining,attract,god}=this;
    return {
      mode,phase,phaseName,score,lives,pulseCharges,combo,comboTimer,time,phaseTime,message,messageTimer,
      bonusCollected:bonusCollected||0,bonusTotal:bonusTotal||0,bonusRemaining:bonusRemaining||0,attract,god,
      tuning:{...this.tuning},stats:{...this.stats},
      platforms:this.platforms.map(({id,x1,x2,y,thickness,frozen,bump})=>({id,x1,x2,y,thickness,frozen,bump})),
      players:this.players.map(({id,x,y,vx,vy,facing,grounded,platformId,anim,invulnerable,alive,deadTime,kickTime})=>({id,x,y,vx,vy,facing,grounded,platformId,anim,invulnerable,alive,deadTime,kickTime})),
      enemies:this.enemies.map(e=>({...e})),coins:this.coins.map(c=>({...c})),hazards:this.hazards.map(h=>({...h})),
      boss:this.boss?{...this.boss,seals:this.boss.seals.map(s=>({...s}))}:null,
      enemiesRemaining:PHASES[this.phase-1]?.enemyTypes ? Math.max(0,PHASES[this.phase-1].enemyTypes.length-this.spawnIndex)+this.enemies.filter(e=>e.state!=='dead').length : this.boss?.hp||0,
    };
  }

  loadSnapshot(snapshot) {
    if(!snapshot||!Array.isArray(snapshot.players)||!Array.isArray(snapshot.platforms))return false;
    this._remote=JSON.parse(JSON.stringify(snapshot));
    this.mode=snapshot.mode;this.phase=snapshot.phase;this.score=snapshot.score;this.time=snapshot.time;
    return true;
  }
  dispose(){if(this.world){this.world.free();this.world=null;}}
}
