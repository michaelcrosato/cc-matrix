// AI Hub shared-world transport and serverless standalone co-op.
export class KitchenNetwork {
  constructor(callbacks={}) {
    this.cb=callbacks; this.mode='solo'; this.me=0; this.host=0; this.server=false;
    this.players=[this._player(0)]; this.room=''; this.token=this._token();
    this.peers=new Map(); this.unsub=[]; this.timers=new Set(); this.lastWorld=null;
    this.lastWorldAt=-Infinity; this.lastInputAt=-Infinity; this.pendingInput=null;
    this.finished=false; this.ended=false; this.readySent=false; this.started=false;
    this.sent=0; this.received=0; this.maxBytes=0; this.hubInfo=null;
    this.channel=null; this.pc=null; this.data=null; this.pendingPCs=new Set();
    this._unload=()=>this.close(); addEventListener('pagehide',this._unload);
  }
  _token(){return globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+String(Math.random()).slice(2);}
  _player(id){return {id,name:id===0?'Head chef':'Chef '+(id+1),color:['#ef5a48','#45a9b4','#7bb66a','#f1c14c'][id%4]};}
  _emit(name,...args){try{this.cb[name]?.(...args);}catch(e){console.error('Kitchen network callback',name,e);}}
  _status(text){this._emit('onStatus',text);}
  _roster(){this._emit('onPeers',this.names());}
  _interval(fn,ms){const id=setInterval(fn,ms);this.timers.add(id);return id;}
  _start(){if(this.started||this.ended)return;this.started=true;this._emit('onStart');}
  async initHub(){
    if(!globalThis.AIHub?.active)return {active:false,players:this.names(),isHost:true,me:0,server:false};
    this.mode='hub';
    const hub=globalThis.AIHub;
    this.unsub.push(hub.on('message',(data,from)=>this._receive(data,from,'hub')));
    this.unsub.push(hub.on('start',()=>{
      const timer=this._interval(()=>{if(hub.time()>=0){clearInterval(timer);this.timers.delete(timer);this._start();}},16);
    }));
    this.unsub.push(hub.on('time-up',()=>{if(this.isAuthority())this.finish(this.lastWorld||{score:0,served:0,mode:'time-up'});}));
    this.unsub.push(hub.on('end',data=>{
      this.ended=true;this.finished=true;this._emit('onEnd',data);this._clearTimers();
    }));
    this.unsub.push(hub.on('leave',data=>{
      this.players=this.players.filter(p=>p.id!==data.id);this._roster();
    }));
    const info=await hub.connect({mode:'shared-world',seats:[1,4]});
    if(!info){this.mode='solo';this.unsub.forEach(fn=>typeof fn==='function'&&fn());this.unsub=[];return {active:false,players:this.names(),isHost:true,me:0,server:false};}
    this.hubInfo={...info,active:true};this.me=info.me;this.host=info.host;this.server=!!info.server;
    this.players=info.players.map(p=>({id:p.id,name:String(p.name),color:p.color}));
    this._roster();this._status('AI Hub kitchen connected');
    return {...info,active:true};
  }
  ready(){if(this.mode==='hub'&&!this.readySent){this.readySent=true;globalThis.AIHub.ready();}}
  isAuthority(){return this.mode!=='hub'&&this.mode!=='local-guest'&&this.mode!=='rtc-guest'||this.mode==='hub'&&!!this.hubInfo?.isHost;}
  active(){return this.mode!=='solo';}
  localId(){return this.me;}
  names(){return this.players.map(p=>({...p}));}
  _input(input){
    const num=x=>Number.isFinite(Number(x))?Math.max(-1,Math.min(1,Number(x))):0;
    const clean={x:num(input?.x),z:num(input?.z),action:!!input?.action,discard:!!input?.discard,dash:!!input?.dash,bell:!!input?.bell};
    if(Number.isFinite(input?.select))clean.select=Math.max(-2,Math.min(2,Math.floor(input.select)));
    if(input?.target&&Number.isFinite(input.target.x)&&Number.isFinite(input.target.z))clean.target={x:Math.max(-8,Math.min(8,input.target.x)),z:Math.max(.65,Math.min(5.25,input.target.z))};
    return clean;
  }
  sendInput(input){
    if(this.ended||this.finished||this.server)return;
    const clean=this._input(input);
    if(this.isAuthority()){this._emit('onInput',clean,this.me);return;}
    if(this.pendingInput){for(const key of ['action','discard','dash','bell'])clean[key]||=this.pendingInput[key];clean.select||=this.pendingInput.select||0;}
    this.pendingInput=clean;
    if(performance.now()-this.lastInputAt<100){
      if(!this.inputTimer){this.inputTimer=setTimeout(()=>{this.inputTimer=null;this._flushInput();},100-(performance.now()-this.lastInputAt));}
      return;
    }
    this._flushInput();
  }
  _flushInput(){
    if(!this.pendingInput||this.ended||this.finished)return;
    const message={kind:'input',input:this.pendingInput};this.pendingInput=null;this.lastInputAt=performance.now();
    this._send(message,this.host);
  }
  _snapshot(state){
    let data;
    try{data=JSON.parse(JSON.stringify(state,(key,value)=>key==='body'?undefined:value));}catch{this._status('A kitchen snapshot could not be sent.');return null;}
    if(data.effects)data.effects=[];
    let bytes=new TextEncoder().encode(JSON.stringify({kind:'world',state:data})).length;
    if(bytes>15500&&Array.isArray(data.items))data.items=data.items.slice(-48);
    bytes=new TextEncoder().encode(JSON.stringify({kind:'world',state:data})).length;
    if(bytes>15500){this._status('Kitchen snapshot is too large.');return null;}
    return data;
  }
  sendWorld(state){
    this.lastWorld=state;
    if(!this.active()||!this.isAuthority()||this.ended||this.finished)return;
    if(performance.now()-this.lastWorldAt<100)return;
    const snapshot=this._snapshot(state);if(!snapshot)return;
    this.lastWorldAt=performance.now();this._send({kind:'world',state:snapshot});
  }
  report(state){this.lastWorld=state;}
  finish(state={}){
    this.lastWorld=state;
    if(this.finished||this.ended||!this.isAuthority())return;
    this.finished=true;
    if(this.mode==='hub'){
      const ids=this.players.map(p=>p.id);const scores={};const stats={};
      const score=Number.isFinite(state.score)?Math.round(state.score):0;
      for(const id of ids){scores[id]=score;stats[id]={'Burgers served':Number(state.served)||0,'Team score':score};}
      globalThis.AIHub.finish({standings:[ids],scores,won:state.mode==='victory',stats});
    }else if(this.active())this._send({kind:'finished',state:this._snapshot(state)});
  }
  _send(data,to){
    if(this.ended)return false;
    const text=JSON.stringify(data),bytes=new TextEncoder().encode(text).length;
    if(bytes>16000)return false;
    this.maxBytes=Math.max(this.maxBytes,bytes);this.sent++;
    if(this.mode==='hub')return globalThis.AIHub.send(data,to==null?{reliable:true}:{to,reliable:true});
    if(this.mode==='local-host'||this.mode==='local-guest'){
      this.channel?.postMessage({game:'short-order-fever-v1',room:this.room,from:this.token,player:this.me,to,kind:'packet',data});
    }
    if(this.mode==='rtc-guest'){if(this.data?.readyState==='open')this.data.send(text);}
    else for(const [id,peer]of this.peers){if(peer.channel?.readyState==='open'&&(to==null||to===id))peer.channel.send(text);}
    return true;
  }
  resetRound(){
    if(this.mode==='hub'||!this.isAuthority())return false;
    this.finished=false;this.ended=false;this.lastWorld=null;this.lastWorldAt=-Infinity;this.pendingInput=null;
    this._send({kind:'reset'});return true;
  }
  _receive(data,from,transport){
    if(this.ended||!data||typeof data!=='object')return;
    this.received++;
    if(data.kind==='input'&&this.isAuthority()&&this.players.some(p=>p.id===from))this._emit('onInput',this._input(data.input),from);
    if(data.kind==='world'&&!this.isAuthority()&&from===this.host&&data.state){this.lastWorld=data.state;this._emit('onWorld',data.state);}
    if(data.kind==='roster'&&transport!=='hub'&&!this.isAuthority()&&Array.isArray(data.players)){
      this.players=data.players.slice(0,4).map(p=>({id:Number(p.id),name:String(p.name),color:String(p.color)}));this._roster();
    }
    if(data.kind==='welcome'&&transport==='rtc'){
      this.me=data.id;this.host=0;this.players=data.players;this._roster();this._status('Connected — kitchen is live');this._start();
    }
    if(data.kind==='reset'&&transport!=='hub'&&!this.isAuthority()&&from===this.host){
      this.finished=false;this.ended=false;this.lastWorld=null;this.pendingInput=null;this.started=false;this._start();return;
    }
    if(data.kind==='finished'&&!this.isAuthority()){
      if(data.state){this.lastWorld=data.state;this._emit('onWorld',data.state);}this.finished=true;this._emit('onEnd',{reason:'finished',standalone:true});
    }
    if(data.kind==='closed'&&!this.isAuthority()){
      this.ended=true;this._status('The head chef closed this kitchen.');this._emit('onEnd',{reason:'host-left',standalone:true});
    }
  }
  _openBroadcast(){
    if(!globalThis.BroadcastChannel)throw new Error('Local co-op needs BroadcastChannel support.');
    const path=location.pathname.replace(/\/[^/]*$/,'/');
    this.channel=new BroadcastChannel('short-order-fever-v1:'+path);
    this.channel.onmessage=event=>this._broadcastMessage(event.data);
  }
  hostLocal(){
    if(this.mode==='hub')return;
    this.close(false);this.mode='local-host';this.me=0;this.host=0;this.room=this._token();this.players=[this._player(0)];
    this.ended=false;this.finished=false;this.started=false;this._openBroadcast();this._roster();this._status('Kitchen open. Join from another tab, or send an online invite.');this._start();
    this._interval(()=>{
      this.channel?.postMessage({game:'short-order-fever-v1',kind:'beacon',room:this.room,from:this.token});
      const expired=[];for(const[id,peer]of this.peers)if(peer.kind==='local'&&Date.now()-peer.seen>8000)expired.push(id);
      for(const id of expired)this._removePeer(id);
    },1500);
    return {room:this.room,players:this.names()};
  }
  joinLocal(){
    if(this.mode==='hub')return;
    this.close(false);this.mode='local-guest';this.me=-1;this.host=0;this.room='';this.players=[];this.ended=false;this.finished=false;this.started=false;
    this._openBroadcast();this._status('Looking for a kitchen in another tab…');
    const discover=()=>{
      if(!this.room)this.channel?.postMessage({game:'short-order-fever-v1',kind:'discover',from:this.token});
      else this.channel?.postMessage({game:'short-order-fever-v1',kind:'ping',room:this.room,from:this.token,player:this.me});
    };discover();this._interval(discover,1500);
  }
  _broadcastMessage(m){
    if(!m||m.game!=='short-order-fever-v1'||m.from===this.token||this.ended)return;
    if(this.mode==='local-host'&&m.kind==='discover'){
      let peer=[...this.peers.values()].find(p=>p.token===m.from);
      if(!peer){const id=[1,2,3].find(n=>!this.peers.has(n));if(id==null){this.channel.postMessage({game:m.game,kind:'full',target:m.from,from:this.token});return;}
        peer={id,token:m.from,kind:'local',seen:Date.now()};this.peers.set(id,peer);this.players.push(this._player(id));this._roster();}
      this.channel.postMessage({game:m.game,kind:'welcome',target:m.from,from:this.token,room:this.room,id:peer.id,players:this.names()});
      this._send({kind:'roster',players:this.names()});
      if(this.lastWorld)this._send({kind:'world',state:this._snapshot(this.lastWorld)},peer.id);
      this._status(this.players.length+' chefs in the kitchen');return;
    }
    if(this.mode==='local-guest'&&m.kind==='welcome'&&m.target===this.token&&!this.room){
      this.room=m.room;this.me=m.id;this.players=m.players;this._roster();this._status('Connected — kitchen is live');this._start();return;
    }
    if(m.kind==='full'&&m.target===this.token&&!this.room){this._status('That kitchen already has four chefs.');return;}
    if(m.room!==this.room)return;
    if(this.mode==='local-host'&&m.kind==='ping'){
      const peer=this.peers.get(m.player);if(peer?.token===m.from)peer.seen=Date.now();return;
    }
    if(this.mode==='local-host'&&m.kind==='bye'){
      const peer=this.peers.get(m.player);if(peer?.token===m.from)this._removePeer(m.player);return;
    }
    if(m.kind==='packet'&&(m.to==null||m.to===this.me)){
      if(this.mode==='local-host'){
        const peer=this.peers.get(m.player);if(!peer||peer.token!==m.from)return;peer.seen=Date.now();
      }
      this._receive(m.data,m.player,'local');
    }
  }
  _removePeer(id){
    const peer=this.peers.get(id);if(!peer)return;this.peers.delete(id);peer.pc?.close();
    this.players=this.players.filter(p=>p.id!==id);this._roster();this._send({kind:'roster',players:this.names()});this._status(this.players.length+' chefs in the kitchen');
  }
  _newPC(){
    if(!globalThis.RTCPeerConnection)throw new Error('This browser cannot make an online kitchen.');
    const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    this.pendingPCs.add(pc);return pc;
  }
  async _gather(pc){
    if(pc.iceGatheringState==='complete')return;
    await new Promise(resolve=>{
      const done=()=>{clearTimeout(timeout);pc.removeEventListener('icegatheringstatechange',change);resolve();};
      const change=()=>{if(pc.iceGatheringState==='complete')done();};
      const timeout=setTimeout(done,7000);pc.addEventListener('icegatheringstatechange',change);
    });
  }
  _encode(data){return btoa(unescape(encodeURIComponent(JSON.stringify(data))));}
  _decode(text,type){
    if(typeof text!=='string'||text.length>200000)throw new Error('Paste the complete kitchen code.');
    let data;try{data=JSON.parse(decodeURIComponent(escape(atob(text.trim()))));}catch{throw new Error('That kitchen code is not valid.');}
    if(data.game!=='short-order-fever-v1'||data.type!==type||!data.description?.sdp)throw new Error('That is not a '+type+' code for Short Order Fever.');
    return data;
  }
  async createInvite(){
    if(this.mode==='hub')throw new Error('AI Hub handles all session invitations.');
    if(this.mode!=='local-host')this.hostLocal();
    if(this.players.length>=4)throw new Error('The kitchen already has four chefs.');
    if(this.offerPC){this.offerPC.close();this.pendingPCs.delete(this.offerPC);}
    const pc=this._newPC();this.offerPC=pc;const channel=pc.createDataChannel('kitchen',{ordered:true});
    channel.onopen=()=>{
      const id=[1,2,3].find(n=>!this.peers.has(n));if(id==null){channel.close();return;}
      if(this.offerPC===pc)this.offerPC=null;
      const peer={id,kind:'rtc',pc,channel};this.peers.set(id,peer);this.players.push(this._player(id));this._roster();
      channel.send(JSON.stringify({kind:'welcome',id,players:this.names()}));
      this._send({kind:'roster',players:this.names()});
      if(this.lastWorld)channel.send(JSON.stringify({kind:'world',state:this._snapshot(this.lastWorld)}));
      channel.onmessage=e=>{try{this._receive(JSON.parse(e.data),id,'rtc');}catch{}};
      channel.onclose=()=>this._removePeer(id);this._status(this.players.length+' chefs in the kitchen');
    };
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')this._status('Connection failed. Create a fresh invite and try again.');};
    await pc.setLocalDescription(await pc.createOffer());await this._gather(pc);
    return this._encode({game:'short-order-fever-v1',type:'offer',room:this.room,description:pc.localDescription});
  }
  async acceptInvite(text){
    if(this.mode==='hub')throw new Error('AI Hub handles all session invitations.');
    const offer=this._decode(text,'offer');
    this.close(false);this.mode='rtc-guest';this.me=-1;this.host=0;this.players=[];this.room=offer.room;
    this.ended=false;this.finished=false;this.started=false;const pc=this._newPC();this.pc=pc;
    pc.ondatachannel=e=>{
      this.data=e.channel;this.data.onmessage=ev=>{try{this._receive(JSON.parse(ev.data),0,'rtc');}catch{}};
      this.data.onclose=()=>{if(!this.ended){this.ended=true;this._status('Connection closed.');this._emit('onEnd',{reason:'host-left',standalone:true});}};
    };
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')this._status('Connection failed. Ask for a fresh invitation.');};
    await pc.setRemoteDescription(offer.description);await pc.setLocalDescription(await pc.createAnswer());await this._gather(pc);
    this._status('Send this answer code back to the head chef.');
    return this._encode({game:'short-order-fever-v1',type:'answer',room:this.room,description:pc.localDescription});
  }
  async acceptAnswer(text){
    if(this.mode==='hub')throw new Error('AI Hub handles all session invitations.');
    const answer=this._decode(text,'answer');
    if(!this.offerPC||answer.room!==this.room)throw new Error('Create an invite in this kitchen first.');
    await this.offerPC.setRemoteDescription(answer.description);this._status('Connecting chefs…');
  }
  _clearTimers(){for(const timer of this.timers)clearInterval(timer);this.timers.clear();clearTimeout(this.inputTimer);this.inputTimer=null;}
  close(reset=true){
    if(this.mode==='hub')return;
    if(this.active()&&!this.ended){if(this.isAuthority())this._send({kind:'closed'});else this.channel?.postMessage({game:'short-order-fever-v1',kind:'bye',room:this.room,from:this.token,player:this.me});}
    this.ended=true;this._clearTimers();this.channel?.close();this.channel=null;
    for(const pc of this.pendingPCs)pc.close();this.pendingPCs.clear();this.peers.clear();
    this.pc=null;this.data=null;this.offerPC=null;this.pendingInput=null;this.lastWorld=null;
    if(reset){this.mode='solo';this.me=0;this.host=0;this.server=false;this.players=[this._player(0)];this.finished=false;this.ended=false;this.started=false;this._roster();}
  }
  getDiagnostics(){return {mode:this.mode,me:this.me,host:this.host,server:this.server,authority:this.isAuthority(),players:this.names(),sent:this.sent,received:this.received,maxBytes:this.maxBytes,started:this.started,ended:this.ended};}
}
