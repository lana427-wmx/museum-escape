(()=>{
const G=Game;G.AgentSprite=new Image();G.AgentSprite.src="assets/agent-bw.png";
// Remove the archaeology branch after legacy map initialization has finished.
const oldSteps=[...G.BellsContent.steps];
G.BellsContent.steps.splice(0,G.BellsContent.steps.length,...oldSteps.filter(q=>q.scene!=='dig'));
G.WorldPlaces=G.WorldPlaces.filter(p=>p.id!=='dig');
G.Maps.overworld.exits=G.Maps.overworld.exits.filter(e=>e.target!=='dig');
const ritualPlace=G.WorldPlaces.find(p=>p.id==='ritual');
G.Maps.ritual.exits=G.Maps.ritual.exits.map(e=>({x:e.x,y:e.y,w:e.w,h:e.h,get target(){return G.BellsQuest.current()?.scene==='future'?'future':'overworld'},label:'离殿 · 完成修复后返回展馆',get spawn(){return this.target==='future'?{...G.Maps.future.spawnPoint}:{...ritualPlace.returnPoint}}}));
const depart=G.Navigation.departure;
G.Navigation.departure=id=>id==='ritual'?(G.BellsQuest.current()?.scene==='future'?{id:'future',position:{...G.Maps.future.spawnPoint}}:{id:'overworld',position:{...ritualPlace.returnPoint}}):depart(id);
delete G.Maps.dig;
const load=G.Store.load,migrationSave=G.Store.save;
G.Store.load=()=>{const s=load();if(!s.agentEdition){s.agentEdition=true;const q=s.bellsQuest;if(q){const old=oldSteps[q.step];q.step=old?.scene==='dig'?G.BellsContent.steps.findIndex(x=>x.id==='curator'):old?G.BellsContent.steps.findIndex(x=>x.id===old.id):G.BellsContent.steps.length;}if(s.currentScene==='dig'){s.currentScene='future';s.playerPosition={...G.Maps.future.spawnPoint}}s.visitedScenes=(s.visitedScenes||[]).filter(x=>x!=='dig');migrationSave(s)}return s};
const modal=G.UI.modal,close=G.UI.close;
let anchor=null,seenNpc=null;
G.UI.close=()=>{anchor=null;document.getElementById('overlay').classList.remove('agent-conversation');close()};
G.UI.modal=(title,body)=>{modal(title,body);const talk=body.includes('speaker-card')||body.includes('repeat-close');document.getElementById('overlay').classList.toggle('agent-conversation',talk);if(talk){anchor=G.Scene.scene.npcList.find(n=>Math.hypot(n.x-G.Scene.player.x,n.y-G.Scene.player.y)<130)||G.BellsQuest.entity();}else anchor=null;};
const update=G.BellsQuest.update;
G.BellsQuest.update=dt=>{update(dt);const scene=G.Scene.scene,p=G.Scene.player;if(!scene||!p)return;const goal=G.BellsQuest.current()?.scene===scene.sceneId?G.BellsQuest.entity():null;const npc=[...(goal?[goal]:[]),...scene.npcList].find(n=>Math.hypot(n.x-p.x,n.y-p.y)<105);if(!npc)seenNpc=null;if(npc&&!G.UI.isOpen()&&seenNpc!==scene.sceneId+':'+npc.id){seenNpc=scene.sceneId+':'+npc.id;G.BellsQuest.interact()}if(anchor){const v=G.Scene.view,box=document.querySelector('.dialog');if(box&&v){box.style.left=Math.max(16,Math.min(v.w-440,(anchor.x-v.camX)*v.zoom+45))+'px';box.style.top=Math.max(80,Math.min(v.h-280,(anchor.y-v.camY)*v.zoom-180))+'px'}}};
const profile=`<h1>文明安全局 · 外勤特工档案</h1><p>你隶属于文明安全局，是一名时空特工。</p><p>每一件文物都绑定着专属的历史碎片。名为【伪影】的异常力量将历史线索打散、遮蔽、封存，让文明记忆逐渐残缺。</p><h2>你的外勤任务</h2><p>穿越时序通道，寻找散落的史实线索，破解文物谜题，重新拼合文明记录。</p><h2>时序禁令</h2><p>禁止干预原生历史走向。馆藏知识以资料来源为准；特工、伪影、护送任务及人物交流属于游戏叙事演绎，不作为史实。</p><p>修复未完成，文明记录仍保持残缺；任务失败时启动回溯撤离，可重新开始。</p><button id="agent-accept">接受外勤协议｜进入时序通道</button>`;
function briefing(){modal('外勤档案',profile);document.querySelector('.dialog').classList.add('agent-profile');document.getElementById('agent-accept').onclick=G.UI.close}
for(const key of ['login','register']){const fn=G.Auth[key];G.Auth[key]=async(...args)=>{const r=await fn(...args);setTimeout(briefing,350);return r}}
function launch(restart=false){if(!G.Auth.current()){G.UI.auth();return}modal('曾侯乙编钟 · 外勤任务',`<h1>时空特工，身份校验通过</h1><p>时序通道解锁。</p><p>警报：【曾侯乙编钟历史碎片】遭到伪影侵袭，历史线索破损封存。</p><p>搜寻器形、赠钟铭文、编悬与双音线索，破解文物谜题，复原文明记录。</p><p>时序禁令：不改写历史、不搬走历史原件。剧情演绎与馆藏事实请区分阅读。</p><p>完成标准：四类档案复原并交还展馆。未完成可回溯重试。</p><button id="agent-launch">跃迁启动，保持时序稳定</button>`);document.querySelector('.dialog').classList.add('agent-profile');document.getElementById('agent-launch').onclick=()=>{G.Scene.stop();const s=G.Store.load();if(restart){s.bellsQuest=G.BellsQuest.fresh();s.bellsOpeningSeen=false;}s.bellsOpeningSeen=true;G.Store.save(s);G.Router.go('map','palace')}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-agent-restart]');const entry=e.target.closest('.exhibit [data-go="map"]');if(b||entry){e.preventDefault();e.stopImmediatePropagation();launch(!!b)}},true);
const hall=G.Museum.hall;G.Museum.hall=id=>hall(id).replace(/(<button class="primary" data-go="map" data-id="palace">)/,'<button data-agent-restart>重新开始此副本</button>$1');
const page=G.Scene.page;G.Scene.page=id=>page(id).replace('<div class="world-buttons">','<div class="world-buttons"><button data-agent-restart>重启编钟副本</button>');
document.addEventListener('click',e=>{if(!document.getElementById('overlay').classList.contains('agent-conversation')||e.target.closest('button,input,select,a'))return;document.getElementById('dialogue-next')?.click();document.getElementById('repeat-close')?.click()});
G.Agent={launch,briefing,completed(){modal('任务完成','<h1>任务完成</h1><p>文明记录已复原。正在返回副本入口。</p>');G.FX.play('victory');setTimeout(()=>G.Router.go('hall','zeng'),2600)}};
})();

