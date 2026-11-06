from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--autoplay-policy=no-user-gesture-required'])
 c=b.new_context(viewport={'width':1920,'height':1080})
 c.add_init_script("Object.defineProperty(navigator,'gpu',{get:()=>undefined});")
 page=c.new_page()
 page.goto('http://127.0.0.1:43915/index.html')
 page.wait_for_function('window.__game',timeout=60000)
 page.evaluate('''()=>{__game.start(1);const g=__game.game;g.case=2;g.resetWorld();g.config.invincible=true;for(let i=0;i<220;i++)g.step(1/60,[g.ai()]);__game.step(0);__game.pause();document.getElementById('menu').style.display='none';document.getElementById('toast').style.display='none';}''')
 page.wait_for_timeout(3000)
 page.screenshot(path=str(Path(__file__).with_name('review-gameplay.png')),timeout=60000)
 print(page.evaluate('JSON.stringify({title:document.title,mode:__game.state.mode,players:__game.state.players.length,renderer:__game.state.renderer})'))
 c.close();b.close()
