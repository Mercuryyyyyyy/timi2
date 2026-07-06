import { MAX_PARTICLES, type Particle, type HeroDefinition } from '../constants';

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
    particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 0, maxLife: 30 + Math.random() * 20, color, radius: 2 + Math.random() * 3,
    });
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

/** Expose the particles array so canvas.ts renderParticles can use them. */
export function getParticles(): Particle[] {
  return particles;
}
