import functools
import http.server
import json
import threading
import sys
import urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT.parent
PROJECT=json.loads((ROOT/'project.json').read_text())
passed=failed=0
failures=[]
details=[]
def check(name,ok,detail=''):
    global passed,failed
    if ok: passed+=1
    else:
        failed+=1
        failures.append(name+(': '+str(detail) if detail else ''))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
handler=functools.partial(Quiet,directory=str(WORK))
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
thread=threading.Thread(target=server.serve_forever,daemon=True)
thread.start()
base='http://127.0.0.1:'+str(server.server_port)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
        try:
            scenarios=[] if '--live-only' in sys.argv else [(1,'standard',0,0,0),(2,'standard',0,0,0),(2,'standard',150,50,5),(2,'host-leave',150,50,5),(2,'server',150,50,5)]
            for players,scenario,latency,jitter,loss in scenarios:
                ctx=browser.new_context(viewport={'width':1440,'height':1000})
                page=ctx.new_page()
                warnings=[]
                page.on('console',lambda msg: warnings.append(msg.text) if msg.type=='warning' and '[AIHub]' in msg.text else None)
                query=urllib.parse.urlencode({'game':'/'+PROJECT['base']+'.html','players':players,'scenario':scenario,'latency':latency,'jitter':jitter,'loss':loss,'auto':1,'play':5000,'seed':4242})
                url=base+'/'+PROJECT['base']+'/tools/hub/harness.html?'+query
                name=f'{players} seats / {scenario} / {latency}ms / {loss}%'
                try:
                    page.goto(url)
                    page.wait_for_function('document.body.dataset.complete === "true"',timeout=70000)
                    report=page.evaluate('window.__hubCheck')
                    check(name+' official harness',report.get('pass') is True,[c for c in report.get('checks',[]) if not c.get('pass')])
                    check(name+' no client warnings',not warnings,warnings)
                    frames=[f for f in page.frames if f!=page.main_frame and PROJECT['base']+'.html' in f.url]
                    states=[]
                    for f in frames:
                        state=f.evaluate('({title:document.title,host:AIHub.isHost,server:AIHub.server,me:AIHub.me,players:mix.world.players.map(p=>p.id),tick:mix.world.tick,score:mix.world.score,lives:mix.world.lives,gate:mix.world.board.orientation,mask:mix.world.food.reduce((a,f,i)=>a|(f.alive?1<<i:0),0),rev:mix.world.revision,ended:mix.net.ended,muted:game.audio.muted,stats:mix.net.diagnostics,errors:game.errors})')
                        states.append(state)
                    check(name+' correct game served',all(s['title']==PROJECT['title'] for s in states) and bool(states),states)
                    if scenario=='server':
                        dedicated=[s for s in states if s['server']]
                        check(name+' no phantom server player',len(dedicated)==1 and dedicated[0]['me'] not in dedicated[0]['players'] and len(dedicated[0]['players'])==2,dedicated)
                    check(name+' all surviving copies ended and muted',all(s['ended'] and s['muted'] for s in states),states)
                    check(name+' bounded snapshot traffic',all(s['stats']['maxBytes']<16384 for s in states),states)
                    if scenario!='host-leave':
                        check(name+' final authoritative state agrees',len({(s['score'],s['lives'],s['gate'],s['mask'],s['rev']) for s in states})==1,states)
                    check(name+' no native game errors',all(not s['errors'] for s in states),states)
                    details.append({'scenario':name,'pass':report['pass'],'checks':report['checks'],'states':states})
                except Exception as e:
                    check(name,False,str(e))
                finally:
                    ctx.close()
            # A dedicated authoritative host, actual legal seat inputs, and impaired-network state repair.
            ctx=browser.new_context(viewport={'width':1440,'height':1000})
            page=ctx.new_page()
            try:
                query=urllib.parse.urlencode({'game':'/'+PROJECT['base']+'.html','players':2,'scenario':'server','latency':150,'jitter':50,'loss':5,'auto':0,'seed':4242})
                page.goto(base+'/'+PROJECT['base']+'/tools/hub/harness.html?'+query)
                page.wait_for_function("Array.from(document.querySelectorAll('iframe')).length===3&&Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow?.mix)",timeout=30000)
                check('dedicated copies stay neutral before the Hub start',page.evaluate("Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.mix.world.tick===0)"))
                page.locator('#release').click()
                page.evaluate("""()=>{
                  const copies=()=>Array.from(document.querySelectorAll('iframe')).map(f=>f.contentWindow).filter(w=>w.mix&&w.AIHub.active);
                  const host=copies().find(w=>w.AIHub.isHost),bots=new Map();window.__mixHost=host;window.__pausedSeat=null;window.__finishCount=0;
                  const finish=host.AIHub.finish.bind(host.AIHub);host.AIHub.finish=data=>{window.__finishPayload=data;window.__finishCount++;return finish(data)};
                  window.__mixDriver=setInterval(()=>{if(host.mix.net.ended)return;for(const win of copies()){
                    if(win.AIHub.server||window.__pausedSeat===win.AIHub.me)continue;
                    const id=win.AIHub.me,hero=host.mix.world.players.find(p=>p.id===id);if(!hero)continue;
                    let bot=bots.get(id);if(!bot){bot=new host.Mix.Bot(id);bots.set(id,bot)}
                    let input;const motion=hero.m;if(motion.moving){const to=motion._to,edge=host.mix.world.revision+':'+motion.cx+','+motion.cy+'>'+to.join(',');if(bot.edge!==edge){bot.edge=edge;bot.queued=bot.intent(host.mix.world,{...hero,m:{...motion,cx:to[0],cy:to[1],x:to[0],y:to[1],moving:false}});}input=bot.queued;}else input=bot.intent(host.mix.world,hero);['up','right','down','left'].forEach((action,i)=>win.game.input.hold(action,input.d===i));if(input.a)win.game.input.tap('chirp');
                  }},12);
                  window.__liveStates=()=>{
                    const ws=copies(),h=ws.find(w=>w.AIHub.isHost);if(!h)return null;const host=h.mix.world;
                    const clients=ws.filter(w=>!w.AIHub.isHost).map(w=>{
                      const n=w.mix.net,p=n.lastAuthoritativePacket,reference=h.mix.net.history.find(s=>s.q===n.lastPacket),a=w.mix.world;
                      return {id:w.AIHub.me,q:n.lastPacket,tick:a.tick,revision:a.revision,score:a.score,lives:a.lives,gate:a.board.orientation,mask:a.food.reduce((v,f,i)=>v|(f.alive?1<<i:0),0),matches:!!reference&&p?.q===reference.q&&a.tick===reference.t&&a.revision===reference.r&&a.score===reference.c[2]&&a.lives===reference.c[3]&&a.board.orientation===reference.c[6]&&a.food.reduce((v,f,i)=>v|(f.alive?1<<i:0),0)===reference.mask&&a.players.every((p,i)=>Math.abs(p.m.x-reference.p[i][1])<.0011&&Math.abs(p.m.y-reference.p[i][2])<.0011)};
                    });return {stage:host.stageIndex,tick:host.tick,rev:host.revision,phase:host.phase,remaining:host.remaining,score:host.score,lives:host.lives,gate:host.board.orientation,stats:host.stats,clients,net:h.mix.net.diagnostics};
                  };
                }""")
                import time
                deadline=time.monotonic()+180
                observed_gates=set();matching=0;samples=0;last=None
                while time.monotonic()<deadline:
                    page.wait_for_timeout(500)
                    s=page.evaluate('__liveStates()')
                    if not s:continue
                    last=s
                    if s['stage']>=2:observed_gates.add(s['gate'])
                    if all(c['matches'] for c in s['clients']):matching+=1
                    samples+=1
                    if samples%10==0:(ROOT/'build/reports/hub-live-progress.json').write_text(json.dumps(s))
                    if s['stage']>=3 or s['phase'] in ['won','lost']:break
                check('legal online inputs clear multiple real stages',last and last['stage']>=3,last)
                if not last or last['stage']<3:raise RuntimeError('Legal network route trace did not reach the fourth stage; later lifecycle checks were not run against a terminal world.')
                check('both online seats contribute to one team score',last and all(last['stats']['perPlayer'].get(str(i),{}).get('snacks',0)>0 for i in [0,1]),last)
                check('live latency/loss clients match authoritative repair snapshots',matching>=3 and matching/max(1,samples)>.75,{'matching':matching,'samples':samples,'last':last})
                check('gate orientation changes survive impaired transport',len(observed_gates)>=2,sorted(observed_gates))
                check('routine gameplay snapshot stays below packet target',last and last['net']['maxBytes']<=1200,last and last['net'])
                # Replaying an older packet must never resurrect collected snacks or rewind a gate.
                stale=page.evaluate("""()=>{const win=Array.from(document.querySelectorAll('iframe')).map(f=>f.contentWindow).find(w=>w.mix&&!w.AIHub.isHost);const n=win.mix.net,p=n.lastAuthoritativePacket,before=JSON.stringify([n.world.tick,n.world.remaining,n.world.score,n.world.board.orientation]);n.message({...p,q:p.q-1,mask:4095},win.AIHub.host);return before===JSON.stringify([n.world.tick,n.world.remaining,n.world.score,n.world.board.orientation])}""")
                check('live stale snapshots cannot resurrect food',stale)
                check('Hub rejects mutating debug commands',page.evaluate("Array.from(document.querySelectorAll('iframe')).filter(f=>!f.contentWindow.AIHub.server).every(f=>f.contentWindow.game.debug.command('stage',{index:5}).ok===false)"))
                before=page.evaluate('__mixHost.mix.world.tick')
                first=[f for f in page.frames if f!=page.main_frame and PROJECT['base']+'.html' in f.url][0]
                first.evaluate("game.input.tap('pause')");page.wait_for_timeout(350)
                check('local Hub menu cannot freeze authoritative play',page.evaluate('__mixHost.mix.world.tick')>before+20)
                first.evaluate('mix.ui.hide();game.resume()')
                # Drop a client's heartbeat altogether; neutralization must be enforced by the host.
                victim=page.evaluate("""()=>{const w=Array.from(document.querySelectorAll('iframe')).map(f=>f.contentWindow).find(w=>w.mix&&!w.AIHub.isHost&&w.AIHub.me===1);window.__victim=w;window.__pausedSeat=1;clearInterval(w.mix.net.timer);return w.AIHub.me}""")
                page.wait_for_timeout(1100)
                check('missing-heartbeat input is neutralized on the host',page.evaluate('__mixHost.mix.world.intents.get(1)?.d===-1'))
                page.evaluate("__victim.mix.net.timer=setInterval(()=>__victim.mix.net.pump(),1000/60);__pausedSeat=null")
                page.locator('#who').select_option('p1');page.locator('#remove').click();page.wait_for_timeout(600)
                check('leaving one seat removes it and keeps the campaign alive',page.evaluate('__mixHost.mix.world.players.length===1&&__mixHost.mix.world.players[0].id===0&&!__mixHost.mix.net.ended'))
                page.evaluate('clearInterval(__mixDriver)');page.locator('#timeup').click()
                page.wait_for_function('__mixHost.mix.net.ended',timeout=10000);page.wait_for_timeout(500)
                payload=page.evaluate('__finishPayload');check('dedicated time-up finishes once with only real remaining seats',page.evaluate('__finishCount===1') and payload['standings']==[[0]] and list(payload['scores'])==['0'] and payload['won'] is False,payload)
                check('unfinished time-up reports stage and food statistics',payload['stats']['0']['Stages cleared']>=3 and 'Snacks remaining' in payload['stats']['0'],payload)
                before=page.evaluate('({tick:__mixHost.mix.world.tick,sent:__mixHost.mix.net.diagnostics.sent})');page.wait_for_timeout(400)
                check('Hub end stops simulation transport sound and menu input',page.evaluate('__mixHost.mix.world.tick')==before['tick'] and page.evaluate('__mixHost.mix.net.diagnostics.sent')==before['sent'] and page.evaluate("Array.from(document.querySelectorAll('iframe')).filter(f=>f.contentWindow.mix).every(f=>f.contentWindow.game.audio.muted)"))
                details.append({'scenario':'dedicated legal-input gameplay with loss','last':last,'matchingSamples':matching,'samples':samples,'gateStates':list(observed_gates),'finish':payload})
            except Exception as e:
                check('dedicated live-state gameplay suite',False,str(e))
            finally:
                ctx.close()

        finally:
            browser.close()
finally:
    server.shutdown()
    server.server_close()
report={'passed':passed,'failed':failed,'skipped':0,'failures':failures,'details':details}
(ROOT/'build/reports/hub.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
