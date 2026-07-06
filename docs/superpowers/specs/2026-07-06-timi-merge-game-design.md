# 合成大timi — Design Specification

**Date:** 2026-07-06
**Status:** Approved
**Author:** superpowers-spec-writer

## Goal

A browser-based physics merge game themed around Honor of Kings (王者荣耀) hero characters. Players drop circular hero avatars into a vertically oriented physics container. When two identical heroes collide, they merge into the next-tier hero. The objective is to chain merges all the way to the ultimate hero, 瑶 (Yao, tier 10). The game is mobile-first, portrait orientation, and deploys as pure static files with no backend server required.

## Non-Goals

- Multiplayer or online leaderboards — all data is local (localStorage)
- Server-side rendering or backend APIs
- User authentication or accounts
- In-app purchases or monetization
- Custom skin systems or hero skins beyond the base avatar images
- Browser compatibility below modern evergreen browsers (Chrome 90+, Firefox 90+, Safari 15+)
- Horizontal/landscape orientation support — portrait only
- Accessibility beyond basic touch/click input parity
- Animations beyond simple particle effects and pop animations on merge
- Internationalization — all UI text is in Simplified Chinese

## Context

The project workspace is an empty directory at `/home/mercury/timi2`. No prior code exists. The user has provided a voice line selection file (`hero-voice-selection.md`) specifying which audio clips to download from Tencent's official CDN for each hero, and will provide hero portrait images and a custom BGM track for 甄姬 (Zhen Ji). The 海诺 (Hai Nuo, tier 6) hero has no API voice data and requires user-supplied audio files.

The game follows the proven formula of "合成大西瓜" (Suika Watermelon Game) but replaces generic fruit with themed hero characters from a popular Chinese MOBA. The merge chain, scoring, spawning probabilities, visual theme, and audio are all custom-designed for this theme.

Node.js v24.18.0 and npm 11.16.0 are available in the environment. The project will use Vite for development and bundling.

## Proposed Architecture

### Technology Stack

| Concern | Technology | Rationale |
|---------|-----------|-----------|
| Build tool | Vite 5+ | Fast dev server with HMR, zero-config TypeScript support, optimized production builds |
| Language | TypeScript 5+ | Type safety for hero data, merge logic, and physics interactions |
| Physics engine | Matter.js 0.20+ | Mature 2D physics engine with collision detection, gravity, and body management |
| Rendering | Canvas 2D API | Direct control over drawing hero bubbles, backgrounds, HUD elements; no DOM overhead for game objects |
| Audio | Web Audio API | Low-latency playback, precise control over multiple simultaneous sounds |
| Persistence | localStorage | Leaderboard storage with no backend dependency |
| Deployment | Static HTML + JS | Single `index.html` loads the Vite bundle; hostable on any static file server |

**Why Matter.js over a custom physics engine:** The merge game requires reliable collision detection between circular bodies and stable stacking behavior. Matter.js provides both out of the box with a well-tested engine. Writing a custom verlet physics engine would add significant complexity and risk without benefit for this scope.

**Why Canvas 2D over DOM/CSS rendering:** DOM-based rendering of hundreds of potentially overlapping hero bubbles would cause layout thrashing. Canvas gives pixel-level control and consistent frame rates. The visual style (gradient circles with text labels overlaid on a solid background) is straightforward to implement with Canvas primitives.

**Why Vite over webpack or no bundler:** TypeScript compilation, asset hashing for cache-busting, and development HMR are all zero-config with Vite. The production build produces optimized, tree-shaken output suitable for static deployment.

### Data Flow

