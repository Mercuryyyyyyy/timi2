import Matter from 'matter-js';
import {
  CONTAINER_WIDTH, CONTAINER_HEIGHT, DEATH_LINE_Y, GAME_OVER_DURATION_MS, MAX_DELTA_MS,
  HUD_HEIGHT, type GameScene, HERO_CHAIN,
} from './constants';
import { createPhysicsEngine, createHeroBody, clampBodyVelocity, getHeroBodies } from './engine/physics';
import { processMerges } from './engine/merger';
import {
  renderBackground, renderContainer, renderHeroBodies, renderParticles, renderHUD,
  getContainerOffsetX, getContainerOffsetY, isInsideContainer,
} from './rendering/canvas';
import {
  spawnParticles, startPopAnimation, updateAnimations, drawPopAnimations, clearAnimations,
  getParticles,
} from './rendering/animations';
import { getNextHero, consumeNextHero, isMuteButtonClicked } from './rendering/hud';
import { initAudio, resumeAudio, playHeroVoice, preloadAllAudio, setMuted, playBGM, stopBGM } from './audio/audio';
import { readHighScore, writeHighScore, readMuted, writeMuted, insertLeaderboardEntry } from './leaderboard/storage';
import { drawMenu, isStartButtonClicked } from './ui/menu';
import { drawGameOver, isReplayClicked, isHomeClicked } from './ui/gameover';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let scene: GameScene = 'menu';
let engine: Matter.Engine | null = null;
let score = 0;
let highScore = 0;
let muted = false;
let hasYao = false;
let lastTime = 0;
let rafId = 0;
let ctx: CanvasRenderingContext2D | null = null;
const deathTimers = new Map<number, number>();

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

// ---------------------------------------------------------------------------
// Canvas setup & resize
// ---------------------------------------------------------------------------
function resizeCanvas(): void {
  canvas.width = CONTAINER_WIDTH;
  canvas.height = CONTAINER_HEIGHT + HUD_HEIGHT;
  const scaleX = window.innerWidth / CONTAINER_WIDTH;
  const scaleY = window.innerHeight / (CONTAINER_HEIGHT + HUD_HEIGHT);
  const scale = Math.min(scaleX, scaleY);
  canvas.style.width = `${CONTAINER_WIDTH * scale}px`;
  canvas.style.height = `${(CONTAINER_HEIGHT + HUD_HEIGHT) * scale}px`;
  canvas.style.position = 'absolute';
  canvas.style.left = `${(window.innerWidth - CONTAINER_WIDTH * scale) / 2}px`;
  canvas.style.top = `${(window.innerHeight - (CONTAINER_HEIGHT + HUD_HEIGHT) * scale) / 2}px`;
}

// ---------------------------------------------------------------------------
// Scene: Menu
// ---------------------------------------------------------------------------
function showMenu(): void {
  scene = 'menu';
  if (ctx) {
    ctx.fillStyle = '#fce4ec';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawMenu(ctx);
  }
}

// ---------------------------------------------------------------------------
// Scene: Playing
// ---------------------------------------------------------------------------
async function startGame(): Promise<void> {
  score = 0;
  hasYao = false;
  deathTimers.clear();
  clearAnimations();
  try { highScore = readHighScore(); } catch { highScore = 0; }
  try { muted = readMuted(); } catch { muted = false; }

  engine = createPhysicsEngine();

  await initAudio();
  resumeAudio();
  setMuted(muted);
  playBGM();

  // Preload initial voice data
  preloadAllAudio();

  scene = 'playing';
  lastTime = performance.now();
  rafId = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp: number): void {
  if (scene !== 'playing') return;
  const delta = Math.min(timestamp - lastTime, MAX_DELTA_MS);
  lastTime = timestamp;

  if (!engine || !ctx) {
    rafId = requestAnimationFrame(gameLoop);
    return;
  }

  // Step physics
  Matter.Engine.update(engine, delta);
  for (const body of Matter.Composite.allBodies(engine.world)) {
    clampBodyVelocity(body);
  }

  // Process merges
  const mergeResults = processMerges(engine.world, performance.now());
  for (const result of mergeResults) {
    score += result.scoreDelta;
    if (result.created) {
      const heroDef = HERO_CHAIN.find(h => h.tier === (result.created as any).heroTier);
      if (heroDef) {
        spawnParticles(result.created.position.x, result.created.position.y, heroDef.color);
        startPopAnimation(result.created.position.x, result.created.position.y, heroDef.radius, heroDef);
        playHeroVoice(heroDef.tier);
      }
      if ((result.created as any).heroTier === 11) hasYao = true;
    } else {
      // Both tier-11 bodies removed: award YAO_YAO_SCORE (incremented above)
      // Also mark hasYao since the merge itself produced score for "yao+yao"
      hasYao = true;
    }
  }

  // Clean up death timers for removed (merged) bodies
  const currentBodies = new Set(getHeroBodies(engine.world).map(b => b.id));
  for (const [id] of deathTimers) {
    if (!currentBodies.has(id)) deathTimers.delete(id);
  }

  // Game-over check
  if (checkGameOver(delta)) {
    endGame();
    return;
  }

  // Update animations
  updateAnimations(delta);

  // Render
  renderFrame();

  rafId = requestAnimationFrame(gameLoop);
}

