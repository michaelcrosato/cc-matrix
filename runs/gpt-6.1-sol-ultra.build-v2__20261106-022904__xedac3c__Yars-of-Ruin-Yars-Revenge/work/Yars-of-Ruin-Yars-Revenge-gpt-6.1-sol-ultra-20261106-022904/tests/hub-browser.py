"""Official AI Hub harness against the exact root HTML. Run with installed Playwright Python."""
import json, pathlib, threading, http.server, functools, sys, time
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[2]
DEV=pathlib.Path(__file__).resolve().parents[1]
ART=DEV/'tests/artifacts';ART.mkdir(parents=True,exist_ok=True)
GAME='/'+DEV.name+'.html'
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

def run():
 results=[]
 def check(name,yes,detail=''):
  results.append({'name':name,'pass':bool(yes),'detail':detail})
 handler=functools.partial(Quiet,directory=str(ROOT))
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 base=f'http://127.0.0.1:{server.server_port}'
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
   try:
    for players,scenario in ([] if ('--manual-only' in sys.argv or '--campaign-only' in sys.argv) else [(1,'standard'),(2,'standard'),(2,'host-leave'),(2,'server')]):
     context=browser.new_context(viewport={'width':1280,'height':860})
     page=context.new_page();errors=[];warnings=[]
     page.on('pageerror',lambda e:errors.append(str(e)))
     page.on('console',lambda m:warnings.append(m.text) if m.text.startswith('[AIHub]') else None)
     url=base+'/'+DEV.name+f'/vendor/hub/harness.html?game={GAME}&players={players}&latency=150&jitter=50&loss=5&auto=1&scenario={scenario}&play=5000'
     page.goto(url)
     try:page.wait_for_selector('body[data-complete="true"]',timeout=90000)
     except Exception as e:errors.append('Harness completion timeout: '+str(e))
     report=page.evaluate('window.__hubCheck || null')
     identity=[];worlds=[]
     for f in page.frames[1:]:
      try:
       identity.append(f.title())
       state=f.evaluate('({game:!!window.RuinApp,s:window.RuinApp?.game?.debug?.snapshot(),net:window.RuinApp?.online?.debug})')
       worlds.append(state)
      except Exception:pass
     check(f'hub {players} {scenario}: complete and official conformance',report and report.get('pass'),json.dumps([c for c in (report or {}).get('checks',[]) if not c.get('pass')]))
     check(f'hub {players} {scenario}: actual game identity',bool(identity) and all(x=='Yars of Ruin' for x in identity),str(identity))
     check(f'hub {players} {scenario}: no page errors or client warnings',not errors and not warnings,str(errors+warnings))
     check(f'hub {players} {scenario}: actual simulation advances',bool(worlds) and all(x.get('s',{}).get('tick',0)>0 for x in worlds),json.dumps(worlds)[:500])
     if scenario=='server':
      check('hub server: host has two player bodies only',any(w.get('net',{}).get('steps',0)>0 and len(w.get('s',{}).get('players',[]))==2 for w in worlds))
     # No activity after hub end: exact tick and sends remain unchanged.
     before=worlds
     page.wait_for_timeout(350)
     after=[]
     for f in page.frames[1:]:
      try:after.append(f.evaluate('({s:window.RuinApp?.game?.debug?.snapshot(),net:window.RuinApp?.online?.debug})'))
      except Exception:pass
     check(f'hub {players} {scenario}: no simulation or sends after end',len(before)==len(after) and all(b.get('s',{}).get('tick')==a.get('s',{}).get('tick') and b.get('net',{}).get('sent')==a.get('net',{}).get('sent') for b,a in zip(before,after)))
     (ART/f'hub-{players}-{scenario}.json').write_text(json.dumps({'report':report,'errors':errors,'warnings':warnings,'worlds':worlds},indent=2))
     context.close()
    if '--official-only' not in sys.argv and '--campaign-only' not in sys.argv:
     for scenario in ['nonhost-leave','visibility']:
      context=browser.new_context(viewport={'width':1280,'height':860});page=context.new_page();errors=[]
      page.on('pageerror',lambda e:errors.append(str(e)))
      page.goto(base+'/'+DEV.name+f'/vendor/hub/harness.html?game={GAME}&players=2&latency=150&jitter=50&loss=5&limit=120')
      page.wait_for_function("document.querySelectorAll('iframe').length===2")
      page.wait_for_function("[...document.querySelectorAll('iframe')].every(f=>f.contentWindow.RuinApp?.online)")
      page.locator('#release').click()
      page.wait_for_function("[...document.querySelectorAll('iframe')].every(f=>f.contentWindow.AIHub.time()>=0)")
      page.wait_for_timeout(700)
      frames=page.frames[1:];host=frames[0]
      if scenario=='nonhost-leave':
       old=host.evaluate('RuinApp.world.tick')
       page.locator('#who').select_option('p1');page.locator('#remove').click()
       page.wait_for_function("document.querySelector('iframe').contentWindow.RuinApp.world.players[1].departed===true")
       page.wait_for_timeout(500)
       state=host.evaluate('({tick:RuinApp.world.tick,players:RuinApp.world.players,net:RuinApp.online.debug})')
       check('hub explicit non-host departure: remaining scout continues',state['tick']>old and state['players'][0]['alive'] and state['players'][1]['departed'] and state['players'][1]['respawn']==0)
       page.locator('#timeup').click()
       page.wait_for_function("document.querySelector('#round').textContent.includes('Ended played')")
       check('hub explicit non-host departure: host submits valid surviving standings',any('Red Fox' in line and 'Blue Otter' not in line for line in page.locator('#round').inner_text().splitlines() if line.strip().startswith('1.')))
      else:
       old=host.evaluate('RuinApp.world.tick');page.locator('#hide').click();page.wait_for_timeout(1200)
       hidden=host.evaluate('RuinApp.world.tick');page.locator('#hide').click();page.wait_for_timeout(300)
       shown=host.evaluate('RuinApp.world.tick')
       check('hub short host visibility loss continues authoritative simulation',hidden>old+80 and shown>hidden)
       page.locator('#hide').click()
       page.wait_for_function("document.querySelector('#round').textContent.includes('Ended void (host-hidden)')",timeout=25000)
       check('hub over-20s host hidden follows void ownership','host-hidden' in page.locator('#round').inner_text())
       page.wait_for_function("[...document.querySelectorAll('iframe')].every(f=>f.contentWindow.RuinApp.online.ended)");before=host.evaluate('({tick:RuinApp.world.tick,sent:RuinApp.online.debug.sent})');page.locator('#hide').click();page.wait_for_timeout(500)
       after=host.evaluate('({tick:RuinApp.world.tick,sent:RuinApp.online.debug.sent})')
       check('hub void round never resumes on visibility return',before==after)
      check('hub '+scenario+': no page errors',not errors,str(errors))
      (ART/f'hub-{scenario}.json').write_text(json.dumps({'round':page.locator('#round').inner_text(),'errors':errors},indent=2))
      context.close()
    if '--campaign' in sys.argv or '--campaign-only' in sys.argv:
     for scenario in (['server'] if '--server-only' in sys.argv else ['standard','server']):
      context=browser.new_context(viewport={'width':1280,'height':860});page=context.new_page();errors=[]
      page.on('pageerror',lambda e:errors.append(str(e)))
      delay='latency=0&jitter=0&loss=0' if scenario=='server' else 'latency=150&jitter=50&loss=5'
      campaign_players=1 if scenario=='server' else 2
      page.goto(base+'/'+DEV.name+f'/vendor/hub/harness.html?game={GAME}&players={campaign_players}&{delay}&limit=300&scenario={scenario}&seed=1982')
      count=2
      page.wait_for_function(f"document.querySelectorAll('iframe').length==={count}")
      page.wait_for_function("[...document.querySelectorAll('iframe')].every(f=>f.contentWindow.RuinApp?.online)")
      frames=page.frames[1:]
      policy=(DEV/'tests/server-pilot.js').read_text()
      for f in frames:
       f.evaluate(policy)
       f.evaluate("""scenario => {
        if(AIHub.server){RuinApp.game.stop();window.__serverEngineAt=RuinApp.game.real;document.querySelector('canvas').style.display='none';return;}
        const pilot=RuinServerPilot.create(RuinApp.online.localIndex);
        if(AIHub.isHost){
         RuinApp.controls.frames=()=>[pilot.action(RuinApp.online.getWorld())];
        }else{
         RuinApp.controls.frames=()=>[{mx:0,my:0,ax:1,ay:0,fire:false,cannon:false}];
         RuinApp.online.setInputSource(()=>{
          // The controller is sampled exactly when this remote copy sends input.
          // Only server-progression planning gets read-only perfect awareness;
          // the loss-stress co-op pilot uses its own received world snapshots.
          if(scenario==='server'){
           const source=[...parent.document.querySelectorAll('iframe')].map(frame=>frame.contentWindow).find(win=>win.AIHub?.isHost);
           return pilot.action(source.RuinApp.online.getWorld());
          }
          return pilot.action(RuinApp.online.getWorld());
         });
        }
       }""",scenario)
      page.locator('#release').click()
      timeout_error=None
      try:page.wait_for_function("[...document.querySelectorAll('iframe')].find(f=>f.contentWindow.AIHub.isHost)?.contentWindow.RuinApp.online.finished===true",timeout=210000)
      except Exception as e:timeout_error=str(e)
      page.wait_for_timeout(2600)
      worlds=[]
      for f in frames:
       try:worlds.append(f.evaluate('({host:AIHub.isHost,server:!!AIHub.server,s:RuinApp.game.debug.snapshot(),net:RuinApp.online.debug,pilot:window.__pilotTrace,serverHeadless:!!AIHub.server&&RuinApp.game.real===window.__serverEngineAt&&document.querySelector("canvas").style.display==="none"})'))
       except Exception:pass
      host_state=next((w for w in worlds if w['host']),{})
      check('hub '+scenario+' full campaign uses ordinary actions to win',not timeout_error and host_state.get('s',{}).get('mode')=='victory',str(timeout_error or host_state.get('s',{}).get('stats')))
      check('hub '+scenario+' campaign visits all sectors and strikes airborne heart',host_state.get('s',{}).get('sector')==2 and host_state.get('s',{}).get('stats',{}).get('coreHits')==6 and host_state.get('s',{}).get('stats',{}).get('airborne',0)>0)
      check('hub '+scenario+' campaign ends with matching authoritative score and outcome',bool(worlds) and all(w.get('s',{}).get('score')==host_state.get('s',{}).get('score') and w.get('s',{}).get('mode')=='victory' and w.get('s',{}).get('ended') for w in worlds))
      check('hub '+scenario+' campaign recovers matching shields, core and reserves',bool(worlds) and all(w.get('s',{}).get('shieldMask')==host_state.get('s',{}).get('shieldMask') and w.get('s',{}).get('core',{}).get('hp')==host_state.get('s',{}).get('core',{}).get('hp') and w.get('s',{}).get('reserves')==host_state.get('s',{}).get('reserves') and w.get('s',{}).get('tick')==host_state.get('s',{}).get('tick') for w in worlds))
      check('hub '+scenario+' campaign stays under hard packet limit without send drops',bool(worlds) and all(w.get('net',{}).get('maxBytes',99999)<=16384 and w.get('net',{}).get('dropped',1)==0 for w in worlds))
      check('hub '+scenario+' campaign reports one host finish',host_state.get('net',{}).get('finishCalls')==1 and all(w.get('net',{}).get('finishCalls')==0 for w in worlds if not w.get('host')))
      if scenario=='server':check('hub server campaign completes with engine render loop stopped and canvas hidden',host_state.get('serverHeadless'))
      check('hub '+scenario+' campaign has no runtime errors',not errors,str(errors))
      (ART/f'hub-campaign-{scenario}.json').write_text(json.dumps({'players':campaign_players,'worlds':worlds,'errors':errors,'round':page.locator('#round').inner_text()},indent=2))
      context.close()
   finally:browser.close()
 finally:server.shutdown();server.server_close()
 (ART/'hub-browser-summary.json').write_text(json.dumps(results,indent=2))
 return results
if __name__=='__main__':
 result=run()
 for x in result:
  if not x['pass']:print('FAIL '+x['name']+' '+x.get('detail',''))
 print(json.dumps({'passed':sum(x['pass'] for x in result),'failed':sum(not x['pass'] for x in result)}))
 sys.exit(any(not x['pass'] for x in result))
