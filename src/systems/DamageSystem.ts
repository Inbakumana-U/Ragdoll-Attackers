// src/systems/DamageSystem.ts
import Matter from 'matter-js';
import { Ragdoll } from '../entities/Ragdoll';
import { EventBus } from '../core/EventBus';

export class DamageSystem {
    private engine: Matter.Engine;
    private ragdolls: Ragdoll[] = [];
    private BREAK_FORCE_LIMIT = 20; // Distance stretch threshold
    private DELTA_V_LIMIT = 15;

    private preUpdateVelocities = new Map<number, { x: number, y: number }>();
    private brokenConstraintIds = new Set<number>();

    constructor(engine: Matter.Engine) {
        this.engine = engine;

        Matter.Events.on(this.engine, 'beforeUpdate', () => {
            this.preUpdateVelocities.clear();
            for (const ragdoll of this.ragdolls) {
                for (const part of ragdoll.parts) {
                    this.preUpdateVelocities.set(part.body.id, { x: part.body.velocity.x, y: part.body.velocity.y });
                }
            }
        });

        Matter.Events.on(this.engine, 'afterUpdate', () => {
            this.checkConstraints();
            this.checkImpacts();
            this.maintainStiffPosture();
        });
    }

    addRagdoll(ragdoll: Ragdoll) {
        this.ragdolls.push(ragdoll);
    }

    removeRagdoll(ragdoll: Ragdoll) {
        this.ragdolls = this.ragdolls.filter(r => r !== ragdoll);
    }

    private checkConstraints() {
        for (const ragdoll of this.ragdolls) {
            for (let i = ragdoll.constraints.length - 1; i >= 0; i--) {
                const constraintData = ragdoll.constraints[i];
                const c = constraintData.constraint;

                if (this.brokenConstraintIds.has(c.id)) continue;
                if (!c.bodyA || !c.bodyB) continue;

                // Calculate current anchors in world space
                const posA = { x: c.bodyA.position.x + c.pointA.x, y: c.bodyA.position.y + c.pointA.y };
                const posB = { x: c.bodyB.position.x + c.pointB.x, y: c.bodyB.position.y + c.pointB.y };

                // If the constraint has angular properties, we would calculate it,
                // but we approximate strain using positional distance deviation
                const distance = Math.hypot(posA.x - posB.x, posA.y - posB.y);
                const restLength = c.length;
                const stretch = Math.abs(distance - restLength);

                if (stretch > this.BREAK_FORCE_LIMIT) {
                    this.severConstraint(ragdoll, i, stretch, posA);
                }
            }
        }
    }

    private checkImpacts() {
        for (const ragdoll of this.ragdolls) {
            for (const part of ragdoll.parts) {
                const preVel = this.preUpdateVelocities.get(part.body.id);
                if (preVel) {
                    const postVel = part.body.velocity;
                    const deltaVx = preVel.x - postVel.x;
                    const deltaVy = preVel.y - postVel.y;
                    const deltaV = Math.hypot(deltaVx, deltaVy);

                    if (deltaV > this.DELTA_V_LIMIT) {
                        ragdoll.setLimp();
                        // Trigger structural fracture / generic high impact event
                        EventBus.emit('BONE_BROKEN', {
                            boneId: part.body.id,
                            name: part.name + '_IMPACT',
                            impulse: deltaV,
                            x: part.body.position.x,
                            y: part.body.position.y
                        });
                    }
                }
            }
        }
    }

    private severConstraint(ragdoll: Ragdoll, index: number, force: number, pos: { x: number, y: number }) {
        const constraintData = ragdoll.constraints[index];
        Matter.World.remove(this.engine.world, constraintData.constraint);
        this.brokenConstraintIds.add(constraintData.constraint.id);
        ragdoll.constraints.splice(index, 1);
        ragdoll.setLimp();

        EventBus.emit('BONE_BROKEN', {
            boneId: constraintData.constraint.id,
            name: constraintData.name,
            impulse: force,
            x: pos.x,
            y: pos.y
        });
    }

    private maintainStiffPosture() {
        for (const ragdoll of this.ragdolls) {
            if (ragdoll.state === 'STIFF') {
                for (const part of ragdoll.parts) {
                    // Apply slight corrective torques to keep upright
                    if (part.name === 'Torso' || part.name === 'Pelvis' || part.name === 'Head') {
                        const angle = part.body.angle;
                        // Restoring torque
                        part.body.torque = -angle * 0.05 * part.body.mass;
                    }
                }
            }
        }
    }
}
