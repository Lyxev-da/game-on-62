import * as THREE from 'three';
import { createGoofyFaceTexture } from '../utils/characterTextures';
import type { ValleyBot } from './TagController';

/**
 * Ultra-fast GPU-instanced R6 crowd renderer for MEGA 100 mode.
 *
 * Draws up to 100 animated blocky Roblox players in just 7 draw calls total:
 *   head (with iconic goofy face!), torso, arms, legs, chaser devil horns,
 *   frozen cryo ice-cubes, and soft grounded contact shadow discs.
 *
 * Zero dynamic shadow-map re-renders, zero per-frame allocations, zero WebGL stalls -> locked 60+ FPS!
 */
export class CrowdRenderer {
  private readonly head: THREE.InstancedMesh;
  private readonly torso: THREE.InstancedMesh;
  private readonly arms: THREE.InstancedMesh;
  private readonly legs: THREE.InstancedMesh;
  private readonly horns: THREE.InstancedMesh;
  private readonly ice: THREE.InstancedMesh;
  private readonly shadow: THREE.InstancedMesh;

  private bodies = 0;
  private hornCount = 0;
  private iceCount = 0;
  private time = 0;

  private readonly color = new THREE.Color();
  private readonly pos = new THREE.Vector3();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly rootM = new THREE.Matrix4();
  private readonly upperM = new THREE.Matrix4();
  private readonly hipM = new THREE.Matrix4();
  private readonly rotX = new THREE.Matrix4();
  private readonly rotZ = new THREE.Matrix4();
  private readonly tmpM = new THREE.Matrix4();
  private readonly outM = new THREE.Matrix4();
  private readonly headScale = new THREE.Matrix4().makeScale(1.28, 1.28, 1.28);
  private readonly one = new THREE.Vector3(1, 1, 1);

