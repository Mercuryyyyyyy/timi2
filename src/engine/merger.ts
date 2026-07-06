import Matter from 'matter-js';
import { HERO_CHAIN, YAO_YAO_SCORE, MERGE_COOLDOWN_MS } from '../constants';
import { getHeroBodies, createHeroBody, removeBody, type HeroBodyOptions } from './physics';

const { Body, World } = Matter;

export interface MergeResult {
  removed: Matter.Body[];
  created: Matter.Body | null;
  scoreDelta: number;
}

/**
 * Process all pending same-tier collisions and produce merge results.
 * After removing old bodies, creates the combined hero (or awards YAO_YAO_SCORE).
 */
export function processMerges(world: Matter.World, now: number): MergeResult[] {
  const results: MergeResult[] = [];
  const bodies = getHeroBodies(world);
  const processed = new Set<number>();

  for (let i = 0; i < bodies.length; i++) {
    if (processed.has(bodies[i].id)) continue;
    const tierI = (bodies[i] as any).heroTier;
    const cooldownI = (bodies[i] as any).mergeCooldownUntil || 0;
    if (cooldownI > now) continue;

    for (let j = i + 1; j < bodies.length; j++) {
      if (processed.has(bodies[j].id)) continue;
      const tierJ = (bodies[j] as any).heroTier;
      if (tierI !== tierJ) continue;
      const cooldownJ = (bodies[j] as any).mergeCooldownUntil || 0;
      if (cooldownJ > now) continue;

      // Check collision
      const dist = Matter.Vector.magnitude(
        Matter.Vector.sub(bodies[i].position, bodies[j].position)
      );
      const rI = (bodies[i] as any).heroRadius || 20;
      const rJ = (bodies[j] as any).heroRadius || 20;
      const minDist = rI + rJ - 2; // slight overlap tolerance for merge

      if (dist > minDist) continue;

      // Both bodies are on cooldown from this merge
      (bodies[i] as any).mergeCooldownUntil = now + MERGE_COOLDOWN_MS;
      (bodies[j] as any).mergeCooldownUntil = now + MERGE_COOLDOWN_MS;

      const nextTier = tierI + 1;
      const nextHero = HERO_CHAIN.find(h => h.tier === nextTier);

      // Calculate merge center
      const centerX = (bodies[i].position.x + bodies[j].position.x) / 2;
      const centerY = (bodies[i].position.y + bodies[j].position.y) / 2;

      processed.add(bodies[i].id);
      processed.add(bodies[j].id);

      removeBody(world, bodies[i]);
      removeBody(world, bodies[j]);

      let created: Matter.Body | null = null;
      let scoreDelta = 0;

      if (nextHero) {
        // Create merged hero
        const opts: HeroBodyOptions = {
          tier: nextHero.tier,
          nameZh: nextHero.nameZh,
          radius: nextHero.radius,
          x: centerX,
          y: centerY,
        };
        created = createHeroBody(world, opts);
        // Apply small upward velocity for visual feedback
        Body.setVelocity(created, {
          x: 0,
          y: Math.max(-2, (created as any).velocity?.y || 0) - 1,
        });
        scoreDelta = nextHero.score;
      } else {
        // Both were tier 10 → YAO_YAO_SCORE
        scoreDelta = YAO_YAO_SCORE;
      }

      results.push({ removed: [bodies[i], bodies[j]], created, scoreDelta });
      break;
    }
  }

  return results;
}
