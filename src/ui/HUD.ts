// src/ui/HUD.ts
import { EventBus } from '../core/EventBus';

export class HUD {
    private container: HTMLElement;
    private scoreEl: HTMLElement;
    private speedEl: HTMLElement;

    // Mini mannequin references
    private mannequinBones = new Map<string, HTMLElement>();
    private flashingBones = new Map<string, number>();

    constructor(containerId: string) {
        this.container = document.getElementById(containerId)!;

        // Setup UI
        this.container.innerHTML = `
            <div style="position: absolute; top: 20px; left: 20px; color: white; font-family: sans-serif;">
                <div style="font-size: 24px; font-weight: bold;">SCORE: <span id="hud-score">0</span> <span style="font-size: 16px; color: yellow;">x<span id="hud-multiplier">1</span></span></div>
                <div style="font-size: 18px; margin-top: 10px;">SPEED: <span id="hud-speed">0</span> mph</div>

                <div id="hud-summary" style="display: none; margin-top: 50px; background: rgba(0,0,0,0.8); padding: 20px; border-radius: 8px;">
                    <h2>RUN COMPLETE</h2>
                    <button id="btn-restart" style="padding: 10px 20px; font-size: 16px; cursor: pointer; pointer-events: auto;">Rerun / Retry</button>
                </div>
            </div>
            <div style="position: absolute; top: 20px; right: 20px; width: 100px; height: 150px;" id="hud-mannequin">
                <!-- Simple DOM based stickman -->
                <div id="bone-Head" style="position:absolute; top:10px; left:40px; width:20px; height:20px; border-radius:50%; border:2px solid white;"></div>
                <div id="bone-Torso" style="position:absolute; top:32px; left:48px; width:4px; height:40px; background:white;"></div>

                <div id="bone-UpperArmL" style="position:absolute; top:35px; left:20px; width:28px; height:4px; background:white; transform: rotate(20deg);"></div>
                <div id="bone-UpperArmR" style="position:absolute; top:35px; left:52px; width:28px; height:4px; background:white; transform: rotate(-20deg);"></div>

                <div id="bone-ThighL" style="position:absolute; top:72px; left:30px; width:4px; height:30px; background:white; transform: rotate(20deg);"></div>
                <div id="bone-ThighR" style="position:absolute; top:72px; left:66px; width:4px; height:30px; background:white; transform: rotate(-20deg);"></div>
            </div>
        `;

        this.scoreEl = document.getElementById('hud-score')!;
        this.speedEl = document.getElementById('hud-speed')!;

        ['Head', 'Torso', 'UpperArmL', 'UpperArmR', 'ThighL', 'ThighR'].forEach(name => {
            const el = document.getElementById(`bone-${name}`);
            if (el) this.mannequinBones.set(name, el);
        });

        document.getElementById('btn-restart')?.addEventListener('click', () => {
            EventBus.emit('RUN_RESET', undefined);
        });

        EventBus.on('SCORE_UPDATE', (payload) => {
            this.scoreEl.innerText = Math.floor(payload.score).toString();
            const multiplierEl = document.getElementById('hud-multiplier');
            if (multiplierEl) multiplierEl.innerText = payload.multiplier.toString();
        });

        EventBus.on('BONE_BROKEN', (payload) => {
            let boneName = payload.name;
            // Map joint names to simplified mannequin parts
            if (boneName.includes('Neck')) boneName = 'Head';
            if (boneName.includes('ShoulderL')) boneName = 'UpperArmL';
            if (boneName.includes('ShoulderR')) boneName = 'UpperArmR';
            if (boneName.includes('HipL') || boneName.includes('KneeL')) boneName = 'ThighL';
            if (boneName.includes('HipR') || boneName.includes('KneeR')) boneName = 'ThighR';

            if (this.mannequinBones.has(boneName)) {
                this.flashingBones.set(boneName, performance.now() + 500);
            }
        });

        EventBus.on('RUN_RESOLVED', () => {
            document.getElementById('hud-summary')!.style.display = 'block';
            this.container.style.pointerEvents = 'auto'; // allow clicking button
        });

        EventBus.on('RUN_RESET', () => {
            document.getElementById('hud-summary')!.style.display = 'none';
            this.container.style.pointerEvents = 'none';
            this.scoreEl.innerText = '0';
        });
    }

    updateSpeed(velocity: number) {
        // Convert arbitrary velocity units to "mph"
        const mph = Math.floor(velocity * 2.23);
        this.speedEl.innerText = mph.toString();
    }

    update(time: number) {
        for (const [name, el] of this.mannequinBones.entries()) {
            const flashUntil = this.flashingBones.get(name) || 0;
            if (flashUntil > time) {
                el.style.backgroundColor = 'red';
                el.style.borderColor = 'red';
            } else {
                el.style.backgroundColor = name === 'Head' ? 'transparent' : 'white';
                el.style.borderColor = 'white';
            }
        }
    }
}
