/* 真实浏览器验收。使用临时浏览器档案，不触及日常浏览器账号。
 * 唯一测试捷径：将角色放到当前目标附近；谜题通过实际 DOM 点击完成。
 * node tests/acceptance.cjs [http://127.0.0.1:4183] [输出目录]
 */
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  assert = require('node:assert/strict');
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(
    path.join(
      os.homedir(),
      '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
    ),
  ));
}
const url = process.argv[2] || 'http://127.0.0.1:4183',
  out = path.resolve(process.argv[3] || 'test-results');
fs.mkdirSync(out, { recursive: true });
const report = { at: new Date().toISOString(), browsers: [] };
async function run(channel) {
  const browser = await chromium.launch({ channel, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }),
      page = await context.newPage(),
      faults = [];
    page.on('pageerror', (e) => faults.push(e.message));
    const passed = [],
      ok = (name, test = true) => {
        assert(test, name);
        passed.push(name);
        console.log('PASS', channel, name);
      };
    const click = async (selector) => {
      await page.locator(selector).click();
      await page.waitForTimeout(125);
    };
    const snap = () => page.evaluate(() => Game.Challenge.snapshot());
    await page.goto(url);
    await page.locator('[data-challenge=setup]').waitFor();
    const initial = await page.evaluate(() => Game.Resources.metrics());
    ok(
      '首页不预加载全部场景',
      initial.sceneCache === 0 && !initial.resources.some((x) => /extensions\//.test(x.file)),
    );
    await page.locator('[data-challenge=setup]').click();
    await page.locator('#auth-switch').click();
    await page.locator('[name=name]').fill('bad name');
    await page.locator('[name=password]').fill('test2026');
    await page.locator('#auth-form button').click();
    await page.locator('.form-error').filter({ hasText: '用户名需为' }).waitFor();
    ok('非法账号输入给出提示');
    await page.locator('[name=name]').fill('验收测试');
    await page.locator('[name=password]').fill('test2026');
    await page.locator('#auth-form button').click();
    await page.waitForTimeout(550);
    await page.locator('#agent-accept').click();
    ok('注册登录可用', await page.evaluate(() => Game.Auth.current() === '验收测试'));
    await page.evaluate(() => {
      const s = Game.Store.load();
      s.settings.motion = false;
      s.currentScene = 'road';
      s.playerPosition = { x: 123, y: 456 };
      s.bellsQuest = { ...Game.BellsQuest.fresh(), step: 1 };
      Game.Store.save(s);
    });
    const exploration = await page.evaluate(() => JSON.stringify(Game.Store.load().bellsQuest));
    async function start(mode) {
      await page.evaluate(() => Game.Challenge.setup());
      await page.locator('[data-challenge-start=' + mode + ']').click();
      await page.locator('#challenge-hud').waitFor();
      await page.waitForTimeout(150);
    }
    async function target() {
      await page.evaluate(async () => {
        const q = Game.BellsQuest.current();
        Game.UI.close();
        if (Game.Scene.scene.sceneId !== q.scene) await Game.Router.go('map', q.scene);
        const n = Game.BellsQuest.entity();
        let found;
        for (let r = 50; r <= 100 && !found; r += 10)
          for (let a = 0; a < 16; a++) {
            const p = {
              x: n.x + Math.cos((a * Math.PI) / 8) * r,
              y: n.y + Math.sin((a * Math.PI) / 8) * r,
            };
            if (Game.Collision.valid(Game.Scene.scene, p.x, p.y)) {
              found = p;
              break;
            }
          }
        if (!found) throw Error('目标无可达点');
        Object.assign(Game.Scene.player, found);
        Game.BellsQuest.interact();
      });
      await page.locator('#quest-body').waitFor();
    }
    await start('easy');
    let s = await snap();
    ok(
      '简单参数：20分钟 / 20失稳 / 每步100',
      s.limit === 1200 && s.damage === 20 && s.reward === 100,
    );
    await page.evaluate(() => Game.Router.go('map', 'ritual'));
    ok('未解锁地点被拦截', await page.evaluate(() => Game.Scene.scene.sceneId === 'palace'));
    const before = await page.evaluate(() => ({ x: Game.Scene.player.x, y: Game.Scene.player.y }));
    await page.keyboard.down('a');
    await page.waitForTimeout(250);
    await page.keyboard.up('a');
    ok(
      'WASD真实移动',
      await page.evaluate(
        (p) => Math.hypot(Game.Scene.player.x - p.x, Game.Scene.player.y - p.y) > 10,
        before,
      ),
    );
    await page.locator('[data-challenge=pause]').click();
    const paused = await snap();
    await page.keyboard.down('d');
    await page.waitForTimeout(220);
    await page.keyboard.up('d');
    ok('暂停冻结计时', (await snap()).seconds === paused.seconds);
    await click('[data-challenge=resume]');
    ok('继续恢复状态', (await snap()).status === 'running');
    const clockA = (await snap()).seconds;
    await page.waitForTimeout(350);
    const clockB = (await snap()).seconds;
    ok('倒计时依据实际经过时间', clockB - clockA > 0.2 && clockB - clockA < 0.8);
    await page.screenshot({ path: path.join(out, channel + '-challenge.png') });
    const total = await page.evaluate(() => Game.BellsContent.steps.length);
    for (let i = 0; i < total; i++) {
      const q = await page.evaluate(() => {
        const q = Game.BellsQuest.current();
        return { id: q.id, pages: q.pages?.length, puzzle: q.puzzle };
      });
      await target();
      if (q.pages) {
        for (let n = 0; n < q.pages; n++) await click('#dialogue-next');
      } else {
        if (q.puzzle === 'shape') {
          const old = await snap();
          await page.evaluate(() => {
            for (let j = 0; j < 25; j++) document.querySelector('[data-answer=round]').click();
          });
          const now = await snap();
          ok(
            '连点只计一次有效失误',
            now.health === old.health - 20 && now.score === Math.max(0, old.score - 15),
          );
          await page.waitForTimeout(150);
          await click('[data-answer=tile]');
        } else if (q.puzzle === 'tone') {
          await click('[data-strike=front]');
          await click('[data-strike=side]');
          await click('[data-answer=two]');
        } else if (q.puzzle === 'inscription') {
          for (const [name, value] of Object.entries({
            donor: 'chu',
            receiver: 'zeng',
            object: 'bo',
          }))
            await page.locator('[name=' + name + ']').selectOption(value);
          await click('#evidence-form button');
        } else if (q.puzzle === 'arrange') {
          for (const [name, value] of Object.entries({
            niu: '19',
            yong: '45',
            bo: '1',
            rack: 'correct',
          }))
            await page.locator('[name=' + name + ']').selectOption(value);
          await click('#arrange-form button');
        } else if (q.puzzle === 'melody') {
          await click('[data-note="0"]');
          await click('[data-note="3"]');
          await click('#star-start');
          for (const n of [0, 0, 3, 3, 4, 4, 3]) await click('[data-note="' + n + '"]');
        } else if (q.puzzle === 'curate') await click('[data-answer=correct]');
        else throw Error('未覆盖谜题 ' + q.puzzle);
        await click('#quest-done');
      }
      s = await snap();
      ok('线索顺序推进 ' + q.id, s.step === i + 1);
    }
    s = await snap();
    ok(
      '完整通关胜利 / 分数正确',
      s.status === 'won' && s.score === total * 100 - 15 && s.health === 80,
    );
    await page.getByRole('dialog', { name: /挑战胜利/ }).waitFor();
    await page.screenshot({ path: path.join(out, channel + '-victory.png') });
    ok(
      '文物归藏永久保存',
      await page.evaluate(() =>
        Game.Store.read('save.' + Game.Auth.current(), {}).collectedArtifacts.includes('bells'),
      ),
    );
    const high = s.best;
    await page.reload();
    await page.locator('[data-challenge=setup]').waitFor();
    ok(
      '刷新本局归零、最高分保留',
      await page.evaluate(
        (h) =>
          Game.Challenge.snapshot() === null &&
          document.querySelector('.home-menu').textContent.includes('最高 ' + h),
        high,
      ),
    );
    ok(
      '挑战未覆盖自由探索存档',
      await page.evaluate((x) => JSON.stringify(Game.Store.load().bellsQuest) === x, exploration),
    );
    await start('hard');
    s = await snap();
    ok(
      '困难参数变化：10分钟 / 25失稳 / 每步150',
      s.limit === 600 && s.damage === 25 && s.reward === 150,
    );
    await target();
    for (let n = 0; n < 3; n++) await click('#dialogue-next');
    await target();
    for (let n = 0; n < 2; n++) await click('#dialogue-next');
    await target();
    for (let n = 0; n < 4; n++) {
      await page.locator('[data-answer=round]').click();
      await page.waitForTimeout(650);
    }
    s = await snap();
    ok(
      '稳定值耗尽触发失败弹窗',
      s.status === 'lost' &&
        s.health === 0 &&
        (await page.getByRole('dialog', { name: /挑战结束/ }).count()) === 1,
    );
    const lost = s.step;
    await page.evaluate(() => Game.BellsQuest.complete(Game.BellsQuest.current().id));
    ok('失败后禁止继续得分', (await snap()).step === lost);
    await click('.dialog [data-challenge=restart]');
    await page.locator('[data-challenge-start=hard]').click();
    await page.locator('#challenge-hud').waitFor();
    s = await snap();
    ok('重开重置任务、积分、稳定值', s.score === 0 && s.health === 100 && s.step === 0);
    await page.evaluate(() => {
      for (let n = 0; n < 6100; n++) Game.Challenge.tick(0.1);
    });
    ok('倒计时耗尽触发失败', (await snap()).status === 'lost');
    await click('.dialog [data-challenge=exit]');
    await page.locator('.hall-screen').waitFor();
    await page.evaluate(() => {
      const key = 'challenge.best.v1',
        original = Game.Store.read(key, []);
      window.savedBoard = original;
      const broken = JSON.parse(JSON.stringify(original));
      broken[0].score = 999999;
      Game.Store.write(key, broken);
    });
    await page.evaluate(() => Game.Challenge.ranking());
    ok('篡改分数记录被过滤', !(await page.locator('.dialog').innerText()).includes('999999'));
    await page.evaluate(() => {
      Game.Store.write('challenge.best.v1', window.savedBoard);
      window.savedBoard = null;
    });
    await start('easy');
    const keys = await page.evaluate(() => ({
      setScore: typeof Game.Challenge.setScore,
      frozen: Object.isFrozen(Game.Challenge),
      score: Game.Challenge.snapshot().score,
    }));
    ok('无公开分数修改接口', keys.setScore === 'undefined' && keys.frozen);
    // 模拟换图失败：两个层级都失败时，Canvas 简绘仍能操作。
    await page.evaluate(async () => {
      await Game.Resources.scene('road');
      await Game.Resources.scene('future');
    });
    await page.route('**/assets/extensions/workshop.png', (route) => route.abort());
    await page.route('**/assets/workshop-wmx2.png', (route) => route.abort());
    await target();
    for (let n = 0; n < 3; n++) await click('#dialogue-next');
    await page.evaluate(() => Game.Router.go('map', 'workshop'));
    await page.locator('#world').waitFor();
    ok(
      '图片失败友好降级',
      await page.evaluate(
        () =>
          Game.Scene.active && Game.Diagnostics.entries().some((x) => x.message.includes('简绘')),
      ),
    );
    await page.unroute('**/assets/extensions/workshop.png');
    await page.unroute('**/assets/workshop-wmx2.png');
    await page.evaluate(() => {
      const s = Game.Store.load();
      s.settings.effects = false;
      Game.Store.save(s);
    });
    await page.locator('[data-action=settings]').click();
    ok('音效开关显示并恢复', (await page.locator('[name=effects]').isChecked()) === false);
    await page.locator('#settings-form button').click();
    await page.evaluate(() => {
      const key = 'sushi.v1.save.' + Game.Auth.current();
      window.originalSave = localStorage.getItem(key);
      localStorage.setItem(key, '{invalid-json');
    });
    await page.evaluate(() => Game.Store.load());
    ok(
      '损坏存档友好处理',
      await page.evaluate(() =>
        Game.Diagnostics.entries().some((x) => x.message.includes('本地记录格式异常')),
      ),
    );
    await page.evaluate(() => {
      localStorage.setItem('sushi.v1.save.' + Game.Auth.current(), window.originalSave);
      window.originalSave = null;
    });
    const client = await context.newCDPSession(page);
    await client.send('HeapProfiler.collectGarbage');
    const baseline = await client.send('Memory.getDOMCounters');
    for (let n = 0; n < 15; n++) {
      await page.evaluate(() => Game.Challenge.start('easy'));
    }
    await client.send('HeapProfiler.collectGarbage');
    const after = await client.send('Memory.getDOMCounters');
    ok(
      '15轮重开 DOM 与监听器无持续积累',
      after.nodes < baseline.nodes + 300 &&
        after.jsEventListeners < baseline.jsEventListeners + 100,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => Game.Challenge.start('easy'));
    await page.locator('[data-move=w]').waitFor({ state: 'visible' });
    const touchBefore = await page.evaluate(() => Game.Scene.player.y);
    await page.locator('[data-move=w]').hover();
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.up();
    ok('窄屏方向按钮可移动', await page.evaluate((y) => Game.Scene.player.y < y - 5, touchBefore));
    await page.locator('#toast.show').waitFor({ state: 'hidden' });
    await page.screenshot({ path: path.join(out, channel + '-mobile.png') });
    ok(
      '390px窄屏无横向溢出',
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    const boxes = await page
      .locator('.challenge-hud,.world-buttons,.quest-panel')
      .evaluateAll((els) =>
        els.map((el) => ({
          x: el.getBoundingClientRect().x,
          right: el.getBoundingClientRect().right,
        })),
      );
    ok(
      '窄屏主要控制均在视口内',
      boxes.every((x) => x.x >= 0 && x.right <= 390),
    );
    await page.evaluate(() => {
      setTimeout(() => {
        throw Error('验收模拟异常');
      }, 0);
    });
    await page.waitForTimeout(150);
    ok(
      'JS异常被捕获且暂停',
      await page.evaluate(
        () =>
          Game.Diagnostics.entries().some((x) => x.detail.includes('验收模拟异常')) &&
          Game.Challenge.snapshot().status === 'paused',
      ),
    );
    ok('除主动注入异常外无未处理JS错误', faults.length === 1 && faults[0] === '验收模拟异常');
    const metrics = await page.evaluate(() => Game.Resources.metrics());
    await page.reload();
    await page.locator('[data-challenge=setup]').waitFor();
    const warm = await page.evaluate(() => Game.Resources.metrics());
    report.browsers.push({
      channel,
      passed: passed.length,
      checks: passed,
      cold: initial,
      warm,
      metrics,
      memory: { baseline, after },
      pageErrors: faults,
    });
    await context.close();
  } finally {
    await browser.close();
  }
}
(async () => {
  for (const channel of ['msedge', 'chrome']) await run(channel);
  fs.writeFileSync(path.join(out, '验收测试结果.json'), JSON.stringify(report, null, 2));
  console.log('ALL PASS', report.browsers.map((x) => x.channel + ': ' + x.passed).join(', '));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
