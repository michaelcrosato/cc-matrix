from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
import json, re, traceback, time, os
root=Path(__file__).resolve().parent.parent
project=json.loads((root/'project.json').read_text());artifact=root.parent/(project['slug']+'.html')
results=[];reports=[]
def check(name,condition,detail=''):
    results.append({'name':name,'pass':bool(condition),'error':str(detail) if not condition else ''})
def scenario(name,fn):
    try:fn()
    except Exception:check(name,False,traceback.format_exc())
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root.parent)))
Thread(target=server.serve_forever,daemon=True).start()
html=(root/'vendor/hub/harness.html').read_text().replace("from './bridge.js'","from '../../vendor/hub/bridge.js'").replace("from './round.js'","from '../../vendor/hub/round.js'")
html=html.replace('if (auto) conformance();',"Object.defineProperty(window,'__harnessState',{get:()=>current});window.__harnessControl={release:releaseRound,remove:key=>removeCell(current.cells.find(c=>c.key===key))};\nif (auto) conformance();")
(root/'tests/artifacts/harness-extra.html').write_text(html)
try:
 with sync_playwright() as pw:
    browser=pw.chromium.launch()
    context=browser.new_context(viewport={'width':1280,'height':860})
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    def url(extra=False,**kwargs):
        args={'game':'/'+artifact.name,'players':2,'latency':150,'jitter':50,'loss':5,'play':4000,**kwargs}
        harness='tests/artifacts/harness-extra.html' if extra else 'vendor/hub/harness.html'
        return f'http://127.0.0.1:{server.server_port}/{root.name}/{harness}?'+urlencode(args)
    for mode,n in ([] if os.environ.get('EDGE_NETWORK_CASE')=='campaign' else [('standard',1),('standard',2),('host-leave',2),('server',2)]):
        def run(mode=mode,n=n):
            page.goto(url(scenario=mode,players=n,auto=1));page.wait_for_selector('body[data-complete="true"]',timeout=45000)
            report=page.evaluate('window.__hubCheck');reports.append(report)
            for c in report['checks']:check(f'official {mode}/{n}: '+c['name'],c['pass'],c.get('detail',''))
            states=[]
            for f in page.frames[1:]:
                states.append(f.evaluate('({title:document.title,tick:__edge.world.tick,sector:__edge.world.sector,outcome:__edge.world.outcome,ended:__edge.online.ended,stats:__edge.online.stats,errors:__game.errors,server:AIHub.server})'))
            check(f'official {mode}/{n}: every frame is this game and error-free',all(s['title']=='Yars on the Edge' and not s['errors'] for s in states),states)
            check(f'official {mode}/{n}: no oversize packets',all(s['stats']['maxBytes']<16384 for s in states),states)
            if mode=='server':check('server-only host has no extra avatar',page.frames[-1].evaluate('__edge.world.players.length===2 && !__edge.world.players.some(p=>p.id===AIHub.me)'))
        scenario(f'official {mode}/{n} harness',run)

    def manual(scenario='standard',players=2,**kwargs):
        page.goto(url(extra=True,scenario=scenario,players=players,**kwargs))
        page.wait_for_function('window.__harnessState?.cells.length>0 && __harnessState.cells.every(c=>c.frame.contentWindow?.__edge?.online?.info && c.bridge.readySent) ',timeout=20000)
        return [c for c in page.frames[1:]]
    def ready_manual(scenario='standard',players=2,**kwargs):
        # Readiness is the coordinator's public status; the library does not require input to create the world.
        page.goto(url(extra=True,scenario=scenario,players=players,**kwargs))
        page.wait_for_function('window.__harnessState?.status && [...__harnessState.status.players,...(__harnessState.status.server?[__harnessState.status.server]:[])].every(p=>p.ready)',timeout=20000)
        return page.frames[1:]
    def release():
        page.get_by_role('button',name='Start now',exact=True).click()
        page.wait_for_function('__harnessState.status.phase==="playing"',timeout=10000)
        page.wait_for_function('__harnessState.cells.every(c=>c.frame.contentWindow.AIHub.time()>=0)',timeout=10000)
    def authority():
        frames=ready_manual()
        host,client=frames
        before=host.evaluate('__edge.world.tick');page.wait_for_timeout(300)
        check('hub pre-start leaves authoritative tick at zero',before==0 and host.evaluate('__edge.world.tick')==0)
        release();host.wait_for_function('__edge.world.tick>15')
        tick=host.evaluate('__edge.world.tick')
        malformed=host.evaluate('''()=>{const n=__edge.online,w=__edge.world,p=w.players[1],at=AIHub.time();const old={x:p.x,score:w.score,c:p.charge};const accepted=n.accept({t:'i',n:999,at,v:[999,0,127,0],c:99,f:1},p.id);n.receive({t:'award',score:999999},p.id);n.accept({t:'i',n:1000,at,v:[0,0,127,0],c:1,f:0},999);return{accepted,unchanged:p.x===old.x&&w.score===old.score&&p.charge===old.c,rejected:n.stats.rejected}}''')
        check('host rejects impossible vectors, forged senders and client score grants',not malformed['accepted'] and malformed['unchanged'] and malformed['rejected']>=3,malformed)
        # A reliable cannon action is retained when send() returns false, then repeated until the host acknowledges it.
        host.evaluate('''()=>{const w=__edge.world,p=w.players[1];p.charge=w.tuning.charge;p.x=180;p.y=100;p.inv=10;__edge.world.practice=true;}''')
        page.wait_for_timeout(500)
        client.evaluate('''()=>{const a=__edge,n=a.online,send=AIHub.send.bind(AIHub);let remaining=2;AIHub.send=(m,o)=>{if(m.t==='i'&&m.c>0&&remaining-->0)return false;return send(m,o)};a.testActions=[{mx:0,my:0,ax:1,ay:0,fire:false,cannon:1}];}''')
        host.wait_for_function('__edge.world.stats.cannons===1',timeout=7000)
        client.wait_for_function('__edge.world.players.find(p=>p.id===AIHub.me).cannonAck===1',timeout=5000)
        page.wait_for_timeout(400)
        check('lost cannon sends recover with one authoritative shot and acknowledgement',host.evaluate('__edge.world.stats.cannons===1') and client.evaluate('__edge.world.players.find(p=>p.id===AIHub.me).cannonAck===1'))
        client.evaluate('__edge.testActions=[Edge.blankAction()]')
        host.evaluate('''()=>{const w=__edge.world;for(const i of [1,5,9,13,21])w.cells[i].alive=false;}''')
        page.wait_for_timeout(650)
        host_mask=host.evaluate('Edge.compact(__edge.world).m');client_mask=client.evaluate('Edge.compact(__edge.world).m')
        check('full snapshots recover the exact destroyed-cell mask under loss',host_mask==client_mask)
        old=client.evaluate('__edge.online.lastSnapshot')
        stale=client.evaluate('''()=>{const a=__edge,n=a.online,score=a.world.score;n.apply({t:'s',k:n.lastSnapshot-1,p:[],sc:999999});return a.world.score===score}''')
        check('stale snapshots cannot resurrect cells or overwrite score',stale)
        host.evaluate('__game.pause();__game.advance(.03)');page.wait_for_timeout(500)
        check('online local menu leaves authoritative simulation running',host.evaluate('__edge.world.tick')>tick+30)
        check('online local menu remains operable without pausing remote play',host.evaluate('__edge.ui.screen==="pause" && __game.paused'))
        check('online workbench disables cheats and editing',host.evaluate('__edge.dev.show();__edge.ui.screen==="diagnostics"'))
        host.evaluate('__edge.ui.hide()')
        page.get_by_role('button',name='Hide host tab',exact=True).click();before=host.evaluate('__edge.world.tick');page.wait_for_timeout(900)
        check('brief host visibility loss continues fixed-step simulation',host.evaluate('__edge.world.tick')>before+60)
        page.get_by_role('button',name='Hide host tab',exact=True).click()
        page.select_option('#who','p1');page.get_by_role('button',name='Remove player',exact=True).click()
        host.wait_for_function('__edge.world.players.find(p=>p.id===1).gone',timeout=5000)
        check('non-host departure removes only that scout and leaves play possible',host.evaluate('__edge.world.players[0].alive && __edge.world.status==="playing" && __edge.world.players[1].gone'))
        page.get_by_role('button',name='Time up',exact=True).click();page.wait_for_function('__harnessState.record',timeout=8000)
        check('time-up completes once with remaining cooperative membership',page.evaluate('__harnessState.record.status==="played"') and host.evaluate('__edge.online.stats.finishes===1'))
        host.wait_for_function('__edge.online.ended',timeout=5000)
        before=host.evaluate('({tick:__edge.world.tick,sent:__edge.online.stats.sent})');host.evaluate('dispatchEvent(new KeyboardEvent("keydown",{code:"KeyD",key:"d",bubbles:true}));__edge.online.pump()');page.wait_for_timeout(250)
        check('session end stops ticks, sends, held input and synthesized nodes',host.evaluate('(b)=>__edge.world.tick===b.tick&&__edge.online.stats.sent===b.sent&&__game.input.held.size===0&&__edge.sound.nodes.size===0&&__game.disposed',before))
        record=page.evaluate('__harnessState.record');reports.append({'manual-authority':record})
    if not os.environ.get('EDGE_NETWORK_CASE'):scenario('authority, recovery, leave and end lifecycle',authority)

    def hidden():
        frames=ready_manual();release();host=frames[0]
        page.get_by_role('button',name='Hide host tab',exact=True).click()
        page.wait_for_function('__harnessState.record',timeout=26000)
        check('over-twenty-second hidden host voids via the hub',page.evaluate('__harnessState.record.status==="void" && __harnessState.record.reason==="host-hidden"'))
        page.get_by_role('button',name='Hide host tab',exact=True).click();page.wait_for_timeout(400)
        check('a void round remains inert when the host is shown again',host.evaluate('__edge.online.ended && __game.disposed'))
    if not os.environ.get('EDGE_NETWORK_CASE'):scenario('hidden-host cancellation',hidden)

    def timeup_transition():
        frames=ready_manual();release();host=frames[0]
        host.evaluate('__edge.world.status="transition";__edge.world.phaseTime=0;__edge.world.practice=true')
        page.get_by_role('button',name='Time up',exact=True).click();page.wait_for_function('__harnessState.record',timeout=8000)
        check('time-up during a sector transition finishes inside grace',page.evaluate('__harnessState.record.status==="played"') and host.evaluate('__edge.online.stats.finishes===1'))
    if not os.environ.get('EDGE_NETWORK_CASE'):scenario('transition time-up',timeup_transition)

    def full_server_campaign():
        frames=ready_manual(scenario='server',players=1,seed=41739,limit=240,latency=0,jitter=0,loss=0)
        host=frames[-1]
        host.evaluate('globalThis.__verificationPilot=new Edge.Pilot({approach:12,tolerance:10})')
        for f in frames[:2]:f.evaluate('__game.stop()')
        page.evaluate('''()=>{const state=__harnessState,server=state.cells.find(c=>c.server).frame.contentWindow,pilot=server.__verificationPilot;const timer=setInterval(()=>{if(server.__edge.online.ended){clearInterval(timer);return;}if(server.AIHub.time()<0)return;const w=server.__edge.world;for(const cell of state.cells.filter(c=>!c.server)){const copy=cell.frame.contentWindow,p=w.players.find(p=>p.id===copy.AIHub.me);copy.__edge.online.local(pilot.action(w,p));}},1000/120);server.AIHub.on('end',()=>clearInterval(timer));}''')
        release()
        trace=[];deadline=time.monotonic()+190
        while not page.evaluate('!!__harnessState.record') and time.monotonic()<deadline:
            trace.append([f.evaluate('({t:__edge.world.time,p:__edge.world.players.map(p=>[p.id,p.x,p.y,p.charge,p.alive]),mode:__edge.world.core.mode,act:__edge.online.latest,calls:__edge.world.stats.cannons})') for f in frames])
            page.wait_for_timeout(600)
        (root/'tests/artifacts/network-pilot-trace.json').write_text(json.dumps(trace,indent=2))
        page.wait_for_function('__harnessState.record',timeout=1000)
        record=page.evaluate('__harnessState.record');states=[f.evaluate('({status:__edge.world.status,outcome:__edge.world.outcome,sector:__edge.world.sector,phase:__edge.world.phase,score:__edge.world.score,stats:__edge.world.stats,online:__edge.online.stats,errors:__game.errors})') for f in frames]
        (root/'tests/artifacts/network-campaign.json').write_text(json.dumps({'record':record,'states':states},indent=2))
        check('server-only host completes all sectors from ordinary remote actions at baseline latency',record['status']=='played' and states[-1]['outcome']=='victory' and states[-1]['phase']==2,states)
        check('full online campaign ends with one cooperative finish and matching scores',states[-1]['online']['finishes']==1 and all(s['score']==states[-1]['score'] for s in states),states)
        check('network campaign uses no combat cheats and keeps packets legal',host.evaluate('!__edge.world.cheats.invulnerable && !__edge.world.cheats.infinite && !__edge.world.practice') and all(s['online']['maxBytes']<16384 and s['online']['unreliableMax']<=1180 and s['online']['maxPerSecond']<=20 and not s['errors'] for s in states),states)
        reports.append({'full-server-campaign':record,'states':states})
    scenario('full network campaign',full_server_campaign)
    check('network suite has no browser errors',not errors,errors)
    context.close();browser.close()
finally:
 server.shutdown();server.server_close()
 (root/'tests/artifacts/network-results.json').write_text(json.dumps(results,indent=2))
 (root/'tests/artifacts/network-reports.json').write_text(json.dumps(reports,indent=2))
