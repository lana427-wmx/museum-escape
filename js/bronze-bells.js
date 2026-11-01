/* 共用编钟绘制模型：Canvas 场景与 SVG 展柜/试音图使用相同器形。
 * 以馆方形制资料为参考的游戏插画；纹饰与铭文区为概括，不是原件测绘复原。 */
Game.BronzeBell=(()=>{
 let serial=0;const cache=new Map();
 const body=[['M',-25,-38],['Q',-27,-12,-31,17],['L',-38,48],['Q',-22,58,0,62],['Q',24,57,38,47],['L',31,16],['Q',27,-12,25,-38],['Q',0,-47,-25,-38],['Z']];
 const mouth=[['M',-38,48],['Q',0,67,38,47],['Q',26,60,0,65],['Q',-25,61,-38,48],['Z']];
 function seed(n){return()=>{n=(Math.imul(n,1664525)+1013904223)|0;return(n>>>0)/4294967296}}
 function model(a,detailed=true){
 // A ridged shoulder, long yong, heavy lower rim and a flattened almond-like mouth.
 a.path([['M',-5,-72],['L',5,-72],['L',7,-38],['L',-7,-38],['Z']],'handle','#363a2d',.8);
 a.ellipse(0,-72,5,2,'rim','#413f2e',.6);a.rect(-6,-58,12,3,'rim');a.rect(-7,-43,14,4,'rim');
 a.path([['M',3,-61],['Q',17,-63,16,-52],['Q',15,-47,7,-47]],'none','#a39861',2.3);
 a.path(body,'metal','#262e27',1.1);
 a.path([['M',19,-38],['Q',23,1,28,29],['L',36,47],['Q',28,53,19,54],['Q',24,9,16,-38],['Z']],'side',null);
 // Mottled mineral patina and small casting pits sit within the body silhouette.
 const r=seed(531);for(let i=0;i<(detailed?115:26);i++){let y=-28+r()*72,x=(r()-.5)*(48+Math.max(0,y)*.23);a.ellipse(x,y,.4+r()*2,.25+r()*1.7,i%4?'#82a48c24':'#a59b6233');}
 a.path([['M',-24,-33],['Q',0,-38,24,-33],['M',-26,-26],['Q',0,-31,26,-26]],'none','#b2a269',1);
 a.path([['M',-32,20],['Q',0,26,32,20],['M',-34,30],['Q',0,36,34,30]],'none','#b2a269',1.2);
 // Raised mei: three by three on each half of the visible face.
 for(let sign of [-1,1])for(let row=0;row<3;row++)for(let col=0;col<3;col++){
 const x=sign*(10+col*7),y=-18+row*12;
 a.ellipse(x+1.1,y+1.4,3.1,2.7,'#202b27bb');a.ellipse(x,y,2.8,2.9,'boss','#404632',.45);
 a.ellipse(x-.75,y-.9,1.2,.85,'#c3b67a99');a.ellipse(x+.55,y+.6,1.25,1.55,'#485d4699');}
 a.path([['M',-4,-31],['L',-5,48],['M',4,-31],['L',5,48]],'none','#b2a06499',.8);
 // Stylized relief bands; no invented readable historical inscription.
 for(let sign of [-1,1])for(let j=0;j<6;j++){let x=sign*(8+j*4.2);a.path([['M',x,25],['L',x+sign*2,24],['L',x+sign*2,29],['L',x,29],['L',x,32]],'none','#c1b17c77',.65)}
 for(let j=0;j<9;j++){let y=-25+j*6;a.path([['M',-1.8,y],['L',1.3,y+1],['M',0,y-1],['L',0,y+3]],'none','#c2ad7180',.5)}
 a.path([['M',-25,-35],['Q',-27,6,-35,46]],'none','#c9bc7c99',.8);
 a.path([['M',25,-35],['Q',28,11,36,45]],'none','#152a25aa',1.4);
 a.path(mouth,'#1c2925','#726c48',.9);a.path([['M',-36,48],['Q',0,65,36,47]],'none','#c1b076',1.35);
 a.path([['M',-28,46],['Q',0,55,29,45]],'none','#b5a46b88',.8);
 }
 function trace(c,p){c.beginPath();for(const v of p){if(v[0]==='M')c.moveTo(v[1],v[2]);else if(v[0]==='L')c.lineTo(v[1],v[2]);else if(v[0]==='Q')c.quadraticCurveTo(...v.slice(1));else c.closePath()}}
 function canvasAdapter(c){const grad=(a,b,stops)=>{const g=c.createLinearGradient(a,-20,b,30);stops.forEach(([n,color])=>g.addColorStop(n,color));return g};
 const fills={metal:grad(-38,38,[[0,'#333e32'],[.22,'#89906a'],[.43,'#766e48'],[.66,'#505e45'],[1,'#233d32']]),handle:grad(-6,6,[[0,'#313d30'],[.4,'#b0a36b'],[1,'#49563a']]),rim:grad(-20,20,[[0,'#484b32'],[.4,'#bbac73'],[1,'#586446']]),side:grad(16,38,[[0,'#59745a88'],[1,'#1f342bd9']]),boss:grad(-25,25,[[0,'#b5a46c'],[.4,'#83845b'],[1,'#5d7153']])};
 const finish=(fill,stroke,width)=>{if(fill&&fill!=='none'){c.fillStyle=fills[fill]||fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width||1;c.stroke()}};
 return{path(p,f,s,w){trace(c,p);finish(f,s,w)},ellipse(x,y,rx,ry,f,s,w){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);finish(f,s,w)},rect(x,y,w,h,f){c.fillStyle=fills[f]||f;c.fillRect(x,y,w,h)}};}
 function paint(c,x,y,scale=1){let img=cache.get('bell');if(!img){img=document.createElement('canvas');img.width=216;img.height=300;const q=img.getContext('2d');q.scale(2,2);q.translate(54,78);q.lineJoin='round';q.lineCap='round';model(canvasAdapter(q));cache.set('bell',img)}c.drawImage(img,x-54*scale,y-78*scale,108*scale,150*scale);}
 function pathData(p){return p.map(v=>v.join(' ')).join(' ')}
 function svgAdapter(id){const parts=[],value=f=>['metal','handle','rim','side','boss'].includes(f)?'url(#'+id+'-'+f+')':f;
 const attrs=(f,s,w)=>' fill="'+value(f||'none')+'"'+(s?' stroke="'+s+'" stroke-width="'+(w||1)+'"':'');
 return{parts,path(p,f,s,w){parts.push('<path d="'+pathData(p)+'"'+attrs(f,s,w)+'/>')},ellipse(x,y,rx,ry,f,s,w){parts.push('<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'"'+attrs(f,s,w)+'/>')},rect(x,y,w,h,f){parts.push('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+value(f)+'"/>')}};}
 function defs(id){return '<defs>'+[['metal',['#333e32','#93936c','#776f49','#495e44','#233b30']],['handle',['#36402e','#b0a46b','#4e5a3d']],['rim',['#4e5035','#bfae74','#5b6444']],['side',['#587658','#1f342b']],['boss',['#c1af73','#697b56']]].map(([name,colors])=>'<linearGradient id="'+id+'-'+name+'" x1="0" x2="1">'+colors.map((v,i)=>'<stop offset="'+i/(colors.length-1)+'" stop-color="'+v+'"/>').join('')+'</linearGradient>').join('')+'</defs>'}
 function single({marks=false,decorative=false}={}){const id='bronze-'+(++serial),a=svgAdapter(id);model(a);return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-56 -84 112 160" '+(decorative?'aria-hidden="true"':'role="img" aria-label="青铜编钟插画，呈现甬、枚、钟口厚边和斑驳铜锈"')+'>'+defs(id)+'<g stroke-linejoin="round">'+a.parts.join('')+'</g>'+(marks?'<g font-family="Microsoft YaHei,sans-serif" font-size="8" text-anchor="middle"><circle cx="-1" cy="42" r="7" fill="#edcd87" stroke="#7c6038" stroke-width=".6"/><text x="-1" y="45" fill="#284d3b">①</text><circle cx="29" cy="36" r="7" fill="#a6d4c3" stroke="#497467" stroke-width=".6"/><text x="29" y="39" fill="#284d3b">②</text></g>':'')+'</svg>'}
 function rackPaint(c,x,y,w,h){c.save();c.translate(x,y);c.scale(w/700,h/195);c.lineJoin='round';
 const beam=(x1,y1,x2,y2,width,color)=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke()};
 for(let xx of [18,665]){beam(xx,2,xx,182,13,'#45382b');beam(xx-2,3,xx-2,180,3,'#b39b66');c.fillStyle='#767e52';c.fillRect(xx-12,167,24,18)}
 for(let row=0;row<3;row++){const yy=12+row*56;beam(7,yy,682,yy,12,'#4d3629');beam(7,yy-3,682,yy-3,2,'#bfa06a');const n=15-row*4,spacing=615/n;
 for(let i=0;i<n;i++){const xx=43+(i+.5)*spacing,sc=.20+row*.085+(n-i)*.002;beam(xx,yy+4,xx,yy+12,1.1,'#9d946b');paint(c,xx,yy+12+74*sc,sc)}}c.restore();}
 function rackSVG(){const id='rack-'+(++serial),a=svgAdapter(id);model(a,false);let groups='';
 for(let row=0;row<3;row++){let yy=42+row*67,n=12-row*3;groups+='<path d="M35 '+yy+' H670" stroke="#4a3429" stroke-width="12"/><path d="M35 '+(yy-3)+' H670" stroke="#b99c65" stroke-width="2"/>';for(let i=0;i<n;i++){const x=58+(i+.5)*588/n,sc=.25+row*.09+(n-i)*.002;groups+='<path d="M'+x+' '+yy+'v10" stroke="#a89c72" stroke-width="1.2"/><g transform="translate('+x+' '+(yy+8+74*sc)+') scale('+sc+')">'+a.parts.join('')+'</g>'}}
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" aria-label="三层钟架与大小相次的编钟艺术示意，非六十五件逐件复原">'+defs(id)+'<ellipse cx="354" cy="268" rx="325" ry="15" fill="#11282033"/><g stroke-linecap="round"><path d="M39 35V257M668 35V257" stroke="#473a2b" stroke-width="15"/><path d="M36 35V257M665 35V257" stroke="#b8a16b" stroke-width="3"/><path d="M28 260h24M656 260h24" stroke="#6a7450" stroke-width="12"/>'+groups+'</g></svg>'}
 return{paint,single,rackPaint,rackSVG};
})();
