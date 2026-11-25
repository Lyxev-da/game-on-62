import { getGlove, type GloveId } from './shopData';

/**
 * Clean, responsive movement simulation:
 *   Run (WASD) + Jump (Space) + Slide (C) + Equipped Glove Ability (E / X)
 *
 * No extra movement tech clutter (no bhop chains, no base dash, no wall-run,
 * no wall-jump, no vault, no dive). Frame-rate independent via fixed sub-steps.
 */

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  ice?: boolean;
  bounce?: number;
}

export interface Ramp {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  axis: 'x' | 'z';
  y0: number;
  y1: number;
}

export const PLAYER_DIM = {
  HALF_W: 0.9,
  HALF_D: 0.9,
  HEIGHT: 5.2,
  SLIDE_HEIGHT: 2.6,
} as const;

export const MOVEMENT = {
  BASE_SPEED: 54,
  SPEED_CAP: 140,

  JUMP_BUFFER: 0.11,
  JUMP_VELOCITY: 46,
  /** Releasing Jump early trims rising arc for snappy tap-vs-hold feel. */
  JUMP_CUT: 0.52,
  COYOTE_TIME: 0.1,

  GRAVITY: 98,
  FALL_GRAVITY_MULT: 1.15,

  GROUND_ACCEL: 32,
  GROUND_DECEL: 28,
  GROUND_FRICTION: 4.5,
  AIR_ACCEL: 14,
  AIR_TURN_RATE: 14,
  AIR_TURN_EASE: 12,

  SLIDE_SPEED: 78,
  SLIDE_MIN_SPEED: 20,
  SLIDE_DURATION: 0.72,
  SLIDE_COOLDOWN: 0.32,
  SLIDE_TURN_RATE: 3.6,
  SLIDE_TURN_EASE: 6.5,

  STEP_HEIGHT: 0.6,

  /** Crisp ledge mantling (jump into a ledge or press Space facing it to vault right up!). */
  MANTLE_MIN_LEDGE: 0.75,
  MANTLE_MAX_LEDGE: 7.6,
  MANTLE_BASE_LIFT: 24,
  MANTLE_HEIGHT_LIFT: 3.1,
  MANTLE_COOLDOWN: 0.28,
  MANTLE_ANIMATION: 0.28,
} as const;

export type ControllerEventType =
  | 'JUMP'
  | 'DOUBLE_JUMP'
  | 'MANTLE'
  | 'SLIDE_START'
  | 'LAND'
  | 'BOUNCE'
  | 'GLOVE_SHOVE'
  | 'GLOVE_SPEED'
  | 'GLOVE_GRAVITY'
  | 'GLOVE_BOOST'
  | 'GLOVE_BLINK'
  | 'GLOVE_FROST'
  | 'GLOVE_POWER'
  | 'GLOVE_GRAPPLE'
  | 'GLOVE_GLIDE'
  | 'GLOVE_FUSION';

export interface ControllerEvent {
  type: ControllerEventType;
  impact: number;
}

