Game.Player=(()=>{
 const keys=new Set();const allowed=['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'];
 function clear(){keys.clear()}
 window.addEventListener('keydown',e=>{if(!Game.Scene?.active||Game.UI?.isOpen()||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(allowed.includes(k)){e.preventDefault();keys.add(k)}});
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
 function vector(){let x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));const length=Math.hypot(x,y);return length?{x:x/length,y:y/length}:{x:0,y:0}}
 function update(scene,p,dt,speed){const v=vector();p.walking=!!(v.x||v.y);if(p.walking){p.direction=Math.abs(v.x)>Math.abs(v.y)?(v.x>0?'right':'left'):(v.y>0?'down':'up');p.phase=(p.phase||0)+dt*11;Game.Collision.move(scene,p,v.x*dt*speed,v.y*dt*speed)}}
 return {keys,clear,vector,update};
})();
