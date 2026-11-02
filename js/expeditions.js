/**
 * @file expeditions.js
 * @description 文物副本控制器。按账号和文物隔离进度，处理解谜、计时、归藏及结局。
 */
/* 文物副本控制器：状态按账号和文物隔离，复用地图移动与碰撞，独立推进剧情。 */
Game.Expeditions = (() => {
  const G = Game,
    C = G.ExpeditionContent,
    esc = G.UI.esc;
  const modes = {
    easy: { name: '简单', limit: 720, damage: 20, reward: 100, penalty: 15 },
    hard: { name: '困难', limit: 360, damage: 25, reward: 150, penalty: 30 },
  };
  let session = null,
    panelToken = 0,
    lastInput = -1000,
    hudStamp = '';
  /** 确认当前副本会话仍属于登录账号，避免切换账号后串档。 */
  function owned() {
    return !!session && session.owner === G.Auth.current();
  }
  function active() {
    return owned() && G.Scene.active && G.Scene.scene?.expeditionId === session.id;
  }
  /** 按调查分支生成七步线索顺序，后续完成记录必须符合此前缀。 */
  function keys(route) {
    return [
      'briefing',
      ...(route === 'record-first' ? ['record', 'visual'] : ['visual', 'record']),
      'puzzle-0',
      'mentor',
      'puzzle-1',
      'curate',
    ];
  }
  function fresh(mode = 'easy') {
    return {
      version: 1,
      mode: modes[mode] ? mode : 'easy',
      route: 'form-first',
      history: [],
      seconds: 0,
      mistakes: 0,
      hints: 0,
      best: 0,
      work: {},
      position: null,
    };
  }
  /** 校验副本版本、进度顺序和字段范围，清理非法的半成品谜题状态。 */
  function normalize(raw) {
    const s = fresh(raw?.mode);
    if (!raw || raw.version !== 1) return s;
    s.route = raw.route === 'record-first' ? 'record-first' : 'form-first';
    const expected = keys(s.route);
    if (Array.isArray(raw.history))
      for (const [i, k] of raw.history.entries()) {
        if (i >= expected.length || k !== expected[i]) break;
        s.history.push(k);
      }
    s.seconds = Number.isFinite(raw.seconds)
      ? Math.max(0, Math.min(modes[s.mode].limit, raw.seconds))
      : 0;
    s.mistakes = Number.isInteger(raw.mistakes) ? Math.max(0, Math.min(100, raw.mistakes)) : 0;
    s.hints = Number.isInteger(raw.hints) ? Math.max(0, Math.min(999, raw.hints)) : 0;
    s.best = Number.isInteger(raw.best) ? Math.max(0, Math.min(1050, raw.best)) : 0;
    if (raw.position && Number.isFinite(raw.position.x) && Number.isFinite(raw.position.y))
      s.position = { x: raw.position.x, y: raw.position.y };
    if (raw.work && typeof raw.work === 'object' && !Array.isArray(raw.work)) {
      const w = raw.work;
      s.work = {
        order: Array.isArray(w.order)
          ? [...new Set(w.order.filter((n) => Number.isInteger(n) && n >= 0 && n < 8))]
          : [],
        turns:
          Array.isArray(w.turns) && w.turns.length === 4
            ? w.turns.map((n) => (Number.isInteger(n) ? ((n % 4) + 4) % 4 : 0))
            : null,
        wheel: Number.isInteger(w.wheel) ? ((w.wheel % 5) + 5) % 5 : null,
        rhythm: Number.isInteger(w.rhythm) ? Math.max(0, Math.min(4, w.rhythm)) : 0,
        answers: Array.isArray(w.answers)
          ? w.answers.slice(0, 4).map((x) => (typeof x === 'string' ? x.slice(0, 100) : ''))
          : [],
        number: typeof w.number === 'string' ? w.number.slice(0, 2) : '',
      };
    }
    return s;
  }
  function entry(id) {
    return normalize(G.Store.load().expeditions?.[id]);
  }
  function complete(s) {
    return s.history.length === 7;
  }
  function failed(s) {
    const m = modes[s.mode];
    return !complete(s) && (s.mistakes * m.damage >= 100 || s.seconds >= m.limit);
  }
  /** 从有效任务数与失误数推导积分，不接受外部直接设置分数。 */
  function score(s) {
    const m = modes[s.mode];
    return Math.max(0, s.history.length * m.reward - s.mistakes * m.penalty);
  }
  function summary(s) {
    const m = modes[s.mode];
    return {
      step: s.history.length,
      total: 7,
      completed: complete(s),
      failed: failed(s),
      mode: s.mode,
      route: s.route,
      score: score(s),
      best: Math.max(s.best, score(s)),
      health: Math.max(0, 100 - s.mistakes * m.damage),
      remaining: Math.max(0, m.limit - s.seconds),
      seconds: s.seconds,
      mistakes: s.mistakes,
    };
  }
  /** 向界面提供冻结的状态摘要，避免界面直接修改内部会话。 */
  function snapshot() {
    return owned()
      ? Object.freeze({ id: session.id, paused: session.paused, ...summary(session.state) })
      : null;
  }
  function blocked() {
    return active() && (session.paused || complete(session.state) || failed(session.state));
  }
  /** 仅保存当前账号当前文物的进度，同时保留其他文物和编钟探索存档。 */
  function save() {
    if (!owned()) return false;
    const s = G.Store.load(),
      p = session.state;
    p.best = Math.max(p.best, score(p));
    if (active()) p.position = { x: G.Scene.player.x, y: G.Scene.player.y };
    s.expeditions = {
      ...(s.expeditions && typeof s.expeditions === 'object' && !Array.isArray(s.expeditions)
        ? s.expeditions
        : {}),
      [session.id]: JSON.parse(JSON.stringify(p)),
    };
    s.lastExpedition = complete(p) ? null : session.id;
    s.lastActivity = 'expedition';
    return G.Store.save(s);
  }
  function stepInfo() {
    if (!owned()) return null;
    const s = session.state,
      k = keys(s.route)[s.history.length],
      c = C[session.id],
      scene = G.Maps['relic-' + session.id];
    if (!k) return null;
    const definitions = {
      briefing: {
        target: 'exp-guide',
        name: '与' + c.guide + '交谈',
        task: '靠近向导，选择本次调查路线。',
      },
      visual: { target: 'visual', name: c.visual[0], task: '调查器形线索，收录观察记录。' },
      record: { target: 'record', name: c.record[0], task: '阅读档案线索，收录文字记录。' },
      'puzzle-0': {
        target: 'study',
        name: c.puzzles[0].title,
        task: '带着两条线索完成第一道谜题。',
      },
      mentor: {
        target: 'exp-master',
        name: '请教' + c.master,
        task: '对照调查路线，听取下一段提示。',
      },
      'puzzle-1': { target: 'bench', name: c.puzzles[1].title, task: '完成第二道操作谜题。' },
      curate: {
        target: 'portal',
        name: '核验展签，启动归藏',
        task: '前往北侧时门，选择有证据支持的展签。',
      },
    };
    const d = definitions[k];
    return {
      key: k,
      ...d,
      point:
        scene.npcList.find((n) => n.id === d.target) ||
        scene.objects.find((o) => o.id === d.target),
    };
  }
  function target() {
    const q = stepInfo();
    return q ? Object.freeze({ ...q.point }) : null;
  }
  function format(n) {
    return (
      Math.floor(n / 60)
        .toString()
        .padStart(2, '0') +
      ':' +
      Math.floor(n % 60)
        .toString()
        .padStart(2, '0')
    );
  }
  /** 状态摘要变化时才重绘任务栏，减少每帧更新 DOM 的开销。 */
  function hud() {
    const root = document.getElementById('expedition-hud');
    if (!root || !owned()) return;
    const s = snapshot(),
      q = stepInfo(),
      stamp = [s.step, s.score, s.health, Math.ceil(s.remaining), session.paused].join('|');
    if (stamp === hudStamp) return;
    hudStamp = stamp;
    root.innerHTML = `<div class="exp-hud-top"><span>${modes[s.mode].name} · ${s.step} / 7 条线索</span><button data-exp-action="pause">暂停</button></div><div class="quest-progress"><i style="width:${(s.step / 7) * 100}%"></i></div><h2>${esc(q?.name || '档案已复原')}</h2><p>${esc(q?.task || '文物即将归藏。')}</p><div class="exp-stats"><span>积分 <b>${s.score}</b></span><span>最高 <b>${s.best}</b></span><span>稳定值 <b>${s.health}</b></span><span>剩余 <b>${format(Math.ceil(s.remaining))}</b></span></div><div class="exp-actions"><button data-exp-action="hint">提示</button><button data-exp-action="journal">手记</button><button data-exp-action="restart">重开</button></div>`;
  }
  function panel(title, body) {
    panelToken++;
    G.UI.modal(title, `<div id="exp-work">${body}</div>`);
    const d = document.querySelector('.dialog');
    d.classList.add('exp-dialog');
    d.style.setProperty('--exp-accent', C[session.id].accent);
    return panelToken;
  }
  function feedback(message, good = false) {
    const el = document.getElementById('exp-feedback');
    if (el) {
      el.textContent = message;
      el.className = 'exp-feedback ' + (good ? 'good' : 'bad');
    }
  }
  /** 限制连续误操作的扣分频率，并在稳定值耗尽时进入失败状态。 */
  function mistake(message) {
    if (!active() || blocked()) return;
    const now = performance.now();
    if (now - lastInput < 600) return;
    lastInput = now;
    session.state.mistakes++;
    save();
    G.FX.play('error');
    feedback(message);
    hudStamp = '';
    hud();
    if (failed(session.state)) ending(false);
  }
  /** 检查预期任务，保存成功后再推进；保存失败时撤回本次进度。 */
  function finish(expected) {
    if (!active() || blocked()) return false;
    const s = session.state;
    if (keys(s.route)[s.history.length] !== expected) return false;
    const before = [...s.history];
    s.history.push(expected);
    s.work = {};
    if (!save()) {
      s.history = before;
      G.UI.toast('记录尚未保存，请检查浏览器存储后再试。');
      return false;
    }
    G.FX.play('success');
    G.UI.close();
    hudStamp = '';
    hud();
    if (complete(s)) return archive();
    G.UI.toast('线索已收录 · +' + modes[s.mode].reward + ' 分');
    return true;
  }
  /** 锁定已解答控件，并校验面板令牌，防止旧弹窗回调推进新任务。 */
  function solved(note, token, key) {
    if (token !== panelToken || blocked()) return;
    feedback(note, true);
    document
      .querySelectorAll('#exp-work [data-input],#exp-work select,#exp-work input')
      .forEach((b) => (b.disabled = true));
    const b = document.getElementById('exp-done');
    if (b) {
      b.hidden = false;
      b.onclick = () => {
        if (token === panelToken) finish(key);
      };
      b.focus();
    }
  }
  const controls = () =>
    '<p id="exp-feedback" class="exp-feedback" role="status" aria-live="polite"></p><button id="exp-done" class="primary" hidden>收录证据，继续 →</button>';
  /** 根据配置创建不同题型，并绑定校验及半成品答案的存档操作。 */
  function puzzle(index) {
    const p = C[session.id].puzzles[index],
      s = session.state,
      w = s.work,
      key = 'puzzle-' + index;
    let body = `<p>${esc(p.prompt)}</p>`;
    const type = p.type;
    if (['match', 'sort'].includes(type))
      body += `<form id="exp-form" class="exp-match">${p.rows.map(([label], i) => `<label>${esc(label)}<select data-input name="r${i}" required><option value="">请选择</option>${p.choices.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select></label>`).join('')}<button data-input class="primary">核验配对</button></form>`;
    else if (['order', 'panorama'].includes(type))
      body += `<div class="exp-order ${type === 'panorama' ? 'exp-panorama' : ''}">${p.shuffle.map((i) => `<button data-input data-card="${i}">${type === 'panorama' ? `<span class="exp-scene-strip strip-${i}" aria-hidden="true">${['车', '马', '犬', '迎', '宾'][i]}</span>` : ''}<span>${esc(p.items[i])}</span></button>`).join('')}</div><p id="exp-order-readout" class="exp-readout"></p><button data-input id="exp-reset">重新排列</button><button data-input class="primary" id="exp-check">核验顺序</button>`;
    else if (type === 'shape')
      body +=
        '<div class="exp-shapes">' +
        [
          ['circle', '<circle cx="90" cy="55" r="36"/>'],
          ['diamond', '<path d="M90 10L144 55L90 100L36 55Z"/>'],
          ['wave', '<path d="M15 70Q52 5 90 70T165 70"/>'],
        ]
          .map(
            ([id, path]) =>
              `<button data-input data-shape="${id}" aria-label="选择${{ circle: '圆形', diamond: '菱形', wave: '波纹' }[id]}纹样"><svg viewBox="0 0 180 110">${path}</svg></button>`,
          )
          .join('') +
        '</div>';
    else if (type === 'number')
      body += `<form id="exp-number"><label>剩余份数<input data-input name="quantity" type="number" inputmode="numeric" min="${p.min}" max="${p.max}" step="1" required placeholder="输入核验结果"></label><button data-input class="primary">核验账目</button></form>`;
    else if (type === 'wheel')
      body += `<div class="exp-wheel"><span>五格日影盘</span><strong id="exp-wheel-value"></strong><small>甲 → 乙 → 丙 → 丁 → 戊 → 甲</small></div><div class="exp-actions"><button data-input id="exp-prev">← 退一格</button><button data-input id="exp-next">进一格 →</button><button data-input id="exp-wheel-check" class="primary">核验位置</button></div>`;
    else if (type === 'rotate')
      body += `<div class="exp-tiles">${[0, 1, 2, 3].map((i) => `<button data-input data-tile="${i}" aria-label="旋转第${i + 1}片"><svg viewBox="0 0 120 120"><path class="jade-quadrant" d="M15 104Q15 15 104 15V40Q40 40 40 104Z"/><path d="M60 94V47M45 61L60 42L75 61"/><circle cx="60" cy="100" r="4"/></svg><small>第 ${i + 1} 片</small></button>`).join('')}</div><button data-input class="primary" id="exp-rotate-check">核验四片</button>`;
    else if (type === 'rhythm')
      body +=
        '<div class="exp-rhythm-score">轻 · 重 · 轻 · 轻</div><p id="exp-beat" class="exp-readout"></p><div class="exp-rhythm"><button data-input data-drum="0">轻击 <kbd>1</kbd></button><button data-input data-drum="1">重击 <kbd>2</kbd></button></div>';
    const token = panel(p.title, body + controls());
    const success = () => solved(p.note, token, key),
      wrong = () => mistake('还没有对上证据。可重看两条线索，或打开提示。');
    if (['match', 'sort'].includes(type)) {
      const f = document.getElementById('exp-form');
      p.rows.forEach((_, i) => (f.elements['r' + i].value = w.answers?.[i] || ''));
      f.onchange = () => {
        w.answers = p.rows.map((_, i) => f.elements['r' + i].value);
        save();
      };
      f.onsubmit = (e) => {
        e.preventDefault();
        if (p.rows.every(([, answer], i) => f.elements['r' + i].value === answer)) success();
        else wrong();
      };
    }
    if (['order', 'panorama'].includes(type)) {
      w.order = (w.order || []).filter((i) => i < p.items.length);
      const update = () => {
        document.getElementById('exp-order-readout').textContent = w.order.length
          ? w.order.map((i) => p.items[i]).join(' → ')
          : '请选择第一张卡片';
        document.querySelectorAll('[data-card]').forEach((b) => {
          b.disabled = w.order.includes(+b.dataset.card);
          b.classList.toggle('recorded', b.disabled);
        });
      };
      document.querySelectorAll('[data-card]').forEach(
        (b) =>
          (b.onclick = () => {
            const i = +b.dataset.card;
            if (!w.order.includes(i)) w.order.push(i);
            save();
            update();
          }),
      );
      document.getElementById('exp-reset').onclick = () => {
        w.order = [];
        save();
        update();
      };
      document.getElementById('exp-check').onclick = () =>
        w.order.length === p.items.length && w.order.every((n, i) => n === i) ? success() : wrong();
      update();
    }
    if (type === 'shape')
      document
        .querySelectorAll('[data-shape]')
        .forEach((b) => (b.onclick = () => (b.dataset.shape === p.answer ? success() : wrong())));
    if (type === 'number') {
      const f = document.getElementById('exp-number');
      f.elements.quantity.value = w.number || '';
      f.oninput = () => {
        w.number = f.elements.quantity.value;
        save();
      };
      f.onsubmit = (e) => {
        e.preventDefault();
        const v = f.elements.quantity.value;
        if (v !== '' && Number(v) === p.answer) success();
        else wrong();
      };
    }
    if (type === 'wheel') {
      if (w.wheel == null) w.wheel = p.initial;
      const update = () =>
        (document.getElementById('exp-wheel-value').textContent = p.items[w.wheel]);
      document.getElementById('exp-next').onclick = () => {
        w.wheel = (w.wheel + 1) % 5;
        save();
        update();
      };
      document.getElementById('exp-prev').onclick = () => {
        w.wheel = (w.wheel + 4) % 5;
        save();
        update();
      };
      document.getElementById('exp-wheel-check').onclick = () =>
        w.wheel === p.answer ? success() : wrong();
      update();
    }
    if (type === 'rotate') {
      w.turns = w.turns || [...p.initial];
      const update = () =>
        document.querySelectorAll('[data-tile]').forEach((b, i) => {
          b.querySelector('svg').style.transform = `rotate(${w.turns[i] * 90}deg)`;
          b.setAttribute('aria-label', `旋转第${i + 1}片，当前${w.turns[i] * 90}度`);
        });
      document.querySelectorAll('[data-tile]').forEach(
        (b, i) =>
          (b.onclick = () => {
            w.turns[i] = (w.turns[i] + 1) % 4;
            save();
            update();
          }),
      );
      document.getElementById('exp-rotate-check').onclick = () =>
        w.turns.every((n) => n === 0) ? success() : wrong();
      update();
    }
    if (type === 'rhythm') {
      w.rhythm = w.rhythm || 0;
      const update = () =>
        (document.getElementById('exp-beat').textContent = `已接回 ${w.rhythm} / 4 拍`);
      const hit = (n) => {
        if (token !== panelToken || blocked() || w.rhythm >= 4) return;
        G.BellSound.hit(n ? 3 : 0);
        if (n !== p.sequence[w.rhythm]) {
          wrong();
          return;
        }
        w.rhythm++;
        save();
        update();
        if (w.rhythm === 4) success();
      };
      document
        .querySelectorAll('[data-drum]')
        .forEach((b) => (b.onclick = () => hit(+b.dataset.drum)));
      document.querySelector('.exp-dialog').onkeydown = (e) => {
        if (/^[12]$/.test(e.key) && !e.repeat) {
          e.preventDefault();
          hit(+e.key - 1);
        }
      };
      update();
      if (w.rhythm === 4) success();
    }
  }
  function interact() {
    if (!active() || G.UI.isOpen() || blocked()) return;
    const q = stepInfo(),
      t = q?.point;
    if (!t || Math.hypot(G.Scene.player.x - t.x, G.Scene.player.y - t.y) > 115) {
      G.UI.toast('先靠近金色标记，再按 E 或点击交互。');
      return;
    }
    const c = C[session.id],
      s = session.state;
    if (q.key === 'briefing') {
      panel(
        c.guide,
        `<p class="exp-dialogue">${esc(c.opening)}</p><p>你准备先从哪条线索查起？两条路线都需要收齐证据。</p><div class="exp-actions"><button class="primary" data-route="form-first">先看器形，循物求证</button><button data-route="record-first">先读档案，循文求证</button></div>`,
      );
      document.querySelectorAll('[data-route]').forEach(
        (b) =>
          (b.onclick = () => {
            s.route = b.dataset.route;
            finish('briefing');
          }),
      );
    } else if (q.key === 'visual' || q.key === 'record') {
      const clue = c[q.key],
        token = panel(
          clue[0],
          `<div class="exp-clue-art">${G.Artwork(G.Artifacts.find((a) => a.id === session.id).kind)}</div><p>${esc(clue[1])}</p><button class="primary" id="exp-collect-clue">收录${q.key === 'visual' ? '器形' : '档案'}线索</button>`,
        );
      document.getElementById('exp-collect-clue').onclick = () => {
        if (token === panelToken) finish(q.key);
      };
    } else if (q.key === 'mentor') {
      const token = panel(
        c.master,
        `<p class="exp-dialogue">${esc(c.talk)}</p><p class="muted">${s.route === 'record-first' ? '你先读档案再核器形，文字与物证已经相互印证。' : '你先辨器形再查档案，物证已在文字中找到了位置。'}</p><button class="primary" id="exp-follow">带上建议，继续调查</button>`,
      );
      document.getElementById('exp-follow').onclick = () => {
        if (token === panelToken) finish('mentor');
      };
    } else if (q.key === 'curate') {
      const options = [c.distractors[0], c.label, c.distractors[1]],
        token = panel(
          '核验展签 · ' + G.Artifacts.find((a) => a.id === session.id).name,
          `<p>请选择由本次证据支持的展签。核验通过后，时门将送你与文物档案返回展馆。</p><div class="exp-options">${options.map((v, i) => `<button data-input data-label="${i}">${esc(v)}</button>`).join('')}</div>${controls()}`,
        );
      document
        .querySelectorAll('[data-label]')
        .forEach(
          (b) =>
            (b.onclick = () =>
              +b.dataset.label === 1
                ? solved('展签核验通过，可以启动归藏。', token, 'curate')
                : mistake('这张展签与线索不符，请对照手记再选。')),
        );
    } else puzzle(q.key === 'puzzle-0' ? 0 : 1);
  }
  /** 核验完整通关凭证，归藏文物并自动返回所属展厅。 */
  async function archive() {
    if (!owned()) return false;
    const id = session.id,
      a = G.Artifacts.find((a) => a.id === id),
      s = summary(session.state);
    const result = G.Collection.unlock(id);
    if (!result.ok) {
      panel(
        '归藏尚未保存',
        `<p>${esc(result.reason || '请允许浏览器存储后再试。')}</p><button data-exp-action="archive">再次保存归藏</button>`,
      );
      return false;
    }
    await G.Router.go('hall', a.hall);
    requestAnimationFrame(() => {
      const track = document.getElementById('track'),
        card = document.querySelector('[data-artifact="' + id + '"]');
      if (track && card)
        track.scrollTo({
          left: card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2,
          behavior: 'instant',
        });
    });
    G.FX.play('victory');
    if (G.Collection.full()) {
      collectionVictory();
      return true;
    }
    G.UI.modal(
      '归藏完成 · ' + a.name,
      `<div class="exp-completion-art">${G.Artwork(a.kind)}</div><p>已返回${esc(G.Halls.find((h) => h.id === a.hall).name)}，文物展柜已点亮。</p><p>本篇积分 <strong>${s.score}</strong> · 收录 7 / 7 条线索 · ${format(s.seconds)}</p><p>全馆归藏 ${G.Collection.count()} / ${G.Artifacts.length}</p><button class="primary" data-exp-action="details" data-relic="${id}">查看文物与剧情回溯</button><button data-exp-action="catalog">继续寻珍</button>`,
    );
    return true;
  }
  function ending(win) {
    if (!owned()) return;
    save();
    G.Player.clear();
    const s = snapshot();
    G.FX.play('failure');
    panel(
      '时序回溯 · 本篇挑战结束',
      `<p>${s.health <= 0 ? '时序稳定值已耗尽。' : '时门倒计时已结束。'}文物仍等待你再次寻回。</p><p>本篇 ${s.score} 分 · 最高 ${s.best} 分。已收集文物档案保留。</p><button class="primary" data-exp-action="restart">重新开始</button><button data-exp-action="leave">返回展馆</button>`,
    );
  }
  /** 统一推进副本计时；暂停和结束状态阻止倒计时继续消耗。 */
  function tick(dt) {
    if (
      !active() ||
      blocked() ||
      document.hidden ||
      (G.UI.isOpen() && !document.getElementById('exp-work')) ||
      !Number.isFinite(dt) ||
      dt < 0
    )
      return;
    session.state.seconds = Math.min(modes[session.state.mode].limit, session.state.seconds + dt);
    if (failed(session.state)) ending(false);
    hud();
  }
  function update(dt) {
    if (!active()) return;
    hud();
    const t = target(),
      b = document.getElementById('exp-interact');
    if (b) {
      b.hidden =
        !t || blocked() || Math.hypot(G.Scene.player.x - t.x, G.Scene.player.y - t.y) > 115;
      b.textContent = t ? '[ E ] ' + t.name : '';
    }
  }
  function draw(ctx, scene, p, view) {
    G.ExpeditionScenes.draw(
      ctx,
      scene,
      view,
      target(),
      session.state.history.length,
      session.state.seconds,
    );
  }
  function attach() {
    document.body.classList.add('in-expedition');
    hudStamp = '';
    hud();
    if (window.innerWidth < 700) document.querySelector('.exp-panel')?.removeAttribute('open');
    if (failed(session.state)) ending(false);
    else if (complete(session.state)) archive();
  }
  /** 恢复或新建指定篇章的会话，载入地图和已保存的位置。 */
  async function open(id, mode = null, restart = false) {
    if (!C[id] || G.Router.busy) return;
    if (!G.Auth.current()) return G.UI.auth();
    G.Scene.stop();
    if (G.Challenge.active())
      await G.Challenge.exit('hall', G.Artifacts.find((a) => a.id === id).hall);
    const previous = entry(id);
    session = {
      owner: G.Auth.current(),
      id,
      paused: false,
      state: restart ? { ...fresh(mode || previous.mode), best: previous.best } : previous,
    };
    lastInput = -1000;
    hudStamp = '';
    save();
    await routeBase('map', 'relic-' + id, session.state.position);
  }
  function launch(id) {
    if (!C[id]) return;
    if (!G.Auth.current()) return G.UI.auth();
    const c = C[id],
      s = entry(id),
      a = G.Artifacts.find((a) => a.id === id);
    G.UI.modal(
      c.title,
      `<div class="exp-launch-art">${G.Artwork(a.kind)}</div><p>${esc(c.opening)}</p><p class="muted">7 条线索 · 两道操作谜题 · 两条调查路线 · WASD 移动／E 交互。人物与解谜情节为演绎，完成后归还文物数字档案。</p>${s.history.length && !complete(s) && !failed(s) ? `<button class="primary" data-exp-resume="${id}">继续调查 · ${s.history.length} / 7</button>` : ''}<div class="exp-mode-buttons"><button data-exp-start="${id}" data-mode="easy">简单 · 12分钟 · 稳定值100</button><button data-exp-start="${id}" data-mode="hard">困难 · 6分钟 · 失误惩罚更高</button></div><p class="muted">选择难度将开始本篇新一轮；最高分与已归藏文物档案保留。当前检查点会自动保存。</p>`,
    );
  }
  function restart() {
    if (!owned()) return;
    const id = session.id;
    G.UI.modal(
      '重新开始本篇',
      `<p>将重置本篇线索、积分、时间与稳定值，最高分和全部文物档案保留。</p><button class="primary" data-exp-start="${id}" data-mode="${session.state.mode}">确认重新开始</button><button data-exp-action="pause">回到本篇菜单</button>`,
    );
  }
  function pause() {
    if (!owned()) return;
    session.paused = true;
    G.Player.clear();
    G.BellSound.stop();
    save();
    G.UI.modal(
      '寻珍已暂停',
      `<p>角色和倒计时已暂停。关闭菜单可继续。</p><button class="primary" data-exp-action="resume">继续调查</button><button data-exp-action="journal">本篇手记</button><button data-exp-action="restart">重新开始</button><button data-exp-action="leave">保存并返回展馆</button>`,
    );
  }
  function journal() {
    if (!owned()) return;
    const c = C[session.id],
      s = session.state;
    G.UI.modal(
      '寻珍手记 · ' + c.title,
      `<p>已收录 ${s.history.length} / 7 条线索 · 路线：${s.route === 'record-first' ? '循文求证' : '循物求证'}</p>${['visual', 'record'].map((k) => `<article><h3>${esc(c[k][0])}</h3><p>${s.history.includes(k) ? esc(c[k][1]) : '尚未收录，跟随金色标记调查。'}</p></article>`).join('')}<p>已完成谜题：${s.history.includes('puzzle-0') ? esc(c.puzzles[0].title) : '第一谜题待完成'} ／ ${s.history.includes('puzzle-1') ? esc(c.puzzles[1].title) : '第二谜题待完成'}</p><p><a href="${c.source}" target="_blank" rel="noopener">资料来源 ↗</a></p>`,
    );
  }
  function hint() {
    if (!owned()) return;
    session.state.hints++;
    save();
    const q = stepInfo();
    G.UI.modal(
      '线索提示',
      `<p>${q?.key.startsWith('puzzle') ? esc(C[session.id].puzzles[q.key === 'puzzle-0' ? 0 : 1].note) : '跟随地图中的金色菱形，靠近当前目标后按 E。'}</p><p class="muted">提示不扣分；当前目标：${esc(q?.name || '归藏')}</p>`,
    );
  }
  function catalog() {
    G.UI.modal(
      '十二遗珍 · 时空卷册',
      `<p>已归藏 ${G.Collection.count()} / ${G.Artifacts.length} 件（含专题展柜）。选择展品即可进入对应副本。</p><div class="exp-catalog">${G.Artifacts.map((a) => `<button ${a.id === 'bells' ? 'data-exp-bells' : 'data-exp-launch="' + a.id + '"'}><span>${G.Artwork(a.kind)}</span><strong>${esc(a.name)}</strong><small>${G.Collection.isUnlocked(a.id) ? '✓ 已归藏 · 可重游' : '◇ 待寻回'}${C[a.id] ? ' · 约3–6分钟' : ''}</small></button>`).join('')}</div>`,
    );
  }
  /** 展示已归藏文物的介绍、调查分支回溯及资料来源。 */
  function details(id) {
    const a = G.Artifacts.find((a) => a.id === id);
    if (!a || !G.Collection.isUnlocked(id)) return G.UI.toast('请先完成本篇，点亮文物档案。');
    const c = C[id],
      s = c ? entry(id) : null;
    G.UI.modal(
      a.name + ' · 文物档案',
      `<div class="exp-completion-art">${G.Artwork(a.kind)}</div><p>${esc(a.description)}</p><p>${esc(c?.label || '65件编钟的器形、铭文、编悬与乐音已复原。')}</p><h3>剧情回溯</h3><p>${esc(c?.opening || '你从楚宫受命，经过工坊、渡口与礼乐殿，完成编钟档案归藏。')}</p>${c ? `<p>调查路线：${s.route === 'record-first' ? '先读档案，循文求证' : '先看器形，循物求证'}。两条证据相互印证后，你完成了「${esc(c.puzzles[0].title)}」与「${esc(c.puzzles[1].title)}」，通过展签核验并返回展馆。</p>` : ''}<p><a href="${c?.source || a.source}" target="_blank" rel="noopener">查看资料来源 ↗</a></p><button ${id === 'bells' ? 'data-exp-bells' : 'data-exp-launch="' + id + '"'}>重游此篇</button>`,
    );
  }
  function collectionVictory() {
    G.UI.modal(
      '十二遗珍归藏 · 荆楚长卷重明',
      `<div class="exp-full-seal">十二遗珍<br>悉数归藏</div><p>青铜、漆木、简牍与金玉的记忆已在展馆重新相逢。全部 ${G.Artifacts.length} 个展柜与专题档案已点亮。</p><p>全收集成就已随账号保存。你可以重游任一篇章，或在已归藏展柜中回看文物与行旅故事。</p><button class="primary" data-go="museum">返回展馆</button><button data-exp-action="catalog">重游时空卷册</button>`,
    );
    G.FX.play('victory');
  }

  // 仅副本地图走本控制器；编钟的原剧情和计分挑战继续使用原控制器。
  const routeBase = G.Router.go;
  G.Router.go = async (page = 'home', id = null, pos = null) => {
    if (page === 'map' && G.Maps[id]?.expeditionId) {
      const relic = G.Maps[id].expeditionId;
      if (!owned() || session.id !== relic) return open(relic);
      return routeBase(page, id, pos);
    }
    if (owned()) {
      G.Scene.stop();
      session = null;
      document.body.classList.remove('in-expedition');
    }
    return routeBase(page, id, pos);
  };
  const sceneSave = G.Scene.save;
  G.Scene.save = function () {
    if (active()) return save();
    return sceneSave.call(this);
  };
  const scenePage = G.Scene.page;
  G.Scene.page = (id) => {
    const scene = G.Maps[id];
    if (!scene?.expeditionId) return scenePage(id);
    return `<section class="world-screen expedition-screen"><canvas id="world" aria-label="${esc(scene.sceneName)}，WASD移动，靠近线索按E"></canvas><div class="world-hud"><div><p class="eyebrow">${esc(scene.era)} / ${esc(C[scene.expeditionId].title)}</p><h1>${esc(scene.sceneName)}</h1><small>循金色标记收录线索，完成后启动归藏时门</small></div><div class="world-buttons"><button data-exp-action="pause">暂停／继续</button><button data-exp-action="journal">手记</button><button data-action="settings">设置</button><button data-exp-action="leave">返回展馆</button></div></div><details class="exp-panel" open><summary>当前任务 · 寻珍手记</summary><aside id="expedition-hud"></aside></details><button id="exp-interact" class="exp-interact" hidden></button><div class="touch-move"><button data-move="w" aria-label="向上">↑</button><button data-move="a" aria-label="向左">←</button><button data-move="s" aria-label="向下">↓</button><button data-move="d" aria-label="向右">→</button></div></section>`;
  };
  for (const name of ['attach', 'update', 'draw', 'interact']) {
    const original = G.BellsQuest[name];
    G.BellsQuest[name] = (...args) =>
      active() ? { attach, update, draw, interact }[name](...args) : original(...args);
  }
  const uiClose = G.UI.close;
  G.UI.close = () => {
    panelToken++;
    uiClose();
    if (owned()) session.paused = false;
  };
  const originalMenu = G.Scene.menu;
  G.Scene.menu = () => (active() ? journal() : originalMenu());
  // 首页副本入口独立放在左上角，沿用原有卷册点击逻辑与归藏计数。
  const originalHome = G.Museum.home;
  G.Museum.home = () =>
    originalHome().replace(
      '<span>湖北省博物馆 · 荆楚文化主题探索</span>',
      '<div class="home-exp-entry"><span>湖北省博物馆 · 荆楚文化主题探索</span><button class="home-exp-button" data-exp-action="catalog"><span><span class="home-exp-prefix">十二遗珍 · </span>文物副本</span><small>' +
        G.Collection.count() +
        ' / ' +
        G.Artifacts.length +
        ' →</small></button></div>',
    );
  document.addEventListener(
    'click',
    (e) => {
      const b = e.target.closest(
        '[data-exp-launch],[data-exp-start],[data-exp-resume],[data-exp-action],[data-exp-bells],#exp-interact',
      );
      if (b) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (b.dataset.expLaunch) return launch(b.dataset.expLaunch);
        if (b.dataset.expStart) return open(b.dataset.expStart, b.dataset.mode, true);
        if (b.dataset.expResume) return open(b.dataset.expResume);
        if (b.hasAttribute('data-exp-bells')) {
          G.UI.close();
          return G.Router.go('hall', 'zeng');
        }
        if (b.id === 'exp-interact') return interact();
        const a = b.dataset.expAction;
        if (a === 'catalog') catalog();
        else if (a === 'pause') pause();
        else if (a === 'resume') G.UI.close();
        else if (a === 'hint') hint();
        else if (a === 'journal') journal();
        else if (a === 'restart') restart();
        else if (a === 'leave' && owned())
          G.Router.go('hall', G.Artifacts.find((a) => a.id === session.id).hall);
        else if (a === 'archive') archive();
        else if (a === 'details') details(b.dataset.relic);
        return;
      }
      if (e.target.closest('[data-action="continue"]')) {
        const s = G.Store.load();
        if (s.lastActivity === 'expedition' && C[s.lastExpedition]) {
          e.preventDefault();
          e.stopImmediatePropagation();
          open(s.lastExpedition);
        }
      }
    },
    true,
  );
  window.addEventListener(
    'keydown',
    (e) => {
      if (
        e.key.toLowerCase() === 'e' &&
        active() &&
        !G.UI.isOpen() &&
        !e.repeat &&
        !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        interact();
        return;
      }
      if (e.key === 'Escape' && active() && !G.UI.isOpen()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        pause();
      }
    },
    true,
  );
  window.addEventListener('blur', () => {
    if (active() && !blocked()) pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && active() && !blocked()) pause();
  });
  return Object.freeze({
    pauseOnError: () => {
      if (active()) pause();
    },
    active,
    blocked,
    snapshot,
    target,
    stepInfo,
    entry,
    normalize,
    complete,
    save,
    tick,
    open,
    launch,
    catalog,
    details,
    collectionVictory,
  });
})();

