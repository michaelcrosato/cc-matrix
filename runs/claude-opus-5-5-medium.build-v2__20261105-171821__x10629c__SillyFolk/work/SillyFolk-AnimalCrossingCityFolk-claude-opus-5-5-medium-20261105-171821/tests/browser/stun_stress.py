#!/usr/bin/env python3
# The default-ICE join repeated, printing connection states and timing whenever a guest doesn't arrive.
import sys, os, glob, time, re
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html=os.path.abspath(glob.glob(os.path.join(root,'..','SillyFolk-*.html'))[0]); url='file://'+html
N=int(sys.argv[1]) if len(sys.argv)>1 else 10; TO=int(sys.argv[2]) if len(sys.argv)>2 else 45000
def boot(c):
    pg=c.new_page(); pg.goto(url); pg.wait_for_function('window.__GAME__ && window.__PIXEL_READY__',timeout=90000); return pg
cands=lambda sdp:{k:len(re.findall('typ '+k,sdp)) for k in ['host','srflx']}
bad=0
with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS)
    for i in range(N):
        c3=b.new_context(viewport={'width':320,'height':180}); c4=b.new_context(viewport={'width':320,'height':180}); h=boot(c3); g=boot(c4)
        h.keyboard.press('KeyK'); h.wait_for_function("__GAME__.G.mode==='title'",timeout=20000); h.evaluate("__GAME__.actions.newGame({skipIntro:true,instant:true,seed:'h',name:'H',town:'T'})"); h.wait_for_timeout(1000)
        h.evaluate("(()=>{const V=__GAME__.visit;const s=new V.HostSession();window.__s=s;__GAME__.G.visit=V.wrap(s);})()"); t0=time.time(); code=h.evaluate("window.__s.openRtc()"); t1=time.time()
        offer=h.evaluate("window.__s.rtc.peers.get(window.__s.pendingPeer).pc.localDescription.sdp")
        reply=g.evaluate("async(code)=>{const V=__GAME__.visit;const s=new V.GuestSession();__GAME__.G.visit=V.wrap(s);return await s.joinRtc(code);}",code); t2=time.time()
        ans=g.evaluate("__GAME__.G.visit.session.transports[0].pendingPc.localDescription.sdp")
        h.evaluate("(c)=>window.__s.acceptReply(c)",reply)
        try: g.wait_for_function("__GAME__.G.world.guest===true",timeout=TO); ok=True
        except Exception: ok=False
        t3=time.time(); hc=g.evaluate('__GAME__.G.visit?.session.helloCount'); gc=g.evaluate('__GAME__.G.visit?.session.transports[0].counts'); hcn=h.evaluate('window.__s.rtc.counts'); print(i,'ok' if ok else 'NOARRIVE',('RETRIED' if (hc or 0)>1 else ''),f'hello {hc} guest {gc} host {hcn}',f'offer {t1-t0:.1f}s {cands(offer)} answer {t2-t1:.1f}s {cands(ans)} join {t3-t2:.1f}s')
        if not ok:
            bad+=1; print(' host',h.evaluate("[...window.__s.rtc.peers.values()].map(p=>[p.pc.connectionState,p.pc.iceConnectionState,p.ch.readyState])"),h.evaluate("window.__s.guests.size"),h.evaluate("window.__s.chunkQ?.length"),h.evaluate("__GAME__.status()"))
            print(' guest',g.evaluate("(()=>{const t=__GAME__.G.visit.session.transports[0];const c=t.pendingPc;return [c.connectionState,c.iceConnectionState,c.iceGatheringState,t.peers.size,[...t.peers.values()].map(p=>p.ch.readyState)]})()"),g.evaluate("__GAME__.G.visit.session.chunks.filter(Boolean).length"),g.evaluate("__GAME__.status()"))
        h.close(); g.close(); c3.close(); c4.close()
    b.close()
print('stun stress:',N-bad,'/',N)
