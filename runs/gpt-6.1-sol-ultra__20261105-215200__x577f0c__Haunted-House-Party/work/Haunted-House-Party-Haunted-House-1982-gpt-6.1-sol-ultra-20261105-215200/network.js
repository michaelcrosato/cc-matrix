// AI Hub Session Protocol v1 and standalone WebRTC co-op.
// The unmodified official session.js must be the first script in the HTML head.
export function createNetwork(callbacks = {}) {
  const cb = (name, ...args) => callbacks[name]?.(...args);
  let mode = 'solo', role = 'solo', me = 0, players = [{id:0,name:'You',color:'#edbd70'}];
  let started = false, ended = false, room = '', status = 'Solo', hubInfo = null;
  let peer = null, channel = null, connection = null, peerReady = false, sessionGeneration = 0;
  let seq = 0, sent = 0, received = 0, lastInput = -Infinity, lastState = -Infinity;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(10)), n=>n.toString(16).padStart(2,'0')).join('');
  const guests = new Map(), seen = new Map(), connections = new Set(), unsubscribers = [];
  let lastSnapshot = null, joinTimer = null, lastReceived = performance.now(), pendingInput={}, hostToken=null;
  const onPageHide=()=>{ if(mode==='standalone'&&!ended)transmit(packet('leave',{})); };
  window.addEventListener('pagehide',onPageHide);
  const watch=setInterval(()=>{if(mode==='standalone'&&started&&!ended&&role==='guest'&&performance.now()-lastReceived>14000){ended=true;setStatus('Connection lost. Return to the title to reconnect.',{error:true});cb('onEnd','disconnected');}},2000);
  function setStatus(text, extra = {}) { status = text; cb('onStatus', {text,status:text,mode,role,room,me,players,started,ended,...extra}); }
  function begin(info) { if (started || ended) return; started = true;lastReceived=performance.now(); cb('onStart', info || {me,host:0,isHost:role==='host',server:false,players,mode:'shared-world',standalone:true}); }
  function packet(type, data) { return {hhp:1,room,from:token,seq:seq++,type,data}; }
  function transmit(message) {
    if (ended) return false;
    if (mode === 'hub') { const ok=window.AIHub.send(message, role==='guest'?{to:window.AIHub.host}:{}); if(ok) sent++; return ok; }
    let ok=false;
    if(channel) { channel.postMessage(message); ok=true; }
    for(const c of connections) if(c.open) { try {c.send(message);ok=true;} catch{} }
    if(ok) sent++;
    return ok;
  }
  function greeting(target, id) {
    const msg=packet('welcome',{target,id,players}); transmit(msg);
    if(lastSnapshot) transmit(packet('state',lastSnapshot));
  }
  function receive(message, sourceId) {
    if(ended || !message || message.hhp!==1) return;
    if(mode==='standalone' && (message.room!==room || message.from===token)) return;
    const key=mode==='hub'?String(sourceId):message.from;
    if(mode==='standalone') { const n=seen.get(key)??-1; if(message.seq<=n) return; seen.set(key,message.seq); }
    received++;lastReceived=performance.now();
    if(message.type==='hello' && role==='host' && mode==='standalone') {
      let id=guests.get(message.from);
      if(id===undefined) {
        if(guests.size>=3) { transmit(packet('full',{target:message.from})); return; }
        id=[1,2,3].find(n=>!Array.from(guests.values()).includes(n)); guests.set(message.from,id);
        players=[{id:0,name:'Host',color:'#edbd70'},...Array.from(guests.values(),id=>({id,name:'Guest '+id,color:['','#75ded0','#bd92ef','#f8978d'][id]}))];
      }
      greeting(message.from,id); begin(); setStatus('Connected · '+players.length+' guests of the house');
    } else if(message.type==='welcome' && role==='guest') {
      if(hostToken&&message.from!==hostToken)return;hostToken=message.from;players=message.data.players;
      if(message.data?.target===token){me=message.data.id;clearTimeout(joinTimer);begin();setStatus('Connected · player '+(me+1));}
    } else if(message.type==='roster' && role==='guest' && message.from===hostToken) {
      players=message.data.players;setStatus('Connected · '+players.length+' guests of the house');
    } else if(message.type==='full' && message.data?.target===token) { setStatus('This party is full. Try another room.',{error:true});
    } else if(message.type==='input' && role==='host') {
      const id=mode==='hub'?sourceId:guests.get(message.from);
      if(id!==undefined && players.some(p=>p.id===id)) cb('onInput',message.data,id);
    } else if(message.type==='state' && role==='guest') {
      if(mode==='hub' && sourceId!==window.AIHub.host) return;
      if(mode==='standalone'&&message.from!==hostToken)return;
      cb('onState',message.data);
    } else if(message.type==='leave') {
      if(role==='guest' && message.from===hostToken) { ended=true; setStatus('The host left the house.'); cb('onEnd','host-left'); }
      else if(role==='host' && guests.has(message.from)) { const id=guests.get(message.from); guests.delete(message.from); players=players.filter(p=>p.id!==id); cb('onLeave',id);transmit(packet('roster',{players})); setStatus('A guest has left.'); }
    } else if(message.type==='finish' && role==='guest') { cb('onResult',message.data); }
  }
  function wireConnection(c) {
    connections.add(c);
    c.on('data', m=>receive(m));
    c.on('open',()=>{ if(role==='guest') c.send(packet('hello',{})); else setStatus(started?'Connected':'Room open · waiting for a guest'); });
    c.on('close',()=>{connections.delete(c); if(mode==='standalone' && role==='guest' && !channel) { ended=true; cb('onEnd','disconnected');setStatus('Connection lost.'); }});
    c.on('error',()=>setStatus('Connection interrupted. You can return to the title.',{error:true}));
  }
  async function openPeer(hosting,generation) {
    try {
      const {Peer}=await import('https://esm.sh/peerjs@1.5.5');
      if(generation!==sessionGeneration) return;
      const options={debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:global.stun.twilio.com:3478'}]}};
      peer=hosting?new Peer('hhp-2026-'+room,options):new Peer(options);
      peer.on('open',()=>{ if(generation!==sessionGeneration) return; peerReady=true;
        if(hosting) setStatus(started?'Connected':'Room open · share '+room);
        else {connection=peer.connect('hhp-2026-'+room,{reliable:true});wireConnection(connection);}
      });
      peer.on('connection',c=>{ if(hosting) wireConnection(c); else c.close(); });
      peer.on('error',err=>{if(generation!==sessionGeneration) return; setStatus(started?'Connected locally · internet signaling unavailable':'Internet signaling unavailable · same-browser rooms still work',{error:!started,detail:err.type||'network'});});
    } catch(err) { if(generation===sessionGeneration) setStatus(started?'Connected locally':'Online library unavailable · same-browser rooms still work',{error:!started,detail:String(err.message)}); }
  }
  function openChannel() {
    if(typeof BroadcastChannel==='undefined') return;
    channel=new BroadcastChannel('haunted-house-party-'+room); channel.onmessage=e=>receive(e.data);
  }
  function cleanup() {
    sessionGeneration++; clearTimeout(joinTimer); channel?.close();channel=null;
    for(const c of connections) c.close(); connections.clear(); peer?.destroy();peer=null;connection=null;peerReady=false;
    guests.clear();seen.clear();lastSnapshot=null;pendingInput={};hostToken=null;
  }
  const api={
    get mode(){return mode;},get role(){return role;},get me(){return me;},get players(){return players;},get started(){return started;},get ended(){return ended;},get status(){return status;},get room(){return room;},get server(){return !!hubInfo?.server;},
    async initHub(){
      const hub=window.AIHub;
      if(!hub?.active) return null;
      mode='hub';role='guest';setStatus('Joining AI Hub…');
      unsubscribers.push(hub.on('message',(data,from)=>receive(data,from)));
      unsubscribers.push(hub.on('start',()=>{setStatus('AI Hub round · ready');begin(hubInfo);}));
      unsubscribers.push(hub.on('time-up',()=>cb('onTimeUp')));
      unsubscribers.push(hub.on('leave',({id})=>{players=hub.players.slice();cb('onLeave',id);}));
      unsubscribers.push(hub.on('end',({reason})=>{ended=true;setStatus('Round ended');cb('onEnd',reason);}));
      hubInfo=await (window.__hubEarlyConnect||hub.connect({mode:'shared-world',seats:[1,4]}));
      if(!hubInfo){mode='solo';role='solo';setStatus('Solo');return null;}
      me=hubInfo.me;role=hubInfo.isHost?'host':'guest';players=hubInfo.players.slice();setStatus('AI Hub · '+players.length+' players');return hubInfo;
    },
    ready(){if(mode==='hub')window.AIHub.ready();},
    async host(){if(mode==='hub')return null;cleanup();mode='standalone';role='host';me=0;started=false;ended=false;players=[{id:0,name:'Host',color:'#edbd70'}];room=Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%31]).join('');openChannel();setStatus('Room open · share '+room);openPeer(true,sessionGeneration);return room;},
    async join(code){if(mode==='hub')return false;code=String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length!==6){setStatus('Enter the six-character room code.',{error:true});return false;}cleanup();mode='standalone';role='guest';me=1;room=code;started=false;ended=false;openChannel();setStatus('Looking for room '+room+'…');transmit(packet('hello',{}));openPeer(false,sessionGeneration);joinTimer=setTimeout(()=>{if(!started)setStatus('No host answered. Check the code and internet connection.',{error:true});},18000);return true;},
    sendInput(input){if(ended||role!=='guest'||mode==='solo')return false;for(const key of ['match','interact','dash','drop'])pendingInput[key]=!!(pendingInput[key]||input[key]);pendingInput.x=Number(input.x)||0;pendingInput.z=Number(input.z)||0;const t=performance.now();if(t-lastInput<55)return false;lastInput=t;const ok=transmit(packet('input',pendingInput));if(ok)pendingInput={};return ok;},
    sendState(snapshot){if(role!=='host'||ended)return false;lastSnapshot=snapshot;const t=performance.now();if(t-lastState<65)return false;lastState=t;return transmit(packet('state',snapshot));},
    finish(won,score=0,stats={}){if(ended||role!=='host')return; if(mode==='hub'){window.AIHub.finish({standings:[players.map(p=>p.id)],scores:Object.fromEntries(players.map(p=>[p.id,score])),won:!!won,stats:Object.fromEntries(players.map(p=>[p.id,stats]))});}else transmit(packet('finish',{won,score,stats}));},
    leave(){if(mode==='hub')return;transmit(packet('leave',{}));cleanup();mode='solo';role='solo';me=0;players=[{id:0,name:'You',color:'#edbd70'}];started=false;ended=false;room='';setStatus('Solo');},
    time(){return mode==='hub'?window.AIHub.time():Infinity;},
    stats(){return {mode,role,me,room,started,ended,sent,received,peerReady,status,players:players.length,connections:Array.from(connections,c=>({open:c.open,peer:c.peer,readyState:c.dataChannel?.readyState,connectionState:c.peerConnection?.connectionState,iceState:c.peerConnection?.iceConnectionState}))};},
    dispose(){cleanup();clearInterval(watch);window.removeEventListener('pagehide',onPageHide);unsubscribers.forEach(fn=>fn());}
  };
  return api;
}
