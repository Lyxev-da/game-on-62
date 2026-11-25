import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createGoofyFaceTexture } from '../utils/characterTextures';
import { createR6TorsoFrontTexture } from '../utils/robloxTextures';
import { getEmote, getOutfit, type EmoteId, type GloveId, type OutfitId } from './shopData';

export interface CharacterAnimationInput {
  dt: number;
  speedRatio: number;
  isGrounded: boolean;
  verticalVelocity: number;
  isSliding: boolean;
  isGliding?: boolean;
  isDashing?: boolean;
  mantling?: boolean;
  vaultProgress?: number;
  strafeAmount: number;
  forwardAmount: number;
  turnRate: number;
  landingSquash: number;
}

type PoseKey =
  | 'hip' | 'hipX' | 'torsoPitch' | 'torsoRoll' | 'torsoYaw' | 'headPitch' | 'headYaw' | 'headRoll'
  | 'lArmPitch' | 'rArmPitch' | 'lArmRoll' | 'rArmRoll' | 'lArmYaw' | 'rArmYaw'
  | 'lLegPitch' | 'rLegPitch' | 'lLegRoll' | 'rLegRoll';
type Pose = Record<PoseKey, number>;

const REST: Pose = {
  hip: 0, hipX: 0,
  torsoPitch: 0, torsoRoll: 0, torsoYaw: 0,
  headPitch: 0, headYaw: 0, headRoll: 0,
  lArmPitch: 0, rArmPitch: 0, lArmRoll: 0.08, rArmRoll: -0.08, lArmYaw: 0, rArmYaw: 0,
  lLegPitch: 0, rLegPitch: 0, lLegRoll: 0, rLegRoll: 0,
};

const EDGE_RADIUS = 0.1;
const block = (w: number, h: number, d: number) => new RoundedBoxGeometry(w, h, d, 3, EDGE_RADIUS);

const plastic = (color: number) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.38, metalness: 0.04, clearcoat: 0.4, clearcoatRoughness: 0.25 });

/** Generates a genuine classic Roblox helical coil spring around an arm (Speed Coil / Gravity Coil). */
function makeCoilGeometry(radius = 0.74, height = 1.05, turns = 3.2, tube = 0.085): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const segs = 44;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const a = u * Math.PI * 2 * turns;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, -0.62 - u * height, Math.sin(a) * radius));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 52, tube, 8, false);
}

const outfitTextureCache = new Map<string, THREE.CanvasTexture>();

/** One shared goofy face texture for every rig (MEGA mode can have dozens of rigs). */
let faceTextureCache: THREE.CanvasTexture | null = null;
function sharedFaceTexture(): THREE.CanvasTexture {
  if (!faceTextureCache) faceTextureCache = createGoofyFaceTexture();
  return faceTextureCache;
}

function getOutfitTorsoTexture(id: OutfitId): THREE.CanvasTexture {
  const cached = outfitTextureCache.get(id);
  if (cached) return cached;

  if (id === 'classic') {
    const tex = createR6TorsoFrontTexture();
    outfitTextureCache.set(id, tex);
    return tex;
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const o = getOutfit(id);
  const baseHex = `#${o.shirtHex.toString(16).padStart(6, '0')}`;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  if (id === 'skater') {
    ctx.fillStyle = '#181b22';
    ctx.fillRect(34, 168, 188, 68);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 8;
    ctx.strokeRect(52, 64, 152, 74);
    ctx.fillStyle = '#facc15';
    ctx.font = '900 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SK8', 128, 117);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(104, 12); ctx.lineTo(104, 62);
    ctx.moveTo(152, 12); ctx.lineTo(152, 62);
    ctx.stroke();
  } else if (id === 'noob') {
    ctx.fillStyle = '#174ea6';
    ctx.fillRect(18, 18, 220, 220);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(32, 28, 86, 92);
    ctx.fillRect(138, 28, 86, 92);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 196, 256, 32);
    ctx.beginPath();
    ctx.arc(128, 140, 26, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'cyber') {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(128, 0); ctx.lineTo(128, 256);
    ctx.moveTo(28, 56); ctx.lineTo(104, 108); ctx.lineTo(28, 160);
    ctx.moveTo(228, 56); ctx.lineTo(152, 108); ctx.lineTo(228, 160);
    ctx.stroke();
  } else if (id === 'violet') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(92, 0, 72, 256);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(120, 24, 16, 232);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 240, 240);
  } else if (id === 'bigshot') {
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(74, 0); ctx.lineTo(182, 0); ctx.lineTo(128, 150);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(184, 78, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(118, 148, 20, 108);
  } else if (id === 'soldier') {
    ctx.fillStyle = '#29201b';
    ctx.fillRect(0, 186, 256, 36);
    ctx.beginPath();
    ctx.moveTo(18, 0); ctx.lineTo(62, 0); ctx.lineTo(238, 222); ctx.lineTo(194, 222);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(102, 182, 52, 44);
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(62 + i * 34, 34 + i * 38, 18, 28);
    }
  } else if (id === 'bloxy') {
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 256, 22);
    ctx.fillRect(114, 0, 28, 256);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 228, 228);
    ctx.fillStyle = '#81f4ff';
    ctx.beginPath();
    ctx.moveTo(128, 54); ctx.lineTo(156, 90); ctx.lineTo(128, 126); ctx.lineTo(100, 90);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  outfitTextureCache.set(id, tex);
  return tex;
}

