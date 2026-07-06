import { HERO_CHAIN, type HeroDefinition } from '../constants';
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
