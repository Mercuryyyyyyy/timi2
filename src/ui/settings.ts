import { CONTAINER_WIDTH, CONTAINER_HEIGHT, HUD_HEIGHT, FONT_STACK } from '../constants';

export function drawSettings(ctx: CanvasRenderingContext2D, isMuted: boolean): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT + HUD_HEIGHT);

  const cx = CONTAINER_WIDTH / 2;

  // Title
  ctx.font = `bold 24px ${FONT_STACK}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('⚙ 设置', cx, 140);

  // Sound toggle button
  const btnY = 200;
  ctx.fillStyle = isMuted ? '#999' : '#e91e63';
  roundRect(ctx, cx - 80, btnY, 160, 44, 22);
  ctx.fill();
  ctx.font = `16px ${FONT_STACK}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isMuted ? '🔇 音效已关闭' : '🔊 音效已开启', cx, btnY + 22);

  // Close hint
  ctx.font = `12px ${FONT_STACK}`;
  ctx.fillStyle = '#999';
  ctx.textAlign = 'center';
  ctx.fillText('点击设置按钮关闭', cx, 310);
  ctx.restore();
}

export function isSoundToggleClicked(x: number, y: number): boolean {
  const cx = CONTAINER_WIDTH / 2;
  const btnY = 200;
  return x >= cx - 80 && x <= cx + 80 && y >= btnY && y <= btnY + 44;
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
