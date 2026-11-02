/**
 * @file ui.js
 * @description 通用界面。管理弹窗、表单、设置、焦点和合成音乐。
 */
Game.UI = (() => {
  const overlay = document.getElementById('overlay');
  let previousFocus = null,
    toastTimer;
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  function toast(text) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }
  /** 打开统一弹窗，保留焦点以便关闭后恢复键盘操作。 */
  function modal(title, body) {
    Game.Player.clear();
    previousFocus = document.activeElement;
    overlay.innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button class="close" aria-label="关闭">×</button><p class="eyebrow">溯时 · 荆楚遗珍</p><h2>${title}</h2>${body}</section>`;
    overlay.hidden = false;
    overlay.querySelector('.close').onclick = close;
    overlay.querySelector('input,button,select')?.focus();
  }
  /** 关闭弹窗并停止待执行反馈和钟声，清除角色按键状态。 */
  function close() {
    Game.BellsQuest?.cancelPending();
    Game.BellSound?.stop();
    overlay.hidden = true;
    overlay.innerHTML = '';
    Game.Player.clear();
    previousFocus?.focus?.();
  }
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!overlay.hidden) close();
      else if (Game.Scene.active) settings();
    }
    if (e.key === 'Tab' && !overlay.hidden) {
      const a = [...overlay.querySelectorAll('button,input,select,a[href]')].filter(
        (x) => !x.disabled,
      );
      if (!a.length) return;
      const first = a[0],
        last = a.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  function header(title, back = 'home', extra = '') {
    return `<header class="topbar"><button class="text-button" data-go="${back}">← 返回${back === 'home' ? '首页' : back === 'museum' ? '展馆' : '时空地图'}</button><span class="brand-small">${title}<small>溯时 · 荆楚遗珍</small></span><div>${extra}<button class="text-button" data-action="settings">设置</button></div></header>`;
  }
  function auth(mode = 'login') {
    modal(
      mode === 'register' ? '建立本地档案' : '欢迎归来',
      `<p class="muted">账号仅保存于本浏览器，不连接服务器。请使用课程演示专用密码。</p><form id="auth-form"><label>探索者姓名<input name="name" autocomplete="username" maxlength="16" required placeholder="2–16 位中文或字母"></label><label>密码<input name="password" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" type="password" minlength="6" maxlength="64" required placeholder="至少 6 位"></label><p class="form-error" role="alert"></p><button class="primary" type="submit">${mode === 'register' ? '注册并进入' : '登录'}</button></form><button class="text-button" id="auth-switch">${mode === 'register' ? '已有账号？返回登录' : '第一次来？注册本地账号'}</button>`,
    );
    document.getElementById('auth-switch').onclick = () =>
      auth(mode === 'register' ? 'login' : 'register');
    document.getElementById('auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const form = e.currentTarget,
        btn = form.querySelector('button');
      btn.disabled = true;
      try {
        await Game.Auth[mode](form.elements.name.value, form.elements.password.value);
        close();
        Game.Router.go('home');
        toast('本地档案已加载');
      } catch (err) {
        form.querySelector('.form-error').textContent = err.message;
        btn.disabled = false;
      }
    };
  }
  function account() {
    if (!Game.Auth.current()) return auth();
    const s = Game.Store.load();
    modal(
      '个人档案',
      `<div class="profile-seal">溯</div><h3>${esc(Game.Auth.current())}</h3><p>已访问 ${s.visitedScenes.filter((id) => id !== 'overworld').length} / 6 个场景</p><p>已找回文物 ${s.collectedArtifacts.length} / ${Game.Artifacts.length}</p><p class="muted">最后探索：${s.lastPlayed ? new Date(s.lastPlayed).toLocaleString('zh-CN') : '尚未进入历史地图'}</p><button class="primary" id="logout">退出账号</button>`,
    );
    document.getElementById('logout').onclick = () => {
      Game.Auth.logout();
      Game.Audio.stop();
      close();
      Game.Router.go('home');
    };
  }
  /** 编辑当前账号设置；保存时读取最新存档，避免覆盖期间新增的进度。 */
  function settings() {
    if (!Game.Auth.current()) {
      toast('请先登录，再保存个人设置');
      auth();
      return;
    }
    const s = Game.Store.load();
    modal(
      '探索设置',
      `<form id="settings-form"><label>移动速度<select name="speed"><option value="130">从容 · 130</option><option value="160">标准 · 160</option><option value="210">轻快 · 210</option></select></label><label class="check"><input name="motion" type="checkbox"> 首页缓慢缩放与转场动画</label><label class="check"><input name="labels" type="checkbox"> 显示人物姓名</label><label class="check"><input name="music" type="checkbox"> 轻音乐（合成五声音阶）</label><label class="check"><input name="effects" type="checkbox"> 成功、失败与编钟音效</label><label>音乐 / 编钟音效音量<input type="range" name="volume" min="0" max="1" step="0.05"></label><p class="muted">WASD / 方向键移动 · Esc 打开或关闭菜单。菜单打开时角色暂停；关闭后靠近金色线索按 E 交互。</p><button class="primary">保存设置</button></form>`,
    );
    const f = document.getElementById('settings-form');
    f.elements.speed.value = s.settings.speed;
    ['motion', 'labels', 'music', 'effects'].forEach(
      (k) =>
        (f.elements[k].checked =
          s.settings[k] !== false && (k !== 'music' || s.settings.music === true)),
    );
    f.elements.volume.value = s.settings.volume;
    f.onsubmit = (e) => {
      e.preventDefault();
      const fresh = Game.Store.load();
      fresh.settings = {
        speed: +f.elements.speed.value,
        motion: f.elements.motion.checked,
        labels: f.elements.labels.checked,
        music: f.elements.music.checked,
        effects: f.elements.effects.checked,
        volume: +f.elements.volume.value,
      };
      Game.Store.save(fresh);
      Game.Scene.settings = fresh.settings;
      document.body.classList.toggle('reduced', !fresh.settings.motion);
      Game.Audio.sync(fresh.settings);
      close();
      toast('设置已保存');
    };
  }
  return {
    esc,
    toast,
    modal,
    close,
    header,
    auth,
    account,
    settings,
    isOpen: () => !overlay.hidden,
  };
})();
Game.Audio = (() => {
  let ctx, timer, gain;
  function stop() {
    clearInterval(timer);
    timer = null;
    if (gain) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  }
  function sync(s) {
    if (!s.music) {
      stop();
      return;
    }
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      if (!gain) {
        gain = ctx.createGain();
        gain.connect(ctx.destination);
      }
      gain.gain.setTargetAtTime(s.volume * 0.12, ctx.currentTime, 0.1);
      if (timer) return;
      let i = 0;
      const notes = [220, 261.63, 293.66, 349.23, 392, 349.23, 293.66, 261.63];
      const play = () => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = notes[i++ % notes.length];
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
        o.connect(g);
        g.connect(gain);
        o.start();
        o.stop(ctx.currentTime + 2.6);
        o.onended = () => {
          o.disconnect();
          g.disconnect();
        };
      };
      play();
      timer = setInterval(play, 1900);
    } catch {
      Game.UI.toast('当前浏览器无法启用声音。');
    }
  }
  return { sync, stop };
})();
