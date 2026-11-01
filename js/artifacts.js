Game.Halls=[
 {id:'zeng',name:'曾国礼乐馆',subtitle:'金石之声 · 礼乐之邦',intro:'在钟、尊与鹤的轮廓中，认识曾国的青铜工艺与礼乐文化。进入曾侯乙编钟篇，循线索访工坊、辨铭文、习钟乐，完成约5–10分钟的时空研学。'},
 {id:'chu',name:'楚风遗韵馆',subtitle:'凤舞楚天 · 漆彩流光',intro:'剑的纹理、鸟的造型与漆器的色彩，共同构成楚地丰富的视觉语言。'},
 {id:'qin',name:'秦简遗墨馆',subtitle:'竹简方寸 · 法与日常',intro:'以睡虎地秦简的不同内容为专题，观察文字如何记录制度、生活与时间。'},
 {id:'ming',name:'王府珍藏馆',subtitle:'金玉交辉 · 明代风华',intro:'以梁庄王墓出土器物为线索，浏览明代金玉工艺。本原型按主题组织展陈。'}
];
Game.Artifacts=[
 ['bells','zeng','曾侯乙编钟','战国早期','bell','成组青铜乐器，1978 年出土于曾侯乙墓。其铭文与音律信息是研究先秦礼乐的重要资料。','https://www.hbww.org.cn/zgzb/p/4695.html'],
 ['vessel','zeng','曾侯乙尊盘','战国早期','vessel','尊与盘相配合，繁复的透空装饰体现了先秦青铜工艺的创造力。','https://www.hbww.org.cn/zgzb/p/6911.html'],
 ['crane','zeng','鹿角立鹤','战国早期','bird','鹤形与鹿角结合的青铜造型，呈现了古人富于想象的器物设计。','https://hbww.org.cn/zhy/index.html'],
 ['sword','chu','越王勾践剑','春秋晚期','sword','剑身装饰几何纹样，铭文为研究其主人与制作背景提供了重要线索。','https://www.hbww.org.cn'],
 ['drum','chu','虎座鸟架鼓','战国','drum','双虎承座、双鸟支架与悬鼓相结合，是楚地漆木艺术的重要代表。','https://www.hbww.org.cn/qmq/p/4966.html'],
 ['lacquer','chu','彩绘人物车马出行图','战国','panel','漆器上的人物与车马图像，使出行场面成为可观察的历史图像资料。','https://www.hbww.org.cn'],
 ['qin-law','qin','睡虎地秦简 · 秦律','秦代','scroll','竹简保存了秦代法律相关内容，为了解早期制度史提供了材料。','https://www.hbww.org.cn'],
 ['qin-day','qin','睡虎地秦简 · 日书','秦代','scroll','日书反映了当时人们安排生活与理解时间的方式。本展柜为内容专题。','https://www.hbww.org.cn'],
 ['qin-record','qin','睡虎地秦简 · 编年记','秦代','scroll','按年代记述的简文连接个人经历与历史事件。本展柜为内容专题。','https://www.hbww.org.cn'],
 ['gold','ming','梁庄王墓 · 金器','明代','crown','以墓葬出土金器为主题，观察锤揲、镶嵌等工艺形成的器物装饰。','https://www.hbww.org.cn'],
 ['jade','ming','梁庄王墓 · 玉器','明代','jade','玉器的形制、纹样与佩用方式，为理解明代王府生活提供观察角度。','https://www.hbww.org.cn'],
 ['jewels','ming','梁庄王墓 · 宝石饰件','明代','jewel','以宝石饰件为主题，认识明代器物中的材料与装饰。本展柜为专题示意。','https://www.hbww.org.cn']
].map(([id,hall,name,era,kind,description,source])=>({id,hall,name,era,kind,description,source}));
Game.Collection={isUnlocked(id){return Game.Store.load().collectedArtifacts.includes(id)},unlock(id){const s=Game.Store.load();if(id!=='bells'||!s.bellsQuest?.completed)return {ok:false,reason:'完成曾侯乙编钟的礼乐档案后解锁。'};if(!s.collectedArtifacts.includes(id))s.collectedArtifacts.push(id);return {ok:Game.Store.save(s)}}};
Game.Artwork=function(kind){
 if(kind==='bell'&&Game.BronzeBell)return Game.BronzeBell.rackSVG();
 const bell=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-7 -24v-12h14v12M-22 -22Q-25 0 -34 34Q0 48 34 34Q25 0 22 -22Z" fill="#738d80" stroke="#c2af7d" stroke-width="2"/><path d="M-23 -8h46M-28 22h56M-4 -20v55" stroke="#c1b184" opacity=".7"/>${[-16,16].map(x=>[-10,3,16].map(y=>`<circle cx="${x}" cy="${y}" r="3" fill="#b5a577"/>`).join('')).join('')}</g>`;
 const patterns={bell:`<path d="M35 210V58H285V210M26 62h268M38 118h245" stroke="#795b44" stroke-width="12"/>${[65,113,161,209,257].map(x=>bell(x,95,.48)).join('')}${[70,130,190,250].map(x=>bell(x,160,.7)).join('')}`,
 vessel:'<ellipse cx="160" cy="203" rx="105" ry="19" fill="#677c70" stroke="#bca878"/><path d="M108 72Q125 112 105 166Q160 193 215 166Q195 112 212 72Z" fill="#698071" stroke="#bba477" stroke-width="3"/><ellipse cx="160" cy="72" rx="65" ry="16" fill="none" stroke="#bba477" stroke-width="8"/><path d="M113 111h94M115 152h90" stroke="#c7ad76" stroke-width="5"/>',
 sword:'<g transform="rotate(28 160 130)"><path d="M151 45L160 12L169 45L173 173L160 187L147 173Z" fill="#849d8a" stroke="#c4b080" stroke-width="3"/><path d="M160 27v153M152 60l16 16-16 16 16 16-16 16 16 16" stroke="#c9b17e" fill="none"/><path d="M134 184h52M160 187v47M149 236h22" stroke="#a88951" stroke-width="9"/></g>',
 scroll:`${Array.from({length:12},(_,i)=>`<rect x="${48+i*19}" y="55" width="17" height="150" rx="4" fill="${i%2?'#b49769':'#c4ac7b'}"/><path d="M${55+i*19} 74v110" stroke="#655240" stroke-width="3" stroke-dasharray="7 6"/>`).join('')}<path d="M44 84h233M44 178h233" stroke="#4c3d31" stroke-width="3"/>`,
 bird:'<path d="M139 194l7-82q-30-27-9-55q30-15 35 12l-15 12 17 40q26 37-15 38l-7 35M156 66l-26-22-10-23M131 44l-20-3M155 64l24-29 5-20M178 38l19-10" fill="none" stroke="#8e9c7e" stroke-width="10"/><ellipse cx="152" cy="204" rx="43" ry="9" fill="#657a68"/>',
 drum:'<path d="M63 205L86 61L117 88M257 205L234 61L202 88" stroke="#8f4b3c" stroke-width="15" fill="none"/><circle cx="160" cy="133" r="53" fill="#b6a174" stroke="#794b3b" stroke-width="12"/><path d="M87 84h146M44 211h73M203 211h73" stroke="#b7a06a" stroke-width="9"/>',
 panel:'<rect x="38" y="66" width="244" height="134" rx="8" fill="#673e32" stroke="#bd9264" stroke-width="5"/><path d="M55 160l30-40 30 32 35-35 30 40 35-32 50 35M55 95h210" stroke="#d5b48a" fill="none" stroke-width="6"/>',
 crown:'<path d="M65 191L54 94L110 126L160 52L210 126L266 94L255 191Z" fill="#b99a5e" stroke="#e4cca1" stroke-width="3"/><path d="M65 173h190" stroke="#80663e" stroke-width="8"/><circle cx="160" cy="140" r="16" fill="#6b8c82"/>',
 jade:'<circle cx="160" cy="130" r="79" fill="#9fb7a2" stroke="#d8d5ae" stroke-width="4"/><circle cx="160" cy="130" r="26" fill="#172f32"/><circle cx="160" cy="130" r="61" fill="none" stroke="#d0d2ad" stroke-width="5" stroke-dasharray="6 9"/>',
 jewel:'<path d="M100 60h120l40 70-100 84L60 130Z" fill="#628980" stroke="#c6b47f" stroke-width="5"/><path d="M100 60l60 154 60-154M60 130h200M100 60l60 70 60-70" stroke="#abc1b1" fill="none" stroke-width="2"/>'};
 return `<svg viewBox="0 0 320 260" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><ellipse cx="160" cy="224" rx="110" ry="12" fill="#081b20" opacity=".4"/>${patterns[kind]||patterns.vessel}</svg>`;
};
