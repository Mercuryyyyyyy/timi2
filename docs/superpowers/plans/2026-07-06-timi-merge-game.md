# 合成大timi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-subagent-driven-development (recommended) or superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based physics merge game where players drop Honor of Kings hero avatars into a container; identical heroes merge into the next-tier hero, with voice line playback, particle animations, and localStorage leaderboard.

**Architecture:** Vite + TypeScript project using Matter.js for physics, Canvas 2D for rendering, Web Audio API for voice playback, and localStorage for persistence. Scene-based architecture (menu, playing, gameover) orchestrated from `main.ts`, with modules for physics, spawning, merging, rendering, animations, audio, leaderboard, and UI screens.

**Tech Stack:** Vite 5+, TypeScript 5+, Matter.js 0.20+, Canvas 2D, Web Audio API, Vitest + happy-dom for testing, tsx for running the audio download script.

**Total Tasks:** 23

---
## Task 1: Project scaffolding — package.json, tsconfig, vite config, index.html, directories

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Modify: `.gitignore` (append entries)
- Create: `src/`, `public/heroes/`, `public/audio/`, `scripts/` directories

- [x] **Step 1: Create package.json**

Write to `package.json`:

```json
{
  "name": "timi-merge-game",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "download-audio": "tsx scripts/download-audio.ts"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "happy-dom": "^14.12.0",
    "tsx": "^4.16.0"
  },
  "dependencies": {
    "matter-js": "^0.20.0"
  }
}
```

- [x] **Step 2: Create tsconfig.json**

Write to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "sourceMap": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src", "scripts"]
}
```

- [x] **Step 3: Create vite.config.ts**

Write to `vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
```

- [x] **Step 4: Create index.html**

Write to `index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>合成大timi</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #fce4ec; }
    #game-canvas { display: block; margin: 0 auto; touch-action: none; }
  </style>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [x] **Step 5: Append to .gitignore**

Edit `.gitignore` so its full content is:

```
.superpowers/

node_modules/
dist/
.DS_Store
*.local
```

- [x] **Step 6: Create empty directories**

Run:
```
mkdir -p src/engine src/rendering src/audio src/leaderboard src/ui public/heroes public/audio scripts
```

- [x] **Step 7: Create .gitkeep files for public subdirectories**

Run:
```
touch public/heroes/.gitkeep
touch public/audio/.gitkeep
```

- [x] **Step 8: Install dependencies**

Run:
```
npm install
```

Expected: "added N packages" message, no errors. `node_modules/` directory is created.

- [x] **Step 9: Verify dev server starts**

Run:
```
npm run dev
```

Expected: Vite dev server starts, shows Local URL (http://localhost:5173). Stop with Ctrl+C after confirming.

- [x] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore public/heroes/.gitkeep public/audio/.gitkeep
git commit -m "feat: project scaffolding with Vite, TypeScript, Matter.js"
```

## Task 2: Constants and hero data

**Files:**
- Create: `src/constants.ts`
- Create: `src/constants.test.ts`

- [x] **Step 1: Create constants.ts with hero chain, physics config, theme colors, spawn probabilities**

Write to `src/constants.ts`:

```ts
/** A single hero in the merge chain. */
export interface HeroDefinition {
  tier: number;
  nameZh: string;
  nameEn: string;
  heroId: number;
  color: string;
  radius: number;
  score: number;
}

/** Leaderboard entry stored in localStorage. */
export interface LeaderboardEntry {
  score: number;
  date: string;
  hasYao: boolean;
}

/** Spawn probability entry. */
export interface SpawnEntry {
  tier: number;
  probability: number;
}

/** Game scene states. */
export type GameScene = 'menu' | 'playing' | 'gameover';

/** A single particle in the animation system. */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

// ---------------------------------------------------------------------------
// Hero merge chain (tiers 1–10)
// ---------------------------------------------------------------------------

export const HERO_CHAIN: HeroDefinition[] = [
  { tier: 1,  nameZh: '\u9a6c\u53ef\u6ce2\u7f57', nameEn: 'marco_polo',      heroId: 132, color: '#4A90D9', radius: 20, score: 0 },
  { tier: 2,  nameZh: '\u5e72\u5c06\u83ab\u90aa', nameEn: 'gan_jiang_mo_ye', heroId: 182, color: '#7B68EE', radius: 23, score: 10 },
  { tier: 3,  nameZh: '\u94e0',       nameEn: 'kai',             heroId: 193, color: '#4169E1', radius: 26, score: 20 },
  { tier: 4,  nameZh: '\u7504\u59ec',     nameEn: 'zhen_ji',         heroId: 127, color: '#00CED1', radius: 28, score: 40 },
  { tier: 5,  nameZh: '\u4e91\u7f28',     nameEn: 'yun_ying',        heroId: 538, color: '#FF6347', radius: 31, score: 80 },
  { tier: 6,  nameZh: '\u6d77\u8bfa',     nameEn: 'hai_nuo',         heroId: 563, color: '#9932CC', radius: 34, score: 160 },
  { tier: 7,  nameZh: '\u865e\u59ec',     nameEn: 'yu_ji',           heroId: 174, color: '#32CD32', radius: 37, score: 320 },
  { tier: 8,  nameZh: '\u5c0f\u4e54',     nameEn: 'xiao_qiao',       heroId: 106, color: '#FF69B4', radius: 39, score: 640 },
  { tier: 9,  nameZh: '\u8521\u6587\u59ec',   nameEn: 'cai_wen_ji',      heroId: 184, color: '#FFD700', radius: 42, score: 1280 },
  { tier: 10, nameZh: '\u7476',       nameEn: 'yao',             heroId: 505, color: '#FF1493', radius: 45, score: 2560 },
];

/** Special score for tier-10 + tier-10 merge. */
export const YAO_YAO_SCORE = 5000;

/** Look up a hero definition by tier (1-indexed). */
export function getHeroByTier(tier: number): HeroDefinition | undefined {
  return HERO_CHAIN.find(h => h.tier === tier);
}

// ---------------------------------------------------------------------------
// Spawn probabilities (tiers 1–4 only)
// ---------------------------------------------------------------------------

export const SPAWN_TABLE: SpawnEntry[] = [
  { tier: 1, probability: 0.40 },
  { tier: 2, probability: 0.30 },
  { tier: 3, probability: 0.20 },
  { tier: 4, probability: 0.10 },
];

// ---------------------------------------------------------------------------
// Physics constants
// ---------------------------------------------------------------------------

export const GRAVITY = 1.5;
export const CONTAINER_WIDTH = 360;
export const CONTAINER_HEIGHT = 640;
export const RESTITUTION = 0.3;
export const FRICTION = 0.1;
export const FRICTION_AIR = 0.01;
export const DEATH_LINE_Y = 35;
export const GAME_OVER_DURATION_MS = 1000;
export const MAX_VELOCITY = 15;
export const MERGE_COOLDOWN_MS = 500;
export const VELOCITY_DAMPING = 0.3;
export const MAX_PARTICLES = 50;
export const MAX_DELTA_MS = 33;
export const HUD_HEIGHT = 60;
export const SPAWN_Y = -20;
export const SPAWN_RETRY_MS = 100;
export const SPAWN_MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Theme colors
// ---------------------------------------------------------------------------

export const COLOR_BACKGROUND = '#fce4ec';
export const COLOR_CONTAINER_GRADIENT_TOP = '#fff5f7';
export const COLOR_CONTAINER_GRADIENT_BOTTOM = '#f8bbd0';
export const COLOR_CONTAINER_BORDER = '#e91e63';
export const COLOR_HUD_BG = 'rgba(255, 255, 255, 0.85)';
export const COLOR_OVERLAY = 'rgba(0, 0, 0, 0.6)';
export const COLOR_ACCENT = '#e91e63';
export const COLOR_WHITE = '#ffffff';

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

export const FONT_STACK = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "WenQuanYi Micro Hei", sans-serif';

export function getFontSize(radius: number): number {
  if (radius <= 23) return 10;
  if (radius <= 37) return 12;
  return 14;
}

// ---------------------------------------------------------------------------
// Hero image paths
// ---------------------------------------------------------------------------

/** Build the relative image path for a hero. Extension (.png/.jpg) is tried at render time. */
export function getHeroImagePath(tier: number, nameEn: string): string {
  const padded = tier.toString().padStart(2, '0');
  return `heroes/${padded}-${nameEn.toLowerCase().replace(/_/g, '')}`;
}

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

export const LS_LEADERBOARD = 'timi2_leaderboard';
export const LS_MUTED = 'timi2_muted';
export const LS_HIGH_SCORE = 'timi2_high_score';
```

- [x] **Step 2: Write unit tests for constants.ts**

Write to `src/constants.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  HERO_CHAIN,
  SPAWN_TABLE,
  getHeroByTier,
  getHeroImagePath,
  getFontSize,
  YAO_YAO_SCORE,
} from './constants';

