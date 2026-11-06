import Peer from 'peerjs';

const COLORS=['#f2a59b','#9dc4ff','#a3e6bd','#f8d78e'];
export class Network {
  constructor(callbacks={}){this.callbacks=callbacks;this.hub=!!window.AIHub?.active;this.mode='solo';this.ghosts=new Map();this.players=[];this.me=0;this.started=false;this.ended=false;this.reported=false;this.tickCd=0;this.progressCd=0;this.roomCode='';this.status='';this.links=new Map();this.seen=new Set();this.seq=0;this.token=crypto.randomUUID();}
  async initHub(){
    if(!this.hub)return null;
    AIHub.on('start',()=>{this.started=true;this.callbacks.start?.(this.info.seed,true);});
    AIHub.on('message',(data,from)=>{if(data?.type==='ghost'&&typeof data.x==='number'&&Number.isFinite(data.x)){const player=this.players.find(p=>p.id===from);this.ghosts.set(from,{...data,id:from,name:player?.name||`Captain ${from+1}`,color:player?.color,seen:performance.now()});}});
    AIHub.on('leave',({id})=>{this.players=this.players.filter(p=>p.id!==id);this.ghosts.delete(id);this.callbacks.change?.();});
    AIHub.on('time-up',()=>this.complete(this.game));
    AIHub.on('end',()=>{this.ended=true;this.started=false;this.callbacks.end?.();});
    this.info=await AIHub.connect({mode:'ghost',seats:[1,4]});
    if(!this.info){this.hub=false;return null;}this.mode='hub';this.players=this.info.players;this.me=this.info.me;this.status='Waiting for the fleet';return this.info;
  }
  ready(){if(this.hub)AIHub.ready();}
  async hostRoom(){
    this.leave();this.mode='room';this.isHost=true;this.me=0;this.roomCode=Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>'23456789ABCDEFGHJKMNPQRSTUVWXYZ'[v%30]).join('');this.players=[{id:0,token:this.token,name:'Captain 1',color:COLORS[0]}];this.setupChannel();this.status='Room open · connecting online…';this.callbacks.change?.();
    this.openPeer(true);return this.roomCode;
  }
  joinRoom(code){
    this.leave();this.mode='room';this.isHost=false;this.me=-1;this.roomCode=code.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);if(this.roomCode.length!==6){this.status='Enter all six letters and numbers.';this.callbacks.change?.();return;}
    this.status='Calling the ark…';this.setupChannel();this.send('hello',{token:this.token});this.openPeer(false);this.joinTimer=setTimeout(()=>{if(this.me===-1){this.status='No answer yet. Check the code and try again.';this.callbacks.change?.();}},12000);this.callbacks.change?.();
  }
  setupChannel(){if('BroadcastChannel'in window){this.channel=new BroadcastChannel('ccc-v1-'+this.roomCode);this.channel.onmessage=e=>this.receive(e.data,null);}}
  openPeer(host){
    try{this.peer=host?new Peer('ccc-v1-'+this.roomCode,{debug:0}):new Peer({debug:0});
      this.peer.on('open',()=>{if(host){this.status='Room open · online';this.callbacks.change?.();}else{const conn=this.peer.connect('ccc-v1-'+this.roomCode,{reliable:true,metadata:{token:this.token}});this.wire(conn,'host');}});
      this.peer.on('connection',conn=>this.wire(conn,conn.metadata?.token||conn.peer));
      this.peer.on('error',error=>{if(this.me<0||host&&this.players.length===1){this.status=error.type==='unavailable-id'?'That room code is busy. Create a new room.':'Online relay unavailable · same-browser rooms still work';this.callbacks.change?.();}});
      this.peer.on('disconnected',()=>{if(this.mode==='room'){this.status='Relay disconnected · reconnecting…';this.callbacks.change?.();if(!this.peer.destroyed)this.peer.reconnect();}});
    }catch{this.status='Online relay unavailable · same-browser rooms still work';this.callbacks.change?.();}
  }
  wire(conn,key){this.links.set(key,conn);conn.on('open',()=>{if(!this.isHost)this.send('hello',{token:this.token});});conn.on('data',p=>{this.receive(p,conn);if(this.isHost&&p?.kind==='ghost')for(const c of this.links.values())if(c!==conn&&c.open)c.send(p);});conn.on('close',()=>{this.links.delete(key);if(this.isHost){this.players=this.players.filter(p=>p.token!==key);this.broadcastLobby();}else{this.status='Connection closed. You can finish your own flight.';this.callbacks.change?.();}});conn.on('error',()=>{});}
  send(kind,data,to=null){if(this.mode!=='room')return;const p={code:this.roomCode,from:this.token,to,kind,data,id:this.token+':'+(++this.seq)};this.channel?.postMessage(p);for(const c of this.links.values())if(c.open)c.send(p);}
  receive(p,conn){
    if(!p||p.code!==this.roomCode||p.from===this.token||p.to&&p.to!==this.token||this.seen.has(p.id))return;this.seen.add(p.id);if(this.seen.size>500)this.seen.delete(this.seen.values().next().value);
    if(p.kind==='hello'&&this.isHost){let player=this.players.find(v=>v.token===p.from);if(!player){if(this.started||this.players.length>=4){this.send('rejected',{reason:this.started?'This cruise has already launched.':'This ark has four seats.'},p.from);return;}const id=[0,1,2,3].find(i=>!this.players.some(v=>v.id===i));player={id,token:p.from,name:`Captain ${id+1}`,color:COLORS[id]};this.players.push(player);}if(conn)this.links.set(p.from,conn);this.broadcastLobby();}
    if(p.kind==='lobby'&&!this.isHost){this.players=p.data.players;this.me=this.players.find(v=>v.token===this.token)?.id??-1;this.status=this.me>=0?'Aboard · waiting for the captain':'Room full';if(this.me>=0)clearTimeout(this.joinTimer);this.callbacks.change?.();}
    if(p.kind==='start'&&!this.isHost){this.started=true;this.reported=false;this.ended=false;this.callbacks.start?.(p.data.seed,false);}
    if(p.kind==='ghost'){const player=this.players.find(v=>v.token===p.from);if(player)this.ghosts.set(player.id,{...p.data,id:player.id,name:player.name,color:player.color,seen:performance.now()});}
    if(p.kind==='result'){const player=this.players.find(v=>v.token===p.from);if(player)player.score=p.data.score;this.callbacks.change?.();}
    if(p.kind==='leave'){const player=this.players.find(v=>v.token===p.from);if(player)this.ghosts.delete(player.id);this.players=this.players.filter(v=>v.token!==p.from);if(this.isHost)this.broadcastLobby();this.callbacks.change?.();}
    if(p.kind==='rejected'){this.status=p.data.reason;this.callbacks.change?.();}
  }
  broadcastLobby(){this.send('lobby',{players:this.players});this.callbacks.change?.();}
  startRoom(){if(!this.isHost||this.started)return;const seed=crypto.getRandomValues(new Uint32Array(1))[0];this.started=true;this.reported=false;this.ended=false;this.send('start',{seed});this.callbacks.start?.(seed,false);}
  tick(dt,game){
    this.game=game;if(!this.started||this.ended)return;this.tickCd-=dt;this.progressCd-=dt;
    if(this.tickCd<=0){this.tickCd=.1;const s=game.shuttle;const data={type:'ghost',phase:game.phase,planet:game.planet,x:game.phase==='rescue'?s.x:0,y:game.phase==='rescue'?s.y:0,aim:game.aim,score:game.score,rescued:game.rescued};if(this.hub)AIHub.send(data,{reliable:false});else this.send('ghost',data);}
    if(this.progressCd<=0){this.progressCd=.5;if(this.hub&&!this.reported)AIHub.progress({score:game.score,label:`${game.rescued}/18 rescued · ${game.pairs} pairs`});}
    if(['victory','defeat'].includes(game.phase))this.complete(game);
  }
  complete(game){if(!game||this.reported)return;this.reported=true;const score=Math.round(game.score);if(this.hub)AIHub.result({score,stats:{'Creatures rescued':game.rescued,'Pairs reunited':game.pairs,'Meteors stopped':game.kills},awards:game.pairs===9?[{title:'Everybody aboard',detail:'All nine pairs made it home.'}]:[]});else if(this.mode==='room'){const p=this.players.find(p=>p.id===this.me);if(p)p.score=score;this.send('result',{score});}}
  getGhosts(){return [...this.ghosts.values()].filter(g=>performance.now()-g.seen<3500);}
  leave(){
    if(this.hub)return;if(this.mode==='room')this.send('leave',{});clearTimeout(this.joinTimer);this.channel?.close();this.channel=null;this.peer?.destroy();this.peer=null;this.links.clear();this.ghosts.clear();this.players=[];this.mode='solo';this.started=false;this.ended=false;this.reported=false;this.roomCode='';this.me=0;this.isHost=false;this.seen.clear();
  }
}
