// src/systems/ArcherySystem.ts
import { Camera } from '../engine/Camera';
import { EventBus } from '../core/EventBus';
import type { ArrowType } from '../entities/Arrow';

export class ArcherySystem {
    private isAiming = false;
    private startX = 0;
    private startY = 0;
    private currentX = 0;
    private currentY = 0;
    private MAX_DRAW_PULL = 200;

    public selectedType: ArrowType = 'STANDARD';

    private camera: Camera;

    constructor(canvas: HTMLCanvasElement, camera: Camera) {
        this.camera = camera;

        canvas.addEventListener('mousedown', this.onPointerDown.bind(this));
        canvas.addEventListener('mousemove', this.onPointerMove.bind(this));
        window.addEventListener('mouseup', this.onPointerUp.bind(this));

        // Touch support
        canvas.addEventListener('touchstart', (e) => this.onPointerDown(e.touches[0]));
        canvas.addEventListener('touchmove', (e) => this.onPointerMove(e.touches[0]));
        window.addEventListener('touchend', (e) => this.onPointerUp(e.changedTouches[0]));

        window.addEventListener('keydown', (e) => {
            if (e.key === '1') this.selectedType = 'STANDARD';
            if (e.key === '2') this.selectedType = 'EXPLOSIVE';
            if (e.key === '3') this.selectedType = 'HARPOON';
        });
    }

    private onPointerDown(e: MouseEvent | Touch) {
        this.isAiming = true;
        const worldPos = this.camera.screenToWorld(e.clientX, e.clientY);
        this.startX = worldPos.x;
        this.startY = worldPos.y;
        this.currentX = worldPos.x;
        this.currentY = worldPos.y;
    }

    private onPointerMove(e: MouseEvent | Touch) {
        if (!this.isAiming) return;
        const worldPos = this.camera.screenToWorld(e.clientX, e.clientY);
        this.currentX = worldPos.x;
        this.currentY = worldPos.y;
    }

    private onPointerUp(e: MouseEvent | Touch) {
        if (!this.isAiming) return;
        this.isAiming = false;

        const worldPos = this.camera.screenToWorld(e.clientX, e.clientY);
        this.currentX = worldPos.x;
        this.currentY = worldPos.y;

        const vecX = this.startX - this.currentX;
        const vecY = this.startY - this.currentY;

        const dist = Math.hypot(vecX, vecY);
        if (dist < 10) return; // Too short to fire

        const pull = Math.min(dist, this.MAX_DRAW_PULL);
        const normX = vecX / dist;
        const normY = vecY / dist;

        // Launch velocity based on pull
        const vx = normX * (pull / 5);
        const vy = normY * (pull / 5);

        EventBus.emit('FIRE_ARROW', { arrowType: this.selectedType, x: this.startX, y: this.startY, vx, vy });
    }

    public renderTrajectory(ctx: CanvasRenderingContext2D) {
        if (!this.isAiming) return;

        const vecX = this.startX - this.currentX;
        const vecY = this.startY - this.currentY;

        const dist = Math.hypot(vecX, vecY);
        const pull = Math.min(dist, this.MAX_DRAW_PULL);
        if (pull < 10) return;

        const normX = vecX / dist;
        const normY = vecY / dist;

        let vx = normX * (pull / 5);
        let vy = normY * (pull / 5);
        let px = this.startX;
        let py = this.startY;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(px, py);

        for (let i = 0; i < 30; i++) {
            px += vx * (1000/60) * 0.05; // manual tunable step
            py += vy * (1000/60) * 0.05;
            vy += 0.5; // approx gravity over time
            ctx.lineTo(px, py);
        }

        ctx.stroke();
        ctx.setLineDash([]);
    }
}
