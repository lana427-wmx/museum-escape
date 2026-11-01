Game.Auth=(()=>{
  function users(){const raw=Game.Store.read('users',[]);return Array.isArray(raw)?raw.filter(u=>u&&typeof u.name==='string'&&typeof u.salt==='string'&&typeof u.hash==='string'):[]}
  function current(){const u=Game.Store.read('session',null);return users().some(a=>a.name===u)?u:null}
  async function digest(text){
    if(!globalThis.crypto?.subtle)throw Error('此浏览器不支持本地密码摘要，请使用近期版本 Edge / Chrome 或 localhost 启动。');
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function register(name,password){name=name.trim();if(!/^[\p{L}\p{N}_-]{2,16}$/u.test(name))throw Error('用户名需为 2–16 位中文、字母、数字、下划线或短横线。');if(password.length<6||password.length>64)throw Error('密码长度为 6–64 位。');const all=users();if(all.some(u=>u.name===name))throw Error('此用户名已存在，请登录或换一个名字。');const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');all.push({name,salt,hash:await digest(salt+password)});if(!Game.Store.write('users',all)||!Game.Store.write('session',name))throw Error('账号未保存，请检查本地存储权限。');}
  async function login(name,password){const u=users().find(u=>u.name===name.trim());if(!u||u.hash!==await digest(u.salt+password))throw Error('用户名或密码不正确。');if(!Game.Store.write('session',u.name))throw Error('无法保存登录状态。');}
  function logout(){Game.Scene.stop();Game.Store.write('session',null)}
  return {users,current,register,login,logout};
})();
