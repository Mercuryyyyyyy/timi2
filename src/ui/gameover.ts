import { CONTAINER_WIDTH, CONTAINER_HEIGHT, FONT_STACK, COLOR_ACCENT, COLOR_WHITE, COLOR_OVERLAY, type LeaderboardEntry } from '../constants';

/** Module-level cache of the button Y computed during the last drawGameOver call, used by hit-test functions. */
let lastButtonY = 0;

export function drawGameOver(ctx: CanvasRenderingContext2D, score: number, isNewRecord: boolean, leaderboard: LeaderboardEntry[]): void {
  // Semi-transparent overlay
  ctx.save();
  ctx.fillStyle = COLOR_OVERLAY;
  ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);
  ctx.restore();

  const cx = CONTAINER_WIDTH / 2;
  let y = 120;

  // Game Over title
  ctx.save();
  ctx.font = `bold 32px ${FONT_STACK}`;
  ctx.fillStyle = COLOR_WHITE;
  ctx.textAlign = 'center';
  ctx.fillText('游戏结束', cx, y);
  ctx.restore();
  y += 40;

  // Score
  ctx.save();
  ctx.font = `bold 48px ${FONT_STACK}`;
  ctx.fillStyle = COLOR_ACCENT;
  ctx.textAlign = 'center';
  ctx.fillText(String(score), cx, y);
  ctx.restore();
  y += 30;

  // "分" label
  ctx.save();
  ctx.font = `14px ${FONT_STACK}`;
  ctx.fillStyle = '#ccc';
  ctx.textAlign = 'center';
  ctx.fillText('分', cx, y);
  ctx.restore();
  y += 25;

  // New record badge
  if (isNewRecord) {
    ctx.save();
    ctx.font = `bold 16px ${FONT_STACK}`;
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 新纪录！', cx, y);
    ctx.restore();
    y += 30;
  }

  y += 10;

  // Leaderboard
  ctx.save();
  ctx.font = `bold 14px ${FONT_STACK}`;
  ctx.fillStyle = COLOR_WHITE;
  ctx.textAlign = 'center';
  ctx.fillText('🏆 排行榜', cx, y);
  ctx.restore();
  y += 24;

  if (leaderboard.length === 0) {
    ctx.save();
    ctx.font = `12px ${FONT_STACK}`;
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.fillText('暂无记录', cx, y);
    ctx.restore();
    y += 20;
  } else {
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      ctx.save();
      ctx.font = `13px ${FONT_STACK}`;
      const rankColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#999';
      ctx.fillStyle = rankColor;
      ctx.textAlign = 'right';
      ctx.fillText(`#${i + 1}`, cx - 60, y);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      const yaoMark = entry.hasYao ? ' 🌸' : '';
      ctx.fillText(`${entry.score}分  ${entry.date}${yaoMark}`, cx - 40, y);
      ctx.restore();
      y += 20;
    }
  }

  y += 10;

  // Cache Y for hit-test functions
  lastButtonY = y;

  // Buttons
  drawButton(ctx, '再来一局', cx - 90, y, 80, 40, 'replay');
  drawButton(ctx, '返回首页', cx + 10, y, 80, 40, 'home');
}

function drawButton(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number, _tag: string): void {
  ctx.save();
  ctx.fillStyle = COLOR_ACCENT;
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, 20);
  ctx.fill();

  ctx.font = `bold 14px ${FONT_STACK}`;
  ctx.fillStyle = COLOR_WHITE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
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

export function isReplayClicked(x: number, y: number): boolean {
  const cx = CONTAINER_WIDTH / 2;
  // "再来一局" button: x = cx-90, y = lastButtonY, w=80, h=40
  const btnX = cx - 90;
  return x >= btnX && x <= btnX + 80 && y >= lastButtonY && y <= lastButtonY + 40;
}

export function isHomeClicked(x: number, y: number): boolean {
  const cx = CONTAINER_WIDTH / 2;
  const btnX = cx + 10;
  return x >= btnX && x <= btnX + 80 && y >= lastButtonY && y <= lastButtonY + 40;
}
