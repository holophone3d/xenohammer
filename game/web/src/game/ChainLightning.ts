/**
 * ChainLightning — visual + damage effect triggered by Arc Matrix shield hits.
 * Finds nearest enemies and chains damage between them with halving damage per jump.
 * Renders multi-layered jagged bolts with forking branches, impact sparks, and electric glow.
 */

import {
    CHAIN_LIGHTNING_COOLDOWN,
    CHAIN_LIGHTNING_RANGE,
    CHAIN_LIGHTNING_CHAIN_RANGE,
    CHAIN_LIGHTNING_DURATION,
} from '../data/ships';

export interface LightningTarget {
    readonly x: number;
    readonly y: number;
    readonly alive: boolean;
    takeDamage(amount: number): void;
}

interface BoltSegment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    startTime: number;
    thickness: number;
    /** Pre-baked jagged paths — regenerated each frame for electric flicker */
    isMain: boolean;
}

interface Spark {
    x: number;
    y: number;
    startTime: number;
}

export class ChainLightning {
    private bolts: BoltSegment[] = [];
    private sparks: Spark[] = [];
    private lastTriggerTime = 0;

    /**
     * Trigger a chain lightning discharge.
     * @param srcX Source x (player position)
     * @param srcY Source y (player position)
     * @param damage Base damage for first target (halves each chain)
     * @param enemies All potential targets
     * @param now Current timestamp (ms)
     */
    trigger(
        srcX: number, srcY: number,
        damage: number,
        enemies: LightningTarget[],
        now: number,
    ): boolean {
        if (now - this.lastTriggerTime < CHAIN_LIGHTNING_COOLDOWN) return false;
        this.lastTriggerTime = now;

        const hit = new Set<LightningTarget>();

        // Tier 1: hit nearest target at full damage
        const primary = this.findNearest(srcX, srcY, enemies, hit, CHAIN_LIGHTNING_RANGE);
        if (!primary) return false;

        hit.add(primary);
        primary.takeDamage(Math.max(1, Math.floor(damage)));
        this.addBolt(srcX, srcY, primary.x, primary.y, now, 1.5, true);
        this.sparks.push({ x: primary.x, y: primary.y, startTime: now });

        // Tier 2: primary chains to up to 2 targets at ½ damage
        const tier2Damage = damage / 2;
        const tier2Targets: LightningTarget[] = [];
        for (let i = 0; i < 2; i++) {
            const t = this.findNearest(primary.x, primary.y, enemies, hit, CHAIN_LIGHTNING_CHAIN_RANGE);
            if (!t) break;
            hit.add(t);
            t.takeDamage(Math.max(1, Math.floor(tier2Damage)));
            this.addBolt(primary.x, primary.y, t.x, t.y, now, 1.0, true);
            this.sparks.push({ x: t.x, y: t.y, startTime: now });
            tier2Targets.push(t);
        }

        // Tier 3: each tier-2 target chains to up to 3 targets at ⅙ damage
        const tier3Damage = damage / 6;
        for (const src of tier2Targets) {
            for (let i = 0; i < 3; i++) {
                const t = this.findNearest(src.x, src.y, enemies, hit, CHAIN_LIGHTNING_CHAIN_RANGE);
                if (!t) break;
                hit.add(t);
                t.takeDamage(Math.max(1, Math.floor(tier3Damage)));
                this.addBolt(src.x, src.y, t.x, t.y, now, 0.7, true);
                this.sparks.push({ x: t.x, y: t.y, startTime: now });
            }
        }

        return true;
    }