const EPS = 0.001;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export class PlayerController {
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  grounded = true;
  sliding = false;
  /** Ice map: whole field is smooth low-friction ice. */
  iceAll = false;
  glove: GloveId = 'tape';

  /** Set by Void Blink so the renderer can spawn portal rings at start & end. */
  lastBlinkFrom: [number, number, number] = [0, 0, 0];
  lastBlinkTo: [number, number, number] = [0, 0, 0];

  private readonly boxes: AABB[];
  /** Filtered tall solid boxes (skips thin flat safe-zone strips for ultra-fast checks). */
  private readonly walls: AABB[];
  private events: ControllerEvent[] = [];
  private pendingEvents: ControllerEvent[] = [];

  private jumpBuffer = 0;
  private mantleIntent = 0;
  private mantleTimer = 0;
  private mantleCooldown = 0;
  private mantleBox: AABB | null = null;
  private coyoteTimer = 0;
  private jumpCutArmed = false;

  private slideRequested = false;
  private slideTime = 0;
  private slideCooldown = 0;

  private lastWishX = 0;
  private lastWishZ = -1;
  private inputNow = false;

  // Glove ability timers
  private gloveCooldownTimer = 0;
  private gloveCooldownMaxVal = 2.0;
  private burstGraceTimer = 0;
  private dashPoseTimer = 0;
  private overdriveTimer = 0;
  private lowGravTimer = 0;
  private gliderTimer = 0;
  private frostSlide = false;
  private airJumpsLeft = 0;

  constructor(boxes: AABB[] = [], _ramps: Ramp[] = []) {
    this.boxes = boxes;
    this.walls = boxes.filter((b) => b.maxY > MOVEMENT.STEP_HEIGHT + 0.05);
  }

  get mantling(): boolean {
    return this.mantleTimer > 0;
  }

  get vaultProgress(): number {
    return this.mantleTimer > 0 ? 1 - this.mantleTimer / MOVEMENT.MANTLE_ANIMATION : 0;
  }

  setGlove(id: GloveId): void {
    if (this.glove === id) return;
    this.glove = id;
    this.overdriveTimer = 0;
    this.lowGravTimer = 0;
    this.gliderTimer = 0;
    this.gloveCooldownTimer = 0;
    this.gloveCooldownMaxVal = getGlove(id).cooldown;
    this.airJumpsLeft = this.grounded ? this.maxAirJumps : 0;
  }

  get maxAirJumps(): number {
    return this.glove === 'boost' || this.glove === 'fusion' ? 1 : 0;
  }

  get baseSpeed(): number {
    let sp: number = MOVEMENT.BASE_SPEED;
    if (this.glove === 'speed') sp = 60;
    else if (this.glove === 'fusion') sp = 62;
    if (this.overdriveTimer > 0) sp = 86;
    return sp;
  }

  get speedCap(): number {
    if (this.glove === 'fusion') return 145;
    if (this.glove === 'speed' || this.glove === 'boost' || this.glove === 'grapple' || this.glove === 'glider') {
      return 135;
    }
    return MOVEMENT.SPEED_CAP;
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vz);
  }

  get height(): number {
    return this.sliding ? PLAYER_DIM.SLIDE_HEIGHT : PLAYER_DIM.HEIGHT;
  }

  get gloveCooldown(): number {
    return this.gloveCooldownTimer;
  }

  get gloveCooldownMax(): number {
    return this.gloveCooldownMaxVal;
  }

  get gloveActiveTimer(): number {
    return Math.max(this.overdriveTimer, this.lowGravTimer, this.gliderTimer, this.dashPoseTimer);
  }

  get overdriveActive(): boolean {
    return this.overdriveTimer > 0;
  }

  get lowGravActive(): boolean {
    return this.lowGravTimer > 0;
  }

  get gliding(): boolean {
    return this.gliderTimer > 0 && !this.grounded;
  }

  get dashing(): boolean {
    return this.dashPoseTimer > 0;
  }

  get airJumpsAvailable(): number {
    return this.airJumpsLeft;
  }

  reset(x = 0, y = 0, z = 0): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.sliding = false;
    this.frostSlide = false;
    this.jumpBuffer = 0;
    this.mantleIntent = 0;
    this.mantleTimer = 0;
    this.mantleCooldown = 0;
    this.mantleBox = null;
    this.coyoteTimer = 0;
    this.jumpCutArmed = false;
    this.slideRequested = false;
    this.slideTime = 0;
    this.slideCooldown = 0;
    this.gloveCooldownTimer = 0;
    this.gloveCooldownMaxVal = getGlove(this.glove).cooldown;
    this.burstGraceTimer = 0;
    this.dashPoseTimer = 0;
    this.overdriveTimer = 0;
    this.lowGravTimer = 0;
    this.gliderTimer = 0;
    this.airJumpsLeft = this.maxAirJumps;
    this.inputNow = false;
    this.events = [];
    this.pendingEvents = [];
    this.grounded = this.isSupported();
  }

  /** Space press: queues a crisp jump (or cancels glide / fires Boost & Fusion double-jump). */
  queueJump(): void {
    if (this.gliderTimer > 0 && !this.grounded) {
      // Pressing Space cleanly cancels glider flight if player wants to drop fast
      this.gliderTimer = 0;
      return;
    }
    this.jumpBuffer = MOVEMENT.JUMP_BUFFER;
    this.mantleIntent = 0.22;
  }

  /** Space release: slight variable jump arc on tap vs hold. */
  releaseJump(): void {
    if (this.jumpCutArmed && this.vy > 0 && !this.mantling && this.lowGravTimer <= 0 && this.gliderTimer <= 0) {
      this.vy *= MOVEMENT.JUMP_CUT;
    }
    this.jumpCutArmed = false;
  }

  /** C: start a crisp ground slide, or pop back up if already sliding. */
  queueSlide(): void {
    this.slideRequested = true;
  }

  /**
   * Unified Glove Ability [E / X]: triggers whatever glove is currently equipped!
   * For `grapple`, optionally pass a hit point from the 3D scene raycast.
   */
  triggerGloveAbility(
    dx: number,
    dz: number,
    grappleHit?: { x: number; y: number; z: number } | null,
  ): ControllerEventType | null {
    if (this.gloveCooldownTimer > 0) return null;

    const len = Math.hypot(dx, dz);
    const dirX = len > 1e-4 ? dx / len : this.lastWishX;
    const dirZ = len > 1e-4 ? dz / len : this.lastWishZ;
    this.lastWishX = dirX;
    this.lastWishZ = dirZ;

    const cd = getGlove(this.glove).cooldown;
    this.gloveCooldownTimer = cd;
    this.gloveCooldownMaxVal = cd;

    switch (this.glove) {
      case 'tape': {
        // Quick Shove Lunge
        if (this.sliding) this.sliding = false;
        this.vx = dirX * 78;
        this.vz = dirZ * 78;
        this.burstGraceTimer = 0.28;
        this.dashPoseTimer = 0.22;
        this.pendingEvents.push({ type: 'GLOVE_SHOVE', impact: 0 });
        return 'GLOVE_SHOVE';
      }
      case 'speed': {
        // Red Speed Coil Overdrive
        this.overdriveTimer = 2.6;
        const boost = Math.max(this.speed, 92);
        this.vx = dirX * boost;
        this.vz = dirZ * boost;
        this.burstGraceTimer = 0.45;
        this.pendingEvents.push({ type: 'GLOVE_SPEED', impact: 0 });
        return 'GLOVE_SPEED';
      }
      case 'gravity': {
        // Blue Gravity Coil Moon-Jump
        if (this.sliding) this.sliding = false;
        this.lowGravTimer = 2.4;
        this.grounded = false;
        this.jumpCutArmed = false;
        this.vy = 70;
        const fwd = Math.max(this.speed, 64);
        this.vx = dirX * fwd;
        this.vz = dirZ * fwd;
        this.burstGraceTimer = 0.5;
        this.pendingEvents.push({ type: 'GLOVE_GRAVITY', impact: 0 });
        return 'GLOVE_GRAVITY';
      }
      case 'boost': {
        // Jet Thrusters Rocket Dash
        if (this.sliding) this.sliding = false;
        this.vx = dirX * 102;
        this.vz = dirZ * 102;
        if (!this.grounded && this.vy < 14) this.vy = 14;
        this.burstGraceTimer = 0.42;
        this.dashPoseTimer = 0.28;
        this.pendingEvents.push({ type: 'GLOVE_BOOST', impact: 0 });
        return 'GLOVE_BOOST';
      }
      case 'blink': {
        // Void Blink: collision-safe instant 48-stud phase teleport!
        if (this.sliding) this.sliding = false;
        this.lastBlinkFrom = [this.x, this.y, this.z];
        const maxDist = 48;
        const stepSize = 1.2;
        const steps = Math.floor(maxDist / stepSize);
        let nx = this.x;
        let nz = this.z;
        for (let i = 1; i <= steps; i++) {
          const tx = this.x + dirX * (i * stepSize);
          const tz = this.z + dirZ * (i * stepSize);
          if (this.clearAt(tx, this.y + 0.05, tz, PLAYER_DIM.HEIGHT)) {
            nx = tx;
            nz = tz;
          } else {
            break;
          }
        }
        this.x = nx;
        this.z = nz;
        this.vx = dirX * Math.max(this.speed, 68);
        this.vz = dirZ * Math.max(this.speed, 68);
        if (!this.grounded && this.vy < 8) this.vy = 8;
        this.burstGraceTimer = 0.32;
        this.dashPoseTimer = 0.2;
        this.lastBlinkTo = [this.x, this.y, this.z];
        this.pendingEvents.push({ type: 'GLOVE_BLINK', impact: 0 });
        return 'GLOVE_BLINK';
      }
      case 'frost': {
        // Subzero Flash Freeze + instant slick cryo-slide burst!
        this.sliding = this.grounded;
        this.frostSlide = this.grounded;
        this.slideTime = this.grounded ? 1.05 : 0;
        this.vx = dirX * 92;
        this.vz = dirZ * 92;
        this.burstGraceTimer = 0.5;
        this.pendingEvents.push({ type: 'GLOVE_FROST', impact: 0 });
        return 'GLOVE_FROST';
      }
      case 'power': {
        // Seismic Pistons Air Blast: huge pop & horizontal push + knocks back chasers!
        if (this.sliding) this.sliding = false;
        this.grounded = false;
        this.jumpCutArmed = false;
        this.vy = 54;
        this.vx = dirX * 92;
        this.vz = dirZ * 92;
        this.burstGraceTimer = 0.65;
        this.dashPoseTimer = 0.3;
        this.pendingEvents.push({ type: 'GLOVE_POWER', impact: 0 });
        return 'GLOVE_POWER';
      }
      case 'grapple': {
        // Mag-Claw 190-stud magnetic slingshot!
        if (this.sliding) this.sliding = false;
        this.grounded = false;
        this.jumpCutArmed = false;
        if (grappleHit) {
          const gx = grappleHit.x - this.x;
          const gz = grappleHit.z - this.z;
          const hd = Math.hypot(gx, gz);
          const ux = hd > 0.5 ? gx / hd : dirX;
          const uz = hd > 0.5 ? gz / hd : dirZ;
          const pull = clamp(88 + hd * 0.32, 92, 132);
          this.vx = ux * pull;
          this.vz = uz * pull;
          this.vy = clamp((grappleHit.y - this.y) * 1.1 + 38, 38, 78);
          this.lastWishX = ux;
          this.lastWishZ = uz;
        } else {
          this.vx = dirX * 106;
          this.vz = dirZ * 106;
          this.vy = Math.max(this.vy, 48);
        }
        this.burstGraceTimer = 0.78;
        this.dashPoseTimer = 0.38;
        this.pendingEvents.push({ type: 'GLOVE_GRAPPLE', impact: 0 });
        return 'GLOVE_GRAPPLE';
      }
      case 'glider': {
        // Sky Glider: big updraft + deploy glowing 3D wings to soar at 90 studs/s!
        if (this.sliding) this.sliding = false;
        this.grounded = false;
        this.jumpCutArmed = false;
        this.vy = Math.max(this.vy, 60);
        this.vx = dirX * 90;
        this.vz = dirZ * 90;
        this.gliderTimer = 3.2;
        this.burstGraceTimer = 0.6;
        this.pendingEvents.push({ type: 'GLOVE_GLIDE', impact: 0 });
        return 'GLOVE_GLIDE';
      }
      case 'fusion': {
        // Outrageous Fusion Core: explosive Nova Surge (speed + blast + shockwave!)
        if (this.sliding) this.sliding = false;
        this.overdriveTimer = 1.6;
        this.vx = dirX * 116;
        this.vz = dirZ * 116;
        this.vy = this.grounded ? 26 : Math.max(this.vy, 30);
        this.grounded = false;
        this.jumpCutArmed = false;
        this.airJumpsLeft = this.maxAirJumps;
        this.burstGraceTimer = 0.65;
        this.dashPoseTimer = 0.34;
        this.pendingEvents.push({ type: 'GLOVE_FUSION', impact: 0 });
        return 'GLOVE_FUSION';
      }
    }
  }

  clearInput(): void {
    this.jumpBuffer = 0;
    this.mantleIntent = 0;
    this.slideRequested = false;
    this.jumpCutArmed = false;
  }

  /**
   * Ultra-light single-step simulation for AI bots (zero 240Hz sub-stepping, zero allocations).
   * Keeps 100-player MEGA mode well under 0.3ms/frame of total CPU work!
   */
  stepBot(dt: number, wx: number, wz: number, hasInput: boolean): void {
    if (dt <= 0) return;
    if (dt > 0.05) dt = 0.05;
    const baseSpd = this.baseSpeed;
    this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    if (this.slideRequested) {
      this.slideRequested = false;
      if (this.grounded && !this.sliding && this.slideCooldown <= 0 && this.speed > 24) {
        this.sliding = true;
        this.slideTime = 0.62;
        const s = Math.max(this.speed, 70);
        const cur = this.speed || 1;
        this.vx = (this.vx / cur) * s;
        this.vz = (this.vz / cur) * s;
      }
    }

    if (this.sliding) {
      this.slideTime -= dt;
      if (!this.grounded || this.slideTime <= 0) {
        this.sliding = false;
        this.slideCooldown = 0.35;
      }
    }

    if (this.jumpBuffer > 0 && this.grounded) {
      this.sliding = false;
      this.vy = MOVEMENT.JUMP_VELOCITY;
      this.grounded = false;
      this.jumpBuffer = 0;
    }

    if (!this.sliding) {
      if (hasInput) {
        const target = this.iceAll ? baseSpd * 1.18 : baseSpd;
        const k = 1 - Math.exp(-(this.iceAll ? 7 : 18) * dt);
        this.vx += (wx * target - this.vx) * k;
        this.vz += (wz * target - this.vz) * k;
      } else if (this.grounded) {
        const damp = Math.exp(-(this.iceAll ? 2.5 : 18) * dt);
        this.vx *= damp;
        this.vz *= damp;
        if (this.vx * this.vx + this.vz * this.vz < 0.04) {
          this.vx = 0;
          this.vz = 0;
        }
      }
    }

    // Horizontal motion against only tall field walls (skips thin flat safe zones).
    const h = this.sliding ? PLAYER_DIM.SLIDE_HEIGHT : PLAYER_DIM.HEIGHT;
    const hw = PLAYER_DIM.HALF_W;
    const walls = this.walls;

    let nx = this.x + this.vx * dt;
    let nz = this.z;
    for (let i = 0; i < walls.length; i++) {
      const box = walls[i];
      if (this.y >= box.maxY - EPS || this.y + h <= box.minY + EPS) continue;
      if (nz + hw <= box.minZ + EPS || nz - hw >= box.maxZ - EPS) continue;
      if (this.vx > 0 && this.x + hw <= box.minX + 0.05 && nx + hw > box.minX) {
        nx = box.minX - hw - EPS;
        this.vx = 0;
      } else if (this.vx < 0 && this.x - hw >= box.maxX - 0.05 && nx - hw < box.maxX) {
        nx = box.maxX + hw + EPS;
        this.vx = 0;
      }
    }
    this.x = nx;

    nz = this.z + this.vz * dt;
    for (let i = 0; i < walls.length; i++) {
      const box = walls[i];
      if (this.y >= box.maxY - EPS || this.y + h <= box.minY + EPS) continue;
      if (this.x + hw <= box.minX + EPS || this.x - hw >= box.maxX - EPS) continue;
      if (this.vz > 0 && this.z + hw <= box.minZ + 0.05 && nz + hw > box.minZ) {
        nz = box.minZ - hw - EPS;
        this.vz = 0;
      } else if (this.vz < 0 && this.z - hw >= box.maxZ - 0.05 && nz - hw < box.maxZ) {
        nz = box.maxZ + hw + EPS;
        this.vz = 0;
      }
    }
    this.z = nz;

    // Fast vertical gravity & floor/ledge landing
    if (!this.grounded || this.y > 0.12) {
      const oldY = this.y;
      this.y += this.vy * dt - 0.5 * MOVEMENT.GRAVITY * dt * dt;
      this.vy -= MOVEMENT.GRAVITY * dt;
      if (this.vy <= 0) {
        let floor = this.y <= 0.06 ? 0.06 : -Infinity;
        for (let i = 0; i < walls.length; i++) {
          const box = walls[i];
          if (this.x + hw > box.minX && this.x - hw < box.maxX && this.z + hw > box.minZ && this.z - hw < box.maxZ) {
            if (oldY >= box.maxY - 0.1 && this.y <= box.maxY) floor = Math.max(floor, box.maxY);
          }
        }
        if (floor !== -Infinity) {
          this.y = floor;
          this.vy = 0;
          this.grounded = true;
        }
      }
    }
  }

  step(dt: number, wishX: number, wishZ: number, hasInput: boolean): ControllerEvent[] {
    this.events = this.pendingEvents.length ? this.pendingEvents.splice(0) : [];
    if (!Number.isFinite(dt) || dt <= 0) return this.events;
    dt = Math.min(dt, 0.1);

    const length = Math.hypot(wishX, wishZ);
    hasInput = hasInput && length > 1e-5;
    this.inputNow = hasInput;
    if (hasInput) {
      wishX /= length;
      wishZ /= length;
      this.lastWishX = wishX;
      this.lastWishZ = wishZ;
    } else {
      wishX = 0;
      wishZ = 0;
    }

    if (this.slideRequested) {
      this.slideRequested = false;
      if (this.sliding) this.endSlide();
      else if (this.grounded) this.startSlide();
    }

    // Sub-step so high-speed glove surges never clip through any wall.
    const steps = Math.ceil(dt / (1 / 240));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this.integrate(h, wishX, wishZ, hasInput);
    return this.events;
  }

  private integrate(dt: number, wx: number, wz: number, hasInput: boolean): void {
    const M = MOVEMENT;
    const baseSpd = this.baseSpeed;
    const capSpd = this.speedCap;

    this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    this.mantleCooldown = Math.max(0, this.mantleCooldown - dt);
    this.mantleTimer = Math.max(0, this.mantleTimer - dt);
    if (this.mantleTimer === 0) this.mantleBox = null;
    this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    this.gloveCooldownTimer = Math.max(0, this.gloveCooldownTimer - dt);
    this.burstGraceTimer = Math.max(0, this.burstGraceTimer - dt);
    this.dashPoseTimer = Math.max(0, this.dashPoseTimer - dt);
    this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
    this.lowGravTimer = Math.max(0, this.lowGravTimer - dt);
    this.gliderTimer = Math.max(0, this.gliderTimer - dt);

    if (this.grounded && !this.isSupported()) {
      this.grounded = false;
      this.coyoteTimer = M.COYOTE_TIME;
    }
    if (this.grounded) {
      this.airJumpsLeft = this.maxAirJumps;
      if (this.gliderTimer > 0 && this.vy <= 0) this.gliderTimer = 0;
    }

    if (this.sliding) {
      this.slideTime -= dt;
      // Gentle smooth slide decay (almost lossless on ice / cryo-slide!)
      const decay = this.frostSlide || this.isOnIce() ? 0.35 : 0.72;
      this.setSpeed(Math.max(baseSpd * 0.75, this.speed * Math.exp(-decay * dt)));
      if (!this.grounded || this.slideTime <= 0) this.endSlide();
    }

    this.consumeJump();
    if (!this.grounded && this.mantleIntent > 0 && !this.mantling) this.probeMantle();

    // Return extra ability speed smoothly toward base speed on the ground.
    const onIce = this.grounded && this.isOnIce();
    if (this.grounded && !this.sliding && this.burstGraceTimer <= 0 && this.speed > baseSpd) {
      const friction = onIce ? 1.1 : M.GROUND_FRICTION;
      this.setSpeed(baseSpd + (this.speed - baseSpd) * Math.exp(-friction * dt));
    }

    // Horizontal motion: Slide / Glider flight / Clean Run & Air control
    if (this.sliding) {
      if (hasInput) this.turnToward(wx, wz, M.SLIDE_TURN_RATE, M.SLIDE_TURN_EASE, dt);
    } else if (this.gliding) {
      // Smooth high-speed steering while flying with Sky Glider wings!
      const cruise = 90;
      const cur = this.speed;
      const nextSpd = cur + (cruise - cur) * (1 - Math.exp(-6 * dt));
      if (cur < 1) {
        this.vx = this.lastWishX * nextSpd;
        this.vz = this.lastWishZ * nextSpd;
      } else {
        this.setSpeed(nextSpd);
        if (hasInput) this.turnToward(wx, wz, 5.2, 8, dt);
      }
    } else if (hasInput) {
      const topGround = onIce ? baseSpd * 1.24 : baseSpd;
      if (this.speed > topGround + 0.5) {
        // Carry burst speed smoothly while letting player steer direction
        if (this.grounded) this.turnToward(wx, wz, onIce ? 7.5 : 18, onIce ? 6 : 16, dt);
        else this.turnToward(wx, wz, M.AIR_TURN_RATE, M.AIR_TURN_EASE, dt);
      } else {
        const accel = this.grounded ? (onIce ? 11 : M.GROUND_ACCEL) : M.AIR_ACCEL;
        const k = 1 - Math.exp(-accel * dt);
        this.vx += (wx * topGround - this.vx) * k;
        this.vz += (wz * topGround - this.vz) * k;
      }
    } else if (this.grounded && this.burstGraceTimer <= 0) {
      this.setSpeed(this.speed * Math.exp(-(onIce ? 2.2 : M.GROUND_DECEL) * dt));
      if (this.speed < 0.15) {
        this.vx = 0;
        this.vz = 0;
      }
    }

    if (this.speed > capSpd) this.setSpeed(capSpd);

    // Vertical physics (with Gravity Coil slow-fall & Sky Glider flight)
    if (!this.grounded) {
      let gMult = this.vy < 0 ? M.FALL_GRAVITY_MULT : 1;
      if (this.lowGravTimer > 0) gMult *= 0.44;
      else if (this.gliderTimer > 0 && this.vy < 0) gMult *= 0.24;
      const gravity = M.GRAVITY * gMult;
      const oldY = this.y;
      this.y += this.vy * dt - 0.5 * gravity * dt * dt;
      this.vy -= gravity * dt;
      if (this.gliderTimer > 0 && this.vy < -7.5) this.vy = -7.5;
      if (this.lowGravTimer > 0 && this.vy < -28) this.vy = -28;
      this.resolveVertical(oldY);
    }

    this.moveAxis('x', this.vx * dt);
    this.moveAxis('z', this.vz * dt);

    // Subtle ground snap for tiny flush plates (start/finish stripes)
    if (this.grounded) {
      let floor = 0;
      for (const box of this.boxes) {
        if (this.overlapXZ(this.x, this.z, box) && box.maxY <= this.y + M.STEP_HEIGHT) {
          floor = Math.max(floor, box.maxY);
        }
      }
      if (Math.abs(floor - this.y) <= M.STEP_HEIGHT) {
        this.y = floor;
        this.vy = 0;
      }
    }

    this.consumeJump();
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.mantleIntent = Math.max(0, this.mantleIntent - dt);
  }

  private consumeJump(): void {
    if (this.jumpBuffer <= 0) return;
    // Pressing Space right against a climbable ledge mantles smoothly over it!
    if (!this.sliding && this.probeMantle()) return;

    // 1. Clean ground jump (no bhop speed stacking!)
    if (this.grounded || this.coyoteTimer > 0) {
      if (this.sliding && !this.canStand()) return;
      if (this.sliding) this.endSlide();
      this.vy = MOVEMENT.JUMP_VELOCITY;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBuffer = 0;
      this.jumpCutArmed = true;
      this.mantleIntent = 0.55;
      this.airJumpsLeft = this.maxAirJumps;
      this.emit('JUMP');
      return;
    }

    // 2. Glove passive: Mid-air Double Jump (Jet Thrusters & Fusion Core only!)
    if (this.airJumpsLeft > 0) {
      this.airJumpsLeft--;
      this.vy = 47;
      if (this.inputNow) {
        const keep = Math.max(this.baseSpeed, this.speed);
        this.vx = this.lastWishX * keep;
        this.vz = this.lastWishZ * keep;
      }
      this.jumpBuffer = 0;
      this.jumpCutArmed = true;
      this.emit('DOUBLE_JUMP');
    }
  }

  private moveAxis(axis: 'x' | 'z', delta: number): void {
    if (Math.abs(delta) < 1e-7) return;
    const half = axis === 'x' ? PLAYER_DIM.HALF_W : PLAYER_DIM.HALF_D;
    let next = this[axis] + delta;

    for (const box of this.boxes) {
      if (this.y >= box.maxY - EPS || this.y + this.height <= box.minY + EPS) continue;
      const cross = axis === 'x' ? this.z : this.x;
      const crossHalf = axis === 'x' ? PLAYER_DIM.HALF_D : PLAYER_DIM.HALF_W;
      const crossMin = axis === 'x' ? box.minZ : box.minX;
      const crossMax = axis === 'x' ? box.maxZ : box.maxX;
      if (cross + crossHalf <= crossMin + EPS || cross - crossHalf >= crossMax - EPS) continue;
      const min = axis === 'x' ? box.minX : box.minZ;
      const max = axis === 'x' ? box.maxX : box.maxZ;
      const hit =
        delta > 0
          ? this[axis] + half <= min + EPS * 2 && next + half > min
          : this[axis] - half >= max - EPS * 2 && next - half < max;
      if (!hit) continue;

      // Flush step-up only for thin strips/safe-zone carpets (<= 0.6 studs)
      const ledge = box.maxY - this.y;
      const checkX = axis === 'x' ? next : this.x;
      const checkZ = axis === 'z' ? next : this.z;
      if (ledge <= MOVEMENT.STEP_HEIGHT && this.clearAt(checkX, box.maxY, checkZ, this.height) && (this.grounded || this.vy > -4)) {
        this.y = box.maxY;
        if (!this.grounded) this.land(box.maxY);
        continue;
      }

      const nx = axis === 'x' ? (delta > 0 ? -1 : 1) : 0;
      const nz = axis === 'z' ? (delta > 0 ? -1 : 1) : 0;
      if (!this.grounded) this.tryMantle(box, nx, nz, true);

      const boundary = delta > 0 ? min - half - EPS : max + half + EPS;
      next = delta > 0 ? Math.min(next, boundary) : Math.max(next, boundary);
      // Keep forward carry over the lip during the active mantle animation!
      if (box !== this.mantleBox || this.mantleTimer <= 0) {
        if (axis === 'x') this.vx = 0;
        else this.vz = 0;
      }
    }

    this[axis] = next;
  }

  /** Forward scan for mantling when pressing Space right in front of a ledge. */
  private probeMantle(): boolean {
    if (this.mantleCooldown > 0 || this.mantleIntent <= 0 || this.sliding) return false;
    const dx = this.lastWishX;
    const dz = this.lastWishZ;
    const px = this.x + dx * 1.75;
    const pz = this.z + dz * 1.75;
    for (const box of this.walls) {
      if (px <= box.minX || px >= box.maxX || pz <= box.minZ || pz >= box.maxZ) continue;
      let nx = 0;
      let nz = 0;
      if (this.x <= box.minX) nx = -1;
      else if (this.x >= box.maxX) nx = 1;
      else if (this.z <= box.minZ) nz = -1;
      else if (this.z >= box.maxZ) nz = 1;
      else continue;
      if (dx * nx + dz * nz > -0.2) continue;
      if (this.tryMantle(box, nx, nz, false)) return true;
    }
    return false;
  }

  /** Pulls the player smoothly up & over a ledge between 0.75 and 7.4 studs above their feet. */
  private tryMantle(box: AABB, nx: number, nz: number, fromAirContact: boolean): boolean {
    const M = MOVEMENT;
    if (this.mantleCooldown > 0 || this.sliding || this.mantling) return false;
    if (!fromAirContact && this.mantleIntent <= 0) return false;
    const ledge = box.maxY - this.y;
    if (ledge < M.MANTLE_MIN_LEDGE || ledge > M.MANTLE_MAX_LEDGE) return false;
    // Never mantle out of the world on perimeter boundary walls (tall 28-stud walls)
    if (box.maxY >= 26) return false;
    if (box.maxX - box.minX < 1.8 || box.maxZ - box.minZ < 1.8) return false;

    const hx = this.inputNow ? this.lastWishX : this.vx;
    const hz = this.inputNow ? this.lastWishZ : this.vz;
    const hl = Math.hypot(hx, hz);
    if (hl < 0.4) return false;
    if ((hx * nx + hz * nz) / hl > -0.2) return false;

    // Ensure top landing space isn't blocked by a ceiling/box right above the lip.
    const tx = clamp(this.x - nx * 2.0, box.minX + 0.9, box.maxX - 0.9);
    const tz = clamp(this.z - nz * 2.0, box.minZ + 0.9, box.maxZ - 0.9);
    for (const other of this.walls) {
      if (other === box) continue;
      const blocksTop =
        this.overlapXZ(tx, tz, other) &&
        other.maxY > box.maxY + EPS &&
        other.minY < box.maxY + PLAYER_DIM.HEIGHT;
      if (blocksTop) return false;
    }

    const dirX = hx / hl;
    const dirZ = hz / hl;
    const spd = Math.min(this.speedCap, Math.max(this.speed, this.baseSpeed));
    this.vx = dirX * spd;
    this.vz = dirZ * spd;
    // Smooth athletic pull-up: always pops right over the lip by ~2.6 studs, never skyrockets.
    this.vy = Math.sqrt(2 * M.GRAVITY * (ledge + 2.6));
    this.grounded = false;
    this.gliderTimer = 0;
    this.mantleBox = box;
    this.mantleTimer = M.MANTLE_ANIMATION;
    this.mantleCooldown = M.MANTLE_COOLDOWN;
    this.jumpBuffer = 0;
    this.mantleIntent = 0;
    this.coyoteTimer = 0;
    this.jumpCutArmed = false;
    this.burstGraceTimer = Math.max(this.burstGraceTimer, 0.25);
    this.emit('MANTLE', ledge);
    return true;
  }

  private resolveVertical(oldY: number): void {
    if (this.vy <= 0) {
      let floor = this.y <= 0 ? 0 : -Infinity;
      for (const box of this.boxes) {
        if (!this.overlapXZ(this.x, this.z, box)) continue;
        if (oldY >= box.maxY - EPS && this.y <= box.maxY) floor = Math.max(floor, box.maxY);
      }
      if (floor !== -Infinity) {
        const pad = this.boxes.find(
          (box) => box.bounce && Math.abs(box.maxY - floor) < 0.02 && this.overlapXZ(this.x, this.z, box),
        );
        if (pad && pad.bounce) {
          this.y = floor;
          this.vy = pad.bounce;
          this.grounded = false;
          this.airJumpsLeft = this.maxAirJumps;
          this.emit('BOUNCE', pad.bounce);
        } else {
          this.land(floor);
        }
      }
    } else {
      let ceiling = Infinity;
      for (const box of this.boxes) {
        if (!this.overlapXZ(this.x, this.z, box)) continue;
        if (oldY + this.height <= box.minY + EPS && this.y + this.height >= box.minY) {
          ceiling = Math.min(ceiling, box.minY);
        }
      }
    if (ceiling !== Infinity) {
      this.y = ceiling - this.height - EPS;
      this.vy = 0;
      this.mantleTimer = 0;
      this.mantleBox = null;
    }
    }
  }

  private land(y: number): void {
    const impact = Math.abs(this.vy);
    const wasAir = !this.grounded;
    this.y = y;
    this.vy = 0;
    this.grounded = true;
    this.gliderTimer = 0;
    this.mantleTimer = 0;
    this.mantleBox = null;
    this.mantleIntent = 0;
    this.airJumpsLeft = this.maxAirJumps;
    this.jumpCutArmed = false;
    if (wasAir) this.emit('LAND', impact);
  }

  private overlapXZ(x: number, z: number, box: AABB): boolean {
    return (
      x + PLAYER_DIM.HALF_W > box.minX + EPS &&
      x - PLAYER_DIM.HALF_W < box.maxX - EPS &&
      z + PLAYER_DIM.HALF_D > box.minZ + EPS &&
      z - PLAYER_DIM.HALF_D < box.maxZ - EPS
    );
  }

  private isOnIce(): boolean {
    if (this.iceAll && this.grounded) return true;
    return this.boxes.some(
      (box) => box.ice && Math.abs(this.y - box.maxY) <= 0.08 && this.overlapXZ(this.x, this.z, box),
    );
  }

  private isSupported(): boolean {
    if (this.y <= EPS) return true;
    return this.boxes.some((box) => Math.abs(this.y - box.maxY) <= EPS * 3 && this.overlapXZ(this.x, this.z, box));
  }

  private clearAt(x: number, y: number, z: number, height: number): boolean {
    return !this.boxes.some(
      (box) => this.overlapXZ(x, z, box) && y < box.maxY - EPS && y + height > box.minY + EPS,
    );
  }

  private canStand(): boolean {
    return this.clearAt(this.x, this.y, this.z, PLAYER_DIM.HEIGHT);
  }

  private startSlide(): boolean {
    if (!this.grounded || this.sliding || this.slideCooldown > 0 || this.speed < MOVEMENT.SLIDE_MIN_SPEED) {
      return false;
    }
    this.sliding = true;
    this.frostSlide = false;
    const isFastGlove = this.glove === 'speed' || this.glove === 'fusion' || this.overdriveTimer > 0;
    this.slideTime = isFastGlove ? 0.92 : MOVEMENT.SLIDE_DURATION;
    const burst = isFastGlove ? Math.max(this.speed + 14, 96) : Math.max(this.speed + 10, MOVEMENT.SLIDE_SPEED);
    this.setSpeed(Math.min(this.speedCap, burst));
    this.burstGraceTimer = 0.25;
    this.emit('SLIDE_START');
    return true;
  }

  private endSlide(): void {
    if (!this.canStand()) return;
    this.sliding = false;
    this.frostSlide = false;
    this.slideCooldown = MOVEMENT.SLIDE_COOLDOWN;
  }

  private setSpeed(speed: number): void {
    const current = this.speed;
    if (current <= 1e-6) return;
    const factor = speed / current;
    this.vx *= factor;
    this.vz *= factor;
  }

  private turnToward(wx: number, wz: number, rate: number, ease: number, dt: number): void {
    const speed = this.speed;
    if (speed < 0.001) return;
    const current = Math.atan2(this.vz, this.vx);
    const target = Math.atan2(wz, wx);
    const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    const angle = current + clamp(diff * (1 - Math.exp(-ease * dt)), -rate * dt, rate * dt);
    this.vx = Math.cos(angle) * speed;
    this.vz = Math.sin(angle) * speed;
  }

  private emit(type: ControllerEventType, impact = 0): void {
    this.events.push({ type, impact });
  }
}
