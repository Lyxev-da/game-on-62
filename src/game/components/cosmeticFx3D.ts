import * as THREE from 'three';
import { getFx, getTrail, type FxId, type TrailId } from './shopData';

/**
 * Smooth 3D glowing ribbon trail (like Untitled Tag Game's beam trails).
 * Maintains a ring-buffer of recent world positions and updates a double-sided
 * vertex-colored triangle strip with smooth width taper.
 */
export class RibbonTrail3D {
  public readonly mesh: THREE.Mesh;
  private readonly maxPoints: number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly history: Array<{ x: number; y: number; z: number; rx: number; rz: number }> = [];
  private activeTrail: TrailId = 'none';

  constructor(maxPoints = 34) {
    this.maxPoints = maxPoints;
    const vertCount = maxPoints * 2;
    this.positions = new Float32Array(vertCount * 3);
    this.colors = new Float32Array(vertCount * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const indices: number[] = [];
    for (let i = 0; i < maxPoints - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
    geo.setIndex(indices);

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  clear(): void {
    this.history.length = 0;
    this.mesh.visible = false;
  }

  update(
    trailId: TrailId,
    x: number,
    y: number,
    z: number,
    yaw: number,
    emitting: boolean,
    nowSec: number,
  ): void {
    if (trailId !== this.activeTrail) {
      this.activeTrail = trailId;
      this.history.length = 0;
    }

    if (trailId === 'none') {
      this.mesh.visible = false;
      return;
    }

    const def = getTrail(trailId);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);

    if (emitting) {
      const head = this.history[0];
      if (!head || Math.hypot(x - head.x, y - head.y, z - head.z) > 0.25) {
        this.history.unshift({ x, y, z, rx, rz });
        if (this.history.length > this.maxPoints) this.history.pop();
      } else {
        head.x = x;
        head.y = y;
        head.z = z;
        head.rx = rx;
        head.rz = rz;
      }
    } else if (this.history.length > 0) {
      this.history.pop();
    }

    if (this.history.length < 2) {
      this.mesh.visible = false;
      return;
    }

    this.mesh.visible = true;
    const mat = this.mesh.material as THREE.MeshBasicMaterial;
    mat.blending = trailId === 'cloud' ? THREE.NormalBlending : THREE.AdditiveBlending;
    mat.opacity = trailId === 'cloud' ? 0.65 : 0.88;

    const palette = def.colors.map((hex) => new THREE.Color(hex));
    const count = this.history.length;
    const halfWidthBase = def.ribbonWidth * 0.5;

    for (let i = 0; i < this.maxPoints; i++) {
      const p = this.history[Math.min(i, count - 1)];
      const t = i / Math.max(1, count - 1);
      const taper = i < count ? Math.pow(1 - t, 0.65) : 0;
      const wave = trailId === 'cyan' ? Math.sin(nowSec * 28 + i * 1.4) * 0.18 * taper : 0;
      const hw = halfWidthBase * taper;

      const lx = p.x - p.rx * hw + p.rx * wave;
      const lz = p.z - p.rz * hw + p.rz * wave;
      const rxPos = p.x + p.rx * hw + p.rx * wave;
      const rzPos = p.z + p.rz * hw + p.rz * wave;

      const vIdx = i * 6;
      this.positions[vIdx] = lx;
      this.positions[vIdx + 1] = p.y;
      this.positions[vIdx + 2] = lz;
      this.positions[vIdx + 3] = rxPos;
      this.positions[vIdx + 4] = p.y;
      this.positions[vIdx + 5] = rzPos;

      const cIdxA = Math.floor((t * palette.length + nowSec * (trailId === 'rainbow' ? 2.5 : 0.6)) % palette.length);
      const cIdxB = (cIdxA + 1) % palette.length;
      const colL = palette[cIdxA] ?? new THREE.Color(0xffffff);
      const colR = trailId === 'rainbow' ? (palette[cIdxB] ?? colL) : colL;
      const fade = i < count ? 1 - t * 0.88 : 0;

      this.colors[vIdx] = colL.r * fade;
      this.colors[vIdx + 1] = colL.g * fade;
      this.colors[vIdx + 2] = colL.b * fade;
      this.colors[vIdx + 3] = colR.r * fade;
      this.colors[vIdx + 4] = colR.g * fade;
      this.colors[vIdx + 5] = colR.b * fade;
    }

    const geo = this.mesh.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }
}

interface TransientFx {
  obj: THREE.Object3D;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  scaleFrom: number;
  scaleTo: number;
  fadeOut: boolean;
}

/**
 * Manages dramatic Untitled Tag Game-style 3D Tag Effects, Ankle-Break bursts,
 * and stylized Trail particles without leaking geometries.
 */
export class CosmeticFxManager {
  private readonly scene: THREE.Scene;
  private readonly items: TransientFx[] = [];
  private readonly boxGeo = new THREE.BoxGeometry(0.6, 0.6, 0.14);
  private readonly starGeo = new THREE.OctahedronGeometry(0.58, 0);
  private readonly spikeGeo = new THREE.ConeGeometry(0.65, 4.6, 5);
  private readonly coinGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.2, 14);
  private readonly ringGeo = new THREE.TorusGeometry(2.6, 0.13, 8, 32);
  private readonly sphereGeo = new THREE.SphereGeometry(1.8, 18, 14);
  private readonly boltGeo = new THREE.CylinderGeometry(0.28, 0.75, 42, 6);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.spikeGeo.translate(0, 2.3, 0);
    this.coinGeo.rotateX(Math.PI / 2);
  }

