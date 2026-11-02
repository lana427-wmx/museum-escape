/* 有界内存抽查；不是数小时压力测试。需要 Playwright 与本机 Chrome。 */
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
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(process.argv[2] || 'http://127.0.0.1:4183');
    await page.locator('[data-challenge=setup]').waitFor();
    await page.evaluate(() => Game.Auth.register('稳定性验收', 'test2026'));
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      Game.UI.close();
      const s = Game.Store.load();
      s.settings.motion = false;
      s.settings.effects = false;
      Game.Store.save(s);
    });
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');
    const samples = [];
    for (let round = 0; round <= 30; round++) {
      await page.evaluate(() => Game.Challenge.start('easy'));
      if (round % 5 === 0) {
        await page.waitForTimeout(100);
        await client.send('HeapProfiler.collectGarbage');
        const metrics = await client.send('Performance.getMetrics'),
          dom = await client.send('Memory.getDOMCounters');
        samples.push({
          round,
          heapBytes: metrics.metrics.find((x) => x.name === 'JSHeapUsedSize').value,
          ...dom,
          cachedScenes: await page.evaluate(() => Game.Resources.metrics().sceneCache),
        });
      }
    }
    const first = samples[0],
      last = samples.at(-1);
    assert(
      last.heapBytes < first.heapBytes + 8 * 1024 * 1024,
      'JS heap grew beyond allowed headroom',
    );
    assert(last.nodes < first.nodes + 100, 'Detached nodes accumulate');
    assert(last.jsEventListeners <= first.jsEventListeners + 5, 'Listeners accumulate');
    assert(
      samples.every((x) => x.cachedScenes <= 2),
      'Scene image cache exceeds cap',
    );
    const out = path.resolve(process.argv[3] || 'test-results');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, '内存抽查.json'),
      JSON.stringify(
        { at: new Date().toISOString(), browser: 'chrome', rounds: 30, passed: true, samples },
        null,
        2,
      ),
    );
    console.log('PASS 30轮重开内存抽查', JSON.stringify(samples));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
