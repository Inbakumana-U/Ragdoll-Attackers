// src/engine/PhysicsWorld.ts
import Matter from 'matter-js';

export class PhysicsWorld {
    public engine: Matter.Engine;
    public world: Matter.World;
    public runner: Matter.Runner;

    constructor() {
        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 1.0, scale: 0.001 } // Default gravity, $g_y = 1.0$ effectively depending on scaling, Matter uses 1 with 0.001 scale
        });

        this.world = this.engine.world;

        // Fixed-timestep Runner (60 FPS, delta = 16.66ms)
        this.runner = Matter.Runner.create({
            isFixed: true,
            delta: 1000 / 60
        } as any);
    }

    start() {
        Matter.Runner.run(this.runner, this.engine);
    }

    stop() {
        Matter.Runner.stop(this.runner);
    }

    reset() {
        Matter.World.clear(this.world, false);
        Matter.Engine.clear(this.engine);
    }
}

// Export a singleton instance for ease of use, or we can instantiate it in GameManager
export const physics = new PhysicsWorld();
