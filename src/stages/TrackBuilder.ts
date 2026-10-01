// src/stages/TrackBuilder.ts
import Matter from 'matter-js';
import { COLLISION_LAYERS, MASKS } from '../constants/collisionLayers';

export class TrackBuilder {
    public bodies: Matter.Body[] = [];

    constructor() {
        const filter = {
            category: COLLISION_LAYERS.CATEGORY_ENVIRONMENT,
            mask: MASKS.ALL
        };

        const staticOptions = {
            isStatic: true,
            collisionFilter: filter,
            friction: 0.5,
            label: 'Track'
        };

        // 35-degree downhill run
        // y = mx + b. angle = 35 deg = ~0.61 rad
        const angle = 35 * (Math.PI / 180);
        const rampLength = 1500;
        const rampX = 0;
        const rampY = 300;

        const ramp = Matter.Bodies.rectangle(rampX + Math.cos(angle) * rampLength/2, rampY + Math.sin(angle) * rampLength/2, rampLength, 50, staticOptions);
        Matter.Body.setAngle(ramp, angle);

        // Upward kicker launch ramp
        const kickerX = rampX + Math.cos(angle) * rampLength;
        const kickerY = rampY + Math.sin(angle) * rampLength;
        const kicker = Matter.Bodies.rectangle(kickerX + 100, kickerY, 250, 50, staticOptions);
        Matter.Body.setAngle(kicker, -20 * (Math.PI / 180));

        // Flat landing bed further away
        const landingX = kickerX + 800;
        const landingY = kickerY + 300;
        const landing = Matter.Bodies.rectangle(landingX + 500, landingY, 1500, 50, staticOptions);

        // Spiked drop pit (just a wall for now, hazards handle spikes)
        const wallX = landingX + 1200;
        const wall = Matter.Bodies.rectangle(wallX, landingY - 200, 50, 400, staticOptions);

        this.bodies.push(ramp, kicker, landing, wall);
    }
}