/** Builds a distinctive, stylized 3D Parkour Pandemic gauntlet for one hand (side: 1 = Left/+X, -1 = Right/-X). */
function buildGloveVariant(
  id: GloveId,
  side: 1 | -1,
): { group: THREE.Group; spinParts: THREE.Object3D[]; flameParts: THREE.Mesh[]; pulseParts: THREE.Object3D[] } {
  const group = new THREE.Group();
  const spinParts: THREE.Object3D[] = [];
  const flameParts: THREE.Mesh[] = [];
  const pulseParts: THREE.Object3D[] = [];

  const metal = (color: number, emissive = 0x000000, emissiveIntensity = 0, roughness = 0.25) =>
    new THREE.MeshPhysicalMaterial({
      color,
      emissive,
      emissiveIntensity,
      roughness,
      metalness: 0.36,
      clearcoat: 0.55,
    });

  if (id === 'tape') {
    const wrapMat = plastic(0xf8fafc);
    const strapMat = plastic(0xef4444);
    const gold = metal(0xfacc15, 0x000000, 0, 0.24);
    const forearm = new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.78, 1.16, 2, 0.08), wrapMat);
    forearm.position.set(0, -1.14, 0);
    const strap = new THREE.Mesh(new RoundedBoxGeometry(1.24, 0.26, 1.24, 2, 0.06), strapMat);
    strap.position.set(0, -0.78, 0);
    const knuckle = new THREE.Mesh(new RoundedBoxGeometry(1.24, 0.42, 1.28, 2, 0.08), strapMat);
    knuckle.position.set(0, -1.48, 0.04);
    const buckle = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.22, 0.4, 2, 0.04), gold);
    buckle.position.set(side * 0.58, -0.78, 0);
    group.add(forearm, strap, knuckle, buckle);
  } else if (id === 'speed') {
    // Classic Roblox Red Speed Coil wrapping dark runner gauntlet + blazing bolt wing!
    const darkArmor = metal(0x1e222b, 0x000000, 0, 0.34);
    const redCoil = metal(0xff3b3b, 0xff1e2d, 0.88, 0.14);
    const whiteTrim = metal(0xffffff, 0xffd1d1, 0.25, 0.2);

    const fist = new THREE.Mesh(new RoundedBoxGeometry(1.26, 0.96, 1.26, 2, 0.12), darkArmor);
    fist.position.set(0, -1.28, 0);
    const knuckle = new THREE.Mesh(new RoundedBoxGeometry(1.34, 0.34, 1.36, 2, 0.08), redCoil);
    knuckle.position.set(0, -1.52, 0.06);

    const coilWrap = new THREE.Mesh(makeCoilGeometry(0.78, 1.02, 3.2, 0.095), redCoil);
    spinParts.push(coilWrap);

    // Swept speed bolt fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.38, 0.62), whiteTrim);
    fin.position.set(side * 0.72, -0.94, -0.22);
    fin.rotation.x = -0.45;
    fin.rotation.z = -side * 0.14;
    const finStripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.15, 0.28), redCoil);
    finStripe.position.set(side * 0.72, -0.94, -0.18);
    finStripe.rotation.x = -0.45;
    finStripe.rotation.z = -side * 0.14;

    group.add(fist, knuckle, coilWrap, fin, finStripe);
  } else if (id === 'gravity') {
    // Classic Roblox Luminous Blue Gravity Coil + floating hover halo rings!
    const navyArmor = metal(0x0c4a6e, 0x0284c7, 0.25, 0.24);
    const blueCoil = metal(0x7dd3fc, 0x0ea5e9, 0.95, 0.12);
    const silver = metal(0xe2e8f0, 0x000000, 0, 0.18);

    const fist = new THREE.Mesh(new RoundedBoxGeometry(1.26, 0.94, 1.26, 2, 0.14), navyArmor);
    fist.position.set(0, -1.28, 0);
    const coil = new THREE.Mesh(makeCoilGeometry(0.8, 1.08, 3.6, 0.092), blueCoil);
    spinParts.push(coil);

    const cuff = new THREE.Mesh(new RoundedBoxGeometry(1.32, 0.28, 1.32, 2, 0.08), silver);
    cuff.position.set(0, -1.56, 0);

    // Little rising arrow badge on outer side
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.56, 4), blueCoil);
    arrow.position.set(side * 0.82, -1.16, 0);
    pulseParts.push(arrow);

    group.add(fist, coil, cuff, arrow);
  } else if (id === 'boost') {
    // Twin Jet Thrusters: emerald armor + dual rocket cylinders + live plasma jets!
    const greenArmor = metal(0x15803d, 0x22c55e, 0.26);
    const limeGlow = metal(0xbef264, 0x4ade80, 0.9, 0.15);
    const gunmetal = metal(0x1e293b, 0x000000, 0, 0.3);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xa7f3d0, transparent: true, opacity: 0.92 });

    const gauntlet = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.06, 1.3, 2, 0.12), greenArmor);
    gauntlet.position.set(0, -1.26, 0);
    const knuckle = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.4, 1.38, 2, 0.1), limeGlow);
    knuckle.position.set(0, -1.55, 0.06);

    const nozzleGeo = new THREE.CylinderGeometry(0.23, 0.3, 0.82, 12);
    const flameGeo = new THREE.ConeGeometry(0.24, 0.95, 10);
    for (const zOff of [-0.3, 0.3]) {
      const nozzle = new THREE.Mesh(nozzleGeo, gunmetal);
      nozzle.position.set(side * 0.74, -0.98, zOff);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 8, 16), limeGlow);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(side * 0.74, -0.58, zOff);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(side * 0.74, -0.14, zOff);
      group.add(nozzle, ring, flame);
      flameParts.push(flame);
    }
    group.add(gauntlet, knuckle);
  } else if (id === 'blink') {
    // Void Blink: pitch obsidian shadow gauntlet + neon violet rift claws + orbiting void crystals!
    const voidBlack = metal(0x140b24, 0x2e1065, 0.35, 0.2);
    const riftPurple = metal(0xe9d5ff, 0xa855f7, 1.05, 0.1);

    const gauntlet = new THREE.Mesh(new RoundedBoxGeometry(1.28, 1.08, 1.28, 3, 0.12), voidBlack);
    gauntlet.position.set(0, -1.24, 0);
    const band = new THREE.Mesh(new RoundedBoxGeometry(1.34, 0.24, 1.34, 2, 0.06), riftPurple);
    band.position.set(0, -0.84, 0);

    // 3 sleek shadow energy claws pointing along fingers
    const clawGeo = new THREE.ConeGeometry(0.12, 0.74, 5);
    for (const o of [-0.34, 0, 0.34]) {
      const c = new THREE.Mesh(clawGeo, riftPurple);
      c.rotation.x = Math.PI;
      c.position.set(o, -1.92, 0.18);
      group.add(c);
    }

    // 3 hovering orbiting purple crystals
    const orbit = new THREE.Group();
    orbit.position.set(0, -1.22, 0);
    const shardGeo = new THREE.OctahedronGeometry(0.21, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const sh = new THREE.Mesh(shardGeo, riftPurple);
      sh.position.set(Math.cos(a) * 0.96, (i - 1) * 0.22, Math.sin(a) * 0.96);
      orbit.add(sh);
    }
    spinParts.push(orbit);
    group.add(gauntlet, band, orbit);
  } else if (id === 'frost') {
    // Subzero Claws: gleaming translucent glacier crystal armored gauntlet + jagged ice crown spikes!
    const iceBody = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0,
    });
    const frostTip = metal(0xf0f9ff, 0x38bdf8, 0.85, 0.1);

    const gauntlet = new THREE.Mesh(new RoundedBoxGeometry(1.34, 1.06, 1.34, 2, 0.12), iceBody);
    gauntlet.position.set(0, -1.26, 0);

    // Dramatic angled ice spikes erupting from wrist & knuckles
    const spikeConfigs: Array<[number, number, number, number, number, number]> = [
      [side * 0.78, -0.78, -0.1, 0.22, 1.08, -side * 0.58],
      [side * 0.8, -1.16, 0.22, 0.19, 0.9, -side * 0.85],
      [side * 0.74, -1.24, -0.32, 0.18, 0.85, -side * 0.72],
      [0, -1.82, 0.34, 0.18, 0.72, Math.PI],
      [side * 0.36, -1.78, 0.24, 0.15, 0.62, Math.PI],
    ];
    for (const [x, y, z, r, h, rz] of spikeConfigs) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), frostTip);
      sp.position.set(x, y, z);
      sp.rotation.z = rz;
      group.add(sp);
    }
    group.add(gauntlet);
  } else if (id === 'power') {
    // Seismic Pistons: oversized crimson-and-gold hydraulic mech brawler fists!
    const redMech = metal(0xdc2626, 0xef4444, 0.28);
    const hazardGold = metal(0xfacc15, 0xf59e0b, 0.82, 0.18);
    const chrome = metal(0xf1f5f9, 0x000000, 0, 0.14);

    const upperCuff = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.56, 1.36, 2, 0.1), redMech);
    upperCuff.position.set(0, -0.84, 0);
    const megaFist = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.98, 1.56, 3, 0.16), redMech);
    megaFist.position.set(side * 0.06, -1.48, 0.06);

    for (const xOff of [-0.4, 0, 0.4]) {
      const stud = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.34, 0.4, 2, 0.06), hazardGold);
      stud.position.set(side * 0.06 + xOff, -1.52, 0.78);
      group.add(stud);
    }
    const rodGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.98, 8);
    for (const zOff of [-0.32, 0.32]) {
      const rod = new THREE.Mesh(rodGeo, chrome);
      rod.position.set(side * 0.76, -1.08, zOff);
      group.add(rod);
    }
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 14), hazardGold);
    core.rotation.z = Math.PI / 2;
    core.position.set(side * 0.84, -1.46, 0.05);
    pulseParts.push(core);
    group.add(upperCuff, megaFist, core);
  } else if (id === 'grapple') {
    // Mag-Claw: royal purple tech gauntlet + sleek chrome grapple launcher + 3 neon magenta prongs!
    const violetArmor = metal(0x6b21a8, 0x9333ea, 0.32);
    const plasmaPink = metal(0xf5d0fe, 0xe879f9, 0.98, 0.12);
    const chrome = metal(0xf8fafc, 0x000000, 0, 0.16);

    const sleeve = new THREE.Mesh(new RoundedBoxGeometry(1.28, 1.0, 1.28, 2, 0.12), violetArmor);
    sleeve.position.set(0, -1.2, 0);
    const trim = new THREE.Mesh(new RoundedBoxGeometry(1.34, 0.28, 1.34, 2, 0.08), chrome);
    trim.position.set(0, -1.56, 0.04);

    const pod = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.72, 0.96, 2, 0.09), chrome);
    pod.position.set(side * 0.76, -1.16, 0.14);
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 12), plasmaPink);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(side * 0.84, -1.16, 0.36);

    const clawGeo = new THREE.ConeGeometry(0.11, 0.56, 6);
    for (const [cy, cz, rx] of [[-0.9, 0.68, 1.25], [-1.42, 0.68, 1.85], [-1.16, 0.8, 1.57]]) {
      const claw = new THREE.Mesh(clawGeo, plasmaPink);
      claw.rotation.x = rx;
      claw.position.set(side * 0.84, cy, cz);
      group.add(claw);
    }
    group.add(sleeve, trim, pod, coil);
  } else if (id === 'glider') {
    // Sky Glider: angelic pearlescent white + 24K gold aero gauntlets with bright sky-cyan wing blades!
    const pearl = metal(0xf8fafc, 0xe0f2fe, 0.18, 0.16);
    const gold = metal(0xfacc15, 0xf59e0b, 0.58, 0.16);
    const skyGlow = metal(0x7cf2ff, 0x38bdf8, 0.95, 0.1);

    const gauntlet = new THREE.Mesh(new RoundedBoxGeometry(1.28, 1.02, 1.28, 3, 0.12), pearl);
    gauntlet.position.set(0, -1.24, 0);
    const cuff = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.3, 1.36, 2, 0.08), gold);
    cuff.position.set(0, -0.82, 0);
    const knuckle = new THREE.Mesh(new RoundedBoxGeometry(1.34, 0.3, 1.36, 2, 0.08), gold);
    knuckle.position.set(0, -1.56, 0.04);

    // Twin sculpted swept sky-wing feathers on each wrist!
    for (let f = 0; f < 3; f++) {
      const feather = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.35 - f * 0.25, 0.42),
        f === 0 ? gold : skyGlow,
      );
      feather.position.set(side * (0.72 + f * 0.04), -0.92 - f * 0.18, -0.22 - f * 0.24);
      feather.rotation.x = -0.5 - f * 0.16;
      feather.rotation.z = -side * (0.24 + f * 0.08);
      group.add(feather);
    }
    group.add(gauntlet, cuff, knuckle);
  } else {
    // Fusion Core (Outrageous ❖): obsidian & molten 24K gold + double swept blades + dual counter-spinning orbital halos!
    const obsidian = metal(0x141418, 0x09090b, 0.1, 0.18);
    const solarGold = metal(0xfde047, 0xf59e0b, 0.78, 0.16);
    const hyperCyan = metal(0x8cf7ff, 0x00f0ff, 1.1, 0.1);

    const gauntlet = new THREE.Mesh(new RoundedBoxGeometry(1.38, 1.1, 1.38, 3, 0.14), obsidian);
    gauntlet.position.set(0, -1.24, 0);
    const goldCuff = new THREE.Mesh(new RoundedBoxGeometry(1.46, 0.32, 1.46, 2, 0.08), solarGold);
    goldCuff.position.set(0, -0.8, 0);
    const cyanKnuckle = new THREE.Mesh(new RoundedBoxGeometry(1.46, 0.4, 1.48, 2, 0.1), hyperCyan);
    cyanKnuckle.position.set(0, -1.56, 0.06);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.52, 0.72), solarGold);
    wing.position.set(side * 0.76, -0.84, -0.26);
    wing.rotation.x = -0.44;
    wing.rotation.z = -side * 0.2;

    const orbitPivot = new THREE.Group();
    orbitPivot.position.set(0, -1.26, 0);
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.04, 0.072, 8, 26), hyperCyan);
    ringA.rotation.set(1.15, 0.4, 0);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.062, 8, 26), solarGold);
    ringB.rotation.set(-1.1, -0.45, 0);
    const starGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), hyperCyan);
    starGem.position.set(side * 0.96, 0, 0);
    orbitPivot.add(ringA, ringB, starGem);
    spinParts.push(orbitPivot);

    group.add(gauntlet, goldCuff, cyanKnuckle, wing, orbitPivot);
  }

  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) child.castShadow = true;
  });

  return { group, spinParts, flameParts, pulseParts };
}

