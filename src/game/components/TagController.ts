// @ts-nocheck -- imported game code written for looser TS settings
import * as THREE from 'three';
import { PlayerController, PLAYER_DIM, MOVEMENT, type AABB, type Ramp } from './PlayerController';
import { R6Character } from './R6Character';
import { VALLEY_BOUNDS } from './level';
import { CROSSINGS_TO_WIN } from './gameStore';
import { getOutfit, type EmoteId, type GloveId, type OutfitId } from './shopData';

export type BotRole = 'chaser' | 'runner';

const BOT_OUTFITS: OutfitId[] = ['skater', 'noob', 'cyber', 'violet', 'bigshot', 'soldier', 'classic'];
const BOT_GLOVES: GloveId[] = ['speed', 'boost', 'power', 'gravity', 'frost', 'blink', 'glider'];
const BOT_LOBBY_EMOTES: EmoteId[] = ['california', 'kazotsky', 'floss', 'ratdance', 'gangnam', 'boston', 'wave'];

const CHASER_COLORS = { shirt: 0xd12c1f, pants: 0x1e1f24, skin: 0xf5cd30, sleeve: 0x9e1c1c };

export class ValleyBot {
  readonly id: string;
  readonly name: string;
  readonly body: PlayerController;
  /** Detailed R6 rig — only built in Classic 8-player mode; MEGA 100 uses GPU-instanced CrowdRenderer! */
  rig: R6Character | null = null;
  readonly root = new THREE.Group();
  role: BotRole;
  crossings = 0;
  crossingsReported = 0;
  finished = false;
  targetZ: number = VALLEY_BOUNDS.FINISH_LINE_Z - 24;
  stumbleTimer = 0;
  freezeTimer = 0;
  ankleCooldown = 0;
  tagCooldown = 0;
  /** True only when drawn with full rig (Classic mode); false = blazing-fast instanced CrowdRenderer! */
  renderFull = false;
  /** Public heading yaw so CrowdRenderer reads it without overhead. */
  yaw = Math.PI;
  /** Walk-cycle phase used by CrowdRenderer. */
  crowdPhase = Math.random() * Math.PI * 2;
  /** Chaser speed scale (slightly moderated in MEGA mode so rounds stay tense & fair). */
  chaserSpeed = 1.04;
  /** Seconds a newly infected chaser is dazed in MEGA mode. */
  infectDaze = 0;

  readonly outfitId: OutfitId;
  readonly gloveId: GloveId;
  readonly colorIndex: number;
  readonly runnerColors: { shirt: number; pants: number; skin: number; sleeve: number };

  private readonly tallWalls: AABB[];
  private strafeDir = 1;
  private strafeTimer = 0;
  private skillTimer = 2.6 + Math.random() * 3.5;
  private retargetTimer = Math.random() * 0.25;
  private cachedGoalX = 0;
  private cachedGoalZ = 0;
  private weavePhase = Math.random() * Math.PI * 2;
  private laneOffsetX: number;
  private speedScale: number;

  constructor(
    id: string,
    name: string,
    boxes: AABB[],
    ramps: Ramp[],
    laneOffsetX: number,
    colorIndex: number,
  ) {
    this.id = id;
    this.name = name;
    this.role = 'runner';
    this.laneOffsetX = laneOffsetX;
    this.colorIndex = colorIndex;
    this.speedScale = 0.94 + (colorIndex % 3) * 0.05;
    this.outfitId = BOT_OUTFITS[colorIndex % BOT_OUTFITS.length];
    this.gloveId = BOT_GLOVES[(colorIndex * 3) % BOT_GLOVES.length];
    const o = getOutfit(this.outfitId);
    // Give varied fun runner shirt/skin hues so 100-player crowds burst with lively UTG color!
    this.runnerColors = {
      shirt: o.shirtHex,
      pants: o.pantsHex,
      skin: o.skinHex,
      sleeve: o.sleeveHex ?? o.skinHex,
    };
    this.tallWalls = boxes.filter((b) => b.maxY > MOVEMENT.STEP_HEIGHT + 0.3);
    this.body = new PlayerController(boxes, ramps);
    this.body.setGlove(this.gloveId);
  }

