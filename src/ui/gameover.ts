import { CONTAINER_WIDTH, CONTAINER_HEIGHT, HUD_HEIGHT, COLOR_ACCENT, COLOR_WHITE, FONT_STACK, type LeaderboardEntry, getHeroByTier } from '../constants';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const FULL_H = CONTAINER_HEIGHT + HUD_HEIGHT;   // 580
const CX = CONTAINER_WIDTH / 2;                  // 180
const CARD_W = 270;                              // card width
const CARD_R = 14;                               // card corner radius
const CARD_BG = 'rgba(255, 255, 255, 0.82)';    // card fill

/** Module-level cache of button positions computed during the last drawGameOver call, used by hit-test. */
let lastReplayBtn: { x: number; y: number; w: number; h: number } | null = null;
let lastHomeBtn: { x: number; y: number; w: number; h: number } | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round-rect path. */
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

/** Draw a round-rect card at (x,y) with given height. */
function card(ctx: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  ctx.save();
  ctx.fillStyle = CARD_BG;
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  roundRect(ctx, x, y, CARD_W, h, CARD_R);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Main draw
// ---------------------------------------------------------------------------

export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  score: number,
  isNewRecord: boolean,
  leaderboard: LeaderboardEntry[],
  mergeCount: number,
  highestTier: number,
): void {
  // ── Gradient overlay ──────────────────────────────────────────
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, FULL_H);
  grad.addColorStop(0, '#fce4ec');
  grad.addColorStop(1, '#f8bbd0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CONTAINER_WIDTH, FULL_H);
  ctx.restore();

  let y = 48;

  // ── Title ─────────────────────────────────────────────────────
  ctx.save();
  ctx.font = `bold 34px ${FONT_STACK}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(233,30,99,0.35)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.fillText('游戏结束', CX, y);
  ctx.restore();
  y += 50;

  // ── Score card ────────────────────────────────────────────────
  // Card: 270×100, centered
  const card1H = 100;
  const cx1 = CX - CARD_W / 2;
  card(ctx, cx1, y, card1H);

  // "最终得分" label
  ctx.save();
  ctx.font = `12px ${FONT_STACK}`;
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('最终得分', CX, y + 16);
  ctx.restore();

  // Score number (with thousands separator)
  ctx.save();
  ctx.font = `bold 44px ${FONT_STACK}`;
  ctx.fillStyle = COLOR_ACCENT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(233,30,99,0.12)';
  ctx.shadowBlur = 4;
  ctx.fillText(score.toLocaleString('zh-CN'), CX, y + 30);
  ctx.restore();

  // "分" after score
  ctx.save();
  ctx.font = `12px ${FONT_STACK}`;
  ctx.fillStyle = '#bbb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('分', CX, y + 80);
  ctx.restore();
  y += card1H + 12;

  // ── New record badge ──────────────────────────────────────────
  if (isNewRecord) {
    const bw = 128, bh = 28;
    const bx = CX - bw / 2;
    const by = y;
    ctx.save();
    const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
    bg.addColorStop(0, '#ffd700');
    bg.addColorStop(1, '#ffb300');
    ctx.fillStyle = bg;
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉 新纪录！', CX, by + bh / 2);
    ctx.restore();
    y += bh + 10;
  } else {
    y += 8;
  }

  // ── Stats row (2 columns in a card) ───────────────────────────
  const card2H = 50;
  const cx2 = CX - CARD_W / 2;
  card(ctx, cx2, y, card2H);
  const hero = getHeroByTier(highestTier);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `11px ${FONT_STACK}`;
  ctx.fillStyle = '#999';
  ctx.fillText('合成次数', cx2 + CARD_W * 0.25, y + 10);
  ctx.fillText('最高级别', cx2 + CARD_W * 0.75, y + 10);
  ctx.font = `bold 18px ${FONT_STACK}`;
  ctx.fillStyle = '#333';
  ctx.fillText(String(mergeCount), cx2 + CARD_W * 0.25, y + 24);
  ctx.fillText(hero ? hero.nameZh : String(highestTier), cx2 + CARD_W * 0.75, y + 24);
  ctx.restore();
  y += card2H + 12;

  // ── Leaderboard card ──────────────────────────────────────────
  const lbRows = Math.max(leaderboard.length, 1);
  const lbH = 26 + lbRows * 22 + 12; // header gap + rows + bottom padding
  const cx3 = CX - CARD_W / 2;
  card(ctx, cx3, y, lbH);

  // Header
  ctx.save();
  ctx.font = `bold 13px ${FONT_STACK}`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('🏆 排行榜', CX, y + 8);
  ctx.restore();

  if (leaderboard.length === 0) {
    ctx.save();
    ctx.font = `12px ${FONT_STACK}`;
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('暂无记录', CX, y + 30);
    ctx.restore();
  } else {
    const RANK_CLR = ['#e91e63', '#ff9800', '#4caf50', '#999', '#999'];
    const rowY = y + 28;
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const ry = rowY + i * 22;

      ctx.save();
      ctx.textBaseline = 'top';

      // Rank
      ctx.font = `bold 12px ${FONT_STACK}`;
      ctx.fillStyle = RANK_CLR[i] ?? '#999';
      ctx.textAlign = 'left';
      ctx.fillText(`#${i + 1}`, cx3 + 14, ry);

      // Score
      ctx.font = `13px ${FONT_STACK}`;
      ctx.fillStyle = '#333';
      ctx.fillText(`${entry.score}分`, cx3 + 42, ry);

      // Date (right-aligned)
      ctx.font = `11px ${FONT_STACK}`;
      ctx.fillStyle = '#bbb';
      ctx.textAlign = 'right';
      ctx.fillText(entry.date, cx3 + CARD_W - 14, ry);

      ctx.restore();
    }
  }
  y += lbH + 14;

  // ── Buttons ───────────────────────────────────────────────────
  const btnW = 120;
  const btnH = 42;
  const gap = 16;

  const replayX = CX - btnW - gap / 2;
  const homeX = CX + gap / 2;

  lastReplayBtn = { x: replayX, y, w: btnW, h: btnH };
  lastHomeBtn  = { x: homeX, y, w: btnW, h: btnH };

  drawButton(ctx, '再来一局', replayX, y, btnW, btnH);
  drawButton(ctx, '返回首页', homeX, y, btnW, btnH);
}

// ---------------------------------------------------------------------------
// Button drawing
// ---------------------------------------------------------------------------

function drawButton(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.shadowColor = 'rgba(233,30,99,0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#f48fb1');
  grad.addColorStop(1, COLOR_ACCENT);
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.font = `bold 15px ${FONT_STACK}`;
  ctx.fillStyle = COLOR_WHITE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Hit-test exports
// ---------------------------------------------------------------------------

export function isReplayClicked(x: number, y: number): boolean {
  if (!lastReplayBtn) return false;
  const b = lastReplayBtn;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

export function isHomeClicked(x: number, y: number): boolean {
  if (!lastHomeBtn) return false;
  const b = lastHomeBtn;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}
