import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory=path.dirname(fileURLToPath(import.meta.url));
const base=path.resolve(directory,'..');
const context={console};context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(base,'src/sim/content.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(base,'src/sim/model.js'),'utf8'),context);
const B=context.BU,S=B.Sim;
export async function runSimulationTests() {
  let checks=0;
  const failures=[];
  const issues=[];
  const assert=(condition,message)=>{checks++;if(!condition)throw new Error(message);};
  const test=(name,fn)=>{try{fn();}catch(error){failures.push(`${name}: ${error.message}`);}};
  let seq=0;
  function action(s,type,values={},seat=1){const response=S.command(s,seat,{type,id:`t${++seq}`,caseId:s.caseId,...values});assert(response.ok,`${type}: ${response.reason}`);return response;}
  function hold(s,b,tool='solder',component,terminal,seat=1){action(s,'begin',{board:b.id,tool,component,terminal},seat);S.advance(s,tool==='solder'?(s.tuning.solderMin+s.tuning.solderMax)/2:s.tuning.extinguishTime+0.05);action(s,'end',{board:b.id},seat);}
  function solveBoard(s,b,seat=1,diagnose=true){
    action(s,'claim',{board:b.id},seat);
    if(b.fire)hold(s,b,'extinguish',undefined,undefined,seat);
    let limit=0;
    while(!b.complete&&limit++<80){
      const c=S.component(b,b.order[b.step]);
      if(!c)throw new Error('No current repair or complete state.');
      if(!c.removed){
        action(s,'cut',{board:b.id,component:c.id,terminal:0},seat);
        action(s,'cut',{board:b.id,component:c.id,terminal:1},seat);
        action(s,'grip',{board:b.id,component:c.id},seat);
      }
      if(!c.part){
        const example=b.example;
        const rule=b.rule==='jumper'?'jumper':example.source.shape===example.replacement.shape?'shape':'color';
        const p=b.spares.find(p=>p.available&&(rule==='jumper'?p.jumper:p[rule]===c[rule]));
        assert(!!p,'Available diagnostic matching spare exists.');
        if(diagnose&&b.rule!=='jumper'){
          const response=action(s,'test',{board:b.id,component:c.id,spare:p.id},seat);
          assert(response.event?.pass===true,'Observed diagnostic continuity passes.');
        }
        action(s,'pick',{board:b.id,spare:p.id},seat);
        action(s,'place',{board:b.id,component:c.id},seat);
      }
      if(!c.joints[0])hold(s,b,'solder',c.id,0,seat);
      if(!c.joints[1])hold(s,b,'solder',c.id,1,seat);
    }
    assert(b.complete,'Board secures using ordinary repair commands.');
  }
  test('Content invariants',()=>{
    assert(S.validateContent().length===0,S.validateContent().join('; '));
    assert(new Set(B.GLYPHS.map(g=>g.join(''))).size===10,'Digit glyphs are unique.');
    for(let d=0;d<10;d++)assert(JSON.stringify(S.candidates(B.GLYPHS[d]))===JSON.stringify([d]),`Actual stencil ${d} is recognizable.`);
    assert(S.candidates(Array(20).fill(-1)).length===10,'Unknown evidence accepts all digits.');
    const cells=Array(20).fill(-1);cells[0]=0;assert(S.candidates(cells).length<10,'Dark evidence eliminates incompatible digits.');
  });
  test('Seeded deterministic variation',()=>{
    for(const caseId of Object.keys(B.CONTENT))for(let seed=0;seed<20;seed++){
      const a=S.create(caseId,seed),b=S.create(caseId,seed);
      assert(JSON.stringify(a)===JSON.stringify(b),'Same seed reproduces all authoritative content.');
    }
    assert(JSON.stringify(S.create('relay',1).code)!==JSON.stringify(S.create('relay',2).code),'Different seeds vary case codes.');
  });
  test('Both leads, lift, stock and joints',()=>{
    const s=S.create('training',100),b=s.boards[0],c=b.components[0];
    action(s,'claim',{board:b.id});
    assert(!S.command(s,1,{type:'grip',board:b.id,component:c.id}).ok,'Attached part cannot be lifted.');
    action(s,'cut',{board:b.id,component:c.id,terminal:0});
    assert(!S.command(s,1,{type:'grip',board:b.id,component:c.id}).ok,'One cut cannot lift the part.');
    action(s,'cut',{board:b.id,component:c.id,terminal:1});
    action(s,'grip',{board:b.id,component:c.id});
    const spare=b.spares[0];action(s,'pick',{board:b.id,spare:spare.id});action(s,'drop',{board:b.id});
    assert(spare.available&&!b.held,'Dropped spare is returned intact.');
    action(s,'pick',{board:b.id,spare:spare.id});action(s,'place',{board:b.id,component:c.id});
    hold(s,b,'solder',c.id,0);assert(!b.complete,'One solder joint never completes a board.');
    hold(s,b,'solder',c.id,1);assert(c.done&&b.complete,'Both joints complete continuity.');
    assert(s.evidence[0].every(v=>v===0||v===1),'Training board publishes dark and illuminated evidence.');
  });
  test('Recovery before and after deadline',()=>{
    for(const late of [false,true]){
      const s=S.create('waterfront',9),b=s.boards[0],wrong=b.components[2];
      action(s,'claim',{board:b.id});action(s,'cut',{board:b.id,component:wrong.id,terminal:0});
      assert(!!b.recovery,'Off-order terminal starts explicit recovery.');
      const before=s.remaining;
      if(late){S.advance(s,s.tuning.recoveryWindow+0.01);assert(b.recovery.overdue,'Recovery penalty is marked.');assert(s.metrics.penalties===1,'Exactly one penalty applies.');assert(before-s.remaining>s.tuning.penalty,'Visible fuse penalty applied.');}
      hold(s,b,'solder',wrong.id,0);
      assert(!b.recovery&&!wrong.cuts[0],'Resoldering restores wrong joint.');
      solveBoard(s,b);assert(b.complete,'Recovery never strands the board.');
    }
  });
  test('Wrong spare remains recoverable',()=>{
    const s=S.create('relay',7),b=s.boards[0],c=b.components[0];action(s,'claim',{board:b.id});
    action(s,'cut',{board:b.id,component:c.id,terminal:0});action(s,'cut',{board:b.id,component:c.id,terminal:1});action(s,'grip',{board:b.id,component:c.id});
    const wrong=b.spares.find(p=>!S.compatible(b,c,p));const available=b.spares.filter(p=>p.available).length;
    action(s,'test',{board:b.id,component:c.id,spare:wrong.id});assert(b.ruleKnown,'Test discovers immutable board rule.');
    assert(b.spares.filter(p=>p.available).length===available,'Testing never destroys stock.');
    action(s,'pick',{board:b.id,spare:wrong.id});action(s,'place',{board:b.id,component:c.id});
    assert(!S.command(s,1,{type:'begin',tool:'solder',board:b.id,component:c.id,terminal:0}).ok,'Wrong continuity cannot be soldered secure.');
    action(s,'grip',{board:b.id,component:c.id});assert(wrong.available,'Wrong replacement returns to available stock.');
    solveBoard(s,b);assert(b.complete,'Wrong-spare route still secures normally.');
  });
  test('Safe solder band and cancellation',()=>{
    const s=S.create('training',5),b=s.boards[0],c=b.components[0];action(s,'claim',{board:b.id});
    for(const terminal of [0,1])action(s,'cut',{board:b.id,component:c.id,terminal});action(s,'grip',{board:b.id,component:c.id});action(s,'pick',{board:b.id,spare:b.spares[0].id});action(s,'place',{board:b.id,component:c.id});
    action(s,'begin',{board:b.id,tool:'solder',component:c.id,terminal:0});S.advance(s,0.1);action(s,'end',{board:b.id});
    assert(!c.joints[0],'Too-short solder hold cannot bond.');
    action(s,'begin',{board:b.id,tool:'solder',component:c.id,terminal:0});S.advance(s,0.7);action(s,'cancel',{board:b.id});assert(!c.joints[0],'Cancellation never completes a joint.');
    hold(s,b,'solder',c.id,0);assert(c.joints[0],'In-band release bonds joint.');
  });
  test('Overheat, fire persistence and extinguisher',()=>{
    const s=S.create('training',5),b=s.boards[0],c=b.components[0];action(s,'claim',{board:b.id});
    for(const terminal of [0,1])action(s,'cut',{board:b.id,component:c.id,terminal});action(s,'grip',{board:b.id,component:c.id});action(s,'pick',{board:b.id,spare:b.spares[0].id});action(s,'place',{board:b.id,component:c.id});
    action(s,'begin',{board:b.id,tool:'solder',component:c.id,terminal:0});S.advance(s,3);action(s,'end',{board:b.id});assert(b.fire,'Excess solder hold starts visible fire.');
    action(s,'release',{board:b.id});S.advance(s,10);assert(b.fire,'Offscreen cooling cannot erase established fire.');
    action(s,'claim',{board:b.id});hold(s,b,'extinguish');assert(!b.fire&&b.heat<=30,'Brief deliberate extinguisher hold clears fire.');
    solveBoard(s,b);assert(b.complete,'Fire recovery preserves completion route.');
  });
  test('Held stock remains safe at board completion',()=>{
    const s=S.create('training',5),b=s.boards[0],c=b.components[0];action(s,'claim',{board:b.id});
    for(const terminal of [0,1])action(s,'cut',{board:b.id,component:c.id,terminal});action(s,'grip',{board:b.id,component:c.id});action(s,'pick',{board:b.id,spare:b.spares[0].id});action(s,'place',{board:b.id,component:c.id});
    const unused=b.spares[1];action(s,'pick',{board:b.id,spare:unused.id});hold(s,b,'solder',c.id,0);hold(s,b,'solder',c.id,1);
    assert(b.complete&&!b.held&&unused.available,'Securing a board safely returns any extra held spare.');
  });
  test('Partial board persistence and offscreen cooling',()=>{
    const s=S.create('waterfront',3),b=s.boards[0],c=b.components[0];action(s,'claim',{board:b.id});action(s,'cut',{board:b.id,component:c.id,terminal:0});
    b.heat=50;action(s,'claim',{board:s.boards[1].id});S.advance(s,1);assert(c.cuts[0]&&!c.cuts[1],'Leaving retains incomplete terminal work.');assert(b.heat<50,'Unviewed board cools on authority time.');
    const restored=S.restore(S.snapshot(s));assert(JSON.stringify(restored)===JSON.stringify(s),'Snapshot preserves every partial state.');
  });
  test('Claims, duplicates, stale revisions and disconnect',()=>{
    const s=S.create('relay',3,[1,2]),b=s.boards[0];action(s,'claim',{board:b.id});
    assert(!S.command(s,2,{type:'claim',board:b.id}).ok,'Claim exclusion is atomic.');
    assert(!S.command(s,2,{type:'cut',board:b.id,component:'C1',terminal:0}).ok,'Nonowner cannot mutate board.');
    const cmd={type:'cut',board:b.id,component:'C1',terminal:0,id:'unique',expectedRevision:b.revision};const first=S.command(s,1,cmd);assert(first.ok,'Versioned action accepted.');
    const revision=b.revision;assert(S.command(s,1,cmd).duplicate&&b.revision===revision,'Duplicate accepted command is idempotent.');
    assert(!S.command(s,1,{type:'cut',board:b.id,component:'C1',terminal:1,expectedRevision:revision-1}).ok,'Stale revision rejected.');
    action(s,'leave',{},1);assert(b.claim===null&&!b.hold&&!s.seats.includes(1),'Leaving frees ownership and holds.');
    assert(S.join(s,1),'Graceful seat rejoin accepted.');assert(s.party===2,'Join/leave never changes locked workload.');
  });
  test('Holds cannot run forever',()=>{
    const s=S.create('relay',1),b=s.boards[2];action(s,'claim',{board:b.id});action(s,'begin',{board:b.id,tool:'extinguish'});S.advance(s,s.tuning.maxHold+0.2);assert(!b.hold&&b.fire,'Stale hold cancels without automatic repair.');
  });
  test('Intentional confirmation gate and single outcomes',()=>{
    const s=S.create('waterfront',2);assert(!S.command(s,1,{type:'propose',code:s.code}).ok,'Two-board code gate applies.');
    solveBoard(s,s.boards[0]);assert(!S.command(s,1,{type:'propose',code:s.code}).ok,'One board does not bypass live-case gate.');
    solveBoard(s,s.boards[1]);const inferred=S.candidates(s.evidence[0]);assert(inferred.includes(s.code[0]),'Published evidence is truthful.');action(s,'propose',{code:s.code});
    assert(s.status==='won'&&s.result.early,'Early informed submission earns result.');const state=JSON.stringify(s);S.advance(s,999);assert(JSON.stringify(s)===state,'Terminal outcome and clock resolve exactly once.');
    assert(!S.command(s,1,{type:'propose',code:[0]}).ok,'No action accepted after terminal outcome.');
  });
  test('Wrong code and expiry are distinct failures',()=>{
    const wrong=S.create('training',1);solveBoard(wrong,wrong.boards[0]);action(wrong,'propose',{code:[(wrong.code[0]+1)%10]});assert(wrong.status==='lost'&&wrong.cause==='wrong-code','Wrong deliberate code has clear cause.');
    const expired=S.create('waterfront',1);S.advance(expired,expired.duration);assert(expired.status==='lost'&&expired.cause==='time-expired'&&expired.remaining===0,'Exact expiry resolves failure once.');
  });
  test('Voting rules, veto, majority and departure',()=>{
    function ready(seats){const s=S.create('waterfront',11,seats);solveBoard(s,s.boards[0]);solveBoard(s,s.boards[1]);return s;}
    let s=ready([1,2]);action(s,'propose',{code:s.code});assert(s.proposal?.accepted.includes(1),'Proposal counts as first yes.');const firstProposal=s.proposal.id;action(s,'vote',{accept:false},2);assert(!s.proposal&&s.status==='active','Any veto cancels safely.');
    action(s,'propose',{code:s.code});assert(s.proposal.id!==firstProposal,'Repeated proposals have distinct stable IDs.');action(s,'vote',{accept:true},2);assert(s.status==='won','Unanimous consent submits immediately.');
    s=ready([1,2,3]);action(s,'propose',{code:s.code});action(s,'vote',{accept:true},2);S.advance(s,5.1);assert(s.status==='won','Strict majority submits at five-second deadline.');
    s=ready([1,2,3,4]);action(s,'propose',{code:s.code});action(s,'vote',{accept:true},2);S.advance(s,5.1);assert(s.status==='active'&&!s.proposal,'Half of seats is not a strict majority.');
    s=ready([1,2]);action(s,'propose',{code:s.code});action(s,'leave',{},1);assert(s.status==='active'&&!s.proposal,'Proposer departure cancels proposal.');
  });
  test('Clock boundary has one outcome',()=>{
    const s=S.create('waterfront',3,[1,2,3]);solveBoard(s,s.boards[0]);solveBoard(s,s.boards[1]);action(s,'propose',{code:s.code});action(s,'vote',{accept:true},2);s.remaining=5;S.advance(s,5.1);
    assert(s.status==='lost'&&s.cause==='time-expired','Expiry wins exact simultaneous vote boundary.');assert(s.events.filter(e=>['won','lost'].includes(e.type)).length===1,'Exactly one terminal event emitted.');
  });
  test('Live tuning finite ranges and hold policy',()=>{
    const s=S.create('relay',1),b=s.boards[2];action(s,'claim',{board:b.id});action(s,'begin',{board:b.id,tool:'extinguish'});
    action(s,'tune',{values:{solderMin:1.2,solderMax:0.35,cooling:999,penalty:-10,timeScale:2}});assert(!b.hold&&s.modified,'Tuning cancels active action and labels run.');assert(s.tuning.solderMax>s.tuning.solderMin&&s.tuning.cooling===24&&s.tuning.penalty===0,'Unsafe settings clamped coherently.');
    const before=s.remaining;S.advance(s,1);assert(Math.abs((before-s.remaining)-2)<1e-5,'Time scale affects authority elapsed time.');const duration=s.duration;const fuse=s.remaining;action(s,'tune',{values:{fuseScale:2}});assert(s.duration===duration*2&&s.remaining===fuse*2,'Fuse duration slider applies live without losing progress fraction.');action(s,'tune',{values:B.DEFAULTS});assert(JSON.stringify(s.tuning)===JSON.stringify(B.DEFAULTS),'Reset restores authored tuning.');
  });
  test('Assistance labels remain truthful after toggling off',()=>{const s=S.create('training',2);action(s,'assist',{enabled:true});action(s,'assist',{enabled:false});assert(s.assisted,'Used assistance stays marked for this run.');});
  test('Editor validates, round-trips and plays scratch content',()=>{
    const source=S.create('waterfront',1).boards[0];const template=S.exportTemplate(source);assert(!S.validateTemplate(template).length,'Original template validates.');
    template.name='Editor-authored safety loop';template.components[0].x=-40;template.components[0].terminals=[[-20,0],[20,0]];template.mask=Array.from({length:20},(_,i)=>i);
    const imported=JSON.parse(JSON.stringify(template));assert(!S.validateTemplate(imported).length,'Edited anchors/mask round-trip.');const ambiguous=JSON.parse(JSON.stringify(imported));ambiguous.mask=[0];assert(S.validateScratch(ambiguous,88).some(e=>e.includes('ambiguous')),'Scratch-only evidence must uniquely identify its actual seed.');const scratch=S.createScratch(imported,88);solveBoard(scratch,scratch.boards[0]);action(scratch,'propose',{code:S.candidates(scratch.evidence[0])});assert(scratch.status==='won'&&scratch.modified,'Scratch case plays to a labeled result.');
    imported.components[0].terminals[0][0]=500;assert(S.validateTemplate(imported).some(e=>e.includes('outside')),'Unreachable anchors rejected.');
    imported.components[0].terminals[0][0]=-20;imported.order=['MISSING'];assert(S.validateTemplate(imported).some(e=>e.includes('reference')),'Broken order references rejected.');
  });
  test('Invalid authoring JSON yields readable diagnostics',()=>{
    for(const field of ['components','spares']){const t=S.exportTemplate(S.create('waterfront',1).boards[0]);t[field]=[null];assert(S.validateTemplate(t).some(e=>e.includes('JSON object')),'Null authored entries reject without throwing.');}
    const t=S.exportTemplate(S.create('relay',1).boards[0]);t.components[0].pattern='invisible';assert(S.validateTemplate(t).some(e=>e.includes('redundantly')),'Color identity always has the correct redundant pattern.');
  });
  test('Whole campaign ordinary-command acceptance',()=>{
    for(const caseId of ['training','waterfront','relay','central']){
      const s=S.create(caseId,20261106);
      for(const b of s.boards)solveBoard(s,b);
      const inferred=s.evidence.map(cells=>{const answer=S.candidates(cells);assert(answer.length===1,'Guaranteed route gives one candidate per digit.');return answer[0];});
      action(s,'propose',{code:inferred});assert(s.status==='won'&&s.result.score>2000,`${caseId} accepts inferred disarm code.`);
    }
  });
  test('Developer fire cannot strand an already secured board',()=>{
    const s=S.create('waterfront',17),b=s.boards[0];solveBoard(s,b);action(s,'dev',{operation:'fire',board:b.id});assert(b.fire,'Fault injection is visible even after secure.');hold(s,b,'extinguish');assert(!b.fire&&b.complete,'Secured-board fire remains extinguishable without duplicating evidence.');assert(s.metrics.boards===1,'Extinguishing cannot double-count a board.');
  });
  test('Party workload and shared evidence for every size',()=>{
    for(let party=2;party<=4;party++){
      const s=S.create('central',17,party),duration=s.duration;
      for(let index=0;index<s.boards.length;index++)solveBoard(s,s.boards[index],index%party+1);
      assert(s.duration===duration&&s.party===party,'Workload/timer remain locked.');
      const code=s.evidence.map(cells=>S.candidates(cells)[0]);action(s,'propose',{code});for(let seat=2;seat<=party&&s.status==='active';seat++)action(s,'vote',{accept:true},seat);assert(s.status==='won',`${party} seats finish one shared code.`);
    }
  });
  return {checks,failures,issues};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const result=await runSimulationTests();for(const failure of result.failures)console.error(`FAIL ${failure}`);console.log(`${result.checks} checks, ${result.failures.length} failures`);process.exitCode=result.failures.length?1:0;
}
