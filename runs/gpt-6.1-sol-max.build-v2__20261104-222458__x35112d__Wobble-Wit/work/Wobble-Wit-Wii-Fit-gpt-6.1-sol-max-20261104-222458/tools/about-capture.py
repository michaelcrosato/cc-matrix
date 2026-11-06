from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];game=root.parent/'Wobble-Wit-Wii-Fit-gpt-6.1-sol-max-20261104-222458.html'
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader']);p=b.new_page(viewport={'width':640,'height':360});p.goto(game.as_uri());p.wait_for_function('window.__gameStatus',timeout=120000);p.keyboard.press('z');p.wait_for_function('JSON.parse(__gameStatus).screen==="Title"');p.keyboard.press('ArrowUp');p.wait_for_function('JSON.parse(__gameStatus).focus===3');p.keyboard.press('Enter');p.wait_for_function('JSON.parse(__gameStatus).screen==="About"')
 for n in [1,2]:p.keyboard.press('ArrowRight');p.wait_for_function('(n)=>JSON.parse(__gameStatus).aboutPage===n',arg=n)
 p.set_viewport_size({'width':1920,'height':1080});p.screenshot(path=str(root/'out/browser/about-source.png'),timeout=120000)
 for n in [3,4]:p.keyboard.press('ArrowRight');p.wait_for_function('(n)=>JSON.parse(__gameStatus).aboutPage===n',arg=n)
 p.screenshot(path=str(root/'out/browser/about-feedback.png'),timeout=120000);b.close();print('About source and feedback pages captured from final file')
