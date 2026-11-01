/* 与编钟一致的材质插画层：左上主光、接触阴影、体积渐变与细密表面纹理。
 * 场景构图和碰撞坐标仍由 maps.js 管理；静态细节只在进入场景时绘制。
 */
Game.SceneArt=(()=>{
 const rnd=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296};
 const lerp=(a,b,t)=>a+(b-a)*t;
 function grad(c,x,y,w,h,colors,vertical=false){const g=c.createLinearGradient(x,y,vertical?x:x+w,y+h);colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));return g}
 function path(c,p){c.beginPath();p.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.closePath()}
 function poly(c,p,fill,stroke,width=1){path(c,p);if(fill&&fill!=='none'){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
 function box(c,x,y,w,h,fill,stroke){c.fillStyle=fill;c.fillRect(x,y,w,h);if(stroke){c.strokeStyle=stroke;c.lineWidth=.8;c.strokeRect(x,y,w,h)}}
 function oval(c,x,y,rx,ry,fill,stroke,width=1){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
 function line(c,x,y,X,Y,color,w=1){c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.stroke()}
 function shadow(c,x,y,rx,ry){for(let i=3;i>0;i--)oval(c,x+3+i,y+i,rx+i*3,ry+i*1.5,'#1a302714')}
 function flecks(c,x,y,w,h,seed=7,count=65){const r=rnd(seed);for(let i=0;i<count;i++){c.fillStyle=i%3?'#182f261c':'#fff3ce36';c.fillRect(x+r()*w,y+r()*h,.4+r()*1.5,.3+r()*.9)}}
 function wood(c,x,y,w,h,dark=false,vertical=false){box(c,x,y,w,h,grad(c,x,y,w,h,dark?['#8b724d','#5e4933','#382f26']:['#b0996d','#90764d','#5e4b33'],vertical));const r=rnd(x*17+y*7+w);
 for(let i=0;i<12;i++){let off=r();c.beginPath();if(vertical){c.moveTo(x+off*w,y);c.bezierCurveTo(x+off*w+3,y+h*.35,x+off*w-2,y+h*.6,x+off*w,y+h)}else{c.moveTo(x,y+off*h);c.bezierCurveTo(x+w*.4,y+off*h-2,x+w*.65,y+off*h+2,x+w,y+off*h)}c.strokeStyle=i%2?'#ddc39339':'#302e2549';c.lineWidth=.5;c.stroke()}
 if(w>30&&h>10)oval(c,x+w*.64,y+h*.5,vertical?2:w*.035,vertical?h*.05:1.5,null,'#473a2e66',.7);}
 function slab(c,x,y,w,h,seed=2){const r=rnd(seed),p=[[x+2,y+1],[x+w-3,y],[x+w,y+h*.43],[x+w-2,y+h-2],[x+3,y+h],[x,y+h*.4]];
 poly(c,p,grad(c,x,y,w,h,['#c2c0a9','#a6ac97','#7f8d7c']),'#6b7a6c',.65);line(c,x+4,y+2,x+w-5,y+1,'#e8e4ca',1);line(c,x+w-2,y+5,x+w-2,y+h-5,'#63736388',1);flecks(c,x+2,y+2,w-5,h-5,seed,8);
 if(r()>.62){c.beginPath();c.moveTo(x+w*.7,y+1);c.lineTo(x+w*.55,y+h*.44);c.lineTo(x+w*.65,y+h*.65);c.strokeStyle='#687e6577';c.lineWidth=.55;c.stroke()}}
 function vessel(c,x,y,s=1,clay=false){c.save();c.translate(x,y);c.scale(s,s);shadow(c,2,3,18,6);
 const g=grad(c,-20,-46,40,50,clay?['#c6a67a','#b18452','#775332']:['#697956','#a19d6d','#455f45','#263f32']);
 c.beginPath();c.moveTo(-9,-42);c.bezierCurveTo(-8,-32,-23,-30,-19,-8);c.quadraticCurveTo(-17,3,0,4);c.quadraticCurveTo(19,2,20,-10);c.bezierCurveTo(22,-30,8,-33,9,-42);c.closePath();c.fillStyle=g;c.fill();c.strokeStyle='#3b4832';c.lineWidth=.8;c.stroke();
 c.save();c.clip();flecks(c,-21,-40,42,43,44,90);for(let yy of [-28,-21,-9]){c.beginPath();c.ellipse(0,yy,18,4,0,0,Math.PI);c.strokeStyle='#c9bb7b99';c.lineWidth=1;c.stroke()}c.restore();
 oval(c,0,-42,10,3.5,'#b8b182','#626947',1);oval(c,0,-43,7.5,2,'#293f31');oval(c,0,2,13,3,null,'#9f9c69',1);
 if(!clay){for(let side of [-1,1]){oval(c,side*19,-25,4.5,7,null,'#899465',2);for(let j=0;j<6;j++)line(c,-12+j*4,-17,-10+j*4,-13,'#c0ad6c88',.6)}}c.restore();}
 function paper(c,x,y,w,h,roll=false){poly(c,[[x+1,y+3],[x+w,y],[x+w-1,y+h],[x,y+h-1]],'#423e2c33');poly(c,[[x,y],[x+w-1,y-2],[x+w-2,y+h-3],[x+1,y+h]],grad(c,x,y,w,h,['#f4e9bf','#dfd0a0','#c4b17e']),'#ad9c6f',.5);for(let j=6;j<h-5;j+=4)line(c,x+5,y+j,x+w-7-(j%3)*2,y+j-1,'#6c684f9c',.6);if(roll){wood(c,x-2,y-2,4,h+4);wood(c,x+w-3,y-3,4,h+4)}}
 function crate(c,x,y,w,h){shadow(c,x+w*.55,y+h,w*.55,10);const d=Math.min(14,w*.12,h*.16);poly(c,[[x,y+d],[x+w-d,y+d],[x+w,y+h],[x,y+h]],'#654c31','#493e2b');wood(c,x,y+d,w-d,h-d);poly(c,[[x+w-d,y+d],[x+w,y],[x+w,y+h-d],[x+w-d,y+h]],'#5c4b33');poly(c,[[x,y+d],[x+d,y],[x+w,y],[x+w-d,y+d]],grad(c,x,y,w,d,['#ceb98c','#8f744a']),'#6b5738');
 for(let xx=x+12;xx<x+w-d;xx+=25)line(c,xx,y+d+2,xx,y+h-2,'#51412dbb',1);for(let xx of [x+5,x+w-d-7]){box(c,xx,y+d,5,h-d,'#4b5140');for(let yy of [y+d+4,y+h-4])oval(c,xx+2.5,yy,1.2,1.2,'#b8ad7e')}
 line(c,x+12,y+d+6,x+w-d-12,y+h-7,'#c2a574',5);line(c,x+12,y+d+6,x+w-d-12,y+h-7,'#e0c28d77',1);}
 function table(c,x,y,w,h,objects=true){const topH=h*.65,d=Math.min(12,h*.15);shadow(c,x+w*.55,y+h,w*.51,12);
 for(let xx of [x+9,x+w-18]){wood(c,xx,y+topH-5,9,h-topH+10,true,true);line(c,xx,y+topH+3,xx+8,y+topH+3,'#c6a674',1)}
 wood(c,x,y,w,topH);for(let xx=x+30;xx<x+w;xx+=38)line(c,xx,y+2,xx,y+topH,'#57452eaa',1);poly(c,[[x,y+topH],[x+w,y+topH],[x+w-d,y+topH+d],[x+3,y+topH+d]],'#67482f');line(c,x+1,y+1,x+w-1,y+1,'#dac093',1.3);
 if(objects){paper(c,x+w*.13,y+topH*.25,w*.25,topH*.55,true);paper(c,x+w*.49,y+topH*.17,w*.23,topH*.57);oval(c,x+w*.86,y+topH*.62,10,5,'#283d32','#b1af7a',1.1);line(c,x+w*.78,y+topH*.2,x+w*.9,y+topH*.48,'#5a4c35',2);line(c,x+w*.9,y+topH*.48,x+w*.93,y+topH*.54,'#262b24',2)}
 }
 function lantern(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);shadow(c,3,4,10,3);wood(c,-2,-67,4,70,true,true);
 poly(c,[[-16,-59],[-10,-66],[9,-66],[16,-59]],grad(c,-16,-67,32,10,['#a8a478','#495c45']),'#3d4b36');
 c.beginPath();c.moveTo(-11,-58);c.quadraticCurveTo(-16,-43,-9,-32);c.lineTo(9,-32);c.quadraticCurveTo(16,-44,11,-58);c.closePath();c.fillStyle=grad(c,-14,-58,28,28,['#e2ba74','#bd723f','#813d29']);c.fill();c.strokeStyle='#6d4a30';c.lineWidth=.8;c.stroke();
 for(let xx of [-7,-2,3,8])line(c,xx,-55,xx,-34,'#ffe0a766',.6);line(c,-11,-58,11,-58,'#d5b479',2);line(c,-10,-32,10,-32,'#c6a16a',2);line(c,0,-31,0,-24,'#b5763a',1.4);c.restore();}
 function roof(c,x,y,w,h){const p=[[x-15,y+h*.55],[x+8,y+h*.44],[x+w*.2,y+13],[x+w*.8,y+13],[x+w-8,y+h*.44],[x+w+15,y+h*.55]];
 poly(c,p,grad(c,x,y,w,h*.56,['#8a9a81','#536f66','#304e49','#1d3837']),'#273f39',1.3);c.save();path(c,p);c.clip();
 const rows=Math.max(6,Math.round(h/21));for(let row=0;row<rows;row++){const yy=y+18+row*(h*.51-18)/rows,t=(yy-y-13)/(h*.55-13),inset=w*.2*(1-t),tw=15+row*.6;
 for(let xx=x+inset-(row%2)*tw*.5;xx<x+w-inset+tw;xx+=tw){poly(c,[[xx,yy],[xx+tw-1,yy],[xx+tw+3,yy+h*.52/rows],[xx-3,yy+h*.52/rows]],grad(c,xx,yy,tw,h*.52/rows,['#7c9180','#4f6c61','#304e47']),'#2b493f88',.45);line(c,xx+tw*.3,yy+1,xx+tw*.25,yy+h*.5/rows-1,'#b9bfa044',.8)}}flecks(c,x,y,w,h*.6,x+w,180);c.restore();
 line(c,x+w*.2,y+12,x+w*.8,y+12,'#a8b392',5);line(c,x+w*.2,y+10,x+w*.8,y+10,'#d0caaa',1);
 for(let sign of [-1,1]){const xx=x+w*(sign<0?.2:.8);c.beginPath();c.moveTo(xx,y+12);c.quadraticCurveTo(xx+sign*14,y+15,xx+sign*20,y+1);c.strokeStyle='#8c9b7f';c.lineWidth=3.5;c.stroke();c.strokeStyle='#d7ceb0';c.lineWidth=.9;c.stroke()}
 c.beginPath();c.moveTo(x-15,y+h*.55);c.quadraticCurveTo(x-22,y+h*.5,x-23,y+h*.45);c.lineTo(x-10,y+h*.5);c.lineTo(x+w+10,y+h*.5);c.quadraticCurveTo(x+w+21,y+h*.47,x+w+23,y+h*.45);c.lineTo(x+w+15,y+h*.55);c.closePath();c.fillStyle='#29473f';c.fill();line(c,x-13,y+h*.54,x+w+13,y+h*.54,'#98ab8e',1.3);
 }
 function house(c,b){const{x,y,w,h}=b;shadow(c,x+w*.55,y+h+5,w*.53,14);
 poly(c,[[x+15,y+h*.48],[x+w-16,y+h*.48],[x+w-16,y+h],[x+15,y+h]],grad(c,x,y,w,h,['#e0d0a4','#cab88e','#aa9d79']),'#7b8065',.9);
 poly(c,[[x+w-16,y+h*.48],[x+w+4,y+h*.55],[x+w+4,y+h-6],[x+w-16,y+h]],'#7e8266');
 c.save();c.beginPath();c.rect(x+16,y+h*.48,w-33,h*.5);c.clip();flecks(c,x+16,y+h*.5,w-33,h*.48,x*3+y,220);c.restore();
 for(let yy=y+h-22;yy<y+h;yy+=10)for(let xx=x+18;xx<x+w-15;xx+=36){box(c,xx+(Math.floor(yy)%2)*8,yy,31,9,grad(c,xx,yy,31,9,['#acb09a','#747e69']),'#65746066')}
 const dx=x+w*.42,dw=w*.17;wood(c,dx-6,y+h*.54,dw+12,h*.46,true,true);box(c,dx,y+h*.58,dw,h*.4,grad(c,dx,y+h*.58,dw,h*.4,['#242f26','#49503a','#202b24']));
 wood(c,dx+3,y+h*.59,dw*.36,h*.38,true,true);line(c,dx+dw*.35,y+h*.6,dx+dw*.35,y+h*.95,'#d0b27866',1);oval(c,dx+dw*.3,y+h*.82,1.5,2,'#c6ae75');
 for(let side of [.18,.69]){let wx=x+w*side,wy=y+h*.64,ww=w*.13,wh=h*.17;box(c,wx-4,wy-4,ww+8,wh+8,'#72583b');box(c,wx,wy,ww,wh,grad(c,wx,wy,ww,wh,['#a0b4a0','#526e62','#3c564b']));for(let k=0;k<=4;k++){line(c,wx+k*ww/4,wy,wx+k*ww/4,wy+wh,'#a1875c',1.6);line(c,wx,wy+k*wh/4,wx+ww,wy+k*wh/4,'#ad9669',1.2)}line(c,wx+2,wy+2,wx+ww*.6,wy+2,'#e3d0a6',.8)}
 for(let xx of [x+18,x+w*.39,x+w*.62,x+w-21])wood(c,xx,y+h*.5,5,h*.48,true,true);
 roof(c,x,y,w,h);for(let xx=x+25;xx<x+w-20;xx+=27){poly(c,[[xx,y+h*.55],[xx+5,y+h*.55],[xx+7,y+h*.59],[xx+2,y+h*.6]],'#987a50');oval(c,xx,y+h*.54,2.6,1.5,'#9aaa8b')}
 for(let xx of [x+32,x+w-32]){c.save();c.translate(xx,y+h*.83);c.scale(.48,.48);lantern(c,0,0,1);c.restore()}
 slab(c,dx-9,y+h+1,dw+18,8,44);slab(c,dx-15,y+h+9,dw+30,7,49);
 }
 function water(c,b){const{x,y,w,h}=b;box(c,x-5,y-5,w+10,h+10,'#627a68');box(c,x,y,w,h,grad(c,x,y,w,h,['#7caa9d','#4c8c88','#2e646b']));const r=rnd(x+y);
 for(let i=0;i<w*h/750;i++){const xx=x+5+r()*(w-10),yy=y+5+r()*(h-10);c.beginPath();c.moveTo(xx-5,yy);c.quadraticCurveTo(xx+4,yy+1.2,xx+15,yy-.8);c.strokeStyle=i%3?'#b7d2b14a':'#173b3f44';c.lineWidth=.7;c.stroke()}
 for(let yy=y;yy<y+h-12;yy+=26){slab(c,x-8,yy,13,23,yy+3);slab(c,x+w-5,yy,13,23,yy+8)}
 if(b.type==='pond'){for(let i=0;i<7;i++){const xx=x+20+i*(w-40)/7,yy=y+20+(i%2)*35;oval(c,xx,yy+3,16,5,'#234b3d33');oval(c,xx,yy,14,6,grad(c,xx-12,yy-5,26,12,['#8ea87b','#416d4e']),'#5b855f',.5);line(c,xx,yy,xx+10,yy-3,'#c7ce9b88',.6);if(i%2===0){for(let k=0;k<5;k++){c.save();c.translate(xx,yy-5);c.rotate((k-2)*.35);oval(c,0,-3,2.7,5.5,grad(c,-3,-8,6,11,['#f1d4ba','#c78182']));c.restore()}oval(c,xx,yy-5,2,1.2,'#d4b96f')}}}
 }
 function column(c,b){const{x,y,w,h}=b;shadow(c,x+w*.6,y+h*.9,w*.8,12);oval(c,x+w/2,y+h-3,w*.56,13,'#7e8772','#5e725f');oval(c,x+w/2,y+h-8,w*.52,11,'#b1b19a');box(c,x+10,y-20,w-20,h+10,grad(c,x+10,y-20,w-20,h+10,['#bd7a55','#8a4936','#552f28']));line(c,x+17,y-17,x+17,y+h-16,'#dfaa7477',2);oval(c,x+w/2,y-20,(w-20)/2,6,'#b59e6b');for(let yy of [y-12,y+h-20]){box(c,x+9,yy,w-18,4,grad(c,x+9,yy,w-18,4,['#b5a576','#736c47','#49503a']));}}
 function screen(c,b){const{x,y,w,h}=b;shadow(c,x+w*.54,y+h+4,w*.55,9);for(let i=0;i<4;i++){const xx=x+i*w/4;wood(c,xx,y,w/4-2,h,true,true);box(c,xx+5,y+6,w/4-12,h-15,grad(c,xx,y,w/4,h,['#a66849','#75452f','#4a3529']));for(let j=0;j<4;j++){let cy=y+h*.28+j*h*.15;c.beginPath();c.moveTo(xx+12,cy+8);c.bezierCurveTo(xx+19,cy-12,xx+34,cy-10,xx+38,cy+1);c.quadraticCurveTo(xx+22,cy+14,xx+14,cy+6);c.strokeStyle='#d0b174';c.lineWidth=.9;c.stroke();line(c,xx+28,cy+1,xx+43,cy-8,'#b59863',.7)}for(let yy=y+12;yy<y+h-6;yy+=12)oval(c,xx+3,yy,.7,.7,'#d2b87e');wood(c,xx+3,y+h-2,6,10,true,true)}}
 function throne(c,b){const{x,y,w,h}=b;shadow(c,x+w*.53,y+h+18,w*.52,12);for(let j=3;j>=0;j--)slab(c,x+j*8,y+j*5,w-j*16,h-j*9,29+j);
 const xx=x+w*.34,ww=w*.32,yy=y+20;wood(c,xx,yy,ww,h*.57,true,true);box(c,xx+6,yy+6,ww-12,h*.48,grad(c,xx,yy,ww,h*.48,['#9a5e40','#613c2c','#412e25']),'#b79b65');
 for(let sign of [-1,1])for(let i=0;i<3;i++){c.beginPath();c.arc(x+w/2+sign*(12+i*14),yy+42,8+i*4,Math.PI*.1,Math.PI*1.7);c.strokeStyle='#beaa70';c.lineWidth=1;c.stroke()}
 for(let px of [xx-12,xx+ww+3]){wood(c,px,yy+65,9,h*.5,true,true);oval(c,px+4,yy+63,7,5,'#ab9761','#645a36')}
 wood(c,xx-15,yy+h*.5,ww+30,15,true);box(c,xx-8,yy+h*.5+2,ww+16,6,'#b28850');}
 function furnace(c,b){const{x,y,w,h}=b,cx=x+w/2,cy=y+h*.52;shadow(c,cx+8,y+h,w*.6,15);
 c.beginPath();c.ellipse(cx,cy,w*.47,h*.43,0,0,Math.PI*2);c.fillStyle=grad(c,x,y,w,h,['#99927b','#625f4b','#353f35']);c.fill();
 for(let i=0;i<19;i++){let a=i*Math.PI*2/19,xx=cx+Math.cos(a)*w*.39,yy=cy+Math.sin(a)*h*.35;oval(c,xx,yy,12,8,grad(c,xx-10,yy-6,20,12,['#a6a08a','#71705b','#424e42']),'#394b3e',.6)}
 oval(c,cx,cy,w*.3,h*.28,'#352e24');oval(c,cx,cy+5,w*.25,h*.2,grad(c,cx-w*.25,cy,w*.5,h*.2,['#9b4e2c','#de9e4d','#eec27a']));
 for(let i=0;i<7;i++){const xx=cx-w*.2+i*w*.065;c.beginPath();c.moveTo(xx-7,cy+19);c.quadraticCurveTo(xx+3,cy-1,xx+3,cy-26-(i%3)*8);c.quadraticCurveTo(xx+16,cy-5,xx+10,cy+20);c.closePath();c.fillStyle=i%2?'#e8af5c':'#efcd84';c.fill()}
 for(let i=0;i<9;i++){let xx=x+15+i*w/10;line(c,xx,y+h*.88,xx+6,y+h*.83,'#373a2c',2)}}
 function tent(c,b){const{x,y,w,h}=b;shadow(c,x+w*.55,y+h,w*.53,12);poly(c,[[x+12,y+h*.45],[x+w-12,y+h*.45],[x+w-20,y+h],[x+20,y+h]],grad(c,x,y,w,h,['#c6c1a0','#9b9c7b','#6e7a61']),'#626f56');poly(c,[[x,y+h*.58],[x+w*.5,y],[x+w,y+h*.58]],grad(c,x,y,w,h*.6,['#dfd2ac','#b4b292','#848d70']),'#8e9270');
 for(let i=1;i<8;i++)line(c,x+w/2,y+5,x+i*w/8,y+h*.57,i%2?'#f4e4bc66':'#65775d44',1.1);poly(c,[[x+w*.39,y+h],[x+w*.5,y+h*.52],[x+w*.62,y+h]],'#334c40');line(c,x+w*.5,y+2,x+w*.5,y+h*.49,'#dfc494',2.5);for(let xx of [x,x+w]){line(c,xx,y+h*.57,xx+(xx===x?-17:17),y+h+8,'#d7c29a',1);line(c,xx+(xx===x?-17:17),y+h+3,xx+(xx===x?-17:17),y+h+13,'#4b5440',3)}flecks(c,x+30,y+h*.65,w*.24,h*.3,17,40)}
 function bridge(c,b){const{x,y,w,h}=b;shadow(c,x+w*.52,y+h+5,w*.55,12);for(let i=0;i<w;i+=16){wood(c,x+i,y,15,h);line(c,x+i+1,y+1,x+i+14,y+1,'#d9c194',1);for(let yy of [y+8,y+h-8])oval(c,x+i+7,yy,1,1,'#3d4634')}
 for(let yy of [y+5,y+h-6]){for(let xx=x+6;xx<x+w;xx+=38){wood(c,xx,yy-24,5,28,true,true);oval(c,xx+2,yy-25,4,2,'#c3b88d')}wood(c,x,yy-20,w,5,true);line(c,x,yy-21,x+w,yy-21,'#d0bd90',1)}}
 function stall(c,b){const{x,y,w,h}=b;table(c,x+8,y+h*.45,w-16,h*.55,false);for(let xx of [x+9,x+w-13])wood(c,xx,y,5,h,true,true);
 const p=[[x-8,y+8],[x+w*.5,y-24],[x+w+8,y+8],[x+w+5,y+52],[x-5,y+52]];poly(c,p,grad(c,x,y,w,72,['#bc9b70','#9f5d40','#5d4230']),'#68513a');c.save();path(c,p);c.clip();for(let i=0;i<w;i+=24){box(c,x+i,y-28,11,85,'#d1ba8c99');line(c,x+i,y-25,x+i+7,y+50,'#f0dcaf44',.8)}flecks(c,x,y,w,50,x+y,60);c.restore();
 for(let i=0;i<5;i++){const xx=x+22+i*(w-40)/5;if(i%2)vessel(c,xx,y+h*.78,.38,true);else{oval(c,xx,y+h*.7,12,5,'#c8ba8a','#7b7c53');for(let j=0;j<4;j++)oval(c,xx-7+j*4,y+h*.68-(j%2)*3,3,3,grad(c,xx-7,y+h*.65,15,8,['#a9aa60','#707e45']))}}
 }
 function displayCase(c,b){const{x,y,w,h}=b,d=14;shadow(c,x+w*.55,y+h,w*.53,11);box(c,x,y+h*.76,w,h*.24,grad(c,x,y+h*.76,w,h*.24,['#959e88','#6c8071','#425e53']));poly(c,[[x,y+h*.76],[x+d,y+h*.76-d],[x+w+d,y+h*.76-d],[x+w,y+h*.76]],'#b4bda5');
 box(c,x,y,w,h*.76,grad(c,x,y,w,h*.76,['#e2efcf44','#638f8744','#c9e2cb66']),'#c6d7c3');poly(c,[[x,y],[x+d,y-d],[x+w+d,y-d],[x+w,y]],'#d7e5ce66','#aac8b4');poly(c,[[x+w,y],[x+w+d,y-d],[x+w+d,y+h*.76-d],[x+w,y+h*.76]],'#72a19655','#b4ceba');
 poly(c,[[x+15,y+4],[x+33,y+4],[x+w*.6,y+h*.7],[x+w*.53,y+h*.7]],'#f3f8dc2d');for(let xx of [x+4,x+w-4])line(c,xx,y+4,xx,y+h*.74,'#e3ebd3bb',1.2);oval(c,x+w/2,y+h*.57,w*.18,8,'#9ab19a55');paper(c,x+w/2-24,y+h-14,48,10);}
 function portal(c,b){const{x,y,w,h}=b,cx=x+w/2,cy=y+h*.52;shadow(c,cx,y+h,w*.48,12);oval(c,cx,cy,w*.49,h*.49,grad(c,x,y,w,h,['#8b9571','#bcb17b','#405948']),'#3e5441',2);oval(c,cx,cy,w*.41,h*.4,grad(c,x,y,w,h,['#326460','#81b7a3','#264d4c']),'#c0b27a',3);oval(c,cx,cy,w*.28,h*.27,grad(c,x,y,w,h,['#90b7a2','#c5d8b7','#4a8b83']),'#9ebda2',1.5);for(let i=0;i<16;i++){let a=i*Math.PI/8;line(c,cx+Math.cos(a)*w*.43,cy+Math.sin(a)*h*.43,cx+Math.cos(a)*w*.475,cy+Math.sin(a)*h*.475,'#d0bd85',2)}flecks(c,x+25,y+10,w-50,h-20,117,150)}
 function pit(c,b){const{x,y,w,h}=b;for(let j=0;j<5;j++){box(c,x+j*15,y+j*13,w-j*30,h-j*26,grad(c,x,y,w,h,[['#b8ac8b','#8c8061'],['#a29070','#71674f'],['#928062','#625a46'],['#7b6c50','#494b3b'],['#58604b','#2b3f34']][j]));flecks(c,x+j*15,y+j*13,w-j*30,h-j*26,j+7,120)}
 wood(c,x+w*.3,y+h*.36,w*.4,h*.38,true);for(let i=0;i<7;i++){const xx=x+i*w/6;line(c,xx,y-4,xx,y+h+3,'#d6c6a480',.65);line(c,xx,y-12,xx,y+7,'#c1a778',2)}for(let yy=y;yy<y+h;yy+=h/4)line(c,x-5,yy,x+w+5,yy,'#ded0b17a',.6)}
 function building(c,b,theme){c.save();c.lineJoin='round';const t=b.type;if(t==='bells')Game.BronzeBell.rackPaint(c,b.x,b.y-60,b.w,b.h+95);else if(t==='throne')throne(c,b);else if(t==='screen')screen(c,b);else if(t==='column')column(c,b);else if(t==='pond'||t==='river')water(c,b);else if(t==='furnace')furnace(c,b);else if(t==='table')table(c,b.x,b.y,b.w,b.h);else if(t==='crates'){for(let i=0,n=Math.max(1,Math.floor(b.w/85));i<n;i++)crate(c,b.x+i*b.w/n,b.y,b.w/n-4,b.h)}else if(t==='bridge')bridge(c,b);else if(t==='tent')tent(c,b);else if(t==='stall')stall(c,b);else if(t==='case')displayCase(c,b);else if(t==='portal')portal(c,b);else if(t==='pit')pit(c,b);else house(c,b);c.restore();}
 function tree(c,d){const{x,y,size=35,type}=d,r=rnd(x*7+y*13),pink=Math.floor(x+y)%7===0;shadow(c,10,10,size*1.12,13);
 c.beginPath();c.moveTo(-7,8);c.quadraticCurveTo(0,-size*.5,-8,-size*1.4);c.lineTo(6,-size*1.4);c.quadraticCurveTo(6,-size*.5,8,8);c.closePath();c.fillStyle=grad(c,-8,-size,16,size,['#aa9164','#715c3e','#4a4a33']);c.fill();
 for(let i=0;i<7;i++){let xx=(r()-.5)*size*.9,yy=-size*(.7+r()*.7);c.beginPath();c.moveTo(1,-size*.4);c.quadraticCurveTo(xx*.4,-size*.8,xx,yy);c.strokeStyle='#696044';c.lineWidth=2.4;c.stroke()}
 const blobs=[];for(let i=0;i<20;i++)blobs.push({x:(r()-.5)*size*1.55,y:-size*(.95+r()*.75),s:size*(.22+r()*.23)});blobs.sort((a,b)=>a.y-b.y);
 for(const b of blobs){const g=grad(c,b.x-b.s,b.y-b.s,2*b.s,2*b.s,pink?['#d8b2a3','#b97e87','#715661']:['#9ca876','#68855e','#355e49']);oval(c,b.x,b.y,b.s,b.s*.7,g);for(let j=0;j<12;j++){const xx=b.x+(r()-.5)*b.s*1.5,yy=b.y+(r()-.5)*b.s;oval(c,xx,yy,1.5+r()*2.5,.8+r(),pink?(j%3?'#e6bdab':'#f0d4b5'):(j%3?'#a7b98499':'#c4c49a99'))}}
 for(let i=0;i<6;i++){line(c,-3+i*1.3,-size*.65,-5+i*2,5,'#c5ad7b55',.6)}
 if(type==='planter'){poly(c,[[-23,0],[23,0],[18,22],[-18,22]],grad(c,-23,0,46,22,['#bdac82','#a0875d','#6b6949']),'#746c48');oval(c,0,0,24,5,'#c9bb92');oval(c,0,0,19,3,'#526b49');}
 }
 function cart(c){shadow(c,5,6,57,13);for(let xx of [-50,50]){oval(c,xx,2,8,25,'#3c3e2e','#9b9065',2);oval(c,xx,2,4,19,'#746743');for(let j=0;j<6;j++){let a=j*Math.PI/3;line(c,xx,2,xx+Math.cos(a)*5,2+Math.sin(a)*19,'#b5a16e',1)}}wood(c,-46,-24,92,48);for(let xx=-35;xx<40;xx+=15)line(c,xx,-24,xx,24,'#5d4d31',1);for(let yy of [-21,18])wood(c,-48,yy,96,5,true);for(let xx of [-30,30])wood(c,xx,25,4,35,true,true);Game.BronzeBell.paint(c,0,-7,.43)}
 function boat(c){shadow(c,6,3,42,75);c.beginPath();c.moveTo(0,-88);c.bezierCurveTo(48,-61,49,60,0,91);c.bezierCurveTo(-42,61,-44,-57,0,-88);c.closePath();c.fillStyle=grad(c,-40,-80,80,170,['#b49b6e','#8e734b','#4d4e36']);c.fill();c.strokeStyle='#4d4b31';c.lineWidth=3;c.stroke();c.save();c.clip();for(let yy=-68;yy<70;yy+=14){line(c,-30,yy,30,yy,'#d8bc8777',1);line(c,-30,yy+3,30,yy+3,'#55482e',1)}c.restore();oval(c,0,0,28,68,null,'#75623f',4);line(c,-24,29,55,-28,'#ad9261',5);line(c,-25,28,55,-29,'#e1c48f',1);poly(c,[[50,-32],[72,-48],[77,-42],[55,-23]],'#c9aa72','#927d50')}
 function decoration(c,d){c.save();c.translate(d.x,d.y);const t=d.type;
 if(t==='tree'||t==='planter')tree(c,d);else if(t==='bell')Game.BronzeBell.paint(c,0,-12,.77);else if(t==='lantern'||t==='lamp')lantern(c,0,0);else if(t==='urn')vessel(c,0,0,1);else if(t==='boat')boat(c);else if(t==='cart')cart(c);else if(t==='drum'){shadow(c,3,15,28,10);for(let xx of [-20,20])wood(c,xx,-2,5,26,true,true);oval(c,0,0,27,21,grad(c,-27,-10,54,34,['#b17a4e','#7c4732','#4d3729']),'#5c442d');oval(c,0,-13,27,19,grad(c,-27,-30,54,38,['#e1d4b0','#b9ae88','#8f8f6b']),'#846c45',2);for(let i=0;i<16;i++){let a=i*Math.PI/8;oval(c,Math.cos(a)*25,-13+Math.sin(a)*17,1.1,1.1,'#c3ae76')}}
 else if(t==='banner'){wood(c,-2,-76,4,86,true,true);poly(c,[[0,-74],[43,-70],[39,-19],[2,-25]],grad(c,0,-72,43,55,['#b47e54','#954d36','#5d3729']),'#745436');for(let j=0;j<3;j++){line(c,8+j*9,-64,14+j*8,-30,'#b98c5666',1)}poly(c,[[10,-54],[21,-62],[32,-52],[21,-40]],'none','#d1ac6e',1.2)}
 else if(t==='fence'){for(let xx=-50;xx<60;xx+=22)wood(c,xx,-30,5,45,true,true);wood(c,-54,-17,118,5);wood(c,-54,-3,118,4)}
 else if(t==='sign'){wood(c,-3,-3,6,33,true,true);wood(c,-30,-26,60,30);for(let yy=-18;yy<-6;yy+=5)line(c,-18,yy,18,yy,'#65583c',.9);for(let xx of [-25,25])oval(c,xx,-12,1.2,1.2,'#4d563f')}
 else if(t==='table-small')table(c,-35,-22,70,40);else if(t==='mold'){crate(c,-27,-15,54,31);oval(c,0,-8,19,12,'#81937a','#b7bc99',1);oval(c,0,-8,12,7,'#415e4b','#9da680',1)}else crate(c,-25,-21,50,38);c.restore();}
 function ground(c,scene){const id=scene.sceneId,r=rnd(337),inside=(x,y)=>scene.buildings.some(b=>x>b.x-14&&x<b.x+b.w+14&&y>b.y-10&&y<b.y+b.h+18),interior=id==='palace'||id==='future';
 box(c,30,30,1740,1140,grad(c,30,30,1740,1140,interior?['#b1b69b','#929f88','#6d8976']:['#dad3b8','#b9c0a2','#96a88b']));
 if(interior){for(let y=37;y<1160;y+=72)for(let x=38;x<1760;x+=100)slab(c,x,y,96,68,x+y);if(id==='palace'){
 box(c,52,35,1696,80,grad(c,52,35,1696,80,['#817752','#4b5240','#2c4137']));for(let x=85;x<1700;x+=150){wood(c,x,47,80,47,true);box(c,x+6,53,68,33,'#b59c65');line(c,x+39,53,x+39,85,'#5d5638',2)}
 box(c,747,337,306,803,grad(c,747,337,306,803,['#a7754c','#8f5036','#5e392b']));for(let xx of [755,1044]){line(c,xx,340,xx,1137,'#c8b27b',2);line(c,xx+3,341,xx+3,1137,'#5a442b',.8)}
 for(let y=392;y<1110;y+=96){poly(c,[[900,y-18],[928,y],[900,y+18],[872,y]],'#b4945966','#c5a96b99',.65);oval(c,900,y,7,4,'#ddc38855');for(let xx of [767,1033])for(let j=0;j<4;j++)line(c,xx-2,y-14+j*6,xx+2,y-11+j*6,'#c5ae7980',.7)}
 for(let yy=140;yy<1120;yy+=165){poly(c,[[65,yy],[310,yy+90],[310,yy+125],[65,yy+44]],'#fff1c615');poly(c,[[1735,yy],[1490,yy+90],[1490,yy+125],[1735,yy+44]],'#fff1c610')}
 }else for(let xx of [70,1730]){line(c,xx,70,xx,1120,'#d2dcc1',5);line(c,xx+9,70,xx+9,1120,'#5e8a7b',1.5)}}
 else if(id==='overworld'){
 for(let i=0;i<13;i++){const x=i*145;poly(c,[[x-100,155],[x+40,25+i%3*27],[x+210,155]],grad(c,x,20,200,140,['#4b7667','#70917a','#9cae88']));}
 c.beginPath();c.moveTo(1750,120);c.bezierCurveTo(1570,360,1770,510,1660,750);c.bezierCurveTo(1660,1000,1630,1100,1400,1180);c.strokeStyle='#466f62';c.lineWidth=81;c.stroke();c.strokeStyle='#427f82';c.lineWidth=64;c.stroke();c.strokeStyle='#7da99b';c.lineWidth=20;c.stroke();
 const nodes=Game.WorldPlaces.map(p=>({x:p.x+p.w/2,y:p.y+p.h+155}));for(let n=0;n<nodes.length;n++){const a=nodes[n],b=nodes[(n+1)%nodes.length];c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,a.y);c.lineTo(b.x,b.y);c.lineJoin='round';c.strokeStyle='#667655';c.lineWidth=48;c.stroke();c.strokeStyle='#c0ac7f';c.lineWidth=35;c.stroke()}}
 else{const routes={workshop:[[900,1140],[900,980],[1100,870],[1230,550],[550,540],[180,740]],road:[[70,760],[570,760],[1030,650],[1330,600],[1700,760]],ritual:[[900,1130],[570,930],[820,670],[1120,540],[1630,540],[1630,60],[900,60]],dig:[[70,760],[620,650],[1180,930],[1620,930],[1620,90],[900,90]]};const pts=routes[id]||[[70,760],[900,760],[1700,760]];c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineJoin='round';c.lineCap='round';c.strokeStyle='#807d6040';c.lineWidth=115;c.stroke();c.strokeStyle='#d2c7a5';c.lineWidth=94;c.stroke();}
 if(!interior){for(let i=0;i<2300;i++){const x=40+r()*1720,y=40+r()*1120;if(inside(x,y)||(id!=='overworld'&&((x>747&&x<1050)||(y>665&&y<867))))continue;const g=r();line(c,x,y,x-2+r()*4,y-3-r()*4,g>.5?'#c3c79c6b':'#3f724e88',.6);if(i%31===0){for(let k=0;k<3;k++)oval(c,x+k*3,y-k%2*3,1.8,1.2,'#dccab077')}}}
 flecks(c,32,32,1736,1136,67,4200);box(c,0,0,1800,25,'#425b49');box(c,0,1175,1800,25,'#425b49');box(c,0,0,25,1200,'#425b49');box(c,1775,0,25,1200,'#425b49');
 }
 const questCache=new Map();function quest(c,o){if(o.type==='bell')return false;let img=questCache.get(o.type);if(!img){img=document.createElement('canvas');img.width=240;img.height=200;const q=img.getContext('2d');q.scale(2,2);q.translate(60,72);table(q,-40,-23,80,38,false);if(o.type==='letter'){poly(q,[[-25,-30],[23,-32],[26,-6],[-24,-4]],grad(q,-25,-30,50,26,['#f2e2b4','#c5b080']),'#9a865b');line(q,-25,-30,0,-13,'#ac986e',.8);line(q,23,-32,0,-13,'#ac986e',.8);oval(q,0,-12,4,3,'#9b5740','#c9996a',.7)}else if(o.type==='mold'){box(q,-27,-29,54,27,grad(q,-27,-29,54,27,['#b8b79a','#81927b','#526b57']),'#657856');q.beginPath();q.moveTo(-21,-15);q.quadraticCurveTo(0,-32,21,-15);q.quadraticCurveTo(0,2,-21,-15);q.fillStyle='#415f4c';q.fill();q.strokeStyle='#bdc1a0';q.lineWidth=1;q.stroke()}else{paper(q,-27,-29,33,25,true);paper(q,8,-25,22,22);oval(q,27,-5,5,3,'#405a45','#a6b285',.7)}questCache.set(o.type,img)}c.drawImage(img,-60,-72,120,100);return true;}
 return{building,decoration,ground,quest};
})();
