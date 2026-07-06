import Matter from 'matter-js';
import { GRAVITY, CONTAINER_WIDTH, CONTAINER_HEIGHT, RESTITUTION, FRICTION, FRICTION_AIR, MAX_VELOCITY, getHeroByTier } from '../constants';

const { Engine, World, Bodies, Body } = Matter;

export const HERO_CATEGORY = 0x0001;
export const WALL_CATEGORY = 0x0002;

export function createPhysicsEngine(): Matter.Engine {
  const engine = Engine.create({
    gravity: { x: 0, y: GRAVITY, scale: 0.001 },
    enableSleeping: false,
  });

  const wallOpts: Matter.IChamferableBodyDefinition = {
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
