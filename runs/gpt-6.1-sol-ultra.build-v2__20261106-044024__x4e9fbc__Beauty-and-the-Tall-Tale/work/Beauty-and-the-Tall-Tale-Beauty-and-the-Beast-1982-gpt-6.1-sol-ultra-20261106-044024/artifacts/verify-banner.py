from playwright.sync_api import sync_playwright
from pathlib import Path
import json
r=Path.cwd();identity=json.loads((r/'build-identity.json').read_text());url=(r.parent/(identity['basename']+'.html')).as_uri()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c=b.new_context(viewport={'width':1920,'height':1080});q=c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.goto(url);q.wait_for_function('window.TallTaleApp?.state.ready');q.evaluate('TallTaleApp.game.stop()');q.get_by_role('button',name='Climb solo',exact=False).click();q.get_by_role('button',name='Let’s climb',exact=False).click();q.evaluate("TallTaleApp.game.settings.set('sound',false);TallTaleApp.game.advance(.2,{draw:false})")
 state=q.evaluate('''()=>{const a=TallTaleApp,s=a.state.sim;for(let k=0;k<90000;k++){if(s.phase==='failed'||s.phase==='results'||(s.phase==='departure'&&s.departureTime>=4.05))break;const i=s.botIntent(1),p=a.game.input;for(const [key,v]of Object.entries({left:i.x<-.1,right:i.x>.1,up:i.up,down:i.down,jump:i.jump}))p.hold(key,v);if(i.jumpPressed)p.tap('jump');a.game.advance(1/120,{draw:false});}a.game.input.clear();a.game.advance(.01,{draw:true});return{phase:s.phase,section:s.section,rescued:s.rescued,departureTime:s.departureTime,errors:a.game.errors};}''')
 q.screenshot(path=str(r/'artifacts/departure-fixed.png'));print(json.dumps({'state':state,'pageErrors':errors}));c.close();b.close()
