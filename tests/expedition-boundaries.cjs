/* 专注边界抽查：失败分支、最高分重开、内存循环。临时档案中的测试夹具与人工通关分开记录。 */
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
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
      checks = [];
    const ok = (name, test = true) => {
      assert(test, name);
      checks.push(name);
      console.log('PASS', name);
    };
    await p.goto(process.argv[2] || 'http://127.0.0.1:4183');
    await p.waitForFunction(() => window.Game?.Expeditions);
    await p.evaluate(() => Game.Auth.register('边界抽查', 'test2026'));
    await p.waitForTimeout(500);
    await p.evaluate(() => {
      Game.UI.close();
      const s = Game.Store.load();
      s.settings.motion = false;
      s.settings.effects = false;
      Game.Store.save(s);
    });
    await p.evaluate(() => Game.Expeditions.open('vessel', 'hard', true));
    await p.evaluate(() => {
      const q = Game.Expeditions.target();
      Object.assign(Game.Scene.player, { x: q.x, y: q.y + 60 });
      Game.BellsQuest.interact();
    });
    await p.locator('[data-route=form-first]').click();
    for (let i = 0; i < 2; i++) {
      await p.evaluate(() => {
        const q = Game.Expeditions.target();
        Object.assign(Game.Scene.player, { x: q.x, y: q.y + 65 });
        Game.BellsQuest.interact();
      });
      await p.locator('#exp-collect-clue').click();
    }
    await p.evaluate(() => {
      const q = Game.Expeditions.target();
      Object.assign(Game.Scene.player, { x: q.x, y: q.y + 65 });
      Game.BellsQuest.interact();
    });
    for (let i = 0; i < 3; i++) await p.locator('[name=r' + i + ']').selectOption({ index: 1 });
    for (let i = 0; i < 4; i++) {
      await p.locator('#exp-form button').click();
      await p.waitForTimeout(650);
    }
    ok(
      '困难模式4次有效失误失败且不解锁',
      await p.evaluate(
        () =>
          Game.Expeditions.snapshot().failed &&
          Game.Expeditions.snapshot().health === 0 &&
          !Game.Collection.isUnlocked('vessel'),
      ),
    );
    const before = await p.evaluate(() => Game.Expeditions.snapshot().step);
    await p.evaluate(() => {
      Game.UI.close();
      Game.BellsQuest.interact();
    });
    ok('失败后交互不推进', await p.evaluate((n) => Game.Expeditions.snapshot().step === n, before));
    const best = await p.evaluate(() => Game.Expeditions.snapshot().best);
    await p.evaluate(() => Game.Expeditions.open('vessel', 'easy', true));
    ok(
      '切难度重开保留本篇最高分',
      await p.evaluate(
        (b) =>
          Game.Expeditions.snapshot().score === 0 &&
          Game.Expeditions.snapshot().best === b &&
          Game.Expeditions.snapshot().health === 100,
        best,
      ),
    );
    const client = await p.context().newCDPSession(p);
    await client.send('Performance.enable');
    const sample = async (round) => {
      await p.waitForTimeout(100);
      await client.send('HeapProfiler.collectGarbage');
      const { metrics } = await client.send('Performance.getMetrics');
      return {
        round,
        heapBytes: metrics.find((x) => x.name === 'JSHeapUsedSize').value,
        ...(await client.send('Memory.getDOMCounters')),
      };
    };
    const samples = [await sample(0)],
      ids = await p.evaluate(() => Object.keys(Game.ExpeditionContent));
    for (let i = 1; i <= 33; i++) {
      await p.evaluate((id) => Game.Expeditions.open(id, 'easy', true), ids[(i - 1) % ids.length]);
      if (i % 11 === 0) samples.push(await sample(i));
    }
    const a = samples[0],
      b = samples.at(-1);
    ok(
      '33轮跨文物重开内存保持有界',
      b.heapBytes < a.heapBytes + 12 * 1024 * 1024 &&
        b.nodes < a.nodes + 300 &&
        b.jsEventListeners < a.jsEventListeners + 30,
    );
    await p.evaluate(() => {
      setTimeout(() => {
        throw Error('副本边界模拟异常');
      }, 0);
    });
    await p.waitForTimeout(150);
    ok(
      '新副本JS异常会暂停',
      await p.evaluate(
        () =>
          Game.Expeditions.snapshot().paused &&
          Game.Diagnostics.entries().some((x) => x.detail.includes('副本边界模拟异常')),
      ),
    );
    const out = path.resolve(process.argv[3] || 'test-results');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, '副本边界抽查.json'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          browser: 'chrome',
          checks,
          samples,
          notes: '全部12篇实际通关见全副本测试结果；本脚本专注失败、重开和内存边界。',
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