  private add(item: TransientFx): void {
    if (this.items.length > 360) {
      const oldest = this.items.shift();
      if (oldest) {
        this.scene.remove(oldest.obj);
        ((oldest.obj as THREE.Mesh).material as THREE.Material)?.dispose?.();
      }
    }
    this.scene.add(item.obj);
    this.items.push(item);
  }

  /** Spawns a stylized trail accent particle along the ribbon. */
  spawnTrailAccent(trailId: TrailId, x: number, y: number, z: number): void {
    if (trailId === 'none') return;
    const def = getTrail(trailId);
    const hex = def.colors[Math.floor(Math.random() * def.colors.length)] ?? 0xffffff;
    const mat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.92 });
    const geo =
      def.particleShape === 'star' || def.particleShape === 'prism'
        ? this.starGeo
        : this.boxGeo;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      x + (Math.random() - 0.5) * 1.4,
      y + (Math.random() - 0.5) * 0.9,
      z + (Math.random() - 0.5) * 1.4,
    );
    this.add({
      obj: mesh,
      life: 0.48,
      maxLife: 0.48,
      vx: (Math.random() - 0.5) * 5,
      vy: def.particleShape === 'flame' ? 6 + Math.random() * 6 : 1.5 + Math.random() * 3,
      vz: (Math.random() - 0.5) * 5,
      gravity: 0,
      spinX: 6,
      spinY: 8,
      spinZ: 5,
      scaleFrom: 0.85,
      scaleTo: 0.05,
      fadeOut: true,
    });
  }

  /** Spawns the player's equipped UTG Tag / Juke 3D effect at (x, y, z)! */
  spawnFxBurst(fxId: FxId, x: number, y: number, z: number, intensity = 1): void {
    const def = getFx(fxId);

    if (def.style === 'judgement') {
      // Judgement Cut: dark distortion sphere + 7 crisscrossing cyan katana slash-rings!
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x090d16,
        transparent: true,
        opacity: 0.78,
      });
      const core = new THREE.Mesh(this.sphereGeo, coreMat);
      core.position.set(x, y + 1.2, z);
      this.add({
        obj: core,
        life: 0.55,
        maxLife: 0.55,
        vx: 0, vy: 0, vz: 0, gravity: 0,
        spinX: 0, spinY: 0, spinZ: 0,
        scaleFrom: 0.5, scaleTo: 2.6 * intensity,
        fadeOut: true,
      });

      for (let i = 0; i < 7; i++) {
        const ringMat = new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0x7cf2ff : 0xffffff,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
        });
        const slash = new THREE.Mesh(this.ringGeo, ringMat);
        slash.position.set(x, y + 1.2, z);
        slash.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        this.add({
          obj: slash,
          life: 0.52 + i * 0.04,
          maxLife: 0.52 + i * 0.04,
          vx: 0, vy: 0, vz: 0, gravity: 0,
          spinX: (Math.random() - 0.5) * 14,
          spinY: (Math.random() - 0.5) * 14,
          spinZ: 16,
          scaleFrom: 0.7,
          scaleTo: (2.1 + (i % 3) * 0.45) * intensity,
          fadeOut: true,
        });
      }
      return;
    }

    if (def.style === 'zapper') {
      // Zapper: sky-high lightning bolt pillar + ground shockwave + electric shards!
      const boltMat = new THREE.MeshBasicMaterial({
        color: 0x7cf2ff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const bolt = new THREE.Mesh(this.boltGeo, boltMat);
      bolt.position.set(x, y + 19, z);
      this.add({
        obj: bolt,
        life: 0.38,
        maxLife: 0.38,
        vx: 0, vy: 0, vz: 0, gravity: 0,
        spinX: 0, spinY: 18, spinZ: 0,
        scaleFrom: 1.4, scaleTo: 0.1,
        fadeOut: true,
      });

      const shockMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9 });
      const shock = new THREE.Mesh(this.ringGeo, shockMat);
      shock.position.set(x, y + 0.3, z);
      shock.rotation.x = Math.PI / 2;
      this.add({
        obj: shock,
        life: 0.48,
        maxLife: 0.48,
        vx: 0, vy: 0, vz: 0, gravity: 0,
        spinX: 0, spinY: 0, spinZ: 4,
        scaleFrom: 0.4, scaleTo: 3.4 * intensity,
        fadeOut: true,
      });
    } else if (def.style === 'glacier') {
      // Glacier: 9 giant translucent 3D ice crystal spikes bursting outward from ground!
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2;
        const spikeMat = new THREE.MeshPhysicalMaterial({
          color: i % 2 === 0 ? 0x7dd3fc : 0xe0f2fe,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.45,
          transparent: true,
          opacity: 0.9,
          roughness: 0.12,
        });
        const spike = new THREE.Mesh(this.spikeGeo, spikeMat);
        spike.position.set(x + Math.cos(ang) * 1.1, Math.max(0, y - 1.2), z + Math.sin(ang) * 1.1);
        spike.rotation.z = -Math.cos(ang) * 0.52;
        spike.rotation.x = Math.sin(ang) * 0.52;
        this.add({
          obj: spike,
          life: 0.85,
          maxLife: 0.85,
          vx: 0, vy: 0, vz: 0, gravity: 0,
          spinX: 0, spinY: 0, spinZ: 0,
          scaleFrom: 0.2, scaleTo: (1.15 + (i % 2) * 0.35) * intensity,
          fadeOut: true,
        });
      }
    } else if (def.style === 'subspace') {
      // Subspace Tripmine: expanding hot-pink shockwave sphere + spinning neon stars!
      const novaMat = new THREE.MeshBasicMaterial({
        color: 0xff20aa,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const nova = new THREE.Mesh(this.sphereGeo, novaMat);
      nova.position.set(x, y + 1.2, z);
      this.add({
        obj: nova,
        life: 0.56,
        maxLife: 0.56,
        vx: 0, vy: 0, vz: 0, gravity: 0,
        spinX: 3, spinY: 5, spinZ: 2,
        scaleFrom: 0.4, scaleTo: 3.8 * intensity,
        fadeOut: true,
      });
    } else if (def.style === 'midas') {
      // Golden Bloxy fountain: ascending golden halo + shower of 3D gold coins!
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.95 });
      const halo = new THREE.Mesh(this.ringGeo, haloMat);
      halo.position.set(x, y + 1.0, z);
      halo.rotation.x = Math.PI / 2;
      this.add({
        obj: halo,
        life: 0.75,
        maxLife: 0.75,
        vx: 0, vy: 8, vz: 0, gravity: 0,
        spinX: 0, spinY: 0, spinZ: 6,
        scaleFrom: 0.5, scaleTo: 2.8 * intensity,
        fadeOut: true,
      });
    }

    // Burst shrapnel tailored to the FX style
    const count = Math.round(22 * intensity);
    for (let i = 0; i < count; i++) {
      const hex = def.colors[i % def.colors.length];
      const mat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.95 });
      const geo =
        def.style === 'midas'
          ? this.coinGeo
          : def.style === 'subspace' || def.style === 'zapper'
            ? this.starGeo
            : this.boxGeo;
      const p = new THREE.Mesh(geo, mat);
      p.position.set(x, y + 1.0, z);
      const a = Math.random() * Math.PI * 2;
      const sp = (12 + Math.random() * 22) * intensity;
      const life = 1.2 + Math.random() * 0.8;
      this.add({
        obj: p,
        life,
        maxLife: life,
        vx: Math.cos(a) * sp * 0.65,
        vy: 15 + Math.random() * 20,
        vz: Math.sin(a) * sp * 0.65,
        gravity: 28,
        spinX: Math.random() * 12,
        spinY: Math.random() * 12,
        spinZ: Math.random() * 12,
        scaleFrom: 1.05,
        scaleTo: 0.25,
        fadeOut: true,
      });
    }
  }

  /** Expanding glowing horizontal shockwave ring (Air Blast, Frost, Speed, Glide, Gravity, Fusion). */
  spawnShockRing(x: number, y: number, z: number, color: number, maxScale = 4.5, dur = 0.45, rise = 0): void {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(this.ringGeo, mat);
    ring.position.set(x, y, z);
    ring.rotation.x = Math.PI / 2;
    this.add({
      obj: ring,
      life: dur,
      maxLife: dur,
      vx: 0,
      vy: rise,
      vz: 0,
      gravity: 0,
      spinX: 0,
      spinY: 0,
      spinZ: 5,
      scaleFrom: 0.35,
      scaleTo: maxScale,
      fadeOut: true,
    });
  }

  /** Dramatic vertical portal burst for Void Blink start & landing points! */
  spawnBlinkPortal(x: number, y: number, z: number, yaw: number): void {
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0xc084fc : 0xf5d0fe,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(this.ringGeo, mat);
      ring.position.set(x, y + 2.6, z);
      ring.rotation.y = yaw;
      this.add({
        obj: ring,
        life: 0.48 + i * 0.1,
        maxLife: 0.48 + i * 0.1,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 0,
        spinX: 0,
        spinY: 0,
        spinZ: i === 0 ? 7 : -7,
        scaleFrom: 0.65 + i * 0.25,
        scaleTo: 2.1 + i * 0.7,
        fadeOut: true,
      });
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xa855f7 : 0xf3e8ff,
        transparent: true,
        opacity: 0.95,
      });
      const shard = new THREE.Mesh(this.starGeo, mat);
      shard.position.set(x, y + 2.4, z);
      this.add({
        obj: shard,
        life: 0.52,
        maxLife: 0.52,
        vx: Math.cos(a) * 18,
        vy: (Math.random() - 0.2) * 14,
        vz: Math.sin(a) * 18,
        gravity: 10,
        spinX: 9,
        spinY: 9,
        spinZ: 9,
        scaleFrom: 0.9,
        scaleTo: 0.05,
        fadeOut: true,
      });
    }
  }

  /** Soft puffy slide dust kicked up along the field during a crisp slide. */
  spawnSlideDust(x: number, y: number, z: number, color = 0xf1f5f9): void {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
    const puff = new THREE.Mesh(this.boxGeo, mat);
    puff.position.set(x + (Math.random() - 0.5) * 1.4, y + 0.45, z + (Math.random() - 0.5) * 1.4);
    this.add({
      obj: puff,
      life: 0.36,
      maxLife: 0.36,
      vx: (Math.random() - 0.5) * 6,
      vy: 3.5 + Math.random() * 4,
      vz: (Math.random() - 0.5) * 6,
      gravity: 0,
      spinX: 5,
      spinY: 6,
      spinZ: 4,
      scaleFrom: 1.0,
      scaleTo: 0.1,
      fadeOut: true,
    });
  }

  /** Rising colorful music sparkles floating above a dancing character! */
  spawnEmoteSparkle(x: number, y: number, z: number, colors: number[]): void {
    const hex = colors[Math.floor(Math.random() * colors.length)] ?? 0xffd23a;
    const mat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.95 });
    const star = new THREE.Mesh(this.starGeo, mat);
    const a = Math.random() * Math.PI * 2;
    const r = 1.6 + Math.random() * 1.2;
    star.position.set(x + Math.cos(a) * r, y + 1.8 + Math.random() * 2.2, z + Math.sin(a) * r);
    this.add({
      obj: star,
      life: 0.95,
      maxLife: 0.95,
      vx: Math.cos(a) * 1.6,
      vy: 4.5 + Math.random() * 2.8,
      vz: Math.sin(a) * 1.6,
      gravity: 0,
      spinX: 4,
      spinY: 8,
      spinZ: 3,
      scaleFrom: 0.72,
      scaleTo: 0.04,
      fadeOut: true,
    });
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      if (it.life <= 0) {
        this.scene.remove(it.obj);
        ((it.obj as THREE.Mesh).material as THREE.Material)?.dispose?.();
        this.items.splice(i, 1);
        continue;
      }
      const p = 1 - it.life / it.maxLife;
      it.vy -= it.gravity * dt;
      it.obj.position.x += it.vx * dt;
      it.obj.position.y += it.vy * dt;
      it.obj.position.z += it.vz * dt;
      it.obj.rotation.x += it.spinX * dt;
      it.obj.rotation.y += it.spinY * dt;
      it.obj.rotation.z += it.spinZ * dt;
      const s = THREE.MathUtils.lerp(it.scaleFrom, it.scaleTo, p);
      it.obj.scale.setScalar(Math.max(0.01, s));
      if (it.fadeOut) {
        const mat = (it.obj as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat && 'opacity' in mat) {
          mat.opacity = Math.max(0, 1 - Math.pow(p, 1.5));
        }
      }
    }
  }
}
