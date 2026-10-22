import glob,json,os
d=os.path.dirname(os.path.abspath(__file__)); n=os.path.basename(d)
info=open(d+'/info.txt').read().strip()
assert '--' not in info
js="const SOURCE_INFO = "+json.dumps(info)+";\n"+"\n".join(open(f).read() for f in sorted(glob.glob(d+'/js/*.js')))
t=open(d+'/template.html').read().replace('@@SOURCEINFO@@',info).replace('@@CSS@@',open(d+'/style.css').read()).replace('@@JS@@',js.replace('</script>','<\\/script>'))
out=os.path.join(os.path.dirname(d),n+'.html'); open(out,'w').write(t); print(out,len(t))