  get hasRig(): boolean {
    return this.rig !== null;
  }

  /** Builds the full detailed 3D rig (used in Classic 8-player mode only). */
  ensureRig(): R6Character {
    if (this.rig) return this.rig;
    const rig = new R6Character(true);
    rig.setGloves(this.gloveId, true);
    rig.headMesh.scale.setScalar(1.3);
    this.root.add(rig.root);
    this.rig = rig;
    rig.setOutfit(this.outfitId, this.role === 'chaser');
    rig.setFrozen(this.freezeTimer > 0);
    return rig;
  }

  get crowdColors(): { shirt: number; pants: number; skin: number; sleeve: number } {
    return this.role === 'chaser' ? CHASER_COLORS : this.runnerColors;
  }

  setLane(x: number): void {
    this.laneOffsetX = x;
  }

  convertToChaser(): void {
    if (this.role === 'chaser') return;
    this.role = 'chaser';
    this.speedScale = this.chaserSpeed;
    this.tagCooldown = 1.4 + this.infectDaze;
    this.retargetTimer = 0;
    if (this.infectDaze > 0) this.stumbleTimer = Math.max(this.stumbleTimer, this.infectDaze);
    if (this.rig) {
      this.rig.stopEmote();
      this.rig.setOutfit(this.outfitId, true);
    }
  }

  place(x: number, z: number, role: BotRole): void {
    this.role = role;
    this.speedScale = role === 'chaser' ? this.chaserSpeed : 0.94 + (this.colorIndex % 3) * 0.05;
    this.body.reset(x, 0.06, z);
    this.crossings = 0;
    this.crossingsReported = 0;
    this.finished = false;
    this.targetZ = VALLEY_BOUNDS.FINISH_LINE_Z - 24;
    this.cachedGoalX = x;
    this.cachedGoalZ = this.targetZ;
    this.retargetTimer = (this.colorIndex % 12) * 0.02;
    this.stumbleTimer = 0;
    this.freezeTimer = 0;
    this.ankleCooldown = 0;
    this.tagCooldown = 0;
    this.yaw = role === 'chaser' ? 0 : Math.PI;
    if (this.rig) {
      this.rig.setOutfit(this.outfitId, role === 'chaser');
      this.rig.setFrozen(false);
      this.rig.stopEmote();
    }
    if (this.renderFull) {
      this.root.position.set(x, 0.06, z);
      this.root.rotation.set(0, this.yaw, 0);
    }
  }

  triggerStumble(duration = 1.2): void {
    this.stumbleTimer = Math.max(this.stumbleTimer, duration);
    this.ankleCooldown = 2.4;
    this.body.vx *= 0.25;
    this.body.vz *= 0.25;
  }

  triggerFreeze(duration = 2.4): void {
    this.freezeTimer = Math.max(this.freezeTimer, duration);
    this.stumbleTimer = Math.max(this.stumbleTimer, duration);
    this.ankleCooldown = 2.8;
    this.body.vx = 0;
    this.body.vz = 0;
    this.rig?.setFrozen(true);
  }

  /** Fast lobby idle — near-zero CPU in MEGA mode, full dances in Classic! */
  idle(dt: number, allowDance = false): void {
    const b = this.body;
    if (b.y > 0.1 || b.vx !== 0 || b.vz !== 0) b.stepBot(dt, 0, 0, false);
    this.freezeTimer = 0;
    if (this.renderFull && this.rig) {
      this.rig.setFrozen(false);
      if (allowDance && !this.rig.emoting && this.colorIndex % 2 === 0) {
        this.rig.playEmote(BOT_LOBBY_EMOTES[this.colorIndex % BOT_LOBBY_EMOTES.length]);
      } else if (!allowDance && this.rig.emoting) {
        this.rig.stopEmote();
      }
      this.root.position.set(b.x, b.y, b.z);
      this.root.rotation.set(0, this.yaw, 0);
      this.animate(dt, 0);
    }
  }

