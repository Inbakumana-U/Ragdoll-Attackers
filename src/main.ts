// src/main.ts
import Matter from 'matter-js';
import { physics } from './engine/PhysicsWorld';
import { Camera } from './engine/Camera';
import { Ragdoll } from './entities/Ragdoll';
import { DamageSystem } from './systems/DamageSystem';
import { RagdollRenderer } from './renderers/RagdollRenderer';
import { EventBus } from './core/EventBus';
import { Vehicle } from './entities/Vehicle';
import { TrackBuilder } from './stages/TrackBuilder';
import { TNTBarrel, SpinningSaw } from './entities/Hazards';
import { ArcherySystem } from './systems/ArcherySystem';
import { Arrow } from './entities/Arrow';
import { GameManager } from './core/GameManager';
import { ScoreEngine } from './systems/ScoreEngine';
import { HUD } from './ui/HUD';
import { SoundEffects } from './audio/SoundEffects';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const camera = new Camera();

const damageSystem = new DamageSystem(physics.engine);
const ragdollRenderer = new RagdollRenderer();

// Build Track
const track = new TrackBuilder();
Matter.World.add(physics.world, track.bodies);

// Hazards
const tnt = new TNTBarrel(physics.engine, 1000, 500); // place somewhere near bottom
Matter.World.add(physics.world, tnt.body);
const tnt2 = new TNTBarrel(physics.engine, 1050, 500);
Matter.World.add(physics.world, tnt2.body);

const saws: SpinningSaw[] = [];
const saw = new SpinningSaw(1200, 600);
saws.push(saw);
Matter.World.add(physics.world, saw.body);

// Setup vehicle and ragdoll driver
const vehicle = new Vehicle(physics.engine, -100, -200);
Matter.World.add(physics.world, [...vehicle.getBodies(), ...vehicle.getConstraints()]);

const driver = new Ragdoll(-100, -250, 1);
Matter.World.add(physics.world, [...driver.getBodies(), ...driver.getConstraints()]);
damageSystem.addRagdoll(driver);
ragdollRenderer.addRagdoll(driver);
vehicle.mountDriver(driver);

const archerySystem = new ArcherySystem(canvas, camera);
let arrows: Arrow[] = [];

const gameManager = new GameManager();
const scoreEngine = new ScoreEngine();
const hud = new HUD('ui-layer');
new SoundEffects();

EventBus.on('FIRE_ARROW', (payload) => {
    const arrow = new Arrow(physics.engine, payload.arrowType as any, payload.x, payload.y, payload.vx, payload.vy);
    arrows.push(arrow);
    Matter.World.add(physics.world, arrow.body);
});

// Collision for Arrows
Matter.Events.on(physics.engine, 'collisionStart', (e) => {
    for (const pair of e.pairs) {
        let arrowBody = null;
        let otherBody = null;
        if (pair.bodyA.label === 'Arrow') { arrowBody = pair.bodyA; otherBody = pair.bodyB; }
        else if (pair.bodyB.label === 'Arrow') { arrowBody = pair.bodyB; otherBody = pair.bodyA; }

        if (arrowBody && otherBody) {
            const arrowObj = arrows.find(a => a.body === arrowBody);
            if (arrowObj) {
                arrowObj.onHit(otherBody, arrowBody.position); // approximate hit point
            }
        }
    }
});

// Listen to SPACE to launch vehicle
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        vehicle.applyLaunchImpulse(1.0); // max power for now
        console.log('Vehicle launched!');
        EventBus.emit('GAME_START', undefined); // trigger state flow
    }
});

// Reset Logic
EventBus.on('RUN_RESET', () => {
    physics.reset();
    arrows = [];

    // Re-add static track
    Matter.World.add(physics.world, track.bodies);
    Matter.World.add(physics.world, saw.body);

    // Recreate dynamic objects (naive simple reset)
    // In a real app we'd fully re-instantiate or deep copy initial state

    // For now we just reload the page as it's the cleanest way to guarantee full reset
    window.location.reload();
});

let idleTime = 0;

// TNT Collision Detection
Matter.Events.on(physics.engine, 'collisionStart', (e) => {
    for (const pair of e.pairs) {
        if (pair.bodyA.label === 'TNTBarrel' || pair.bodyB.label === 'TNTBarrel') {
            // Very naive collision check for detonation
            const speedA = pair.bodyA.velocity.x*pair.bodyA.velocity.x + pair.bodyA.velocity.y*pair.bodyA.velocity.y;
            const speedB = pair.bodyB.velocity.x*pair.bodyB.velocity.x + pair.bodyB.velocity.y*pair.bodyB.velocity.y;
            if (speedA > 25 || speedB > 25) {
                if (pair.bodyA.label === 'TNTBarrel' && pair.bodyA === tnt.body) tnt.detonate();
                if (pair.bodyB.label === 'TNTBarrel' && pair.bodyB === tnt.body) tnt.detonate();
                if (pair.bodyA.label === 'TNTBarrel' && pair.bodyA === tnt2.body) tnt2.detonate();
                if (pair.bodyB.label === 'TNTBarrel' && pair.bodyB === tnt2.body) tnt2.detonate();
            }
        }
    }
});


