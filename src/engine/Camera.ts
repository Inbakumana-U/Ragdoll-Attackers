// src/engine/Camera.ts
import Matter from 'matter-js';

export class Camera {
    public x: number = 0;
    public y: number = 0;
    public zoom: number = 1.0;

    private target: Matter.Body | null = null;
    private lerpFactor: number = 0.08;

    private shakeTimeLeft: number = 0;
    private shakeIntensity: number = 0;

    private viewportWidth: number = window.innerWidth;
    private viewportHeight: number = window.innerHeight;

    constructor() {
        window.addEventListener('resize', () => {
            this.viewportWidth = window.innerWidth;
            this.viewportHeight = window.innerHeight;
        });
    }

    setTarget(body: Matter.Body | null) {
        this.target = body;
    }

    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    shake(durationMs: number, intensity: number) {
        this.shakeTimeLeft = durationMs;
        this.shakeIntensity = intensity;
    }

    update(dt: number) {
        if (this.target) {
            // Target is the center of the screen
            const targetX = this.target.position.x;
            const targetY = this.target.position.y;

            this.x += (targetX - this.x) * this.lerpFactor;
            this.y += (targetY - this.y) * this.lerpFactor;
        }

        if (this.shakeTimeLeft > 0) {
            this.shakeTimeLeft -= dt;
        }
    }

    applyTransform(ctx: CanvasRenderingContext2D) {
        ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
        ctx.scale(this.zoom, this.zoom);

        let offsetX = 0;
        let offsetY = 0;

        if (this.shakeTimeLeft > 0) {
            offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
        }

        ctx.translate(-this.x + offsetX, -this.y + offsetY);
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(screenX: number, screenY: number): { x: number, y: number } {
        // Inverse of applyTransform
        const x = (screenX - this.viewportWidth / 2) / this.zoom + this.x;
        const y = (screenY - this.viewportHeight / 2) / this.zoom + this.y;
        return { x, y };
    }
}