  /** Fast simulation update — uses staggered target caching & single-step bot physics. */
  update(
    dt: number,
    player: PlayerController,
    playerRole: 'runner' | 'tagger',
    playerInSafe: boolean,
    activeRunners: ValleyBot[],
  ): void {
    const b = this.body;
    if (this.rig?.emoting) this.rig.stopEmote();
    this.weavePhase += dt * 2.1;
    if (this.stumbleTimer > 0) this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
    if (this.freezeTimer > 0) this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    if (this.ankleCooldown > 0) this.ankleCooldown = Math.max(0, this.ankleCooldown - dt);
    if (this.tagCooldown > 0) this.tagCooldown = Math.max(0, this.tagCooldown - dt);
    this.skillTimer -= dt;

    if (this.freezeTimer > 0) {
      b.vx = 0;
      b.vz = 0;
      if (this.renderFull && this.rig) {
        this.rig.setFrozen(true);
        this.root.position.set(b.x, b.y, b.z);
        this.root.rotation.z = Math.sin(this.freezeTimer * 36) * 0.04;
      }
      return;
    }
    if (this.renderFull && this.rig) this.rig.setFrozen(false);

    if (this.finished) {
      this.idle(dt, true);
      return;
    }

    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeDir = Math.random() < 0.5 ? -1 : 1;
      this.strafeTimer = 1.2 + Math.random() * 1.4;
    }

    let goalX = this.laneOffsetX;
    let goalZ = this.targetZ;

