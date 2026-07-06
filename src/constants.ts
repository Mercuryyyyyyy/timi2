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
// Hero merge chain (tiers 1–11)
// ---------------------------------------------------------------------------

export const HERO_CHAIN: HeroDefinition[] = [
  { tier: 1,  nameZh: '马可波罗', nameEn: 'marco_polo',      heroId: 132, color: '#4A90D9', radius: 20, score: 0 },
  { tier: 2,  nameZh: '不知火舞', nameEn: 'buzhihuowu',      heroId: 157, color: '#FF4500', radius: 23, score: 10 },
  { tier: 3,  nameZh: '干将莫邪', nameEn: 'gan_jiang_mo_ye', heroId: 182, color: '#7B68EE', radius: 25, score: 20 },
  { tier: 4,  nameZh: '铠',       nameEn: 'kai',             heroId: 193, color: '#4169E1', radius: 28, score: 40 },
  { tier: 5,  nameZh: '甄姬',     nameEn: 'zhen_ji',         heroId: 127, color: '#00CED1', radius: 30, score: 80 },
  { tier: 6,  nameZh: '云缨',     nameEn: 'yun_ying',        heroId: 538, color: '#FF6347', radius: 33, score: 160 },
  { tier: 7,  nameZh: '海诺',     nameEn: 'hai_nuo',         heroId: 563, color: '#9932CC', radius: 35, score: 320 },
  { tier: 8,  nameZh: '虞姬',     nameEn: 'yu_ji',           heroId: 174, color: '#32CD32', radius: 38, score: 640 },
  { tier: 9,  nameZh: '小乔',     nameEn: 'xiao_qiao',       heroId: 106, color: '#FF69B4', radius: 40, score: 1280 },
  { tier: 10, nameZh: '蔡文姬',   nameEn: 'cai_wen_ji',      heroId: 184, color: '#FFD700', radius: 43, score: 2560 },
  { tier: 11, nameZh: '瑶',       nameEn: 'yao',             heroId: 505, color: '#FF1493', radius: 45, score: 5120 },
];

/** Special score for tier-11 + tier-11 merge. */
export const YAO_YAO_SCORE = 10000;

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

export const GRAVITY = 0.8;
export const CONTAINER_WIDTH = 360;
export const CONTAINER_HEIGHT = 640;
export const RESTITUTION = 0.5;
export const FRICTION = 0.05;
export const FRICTION_AIR = 0.001;
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
