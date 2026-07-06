import Matter from 'matter-js';
import {
  HERO_CHAIN, CONTAINER_WIDTH, CONTAINER_HEIGHT, DEATH_LINE_Y, HUD_HEIGHT,
  COLOR_BACKGROUND, COLOR_CONTAINER_GRADIENT_TOP, COLOR_CONTAINER_GRADIENT_BOTTOM,
  COLOR_CONTAINER_BORDER, COLOR_HUD_BG, COLOR_ACCENT, COLOR_WHITE,
  FONT_STACK, getFontSize, getHeroImagePath, type HeroDefinition, type Particle,
} from '../constants';
import { getHeroBodies } from '../engine/physics';

// ---------------------------------------------------------------------------
// Image cache
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = ['.png', '.jpg'] as const;

const imageCache = new Map<string, HTMLImageElement>();
const imageLoadAttempted = new Set<string>();

function tryLoadImage(path: string): HTMLImageElement | null {
  if (imageCache.has(path)) return imageCache.get(path)!;
  if (imageLoadAttempted.has(path)) return null; // already tried and failed

  imageLoadAttempted.add(path);
  const img = new Image();
  img.src = path;
  img.onload = () => imageCache.set(path, img);
  img.onerror = () => { /* silently fail, will draw gradient fallback */ };
  return null; // not loaded yet
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

export function renderBackground(ctx: CanvasRenderingContext2D): void {
  // Full page background
  ctx.fillStyle = COLOR_BACKGROUND;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function renderContainer(ctx: CanvasRenderingContext2D): void {
  const x = (ctx.canvas.width - CONTAINER_WIDTH) / 2;
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
    const x = body.position.x + containerOffsetX;
    const y = body.position.y + containerOffsetY;
    const tier = (body as any).heroTier as number;
    const heroDef = HERO_CHAIN.find(h => h.tier === tier);
    if (!heroDef) continue;

    const r = heroDef.radius;
    const imagePath = getHeroImagePath(tier, heroDef.nameEn);

    // Try to load/use hero image
    let img: HTMLImageElement | null = null;
    for (const ext of IMAGE_EXTENSIONS) {
      const fullPath = imagePath + ext;
      const loaded = tryLoadImage(fullPath);
      if (loaded) { img = loaded; break; }
    }

    // Draw circle fill
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);

    if (img) {
      // Use image as fill
      ctx.clip();
      ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
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
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hero name label
    const fontSize = getFontSize(r);
    ctx.save();
    ctx.font = `bold ${fontSize}px ${FONT_STACK}`;
    ctx.fillStyle = img ? '#ffffff' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    ctx.fillText(heroDef.nameZh, x, y);
    ctx.restore();
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
// HUD
// ---------------------------------------------------------------------------

export interface HUDData {
  score: number;
  highScore: number;
  nextTier: number;
  isMuted?: boolean;
}

export function renderHUD(ctx: CanvasRenderingContext2D, data: HUDData): void {
  const w = ctx.canvas.width;

  // Semi-transparent bar
  const barY = 0;
  const barH = HUD_HEIGHT;
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
  ctx.fillText(`🏆 ${data.score}`, 12, barH / 2);
  ctx.restore();

  // Center: High score
  ctx.save();
  ctx.font = `11px ${FONT_STACK}`;
  ctx.fillStyle = '#999999';
  ctx.textAlign = 'center';
  ctx.fillText(`最高: ${data.highScore}`, w / 2, barH / 2);
  ctx.restore();

  // Right: Next hero preview
  const nextHero = HERO_CHAIN.find(h => h.tier === data.nextTier);
  if (nextHero) {
    const previewX = w - 40;
    const previewY = barH / 2;
    const previewR = 16;

    const imagePath = getHeroImagePath(nextHero.tier, nextHero.nameEn);
    let img: HTMLImageElement | null = null;
    for (const ext of IMAGE_EXTENSIONS) {
      const loaded = tryLoadImage(imagePath + ext);
      if (loaded) { img = loaded; break; }
    }

    // Draw fill
    ctx.save();
    ctx.beginPath();
    ctx.arc(previewX, previewY, previewR, 0, Math.PI * 2);

    if (img) {
      ctx.clip();
      ctx.drawImage(img, previewX - previewR, previewY - previewR, previewR * 2, previewR * 2);
    } else {
      ctx.fillStyle = nextHero.color;
      ctx.fill();
    }
    ctx.restore();

    // Border (fresh path — clip() consumed the previous path)
    ctx.beginPath();
    ctx.arc(previewX, previewY, previewR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // "Next" label
    ctx.save();
    ctx.font = `10px ${FONT_STACK}`;
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'right';
    ctx.fillText('下个', previewX - previewR - 8, previewY);
    ctx.restore();
  }
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

export function getContainerOffsetX(canvas: HTMLCanvasElement): number {
  return (canvas.width - CONTAINER_WIDTH) / 2;
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