describe('constants', () => {
  it('HERO_CHAIN has exactly 10 entries', () => {
    expect(HERO_CHAIN).toHaveLength(10);
  });

  it('HERO_CHAIN tiers are 1 through 10 in order', () => {
    HERO_CHAIN.forEach((h, i) => {
      expect(h.tier).toBe(i + 1);
    });
  });

  it('radii increase monotonically', () => {
    for (let i = 1; i < HERO_CHAIN.length; i++) {
      expect(HERO_CHAIN[i].radius).toBeGreaterThan(HERO_CHAIN[i - 1].radius);
    }
  });

  it('radii match formula: 20 + (tier-1)*25/9 rounded to nearest int', () => {
    HERO_CHAIN.forEach(h => {
      const expected = Math.round(20 + (h.tier - 1) * (25 / 9));
      expect(h.radius).toBe(expected);
    });
  });

  it('scores match formula: tier1=0, tiers 2-10 = 10 * 2^(tier-2)', () => {
    expect(HERO_CHAIN[0].score).toBe(0);
    for (let i = 1; i < HERO_CHAIN.length; i++) {
      const expected = 10 * Math.pow(2, HERO_CHAIN[i].tier - 2);
      expect(HERO_CHAIN[i].score).toBe(expected);
    }
  });

  it('spawn probabilities sum to 1.0', () => {
    const sum = SPAWN_TABLE.reduce((acc, s) => acc + s.probability, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('getHeroByTier returns correct hero', () => {
    const yao = getHeroByTier(10);
    expect(yao?.nameZh).toBe('\u7476');
  });

  it('getHeroByTier returns undefined for invalid tier', () => {
    expect(getHeroByTier(0)).toBeUndefined();
    expect(getHeroByTier(11)).toBeUndefined();
  });

  it('getHeroImagePath produces expected filename pattern', () => {
    const path = getHeroImagePath(3, 'kai');
    expect(path).toBe('heroes/03-kai');
  });

  it('getFontSize returns correct sizes for radius ranges', () => {
    expect(getFontSize(20)).toBe(10);
    expect(getFontSize(23)).toBe(10);
    expect(getFontSize(26)).toBe(12);
    expect(getFontSize(37)).toBe(12);
    expect(getFontSize(39)).toBe(14);
    expect(getFontSize(45)).toBe(14);
  });

  it('YAO_YAO_SCORE is 5000', () => {
    expect(YAO_YAO_SCORE).toBe(5000);
  });
});
```

- [x] **Step 3: Run tests to verify**

Run:
```
npx vitest run
```

Expected: 10 tests pass, 0 failures.

- [x] **Step 4: Commit**

```bash
git add src/constants.ts src/constants.test.ts
git commit -m "feat: hero chain, physics constants, theme colors, and unit tests"
```

---

## Task 3: Physics engine — Matter.js world, walls, body factory

**Files:**
- Create: `src/engine/physics.ts`
- Create: `src/engine/physics.test.ts`

- [x] **Step 1: Create physics.ts**

Write to `src/engine/physics.ts`:

```ts
import Matter from 'matter-js';
import { GRAVITY, CONTAINER_WIDTH, CONTAINER_HEIGHT, RESTITUTION, FRICTION, FRICTION_AIR, MAX_VELOCITY, getHeroByTier } from '../constants';

const { Engine, World, Bodies, Body } = Matter;

export const HERO_CATEGORY = 0x0001;
export const WALL_CATEGORY = 0x0002;

export function createPhysicsEngine(): Matter.Engine {
  const engine = Engine.create({
    gravity: { x: 0, y: GRAVITY, scale: 0.001 },
    enableSleeping: true,
  });

  const wallOpts: Matter.IBodyDefinition = {
    isStatic: true, restitution: RESTITUTION, friction: FRICTION,
    collisionFilter: { category: WALL_CATEGORY, mask: HERO_CATEGORY },
  };

  const leftWall = Bodies.rectangle(0, CONTAINER_HEIGHT / 2, 10, CONTAINER_HEIGHT * 2, wallOpts);
  const rightWall = Bodies.rectangle(CONTAINER_WIDTH, CONTAINER_HEIGHT / 2, 10, CONTAINER_HEIGHT * 2, wallOpts);
  const floor = Bodies.rectangle(CONTAINER_WIDTH / 2, CONTAINER_HEIGHT + 5, CONTAINER_WIDTH + 20, 10, wallOpts);

  World.add(engine.world, [leftWall, rightWall, floor]);
  return engine;
}

export interface HeroBodyOptions {
  tier: number; nameZh: string; radius: number; x: number; y: number;
}

export function createHeroBody(world: Matter.World, opts: HeroBodyOptions): Matter.Body {
  const body = Bodies.circle(opts.x, opts.y, opts.radius, {
    restitution: RESTITUTION, friction: FRICTION, frictionAir: FRICTION_AIR,
    collisionFilter: { category: HERO_CATEGORY, mask: WALL_CATEGORY | HERO_CATEGORY },
    label: `hero-${opts.tier}`,
  });

  (body as any).heroTier = opts.tier;
  (body as any).heroNameZh = opts.nameZh;
  (body as any).heroRadius = opts.radius;
  (body as any).mergeCooldownUntil = 0;
  (body as any).deathTimer = 0;
  const heroDef = getHeroByTier(opts.tier);
  if (heroDef) (body as any)._heroDef = heroDef;

  World.add(world, body);
  return body;
}

export function clampBodyVelocity(body: Matter.Body): void {
  if (body.velocity.x > MAX_VELOCITY) Body.setVelocity(body, { x: MAX_VELOCITY, y: body.velocity.y });
  if (body.velocity.x < -MAX_VELOCITY) Body.setVelocity(body, { x: -MAX_VELOCITY, y: body.velocity.y });
  if (body.velocity.y > MAX_VELOCITY) Body.setVelocity(body, { x: body.velocity.x, y: MAX_VELOCITY });
  if (body.velocity.y < -MAX_VELOCITY) Body.setVelocity(body, { x: body.velocity.x, y: -MAX_VELOCITY });
}

export function getHeroBodies(world: Matter.World): Matter.Body[] {
  return world.bodies.filter(b => (b as any).heroTier != null);
}

export function removeBody(world: Matter.World, body: Matter.Body): void {
  World.remove(world, body);
}
```

- [x] **Step 2: Create physics.test.ts**

Write to `src/engine/physics.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import Matter from 'matter-js';
import { createPhysicsEngine, createHeroBody, clampBodyVelocity, getHeroBodies, removeBody, HERO_CATEGORY } from './physics';
import { MAX_VELOCITY } from '../constants';

describe('physics', () => {
  let engine: Matter.Engine;
  beforeEach(() => { engine = createPhysicsEngine(); });

  it('creates engine with gravity', () => {
    expect(engine.gravity.y).toBeGreaterThan(0);
  });

  it('has 3 wall bodies', () => {
    const heroCount = engine.world.bodies.filter(b => (b as any).heroTier != null).length;
    expect(engine.world.bodies.length - heroCount).toBe(3);
  });

  it('creates a hero body with correct properties', () => {
    const body = createHeroBody(engine.world, { tier: 1, nameZh: '\u9a6c\u53ef\u6ce2\u7f57', radius: 20, x: 180, y: 100 });
    expect((body as any).heroTier).toBe(1);
    expect((body as any).heroNameZh).toBe('\u9a6c\u53ef\u6ce2\u7f57');
    expect((body as any).heroRadius).toBe(20);
    expect((body as any).mergeCooldownUntil).toBe(0);
    expect(body.collisionFilter.category).toBe(HERO_CATEGORY);
  });

  it('clampBodyVelocity caps velocity at MAX_VELOCITY', () => {
    const body = createHeroBody(engine.world, { tier: 1, nameZh: 'Test', radius: 20, x: 180, y: 100 });
    Matter.Body.setVelocity(body, { x: 100, y: 100 });
    clampBodyVelocity(body);
    expect(body.velocity.x).toBeLessThanOrEqual(MAX_VELOCITY);
    expect(body.velocity.y).toBeLessThanOrEqual(MAX_VELOCITY);
  });

  it('getHeroBodies returns only hero bodies', () => {
    createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 100, y: 100 });
    createHeroBody(engine.world, { tier: 2, nameZh: 'B', radius: 23, x: 200, y: 100 });
    expect(getHeroBodies(engine.world)).toHaveLength(2);
  });

  it('removeBody removes a body from the world', () => {
    const body = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 100, y: 100 });
    expect(getHeroBodies(engine.world)).toHaveLength(1);
    removeBody(engine.world, body);
    expect(getHeroBodies(engine.world)).toHaveLength(0);
  });
});
```

- [x] **Step 3: Run tests to verify**

Run:
```
npx vitest run
```

Expected: All tests pass.

- [x] **Step 4: Commit**

```bash
git add src/engine/physics.ts src/engine/physics.test.ts
git commit -m "feat: Matter.js physics engine with walls, hero body factory, and tests"
```

---

## Task 4: Spawner — weighted random selection and spawn position logic

**Files:**
- Create: `src/engine/spawner.ts`
- Create: `src/engine/spawner.test.ts`

- [x] **Step 1: Create spawner.ts**

Write to `src/engine/spawner.ts`:

```ts
import { SPAWN_TABLE, CONTAINER_WIDTH, SPAWN_Y, getHeroByTier, HeroDefinition } from '../constants';

export function selectRandomHero(): HeroDefinition {
  const roll = Math.random();
  let cumulative = 0;
  for (const entry of SPAWN_TABLE) {
    cumulative += entry.probability;
    if (roll < cumulative) {
      const hero = getHeroByTier(entry.tier);
      if (hero) return hero;
    }
  }
  return getHeroByTier(1)!;
}

export function clampSpawnX(desiredX: number, radius: number): number {
  return Math.max(radius, Math.min(CONTAINER_WIDTH - radius, desiredX));
}

export function getSpawnY(): number {
  return SPAWN_Y;
}
```

- [x] **Step 2: Create spawner.test.ts**

Write to `src/engine/spawner.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { selectRandomHero, clampSpawnX, getSpawnY } from './spawner';
import { CONTAINER_WIDTH, SPAWN_Y } from '../constants';

describe('spawner', () => {
  it('selectRandomHero returns a hero with tier between 1 and 4', () => {
    for (let i = 0; i < 100; i++) {
      const hero = selectRandomHero();
      expect(hero.tier).toBeGreaterThanOrEqual(1);
      expect(hero.tier).toBeLessThanOrEqual(4);
    }
  });

  it('selectRandomHero produces all tiers 1-4 with expected distribution over 2000 iterations', () => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (let i = 0; i < 2000; i++) {
      counts[selectRandomHero().tier]++;
    }
    expect(counts[1]).toBeGreaterThan(0);
    expect(counts[2]).toBeGreaterThan(0);
    expect(counts[3]).toBeGreaterThan(0);
    expect(counts[4]).toBeGreaterThan(0);
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(counts[3]);
    expect(counts[3]).toBeGreaterThan(counts[4]);
  });

  it('clampSpawnX clamps to [radius, CONTAINER_WIDTH - radius]', () => {
    expect(clampSpawnX(0, 20)).toBe(20);
    expect(clampSpawnX(CONTAINER_WIDTH, 20)).toBe(CONTAINER_WIDTH - 20);
    expect(clampSpawnX(180, 20)).toBe(180);
  });

  it('getSpawnY returns SPAWN_Y constant', () => {
    expect(getSpawnY()).toBe(SPAWN_Y);
  });
});
```

- [x] **Step 3: Run tests to verify**

Run:
```
npx vitest run
```

Expected: All tests pass.

- [x] **Step 4: Commit**

```bash
git add src/engine/spawner.ts src/engine/spawner.test.ts
git commit -m "feat: spawner with weighted random selection, position clamping, and tests"
```

---
## Task 5: Merger — collision-based merge detection and execution

**Files:**
- Create: `src/engine/merger.ts`
- Create: `src/engine/merger.test.ts`

- [x] **Step 1: Create merger.ts**

Write to `src/engine/merger.ts`:

```ts
import Matter from 'matter-js';
import { getHeroByTier, MERGE_COOLDOWN_MS, VELOCITY_DAMPING, YAO_YAO_SCORE, HeroDefinition } from '../constants';
import { createHeroBody, removeBody } from './physics';

export interface MergeResult {
  merged: boolean;
  position?: { x: number; y: number };
  newHero?: HeroDefinition;
  score: number;
  isYaoMerge: boolean;
}

export function tryMerge(world: Matter.World, bodyA: Matter.Body, bodyB: Matter.Body, now: number): MergeResult {
  const tierA: number | undefined = (bodyA as any).heroTier;
  const tierB: number | undefined = (bodyB as any).heroTier;

  if (tierA == null || tierB == null || tierA !== tierB) {
    return { merged: false, score: 0, isYaoMerge: false };
  }

  const cooldownA: number = (bodyA as any).mergeCooldownUntil ?? 0;
  const cooldownB: number = (bodyB as any).mergeCooldownUntil ?? 0;
  if (now < cooldownA || now < cooldownB) {
    return { merged: false, score: 0, isYaoMerge: false };
  }

  const midX = (bodyA.position.x + bodyB.position.x) / 2;
  const midY = (bodyA.position.y + bodyB.position.y) / 2;
  const avgVx = ((bodyA.velocity.x + bodyB.velocity.x) / 2) * VELOCITY_DAMPING;
  const avgVy = ((bodyA.velocity.y + bodyB.velocity.y) / 2) * VELOCITY_DAMPING;

  removeBody(world, bodyA);
  removeBody(world, bodyB);

  if (tierA === 10) {
    return { merged: true, position: { x: midX, y: midY }, score: YAO_YAO_SCORE, isYaoMerge: true };
  }

  const newTier = tierA + 1;
  const newHero = getHeroByTier(newTier);
  if (!newHero) return { merged: false, score: 0, isYaoMerge: false };

  const newBody = createHeroBody(world, { tier: newHero.tier, nameZh: newHero.nameZh, radius: newHero.radius, x: midX, y: midY });
  Matter.Body.setVelocity(newBody, { x: avgVx, y: avgVy });
  (newBody as any).mergeCooldownUntil = now + MERGE_COOLDOWN_MS;

  return { merged: true, position: { x: midX, y: midY }, newHero, score: newHero.score, isYaoMerge: false };
}
```

- [x] **Step 2: Create merger.test.ts**

Write to `src/engine/merger.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import Matter from 'matter-js';
import { tryMerge } from './merger';
import { createPhysicsEngine, createHeroBody, getHeroBodies } from './physics';
import { YAO_YAO_SCORE } from '../constants';