    private findNearest(
        x: number, y: number, enemies: LightningTarget[],
        hit: Set<LightningTarget>, range: number,
    ): LightningTarget | null {
        let bestDist = range * range;
        let best: LightningTarget | null = null;
        for (const e of enemies) {
            if (!e.alive || hit.has(e)) continue;
            const dx = e.x - x;
            const dy = e.y - y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDist) { bestDist = d2; best = e; }
        }
        return best;
    }

    private addBolt(
        x1: number, y1: number, x2: number, y2: number,
        now: number, thickness: number, isMain: boolean,
    ): void {
        this.bolts.push({ x1, y1, x2, y2, startTime: now, thickness, isMain });
        // Fork branch from midpoint
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const angle = Math.random() * Math.PI * 2;
        const forkLen = 15 + Math.random() * 25;
        this.bolts.push({
            x1: mx + (Math.random() - 0.5) * 12,
            y1: my + (Math.random() - 0.5) * 12,
            x2: mx + Math.cos(angle) * forkLen,
            y2: my + Math.sin(angle) * forkLen,
            startTime: now, thickness: thickness * 0.35, isMain: false,
        });
    }

    update(now: number): void {
        let w = 0;
        for (let i = 0; i < this.bolts.length; i++) {
            if (now - this.bolts[i].startTime < CHAIN_LIGHTNING_DURATION) {
                if (w !== i) this.bolts[w] = this.bolts[i];
                w++;
            }
        }
        this.bolts.length = w;

        w = 0;
        for (let i = 0; i < this.sparks.length; i++) {
            if (now - this.sparks[i].startTime < CHAIN_LIGHTNING_DURATION) {
                if (w !== i) this.sparks[w] = this.sparks[i];
                w++;
            }
        }
        this.sparks.length = w;
    }

    draw(ctx: CanvasRenderingContext2D, now: number): void {
        if (this.bolts.length === 0 && this.sparks.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const bolt of this.bolts) {
            const elapsed = now - bolt.startTime;
            const t = Math.max(0, 1 - elapsed / CHAIN_LIGHTNING_DURATION);
            // Bright flash on strike, then ease-out fade
            const flash = elapsed < 60 ? 1.0 : t * t;
            const flicker = 0.9 + Math.random() * 0.1;
            const alpha = flash * flicker;

            // More segments for main bolts, fewer for forks
            const segs = bolt.isMain ? 8 : 4;
            const jitterScale = bolt.isMain ? 1.0 : 0.6;
            const points = this.generateJaggedPath(
                bolt.x1, bolt.y1, bolt.x2, bolt.y2, segs, jitterScale,
            );

            // Layer 1: Wide outer glow (vivid blue)
            ctx.globalAlpha = alpha * 0.6;
            ctx.strokeStyle = 'rgb(30,80,255)';
            ctx.lineWidth = bolt.thickness * 3 + 3;
            this.strokePath(ctx, points);

            // Layer 2: Mid glow (bright blue)
            ctx.globalAlpha = alpha * 0.85;
            ctx.strokeStyle = 'rgb(80,160,255)';
            ctx.lineWidth = bolt.thickness * 1.5 + 1;
            this.strokePath(ctx, points);

            // Layer 3: Bright core (blue-white)
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = 'rgb(200,230,255)';
            ctx.lineWidth = bolt.thickness * 0.8;
            this.strokePath(ctx, points);
        }

        // Impact sparks — radial burst of tiny lines
        for (const spark of this.sparks) {
            const elapsed = now - spark.startTime;
            const t = Math.max(0, 1 - elapsed / CHAIN_LIGHTNING_DURATION);
            const life = t * t;
            const sparkCount = 6;
            const sparkLen = 8 + life * 12;

            ctx.globalAlpha = life;
            ctx.strokeStyle = 'rgb(120,180,255)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < sparkCount; i++) {
                const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.5;
                ctx.beginPath();
                ctx.moveTo(spark.x, spark.y);
                ctx.lineTo(
                    spark.x + Math.cos(angle) * sparkLen,
                    spark.y + Math.sin(angle) * sparkLen,
                );
                ctx.stroke();
            }

            // Center flash
            ctx.globalAlpha = life * 0.6;
            ctx.fillStyle = 'rgb(200,230,255)';
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, 4 * life, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    private generateJaggedPath(
        x1: number, y1: number, x2: number, y2: number,
        segments: number, jitterScale: number,
    ): { x: number; y: number }[] {
        const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const px = len > 0 ? -dy / len : 0;
        const py = len > 0 ? dx / len : 0;
        const jitter = Math.min(18, len * 0.1) * jitterScale;

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const offset = (Math.random() - 0.5) * 2 * jitter;
            points.push({
                x: x1 + dx * t + px * offset,
                y: y1 + dy * t + py * offset,
            });
        }
        points.push({ x: x2, y: y2 });
        return points;
    }

    private strokePath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void {
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
    }
}
