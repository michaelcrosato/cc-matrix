import sys, json
from playwright.sync_api import sync_playwright
PAD = open(sys.argv[2]).read()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.add_init_script(PAD); pg.goto(sys.argv[1]); pg.wait_for_timeout(1500); ev = pg.evaluate
    ev("window.G = My3D2dge.current; G.debug.newGame('story'); const S = G.debug.state(); for (const id of ['rules','notebook','sketch','photo','rye','window']) S.cards.push(Object.assign({id}, MM.CARDS[id])); G.go('brainstorm')"); pg.wait_for_timeout(1200)
    cur = lambda: json.loads(ev("JSON.stringify(G.debug.snapshot())"))['cursor']
    def stick_right():
        ev("window.__pad.axes[0]=1"); pg.wait_for_timeout(150); ev("window.__pad.axes[0]=0"); pg.wait_for_timeout(250)
    stick_right(); stick_right(); a = cur()
    ev("G.settings.set('invertX', true)"); stick_right(); c = cur()
    print('stick right x2 ->', a, '; with invertX, stick right ->', c)
    b.close()
