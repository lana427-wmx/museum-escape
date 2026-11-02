/* 临时浏览器档案，逐篇实际操作所有谜题。仅目标定位使用测试捷径。 */
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
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
      errors = [],
      checks = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const ok = (name, test = true) => {
      assert(test, name);
      checks.push(name);
      console.log('PASS', channel, name);
    };
    const click = async (s) => {
      await page.locator(s).click();
      await page.waitForTimeout(125);
    };
    await page.goto(url);
    await page.locator('[data-exp-action=catalog]').waitFor();
    await page.evaluate(() => Game.Auth.register('十二遗珍验收', 'test2026'));
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      Game.UI.close();
      const s = Game.Store.load();
      s.settings.motion = false;
      s.bellsQuest = { ...Game.BellsQuest.fresh(), step: 1 };
      s.currentScene = 'road';
      s.playerPosition = { x: 133, y: 400 };
      Game.Store.save(s);
    });
    const original = await page.evaluate(() => JSON.stringify(Game.Store.load().bellsQuest));
    ok(
      '十一篇入口与初始未解锁',
      await page.evaluate(
        () => Object.keys(Game.ExpeditionContent).length === 11 && Game.Collection.count() === 0,
      ),
    );
    ok(
      '未通关不能直接领取',
      await page.evaluate(
        () => !Game.Collection.unlock('vessel').ok && Game.Collection.count() === 0,
      ),
    );
    async function bellTarget() {
      await page.evaluate(async () => {
        Game.UI.close();
        const q = Game.BellsQuest.current();
        if (Game.Scene.scene.sceneId !== q.scene) await Game.Router.go('map', q.scene);
        const t = Game.BellsQuest.entity();
        let p;
        for (let r = 50; r <= 100 && !p; r += 10)
          for (let i = 0; i < 16; i++) {
            const n = {
              x: t.x + Math.cos((i * Math.PI) / 8) * r,
              y: t.y + Math.sin((i * Math.PI) / 8) * r,
            };
            if (Game.Collision.valid(Game.Scene.scene, n.x, n.y)) {
              p = n;
              break;
            }
          }
        Object.assign(Game.Scene.player, p);
        Game.BellsQuest.interact();
      });
    }
    // 先实际通关原编钟挑战，使后续全收集结局由十二篇真实完成触发。
    async function completeBells() {
      await page.evaluate(() => Game.Challenge.start('easy'));
      for (let i = 0; i < 10; i++) {
        const q = await page.evaluate(() => {
          const q = Game.BellsQuest.current();
          return { pages: q.pages?.length, puzzle: q.puzzle };
        });
        await bellTarget();
        if (q.pages) {
          for (let n = 0; n < q.pages; n++) await click('#dialogue-next');
        } else {
          if (q.puzzle === 'shape') await click('[data-answer=tile]');
          if (q.puzzle === 'tone') {
            await click('[data-strike=front]');
            await click('[data-strike=side]');
            await click('[data-answer=two]');
          }
          if (q.puzzle === 'inscription') {
            for (const [n, v] of Object.entries({ donor: 'chu', receiver: 'zeng', object: 'bo' }))
              await page.locator('[name=' + n + ']').selectOption(v);
            await click('#evidence-form button');
          }
          if (q.puzzle === 'arrange') {
            for (const [n, v] of Object.entries({
              niu: '19',
              yong: '45',
              bo: '1',
              rack: 'correct',
            }))
              await page.locator('[name=' + n + ']').selectOption(v);
            await click('#arrange-form button');
          }
          if (q.puzzle === 'melody') {
            await click('[data-note="0"]');
            await click('[data-note="3"]');
            await click('#star-start');
            for (const n of [0, 0, 3, 3, 4, 4, 3]) await click('[data-note="' + n + '"]');
          }
          if (q.puzzle === 'curate') await click('[data-answer=correct]');
          await click('#quest-done');
        }
      }
      ok(
        '原编钟副本回归通关',
        await page.evaluate(
          () => Game.Challenge.snapshot().status === 'won' && Game.Collection.isUnlocked('bells'),
        ),
      );
      if (!(await page.evaluate(() => Game.Collection.full())))
        await click('.dialog [data-challenge=exit]');
    }
    if (channel === 'msedge') await completeBells();
    const ids = await page.evaluate(() => Object.keys(Game.ExpeditionContent));
    async function atTarget() {
      await page.evaluate(() => {
        Game.UI.close();
        const t = Game.Expeditions.target();
        let p;
        for (let r = 55; r <= 100 && !p; r += 10)
          for (let i = 0; i < 16; i++) {
            const n = {
              x: t.x + Math.cos((i * Math.PI) / 8) * r,
              y: t.y + Math.sin((i * Math.PI) / 8) * r,
            };
            if (Game.Collision.valid(Game.Scene.scene, n.x, n.y)) {
              p = n;
              break;
            }
          }
        if (!p) throw Error('无可用测试落点');
        Object.assign(Game.Scene.player, p);
        Game.BellsQuest.interact();
      });
      await page.locator('#exp-work').waitFor();
    }
    async function solve(index, id) {
      const p = await page.evaluate(({ id, index }) => Game.ExpeditionContent[id].puzzles[index], {
        id,
        index,
      });
      if (['match', 'sort'].includes(p.type)) {
        for (let i = 0; i < p.rows.length; i++)
          await page.locator('[name=r' + i + ']').selectOption(p.rows[i][1]);
        await click('#exp-form button');
      } else if (['order', 'panorama'].includes(p.type)) {
        let from = 0;
        if (id === 'sword' && index === 0) {
          await click('[data-card="0"]');
          await click('[data-card="1"]');
          await page.reload();
          await page.locator('[data-exp-action=catalog]').waitFor();
          await page.locator('[data-action=continue]').click();
          await page.locator('#expedition-hud').waitFor({ state: 'attached' });
          await atTarget();
          ok(
            '拼铭途中刷新恢复已选卡片',
            (await page.locator('[data-card="0"]').isDisabled()) &&
              (await page.locator('[data-card="1"]').isDisabled()),
          );
          from = 2;
        }
        for (let i = from; i < p.items.length; i++) await click('[data-card="' + i + '"]');
        await click('#exp-check');
      } else if (p.type === 'shape') await click('[data-shape=' + p.answer + ']');
      else if (p.type === 'number') {
        await page.locator('[name=quantity]').fill('-2');
        await page.locator('#exp-number button').click();
        ok(
          '非法账目输入被阻止',
          await page.locator('[name=quantity]').evaluate((el) => !el.checkValidity()),
        );
        await page.locator('[name=quantity]').fill(String(p.answer));
        await click('#exp-number button');
      } else if (p.type === 'wheel') {
        for (let i = 0; i < (p.answer - p.initial + 5) % 5; i++) await click('#exp-next');
        await click('#exp-wheel-check');
      } else if (p.type === 'rotate') {
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < (4 - p.initial[i]) % 4; j++) await click('[data-tile="' + i + '"]');
        await click('#exp-rotate-check');
      } else if (p.type === 'rhythm') {
        for (const n of p.sequence) await click('[data-drum="' + n + '"]');
      } else throw Error('未覆盖题型 ' + p.type);
      await click('#exp-done');
    }
    for (let n = 0; n < ids.length; n++) {
      const id = ids[n],
        a = await page.evaluate((id) => Game.Artifacts.find((a) => a.id === id), id);
      await page.evaluate((h) => {
        Game.UI.close();
        return Game.Router.go('hall', h);
      }, a.hall);
      await page.locator('[data-exp-launch="' + id + '"]').click();
      await page.locator('[data-exp-start="' + id + '"][data-mode=easy]').click();
      await page.locator('#expedition-hud').waitFor({ state: 'attached' });
      if (n === 0) {
        await page.keyboard.down('w');
        await page.waitForTimeout(1200);
        await page.keyboard.up('w');
        await page.keyboard.press('e');
        await page.locator('[data-route]').first().waitFor();
        ok('新副本实际WASD接近并按E交谈');
        await page.locator('[data-route=form-first]').click();
        await page.locator('[data-exp-action=pause]').first().click();
        const t = await page.evaluate(() => Game.Expeditions.snapshot().seconds);
        await page.evaluate(() => Game.Expeditions.tick(20));
        ok(
          '新副本暂停冻结倒计时',
          await page.evaluate((t) => Game.Expeditions.snapshot().seconds === t, t),
        );
        await click('[data-exp-action=resume]');
        await page.screenshot({ path: path.join(out, channel + '-vessel.png') });
      } else {
        await atTarget();
        await click('[data-route=' + (n % 2 ? 'record-first' : 'form-first') + ']');
      }
      const expected = n % 2 ? 'record' : 'visual';
      ok(
        id + ' 调查分支改变线索顺序',
        await page.evaluate((k) => Game.Expeditions.stepInfo().key === k, expected),
      );
      for (let i = 0; i < 2; i++) {
        await atTarget();
        await click('#exp-collect-clue');
      }
      await atTarget();
      await solve(0, id);
      await atTarget();
      await click('#exp-follow');
      await atTarget();
      await solve(1, id);
      await atTarget();
      const before = await page.evaluate(() => Game.Expeditions.snapshot());
      await page.evaluate(() => {
        for (let k = 0; k < 20; k++) document.querySelector('[data-label="0"]').click();
      });
      const after = await page.evaluate(() => Game.Expeditions.snapshot());
      ok(id + ' 错误不推进且连点只扣一次', after.step === 6 && after.health === before.health - 20);
      await click('[data-label="1"]');
      await click('#exp-done');
      await page.locator('.hall-screen').waitFor();
      ok(
        id + ' 完整7步通关并自动返馆',
        await page.evaluate(
          (id) =>
            Game.Collection.isUnlocked(id) &&
            Game.Expeditions.entry(id).history.length === 7 &&
            !Game.Scene.active,
          id,
        ),
      );
      ok(
        id + ' 原编钟探索存档保留',
        await page.evaluate((x) => JSON.stringify(Game.Store.load().bellsQuest) === x, original),
      );
      if (n < ids.length - 1) {
        await page
          .locator('.dialog [data-exp-action=details][data-relic="' + id + '"]')
          .filter({ visible: true })
          .first()
          .click();
        ok(
          id + ' 文物详情与剧情回溯可看',
          await page
            .locator('.dialog')
            .innerText()
            .then((t) => t.includes('剧情回溯') && t.includes('资料来源')),
        );
      }
    }
    if (channel === 'chrome') await completeBells();
    await page.getByRole('dialog', { name: '十二遗珍归藏 · 荆楚长卷重明' }).waitFor();
    ok(
      '12件真实通关触发全收集胜利',
      await page.evaluate(() => Game.Collection.full() && Game.Collection.count() === 12),
    );
    await page.screenshot({ path: path.join(out, channel + '-full-collection.png') });
    await page.reload();
    await page.locator('[data-exp-action=catalog]').waitFor();
    ok(
      '刷新后全收集和所有通关凭证保留',
      await page.evaluate(
        () =>
          Game.Collection.full() &&
          Object.keys(Game.ExpeditionContent).every((id) =>
            Game.Expeditions.complete(Game.Expeditions.entry(id)),
          ),
      ),
    );
    await page.evaluate(() => Game.Expeditions.catalog());
    ok(
      '卷册全部标记已归藏',
      (await page.locator('.exp-catalog small').allTextContents()).every((s) =>
        s.includes('已归藏'),
      ),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(out, channel + '-catalog-mobile.png') });
    ok(
      '手机卷册无横向溢出',
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await page.evaluate(() => {
      Game.UI.close();
      return Game.Expeditions.open('jade', 'easy', true);
    });
    await page.locator('#expedition-hud').waitFor({ state: 'attached' });
    ok(
      '重开不清除文物归藏记录',
      await page.evaluate(
        () =>
          Game.Collection.full() &&
          Game.Expeditions.snapshot().step === 0 &&
          Game.Expeditions.snapshot().best === 685,
      ),
    );
    await page.locator('[data-move=w]').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(out, channel + '-expedition-mobile.png') });
    ok(
      '手机副本无横向溢出',
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await page.evaluate(() => {
      Game.UI.close();
      return Game.Router.go('home');
    });
    await page.evaluate(() => Game.Auth.register('隔离验收', 'test2026'));
    await page.waitForTimeout(500);
    await page.evaluate(() => Game.UI.close());
    ok(
      '其他账号无收集及副本串档',
      await page.evaluate(
        () =>
          Game.Collection.count() === 0 && Game.Expeditions.entry('vessel').history.length === 0,
      ),
    );
    await page.evaluate(() => Game.Expeditions.open('vessel', 'hard', true));
    await page.evaluate(() => Game.Expeditions.tick(361));
    ok(
      '新副本超时失败不解锁',
      await page.evaluate(
        () => Game.Expeditions.snapshot().failed && !Game.Collection.isUnlocked('vessel'),
      ),
    );
    await page.locator('[data-exp-action=restart]').filter({ visible: true }).last().click();
    await page.locator('[data-exp-start=vessel]').click();
    await page.locator('#expedition-hud').waitFor({ state: 'attached' });
    ok(
      '失败可重开并恢复稳定值',
      await page.evaluate(
        () => Game.Expeditions.snapshot().health === 100 && !Game.Expeditions.snapshot().failed,
      ),
    );
    ok('无未处理JS错误', errors.length === 0);
    report.browsers.push({ channel, passed: checks.length, checks, errors });
  } finally {
    await browser.close();
  }
}
(async () => {
  for (const channel of process.argv[4] ? [process.argv[4]] : ['msedge', 'chrome'])
    await run(channel);
  fs.writeFileSync(path.join(out, '全副本测试结果.json'), JSON.stringify(report, null, 2));
  console.log(
    'ALL PASS',
    JSON.stringify(report.browsers.map((b) => ({ browser: b.channel, passed: b.passed }))),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
