import json, sys
f, a, b = sys.argv[1], sys.argv[2], sys.argv[3]   # window [a, b) in UTC ISO
by = {}; ts = {}
for line in open(f):
    try: o = json.loads(line)
    except Exception: continue
    m = o.get('message')
    if o.get('type') == 'assistant' and isinstance(m, dict) and m.get('usage'):
        k = m.get('id') or o.get('uuid'); by[k] = m['usage']; ts.setdefault(k, o.get('timestamp'))
sel = [k for k in by if a <= (ts[k] or '') < b]
S = lambda key: sum(by[k].get(key) or 0 for k in sel)
inp, out, cw, cr = S('input_tokens'), S('output_tokens'), S('cache_creation_input_tokens'), S('cache_read_input_tokens')
print(len(sel), 'requests', 'in', inp, 'out', out, 'cw', cw, 'cr', cr, 'total', inp + out + cw + cr, 'cost', round(inp * 4e-6 + out * 20e-6 + cw * 8e-6 + cr * .2e-6, 2))
