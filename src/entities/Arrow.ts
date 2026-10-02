// src/entities/Arrow.ts
import Matter from 'matter-js';
import { COLLISION_LAYERS, MASKS } from '../constants/collisionLayers';
import { EventBus } from '../core/EventBus';

export type ArrowType = 'STANDARD' | 'EXPLOSIVE' | 'HARPOON';

export class Arrow {
    public body: Matter.Body;
    public type: ArrowType;
    private engine: Matter.Engine;
    private hasHit = false;

    constructor(engine: Matter.Engine, type: ArrowType, x: number, y: number, vx: number, vy: number) {
        this.engine = engine;
        this.type = type;

        this.body = Matter.Bodies.rectangle(x, y, 40, 5, {
            collisionFilter: {
                category: COLLISION_LAYERS.CATEGORY_PROJECTILE,
                mask: MASKS.PROJECTILE
            },
            frictionAir: 0.01,
            restitution: 0.1,
            label: 'Arrow'
        });

        Matter.Body.setVelocity(this.body, { x: vx, y: vy });
        this.alignWithVelocity();
    }

    alignWithVelocity() {
        if (this.hasHit) return;
        const vel = this.body.velocity;
        if (Math.hypot(vel.x, vel.y) > 0.1) {
            const angle = Math.atan2(vel.y, vel.x);
            Matter.Body.setAngle(this.body, angle);
        }
    }

    onHit(hitBody: Matter.Body, point: { x: number, y: number }) {
        if (this.hasHit) return;
        this.hasHit = true;

        if (this.type === 'EXPLOSION' as any || this.type === 'EXPLOSIVE') {
            // Detonate
            EventBus.emit('EXPLOSION', { x: point.x, y: point.y, radius: 150 });
            Matter.World.remove(this.engine.world, this.body);
            return;
        }

        // Standard or Harpoon: Pin to body
        const pinConstraint = Matter.Constraint.create({
            bodyA: this.body,
            bodyB: hitBody,
            pointA: { x: 20, y: 0 }, // Tip of the arrow
            pointB: { x: point.x - hitBody.position.x, y: point.y - hitBody.position.y },
            stiffness: 1,
            length: 0
        });
        Matter.World.add(this.engine.world, pinConstraint);

        // Momentum transfer
        const momentumX = this.body.mass * this.body.velocity.x * 0.5;
        const momentumY = this.body.mass * this.body.velocity.y * 0.5;
        Matter.Body.applyForce(hitBody, point, { x: momentumX, y: momentumY });

        // Headshot check
        if (hitBody.label === 'Head') {
            // Emit special event
            EventBus.emit('PROJECTILE_HIT', { arrowId: this.body.id, hitBodyId: hitBody.id, point });
        }

        if (this.type === 'HARPOON') {
            // Grapple constraint to origin (just as an example, sticking it to world origin)
            const grapple = Matter.Constraint.create({
                bodyA: this.body,
                pointB: { x: 0, y: 0 },
                stiffness: 0.01,
                damping: 0.1
            });
            Matter.World.add(this.engine.world, grapple);
        }
    }
}