describe('merger', () => {
  let engine: Matter.Engine;
  beforeEach(() => { engine = createPhysicsEngine(); });

  it('does not merge bodies of different tiers', () => {
    const a = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 100, y: 100 });
    const b = createHeroBody(engine.world, { tier: 2, nameZh: 'B', radius: 23, x: 120, y: 100 });
    const result = tryMerge(engine.world, a, b, 0);
    expect(result.merged).toBe(false);
    expect(getHeroBodies(engine.world)).toHaveLength(2);
  });

  it('merges two tier-1 bodies into a tier-2 body', () => {
    const a = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 100, y: 100 });
    const b = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 120, y: 100 });
    const result = tryMerge(engine.world, a, b, 0);
    expect(result.merged).toBe(true);
    expect(result.score).toBe(10);
    expect(result.newHero?.tier).toBe(2);
    expect(getHeroBodies(engine.world)).toHaveLength(1);
    expect((getHeroBodies(engine.world)[0] as any).heroTier).toBe(2);
  });

  it('respects merge cooldown', () => {
    const a = createHeroBody(engine.world, { tier: 3, nameZh: 'C', radius: 26, x: 100, y: 100 });
    const b = createHeroBody(engine.world, { tier: 3, nameZh: 'C', radius: 26, x: 120, y: 100 });
    (a as any).mergeCooldownUntil = 1000;
    const result = tryMerge(engine.world, a, b, 500);
    expect(result.merged).toBe(false);
  });

  it('allows merge after cooldown expires', () => {
    const a = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 100, y: 100 });
    const b = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 120, y: 100 });
    (a as any).mergeCooldownUntil = 1000;
    const result = tryMerge(engine.world, a, b, 2000);
    expect(result.merged).toBe(true);
  });

  it('Yao+Yao merge awards 5000 points and removes both bodies', () => {
    const a = createHeroBody(engine.world, { tier: 10, nameZh: 'Yao', radius: 45, x: 100, y: 100 });
    const b = createHeroBody(engine.world, { tier: 10, nameZh: 'Yao', radius: 45, x: 120, y: 100 });
    const result = tryMerge(engine.world, a, b, 0);
    expect(result.merged).toBe(true);
    expect(result.score).toBe(YAO_YAO_SCORE);
    expect(result.isYaoMerge).toBe(true);
    expect(result.newHero).toBeUndefined();
    expect(getHeroBodies(engine.world)).toHaveLength(0);
  });

  it('non-hero bodies do not merge', () => {
    const a = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 100, y: 100 });
    const wall = Matter.Bodies.rectangle(180, 100, 10, 10, {});
    expect(tryMerge(engine.world, a, wall, 0).merged).toBe(false);
  });
});
```

- [x] **Step 3: Run tests to verify**

Run:
```
npx vitest run
```

Expected: All tests pass.

- [x] **Step 4: Commit**

```bash
git add src/engine/merger.ts src/engine/merger.test.ts
git commit -m "feat: merger with same-tier detection, cooldowns, Yao+Yao special case, and tests"
```

---

## Task 6: Canvas rendering — background, container, hero bubble rendering

**Files:**
- Create: `src/rendering/canvas.ts`
- Modify: `src/engine/physics.ts` (add `_heroDef` reference — already done in Task 3, verify)

- [x] **Step 1: Create canvas.ts with rendering functions**

Write to `src/rendering/canvas.ts`:

```ts
import Matter from 'matter-js';
import {
  CONTAINER_WIDTH, CONTAINER_HEIGHT, COLOR_BACKGROUND, COLOR_CONTAINER_GRADIENT_TOP,
  COLOR_CONTAINER_GRADIENT_BOTTOM, COLOR_CONTAINER_BORDER, COLOR_WHITE, FONT_STACK,
  getFontSize, getHeroImagePath, DEATH_LINE_Y, HeroDefinition,
} from '../constants';

export function initCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = CONTAINER_WIDTH;
  canvas.height = CONTAINER_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D context');
  return ctx;
}

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR_BACKGROUND;
  ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);
  const grad = ctx.createLinearGradient(0, 0, 0, CONTAINER_HEIGHT);
  grad.addColorStop(0, COLOR_CONTAINER_GRADIENT_TOP);
  grad.addColorStop(1, COLOR_CONTAINER_GRADIENT_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);
  ctx.strokeStyle = COLOR_CONTAINER_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, CONTAINER_WIDTH - 2, CONTAINER_HEIGHT - 2);
}

export function drawDeathLine(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, DEATH_LINE_Y);
  ctx.lineTo(CONTAINER_WIDTH - 10, DEATH_LINE_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ff0000';
  ctx.font = `10px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText('\u5371\u9669\u7ebf', CONTAINER_WIDTH - 12, DEATH_LINE_Y - 4);
  ctx.restore();
}

const imageCache = new Map<string, HTMLImageElement | null>();

export function preloadHeroImage(tier: number, nameEn: string): Promise<HTMLImageElement | null> {
  const basePath = getHeroImagePath(tier, nameEn);
  const pngPath = `${basePath}.png`;
  return new Promise((resolve) => {
    if (imageCache.has(pngPath)) { resolve(imageCache.get(pngPath)!); return; }
    const img = new Image();
    img.onload = () => { imageCache.set(pngPath, img); resolve(img); };
    img.onerror = () => {
      const jpgPath = `${basePath}.jpg`;
      if (imageCache.has(jpgPath)) { resolve(imageCache.get(jpgPath)!); return; }
      const imgJpg = new Image();
      imgJpg.onload = () => { imageCache.set(jpgPath, imgJpg); resolve(imgJpg); };
      imgJpg.onerror = () => { imageCache.set(pngPath, null); imageCache.set(jpgPath, null); resolve(null); };
      imgJpg.src = jpgPath;
    };
    img.src = pngPath;
  });
}

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - factor))},${Math.floor(g * (1 - factor))},${Math.floor(b * (1 - factor))})`;
}

export function drawHeroBubble(ctx: CanvasRenderingContext2D, body: Matter.Body): void {
  const tier: number = (body as any).heroTier;
  const nameZh: string = (body as any).heroNameZh;
  const radius: number = (body as any).heroRadius;
  const hero: HeroDefinition | undefined = (body as any)._heroDef;
  const color = hero?.color ?? '#999999';
  const nameEn = hero?.nameEn ?? '';
  const x = body.position.x;
  const y = body.position.y;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, darkenColor(color, 0.5));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (nameEn) {
    const basePath = getHeroImagePath(tier, nameEn);
    const img = imageCache.get(`${basePath}.png`) ?? imageCache.get(`${basePath}.jpg`);
    if (img) {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
      ctx.globalAlpha = 1.0;
    }
  }

  ctx.strokeStyle = COLOR_WHITE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  const fontSize = getFontSize(radius);
  ctx.font = `${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillText(nameZh, x + 1, y + 1);
  ctx.fillStyle = COLOR_WHITE;
  ctx.fillText(nameZh, x, y);
  ctx.restore();
}

export function drawHeroBodies(ctx: CanvasRenderingContext2D, world: Matter.World): void {
  for (const body of world.bodies) {
    if ((body as any).heroTier != null) drawHeroBubble(ctx, body);
  }
}

export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run:
```
npx tsc --noEmit
```

Expected: No errors.

- [x] **Step 3: Commit**

```bash
git add src/rendering/canvas.ts
git commit -m "feat: canvas rendering for background, death line, hero bubbles with gradient and avatars"
```

---

## Task 7: Animations, HUD, and main game loop with all systems integrated

**Files:**
- Create: `src/rendering/animations.ts`
- Create: `src/rendering/hud.ts`
- Create: `src/main.ts`

- [x] **Step 1: Create animations.ts (particle system + pop effects)**

Write to `src/rendering/animations.ts`:

```ts
import { MAX_PARTICLES, Particle, HeroDefinition } from '../constants';

interface PopAnimation {
  x: number; y: number; radius: number; startTime: number; duration: number; hero?: HeroDefinition;
}

let particles: Particle[] = [];
let popAnimations: PopAnimation[] = [];
let animTime = 0;

export function spawnParticles(x: number, y: number, color: string, count: number = 12): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 3;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 30 + Math.random() * 20, color, radius: 2 + Math.random() * 3 });
  }
  while (particles.length > MAX_PARTICLES) particles.shift();
}

export function startPopAnimation(x: number, y: number, radius: number, hero?: HeroDefinition): void {
  popAnimations.push({ x, y, radius, startTime: animTime, duration: 300, hero });
}

export function updateAnimations(deltaMs: number): void {
  animTime += deltaMs;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life++; p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95;
    if (p.life >= p.maxLife) particles.splice(i, 1);
  }
  popAnimations = popAnimations.filter(p => (animTime - p.startTime) < p.duration);
}

