/**
 * @file storage.js
 * @description 本地存储入口。账号存档按用户名分开保存；读取异常时回退默认值。
 */
'use strict';
window.Game = window.Game || {};
Game.Store = (() => {
  const prefix = 'sushi.v1.';
  /** 解析 JSON 记录；缺失或损坏时返回调用方提供的默认值。 */
  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback;
    } catch {
      Game.Diagnostics?.report('本地记录格式异常，已使用默认值；可重新登录。');
      return fallback;
    }
  }
  /** 保存 JSON 记录。返回是否成功，让调用方决定是否推进任务。 */
  function write(key, value) {
    try {
      localStorage.setItem(prefix + key, JSON.stringify(value));
      return true;
    } catch {
      Game.UI?.toast('浏览器存储不可用，请允许本地存储后再保存。');
      return false;
    }
  }
  /** 生成全新存档，避免不同账号共享数组或设置对象。 */
  function fresh() {
    return {
      version: 1,
      visitedScenes: [],
      currentScene: null,
      playerPosition: null,
      lastPlayed: null,
      collectedArtifacts: [],
      settings: {
        speed: 160,
        motion: true,
        labels: true,
        volume: 0.3,
        music: false,
        effects: true,
      },
    };
  }
  /** 合并旧存档与默认结构，并校验设置范围和收集列表类型。 */
  function load() {
    const d = read('save.' + Game.Auth.current(), null),
      base = fresh();
    return d && typeof d === 'object' && !Array.isArray(d)
      ? {
          ...base,
          ...d,
          settings: {
            ...base.settings,
            ...d.settings,
            speed: [130, 160, 210].includes(d.settings?.speed) ? d.settings.speed : 160,
            volume: Number.isFinite(d.settings?.volume)
              ? Math.max(0, Math.min(1, d.settings.volume))
              : 0.3,
          },
          visitedScenes: Array.isArray(d.visitedScenes)
            ? d.visitedScenes.filter((x) => typeof x === 'string')
            : [],
          collectedArtifacts: Array.isArray(d.collectedArtifacts)
            ? [...new Set(d.collectedArtifacts.filter((x) => typeof x === 'string'))]
            : [],
        }
      : base;
  }
  /** 将存档写入当前账号的独立键名。 */
  function save(data) {
    return write('save.' + Game.Auth.current(), data);
  }
  return { read, write, fresh, load, save };
})();
