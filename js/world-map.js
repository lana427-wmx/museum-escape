/**
 * @file world-map.js
 * @description 荆楚全景地图配置。连接历史场景，并定义入口、道路及装饰。
 */
// Art-directed geographic abstraction; every landmark is a walkable destination.
Game.WorldPlaces = [
  { id: 'palace', x: 440, y: 150, w: 270, h: 180, name: '楚国王宫', era: '战国 · 楚' },
  { id: 'workshop', x: 1100, y: 180, w: 250, h: 155, name: '青铜工坊', era: '战国 · 铸钟' },
  { id: 'road', x: 1420, y: 580, w: 220, h: 150, name: '千里送钟', era: '古道 · 渡口' },
  { id: 'ritual', x: 820, y: 600, w: 270, h: 170, name: '曾国礼乐殿', era: '战国 · 曾' },
  { id: 'dig', x: 260, y: 680, w: 250, h: 170, name: '1978 年考古现场', era: '湖北 · 随县' },
  { id: 'future', x: 80, y: 110, w: 230, h: 170, name: '未来博物馆', era: '未来 · 展厅' },
];
const world = (Game.Maps.overworld = {
  sceneId: 'overworld',
  sceneName: '荆楚行舆图',
  era: '千年钟鸣 · 自由行旅',
  background: 'overworld',
  mapWidth: 1800,
  mapHeight: 1200,
  spawnPoint: { x: 575, y: 450 },
  collisionBoxes: [],
  npcList: [
    { id: 'traveler', name: '行旅人', x: 800, y: 470, color: '#b49265', interaction: null },
    { id: 'ferryman', name: '渡口行人', x: 1320, y: 820, color: '#83998b', interaction: null },
  ],
  buildings: [],
  decorations: [],
  exits: [],
});
Game.WorldPlaces.forEach((p) => {
  world.buildings.push({
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    label: p.name,
    type: p.id === 'dig' ? 'tent' : p.id === 'future' ? 'building' : 'building',
  });
  world.collisionBoxes.push({ x: p.x - 12, y: p.y, w: p.w + 24, h: p.h });
  world.exits.push({
    x: p.x + p.w / 2 - 60,
    y: p.y + p.h + 40,
    w: 120,
    h: 65,
    target: p.id,
    label: '进入' + p.name,
  });
  Game.Maps[p.id].exits = [
    {
      x: 840,
      y: 1090,
      w: 120,
      h: 65,
      target: 'overworld',
      label: '出门 · 荆楚行舆图',
      spawn: { x: p.x + p.w / 2, y: p.y + p.h + 155 },
    },
  ];
});
for (let i = 0; i < 95; i++) {
  const x = 65 + ((i * 173) % 1660),
    y = 50 + ((i * 237) % 1080);
  if (
    !world.buildings.some(
      (b) => x > b.x - 70 && x < b.x + b.w + 70 && y > b.y - 40 && y < b.y + b.h + 200,
    )
  )
    world.decorations.push({ type: 'tree', x, y, size: 25 + (i % 3) * 9, interaction: null });
}
world.collisionBoxes.push(
  ...world.npcList.map((n) => ({ x: n.x - 14, y: n.y - 12, w: 28, h: 24 })),
);
// Palace interior: throne, lacquer screens, columns, ritual vessels, open central aisle.
Object.assign(Game.Maps.palace, {
  sceneName: '楚国王宫 · 大殿',
  buildings: [
    { x: 680, y: 150, w: 440, h: 180, type: 'throne', label: '楚王御座' },
    { x: 240, y: 150, w: 230, h: 160, type: 'screen', label: '漆绘屏风' },
    { x: 1330, y: 150, w: 230, h: 160, type: 'screen', label: '凤鸟纹屏风' },
    ...[380, 1420].flatMap((x) =>
      [430, 700].map((y) => ({ x, y, w: 55, h: 75, type: 'column', label: '朱漆殿柱' })),
    ),
    { x: 230, y: 850, w: 270, h: 110, type: 'table', label: '礼器案' },
    { x: 1300, y: 850, w: 270, h: 110, type: 'table', label: '礼器案' },
  ],
  decorations: [
    { type: 'urn', x: 650, y: 520 },
    { type: 'urn', x: 1150, y: 520 },
    { type: 'banner', x: 550, y: 240 },
    { type: 'banner', x: 1250, y: 240 },
    { type: 'lantern', x: 720, y: 850 },
    { type: 'lantern', x: 1080, y: 850 },
  ],
});
Game.Maps.palace.collisionBoxes = [
  ...Game.Maps.palace.buildings.map(({ x, y, w, h }) => ({ x, y, w, h })),
  ...Game.Maps.palace.npcList.map((n) => ({ x: n.x - 14, y: n.y - 12, w: 28, h: 24 })),
];
