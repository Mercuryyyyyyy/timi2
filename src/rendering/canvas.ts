import Matter from 'matter-js';
import {
  HERO_CHAIN, CONTAINER_WIDTH, CONTAINER_HEIGHT, DEATH_LINE_Y, HUD_HEIGHT,
  COLOR_BACKGROUND, COLOR_CONTAINER_GRADIENT_TOP, COLOR_CONTAINER_GRADIENT_BOTTOM,
  COLOR_CONTAINER_BORDER, COLOR_HUD_BG, COLOR_ACCENT,
  FONT_STACK, getHeroImagePath, type Particle,
} from '../constants';
import { getHeroBodies } from '../engine/physics';

// ---------------------------------------------------------------------------
// Image cache
// ---------------------------------------------------------------------------

// Simple image cache — load on first use
const heroImageCache = new Map<string, HTMLImageElement>();

function getHeroImg(tier: number, nameEn: string): HTMLImageElement | null {
  const basePath = getHeroImagePath(tier, nameEn);
  // Try .jpg first (most common), then .png
  for (const ext of ['.jpg', '.png']) {
    const key = basePath + ext;
    let img = heroImageCache.get(key);
    if (!img) {
      img = new Image();
      img.src = key;
      heroImageCache.set(key, img);
    }
    if (img.complete && img.naturalWidth > 0) return img;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Merge animation
// ---------------------------------------------------------------------------

const mergeAnimations = new Map<number, { startTime: number; duration: number }>();

export function animateMerge(bodyId: number): void {
  mergeAnimations.set(bodyId, { startTime: performance.now(), duration: 250 });
}

// ---------------------------------------------------------------------------
// Drop preview line
// ---------------------------------------------------------------------------

let dropPreviewX: number | null = null;
let previewTier: number | null = null;

export function setDropPreview(x: number | null, tier?: number): void {
  dropPreviewX = x;
  previewTier = tier ?? null;
}

export function renderDropPreview(ctx: CanvasRenderingContext2D, ox: number, oy: number, isDragging: boolean): void {
  if (!previewTier) return;
  const hero = HERO_CHAIN.find(h => h.tier === previewTier);
  if (!hero) return;
  const r = hero.radius;
  const x = ox + (dropPreviewX ?? CONTAINER_WIDTH / 2);
  const y = oy + 40;

  // Only show dashed guide line when dragging
  if (isDragging && dropPreviewX !== null) {
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + r);
    ctx.lineTo(x, oy + CONTAINER_HEIGHT - 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Semi-transparent when dragging, full when idle
  ctx.save();
  ctx.globalAlpha = isDragging ? 0.45 : 0.85;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const img = getHeroImg(hero.tier, hero.nameEn);
  if (img) {
    ctx.clip();
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = hero.color;
    ctx.fill();
  }
  ctx.restore();

  // Border on fresh path
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,' + (isDragging ? '0.4' : '0.7') + ')';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

export function renderBackground(ctx: CanvasRenderingContext2D): void {
  // Full canvas background using logical dimensions (matches CONTAINER_WIDTH × CONTAINER_HEIGHT+HUD_HEIGHT)
  ctx.fillStyle = COLOR_BACKGROUND;
  ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT + HUD_HEIGHT);
}

export function renderContainer(ctx: CanvasRenderingContext2D): void {
  const x = (CONTAINER_WIDTH - CONTAINER_WIDTH) / 2;
  const y = HUD_HEIGHT;

  // Container background
  const grad = ctx.createLinearGradient(x, y, x, y + CONTAINER_HEIGHT);
  grad.addColorStop(0, COLOR_CONTAINER_GRADIENT_TOP);
  grad.addColorStop(0.4, COLOR_CONTAINER_GRADIENT_TOP);
  grad.addColorStop(1, COLOR_CONTAINER_GRADIENT_BOTTOM);

  // Rounded rectangle container
  const r = 12;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + CONTAINER_WIDTH - r, y);
  ctx.quadraticCurveTo(x + CONTAINER_WIDTH, y, x + CONTAINER_WIDTH, y + r);
  ctx.lineTo(x + CONTAINER_WIDTH, y + CONTAINER_HEIGHT - r);
  ctx.quadraticCurveTo(x + CONTAINER_WIDTH, y + CONTAINER_HEIGHT, x + CONTAINER_WIDTH - r, y + CONTAINER_HEIGHT);
  ctx.lineTo(x + r, y + CONTAINER_HEIGHT);
  ctx.quadraticCurveTo(x, y + CONTAINER_HEIGHT, x, y + CONTAINER_HEIGHT - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = COLOR_CONTAINER_BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Subtle inner shadow at top (depth cue)
  const shadowGrad = ctx.createLinearGradient(x, y, x, y + 20);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.08)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + CONTAINER_WIDTH - r, y);
  ctx.quadraticCurveTo(x + CONTAINER_WIDTH, y, x + CONTAINER_WIDTH, y + r);
  ctx.lineTo(x + CONTAINER_WIDTH, y + CONTAINER_HEIGHT - r);
  ctx.quadraticCurveTo(x + CONTAINER_WIDTH, y + CONTAINER_HEIGHT, x + CONTAINER_WIDTH - r, y + CONTAINER_HEIGHT);
  ctx.lineTo(x + r, y + CONTAINER_HEIGHT);
  ctx.quadraticCurveTo(x, y + CONTAINER_HEIGHT, x, y + CONTAINER_HEIGHT - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  // Death line
  const deathY = y + DEATH_LINE_Y;
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.moveTo(x, deathY);
  ctx.lineTo(x + CONTAINER_WIDTH, deathY);
  ctx.strokeStyle = 'rgba(233, 30, 99, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------------------
// Hero bubbles
// ---------------------------------------------------------------------------

export function renderHeroBodies(
  ctx: CanvasRenderingContext2D,
  world: Matter.World,
  containerOffsetX: number,
  containerOffsetY: number,
): void {
  const bodies = getHeroBodies(world);
  for (const body of bodies) {
    const x = ((body as any)._displayX ?? body.position.x) + containerOffsetX;
    const y = ((body as any)._displayY ?? body.position.y) + containerOffsetY;
    const tier = (body as any).heroTier as number;
    const heroDef = HERO_CHAIN.find(h => h.tier === tier);
    if (!heroDef) continue;

    const r = heroDef.radius;
    const img = getHeroImg(tier, heroDef.nameEn);

    // Merge squish animation scale
    let scale = 1;
    const anim = mergeAnimations.get(body.id);
    if (anim) {
      const elapsed = performance.now() - anim.startTime;
      const duration = anim.duration;
      if (elapsed > duration) {
        mergeAnimations.delete(body.id);
      } else {
        const t = elapsed / duration;
        // Smoother "pop": spring-like easing
        // 0.3 -> 1.15 -> 0.95 -> 1.0
        if (t < 0.4) {
          scale = 0.3 + t / 0.4 * 0.85; // 0.3 → 1.15
        } else if (t < 0.7) {
          scale = 1.15 - (t - 0.4) / 0.3 * 0.2; // 1.15 → 0.95
        } else {
          scale = 0.95 + (t - 0.7) / 0.3 * 0.05; // 0.95 → 1.0
        }
      }
    }

    // Draw circle fill
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r * scale, 0, Math.PI * 2);

    if (img) {
      // Use image as fill
      ctx.clip();
      ctx.drawImage(img, x - r * scale, y - r * scale, r * 2 * scale, r * 2 * scale);
    } else {
      // Fallback: gradient fill
      const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      grad.addColorStop(0, heroDef.color);
      grad.addColorStop(1, shadeColor(heroDef.color, -30));
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();

    // Border (fresh path — clip() consumed the previous path)
    ctx.beginPath();
    ctx.arc(x, y, r * scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

export function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[], containerOffsetX: number, containerOffsetY: number): void {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.maxLife > 0 ? 1 - p.life / p.maxLife : 0;
    ctx.beginPath();
    ctx.arc(p.x + containerOffsetX, p.y + containerOffsetY, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Butterfly bloom effect (yao merge)
// ---------------------------------------------------------------------------

interface Butterfly {
  x: number; y: number; vx: number; vy: number;
  size: number; rotation: number; rotationSpeed: number;
  color: string; life: number; maxLife: number;
  wingPhase: number;
}

let butterflies: Butterfly[] = [];

export function triggerButterflyBloom(worldX: number, worldY: number): void {
  const colors = ['#FF69B4', '#FF1493', '#FFB6C1', '#DA70D6', '#FF85A2', '#FFC0CB', '#E6A8D7'];
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.8;
    const speed = 2 + Math.random() * 4;
    butterflies.push({
      x: worldX, y: worldY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2, // upward bias
      size: 8 + Math.random() * 12,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0, maxLife: 60 + Math.random() * 40,
      wingPhase: Math.random() * Math.PI * 2,
    });
  }
  // Limit total butterflies
  while (butterflies.length > 40) butterflies.shift();
}

function drawButterfly(ctx: CanvasRenderingContext2D, b: Butterfly, ox: number, oy: number): void {
  const x = b.x + ox;
  const y = b.y + oy;
  const alpha = 1 - (b.life / b.maxLife);
  const wingFlap = Math.sin(b.wingPhase + b.life * 0.3) * 0.4;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(b.rotation);

  // Left wing
  ctx.beginPath();
  ctx.ellipse(-b.size * 0.5, 0, b.size * 0.6, b.size * (0.5 + wingFlap), -0.3, 0, Math.PI * 2);
  ctx.fillStyle = b.color;
  ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.ellipse(b.size * 0.5, 0, b.size * 0.6, b.size * (0.5 + wingFlap), 0.3, 0, Math.PI * 2);
  ctx.fillStyle = b.color;
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, b.size * 0.15, b.size * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();

  ctx.restore();
}

export function updateAndDrawButterflies(ctx: CanvasRenderingContext2D, ox: number, oy: number, deltaMs: number): void {
  const f = deltaMs / 16.67; // normalize to ~60fps for frame-rate independence
  for (let i = butterflies.length - 1; i >= 0; i--) {
    const b = butterflies[i];
    b.life += f;
    b.x += b.vx * f;
    b.y += b.vy * f;
    b.vx *= Math.pow(0.98, f);
    b.vy *= Math.pow(0.98, f);
    b.rotation += b.rotationSpeed * f;
    if (b.life >= b.maxLife) {
      butterflies.splice(i, 1);
    } else {
      drawButterfly(ctx, b, ox, oy);
    }
  }
}

export function clearButterflies(): void {
  butterflies = [];
}

// ---------------------------------------------------------------------------
// HUD button layout constants
// ---------------------------------------------------------------------------

const HUD_BUTTON_RADIUS = 18;
const BUTTON_START_X = CONTAINER_WIDTH - 4 * (HUD_BUTTON_RADIUS * 2 + 6);
const BUTTON_PAUSE_CX = BUTTON_START_X + HUD_BUTTON_RADIUS + 3;
const BUTTON_RESTART_CX = BUTTON_PAUSE_CX + HUD_BUTTON_RADIUS * 2 + 6;
const BUTTON_SETTINGS_CX = BUTTON_RESTART_CX + HUD_BUTTON_RADIUS * 2 + 6;
const BUTTON_MUTE_CX = BUTTON_SETTINGS_CX + HUD_BUTTON_RADIUS * 2 + 6;

function drawHUDButton(ctx: CanvasRenderingContext2D, cx: number, cy: number, emoji: string): void {
  ctx.save();
  ctx.font = `16px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, cx, cy);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

export interface HUDData {
  score: number;
  highScore: number;
  nextTier?: number;
  isMuted: boolean;
  isPaused: boolean;
  highestTierName: string; // name of highest tier merged so far
  mergeCount: number;      // total number of merges
}

export function renderHUD(ctx: CanvasRenderingContext2D, data: HUDData): void {
  const w = CONTAINER_WIDTH;
  const barY = 0;
  const barH = HUD_HEIGHT;
  const cy = barH / 2;

  // Semi-transparent bar
  ctx.save();
  ctx.fillStyle = COLOR_HUD_BG;
  ctx.fillRect(0, barY, w, barH);

  // Bottom border for frosted effect
  ctx.fillStyle = 'rgba(233, 30, 99, 0.1)';
  ctx.fillRect(0, barH - 1, w, 1);
  ctx.restore();

  // Left: Score
  ctx.save();
  ctx.font = `bold 16px ${FONT_STACK}`;
  ctx.fillStyle = COLOR_ACCENT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🏆 ${data.score}`, 12, cy);
  ctx.restore();

  // Center-right: Highest tier merged
  if (data.highestTierName) {
    ctx.save();
    ctx.font = `11px ${FONT_STACK}`;
    ctx.fillStyle = '#999999';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`最高合成: ${data.highestTierName}`, BUTTON_START_X - 8, cy);
    ctx.restore();
  }

  // Render HUD buttons (pause, restart, settings, mute)
  drawHUDButton(ctx, BUTTON_PAUSE_CX, cy, data.isPaused ? '▶' : '⏸');
  drawHUDButton(ctx, BUTTON_RESTART_CX, cy, '🔄');
  drawHUDButton(ctx, BUTTON_SETTINGS_CX, cy, '⚙');
  drawHUDButton(ctx, BUTTON_MUTE_CX, cy, data.isMuted ? '🔇' : '🔊');
}

// ---------------------------------------------------------------------------
// HUD button hit-test functions
// ---------------------------------------------------------------------------

function isInsideButton(x: number, y: number, cx: number, cy: number, r: number): boolean {
  return y >= 0 && y < HUD_HEIGHT && Math.abs(x - cx) <= r && Math.abs(y - cy) <= r;
}

export function isPauseClicked(x: number, y: number): boolean {
  return isInsideButton(x, y, BUTTON_PAUSE_CX, HUD_HEIGHT / 2, HUD_BUTTON_RADIUS);
}

export function isRestartClicked(x: number, y: number): boolean {
  return isInsideButton(x, y, BUTTON_RESTART_CX, HUD_HEIGHT / 2, HUD_BUTTON_RADIUS);
}

export function isSettingsClicked(x: number, y: number): boolean {
  return isInsideButton(x, y, BUTTON_SETTINGS_CX, HUD_HEIGHT / 2, HUD_BUTTON_RADIUS);
}

export function isMuteClicked(x: number, y: number): boolean {
  return isInsideButton(x, y, BUTTON_MUTE_CX, HUD_HEIGHT / 2, HUD_BUTTON_RADIUS);
}

// ---------------------------------------------------------------------------
// Pause overlay
// ---------------------------------------------------------------------------

export function renderPauseOverlay(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT + HUD_HEIGHT);

  const cx = CONTAINER_WIDTH / 2;
  const cy = (CONTAINER_HEIGHT + HUD_HEIGHT) / 2;

  ctx.font = `bold 28px ${FONT_STACK}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('⏸ 已暂停', cx, cy - 20);

  ctx.font = `14px ${FONT_STACK}`;
  ctx.fillStyle = '#ccc';
  ctx.fillText('点击任意位置继续', cx, cy + 20);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Score pop animations (floating +score text)
// ---------------------------------------------------------------------------

interface ScorePop {
  x: number; y: number; text: string;
  life: number; maxLife: number;
}

let scorePops: ScorePop[] = [];

export function spawnScorePop(worldX: number, worldY: number, score: number): void {
  scorePops.push({
    x: worldX, y: worldY,
    text: `+${score}`,
    life: 0, maxLife: 40,
  });
}

export function updateAndDrawScorePops(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  for (let i = scorePops.length - 1; i >= 0; i--) {
    const p = scorePops[i];
    p.life++;
    const alpha = 1 - (p.life / p.maxLife);
    const yOffset = -30 * (p.life / p.maxLife); // float upward
    if (p.life >= p.maxLife) {
      scorePops.splice(i, 1);
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold 16px ${FONT_STACK}`;
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, ox + p.x, oy + p.y + yOffset);
      ctx.restore();
    }
  }
}

export function clearScorePops(): void {
  scorePops = [];
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Darken or lighten a hex color. Amount is -100 to 100. */
function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

export function getContainerOffsetX(_canvas: HTMLCanvasElement): number {
  return 0;
}

export function getContainerOffsetY(): number {
  return HUD_HEIGHT;
}

export function isInsideContainer(canvasX: number, canvasY: number, canvas: HTMLCanvasElement): boolean {
  const ox = getContainerOffsetX(canvas);
  const oy = getContainerOffsetY();
  return canvasX >= ox && canvasX <= ox + CONTAINER_WIDTH &&
         canvasY >= oy && canvasY <= oy + CONTAINER_HEIGHT;
}

/** Convert canvas coordinates to physics world coordinates */
export function canvasToWorld(canvasX: number, canvasY: number, canvas: HTMLCanvasElement): { x: number; y: number } {
  return {
    x: canvasX - getContainerOffsetX(canvas),
    y: canvasY - getContainerOffsetY(),
  };
}
