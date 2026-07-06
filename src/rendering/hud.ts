import { HERO_CHAIN, CONTAINER_WIDTH, HUD_HEIGHT, type HeroDefinition } from '../constants';
import { previewNextTier } from '../engine/spawner';

let _cachedNextTier: number | null = null;

/** Get the next hero to spawn (cached until consumed). */
export function getNextHero(): HeroDefinition | null {
  if (_cachedNextTier === null) {
    _cachedNextTier = previewNextTier();
  }
  return HERO_CHAIN.find(h => h.tier === _cachedNextTier) ?? null;
}

/** Consume the cached next hero and generate a new one. */
export function consumeNextHero(): HeroDefinition | null {
  const hero = getNextHero();
  _cachedNextTier = previewNextTier();
  return hero;
}

/** Check if coordinates are inside the mute button area. */
export function isMuteButtonClicked(x: number, y: number): boolean {
  return y < HUD_HEIGHT && x > CONTAINER_WIDTH - 50;
}