/** Builds massive, sleek holographic golden/cyan Sky Glider Wings attached to character's back. */
function buildGliderWings(): { group: THREE.Group; leftWing: THREE.Group; rightWing: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(0, 1.48, -0.58);
  const frameMat = new THREE.MeshPhysicalMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    metalness: 0.55,
    roughness: 0.2,
  });
  const sailMat = new THREE.MeshBasicMaterial({
    color: 0x7cf2ff,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });

  const makeWing = (side: 1 | -1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.35, 0, 0);
    const spar = new THREE.Mesh(new RoundedBoxGeometry(4.4, 0.26, 0.26, 2, 0.06), frameMat);
    spar.position.set(side * 2.2, 0.15, -0.15);
    spar.rotation.z = side * 0.12;
    const sail1 = new THREE.Mesh(new THREE.BoxGeometry(4.1, 1.28, 0.08), sailMat);
    sail1.position.set(side * 2.15, -0.25, -0.35);
    sail1.rotation.z = side * 0.08;
    sail1.rotation.x = 0.28;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.52, 0.12), frameMat);
    tip.position.set(side * 4.2, 0.35, -0.28);
    tip.rotation.z = side * 0.24;
    pivot.add(spar, sail1, tip);
    return pivot;
  };

  const leftWing = makeWing(1);
  const rightWing = makeWing(-1);
  const core = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.7, 0.36, 2, 0.08), frameMat);
  group.add(core, leftWing, rightWing);
  group.visible = false;
  return { group, leftWing, rightWing };
}

interface EmoteFrame {
  pose: Pose;
  hipY: number;
  hipRotX: number;
  hipRotY: number;
  hipRotZ: number;
  prop: 'none' | 'seat' | 'tpose' | 'disco';
}

export class R6Character {
  public root = new THREE.Group();
  public hipGroup = new THREE.Group();
  public torsoPivot = new THREE.Group();
  public neckPivot = new THREE.Group();
  public leftShoulder = new THREE.Group();
  public rightShoulder = new THREE.Group();
  public leftHip = new THREE.Group();
  public rightHip = new THREE.Group();

  public headMesh: THREE.Mesh;
  public torsoMesh: THREE.Mesh;
  public leftArmMesh: THREE.Mesh;
  public rightArmMesh: THREE.Mesh;
  public leftLegMesh: THREE.Mesh;
  public rightLegMesh: THREE.Mesh;

  private skinMat: THREE.MeshPhysicalMaterial;
  private sleeveMat: THREE.MeshPhysicalMaterial;
  private torsoSideMat: THREE.MeshPhysicalMaterial;
  private torsoFrontMat: THREE.MeshPhysicalMaterial;
  private legMat: THREE.MeshPhysicalMaterial;

  private leftGloveSlot = new THREE.Group();
  private rightGloveSlot = new THREE.Group();
  private gloveSpinParts: THREE.Object3D[] = [];
  private gloveFlameParts: THREE.Mesh[] = [];
  private glovePulseParts: THREE.Object3D[] = [];
  private activeGloveId: GloveId | null = null;

  private gliderWings: { group: THREE.Group; leftWing: THREE.Group; rightWing: THREE.Group };
  private wingSpread = 0;

  private headAccessorySlot = new THREE.Group();
  private backAccessorySlot = new THREE.Group();
  private floatingCrown: THREE.Group | null = null;
  private capePivot: THREE.Group | null = null;
  private chaserHorns = new THREE.Group();
  private iceCage: THREE.Mesh;
  private activeAccessoryKey = '';

  // Expressive Emote Props (disco ring, beanbag cushion, T-pose aura ring!)
  private discoRing: THREE.Mesh;
  private tposeRing: THREE.Mesh;
  private seatProp: THREE.Group;

  private emoteId: EmoteId | null = null;
  private emoteClock = 0;
  private emoteDuration = 2.0;
  private emoteLoop = true;

  private runPhase = 0;
  private idlePhase = 0;
  private fxClock = 0;
  private lastStepHalfCycle = 0;
  private cur: Pose = { ...REST };
  private curHipRotX = 0;
  private curHipRotY = 0;
  private curHipRotZ = 0;

