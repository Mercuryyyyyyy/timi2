import { CONTAINER_WIDTH, CONTAINER_HEIGHT, HUD_HEIGHT, COLOR_ACCENT, COLOR_WHITE, FONT_STACK, type LeaderboardEntry, getHeroByTier } from '../constants';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const FULL_H = CONTAINER_HEIGHT + HUD_HEIGHT;
const CX = CONTAINER_WIDTH / 2;
const CARD_W = 270;
const CARD_R = 14;
const CARD_PAD = 14;

/** Module-level cache of button positions computed during the last drawGameOver call, used by hit-test. */
let lastReplayBtn = { x: 0, y: 0, w: 0, h: 0 };
let lastHomeBtn = { x: 0, y: 0, w: 0, h: 0 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Draw a round-rect card background. */
function card(ctx: CanvasRenderingContext2D, y: number, h: number): number {
  const x = CX - CARD_W / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  roundRect(ctx, x, y, CARD_W, h, CARD_R);
  ctx.fill();
  ctx.restore();
  return x; // card-left for content alignment
}

/** Simple round-rect path (no fill/stroke). */
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

/** Draw a label + value pair horizontally centered within a card. */
function statPair(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `11px ${FONT_STACK}`;
  ctx.fillStyle = '#999';
  ctx.fillText(label, x, y);
  ctx.font = `bold 20px ${FONT_STACK}`;
  ctx.fillStyle = '#333';
  ctx.fillText(value, x, y + 16);
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

  let y = 50;

  // ── Title ─────────────────────────────────────────────────────
  ctx.save();
  ctx.font = `bold 34px ${FONT_STACK}`;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(233,30,99,0.35)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.fillText('游戏结束', CX, y + 34); // y + fontSize roughly
  ctx.restore();
  y += 55;

  // ── Score card ────────────────────────────────────────────────
  const card1H = 78;
  card(ctx, y, card1H);
  const cl = CX - CARD_W / 2;

  // Score label
  ctx.save();
  ctx.font = `12px ${FONT_STACK}`;
  ctx.fillStyle = '#999';
  ctx.textAlign = 'center';
  ctx.fillText('最终得分', CX, y + CARD_PAD);
  ctx.restore();

  // Score number (formatted with commas)
  const scoreStr = score.toLocaleString('zh-CN');
  ctx.save();
  ctx.font = `bold 48px ${FONT_STACK}`;
  ctx.fillStyle = COLOR_ACCENT;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(233,30,99,0.15)';
  ctx.shadowBlur = 4;
  ctx.fillText(scoreStr, CX, y + 30);
  ctx.restore();

  // "分" after the score
  ctx.save();
  ctx.font = `13px ${FONT_STACK}`;
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'center';
  ctx.fillText('分', CX, y + 62);
  ctx.restore();
  y += card1H + 10;

  // ── New record badge ──────────────────────────────────────────
  if (isNewRecord) {
    ctx.save();
    ctx.font = `bold 14px ${FONT_STACK}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    // Pill background
    const badgeW = 130;
    const badgeX = CX - badgeW / 2;
    const badgeY = y;
    const badgeH = 26;
    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeH);
    badgeGrad.addColorStop(0, '#ffd700');
    badgeGrad.addColorStop(1, '#ffb300');
    ctx.fillStyle = badgeGrad;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillText('🎉 新纪录！', CX, badgeY + 18);
    ctx.restore();
    y += 36;
  } else {
    y += 6;
  }

  // ── Stats card ────────────────────────────────────────────────
  const card2H = 52;
  card(ctx, y, card2H);
  const hero = getHeroByTier(highestTier);
  statPair(ctx, '合成次数  ', String(mergeCount), CX - CARD_W / 4, y + CARD_PAD - 2);
  statPair(ctx, '最高级别  ', hero ? hero.nameZh : String(highestTier), CX + CARD_W / 4, y + CARD_PAD - 2);
  y += card2H + 10;

  // ── Leaderboard card ──────────────────────────────────────────
  const lbRows = leaderboard.length || 1;
  const lbH = 34 + lbRows * 20 + CARD_PAD; // header + rows + pad
  card(ctx, y, lbH);

  // Header
  ctx.save();
  ctx.font = `bold 13px ${FONT_STACK}`;
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.fillText('🏆 排行榜', CX, y + CARD_PAD + 6);
  ctx.restore();

  if (leaderboard.length === 0) {
    ctx.save();
    ctx.font = `12px ${FONT_STACK}`;
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.fillText('暂无记录', CX, y + CARD_PAD + 28);
    ctx.restore();
  } else {
    const rowY = y + CARD_PAD + 24;
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const ry = rowY + i * 20;
      // Rank number with medal colors
      ctx.save();
      ctx.font = `bold 12px ${FONT_STACK}`;
      ctx.textAlign = 'left';
      const rankColors = ['#e91e63', '#ff9800', '#4caf50', '#999', '#999'];
      ctx.fillStyle = rankColors[i] || '#999';
      ctx.fillText(`#${i + 1}`, cl + CARD_PAD, ry);
      // Score
      ctx.font = `13px ${FONT_STACK}`;
      ctx.fillStyle = '#333';
      ctx.fillText(`${entry.score}分`, cl + 40, ry);
      // Date
      ctx.font = `11px ${FONT_STACK}`;
      ctx.fillStyle = '#bbb';
      ctx.fillText(entry.date, cl + CARD_W - CARD_PAD - 52, ry);
      // Yao mark
      if (entry.hasYao) {
        ctx.font = `12px ${FONT_STACK}`;
        ctx.fillStyle = '#ff69b4';
        ctx.textAlign = 'right';
        ctx.fillText('🌸', cl + CARD_W - CARD_PAD, ry);
      }
      ctx.restore();
    }
  }
  y += lbH + 12;

  // ── Buttons ───────────────────────────────────────────────────
  const btnW = 110;
  const btnH = 40;
  const btnGap = 20;

  lastReplayBtn = { x: CX - btnW - btnGap / 2, y, w: btnW, h: btnH };
  lastHomeBtn  = { x: CX + btnGap / 2, y, w: btnW, h: btnH };

  drawButton(ctx, '再来一局', lastReplayBtn.x, lastReplayBtn.y, btnW, btnH);
  drawButton(ctx, '返回首页', lastHomeBtn.x, lastHomeBtn.y, btnW, btnH);
}

// ---------------------------------------------------------------------------
// Button drawing
// ---------------------------------------------------------------------------

function drawButton(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number): void {
  ctx.save();
  // Shadow
  ctx.shadowColor = 'rgba(233,30,99,0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  // Gradient fill
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#f48fb1');
  grad.addColorStop(1, COLOR_ACCENT);
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  // Text
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
  const b = lastReplayBtn;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

export function isHomeClicked(x: number, y: number): boolean {
  const b = lastHomeBtn;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}