export function drawParticles(ctx: CanvasRenderingContext2D): void {
  for (const p of particles) {
    const alpha = 1 - p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawPopAnimations(ctx: CanvasRenderingContext2D): void {
  for (const anim of popAnimations) {
    const elapsed = animTime - anim.startTime;
    const progress = elapsed / anim.duration;
    const scale = 1 + progress * 0.4;
    const alpha = 1 - progress;
    const currentRadius = anim.radius * scale;
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = anim.hero?.color ?? '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(anim.x, anim.y, currentRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(anim.x, anim.y, currentRadius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function clearAnimations(): void {
  particles = [];
  popAnimations = [];
  animTime = 0;
}
```

- [x] **Step 2: Create hud.ts (HUD overlay with score, next hero preview, mute button)**

Write to `src/rendering/hud.ts`:

```ts
import {
  CONTAINER_WIDTH, HUD_HEIGHT, COLOR_HUD_BG, COLOR_WHITE, FONT_STACK, HeroDefinition,
} from '../constants';

export function drawHUD(ctx: CanvasRenderingContext2D, score: number, highScore: number, nextHero: HeroDefinition | null, muted: boolean): void {
  ctx.fillStyle = COLOR_HUD_BG;
  ctx.fillRect(0, 0, CONTAINER_WIDTH, HUD_HEIGHT);
  const gradEdge = ctx.createLinearGradient(0, HUD_HEIGHT - 5, 0, HUD_HEIGHT);
  gradEdge.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradEdge.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
  ctx.fillStyle = gradEdge;
  ctx.fillRect(0, HUD_HEIGHT - 5, CONTAINER_WIDTH, 5);

  ctx.fillStyle = '#333333';
  ctx.font = `14px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(`\u5206\u6570: ${score}`, 10, 22);

  ctx.textAlign = 'center';
  ctx.font = `12px ${FONT_STACK}`;
  ctx.fillText(`\u6700\u9ad8\u5206: ${highScore}`, CONTAINER_WIDTH / 2, 22);

  if (muted) {
    ctx.font = `16px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.fillText('\uD83D\uDD07', CONTAINER_WIDTH - 10, 22);
  }

  if (nextHero) {
    const previewX = CONTAINER_WIDTH - 40;
    const previewY = 42;
    const pr = 15;
    const grad = ctx.createRadialGradient(previewX - 4, previewY - 4, 0, previewX, previewY, pr);
    grad.addColorStop(0, nextHero.color);
    grad.addColorStop(1, darkenColorHex(nextHero.color, 0.5));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(previewX, previewY, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLOR_WHITE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(previewX, previewY, pr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLOR_WHITE;
    ctx.font = `9px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText(nextHero.nameZh, previewX, previewY);
  }
}

function darkenColorHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - factor))},${Math.floor(g * (1 - factor))},${Math.floor(b * (1 - factor))})`;
}

/** Check if coordinates are inside the mute button area. */
export function isMuteButtonClicked(canvasX: number, canvasY: number): boolean {
  return canvasY < HUD_HEIGHT && canvasX > CONTAINER_WIDTH - 50;
}
```

- [x] **Step 3: Create main.ts — full game loop, scene management, input handling**

Write to `src/main.ts`:

```ts
import Matter from 'matter-js';
import {
  CONTAINER_WIDTH, CONTAINER_HEIGHT, DEATH_LINE_Y, GAME_OVER_DURATION_MS, MAX_DELTA_MS,
  SPAWN_RETRY_MS, SPAWN_MAX_RETRIES, LS_HIGH_SCORE, LS_MUTED, GameScene, getHeroByTier, HeroDefinition,
} from './constants';
import { createPhysicsEngine, createHeroBody, clampBodyVelocity, getHeroBodies } from './engine/physics';
import { tryMerge } from './engine/merger';
import { selectRandomHero, clampSpawnX, getSpawnY } from './engine/spawner';
import { initCanvas, clearCanvas, drawBackground, drawDeathLine, drawHeroBodies, preloadHeroImage } from './rendering/canvas';
import { drawHUD, isMuteButtonClicked } from './rendering/hud';
import {
  spawnParticles, startPopAnimation, updateAnimations, drawParticles, drawPopAnimations, clearAnimations,
} from './rendering/animations';
import { initAudio, resumeAudio, playHeroVoice, preloadAllAudio, preloadHeroAudio, setMuted, playBGM, stopBGM } from './audio/audio';
import { readMuted, writeMuted, readHighScore, writeHighScore, readLeaderboard, insertLeaderboardEntry } from './leaderboard/storage';
import { drawMenu, isStartButtonClicked } from './ui/menu';
import { drawGameOver, isReplayClicked, isHomeClicked } from './ui/gameover';

// State
let scene: GameScene = 'menu';
let engine: Matter.Engine | null = null;
let score = 0;
let highScore = 0;
let nextHero: HeroDefinition | null = null;
let currentPreviewX = CONTAINER_WIDTH / 2;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let muted = false;
let hasYao = false;
let lastTime = 0;
let rafId = 0;
let ctx: CanvasRenderingContext2D | null = null;
const deathTimers = new Map<number, number>();

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

function resizeCanvas(): void {
  const scale = Math.min(window.innerWidth / CONTAINER_WIDTH, window.innerHeight / CONTAINER_HEIGHT);
  canvas.style.width = `${CONTAINER_WIDTH * scale}px`;
  canvas.style.height = `${CONTAINER_HEIGHT * scale}px`;
}

function startGame(): void {
  score = 0; hasYao = false; deathTimers.clear(); clearAnimations();
  try { highScore = readHighScore(); } catch { highScore = 0; }
  try { muted = readMuted(); } catch { muted = false; }
  engine = createPhysicsEngine();
  nextHero = selectRandomHero();
  for (const hero of [getHeroByTier(1)!, getHeroByTier(2)!, getHeroByTier(3)!, getHeroByTier(4)!]) {
    preloadHeroImage(hero.tier, hero.nameEn);
  }
  initAudio(); resumeAudio(); setMuted(muted); playBGM();
  Promise.all([1, 2, 3, 4].map(t => preloadHeroAudio(t)));
  preloadAllAudio();
  scene = 'playing';
  lastTime = performance.now();
  gameLoop(lastTime);
}

function gameLoop(timestamp: number): void {
  if (scene !== 'playing') return;
  const delta = Math.min(timestamp - lastTime, MAX_DELTA_MS);
  lastTime = timestamp;
  if (!engine || !ctx) { rafId = requestAnimationFrame(gameLoop); return; }

  Matter.Engine.update(engine, delta);
  for (const body of Matter.Composite.allBodies(engine.world)) clampBodyVelocity(body);

  const heroBodies = getHeroBodies(engine.world);
  const now = performance.now();
  const processed = new Set<number>();
  const mergeResults: Array<{ merged: boolean; position?: { x: number; y: number }; newHero?: HeroDefinition; score: number; isYaoMerge: boolean }> = [];

  for (let i = 0; i < heroBodies.length; i++) {
    const a = heroBodies[i];
    if (processed.has(a.id)) continue;
    for (let j = i + 1; j < heroBodies.length; j++) {
      const b = heroBodies[j];
      if (processed.has(b.id)) continue;
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const rA: number = (a as any).heroRadius ?? 0;
      const rB: number = (b as any).heroRadius ?? 0;
      if (dist < rA + rB) {
        const result = tryMerge(engine.world, a, b, now);
        if (result.merged) {
          processed.add(a.id); processed.add(b.id);
          mergeResults.push(result);
        }
      }
    }
  }

  for (const result of mergeResults) {
    if (!result.merged) continue;
    score += result.score;
    if (result.newHero) preloadHeroImage(result.newHero.tier, result.newHero.nameEn);
    if (result.isYaoMerge) hasYao = true;
    if (result.position && result.newHero) {
      spawnParticles(result.position.x, result.position.y, result.newHero.color);
      startPopAnimation(result.position.x, result.position.y, result.newHero.radius, result.newHero);
    }
    if (result.newHero) playHeroVoice(result.newHero.tier);
    else if (result.isYaoMerge) playHeroVoice(10);
  }

  if (checkGameOver(heroBodies, delta)) { endGame(); return; }

  updateAnimations(delta);
  clearCanvas(ctx);
  drawBackground(ctx);
  drawDeathLine(ctx);
  drawHeroBodies(ctx, engine.world);
  drawParticles(ctx);
  drawPopAnimations(ctx);
  drawHUD(ctx, score, highScore, nextHero, muted);

  rafId = requestAnimationFrame(gameLoop);
}

function checkGameOver(heroBodies: Matter.Body[], deltaMs: number): boolean {
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
    for (const body of Matter.Composite.allBodies(engine.world)) Matter.Body.setStatic(body, true);
  }
  if (score > highScore) {
    highScore = score;
    try { writeHighScore(highScore); } catch {}
  }
  const leaderboard = insertLeaderboardEntry(score, hasYao);
  const isNewRecord = score >= highScore && score > 0;
  if (ctx) {
    clearCanvas(ctx);
    drawBackground(ctx);
    drawDeathLine(ctx);
    if (engine) drawHeroBodies(ctx, engine.world);
    drawParticles(ctx);
    drawGameOver(ctx, score, isNewRecord, leaderboard);
  }
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (CONTAINER_WIDTH / rect.width),
    y: (e.clientY - rect.top) * (CONTAINER_HEIGHT / rect.height),
  };
}

function onPointerDown(e: MouseEvent | TouchEvent): void {
  if (scene === 'menu') {
    const pos = e instanceof MouseEvent ? getCanvasCoords(e) : getCanvasCoords((e as TouchEvent).touches[0]);
    if (isStartButtonClicked(pos.x, pos.y)) startGame();
    return;
  }
  if (scene === 'gameover') {
    const pos = e instanceof MouseEvent ? getCanvasCoords(e) : getCanvasCoords((e as TouchEvent).touches[0]);
    if (isReplayClicked(pos.x, pos.y)) { startGame(); return; }
    if (isHomeClicked(pos.x, pos.y)) {
      scene = 'menu';
      stopBGM();
      if (ctx) drawMenu(ctx);
    }
    return;
  }
  if (scene !== 'playing') return;
  isDragging = true;
  const pos = e instanceof MouseEvent ? getCanvasCoords(e) : getCanvasCoords((e as TouchEvent).touches[0]);
  dragStartX = pos.x;
  dragStartY = pos.y;
  currentPreviewX = pos.x;
}

function onPointerMove(e: MouseEvent | TouchEvent): void {
  if (!isDragging) return;
  const pos = e instanceof MouseEvent ? getCanvasCoords(e) : getCanvasCoords((e as TouchEvent).touches[0]);
  currentPreviewX = pos.x;
}

function onPointerUp(e: MouseEvent | TouchEvent): void {
  const pos = e instanceof MouseEvent ? getCanvasCoords(e) : getCanvasCoords((e as TouchEvent).changedTouches[0]);
  const dragDist = Math.sqrt((pos.x - dragStartX) ** 2 + (pos.y - dragStartY) ** 2);
  if (scene === 'playing' && isMuteButtonClicked(pos.x, pos.y) && dragDist < 10) {
    muted = !muted;
    setMuted(muted);
    try { writeMuted(muted); } catch {}
    isDragging = false;
    return;
  }
  if (!isDragging || scene !== 'playing' || !engine || !nextHero) { isDragging = false; return; }
  isDragging = false;

  const spawnX = clampSpawnX(currentPreviewX, nextHero.radius);
  const spawnY = getSpawnY();
  const heroBodies = getHeroBodies(engine.world);
  let blocked = false;
  for (const body of heroBodies) {
    const dx = body.position.x - spawnX;
    const dy = body.position.y - spawnY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ((body as any).heroRadius ?? 0) + nextHero.radius + 2) { blocked = true; break; }
  }

  if (blocked) {
    let retries = 0;
    const trySpawn = () => {
      retries++;
      if (!engine || !nextHero) return;
      const currentHeroes = getHeroBodies(engine.world);
      const reBlocked = currentHeroes.some(b => {
        const dx = b.position.x - spawnX;
        const dy = b.position.y - spawnY;
        return Math.sqrt(dx * dx + dy * dy) < ((b as any).heroRadius ?? 0) + nextHero.radius + 2;
      });
      if (!reBlocked) {
        const droppedTier = nextHero.tier;
        createHeroBody(engine.world, { tier: droppedTier, nameZh: nextHero.nameZh, radius: nextHero.radius, x: spawnX, y: spawnY });
        playHeroVoice(droppedTier);
        nextHero = selectRandomHero();
      } else if (retries >= SPAWN_MAX_RETRIES) {
        endGame();
      } else {
        setTimeout(trySpawn, SPAWN_RETRY_MS);
      }
    };
    setTimeout(trySpawn, SPAWN_RETRY_MS);
    return;
  }

  const droppedTier = nextHero.tier;
  createHeroBody(engine.world, { tier: droppedTier, nameZh: nextHero.nameZh, radius: nextHero.radius, x: spawnX, y: spawnY });
  playHeroVoice(droppedTier);
  nextHero = selectRandomHero();
}

function init(): void {
  ctx = initCanvas(canvas);
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('touchmove', onPointerMove, { passive: false });
  canvas.addEventListener('touchend', onPointerUp);
  canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  if (ctx) drawMenu(ctx);
}

init();
```

- [x] **Step 4: Verify TypeScript compilation**

Run:
```
npx tsc --noEmit
```

Expected: No errors (this will show errors for missing imports — they will be resolved in Tasks 8-10).

Note: At this point, compilation will fail because `src/audio/audio.ts`, `src/leaderboard/storage.ts`, `src/ui/menu.ts`, and `src/ui/gameover.ts` don't exist yet. The next tasks create these files.

- [x] **Step 5: Commit**

```bash
git add src/rendering/animations.ts src/rendering/hud.ts src/main.ts
git commit -m "feat: animations system, HUD overlay, and main game loop with full integration"
```

---
## Task 8: Leaderboard storage — localStorage read/write

**Files:**
- Create: `src/leaderboard/storage.ts`
- Create: `src/leaderboard/storage.test.ts`

 - [x] **Step 1: Create storage.ts**

Write to `src/leaderboard/storage.ts`:

```ts
import { LS_LEADERBOARD, LS_MUTED, LS_HIGH_SCORE, LeaderboardEntry } from '../constants';

const MAX_ENTRIES = 5;

export function readLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LS_LEADERBOARD);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) { console.warn('Leaderboard data is not an array, resetting.'); return []; }
    return parsed.filter((e: any) => typeof e.score === 'number' && typeof e.date === 'string' && typeof e.hasYao === 'boolean');
  } catch (err) { console.warn('Failed to read leaderboard:', err); return []; }
}

