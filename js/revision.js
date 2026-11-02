/**
 * @file revision.js
 * @description 历史任务配置调整与扩展。基于先前模块补充场景和交互。
 */
// Per-scene art, safe traversal and two distinct gates.
Game.Maps.palace.npcList = Game.Maps.palace.npcList.filter((n) => n.id === 'king');
Game.Maps.overworld.npcList = [];
const directions = {
  palace: ['south', 'east'],
  workshop: ['west', 'east'],
  road: ['west', 'east'],
  ritual: ['south', 'north'],
  dig: ['west', 'north'],
  future: ['south', 'east'],
};
const gate = (d, target, label, spawn) => ({
  x: d === 'west' ? 50 : d === 'east' ? 1640 : 840,
  y: d === 'north' ? 50 : d === 'south' ? 1080 : 730,
  w: 110,
  h: 85,
  target,
  label,
  spawn,
});
for (const [id, ds] of Object.entries(directions)) {
  const scene = Game.Maps[id],
    place = Game.WorldPlaces.find((p) => p.id === id),
    landing = { x: place.x + place.w / 2, y: place.y + place.h + 155 };
  scene.exits = ds.map((d) =>
    gate(
      d,
      'overworld',
      d === 'south'
        ? '南门 · 行舆图'
        : d === 'north'
          ? '北门 · 行舆图'
          : d === 'east'
            ? '东门 · 行舆图'
            : '西门 · 行舆图',
      landing,
    ),
  );
  scene.routeDirections = ds;
  scene.collisionBoxes = scene.buildings
    .filter((b) => b.type !== 'bridge')
    .map(({ x, y, w, h }) => ({ x, y, w, h }));
  scene.collisionBoxes.push(
    ...scene.npcList.map((n) => ({ x: n.x - 14, y: n.y - 12, w: 28, h: 24 })),
  );
}
// Ferry route is terrain, never a destination house.
Game.WorldPlaces.find((p) => p.id === 'road').name = '古道 · 江津渡';
Game.Maps.overworld.buildings = Game.Maps.overworld.buildings.filter((b) => b.label !== '千里送钟');
Game.Maps.overworld.collisionBoxes = Game.Maps.overworld.buildings.map(({ x, y, w, h }) => ({
  x,
  y,
  w,
  h,
}));
// Distinct open route layouts; visual obstacles carry the same world coordinates.
Game.Maps.workshop.buildings = [
  { x: 290, y: 170, w: 300, h: 230, type: 'furnace', label: '熔炉' },
  { x: 1200, y: 120, w: 350, h: 260, label: '制模棚' },
  { x: 300, y: 850, w: 300, h: 100, type: 'table', label: '铸造工具案' },
  { x: 1250, y: 900, w: 260, h: 130, type: 'crates', label: '铜料堆' },
];
Game.Maps.road.buildings = Game.Maps.road.buildings.filter(
  (b) => b.type === 'river' || b.type === 'bridge' || b.type === 'stall',
);
for (const id of ['workshop', 'road']) {
  const s = Game.Maps[id];
  s.collisionBoxes = s.buildings
    .filter((b) => b.type !== 'bridge')
    .map(({ x, y, w, h }) => ({ x, y, w, h }));
  s.collisionBoxes.push(...s.npcList.map((n) => ({ x: n.x - 14, y: n.y - 12, w: 28, h: 24 })));
}
Game.SceneImages = {};
Game.loadSceneImages = () =>
  Promise.all(
    ['palace', 'workshop', 'overworld'].map(
      (id) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            Game.SceneImages[id] = img;
            resolve();
          };
          img.onerror = resolve;
          img.src = 'assets/' + id + '-wmx2.png';
        }),
    ),
  );
// Calibrated against the final 1536x1024 illustrations, converted to 1800x1200 world units.
const box = (x, y, w, h) => ({ x, y, w, h });
Game.Maps.palace.collisionBoxes = [
  box(550, 0, 700, 420),
  box(60, 0, 135, 1080),
  box(1600, 0, 95, 610),
  box(1600, 830, 95, 250),
  box(250, 335, 120, 230),
  box(250, 680, 120, 230),
  box(1410, 335, 120, 230),
  box(1410, 680, 120, 230),
  box(30, 1010, 735, 80),
  box(1030, 1010, 740, 80),
  box(886, 478, 28, 24),
];
Game.Maps.palace.exits[1] = {
  x: 1690,
  y: 655,
  w: 65,
  h: 100,
  target: 'overworld',
  label: '东门 · 行舆图',
  spawn: Game.Maps.palace.exits[0].spawn,
};
Game.Maps.workshop.exits = [
  {
    x: 840,
    y: 1080,
    w: 120,
    h: 75,
    target: 'overworld',
    label: '南门 · 行舆图',
    spawn: Game.Maps.workshop.exits[0].spawn,
  },
  {
    x: 1640,
    y: 590,
    w: 110,
    h: 100,
    target: 'overworld',
    label: '东门 · 行舆图',
    spawn: Game.Maps.workshop.exits[0].spawn,
  },
];
Game.Maps.workshop.collisionBoxes = [
  box(240, 140, 440, 300),
  box(1020, 40, 480, 390),
  box(640, 460, 210, 170),
  box(860, 580, 260, 150),
  box(260, 660, 150, 170),
  box(560, 780, 180, 140),
  box(1270, 650, 260, 170),
  box(30, 960, 730, 100),
  box(1030, 960, 700, 100),
];
Game.Maps.workshop.npcList.find((n) => n.id === 'elder').x = 550;
Game.Maps.workshop.npcList.find((n) => n.id === 'elder').y = 540;
Game.BellsObjects.workshop[0].x = 1230;
Game.BellsObjects.workshop[0].y = 550;
Game.BellsObjects.workshop[1].x = 1100;
Game.BellsObjects.workshop[1].y = 870;
Game.Maps.workshop.collisionBoxes.push(
  ...Game.Maps.workshop.npcList.map((n) => box(n.x - 14, n.y - 12, 28, 24)),
);
Game.Maps.overworld.collisionBoxes = [
  box(440, 140, 270, 160),
  box(1100, 120, 290, 210),
  box(820, 530, 270, 180),
  box(250, 690, 280, 170),
  box(80, 140, 190, 150),
  box(660, 350, 230, 130),
];
// A real journey along a river, with two opposing gateways and no landmark house.
Game.Maps.road.sceneName = '千里送钟 · 古道与江津渡';
const young = Game.Maps.workshop.npcList.find((n) => n.id === 'young');
young.x = 1430;
young.y = 510;
Game.Maps.workshop.collisionBoxes = Game.Maps.workshop.collisionBoxes.filter(
  (b) => !(b.w === 28 && b.h === 24),
);
Game.Maps.workshop.collisionBoxes.push(
  ...Game.Maps.workshop.npcList.map((n) => box(n.x - 14, n.y - 12, 28, 24)),
);
Game.BellsContent.steps.find((q) => q.id === 'craftsman').hint = [
  '老工匠在熔炉东南方，沿铺石空地靠近。',
  '走到（550，540）附近按 E。',
];
Game.BellsContent.steps.find((q) => q.id === 'shape').hint = [
  '陶范观察案位于工坊中央偏东。',
  '靠近（1230，550）按 E 记录观察。',
];
