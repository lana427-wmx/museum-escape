'use strict';
window.Game = window.Game || {};
Game.Store = (() => {
  const prefix='sushi.v1.';
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(prefix+key))??fallback}catch{Game.Diagnostics?.report('本地记录格式异常，已使用默认值；可重新登录。');return fallback}}
  function write(key,value){try{localStorage.setItem(prefix+key,JSON.stringify(value));return true}catch{Game.UI?.toast('浏览器存储不可用，请允许本地存储后再保存。');return false}}
  function fresh(){return {version:1,visitedScenes:[],currentScene:null,playerPosition:null,lastPlayed:null,collectedArtifacts:[],settings:{speed:160,motion:true,labels:true,volume:0.3,music:false,effects:true}}}
  function load(){const d=read('save.'+Game.Auth.current(),null),base=fresh();return d&&typeof d==='object'&&!Array.isArray(d)?{...base,...d,settings:{...base.settings,...d.settings,speed:[130,160,210].includes(d.settings?.speed)?d.settings.speed:160,volume:Number.isFinite(d.settings?.volume)?Math.max(0,Math.min(1,d.settings.volume)):.3},visitedScenes:Array.isArray(d.visitedScenes)?d.visitedScenes.filter(x=>typeof x==='string'):[],collectedArtifacts:Array.isArray(d.collectedArtifacts)?[...new Set(d.collectedArtifacts.filter(x=>typeof x==='string'))]:[]}:base}
  function save(data){return write('save.'+Game.Auth.current(),data)}
  return {read,write,fresh,load,save};
})();