  constructor(showGloves = false) {
    this.root.add(this.hipGroup);
    this.hipGroup.position.set(0, 2.0, 0);

    this.skinMat = plastic(0xf5cd30);
    this.sleeveMat = plastic(0xf5cd30);
    const face = new THREE.MeshPhysicalMaterial({
      map: sharedFaceTexture(),
      roughness: 0.38,
      clearcoat: 0.38,
      clearcoatRoughness: 0.28,
    });
    this.torsoSideMat = plastic(0x0d69ac);
    this.torsoFrontMat = new THREE.MeshPhysicalMaterial({
      map: getOutfitTorsoTexture('classic'),
      roughness: 0.38,
      clearcoat: 0.38,
      clearcoatRoughness: 0.28,
    });
    this.legMat = plastic(0xa4bd47);

    // Torso: 2 x 2 x 1 studs
    this.hipGroup.add(this.torsoPivot);
    this.torsoMesh = new THREE.Mesh(block(2, 2, 1), [
      this.torsoSideMat, this.torsoSideMat, this.torsoSideMat,
      this.torsoSideMat, this.torsoFrontMat, this.torsoSideMat,
    ]);
    this.torsoMesh.position.set(0, 1, 0);
    this.torsoPivot.add(this.torsoMesh);
    this.torsoPivot.add(this.backAccessorySlot);

    // Deployable Sky Glider 3D Energy Wings
    this.gliderWings = buildGliderWings();
    this.torsoPivot.add(this.gliderWings.group);

    // Head: 1.22 cube, face on +Z
    this.torsoPivot.add(this.neckPivot);
    this.neckPivot.position.set(0, 2.02, 0);
    this.headMesh = new THREE.Mesh(block(1.22, 1.22, 1.22), [
      this.skinMat, this.skinMat, this.skinMat,
      this.skinMat, face, this.skinMat,
    ]);
    this.headMesh.position.set(0, 0.62, 0);
    this.neckPivot.add(this.headMesh);
    this.headMesh.add(this.headAccessorySlot);

    // Chaser glowing horns
    const hornMat = new THREE.MeshPhysicalMaterial({
      color: 0xff2a1f,
      emissive: 0xff1e14,
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });
    for (const sx of [-0.42, 0.42]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, 8), hornMat);
      horn.position.set(sx, 0.82, 0.08);
      horn.rotation.z = -sx * 0.45;
      horn.rotation.x = 0.2;
      this.chaserHorns.add(horn);
    }
    this.chaserHorns.visible = false;
    this.headMesh.add(this.chaserHorns);

    // Arms
    const armGeo = block(1, 2, 1);
    this.torsoPivot.add(this.leftShoulder);
    this.leftShoulder.position.set(1.52, 1.75, 0);
    this.leftArmMesh = new THREE.Mesh(armGeo, this.sleeveMat);
    this.leftArmMesh.position.set(0, -0.75, 0);
    this.leftShoulder.add(this.leftArmMesh, this.leftGloveSlot);

    this.torsoPivot.add(this.rightShoulder);
    this.rightShoulder.position.set(-1.52, 1.75, 0);
    this.rightArmMesh = new THREE.Mesh(armGeo, this.sleeveMat);
    this.rightArmMesh.position.set(0, -0.75, 0);
    this.rightShoulder.add(this.rightArmMesh, this.rightGloveSlot);

    if (showGloves) this.setGloves('tape', true);

    // Legs
    const legGeo = block(0.98, 2, 1);
    this.hipGroup.add(this.leftHip);
    this.leftHip.position.set(0.51, 0, 0);
    this.leftLegMesh = new THREE.Mesh(legGeo, this.legMat);
    this.leftLegMesh.position.set(0, -1, 0);
    this.leftHip.add(this.leftLegMesh);

    this.hipGroup.add(this.rightHip);
    this.rightHip.position.set(-0.51, 0, 0);
    this.rightLegMesh = new THREE.Mesh(legGeo, this.legMat);
    this.rightLegMesh.position.set(0, -1, 0);
    this.rightHip.add(this.rightLegMesh);

    // Frozen 3D Ice Block (shown when chaser is hit by Subzero Claws!)
    this.iceCage = new THREE.Mesh(
      new RoundedBoxGeometry(4.2, 5.8, 3.6, 2, 0.25),
      new THREE.MeshPhysicalMaterial({
        color: 0x99ebff,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.56,
        roughness: 0.08,
        clearcoat: 1,
        depthWrite: false,
      }),
    );
    this.iceCage.position.set(0, 2.9, 0);
    this.iceCage.visible = false;
    this.root.add(this.iceCage);

    // Emote ground props (only shown during matching emotes!)
    this.discoRing = new THREE.Mesh(
      new THREE.RingGeometry(1.75, 2.55, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffd23a,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.discoRing.rotation.x = -Math.PI / 2;
    this.discoRing.position.y = 0.09;
    this.discoRing.visible = false;
    this.root.add(this.discoRing);

    this.tposeRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.11, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.85 }),
    );
    this.tposeRing.rotation.x = Math.PI / 2;
    this.tposeRing.position.y = 0.24;
    this.tposeRing.visible = false;
    this.root.add(this.tposeRing);

    // Cozy Roblox blocky beanbag chair for Chill Sit!
    this.seatProp = new THREE.Group();
    const cushion = new THREE.Mesh(new RoundedBoxGeometry(2.8, 1.12, 2.5, 3, 0.38), plastic(0x3b82f6));
    cushion.position.set(0, 0.56, -0.15);
    const backrest = new THREE.Mesh(new RoundedBoxGeometry(2.6, 1.5, 0.8, 3, 0.28), plastic(0x2563eb));
    backrest.position.set(0, 1.22, -1.05);
    const piping = new THREE.Mesh(new RoundedBoxGeometry(2.9, 0.2, 2.6, 2, 0.08), plastic(0xfef08a));
    piping.position.set(0, 1.0, -0.15);
    this.seatProp.add(cushion, backrest, piping);
    this.seatProp.visible = false;
    this.root.add(this.seatProp);

    for (const mesh of [this.torsoMesh, this.headMesh, this.leftArmMesh, this.rightArmMesh, this.leftLegMesh, this.rightLegMesh]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  }

  public setFrozen(frozen: boolean): void {
    this.iceCage.visible = frozen;
  }

  public setGloves(gloveId: GloveId, visible = true): void {
    this.leftGloveSlot.visible = visible;
    this.rightGloveSlot.visible = visible;
    if (!visible) {
      this.gliderWings.group.visible = false;
      return;
    }
    if (this.activeGloveId === gloveId) return;

    this.activeGloveId = gloveId;
    this.leftGloveSlot.clear();
    this.rightGloveSlot.clear();
    this.gloveSpinParts = [];
    this.gloveFlameParts = [];
    this.glovePulseParts = [];

    const left = buildGloveVariant(gloveId, 1);
    const right = buildGloveVariant(gloveId, -1);
    this.leftGloveSlot.add(left.group);
    this.rightGloveSlot.add(right.group);
    this.gloveSpinParts.push(...left.spinParts, ...right.spinParts);
    this.gloveFlameParts.push(...left.flameParts, ...right.flameParts);
    this.glovePulseParts.push(...left.pulseParts, ...right.pulseParts);
  }

  public setOutfit(outfitId: OutfitId, isChaser: boolean): void {
    const o = getOutfit(outfitId);
    this.chaserHorns.visible = isChaser;

    if (isChaser) {
      this.torsoSideMat.color.setHex(0xc4281c);
      this.torsoFrontMat.map = null;
      this.torsoFrontMat.color.setHex(0xc4281c);
      this.torsoFrontMat.needsUpdate = true;
      this.legMat.color.setHex(0x1e1f24);
      this.skinMat.color.setHex(0xf5cd30);
      this.sleeveMat.color.setHex(0x991b1b);
    } else {
      this.torsoSideMat.color.setHex(o.shirtHex);
      this.torsoFrontMat.map = getOutfitTorsoTexture(o.id);
      this.torsoFrontMat.color.setHex(0xffffff);
      this.torsoFrontMat.needsUpdate = true;
      this.legMat.color.setHex(o.pantsHex);
      this.skinMat.color.setHex(o.skinHex);
      this.sleeveMat.color.setHex(o.sleeveHex ?? o.skinHex);
    }

    const key = `${o.id}-${isChaser ? 'c' : 'r'}`;
    if (this.activeAccessoryKey === key) return;
    this.activeAccessoryKey = key;

    this.headAccessorySlot.clear();
    this.backAccessorySlot.clear();
    this.floatingCrown = null;
    this.capePivot = null;

    if (o.id === 'skater') {
      const capMat = plastic(0xef4444);
      const darkMat = plastic(0x18181b);
      const dome = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.42, 1.3, 2, 0.1), capMat);
      dome.position.set(0, 0.56, 0);
      const brim = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.12, 0.55, 2, 0.04), capMat);
      brim.position.set(0, 0.42, -0.78);
      for (const sx of [-0.68, 0.68]) {
        const ear = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.5, 0.46, 2, 0.06), darkMat);
        ear.position.set(sx, 0.06, 0);
        this.headAccessorySlot.add(ear);
      }
      this.headAccessorySlot.add(dome, brim);

      const deck = new THREE.Mesh(new RoundedBoxGeometry(0.86, 2.35, 0.14, 2, 0.06), plastic(0xfacc15));
      deck.position.set(0, 1.05, -0.62);
      deck.rotation.z = 0.36;
      for (const yOff of [-0.68, 0.68]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.96, 10), capMat);
        wheel.rotation.z = Math.PI / 2 + 0.36;
        wheel.position.set(-Math.sin(0.36) * yOff, 1.05 + Math.cos(0.36) * yOff, -0.76);
        this.backAccessorySlot.add(wheel);
      }
      this.backAccessorySlot.add(deck);
    } else if (o.id === 'noob') {
      const helm = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.54, 1.36, 2, 0.12), plastic(0x2563eb));
      helm.position.set(0, 0.52, 0);
      const band = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 1.4), plastic(0xfacc15));
      band.position.set(0, 0.34, 0);
      this.headAccessorySlot.add(helm, band);

      const sword = new THREE.Group();
      sword.position.set(0, 1.05, -0.62);
      sword.rotation.z = -0.58;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 2.3, 0.09),
        new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.2 }),
      );
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.18, 0.2), plastic(0xfacc15));
      guard.position.set(0, 0.78, 0);
      const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.18), plastic(0x1e3a8a));
      hilt.position.set(0, 1.12, 0);
      sword.add(blade, guard, hilt);
      this.backAccessorySlot.add(sword);
    } else if (o.id === 'cyber') {
      const visorMat = new THREE.MeshPhysicalMaterial({
        color: 0x22d3ee,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.95,
        roughness: 0.12,
      });
      const visor = new THREE.Mesh(new RoundedBoxGeometry(1.34, 0.36, 0.35, 2, 0.08), visorMat);
      visor.position.set(0, 0.14, 0.54);
      const strap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 1.28), plastic(0x0f172a));
      strap.position.set(0, 0.14, 0);
      this.headAccessorySlot.add(strap, visor);

      const collar = new THREE.Mesh(new RoundedBoxGeometry(1.75, 0.42, 1.28, 2, 0.08), plastic(0x0ea5e9));
      collar.position.set(0, 1.92, -0.05);
      this.backAccessorySlot.add(collar);
    } else if (o.id === 'violet') {
      const beanie = new THREE.Mesh(new RoundedBoxGeometry(1.32, 0.56, 1.32, 3, 0.16), plastic(0x0f172a));
      beanie.position.set(0, 0.56, 0);
      const fold = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.22, 1.36, 2, 0.08), plastic(0x1e293b));
      fold.position.set(0, 0.36, 0);
      this.headAccessorySlot.add(beanie, fold);
    } else if (o.id === 'bigshot') {
      const hair = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.42, 1.34, 2, 0.1), plastic(0x09090b));
      hair.position.set(0, 0.58, -0.04);
      const pinkLens = new THREE.MeshPhysicalMaterial({ color: 0xff47b8, emissive: 0xff20aa, emissiveIntensity: 0.55, roughness: 0.2 });
      const yellowLens = new THREE.MeshPhysicalMaterial({ color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 0.55, roughness: 0.2 });
      const lLens = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.36, 0.2, 2, 0.05), pinkLens);
      lLens.position.set(0.28, 0.14, 0.62);
      const rLens = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.36, 0.2, 2, 0.05), yellowLens);
      rLens.position.set(-0.28, 0.14, 0.62);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.08, 0.16), plastic(0x09090b));
      bridge.position.set(0, 0.18, 0.6);
      this.headAccessorySlot.add(hair, lLens, rLens, bridge);

      for (const sx of [-1, 1]) {
        const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.52, 0.12), sx > 0 ? pinkLens : yellowLens);
        w1.position.set(sx * 1.15, 1.45, -0.58);
        w1.rotation.z = sx * 0.42;
        w1.rotation.y = -sx * 0.25;
        const w2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.36, 0.12), plastic(0x9333ea));
        w2.position.set(sx * 0.98, 0.88, -0.58);
        w2.rotation.z = -sx * 0.24;
        this.backAccessorySlot.add(w1, w2);
      }
    } else if (o.id === 'soldier') {
      const steel = new THREE.MeshPhysicalMaterial({ color: 0x334155, metalness: 0.55, roughness: 0.35 });
      const dome = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.68, 1.44, 3, 0.16), steel);
      dome.position.set(0, 0.44, 0.04);
      const strap = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.14, 1.46), plastic(0x451a03));
      strap.position.set(0, 0.22, 0.04);
      this.headAccessorySlot.add(dome, strap);
    } else if (o.id === 'bloxy') {
      const goldMat = new THREE.MeshPhysicalMaterial({
        color: 0xfacc15,
        emissive: 0xd97706,
        emissiveIntensity: 0.45,
        metalness: 0.65,
        roughness: 0.18,
      });
      const gemMat = new THREE.MeshPhysicalMaterial({
        color: 0x81f4ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.9,
        roughness: 0.1,
      });
      const crown = new THREE.Group();
      crown.position.set(0, 1.02, 0);
      const base = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.32, 1.12, 2, 0.06), goldMat);
      crown.add(base);
      for (const [px, pz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4], [0, 0.44]]) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 4), goldMat);
        spike.position.set(px, 0.34, pz);
        crown.add(spike);
      }
      const frontGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), gemMat);
      frontGem.position.set(0, 0.04, 0.58);
      crown.add(frontGem);
      this.headAccessorySlot.add(crown);
      this.floatingCrown = crown;

      const capePivot = new THREE.Group();
      capePivot.position.set(0, 1.92, -0.52);
      const cape = new THREE.Mesh(new RoundedBoxGeometry(1.88, 2.35, 0.1, 2, 0.04), plastic(0xdc2626));
      cape.position.set(0, -1.16, -0.06);
      const trim = new THREE.Mesh(new RoundedBoxGeometry(1.92, 0.24, 0.12, 2, 0.04), goldMat);
      trim.position.set(0, -2.24, -0.06);
      capePivot.add(cape, trim);
      this.backAccessorySlot.add(capePivot);
      this.capePivot = capePivot;
    }
  }

  /** Plays a choreographed Untitled Tag Game emote! */
  public playEmote(id: EmoteId): void {
    const e = getEmote(id);
    this.emoteId = id;
    this.emoteClock = 0;
    this.emoteDuration = e.duration;
    this.emoteLoop = e.loop;
  }

  /** Forces an instant frame of an emote (used for super crisp shop thumbnails). */
  public poseEmoteAt(id: EmoteId, elapsed: number): void {
    this.emoteId = id;
    this.emoteClock = elapsed;
    const f = this.computeEmoteFrame(id, elapsed);
    this.cur = { ...f.pose };
    this.curHipRotX = f.hipRotX;
    this.curHipRotY = f.hipRotY;
    this.curHipRotZ = f.hipRotZ;
    this.applyPose(f.pose, f.hipY, f.hipRotX, f.hipRotY, f.hipRotZ, f.prop, elapsed);
    this.emoteId = null;
  }

  public stopEmote(): void {
    this.emoteId = null;
    this.emoteClock = 0;
    this.curHipRotX = 0;
    this.curHipRotY = 0;
    this.curHipRotZ = 0;
    this.hipGroup.position.x = 0;
    this.hipGroup.rotation.set(0, 0, 0);
    this.discoRing.visible = false;
    this.tposeRing.visible = false;
    this.seatProp.visible = false;
  }

  public get emoting(): boolean {
    return this.emoteId !== null;
  }

  public get currentEmote(): EmoteId | null {
    return this.emoteId;
  }

  /**
   * Rich, multi-beat, joyful choreographed performance for all 12 iconic UTG emotes!
   * Reminder: +rotation.x swings forward (+Z), -rotation.x swings UP overhead for arms.
   */
  private computeEmoteFrame(id: EmoteId, t: number): EmoteFrame {
    const p: Pose = { ...REST };
    let hipY = 2.02;
    let hipRotX = 0;
    let hipRotY = 0;
    let hipRotZ = 0;
    let prop: EmoteFrame['prop'] = 'none';

    switch (id) {
      case 'wave': {
        // Super friendly Roblox double-bounce wave + cheerful lean + cheek tilt!
        const w = Math.sin(t * 9.5);
        const sway = Math.sin(t * 3.1);
        const hop = Math.pow(Math.max(0, Math.sin(t * 4.6)), 2) * 0.22;
        hipY = 2.02 + hop;
        p.torsoRoll = 0.14 + sway * 0.08;
        p.torsoYaw = -0.18 + sway * 0.1;
        p.headRoll = -0.2 + w * 0.06;
        p.headYaw = 0.22;
        p.headPitch = -0.08;
        // High big energetic wave with Left arm (+X) while hand-on-hip with Right!
        p.lArmPitch = -2.62 + Math.cos(t * 9.5) * 0.14;
        p.lArmRoll = 0.56 + w * 0.42;
        p.rArmPitch = 0.15;
        p.rArmRoll = -0.42 - sway * 0.08;
        p.lLegRoll = 0.08;
        p.rLegRoll = -0.1;
        p.rLegPitch = hop * 0.9;
        break;
      }

      case 'cheer': {
        // Classic hyped UTG cheer: rhythmic bouncy jumps + alternating overhead victory punches!
        const beat = (t * 2.2) % 2;
        const jump = Math.abs(Math.sin(t * Math.PI * 2.2));
        const jumpArc = Math.pow(jump, 1.4);
        const alt = Math.sin(t * Math.PI * 2.2);
        hipY = 2.02 + jumpArc * 0.95;
        p.torsoPitch = -0.12 + jumpArc * 0.18;
        p.torsoRoll = alt * 0.16;
        p.torsoYaw = alt * 0.22;
        p.headPitch = -0.24;
        p.headYaw = -alt * 0.15;
        // Both arms sky high pumping in excitement
        p.lArmPitch = -2.72 + (beat < 1 ? 0.35 * (1 - jump) : 0);
        p.rArmPitch = -2.72 + (beat >= 1 ? 0.35 * (1 - jump) : 0);
        p.lArmRoll = 0.36 + jumpArc * 0.34;
        p.rArmRoll = -0.36 - jumpArc * 0.34;
        p.lLegRoll = 0.14 + jumpArc * 0.22;
        p.rLegRoll = -0.14 - jumpArc * 0.22;
        p.lLegPitch = alt * 0.28 * jumpArc;
        p.rLegPitch = -alt * 0.28 * jumpArc;
        prop = 'disco';
        break;
      }

      case 'laugh': {
        // TF2/UTG Schadenfreude! Point mockingly, throw head back roaring, slap knee & wobble!
        const cycle = (t % 2.4) / 2.4;
        const cackle = Math.sin(t * 24);
        if (cycle < 0.48) {
          // Throwing head WAY back holding belly cackling!
          p.torsoPitch = -0.36 + cackle * 0.09;
          p.torsoRoll = Math.sin(t * 6) * 0.14;
          p.headPitch = -0.45 + cackle * 0.12;
          p.lArmPitch = -0.78 + cackle * 0.15;
          p.lArmRoll = -0.45;
          p.rArmPitch = -0.82 - cackle * 0.15;
          p.rArmRoll = 0.45;
          p.lLegRoll = 0.14;
          p.rLegRoll = -0.14;
          hipY = 2.02 + Math.abs(cackle) * 0.14;
        } else {
          // Lean forward pointing straight at the victim while dying laughing!
          p.torsoPitch = 0.42 + cackle * 0.1;
          p.torsoYaw = -0.25;
          p.headPitch = -0.24 + cackle * 0.1;
          p.headYaw = 0.22;
          p.lArmPitch = -1.52 + cackle * 0.12; // dramatic finger point straight forward!
          p.lArmRoll = 0.12;
          p.rArmPitch = -0.58 + cackle * 0.22; // slapping thigh
          p.rArmRoll = -0.28;
          p.lLegPitch = -0.28;
          p.rLegPitch = 0.22;
          hipY = 1.92 + Math.abs(cackle) * 0.12;
        }
        break;
      }

      case 'sit': {
        // Relaxed chill sit atop a summoned 3D blue & gold Roblox beanbag!
        const swing = Math.sin(t * 2.8);
        const look = Math.sin(t * 1.15);
        hipY = 1.24 + Math.sin(t * 2.2) * 0.04;
        p.torsoPitch = -0.16;
        p.torsoRoll = Math.sin(t * 1.4) * 0.06;
        p.headYaw = look * 0.44;
        p.headPitch = 0.06 + Math.sin(t * 2.8) * 0.06;
        p.headRoll = look * 0.1;
        // Kicking legs lazily out in front!
        p.lLegPitch = -1.42 + swing * 0.22;
        p.rLegPitch = -1.42 - swing * 0.22;
        p.lLegRoll = 0.16;
        p.rLegRoll = -0.16;
        // Hands propped cozy on cushion sides
        p.lArmPitch = 0.22;
        p.rArmPitch = 0.22;
        p.lArmRoll = 0.44;
        p.rArmRoll = -0.44;
        prop = 'seat';
        break;
      }

      case 'tpose': {
        // Iconic UTG hovering T-Pose asserting total hilarious dominance!
        hipY = 3.15 + Math.sin(t * 2.4) * 0.34;
        hipRotY = t * 1.15;
        p.lArmRoll = Math.PI / 2;
        p.rArmRoll = -Math.PI / 2;
        p.lArmPitch = 0;
        p.rArmPitch = 0;
        p.torsoPitch = 0;
        p.headPitch = 0.04;
        prop = 'tpose';
        break;
      }

      case 'floss': {
        // Crisp iconic 4-beat Backpack Kid Floss: alternate back/front straight-arm pendulum vs huge hip sway!
        const beat = t * (128 / 60) * Math.PI;
        const s = Math.sin(beat);
        const frontBack = Math.sin(beat * 0.5);
        p.hipX = -s * 0.52; // sharp contrasting hip bump!
        hipY = 2.02 + Math.abs(Math.cos(beat)) * 0.1;
        p.torsoRoll = s * 0.2;
        p.torsoYaw = s * 0.26;
        p.headYaw = -s * 0.16;
        p.headRoll = -s * 0.1;
        // Both arms swing across the same side, alternating front & behind hips!
        const lForward = frontBack > 0 ? -0.42 : 0.42;
        const rForward = frontBack > 0 ? 0.35 : -0.35;
        p.lArmRoll = 0.22 + s * 0.72;
        p.rArmRoll = -0.22 + s * 0.72;
        p.lArmPitch = lForward * Math.abs(s);
        p.rArmPitch = rForward * Math.abs(s);
        p.lLegRoll = 0.18 + s * 0.12;
        p.rLegRoll = -0.18 + s * 0.12;
        prop = 'disco';
        break;
      }

      case 'boston': {
        // Authentic TF2/UTG Boston Breakdance: hyped toprock -> drops into spinning air-windmill flare!
        const cycle = (t % 3.8) / 3.8;
        if (cycle < 0.34) {
          // Funky upbeat toprock side-steps!
          const b = Math.sin(t * 9.5);
          hipY = 2.02 + Math.abs(Math.cos(t * 9.5)) * 0.26;
          p.hipX = b * 0.45;
          p.torsoPitch = 0.2;
          p.torsoYaw = b * 0.45;
          p.torsoRoll = -b * 0.18;
          p.headPitch = -0.18;
          p.lArmPitch = -1.2 + b * 0.65;
          p.rArmPitch = -1.2 - b * 0.65;
          p.lArmRoll = 0.55;
          p.rArmRoll = -0.55;
          p.lLegPitch = b * 0.65;
          p.rLegPitch = -b * 0.65;
        } else if (cycle < 0.86) {
          // Inverted spinning flare / headspin windmill!
          const u = (cycle - 0.34) / 0.52;
          const ease = Math.sin(Math.min(1, u * 5) * (Math.PI / 2)) * Math.sin(Math.min(1, (1 - u) * 5) * (Math.PI / 2));
          hipY = 2.05 + ease * 0.55;
          hipRotX = 2.15 * ease; // tipped upside down dynamically!
          hipRotY = u * Math.PI * 6; // 3 full blazing windmill spins!
          p.lArmPitch = -2.4;
          p.rArmPitch = -2.4;
          p.lArmRoll = 0.72;
          p.rArmRoll = -0.72;
          // Wide scissoring b-boy flare legs!
          const sc = Math.sin(u * Math.PI * 6);
          p.lLegRoll = 0.78 + sc * 0.28;
          p.rLegRoll = -0.78 + sc * 0.28;
          p.lLegPitch = sc * 0.7;
          p.rLegPitch = -sc * 0.7;
        } else {
          // Snappy victory freeze pop-up!
          const u = (cycle - 0.86) / 0.14;
          hipY = 2.02 + Math.sin(u * Math.PI) * 0.9;
          p.lArmPitch = -2.4;
          p.lArmRoll = 0.85;
          p.rArmPitch = -0.6;
          p.rArmRoll = -0.9;
          p.torsoRoll = -0.18;
          p.lLegRoll = 0.25;
          p.rLegRoll = -0.25;
        }
        prop = 'disco';
        break;
      }

      case 'california': {
        // Iconic Friday the 13th / UTG California Gurls dance!
        const beat = t * (125 / 60) * Math.PI;
        const bar = Math.floor((t * 125) / 60 / 4) % 2;
        const s = Math.sin(beat);
        const bounce = Math.abs(Math.sin(beat));
        p.hipX = s * 0.42;
        hipY = 2.02 + bounce * 0.26;
        p.torsoRoll = s * 0.24;
        p.torsoYaw = s * 0.36;
        p.headRoll = -s * 0.22;
        p.headYaw = -s * 0.18;

        if (bar === 0) {
          // Big joyful swooping clasped-hands side swing across chest & high hip shimmy!
          p.lArmPitch = -1.65 - bounce * 0.42;
          p.rArmPitch = -1.65 - bounce * 0.42;
          p.lArmRoll = 0.45 + s * 0.55;
          p.rArmRoll = -0.45 + s * 0.55;
        } else {
          // Overhead sunny wave & double snap sway!
          p.lArmPitch = -2.65 + s * 0.3;
          p.rArmPitch = -2.65 - s * 0.3;
          p.lArmRoll = 0.32 + s * 0.55;
          p.rArmRoll = -0.32 + s * 0.55;
        }
        p.lLegPitch = -bounce * 0.32 * (s > 0 ? 1 : 0.2);
        p.rLegPitch = -bounce * 0.32 * (s < 0 ? 1 : 0.2);
        p.lLegRoll = 0.16;
        p.rLegRoll = -0.16;
        prop = 'disco';
        break;
      }

      case 'kazotsky': {
        // Authentic TF2/UTG Kazotsky Kick! Deep proud cossack bounce + alternating razor-high front kicks!
        const w = t * (138 / 60) * Math.PI;
        const s = Math.sin(w);
        const abs = Math.abs(s);
        // Hop slightly between kicks, low deep bounce on the beat
        hipY = 1.66 + abs * 0.56;
        p.torsoPitch = -0.14;
        p.torsoRoll = s * 0.18;
        p.torsoYaw = -s * 0.24;
        p.headPitch = 0.12;
        p.headYaw = s * 0.2;
        // Proudly folded arms across front of chest!
        p.lArmPitch = -1.24 + abs * 0.12;
        p.rArmPitch = -1.24 + abs * 0.12;
        p.lArmRoll = -0.68;
        p.rArmRoll = 0.68;
        p.lArmYaw = -0.5;
        p.rArmYaw = 0.5;
        // Crisp huge alternating straight-leg front kicks!
        const leftKick = Math.max(0, s);
        const rightKick = Math.max(0, -s);
        p.lLegPitch = -leftKick * 1.48 + rightKick * 0.18;
        p.rLegPitch = -rightKick * 1.48 + leftKick * 0.18;
        p.lLegRoll = leftKick * 0.28 + 0.08;
        p.rLegRoll = -rightKick * 0.28 - 0.08;
        prop = 'disco';
        break;
      }

      case 'sturdy': {
        // Snappy UTG Get Sturdy! Fast bouncing whip-arms, deep drops, alternating hop-kicks & clean 360 spin!
        const cycle = (t % 3.38) / 3.38;
        const w = t * (142 / 60) * Math.PI;
        const s = Math.sin(w);
        const hit = Math.pow(Math.abs(s), 0.7);
        hipY = 1.72 + (1 - hit) * 0.62;
        p.hipX = s * 0.34;
        p.torsoPitch = 0.34 * hit;
        p.torsoYaw = s * 0.48;
        p.torsoRoll = -s * 0.2;
        p.headPitch = -0.26 * hit;
        p.headYaw = -s * 0.22;
        // Punchy crossing double-whip arm swings
        p.lArmPitch = -1.42 + s * 0.82;
        p.rArmPitch = -1.42 - s * 0.82;
        p.lArmRoll = 0.32 + hit * 0.52;
        p.rArmRoll = -0.32 - hit * 0.52;
        // Dynamic criss-cross knee lifts
        p.lLegPitch = -Math.max(0, s) * 1.15;
        p.rLegPitch = -Math.max(0, -s) * 1.15;
        p.lLegRoll = 0.18 + Math.max(0, s) * 0.32;
        p.rLegRoll = -0.18 - Math.max(0, -s) * 0.32;
        // Slick quick 360 spin at end of the 4-bar phrase!
        if (cycle > 0.78) {
          const su = (cycle - 0.78) / 0.22;
          hipRotY = su * Math.PI * 2;
          hipY += Math.sin(su * Math.PI) * 0.9;
        }
        prop = 'disco';
        break;
      }

      case 'ratdance': {
        // Viral chaotic UTG Rat Dance! Super bouncy big-grin turbo jig with flapping celebratory arms & big hops!
        const w = t * (148 / 60) * Math.PI;
        const s = Math.sin(w);
        const hop = Math.abs(Math.sin(w));
        const half = Math.sin(w * 0.5);
        hipY = 2.02 + Math.pow(hop, 0.75) * 0.75;
        p.hipX = half * 0.55;
        hipRotY = Math.sin(w * 0.25) * 0.65;
        p.torsoPitch = 0.22 - hop * 0.24;
        p.torsoRoll = s * 0.32;
        p.torsoYaw = s * 0.42;
        // Rapid silly joyous head bob!
        p.headPitch = Math.sin(w * 2) * 0.28;
        p.headRoll = -s * 0.3;
        // Chaotic wide alternating floppy arm pumps!
        p.lArmPitch = -2.1 + Math.sin(w * 2) * 0.85;
        p.rArmPitch = -2.1 - Math.sin(w * 2) * 0.85;
        p.lArmRoll = 0.78 + hop * 0.52;
        p.rArmRoll = -0.78 - hop * 0.52;
        // Splayed goofy big alternating frog-jig leg kicks
        p.lLegPitch = s * 0.92;
        p.rLegPitch = -s * 0.92;
        p.lLegRoll = 0.26 + Math.max(0, s) * 0.42;
        p.rLegRoll = -0.26 - Math.max(0, -s) * 0.42;
        prop = 'disco';
        break;
      }

      case 'gangnam': {
        // Iconic Gangnam Style! Bars 1-2: crossed-wrist horse gallop! Bars 3-4: high spinning overhead lasso!
        const w = t * (132 / 60) * Math.PI;
        const bar = Math.floor((t * 132) / 60 / 4) % 2;
        const hop = Math.abs(Math.sin(w));
        const side = Math.sin(w * 0.5);
        hipY = 1.92 + Math.pow(hop, 1.1) * 0.58;
        p.hipX = side * 0.58;
        p.torsoPitch = 0.14;
        p.torsoRoll = side * 0.16;
        p.torsoYaw = side * 0.22;
        p.headPitch = -0.1 + hop * 0.14;
        // Classic wide horse-riding gallop stride!
        p.lLegRoll = 0.28 + Math.max(0, side) * 0.22;
        p.rLegRoll = -0.28 - Math.max(0, -side) * 0.22;
        p.lLegPitch = -hop * 0.48 * (side >= 0 ? 1 : 0.4);
        p.rLegPitch = -hop * 0.48 * (side < 0 ? 1 : 0.4);

        if (bar === 0) {
          // Crossed-wrists bouncy reins pose!
          p.lArmPitch = -1.28 - hop * 0.36;
          p.rArmPitch = -1.28 - hop * 0.36;
          p.lArmRoll = -0.35;
          p.rArmRoll = 0.35;
        } else {
          // Overhead wild spinning cowboy lasso!
          p.lArmPitch = -2.82 + Math.sin(t * 14) * 0.34;
          p.lArmRoll = 0.42 + Math.cos(t * 14) * 0.46;
          p.rArmPitch = -1.15 - hop * 0.25;
          p.rArmRoll = 0.22;
        }
        prop = 'disco';
        break;
      }
    }

    return { pose: p, hipY, hipRotX, hipRotY, hipRotZ, prop };
  }

  private applyPose(
    c: Pose,
    hipY: number,
    hipRotX: number,
    hipRotY: number,
    hipRotZ: number,
    prop: EmoteFrame['prop'],
    clock: number,
  ): void {
    this.hipGroup.position.set(c.hipX, hipY, 0);
    this.hipGroup.rotation.set(hipRotX, hipRotY, hipRotZ);
    this.torsoPivot.rotation.set(c.torsoPitch, c.torsoYaw, c.torsoRoll);
    this.neckPivot.rotation.set(c.headPitch, c.headYaw, c.headRoll);
    this.leftShoulder.rotation.set(c.lArmPitch, c.lArmYaw, c.lArmRoll);
    this.rightShoulder.rotation.set(c.rArmPitch, c.rArmYaw, c.rArmRoll);
    this.leftHip.rotation.set(c.lLegPitch, 0, c.lLegRoll);
    this.rightHip.rotation.set(c.rLegPitch, 0, c.rLegRoll);

    this.seatProp.visible = prop === 'seat';
    this.tposeRing.visible = prop === 'tpose';
    this.discoRing.visible = prop === 'disco';

    if (this.discoRing.visible) {
      const mat = this.discoRing.material as THREE.MeshBasicMaterial;
      mat.color.setHSL((clock * 0.38) % 1, 0.92, 0.6);
      const pulse = 1 + Math.sin(clock * 10) * 0.1;
      this.discoRing.scale.setScalar(pulse);
    }
    if (this.tposeRing.visible) {
      this.tposeRing.position.y = 0.28 + Math.sin(clock * 4) * 0.14;
      this.tposeRing.scale.setScalar(1 + Math.sin(clock * 3) * 0.08);
    }
  }

  /** Updates animation, glowing gauntlet motions, Sky Glider wings, and active emotes. Returns true on footstep. */
  public update(input: CharacterAnimationInput): boolean {
    const {
      dt, speedRatio, isGrounded, verticalVelocity, isSliding,
      isGliding = false, isDashing = false, mantling = false, vaultProgress = 0,
      strafeAmount, forwardAmount, turnRate, landingSquash,
    } = input;

    let triggered = false;
    this.idlePhase += dt * 2.4;
    this.fxClock += dt;
    const ratio = THREE.MathUtils.clamp(speedRatio, 0, 1.5);

    // Animate sculpted 3D gauntlet details (Spinning coils, Void Blink shards, Fusion orbital rings, Jet flames!)
    for (let i = 0; i < this.gloveSpinParts.length; i++) {
      const part = this.gloveSpinParts[i];
      const dir = i % 2 === 0 ? 1 : -1;
      part.rotation.y += dt * (this.activeGloveId === 'fusion' ? 4.4 : 2.8) * dir;
      if (this.activeGloveId === 'fusion') part.rotation.z += dt * 1.9 * dir;
    }
    if (this.gloveFlameParts.length > 0) {
      const boostHot = !isGrounded || isDashing || ratio > 0.9;
      const flicker = 0.84 + Math.sin(this.fxClock * 42) * 0.24;
      const sy = (boostHot ? 1.48 : 0.5) * flicker;
      const sx = boostHot ? 1.18 : 0.76;
      for (const f of this.gloveFlameParts) f.scale.set(sx, sy, sx);
    }
    for (const part of this.glovePulseParts) {
      const s = 1 + Math.sin(this.fxClock * 6.5) * 0.12;
      part.scale.setScalar(s);
    }

    // Smoothly deploy / fold 3D Sky Glider holographic back wings!
    const showWings = this.activeGloveId === 'glider' && isGliding;
    this.wingSpread = THREE.MathUtils.damp(this.wingSpread, showWings ? 1 : 0, 14, dt);
    this.gliderWings.group.visible = this.wingSpread > 0.03;
    if (this.gliderWings.group.visible) {
      const flap = Math.sin(this.fxClock * 8) * 0.09;
      this.gliderWings.group.scale.setScalar(this.wingSpread);
      this.gliderWings.leftWing.rotation.z = flap;
      this.gliderWings.rightWing.rotation.z = -flap;
    }

    // Floating King Bloxy Crown + Royal Cape physics
    if (this.floatingCrown) {
      this.floatingCrown.position.y = 1.02 + Math.sin(this.fxClock * 3.5) * 0.12;
      this.floatingCrown.rotation.y = this.fxClock * 1.4;
    }
    if (this.capePivot) {
      const targetCape = -0.18 - ratio * 0.58 + (isGrounded ? Math.sin(this.fxClock * 10) * 0.06 * ratio : -0.3);
      this.capePivot.rotation.x = THREE.MathUtils.damp(this.capePivot.rotation.x, targetCape, 14, dt);
    }

    // ── Active Emote overrides pose smoothly with crisp rhythm & live props! ──
    if (this.emoteId) {
      this.emoteClock += dt;
      if (!this.emoteLoop && this.emoteClock >= this.emoteDuration) {
        this.stopEmote();
      } else {
        const f = this.computeEmoteFrame(this.emoteId, this.emoteClock);
        const speed = 26;
        for (const key of Object.keys(this.cur) as PoseKey[]) {
          this.cur[key] = THREE.MathUtils.damp(this.cur[key], f.pose[key], speed, dt);
        }
        this.curHipRotX = THREE.MathUtils.damp(this.curHipRotX, f.hipRotX, 20, dt);
        this.curHipRotY = f.hipRotY;
        this.curHipRotZ = THREE.MathUtils.damp(this.curHipRotZ, f.hipRotZ, 20, dt);
        const smoothY = THREE.MathUtils.damp(this.hipGroup.position.y, f.hipY, 24, dt);
        this.applyPose(this.cur, smoothY, this.curHipRotX, this.curHipRotY, this.curHipRotZ, f.prop, this.emoteClock);
        return false;
      }
    }

    // Hide emote props whenever moving normally
    this.discoRing.visible = false;
    this.tposeRing.visible = false;
    this.seatProp.visible = false;
    this.curHipRotX = THREE.MathUtils.damp(this.curHipRotX, 0, 24, dt);
    this.curHipRotY = 0;
    this.curHipRotZ = THREE.MathUtils.damp(this.curHipRotZ, 0, 24, dt);

    const t: Pose = { ...REST };

    if (isGliding) {
      // Heroic soaring glider pose (horizontal flight lean, arms tucked slightly wide!)
      t.torsoPitch = 0.72;
      t.torsoRoll = THREE.MathUtils.clamp(-turnRate * 0.16, -0.45, 0.45);
      t.headPitch = -0.48;
      t.lArmPitch = 0.38;
      t.rArmPitch = 0.38;
      t.lArmRoll = 0.85;
      t.rArmRoll = -0.85;
      t.lLegPitch = 0.32 + Math.sin(this.fxClock * 6) * 0.08;
      t.rLegPitch = 0.18 - Math.sin(this.fxClock * 6) * 0.08;
    } else if (isSliding) {
      // Iconic low, sleek Roblox slide!
      t.hip = -1.18;
      t.torsoPitch = -0.62;
      t.torsoYaw = 0.24;
      t.headPitch = 0.46;
      t.lArmPitch = -0.85;
      t.rArmPitch = 0.72;
      t.lArmRoll = 0.55;
      t.rArmRoll = -0.55;
      t.lLegPitch = -1.28;
      t.rLegPitch = 0.52;
    } else if (mantling) {
      // Snappy ledge mantle: grab high with both hands, then push down & tuck knees cleanly over the lip!
      const push = THREE.MathUtils.smoothstep(vaultProgress, 0.1, 0.82);
      t.torsoPitch = 0.38 * (1 - push);
      t.headPitch = -t.torsoPitch * 0.75;
      t.lArmPitch = THREE.MathUtils.lerp(-1.55, 0.32, push);
      t.rArmPitch = THREE.MathUtils.lerp(-1.32, 0.48, push);
      t.lArmRoll = 0.16;
      t.rArmRoll = -0.16;
      t.lLegPitch = -0.95 * (1 - push * 0.48);
      t.rLegPitch = 0.48 * (1 - push * 0.42);
    } else if (isDashing) {
      // Punchy forward hero surge pose showing off the glowing gauntlets!
      t.torsoPitch = 0.56;
      t.headPitch = -0.35;
      t.lArmPitch = -1.75;
      t.rArmPitch = 0.92;
      t.lArmRoll = 0.18;
      t.rArmRoll = -0.32;
      t.lLegPitch = -0.65;
      t.rLegPitch = 0.72;
    } else if (!isGrounded) {
      // Classic UTG lively jump arc
      const up = THREE.MathUtils.clamp(verticalVelocity / 32 + 0.5, 0, 1);
      t.torsoPitch = THREE.MathUtils.lerp(-0.1, 0.24, up);
      t.torsoRoll = THREE.MathUtils.clamp(-turnRate * 0.12 - strafeAmount * 0.12, -0.32, 0.32);
      const lArm = THREE.MathUtils.lerp(-0.32, -1.95, up);
      t.lArmPitch = lArm;
      t.rArmPitch = lArm + 0.14;
      t.lArmRoll = THREE.MathUtils.lerp(0.35, 0.14, up);
      t.rArmRoll = -t.lArmRoll;
      t.lLegPitch = THREE.MathUtils.lerp(-0.14, -0.7, up);
      t.rLegPitch = THREE.MathUtils.lerp(0.14, 0.38, up);
      t.lLegRoll = 0.05;
      t.rLegRoll = -0.05;
      t.headPitch = -t.torsoPitch * 0.55;
    } else if (ratio > 0.05) {
      // Crisp lively grounded run
      const cadence = 12.5 + ratio * 5.8;
      const dirSign = forwardAmount < -0.1 ? -1 : 1;
      this.runPhase += dt * cadence * dirSign;
      const half = Math.floor(Math.abs(this.runPhase) / Math.PI);
      if (half !== this.lastStepHalfCycle) {
        this.lastStepHalfCycle = half;
        triggered = true;
      }
      const swing = Math.sin(this.runPhase);
      const bounce = Math.abs(Math.cos(this.runPhase));
      const amp = 0.9 + 0.22 * Math.min(ratio, 1.25);
      const rClamped = Math.min(1, ratio);
      t.lLegPitch = swing * amp * rClamped;
      t.rLegPitch = -swing * amp * rClamped;
      t.lArmPitch = -swing * amp * 1.05 - 0.15 * ratio - bounce * 0.08;
      t.rArmPitch = swing * amp * 1.05 - 0.15 * ratio - bounce * 0.08;
      t.lArmRoll = 0.14 + swing * 0.06;
      t.rArmRoll = -0.14 - swing * 0.06;
      t.torsoPitch = THREE.MathUtils.clamp(0.24 * ratio, 0, 0.32) * dirSign + bounce * 0.02;
      t.torsoRoll = THREE.MathUtils.clamp(-turnRate * 0.03 - strafeAmount * 0.12, -0.2, 0.2);
      t.torsoYaw = swing * 0.12 * ratio * dirSign - strafeAmount * 0.2 * dirSign;
      t.headYaw = -t.torsoYaw * 0.85;
      t.headPitch = -t.torsoPitch * 0.72 - bounce * 0.03;
      t.hip = bounce * 0.17 * Math.min(ratio, 1.25);
      t.lLegRoll = strafeAmount * 0.1;
      t.rLegRoll = strafeAmount * 0.1;
    } else {
      // Crisp bouncy idle breathing
      const breath = Math.sin(this.idlePhase);
      t.hip = breath * 0.035;
      t.torsoPitch = breath * 0.02;
      t.lArmPitch = Math.sin(this.idlePhase * 0.8) * 0.05;
      t.rArmPitch = -Math.sin(this.idlePhase * 0.8) * 0.05;
      t.lArmRoll = 0.1 + breath * 0.025;
      t.rArmRoll = -0.1 - breath * 0.025;
      t.headPitch = -breath * 0.02;
    }

    if (landingSquash > 0.001) {
      t.hip -= landingSquash * 0.45;
      t.torsoPitch += landingSquash * 0.22;
      t.lArmRoll += landingSquash * 0.3;
      t.rArmRoll -= landingSquash * 0.3;
      t.lLegPitch -= landingSquash * 0.3;
      t.rLegPitch -= landingSquash * 0.3;
    }

    for (const key of Object.keys(this.cur) as PoseKey[]) {
      this.cur[key] = THREE.MathUtils.damp(this.cur[key], t[key], key === 'hip' ? 34 : 30, dt);
    }
    const c = this.cur;

    const legClearance = 2 * Math.max(Math.cos(c.lLegPitch), Math.cos(c.rLegPitch));
    const finalY = Math.max(2 + c.hip, legClearance) + 0.02;
    this.hipGroup.position.set(c.hipX, finalY, 0);
    this.hipGroup.rotation.set(this.curHipRotX, 0, this.curHipRotZ);
    this.torsoPivot.rotation.set(c.torsoPitch, c.torsoYaw, c.torsoRoll);
    this.neckPivot.rotation.set(c.headPitch, c.headYaw, c.headRoll);
    this.leftShoulder.rotation.set(c.lArmPitch, c.lArmYaw, c.lArmRoll);
    this.rightShoulder.rotation.set(c.rArmPitch, c.rArmYaw, c.rArmRoll);
    this.leftHip.rotation.set(c.lLegPitch, 0, c.lLegRoll);
    this.rightHip.rotation.set(c.rLegPitch, 0, c.rLegRoll);
    return triggered;
  }
}
