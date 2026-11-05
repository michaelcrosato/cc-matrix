# AOA engine patch 5 (h): shorts (o.shorts: 0..1 of the thigh in colors.pants, bare legs below) for any outfit
import sys
p = sys.argv[1]; s = open(p).read()
old = "      if (SW && !SW.shirt) { const mid = lq(hip, knee, SW.leg); limb(hip, mid, 1.55 * u * lw, 1.45 * u * lw, SW.legC, far);"
new = "      if ((SW && !SW.shirt) || o.shorts) { const mid = lq(hip, knee, o.shorts || SW.leg); limb(hip, mid, 1.55 * u * lw, 1.45 * u * lw, o.shorts ? C.pants : SW.legC, far);"
assert s.count(old) == 1; s = s.replace(old, new)
open(p, 'w').write(s)
