/**
 * @file maps.js
 * @description 基础历史场景配置。统一描述地图尺寸、出生点、物件、碰撞区域与出口。
 */
Game.Maps = (() => {
  const building = (x, y, w, h, label, type = 'building') => ({ x, y, w, h, label, type });
  const base = (sceneId, sceneName, era, background, buildings, decorations, exits) => ({
    sceneId,
    sceneName,
    era,
    background,
    mapWidth: 1800,
    mapHeight: 1200,
    spawnPoint: { x: 900, y: 1030 },
    buildings,
    collisionBoxes: buildings
      .filter((b) => b.type !== 'bridge')
      .map(({ x, y, w, h }) => ({ x, y, w, h })),
    npcList: Game.NPCs[sceneId],
    decorations: decorations.map((d) => ({ ...d, interaction: null })),
    exits,
  });
  const exit = (x, y, target, label) => ({ x, y, w: 110, h: 95, target, label });
  const garden = (seed) =>
    Array.from({ length: 32 }, (_, i) => ({
      type: 'tree',
      x: 90 + ((i * 239 + seed * 73) % 1600),
      y: 70 + ((i * 137 + seed * 29) % 1060),
      size: 28 + (i % 3) * 8,
    })).filter((d) => d.x < 270 || d.x > 1530);
  const m = {
    palace: base(
      'palace',
      '楚国王宫',
      '战国 · 楚',
      'palace',
      [
        building(610, 100, 580, 300, '楚宫正殿'),
        building(240, 280, 260, 240, '东序'),
        building(1300, 280, 260, 240, '西序'),
        building(370, 740, 260, 150, '宫门'),
        building(1170, 740, 260, 150, '宫门'),
        building(280, 590, 300, 100, '荷池', 'pond'),
        building(1220, 590, 300, 100, '荷池', 'pond'),
      ],
      [
        ...garden(1),
        { type: 'urn', x: 750, y: 580 },
        { type: 'urn', x: 1050, y: 580 },
        { type: 'lantern', x: 680, y: 900 },
        { type: 'lantern', x: 1120, y: 900 },
        { type: 'banner', x: 580, y: 480 },
        { type: 'banner', x: 1220, y: 480 },
      ],
      [exit(1630, 850, 'workshop', '青铜工坊')],
    ),
    workshop: base(
      'workshop',
      '青铜工坊',
      '战国 · 铸造之所',
      'workshop',
      [
        building(260, 150, 440, 260, '铸造棚'),
        building(1110, 140, 390, 250, '制模屋'),
        building(360, 480, 160, 150, '熔炉', 'furnace'),
        building(1180, 500, 240, 100, '制模台', 'table'),
        building(280, 870, 330, 100, '原料堆', 'crates'),
        building(1180, 840, 250, 140, '工具棚'),
      ],
      [
        ...garden(2),
        { type: 'bell', x: 750, y: 550 },
        { type: 'bell', x: 790, y: 660 },
        { type: 'mold', x: 1000, y: 440 },
        { type: 'mold', x: 1100, y: 830 },
        { type: 'cart', x: 560, y: 1020 },
        { type: 'lantern', x: 800, y: 330 },
      ],
      [exit(70, 800, 'palace', '楚国王宫'), exit(1630, 850, 'road', '千里送钟')],
    ),
    road: base(
      'road',
      '千里送钟',
      '战国 · 古道与渡口',
      'road',
      [
        building(160, 160, 420, 220, '古道驿站'),
        building(200, 560, 220, 100, '布帛摊', 'stall'),
        building(300, 880, 230, 100, '陶器摊', 'stall'),
        building(1210, 0, 240, 520, '江流', 'river'),
        building(1210, 690, 240, 510, '江流', 'river'),
        building(1190, 520, 280, 170, '渡桥', 'bridge'),
        building(1500, 180, 240, 210, '渡口小屋'),
      ],
      [
        ...garden(3),
        { type: 'cart', x: 690, y: 750 },
        { type: 'cart', x: 720, y: 890 },
        { type: 'boat', x: 1310, y: 790 },
        { type: 'sign', x: 1030, y: 540 },
        { type: 'tree', x: 850, y: 180, size: 65 },
        { type: 'tree', x: 1010, y: 240, size: 50 },
      ],
      [exit(60, 1010, 'workshop', '青铜工坊'), exit(1580, 850, 'ritual', '曾国礼乐殿')],
    ),
    ritual: base(
      'ritual',
      '曾国礼乐殿',
      '战国 · 曾国',
      'ritual',
      [
        building(450, 100, 900, 230, '礼乐正殿'),
        building(530, 390, 700, 100, '编钟架', 'bells'),
        building(230, 400, 220, 280, '侧殿'),
        building(1360, 400, 220, 280, '乐器库'),
        building(510, 760, 190, 110, '礼乐席', 'table'),
        building(1180, 760, 190, 110, '礼乐席', 'table'),
      ],
      [
        ...garden(4),
        { type: 'drum', x: 740, y: 620 },
        { type: 'drum', x: 1100, y: 620 },
        { type: 'banner', x: 500, y: 600 },
        { type: 'banner', x: 1300, y: 600 },
        { type: 'lantern', x: 660, y: 960 },
        { type: 'lantern', x: 1130, y: 960 },
      ],
      [exit(70, 850, 'road', '千里送钟')],
    ),
    future: base(
      'future',
      '未来博物馆',
      '未来 · 记忆展厅',
      'future',
      [
        building(250, 190, 260, 160, '空展柜 01', 'case'),
        building(1290, 190, 260, 160, '空展柜 02', 'case'),
        building(250, 520, 260, 160, '空展柜 03', 'case'),
        building(1290, 520, 260, 160, '空展柜 04', 'case'),
        building(750, 170, 300, 180, '时空装置', 'portal'),
        building(260, 850, 280, 100, '导览台', 'table'),
      ],
      [
        { type: 'planter', x: 610, y: 200 },
        { type: 'planter', x: 1190, y: 200 },
        { type: 'planter', x: 600, y: 870 },
        { type: 'planter', x: 1200, y: 870 },
        { type: 'lamp', x: 680, y: 450 },
        { type: 'lamp', x: 1110, y: 450 },
      ],
      [exit(1630, 850, 'palace', '楚国王宫')],
    ),
    dig: base(
      'dig',
      '1978 年考古现场',
      '1978 · 湖北随县',
      'dig',
      [
        building(700, 210, 500, 270, '墓葬发掘区', 'pit'),
        building(220, 160, 340, 230, '考古工作棚', 'tent'),
        building(230, 630, 280, 100, '文物整理台', 'table'),
        building(1300, 240, 270, 200, '施工设备', 'crates'),
        building(1260, 780, 300, 180, '现场资料站', 'tent'),
        building(230, 900, 300, 90, '器材堆', 'crates'),
      ],
      [
        ...garden(6),
        { type: 'sign', x: 640, y: 520 },
        { type: 'table-small', x: 1080, y: 730 },
        { type: 'crate', x: 580, y: 820 },
        { type: 'crate', x: 1230, y: 620 },
        { type: 'fence', x: 680, y: 170 },
        { type: 'fence', x: 1200, y: 520 },
      ],
      [exit(70, 1020, 'future', '未来博物馆')],
    ),
  };
  Object.values(m).forEach((s) => {
    s.collisionBoxes.push(...s.npcList.map((n) => ({ x: n.x - 14, y: n.y - 12, w: 28, h: 24 })));
  });
  return m;
})();
