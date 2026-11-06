import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const server=http.createServer(async(req,res)=>{let file=decodeURIComponent(new URL(req.url,'http://local').pathname);if(file==='/')file='/dist/game.html';const p=path.resolve('.','.'+file);if(!p.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}try{const data=await readFile(p);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'text/html');res.end(data);}catch{res.writeHead(404).end('Not found');}});
server.listen(0,'127.0.0.1',()=>console.log(`http://127.0.0.1:${server.address().port}`));
