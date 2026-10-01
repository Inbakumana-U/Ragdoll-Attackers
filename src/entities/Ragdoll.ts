// src/entities/Ragdoll.ts
import Matter from 'matter-js';
import { COLLISION_LAYERS, MASKS } from '../constants/collisionLayers';

export interface RagdollPart {
    body: Matter.Body;
    name: string;
}

export interface RagdollConstraint {
    constraint: Matter.Constraint;
    name: string;
    partA: string;
    partB: string;
}

export class Ragdoll {
    public parts: RagdollPart[] = [];
    public constraints: RagdollConstraint[] = [];
    public state: 'STIFF' | 'RAGDOLL' = 'STIFF';

    constructor(x: number, y: number, scale = 1) {
        const group = Matter.Body.nextGroup(true);
        const collisionFilter = {
            group: group,
            category: COLLISION_LAYERS.CATEGORY_RAGDOLL,
            mask: MASKS.RAGDOLL_ENV
        };

        const renderProps = { visible: false };

        // Dimensions
        const headRadius = 15 * scale;
        const torsoWidth = 20 * scale;
        const torsoHeight = 60 * scale;
        const pelvisSize = 20 * scale;
        const armWidth = 10 * scale;
        const upperArmHeight = 30 * scale;
        const forearmHeight = 30 * scale;
        const legWidth = 12 * scale;
        const thighHeight = 35 * scale;
        const shinHeight = 35 * scale;

        // Bodies
        const head = Matter.Bodies.circle(x, y - torsoHeight / 2 - headRadius * 1.5, headRadius, { collisionFilter, render: renderProps, label: 'Head' });
        const torso = Matter.Bodies.rectangle(x, y, torsoWidth, torsoHeight, { collisionFilter, render: renderProps, label: 'Torso' });
        const pelvis = Matter.Bodies.rectangle(x, y + torsoHeight / 2 + pelvisSize / 2, pelvisSize, pelvisSize, { collisionFilter, render: renderProps, label: 'Pelvis' });

        const upperArmLeft = Matter.Bodies.rectangle(x - torsoWidth / 2 - upperArmHeight / 2, y - torsoHeight / 2 + armWidth / 2, upperArmHeight, armWidth, { collisionFilter, render: renderProps, label: 'UpperArmL' });
        const forearmLeft = Matter.Bodies.rectangle(x - torsoWidth / 2 - upperArmHeight - forearmHeight / 2, y - torsoHeight / 2 + armWidth / 2, forearmHeight, armWidth, { collisionFilter, render: renderProps, label: 'ForearmL' });

        const upperArmRight = Matter.Bodies.rectangle(x + torsoWidth / 2 + upperArmHeight / 2, y - torsoHeight / 2 + armWidth / 2, upperArmHeight, armWidth, { collisionFilter, render: renderProps, label: 'UpperArmR' });
        const forearmRight = Matter.Bodies.rectangle(x + torsoWidth / 2 + upperArmHeight + forearmHeight / 2, y - torsoHeight / 2 + armWidth / 2, forearmHeight, armWidth, { collisionFilter, render: renderProps, label: 'ForearmR' });

        const thighLeft = Matter.Bodies.rectangle(x - pelvisSize / 2, y + torsoHeight / 2 + pelvisSize + thighHeight / 2, legWidth, thighHeight, { collisionFilter, render: renderProps, label: 'ThighL' });
        const shinLeft = Matter.Bodies.rectangle(x - pelvisSize / 2, y + torsoHeight / 2 + pelvisSize + thighHeight + shinHeight / 2, legWidth, shinHeight, { collisionFilter, render: renderProps, label: 'ShinL' });

        const thighRight = Matter.Bodies.rectangle(x + pelvisSize / 2, y + torsoHeight / 2 + pelvisSize + thighHeight / 2, legWidth, thighHeight, { collisionFilter, render: renderProps, label: 'ThighR' });
        const shinRight = Matter.Bodies.rectangle(x + pelvisSize / 2, y + torsoHeight / 2 + pelvisSize + thighHeight + shinHeight / 2, legWidth, shinHeight, { collisionFilter, render: renderProps, label: 'ShinR' });

        this.parts.push(
            { body: head, name: 'Head' },
            { body: torso, name: 'Torso' },
            { body: pelvis, name: 'Pelvis' },
            { body: upperArmLeft, name: 'UpperArmL' },
            { body: forearmLeft, name: 'ForearmL' },
            { body: upperArmRight, name: 'UpperArmR' },
            { body: forearmRight, name: 'ForearmR' },
            { body: thighLeft, name: 'ThighL' },
            { body: shinLeft, name: 'ShinL' },
            { body: thighRight, name: 'ThighR' },
            { body: shinRight, name: 'ShinR' }
        );

        const stiffness = 0.9;
        const damping = 0.05;

        // Create joint constraints
        const createJoint = (bodyA: Matter.Body, bodyB: Matter.Body, pointA: { x: number, y: number }, pointB: { x: number, y: number }, name: string) => {
            const constraint = Matter.Constraint.create({
                bodyA,
                bodyB,
                pointA,
                pointB,
                stiffness,
                damping,
                render: { visible: false }
            });
            this.constraints.push({ constraint, name, partA: bodyA.label, partB: bodyB.label });
            return constraint;
        };

        createJoint(head, torso, { x: 0, y: headRadius }, { x: 0, y: -torsoHeight / 2 }, 'Neck');
        createJoint(torso, pelvis, { x: 0, y: torsoHeight / 2 }, { x: 0, y: -pelvisSize / 2 }, 'Waist');

        createJoint(torso, upperArmLeft, { x: -torsoWidth / 2, y: -torsoHeight / 2 + armWidth / 2 }, { x: upperArmHeight / 2, y: 0 }, 'ShoulderL');
        createJoint(upperArmLeft, forearmLeft, { x: -upperArmHeight / 2, y: 0 }, { x: forearmHeight / 2, y: 0 }, 'ElbowL');

        createJoint(torso, upperArmRight, { x: torsoWidth / 2, y: -torsoHeight / 2 + armWidth / 2 }, { x: -upperArmHeight / 2, y: 0 }, 'ShoulderR');
        createJoint(upperArmRight, forearmRight, { x: upperArmHeight / 2, y: 0 }, { x: -forearmHeight / 2, y: 0 }, 'ElbowR');

        createJoint(pelvis, thighLeft, { x: -pelvisSize / 2 + legWidth / 2, y: pelvisSize / 2 }, { x: 0, y: -thighHeight / 2 }, 'HipL');
        createJoint(thighLeft, shinLeft, { x: 0, y: thighHeight / 2 }, { x: 0, y: -shinHeight / 2 }, 'KneeL');

        createJoint(pelvis, thighRight, { x: pelvisSize / 2 - legWidth / 2, y: pelvisSize / 2 }, { x: 0, y: -thighHeight / 2 }, 'HipR');
        createJoint(thighRight, shinRight, { x: 0, y: thighHeight / 2 }, { x: 0, y: -shinHeight / 2 }, 'KneeR');
    }

    getBodies(): Matter.Body[] {
        return this.parts.map(p => p.body);
    }

    getConstraints(): Matter.Constraint[] {
        return this.constraints.map(c => c.constraint);
    }

    setLimp() {
        this.state = 'RAGDOLL';
        // Relax constraints and stop upright balancing
        this.constraints.forEach(c => {
            if (c.constraint) {
                c.constraint.stiffness = 0.5;
            }
        });
    }
}
