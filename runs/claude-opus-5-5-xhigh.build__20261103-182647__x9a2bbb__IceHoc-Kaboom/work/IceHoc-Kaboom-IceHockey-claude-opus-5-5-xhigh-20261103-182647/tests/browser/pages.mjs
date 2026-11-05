// The engine's checker (tools/check.mjs) on the single HTML and on key deep links: no errors on any of them
import { spawnSync } from 'node:child_process';
import { check, guard } from '../t.mjs';
guard('pages', async () => {
  const eng = new URL('../../engine/', import.meta.url).pathname, html = '../../IceHoc-Kaboom-IceHockey-claude-opus-5-5-xhigh-20261103-182647.html';
  for (const p of [html, html + '#match/muskrats/drillers/icebox', html + '#fight', html + '#kaboom', html + '#story/1', html + '#cutscene/ch2-pre', html + '#attract']) {
    const r = spawnSync('node', ['tools/check.mjs', p, '--seconds', '3', '--out', '../.tmp/check-pages'], { cwd: eng, encoding: 'utf8', timeout: 180000, env: process.env });
    const out = (r.stdout || '') + (r.stderr || '');
    check('check.mjs ' + p.replace(html, 'game.html') + ': no errors', r.status === 0 && /no errors/.test(out), out.split('\n').filter(l => /error|Error|FAIL/.test(l)).slice(0, 4).join(' / '));
  }
});
