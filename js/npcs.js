/**
 * @file npcs.js
 * @description NPC 外观与场景数据。剧情推进由任务模块处理。
 */
Game.NPCs = {
  future: [
    { id: 'curator', name: '展馆管理员', x: 630, y: 700, role: 'modern', color: '#758f99' },
    { id: 'tech', name: '装置维护员', x: 1110, y: 470, role: 'modern', color: '#d1c4a7' },
  ],
  palace: [
    { id: 'king', name: '楚惠王', x: 900, y: 490, role: 'royal', color: '#a46449' },
    { id: 'attendant', name: '宫廷侍从', x: 1090, y: 660, role: 'robe', color: '#99a58c' },
    { id: 'guard1', name: '王宫守卫', x: 730, y: 940, role: 'guard', color: '#687d83' },
    { id: 'guard2', name: '王宫守卫', x: 1070, y: 940, role: 'guard', color: '#687d83' },
  ],
  workshop: [
    { id: 'elder', name: '老工匠', x: 550, y: 710, role: 'worker', color: '#b29169' },
    { id: 'young', name: '年轻工匠', x: 1090, y: 680, role: 'worker', color: '#8c9b89' },
  ],
  road: [
    { id: 'leader', name: '车队负责人', x: 570, y: 750, role: 'robe', color: '#9f7856' },
    { id: 'boatman', name: '船夫', x: 1110, y: 620, role: 'worker', color: '#a3a291' },
    { id: 'merchant', name: '商贩', x: 440, y: 490, role: 'robe', color: '#ad765d' },
  ],
  ritual: [
    { id: 'official', name: '曾国礼官', x: 820, y: 670, role: 'royal', color: '#9c6b50' },
    { id: 'musician1', name: '宫廷乐师', x: 1000, y: 530, role: 'robe', color: '#86a191' },
    { id: 'musician2', name: '宫廷乐师', x: 1150, y: 750, role: 'robe', color: '#a9a18d' },
  ],
  dig: [
    { id: 'chief', name: '考古领队', x: 620, y: 650, role: 'modern', color: '#7e9b9d' },
    { id: 'arch1', name: '考古工作人员', x: 1100, y: 540, role: 'modern', color: '#a6a78f' },
    { id: 'arch2', name: '考古工作人员', x: 780, y: 860, role: 'modern', color: '#bdad86' },
  ],
};
Object.values(Game.NPCs)
  .flat()
  .forEach((n) => {
    n.interaction = null;
  });
