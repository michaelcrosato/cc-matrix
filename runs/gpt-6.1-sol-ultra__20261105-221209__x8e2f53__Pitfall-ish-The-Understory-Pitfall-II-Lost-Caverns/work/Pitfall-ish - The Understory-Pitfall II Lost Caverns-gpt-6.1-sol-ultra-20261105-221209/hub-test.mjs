import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const code = fs.readFileSync(new URL('./hub.js', import.meta.url),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function runHubTests(){
  const results=[];
  const check=(name,pass)=>results.push({name,pass:!!pass});
  const instances=[];
  function instance(hub){
    const win={AIHub:hub,addEventListener(){}};
    Object.assign(win,{window:win,performance,crypto:webcrypto,BroadcastChannel,RTCPeerConnection:undefined,queueMicrotask,setInterval,clearInterval,setTimeout,clearTimeout,Math,Date,JSON,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
    vm.createContext(win);vm.runInContext(code,win);instances.push(win.CavernNet);return win.CavernNet;
  }
  try{
    const host=instance(),guest=instance();
    check('standalone default is solo authoritative host',host.status().isHost&&host.status().transport==='solo'&&!host.status().active);
    const room='TEST'+Date.now();host.hostLocal(room);guest.joinLocal(room);
    await wait(100);
    check('local room handshake links both players',host.status().connected&&guest.status().connected&&host.status().players.length===2&&!guest.status().isHost);
    let input=null,state=null;host.onInput((value,id)=>input={value,id});guest.onState(value=>state=value);
    guest.sendInput({x:1,jump:true});host.sendState({x:5,score:50});await wait(50);
    check('guest input is delivered to authoritative host',input?.id===1&&input?.value.jump===true);
    check('host world snapshot is delivered to guest',state?.x===5&&state?.score===50);
    check('guest cannot publish authoritative snapshots',guest.sendState({x:200})===false);
    check('host cannot publish guest input',host.sendInput({x:200})===false);
    const commands=[],roundResults=[];
    host.onInput(value=>{if(value.command)commands.push(value.command);});
    guest.onFinish(value=>roundResults.push(value));
    guest.sendInput({left:true});
    const requestedRestart=guest.request('restart'),requestedTitle=guest.request('title');
    await wait(30);
    check('guest menu requests bypass the movement throttle',requestedRestart&&requestedTitle&&commands.join(',')==='restart,title');
    check('menu requests allow only restart and title from a guest',!guest.request('teleport')&&!host.request('restart'));
    host.finish({won:true,score:200});await wait(20);
    const preservedPlayers=JSON.stringify(host.status().players);
    host.beginRound();guest.beginRound();
    check('a new standalone round preserves connection and players',host.status().connected&&guest.status().connected&&host.status().started&&JSON.stringify(host.status().players)===preservedPlayers);
    host.finish({won:true,score:350});await wait(20);
    check('second round can finish over the same connection',roundResults.length===2&&roundResults[0].score===200&&roundResults[1].score===350);
    guest.solo();check('leaving local room restores solo mode',guest.status().transport==='solo'&&guest.status().isHost);
    const handlers={},sent=[],reports=[];
    const hub={active:true,connect:async()=>({isHost:true,host:9,me:9,players:[{id:0,name:'One'},{id:1,name:'Two'}],server:true}),on:(name,fn)=>handlers[name]=fn,ready:()=>sent.push('ready'),send:value=>{sent.push(value);return true;},finish:result=>reports.push(result),time:()=>25};
    const server=instance(hub);await server.init();server.ready();
    check('dedicated Hub server has no local player',server.status().server&&server.status().isHost&&!server.status().players.some(p=>p.id===server.status().me));
    check('Hub ready runs without a gesture',sent.includes('ready'));
    let serverInput=null;server.onInput((value,id)=>serverInput={value,id});
    handlers.message({game:'understory-v1',type:'input',value:{move:1}},1);
    check('Hub remote input reaches dedicated server',serverInput?.id===1);
    server.sendState({score:123});check('Hub sends an authoritative world packet',sent.some(x=>x.type==='state'));
    handlers['time-up']({graceMs:500});await wait(200);
    check('time-up produces complete team standings',reports.length===1&&reports[0].standings[0].length===2&&reports[0].scores[0]===123&&reports[0].won===false);
    handlers.end({reason:'finished'});await wait(70);
    check('round end blocks further network traffic',server.sendState({score:999})===false&&server.status().ended);
    check('standalone round API cannot reset an active Hub end',server.beginRound()===false&&server.status().ended&&server.sendState({score:999})===false);
    check('standalone requests cannot send during Hub sessions',server.request('restart')===false);
    let lateEnd=null;server.onEnd(value=>lateEnd=value);await wait(0);
    check('late end handler receives already-ended round',lateEnd?.reason==='finished');
  }finally{for(const item of instances)item.destroy();}
  return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const results=await runHubTests();for(const result of results)if(!result.pass)console.log('FAIL '+result.name);
  console.log(`${results.filter(x=>x.pass).length}/${results.length} networking checks passed`);
  if(results.some(x=>!x.pass))process.exitCode=1;
}