  constructor(scene: THREE.Scene, maxBodies = 104) {
    const faceTex = createGoofyFaceTexture(4);
    const plainSide = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const faceFront = new THREE.MeshLambertMaterial({ map: faceTex, color: 0xffffff });

    const make = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], count: number, colored = true) => {
      const m = new THREE.InstancedMesh(geo, mat, count);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.castShadow = false;
      m.receiveShadow = false;
      m.count = 0;
      if (colored) {
        for (let i = 0; i < count; i++) m.setColorAt(i, this.color.setHex(0xffffff));
      }
      scene.add(m);
      return m;
    };

    // Faces on +Z (face index 4 in BoxGeometry) show the iconic goofy Roblox face!
    this.head = make(
      new THREE.BoxGeometry(1.22, 1.22, 1.22),
      [plainSide, plainSide, plainSide, plainSide, faceFront, plainSide],
      maxBodies,
    );
    this.torso = make(new THREE.BoxGeometry(2, 2, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), maxBodies);
    this.arms = make(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), maxBodies * 2);
    this.legs = make(new THREE.BoxGeometry(0.98, 2, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), maxBodies * 2);

    // Bright glowing crimson devil horns so chasers pop cleanly from 400+ studs away!
    this.horns = make(
      new THREE.ConeGeometry(0.24, 0.85, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2b20 }),
      maxBodies * 2,
      false,
    );

    // Translucent cyan ice blocks when a runner hits chasers with Subzero Claws!
    this.ice = make(
      new THREE.BoxGeometry(4.0, 5.6, 3.4),
      new THREE.MeshBasicMaterial({
        color: 0x8be9ff,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
      }),
      maxBodies,
      false,
    );

    // Crisp grounded circular contact shadow discs (replaces 600 expensive shadow-map meshes!).
    const discGeo = new THREE.CircleGeometry(1.65, 12);
    discGeo.rotateX(-Math.PI / 2);
    this.shadow = make(
      discGeo,
      new THREE.MeshBasicMaterial({
        color: 0x0f1a10,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
      maxBodies,
      false,
    );
  }

  begin(dt: number): void {
    this.bodies = 0;
    this.hornCount = 0;
    this.iceCount = 0;
    this.time += dt;
  }

  /** Renders one animated blocky bot inside the shared instanced batch. */
  add(bot: ValleyBot, dt: number, lobbyDance: boolean): void {
    const i = this.bodies;
    if (i >= this.head.instanceMatrix.count) return;
    this.bodies++;

    const b = bot.body;
    const frozen = bot.freezeTimer > 0;
    const speedSq = b.vx * b.vx + b.vz * b.vz;
    const spd = speedSq > 0.25 ? Math.sqrt(speedSq) : 0;
    const ratio = frozen ? 0 : Math.min(1.3, spd / 54);
    const dancing = lobbyDance && !frozen && ratio < 0.08 && (bot.colorIndex & 1) === 0;

    if (b.grounded && ratio > 0.06) bot.crowdPhase += dt * (12 + ratio * 5.6);

    let lArm = 0;
    let rArm = 0;
    let lArmRoll = 0.12;
    let rArmRoll = -0.12;
    let lLeg = 0;
    let rLeg = 0;
    let hipY = 2.0;
    let torsoLean = 0;

    if (frozen) {
      lArm = -0.45;
      rArm = -0.45;
    } else if (dancing) {
      // Lively wave/cheer/kazotsky group lobby dance across all 99 bots at ~0 GPU cost!
      const p = this.time * 6.4 + bot.colorIndex * 0.9;
      const bounce = Math.abs(Math.sin(p));
      const s = Math.sin(p);
      hipY = 2.0 + bounce * 0.42;
      lArm = -2.4 + s * 0.4;
      rArm = -2.4 - s * 0.4;
      lArmRoll = 0.35 + bounce * 0.28;
      rArmRoll = -0.35 - bounce * 0.28;
      lLeg = s * 0.45;
      rLeg = -s * 0.45;
    } else if (b.sliding) {
      lArm = -0.85;
      rArm = 0.7;
      lArmRoll = 0.45;
      rArmRoll = -0.45;
      lLeg = -1.25;
      rLeg = 0.5;
      hipY = 1.05;
      torsoLean = -0.58;
    } else if (!b.grounded) {
      const up = Math.min(1, Math.max(0, b.vy / 32 + 0.5));
      lArm = -0.32 - 1.55 * up;
      rArm = lArm + 0.14;
      lLeg = -0.14 - 0.56 * up;
      rLeg = 0.14 + 0.24 * up;
      torsoLean = 0.14;
    } else if (ratio > 0.06) {
      const swing = Math.sin(bot.crowdPhase) * 0.96 * Math.min(1, ratio);
      const bounce = Math.abs(Math.cos(bot.crowdPhase)) * 0.16 * Math.min(1, ratio);
      lArm = -swing;
      rArm = swing;
      lLeg = swing;
      rLeg = -swing;
      hipY = 2.0 + bounce;
      torsoLean = 0.22 * Math.min(1, ratio);
    }

    // Stumble wobble when ankles are broken!
    const wobble = bot.stumbleTimer > 0 && !frozen ? Math.min(1, bot.stumbleTimer * 2) : 0;
    const rotZ = wobble > 0 ? Math.sin(bot.stumbleTimer * 24) * 0.52 * wobble : 0;
    const rotX = wobble > 0 ? -0.32 * wobble : 0;
    this.euler.set(rotX, bot.yaw, rotZ, 'YXZ');
    this.quat.setFromEuler(this.euler);
    this.pos.set(b.x, b.y, b.z);
    this.rootM.compose(this.pos, this.quat, this.one);

    // Contact ground shadow disc
    const sScale = Math.max(0.45, 1 - b.y * 0.025);
    this.tmpM.makeTranslation(b.x, 0.12, b.z);
    this.outM.makeScale(sScale, 1, sScale);
    this.shadow.setMatrixAt(i, this.tmpM.multiply(this.outM));

    // Upper body pivot around hip
    this.tmpM.makeTranslation(0, hipY, 0).multiply(this.rotX.makeRotationX(torsoLean));
    this.upperM.multiplyMatrices(this.rootM, this.tmpM);

    // Torso
    this.tmpM.makeTranslation(0, 1, 0);
    this.torso.setMatrixAt(i, this.outM.multiplyMatrices(this.upperM, this.tmpM));

    // Head (with goofy face pointing +Z!)
    this.tmpM.makeTranslation(0, 2.74, 0).multiply(this.headScale);
    this.head.setMatrixAt(i, this.outM.multiplyMatrices(this.upperM, this.tmpM));

    // Glowing red chaser devil horns (makes every chaser pop across the whole mega field!)
    if (bot.role === 'chaser') {
      this.tmpM.makeTranslation(0.5, 3.72, 0.08).multiply(this.rotZ.makeRotationZ(-0.24));
      this.horns.setMatrixAt(this.hornCount++, this.outM.multiplyMatrices(this.upperM, this.tmpM));
      this.tmpM.makeTranslation(-0.5, 3.72, 0.08).multiply(this.rotZ.makeRotationZ(0.24));
      this.horns.setMatrixAt(this.hornCount++, this.outM.multiplyMatrices(this.upperM, this.tmpM));
    }

    // Translucent 3D ice cube if frozen by Subzero Claws
    if (frozen) {
      this.tmpM.makeTranslation(b.x, b.y + 2.8, b.z);
      this.ice.setMatrixAt(this.iceCount++, this.tmpM);
    }

    // Arms (Left +X, Right -X)
    this.setLimb(this.arms, i * 2, this.upperM, 1.52, 1.75, lArm, lArmRoll, -0.75);
    this.setLimb(this.arms, i * 2 + 1, this.upperM, -1.52, 1.75, rArm, rArmRoll, -0.75);

    // Legs
    this.tmpM.makeTranslation(0, hipY, 0);
    this.hipM.multiplyMatrices(this.rootM, this.tmpM);
    this.setLimb(this.legs, i * 2, this.hipM, 0.51, 0, lLeg, 0, -1);
    this.setLimb(this.legs, i * 2 + 1, this.hipM, -0.51, 0, rLeg, 0, -1);

    // Per-instance Roblox outfit colors
    const c = bot.crowdColors;
    const tint = frozen ? 0xaef0ff : 0;
    this.head.setColorAt(i, this.color.setHex(tint || c.skin));
    this.torso.setColorAt(i, this.color.setHex(tint || c.shirt));
    this.arms.setColorAt(i * 2, this.color.setHex(tint || c.sleeve));
    this.arms.setColorAt(i * 2 + 1, this.color.setHex(tint || c.sleeve));
    this.legs.setColorAt(i * 2, this.color.setHex(tint || c.pants));
    this.legs.setColorAt(i * 2 + 1, this.color.setHex(tint || c.pants));
  }

  end(): void {
    const n = this.bodies;
    this.head.count = n;
    this.torso.count = n;
    this.arms.count = n * 2;
    this.legs.count = n * 2;
    this.shadow.count = n;
    this.horns.count = this.hornCount;
    this.ice.count = this.iceCount;

    if (n > 0) {
      for (const m of [this.head, this.torso, this.arms, this.legs]) {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
      this.shadow.instanceMatrix.needsUpdate = true;
    }
    if (this.hornCount > 0) this.horns.instanceMatrix.needsUpdate = true;
    if (this.iceCount > 0) this.ice.instanceMatrix.needsUpdate = true;
  }

  private setLimb(
    mesh: THREE.InstancedMesh,
    index: number,
    parent: THREE.Matrix4,
    px: number,
    py: number,
    pitch: number,
    roll: number,
    hang: number,
  ): void {
    this.tmpM
      .makeTranslation(px, py, 0)
      .multiply(this.rotX.makeRotationX(pitch))
      .multiply(this.rotZ.makeRotationZ(roll));
    // Multiply translate(0, hang, 0) cleanly into upper columns with zero extra Matrix4 alloc
    const e = this.tmpM.elements;
    e[12] += e[4] * hang;
    e[13] += e[5] * hang;
    e[14] += e[6] * hang;
    mesh.setMatrixAt(index, this.outM.multiplyMatrices(parent, this.tmpM));
  }
}
