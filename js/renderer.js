Game.Renderer=(()=>{
 const palettes={overworld:['#9fba72','#e6ce9a','#6e9759'],palace:['#66796a','#a4ac91','#566f68'],workshop:['#a6af79','#ddc49a','#81965c'],road:['#a3bb74','#e5cf9d','#77995e'],ritual:['#9eaf78','#dacba5','#728b62'],future:['#536a6b','#859894','#4a696a'],dig:['#8b866d','#b5ad91','#687b62']};

 // 彩墨画材：所有随机数由世界坐标固定播种，刷新不闪烁；纸纹只生成一次。
 let paperTile=null;const paperPatterns=new WeakMap();
 function inkRandom(seed){let n=(seed|0)^0x65a7;return()=>{n=(Math.imul(n,1664525)+1013904223)|0;return(n>>>0)/4294967296}}
 function paper(c){if(paperPatterns.has(c))return paperPatterns.get(c);
 if(!paperTile){paperTile=document.createElement('canvas');paperTile.width=256;paperTile.height=256;const p=paperTile.getContext('2d'),r=inkRandom(78);
 for(let i=0;i<6500;i++){const x=r()*256,y=r()*256;p.fillStyle=i%3?'#372e2820':'#fff9dd70';p.fillRect(x,y,.3+r()*1.5,.3+r()*1.5)}
 for(let i=0;i<180;i++){p.beginPath();const x=r()*256,y=r()*256;p.moveTo(x,y);p.lineTo(x+2+r()*7,y-1+r()*3);p.strokeStyle='#8b795519';p.lineWidth=.4;p.stroke()}}
 const pattern=c.createPattern(paperTile,'repeat');paperPatterns.set(c,pattern);return pattern;}
 function pigment(c,fill,x,y,w,h,seed=7){c.fillStyle=fill;c.fill();if(Math.abs(w*h)<90)return;
 c.save();c.clip();const r=inkRandom(seed+x*11+y*19+w*3),alpha=c.globalAlpha;
 // Translucent large wet strokes accumulate inside the silhouette, with dry paper gaps.
 for(let i=0;i<5;i++){const xx=x+r()*w,yy=y+r()*h;c.beginPath();c.ellipse(xx,yy,Math.max(1,w*(.15+r()*.4)),Math.max(1,h*(.08+r()*.24)),r()-.5,0,Math.PI*2);const shade=i%2?'#183b3c':'#fff0cf',g=c.createRadialGradient(xx,yy,0,xx,yy,Math.max(2,w*.45));if(g&&g.addColorStop){g.addColorStop(0,shade+'35');g.addColorStop(1,shade+'00');c.fillStyle=g}else c.fillStyle=shade+'10';c.globalAlpha=alpha*.6;c.fill()}
 c.globalAlpha=alpha*.48;const pat=paper(c);if(pat){c.fillStyle=pat;c.fillRect(x-2,y-2,w+4,h+4)}
 c.globalAlpha=alpha;for(let i=0;i<Math.min(22,Math.abs(w*h)/300);i++){let xx=x+r()*w,yy=y+r()*h;c.fillStyle=i%3?'#183c3d0d':'#ffefc239';c.beginPath();c.ellipse(xx,yy,.4+r()*2,.3+r(),0,0,Math.PI*2);c.fill()}
 c.restore();}
 function contour(c,color,width=1.3){c.save();c.strokeStyle=color;c.lineJoin='miter';c.lineCap='round';c.lineWidth=width*2.2;c.globalAlpha*=.16;c.stroke();c.restore();c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.stroke();}
 function rect(c,x,y,w,h,fill){if(w<10||h<8){c.fillStyle=fill;c.fillRect(x,y,w,h);return}
 const r=inkRandom(x*13+y*7+w),a=Math.min(2.5,w*.015,h*.025);c.beginPath();c.moveTo(x,y+a*r());c.lineTo(x+w*.37,y-a*r());c.lineTo(x+w,y+a*r());c.lineTo(x+w-a*r(),y+h);c.lineTo(x+w*.4,y+h-a*r());c.lineTo(x,y+h);c.closePath();pigment(c,fill,x,y,w,h);}
 function poly(c,points,fill,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);pigment(c,fill,Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));if(stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();contour(c,stroke,1.35);}}
 function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);if(rx>9&&ry>6)pigment(c,color,x-rx,y-ry,rx*2,ry*2,19);else{c.fillStyle=color;c.fill()}}
 function line(c,x,y,X,Y,color,w=2){c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.stroke();if(w>3){c.save();c.strokeStyle='#fff1ce30';c.lineWidth=w*.13;c.stroke();c.restore()}}

 function label(c,text,x,y,color='#f2e6cd',size=16){c.font=`${size}px "STKaiti","KaiTi",serif`;c.textAlign='center';c.fillStyle='#fff2d8ed';const w=c.measureText(text).width+20;c.fillRect(x-w/2,y-19,w,27);c.fillStyle='#455849';c.fillText(text,x,y)}
 function bell(c,x,y,s=1){Game.BronzeBell.paint(c,x,y,.55*s)}

 function ambience(c,scene,t){
 // A bounded set of gentle moving leaves, highlights and hearth smoke.
 if(scene.sceneId==='palace'||scene.sceneId==='future')return;
 c.save();for(let i=0;i<14;i++){let x=80+(i*137)%1600+Math.sin(t*.3+i)*18,y=100+(i*211+t*7)%1000;
 if(scene.sceneId==='workshop'&&i<5){x=440+Math.sin(t*.4+i)*12;y=500-((t*13+i*23)%140);ellipse(c,x,y,5+i,3+i,'#f0e4c91c')}
 else ellipse(c,x,y,2.5,1.1,i%3?'#fff0c348':'#efc3b77a');}c.restore();
 }


 // 材质场景与编钟使用同一光向；只在场景进入时绘制并缓存。
 function prepare(scene){const canvas=document.createElement('canvas'),b=Game.Scenery.bounds(scene);canvas.width=Math.ceil(b.w);canvas.height=Math.ceil(b.h);canvas.worldBounds=b;const c=canvas.getContext('2d');c.translate(-b.x,-b.y);const extended=Game.Scenery.images[scene.sceneId];const painted=extended||Game.SceneImages?.[scene.sceneId];if(extended)c.drawImage(extended,b.x,b.y,b.w,b.h);else{Game.SceneArt.ground(c,scene);if(painted)c.drawImage(painted,0,0,scene.mapWidth,scene.mapHeight);}
 if(!painted)scene.buildings.forEach(b=>{Game.SceneArt.building(c,b,scene.background);label(c,b.label,b.x+b.w/2,b.y+b.h+25,'#f0e2c0',15)});
 if(!painted)scene.decorations.slice().sort((a,b)=>a.y-b.y).forEach(d=>Game.SceneArt.decoration(c,d));
 scene.exits.forEach(e=>{c.fillStyle='#ddc48a23';c.fillRect(e.x,e.y,e.w,e.h);c.strokeStyle='#d8bd7f';c.lineWidth=1.4;c.strokeRect(e.x,e.y,e.w,e.h);label(c,'◇ '+e.label,e.x+e.w/2,e.y+e.h+25)});return canvas;}

 // 人物画成可缓存的彩墨小立绘；八帧步态不改变脚底世界坐标。
 const inkPeople=new Map();

 // 三个独立面的造型：正面、背面、右侧；向左行走时镜像侧面。
 function person(c,p,player){if(player&&Game.AgentSprite?.complete&&Game.AgentSprite.naturalWidth){const im=Game.AgentSprite,k={down:0,up:1,left:2,right:3}[p.direction]||0,w=im.naturalWidth/2,h=im.naturalHeight/2;c.drawImage(im,(k%2)*w,Math.floor(k/2)*h,w,h,p.x-48,p.y-92-(p.walking?Math.abs(Math.sin(p.phase||0))*3:0),96,96);return;}const view=p.direction==='up'?'back':(p.direction==='left'||p.direction==='right')?'side':'front';
 const phase=p.walking?Math.floor(((p.phase||0)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)/(Math.PI/4)):8;
 const key=[player?'player':p.role||'robe',p.id==='elder'?'elder':'',p.color||'',view,phase].join('|');let sprite=inkPeople.get(key);
 if(!sprite){sprite=document.createElement('canvas');sprite.width=160;sprite.height=220;const q=sprite.getContext('2d');q.scale(2,2);q.translate(40,101);paintPerson(q,{...p,view,phase:phase===8?0:phase*Math.PI/4,walking:phase!==8},player);if(inkPeople.size>220)inkPeople.clear();inkPeople.set(key,sprite)}
 c.save();c.translate(p.x,p.y);if(p.direction==='left')c.scale(-1,1);c.drawImage(sprite,-40,-101,80,110);c.restore();}
 function paintPerson(c,p,player){const side=p.view==='side',back=p.view==='back',guard=p.role==='guard',royal=p.role==='royal',modern=p.role==='modern',elder=p.id==='elder',walk=p.walking?Math.sin(p.phase||0):0;
 const body=player?'#eee0bd':p.color||'#689183',dark=player?'#307b83':royal?'#bca064':'#49666a',hair=elder?'#bdb5a3':'#283f4b';
 const path=a=>{c.beginPath();for(const v of a){if(v[0]==='M')c.moveTo(v[1],v[2]);else if(v[0]==='L')c.lineTo(v[1],v[2]);else if(v[0]==='Q')c.quadraticCurveTo(...v.slice(1));else c.closePath()}};
 const shape=(a,fill,stroke='#334a4c',w=.8)=>{path(a);pigment(c,fill,-30,-94,60,100);if(stroke){path(a);contour(c,stroke,w)}};
 const face=a=>shape(a,'#f0d0ac','#826951',.55);
 ellipse(c,1,3,side?11:15,4,'#244f4c24');
 for(let leg of [-1,1]){const xx=side?leg*2:leg*5,step=walk*leg*(side?4:2.5);shape([['M',xx-2.5,-15],['L',xx+3,-15],['L',xx+3+step*.35,1-step*.4],['L',xx-3+step*.35,1-step*.4],['Z']],'#dbd2b8');shape([['M',xx-3+step*.35,-1-step*.4],['L',xx+4+step*.35,-1-step*.4],['Q',xx+8+step*.35,2-step*.4,xx+6+step*.35,4-step*.4],['L',xx-4+step*.35,4-step*.4],['Z']],'#33565b');}
 c.translate(0,p.walking?-Math.abs(walk)*1.15:0);

 if(side){
 // Soft anime profile: short nose, small ear, continuous jaw and the same high knot as the front.
 if(player)shape([['M',0,-57],['Q',-10,-60,-17,-51],['Q',-20,-46,-27,-45],['Q',-21,-41,-15,-44],['Q',-12,-49,-4,-48],['L',2,-52],['Z']],'#386f85','#355766',.55);
 // Far sleeve is partly hidden by the body; the near sleeve swings from the shoulder.
 shape([['M',-6,-54],['Q',-11,-50,-12,-39],['L',-13,-25],['Q',-10,-21,-5,-23],['L',-2,-44],['Z']],'#d8d3b6','#65705e',.6);
 face([['M',-10,-25],['Q',-6,-26,-6,-23],['L',-7,-18],['Q',-11,-17,-11,-21],['Z']]);
 shape([['M',-6,-56],['Q',-1,-58,5,-54],['Q',10,-47,9,-36],['Q',8,-31,10,-24],['L',14+walk,-11],['Q',7,-8,2,-11],['Q',-4,-9,-12,-11],['Q',-9,-27,-9,-39],['Q',-9,-49,-6,-56],['Z']],body,'#536253',.7);
 // Collar follows the neck, and fabric folds follow gravity rather than forming a triangular arm.
 shape([['M',1,-56],['Q',5,-57,7,-53],['L',5,-47],['L',1,-51],['L',-2,-54],['Z']],'#fff1d5',null);
 line(c,1,-55,6,-49,dark,1.4);line(c,-8,-35,9,-34,dark,3.2);
 shape([['M',2,-33],['Q',6,-28,6,-21],['L',8,-15],['L',4,-17],['L',3,-28],['Z']],dark,null);
 c.beginPath();c.moveTo(-4,-30);c.quadraticCurveTo(-6,-21,-8,-13);c.strokeStyle='#a4977480';c.lineWidth=.85;c.stroke();
 c.beginPath();c.moveTo(5,-28);c.quadraticCurveTo(8,-18,10,-13);c.strokeStyle='#fff0ce99';c.lineWidth=1.3;c.stroke();
 if(player){line(c,-4,-52,-6,-29,'#9a8058',1.8);shape([['M',-12,-31],['Q',-7,-33,-3,-30],['L',-2,-22],['Q',-7,-18,-13,-21],['Z']],'#a98e61','#74664a',.65);line(c,-11,-27,-3,-26,'#dbc593',1)}
 c.save();c.translate(3,-51);c.rotate(walk*.13);
 shape([['M',-2,-2],['Q',4,-5,7,3],['Q',8,10,10,20],['Q',6,24,0,23],['Q',-3,13,-4,6],['Q',-5,0,-2,-2],['Z']],body,'#536253',.7);
 c.beginPath();c.moveTo(-1,17);c.quadraticCurveTo(4,20,9,18);c.strokeStyle=dark;c.lineWidth=2;c.stroke();
 face([['M',3,22],['Q',6,22,7,21],['L',8,26],['Q',8,29,5,29],['Q',3,28,3,25],['Z']]);c.restore();
 // Hair behind the cheek keeps the head shape and silhouette consistent with the other views.
 shape([['M',-8,-76],['Q',-14,-68,-12,-55],['Q',-9,-49,-5,-51],['L',-6,-62],['Q',-4,-69,-2,-75],['Z']],hair,'#344955',.55);
 face([['M',-3,-77],['Q',5,-79,7.8,-73],['Q',8.8,-70,8.5,-68],['Q',8.4,-66.7,10.3,-65.4],['Q',10.8,-64.7,9,-64.1],['L',8.8,-62.2],['Q',9.3,-60.5,7.2,-59],['Q',4.6,-56.6,1.2,-58],['L',-.8,-54.5],['L',-4.2,-57],['L',-3,-62],['Q',-8,-67,-7,-73],['Q',-6,-76,-3,-77],['Z']]);
 shape([['M',-8,-64],['Q',-14,-75,-6,-81],['Q',-.5,-86,6,-81],['Q',10,-78,9,-72],['Q',6,-71,4,-66],['L',3,-72],['Q',1,-68,-2,-66],['L',-1,-73],['Q',-5,-70,-5,-63],['Z']],hair,'#2c444f',.7);
 ellipse(c,-2,-84.5,3.8,3.2,hair);line(c,-5,-83.5,1,-83.7,dark,1.3);
 // A small ear and a tapered eye avoid the previous oversized ear and pointed muzzle.
 face([['M',-2.6,-66],['Q',-.1,-68,-.2,-65.2],['Q',-.5,-62.9,-2.2,-63.3],['Z']]);
 c.beginPath();c.moveTo(3.8,-67.7);c.quadraticCurveTo(5.5,-68.4,7.2,-67.1);c.strokeStyle=hair;c.lineWidth=.9;c.stroke();ellipse(c,6,-66.4,1.15,1.6,'#375961');ellipse(c,5.7,-67,.35,.5,'#fff4dd');
 line(c,8,-61.7,9,-61.4,'#a67361',.55);ellipse(c,4.4,-62.5,1.4,.65,'#d69b8355');
 line(c,-8,-77,-4,-79,'#bdc9b944',1.1);
 if(elder)shape([['M',5,-59],['Q',8,-60,9,-59],['L',7,-53],['Q',4,-54,5,-59],['Z']],'#d4ccb7',null);
 if(royal){poly(c,[[-7,-82],[8,-82],[8,-87],[-7,-87]],'#8b734a');ellipse(c,3,-87,1.6,1.5,'#d8b969')}
 if(modern){shape([['M',-10,-78],['Q',-9,-87,-1,-87],['Q',8,-87,9,-78],['Z']],'#c6c7a9');line(c,-10,-78,12,-78,'#97aa95',1.8)}

 }else{
 if(player)shape([['M',4,-58],['Q',17,-60,23,-46],['L',30,-41],['L',23,-42],['L',18,-46],['Q',13,-47,8,-48],['Z']],'#346e85','#2c5263',.6);
 // Back hair sits behind the shoulders, separate from the visible rear knot.
 shape([['M',-9,-71],['Q',-13,-64,-12,-50],['L',-7,-45],['L',6,-47],['L',12,-55],['L',10,-71],['Z']],hair);
 for(let arm of [-1,1]){c.save();c.translate(arm*8,-53);c.rotate(arm*(.12+walk*.12));shape([['M',0,0],['Q',arm*7,5,arm*11,23],['L',arm*6,27],['L',arm*-2,22],['L',arm*1,12],['Z']],body);line(c,arm*1,21,arm*9,23,dark,2);face([['M',arm*4,24],['L',arm*9,23],['L',arm*9,29],['Q',arm*5,32,arm*4,24],['Z']]);c.restore();}
 shape([['M',-8,-56],['L',8,-56],['Q',8,-40,11,-27],['L',16+walk,-9],['L',4,-11],['L',-3,-7],['L',-16,-11],['Q',-9,-35,-8,-56],['Z']],body);
 if(back){
 shape([['M',-7,-56],['Q',0,-59,7,-56],['L',5,-52],['Q',0,-54,-5,-52],['Z']],'#d6d5bf',null);
 line(c,0,-51,0,-15,'#8e987f77',.85);line(c,-8,-48,-3,-37,'#faf0d655',.9);line(c,8,-48,3,-37,'#44676744',.9);
 line(c,-9,-35,9,-35,dark,4);shape([['M',1,-34],['Q',7,-37,9,-33],['L',6,-29],['L',2,-31],['L',4,-15],['L',0,-19],['L',-2,-30],['L',-7,-28],['L',-8,-32],['Z']],dark,null);
 if(player){line(c,-8,-54,10,-29,'#9c7f53',2);shape([['M',7,-32],['L',18,-31],['L',18,-20],['Q',13,-17,7,-20],['Z']],'#af9261','#746247',.9);line(c,8,-27,17,-27,'#dfc995',1)}
 }else{
 shape([['M',-6,-55],['L',1,-44],['L',7,-55],['L',3,-40],['L',-2,-40],['Z']],'#fff1d4',null);line(c,-6,-55,1,-44,dark,1.4);line(c,7,-55,-1,-41,dark,1.4);line(c,-9,-35,9,-35,dark,4);
 shape([['M',2,-34],['L',8,-30],['L',7+walk,-13],['L',3,-17],['L',4,-28],['L',0,-31],['Z']],dark,null);
 if(player){line(c,-7,-53,10,-30,'#9a7d50',1.8);shape([['M',9,-31],['L',18,-30],['L',18,-19],['L',11,-18],['L',8,-24],['Z']],'#ac8d5c','#756447',.8);line(c,9,-27,17,-26,'#dfc896',1);ellipse(c,3,-31,1.5,2,'#8fb89d')}
 }
 for(let i of [-1,1]){line(c,i*5,-29,i*10,-12,'#c0b39077',.8);line(c,i*3,-27,i*5,-13,'#fff0ce66',1)}
 if(back){shape([['M',-9,-76],['Q',-8,-85,0,-85],['Q',11,-84,10,-70],['L',8,-60],['Q',0,-54,-8,-60],['Z']],hair);ellipse(c,0,-64,5.5,4.5,hair);line(c,-4,-63,4,-64,dark,1.6);for(let x of [-5,0,5]){line(c,x,-79,x*.6,-67,'#9eafa036',.7)}}
 else {face([['M',-8,-75],['Q',-10,-64,-5,-60],['Q',0,-55,6,-60],['Q',11,-66,8,-75],['Z']]);for(let x of [-4,4]){line(c,x-1.8,-67,x+1.6,-67,hair,.9);ellipse(c,x,-65.5,1.3,2,'#35545a');ellipse(c,x-.4,-66.3,.4,.5,'#fff0d6')};line(c,-1.4,-59.8,1.6,-59.8,'#af7c66',.65);
 shape([['M',-9,-64],['Q',-14,-78,-3,-83],['Q',12,-87,11,-72],['L',8,-62],['L',7,-73],['L',3,-68],['L',3,-75],['L',-5,-66],['L',-4,-73],['Z']],hair);line(c,-7,-77,-1,-80,'#c0c7ae42',1.1);if(elder)shape([['M',-3,-59],['L',0,-56],['L',4,-59],['L',1,-51],['Z']],'#d2cbb7',null)}
 ellipse(c,0,-85,4,3.4,hair);line(c,-3,-84,4,-84,dark,1.4);
 if(royal){poly(c,[[-10,-82],[-11,-88],[11,-88],[10,-82]],'#77603e');ellipse(c,0,-89,2,1.8,'#d3b672')}
 if(modern){shape([['M',-10,-79],['Q',-9,-88,0,-88],['Q',10,-88,11,-79],['Z']],'#c7c7a6');ellipse(c,1,-79,12,1.7,'#9fac93')}
 }
 if(guard){const x=side?20:23;line(c,x,-78,x,4,'#7e6b49',1.8);poly(c,[[x-3,-77],[x,-88],[x+3,-77]],'#a5bdb2','#405f60')}
 if(player)poly(c,[[0,-96],[-3,-101],[3,-101]],'#e4c77c');
 }
 function verticalName(c,text,x,y){c.font='16px sans-serif';c.textAlign='center';[...text].forEach((t,i)=>{c.fillStyle='white';c.fillRect(x-10,y+i*19-15,20,20);c.fillStyle='#111';c.fillText(t,x,y+i*19)})} function draw(ctx,canvas,scene,p,view,settings){const camera=Game.Scenery.camera(scene,p,view),w=view.w,h=view.h,z=camera.zoom,camX=camera.x,camY=camera.y;view.zoom=z;view.camX=camX;view.camY=camY;ctx.save();ctx.imageSmoothingEnabled=true;ctx.scale(z,z);ctx.translate(-camX,-camY);ctx.fillStyle='#344b42';ctx.fillRect(camX,camY,w/z,h/z);const b=canvas.worldBounds;ctx.drawImage(canvas,b.x,b.y);ambience(ctx,scene,typeof performance==='undefined'?0:performance.now()/1000);[...scene.npcList.map(n=>({...n,player:false})),{...p,player:true}].sort((a,b)=>a.y-b.y).forEach(n=>person(ctx,n,n.player));if(settings.labels){scene.npcList.forEach(n=>verticalName(ctx,n.name,n.x+40,n.y-80));label(ctx,'我',p.x+42,p.y-80,'#f4dca0',16)}ctx.restore();if(scene.sceneId==='overworld')return;
 // Small geographic overview, independently scaled from world coordinates.
 const mw=164,mh=109,mx=w-mw-22,my=h-mh-24;ctx.fillStyle='#112b2de8';ctx.fillRect(mx-8,my-8,mw+16,mh+16);ctx.fillStyle='#728c79';ctx.fillRect(mx,my,mw,mh);scene.collisionBoxes.forEach(b=>{ctx.fillStyle='#374f4a';ctx.fillRect(mx+b.x/scene.mapWidth*mw,my+b.y/scene.mapHeight*mh,b.w/scene.mapWidth*mw,b.h/scene.mapHeight*mh)});scene.exits.forEach(e=>{ctx.fillStyle='#e5bd75';ctx.fillRect(mx+e.x/scene.mapWidth*mw,my+e.y/scene.mapHeight*mh,5,5)});ellipse(ctx,mx+p.x/scene.mapWidth*mw,my+p.y/scene.mapHeight*mh,3,3,'#fff5cc');ctx.strokeStyle='#f1e2b377';ctx.strokeRect(mx+camX/scene.mapWidth*mw,my+camY/scene.mapHeight*mh,w/z/scene.mapWidth*mw,h/z/scene.mapHeight*mh);}
 return {prepare,draw,person};
})();
