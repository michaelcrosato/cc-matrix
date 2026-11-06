export class Focus{
 constructor(root,onSound=()=>{}){this.root=root;this.onSound=onSound;this.id=null;root.addEventListener('pointerover',e=>{const el=e.target.closest('[data-focus]');if(el&&!el.disabled)this.set(el.dataset.focus,false);});}
 items(){const scope=this.root.querySelector('#overlays')?.children.length?this.root.querySelector('#overlays'):this.root.querySelector('#touch')?.children.length?this.root.querySelector('#touch'):this.root.querySelector('#screen')?.children.length?this.root.querySelector('#screen'):this.root;return [...scope.querySelectorAll('[data-focus]')].filter(e=>!e.disabled&&e.offsetParent!==null);}
 set(id,sound=true){const items=this.items();if(!items.length){this.id=null;return;}let el=items.find(e=>e.dataset.focus===id)||items[0];const old=this.id;this.id=el.dataset.focus;for(const x of this.root.querySelectorAll('.focused'))x.classList.remove('focused');el.classList.add('focused');if(sound&&old!==this.id)this.onSound();}
 reset(){this.set(this.items()[0]?.dataset.focus,false);}
 move(delta){const a=this.items(),i=a.findIndex(x=>x.dataset.focus===this.id);if(a.length)this.set(a[(i+delta+a.length)%a.length].dataset.focus);}
 confirm(){this.items().find(e=>e.dataset.focus===this.id)?.click();}
 adjust(delta){const el=this.items().find(e=>e.dataset.focus===this.id);if(!el)return;const input=el.matches('input,select')?el:el.querySelector('input,select');if(input?.type==='range'){input.value=String(Math.min(+input.max,Math.max(+input.min,+input.value+delta*(+input.step||.05))));input.dispatchEvent(new Event('input',{bubbles:true}));}else if(input?.tagName==='SELECT'){input.selectedIndex=(input.selectedIndex+delta+input.options.length)%input.options.length;input.dispatchEvent(new Event('change',{bubbles:true}));}else el.click();}
}
