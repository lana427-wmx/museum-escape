/**
 * @file challenge.js
 * @description 编钟计分挑战。隔离挑战状态与自由探索存档，由事件记录推导分数。
 */
/* 验收挑战与自由探索隔离：本局仅在内存中，收集文物档案和最高分持久化。 */
Game.Challenge = (() => {
  const G = Game,
    esc = G.UI.esc;
  const modes = Object.freeze({
    easy: Object.freeze({ name: '简单', limit: 1200, damage: 20, reward: 100, penalty: 15 }),
    hard: Object.freeze({ name: '困难', limit: 600, damage: 25, reward: 150, penalty: 30 }),
  });
  const baseLoad = G.Store.load,
    baseSave = G.Store.save;
  let run = null,
    paintStamp = '',
    clickAt = 0;
  // 分数没有公开 setter；只由按顺序完成任务和有效失误事件计算。
  /** 重放顺序有效的通过与失误事件，推导积分；记录非法时返回 null。 */
  function calculate(events, mode) {
    let score = 0,
      next = 0,
      errors = 0;
    const config = modes[mode];
    if (!config || !Array.isArray(events) || events.length > 100) return null;
    for (const e of events) {
      if (
        !e ||
        e.step !== next ||
        next >= G.BellsContent.steps.length ||
        errors * config.damage >= 100
      )
        return null;
      if (e.type === 'pass') {
        score += config.reward;
        next++;
      } else if (e.type === 'error') {
        score = Math.max(0, score - config.penalty);
        errors++;
      } else return null;
    }
    return { score, next, errors };
  }
  /** 生成本地记录校验值，用于发现简单篡改；纯前端校验不构成安全边界。 */
  function seal(value) {
    let h = 2166136261;
    for (const c of JSON.stringify(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0).toString(16);
  }
  /** 读取排行榜，并验证事件顺序、校验值、积分及时间范围。 */
  function boards() {
    const raw = G.Store.read('challenge.best.v1', []);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((row) => {
        if (!row || typeof row.user !== 'string' || row.user.length > 16) return false;
        const { check, ...data } = row;
        const c = calculate(data.events, data.mode);
        return (
          c &&
          check === seal(data) &&
          data.score === c.score &&
          data.steps === c.next &&
          Number.isFinite(data.seconds) &&
          data.seconds >= 0 &&
          data.seconds <= modes[data.mode].limit
        );
      })
      .slice(0, 100);
  }
  function score() {
    return run ? calculate(run.events, run.mode).score : 0;
  }
  function best() {
    return Math.max(
      0,
      ...boards()
        .filter((x) => x.user === G.Auth.current())
        .map((x) => x.score),
    );
  }
  /** 只在当前账号与难度获得更高积分时更新最高纪录。 */
  function saveBest() {
    if (!run || !score()) return;
    const rows = boards(),
      old = rows.find((x) => x.user === run.owner && x.mode === run.mode);
    if (old && old.score >= score()) return;
    const row = {
      user: run.owner,
      mode: run.mode,
      score: score(),
      steps: run.next,
      seconds: Math.min(run.seconds, modes[run.mode].limit),
      events: run.events.map((e) => ({ ...e })),
    };
    row.check = seal(row);
    G.Store.write(
      'challenge.best.v1',
      [row, ...rows.filter((x) => x.user !== run.owner || x.mode !== run.mode)].slice(0, 100),
    );
  }
  function owned() {
    return run && run.owner === G.Auth.current();
  }
  G.Store.load = () => {
    const s = baseLoad();
    if (!owned()) return s;
    return { ...s, ...run.save, settings: s.settings, collectedArtifacts: s.collectedArtifacts };
  };
  G.Store.save = (s) => {
    if (!owned()) return baseSave(s);
    run.save = {
      bellsQuest: s.bellsQuest,
      currentScene: s.currentScene,
      playerPosition: s.playerPosition,
      overworldPosition: s.overworldPosition,
      bellsOpeningSeen: true,
    };
    const permanent = baseLoad();
    permanent.settings = s.settings;
    return baseSave(permanent);
  };
  function snapshot() {
    if (!owned()) return null;
    const c = modes[run.mode];
    return Object.freeze({
      mode: run.mode,
      status: run.status,
      score: score(),
      best: best(),
      step: run.next,
      total: G.BellsContent.steps.length,
      health: Math.max(0, 100 - run.errors * c.damage),
      remaining: Math.max(0, c.limit - run.seconds),
      seconds: run.seconds,
      limit: c.limit,
      reward: c.reward,
      penalty: c.penalty,
      damage: c.damage,
    });
  }
  function active() {
    return !!owned();
  }
  function blocked() {
    return !!owned() && run.status !== 'running';
  }
  function canAdvance(id) {
    if (!owned()) return true;
    const q = G.BellsContent.steps[run.next];
    return (
      run.status === 'running' &&
      q?.id === id &&
      G.BellsQuest.get().step === run.next &&
      (!q.puzzle || G.BellsQuest.get().data[id]?.solved === true)
    );
  }
  function feedback(kind) {
    const el = document.querySelector('.challenge-hud');
    if (el) {
      el.classList.remove('score-good', 'score-bad');
      void el.offsetWidth;
      el.classList.add(kind === 'success' ? 'score-good' : 'score-bad');
    }
    G.FX.play(kind);
  }
  function advance(id, next) {
    if (!owned()) return;
    const q = G.BellsContent.steps[run.next];
    if (
      run.status !== 'running' ||
      q?.id !== id ||
      next !== run.next + 1 ||
      G.BellsQuest.get().step !== next
    )
      return;
    run.events.push({ type: 'pass', step: run.next });
    run.next = next;
    saveBest();
    feedback('success');
    render();
    if (next === G.BellsContent.steps.length) {
      run.status = 'won';
      const s = baseLoad();
      if (!s.collectedArtifacts.includes('bells')) s.collectedArtifacts.push('bells');
      baseSave(s);
      render();
    }
  }
  function mistake() {
    if (!owned()) {
      G.FX.play('error');
      return true;
    }
    if (run.status !== 'running') return false;
    const now = performance.now();
    if (now - run.lastWrong < 600) return false;
    run.lastWrong = now;
    run.events.push({ type: 'error', step: run.next });
    run.errors++;
    saveBest();
    feedback('error');
    render();
    if (run.errors * modes[run.mode].damage >= 100)
      lose('时序稳定值已耗尽。复盘线索后，再试一次。');
    return true;
  }
  /** 按真实经过时间推进倒计时；暂停、弹窗和失焦规则在此统一处理。 */
  function tick(dt) {
    if (
      !owned() ||
      run.status !== 'running' ||
      !G.Scene.active ||
      document.hidden ||
      (G.UI.isOpen() && !document.getElementById('quest-body')) ||
      !Number.isFinite(dt) ||
      dt < 0
    )
      return;
    run.seconds = Math.min(modes[run.mode].limit, run.seconds + dt);
    if (run.seconds >= modes[run.mode].limit)
      lose('跃迁时间已到，已安全撤离。重新挑战即可再次出发。');
    render();
  }
  function format(n) {
    return `${Math.floor(n / 60)
      .toString()
      .padStart(2, '0')}:${Math.floor(n % 60)
      .toString()
      .padStart(2, '0')}`;
  }
  function render() {
    const el = document.getElementById('challenge-hud'),
      s = snapshot();
    if (!el || !s) return;
    const stamp = [s.status, s.score, s.best, s.step, s.health, Math.ceil(s.remaining)].join('|');
    if (stamp === paintStamp) return;
    paintStamp = stamp;
    el.innerHTML = `<span class="challenge-mode">${modes[s.mode].name}挑战 · ${s.status === 'paused' ? '已暂停' : s.status === 'won' ? '已通关' : s.status === 'lost' ? '已撤离' : '进行中'}</span><span>积分 <b id="run-score">${s.score}</b></span><span>最高 <b>${s.best}</b></span><span class="${s.health <= 25 ? 'danger' : ''}">稳定值 <b>${s.health}</b></span><span class="${s.remaining < 60 ? 'danger' : ''}">剩余 <b>${format(Math.ceil(s.remaining))}</b></span><button data-challenge="pause">${s.status === 'running' ? '暂停' : '本局菜单'}</button><button data-challenge="restart">重开</button>`;
  }
  function canVisit(id) {
    if (!owned() || id === 'overworld') return true;
    const candidates = G.BellsContent.steps.filter((q) => q.scene === id);
    if (!candidates.length) return false;
    const chapter =
      G.BellsContent.steps[Math.min(run.next, G.BellsContent.steps.length - 1)].chapter;
    return candidates[0].chapter <= chapter;
  }
  function setup() {
    if (!G.Auth.current()) return G.UI.auth();
    G.UI.modal(
      '时序挑战 · 选择难度',
      `<p>从楚宫开始，依次完成五段行旅、十条线索，修复编钟档案。</p><div class="difficulty-grid">${Object.entries(
        modes,
      )
        .map(
          ([id, m]) =>
            `<button class="difficulty-card" data-challenge-start="${id}"><strong>${m.name}</strong><span>${m.limit / 60} 分钟 · 稳定值 100</span><span>完成线索 +${m.reward} 分</span><span>失误 −${m.penalty} 分 / −${m.damage} 稳定值</span><b>开始${m.name}挑战 →</b></button>`,
        )
        .join(
          '',
        )}</div><p class="muted">暂停、设置、手记期间停止倒计时；阅读剧情和解谜时计时。新地点随线索解锁。刷新结束当前挑战，重新开始为零分；最高分和已收集文物档案保留，自由探索存档不受影响。</p><button data-challenge="ranking">查看本地排行榜</button>`,
    );
  }
  async function start(mode) {
    if (!modes[mode] || G.Router.busy || !G.Auth.current()) return;
    G.Scene.stop();
    run = {
      owner: G.Auth.current(),
      mode,
      status: 'running',
      next: 0,
      seconds: 0,
      errors: 0,
      events: [],
      lastWrong: -1000,
      save: { bellsQuest: G.BellsQuest.fresh(), currentScene: 'palace', bellsOpeningSeen: true },
    };
    paintStamp = '';
    G.UI.close();
    await G.Router.go('map', 'palace');
  }
  function lose(reason) {
    if (!owned() || run.status !== 'running') return;
    run.status = 'lost';
    run.reason = reason;
    G.BellsQuest.cancelPending();
    G.BellSound.stop();
    G.Player.clear();
    saveBest();
    feedback('failure');
    render();
    outcome();
  }
  function outcome() {
    if (!owned()) return;
    const s = snapshot(),
      won = s.status === 'won';
    if (!['won', 'lost'].includes(s.status)) return;
    G.UI.modal(
      won ? '文明记录已修复 · 挑战胜利' : '时序回溯 · 挑战结束',
      `<div class="challenge-result ${won ? 'victory' : 'failure'}"><div class="result-seal">${won ? '归藏' : '回溯'}</div><h3>${won ? '千年钟鸣，重归展馆' : esc(run.reason)}</h3><p>本局积分 <strong>${s.score}</strong> · 最高纪录 <strong>${s.best}</strong></p><p>完成 ${s.step} / ${s.total} 条线索 · 用时 ${format(s.seconds)} · ${modes[s.mode].name}模式</p><p>${won ? (G.Collection.full() ? '十二件遗珍全部归藏，荆楚长卷已经完整！' : '曾侯乙编钟文物档案已永久点亮。') : '本局不会覆盖自由探索存档，最高分仍然保留。'}</p><button class="primary" data-challenge="restart">再挑战一次</button><button data-challenge="exit">返回展馆</button><button data-challenge="ranking">排行榜</button></div>`,
    );
    if (won) G.FX.play('victory');
  }
  function pause() {
    if (!owned()) return G.UI.settings();
    if (['won', 'lost'].includes(run.status)) return outcome();
    run.status = 'paused';
    G.Player.clear();
    G.BellsQuest.cancelPending();
    G.BellSound.stop();
    render();
    G.UI.modal(
      '时序已暂停',
      `<p>角色与倒计时已暂停。当前 ${score()} 分，剩余 ${format(snapshot().remaining)}。</p><div class="quest-options"><button class="primary" data-challenge="resume">继续游戏 →</button><button data-challenge="restart">重新开始</button><button data-challenge="setup">更换难度</button><button data-challenge="sound">${G.Store.load().settings.effects === false ? '开启' : '关闭'}音效</button><button data-challenge="exit">结束本局，返回展馆</button></div>`,
    );
  }
  function restart() {
    if (!owned()) return setup();
    const mode = run.mode;
    G.UI.modal(
      '重新开始本局',
      `<p>本局任务、分数、稳定值和计时将重置。最高分、文物档案与自由探索存档保留。</p><button class="primary" data-challenge-start="${mode}">确认重新开始</button><button data-challenge="pause">返回本局菜单</button>`,
    );
  }
  async function exit(page = 'hall', id = 'zeng') {
    G.Scene.stop();
    run = null;
    document.body.classList.remove('in-challenge');
    paintStamp = '';
    await G.Router.go(page, id);
  }
  function ranking() {
    const rows = boards()
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    G.UI.modal(
      '本地行旅榜',
      `<p class="muted">仅当前浏览器的账号纪录。每个账号、每种难度保留最高分；清除网站数据会清空纪录。</p><div class="audit-table"><table><thead><tr><th>探索者</th><th>难度</th><th>最高分</th><th>线索</th></tr></thead><tbody>${rows.map((x) => `<tr><td>${esc(x.user)}</td><td>${modes[x.mode].name}</td><td>${x.score}</td><td>${x.steps} / ${G.BellsContent.steps.length}</td></tr>`).join('') || '<tr><td colspan="4">尚无纪录，开始一次挑战吧。</td></tr>'}</tbody></table></div>${active() ? '<button data-challenge="pause">返回本局</button>' : ''}`,
    );
  }
  const close = G.UI.close;
  G.UI.close = () => {
    close();
    if (owned() && run.status === 'paused') {
      run.status = 'running';
      render();
    }
  };
  const route = G.Router.go;
  G.Router.go = async (page = 'home', id = null, pos = null) => {
    if (owned() && page === 'map' && !canVisit(id)) {
      G.UI.toast('此地尚未解锁。请先完成当前线索。');
      return;
    }
    if (owned() && page !== 'map' && page !== 'timeline') {
      G.Scene.stop();
      run = null;
      document.body.classList.remove('in-challenge');
    }
    return route(page, id, pos);
  };
  const page = G.Scene.page;
  G.Scene.page = (id) => {
    const html = page(id);
    if (!owned()) return html;
    return html
      .replace(
        '<section class="world-screen">',
        '<section class="world-screen challenge-screen"><section id="challenge-hud" class="challenge-hud" aria-label="本局状态"></section>',
      )
      .replace('data-agent-restart', 'data-challenge="restart"')
      .replace('设置 / 暂停', '设置');
  };
  const begin = G.Scene.start;
  G.Scene.start = function (...args) {
    begin.apply(this, args);
    document.body.classList.toggle('in-challenge', !!owned());
    paintStamp = '';
    if (owned() && window.innerWidth < 700)
      document.querySelector('.quest-panel')?.removeAttribute('open');
    render();
  };
  const hall = G.Museum.hall;
  G.Museum.hall = (id) =>
    hall(id)
      .replace('data-agent-restart', 'data-challenge="setup"')
      .replace('重新开始此副本', '开始计分挑战');
  const menu = G.Scene.menu;
  G.Scene.menu = () => {
    menu();
    if (owned())
      document.querySelectorAll('[data-map]').forEach((b) => {
        if (!canVisit(b.dataset.map)) {
          b.disabled = true;
          b.title = '先完成当前线索以解锁';
          b.querySelector('small').textContent = '未解锁';
        }
      });
  };
  const screen = G.Scene.page;
  G.Scene.page = (id) =>
    screen(id).replace(
      /<\/section>$/,
      '<div class="touch-move" aria-label="移动方向"><button data-move="w" aria-label="向上">↑</button><button data-move="a" aria-label="向左">←</button><button data-move="s" aria-label="向下">↓</button><button data-move="d" aria-label="向右">→</button></div></section>',
    );
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-move]');
    if (!b || G.UI.isOpen() || blocked()) return;
    e.preventDefault();
    G.Player.keys.add(b.dataset.move);
    b.setPointerCapture(e.pointerId);
  });
  window.addEventListener('pointerup', () => G.Player.clear());
  window.addEventListener('pointercancel', () => G.Player.clear());
  const home = G.Museum.home;
  G.Museum.home = () =>
    home()
      .replace(
        '<nav class="home-menu">',
        `<nav class="home-menu"><button class="primary" data-challenge="setup">时序挑战 <span>最高 ${best()} 分 →</span></button>`,
      )
      .replace(
        '</footer>',
        '<button class="text-button" data-challenge="ranking">本地排行</button><button class="text-button" data-challenge="diagnostics">运行记录</button></footer>',
      );
  document.addEventListener(
    'click',
    (e) => {
      const b = e.target.closest('[data-challenge],[data-challenge-start]');
      // 对同一任务弹窗的快速重复操作限流，避免重复扣分或跳过对话。
      if (!b && e.target.closest('#quest-body button,#quest-body [data-strike]')) {
        const now = performance.now();
        if (now - clickAt < 100) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        clickAt = now;
      }
      if (!b) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (b.dataset.challengeStart) {
        start(b.dataset.challengeStart);
        return;
      }
      const action = b.dataset.challenge;
      if (action === 'setup') setup();
      else if (action === 'ranking') ranking();
      else if (action === 'diagnostics') G.Resources.show();
      else if (action === 'pause') pause();
      else if (action === 'resume') G.UI.close();
      else if (action === 'restart') restart();
      else if (action === 'exit') exit();
      else if (action === 'sound') {
        const s = G.Store.load();
        s.settings.effects = s.settings.effects === false;
        G.Store.save(s);
        G.BellSound.stop();
        pause();
      }
    },
    true,
  );
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && owned() && !G.UI.isOpen()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        pause();
      }
    },
    true,
  );
  window.addEventListener('blur', () => {
    if (owned() && run.status === 'running') pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && owned() && run.status === 'running') pause();
  });
  return Object.freeze({
    active,
    blocked,
    snapshot,
    canAdvance,
    advance,
    mistake,
    tick,
    canVisit,
    setup,
    start,
    pause,
    restart,
    exit,
    ranking,
    outcome,
    pauseOnError: () => {
      if (owned() && run.status === 'running') pause();
    },
  });
})();

/* 共用一个音频上下文；每个声音结束后断开节点，支持总音效开关。 */
Game.FX = (() => {
  let ctx,
    last = 0;
  function play(kind) {
    const s = Game.Store.load().settings;
    if (
      s.effects === false ||
      !s.volume ||
      (!['victory', 'failure'].includes(kind) && performance.now() - last < 80)
    )
      return;
    last = performance.now();
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume().catch(() => {});
      const notes = {
        success: [523, 659],
        error: [220, 164],
        failure: [330, 247, 165],
        victory: [523, 659, 784, 1047],
      }[kind] || [523];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain(),
          t = ctx.currentTime + i * 0.12;
        o.frequency.value = f;
        g.gain.setValueAtTime(s.volume * 0.14, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.23);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.25);
        o.onended = () => {
          o.disconnect();
          g.disconnect();
        };
      });
    } catch {
      Game.Diagnostics.report('音效暂不可用，可继续通过文字和高亮提示游玩。');
    }
  }
  return Object.freeze({ play });
})();
