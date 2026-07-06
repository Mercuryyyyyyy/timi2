import { CONTAINER_WIDTH, FONT_STACK, COLOR_ACCENT, COLOR_WHITE } from '../constants';

export function drawMenu(ctx: CanvasRenderingContext2D): void {
  const cx = CONTAINER_WIDTH / 2;

  // Title
  ctx.save();
  ctx.font = `bold 36px ${FONT_STACK}`;
  ctx.fillStyle = COLOR_ACCENT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('合成大timi', cx, 120);
  ctx.restore();

  // Subtitle
  ctx.save();
  ctx.font = `14px ${FONT_STACK}`;
  ctx.fillStyle = '#999';
  ctx.textAlign = 'center';
  ctx.fillText('王者荣耀英雄合成游戏', cx, 155);
  ctx.restore();

  // Start button
  const btnW = 160;
  const btnH = 50;
  const btnX = cx - btnW / 2;
  const btnY = 200;

  ctx.save();
  ctx.fillStyle = 'rgba(233, 30, 99, 0.3)';
  ctx.beginPath();
  roundRect(ctx, btnX + 2, btnY + 2, btnW, btnH, 25);
  ctx.fill();

  const grad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  grad.addColorStop(0, '#f48fb1');
  grad.addColorStop(1, COLOR_ACCENT);
  ctx.fillStyle = grad;
  ctx.beginPath();
  roundRect(ctx, btnX, btnY, btnW, btnH, 25);
  ctx.fill();

  ctx.font = `bold 20px ${FONT_STACK}`;
  ctx.fillStyle = COLOR_WHITE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('开始游戏', cx, btnY + btnH / 2);
  ctx.restore();

  // Merge chain rule
  let ruleY = 275;
  ctx.save();
  ctx.font = `bold 11px ${FONT_STACK}`;
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.fillText('合成规则：相同英雄碰撞 → 合成下一级', cx, ruleY);
  ctx.restore();

  // Operation hint
  ruleY += 18;
  ctx.save();
  ctx.font = `bold 10px ${FONT_STACK}`;
  ctx.fillStyle = '#e91e63';
  ctx.textAlign = 'center';
  ctx.fillText('🌟 瑶 + 瑶 = 10000分 + 蝴蝶特效 + 底部掉落3个小英雄', cx, ruleY);
  ctx.restore();

  ruleY += 22;
  ctx.save();
  ctx.font = `10px ${FONT_STACK}`;
  ctx.fillStyle = '#bbb';
  ctx.textAlign = 'center';
  ctx.fillText('长按移动定位 · 松手掉落', cx, ruleY);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function isStartButtonClicked(x: number, y: number): boolean {
  const cx = CONTAINER_WIDTH / 2;
  const btnW = 160;
  const btnH = 50;
  const btnX = cx - btnW / 2;
  const btnY = 200;  // must match drawMenu's btnY
  return x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH;
}
