// One authoritative coordinate system for art, entry pads, landing points and exits.
Game.Navigation=(()=>{
 const M=Game.Maps;
 const places=[
 {id:'palace',name:'楚国王宫',x:275,y:145,w:290,h:200},
 {id:'workshop',name:'青铜工坊',x:220,y:530,w:280,h:190},
 {id:'road',name:'送钟古道 · 江津渡',x:700,y:470,w:150,h:110},
 {id:'ritual',name:'曾国礼乐殿',x:1335,y:210,w:290,h:200},
 {id:'dig',name:'1978 年考古现场',x:1340,y:870,w:280,h:160},
 {id:'future',name:'未来博物馆',x:220,y:850,w:230,h:120}
 ];
 for(const p of places){p.era=M[p.id].era;p.entry={x:p.x+p.w/2-55,y:p.y+p.h+12,w:110,h:55,target:p.id,label:'进入'+p.name};p.returnPoint={x:p.x+p.w/2,y:p.entry.y+p.entry.h+52};}
 Game.WorldPlaces=places;M.overworld.exits=places.map(p=>p.entry);M.overworld.spawnPoint={...places[0].returnPoint};
 const eastBank={x:1240,y:625};
 M.overworld.exits.push({x:1120,y:570,w:80,h:55,target:'road',label:'江津渡 · 东岸入口',spawn:{x:1090,y:399}});
 M.overworld.collisionBoxes=places.filter(p=>p.id!=='road').map(p=>({x:p.x,y:p.y,w:p.w,h:p.h}));
 // Banks cannot be walked through: the short central bridge is the only crossing.
 M.overworld.collisionBoxes.push({x:870,y:30,w:220,h:530},{x:870,y:650,w:220,h:520});
 M.overworld.npcList=[];M.overworld.buildings=[];M.overworld.decorations=[];
 const B=(x,y,w,h)=>({x,y,w,h});
 const moveNPC=(id,key,x,y)=>Object.assign(M[id].npcList.find(n=>n.id===key),{x,y});
 const object=(id,key,x,y)=>Object.assign(Game.BellsObjects[id].find(n=>n.id===key),{x,y});
 // New art is authored at 1800x1200, then every entity and collision is scaled together.
 M.road.collisionBoxes=[B(790,0,560,470),B(730,650,600,550),B(0,100,210,190),B(400,330,180,120)];
 moveNPC('road','leader',550,570);moveNPC('road','boatman',1430,420);moveNPC('road','merchant',350,470);object('road','inscription-desk',700,570);
 M.road.spawnPoint={x:190,y:570};M.road.exits=[{x:65,y:520,w:85,h:100},{x:1650,y:520,w:85,h:100}];
 M.ritual.collisionBoxes=[B(190,100,400,340),B(680,40,490,260),B(50,200,100,700),B(1640,50,100,490),B(575,700,140,85),B(1085,700,140,85),B(30,945,710,140),B(1060,945,710,140)];
 moveNPC('ritual','official',670,590);moveNPC('ritual','musician1',1100,600);moveNPC('ritual','musician2',1320,620);object('ritual','arrangement-desk',840,670);
 M.ritual.spawnPoint={x:900,y:960};M.ritual.exits=[{x:840,y:1080,w:120,h:70},{x:1640,y:660,w:100,h:100}];
 M.dig.collisionBoxes=[B(520,140,850,340),B(120,80,370,280),B(1430,80,230,250),B(1400,490,200,100)];
 moveNPC('dig','chief',690,640);moveNPC('dig','arch1',1200,570);moveNPC('dig','arch2',520,700);object('dig','record-station',1150,710);
 M.dig.spawnPoint={x:220,y:780};M.dig.exits=[{x:65,y:760,w:90,h:95},{x:1650,y:760,w:90,h:95}];
 M.future.collisionBoxes=[B(200,150,310,210),B(1280,150,300,210),B(700,90,400,250),B(260,570,310,130),B(30,940,700,140),B(1070,940,700,140),B(30,30,70,900),B(1700,30,70,500),B(1700,800,70,370)];
 moveNPC('future','curator',690,680);moveNPC('future','tech',1130,550);M.future.spawnPoint={x:900,y:930};M.future.exits=[{x:840,y:1080,w:120,h:70},{x:1650,y:680,w:90,h:100}];
 const scale=.7;
 for(const p of places){const s=M[p.id];s.mapWidth=1260;s.mapHeight=840;
  for(const n of s.npcList){n.x*=scale;n.y*=scale;}
  for(const o of Game.BellsObjects[p.id]||[]){o.x*=scale;o.y*=scale;}
  s.collisionBoxes=s.collisionBoxes.filter(b=>!(b.w===28&&b.h===24));
  for(const b of s.collisionBoxes)for(const k of ['x','y','w','h'])b[k]*=scale;
  s.collisionBoxes.push(...s.npcList.map(n=>B(n.x-14,n.y-12,28,24)));
  s.spawnPoint={x:s.spawnPoint.x*scale,y:s.spawnPoint.y*scale};
  s.exits=s.exits.map((e,i)=>({x:e.x*scale,y:e.y*scale,w:e.w*scale,h:e.h*scale,
   get target(){return p.id==='ritual'&&ritualFinished()?'dig':'overworld'},
   get spawn(){return p.id==='ritual'&&ritualFinished()?{...M.dig.spawnPoint}:p.id==='road'&&i===1?{...eastBank}:{...p.returnPoint}},
   label:p.id==='ritual'?'离殿 · 完成礼乐后直达考古现场':(i?'前行出口':'来路出口')+' · 行舆图'}));
 }
 function ritualFinished(){const index=Game.BellsContent.steps.findIndex(q=>q.id==='archaeologist');return (Game.BellsQuest?.get().step??0)>=index;}
 function departure(source){if(source==='ritual'&&ritualFinished())return {id:'dig',position:{...M.dig.spawnPoint}};if(source==='road'&&Game.Scene?.player?.x>M.road.mapWidth/2)return {id:'overworld',position:{...eastBank}};return {id:'overworld',position:{...(places.find(p=>p.id===source)||places[0]).returnPoint}};}
 function overlaps(scene,p,pad=22){return scene.exits.some(e=>p.x>=e.x-pad&&p.x<=e.x+e.w+pad&&p.y>=e.y-pad&&p.y<=e.y+e.h+pad);}
 function safe(scene,p){const good=p=>p&&Game.Collision.valid(scene,p.x,p.y)&&!overlaps(scene,p);if(good(p))return {x:p.x,y:p.y};if(good(scene.spawnPoint))return {...scene.spawnPoint};for(let r=20;r<1800;r+=20)for(let a=0;a<16;a++){const n={x:scene.spawnPoint.x+Math.cos(a*Math.PI/8)*r,y:scene.spawnPoint.y+Math.sin(a*Math.PI/8)*r};if(good(n))return n;}throw Error('场景缺少有效安全出生点');}
 for(const q of Game.BellsContent.steps){const n=(Game.BellsObjects[q.scene]||[]).find(n=>n.id===q.target)||M[q.scene].npcList.find(n=>n.id===q.target);if(n&&q.hint?.length>1)q.hint[1]='靠近'+n.name+'后按 E，金色指引会显示方向。';}
 const art=['palace','workshop','overworld','road','ritual','dig','future'];
 Game.loadSceneImages=()=>Promise.all(art.map(id=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{Game.SceneImages[id]=img;resolve()};img.onerror=()=>reject(Error('场景图片缺失：'+id));img.src='assets/'+id+(id==='palace'||id==='workshop'?'-wmx2':'-wmx3')+'.png'})));
 return {departure,ritualFinished,overlaps,safe};
})();
