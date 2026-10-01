// src/entities/Hazards.ts
import Matter from 'matter-js';
import { COLLISION_LAYERS, MASKS } from '../constants/collisionLayers';
import { EventBus } from '../core/EventBus';

export class SpinningSaw {
    public body: Matter.Body;
    private rotationSpeed = 0.2;

    constructor(x: number, y: number) {
        this.body = Matter.Bodies.polygon(x, y, 8, 40, {
            isStatic: true,
            isSensor: true, // we detect overlap manually or via collision event
            collisionFilter: {
                category: COLLISION_LAYERS.CATEGORY_ENVIRONMENT,
                mask: MASKS.ALL
            },
            label: 'SpinningSaw'
        });
    }

    update() {
        Matter.Body.setAngle(this.body, this.body.angle + this.rotationSpeed);
    }
}

export class TNTBarrel {
    public body: Matter.Body;
    private engine: Matter.Engine;
    private exploded = false;

    constructor(engine: Matter.Engine, x: number, y: number) {
        this.engine = engine;
        this.body = Matter.Bodies.rectangle(x, y, 40, 60, {
            density: 0.01,
            friction: 0.5,
            collisionFilter: {
                category: COLLISION_LAYERS.CATEGORY_ENVIRONMENT,
                mask: MASKS.ALL
            },
            label: 'TNTBarrel'
        });
    }

    detonate() {
        if (this.exploded) return;
        this.exploded = true;

        const radius = 250;
        const pos = { ...this.body.position };

        // Remove barrel
        Matter.World.remove(this.engine.world, this.body);

        // Apply radial outward impulse
        const bodies = Matter.Composite.allBodies(this.engine.world);
        for (const b of bodies) {
            if (b.isStatic || b === this.body) continue;

            const dx = b.position.x - pos.x;
            const dy = b.position.y - pos.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < radius * radius && distSq > 0) {
                const dist = Math.sqrt(distSq);
                // F = k / d^2 approximation, we'll use a linear falloff for stability
                const forceMag = (radius - dist) / radius * 0.5 * b.mass;
                const forceX = (dx / dist) * forceMag;
                const forceY = (dy / dist) * forceMag;

                Matter.Body.applyForce(b, b.position, { x: forceX, y: forceY });
            }
        }

        EventBus.emit('EXPLOSION', { x: pos.x, y: pos.y, radius });
    }
}
