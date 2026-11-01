Game.Collision={
 valid(scene,x,y,r=13){return Number.isFinite(x)&&Number.isFinite(y)&&x>=r+30&&y>=r+30&&x<=scene.mapWidth-r-30&&y<=scene.mapHeight-r-30&&!scene.collisionBoxes.some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h)},
 position(scene,p){return p&&this.valid(scene,p.x,p.y)?{x:p.x,y:p.y}:{...scene.spawnPoint}},
 move(scene,p,dx,dy){const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/6));for(let i=0;i<n;i++){if(this.valid(scene,p.x+dx/n,p.y))p.x+=dx/n;if(this.valid(scene,p.x,p.y+dy/n))p.y+=dy/n;}return p;},
 inside(p,b){return p.x>b.x&&p.x<b.x+b.w&&p.y>b.y&&p.y<b.y+b.h}
};
