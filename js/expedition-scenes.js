/* 新副本复用原项目的彩墨人物与材质绘制，不下载外部图片。 */
Game.ExpeditionScenes=(()=>{
 const G=Game,points={guide:{x:900,y:860},visual:{x:510,y:650},record:{x:1280,y:650},study:{x:900,y:520},master:{x:1290,y:390},bench:{x:510,y:360},portal:{x:900,y:220}};
 function build(id,chapter,index){
  const a=G.Artifacts.find(a=>a.id===id),B=(x,y,w,h,label,type='building')=>({x,y,w,h,label,type});
  const buildings=[B(190,70,430,210,a.hall==='qin'?'简牍书阁':'档案阁'),B(1210,70,390,180,chapter.theme==='workshop'?'铸作棚':'研习亭',chapter.theme==='workshop'?'tent':'building'),B(170,840,310,90,'器物整理案','table'),B(1350,810,300,140,'庭中荷池','pond'),B(840,70,120,110,'归藏时门','portal')];
  if(a.hall==='chu')buildings.push(B(60,470,210,230,'曲水','pond'));
  if(a.hall==='ming')buildings.push(B(1450,465,180,120,'陈列台','case'));
  if(a.hall==='qin')buildings.push(B(1410,480,210,120,'简册箱','crates'));
  const objects=[{...points.visual,id:'visual',type:a.hall==='qin'?'scroll':a.kind,name:chapter.visual[0]},{...points.record,id:'record',type:'scroll',name:chapter.record[0]},{...points.study,id:'study',type:'mold',name:chapter.puzzles[0].title},{...points.bench,id:'bench',type:'mold',name:chapter.puzzles[1].title},{...points.portal,id:'portal',type:'portal',name:'归藏时门'}];
  const npcList=[{...points.guide,id:'exp-guide',name:chapter.guide,role:a.hall==='ming'?'robe':'worker',color:chapter.accent},{...points.master,id:'exp-master',name:chapter.master,role:a.hall==='qin'?'robe':'worker',color:'#b19572'}];
  const decorations=[];for(let i=0;i<22;i++)decorations.push({type:'tree',x:i%2?1720:80,y:130+Math.floor(i/2)*92,size:30+i%3*8});
  for(const [x,y]of [[730,770],[1080,770],[740,300],[1080,300]])decorations.push({type:a.hall==='ming'?'lamp':'lantern',x,y});
  decorations.push({type:a.hall==='chu'?'drum':a.hall==='qin'?'table-small':'urn',x:700,y:440},{type:'banner',x:1080,y:440},{type:'table-small',x:510,y:660},{type:'table-small',x:1280,y:660},{type:'table-small',x:900,y:530},{type:'table-small',x:510,y:370});
  return {sceneId:'relic-'+id,expeditionId:id,sceneName:chapter.place,era:a.era,background:chapter.theme,mapWidth:1800,mapHeight:1200,spawnPoint:{x:900,y:1040},buildings,decorations,npcList,objects,exits:[],collisionBoxes:[...buildings.map(({x,y,w,h})=>({x,y,w,h})),...npcList.map(n=>({x:n.x-14,y:n.y-12,w:28,h:24})),...objects.filter(o=>o.id!=='portal').map(o=>({x:o.x-30,y:o.y-18,w:60,h:38}))]};
 }
 const images=new Map();
 function art(id){if(images.has(id))return images.get(id);const im=new Image(),a=G.Artifacts.find(a=>a.id===id);im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(G.Artwork(a.kind));images.set(id,im);return im;}
 function prepare(scene){const c=document.createElement('canvas');c.width=1800;c.height=1200;c.worldBounds={x:0,y:0,w:1800,h:1200};const ctx=c.getContext('2d'),chapter=G.ExpeditionContent[scene.expeditionId];
  G.SceneArt.ground(ctx,{...scene,sceneId:chapter.theme});
  // 铺一条串联主要活动点的石道，实体碰撞与显示坐标一致。
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#c9b98b';ctx.lineWidth=72;ctx.beginPath();ctx.moveTo(900,1080);ctx.lineTo(900,700);ctx.lineTo(510,700);ctx.lineTo(510,370);ctx.moveTo(900,700);ctx.lineTo(1280,700);ctx.lineTo(1280,390);ctx.moveTo(900,700);ctx.lineTo(900,230);ctx.stroke();
  ctx.strokeStyle='#e1d5b2';ctx.lineWidth=2;for(let y=250;y<1060;y+=32){ctx.beginPath();ctx.moveTo(871,y);ctx.lineTo(929,y);ctx.stroke();}
  scene.buildings.forEach(b=>G.SceneArt.building(ctx,b,chapter.theme));scene.decorations.slice().sort((a,b)=>a.y-b.y).forEach(d=>G.SceneArt.decoration(ctx,d));
  ctx.fillStyle='#efe6cc';ctx.fillRect(640,53,520,56);ctx.strokeStyle='#a28a59';ctx.strokeRect(640,53,520,56);ctx.fillStyle='#405c4b';ctx.font='26px KaiTi,serif';ctx.textAlign='center';ctx.fillText(chapter.title,900,91);
  art(scene.expeditionId);return c;
 }
 const base=G.Renderer.prepare;G.Renderer.prepare=scene=>scene.expeditionId?prepare(scene):base(scene);
 const resources=G.Resources;G.Resources=Object.freeze({...resources,scene:id=>G.Maps[id]?.expeditionId?Promise.resolve():resources.scene(id)});
 Object.entries(G.ExpeditionContent).forEach(([id,c],i)=>{const scene=build(id,c,i);G.Maps[scene.sceneId]=scene;});
 function draw(ctx,scene,view,target,step,seconds){const z=view.zoom;ctx.save();ctx.scale(z,z);ctx.translate(-view.camX,-view.camY);
  for(const o of scene.objects){if(o.id==='portal')continue;ctx.save();ctx.translate(o.x,o.y);if(o.id==='visual'){const im=art(scene.expeditionId);if(im.complete&&im.naturalWidth)ctx.drawImage(im,-62,-113,124,101);else G.SceneArt.quest(ctx,{type:'scroll'});}else G.SceneArt.quest(ctx,{type:o.id==='study'?'mold':'scroll'});ctx.restore();}
  if(target){const pulse=G.Scene.settings.motion?Math.sin(seconds*3)*3:0;ctx.strokeStyle='#dcad55';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(target.x,target.y+8,43+pulse,19,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff7e0';ctx.fillRect(target.x-76,target.y+32,152,30);ctx.fillStyle='#4c604d';ctx.font='16px Microsoft YaHei,sans-serif';ctx.textAlign='center';ctx.fillText('◇ '+target.name,target.x,target.y+53);ctx.fillStyle='#ddb46b';ctx.font='30px serif';ctx.fillText('◆',target.x,target.y-105-pulse);}
  ctx.restore();
 }
 return Object.freeze({build,draw});
})();
