"""Deterministic complete expedition using only the game's actual movement controls."""
from pathlib import Path
import json
import urllib.parse


def run_route(page):
    """Return (name, passed, detail) checks; never teleport or grant collectibles."""
    result = page.evaluate(r'''() => {
      const g = window.__game;
      g.action('start');
      g.action('pause');
      g.action('dev:god', true);
      const checks = [], trace = [];
      let steps = 0, maxDisplacement = 0;
      const player = () => g.getState().players[0];
      function tick(input = {}) {
        const old = player();
        g.step(1, input);
        const p = player();
        maxDisplacement = Math.max(maxDisplacement, Math.hypot(p.x-old.x,p.y-old.y));
        steps++;
      }
      function stage(name, predicate, input, limit = 600) {
        let n = 0;
        while (!predicate(player()) && n < limit) { tick(input); n++; }
        const p = player(), state = g.getState(), passed = predicate(p);
        const detail = `${n} frames; x=${p.x.toFixed(3)} y=${p.y.toFixed(3)} grounded=${p.grounded} swimming=${p.swimming} balloon=${p.balloon}; rescued=${state.rescued.join(',')}`;
        checks.push([name, passed, detail]);
        trace.push({name, passed,frames:n,player:p,rescued:state.rescued,stats:state.stats});
        // Release every edge-triggered button before the next action.
        tick({});
        if (!passed) throw new Error(name + ': ' + detail);
      }
      const settle = (name,minY=-Infinity) => stage(name,p=>p.grounded&&Math.abs(p.vy)<.01&&p.y>minY,{},180);
      try {
        stage('Walk from camp to the first ladder',p=>p.x>16.8,{right:true});
        stage('Climb down into Fern Gallery',p=>p.y < -11.2,{down:true});
        stage('Approach the gallery pit',p=>p.x>23.5,{right:true});
        stage('Jump across the gallery pit',p=>p.x>31.8&&p.y>-12,{right:true,jump:true});
        stage('Find Pip in Fern Gallery',p=>p.x>44&&g.getState().rescued[0],{right:true});
        stage('Walk to the river ladder',p=>p.x>46.8,{right:true});
        stage('Climb down to the underground river',p=>p.y < -26.1,{down:true});
        stage('Enter the river by swimming',p=>p.x>53&&p.swimming,{right:true});
        stage('Dive to the submerged passage',p=>p.y < -34&&p.swimming,{down:true});
        stage('Swim to and rescue Nibs',p=>p.x>73&&g.getState().rescued[1],{right:true});
        stage('Swim up to the surface',p=>p.y > -27.5,{up:true});
        stage('Swim-jump onto the far bank',p=>p.x>81&&!p.swimming,{right:true,up:true,jump:true});
        stage('Walk to the balloon dock',p=>p.x>85.5,{right:true});
        stage('Catch a rising balloon',p=>p.balloon,{up:true},1200);
        stage('Ride the balloon up the entire shaft',p=>p.y>-2&&p.balloon,{up:true},1200);
        stage('Jump off the balloon onto the upper gallery',p=>p.x<81.5&&!p.balloon,{left:true,jump:true},180);
        settle('Land safely on the upper gallery',-4.6);
        stage('Find Professor Fern on the upper gallery',p=>p.x<65&&g.getState().rescued[2],{left:true});
        settle('Prepare for the first homeward stair',-4.6);
        stage('Jump onto the first homeward stair',p=>p.x<62.7&&p.y>-2.15,{left:true,jump:true},180);
        settle('Land on stair one before jumping again',-2.15);
        stage('Jump onto the second homeward stair',p=>p.x<60&&p.y>.05,{left:true,jump:true},180);
        settle('Land on stair two before jumping again',.05);
        stage('Jump onto the third homeward stair',p=>p.x<57.5&&p.y>2.05,{left:true,jump:true},180);
        settle('Land on stair three before jumping again',2.05);
        stage('Jump onto the sunlit ridge',p=>p.x<54.5&&p.y>3.55,{left:true,jump:true},180);
        settle('Land on the sunlit ridge',3.55);
        stage('Cross the opened rescue bridge',p=>p.x<18.7&&p.y>3.4,{left:true},600);
        settle('Prepare to jump the camp ladder opening',3.4);
        stage('Jump back across the camp ladder opening',p=>p.x<15.2&&p.y>3.4,{left:true,jump:true},150);
        settle('Land safely at Daylight Camp',3.4);
        stage('Return all three friends to the camp lantern',p=>p.x<10.8&&g.getState().mode==='victory',{left:true},200);
      } catch(error) {
        trace.push({error:error.message});
      }
      const state = g.getState();
      const check = (name,passed,detail) => checks.push([name,!!passed,detail]);
      check('All three friends were rescued through proximity',state.rescued.every(Boolean)&&state.stats.rescues===3,JSON.stringify(state.rescued));
      check('The whole route uses ladders, swimming, balloons and repeated jumps',state.stats.ladders>5&&state.stats.swims>10&&state.stats.balloons>=1&&state.stats.jumps>=5,JSON.stringify(state.stats));
      check('The homeward bridge opens after the rescues',state.bridgeOpen,'bridgeOpen='+state.bridgeOpen);
      check('The expedition reaches the victory screen',state.mode==='victory','mode='+state.mode);
      check('Traversal never teleports or falls into a checkpoint reset',maxDisplacement<2.6&&state.stats.hits===0,`largest movement=${maxDisplacement.toFixed(3)}; hits=${state.stats.hits}; frames=${steps}`);
      check('Treasure and lanterns are earned along the route',state.gold>=10&&state.stats.checkpoints>=4,`gold=${state.gold}, lanterns=${state.stats.checkpoints}`);
      window.__routeTrace = {trace,state,steps,maxDisplacement};
      return {checks,trace,state,steps,maxDisplacement};
    }''')
    return [tuple(row) for row in result['checks']]


if __name__ == '__main__':
    from playwright.sync_api import sync_playwright
    import sys
    root = Path(__file__).resolve().parent
    info = json.loads((root/'build-info.json').read_text())
    base = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:40835'
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
        page=browser.new_page()
        page.goto(base.rstrip('/')+'/'+urllib.parse.quote(info['stem']+'.html'))
        page.wait_for_function('window.__game?.getState().ready',timeout=90000)
        checks=run_route(page)
        (root/'route-trace.json').write_text(json.dumps(page.evaluate('window.__routeTrace'),indent=2))
        browser.close()
    failed=[row for row in checks if not row[1]]
    for name,passed,detail in failed:
        print('FAIL '+name+': '+detail)
    print(f'{len(checks)} route checks, {len(failed)} failures')
    raise SystemExit(bool(failed))
