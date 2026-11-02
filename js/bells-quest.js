/**
 * @file bells-quest.js
 * @description 编钟篇任务控制器。维护任务顺序、解谜反馈、手记和通关归藏。
 */
Game.BellsQuest = (() => {
  const C = Game.BellsContent,
    steps = C.steps,
    esc = (s) => Game.UI.esc(s);
  let state = null,
    near = null,
    hudStamp = '',
    refresh = 0,
    pendingTimer = null;
  /** 取消延迟反馈；关闭弹窗或离开场景后，不再推进旧任务。 */
  function cancelPending() {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  const fresh = () => ({
    version: 2,
    step: 0,
    seconds: 0,
    mistakes: 0,
    hints: 0,
    data: {},
    completed: false,
  });
  /** 校验读取的任务记录，兼容缺失字段与旧版存档。 */
  function normalize(raw) {
    const s = fresh();
    if (!raw || ![1, 2].includes(raw.version)) return s;
    s.step = Number.isInteger(raw.step)
      ? Math.max(
          0,
          Math.min(steps.length, raw.version === 1 ? Math.max(0, raw.step - 1) : raw.step),
        )
      : 0;
    s.seconds = Number.isFinite(raw.seconds) ? Math.max(0, raw.seconds) : 0;
    s.mistakes = Number.isInteger(raw.mistakes) ? Math.max(0, raw.mistakes) : 0;
    s.hints = Number.isInteger(raw.hints) ? Math.max(0, raw.hints) : 0;
    if (raw.data && typeof raw.data === 'object')
      for (const q of steps) {
        const d = raw.data[q.id];
        if (d && typeof d === 'object' && !Array.isArray(d))
          s.data[q.id] = {
            solved: d.solved === true,
            front: d.front === true,
            side: d.side === true,
            hintLevel: Number.isInteger(d.hintLevel) ? Math.max(0, Math.min(2, d.hintLevel)) : 0,
            practiceNotes: Array.isArray(d.practiceNotes)
              ? [...new Set(d.practiceNotes.filter((n) => Number.isInteger(n) && n >= 0 && n <= 4))]
              : [],
            songMode: d.songMode === true,
            songIndex: Number.isInteger(d.songIndex) ? Math.max(0, Math.min(7, d.songIndex)) : 0,
            round: Number.isInteger(d.round) ? Math.max(0, Math.min(3, d.round)) : 0,
          };
      }
    s.completed = s.step === steps.length;
    return s;
  }
  function get() {
    return state || (state = normalize(Game.Store.load().bellsQuest));
  }
  function current() {
    return steps[get().step] || null;
  }
  /** 将当前任务状态合并到存档，交由存储模块统一写入。 */
  function persist(save) {
    if (state) save.bellsQuest = JSON.parse(JSON.stringify(state));
    return save;
  }
  function save() {
    Game.Store.save(persist(Game.Store.load()));
  }
  function progress() {
    const s = get();
    return s.data[steps[s.step]?.id] || (s.data[steps[s.step]?.id] = {});
  }
  function entity(step = current()) {
    if (!step) return null;
    return (
      (Game.BellsObjects[step.scene] || []).find((n) => n.id === step.target) ||
      Game.Maps[step.scene].npcList.find((n) => n.id === step.target)
    );
  }
  function target(scene) {
    const q = current();
    if (!q) return null;
    if (q.scene === scene.sceneId) return entity(q);
    if (scene.sceneId === 'overworld') {
      const p = Game.WorldPlaces.find((p) => p.id === q.scene);
      return {
        x: p.entry.x + p.entry.w / 2,
        y: p.entry.y + p.entry.h / 2,
        name: '进入' + Game.Maps[q.scene].sceneName,
      };
    }
    const exit = scene.exits[scene.exits.length - 1];
    return {
      x: exit.x + exit.w / 2,
      y: exit.y + exit.h / 2,
      name: '出口 · 前往' + Game.Maps[q.scene].sceneName,
    };
  }
  function attach() {
    state = normalize(Game.Store.load().bellsQuest);
    near = null;
    hudStamp = '';
    refresh = 0;
    renderHUD();
    const v = Game.Store.load();
    if (Game.Scene.scene.sceneId === 'palace' && !v.bellsOpeningSeen) {
      v.bellsOpeningSeen = true;
      Game.Store.save(v);
      Game.UI.modal(
        '千年钟鸣 · 寻钟之旅',
        '<p>湖北省博物馆中，曾侯乙编钟失去了踪影。为寻回这件遗珍，你循钟声回到楚惠王铸钟赠予曾侯乙的年代。</p><p>你将以护钟人的身份随队启程，穿过工坊、古道与渡口，在旅途中了解青铜铸造、礼乐风俗和文物的来历。完成护送与礼乐记录，让失落的编钟重归展馆。</p><p><strong>现在，沿大殿中轴前往御座，直接向楚惠王领取护送任务。</strong></p>',
      );
    }
  }
  /** 仅推进预期中的当前任务，避免连点或过期回调重复领奖。 */
  function complete(expected) {
    const s = get(),
      q = current();
    if (!q || q.id !== expected || (Game.Challenge && !Game.Challenge.canAdvance(expected)))
      return false;
    s.step++;
    Game.Challenge?.advance(expected, s.step);
    s.completed = s.step === steps.length;
    if (s.completed) {
      const v = Game.Store.load();
      if (!v.collectedArtifacts.includes('bells')) v.collectedArtifacts.push('bells');
      persist(v);
      Game.Store.save(v);
    } else save();
    hudStamp = '';
    renderHUD();
    return true;
  }
  function finish() {
    const q = current();
    if (!q) return;
    Game.BellSound.stop();
    if (complete(q.id)) {
      Game.UI.close();
      if (q.id === 'field-record') {
        Game.Router.go('map', 'future', Game.Navigation.museumArrival);
        return;
      }
      if (get().completed) certificate();
      else void 0;
    }
  }
  /** 展示成功反馈，并关联当前面板和任务，防止延迟回调串关。 */
  function result(text) {
    cancelPending();
    const body = document.getElementById('quest-body'),
      id = current()?.id;
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      if (
        current()?.id === id &&
        body &&
        document.getElementById('quest-body') === body &&
        !Game.Challenge?.blocked()
      )
        finish();
    }, 1400);
    const box = document.getElementById('quest-feedback');
    if (box) {
      box.textContent = text;
      box.className = 'quest-feedback success';
    }
    const next = document.getElementById('quest-done');
    if (next) {
      next.hidden = false;
      next.onclick = finish;
      next.focus();
    }
    document
      .querySelectorAll('#quest-body [data-answer],#quest-body [data-check]')
      .forEach((b) => (b.disabled = true));
    progress().solved = true;
    save();
  }
  function wrong(text) {
    if (Game.Challenge && !Game.Challenge.mistake()) return;
    get().mistakes++;
    save();
    const box = document.getElementById('quest-feedback');
    if (box) {
      box.textContent = text;
      box.className = 'quest-feedback retry';
      box.scrollIntoView({ block: 'nearest' });
    }
  }
  const feedback = () =>
    '<p id="quest-feedback" class="quest-feedback" role="status" aria-live="polite"></p><button id="quest-done" class="primary" hidden>记录证据，继续 →</button>';
  function panel(title, body) {
    cancelPending();
    Game.UI.modal(title, `<div id="quest-body">${body}</div>`);
    document.querySelector('.dialog').classList.add('quest-dialog');
    document.querySelector('.dialog .eyebrow').textContent =
      `礼乐档案 / ${C.chapters[current()?.chapter || 0]}`;
  }
  function talk(q, replay = false) {
    let page = 0;
    const draw = () => {
      panel(
        q.speaker,
        `<div class="speaker-card"><span>${q.target === 'letter' ? '笺' : '言'}</span><div><p>${esc(q.pages[page])}</p></div></div><div class="dialogue-footer"><small>${page + 1} / ${q.pages.length} · 可关闭后重新交谈</small><button id="dialogue-next" class="primary">${page === q.pages.length - 1 ? (replay ? '结束交谈' : '记下线索，出发 →') : '继续对话 →'}</button></div>`,
      );
      document.getElementById('dialogue-next').onclick = () => {
        if (page < q.pages.length - 1) {
          page++;
          draw();
        } else if (replay) Game.UI.close();
        else finish();
      };
    };
    draw();
  }
  function choices(items) {
    return `<div class="quest-options">${items.map(([id, text]) => `<button data-answer="${id}">${text}</button>`).join('')}</div>`;
  }
  function checkAnswer(correct, explanation, retry) {
    document
      .querySelectorAll('[data-answer]')
      .forEach(
        (b) =>
          (b.onclick = () => (b.dataset.answer === correct ? result(explanation) : wrong(retry))),
      );
  }
  function select(name, label, options) {
    return `<label>${label}<select name="${name}"><option value="">请选择档案项</option>${options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>`;
  }
  function shape() {
    const shapes = [
      ['round', '甲', '<circle cx="120" cy="60" r="43"/>'],
      ['oval', '乙', '<ellipse cx="120" cy="60" rx="82" ry="39"/>'],
      ['tile', '丙', '<path d="M30 60 Q120 -18 210 60 Q120 138 30 60Z"/>'],
      ['square', '丁', '<rect x="61" y="18" width="118" height="84" rx="2"/>'],
    ];
    panel(
      '辨认陶范 · 哪一道钟口？',
      `<p>哪一道钟口与工匠所说的“两弧相合、两端有棱”相符？</p><div class="shape-options">${shapes.map(([id, label, art]) => `<button data-answer="${id}" aria-label="选择${label}号陶范"><svg viewBox="0 0 240 120" aria-hidden="true">${art}</svg><span>${label}号陶范</span></button>`).join('')}</div>${feedback()}`,
    );
    checkAnswer(
      'tile',
      '就是这道陶范！两弧在两端相合，留下棱角。沿石路往前，试音钟已经备好了。',
      '再看看两端：工匠说的棱角，应当由两道弧线相合而成。',
    );
  }

  function tone() {
    const d = progress();
    const bell = Game.BronzeBell.single({ marks: false })
      .replace('role="img"', 'role="group"')
      .replace(
        '</svg>',
        '<g class="bell-hit" data-strike="front" role="button" tabindex="0" aria-label="① 正鼓部"><circle cx="-1" cy="42" r="10"/><text x="-1" y="45">①</text></g><g class="bell-hit secondary" data-strike="side" role="button" tabindex="0" aria-label="② 副鼓部"><circle cx="29" cy="36" r="10"/><text x="29" y="39">②</text></g></svg>',
      );
    panel(
      '一钟双音 · 试钟',
      `<p class="tone-intro">分别试敲两个部位，观察音名。</p><div class="tone-stage"><div class="tone-illustration">${bell}<span class="strike-caption front-caption">① 正鼓部</span><span class="strike-caption side-caption">② 副鼓部</span></div><p id="tone-readout" aria-live="polite">请选择一个敲击点</p><p id="tone-count">${d.front ? '✓' : '○'} 正鼓部　${d.side ? '✓' : '○'} 副鼓部</p></div>${choices(
        [
          ['two', '同一件钟，不同部位发出两个音'],
          ['force', '只是敲得更用力，声音变大了'],
          ['many', '必须换另一件钟才能得到另一音高'],
        ],
      )}${feedback()}`,
    );
    const strike = (b) => {
      const front = b.dataset.strike === 'front';
      d[front ? 'front' : 'side'] = true;
      save();
      Game.BellSound.hit(front ? 0 : 2);
      document.getElementById('tone-readout').textContent = front ? '正鼓部 · C' : '副鼓部 · E';
      document.getElementById('tone-count').textContent =
        `${d.front ? '✓' : '○'} 正鼓部　${d.side ? '✓' : '○'} 副鼓部`;
      document.querySelectorAll('.bell-hit').forEach((el) => el.classList.remove('struck'));
      b.classList.add('struck');
    };
    document.querySelectorAll('[data-strike]').forEach((b) => {
      b.onclick = () => strike(b);
      b.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          strike(b);
        }
      };
    });
    document.querySelectorAll('[data-answer]').forEach(
      (b) =>
        (b.onclick = () => {
          if (!d.front || !d.side) return wrong('先试敲图中的两个部位。');
          if (b.dataset.answer === 'two') result('两处钟声都验过了，可以交给车队启程了。');
          else wrong('再敲一次，听听同一件钟的两处声音。');
        }),
    );
  }

  function inscription() {
    panel(
      '启程之前 · 押运文书',
      `<blockquote class="evidence-quote">钟上记载：楚惠王为曾侯乙制作礼器，并赠送给曾侯乙。</blockquote><p>核对钟上记载，填好文书，交给行舟便可启程。</p><form id="evidence-form">${select(
        'donor',
        '谁赠送了这件钟？',
        [
          ['zeng', '曾侯乙'],
          ['chu', '楚惠王'],
          ['worker', '老工匠'],
        ],
      )}${select('receiver', '谁是受赠者？', [
        ['chu', '楚惠王'],
        ['zeng', '曾侯乙'],
        ['courier', '车队负责人'],
      ])}${select('object', '这条赠钟记录指向什么？', [
        ['all', '全套65件编钟'],
        ['bo', '其中一件镈钟'],
        ['niu', '19件钮钟'],
      ])}<button class="primary" data-check>签好文书，准备过河</button></form>${feedback()}`,
    );
    document.getElementById('evidence-form').onsubmit = (e) => {
      e.preventDefault();
      const f = e.currentTarget.elements;
      if (f.donor.value === 'chu' && f.receiver.value === 'zeng' && f.object.value === 'bo')
        result('文书无误！行舟已命人装车，可以过河前往曾国了。');
      else wrong('再读释意：赠钟者与受赠者不能倒置，也不能把一件镈钟扩大为整套编钟。');
    };
  }
  function arrange() {
    panel(
      '编悬校对 · 让六十五件归位',
      `<div class="rack-study"><svg viewBox="0 0 510 190" role="img" aria-label="三层曲尺形钟架"><g stroke="#b59466" stroke-width="6" fill="none"><path d="M50 17V135M145 50V170M450 50V170M50 20L145 55H450M50 58L145 93H450M50 96L145 131H450"/></g><g stroke="#e0c78f" fill="#80977c" stroke-width="2"><path d="M70 32v20l13 7V37ZM95 42v20l13 7V47Z"/><path d="M185 60v20h60V60ZM295 60v20h60V60ZM390 60v20h42V60Z"/><path d="M70 70v24l24 10V80ZM185 98v24h80V98ZM325 98v24h80V98Z"/><path d="M90 111v27l26 10V121ZM245 136v27h105V136Z"/></g><text x="260" y="188" text-anchor="middle" fill="#d4c49e" font-size="12">三层 · 曲尺形钟架</text></svg></div><form id="arrange-form"><div class="quest-columns">${select(
        'niu',
        '钮钟',
        [
          ['45', '45件'],
          ['1', '1件'],
          ['19', '19件'],
        ],
      )}${select('yong', '甬钟', [
        ['19', '19件'],
        ['45', '45件'],
        ['1', '1件'],
      ])}${select('bo', '镈钟', [
        ['1', '1件'],
        ['19', '19件'],
        ['45', '45件'],
      ])}</div><p id="bell-sum" class="sum">当前合计：0 / 65 件</p>${select(
        'rack',
        '整套怎样悬挂？',
        [
          ['wrong', '一层排列，所有钟一样大'],
          ['correct', '三层八组，悬挂在曲尺形钟架上'],
          ['three', '三层三组，悬挂在圆形钟架上'],
        ],
      )}<button data-check class="primary">提交编悬档案</button></form>${feedback()}`,
    );
    const form = document.getElementById('arrange-form');
    form.onchange = () => {
      document.getElementById('bell-sum').textContent =
        `当前合计：${['niu', 'yong', 'bo'].reduce((n, k) => n + Number(form.elements[k].value), 0)} / 65 件`;
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      const f = form.elements;
      if (
        f.niu.value === '19' &&
        f.yong.value === '45' &&
        f.bo.value === '1' &&
        f.rack.value === 'correct'
      )
        result('编悬档案已复原：19件钮钟 + 45件甬钟 + 1件镈钟，三层八组。');
      else wrong('总数相同也可能分错类别。核对钮钟19、甬钟45、镈钟1，再看钟架结构。');
    };
  }
  const notes = ['宫', '商', '角', '徵', '羽'];
  const star = (Game.StarSong = {
    phrase: [0, 0, 3, 3, 4, 4, 3],
    lyrics: ['一', '闪', '一', '闪', '亮', '晶', '晶'],
    beats: [1, 1, 1, 1, 1, 1, 2],
  });
  function melody() {
    const d = progress();
    d.practiceNotes = Array.isArray(d.practiceNotes) ? d.practiceNotes : [];
    d.songIndex = Math.max(0, Math.min(7, d.songIndex || 0));
    let busy = false;
    const art = () =>
      notes
        .map(
          (n, i) =>
            `<button data-note="${i}" aria-label="敲击${n}"><span class="key-bell-art">${Game.BronzeBell.single({ decorative: true })}</span><strong>${n}</strong><small>${['Do', 'Re', 'Mi', 'Sol', 'La'][i]}</small><kbd>${i + 1}</kbd></button>`,
        )
        .join('');
    const keyboard = (input) => {
      document
        .querySelectorAll('[data-note]')
        .forEach((b) => (b.onclick = () => input(+b.dataset.note)));
      document.querySelector('.quest-dialog').onkeydown = (e) => {
        if (/^[1-5]$/.test(e.key) && !e.repeat) {
          e.preventDefault();
          input(+e.key - 1);
        }
      };
    };
    const show = () => {
      busy = false;
      if (!d.songMode) {
        panel(
          '先试一试 · 听听你的钟声',
          `<p>乐师：“先随意敲几下，认一认钟声。试过两种不同的声音，再随我合奏。”</p><div class="bell-keys star-keys">${art()}</div><p id="melody-status" class="quest-feedback" role="status">已试过 ${d.practiceNotes.length} 种声音</p><button id="star-start" class="primary" ${d.practiceNotes.length < 2 ? 'disabled' : ''}>跟随提示 · 奏一曲小星星 →</button>`,
        );
        keyboard((n) => {
          Game.BellSound.hit(n);
          if (!d.practiceNotes.includes(n)) d.practiceNotes.push(n);
          save();
          document.getElementById('melody-status').textContent =
            '已试过 ' + d.practiceNotes.length + ' 种声音';
          document
            .querySelectorAll('[data-note]')
            .forEach((b) => b.classList.toggle('playing', +b.dataset.note === n));
          document.getElementById('star-start').disabled = d.practiceNotes.length < 2;
        });
        document.getElementById('star-start').onclick = () => {
          if (d.practiceNotes.length < 2) return;
          d.songMode = true;
          save();
          show();
        };
        return;
      }
      if (d.songIndex >= star.phrase.length) {
        panel(
          '一闪一闪 · 合奏完成',
          `<p>乐师：“一闪一闪亮晶晶——这一句接得好！钟声一响，整座殿都亮起来了。”</p><p>钟声渐远，1978年的发掘现场在眼前浮现。走向出口，继续追寻编钟的下落。</p><button id="tune-demo">▷ 听听这一句</button><button id="star-again">再奏一次</button>${feedback()}`,
        );
        result('《小星星》开头一句合奏完成。');
        document.getElementById('tune-demo').onclick = () =>
          Game.BellSound.sequence(
            star.phrase,
            () => {},
            () => {},
            star.beats,
          );
        document.getElementById('star-again').onclick = () => {
          Game.BellSound.stop();
          d.songIndex = 0;
          d.solved = false;
          save();
          show();
        };
        return;
      }
      panel(
        '跟着钟声 · 小星星',
        `<p>乐师：“跟着亮起的钟，把‘一闪一闪亮晶晶’接下去。慢慢来，我等你。”</p><div class="melody-top"><span id="star-progress">${d.songIndex} / 7 音</span><button id="tune-demo">▷ 听示范</button><button id="tune-reset">从头再奏</button></div><div class="score-strip star-score">${star.phrase.map((n, i) => `<span data-beat="${i}" class="${i < d.songIndex ? 'done' : i === d.songIndex ? 'current' : ''}"><small>${star.lyrics[i]}</small><strong>${notes[n]}</strong><small>${star.beats[i] === 2 ? '—' : '♪'}</small></span>`).join('')}</div><div class="bell-keys star-keys">${art()}</div><p id="melody-status" class="quest-feedback" role="status"></p>`,
      );
      const prompt = () => {
        document.querySelectorAll('[data-note]').forEach((b) => {
          const match = +b.dataset.note === star.phrase[d.songIndex];
          b.classList.toggle('expected', match);
          b.setAttribute(
            'aria-label',
            '敲击' + notes[+b.dataset.note] + (match ? '，下一个音' : ''),
          );
        });
        document.querySelectorAll('[data-beat]').forEach((b) => {
          b.classList.toggle('done', +b.dataset.beat < d.songIndex);
          b.classList.toggle('current', +b.dataset.beat === d.songIndex);
        });
        document.getElementById('star-progress').textContent = d.songIndex + ' / 7 音';
        document.getElementById('melody-status').textContent =
          '下一音：' + notes[star.phrase[d.songIndex]] + ' · ' + star.lyrics[d.songIndex];
      };
      keyboard((n) => {
        if (busy) return;
        Game.BellSound.hit(n);
        if (n !== star.phrase[d.songIndex]) {
          wrong('音序有误，请看下一音提示。');
          document.getElementById('melody-status').textContent =
            '这个音先留一留，下一音是“' + notes[star.phrase[d.songIndex]] + '”。';
          return;
        }
        d.songIndex++;
        save();
        if (d.songIndex === star.phrase.length) {
          show();
          return;
        }
        prompt();
      });
      document.getElementById('tune-demo').onclick = () => {
        if (busy) return;
        busy = true;
        document.querySelectorAll('[data-note]').forEach((b) => (b.disabled = true));
        document.getElementById('melody-status').textContent = '听一听：一闪一闪亮晶晶';
        Game.BellSound.sequence(
          star.phrase,
          (n, i) => {
            document
              .querySelectorAll('[data-note]')
              .forEach((b) => b.classList.toggle('playing', +b.dataset.note === n));
            document
              .querySelectorAll('[data-beat]')
              .forEach((b) => b.classList.toggle('playing', +b.dataset.beat === i));
          },
          () => {
            busy = false;
            document.querySelectorAll('[data-note]').forEach((b) => {
              b.disabled = false;
              b.classList.remove('playing');
            });
            document.querySelectorAll('[data-beat]').forEach((b) => b.classList.remove('playing'));
            prompt();
          },
          star.beats,
        );
      };
      document.getElementById('tune-reset').onclick = () => {
        Game.BellSound.stop();
        d.songIndex = 0;
        save();
        show();
      };
      prompt();
    };
    show();
  }

  function record() {
    let order = [];
    panel(
      '现场记录 · 把时间与证据接起来',
      `<p>先按从早到晚的顺序点击年代卡，再决定怎样对待刚出土的文物。</p><div class="timeline-cards">${[
        ['discovery', '1978年 · 随县出土'],
        ['display', '今天 · 博物馆展藏'],
        ['ancient', '战国早期 · 制作与使用'],
      ]
        .map(([id, t]) => `<button data-era="${id}">${t}</button>`)
        .join(
          '',
        )}</div><p id="era-order" class="sum">尚未排列</p><button id="era-reset" class="text-button">重新排列</button><form id="record-form">${select(
        'care',
        '现场应如何处理？',
        [
          ['polish', '立刻打磨铜锈，让钟恢复光亮'],
          ['record', '先记录出土位置与组合关系，交由专业人员清理保护'],
          ['play', '先敲一遍原件，测试能否发声'],
        ],
      )}<button data-check class="primary">保存现场档案</button></form>${feedback()}`,
    );
    const update = () => {
      document.getElementById('era-order').textContent = order.length
        ? order
            .map((id) => ({ ancient: '战国早期', discovery: '1978', display: '今天' })[id])
            .join(' → ')
        : '尚未排列';
      document.querySelectorAll('[data-era]').forEach((b) => {
        b.disabled = order.includes(b.dataset.era);
      });
    };
    document.querySelectorAll('[data-era]').forEach(
      (b) =>
        (b.onclick = () => {
          order.push(b.dataset.era);
          update();
        }),
    );
    document.getElementById('era-reset').onclick = () => {
      order = [];
      update();
    };
    document.getElementById('record-form').onsubmit = (e) => {
      e.preventDefault();
      if (
        order.join(',') === 'ancient,discovery,display' &&
        e.currentTarget.elements.care.value === 'record'
      )
        result('记录齐了，领队已安排送返博物馆。带上手记，我们该回去了。');
      else wrong('年代由早到晚；现场先记录证据，避免擅自清洗、打磨或敲击原件。');
    };
  }
  function curate() {
    panel(
      '归藏有声 · 最后一张展签',
      `<p>管理员：器形、铭文、编悬、声音都回来了。请为观众选择一张有证据支撑的展签。</p><div class="evidence-tokens">${['器形', '铭文', '编悬', '乐音'].map((n) => `<span>✓ ${n}</span>`).join('')}</div>${choices(
        [
          ['wrong1', '65件都是楚惠王赠钟，只能发出五个音。'],
          [
            'correct',
            '战国早期的成套青铜乐器，共65件，具有一钟双音的特点，1978年出土于湖北随县（今随州）曾侯乙墓。',
          ],
          ['wrong2', '圆形钟体组成的现代乐器，在楚国王宫被发现。'],
        ],
      )}${feedback()}`,
    );
    checkAnswer(
      'correct',
      '展签核对通过。最后一张展签已经备好，曾侯乙编钟终于能够归藏。',
      '看看笔记里的四类证据：不能把一件赠钟说成整套，也不能把游戏场景当作出土地。',
    );
  }
  const puzzles = { shape, tone, inscription, arrange, melody, record, curate };
  /** 根据当前目标与角色距离，打开对话或对应谜题。 */
  function interact() {
    if (!Game.Scene.active || Game.UI.isOpen() || Game.Challenge?.blocked()) return;
    const p = Game.Scene.player,
      scene = Game.Scene.scene;
    const npc = scene.npcList
      .filter((n) => Math.hypot(p.x - n.x, p.y - n.y) <= 115)
      .sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y))[0];
    if (npc) {
      const now = current();
      if (!now || now.scene !== scene.sceneId || now.target !== npc.id) {
        const old = steps.find((s) => s.scene === scene.sceneId && s.target === npc.id && s.pages);
        if (old) {
          talk(old, true);
          return;
        }
        panel(
          npc.name,
          `<p>${esc(npc.name)}：${scene.sceneId === 'road' ? '沿古道前行，过河需走渡桥。护钟车队就在沿途。' : '此地的器物与风俗值得细看。若还有未完的事，可翻阅礼乐手记。'}</p><button id="repeat-close" class="primary">结束交谈</button>`,
        );
        document.getElementById('repeat-close').onclick = Game.UI.close;
        return;
      }
    }
    const q = current(),
      e = entity();
    if (!q) {
      certificate();
      return;
    }
    if (
      Game.Scene.scene.sceneId !== q.scene ||
      !e ||
      Math.hypot(Game.Scene.player.x - e.x, Game.Scene.player.y - e.y) > 115
    ) {
      Game.UI.toast('先靠近金色线索，或使用任务卡查看前往地点。');
      return;
    }
    if (q.pages) talk(q);
    else if (progress().solved) {
      panel(q.title, `<p>${esc(q.note)}</p>${feedback()}`);
      result('这份证据已完成，可以继续。');
    } else puzzles[q.puzzle]();
  }
  function goTarget() {
    const q = current();
    if (!q) return certificate();
    if (q.scene === Game.Scene.scene?.sceneId) {
      Game.UI.close();
      Game.UI.toast('跟随金色指引，靠近目标后按 E。');
      return;
    }
    Game.UI.close();
    Game.Router.go('map', q.scene);
  }
  function hint() {
    const q = current();
    if (!q) return certificate();
    const d = progress(),
      level = Math.min(d.hintLevel || 0, q.hint.length - 1);
    d.hintLevel = level + 1;
    get().hints++;
    save();
    panel(
      '行旅提示',
      `<p>${esc(q.hint[level])}</p><p class="block-muted">当前目标：${esc(q.title)}。提示不会扣除奖励。</p><button id="hint-ok" class="primary">回到场景</button>`,
    );
    document.getElementById('hint-ok').onclick = Game.UI.close;
  }
  /** 展示已获得的知识和任务进度，支持回看资料来源。 */
  function journal() {
    const s = get();
    Game.UI.modal(
      '礼乐手记',
      `<p class="muted">已记录 ${s.step} / ${steps.length} 条线索 · 关闭手记即可继续探索。</p><div class="journal-list">${steps.map((q, i) => `<article class="${i < s.step ? 'recorded' : ''}"><small>${C.chapters[q.chapter]} / ${String(i + 1).padStart(2, '0')}</small><h3>${i < s.step ? '✓ ' : i === s.step ? '◇ ' : '○ '}${esc(q.title)}</h3><p>${i < s.step ? esc(q.note) : i === s.step ? esc(q.task) : '继续旅程，亲自找到这条证据。'}</p></article>`).join('')}</div><p>手记出处</p>${C.sources.map((v) => `<p><a href="${v.url}" target="_blank" rel="noopener">${v.title} ↗</a></p>`).join('')}`,
    );
  }
  function certificate() {
    if (Game.Challenge?.active()) {
      Game.Challenge.outcome();
      return;
    }
    if (Game.Agent) {
      Game.Agent.completed();
      return;
    }
    const s = get();
    if (!s.completed) return;
    Game.UI.modal(
      '钟鸣千年 · 归藏完成',
      `<div class="completion-seal">礼乐传薪人</div><p>你循着器形、铭文、编悬、乐音，寻回了失落的曾侯乙编钟，让千年钟声重归展馆。</p><div class="completion-stats"><span><strong>${Math.floor(s.seconds / 60)}分${Math.floor(s.seconds % 60)}秒</strong>有效探索</span><span><strong>4 / 4</strong>证据档案</span><span><strong>已解锁</strong>编钟文物档案</span></div><p class="block-muted">探索时长包含阅读与练习，隐藏页面与设置暂停不计时。提示 ${s.hints} 次，尝试修正 ${s.mistakes} 次；不影响通关。</p><div class="quest-options"><button class="primary" data-go="hall" data-id="zeng">返回曾国礼乐馆 →</button><button id="after-notes">回看礼乐手记</button><button id="after-roam">留在场景自由探索</button><button id="replay">重新体验本篇</button></div>`,
    );
    document.getElementById('after-notes').onclick = journal;
    document.getElementById('after-roam').onclick = Game.UI.close;
    document.getElementById('replay').onclick = () => {
      Game.UI.modal(
        '重新体验曾侯乙编钟篇',
        `<p>将重置本篇任务、计时和练习进度；已解锁的文物档案保留。其他账号与文物不受影响。</p><button id="confirm-replay" class="primary">确认重新开始</button>`,
      );
      document.getElementById('confirm-replay').onclick = () => {
        state = fresh();
        save();
        Game.UI.close();
        Game.Router.go('map', 'palace');
      };
    };
  }
  function renderHUD() {
    const root = document.getElementById('quest-hud');
    if (!root) return;
    const s = get(),
      q = current();
    root.innerHTML = q
      ? `<div class="quest-topline"><span>礼乐档案 · ${C.chapters[q.chapter]}</span><small>${s.step} / ${steps.length}</small></div><div class="quest-progress"><i style="width:${(s.step / steps.length) * 100}%"></i></div><h2>${esc(q.title)}</h2><p>${esc(q.task)}</p><div class="quest-actions"><button id="quest-travel">${q.scene === Game.Scene.scene.sceneId ? '◇ 跟随金色标记' : '前往下一地点 →'}</button><button id="quest-hint">提示</button><button id="quest-journal">手记</button></div>`
      : `<span class="eyebrow">归藏完成 · 礼乐传薪人</span><h2>千年钟鸣，余音未散</h2><p>编钟文物档案已解锁。可继续漫游、查阅手记或重新体验。</p><div class="quest-actions"><button id="quest-travel">查看通关纪念</button><button id="quest-journal">礼乐手记</button></div>`;
    document.getElementById('quest-travel').onclick = goTarget;
    document.getElementById('quest-hint')?.addEventListener('click', hint);
    document.getElementById('quest-journal').onclick = journal;
  }
  /** 更新有效探索时间与目标提示；由场景循环统一调用。 */
  function update(dt) {
    const s = get();
    if (!s.completed) s.seconds += dt;
    refresh += dt;
    if (refresh < 0.15) return;
    refresh = 0;
    const q = current(),
      e = entity();
    near =
      q &&
      q.scene === Game.Scene.scene.sceneId &&
      e &&
      Math.hypot(Game.Scene.player.x - e.x, Game.Scene.player.y - e.y) <= 115
        ? e
        : Game.Scene.scene.npcList.find(
            (n) => Math.hypot(Game.Scene.player.x - n.x, Game.Scene.player.y - n.y) <= 115,
          ) || null;
    const b = document.getElementById('quest-interact');
    if (b) {
      const stamp = (near?.id || '') + (q?.id || '');
      if (stamp !== hudStamp) {
        hudStamp = stamp;
        b.hidden = !near;
        b.textContent = near
          ? `[ E ] ${Game.Scene.scene.npcList.includes(near) ? '交谈' : q?.pages ? '交谈 / 查看' : '调查 / 体验'} · ${near.name}`
          : '';
      }
    }
    const waypoint = target(Game.Scene.scene),
      arrow = document.getElementById('quest-bearing');
    if (waypoint && arrow) {
      const p = Game.Scene.player,
        dx = waypoint.x - p.x,
        dy = waypoint.y - p.y;
      arrow.hidden = false;
      arrow.innerHTML = `<span style="transform:rotate(${(Math.atan2(dy, dx) * 180) / Math.PI + 90}deg)">↑</span> ${esc(waypoint.name || e?.name || '当前线索')} · ${Math.round(Math.hypot(dx, dy) / 20)} 步`;
    } else if (arrow) arrow.hidden = true;
  }
  function draw(c, scene, p, view) {
    const t = target(scene);
    const z = view.zoom,
      camX = view.camX,
      camY = view.camY,
      now = Game.Scene.settings.motion ? Date.now() / 350 : 0;
    c.save();
    c.scale(z, z);
    c.translate(-camX, -camY);
    const objects = Game.BellsObjects[scene.sceneId] || [];
    for (const o of objects) {
      c.save();
      c.translate(o.x, o.y);
      c.fillStyle = '#172c3140';
      c.beginPath();
      c.ellipse(0, 8, 34, 12, 0, 0, Math.PI * 2);
      c.fill();
      if (o.type === 'bell') {
        c.strokeStyle = '#5a422e';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(-37, 4);
        c.lineTo(-37, -82);
        c.lineTo(37, -82);
        c.lineTo(37, 4);
        c.stroke();
        c.strokeStyle = '#b9a16b';
        c.lineWidth = 1.2;
        c.stroke();
        Game.BronzeBell.paint(c, 0, -37, 0.56);
      } else Game.SceneArt.quest(c, o);
      c.restore();
    }
    if (scene.sceneId === 'workshop') {
      for (let i = 0; i < 12; i++) {
        const phase = (now * 0.3 + i * 0.71) % 1;
        c.fillStyle = `rgba(255,204,116,${0.7 * (1 - phase)})`;
        c.fillRect(440 + Math.sin(i * 7 + now) * 32, 530 - phase * 90, 3, 3);
      }
    }
    if (scene.sceneId === 'ritual' && get().step >= 9) {
      c.strokeStyle = '#eed19c45';
      c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.ellipse(900, 450, 110 + i * 65 + Math.sin(now) * 12, 50 + i * 28, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
    if (scene.sceneId === 'future' && get().completed) {
      Game.BronzeBell.rackPaint(c, 710, 456, 370, 165);
      c.fillStyle = '#f5dfab';
      c.font = '24px KaiTi';
      c.textAlign = 'center';
      c.fillText('曾侯乙编钟 · 数字档案已归藏', 900, 675);
    }
    if (!t) {
      c.restore();
      return;
    }
    c.setLineDash([6, 10]);
    c.strokeStyle = '#f6d49277';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(p.x, p.y + 8);
    c.lineTo(t.x, t.y + 8);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = '#ffe0a0';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(t.x, t.y + 5, 44 + Math.sin(now) * 4, 20 + Math.sin(now) * 2, 0, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#ffe3a6';
    c.font = 'bold 32px sans-serif';
    c.textAlign = 'center';
    c.fillText('◇', t.x, t.y - 95 - Math.sin(now) * 5);
    const name = t.name || '当前线索';
    c.font = '16px Microsoft YaHei';
    const width = c.measureText(name).width + 24;
    c.fillStyle = '#172e2de8';
    c.fillRect(t.x - width / 2, t.y + 32, width, 30);
    c.fillStyle = '#ffe1a5';
    c.fillText(name, t.x, t.y + 53);
    c.restore();
    if (scene.sceneId !== 'overworld') {
      c.save();
      c.fillStyle = '#ffe2a0';
      c.beginPath();
      c.arc(
        view.w - 186 + (t.x / 1800) * 164,
        view.h - 133 + (t.y / 1200) * 109,
        4,
        0,
        Math.PI * 2,
      );
      c.fill();
      c.restore();
    }
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('#quest-interact')) interact();
  });
  window.addEventListener('keydown', (e) => {
    if (
      e.key.toLowerCase() === 'e' &&
      !e.repeat &&
      Game.Scene?.active &&
      !Game.UI.isOpen() &&
      !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
    ) {
      e.preventDefault();
      interact();
    }
  });
  return {
    cancelPending,
    fresh,
    normalize,
    get,
    current,
    entity,
    target,
    persist,
    attach,
    complete,
    update,
    draw,
    interact,
    journal,
    certificate,
    goTarget,
  };
})();