```
User Input (click/tap/drag/release)
        │
        ▼
┌──────────────┐     ┌─────────────────┐
│  spawner.ts   │────▶│  physics.ts      │
│  (next hero)  │     │  (Matter.js      │
│               │     │   world step)    │
└──────────────┘     └────────┬────────┘
                              │ collision events
                              ▼
                     ┌─────────────────┐
                     │  merger.ts       │
                     │  (detect same-   │
                     │   tier pairs,    │
                     │   remove old,    │
                     │   create merged) │
                     └────────┬────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  audio.ts     │    │ animations.ts│    │  storage.ts   │
│  (play drop/  │    │ (particle    │    │ (update       │
│   merge sound)│    │  effects)    │    │  score)       │
└──────────────┘    └──────────────┘    └──────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  canvas.ts       │
                     │  (main draw loop │
                     │   via RAF)       │
                     └─────────────────┘
```

The game loop runs on `requestAnimationFrame`:
1. Step Matter.js world forward by 16.67ms (assuming 60 FPS, using actual delta time)
2. Check for new Matter.js collision events since last step
3. Process merges for any same-tier hero pairs that are colliding
4. Check game-over condition (any hero body's top edge above the death line for >1 second)
5. Render: clear canvas, draw background, draw container, draw all hero bodies, draw HUD overlay
6. Process animation queue (spawn particles, decay existing particles)

### Physics Configuration

Matter.js world parameters set once at initialization:

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| Gravity Y | 1.5 | Stronger than default (1.0) to make heroes fall at a satisfying pace on mobile screens |
| Container width | 360px | Mobile-first portrait width; matches common design width (e.g., iPhone SE to iPhone 14) |
| Container height | 640px | Gives enough vertical space for stacking before game over |
| Restitution | 0.3 | Heroes bounce softly off walls and each other; not perfectly elastic, not dead |
| Friction | 0.1 | Low friction so heroes slide gently along container walls and over each other |
| Friction Air | 0.01 | Minimal air resistance so dropped heroes accelerate naturally |
| Game-over line Y | 35px | Measured from the top of the physics container; any hero body whose top edge is above this line for >1 continuous second triggers game over |

The container is bounded by three static wall bodies (left, right, bottom) — no top wall, since heroes are dropped from above. The game-over line is a logical threshold (not a physical body); it is checked in the game loop by inspecting body positions.

### Hero Merge Chain

Heroes are defined in a fixed 10-tier array. Each hero has:

- **tier**: 1–10 (index in the merge chain)
- **name_zh**: Chinese display name
- **name_en**: English name (for internal reference)
- **hero_id**: Official Honor of Kings hero ID (used for audio API lookups)
- **color**: Primary hex color for the bubble gradient
- **radius**: Circle radius in pixels for the rendered body
- **score**: Points awarded when this hero is created via merging (not on initial spawn)

| Tier | Name (ZH) | Name (EN) | Hero ID | Color | Radius | Score |
|------|-----------|-----------|---------|-------|--------|-------|
| 1 | 马可波罗 | Marco Polo | 132 | #4A90D9 | 20px | — |
| 2 | 干将莫邪 | Gan Jiang Mo Ye | 182 | #7B68EE | 23px | 10 |
| 3 | 铠 | Kai | 193 | #4169E1 | 26px | 20 |
| 4 | 甄姬 | Zhen Ji | 127 | #00CED1 | 28px | 40 |
| 5 | 云缨 | Yun Ying | 538 | #FF6347 | 31px | 80 |
| 6 | 海诺 | Hai Nuo | 563 | #9932CC | 34px | 160 |
| 7 | 虞姬 | Yu Ji | 174 | #32CD32 | 37px | 320 |
| 8 | 小乔 | Xiao Qiao | 106 | #FF69B4 | 39px | 640 |
| 9 | 蔡文姬 | Cai Wen Ji | 184 | #FFD700 | 42px | 1280 |
| 10 | 瑶 | Yao | 505 | #FF1493 | 45px | 2560 |

**Score formula:** `score = 10 * 2^(tier - 2)` for tiers 2–10. Tier 1 awards no score on spawn (heroes spawn at tiers 1–4). The 瑶+瑶 edge case awards a flat 5000 points instead, since there is no tier 11 to merge into.

**Radius formula:** `radius = 20 + (tier - 1) * (25 / 9)` — linear interpolation from 20px (tier 1) to 45px (tier 10), with intermediate radii rounded to the nearest integer pixel. The staggered radius makes higher-tier heroes visibly larger and more imposing in the container.

### Bubble Visual Design

Each hero is rendered as a filled circle with:
- A linear gradient from the hero's color (center) to a darker shade of that color (edge)
- A 2px white border stroke
- The hero's Chinese name centered in white text with a 1px dark text-shadow for readability
- A hero avatar image (from `public/heroes/`) centered and masked/clipped to the circle, rendered with 80% opacity beneath the text overlay
- Font sizes scale with radius: 10px for tiers 1–3, 12px for tiers 4–7, 14px for tiers 8–10

If the hero avatar image fails to load (missing file, 404), the bubble falls back to showing just the hero name centered without the image — the gradient and name are always visible.

**Hero image naming convention:** Avatar images are placed in `public/heroes/` with the naming pattern `{tier_2digit}-{name_en_lowercase}.png`, producing filenames: `01-makeboluo.png`, `02-ganjiangmoye.png`, `03-kai.png`, `04-zhenji.png`, `05-yunying.png`, `06-hainuo.png`, `07-yuji.png`, `08-xiaoqiao.png`, `09-caiwenji.png`, `10-yao.png`. The game code also supports `.jpg` as a fallback extension (tries `.png` first, then `.jpg`). Images may be either PNG or JPEG format; the game handles both transparent and opaque images by drawing them within the circular clip region.

### Game Container Visual Design

- **Outer page background**: Solid `#fce4ec` (light pink)
- **Game container background**: Vertical gradient from `#fff5f7` (top, near-white pink) to `#f8bbd0` (bottom, soft rose)
- **Container border**: 2px solid `#e91e63` (rose pink accent), 8px border-radius
- **Container dimensions**: 360px × 640px (the physics world and visible render area are identical — no scrolling)
- **Death line indicator**: A dashed red line at Y=35px from the container top, labeled "危险线" in small text
- **Container positioning**: Centered horizontally on the viewport, top-aligned with 20px top margin on mobile

### HUD Panel Design

A visual overlay at the top of the game container, rendered on the Canvas as part of the main draw loop:

- **Style**: Semi-transparent white (`rgba(255, 255, 255, 0.85)`) with a frosted glass effect simulated by drawing a filled rect at 85% opacity over the game area, plus a subtle horizontal gradient band at the panel's bottom edge to suggest a blur boundary
- **Contents**: Current score (left), high score (center), next hero preview (right)
- **Next hero preview**: Renders a small version (15px radius) of the upcoming hero bubble with its name
- **Height**: 60px, spans the full container width
- **Position**: Occupies canvas coordinates y=0 to y=60 within the 360×640 container. This is a purely visual overlay — it does NOT affect the physics world. Hero bodies can exist and move behind the HUD; the death line at y=35 sits within the HUD's visual area, meaning bodies are only visible through the semi-transparent panel until they cross below y=60

The HUD is rendered on the Canvas as part of the main draw loop, not as a DOM overlay. This avoids z-index and event handling conflicts with the game container. Since the HUD is not a DOM element, the frosted glass effect is simulated with Canvas alpha compositing rather than a CSS filter.

### Spawning System

Spawnable tiers are limited to tiers 1–4 with weighted probabilities:

| Tier | Hero | Probability |
|------|------|-------------|
| 1 | 马可波罗 | 40% |
| 2 | 干将莫邪 | 30% |
| 3 | 铠 | 20% |
| 4 | 甄姬 | 10% |

Tiers 5–10 are never spawned directly; they can only be created through merging.

**Spawn position logic:**
- The player taps or clicks anywhere on the game container. A preview of the upcoming hero appears at the top of the container, tracking the input X position but remaining at a fixed Y near the top.
- The spawn X position is clamped to `[hero_radius, container_width - hero_radius]` so the hero never spawns partially outside the container.
- The spawn Y position is fixed at 20px above the container top boundary (y = -20 in physics coordinates, above the visible canvas area). The hero drops from this off-screen position into the visible container.
- On release (mouseup / touchend), the hero body is created in the Matter.js world at the clamped X position with the fixed drop Y, and gravity pulls it into the visible container.
- The previous "next hero" becomes the dropped hero, and a new "next hero" is pre-generated for the HUD preview.

**Edge case — container too full to spawn:** If the spawn position is occupied (the hero body would immediately overlap with existing bodies), the spawn is delayed by 100ms and retried. If still blocked after 3 retries (300ms total), the game ends as game over.

### Merge Logic

The merger runs on every collision event from Matter.js:

1. When two bodies collide, check if both are hero bodies (identified by a `heroTier` property attached to each Matter.js body)
2. If both have the same `heroTier` value, they are eligible for merge
3. Mark both bodies for removal (they are removed from the Matter.js world at the end of the current physics step to avoid mid-step mutation)
4. If the tier is 10 (瑶+瑶), no new body is created; award 5000 points and play the 瑶 merge sound
5. If the tier is 1–9, create a new hero body of `tier + 1` at the midpoint of the two collided bodies' positions
6. Award score for the merge
7. Trigger particle animation at the merge point
8. Play the new hero's merge voice line

**Duplicate merge prevention:** Each hero body carries a merge cooldown flag. Once a body participates in a merge, its cooldown is set for 500ms. During cooldown, that body cannot initiate another merge. This prevents a single hero from chain-merging through multiple tiers in a single frame or from re-merging with a body that was already queued for removal.

**Stable stacking after merge:** The new merged body is created at the average position of the two removed bodies. It inherits the combined velocity (averaged). Since the new body is larger (higher tier = larger radius), it naturally pushes adjacent bodies outward through Matter.js's normal collision resolution, preventing bodies from being permanently trapped inside each other.

### Game Over Condition

The game-over check runs every frame:

1. Iterate all hero bodies in the Matter.js world
2. For each body, calculate its top edge: `body.position.y - heroRadius`
3. If `topEdge < 35` (death line Y), increment a per-body timer tracking consecutive time above the line
4. If any body's timer exceeds 1000ms (1 second), trigger game over
5. If the body moves back below the line (topEdge >= 35), reset its timer to 0

This grace period prevents false game-overs from brief bounces during merges near the top of the container.

**What happens on game over:**
- Matter.js world stops stepping
- Existing bodies are frozen in place (bodies set to `isStatic: true` so they don't shift further)
- A semi-transparent overlay is rendered on the Canvas
- The game-over panel is displayed with: final score, "NEW RECORD!" indicator (if applicable), leaderboard (top 5), and a "再来一局" (Play Again) button

### Scoring System

| Event | Points |
|-------|--------|
| Merge to tier 2 (干将莫邪) | 10 |
| Merge to tier 3 (铠) | 20 |
| Merge to tier 4 (甄姬) | 40 |
| Merge to tier 5 (云缨) | 80 |
| Merge to tier 6 (海诺) | 160 |
| Merge to tier 7 (虞姬) | 320 |
| Merge to tier 8 (小乔) | 640 |
| Merge to tier 9 (蔡文姬) | 1280 |
| Merge to tier 10 (瑶) | 2560 |
| 瑶 + 瑶 merge | 5000 |

Spawned heroes (initial drops) award 0 points. Only merges generate score.

The score is displayed in real-time on the HUD during gameplay and prominently on the game-over panel.

### Leaderboard System

- **Storage**: `localStorage` key `timi2_leaderboard`
- **Format**: JSON array of up to 5 records, each with `{ score: number, date: string (ISO 8601), hasYao: boolean }`
- **Insertion**: After game over, if the player's score qualifies for the top 5 (or if fewer than 5 records exist), insert the new record, sort descending by score, trim to 5
- **Display**: On the game-over panel, a table with columns: Rank, Score, Date (formatted as YYYY-MM-DD), Yao Merged? (✓ or ✗)
- **Edge case — corrupted data**: On read, validate the JSON structure. If invalid or unparseable, reset to an empty array and log a warning to console. No user-facing error is shown.

### Audio System

#### Voice Line Sources

Voice lines for 9 of the 10 heroes are downloaded from Tencent's official CDN at `https://game.gtimg.cn/images/yxzj/zlkdatasys/audios/audio/...`. The script at `scripts/download-audio.ts` automates this download.

The `hero-voice-selection.md` file documents which specific voice lines are selected (marked with `[x]`). The download script reads this file, extracts all marked URLs, and downloads each to `public/audio/{hero_id}-{index}.wav` (or `.mp3` as appropriate).

**Selected voice lines per hero (from hero-voice-selection.md):**

| Tier | Hero | Selected Selections | Count |
|------|------|---------------------|-------|
| 1 | 马可波罗 | #8, #9, #16, #17 | 4 |
| 2 | 干将莫邪 | #5, #15, #23 | 3 |
| 3 | 铠 | #13, #37 | 2 |
| 4 | 甄姬 | #9, #12, #13 | 3 |
| 5 | 云缨 | #6, #11, #31, #33, #35, #38, #50 | 7 |
| 6 | 海诺 | *No API data — user provides files* | — |
| 7 | 虞姬 | #3, #8, #15 | 3 |
| 8 | 小乔 | #1, #2, #3, #11, #13 | 5 |
| 9 | 蔡文姬 | #2, #9, #12, #15 | 4 |
| 10 | 瑶 | #4, #10, #12, #15 | 4 |

The download script must handle both `.wav` and `.mp3` URLs (both appear in the selection file). Files are saved with a normalized naming convention: `{hero_id}-v{index}.{ext}`.

#### User-Provided Audio

**海诺 (Tier 6):** The official API returns no voice data for hero ID 563. The user manually places audio files in `public/audio/563-v1.wav` through `public/audio/563-vN.wav`. The game loads whatever files are present in that directory matching the pattern.

**甄姬 BGM:** The user provides a custom BGM file at `public/audio/zhenji-bgm.mp3` (exact filename). When 甄姬 is created via merge, this BGM has a 20% chance to play instead of (or in addition to) a standard voice line. The BGM plays once and does not loop.

**Background BGM:** An optional looping background music track. If present at `public/audio/bgm.mp3`, it auto-plays on game start with a mute toggle button in the HUD. The mute state is persisted to localStorage (`timi2_muted`) and respected across sessions.

#### Playback Rules

| Trigger | Audio |
|---------|-------|
| Hero dropped (spawn) | Randomly select one voice line from the dropped hero's pool and play |
| Heroes merge (tiers 1–9) | Randomly select one voice line from the **newly created** hero's pool and play |
| 瑶 + 瑶 merge | Randomly select one voice line from 瑶's pool and play |
| 甄姬 merge (special) | 20% chance to play `zhenji-bgm.mp3`; otherwise play a random 甄姬 voice line |

If a hero has no audio files available (missing downloads, user hasn't provided them yet), the game silently skips audio for that event — no error, no fallback sound. A console warning is logged on the first occurrence per hero per session.

#### Web Audio API Implementation

- **AudioContext**: Created once on first user interaction (click/tap on the start screen) to comply with browser autoplay policies
- **Decoding**: Audio files are fetched and decoded to `AudioBuffer` objects during a preload phase after the start screen
- **Playback**: `AudioBufferSourceNode` connected to a master `GainNode` for volume control
- **Concurrent sounds**: The system tracks active source nodes; a maximum of 3 simultaneous voice lines are allowed. If a 4th would play, the oldest active voice line is stopped early.
- **Volume**: Master volume at 0.8 (80%), adjustable via the mute toggle (0.0 or 0.8, not a continuous slider)

### Start Menu

The game boots to a start screen rendered on the same Canvas:

- Full-screen pink background matching the game
- Game title "合成大timi" in large rose-pink text with a subtle text-shadow
- A decorative subtitle: "王者荣耀英雄合成游戏"
- A single button: "开始游戏" (Start Game)
  - Styled as a rounded rectangle with rose-pink background (#e91e63), white text, 12px border-radius
  - On click/tap: fades out the start screen, initializes the Matter.js world, generates the first "next hero", and begins the game loop
- Footer: small version number text (e.g., "v1.0.0")

### Game Over Panel

Displayed as a Canvas overlay when the game ends:

- Semi-transparent dark overlay (`rgba(0, 0, 0, 0.6)`) over the frozen game
- White rounded rectangle panel in the center, 300px wide
- Final score in large text
- "NEW RECORD!" badge (pulsing animation) if the score beats the previous high score (from localStorage)
- Leaderboard table: Rank | Score | Date | 瑶合并?
- "再来一局" (Play Again) button — resets the entire game state and returns to gameplay (skips the start screen)
- "返回主页" (Back to Home) button — returns to the start screen

### Input Handling

The game supports both mouse and touch input:

- **Mouse**: `mousedown` starts positioning, `mousemove` moves the preview, `mouseup` drops the hero
- **Touch**: `touchstart` starts positioning, `touchmove` moves the preview, `touchend` drops the hero
- **Cancel prevention**: The container element has `touch-action: none` CSS to prevent browser gestures (scroll, zoom) from interfering with game input
- **No keyboard input** required during gameplay

Input events are bound to the Canvas element. Coordinates are translated from page coordinates to canvas-local coordinates accounting for any CSS scaling.

### Responsive Scaling

The game is designed at a fixed logical resolution of 360×640 (with HUD padding). On devices with different viewport sizes:

- The Canvas element is CSS-scaled to fit within the viewport while maintaining the 9:16 aspect ratio
- Scaling uses `object-fit: contain` equivalent logic implemented in JavaScript
- The Canvas internal resolution (width/height attributes) remains at 360×640 to avoid coordinate confusion in physics
- Minimum supported viewport: 320px wide (iPhone SE 1st gen)

### Performance Constraints

- Target frame rate: 60 FPS
- Maximum hero bodies in the world: approximately 30–40 before game over typically triggers
- Matter.js should be configured with `enableSleeping: true` to optimize bodies at rest
- The draw loop uses `requestAnimationFrame` with a delta-time cap of 33ms (preventing spiral-of-death if a frame takes too long)
- Particle effects are capped at 50 active particles; new particles discard the oldest if over the limit

## Files To Change

### New Files

| File | Purpose |
|------|---------|
| `index.html` | Single HTML entry point with Canvas element and minimal CSS |
| `package.json` | Project metadata, scripts, dependencies (vite, typescript, matter-js) |
| `tsconfig.json` | TypeScript configuration targeting ES2020, strict mode |
| `vite.config.ts` | Vite configuration for static build output |
| `src/main.ts` | Application entry point — boot sequence, scene management (menu/game/gameover) |
| `src/constants.ts` | All constant data: hero definitions (chain array), spawn probabilities, physics params, theme colors, score table |
| `src/engine/physics.ts` | Matter.js world creation, wall boundaries, gravity config, body factory (create hero body), game-over detection |
| `src/engine/merger.ts` | Collision event handler, same-tier detection, body removal and replacement, merge cooldown tracking |
| `src/engine/spawner.ts` | Weighted random hero selection (tiers 1–4), spawn position calculation, next-hero queue |
| `src/rendering/canvas.ts` | Main draw loop (`requestAnimationFrame`), background rendering, hero body rendering (gradient circle + name + avatar), scene orchestration |
| `src/rendering/animations.ts` | Particle system for merge effects (spawn, update, decay, render), pop/scale animation on merge |
| `src/rendering/hud.ts` | HUD overlay rendering: score display, high score, next hero preview, mute button |
| `src/audio/audio.ts` | Web Audio API manager: AudioContext init, buffer loading, voice line playback, BGM playback, volume/mute control, concurrent sound limiting |
| `src/leaderboard/storage.ts` | localStorage read/write for leaderboard (top 5 array) and mute preference |
| `src/ui/menu.ts` | Start screen rendering and input handling, "开始游戏" button |
| `src/ui/gameover.ts` | Game-over panel rendering, score display, leaderboard table, "再来一局" and "返回主页" buttons |
| `scripts/download-audio.ts` | One-shot Node.js script: parse hero-voice-selection.md for marked URLs, download files to public/audio/ |
| `public/heroes/.gitkeep` | Placeholder to ensure the heroes directory exists in the repo |
| `public/audio/.gitkeep` | Placeholder to ensure the audio directory exists in the repo |
| `.gitignore` | Ignore node_modules, dist, .DS_Store |

### Modified Files

None — this is a greenfield project in an empty directory.

### Files NOT Changed

| File | Reason |
|------|--------|
| `hero-voice-selection.md` | Read-only reference file; consumed by download script but not modified by the game |

## Testing Strategy

### Unit Tests (Vitest)

| Module | What to Test |
|--------|-------------|
| `constants.ts` | Hero chain array length is 10, radii increase monotonically, scores follow formula, spawn probabilities sum to 1.0 |
| `engine/spawner.ts` | Weighted random selection produces correct distribution over many iterations (chi-squared or threshold test), spawn position clamping respects container bounds |
| `engine/merger.ts` | Same-tier detection returns true/false correctly, merge produces correct tier+1 hero, 瑶+瑶 awards 5000 points and removes bodies without creating new body, merge cooldown prevents double-merge |
| `engine/physics.ts` | Body factory creates bodies with correct radius and collision category, game-over detection triggers after 1s above line and not for brief bounces |
| `leaderboard/storage.ts` | Insert into empty leaderboard, insert into full leaderboard (displaces lowest), sort order maintained, corrupted data resets to empty array |

### Integration Tests

| Scenario | Verification |
|----------|-------------|
| Full merge chain | Spawn two tier-1 heroes, force collision, verify tier-2 created, repeat through tier-10 |
| Game over detection | Place a body above the death line, advance time >1s, verify game-over flag set |
| Audio playback | Mock Web Audio API, verify correct source node created on drop and merge events |
| Start-to-gameover flow | Click "开始游戏", verify world initialized, simulate game-over, verify panel displays |

### Manual Testing Checklist

1. Game loads in Chrome, Firefox, Safari (desktop and mobile)
2. Touch input works on iOS Safari and Android Chrome
3. Heroes drop and stack with realistic physics
4. Two identical heroes touching merge into next tier
5. Score updates correctly on each merge
6. Game over triggers when hero stays above death line
7. Leaderboard persists across page reloads
8. Mute toggle works and persists
9. Voice lines play on drop and merge (where audio exists)
10. Game plays smoothly at 60 FPS with 30+ bodies on screen
11. Responsive scaling works on viewport widths from 320px to 428px

### Testing Dependencies

- **Vitest** for unit/integration tests (Vite-native, shares config)
- **happy-dom** for lightweight DOM/Canvas mocking in tests
- No end-to-end framework needed — the game is simple enough for manual e2e verification

## Risks And Mitigations

### Risk 1: Matter.js Body Explosion on Merge

**Risk:** When two large bodies merge into an even larger body at their midpoint, the new body may overlap with several existing bodies. Matter.js's collision resolution could apply large forces, causing bodies to "explode" outward violently, breaking the game's stacking stability.

**Mitigation:**
- Apply a velocity damping factor (0.3) to the newly created merged body, reducing its initial velocity to 30% of the average of the two source bodies
- Use Matter.js's `Body.setPosition` rather than relying on physics to separate overlapping bodies; after creating the new body, run a one-time overlap resolution by iterating nearby bodies and nudging them outward
- Run 3 extra physics sub-steps at low time-scale after each merge to let the world settle before the next frame
- Cap the maximum velocity of any hero body at 15 units/frame to prevent launch-away scenarios

### Risk 2: Audio Download Script Fragility

**Risk:** The `scripts/download-audio.ts` script parses `hero-voice-selection.md` to extract URLs. If the markdown format changes (e.g., the user adds or rearranges lines), the regex-based parsing could fail silently, download nothing, or download wrong files.

**Mitigation:**
- Use explicit URL pattern matching (`https://game.gtimg.cn/images/yxzj/zlkdatasys/audios/audio/...`) rather than relying on markdown structure
- Validate each downloaded file: check HTTP status is 200, Content-Type is audio/*, file size > 0 bytes
- Generate a summary report after download: files downloaded, failed, skipped (already exists)
- The download script is idempotent — running it multiple times only downloads missing files
- Add a `--dry-run` flag to preview what would be downloaded without making network requests

### Risk 3: Canvas Text Rendering for Chinese Characters

**Risk:** Canvas 2D text rendering for Chinese characters depends on system fonts being available. On some devices (particularly older Android), the default sans-serif fallback may not render Chinese characters cleanly, resulting in tofu (□) or poor kerning.

**Mitigation:**
- Specify a font stack in Canvas `font` property: `'14px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "WenQuanYi Micro Hei", sans-serif'`
- The bubble size is large enough (minimum 20px radius) that even 10px text should be legible
- If hero avatar images are present, the name text is supplementary; the game remains playable even if text is imperfect
- Test rendering on an Android emulator during manual QA

### Risk 4: localStorage Quota Exceeded

**Risk:** While leaderboard data is tiny (~500 bytes), localStorage can be full from other sites or browser privacy settings can block it entirely (Safari ITP in private mode).

**Mitigation:**
- Wrap all localStorage operations in try/catch blocks
- On write failure: log a console warning, game continues without persistence (score and leaderboard are memory-only for this session)
- On read failure or corruption: reset to empty/default state
- Never crash or block gameplay due to storage failures

### Risk 5: Web Audio API Autoplay Restrictions

**Risk:** Modern browsers block audio playback until a user gesture (click/tap). If audio is initialized too early, all sounds will be silent, and the AudioContext may be permanently suspended.

**Mitigation:**
- Create the `AudioContext` only on the first user click (the "开始游戏" button)
- Call `audioContext.resume()` after user gesture
- If AudioContext is in "suspended" state after creation, show a subtle "🔇" indicator on the HUD and wait for the next user interaction to resume
- The game is fully playable without audio — audio is an enhancement, not a requirement

## Decision Summary

- **Platform**: Web browser, mobile-first portrait, Vite + TypeScript + Matter.js + Canvas 2D, pure static deployment
- **Physics**: Matter.js world at 360×640, gravity 1.5, restitution 0.3, friction 0.1
- **Merge chain**: 10-tier fixed hero array; 马可波罗 (tier 1) → 瑶 (tier 10)
- **Spawning**: Tiers 1–4 only, with weighted probabilities (40/30/20/10)
- **Scoring**: Exponential formula `10 × 2^(tier - 2)` for tiers 2–10, 瑶+瑶 awards 5000
- **Game over**: Any hero body above 35px line for >1 second
- **Audio**: Voice lines from Tencent CDN, downloaded via script, played on drop and merge; 甄姬 special BGM; 海诺 requires user-provided files
- **Leaderboard**: localStorage, top 5, records score + date + 瑶 flag
- **Visual theme**: Light pink (#fce4ec) background, rose pink (#e91e63) accent, frosted glass HUD, hero bubbles with gradient colors and avatar images
- **Rendering**: Single Canvas element at 360×640 logical resolution, CSS-scaled to viewport
- **Input**: Unified mouse + touch handling with touch-action: none to prevent browser gestures
- **Testing**: Vitest for unit/integration tests, manual QA for visual and audio verification
- **No backend**: All data is client-side only; leaderboard does not sync across devices
