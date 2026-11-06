# contact sheet of the pose table on the player's rig and the mannequin
import sys, os
from playwright.sync_api import sync_playwright
stem = 'WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037.html'
path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', stem))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto('file://' + path)
    pg.wait_for_function('window.G && G.game && G.game.sceneName === "title"', timeout=30000)
    pg.evaluate('''() => { const game = G.game, E = My3D2dge; game.fadeTime = 0; G.devMember(1);
      const names = Object.keys(G.DATA.poses), rigs = names.map((n, i) => { const r = G.memberRig({hair:'short',skin:1,top:0,bottom:0},{}, {size:1.3}), P = new G.Poser(r); P.pose(n,0); return {n, r, P}; });
      G.scenes.poses = game.scenes.poses = { view:'brawler', camera:{zoom:false}, update(dt){ G.stageCam(30,8); rigs.forEach((q,i)=>{ q.P.update(dt); q.r.update(dt,{x:0,y:0,z:0,vx:0,vy:0,facing:q.P.facing}); }); }, draw(r){ G.ROOMS.studio(r); rigs.forEach((q,i)=>{ const cols=5, x=-120+(i%cols)*62, y=-30+Math.floor(i/cols)*70; r.actor(x,y,0,(g,ox,oy)=>q.r.draw(g,ox,oy,r.view)); r.textAt(x,y,-6,q.n,'#20404c'); }); } };
      game.go('poses',null,{fade:0}); }''')
    pg.wait_for_timeout(2500)
    pg.screenshot(path=sys.argv[1])
    b.close()
