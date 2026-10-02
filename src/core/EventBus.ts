// src/core/EventBus.ts

export type EventMap = {
    GAME_START: undefined;
    COLLISION_IMPACT: { bodyAId: number; bodyBId: number; magnitude: number; point: { x: number; y: number } };
    BONE_BROKEN: { boneId: number; name: string; impulse: number; x: number; y: number };
    PROJECTILE_HIT: { arrowId: number; hitBodyId: number; point: { x: number; y: number } };
    SCORE_UPDATE: { score: number; multiplier: number };
    RUN_RESET: undefined;
    RUN_RESOLVED: undefined;
    VEHICLE_EJECT: { speed: number };
    LAUNCH_POWER_UPDATE: { power: number };
    FIRE_ARROW: { arrowType: string; x: number; y: number; vx: number; vy: number };
    EXPLOSION: { x: number; y: number; radius: number };
};

type EventKey = keyof EventMap;

type Handler<T> = (payload: T) => void;

class EventBusImpl {
    private handlers: { [K in EventKey]?: Handler<EventMap[K]>[] } = {};

    on<K extends EventKey>(event: K, handler: Handler<EventMap[K]>) {
        if (!this.handlers[event]) {
            this.handlers[event] = [] as any;
        }
        (this.handlers[event] as any).push(handler);
    }

    off<K extends EventKey>(event: K, handler: Handler<EventMap[K]>) {
        if (!this.handlers[event]) return;
        this.handlers[event] = (this.handlers[event] as any).filter((h: any) => h !== handler);
    }

    emit<K extends EventKey>(event: K, payload: EventMap[K]) {
        if (!this.handlers[event]) return;
        this.handlers[event]!.forEach(handler => handler(payload));
    }
}

export const EventBus = new EventBusImpl();
