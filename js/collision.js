/**
 * @file collision.js
 * @description 地图碰撞检测。校验角色位置，并将移动拆成小步，降低穿过障碍的可能。
 */
Game.Collision = {
  /** 检查角色圆形包围范围是否落在地图内，且未与矩形障碍重叠。 */
  valid(scene, x, y, r = 13) {
    return (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= r + 30 &&
      y >= r + 30 &&
      x <= scene.mapWidth - r - 30 &&
      y <= scene.mapHeight - r - 30 &&
      !scene.collisionBoxes.some(
        (b) => x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h,
      )
    );
  },
  /** 非法或缺失的存档位置回退到当前场景出生点。 */
  position(scene, p) {
    return p && this.valid(scene, p.x, p.y) ? { x: p.x, y: p.y } : { ...scene.spawnPoint };
  },
  /** 分步移动并分别校验两个轴，使角色遇到墙角时仍可沿边缘行走。 */
  move(scene, p, dx, dy) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
    for (let i = 0; i < n; i++) {
      if (this.valid(scene, p.x + dx / n, p.y)) p.x += dx / n;
      if (this.valid(scene, p.x, p.y + dy / n)) p.y += dy / n;
    }
    return p;
  },
  inside(p, b) {
    return p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h;
  },
};