    if (this.role === 'chaser') {
      // Stagger nearest-runner search (5x/sec per chaser instead of 60x/sec -> massive CPU savings in 100p!)
      this.retargetTimer -= dt;
      if (this.retargetTimer <= 0) {
        this.retargetTimer = 0.2;
        let bestD2 = Infinity;
        let gx = Math.sin(this.weavePhase * 0.45 + this.colorIndex) * 180;
        let gz = Math.cos(this.weavePhase * 0.3 + this.colorIndex) * 210;

        if (playerRole === 'runner' && !playerInSafe) {
          const pdx = player.x - b.x;
          const pdz = player.z - b.z;
          bestD2 = pdx * pdx + pdz * pdz;
          gx = player.x;
          gz = player.z;
        }
        // Check open runners list (passed pre-filtered once per frame!)
        const len = activeRunners.length;
        for (let i = 0; i < len; i++) {
          const r = activeRunners[i];
          const ddx = r.body.x - b.x;
          const ddz = r.body.z - b.z;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 < bestD2) {
            bestD2 = d2;
            gx = r.body.x;
            gz = r.body.z;
          }
        }
        this.cachedGoalX = gx;
        this.cachedGoalZ = Math.max(VALLEY_BOUNDS.FINISH_LINE_Z + 10, Math.min(VALLEY_BOUNDS.START_LINE_Z - 10, gz));
      }
      goalX = this.cachedGoalX;
      goalZ = this.cachedGoalZ;
    } else {
      if (this.targetZ < 0 && b.z <= VALLEY_BOUNDS.FINISH_LINE_Z - 6) {
        this.crossings++;
        this.targetZ = VALLEY_BOUNDS.START_LINE_Z + 24;
      } else if (this.targetZ > 0 && b.z >= VALLEY_BOUNDS.START_LINE_Z + 6) {
        this.crossings++;
        this.targetZ = VALLEY_BOUNDS.FINISH_LINE_Z - 24;
      }
      if (this.crossings >= CROSSINGS_TO_WIN) {
        this.finished = true;
        b.vx = 0;
        b.vz = 0;
        return;
      }
      goalX = this.laneOffsetX + Math.sin(this.weavePhase * 0.85) * 26;
      goalZ = this.targetZ;
      if (playerRole === 'tagger') {
        const pdx = b.x - player.x;
        const pdz = b.z - player.z;
        const d2 = pdx * pdx + pdz * pdz;
        if (d2 < 3600 && d2 > 0.1) {
          const inv = 48 / Math.sqrt(d2);
          goalX = b.x + pdx * inv;
        }
      }
    }

    const dx = goalX - b.x;
    const dz = goalZ - b.z;
    const distSq = dx * dx + dz * dz;
    const shouldMove = this.stumbleTimer <= 0 && distSq > 2.25;
    let wx = 0;
    let wz = 0;

    if (shouldMove) {
      const dist = Math.sqrt(distSq);
      const baseAngle = Math.atan2(dz, dx);
      const weave = Math.sin(this.weavePhase) * 0.16 * Math.min(1, dist / 24);
      const a = baseAngle + weave * this.strafeDir;
      wx = Math.cos(a);
      wz = Math.sin(a);
      if (this.lookAheadBlocked(wx, wz)) {
        const alt = baseAngle + Math.PI * 0.45 * this.strafeDir;
        wx = Math.cos(alt);
        wz = Math.sin(alt);
        if (this.lookAheadBlocked(wx, wz)) {
          const alt2 = baseAngle - Math.PI * 0.45 * this.strafeDir;
          wx = Math.cos(alt2);
          wz = Math.sin(alt2);
        }
      }
      const spSq = b.vx * b.vx + b.vz * b.vz;
      if (b.grounded && spSq < 144) b.queueJump();
      if (this.skillTimer <= 0 && b.grounded && spSq > 1300) {
        b.queueSlide();
        this.skillTimer = 3.5 + Math.random() * 4.0;
      }
    }

    b.stepBot(this.stumbleTimer > 0 ? dt * 0.3 : dt * this.speedScale, wx, wz, shouldMove);

    const spSqAfter = b.vx * b.vx + b.vz * b.vz;
    if (spSqAfter > 0.5) {
      const targetYaw = Math.atan2(b.vx, b.vz);
      const diff = Math.atan2(Math.sin(targetYaw - this.yaw), Math.cos(targetYaw - this.yaw));
      this.yaw += diff * Math.min(1, 10 * dt);
    }

    if (this.renderFull && this.rig) {
      this.root.position.set(b.x, b.y, b.z);
      this.root.rotation.y = this.yaw;
      const wobble = this.stumbleTimer > 0 ? Math.min(1, this.stumbleTimer * 2) : 0;
      this.root.rotation.z = Math.sin(this.stumbleTimer * 26) * 0.55 * wobble;
      this.root.rotation.x = wobble * -0.35;
      this.animate(dt, this.stumbleTimer > 0 ? 0.2 : Math.min(1.3, Math.sqrt(spSqAfter) / 54));
    }
  }

  private animate(dt: number, speedRatio: number): void {
    if (!this.rig || !this.renderFull) return;
    const b = this.body;
    this.rig.update({
      dt,
      speedRatio,
      isGrounded: b.grounded,
      verticalVelocity: b.vy,
      isSliding: b.sliding,
      isGliding: b.gliding,
      isDashing: b.dashing,
      strafeAmount: 0,
      forwardAmount: 1,
      turnRate: 0,
      landingSquash: 0,
    });
  }

  private lookAheadBlocked(wx: number, wz: number): boolean {
    const b = this.body;
    const px = b.x + wx * 4.8;
    const pz = b.z + wz * 4.8;
    const hw = PLAYER_DIM.HALF_W;
    const walls = this.tallWalls;
    for (let i = 0; i < walls.length; i++) {
      const box = walls[i];
      if (
        px + hw > box.minX &&
        px - hw < box.maxX &&
        pz + hw > box.minZ &&
        pz - hw < box.maxZ &&
        box.maxY > b.y + 0.9 &&
        box.minY < b.y + PLAYER_DIM.HEIGHT
      ) {
        return true;
      }
    }
    return false;
  }
}
