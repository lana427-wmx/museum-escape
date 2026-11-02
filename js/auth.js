/**
 * @file auth.js
 * @description 本地账号管理。验证输入并使用带随机盐的 SHA-256 摘要保存密码。
 */
Game.Auth = (() => {
  /** 读取结构有效的本地账号，忽略损坏记录。 */
  function users() {
    const raw = Game.Store.read('users', []);
    return Array.isArray(raw)
      ? raw.filter(
          (u) =>
            u &&
            typeof u.name === 'string' &&
            typeof u.salt === 'string' &&
            typeof u.hash === 'string',
        )
      : [];
  }
  /** 仅当会话中的用户名仍存在时，返回当前登录账号。 */
  function current() {
    const u = Game.Store.read('session', null);
    return users().some((a) => a.name === u) ? u : null;
  }
  /** 生成 SHA-256 摘要。依赖 HTTPS 或 localhost 提供的安全上下文。 */
  async function digest(text) {
    if (!globalThis.crypto?.subtle)
      throw Error('此浏览器不支持本地密码摘要，请使用近期版本 Edge / Chrome 或 localhost 启动。');
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), (x) => x.toString(16).padStart(2, '0')).join('');
  }
  /** 校验用户名和密码，生成随机盐，再保存账号与登录会话。 */
  async function register(name, password) {
    name = name.trim();
    if (!/^[\p{L}\p{N}_-]{2,16}$/u.test(name))
      throw Error('用户名需为 2–16 位中文、字母、数字、下划线或短横线。');
    if (password.length < 6 || password.length > 64) throw Error('密码长度为 6–64 位。');
    const all = users();
    if (all.some((u) => u.name === name)) throw Error('此用户名已存在，请登录或换一个名字。');
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) =>
      x.toString(16).padStart(2, '0'),
    ).join('');
    all.push({ name, salt, hash: await digest(salt + password) });
    if (!Game.Store.write('users', all) || !Game.Store.write('session', name))
      throw Error('账号未保存，请检查本地存储权限。');
  }
  /** 重新计算摘要并比对；账号或密码错误时抛出表单可展示的异常。 */
  async function login(name, password) {
    const u = users().find((u) => u.name === name.trim());
    if (!u || u.hash !== (await digest(u.salt + password))) throw Error('用户名或密码不正确。');
    if (!Game.Store.write('session', u.name)) throw Error('无法保存登录状态。');
  }
  /** 先保存并停止场景，再清除本地登录会话。 */
  function logout() {
    Game.Scene.stop();
    Game.Store.write('session', null);
  }
  return { users, current, register, login, logout };
})();
