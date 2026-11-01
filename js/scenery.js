// Continuous illustrated surroundings. Gameplay coordinates remain in the original map.
Game.Scenery=(()=>{
 const profiles={
  palace:{frame:[320,180,900,600]},
  workshop:{frame:[240,165,1050,700]},
  road:{frame:[260,176,990,660]},
  ritual:{frame:[240,150,1056,704]},
  future:{frame:[230,150,1070,713]},
  overworld:{frame:[235,188,1000,667]}
 };
 const images={};
 function bounds(scene){
  const image=images[scene.sceneId],profile=profiles[scene.sceneId];
  if(!image||!profile)return {x:0,y:0,w:scene.mapWidth,h:scene.mapHeight};
  // Each frame is measured in the 1536 × 1024 illustration. Do not scale entities.
  const [x,y,w,h]=profile.frame,sx=scene.mapWidth/w,sy=scene.mapHeight/h;
  return {x:-x*sx,y:-y*sy,w:1536*sx,h:1024*sy};
 }
 function camera(scene,p,view){
  const b=bounds(scene),zoom=Math.max(view.zoom,view.w/b.w,view.h/b.h);
  const w=view.w/zoom,h=view.h/zoom;
  return {zoom,x:Math.max(b.x,Math.min(b.x+b.w-w,p.x-w/2)),y:Math.max(b.y,Math.min(b.y+b.h-h,p.y-h/2))};
 }
 const load=Game.loadSceneImages;
 Game.loadSceneImages=()=>Promise.all([load(),...Object.keys(profiles).filter(id=>Game.Maps[id]).map(id=>new Promise(resolve=>{
  const image=new Image();image.onload=()=>{images[id]=image;resolve()};
  // A missing extension uses one bounded original image, never tiled duplicates.
  image.onerror=()=>{console.warn('外围景观载入失败，使用原场景：'+id);resolve()};
  image.src='assets/extensions/'+id+'.png';
 }))]);
 return {profiles,images,bounds,camera};
})();
