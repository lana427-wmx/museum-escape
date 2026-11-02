const fs = require('fs'),
  vm = require('vm'),
  path = require('path'),
  assert = require('assert/strict'),
  root = path.resolve(__dirname, '..');
const G = { Maps: {}, loadSceneImages: () => Promise.resolve() };
const ctx = { Game: G, Image: class {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/scenery.js'), 'utf8'), ctx);
for (const file of fs.readdirSync(path.join(root, 'js')))
  new vm.Script(fs.readFileSync(path.join(root, 'js', file), 'utf8'));
for (const id of Object.keys(G.Scenery.profiles)) {
  const bytes = fs.readFileSync(path.join(root, 'assets/extensions', id + '.png'));
  assert.equal(bytes.readUInt32BE(16), 1536);
  assert.equal(bytes.readUInt32BE(20), 1024);
  const s = {
    sceneId: id,
    mapWidth: id === 'overworld' ? 1800 : 1260,
    mapHeight: id === 'overworld' ? 1200 : 840,
  };
  G.Scenery.images[id] = {};
  const b = G.Scenery.bounds(s);
  assert(b.x < 0 && b.y < 0 && b.x + b.w > s.mapWidth && b.y + b.h > s.mapHeight);
  for (const [w, h] of [
    [1366, 768],
    [1920, 1080],
    [2560, 1080],
    [3840, 2160],
    [390, 844],
  ])
    for (const [x, y] of [
      [0, 0],
      [s.mapWidth, 0],
      [0, s.mapHeight],
      [s.mapWidth, s.mapHeight],
      [s.mapWidth / 2, s.mapHeight / 2],
    ]) {
      const c = G.Scenery.camera(s, { x, y }, { w, h, zoom: 0.55 }),
        eps = 1e-8;
      assert(
        c.x >= b.x - eps &&
          c.y >= b.y - eps &&
          c.x + w / c.zoom <= b.x + b.w + eps &&
          c.y + h / c.zoom <= b.y + b.h + eps,
        id + ' no blank beyond image',
      );
      assert(
        x >= c.x - eps &&
          x <= c.x + w / c.zoom + eps &&
          y >= c.y - eps &&
          y <= c.y + h / c.zoom + eps,
        id + ' player remains visible',
      );
    }
  delete G.Scenery.images[id];
  const fallback = G.Scenery.camera(s, { x: 0, y: 0 }, { w: 1920, h: 1080, zoom: 0.55 });
  assert(fallback.x >= 0 && fallback.y >= 0);
  assert(1920 / fallback.zoom <= s.mapWidth + 1e-8);
  console.log(
    'PASS ' +
      id +
      ' illustrated extent, 25 viewport/edge combinations, bounded missing-asset fallback',
  );
}
const draws = [];
function context() {
  return new Proxy(
    {
      drawImage: (...a) => draws.push(a),
      measureText: () => ({ width: 10 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    },
    { get: (o, k) => o[k] || (() => {}) },
  );
}
ctx.document = { createElement: () => ({ width: 0, height: 0, getContext: context }) };
G.SceneArt = { ground() {}, building() {}, decoration() {} };
G.AgentSprite = { complete: true, naturalWidth: 2, naturalHeight: 2 };
G.SceneImages = {};
G.Scenery.images.palace = {};
vm.runInContext(fs.readFileSync(path.join(root, 'js/renderer.js'), 'utf8'), ctx);
const s = {
  sceneId: 'palace',
  mapWidth: 1260,
  mapHeight: 840,
  exits: [],
  npcList: [],
  collisionBoxes: [],
  buildings: [],
  decorations: [],
};
const prepared = G.Renderer.prepare(s);
assert.equal(draws.length, 1, 'prepare draws a single illustration');
draws.length = 0;
G.Renderer.draw(
  context(),
  prepared,
  s,
  { x: 10, y: 420, direction: 'down' },
  { w: 1920, h: 1080, zoom: 1 },
  { labels: false },
);
assert.equal(
  draws.filter((a) => a[0] === prepared).length,
  1,
  'frame draws background once, no nine-grid tiling',
);
console.log('PASS renderer single-background draw and JavaScript syntax');
