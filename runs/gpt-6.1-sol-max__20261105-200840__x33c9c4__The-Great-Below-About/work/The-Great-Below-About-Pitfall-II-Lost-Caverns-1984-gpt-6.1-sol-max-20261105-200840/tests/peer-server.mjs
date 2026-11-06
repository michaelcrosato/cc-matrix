import {PeerServer} from 'peer';
PeerServer({host:'127.0.0.1',port:0,path:'/below',allow_discovery:false},server=>{
 process.stdout.write(JSON.stringify({port:server.address().port})+'\n');
});