Game.BellSound = (() => {
  let ctx,
    timers = [],
    voices = new Set(),
    generation = 0;
  function stop() {
    generation++;
    timers.forEach(clearTimeout);
    timers = [];
    for (const voice of voices) {
      try {
        voice.stop();
      } catch {}
    }
    voices.clear();
  }
  function hit(index) {
    const settings = Game.Store.load().settings,
      volume = settings.volume;
    if (settings.effects === false || !volume) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      const frequency = [261.63, 293.66, 329.63, 392, 440][index],
        now = ctx.currentTime;
      [1, 2.76, 5.4].forEach((ratio, i) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.frequency.value = frequency * ratio;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime((volume * 0.3) / (i + 1), now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        o.connect(g);
        g.connect(ctx.destination);
        voices.add(o);
        o.start();
        o.stop(now + 1.6);
        o.onended = () => {
          voices.delete(o);
          o.disconnect();
          g.disconnect();
        };
      });
    } catch {
      Game.UI.toast('声音暂不可用；可通过音名和亮键完成。');
    }
  }
  function sequence(notes, onNote, onEnd, beats = []) {
    stop();
    const token = generation;
    let at = 0;
    notes.forEach((n, i) => {
      timers.push(
        setTimeout(() => {
          if (token !== generation || !document.getElementById('tune-demo')) return;
          hit(n);
          onNote(n, i);
        }, at),
      );
      at += 650 * (beats[i] || 1);
    });
    timers.push(
      setTimeout(() => {
        if (token === generation && document.getElementById('tune-demo')) onEnd();
      }, at),
    );
  }

  return { hit, stop, sequence };
})();
