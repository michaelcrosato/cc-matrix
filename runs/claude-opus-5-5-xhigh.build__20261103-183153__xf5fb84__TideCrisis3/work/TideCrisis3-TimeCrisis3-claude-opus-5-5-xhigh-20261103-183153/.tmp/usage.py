# usage from this session's own transcript: per-request usage, deduplicated by message id; prices: Opus 5.5 list
import json, sys, datetime
by = {}; last = None
for line in open(sys.argv[1]):
    try: o = json.loads(line)
    except Exception: continue
    if o.get('timestamp'): last = o['timestamp']
    m = o.get('message')
    if o.get('type') == 'assistant' and isinstance(m, dict) and m.get('usage'): by[m.get('id') or o.get('uuid')] = m['usage']
S = lambda k: sum(u.get(k) or 0 for u in by.values())
inp, out, cw, cr = S('input_tokens'), S('output_tokens'), S('cache_creation_input_tokens'), S('cache_read_input_tokens')
h1 = sum((u.get('cache_creation') or {}).get('ephemeral_1h_input_tokens') or 0 for u in by.values()); m5 = cw - h1
cost = inp * 4e-6 + out * 20e-6 + h1 * 8e-6 + m5 * 5e-6 + cr * .2e-6
t = datetime.datetime.fromisoformat(last.replace('Z', '+00:00')).astimezone(datetime.timezone(datetime.timedelta(hours=-7)))
print(len(by), 'requests; in', inp, 'out', out, 'cw', cw, '(1h', h1, ') cr', cr, 'total', inp + out + cw + cr, 'cost', round(cost, 2), 'last', t.strftime('%H:%M:%S'))
