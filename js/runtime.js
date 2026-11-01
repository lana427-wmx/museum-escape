/* 运行保障：不依赖远程服务，错误记录有上限，场景图片按需载入。 */
Game.Diagnostics = (() => {
  const logs=[]; let last='';
  function report(message, detail='') {
    logs.push({at:new Date().toISOString(),message,detail:String(detail).slice(0,300)});
    if(logs.length>40)logs.shift();
    console.warn(message,detail);
    if(last===message)return;last=message;
    if(Game.UI)Game.UI.toast(message);
    else document.addEventListener('DOMContentLoaded',()=>{
      if(!document.getElementById('app').children.length)document.getElementById('app').innerHTML='<section class="error-page"><h1>页面资源未完整载入</h1><p>请确认整个游戏文件夹都在，再刷新重试。</p><button onclick="location.reload()">重新载入</button></section>';
    },{once:true});
  }
  window.addEventListener('error',e=>{
    if(e.target!==window){const t=e.target;if(t.tagName==='SCRIPT'||t.tagName==='LINK')report('部分页面资源未能载入，请刷新重试。',t.src||t.href);else if(t.tagName==='IMG')report('图片未能载入，已保留文字与操作。',t.src);return;}
    report('遇到运行异常，已暂停操作；可从首页重新进入。',e.message);Game.Player?.clear();Game.Challenge?.pauseOnError();Game.Expeditions?.pauseOnError();
  },true);
  window.addEventListener('unhandledrejection',e=>{e.preventDefault();report('操作未完成，请重试；已有档案仍保留。',e.reason?.message||e.reason);Game.Player?.clear();Game.Challenge?.pauseOnError();Game.Expeditions?.pauseOnError();});
  return Object.freeze({report,entries:()=>logs.map(x=>({...x}))});
})();

Game.Resources=(()=>{
  const pending=new Map(),used=[],records=[];
  function image(url){return new Promise(resolve=>{const im=new Image(),start=performance.now();let settled=false;
    const done=ok=>{if(settled)return;settled=true;clearTimeout(timer);im.onload=im.onerror=null;records.push({url,ok,ms:Math.round(performance.now()-start)});if(records.length>40)records.shift();resolve(ok?im:null)};
    const timer=setTimeout(()=>done(false),8000);im.onload=()=>done(true);im.onerror=()=>done(false);im.src=url;
  });}
  async function scene(id){
    if(!Game.Maps[id])return;
    if(pending.has(id))return pending.get(id);
    const p=(async()=>{
      let im=await image('assets/extensions/'+id+'.png');
      if(im)Game.Scenery.images[id]=im;
      else {Game.Diagnostics.report('外围画卷未能载入，正在使用基础场景。',id);im=await image('assets/'+id+(id==='palace'||id==='workshop'?'-wmx2':'-wmx3')+'.png');if(im)Game.SceneImages[id]=im;else Game.Diagnostics.report('场景插画缺失，已启用可操作的简绘场景。',id);}
      used.push(id);
      // 最多保留两张已解码的场景图；其余交给浏览器 HTTP 缓存。
      while(used.length>2){const old=used.shift();delete Game.Scenery.images[old];delete Game.SceneImages[old];pending.delete(old);}
    })();pending.set(id,p);return p;
  }
  function metrics(){const nav=performance.getEntriesByType('navigation')[0];return {readyMs:Math.round(nav?.domContentLoadedEventEnd||performance.now()),sceneCache:used.length,records:records.map(x=>({...x})),resources:performance.getEntriesByType('resource').filter(x=>/assets\//.test(x.name)).map(x=>({file:x.name.split('/').slice(-2).join('/'),ms:Math.round(x.duration),bytes:x.transferSize}))};}
  function show(){const m=metrics(),esc=Game.UI.esc;Game.UI.modal('运行记录',`<p>页面就绪：${m.readyMs} ms · 已解码场景：${m.sceneCache} / 2</p><p class="muted">图片进入地点时加载。首次载入与刷新后的缓存耗时，可在下表和浏览器网络面板比较。音效即时合成，无音频下载。</p><div class="audit-table"><table><thead><tr><th>资源</th><th>耗时</th><th>传输</th></tr></thead><tbody>${m.resources.map(x=>`<tr><td>${esc(x.file)}</td><td>${x.ms} ms</td><td>${x.bytes?Math.round(x.bytes/1024)+' KB':'缓存 / 浏览器未提供'}</td></tr>`).join('')}</tbody></table></div><h3>最近异常</h3><p>${Game.Diagnostics.entries().map(x=>esc(x.message)).join('<br>')||'暂无异常记录'}</p>`);}
  return Object.freeze({scene,metrics,show});
})();
