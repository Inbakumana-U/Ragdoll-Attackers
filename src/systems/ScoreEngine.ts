// src/systems/ScoreEngine.ts
import { EventBus } from '../core/EventBus';

export class ScoreEngine {
    public score = 0;
    public multiplier = 1;
    private airborneTimeMs = 0;
    private isAirborne = false;

    constructor() {
        EventBus.on('BONE_BROKEN', () => {
            this.addScore(500);
        });

        EventBus.on('PROJECTILE_HIT', () => {
            // Headshot bonus logic in Arrow.ts emits this
            this.addScore(1000);
        });

        EventBus.on('EXPLOSION', () => {
            this.addScore(750);
        });

        EventBus.on('VEHICLE_EJECT', (payload) => {
            this.isAirborne = true;
            const scoreBonus = Math.floor(payload.speed * 100);
            this.addScore(scoreBonus);
        });

        EventBus.on('RUN_RESET', () => {
            this.score = 0;
            this.multiplier = 1;
            this.airborneTimeMs = 0;
            this.isAirborne = false;
            this.emitUpdate();
        });
    }

    update(dt: number) {
        if (this.isAirborne) {
            this.airborneTimeMs += dt;
            if (this.airborneTimeMs >= 1000) {
                this.addScore(50);
                this.airborneTimeMs -= 1000;
            }
        }
    }

    setAirborne(state: boolean) {
        this.isAirborne = state;
    }

    private addScore(amount: number) {
        this.score += amount * this.multiplier;
        this.emitUpdate();
    }

    private emitUpdate() {
        EventBus.emit('SCORE_UPDATE', { score: this.score, multiplier: this.multiplier });
    }
}
