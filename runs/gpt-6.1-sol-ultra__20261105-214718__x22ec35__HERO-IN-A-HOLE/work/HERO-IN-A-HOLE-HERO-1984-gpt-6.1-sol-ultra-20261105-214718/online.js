/* AI Hub protocol v1 shared world + standalone direct peer co-op. */
export class Online {
  constructor({onInput=()=>{},onSnapshot=()=>{},onStart=()=>{},onStatus=()=>{},onEnd=()=>{}}={}) {
    this.onInput=onInput;this.onSnapshot=onSnapshot;this.onStart=onStart;this.onStatus=onStatus;this.onEnd=onEnd;
    this.active=false;this.isHost=false;this.isGuest=false;this.ended=false;this.started=false;
    this.info=null;this.transport=null;this.peer=null;this.channel=null;this.room=null;
    this.counts={sent:0,received:0,inputs:0,snapshots:0};this.lastScore=0;this.lastWon=false;this.finished=false;
    this.nonce=globalThis.crypto?.randomUUID?.()||String(Math.random());
  }
  async init() {
    this.hub=globalThis.AIHub;
    if(!this.hub?.active)return null;
    this.transport='hub';this.active=true;
    this.hub.on('message',(data,from)=>this.receive(data,from));
    this.hub.on('start',()=>{
      const wait=()=>{
        if(this.ended)return;
        if(this.hub.time()<0){this.countdown=setTimeout(wait,35);return;}
        this.started=true;this.onStart({coop:this.info.players.length>1,online:true,info:this.info});
        this.status('playing','Rescue team connected.');
      };wait();
    });
    this.hub.on('time-up',()=>{if(this.isHost)this.finish(this.lastScore,this.lastWon);});
    this.hub.on('end',data=>{this.ended=true;this.started=false;clearTimeout(this.countdown);this.status('ended',`Round ended: ${data.reason}.`);this.onEnd(data);});
    this.hub.on('leave',data=>this.status('leave',`A rescue operator left the round.`,data));
    const info=await this.hub.connect({mode:'shared-world',seats:[1,2]});
    if(!info){this.active=false;this.transport=null;return null;}
    this.info=info;this.isHost=info.isHost;this.isGuest=!info.isHost;
    this.status('waiting','AI Hub is preparing the rescue.');
    return info;
  }
  ready(){if(this.transport==='hub'&&!this.ended)this.hub.ready();}
  status(kind,text,extra={}){this.onStatus({kind,text,...extra});}
  receive(data,from) {
    if(this.ended||!data||typeof data!=='object')return;
    this.counts.received++;
    if(data.kind==='input'&&this.isHost&&from!==this.info?.host){this.counts.inputs++;this.onInput(data.input,from);}
    if(data.kind==='snapshot'&&this.isGuest&&from===this.info?.host){this.counts.snapshots++;this.lastScore=data.snapshot?.score||0;this.onSnapshot(data.snapshot);}
    if(data.kind==='finish'&&this.transport!=='hub'){this.status('finished',data.won?'All operators accounted for.':'The rescue shift has ended.');}
  }
  send(data,to=null) {
    if(!this.active||this.ended||!this.started)return false;
    let ok=false;
    if(this.transport==='hub')ok=this.hub.send(data,{...(to===null?{}:{to}),reliable:true});
    else if(this.transport==='rtc'&&this.channel?.readyState==='open'){this.channel.send(JSON.stringify(data));ok=true;}
    else if(this.transport==='broadcast'&&this.room){this.room.postMessage({sender:this.nonce,from:this.info.me,data});ok=true;}
    if(ok)this.counts.sent++;return ok;
  }
  sendInput(input){return this.isGuest?this.send({kind:'input',input},this.info.host):false;}
  sendSnapshot(snapshot){if(!this.isHost)return false;this.lastScore=snapshot?.score||0;this.lastWon=snapshot?.state==='victory';return this.send({kind:'snapshot',snapshot});}
  finish(score=this.lastScore,won=this.lastWon){
    if(!this.isHost||this.finished||this.ended)return;
    this.finished=true;this.lastScore=score;this.lastWon=won;
    if(this.transport==='hub'){
      const ids=this.info.players.map(p=>p.id);const scores=Object.fromEntries(ids.map(id=>[id,score]));
      this.hub.finish({standings:[ids],scores,won,stats:Object.fromEntries(ids.map(id=>[id,{RescueScore:score}]))});
    }else this.send({kind:'finish',score,won});
  }
  fail(message){if(this.transport==='hub')this.hub.fail(message);else this.status('error',message);}
  standaloneInfo(host){
    this.info={me:host?0:1,host:0,isHost:host,server:false,players:[{id:0,name:'Operator 1',color:'#ffbf69'},{id:1,name:'Operator 2',color:'#62e6e0'}],mode:'shared-world'};
    this.isHost=host;this.isGuest=!host;this.ended=false;this.finished=false;
  }
  requireStandalone(){if(globalThis.AIHub?.active)throw new Error('AI Hub manages this connection.');}
  makePeer(host){
    this.requireStandalone();this.disconnect(false);this.standaloneInfo(host);this.transport='rtc';
    if(!globalThis.RTCPeerConnection)throw new Error('Direct co-op requires a browser with WebRTC.');
    this.peer=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    this.peer.onconnectionstatechange=()=>{
      const state=this.peer?.connectionState;
      if(state==='failed')this.status('error','Direct connection could not be established. Try another network or play through AI Hub.');
      if(state==='disconnected'||state==='closed'){this.active=false;this.status('disconnected','Your partner disconnected.');this.onEnd({reason:'partner-left'});}
    };
    this.peer.ondatachannel=e=>this.bindChannel(e.channel);
    if(host)this.bindChannel(this.peer.createDataChannel('hero-rescue',{ordered:true}));
    return this.peer;
  }
  bindChannel(channel){
    this.channel=channel;
    channel.onopen=()=>{this.active=true;this.started=true;this.status('playing','Direct co-op connected.');this.onStart({coop:true,online:true,info:this.info});};
    channel.onmessage=e=>{try{this.receive(JSON.parse(e.data),this.isHost?1:0);}catch{this.status('error','A connection packet could not be read.');}};
    channel.onclose=()=>{if(!this.ended){this.active=false;this.started=false;this.status('disconnected','Your partner disconnected.');this.onEnd({reason:'partner-left'});}};
    channel.onerror=()=>this.status('error','The direct connection was interrupted.');
  }
  async waitIce(){
    if(this.peer.iceGatheringState==='complete')return;
    const peer=this.peer;
    await new Promise(resolve=>{const timer=setTimeout(done,6000);function done(){clearTimeout(timer);peer.removeEventListener('icegatheringstatechange',check);resolve();}function check(){if(peer.iceGatheringState==='complete')done();}peer.addEventListener('icegatheringstatechange',check);});
  }
  encode(desc){return 'HERO1.'+btoa(JSON.stringify({type:desc.type,sdp:desc.sdp}));}
  decode(code){try{const text=String(code).trim();if(!text.startsWith('HERO1.'))throw 0;const d=JSON.parse(atob(text.slice(6)));if(!['offer','answer'].includes(d.type)||typeof d.sdp!=='string')throw 0;return d;}catch{throw new Error('This connection code is not valid. Paste the complete HERO1 code.');}}
  async createOffer(){
    const peer=this.makePeer(true);this.status('working','Preparing a direct co-op invite…');
    await peer.setLocalDescription(await peer.createOffer());await this.waitIce();
    const code=this.encode(peer.localDescription);this.status('invite','Send your invite to your partner. Paste their answer and select Connect.');return code;
  }
  async acceptOffer(code){
    const desc=this.decode(code);if(desc.type!=='offer')throw new Error('Paste the host’s invite to make an answer.');
    const peer=this.makePeer(false);await peer.setRemoteDescription(desc);await peer.setLocalDescription(await peer.createAnswer());await this.waitIce();
    this.status('answer','Send this answer back to the host. Keep this screen open.');return this.encode(peer.localDescription);
  }
  async acceptAnswer(code){
    const desc=this.decode(code);if(desc.type!=='answer')throw new Error('The host needs the partner’s answer code.');
    if(!this.peer||!this.isHost)throw new Error('Create an invite first, then paste your partner’s answer.');
    await this.peer.setRemoteDescription(desc);this.status('connecting','Connecting rescue operators…');
  }
  createRoom(code=''){
    this.requireStandalone();this.disconnect(false);this.standaloneInfo(true);this.transport='broadcast';
    const token=code||Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>(n%36).toString(36)).join('').toUpperCase();
    this.bindRoom(token);this.status('invite',`Local test room ${token} is waiting for a partner.`);return token;
  }
  joinRoom(code){
    this.requireStandalone();this.disconnect(false);this.standaloneInfo(false);this.transport='broadcast';this.bindRoom(String(code).trim().toUpperCase());
    const join=()=>this.room?.postMessage({sender:this.nonce,join:true});join();this.joinTimer=setInterval(join,500);
    this.status('connecting','Joining the rescue room…');
  }
  bindRoom(code){
    if(!globalThis.BroadcastChannel)throw new Error('This browser does not support local test rooms.');
    this.roomCode=code;this.room=new BroadcastChannel('hero-rescue-'+code);
    this.room.onmessage=e=>{
      const m=e.data;if(m.sender===this.nonce)return;
      if(m.join&&this.isHost){this.room.postMessage({sender:this.nonce,welcome:true,to:m.sender});if(!this.active){this.active=true;this.started=true;this.onStart({coop:true,online:true,info:this.info});}return;}
      if(m.welcome&&m.to===this.nonce&&this.isGuest){clearInterval(this.joinTimer);if(!this.active){this.active=true;this.started=true;this.onStart({coop:true,online:true,info:this.info});}return;}
      if(m.data)this.receive(m.data,m.from);
    };
  }
  disconnect(notify=true){
    if(this.transport==='hub')return;
    this.ended=true;this.active=false;this.started=false;clearInterval(this.joinTimer);clearTimeout(this.countdown);
    if(this.channel){this.channel.onclose=null;this.channel.close();this.channel=null;}
    if(this.peer){this.peer.onconnectionstatechange=null;this.peer.close();this.peer=null;}
    if(this.room){this.room.close();this.room=null;}
    this.transport=null;this.isGuest=false;this.isHost=false;this.info=null;if(notify)this.status('disconnected','Connection closed.');
  }
  diagnostics(){return {active:this.active,started:this.started,isHost:this.isHost,isGuest:this.isGuest,transport:this.transport,ended:this.ended,server:!!this.info?.server,...this.counts};}
}
