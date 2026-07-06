import Matter from 'matter-js';
import {
  CONTAINER_WIDTH, CONTAINER_HEIGHT, DEATH_LINE_Y, GAME_OVER_DURATION_MS, MAX_DELTA_MS,
  HUD_HEIGHT, type GameScene, HERO_CHAIN, type HeroDefinition, getHeroByTier,
} from './constants';
import { createPhysicsEngine, createHeroBody, clampBodyVelocity, getHeroBodies } from './engine/physics';
import { processMerges } from './engine/merger';
import {
  renderBackground, renderContainer, renderHeroBodies, renderParticles, renderHUD,
  getContainerOffsetX, getContainerOffsetY, isInsideContainer, animateMerge,
  setDropPreview, renderDropPreview,
  triggerButterflyBloom, updateAndDrawButterflies, clearButterflies,
  renderPauseOverlay,
  isPauseClicked, isRestartClicked, isSettingsClicked, isMuteClicked,
  spawnScorePop, updateAndDrawScorePops, clearScorePops,
} from './rendering/canvas';
import {
  spawnParticles, startPopAnimation, updateAnimations, drawPopAnimations, clearAnimations,
  getParticles,
} from './rendering/animations';
import { consumeNextHero } from './rendering/hud';
import { initAudio, resumeAudio, playHeroVoice, preloadAllAudio, setMuted, playBGM, stopBGM, playZhenjiBGM, playYaoSpecial } from './audio/audio';
import { readHighScore, writeHighScore, readMuted, writeMuted, insertLeaderboardEntry } from './leaderboard/storage';
import { drawMenu, isStartButtonClicked } from './ui/menu';
import { drawSettings, isSoundToggleClicked } from './ui/settings';
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
let isPaused = false;
let showSettings = false;
let pausedBySettings = false;
let highestTier = 1;
let mergeCount = 0;
let lastTime = 0;
let rafId = 0;
let ctx: CanvasRenderingContext2D | null = null;
const deathTimers = new Map<number, number>();

// Drag-to-position preview state
let readyHero: HeroDefinition | null = null;
let dragX: number | null = null;
let isDragging = false;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

// ---------------------------------------------------------------------------
// Canvas setup & resize
// ---------------------------------------------------------------------------
function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = CONTAINER_WIDTH;
  const logicalHeight = CONTAINER_HEIGHT + HUD_HEIGHT;

  canvas.width = logicalWidth * dpr;
  canvas.height = logicalHeight * dpr;

  const scaleX = window.innerWidth / logicalWidth;
  const scaleY = window.innerHeight / logicalHeight;
  const scale = Math.min(scaleX, scaleY);

  canvas.style.width = `${logicalWidth * scale}px`;
  canvas.style.height = `${logicalHeight * scale}px`;
  canvas.style.position = 'absolute';
  canvas.style.left = `${(window.innerWidth - logicalWidth * scale) / 2}px`;
  canvas.style.top = `${(window.innerHeight - logicalHeight * scale) / 2}px`;

  // Scale context to map logical coordinates to physical DPR pixels
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

// ---------------------------------------------------------------------------
// Scene: Menu
// ---------------------------------------------------------------------------
function showMenu(): void {
  scene = 'menu';
  if (ctx) {
    ctx.fillStyle = '#fce4ec';
    ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT + HUD_HEIGHT);
    drawMenu(ctx);
  }
}

// ---------------------------------------------------------------------------
// Scene: Playing
// ---------------------------------------------------------------------------
async function startGame(): Promise<void> {
  // Cancel any running game loop and prevent the old loop from continuing
  cancelAnimationFrame(rafId);
  scene = 'loading';
  score = 0;
  hasYao = false;
  isPaused = false;
  showSettings = false;
  pausedBySettings = false;
  highestTier = 1;
  mergeCount = 0;
  isDragging = false;
  dragX = null;
  setDropPreview(null);
  deathTimers.clear();
  clearAnimations();
  clearButterflies();
  clearScorePops();
  try { highScore = readHighScore(); } catch { highScore = 0; }
  try { muted = readMuted(); } catch { muted = false; }

  engine = createPhysicsEngine();

  await initAudio();
  resumeAudio();
  setMuted(muted);
  playBGM();

  // Preload initial voice data
  preloadAllAudio();

  // Initialize first hero preview
  readyHero = consumeNextHero();

  scene = 'playing';
  lastTime = performance.now();
  rafId = requestAnimationFrame(gameLoop);
}

function togglePause(): void {
  if (scene !== 'playing' || !engine) return;
  isPaused = !isPaused;
  if (isPaused) {
    cancelAnimationFrame(rafId);
  } else {
    lastTime = performance.now();
    rafId = requestAnimationFrame(gameLoop);
  }
}

