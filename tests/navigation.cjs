const fs = require('fs'),
  vm = require('vm'),
  path = require('path'),
  assert = require('assert/strict');
const root = path.join(__dirname, '..');
let step = 0;
const ctx = { Game: { BellsQuest: { get: () => ({ step }) } }, window: null, console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of [
  'npcs',
  'maps',
  'world-map',
  'collision',
  'bells-content',
  'revision',
  'navigation',
  'journey',
])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), ctx);
const G = ctx.Game;
for (const f of fs.readdirSync(path.join(root, 'js')))
  new vm.Script(fs.readFileSync(path.join(root, 'js', f), 'utf8'));
function flood(s) {
  const unit = 10,
    seed = G.Navigation.safe(s, s.spawnPoint),
    queue = [[Math.round(seed.x / unit), Math.round(seed.y / unit)]],
    seen = new Set(queue.map((p) => p.join(',')));
  let i = 0;
  while (i < queue.length) {
    const [x, y] = queue[i++];
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
        queue.push([a, b]);
      }
    }
  }
  return queue.map(([x, y]) => ({ x: x * unit, y: y * unit }));
}
for (const [id, s] of Object.entries(G.Maps)) {
  const reachable = flood(s);
  const safe = G.Navigation.safe(s, s.spawnPoint);
  assert(G.Collision.valid(s, safe.x, safe.y));
  assert(!G.Navigation.overlaps(s, safe));
  for (const e of s.exits) {
    assert(
      reachable.some((p) => G.Collision.inside(p, e)),
      id + ' exit ' + e.label,
    );
    const landing = G.Navigation.safe(G.Maps[e.target], e.spawn);
    assert(!G.Navigation.overlaps(G.Maps[e.target], landing), id + ' landing');
  }
  for (const q of G.BellsContent.steps.filter((q) => q.scene === id)) {
    const n =
      (G.BellsObjects[id] || []).find((n) => n.id === q.target) ||
      s.npcList.find((n) => n.id === q.target);
    assert(n);
    assert(
      reachable.some((p) => Math.hypot(p.x - n.x, p.y - n.y) < 110),
      id + ' quest ' + q.id,
    );
  }
  if (id !== 'overworld') {
    assert.equal(s.mapWidth, 1260);
    const d = G.Navigation.departure(id);
    assert.equal(d.id, 'overworld');
    assert(!G.Navigation.overlaps(G.Maps.overworld, d.position));
  }
  console.log('PASS', id, 'gates, targets, safe spawns');
}
for (const e of G.Maps.overworld.exits) {
  const old = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
  const recovered = G.Navigation.safe(G.Maps.overworld, old);
  assert(!G.Navigation.overlaps(G.Maps.overworld, recovered), 'restore from an old entrance save');
}
step = G.BellsContent.steps.findIndex((q) => q.id === 'archaeologist');
assert.equal(G.Navigation.departure('ritual').id, 'dig');
for (const e of G.Maps.ritual.exits) assert.equal(e.target, 'dig');
step--;
assert.equal(G.Navigation.departure('ritual').id, 'overworld');
const center = (id) => {
  const p = G.WorldPlaces.find((p) => p.id === id);
  return p.x + p.w / 2;
};
assert(center('palace') < center('road') && center('road') < center('ritual'));
for (const p of G.WorldPlaces) {
  assert.equal(p.entry.x + p.entry.w / 2, p.x + p.w / 2);
  assert(p.entry.y - p.y - p.h <= 15);
}
console.log(
  'PASS old entrance saves, leave-without-reentry, ritual-to-dig switch, Chu-ferry-Zeng ordering, front-door alignment.',
);

const route = G.Maps.workshop.forwardRoute;
let length = 0;
for (let i = 1; i < route.length; i++) {
  const a = route[i - 1],
    b = route[i],
    n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3);
  length += Math.hypot(b.x - a.x, b.y - a.y);
  for (let j = 0; j <= n; j++) {
    const x = a.x + ((b.x - a.x) * j) / n,
      y = a.y + ((b.y - a.y) * j) / n;
    assert(
      G.Collision.valid(G.Maps.workshop, x, y),
      'forward aisle segment ' + i + ' at ' + x + ',' + y,
    );
  }
}
assert(length < 1000);
step = G.BellsContent.steps.findIndex((q) => q.id === 'curator');
assert.equal(G.Navigation.departure('dig').id, 'future');
for (const e of G.Maps.dig.exits) assert.equal(e.target, 'future');
assert(
  G.Collision.valid(G.Maps.future, G.Navigation.museumArrival.x, G.Navigation.museumArrival.y),
);
for (const q of G.BellsContent.steps)
  for (const page of q.pages || []) assert(!/教学|虚构|示意|非.*复原|数字复制|游戏创作/.test(page));
console.log('PASS continuous short workshop route, dig-to-museum arrival and natural dialogue.');

ctx.addEventListener = () => {};
ctx.document = { addEventListener() {} };
G.UI = { esc: String };
G.Store = { load: () => ({ bellsQuest: null, settings: { volume: 0 } }) };
vm.runInContext(fs.readFileSync(path.join(root, 'js/bells-quest.js'), 'utf8'), ctx);
assert.equal(Array.from(G.StarSong.phrase).join(','), '0,0,3,3,4,4,3');
assert.equal(G.StarSong.beats[6], 2);
const restored = G.BellsQuest.normalize({
  version: 2,
  step: 8,
  data: { musician: { practiceNotes: [0, 3, 3, 99], songMode: true, songIndex: 4 } },
});
assert.equal(Array.from(restored.data.musician.practiceNotes).join(','), '0,3');
assert.equal(restored.data.musician.songIndex, 4);
assert.equal(restored.data.musician.songMode, true);
console.log(
  'PASS Twinkle opening notes, long ending note, practice and guided progress save normalization.',
);
