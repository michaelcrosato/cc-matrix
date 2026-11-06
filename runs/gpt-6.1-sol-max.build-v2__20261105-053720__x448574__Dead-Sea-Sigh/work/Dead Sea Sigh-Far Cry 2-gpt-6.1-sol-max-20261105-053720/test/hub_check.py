from pathlib import Path
import subprocess,re,threading,shutil,json
from urllib.parse import quote
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent.parent

def run_hub(p,render=False,scenarios=None,actions=False):
 shutil.copyfile(R.parent/(R.name+'.html'),R/'hub/game.html')
 srv=subprocess.Popen(['python3','-u','-m','http.server','0','--bind','127.0.0.1'],cwd=R/'hub',stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 line=srv.stdout.readline();port=int(re.search(r'port (\d+)',line).group(1));threading.Thread(target=lambda:[None for _ in srv.stdout],daemon=True).start()
 out=[]
 try:
  b=p.chromium.launch(headless=True,args=['--autoplay-policy=no-user-gesture-required','--use-angle=swiftshader','--enable-webgl'])
  page=b.new_page(viewport={'width':1280,'height':800})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  for n,scenario in scenarios or [(1,'standard'),(2,'standard'),(4,'standard'),(4,'host-leave'),(2,'server')]:
   game='game.html'+('' if render else '?norender=1')
   url=f'http://127.0.0.1:{port}/harness.html?game={quote(game,safe="")}&players={n}&latency=150&jitter=50&loss=5&auto=1&scenario={scenario}&play={18000 if render or actions else 8000}'
   page.goto(url)
   if render or actions:
    page.wait_for_selector('iframe',timeout=30000)
    frames=[f for f in page.frames if f.parent_frame is not None and 'game.html' in f.url]
    for f in frames:f.wait_for_function('window.__game?.Net.started && AIHub.time()>=0',timeout=90000)
    host=next(f for f in frames if f.evaluate('AIHub.isHost'))
    host.evaluate('''() => {const q=__game;q.CHEATS.god=true;q.CHEATS.freezeAI=true;q.game.audio.mute(true);const c=q.Salvage.cases[0];q.Bot.teleport(c.x,c.y);q.Bot.tick(.03);q.Bot.use();}''')
    page.wait_for_timeout(800)
    host.evaluate('''() => {const q=__game,b=q.vehicles.find(v=>v.bank);q.Bot.teleport(b.v.x,b.v.y+16);q.Bot.tick(.03);q.Bot.tick(3.2,{move:[0,0],mouse:[0,0],stick2:null,pressed:()=>false,down:a=>a==='use',use(){}});}''')
    for f in frames:
     try:f.wait_for_function('(__game.Net.players.get(0)?.banked||0)>0',timeout=7000)
     except Exception:pass
    banks=[f.evaluate('''() => ({me:AIHub.me,banked:__game.Net.players.get(0)?.banked||0,errors:__game.game.errors.length})''') for f in frames]
    out.append({'name':'rendered shared pickup and bank replication','pass':len(banks)==2 and all(q['banked']>0 and not q['errors'] for q in banks),'detail':banks})
    client=next(f for f in frames if not f.evaluate('AIHub.isHost'))
    client_pos=client.evaluate('() => [__game.hero.x,__game.hero.y,__game.hero.z]')
    host.evaluate('''(p) => {const q=__game;q.Bot.teleport(p[0]-2*16,p[1],p[2]);q.S.yaw=0;q.Bot.tick(.03);q.Bot.press('melee');q.Bot.tick(.7);}''',client_pos)
    diag=host.evaluate('''() => {const q=__game,p=q.Net.players.get(0),t=q.Net.players.get(1),h=q.world.ray(p.x,p.y,p.z+18,Math.cos(p.yaw),Math.sin(p.yaw),0,48,{skip:q.hero});return {hostPlayer:[p.x,p.y,p.z,p.yaw],target:[t.x,t.y,t.z,t.hp],actor:[t.actor.x,t.actor.y,t.actor.z,t.actor.solid],act:q.S.act,tool:q.S.tool,hit:h?{dist:h.dist,remote:h.actor?.data?.remote,enemy:h.actor?.data?.entity?.id,ground:h.ground}:null};}''')
    try:client.wait_for_function('__game.S.hp<=40',timeout=7000)
    except Exception:pass
    hp=client.evaluate('__game.S.hp')
    out.append({'name':'host melee damages remote player','pass':hp<=40,'detail':{'clientHP':hp,'host':diag}})
    client.evaluate('''() => {const q=__game;q.Bot.press('bottle');q.Bot.tick(3.2);}''')
    try:host.wait_for_function('__game.Fire.lit>0',timeout=7000)
    except Exception:pass
    lit=host.evaluate('__game.Fire.lit')
    out.append({'name':'client bottle ignites host world','pass':lit>0,'detail':lit})

   page.wait_for_selector('body[data-complete="true"]',timeout=240000)
   report=page.evaluate('window.__hubCheck');out.append({'name':f'hub {n} {scenario} '+('render' if render else 'fast'),'pass':report.get('pass',False),'detail':report})
  b.close()
 finally:srv.terminate();srv.wait(timeout=10)
 (R/'test'/('hub-render-report.json' if render else 'hub-report.json')).write_text(json.dumps(out,indent=2))
 return out