// 所有展柜都需要完整通关凭证；文物档案解锁不能通过一次点击直接领取。
(() => {
  const G = Game,
    old = G.Collection.unlock;
  G.Collection.count = () => G.Artifacts.filter((a) => G.Collection.isUnlocked(a.id)).length;
  G.Collection.full = () => G.Collection.count() === G.Artifacts.length;
  G.Collection.unlock = (id) => {
    if (id === 'bells') return old(id);
    if (!G.ExpeditionContent[id] || !G.Expeditions.complete(G.Expeditions.entry(id)))
      return { ok: false, reason: '请先完成本篇全部线索与展签核验。' };
    const s = G.Store.load();
    if (!s.collectedArtifacts.includes(id)) s.collectedArtifacts.push(id);
    return { ok: G.Store.save(s), reason: '浏览器未能保存归藏，请允许本地存储后重试。' };
  };
  const completed = G.Agent.completed;
  G.Agent.completed = () => (G.Collection.full() ? G.Expeditions.collectionVictory() : completed());
})();

document.addEventListener('click', (e) => {
  const box = e.target.closest('.glass-case');
  if (!box) return;
  const id = box.closest('[data-artifact]')?.dataset.artifact;
  if (Game.Collection.isUnlocked(id)) Game.Expeditions.details(id);
});

// 编钟最后完成时，同样触发全馆结局。
(() => {
  const previous = Game.Challenge;
  Game.Challenge = Object.freeze({
    ...previous,
    outcome: () =>
      previous.snapshot()?.status === 'won' && Game.Collection.full()
        ? Game.Expeditions.collectionVictory()
        : previous.outcome(),
  });
  for (const [id, c] of Object.entries(Game.ExpeditionContent))
    Game.Artifacts.find((a) => a.id === id).source = c.source;
})();
