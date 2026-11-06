export class Scheduler{
 constructor(){this.time=0;this.items=[];}
 after(seconds,fn){this.items.push({at:this.time+seconds,fn});}
 fixed(dt){this.time+=dt;let due=this.items.filter(i=>i.at<=this.time);this.items=this.items.filter(i=>i.at>this.time);for(let i of due)i.fn();}
 clear(){this.items=[];}
}