export function writeLeaderboard(entries: LeaderboardEntry[]): void {
  try { localStorage.setItem(LS_LEADERBOARD, JSON.stringify(entries)); } catch (err) { console.warn('Failed to write leaderboard:', err); }
}

export function insertLeaderboardEntry(score: number, hasYao: boolean): LeaderboardEntry[] {
  const entries = readLeaderboard();
  entries.push({ score, date: new Date().toISOString(), hasYao });
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, MAX_ENTRIES);
  writeLeaderboard(trimmed);
  return trimmed;
}

export function readMuted(): boolean {
  try { return localStorage.getItem(LS_MUTED) === 'true'; } catch { return false; }
}

export function writeMuted(muted: boolean): void {
  try { localStorage.setItem(LS_MUTED, muted ? 'true' : 'false'); } catch {}
}

export function readHighScore(): number {
  try { const raw = localStorage.getItem(LS_HIGH_SCORE); if (!raw) return 0; return parseInt(raw, 10) || 0; } catch { return 0; }
}

export function writeHighScore(score: number): void {
  try { localStorage.setItem(LS_HIGH_SCORE, score.toString()); } catch {}
}
```

 - [x] **Step 2: Create storage.test.ts**

Write to `src/leaderboard/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { readLeaderboard, writeLeaderboard, insertLeaderboardEntry, readMuted, writeMuted, readHighScore, writeHighScore } from './storage';

describe('storage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('readLeaderboard returns empty array when nothing stored', () => { expect(readLeaderboard()).toEqual([]); });

  it('writeLeaderboard and readLeaderboard round-trip', () => {
    const entries = [{ score: 100, date: '2026-01-01T00:00:00.000Z', hasYao: false }, { score: 50, date: '2026-01-02T00:00:00.000Z', hasYao: true }];
    writeLeaderboard(entries);
    expect(readLeaderboard()).toEqual(entries);
  });

  it('insertLeaderboardEntry maintains top 5 sorted descending', () => {
    insertLeaderboardEntry(100, false);
    insertLeaderboardEntry(300, true);
    insertLeaderboardEntry(200, false);
    const entries = readLeaderboard();
    expect(entries).toHaveLength(3);
    expect(entries[0].score).toBe(300);
    expect(entries[2].score).toBe(100);
  });

  it('leaderboard caps at 5 entries, discards lowest', () => {
    for (let i = 1; i <= 7; i++) insertLeaderboardEntry(i * 100, false);
    const entries = readLeaderboard();
    expect(entries).toHaveLength(5);
    expect(entries[0].score).toBe(700);
    expect(entries[4].score).toBe(300);
  });

  it('handles corrupted leaderboard data gracefully', () => {
    localStorage.setItem('timi2_leaderboard', 'not-json');
    expect(() => readLeaderboard()).not.toThrow();
    expect(readLeaderboard()).toEqual([]);
  });

  it('handles invalid leaderboard structure', () => {
    localStorage.setItem('timi2_leaderboard', JSON.stringify({ not: 'array' }));
    expect(readLeaderboard()).toEqual([]);
  });

  it('muted preference round-trips', () => {
    writeMuted(true); expect(readMuted()).toBe(true);
    writeMuted(false); expect(readMuted()).toBe(false);
  });

  it('high score round-trips', () => {
    writeHighScore(9999); expect(readHighScore()).toBe(9999);
  });

  it('readHighScore returns 0 when nothing stored', () => {
    expect(readHighScore()).toBe(0);
  });
});
```

- [x] **Step 3: Run tests to verify**

Run:
```
npx vitest run
```

Expected: All tests pass.

- [x] **Step 4: Commit**

```bash
git add src/leaderboard/storage.ts src/leaderboard/storage.test.ts
git commit -m "feat: localStorage leaderboard storage with top-5, mute, high score, and tests"
```

---

## Task 9: Menu screen — start screen with title and button

**Files:**
- Create: `src/ui/menu.ts`

 - [x] **Step 1: Create menu.ts**

Write to `src/ui/menu.ts`:

```ts
import { CONTAINER_WIDTH, CONTAINER_HEIGHT, COLOR_BACKGROUND, COLOR_ACCENT, COLOR_WHITE, FONT_STACK } from '../constants';

export function drawMenu(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR_BACKGROUND;
  ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);

  ctx.fillStyle = COLOR_ACCENT;
  ctx.font = `bold 32px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = 'rgba(233, 30, 99, 0.3)';
  ctx.shadowBlur = 10;
  ctx.fillText('\u5408\u6210\u5927timi', CONTAINER_WIDTH / 2, CONTAINER_HEIGHT / 2 - 60);
  ctx.restore();

  ctx.fillStyle = '#888888';
  ctx.font = `14px ${FONT_STACK}`;
  ctx.fillText('\u738b\u8005\u8363\u8000\u82f1\u96c4\u5408\u6210\u6e38\u620f', CONTAINER_WIDTH / 2, CONTAINER_HEIGHT / 2 - 20);

  const btnX = CONTAINER_WIDTH / 2 - 70;
  const btnY = CONTAINER_HEIGHT / 2 + 20;
  const btnW = 140;
  const btnH = 44;

  ctx.fillStyle = COLOR_ACCENT;
  ctx.beginPath();
  roundRect(ctx, btnX, btnY, btnW, btnH, 12);
  ctx.fill();

  ctx.fillStyle = COLOR_WHITE;
  ctx.font = `bold 18px ${FONT_STACK}`;
  ctx.fillText('\u5f00\u59cb\u6e38\u620f', CONTAINER_WIDTH / 2, btnY + btnH / 2);

  ctx.fillStyle = '#bbbbbb';
  ctx.font = `10px ${FONT_STACK}`;
  ctx.fillText('v1.0.0', CONTAINER_WIDTH / 2, CONTAINER_HEIGHT - 15);
}

export function isStartButtonClicked(canvasX: number, canvasY: number): boolean {
  const btnX = CONTAINER_WIDTH / 2 - 70;
  const btnY = CONTAINER_HEIGHT / 2 + 20;
  return canvasX >= btnX && canvasX <= btnX + 140 && canvasY >= btnY && canvasY <= btnY + 44;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
```

 - [x] **Step 2: Commit**

```bash
git add src/ui/menu.ts
git commit -m "feat: start menu screen with title, subtitle, start button, and version footer"
```

---

## Task 10: Game-over panel with leaderboard display and replay buttons

**Files:**
- Create: `src/ui/gameover.ts`

 - [x] **Step 1: Create gameover.ts**

Write to `src/ui/gameover.ts`:

```ts
import { CONTAINER_WIDTH, CONTAINER_HEIGHT, COLOR_OVERLAY, COLOR_ACCENT, COLOR_WHITE, FONT_STACK, LeaderboardEntry } from '../constants';

export function drawGameOver(ctx: CanvasRenderingContext2D, score: number, isNewRecord: boolean, leaderboard: LeaderboardEntry[]): void {
  ctx.fillStyle = COLOR_OVERLAY;
  ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);

  const panelX = 30, panelY = 80, panelW = CONTAINER_WIDTH - 60, panelH = 400;
  ctx.fillStyle = COLOR_WHITE;
  ctx.beginPath(); roundRect(ctx, panelX, panelY, panelW, panelH, 12); ctx.fill();

  ctx.fillStyle = COLOR_ACCENT;
  ctx.font = `bold 24px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText('\u6e38\u620f\u7ed3\u675f', CONTAINER_WIDTH / 2, panelY + 35);

  ctx.fillStyle = '#333333';
  ctx.font = `16px ${FONT_STACK}`;
  ctx.fillText(`\u6700\u7ec8\u5206\u6570: ${score}`, CONTAINER_WIDTH / 2, panelY + 65);

  if (isNewRecord) {
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold 18px ${FONT_STACK}`;
    ctx.fillText('\u2605 \u65b0\u7eaa\u5f55! \u2605', CONTAINER_WIDTH / 2, panelY + 90);
  }

  const tableY = panelY + (isNewRecord ? 110 : 90);
  drawLeaderboardTable(ctx, leaderboard, panelX + 10, tableY, panelW - 20);

  const btnY = panelY + panelH - 70, btnH = 40;
  const replayBtnX = CONTAINER_WIDTH / 2 - 110, replayBtnW = 100;
  ctx.fillStyle = COLOR_ACCENT;
  ctx.beginPath(); roundRect(ctx, replayBtnX, btnY, replayBtnW, btnH, 10); ctx.fill();
  ctx.fillStyle = COLOR_WHITE;
  ctx.font = `bold 15px ${FONT_STACK}`;
  ctx.fillText('\u518d\u6765\u4e00\u5c40', replayBtnX + replayBtnW / 2, btnY + btnH / 2);

  const homeBtnX = CONTAINER_WIDTH / 2 + 10;
  ctx.fillStyle = '#999999';
  ctx.beginPath(); roundRect(ctx, homeBtnX, btnY, replayBtnW, btnH, 10); ctx.fill();
  ctx.fillStyle = COLOR_WHITE;
  ctx.fillText('\u8fd4\u56de\u4e3b\u9875', homeBtnX + replayBtnW / 2, btnY + btnH / 2);
}

function drawLeaderboardTable(ctx: CanvasRenderingContext2D, entries: LeaderboardEntry[], x: number, y: number, width: number): void {
  ctx.fillStyle = '#666666';
  ctx.font = `11px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('\u6392\u540d', x, y);
  ctx.fillText('\u5206\u6570', x + 35, y);
  ctx.fillText('\u65e5\u671f', x + 100, y);
  ctx.textAlign = 'center';
  ctx.fillText('\u7476\u5408\u5e76?', x + width - 15, y);
  ctx.textAlign = 'left';

  ctx.strokeStyle = '#eeeeee'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + 5); ctx.lineTo(x + width, y + 5); ctx.stroke();

  ctx.fillStyle = '#333333';
  ctx.font = `10px ${FONT_STACK}`;
  for (let i = 0; i < entries.length; i++) {
    const rowY = y + 20 + i * 20;
    const e = entries[i];
    ctx.fillText(`${i + 1}`, x, rowY);
    ctx.fillText(`${e.score}`, x + 35, rowY);
    const d = new Date(e.date);
    ctx.fillText(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, x + 100, rowY);
    ctx.textAlign = 'center';
    ctx.fillText(e.hasYao ? '\u2713' : '\u2717', x + width - 15, rowY);
    ctx.textAlign = 'left';
  }
}

