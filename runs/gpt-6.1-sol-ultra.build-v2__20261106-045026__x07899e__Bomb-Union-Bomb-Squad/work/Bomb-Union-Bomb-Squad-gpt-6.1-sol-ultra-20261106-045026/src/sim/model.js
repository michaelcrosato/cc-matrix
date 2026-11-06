(function (root) {
  'use strict';
  const B = root.BU = root.BU || {};
  const VERSION = B.CONTENT_VERSION;
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const shapes = ['resistor','capacitor','chip'];
  const colors = ['amber','coral','cyan'];
  function random(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(values, rng) {
    const list = [...values];
    for (let i=list.length-1;i>0;i--) {
      const j = Math.floor(rng()*(i+1));
      [list[i],list[j]]=[list[j],list[i]];
    }
    return list;
  }
  function tuning(values={}) {
    const out = {...B.DEFAULTS};
    for (const [key,range] of Object.entries(B.TUNING_RANGES)) {
      const value=Number(values[key]);
      if (Number.isFinite(value)) out[key]=clamp(value,...range);
    }
    out.solderMax=Math.max(out.solderMax,out.solderMin+0.15);
    out.maxHold=Math.max(out.maxHold,out.solderMax+0.25,out.extinguishTime+0.25);
    return out;
  }
  function candidates(cells) {
    return B.GLYPHS.map((_,i)=>i).filter(d=>B.GLYPHS[d].every((bit,i)=>cells[i]===-1 || cells[i]==null || bit===cells[i]));
  }
  function board(s,id) { return s.boards.find(b=>b.id===id); }
  function component(b,id) { return b.components.find(c=>c.id===id); }
  function compatible(b,c,p) {
    if (!p || !c) return false;
    return c.kind==='jumper' ? !!p.jumper : !p.jumper && p[b.rule]===c[b.rule];
  }
  function emit(s,type,text,data={}) {
    const e={id:++s.eventId,type,text,...data};
    s.events.push(e);
    if (s.events.length>24) s.events.shift();
    return e;
  }
  function makeBoard(def,index,code,rng,party) {
    const digit=index%def.digits;
    const sector=Math.floor(index/def.digits);
    const perDigit=def.boardCount/def.digits;
    // These authored columns are deliberately interleaved: a sector contains both lit and dark evidence.
    const cellOrder=[0,5,10,15,16, 1,6,11,12,17, 2,7,8,13,18, 3,4,9,14,19];
    const begin=Math.floor(sector*20/perDigit), end=Math.floor((sector+1)*20/perDigit);
    const rule=def.id==='training'||def.id==='waterfront'?'jumper':index%2===0?'shape':'color';
    const count=def.components + (party>=3 && def.id==='waterfront'?1:0);
    const shapeOrder=shuffle(shapes,rng), colorOrder=shuffle(colors,rng);
    const positions=[[-54,-24],[54,-24],[0,28]];
    const components=positions.map(([x,y],i)=>({
      id:`C${i+1}`,x,y,terminals:[[-18,0],[18,0]],shape:shapeOrder[i],color:colorOrder[i],
      pattern:B.COLORS[colorOrder[i]].pattern,kind:rule==='jumper'?'jumper':'replace',
      cuts:[false,false],removed:false,part:null,joints:[false,false],done:false,
    }));
    const order=components.slice(0,count).map(c=>c.id);
    let spares;
    if (rule==='jumper') {
      spares=components.map((c,i)=>({id:`S${i+1}`,shape:'jumper',color:'cyan',pattern:'cross',jumper:true,available:true}));
    } else {
      spares=components.map((c,i)=>{
        const color=rule==='color'?c.color:colorOrder[(i+1)%3];
        return {id:`S${i+1}`,shape:rule==='shape'?c.shape:shapeOrder[(i+1)%3],color,
          pattern:B.COLORS[color].pattern,jumper:false,available:true};
      });
    }
    spares=shuffle(spares,rng);
    const sample=components[0], sampleSpare=spares.find(p=>compatible({rule},sample,p));
    return {
      id:`B${index+1}`,name:def.sectorNames[index]||`Sector ${index+1}`,digit,
      mask:cellOrder.slice(begin,end),rule,ruleKnown:rule==='jumper',
      example:{source:{shape:sample.shape,color:sample.color,pattern:sample.pattern},replacement:{shape:sampleSpare.shape,color:sampleSpare.color,pattern:sampleSpare.pattern}},
      components,order,step:0,spares,held:null,claim:null,heat:0,fire:false,
      recovery:null,hold:null,complete:false,revision:0,tests:0,
    };
  }
  function create(caseId='waterfront',seed=1,party=1,values={}) {
    const def=B.CONTENT[caseId];
    if (!def) throw new Error(`Unknown case: ${caseId}`);
    const seats=Array.isArray(party)?[...new Set(party)]:Array.from({length:clamp(Number(party)||1,1,4)},(_,i)=>i+1);
    if (!seats.length||seats.length>4) throw new Error('A case requires one to four seats.');
    const t=tuning(values), r=random(seed);
    const code=Array.from({length:def.digits},()=>Math.floor(r()*10));
    const duration=def.partyDurations[seats.length-1]*t.fuseScale;
    const s={version:VERSION,caseId,seed:seed>>>0,party:seats.length,seats,duration,remaining:duration,
      elapsed:0,revision:0,status:'active',cause:null,code,evidence:code.map(()=>Array(20).fill(-1)),
      boards:[],events:[],eventId:0,metrics:{boards:0,components:0,mistakes:0,penalties:0,tests:0,repairs:0},
      proposal:null,tuning:t,modified:false,assisted:!!values.assisted,result:null,seen:[]};
    s.boards=Array.from({length:def.boardCount},(_,i)=>makeBoard(def,i,code,r,seats.length));
    // A contained, visible hot-loop lesson. It stays burning until a player extinguishes it.
    if (caseId==='relay') { s.boards[2].fire=true; s.boards[2].heat=78; }
    emit(s,'dispatch',def.intro);
    return s;
  }
  function terminalOutcome(s,status,cause) {
    if (s.status!=='active') return false;
    s.status=status;s.cause=cause;s.proposal=null;
    for (const b of s.boards) b.hold=null;
    const complete=s.metrics.boards;
    const early=status==='won' && complete<s.boards.length;
    const clean=Math.max(0,1000-s.metrics.mistakes*100-s.metrics.penalties*150);
    const disposal=status==='won'?2000:0;
    const time=status==='won'?Math.floor(Math.max(0,s.remaining)*5):0;
    const inference=status==='won'&&early?500:0;
    s.result={won:status==='won',cause,score:disposal+time+clean+inference,
      cards:{disposal,time,clean,inference},remaining:Math.max(0,s.remaining),seed:s.seed,
      modified:s.modified,assisted:s.assisted,early,boards:complete};
    emit(s,status,status==='won'?B.CONTENT[s.caseId].success: cause==='wrong-code'?'PIP: That code was wrong. The lock has fired. We can retry this exact case.':'PIP: Fuse expired. Tools down. Behind the van, everyone.');
    s.revision++;
    return true;
  }
  function resolveCode(s,code) {
    terminalOutcome(s,code.length===s.code.length && code.every((d,i)=>d===s.code[i])?'won':'lost',
      code.length===s.code.length&&code.every((d,i)=>d===s.code[i])?'disarmed':'wrong-code');
  }
  function finishBoard(s,b) {
    if (b.complete || b.fire || b.recovery || b.step<b.order.length) return;
    b.complete=true;b.hold=null;
    if(b.held){const held=b.spares.find(p=>p.id===b.held);if(held)held.available=true;b.held=null;}
    for (const cell of b.mask) s.evidence[b.digit][cell]=B.GLYPHS[s.code[b.digit]][cell];
    s.metrics.boards++;
    emit(s,'evidence',`PIP: ${b.name} secure. ${b.mask.length} truthful cells published to digit ${b.digit+1}.`,{board:b.id,digit:b.digit,cells:[...b.mask]});
  }
  function ignite(s,b) {
    if (!b.fire && b.heat>=100) {
      b.fire=true;
      emit(s,'fire',`PIP: Fire on ${b.name}! Extinguisher, then resume.`,{board:b.id});
    }
  }
  function recover(s,b,c,terminal) {
    c.cuts[terminal]=true;
    b.recovery={component:c.id,terminal,remaining:s.tuning.recoveryWindow,overdue:false};
    s.metrics.mistakes++;
    emit(s,'fault',`PIP: Wrong joint. Resolder ${c.id}, ${terminal===0?'left':'right'} lead within ${Math.round(s.tuning.recoveryWindow)} seconds.`,{board:b.id,component:c.id,terminal});
  }
  function touch(s,b) {s.revision++;if(b)b.revision++;}
  function release(s,seat) {
    for (const b of s.boards) if (b.claim===seat) {
      b.claim=null;b.hold=null;
      if (b.held) {const p=b.spares.find(p=>p.id===b.held);if(p)p.available=true;b.held=null;}
      b.revision++;
    }
  }
  function join(s,seat) {
    if (s.seats.includes(seat)) return true;
    if (s.seats.length>=4 || s.status!=='active') return false;
    s.seats.push(seat);touch(s);
    emit(s,'join',`Response seat ${seat} connected. Workload and fuse stay locked.`);
    return true;
  }
  function votes(s) {
    const p=s.proposal;if(!p)return;
    p.eligible=p.eligible.filter(seat=>s.seats.includes(seat));
    if (!s.seats.includes(p.proposer)) {s.proposal=null;emit(s,'vote-cancel','PIP: Proposer left. Continue repair.');return;}
    const yes=p.eligible.filter(seat=>p.accepted.includes(seat)).length;
    if (yes===p.eligible.length || (p.remaining<=0&&yes>p.eligible.length/2)) resolveCode(s,p.code);
    else if(p.remaining<=0){s.proposal=null;emit(s,'vote-cancel','PIP: No majority. Keep working.');}
  }
  function command(s,seat,cmd={}) {
    const fail=reason=>({ok:false,reason});
    if (!s || s.version!==VERSION) return fail('Invalid state version.');
    if (!cmd || typeof cmd.type!=='string') return fail('Invalid command.');
    if (cmd.id && s.seen.includes(`${seat}:${cmd.id}`)) return {ok:true,duplicate:true,reason:'Already accepted.'};
    if (cmd.caseId && cmd.caseId!==s.caseId) return fail('Command belongs to a different case.');
    if (s.status!=='active') return fail('Case already resolved.');
    if (!s.seats.includes(seat)) return fail('Seat is not connected.');
    const b=cmd.board?board(s,cmd.board):null;
    if (cmd.board&&!b) return fail('Unknown board.');
    const currentRev=b?b.revision:s.revision;
    if (cmd.expectedRevision!=null&&cmd.expectedRevision!==currentRev) return fail('Stale revision; synchronize and try again.');
    let event=null;
    const accept=(type,text,data={})=>{touch(s,b);if(type)event=emit(s,type,text,{...(b?{board:b.id}:{}),...data});if(cmd.id){s.seen.push(`${seat}:${cmd.id}`);if(s.seen.length>96)s.seen.shift();}return {ok:true,event};};
    if (cmd.type==='claim') {
      if(!b)return fail('Choose a board.');
      if(b.claim!=null&&b.claim!==seat)return fail('Board is claimed by another responder.');
      if(b.claim===seat)return {ok:true,reason:'Already claimed.'};
      release(s,seat);b.claim=seat;
      return accept('claim',`${b.name} claimed by response seat ${seat}.`);
    }
    if (cmd.type==='leave') {
      release(s,seat);s.seats=s.seats.filter(x=>x!==seat);votes(s);
      return accept('leave',`Response seat ${seat} disconnected. Their board is available.`);
    }
    if(cmd.type==='assist'){s.assisted=s.assisted||!!cmd.enabled;return accept(null);}
    if(cmd.type==='tune') {
      const old=s.tuning;s.tuning=tuning({...old,...cmd.values});s.modified=true;
      if(s.tuning.fuseScale!==old.fuseScale){const ratio=s.tuning.fuseScale/old.fuseScale;s.duration*=ratio;s.remaining*=ratio;}
      for(const bb of s.boards)bb.hold=null;
      return accept('tune','Developer tuning applied. Active holds cancelled.');
    }
    if(cmd.type==='dev') {
      s.modified=true;
      if(cmd.operation==='fuse'){s.remaining=clamp(Number(cmd.value)||60,0,3600);}
      else if(cmd.operation==='fire'&&b){b.fire=true;b.heat=100;}
      else if(cmd.operation==='fault'&&b){if(b.complete)return fail('Inject a fault into an unfinished board.');const c=component(b,cmd.component)||b.components.find(c=>!c.done&&c.id!==b.order[b.step]);if(!c||c.done)return fail('No unfinished fault target.');recover(s,b,c,0);}
      else if(cmd.operation==='reveal'){for(const bb of s.boards)for(const i of bb.mask)s.evidence[bb.digit][i]=B.GLYPHS[s.code[bb.digit]][i];}
      else if(cmd.operation==='solve'){resolveCode(s,s.code);}
      else return fail('Unknown developer operation.');
      return accept('dev','Developer action applied. This run is marked modified.');
    }
    if(cmd.type==='propose') {
      if(s.proposal)return fail('A submission vote is already open.');
      if(s.metrics.boards<(s.caseId==='training'?1:2))return fail('Secure two boards before submitting a code.');
      const code=cmd.code;
      if(!Array.isArray(code)||code.length!==s.code.length||code.some(d=>!Number.isInteger(d)||d<0||d>9))return fail('Choose one decimal digit per stencil.');
      if(s.seats.length===1){resolveCode(s,code);return accept(null);}
      s.proposal={id:`${s.seed}:${s.revision+1}:${s.eventId+1}`,code:[...code],proposer:seat,eligible:[...s.seats],accepted:[seat],remaining:5};
      event=emit(s,'vote','PIP: Code proposed. Accept or veto; the fuse continues.');
      votes(s);return accept(null);
    }
    if(cmd.type==='vote') {
      const p=s.proposal;
      if(!p||!p.eligible.includes(seat))return fail('No eligible vote is open.');
      if(cmd.accept===false){s.proposal=null;return accept('vote-cancel','PIP: Veto received. Keep repairing.');}
      if(!p.accepted.includes(seat))p.accepted.push(seat);
      votes(s);return accept('vote','PIP: Acceptance recorded.');
    }
    if(!b)return fail('Choose a board.');
    if(b.claim!==seat)return fail('Claim this board before using tools.');
    if(cmd.type==='release'){release(s,seat);return accept('release','Board state retained.');}
    if(cmd.type==='cancel'){b.hold=null;return accept(null);}
    if(cmd.type==='drop') {
      if(!b.held)return fail('No spare is held.');
      const p=b.spares.find(p=>p.id===b.held);if(p)p.available=true;b.held=null;
      return accept('drop','Spare returned safely to the tray.');
    }
    if(b.complete&&!(b.fire&&((cmd.type==='begin'&&cmd.tool==='extinguish')||cmd.type==='end')))return fail('Board is already secure.');
    const c=cmd.component?component(b,cmd.component):component(b,b.order[b.step]);
    if(cmd.component&&!c)return fail('Unknown component.');
    if(cmd.type==='test') {
      const p=b.spares.find(p=>p.id===(cmd.spare||b.held));
      if(!p||!c)return fail('Select a spare and a reference component.');
      if(b.fire)return fail('Extinguish the fire before testing.');
      b.ruleKnown=true;b.tests++;s.metrics.tests++;s.remaining=Math.max(0,s.remaining-s.tuning.testCost);
      const pass=compatible(b,c,p);
      const out=accept('test',`${pass?'PASS':'FAIL'} · Board matches ${b.rule==='color'?'COLOR / PATTERN':b.rule.toUpperCase()} · test cost ${s.tuning.testCost}s.`,{component:c.id,spare:p.id,pass});
      if(s.remaining<=0)terminalOutcome(s,'lost','time-expired');
      return out;
    }
    if(cmd.type==='end') {
      const h=b.hold;if(!h||h.seat!==seat)return fail('No held tool action.');
      b.hold=null;
      if(h.tool==='extinguish') {
        if(h.duration<s.tuning.extinguishTime)return accept('short-hold','Hold the extinguisher until the foam band fills.');
        b.fire=false;b.heat=Math.min(b.heat,30);
        finishBoard(s,b);
        return accept('foam','PIP: Fire out. Joints preserved. Resume the work order.');
      }
      if(b.fire)return accept('hot','PIP: Fire first. Switch to the extinguisher.');
      if(h.duration<s.tuning.solderMin)return accept('short-hold','Joint not bonded. Hold until the safe band.');
      if(h.duration>s.tuning.solderMax)return accept('overhold','PIP: Too hot. Let go inside the safe band.');
      const target=component(b,h.component);
      if(!target)return fail('Held target no longer exists.');
      if(b.recovery&&b.recovery.component===target.id&&b.recovery.terminal===h.terminal){
        target.cuts[h.terminal]=false;b.recovery=null;s.metrics.repairs++;
        finishBoard(s,b);
        return accept('recovery','PIP: Wrong joint restored. Back to the ordered repair.',{component:target.id,terminal:h.terminal});
      }
      const p=b.spares.find(p=>p.id===target.part);
      if(!target.removed||!p||!compatible(b,target,p)||target.id!==b.order[b.step])return fail('Joint is no longer a legal solder target.');
      target.joints[h.terminal]=true;
      event=emit(s,'solder','PIP: Joint bonded.',{board:b.id,component:target.id,terminal:h.terminal});
      if(target.joints.every(Boolean)){
        target.done=true;target.cuts=[false,false];b.step++;s.metrics.components++;
        emit(s,'component','PIP: Continuity good. Component stable.',{board:b.id,component:target.id});
        finishBoard(s,b);
      }
      return accept(null);
    }
    if(cmd.type==='begin') {
      if(b.hold)return fail('Release the current tool first.');
      if(cmd.tool==='extinguish'){
        if(!b.fire)return fail('There is no fire on this board.');
        b.hold={seat,tool:'extinguish',component:null,terminal:null,duration:0};
        return accept('extinguish','Foam on target. Hold briefly, then release.');
      }
      if(cmd.tool!=='solder')return fail('Unknown hold tool.');
      if(b.fire)return fail('Extinguish the fire before soldering.');
      if(!c||![0,1].includes(cmd.terminal))return fail('Select a terminal.');
      const recovery=b.recovery&&b.recovery.component===c.id&&b.recovery.terminal===cmd.terminal;
      if(b.recovery&&!recovery)return fail('Restore the highlighted wrong joint first.');
      if(!recovery){
        if(c.id!==b.order[b.step]||!c.removed||!c.part||c.done||c.joints[cmd.terminal])return fail('Fit the ordered replacement before soldering an open joint.');
        if(!compatible(b,c,b.spares.find(p=>p.id===c.part)))return fail('Failed continuity. Grip the wrong spare and replace it.');
      }
      b.hold={seat,tool:'solder',component:c.id,terminal:cmd.terminal,duration:0};
      return accept('solder-begin','Release in the safe solder band.',{component:c.id,terminal:cmd.terminal});
    }
    if(b.hold)return fail('Release the current held action first.');
    if(b.fire)return fail('Extinguish the fire before using other tools.');
    if(b.recovery)return fail('Resolder the highlighted wrong joint first.');
    if(cmd.type==='cut') {
      if(!c||![0,1].includes(cmd.terminal))return fail('Select a terminal.');
      if(c.done)return fail('Tested components are stable.');
      if(c.cuts[cmd.terminal]&&!c.joints[cmd.terminal])return fail('That lead is already cut.');
      if(c.id!==b.order[b.step]){recover(s,b,c,cmd.terminal);return accept(null);}
      if(c.removed&&!c.part)return fail('The socket is empty.');
      c.cuts[cmd.terminal]=true;c.joints[cmd.terminal]=false;
      return accept('cut',`${c.id} ${cmd.terminal===0?'left':'right'} lead cut.`,{component:c.id,terminal:cmd.terminal});
    }
    if(cmd.type==='grip') {
      if(!c||c.id!==b.order[b.step])return fail('Follow the displayed work order.');
      if(c.done)return fail('That component has passed continuity.');
      if(c.removed&&!c.part)return fail('Socket is already empty.');
      if(!c.removed&&!c.cuts.every(Boolean))return fail('Cut both terminal leads before lifting the component.');
      if(c.part&&c.joints.some(Boolean))return fail('Cut both bonded replacement leads before lifting it.');
      if(c.part){const p=b.spares.find(p=>p.id===c.part);if(p)p.available=true;c.part=null;}
      c.removed=true;c.joints=[false,false];c.cuts=[true,true];
      return accept('grip',`${c.id} lifted clear. Original salvaged; socket ready.`,{component:c.id});
    }
    if(cmd.type==='pick') {
      if(b.held)return fail('Drop or place the held spare first.');
      const p=b.spares.find(p=>p.id===cmd.spare);
      if(!p||!p.available)return fail('Spare is not available.');
      p.available=false;b.held=p.id;
      return accept('pick',`${p.id} held in pliers.`,{spare:p.id});
    }
    if(cmd.type==='place') {
      if(!c||c.id!==b.order[b.step])return fail('Place only in the ordered socket.');
      if(!c.removed||c.part)return fail('Clear this socket before placing a replacement.');
      if(!b.held)return fail('Pick a spare from the tray with the pliers.');
      const p=b.spares.find(p=>p.id===b.held);
      c.part=p.id;b.held=null;c.joints=[false,false];
      const good=compatible(b,c,p);
      if(!good)s.metrics.mistakes++;
      return accept(good?'place':'wrong-part',good?'Replacement seated. Solder both terminals.':'PIP: Continuity failed. Grip this spare out; the correct stock is still in the tray.',{component:c.id,spare:p.id,pass:good});
    }
    return fail('Unknown tool operation.');
  }
  function advance(s,dt) {
    if(s.status!=='active'||!Number.isFinite(dt)||dt<=0)return;
    let remaining=dt*s.tuning.timeScale;
    // Bound internal steps so hazard and expiry ordering do not depend on renderer cadence.
    while(remaining>1e-8&&s.status==='active'){
      const step=Math.min(remaining,1/60,s.remaining);
      if(step<=0){terminalOutcome(s,'lost','time-expired');break;}
      remaining-=step;s.elapsed+=step;s.remaining=Math.max(0,s.remaining-step);
      for(const b of s.boards){
        const h=b.hold;
        if(h){
          h.duration+=step;
          if(h.tool==='solder'){
            b.heat+=step*s.tuning.heatGain*(h.duration>s.tuning.solderMax?3:0.4);
            ignite(s,b);
          }
          if(h.duration>=s.tuning.maxHold){b.hold=null;emit(s,'hold-timeout','Tool hold released safely after its maximum duration.',{board:b.id});}
        }else if(!b.fire)b.heat=Math.max(0,b.heat-step*s.tuning.cooling);
        if(b.fire)b.heat=Math.min(160,b.heat+step*2*s.tuning.fireIntensity);
        if(b.recovery&&!b.recovery.overdue){
          b.recovery.remaining=Math.max(0,b.recovery.remaining-step);
          if(b.recovery.remaining<=1e-7){
            b.recovery.overdue=true;s.remaining=Math.max(0,s.remaining-s.tuning.penalty);b.heat+=25;
            s.metrics.penalties++;ignite(s,b);
            emit(s,'penalty',`PIP: Recovery window missed. ${s.tuning.penalty} fuse seconds lost. The joint can still be restored.`,{board:b.id});
          }
        }
      }
      // At the exact deadline expiry wins; no proposal can also resolve successfully.
      if(s.remaining<=1e-7){s.remaining=0;terminalOutcome(s,'lost','time-expired');break;}
      if(s.proposal){s.proposal.remaining-=step;votes(s);}
    }
  }
  function instruction(s,id) {
    const b=board(s,id);if(!b)return 'Choose an evidence sector to claim a repair board.';
    if(b.complete)return 'Board secure. Evidence published. Return to the stencil display.';
    if(b.fire)return `FIRE · ${b.name}: hold the extinguisher, then release when the foam band fills.`;
    if(b.recovery){const r=b.recovery;return `RESTORE ${r.component} ${r.terminal===0?'LEFT':'RIGHT'} lead with solder${r.overdue?' · penalty applied':` · ${Math.ceil(r.remaining)}s recovery`}.`;}
    const c=component(b,b.order[b.step]);
    if(!c)return 'Repair complete. Clear any remaining hazard.';
    const label=`${c.id} · ${c.shape.toUpperCase()} · ${B.COLORS[c.color]?.label||c.color}`;
    if(!c.removed){if(!c.cuts[0])return `CUT ${label}: left terminal first.`;if(!c.cuts[1])return `CUT ${label}: now the right terminal.`;return `GRIP ${label}: both leads free; lift it out.`;}
    if(!c.part){if(b.held)return `PLACE held ${b.held} in ${label}'s empty socket.`;return `PICK ${c.kind==='jumper'?'a gray jumper':`a spare matching ${b.ruleKnown?b.rule.toUpperCase():'the board rule — inspect/test to discover it'}`} for ${label}.`;}
    if(!compatible(b,c,b.spares.find(p=>p.id===c.part)))return `WRONG SPARE in ${c.id}: GRIP it out, then choose another. Stock is reusable.`;
    return `SOLDER ${label}: ${!c.joints[0]?'LEFT':'RIGHT'} terminal. Hold, then release in the safe band.`;
  }
  function nextAction(s,id) {
    const b=board(s,id);if(!b||b.complete)return null;
    if(b.hold)return {type:'end',board:id};
    if(b.fire)return {type:'begin',tool:'extinguish',board:id};
    if(b.recovery)return {type:'begin',tool:'solder',board:id,component:b.recovery.component,terminal:b.recovery.terminal};
    const c=component(b,b.order[b.step]);if(!c)return null;
    const cmd={board:id,component:c.id};
    if(!c.removed){if(!c.cuts[0])return {...cmd,type:'cut',terminal:0};if(!c.cuts[1])return {...cmd,type:'cut',terminal:1};return {...cmd,type:'grip'};}
    if(!c.part){if(b.held)return {...cmd,type:'place'};const p=b.spares.find(p=>p.available&&compatible(b,c,p));return {...cmd,type:'pick',spare:p?.id};}
    if(!compatible(b,c,b.spares.find(p=>p.id===c.part)))return {...cmd,type:'grip'};
    return {...cmd,type:'begin',tool:'solder',terminal:!c.joints[0]?0:1};
  }
  function exportTemplate(b) {
    return {version:VERSION,name:b.name,digit:b.digit,rule:b.rule,
      components:b.components.map(({id,x,y,shape,color,pattern,kind,terminals})=>({id,x,y,shape,color,pattern,kind,terminals:clone(terminals||[[-18,0],[18,0]])})),
      order:[...b.order],spares:b.spares.map(({id,shape,color,pattern,jumper})=>({id,shape,color,pattern,jumper})),
      mask:[...b.mask],duration:300};
  }
  function validateTemplate(t) {
    const errors=[];
    if(!t||typeof t!=='object')return ['Template must be a JSON object.'];
    if(t.version!==VERSION)errors.push('Unsupported template version.');
    if(typeof t.name!=='string'||!t.name.trim())errors.push('Board needs a name.');
    if(!['jumper','shape','color'].includes(t.rule))errors.push('Rule must be jumper, shape, or color.');
    if(!Number.isInteger(t.digit)||t.digit<0||t.digit>2)errors.push('Digit must be 0, 1, or 2.');
    if(!Array.isArray(t.components)||t.components.length<1||t.components.length>8)errors.push('Use one to eight components.');
    else if(t.components.some(c=>!c||typeof c!=='object'||Array.isArray(c)))errors.push('Each component must be a JSON object.');
    if(!Array.isArray(t.spares)||t.spares.length<1||t.spares.length>16)errors.push('Use one to sixteen spares.');
    else if(t.spares.some(p=>!p||typeof p!=='object'||Array.isArray(p)))errors.push('Each spare must be a JSON object.');
    if(!Array.isArray(t.order)||!t.order.length)errors.push('At least one ordered repair is required.');
    if(!Array.isArray(t.mask)||!t.mask.length||t.mask.some(i=>!Number.isInteger(i)||i<0||i>=20)||new Set(t.mask).size!==t.mask.length)errors.push('Evidence mask needs unique indices from 0 to 19.');
    if(!Number.isFinite(t.duration)||t.duration<20||t.duration>3600)errors.push('Duration must be 20–3600 seconds.');
    if(errors.length)return errors;
    const ids=t.components.map(c=>c.id), spareIds=t.spares.map(p=>p.id);
    if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)errors.push('Component IDs must be nonempty and unique.');
    if(spareIds.some(id=>typeof id!=='string'||!id)||new Set(spareIds).size!==spareIds.length)errors.push('Spare IDs must be nonempty and unique.');
    if(t.order.some(id=>!ids.includes(id))||new Set(t.order).size!==t.order.length)errors.push('Order must reference unique existing components.');
    for(const c of t.components){
      if(!shapes.includes(c.shape)||!colors.includes(c.color))errors.push(`${c.id}: unknown shape or color identity.`);
      if(B.COLORS[c.color]&&c.pattern!==B.COLORS[c.color].pattern)errors.push(`${c.id}: pattern must redundantly match its color identity.`);
      if(!['jumper','replace'].includes(c.kind)||((t.rule==='jumper')!==(c.kind==='jumper')))errors.push(`${c.id}: component kind must agree with board rule.`);
      if(!Number.isFinite(c.x)||!Number.isFinite(c.y))errors.push(`${c.id}: finite component position required.`);
      const anchors=c.terminals||[[-18,0],[18,0]];
      if(!Array.isArray(anchors)||anchors.length!==2||anchors.some(a=>!Array.isArray(a)||a.length!==2||a.some(v=>!Number.isFinite(v))))errors.push(`${c.id}: two finite terminal offset pairs required.`);
      else{
        if(anchors.some(([x,y])=>Math.abs(c.x+x)>110||Math.abs(c.y+y)>70))errors.push(`${c.id}: terminal is outside reachable board bounds.`);
        if(Math.hypot(anchors[0][0]-anchors[1][0],anchors[0][1]-anchors[1][1])<10)errors.push(`${c.id}: terminals need ten units separation.`);
      }
    }
    for(const p of t.spares){
      if(typeof p.jumper!=='boolean')errors.push(`${p.id}: jumper identity must be a boolean.`);
      if(B.COLORS[p.color]&&p.pattern!==B.COLORS[p.color].pattern)errors.push(`${p.id}: spare pattern must match its color identity.`);
      if(!p.jumper&&(!shapes.includes(p.shape)||!colors.includes(p.color)))errors.push(`${p.id}: spare needs a known shape and color identity.`);
      if(p.jumper&&t.rule!=='jumper')errors.push(`${p.id}: jumper does not belong in a replacement tray.`);
    }
    const assigned=new Set();
    for(const id of t.order){
      const c=t.components.find(c=>c.id===id);if(!c)continue;
      const stock=t.spares.filter(p=>compatible(t,c,p));
      if(!stock.length)errors.push(`${id}: no compatible replacement in stock.`);
      if(t.rule!=='jumper'&&stock.length!==1)errors.push(`${id}: matching replacement must be unambiguous.`);
      const p=stock.find(p=>!assigned.has(p.id));
      if(!p)errors.push(`${id}: insufficient independent stock for all repairs.`);else assigned.add(p.id);
    }
    return errors;
  }
  function validateScratch(t,seed=1) {
    const errors=validateTemplate(t);if(errors.length)return errors;
    const digit=Math.floor(random(seed)()*10),cells=Array(20).fill(-1);
    for(const i of t.mask)cells[i]=B.GLYPHS[digit][i];
    if(candidates(cells).length!==1)errors.push('Scratch evidence is ambiguous for this seed. Paint more reward cells or choose another seed.');
    return errors;
  }
  function createScratch(t,seed=1) {
    const errors=validateScratch(t,seed);if(errors.length)throw new Error(errors.join(' '));
    const s=create('training',seed);
    const b=clone(t);delete b.version;delete b.duration;
    Object.assign(b,{id:'B1',digit:0,ruleKnown:b.rule==='jumper',step:0,held:null,claim:null,heat:0,fire:false,recovery:null,hold:null,complete:false,revision:0,tests:0});
    b.components=b.components.map(c=>({...c,terminals:c.terminals||[[-18,0],[18,0]],cuts:[false,false],removed:false,part:null,joints:[false,false],done:false}));
    b.spares=b.spares.map(p=>({...p,available:true}));
    const c=b.components.find(c=>c.id===b.order[0]),p=b.spares.find(p=>compatible(b,c,p));
    b.example={source:{shape:c.shape,color:c.color,pattern:c.pattern},replacement:{shape:p.shape,color:p.color,pattern:p.pattern}};
    s.boards=[b];s.duration=t.duration;s.remaining=t.duration;s.modified=true;
    return s;
  }
  function validateContent() {
    const errors=[];
    if(B.GLYPHS.length!==10||new Set(B.GLYPHS.map(g=>g.join(''))).size!==10)errors.push('Ten distinct glyphs are required.');
    if(B.GLYPHS.some(g=>g.length!==20||g.some(v=>v!==0&&v!==1)))errors.push('Every glyph must be a twenty-cell binary stencil.');
    for(const def of Object.values(B.CONTENT))for(let seed=0;seed<20;seed++){
      const s=create(def.id,seed,1);
      for(const b of s.boards)for(const error of validateTemplate(exportTemplate(b)))errors.push(`${def.id}/${b.id}: ${error}`);
      for(let d=0;d<def.digits;d++){
        const cells=Array(20).fill(-1);
        for(const b of s.boards.filter(b=>b.digit===d))for(const i of b.mask)cells[i]=B.GLYPHS[s.code[d]][i];
        const answer=candidates(cells);
        if(answer.length!==1||answer[0]!==s.code[d])errors.push(`${def.id} seed ${seed} digit ${d}: guaranteed evidence is not unique.`);
      }
    }
    return [...new Set(errors)];
  }
  function snapshot(s) {return clone(s);}
  function restore(value) {
    if(!value||value.version!==VERSION||!B.CONTENT[value.caseId]||!Array.isArray(value.boards)||!Array.isArray(value.seats)||!Array.isArray(value.evidence)||!Number.isFinite(value.remaining))throw new Error('Invalid or unsupported saved case.');
    return clone(value);
  }
  B.Sim={create,command,advance,board,component,compatible,candidates,instruction,nextAction,snapshot,restore,join,
    validateContent,validateTemplate,validateScratch,exportTemplate,createScratch,tuning,random,version:VERSION};
})(globalThis);