// Listen to R key to spawn ragdoll
window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        const ragdoll = new Ragdoll(0, 300);
        Matter.World.add(physics.world, [...ragdoll.getBodies(), ...ragdoll.getConstraints()]);
        damageSystem.addRagdoll(ragdoll);
        ragdollRenderer.addRagdoll(ragdoll);
        console.log('Ragdoll spawned at y=300!');
    }
});

EventBus.on('BONE_BROKEN', (payload) => {
    console.log('BONE_BROKEN:', payload);
});

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

physics.start();

let lastTime = performance.now();

function render(time: number) {
    const dt = time - lastTime;
    lastTime = time;

    // Update Game Logic
    if (gameManager.state === 'RUN_ACTIVE') {
        // Auto-detect rest state
        const speed = Math.hypot(vehicle.chassis.velocity.x, vehicle.chassis.velocity.y);
        hud.updateSpeed(speed);

        let allResting = true;
        const bodies = Matter.Composite.allBodies(physics.engine.world);
        for (const b of bodies) {
            // Kill plane check first, trumps all other logic
            if (b.position.y > 2000) {
                allResting = true; // force end if fall off map
                break;
            }

            if (!b.isStatic && Math.hypot(b.velocity.x, b.velocity.y) > 0.5) {
                allResting = false;
                // Don't break immediately, we might find a body below the kill plane further down the list
            }
        }

        if (allResting) {
            idleTime += dt;
            if (idleTime > 1500) {
                EventBus.emit('RUN_RESOLVED', undefined);
                scoreEngine.setAirborne(false);
            }
        } else {
            idleTime = 0;
        }
    }

    scoreEngine.update(dt);
    hud.update(time);

    // Update Camera (follow vehicle or driver)
    camera.setTarget(vehicle.chassis); // could switch to driver if ejected
    camera.update(dt);

    // Update hazards
    saws.forEach(s => s.update());

    arrows.forEach(a => a.alignWithVelocity());

    // Clear Canvas
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    camera.applyTransform(ctx);

    // Draw Track
    ctx.fillStyle = '#444';
    for (const body of track.bodies) {
        ctx.beginPath();
        ctx.moveTo(body.vertices[0].x, body.vertices[0].y);
        for (let j = 1; j < body.vertices.length; j++) {
            ctx.lineTo(body.vertices[j].x, body.vertices[j].y);
        }
        ctx.closePath();
        ctx.fill();
    }

    // Draw Saws
    ctx.fillStyle = '#888';
    for (const s of saws) {
        ctx.beginPath();
        ctx.moveTo(s.body.vertices[0].x, s.body.vertices[0].y);
        for (let j = 1; j < s.body.vertices.length; j++) {
            ctx.lineTo(s.body.vertices[j].x, s.body.vertices[j].y);
        }
        ctx.closePath();
        ctx.fill();
    }

    // Draw Vehicle
    ctx.fillStyle = '#55a';
    ctx.beginPath();
    ctx.moveTo(vehicle.chassis.vertices[0].x, vehicle.chassis.vertices[0].y);
    for (let j = 1; j < vehicle.chassis.vertices.length; j++) {
        ctx.lineTo(vehicle.chassis.vertices[j].x, vehicle.chassis.vertices[j].y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(vehicle.wheelFront.position.x, vehicle.wheelFront.position.y, 20, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(vehicle.wheelBack.position.x, vehicle.wheelBack.position.y, 20, 0, Math.PI*2);
    ctx.fill();

    // Draw TNT
    ctx.fillStyle = '#a22';
    const drawTNT = (tntBody: Matter.Body) => {
        if (!tntBody.isSleeping && Matter.Composite.allBodies(physics.engine.world).includes(tntBody)) {
            ctx.beginPath();
            ctx.moveTo(tntBody.vertices[0].x, tntBody.vertices[0].y);
            for (let j = 1; j < tntBody.vertices.length; j++) {
                ctx.lineTo(tntBody.vertices[j].x, tntBody.vertices[j].y);
            }
            ctx.closePath();
            ctx.fill();
        }
    };
    drawTNT(tnt.body);
    drawTNT(tnt2.body);

    // Draw Arrows
    ctx.fillStyle = '#fff';
    for (const a of arrows) {
        ctx.beginPath();
        ctx.moveTo(a.body.vertices[0].x, a.body.vertices[0].y);
        for (let j = 1; j < a.body.vertices.length; j++) {
            ctx.lineTo(a.body.vertices[j].x, a.body.vertices[j].y);
        }
        ctx.closePath();
        ctx.fill();
    }

    archerySystem.renderTrajectory(ctx);

    // Draw Ragdolls
    ragdollRenderer.render(ctx, time);

    // Draw an origin marker for debugging
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
