// src/renderers/RagdollRenderer.ts
import { Ragdoll } from '../entities/Ragdoll';
import { EventBus } from '../core/EventBus';

export class RagdollRenderer {
    private ragdolls: Ragdoll[] = [];
    private flashingBones = new Map<number, number>(); // body/constraint ID -> expiration time

    constructor() {
        EventBus.on('BONE_BROKEN', (payload) => {
            this.flashingBones.set(payload.boneId, performance.now() + 300);
        });
    }

    addRagdoll(ragdoll: Ragdoll) {
        this.ragdolls.push(ragdoll);
    }

    render(ctx: CanvasRenderingContext2D, time: number) {
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const ragdoll of this.ragdolls) {
            // Draw constraints (joints)
            for (const cData of ragdoll.constraints) {
                const c = cData.constraint;
                if (!c.bodyA || !c.bodyB) continue;

                const posA = { x: c.bodyA.position.x + c.pointA.x, y: c.bodyA.position.y + c.pointA.y };
                const posB = { x: c.bodyB.position.x + c.pointB.x, y: c.bodyB.position.y + c.pointB.y };

                ctx.strokeStyle = '#555';
                ctx.beginPath();
                ctx.moveTo(posA.x, posA.y);
                ctx.lineTo(posB.x, posB.y);
                ctx.stroke();
            }

            // Draw parts
            for (const part of ragdoll.parts) {
                const body = part.body;

                // Check if flashing
                const flashUntil = this.flashingBones.get(body.id) || 0;
                if (flashUntil > time) {
                    ctx.strokeStyle = '#FF003C'; // Neon Crimson
                    ctx.fillStyle = '#FF003C';
                } else {
                    ctx.strokeStyle = '#fff';
                    ctx.fillStyle = '#121212';
                }

                ctx.beginPath();
                if (part.name === 'Head') {
                    // It's a circle
                    const radius = (body.bounds.max.x - body.bounds.min.x) / 2;
                    ctx.arc(body.position.x, body.position.y, radius, 0, Math.PI * 2);
                } else {
                    // It's a polygon
                    ctx.moveTo(body.vertices[0].x, body.vertices[0].y);
                    for (let j = 1; j < body.vertices.length; j++) {
                        ctx.lineTo(body.vertices[j].x, body.vertices[j].y);
                    }
                    ctx.closePath();
                }

                ctx.fill();
                ctx.stroke();
            }
        }
    }
}
