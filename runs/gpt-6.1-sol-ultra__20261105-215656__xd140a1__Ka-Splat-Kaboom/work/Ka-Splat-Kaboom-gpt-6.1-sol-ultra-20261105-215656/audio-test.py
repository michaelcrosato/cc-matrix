from pathlib import Path
from playwright.sync_api import sync_playwright

failures = []
checks = 0
source = Path(__file__).with_name('audio.js').read_text().replace('export class GameAudio', 'window.GameAudio = class GameAudio')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('about:blank')
    page.add_script_tag(content=source)
    probe = page.evaluate('async () => await GameAudio.offlineProbe()')
    checks += 1
    if not probe['ok'] or probe['musicGain'] != .1:
        failures.append(f'Combined audio probe: {probe}')
    for kind in ['catch', 'miss', 'splash', 'select', 'wave', 'win', 'lose', 'repair', 'voice', 'music']:
        result = page.evaluate('''async (kind) => {
            const c = new OfflineAudioContext(1, 44100 * 3, 44100);
            const a = new GameAudio({context:c});
            if(kind==='voice') a.voice('taunt',.1);
            else if(kind==='music') for(let i=0;i<8;i++) a._musicStep(.1+i*.25,i,1);
            else a.play(kind,0,.1);
            const b=await c.startRendering();let sum=0,peak=0;
            for(const v of b.getChannelData(0)){sum+=v*v;peak=Math.max(peak,Math.abs(v));}
            return {rms:Math.sqrt(sum/b.length),peak};
        }''', kind)
        checks += 1
        if not (.0001 < result['rms'] < .5 and .001 < result['peak'] < 1):
            failures.append(f'{kind} invalid audio levels: {result}')
    checks += 1
    result = page.evaluate('''async () => {
        const c=new OfflineAudioContext(1,44100,44100);const a=new GameAudio({context:c});
        a.setMusic(9);a.setSfx(-1);a.setMuted(true);
        a.play('miss',0,.1);const b=await c.startRendering();
        let peak=0;for(const v of b.getChannelData(0))peak=Math.max(peak,Math.abs(v));
        return {music:a.musicVolume,sfx:a.sfxVolume,peak};
    }''')
    if result['music'] != 1 or result['sfx'] != 0 or result['peak'] > .01:
        failures.append(f'Volume limits/mute: {result}')
    browser.close()
for failure in failures:
    print('FAIL:', failure)
print(f'{checks-len(failures)}/{checks} audio checks passed')
raise SystemExit(bool(failures))
