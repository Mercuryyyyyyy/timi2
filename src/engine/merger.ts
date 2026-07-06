import Matter from 'matter-js';
import { HERO_CHAIN, YAO_YAO_SCORE, MERGE_COOLDOWN_MS } from '../constants';
import { createHeroBody, removeBody, getPendingMerges, clearPendingMerges } from './physics';

const { Body } = Matter;

export interface MergeResult {
  removed: Matter.Body[];
  created: Matter.Body | null;
  scoreDelta: number;
}

/**
 * Process collision-detected merge pairs and produce merge results.
 * After removing old bodies, creates the combined hero (or awards YAO_YAO_SCORE).
 */
export function processMerges(world: Matter.World, now: number): MergeResult[] {
  const results: MergeResult[] = [];
  const pairs = [...getPendingMerges()];
  clearPendingMerges();

  const processed = new Set<number>();

  for (const [bodyA, bodyB] of pairs) {
    // Skip if either body was already merged in this batch (e.g. 3+ simultaneous collisions)
    if (processed.has(bodyA.id) || processed.has(bodyB.id)) continue;
    processed.add(bodyA.id);
    processed.add(bodyB.id);

    const tierI = (bodyA as any).heroTier;
    const nextTier = tierI + 1;
    const nextHero = HERO_CHAIN.find(h => h.tier === nextTier);

    // Set cooldown
    (bodyA as any).mergeCooldownUntil = now + MERGE_COOLDOWN_MS;
    (bodyB as any).mergeCooldownUntil = now + MERGE_COOLDOWN_MS;

    const centerX = (bodyA.position.x + bodyB.position.x) / 2;
    const centerY = (bodyA.position.y + bodyB.position.y) / 2;

    removeBody(world, bodyA);
    removeBody(world, bodyB);

    let created: Matter.Body | null = null;
    let scoreDelta = 0;

    if (nextHero) {
      created = createHeroBody(world, {
        tier: nextHero.tier,
        nameZh: nextHero.nameZh,
        radius: nextHero.radius,
        x: centerX,
        y: centerY,
      });
      Body.setVelocity(created, { x: 0, y: -2 });
      scoreDelta = nextHero.score;
    } else {
      scoreDelta = YAO_YAO_SCORE;
    }

    results.push({ removed: [bodyA, bodyB], created, scoreDelta });
  }

  return results;
}