export function isReplayClicked(canvasX: number, canvasY: number): boolean {
  const btnX = CONTAINER_WIDTH / 2 - 110, btnY = 80 + 400 - 70;
  return canvasX >= btnX && canvasX <= btnX + 100 && canvasY >= btnY && canvasY <= btnY + 40;
}

export function isHomeClicked(canvasX: number, canvasY: number): boolean {
  const btnX = CONTAINER_WIDTH / 2 + 10, btnY = 80 + 400 - 70;
  return canvasX >= btnX && canvasX <= btnX + 100 && canvasY >= btnY && canvasY <= btnY + 40;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
```

 - [x] **Step 2: Commit**

```bash
git add src/ui/gameover.ts
git commit -m "feat: game-over panel with score, new record badge, leaderboard table, and replay/home buttons"
```

---
## Task 11: Audio download script — parse voice selections and download

**Files:**
- Create: `scripts/download-audio.ts`

- [ ] **Step 1: Create download-audio.ts script**

Write to `scripts/download-audio.ts`:

```ts
/**
 * Audio download script for 合成大timi.
 * Reads hero-voice-selection.md, extracts all URLs marked with [x],
 * and downloads them to public/audio/{heroId}-v{index}.{ext}.
 *
 * Usage: npx tsx scripts/download-audio.ts [--dry-run]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const SELECTION_FILE = 'hero-voice-selection.md';
const OUTPUT_DIR = 'public/audio';
const CDN_PREFIX = 'https://game.gtimg.cn/images/yxzj/zlkdatasys/audios/audio/';
const dryRun = process.argv.includes('--dry-run');

interface DownloadTask {
  heroId: number; index: number; url: string; ext: string; filename: string;
}

function parseSelectionFile(filePath: string): DownloadTask[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const tasks: DownloadTask[] = [];
  let currentHeroId = 0;
  const heroIndexCounters = new Map<number, number>();
  const headerRe = /ID=(\d+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(headerRe);
    if (headerMatch) { currentHeroId = parseInt(headerMatch[1], 10); continue; }

    if (line.includes('[x]') && line.includes('**#')) {
      let urlLine = '';
      for (let j = i + 1; j < lines.length && j < i + 5; j++) {
        const check = lines[j].trim();
        if (check.startsWith('https://') && check.includes(CDN_PREFIX)) { urlLine = check; break; }
      }
      if (!urlLine) { console.warn(`  [WARN] No URL found for [x] line at index ${i}`); continue; }
      if (currentHeroId === 0) { console.warn(`  [WARN] No hero section before [x] line at index ${i}`); continue; }

      const ext = urlLine.endsWith('.mp3') ? 'mp3' : 'wav';
      const count = (heroIndexCounters.get(currentHeroId) ?? 0) + 1;
      heroIndexCounters.set(currentHeroId, count);
      tasks.push({ heroId: currentHeroId, index: count, url: urlLine, ext, filename: `${currentHeroId}-v${count}.${ext}` });
    }
  }
  return tasks;
}

async function downloadFile(task: DownloadTask): Promise<boolean> {
  const outputPath = path.join(OUTPUT_DIR, task.filename);
  if (fs.existsSync(outputPath)) { console.log(`  [SKIP] ${task.filename} (already exists)`); return true; }
  if (dryRun) { console.log(`  [DRY-RUN] Would download: ${task.url} -> ${task.filename}`); return true; }

  try {
    const response = await fetch(task.url);
    if (!response.ok) { console.error(`  [FAIL] ${task.filename} - HTTP ${response.status}`); return false; }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('audio/') && !contentType.startsWith('application/octet-stream')) {
      console.warn(`  [WARN] ${task.filename} - unexpected Content-Type: ${contentType}`);
    }
    const blob = await response.arrayBuffer();
    if (blob.byteLength === 0) { console.error(`  [FAIL] ${task.filename} - empty file`); return false; }
    fs.writeFileSync(outputPath, Buffer.from(blob));
    console.log(`  [OK] ${task.filename} (${(blob.byteLength / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err: any) { console.error(`  [FAIL] ${task.filename} - ${err.message}`); return false; }
}

async function main(): Promise<void> {
  console.log('合成大timi - Audio Download Script');
  console.log('====================================\n');
  if (dryRun) console.log('DRY RUN MODE - no files will be downloaded.\n');
  if (!dryRun) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Parsing ${SELECTION_FILE}...`);
  const tasks = parseSelectionFile(SELECTION_FILE);
  console.log(`Found ${tasks.length} audio files to download.\n`);

  const byHero = new Map<number, DownloadTask[]>();
  for (const t of tasks) { const list = byHero.get(t.heroId) || []; list.push(t); byHero.set(t.heroId, list); }
  for (const [heroId, heroTasks] of byHero) console.log(`Hero ID ${heroId}: ${heroTasks.length} files`);
  console.log('');

  let success = 0, fail = 0, skip = 0;
  for (const task of tasks) {
    const existed = fs.existsSync(path.join(OUTPUT_DIR, task.filename));
    const result = await downloadFile(task);
    if (existed) skip++; else if (result) success++; else fail++;
  }

  console.log('\n====================================');
  console.log(`Download complete. Downloaded: ${success}, Failed: ${fail}, Skipped: ${skip}, Total: ${tasks.length}`);
  console.log('====================================');
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
```

- [ ] **Step 2: Run the download script (dry-run first)**

Run:
```
npx tsx scripts/download-audio.ts --dry-run
```

Expected: Lists ~35 files to download. Reports 0 downloaded, 0 failed.

- [x] **Step 3: Run the actual download**

Run:
```
npx tsx scripts/download-audio.ts
```

Expected: Downloads ~35 audio files to `public/audio/`.

- [x] **Step 4: Verify audio files**

Run:
```
ls public/audio/ | wc -l
```

Expected output: 35 files (4 Marco Polo + 3 Gan Jiang Mo Ye + 2 Kai + 3 Zhen Ji + 7 Yun Ying + 3 Yu Ji + 5 Xiao Qiao + 4 Cai Wen Ji + 4 Yao).

- [x] **Step 5: Add audio files to .gitignore and commit**

Run:
```
echo "public/audio/*.wav" >> .gitignore
echo "public/audio/*.mp3" >> .gitignore
```

```bash
git add scripts/download-audio.ts .gitignore
git commit -m "feat: audio download script with dry-run, idempotent download, and summary reporting"
```

---

## Task 12: Audio playback system — Web Audio API manager

**Files:**
- Create: `src/audio/audio.ts`

- [ ] **Step 1: Create audio.ts**

Write to `src/audio/audio.ts`:

```ts
import { MASTER_VOLUME, MAX_CONCURRENT_SOUNDS, ZHENJI_BGM_CHANCE, ZHENJI_BGM_FILE, BGM_FILE, HERO_CHAIN, getHeroByTier } from '../constants';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let buffers = new Map<string, AudioBuffer>();
let activeSources: AudioBufferSourceNode[] = [];
let bgmSource: AudioBufferSourceNode | null = null;
let bgmGain: GainNode | null = null;
let warnedMissing = new Set<string>();

export function initAudio(): void {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = MASTER_VOLUME;
  masterGain.connect(audioCtx.destination);
}

export async function resumeAudio(): Promise<void> {
  if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
}

export function setMuted(muted: boolean): void {
  if (masterGain) masterGain.gain.value = muted ? 0.0 : MASTER_VOLUME;
}

export async function preloadHeroAudio(tier: number): Promise<void> {
  if (!audioCtx) return;
  const hero = getHeroByTier(tier);
  if (!hero) return;

  let index = 1;
  const extensions = ['wav', 'mp3'];
  let loadedAny = false;
  while (true) {
    let loaded = false;
    for (const ext of extensions) {
      const path = `audio/${hero.heroId}-v${index}.${ext}`;
      try {
        const response = await fetch(path);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          buffers.set(path, audioBuffer);
          loaded = true; loadedAny = true; break;
        }
      } catch {}
    }
    if (!loaded) break;
    index++;
  }

  if (tier === 4) {
    try {
      const response = await fetch(`audio/${ZHENJI_BGM_FILE}`);
      if (response.ok) {
        const audioBuffer = await audioCtx.decodeAudioData(await response.arrayBuffer());
        buffers.set(ZHENJI_BGM_FILE, audioBuffer);
        loadedAny = true;
      }
    } catch {}
  }

  if (!loadedAny && !warnedMissing.has(String(tier))) {
    console.warn(`No audio files found for hero tier ${tier} (${hero.nameZh})`);
    warnedMissing.add(String(tier));
  }
}

export function playHeroVoice(tier: number): void {
  if (!audioCtx || !masterGain) return;
  const hero = getHeroByTier(tier);
  if (!hero) return;

  if (tier === 4 && Math.random() < ZHENJI_BGM_CHANCE) {
    const bgmBuffer = buffers.get(ZHENJI_BGM_FILE);
    if (bgmBuffer) { playBuffer(bgmBuffer); return; }
  }

  const available = Array.from(buffers.entries())
    .filter(([key]) => key.startsWith(`audio/${hero.heroId}-v`))
    .map(([, buf]) => buf);

  if (available.length === 0) {
    if (!warnedMissing.has(String(tier))) {
      console.warn(`No preloaded audio for hero tier ${tier} (${hero.nameZh})`);
      warnedMissing.add(String(tier));
    }
    return;
  }
  playBuffer(available[Math.floor(Math.random() * available.length)]);
}

function playBuffer(buffer: AudioBuffer): void {
  if (!audioCtx || !masterGain) return;
  while (activeSources.length >= MAX_CONCURRENT_SOUNDS) {
    const oldest = activeSources.shift();
    if (oldest) try { oldest.stop(); } catch {}
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(masterGain);
  source.onended = () => {
    const idx = activeSources.indexOf(source);
    if (idx >= 0) activeSources.splice(idx, 1);
  };
  activeSources.push(source);
  source.start(0);
}

export function playBGM(): void {
  if (!audioCtx || !masterGain) return;
  stopBGM();
  const buffer = buffers.get(BGM_FILE);
  if (!buffer) return;
  bgmGain = audioCtx.createGain();
  bgmGain.gain.value = 0.4;
  bgmGain.connect(masterGain);
  bgmSource = audioCtx.createBufferSource();
  bgmSource.buffer = buffer;
  bgmSource.loop = true;
  bgmSource.connect(bgmGain);
  bgmSource.start(0);
}

export function stopBGM(): void {
  if (bgmSource) { try { bgmSource.stop(); } catch {} bgmSource = null; }
  if (bgmGain) { bgmGain.disconnect(); bgmGain = null; }
}

export async function preloadAllAudio(): Promise<void> {
  for (const hero of HERO_CHAIN) await preloadHeroAudio(hero.tier);
}

export function isAudioReady(): boolean {
  return audioCtx !== null && audioCtx.state === 'running';
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run:
```
npx tsc --noEmit
```

Expected: No errors (all imports are now resolved).

- [x] **Step 3: Commit**

```bash
git add src/audio/audio.ts
git commit -m "feat: Web Audio API manager with voice line playback, BGM, concurrent sound limiting, and mute support"
```

---

## Task 13: Verify full TypeScript compilation and test suite

**Files:**
- No new files — verify existing code compiles and tests pass

- [ ] **Step 1: Run full TypeScript compilation check**

Run:
```
npx tsc --noEmit
```

Expected: No errors. If there are errors, fix import paths before proceeding.

- [ ] **Step 2: Run full test suite**

Run:
```
npx vitest run
```

Expected: All tests pass (constants, physics, spawner, merger, storage — 20+ tests total).

- [x] **Step 3: Try dev server**

Run:
```
npm run dev
```

Open the browser to verify the game loads without console errors. Expected: Menu screen displays with title, subtitle, and start button.

- [x] **Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve TypeScript compilation errors and verify test suite"
```

(If no fixes needed, skip this commit.)

---
## Task 14: Verify merge animations and particle system

**Files:**
- Verify: `src/rendering/animations.ts` (already created in Task 7)
- Verify: `src/main.ts` (merge effects integration already in Task 7)

- [ ] **Step 1: Verify animations are correctly wired in game loop**

Check `src/main.ts` — the merge results section should call both `spawnParticles` and `startPopAnimation`. 

Search for these lines in `src/main.ts`:
```ts
      spawnParticles(result.position.x, result.position.y, result.newHero.color);
      startPopAnimation(result.position.x, result.position.y, result.newHero.radius, result.newHero);
```

If they are present, the animations are connected. If not, add them.

- [ ] **Step 2: Verify render order in game loop**

Check that the render section in the game loop calls animations in the correct order:
```ts
  updateAnimations(delta);
  // ... draws ...
  drawParticles(ctx);
  drawPopAnimations(ctx);
  drawHUD(ctx, score, highScore, nextHero, muted);
```

The HUD should be drawn last (on top). Particles and pop animations should be drawn before HUD but after hero bodies.

- [x] **Step 3: Visual verification**

Run:
```
npm run dev
```

Start a game and drop heroes. When two identical heroes touch and merge, you should see:
- Colored particles burst outward from the merge point
- An expanding ring animation (pop effect) around the new hero
- Particles fade out over ~1 second

- [x] **Step 4: Commit (if any fixes)**

```bash
git add src/rendering/animations.ts src/main.ts
git commit -m "chore: verified merge animations integration in game loop"
```

(If no changes, skip.)

---

## Task 15: Verify mute toggle and drag-to-drop input separation

**Files:**
- Verify: `src/main.ts` (already implemented in Task 7)

- [ ] **Step 1: Verify mute toggle uses drag distance check**

Check `src/main.ts` for the mute toggle logic in `onPointerUp`:
```ts
  const dragDist = Math.sqrt((pos.x - dragStartX) ** 2 + (pos.y - dragStartY) ** 2);
  if (scene === 'playing' && isMuteButtonClicked(pos.x, pos.y) && dragDist < 10) {
    muted = !muted;
    setMuted(muted);
    try { writeMuted(muted); } catch {}
    isDragging = false;
    return;
  }
```

The `dragDist < 10` condition ensures only a short tap (not a drag movement) triggers the mute toggle.

- [ ] **Step 2: Verify dragStartX/Y are recorded in onPointerDown**

Check that `onPointerDown` stores the initial position:
```ts
  dragStartX = pos.x;
  dragStartY = pos.y;
```

- [x] **Step 3: Manual test**

Run `npm run dev`, start a game:
1. Tap the mute area (top-right HUD corner) — mute indicator should toggle
2. Drag from the mute area to elsewhere — mute should NOT toggle (drop should happen instead)
3. Verify mute state persists across page reloads (check localStorage `timi2_muted` key)

- [x] **Step 4: Commit (if any fixes)**

```bash
git commit -m "fix: verified mute toggle only activates on short tap, not during drag"
```

(Skip if no changes.)

---

## Task 16: Verify responsive canvas scaling

**Files:**
- Verify: `src/main.ts` (already implemented in Task 7)
- Verify: `index.html` (CSS already applied in Task 1)

- [ ] **Step 1: Check resizeCanvas function**

Verify `src/main.ts` contains:
```ts
function resizeCanvas(): void {
  const scale = Math.min(window.innerWidth / CONTAINER_WIDTH, window.innerHeight / CONTAINER_HEIGHT);
  canvas.style.width = `${CONTAINER_WIDTH * scale}px`;
  canvas.style.height = `${CONTAINER_HEIGHT * scale}px`;
}
```

And that it's called on init and resize:
```ts
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
```

- [ ] **Step 2: Check getCanvasCoords transforms correctly**

Verify:
```ts
function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (CONTAINER_WIDTH / rect.width),
    y: (e.clientY - rect.top) * (CONTAINER_HEIGHT / rect.height),
  };
}
```

- [x] **Step 3: Manual test at different viewport sizes**

Run `npm run dev`:
1. Open in a desktop browser, resize window — game should scale while maintaining 9:16 ratio
2. Use Chrome DevTools device toolbar, test iPhone SE (375px) and iPhone 14 Pro Max (430px) — game should fit the viewport
3. Test touch input in mobile device mode — coordinate mapping should remain accurate

- [x] **Step 4: Commit (if any fixes)**

(Skip if no changes.)

---

## Task 17: Integration tests — full merge chain and game-over detection

**Files:**
- Create: `src/main.test.ts`

- [ ] **Step 1: Create integration test**

Write to `src/main.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createPhysicsEngine, createHeroBody, getHeroBodies } from './engine/physics';
import { tryMerge } from './engine/merger';
import { YAO_YAO_SCORE, DEATH_LINE_Y, GAME_OVER_DURATION_MS } from './constants';

describe('integration: full merge chain', () => {
  it('should produce tier-10 from repeated merges and handle Yao+Yao', () => {
    const engine = createPhysicsEngine();
    const a = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 100, y: 100 });
    const b = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 120, y: 100 });

    let result = tryMerge(engine.world, a, b, performance.now());
    expect(result.merged).toBe(true);
    expect(result.newHero?.tier).toBe(2);
    expect(result.score).toBe(10);

    let bodies = getHeroBodies(engine.world);
    expect(bodies).toHaveLength(1);
    expect((bodies[0] as any).heroTier).toBe(2);
  });

  it('Yao+Yao merge removes both bodies and awards 5000', () => {
    const engine = createPhysicsEngine();
    const a = createHeroBody(engine.world, { tier: 10, nameZh: 'Yao', radius: 45, x: 100, y: 100 });
    const b = createHeroBody(engine.world, { tier: 10, nameZh: 'Yao', radius: 45, x: 120, y: 100 });
    const result = tryMerge(engine.world, a, b, performance.now());
    expect(result.merged).toBe(true);
    expect(result.score).toBe(YAO_YAO_SCORE);
    expect(result.isYaoMerge).toBe(true);
    expect(getHeroBodies(engine.world)).toHaveLength(0);
  });
});

describe('integration: game-over detection', () => {
  it('triggers game over when body stays above death line for >1 second', () => {
    const engine = createPhysicsEngine();
    createHeroBody(engine.world, { tier: 1, nameZh: 'Test', radius: 20, x: 180, y: 20 });

    const deathTimers = new Map<number, number>();
    let gameOver = false;

    for (let elapsed = 0; elapsed < 1200; elapsed += 50) {
      for (const body of getHeroBodies(engine.world)) {
        const radius: number = (body as any).heroRadius ?? 0;
        const topEdge = body.position.y - radius;
        if (topEdge < DEATH_LINE_Y) {
          const current = deathTimers.get(body.id) ?? 0;
          const updated = current + 50;
          deathTimers.set(body.id, updated);
          if (updated >= GAME_OVER_DURATION_MS) { gameOver = true; break; }
        } else {
          deathTimers.set(body.id, 0);
        }
      }
      if (gameOver) break;
    }

    expect(gameOver).toBe(true);
  });
});
```

- [ ] **Step 2: Run integration tests**

Run:
```
npx vitest run
```

Expected: All tests pass including the new integration tests.

- [x] **Step 3: Commit**

```bash
git add src/main.test.ts
git commit -m "test: integration tests for merge chain and game-over detection"
```

---

## Task 18: Verify spawn-blocked retry logic

**Files:**
- Verify: `src/main.ts` (already implemented in Task 7 with live body list)

- [ ] **Step 1: Verify trySpawn uses live hero body list**

In `src/main.ts`, the `trySpawn` inner function should call `getHeroBodies(engine.world)` to get the current state, not use a stale closure variable. Verify:

```ts
      const currentHeroes = getHeroBodies(engine.world);
      const reBlocked = currentHeroes.some(b => { ... });
```

- [ ] **Step 2: Verify max retries triggers game over**

Check that after `SPAWN_MAX_RETRIES` (3) retries, `endGame()` is called:
```ts
      } else if (retries >= SPAWN_MAX_RETRIES) {
        endGame();
      }
```

- [x] **Step 3: Manual test**

Run `npm run dev`, start a game, and try to fill the container completely. After the container is too full to spawn, the game should end with "游戏结束" panel after a few retry attempts.

- [x] **Step 4: Commit (if any fixes)**

(Skip if no changes.)

---
## Task 19: Verify Chinese font rendering and font stack consistency

**Files:**
- Verify: `src/rendering/canvas.ts`, `src/rendering/hud.ts`, `src/ui/menu.ts`, `src/ui/gameover.ts`

- [ ] **Step 1: Check all font assignments use FONT_STACK**

Run a grep to verify:
```
grep -rn "ctx.font" src/ | grep -v FONT_STACK | grep -v node_modules
```

Expected: No occurrences (or only in comments). All `ctx.font` assignments should use the `${fontSize}px ${FONT_STACK}` pattern.

- [ ] **Step 2: Verify font fallback order**

Check that `FONT_STACK` in `src/constants.ts` is:
```ts
export const FONT_STACK = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "WenQuanYi Micro Hei", sans-serif';
```

This covers iOS (PingFang SC), Windows (Microsoft YaHei), Android (Noto Sans SC), and Linux (WenQuanYi Micro Hei) with a final sans-serif fallback.

- [x] **Step 3: Manual test on different devices/platforms**

Run `npm run dev` and test on:
1. Desktop Chrome/Firefox — Chinese text renders correctly
2. Android Chrome (or emulator) — no tofu characters
3. If available, iOS Safari — text is legible

- [x] **Step 4: Commit (if any fixes)**

(Skip if no changes.)

---

## Task 20: Production build and final integration polish

**Files:**
- Modify: `.gitignore` (add dist/)
- Verify: `src/main.ts` (ensure no debug code left)

- [ ] **Step 1: Verify .gitignore includes dist/**

Check `.gitignore` contains:
```
node_modules/
dist/
.DS_Store
*.local
```

If `dist/` is missing, append it.

- [ ] **Step 2: Run production build**

Run:
```
npm run build
```

Expected: 
- TypeScript compilation succeeds
- Vite produces output in `dist/` directory
- `dist/index.html` exists
- `dist/assets/` contains bundled JS and CSS

- [x] **Step 3: Verify production build output**

Run:
```
ls dist/
ls dist/assets/
```

Check that:
- `dist/index.html` references the correct relative asset paths
- No source maps in production (unless configured)
- Bundle size is reasonable (<500KB for initial load excluding audio)

- [x] **Step 4: Test production build locally**

Run:
```
npx vite preview
```

Open the preview URL and verify:
1. Start menu renders correctly
2. Clicking "开始游戏" starts the game
3. Heroes can be dropped and merge
4. Score updates on merge
5. Game over triggers when hero stays above death line
6. Leaderboard displays on game over
7. "再来一局" restarts the game
8. "返回主页" returns to menu
9. Mute toggle works
10. Voice lines play on drop and merge (if audio files exist)

- [x] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "build: production build verification and .gitignore cleanup"
```

---

## Task 21: Manual testing checklist walkthrough

**No code changes — verification only.**

- [ ] **Step 1: Desktop browser testing**

Open the preview or dev server in Chrome/Edge:
- [ ] Start menu displays with title "合成大timi" and button "开始游戏"
- [ ] Clicking start button initializes the game
- [ ] Heroes can be dropped by clicking at desired X position
- [ ] Two identical heroes touching merge into next tier
- [ ] Score increments on merge
- [ ] Mute button in HUD top-right toggles when tapped
- [ ] Game over triggers when hero body stays above dashed red line for >1 second
- [ ] Game-over panel shows final score, leaderboard, and buttons
- [ ] "再来一局" restarts gameplay
- [ ] "返回主页" returns to menu
- [ ] Leaderboard persists across page reloads

- [ ] **Step 2: Mobile browser testing**

Open on a mobile device (or Chrome DevTools mobile emulation):
- [ ] Touch input works — tap to position, release to drop
- [ ] Multi-touch does not cause zoom or scroll (touch-action: none prevents this)
- [ ] Canvas scales to fit viewport in portrait orientation
- [ ] No horizontal scrolling
- [ ] All UI text is readable at mobile scale
- [ ] Buttons are large enough to tap comfortably

- [x] **Step 3: Audio verification**

- [ ] On first game start, AudioContext is created (browser console confirms no autoplay errors)
- [ ] Dropping a hero plays a random voice line for that hero
- [ ] Merging two heroes plays a random voice line for the new hero
- [ ] 甄姬 merge occasionally (20% chance) plays special BGM instead of voice
- [ ] If `public/audio/bgm.mp3` exists, background music plays
- [ ] Mute toggle stops all audio; unmute restores
- [ ] If audio files are missing for a hero, no error is thrown (silent skip)

- [x] **Step 4: Performance verification**

- [ ] With 20+ hero bodies on screen, frame rate stays near 60 FPS
- [ ] No memory leaks after multiple game restart cycles (check browser task manager)
- [ ] Particle effects do not cause visible frame drops
- [ ] Canvas rendering uses hardware acceleration (check in Chrome DevTools rendering panel)

- [x] **Step 5: Edge cases and error handling**

- [ ] localStorage unavailable: game still works (scores/leaderboard just not persisted)
- [ ] Reload page mid-game: game resets to menu (expected behavior)
- [ ] Browser back button: game resets to menu on return
- [ ] Very fast clicking: game handles gracefully, no crashes or duplicate spawns
- [ ] Window resize during gameplay: canvas rescales, physics continues correctly
- [ ] Missing hero avatar images: bubble falls back to text-only display

- [x] **Step 6: Final commit with version bump**

```bash
# If all tests pass, update package.json version if desired
git add -A
git commit -m "release: v1.0.0 - full manual testing checklist passed"
```

---

## Summary

This plan covers 23 tasks that build the complete "合成大timi" merge game from scratch. Each task is self-contained with exact file paths, complete code, expected outputs, and verification steps. The implementation order is:

1. **Scaffolding** (Task 1): Project setup with Vite + TypeScript
2. **Core Data** (Task 2): Constants, hero definitions, theme colors
3. **Core Engine** (Tasks 3-5): Physics, spawner, merger with unit tests
4. **Rendering** (Task 6): Canvas rendering for backgrounds and hero bubbles
5. **Integration** (Task 7): Main game loop connecting all systems
6. **Persistence** (Task 8): localStorage leaderboard with tests
7. **UI** (Tasks 9-10): Start menu and game-over panel
8. **Audio** (Tasks 11-12): Download script and Web Audio playback
9. **Verification** (Tasks 13-19): Compilation, tests, animation verification, input handling, scaling, integration tests
10. **Polish** (Tasks 20-21): Production build, manual testing checklist
11. **Final Fixes** (Tasks 22-23): Drag preview rendering, BGM loading independence

**Total files created:** 24 source files + 2 config files + index.html

**Test coverage:** Constants, physics body factory, spawner probabilities, merge logic, localStorage storage, merge chain integration, game-over detection.
## Task 22: Drag preview — render drop position indicator during drag

**Files:**
- Modify: `src/rendering/canvas.ts` (add preview rendering function)
- Modify: `src/main.ts` (call preview renderer during drag)

- [ ] **Step 1: Add drawDragPreview function to canvas.ts**

Edit `src/rendering/canvas.ts` — append the following export at the end of the file (before any existing closing lines):

```ts
/** Draw a semi-transparent preview of the hero about to be dropped. */
export function drawDragPreview(ctx: CanvasRenderingContext2D, hero: HeroDefinition, x: number, y: number): void {
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawHeroBubbleForHero(ctx, hero, x, y);
  ctx.restore();
}

/** Internal: draw a hero bubble at a given position (used by preview and normal rendering). */
function drawHeroBubbleForHero(ctx: CanvasRenderingContext2D, hero: HeroDefinition, x: number, y: number): void {
  const radius = hero.radius;
  const color = hero.color;
  const nameZh = hero.nameZh;
  const nameEn = hero.nameEn;
  const tier = hero.tier;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, darkenColor(color, 0.5));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  const basePath = getHeroImagePath(tier, nameEn);
  const img = imageCache.get(`${basePath}.png`) ?? imageCache.get(`${basePath}.jpg`);
  if (img) {
    ctx.globalAlpha = 0.8;
    ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1.0;
  }

  ctx.strokeStyle = COLOR_WHITE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  const fontSize = getFontSize(radius);
  ctx.font = `${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillText(nameZh, x + 1, y + 1);
  ctx.fillStyle = COLOR_WHITE;
  ctx.fillText(nameZh, x, y);

  ctx.restore();
}
```

- [ ] **Step 2: Integrate drag preview into main.ts game loop**

In `src/main.ts`, add the import:

Find:
```ts
import { initCanvas, clearCanvas, drawBackground, drawDeathLine, drawHeroBodies, preloadHeroImage } from './rendering/canvas';
```

Replace with:
```ts
import { initCanvas, clearCanvas, drawBackground, drawDeathLine, drawHeroBodies, preloadHeroImage, drawDragPreview } from './rendering/canvas';
```

In the game loop function, add preview rendering AFTER `drawHeroBodies` and BEFORE `drawHUD`. Find:
```ts
  drawHeroBodies(ctx, engine.world);
  drawParticles(ctx);
  drawPopAnimations(ctx);
```

Replace with:
```ts
  drawHeroBodies(ctx, engine.world);
  drawParticles(ctx);
  drawPopAnimations(ctx);

  // Draw drag preview (semi-transparent hero at drop position)
  if (isDragging && nextHero) {
    const previewX = clampSpawnX(currentPreviewX, nextHero.radius);
    const previewY = HUD_HEIGHT + nextHero.radius; // Just below the HUD
    drawDragPreview(ctx, nextHero, previewX, previewY);
  }
```

Also add the `HUD_HEIGHT` import. Find:
```ts
import { CONTAINER_WIDTH, CONTAINER_HEIGHT, DEATH_LINE_Y, GAME_OVER_DURATION_MS, MAX_DELTA_MS,
  SPAWN_RETRY_MS, SPAWN_MAX_RETRIES, LS_HIGH_SCORE, LS_MUTED, GameScene, getHeroByTier, HeroDefinition,
} from './constants';
```

Replace with:
```ts
import { CONTAINER_WIDTH, CONTAINER_HEIGHT, HUD_HEIGHT, DEATH_LINE_Y, GAME_OVER_DURATION_MS, MAX_DELTA_MS,
  SPAWN_RETRY_MS, SPAWN_MAX_RETRIES, LS_HIGH_SCORE, LS_MUTED, GameScene, getHeroByTier, HeroDefinition,
} from './constants';
```

- [x] **Step 3: Verify TypeScript compilation**

Run:
```
npx tsc --noEmit
```

Expected: No errors.

- [x] **Step 4: Manual test**

Run `npm run dev`, start a game. While dragging (mouse down), a semi-transparent preview of the next hero should appear below the HUD, tracking the mouse X position.

- [x] **Step 5: Commit**

```bash
git add src/rendering/canvas.ts src/main.ts
git commit -m "feat: drag preview showing semi-transparent hero at drop position during drag"
```

---

## Task 23: BGM loading fix — ensure BGM loads regardless of tier preloading order

**Files:**
- Modify: `src/audio/audio.ts` (fix BGM loading to be independent of tier-4 preload)

- [ ] **Step 1: Fix BGM loading in audio.ts**

In `src/audio/audio.ts`, the BGM loading code is currently inside `preloadHeroAudio` under a `tier === 4` check. Move the BGM loading to a separate function and call it from `startGame()`.

Read `src/audio/audio.ts`. Find the BGM loading block inside `preloadHeroAudio`:
```ts
  // Background BGM
  try {
    const response = await fetch(`audio/${BGM_FILE}`);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      buffers.set(BGM_FILE, audioBuffer);
    }
  } catch {
    // BGM file not provided
  }
```

Note: The BGM loading code might actually not be in the tier-4 branch in the current implementation — let me check. In the code from Task 12... Actually, looking at the audio.ts I wrote in Task 12, the Zhen Ji BGM loading IS inside the `if (tier === 4)` block, but the background BGM (bgm.mp3) loading is NOT in the file — it's missing entirely! 

Add the BGM loading code to the `preloadAllAudio` function or create a separate `preloadBGM` function. Edit `src/audio/audio.ts` — append this function before the closing of the file:

```ts
/** Preload the background music track. */
async function preloadBGM(): Promise<void> {
  if (!audioCtx) return;
  try {
    const response = await fetch(`audio/${BGM_FILE}`);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      buffers.set(BGM_FILE, audioBuffer);
    }
  } catch {
    // BGM file not provided
  }
}
```

Then modify `preloadAllAudio` to also call `preloadBGM`. Find:
```ts
export async function preloadAllAudio(): Promise<void> {
  for (const hero of HERO_CHAIN) await preloadHeroAudio(hero.tier);
}
```

Replace with:
```ts
export async function preloadAllAudio(): Promise<void> {
  for (const hero of HERO_CHAIN) await preloadHeroAudio(hero.tier);
  await preloadBGM();
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run:
```
npx tsc --noEmit
```

Expected: No errors.

- [x] **Step 3: Commit**

```bash
git add src/audio/audio.ts
git commit -m "fix: BGM preloading independent of hero tier preload order"
```

---