function renderFrame(): void {
  if (!ctx || !engine) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderBackground(ctx);
  renderContainer(ctx);

  const ox = getContainerOffsetX(canvas);
  const oy = getContainerOffsetY();

  // Render hero bodies relative to container
  renderHeroBodies(ctx, engine.world, ox, oy);

  // Render particles relative to container
  renderParticles(ctx, getParticles(), ox, oy);

  // Render pop animation rings relative to container
  ctx.save();
  ctx.translate(ox, oy);
  drawPopAnimations(ctx);
  ctx.restore();

  // HUD
  renderHUD(ctx, {
    score,
    highScore,
    nextTier: getNextHero()?.tier ?? 1,
    isMuted: muted,
  });
}

function checkGameOver(deltaMs: number): boolean {
  if (!engine) return false;
  const heroBodies = getHeroBodies(engine.world);
  for (const body of heroBodies) {
    const radius: number = (body as any).heroRadius ?? 0;
    const topEdge = body.position.y - radius;
    if (topEdge < DEATH_LINE_Y) {
      const current = deathTimers.get(body.id) ?? 0;
      const updated = current + deltaMs;
      deathTimers.set(body.id, updated);
      if (updated >= GAME_OVER_DURATION_MS) return true;
    } else {
      deathTimers.set(body.id, 0);
    }
  }
  return false;
}

function endGame(): void {
  scene = 'gameover';
  cancelAnimationFrame(rafId);
  stopBGM();

  if (engine) {
    for (const body of Matter.Composite.allBodies(engine.world)) {
      Matter.Body.setStatic(body, true);
    }
  }

  if (score > highScore) {
    highScore = score;
    try { writeHighScore(highScore); } catch {}
  }

  const leaderboard = insertLeaderboardEntry(score, hasYao);
  const isNewRecord = score >= highScore && score > 0;

  if (ctx && engine) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderBackground(ctx);
    renderContainer(ctx);
    const ox = getContainerOffsetX(canvas);
    const oy = getContainerOffsetY();
    renderHeroBodies(ctx, engine.world, ox, oy);
    drawGameOver(ctx, score, isNewRecord, leaderboard);
  }
}

// ---------------------------------------------------------------------------
// Input handling
// ---------------------------------------------------------------------------
function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function onPointerDown(e: MouseEvent | TouchEvent): void {
  e.preventDefault();
  const pos = e instanceof MouseEvent ? getCanvasCoords(e) : getCanvasCoords((e as TouchEvent).touches[0]);

  if (scene === 'menu') {
    if (isStartButtonClicked(pos.x, pos.y)) startGame();
    return;
  }
  if (scene === 'gameover') {
    if (isReplayClicked(pos.x, pos.y)) { startGame(); return; }
    if (isHomeClicked(pos.x, pos.y)) { showMenu(); stopBGM(); return; }
    return;
  }
  if (scene !== 'playing' || !engine) return;

  // Mute toggle (check first — it's in the HUD, outside the container)
  if (isMuteButtonClicked(pos.x, pos.y)) {
    muted = !muted;
    setMuted(muted);
    try { writeMuted(muted); } catch {}
    return;
  }

  // Only spawn if tapping inside the game container area
  const inContainer = isInsideContainer(pos.x, pos.y, canvas);
  if (!inContainer) return;

  // Spawn hero on tap
  const worldX = pos.x - getContainerOffsetX(canvas);
  const worldY = -20; // spawn above container
  const hero = consumeNextHero();
  if (!hero) return;

  const spawnX = Math.max(hero.radius + 5, Math.min(CONTAINER_WIDTH - hero.radius - 5, worldX));
  createHeroBody(engine.world, { tier: hero.tier, nameZh: hero.nameZh, radius: hero.radius, x: spawnX, y: worldY });
  playHeroVoice(hero.tier);
}

function onPointerMove(_e: MouseEvent | TouchEvent): void {
  // Reserved for drag-to-position
}

function onPointerUp(_e: MouseEvent | TouchEvent): void {
  // Reserved for drag release
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('touchstart', onPointerDown, { passive: false });
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('touchmove', onPointerMove, { passive: false });
canvas.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('touchend', onPointerUp);

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Cannot get 2D context');
showMenu();
