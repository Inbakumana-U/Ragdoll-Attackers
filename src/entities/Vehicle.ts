// src/entities/Vehicle.ts
import Matter from 'matter-js';
import { COLLISION_LAYERS, MASKS } from '../constants/collisionLayers';
import { Ragdoll } from './Ragdoll';
import { EventBus } from '../core/EventBus';

export class Vehicle {
    public chassis: Matter.Body;
    public wheelFront: Matter.Body;
    public wheelBack: Matter.Body;
    private constraints: Matter.Constraint[] = [];

    private driver: Ragdoll | null = null;
    private driverConstraints: Matter.Constraint[] = [];

    private engine: Matter.Engine;
    private preUpdateVelocities = new Map<number, { x: number, y: number }>();

    constructor(engine: Matter.Engine, x: number, y: number) {
        this.engine = engine;

        const group = Matter.Body.nextGroup(true);
        const collisionFilter = {
            group: group,
            category: COLLISION_LAYERS.CATEGORY_VEHICLE,
            mask: MASKS.VEHICLE_ENV
        };

        this.chassis = Matter.Bodies.rectangle(x, y, 120, 30, {
            collisionFilter,
            density: 0.05,
            label: 'Chassis'
        });

        const wheelOptions = {
            collisionFilter,
            friction: 0.8,
            density: 0.05,
            restitution: 0.1,
            label: 'Wheel'
        };

        this.wheelFront = Matter.Bodies.circle(x + 50, y + 25, 20, wheelOptions);
        this.wheelBack = Matter.Bodies.circle(x - 50, y + 25, 20, wheelOptions);

        const suspensionStiffness = 0.8;
        const suspensionDamping = 0.1;

        const suspensionFront = Matter.Constraint.create({
            bodyA: this.chassis,
            bodyB: this.wheelFront,
            pointA: { x: 50, y: 15 },
            stiffness: suspensionStiffness,
            damping: suspensionDamping,
            length: 15
        });

        const suspensionBack = Matter.Constraint.create({
            bodyA: this.chassis,
            bodyB: this.wheelBack,
            pointA: { x: -50, y: 15 },
            stiffness: suspensionStiffness,
            damping: suspensionDamping,
            length: 15
        });

        this.constraints.push(suspensionFront, suspensionBack);

        // Listen for impact to eject driver
        Matter.Events.on(this.engine, 'beforeUpdate', () => {
            this.preUpdateVelocities.set(this.chassis.id, { x: this.chassis.velocity.x, y: this.chassis.velocity.y });
        });

        Matter.Events.on(this.engine, 'afterUpdate', () => {
            if (this.driver) {
                const preVel = this.preUpdateVelocities.get(this.chassis.id);
                if (preVel) {
                    const postVel = this.chassis.velocity;
                    const deltaVx = preVel.x - postVel.x;
                    const deltaVy = preVel.y - postVel.y;
                    const deltaV = Math.hypot(deltaVx, deltaVy);

                    if (deltaV > 20) {
                        this.ejectDriver();
                    }
                }
            }
        });
    }

    getBodies(): Matter.Body[] {
        return [this.chassis, this.wheelFront, this.wheelBack];
    }

    getConstraints(): Matter.Constraint[] {
        return this.constraints;
    }

    mountDriver(ragdoll: Ragdoll) {
        this.driver = ragdoll;
        const pelvis = ragdoll.parts.find(p => p.name === 'Pelvis')?.body;
        const forearmL = ragdoll.parts.find(p => p.name === 'ForearmL')?.body;
        const forearmR = ragdoll.parts.find(p => p.name === 'ForearmR')?.body;

        if (pelvis) {
            const seatConstraint = Matter.Constraint.create({
                bodyA: this.chassis,
                bodyB: pelvis,
                pointA: { x: -20, y: -20 },
                stiffness: 0.9
            });
            this.driverConstraints.push(seatConstraint);
            Matter.World.add(this.engine.world, seatConstraint);
        }

        if (forearmL && forearmR) {
            const handConstraintL = Matter.Constraint.create({
                bodyA: this.chassis,
                bodyB: forearmL,
                pointA: { x: 30, y: -20 },
                pointB: { x: 15, y: 0 },
                stiffness: 0.9
            });
            const handConstraintR = Matter.Constraint.create({
                bodyA: this.chassis,
                bodyB: forearmR,
                pointA: { x: 30, y: -20 },
                pointB: { x: 15, y: 0 },
                stiffness: 0.9
            });
            this.driverConstraints.push(handConstraintL, handConstraintR);
            Matter.World.add(this.engine.world, [handConstraintL, handConstraintR]);
        }
    }

    private ejectDriver() {
        if (!this.driver) return;

        // Remove seat constraints
        Matter.World.remove(this.engine.world, this.driverConstraints);
        this.driverConstraints = [];

        // Apply forward launch momentum amplified
        const launchForce = {
            x: this.chassis.velocity.x * 0.05,
            y: -Math.abs(this.chassis.velocity.x * 0.02) - 0.05
        };

        const pelvis = this.driver.parts.find(p => p.name === 'Pelvis')?.body;
        if (pelvis) {
            Matter.Body.applyForce(pelvis, pelvis.position, launchForce);
        }

        this.driver.setLimp();
        const speed = Math.hypot(this.chassis.velocity.x, this.chassis.velocity.y);
        EventBus.emit('VEHICLE_EJECT', { speed });
        this.driver = null; // Unmounted
    }

    applyLaunchImpulse(power: number) {
        // power from 0 to 1
        const forceMagnitude = 0.5 + (power * 1.5);
        Matter.Body.applyForce(this.chassis, this.chassis.position, { x: forceMagnitude, y: 0 });
        // Add a slight rotational torque to keep front down initially
        this.chassis.torque = forceMagnitude * 10;
    }
}
