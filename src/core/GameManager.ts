// src/core/GameManager.ts
import { EventBus } from './EventBus';

export type GameState = 'SETUP' | 'AIM_AND_LAUNCH' | 'RUN_ACTIVE' | 'RUN_RESOLVED' | 'SUMMARY_SCREEN';

export class GameManager {
    public state: GameState = 'SETUP';

    constructor() {
        // Simple state machine transitions

        EventBus.on('GAME_START', () => {
            this.setState('AIM_AND_LAUNCH');
        });

        EventBus.on('VEHICLE_EJECT', () => {
            if (this.state === 'AIM_AND_LAUNCH') {
                this.setState('RUN_ACTIVE');
            }
        });

        EventBus.on('RUN_RESOLVED', () => {
            if (this.state === 'RUN_ACTIVE' || this.state === 'AIM_AND_LAUNCH') {
                this.setState('SUMMARY_SCREEN');
            }
        });

        EventBus.on('RUN_RESET', () => {
            this.setState('SETUP');
            // Allow time for systems to clear
            setTimeout(() => {
                EventBus.emit('GAME_START', undefined);
            }, 100);
        });
    }

    private setState(newState: GameState) {
        console.log(`State transition: ${this.state} -> ${newState}`);
        this.state = newState;
    }
}