function gameLoop(timestamp: number): void {
  if (scene !== 'playing' || isPaused) return;
  const delta = Math.min(timestamp - lastTime, MAX_DELTA_MS);
  lastTime = timestamp;

  if (!engine || !ctx) {
    rafId = requestAnimationFrame(gameLoop);
    return;
  }

  // Step physics (delta is capped at MAX_DELTA_MS to prevent spiral-of-death)
  Matter.Engine.update(engine, delta);
  for (const body of Matter.Composite.allBodies(engine.world)) {
    clampBodyVelocity(body);
    // Kill micro-creep: if body is nearly at rest, stop it
    if (Math.abs(body.velocity.x) < 0.1) Matter.Body.setVelocity(body, { x: 0, y: body.velocity.y });
    if (Math.abs(body.velocity.y) < 0.1) Matter.Body.setVelocity(body, { x: body.velocity.x, y: 0 });
  }

  // Process merges
  const mergeResults = processMerges(engine.world, performance.now());
  for (const result of mergeResults) {
    score += result.scoreDelta;
    if (result.created) {
      const heroDef = HERO_CHAIN.find(h => h.tier === (result.created as any).heroTier);
      if (heroDef) {
        animateMerge(result.created.id);
        spawnParticles(result.created.position.x, result.created.position.y, heroDef.color);
        startPopAnimation(result.created.position.x, result.created.position.y, heroDef.radius, heroDef);

        // Track highest tier and merge count
        if (heroDef.tier > highestTier) highestTier = heroDef.tier;
        mergeCount++;
        // Spawn floating score pop at merge position
        spawnScorePop(result.created.position.x, result.created.position.y, result.scoreDelta);

        if (heroDef.tier === 11) {
          playYaoSpecial(); // Custom 那艺娜 audio instead of 瑶 voice
          triggerButterflyBloom(result.created.position.x, result.created.position.y);
          hasYao = true;
        } else if (heroDef.tier === 5 && Math.random() < 0.4) {
          playZhenjiBGM();
        } else {
          playHeroVoice(heroDef.tier);
        }
      }
    } else if (result.spawnedBodies) {
      // 瑶+瑶 merge: refresh cleanup — spawn 3 small heroes
      hasYao = true;
      const cx = CONTAINER_WIDTH / 2;
      const cy = CONTAINER_HEIGHT / 2;
      playYaoSpecial();
      triggerButterflyBloom(cx, cy);
      // Play voice for each spawned hero
      for (const body of result.spawnedBodies) {
        playHeroVoice((body as any).heroTier);
      }
    } else {
      // Both tier-11 bodies removed: award YAO_YAO_SCORE (incremented above)
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

  // Smooth rendering: interpolate display positions toward physics positions
  for (const body of getHeroBodies(engine.world)) {
    if ((body as any)._displayX === undefined) {
      (body as any)._displayX = body.position.x;
      (body as any)._displayY = body.position.y;
    }
    (body as any)._displayX += (body.position.x - (body as any)._displayX) * 0.35;
    (body as any)._displayY += (body.position.y - (body as any)._displayY) * 0.35;
  }

  // Render
  renderFrame(delta);

  rafId = requestAnimationFrame(gameLoop);
}

function renderFrame(delta: number): void {
  if (!ctx || !engine) return;

  ctx.clearRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT + HUD_HEIGHT);
  renderBackground(ctx);
  renderContainer(ctx);

  const ox = getContainerOffsetX(canvas);
  const oy = getContainerOffsetY();

  // Update preview position when not actively dragging
  if (!isDragging && readyHero) {
    setDropPreview(CONTAINER_WIDTH / 2, readyHero.tier);
  }

  // Drop preview line
  renderDropPreview(ctx, ox, oy, isDragging);

  // Render hero bodies relative to container
  renderHeroBodies(ctx, engine.world, ox, oy);

  // Butterfly bloom effect (yao merge)
  updateAndDrawButterflies(ctx, ox, oy, delta);

  // Render particles relative to container
  renderParticles(ctx, getParticles(), ox, oy);

  // Render pop animation rings relative to container
  ctx.save();
  ctx.translate(ox, oy);
  drawPopAnimations(ctx);
  ctx.restore();

  // Score pop floating text
  updateAndDrawScorePops(ctx, ox, oy);

  // Compute highest tier name for HUD
  const highestTierHero = getHeroByTier(highestTier);
  const highestTierName = highestTierHero ? highestTierHero.nameZh : '';

  // HUD
  renderHUD(ctx, {
    score,
    highScore,
    isMuted: muted,
    isPaused,
    highestTierName,
    mergeCount,
  });

  // Pause overlay (drawn first so settings can appear on top)
  if (isPaused) {
    renderPauseOverlay(ctx);
  }

  // Settings overlay (drawn last so it's on top when both are active)
  if (showSettings) {
    drawSettings(ctx, muted);
  }
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
  ctx.clearRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT + HUD_HEIGHT);
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
  const logicalWidth = CONTAINER_WIDTH;
  const logicalHeight = CONTAINER_HEIGHT + HUD_HEIGHT;
  return {
    x: (e.clientX - rect.left) * (logicalWidth / rect.width),
    y: (e.clientY - rect.top) * (logicalHeight / rect.height),
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

  // Handle settings panel (if open)
  if (showSettings) {
    if (isSettingsClicked(pos.x, pos.y)) {
      showSettings = false;
      // Resume only if game was auto-paused by settings (not user-initiated)
      if (pausedBySettings) {
        pausedBySettings = false;
        isPaused = false;
        lastTime = performance.now();
        rafId = requestAnimationFrame(gameLoop);
      }
      return;
    }
    if (isSoundToggleClicked(pos.x, pos.y)) {
      muted = !muted;
      setMuted(muted);
      try { writeMuted(muted); } catch {}
      return;
    }
    // Clicks outside sound toggle in settings panel do nothing
    return;
  }

  // Handle pause overlay — tap anywhere outside buttons to resume
  if (isPaused) {
    // Check if hit any HUD button
    if (isPauseClicked(pos.x, pos.y)) {
      togglePause();
      return;
    }
    if (isRestartClicked(pos.x, pos.y)) {
      startGame();
      return;
    }
    if (isSettingsClicked(pos.x, pos.y)) {
      showSettings = true;
      return;
    }
    if (isMuteClicked(pos.x, pos.y)) {
      muted = !muted;
      setMuted(muted);
      try { writeMuted(muted); } catch {}
      return;
    }
    // Anywhere else during pause → resume
    togglePause();
    return;
  }

  // HUD button clicks (when not paused)
  if (isPauseClicked(pos.x, pos.y)) {
    togglePause();
    return;
  }
  if (isRestartClicked(pos.x, pos.y)) {
    startGame();
    return;
  }
  if (isSettingsClicked(pos.x, pos.y)) {
    showSettings = true;
    // Auto-pause the game when settings panel is open
    if (!isPaused) {
      isPaused = true;
      pausedBySettings = true;
      cancelAnimationFrame(rafId);
    }
    return;
  }
  if (isMuteClicked(pos.x, pos.y)) {
    muted = !muted;
    setMuted(muted);
    try { writeMuted(muted); } catch {}
    return;
  }

  // Only allow drag/interaction inside the game container
  const inContainer = isInsideContainer(pos.x, pos.y, canvas);
  if (!inContainer) return;

  // Start dragging — show preview
  isDragging = true;
  const worldX = pos.x - getContainerOffsetX(canvas);
  const clampMargin = readyHero ? readyHero.radius + 5 : 10;
  dragX = Math.max(clampMargin, Math.min(CONTAINER_WIDTH - clampMargin, worldX));
  setDropPreview(dragX, readyHero?.tier);
}

function onPointerMove(e: MouseEvent | TouchEvent): void {
  if (!isDragging || scene !== 'playing' || isPaused || showSettings) return;
  const pos = e instanceof MouseEvent ? getCanvasCoords(e) : getCanvasCoords((e as TouchEvent).touches[0]);
  const worldX = pos.x - getContainerOffsetX(canvas);
  dragX = Math.max(readyHero ? readyHero.radius + 5 : 10, Math.min(CONTAINER_WIDTH - (readyHero ? readyHero.radius + 5 : 10), worldX));
  setDropPreview(dragX, readyHero?.tier);
}

function onPointerUp(_e: MouseEvent | TouchEvent): void {
  if (!isDragging || scene !== 'playing' || !engine || !readyHero || isPaused || showSettings) {
    isDragging = false;
    return;
  }
  isDragging = false;
  const hero = readyHero;
  const spawnX = dragX ?? CONTAINER_WIDTH / 2;
  readyHero = consumeNextHero(); // prepare next hero

  const worldY = -20;
  const body = createHeroBody(engine.world, { tier: hero.tier, nameZh: hero.nameZh, radius: hero.radius, x: spawnX, y: worldY });
  // Give initial downward velocity for weighty feel — bigger heroes drop harder
  Matter.Body.setVelocity(body, { x: 0, y: 3 + hero.tier * 0.5 });
  playHeroVoice(hero.tier);

  setDropPreview(null);
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

// Reset drag state if mouse is released outside the canvas
window.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    setDropPreview(null);
  }
});

window.addEventListener('resize', resizeCanvas);

ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Cannot get 2D context');
resizeCanvas();
showMenu();
