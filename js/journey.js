/**
 * @file journey.js
 * @description 行旅体验扩展。衔接地图导航与原有交互入口。
 */
// Tasks sit on the same forward aisle after the craftsman, in world coordinates.
(() => {
  const s = Game.Maps.workshop;
  const mold = Game.BellsObjects.workshop.find((o) => o.id === 'mold-study'),
    tone = Game.BellsObjects.workshop.find((o) => o.id === 'tone-bell');
  Object.assign(mold, { x: 480, y: 300 });
  Object.assign(tone, { x: 640, y: 300, name: '试音钟' });
  const furnace = s.collisionBoxes.find((b) => Math.abs(b.x - 168) < 1 && Math.abs(b.y - 98) < 1);
  if (furnace) {
    furnace.w = 259;
    furnace.h = 182;
  }
  s.forwardRoute = [
    { x: 420, y: 378 },
    { x: 420, y: 300 },
    { x: 480, y: 300 },
    { x: 640, y: 300 },
    { x: 690, y: 330 },
    { x: 1040, y: 330 },
    { x: 1148, y: 413 },
  ];
  Game.BellsContent.steps.find((q) => q.id === 'craftsman').hint = [
    '沿入坊石路走向熔炉旁的老工匠。',
    '交谈后沿身后的石路往前，依次查看陶范、试钟。',
  ];
  Game.BellsContent.steps.find((q) => q.id === 'shape').hint = [
    '陶范就在老工匠身后那条路的前方。',
    '沿原路向前即可，不必折回南门。',
  ];
  Game.BellsContent.steps.find((q) => q.id === 'double-tone').hint = [
    '从陶范案沿石路继续向前，试音钟就在前面。',
    '点击钟身①、②两处，观察不同音名。',
  ];
  Game.Navigation.museumArrival = { x: 560, y: 500 };
  const original = Game.Navigation.departure;
  Game.Navigation.departure = (source) =>
    source === 'dig' &&
    Game.BellsQuest.get().step >= Game.BellsContent.steps.findIndex((q) => q.id === 'curator')
      ? { id: 'future', position: { ...Game.Navigation.museumArrival } }
      : original(source);
  const dig = Game.Maps.dig;
  dig.exits = dig.exits.map((e) => ({
    x: e.x,
    y: e.y,
    w: e.w,
    h: e.h,
    get target() {
      return Game.BellsQuest.get().step >=
        Game.BellsContent.steps.findIndex((q) => q.id === 'curator')
        ? 'future'
        : 'overworld';
    },
    get spawn() {
      return this.target === 'future' ? { ...Game.Navigation.museumArrival } : e.spawn;
    },
    label: '离场 · 记录完成后返回博物馆',
  }));
})();
