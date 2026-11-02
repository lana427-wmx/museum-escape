/**
 * @file scene-manager.js
 * @description 场景生命周期。负责画布、角色、动画循环、自动保存与资源清理。
 */
Game.Scene = {
  active: false,
  player: null,
  scene: null,
  raf: null,
  settings: null,
  observer: null,
  lastSave: 0,
  /**
   * 启动场景并建立唯一的动画循环与尺寸观察器。
   * @param {string} id 地图标识。
   * @param {{x: number, y: number} | null} position 可选恢复落点。
   */
  start(id, position) {
    this.stop();
    const scene = Game.Maps[id] || Game.Maps.palace;
    this.scene = scene;
    this.ownerAccount = Game.Auth.current();
    this.settings = Game.Store.load().settings;
    this.player = {
      ...Game.Navigation.safe(
        scene,
        position || (id === 'overworld' ? Game.Store.load().overworldPosition : null),
      ),
      direction: 'down',
      phase: 0,
      walking: false,
    };
    this.active = true;
    this.exitReady = false;
    this.elapsed = 0;
    this.lastSave = 0;
    const canvas = document.getElementById('world');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.background = Game.Renderer.prepare(scene);
    this.view = { w: 0, h: 0, zoom: 1 };
    const resize = () => {
      const r = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      this.view.w = r.width;
      this.view.h = r.height;
      this.view.zoom =
        scene.sceneId === 'overworld'
          ? Math.min(r.width / 1900, (r.height - 150) / 1300)
          : Math.max(0.55, Math.min(1.2, r.width / 1100, r.height / 720));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    this.observer = new ResizeObserver(resize);
    this.observer.observe(canvas);
    resize();
    const s = Game.Store.load();
    if (
      scene.sceneId !== 'overworld' &&
      !scene.expeditionId &&
      !s.visitedScenes.includes(scene.sceneId)
    )
      s.visitedScenes.push(scene.sceneId);
    Game.Store.save(s);
    Game.BellsQuest.attach();
    this.save();
    let prev = 0;
    const loop = (t) => {
      if (!this.active) return;
      const elapsedDelta = prev ? Math.max(0, (t - prev) / 1000) : 0,
        dt = Math.min(elapsedDelta, 0.04);
      prev = t;
      Game.Challenge?.tick(elapsedDelta);
      Game.Expeditions?.tick(elapsedDelta);
      if (
        !document.hidden &&
        !Game.Challenge?.blocked() &&
        !Game.Expeditions?.blocked() &&
        (!Game.UI.isOpen() || document.getElementById('quest-body'))
      )
        Game.BellsQuest.update(dt);
      if (
        !document.hidden &&
        !Game.UI.isOpen() &&
        !Game.Challenge?.blocked() &&
        !Game.Expeditions?.blocked()
      ) {
        Game.Player.update(
          scene,
          this.player,
          dt,
          this.settings.speed * (scene.sceneId === 'overworld' ? 1.7 : 1),
        );
        this.elapsed += dt;
        if (!Game.Navigation.overlaps(scene, this.player)) this.exitReady = true;
        const e = scene.exits.find((e) => Game.Collision.inside(this.player, e));
        if (e && this.exitReady && this.elapsed > 0.5) {
          this.save();
          Game.Router.go('map', e.target, e.spawn);
          return;
        }
      } else this.player.walking = false;
      this.ctx.clearRect(0, 0, this.view.w, this.view.h);
      Game.Renderer.draw(this.ctx, this.background, scene, this.player, this.view, this.settings);
      Game.BellsQuest.draw(this.ctx, scene, this.player, this.view);
      if (t - this.lastSave > 1500) {
        this.save();
        this.lastSave = t;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },
  /** 保存当前账号的位置与任务；其他账号不能写入此场景的存档。 */
  save() {
    if (!this.active || !Game.Auth.current() || this.ownerAccount !== Game.Auth.current()) return;
    const s = Game.Store.load();
    s.lastActivity = 'bells';
    s.currentScene = this.scene.sceneId;
    s.playerPosition = {
      x: Math.round(this.player.x * 100) / 100,
      y: Math.round(this.player.y * 100) / 100,
    };
    if (this.scene.sceneId === 'overworld') s.overworldPosition = { ...s.playerPosition };
    s.lastPlayed = new Date().toISOString();
    Game.Store.save(Game.BellsQuest.persist(s));
  },
  /** 保存后取消动画帧、断开观察器并停止音效，防止反复进出场景积累资源。 */
  stop() {
    Game.BellsQuest.cancelPending();
    this.save();
    this.active = false;
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
    Game.BellSound?.stop();
    Game.Player.clear();
  },
  page(id) {
    const s = Game.Maps[id] || Game.Maps.palace;
    return `<section class="world-screen"><canvas id="world" aria-label="${s.sceneName}，使用 WASD 或方向键移动，靠近金色标记按 靠近自动交互"></canvas><div class="world-hud"><div><p class="eyebrow">千年钟鸣 / ${s.era}</p><h1>${s.sceneName}</h1><small>${s.sceneId === 'overworld' ? '沿道路行走，踏入地点前方金色入口' : '循场景门口标记离开，可由另一端出口通行'}</small></div><div class="world-buttons">${s.sceneId === 'overworld' ? '' : '<button data-go="timeline">离开此地</button>'}<button data-action="map-menu">行旅地点</button><button data-action="settings">设置 / 暂停</button><button data-go="home">首页</button></div></div><details class="quest-panel" open><summary>当前任务 · 礼乐手记</summary><aside id="quest-hud" class="quest-hud" aria-label="当前任务"></aside></details><div id="quest-bearing" class="quest-bearing"></div><button id="quest-interact" class="quest-interact" hidden></button><div class="movement-help"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>移动 · 靠近自动交互 · Esc 暂停 · 自动保存</span></div><div class="map-title-flash">${s.sceneName}<small>${s.era}</small></div></section>`;
  },
  menu() {
    Game.UI.modal(
      '行旅地点',
      `<div class="scene-list">${Object.values(Game.Maps)
        .filter((s) => s.sceneId !== 'overworld' && !s.expeditionId)
        .map(
          (s) =>
            `<button data-map="${s.sceneId}"><span>${s.sceneName}</span><small>${s.era} →</small></button>`,
        )
        .join(
          '',
        )}</div><p class="muted">可自由到访各地。任务按证据顺序推进，金色标记与任务卡会指出当前目标。</p><button id="menu-journal">查阅礼乐手记</button>`,
    );
    document.getElementById('menu-journal').onclick = () => Game.BellsQuest.journal();
    document.querySelectorAll('[data-map]').forEach(
      (b) =>
        (b.onclick = () => {
          Game.UI.close();
          Game.Router.go('map', b.dataset.map);
        }),
    );
  },
};
window.addEventListener('pagehide', () => Game.Scene.save());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) Game.Scene.save();
});
window.addEventListener('blur', () => Game.Scene.save());

window.addEventListener('storage', (e) => {
  if (e.key === 'sushi.v1.session' && Game.Scene.active) {
    Game.Scene.stop();
    Game.Router.go('home');
    Game.UI.toast('本地账号已在其他页面切换，当前探索已暂停。');
  }
});
