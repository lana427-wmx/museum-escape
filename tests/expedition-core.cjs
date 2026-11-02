const fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  root = path.resolve(__dirname, '..');
const G = {
  Maps: {},
  Resources: { scene: () => Promise.resolve() },
  Renderer: { prepare() {} },
  UI: {},
  Scene: {},
};
const ctx = { Game: G, Image: class {}, console };
vm.createContext(ctx);
for (const f of ['artifacts', 'collision', 'expedition-content', 'expedition-scenes'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), ctx);
for (const file of fs.readdirSync(path.join(root, 'js')))
  new vm.Script(fs.readFileSync(path.join(root, 'js', file), 'utf8'), { filename: file });
assert.equal(Object.keys(G.ExpeditionContent).length, 11);
assert.equal(G.Artifacts.length, 12);
const types = new Set();
for (const [id, c] of Object.entries(G.ExpeditionContent)) {
  const a = G.Artifacts.find((a) => a.id === id),
    s = G.Maps['relic-' + id];
  assert(a && s);
  assert.equal(c.puzzles.length, 2);
  assert(c.opening && c.visual[1] && c.record[1] && c.label && c.source.startsWith('https://'));
  for (const p of c.puzzles) {
    types.add(p.type);
    if (p.rows)
      for (const row of p.rows) assert(p.choices.includes(row[1]), id + ' unknown answer');
    if (p.items && p.shuffle) {
      assert.equal(new Set(p.shuffle).size, p.items.length);
      assert(p.shuffle.every((i) => p.items[i]));
    }
  }
  const unit = 10,
    q = [[Math.round(s.spawnPoint.x / unit), Math.round(s.spawnPoint.y / unit)]],
    seen = new Set(q.map((p) => p.join(',')));
  let i = 0;
  assert(G.Collision.valid(s, s.spawnPoint.x, s.spawnPoint.y));
  while (i < q.length) {
    const [x, y] = q[i++];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = x + dx,
        b = y + dy,
        k = a + ',' + b;
      if (!seen.has(k) && G.Collision.valid(s, a * unit, b * unit)) {
        seen.add(k);
        q.push([a, b]);
      }
    }
  }
  for (const t of [...s.npcList, ...s.objects])
    assert(
      q.some(([x, y]) => Math.hypot(x * unit - t.x, y * unit - t.y) < 110),
      id + ' target not reachable ' + t.id,
    );
  console.log('PASS', id, 'content integrity, spawn, all 7 interaction targets reachable');
}
assert(types.size >= 9);
console.log(
  'PASS 11 expeditions / 12 exhibits / ' +
    types.size +
    ' puzzle interaction types / all JavaScript syntax',
);
