#!/usr/bin/env python3
# Two pages: BroadcastChannel join, movement both ways; WebRTC invite codes with iceServers []; guest keeps pockets and beans; host's save unchanged.
import sys, os, glob, json
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0]); url='file://'+html
fails=[];n=0
def ok(name,v,info=''):
    global n; n+=1
    if not v: fails.append(f'{name} {info}')
def boot(ctx,errs):
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)[:300])); pg.goto(url); pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000); pg.evaluate('window.__PIXEL_READY__.then(()=>1)'); return pg
def wait(pg,expr,ms=45000):
    try: pg.wait_for_function(expr,timeout=ms); return True
    except Exception: return False
HOSTGAME="""(()=>{const g=window.__GAME__;g.actions.newGame({skipIntro:true,instant:true,seed:'host',name:'Hosty',town:'Gateville'});})()"""
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS); errs=[]
    ctx=b.new_context(viewport={'width':480,'height':270})
    h=boot(ctx,errs); h.evaluate(HOSTGAME); h.wait_for_timeout(1500); h.evaluate("window.__GAME__.G.saveAndQuit()"); h.wait_for_timeout(600); hsave=h.evaluate("localStorage.getItem('sillyfolk:save')")
    g=boot(ctx,errs)
    # Host opens the gate from the real menu
    h.keyboard.press('KeyK'); h.wait_for_function("window.__GAME__.G.mode==='title'",timeout=20000); h.wait_for_timeout(300); h.evaluate("window.__GAME__.G.visitMenu()"); h.wait_for_timeout(600); ok('visit menu',h.evaluate("window.__GAME__.ui.model().screen")=='visit'); ok('items',h.evaluate("window.__GAME__.ui.model().items[0]")=='Open my gate')
    h.keyboard.press('Enter'); ok('host playing',wait(h,"window.__GAME__.G.mode==='play' && window.__GAME__.G.visit",30000)); h.wait_for_timeout(2500)
    g.keyboard.press('KeyK'); g.wait_for_function("window.__GAME__.G.mode==='title'",timeout=20000); g.wait_for_timeout(300); g.evaluate("window.__GAME__.G.visitMenu()"); g.wait_for_timeout(500); g.keyboard.press('ArrowDown'); g.wait_for_timeout(500); g.keyboard.press('Enter'); ok('friends list',wait(g,"window.__GAME__.ui.model().screen==='friends'"));
    ok('gate listed',wait(g,"window.__GAME__.ui.model().items.some(x=>x.includes('Gateville'))",20000),g.evaluate("window.__GAME__.ui.model()"))
    g.evaluate("(()=>{const t=window.__GAME__.UI.top;t.focus=0;})()"); g.wait_for_timeout(300); g.keyboard.press('Enter')
    ok('guest arrives',wait(g,"window.__GAME__.G.world.guest===true && window.__GAME__.G.mode==='play'",45000),g.evaluate("window.__GAME__.status()")); g.wait_for_timeout(1500)
    if not g.evaluate("!!window.__GAME__.G.visit"):
        print('visit FAIL guest never joined', g.evaluate("JSON.stringify(window.__GAME__.ui.model())")[:400], h.evaluate("window.__GAME__.status()"), errs[:3]); sys.exit(1)
    ok('host sees visitor',h.evaluate("window.__GAME__.G.visit.session.avatars.size")==1); ok('guest town name',g.evaluate("window.__GAME__.G.world.town")=='Gateville')
    # Movement both ways
    g.evaluate("window.__GAME__.actions.teleport(30,30)"); ok('host sees movement',wait(h,"[...window.__GAME__.G.visit.session.avatars.values()][0].x>29",15000),h.evaluate("[...window.__GAME__.G.visit.session.avatars.values()][0].x"))
    h.evaluate("window.__GAME__.actions.teleport(50,30)"); ok('guest sees host',wait(g,"[...window.__GAME__.G.visit.session.avatars.values()].some(v=>v.x>49)",15000))
    # Guests can't fell trees or use the bus
    g.evaluate("window.__GAME__.G.bus.call('town')"); g.wait_for_timeout(300); ok('bus refuses',g.evaluate("window.__GAME__.G.world.p.place")=='town')
    # Guest takes something, gets it from the host's world
    h.evaluate("(()=>{const G=window.__GAME__.G;const w=G.world;window.__id=null;})()"); itm=h.evaluate("""(()=>{const G=window.__GAME__.G;const w=G.world;const e=Object.values(w.ents).find(x=>x.t==='shell');return e?e.id:null})()""")
    if itm:
        g.evaluate(f"window.__GAME__.G.visit.session.send({{t:'do',a:'pick',id:'{itm}'}})"); ok('guest got the item',wait(g,"window.__GAME__.G.world.p.pockets.some(Boolean)",15000)); ok('entity left host world',wait(h,f"!window.__GAME__.G.world.ents['{itm}']",8000))
    g.evaluate("window.__GAME__.G.world.p.beans=4321;window.__GAME__.G.visit.session.save()"); before=g.evaluate("JSON.stringify(window.__GAME__.G.world.p.pockets.filter(Boolean))")
    # Host's save unchanged while being visited, guest leaves
    g.evaluate("window.__GAME__.G.saveAndQuit()"); g.wait_for_timeout(1200); ok('guest back at title',g.evaluate("window.__GAME__.G.mode")=='title',g.evaluate("window.__GAME__.G.mode")); v=g.evaluate("JSON.parse(localStorage.getItem('sillyfolk:visitor'))"); ok('guest keeps beans',v and v['beans']==4321,v); ok('guest keeps pockets',v and json.dumps(v['pockets'],separators=(',',':'))==before,[v,before])
    ok('host told',wait(h,"window.__GAME__.G.visit.session.avatars.size===0",15000)); saved=json.loads(h.evaluate("localStorage.getItem('sillyfolk:save')")); ok('host save has no guest beans',saved['p']['beans']!=4321); ok('host save is not the guest',saved['name']=='Hosty')
    # Three guests is the limit
    h.evaluate("(()=>{const s=window.__GAME__.G.visit.session;window.__full=[];const t={send:(m)=>{window.__full.push(m.t);return true}};s.guests.set('a',{}).set('b',{}).set('c',{});s.onMsg({t:'hello',name:'D',look:{hair:0,eyes:0,shirt:'s_red'}},'d',t);s.guests.clear();})()"); ok('fourth visitor is refused',h.evaluate("window.__full")==['full'],h.evaluate("window.__full"))
    # Host leaving sends guests home, keeping what they carry
    g.keyboard.press('KeyK'); g.wait_for_timeout(600); g.evaluate("window.__GAME__.G.visitMenu()"); g.wait_for_timeout(500); g.keyboard.press('ArrowDown'); g.wait_for_timeout(400); g.keyboard.press('Enter'); ok('gate listed again',wait(g,"window.__GAME__.ui.model().items.some(x=>x.includes('Gateville'))",20000)); g.wait_for_timeout(300); g.keyboard.press('Enter'); ok('guest back',wait(g,"window.__GAME__.G.world.guest===true",45000)); g.wait_for_timeout(1500); ok('guest carries over visits',g.evaluate("window.__GAME__.G.world.p.beans")==4321,g.evaluate("window.__GAME__.G.world.p.beans"))
    h.evaluate("window.__GAME__.G.visit.leave()"); ok('host leaving sends the guest home',wait(g,"window.__GAME__.G.mode==='title' && !window.__GAME__.G.visit",20000),g.evaluate("window.__GAME__.status()")); g.close(); h.close(); ctx.close()
    # The race behind the old intermittent failure: a guest idle past the attract timer with a session open
    c5=b.new_context(viewport={'width':480,'height':270}); g5=boot(c5,errs); g5.evaluate("(()=>{const V=window.__GAME__.visit;const s=new V.GuestSession();window.__GAME__.G.visit=V.wrap(s);window.__GAME__.game.idle=9.9})()"); g5.wait_for_timeout(2500); ok('no attract while a Visit is opening',g5.evaluate("window.__GAME__.G.mode")=='title',g5.evaluate("window.__GAME__.G.mode")); g5.evaluate("window.__GAME__.G.visit=null;window.__GAME__.game.idle=9.9"); ok('attract resumes after',wait(g5,"window.__GAME__.G.mode==='attract'",20000)); ok('new game from attract is clean',g5.evaluate("(()=>{const g=window.__GAME__;g.actions.newGame({skipIntro:true,instant:true,seed:'r'});return g.G.demo===null&&g.G.mode==='play'})()")); g5.close(); c5.close()
    # WebRTC with iceServers []: two browser contexts, Gate Pass and Reply Slip
    c1=b.new_context(viewport={'width':480,'height':270}); c2=b.new_context(viewport={'width':480,'height':270})
    h=boot(c1,errs); g=boot(c2,errs); h.keyboard.press('KeyK'); h.wait_for_function("window.__GAME__.G.mode==='title'",timeout=20000); h.evaluate(HOSTGAME); h.wait_for_timeout(1500)
    h.evaluate("(()=>{const V=window.__GAME__.visit;const s=new V.HostSession();window.__s=s;window.__GAME__.G.visit=V.wrap(s);})()"); code=h.evaluate("window.__s.openRtc([])"); ok('gate pass code',isinstance(code,str) and 200<len(code)<4000,len(code))
    reply=g.evaluate("""async(code)=>{const V=window.__GAME__.visit;const s=new V.GuestSession();window.__GAME__.G.visit=V.wrap(s);return await s.joinRtc(code,[]);}""",code); ok('reply slip',isinstance(reply,str) and len(reply)>100,len(reply))
    h.evaluate("(c)=>window.__s.acceptReply(c)",reply); ok('rtc guest arrives',wait(g,"window.__GAME__.G.world.guest===true && window.__GAME__.G.mode==='play'",60000),g.evaluate("window.__GAME__.status()"))
    None if g.evaluate("window.__GAME__.G.world.guest===true") else ok('rtc diagnostics',False,[h.evaluate("window.__GAME__.status()"),h.evaluate("[...window.__s.rtc.peers.values()].map(p=>[p.pc.connectionState,p.pc.iceConnectionState,p.ch.readyState])"),h.evaluate("window.__s.guests.size"),h.evaluate("window.__s.chunkQ?.length"),g.evaluate("[...window.__GAME__.G.visit.session.transports[0].peers.values()].map(p=>[p.pc.connectionState,p.pc.iceConnectionState,p.ch.readyState])"),g.evaluate("window.__GAME__.G.visit.session.chunks.filter(Boolean).length")])
    g.wait_for_timeout(1000); g.evaluate("window.__GAME__.actions.teleport(30,31)"); ok('rtc movement',wait(h,"[...window.__GAME__.G.visit.session.avatars.values()].some(v=>v.x>29)",15000))
    g.evaluate("window.__GAME__.G.saveAndQuit()"); g.wait_for_timeout(600); ok('rtc guest home',g.evaluate("window.__GAME__.G.mode")=='title')
    # Default ICE (the public STUN server): gathers within the 4 s limit, and two contexts still join with it
    g.close(); h.close(); c1.close(); c2.close()
    c3=b.new_context(viewport={'width':480,'height':270}); c4=b.new_context(viewport={'width':480,'height':270}); h2=boot(c3,errs); g2=boot(c4,errs); h2.keyboard.press('KeyK'); h2.wait_for_function("window.__GAME__.G.mode==='title'",timeout=20000); h2.evaluate(HOSTGAME); h2.wait_for_timeout(1200)
    h2.evaluate("(()=>{const V=window.__GAME__.visit;const s=new V.HostSession();window.__s=s;window.__GAME__.G.visit=V.wrap(s);})()"); code2=h2.evaluate("window.__s.openRtc()"); ok('stun gate pass',len(code2)>200,len(code2))
    sdp=h2.evaluate("window.__s.rtc.peers.get(window.__s.pendingPeer).pc.localDescription.sdp"); print('stun: server-reflexive candidate', 'typ srflx' in sdp) if '--v' in sys.argv else None; ok('stun candidate gathered','typ srflx' in sdp,sdp[:200])
    reply2=g2.evaluate("async(code)=>{const V=window.__GAME__.visit;const s=new V.GuestSession();window.__GAME__.G.visit=V.wrap(s);return await s.joinRtc(code);}",code2); ans2=g2.evaluate("__GAME__.G.visit.session.transports[0].pendingPc.localDescription.sdp"); ok('reply slip has a public address','typ srflx' in ans2,ans2[-200:]); h2.evaluate("(c)=>window.__s.acceptReply(c)",reply2); ok('stun guest arrives',wait(g2,"window.__GAME__.G.world.guest===true",60000))
    if not g2.evaluate("window.__GAME__.G.world.guest===true"): print('visit FAIL stun diagnostics', h2.evaluate("[...window.__s.rtc.peers.values()].map(p=>[p.pc.connectionState,p.pc.iceConnectionState,p.ch.readyState])"), h2.evaluate("window.__s.guests.size"), g2.evaluate("(()=>{const t=window.__GAME__.G.visit.session.transports[0];const c=t.pendingPc;return [c.connectionState,c.iceConnectionState,t.peers.size,window.__GAME__.G.visit.session.chunks.filter(Boolean).length]})()"))
    # A guest's catch is claimed and checked by the host: in reach is kept, out of reach is taken back
    g2.wait_for_timeout(800); g2.evaluate("(()=>{const G=window.__GAME__.G;G.world.p.pockets[0]={id:'carp'};G.visit.session.claim('carp')})()"); ok('in-reach catch accepted',wait(g2,"window.__GAME__.G.visit.session.lastClaim?.ok===true",15000)); ok('guest keeps it',g2.evaluate("window.__GAME__.G.world.p.pockets[0]?.id")=='carp')
    g2.evaluate("(()=>{const G=window.__GAME__.G;const s=G.visit.session;s.lastClaim=null;s.send({t:'do',a:'catch',it:'carp',x:G.world.p.x+40,z:G.world.p.z})})()"); ok('far catch refused',wait(g2,"window.__GAME__.G.visit.session.lastClaim?.ok===false",15000)); ok('refused catch removed',g2.evaluate("!window.__GAME__.G.world.p.pockets.some(p=>p&&p.id==='carp')"))
    # A gift dropped by the guest lands in the host's world
    g2.wait_for_timeout(800); g2.evaluate("window.__GAME__.G.visit.session.send({t:'do',a:'drop',it:'pear',x:30,z:30})"); ok('guest gift reaches host',wait(h2,"Object.values(window.__GAME__.G.world.ents).some(e=>e.it==='pear'&&e.from==='guest')",15000))
    ok('no page errors',len(errs)==0,errs[:4]); b.close()
for f in fails[:40]: print('visit FAIL',f)
print(f'visit: {n-len(fails)}/{n} passed'); sys.exit(1 if fails else 0)
