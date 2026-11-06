import functools
import http.server
import json
import pathlib
import sys
import threading
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
count=0
failures=[]
report={}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  page=browser.new_page(viewport={'width':1400,'height':900})
  page.clock.install()
  page.goto(f'http://127.0.0.1:{server.server_port}/vendor/hub/harness.html?game=/build/game.html&players=2&scenario=server&seed=8&limit=900')
  page.wait_for_function('document.querySelectorAll("iframe").length===3')
  for frame in page.frames[1:]:
   frame.wait_for_function('!!window.TB?.app.net')
   frame.evaluate('''()=>{const a=TB.app,bot=new TB.Bot;a.game._frame=()=>{};a.sound.stop();
    a.driver=(_rendered,seat)=>{const host=[...parent.document.querySelectorAll('iframe')].map(f=>f.contentWindow).find(w=>w.TB?.app.net?.info.isHost);const r=host?.TB.app.net.run;if(!r)return {};return bot.intent(r,r.players.find(p=>p.seat===seat));};}''')
  page.clock.pause_at(page.evaluate('Date.now()+100'))
  page.locator('#release').dispatch_event('click')
  floors=set()
  for i in range(18000):
   page.clock.run_for(32)
   if i%15:continue
   frames=[f for f in page.frames[1:] if 'game.html' in f.url]
   states=[f.evaluate('({server:TB.app.net.info.server,host:TB.app.net.info.isHost,state:TB.app.net.state,finished:TB.app.net.finished,ended:TB.app.net.ended,errors:TB.app.game.errors})') for f in frames]
   host=next(s for s in states if s['host'])
   floors.add(host['state']['floor'])
   if i%150==0:(root/'build/hub-campaign-progress.json').write_text(json.dumps({'virtualSecond':i*.032,'floor':host['state']['floor'],'phase':host['state']['phase'],'rescued':host['state']['rescued'],'lives':host['state']['lives'],'elapsed':host['state']['elapsed'],'errors':host['errors']}))
   if host['finished'] or host['ended']:
    page.clock.run_for(500)
    states=[f.evaluate('({server:TB.app.net.info.server,host:TB.app.net.info.isHost,state:TB.app.net.state,finished:TB.app.net.finished,ended:TB.app.net.ended,errors:TB.app.game.errors})') for f in frames]
    report={'copies':states,'round':page.locator('#round').inner_text(),'log':page.locator('#log').inner_text(),'floors':list(floors)}
    break
  count=5
  if not report:failures.append('Full harness campaign exceeded time limit')
  else:
   h=next(s for s in report['copies'] if s['host'])
   if h['state']['rescued']!=26 or h['state']['lives']<=0:failures.append('Full shared-world harness campaign did not win: '+json.dumps({k:h['state'][k] for k in ['phase','rescued','lives','floor','elapsed']}))
   if len(floors)!=5:failures.append('Not every floor reached through harness')
   if not all(s['state']['rescued']==26 and s['state']['score']==h['state']['score'] for s in report['copies']):failures.append('Final objective state differs across copies')
   if 'Ended played' not in report['round']:failures.append('Harness did not record played result')
   if any(s['errors'] for s in report['copies']):failures.append('Draw/runtime errors in full harness campaign')
  browser.close()
except Exception as e:failures.append(str(e))
finally:
 server.shutdown();server.server_close()
(root/'build/full-hub-campaign.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'count':count,'failures':failures}))
sys.exit(1 if failures else 0)
