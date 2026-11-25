// @ts-nocheck -- imported game code written for looser TS settings
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createMaterialTexture, type MaterialName } from '../utils/mapTextures';
import { R6Character } from './R6Character';
import { PlayerController, MOVEMENT, type Ramp } from './PlayerController';
import {
  LEVEL_BOXES,
  LEVEL_RAMPS,
  TREE_LOCATIONS,
  COIN_LOCATIONS,
  VALLEY_BOUNDS,
  levelToAABBs,
} from './level';
import { ValleyBot } from './TagController';
import { CrowdRenderer } from './CrowdRenderer';
import { game, MAPS, type MapId, type Role } from './gameStore';
import { getEmote, getGlove, type GloveId, type OutfitId } from './shopData';
import { RibbonTrail3D, CosmeticFxManager } from './cosmeticFx3D';
import { movementStore } from '../utils/movementStore';
import { soundFX, MEME_CAPTIONS } from '../utils/sound';

interface Props {
  shiftLocked: boolean;
  onSetShiftLocked: (locked: boolean) => void;
}

interface Theme {
  zenith: [number, number, number];
  horizon: [number, number, number];
  sunDir: [number, number, number];
  sunOffset: [number, number, number];
  fog: number;
  hemiSky: number;
  hemiGround: number;
  sun: number;
  sunIntensity: number;
  ground: number;
  groundTexture: 'grass' | 'ice';
  exposure: number;
  ice: boolean;
}

const THEMES: Record<MapId, Theme> = {
  valley: {
    zenith: [0.4, 0.65, 0.93], horizon: [0.84, 0.91, 0.96], sunDir: [0.45, 0.6, 0.35], sunOffset: [110, 195, 80],
    fog: 0xcfe4f2, hemiSky: 0xdff0ff, hemiGround: 0x6b7a5a, sun: 0xfff4dc, sunIntensity: 1.72,
    ground: 0x7fb04a, groundTexture: 'grass', exposure: 1.05, ice: false,
  },
  ice: {
    zenith: [0.48, 0.78, 0.98], horizon: [0.9, 0.97, 1.0], sunDir: [0.4, 0.55, 0.4], sunOffset: [100, 185, 85],
    fog: 0xdcf3ff, hemiSky: 0xe6f7ff, hemiGround: 0x8fb7c9, sun: 0xf2fbff, sunIntensity: 1.58,
    ground: 0xc5ecf8, groundTexture: 'ice', exposure: 1.1, ice: true,
  },
  sunset: {
    zenith: [0.28, 0.32, 0.64], horizon: [1.0, 0.58, 0.32], sunDir: [0.75, 0.18, 0.3], sunOffset: [220, 95, 100],
    fog: 0xf0b184, hemiSky: 0xffd2a8, hemiGround: 0x6a4a3a, sun: 0xffa860, sunIntensity: 1.55,
    ground: 0x9aa84a, groundTexture: 'grass', exposure: 1.02, ice: false,
  },
};

function angleDifference(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    const renderable = object as THREE.Mesh;
    if (renderable.geometry) geometries.add(renderable.geometry);
    if (renderable.material) {
      for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value);
        }
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

function rampHeight(r: Ramp, x: number, z: number): number {
  const t = r.axis === 'z' ? (z - r.minZ) / (r.maxZ - r.minZ) : (x - r.minX) / (r.maxX - r.minX);
  return r.y0 + (r.y1 - r.y0) * THREE.MathUtils.clamp(t, 0, 1);
}

function buildRampMesh(r: Ramp, material: THREE.Material): THREE.Mesh {
  const sx = r.maxX - r.minX;
  const sz = r.maxZ - r.minZ;
  const height = Math.max(r.y0, r.y1, 0.01);
  const geometry = new THREE.BoxGeometry(sx, height, sz);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const cx = (r.minX + r.maxX) / 2;
  const cz = (r.minZ + r.maxZ) / 2;
  for (let i = 0; i < position.count; i++) {
    if (position.getY(i) > 0) {
      position.setY(i, rampHeight(r, position.getX(i) + cx, position.getZ(i) + cz) - height / 2);
    }
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(cx, height / 2, cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildTree(x: number, z: number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f9a3a, roughness: 0.8 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * scale, 1.45 * scale, 8 * scale, 8), trunkMat);
  trunk.position.y = 4 * scale;
  trunk.castShadow = true;
  g.add(trunk);
  const blobs: [number, number, number, number][] = [
    [0, 9, 0, 4.2], [2.6, 8, 1, 3], [-2.4, 8.4, -1.2, 2.8], [0.5, 11.6, 0.6, 2.8],
  ];
  for (const [bx, by, bz, r] of blobs) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 12, 10), leafMat);
    leaf.position.set(bx * scale, by * scale, bz * scale);
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  return g;
}

export function RobloxSandboxCanvas(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const [error, setError] = useState(false);
  latest.current = props;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setError(true);
      return;
    }

    // ───── Scene, sky, lighting (scaled for Mega Valley!) ─────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa9d3f2);
    scene.fog = new THREE.FogExp2(0xcfe4f2, 0.00046);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setSize(container.clientWidth, container.clientHeight);
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Huss Valley tag arena');
    canvas.setAttribute('aria-describedby', 'game-instructions');
    container.appendChild(canvas);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const camera = new THREE.PerspectiveCamera(86, container.clientWidth / container.clientHeight, 0.15, 3800);
    const skyUniforms = {
      sunDir: { value: new THREE.Vector3(0.45, 0.6, 0.35).normalize() },
      zenith: { value: new THREE.Vector3(0.4, 0.65, 0.93) },
      horizon: { value: new THREE.Vector3(0.84, 0.91, 0.96) },
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(3200, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        vertexShader: `varying vec3 vDir; void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
        fragmentShader: `uniform vec3 sunDir; uniform vec3 zenith; uniform vec3 horizon; varying vec3 vDir;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
            return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
          void main() {
            vec3 d = normalize(vDir);
            float h = pow(max(d.y, 0.0), 0.5);
            vec3 col = mix(horizon, zenith, h);
            if (d.y > 0.02) {
              vec2 uv = d.xz / (d.y + 0.15) * 1.4;
              float n = noise(uv) * 0.6 + noise(uv * 2.3) * 0.3 + noise(uv * 5.1) * 0.1;
              float c = smoothstep(0.58, 0.78, n) * smoothstep(0.02, 0.2, d.y);
              col = mix(col, mix(vec3(1.0), horizon, 0.35), c * 0.85);
            }
            float s = pow(max(dot(d, sunDir), 0.0), 220.0);
            col += vec3(1.0, 0.97, 0.9) * s * 0.5;
            float halo = pow(max(dot(d, sunDir), 0.0), 12.0);
            col += vec3(1.0, 0.98, 0.95) * halo * 0.1;
            gl_FragColor = vec4(col, 1.0);
          }`,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    scene.add(sky);
    const hemi = new THREE.HemisphereLight(0xdff0ff, 0x6b7a5a, 0.94);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4dc, 1.72);
    sun.position.set(110, 195, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -140;
    sun.shadow.camera.right = sun.shadow.camera.top = 140;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 520;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);

    // ───── Ground (massive 6400x6400 valley floor) ─────
    const grassTex = createMaterialTexture('grass', maxAniso);
    grassTex.repeat.set(400, 400);
    const iceTex = createMaterialTexture('ice', maxAniso);
    iceTex.repeat.set(400, 400);
    const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, color: 0x7fb04a, roughness: 0.95 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6400, 6400), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ───── Map parts ─────
    const aabbs = levelToAABBs();
    const obstacles: THREE.Mesh[] = [];
    const matCache = new Map<string, THREE.MeshStandardMaterial>();
    const matFor = (name: MaterialName | undefined, color: number, isTop: boolean) => {
      const key = `${name ?? 'plastic'}-${color}-${isTop ? 't' : 's'}`;
      let m = matCache.get(key);
      if (!m) {
        if (name) {
          m = new THREE.MeshStandardMaterial({
            map: createMaterialTexture(name, maxAniso),
            color,
            roughness: name === 'ice' ? 0.2 : 0.85,
            metalness: name === 'metal' ? 0.22 : 0,
          });
        } else {
          m = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
        }
        matCache.set(key, m);
      }
      return m;
    };

    for (const box of LEVEL_BOXES) {
      const side = matFor(box.material, box.color, false);
      const top = box.top !== undefined ? matFor(box.material, box.top, true) : side;
      const geo = new THREE.BoxGeometry(box.sx, box.sy, box.sz);
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      const dims: [number, number][] = [
        [box.sz, box.sy], [box.sz, box.sy],
        [box.sx, box.sz], [box.sx, box.sz],
        [box.sx, box.sy], [box.sx, box.sy],
      ];
      for (let face = 0; face < 6; face++) {
        const [u, v] = dims[face];
        for (let i = 0; i < 4; i++) {
          const idx = face * 4 + i;
          uv.setXY(idx, (uv.getX(idx) * u) / 8, (uv.getY(idx) * v) / 8);
        }
      }
      uv.needsUpdate = true;
      const mesh = new THREE.Mesh(geo, [side, side, top, side, side, side]);
      mesh.position.set(box.x, box.y, box.z);
      mesh.castShadow = !box.noShadow;
      mesh.receiveShadow = true;
      if (!box.noShadow) obstacles.push(mesh);
      scene.add(mesh);
    }
    for (const ramp of LEVEL_RAMPS) {
      const mesh = buildRampMesh(ramp, matFor(ramp.material ?? 'grass', ramp.color ?? 0x7fb04a, false));
      obstacles.push(mesh);
      scene.add(mesh);
    }
    for (const [tx, tz, scale] of TREE_LOCATIONS) scene.add(buildTree(tx, tz, scale));

    // Towering glowing START & FINISH beacons visible from 1,000+ studs away
    const startBeacon = new THREE.Mesh(
      new THREE.BoxGeometry(108, 0.6, 5),
      new THREE.MeshBasicMaterial({ color: 0x45e862, transparent: true, opacity: 0.82 }),
    );
    startBeacon.position.set(0, 0.8, VALLEY_BOUNDS.START_LINE_Z);
    scene.add(startBeacon);
    const startPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5, 5.5, 190, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x45e862, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
    );
    startPillar.position.set(0, 95, VALLEY_BOUNDS.START_LINE_Z);
    scene.add(startPillar);

    const finishBeacon = new THREE.Mesh(
      new THREE.BoxGeometry(114, 0.6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.86 }),
    );
    finishBeacon.position.set(0, 0.8, VALLEY_BOUNDS.FINISH_LINE_Z);
    scene.add(finishBeacon);
    const finishPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6, 200, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.19, side: THREE.DoubleSide, depthWrite: false }),
    );
    finishPillar.position.set(0, 100, VALLEY_BOUNDS.FINISH_LINE_Z);
    scene.add(finishPillar);

    // ───── Spinning Golden UTG Map Coins (InstancedMesh) ─────
    const coinGeo = new THREE.CylinderGeometry(1.65, 1.65, 0.48, 20);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd633,
      emissive: 0xd98a00,
      emissiveIntensity: 0.38,
      metalness: 0.5,
      roughness: 0.22,
    });
    const coinInstanced = new THREE.InstancedMesh(coinGeo, coinMat, COIN_LOCATIONS.length);
    coinInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(coinInstanced);
    const coinCollected = new Array<boolean>(COIN_LOCATIONS.length).fill(false);
    const coinDummy = new THREE.Object3D();
    const resetCoins = () => {
      coinCollected.fill(false);
    };

    scene.updateMatrixWorld(true);

    // ───── Player & AI roster ─────
    const character = new R6Character(true);
    character.headMesh.scale.setScalar(1.3);
    scene.add(character.root);
    const player = new PlayerController(aabbs, LEVEL_RAMPS);

    // ───── Ultra-fast Bot Pool (7 full R6 rigs in Classic; 99 GPU-instanced in MEGA 100 = 7 draw calls total!) ─────
    const CLASSIC_LANES = [-180, -135, -72, 0, 72, 135, 180];
    const allBots: ValleyBot[] = [];
    let bots: ValleyBot[] = [];
    let isMegaMode = false;
    const botById = new Map<string, ValleyBot>();
    const crowd = new CrowdRenderer(scene, 108);
    let syncedRosterSize = -1;

    // Reusable zero-GC buffers for AI targeting, spatial-grid infection, and the <canvas> progress strip.
    const openRunners: ValleyBot[] = [];
    const grid = new Map<number, ValleyBot[]>();
    const stripZ = new Float32Array(108);
    /** Bit flags per player: 1 = tagger, 2 = finished, 4 = isPlayer */
    const stripFlags = new Uint8Array(108);
    const stripHandle = { count: 0, z: stripZ, flags: stripFlags };
    (window as unknown as { __hussStrip?: typeof stripHandle }).__hussStrip = stripHandle;
    const scratchStart = new THREE.Vector3();
    const scratchMid = new THREE.Vector3();
    const scratchProj = new THREE.Vector3();
    const scratchOrigin = new THREE.Vector3();
    const scratchDir = new THREE.Vector3();
    const cellKey = (x: number, z: number) => (((x + 512) >> 4) << 10) | ((z + 640) >> 4);

    const laneFor = (i: number, n: number) =>
      n <= CLASSIC_LANES.length ? CLASSIC_LANES[i % CLASSIC_LANES.length] : -285 + (570 * i) / Math.max(1, n - 1);

    const lobbySpot = (i: number, n: number): [number, number] => {
      if (n <= CLASSIC_LANES.length) {
        return [CLASSIC_LANES[i % CLASSIC_LANES.length], VALLEY_BOUNDS.START_SPAWN_Z - 6 + (i % 3) * 4];
      }
      const cols = 14;
      const col = i % cols;
      const row = Math.floor(i / cols);
      return [-273 + col * 42 + (row % 2) * 10, 437 + row * 12.5];
    };

    const syncRoster = () => {
      const roster = game.state.roster;
      const botCount = roster.length - 1;
      isMegaMode = botCount > CLASSIC_LANES.length;
      // Modest DPR cap in MEGA keeps GPU fill-rate butter-smooth at locked 60 FPS on retina laptops.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMegaMode ? 1.25 : 2));

      for (let i = 0; i < botCount; i++) {
        const p = roster[i + 1];
        let bot = allBots[i];
        if (!bot) {
          bot = new ValleyBot(p.id, p.name, aabbs, LEVEL_RAMPS, laneFor(i, botCount), i);
          allBots[i] = bot;
          botById.set(p.id, bot);
          // Only ever mount classic full-detail rigs into the scene graph (keeps draw calls tiny!)
          if (i < CLASSIC_LANES.length) scene.add(bot.root);
        }
        bot.setLane(laneFor(i, botCount));
        bot.chaserSpeed = isMegaMode ? 0.95 : 1.04;
        bot.infectDaze = isMegaMode ? 2.4 : 0;
        bot.body.iceAll = player.iceAll;
        if (isMegaMode) {
          // MEGA: draw ALL 99 bots via one ultra-fast 7-draw-call GPU instanced crowd (goofy face, horns, shadow, ice!)
          bot.renderFull = false;
          bot.root.visible = false;
        } else {
          bot.ensureRig();
          bot.renderFull = true;
          bot.root.visible = true;
        }
      }
      for (let i = botCount; i < allBots.length; i++) {
        allBots[i].renderFull = false;
        allBots[i].root.visible = false;
      }
      bots = allBots.slice(0, botCount);
      if (!isMegaMode) {
        crowd.begin(0);
        crowd.end();
      }
      syncedRosterSize = roster.length;
    };

    const placeLobby = () => {
      const n = bots.length;
      for (let i = 0; i < n; i++) {
        const [x, z] = lobbySpot(i, n);
        bots[i].place(x, z, 'runner');
      }
    };

    let appliedRole: Role | null = null;
    let appliedGlove: GloveId | null = null;
    let appliedOutfit: OutfitId | null = null;

    const syncLoadout = () => {
      const s = game.state;
      const eq = s.progress.equipped;
      if (appliedGlove !== eq.glove) {
        appliedGlove = eq.glove;
        player.setGlove(eq.glove);
        character.setGloves(eq.glove, true);
      }
      if (appliedOutfit !== eq.outfit || appliedRole !== s.role) {
        appliedOutfit = eq.outfit;
        appliedRole = s.role;
        character.setOutfit(eq.outfit, s.role === 'tagger');
      }
    };
    syncLoadout();

    const applyTheme = (id: MapId) => {
      const t = THEMES[id];
      skyUniforms.zenith.value.set(...t.zenith);
      skyUniforms.horizon.value.set(...t.horizon);
      skyUniforms.sunDir.value.set(...t.sunDir).normalize();
      (scene.fog as THREE.FogExp2).color.set(t.fog);
      hemi.color.set(t.hemiSky);
      hemi.groundColor.set(t.hemiGround);
      sun.color.set(t.sun);
      sun.intensity = t.sunIntensity;
      groundMat.color.set(t.ground);
      groundMat.map = t.groundTexture === 'ice' ? iceTex : grassTex;
      groundMat.roughness = t.ice ? 0.25 : 0.95;
      groundMat.needsUpdate = true;
      renderer.toneMappingExposure = t.exposure;
      player.iceAll = t.ice;
      for (const b of allBots) b.body.iceAll = t.ice;
      sunOffset = t.sunOffset;
    };
    let sunOffset: [number, number, number] = THEMES.valley.sunOffset;

    const placeEveryone = () => {
      for (const p of game.state.roster) {
        const chaser = p.role === 'tagger';
        if (p.isPlayer) {
          if (chaser) player.reset(0, 0.4, VALLEY_BOUNDS.CHASER_SPAWN_Z);
          else player.reset(0, 0.4, VALLEY_BOUNDS.START_SPAWN_Z);
          continue;
        }
        const bot = botById.get(p.id);
        if (!bot) continue;
        const idx = bots.indexOf(bot);
        const mega = bots.length > CLASSIC_LANES.length;
        if (chaser) {
          const spreadX = mega ? 440 : 90;
          const spreadZ = mega ? 90 : 20;
          bot.place((Math.random() - 0.5) * spreadX, VALLEY_BOUNDS.CHASER_SPAWN_Z + (Math.random() - 0.5) * spreadZ, 'chaser');
        } else {
          const [x, z] = lobbySpot(idx, bots.length);
          bot.place(x, mega ? z : z + Math.random() * 4, 'runner');
        }
      }
    };

    syncRoster();
    placeLobby();
    player.reset(0, 0.4, VALLEY_BOUNDS.START_SPAWN_Z);

    // ───── 3D Ribbon Trail, Wrist Gauntlet Contrails & Tag FX Manager ─────
    const fxManager = new CosmeticFxManager(scene);
    const bodyRibbon = new RibbonTrail3D(38);
    scene.add(bodyRibbon.mesh);

    // Subtle energy contrails from both hands when dashing / high-speed sprinting with special gloves!
    const leftHandRibbon = new RibbonTrail3D(16);
    const rightHandRibbon = new RibbonTrail3D(16);
    scene.add(leftHandRibbon.mesh, rightHandRibbon.mesh);
    const handWorldL = new THREE.Vector3();
    const handWorldR = new THREE.Vector3();

    const spawnConfetti = (x: number, y: number, z: number, count: number, _customColors?: number[]) => {
      const intensity = count > 60 ? 1.45 : count > 18 ? 1.0 : 0.65;
      fxManager.spawnFxBurst(game.state.progress.equipped.fx, x, y, z, intensity);
    };

    let trailAccum = 0;

    // Air Blast 3D Shockwave Ring
    const blastRing = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.8, 36),
      new THREE.MeshBasicMaterial({
        color: 0xff9e2c,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    blastRing.rotation.x = -Math.PI / 2;
    blastRing.visible = false;
    scene.add(blastRing);
    let blastRingTimer = 0;

    // Mag-Grapple 3D Energy Tether Beam
    const grappleGeo = new THREE.CylinderGeometry(0.16, 0.22, 1, 8);
    grappleGeo.rotateX(Math.PI / 2);
    const grappleBeam = new THREE.Mesh(
      grappleGeo,
      new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.9 }),
    );
    grappleBeam.visible = false;
    scene.add(grappleBeam);
    const grappleAnchor = new THREE.Vector3();
    let grappleTimer = 0;

    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0x7fd7ff, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    scene.add(shield);
    const tagRing = new THREE.Mesh(
      new THREE.RingGeometry(3.8, 4.2, 32),
      new THREE.MeshBasicMaterial({ color: 0xff5a4e, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
    );
    tagRing.rotation.x = -Math.PI / 2;
    scene.add(tagRing);

    // ───── Input + camera state ─────
    const keys = new Set<string>();
    const ray = new THREE.Raycaster();
    const grappleRay = new THREE.Raycaster();
    const pivot = new THREE.Vector3();
    const desiredCamera = new THREE.Vector3();
    const rayDirection = new THREE.Vector3();
    const cameraLook = new THREE.Vector3();
    let yaw = 0;
    let pitch = -0.2;
    let distance = 13.5;
    let cameraHeight = 3.75;
    let shoulder = 0;
    let charYaw = Math.PI;
    let landingCompression = 0;
    let fovKick = 0;
    let tilt = 0;
    let dragging = false;
    let wasPointerLocked = false;
    let discardLockDelta = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastTime = performance.now();
    let frame = 0;
    let prevPhase = game.state.phase;
    let lastCountdown = -1;
    let tauntTimer = 4;
    let prevHeading = Math.PI;
    let sharpTurnAccum = 0;
    let sharpTurnTimer = 0;
    let freezeBots = false;

    const syncPointerLock = () => {
      const locked = document.pointerLockElement === canvas;
      if (locked !== wasPointerLocked) {
        wasPointerLocked = locked;
        discardLockDelta = locked;
      }
      return locked;
    };
    const requestLock = () => {
      if (document.pointerLockElement === canvas || game.state.shopOpen) return;
      try {
        canvas.requestPointerLock()?.catch(() => {});
      } catch {
        // Drag-to-look fallback
      }
    };
    const clearInput = () => {
      keys.clear();
      player.clearInput();
      dragging = false;
    };

    const headingFor = (cameraYaw: number) => Math.atan2(-Math.sin(cameraYaw), -Math.cos(cameraYaw));

    const getWish = () => {
      const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      const sideways = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);
      return { forward, sideways, fx, fz, rx, rz, wx: fx * forward + rx * sideways, wz: fz * forward + rz * sideways };
    };

    const stopActiveEmote = () => {
      if (!character.emoting) return;
      character.stopEmote();
      soundFX.stopEmoteMusic();
      game.clearEmoteToast();
    };

    const knockChasers = (radius: number, pushSpd: number, liftVy: number, mode: 'stumble' | 'freeze') => {
      if (game.state.phase !== 'playing' || game.state.role !== 'runner') return;
      for (const bot of bots) {
        if (bot.role !== 'chaser') continue;
        const bdx = bot.body.x - player.x;
        const bdz = bot.body.z - player.z;
        const d = Math.hypot(bdx, bot.body.y - player.y, bdz);
        if (d > radius) continue;
        if (mode === 'freeze') {
          bot.triggerFreeze(2.4);
          fxManager.spawnShockRing(bot.body.x, bot.body.y + 0.6, bot.body.z, 0x7dd3fc, 2.5, 0.45);
        } else {
          const nl = Math.hypot(bdx, bdz) || 1;
          bot.body.vx = (bdx / nl) * pushSpd;
          bot.body.vz = (bdz / nl) * pushSpd;
          if (liftVy > 0) {
            bot.body.vy = liftVy;
            bot.body.grounded = false;
          }
          bot.triggerStumble(1.3);
        }
        const clip = soundFX.playAnkleBreaker();
        game.recordAnkleBreak(bot.name, mode === 'freeze' ? 'FROZEN SOLID!' : MEME_CAPTIONS[clip]);
        fxManager.spawnFxBurst(game.state.progress.equipped.fx, bot.body.x, bot.body.y + 1.5, bot.body.z, 0.85);
      }
    };

    /** Unified Glove Ability [E / X / ShiftLock-RMB]: activates whichever of the 10 gloves you equipped! */
    const triggerGloveAbility = () => {
      if (game.state.phase === 'intro' || game.state.shopOpen) return;
      const w = getWish();
      const dx = w.wx !== 0 || w.wz !== 0 ? w.wx : w.fx;
      const dz = w.wx !== 0 || w.wz !== 0 ? w.wz : w.fz;

      let grappleHit: { x: number; y: number; z: number } | null = null;
      if (player.glove === 'grapple') {
        scratchDir.set(w.fx * Math.cos(pitch), Math.sin(pitch), w.fz * Math.cos(pitch)).normalize();
        scratchOrigin.set(player.x, player.y + 3.6, player.z);
        grappleRay.set(scratchOrigin, scratchDir);
        grappleRay.far = 190;
        const hits = grappleRay.intersectObjects(obstacles, false);
        if (hits.length > 0) {
          grappleHit = { x: hits[0].point.x, y: hits[0].point.y, z: hits[0].point.z };
        }
      }

      const fired = player.triggerGloveAbility(dx, dz, grappleHit);
      if (!fired) return;
      stopActiveEmote();

      switch (fired) {
        case 'GLOVE_SHOVE':
          soundFX.playDash();
          fovKick = Math.min(10, fovKick + 5);
          fxManager.spawnShockRing(player.x, player.y + 1.6, player.z, 0xffffff, 2.8, 0.34);
          knockChasers(15, 58, 12, 'stumble');
          break;
        case 'GLOVE_SPEED':
          soundFX.playSpeedCoil();
          fovKick = Math.min(13, fovKick + 8);
          fxManager.spawnShockRing(player.x, player.y + 0.8, player.z, 0xff4757, 4.2, 0.42);
          fxManager.spawnShockRing(player.x, player.y + 2.2, player.z, 0xff9f43, 3.0, 0.34, 4);
          break;
        case 'GLOVE_GRAVITY':
          soundFX.playGravityCoil();
          fovKick = Math.min(12, fovKick + 7);
          fxManager.spawnShockRing(player.x, player.y + 0.4, player.z, 0x38bdf8, 4.4, 0.5, 2);
          fxManager.spawnShockRing(player.x, player.y + 1.6, player.z, 0xbae6fd, 3.0, 0.44, 8);
          break;
        case 'GLOVE_BOOST':
          soundFX.playPowerDash();
          fovKick = Math.min(13, fovKick + 9);
          fxManager.spawnShockRing(player.x, player.y + 1.6, player.z, 0x4ade80, 3.6, 0.38);
          fxManager.spawnFxBurst(game.state.progress.equipped.fx, player.x, player.y + 1.2, player.z, 0.72);
          knockChasers(16, 56, 12, 'stumble');
          break;
        case 'GLOVE_BLINK': {
          soundFX.playBlink();
          fovKick = Math.min(14, fovKick + 11);
          const [fx0, fy0, fz0] = player.lastBlinkFrom;
          const [tx0, ty0, tz0] = player.lastBlinkTo;
          fxManager.spawnBlinkPortal(fx0, fy0, fz0, charYaw);
          fxManager.spawnBlinkPortal(tx0, ty0, tz0, charYaw);
          knockChasers(18, 48, 10, 'stumble');
          break;
        }
        case 'GLOVE_FROST':
          soundFX.playFrost();
          fovKick = Math.min(12, fovKick + 7);
          fxManager.spawnShockRing(player.x, player.y + 0.5, player.z, 0x7dd3fc, 8.0, 0.52);
          fxManager.spawnFxBurst('frost', player.x, player.y + 0.8, player.z, 1.0);
          knockChasers(34, 0, 0, 'freeze');
          break;
        case 'GLOVE_POWER':
          soundFX.playAirBlast();
          fovKick = Math.min(14, fovKick + 11);
          blastRing.position.set(player.x, player.y + 0.9, player.z);
          blastRing.scale.setScalar(1);
          (blastRing.material as THREE.MeshBasicMaterial).color.setHex(0xff941a);
          blastRing.visible = true;
          blastRingTimer = 0.42;
          fxManager.spawnShockRing(player.x, player.y + 1.1, player.z, 0xfacc15, 7.6, 0.48);
          fxManager.spawnFxBurst(game.state.progress.equipped.fx, player.x, player.y + 1.2, player.z, 1.0);
          knockChasers(32, 76, 30, 'stumble');
          break;
        case 'GLOVE_GRAPPLE': {
          const anchor = grappleHit
            ? new THREE.Vector3(grappleHit.x, grappleHit.y, grappleHit.z)
            : new THREE.Vector3(player.x + w.fx * 92, player.y + 26, player.z + w.fz * 92);
          grappleAnchor.copy(anchor);
          grappleTimer = 0.42;
          grappleBeam.visible = true;
          soundFX.playGrapple();
          fovKick = Math.min(13, fovKick + 10);
          fxManager.spawnShockRing(anchor.x, anchor.y, anchor.z, 0xf0abfc, 3.2, 0.38);
          break;
        }
        case 'GLOVE_GLIDE':
          soundFX.playGlide();
          fovKick = Math.min(13, fovKick + 8);
          fxManager.spawnShockRing(player.x, player.y + 0.6, player.z, 0xfde047, 5.2, 0.52, 6);
          fxManager.spawnShockRing(player.x, player.y + 2.2, player.z, 0x7cf2ff, 4.0, 0.48, 12);
          break;
        case 'GLOVE_FUSION':
          soundFX.playFusion();
          fovKick = Math.min(15, fovKick + 12);
          blastRing.position.set(player.x, player.y + 1.0, player.z);
          blastRing.scale.setScalar(1);
          (blastRing.material as THREE.MeshBasicMaterial).color.setHex(0x8cf7ff);
          blastRing.visible = true;
          blastRingTimer = 0.44;
          fxManager.spawnShockRing(player.x, player.y + 1.0, player.z, 0xffd23a, 7.2, 0.5);
          fxManager.spawnFxBurst(game.state.progress.equipped.fx, player.x, player.y + 1.4, player.z, 1.15);
          knockChasers(30, 72, 26, 'stumble');
          break;
      }
    };

    const down = (event: KeyboardEvent) => {
      soundFX.unlock();
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const code = event.code;

      if (code === 'KeyB' || code === 'KeyI' || code === 'KeyN') {
        if (event.repeat) return;
        const targetRoute = code === 'KeyI' ? 'inventory' : code === 'KeyN' ? 'sounds' : 'featured';
        const opened = game.toggleShop(targetRoute);
        soundFX.playVote();
        if (opened) {
          stopActiveEmote();
          clearInput();
          latest.current.onSetShiftLocked(false);
          if (document.pointerLockElement === canvas) document.exitPointerLock();
        }
        return;
      }
      if (code === 'Escape' && game.state.shopOpen) {
        game.setShopOpen(false);
        soundFX.playEquip();
        return;
      }
      if (game.state.shopOpen) return;

      if (/^(Space|Arrow|Shift)/.test(code)) event.preventDefault();
      if (event.repeat || keys.has(code)) return;
      keys.add(code);

      if (code === 'Space') {
        stopActiveEmote();
        player.queueJump();
      } else if (code === 'KeyC') {
        stopActiveEmote();
        player.queueSlide();
      } else if (code === 'KeyE' || code === 'KeyX') {
        triggerGloveAbility();
      } else if (code === 'KeyG') {
        const emoteId = game.state.progress.equipped.emote;
        if (emoteId && game.state.phase !== 'intro') {
          if (character.emoting) {
            stopActiveEmote();
          } else {
            const em = getEmote(emoteId);
            character.playEmote(emoteId);
            game.playEmote(em.name);
            soundFX.playEmote();
            soundFX.startEmoteMusic(emoteId);
            fxManager.spawnShockRing(player.x, player.y + 0.3, player.z, 0xffd23a, 2.4, 0.38);
          }
        }
      } else if (code === 'KeyM') {
        if (game.state.phase === 'intermission') {
          const next = game.state.mode === 'mega' ? 'classic' : 'mega';
          if (game.setMode(next)) soundFX.playVote();
        }
      } else if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
        if (game.state.phase === 'intermission') {
          game.vote(MAPS[Number(code.slice(5)) - 1].id);
          soundFX.playVote();
        }
      } else if (code === 'KeyR') {
        const chaser = game.state.role === 'tagger';
        stopActiveEmote();
        player.reset(0, 0.2, chaser ? VALLEY_BOUNDS.CHASER_SPAWN_Z : VALLEY_BOUNDS.START_SPAWN_Z);
        yaw = chaser ? Math.PI : 0;
        charYaw = headingFor(yaw);
        landingCompression = 0;
        fovKick = 0;
      } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
        const locked = document.pointerLockElement !== canvas;
        latest.current.onSetShiftLocked(locked);
        if (locked) requestLock();
        else document.exitPointerLock();
      }
    };
    const up = (event: KeyboardEvent) => {
      keys.delete(event.code);
      if (event.code === 'Space') player.releaseJump();
    };

    const tryInfectByClick = () => {
      const s = game.state;
      if (s.role !== 'tagger' || s.phase !== 'playing') return;
      for (const bot of bots) {
        if (bot.role !== 'runner' || bot.finished) continue;
        const safe = bot.body.z >= VALLEY_BOUNDS.START_LINE_Z + 1 || bot.body.z <= VALLEY_BOUNDS.FINISH_LINE_Z - 1;
        if (safe) continue;
        const d = Math.hypot(player.x - bot.body.x, player.y - bot.body.y, player.z - bot.body.z);
        if (d < 5.2 && game.infect(bot.id, 'you')) {
          bot.convertToChaser();
          soundFX.playTag(true);
          spawnConfetti(bot.body.x, bot.body.y + 2, bot.body.z, 24);
          break;
        }
      }
    };
    const mouseDown = (event: MouseEvent) => {
      soundFX.unlock();
      if (game.state.shopOpen || event.target !== canvas) return;
      canvas.focus({ preventScroll: true });
      if (event.button === 2 && latest.current.shiftLocked) {
        triggerGloveAbility();
        return;
      }
      dragging = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      if (latest.current.shiftLocked) requestLock();
      tryInfectByClick();
    };
    const mouseUp = () => { dragging = false; };
    const mouseMove = (event: MouseEvent) => {
      if (game.state.shopOpen) return;
      const locked = syncPointerLock();
      if (!locked && !dragging) return;
      if (locked && discardLockDelta) {
        if (event.movementX !== 0 || event.movementY !== 0) discardLockDelta = false;
        return;
      }
      const dx = locked ? event.movementX : event.clientX - lastMouseX;
      const dy = locked ? event.movementY : event.clientY - lastMouseY;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      yaw -= dx * 0.003;
      pitch = THREE.MathUtils.clamp(pitch - dy * 0.003, -1.35, 0.7);
    };
    const wheel = (event: WheelEvent) => {
      if (game.state.shopOpen) return;
      distance = THREE.MathUtils.clamp(distance + event.deltaY * 0.014, 5, 38);
    };
    const contextMenu = (event: MouseEvent) => event.preventDefault();
    const lockChange = () => {
      if (!syncPointerLock()) {
        latest.current.onSetShiftLocked(false);
        dragging = false;
      }
    };
    const visibility = () => {
      clearInput();
      lastTime = performance.now();
    };
    const resize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clearInput);
    window.addEventListener('mousedown', mouseDown);
    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('wheel', wheel, { passive: true });
    canvas.addEventListener('contextmenu', contextMenu);
    document.addEventListener('pointerlockchange', lockChange);
    document.addEventListener('visibilitychange', visibility);

    type TestEvent = { type: string; speed: number; vx: number; vy: number; y: number; chain: number; grounded: boolean };
    const testApi = import.meta.env.DEV && new URLSearchParams(location.search).has('test')
      ? {
          player,
          bots,
          camera,
          scene,
          game,
          events: [] as TestEvent[],
          freezeBots: false,
          setYaw: (v: number) => { yaw = v; },
        }
      : null;
    const testWindow = window as Window & { __sandboxTest?: NonNullable<typeof testApi> };
    if (testApi) testWindow.__sandboxTest = testApi;

    const onPhaseChange = (from: string, to: string) => {
      const s = game.state;
      stopActiveEmote();
      if (to === 'intro') {
        applyTheme(s.mapId);
        resetCoins();
        placeEveryone();
        yaw = s.role === 'tagger' ? Math.PI : 0;
        charYaw = headingFor(yaw);
        pitch = -0.2;
        lastCountdown = -1;
        soundFX.playRoundStart();
      } else if (to === 'playing') {
        soundFX.playTick(0);
        fovKick = Math.min(10, fovKick + 8);
        tauntTimer = 4;
      } else if (to === 'results' && s.result) {
        const good = ['escaped', 'survived', 'chasers-win'].includes(s.result.outcome);
        if (good) {
          soundFX.playSurvive();
          spawnConfetti(player.x, player.y + 2, player.z, 140);
        } else {
          soundFX.playMeme('dun-dun', 0.7, 1000);
        }
      } else if (to === 'intermission' && from !== 'intermission') {
        resetCoins();
        placeLobby();
        player.reset(0, 0.4, VALLEY_BOUNDS.START_SPAWN_Z);
        yaw = 0;
        charYaw = headingFor(yaw);
        applyTheme('valley');
      }
    };

    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const state = game.state;
      const phase = state.phase;
      const playing = phase === 'playing';
      const frozen = phase === 'intro' || state.shopOpen;
      const faceCamera = latest.current.shiftLocked && !state.shopOpen;
      freezeBots = testApi ? testApi.freezeBots : false;

      if (phase !== prevPhase) {
        onPhaseChange(prevPhase, phase);
        prevPhase = phase;
      }
      syncLoadout();

      if (phase === 'intro') {
        const n = Math.ceil(state.phaseTime);
        if (n !== lastCountdown && n <= 3 && n > 0) {
          lastCountdown = n;
          soundFX.playTick(n);
        }
      }

      const { forward, sideways, fx, fz, rx, rz, wx, wz } = getWish();
      if (frozen) player.clearInput();
      const events = player.step(dt, frozen ? 0 : wx, frozen ? 0 : wz, !frozen && (forward !== 0 || sideways !== 0));

      const inSafeZone =
        playing &&
        state.role === 'runner' &&
        (state.finished || player.z >= VALLEY_BOUNDS.START_LINE_Z + 1 || player.z <= VALLEY_BOUNDS.FINISH_LINE_Z - 1);

      let abilityTriggeredFrame = false;
      for (const event of events) {
        if (testApi) {
          testApi.events.push({
            type: event.type, speed: player.speed, vx: player.vx, vy: player.vy,
            y: player.y, chain: 0, grounded: player.grounded,
          });
          if (testApi.events.length > 100) testApi.events.shift();
        }
        switch (event.type) {
          case 'JUMP':
            soundFX.playJump(0);
            break;
          case 'DOUBLE_JUMP':
            soundFX.playDoubleJump();
            fovKick = Math.min(11, fovKick + 5);
            fxManager.spawnShockRing(player.x, player.y + 0.2, player.z, 0x86efac, 2.5, 0.34);
            break;
          case 'MANTLE':
            soundFX.playMantle();
            fovKick = Math.min(10, fovKick + 4);
            fxManager.spawnSlideDust(player.x, player.y + 1.2, player.z, 0xffffff);
            break;
          case 'SLIDE_START':
            soundFX.playSlide();
            fovKick = Math.min(10, fovKick + 3.5);
            fxManager.spawnSlideDust(player.x, player.y, player.z);
            break;
          case 'BOUNCE':
            soundFX.playBoing();
            fovKick = Math.min(11, fovKick + 6);
            fxManager.spawnShockRing(player.x, player.y + 0.4, player.z, 0xff6fd8, 3.6, 0.4);
            break;
          case 'LAND':
            landingCompression = Math.min(0.48, event.impact / 115);
            soundFX.playLand(Math.min(0.7, event.impact / 85));
            break;
          default:
            if (event.type.startsWith('GLOVE_')) abilityTriggeredFrame = true;
            break;
        }
      }
      landingCompression = THREE.MathUtils.damp(landingCompression, 0, 20, dt);

      // Slide dust puffs + floating musical emote sparkles!
      if (player.sliding && Math.random() < dt * 24) {
        fxManager.spawnSlideDust(player.x, player.y, player.z, player.glove === 'frost' ? 0xbae6fd : 0xf8fafc);
      }
      if (character.emoting && Math.random() < dt * 7) {
        fxManager.spawnEmoteSparkle(player.x, player.y + 0.4, player.z, [0xffd23a, 0x81f4ff, 0xff66c6, 0x73ff73]);
      }

      // ───── Update & Collect Map Coins ─────
      for (let i = 0; i < COIN_LOCATIONS.length; i++) {
        if (coinCollected[i]) {
          coinDummy.position.set(0, -100, 0);
          coinDummy.scale.setScalar(0);
          coinDummy.updateMatrix();
          coinInstanced.setMatrixAt(i, coinDummy.matrix);
          continue;
        }
        const [cx, cy, cz] = COIN_LOCATIONS[i];
        const bobY = cy + Math.sin(now * 0.0032 + i * 0.7) * 0.48;
        if (!frozen) {
          const dist = Math.hypot(player.x - cx, player.y + 2.5 - bobY, player.z - cz);
          if (dist < 4.5) {
            coinCollected[i] = true;
            game.collectMapCoin(15);
            soundFX.playCoin();
            spawnConfetti(cx, bobY, cz, 12, [0xffd23a, 0xfef08a, 0xffffff]);
            coinDummy.scale.setScalar(0);
            coinDummy.updateMatrix();
            coinInstanced.setMatrixAt(i, coinDummy.matrix);
            continue;
          }
        }
        coinDummy.position.set(cx, bobY, cz);
        coinDummy.rotation.set(0, now * 0.0028 + i * 0.5, 0);
        coinDummy.scale.setScalar(1);
        coinDummy.updateMatrix();
        coinInstanced.setMatrixAt(i, coinDummy.matrix);
      }
      coinInstanced.instanceMatrix.needsUpdate = true;

      // ───── Update 3D Ribbon Beam Trail & Gauntlet Hand Contrails ─────
      const equippedTrail = state.progress.equipped.trail;
      const nowSec = now * 0.001;
      bodyRibbon.update(
        equippedTrail,
        player.x,
        player.y + (player.sliding ? 1.1 : 2.35),
        player.z,
        charYaw,
        player.speed > 10 && !frozen,
        nowSec,
      );
      if (equippedTrail !== 'none' && player.speed > 26 && !frozen) {
        trailAccum += dt;
        if (trailAccum >= 0.045) {
          trailAccum = 0;
          fxManager.spawnTrailAccent(equippedTrail, player.x, player.y + 1.8, player.z);
        }
      }

      // Gauntlet hand contrails flare during dashes, jumps, and high speed!
      const gloveDef = getGlove(state.progress.equipped.glove);
      const handTrailActive =
        state.progress.equipped.glove !== 'tape' &&
        (player.dashing || player.gliding || player.overdriveActive || player.lowGravActive || player.speed > 78) &&
        !frozen;
      character.root.updateMatrixWorld(true);
      character.leftShoulder.localToWorld(handWorldL.set(0, -1.5, 0));
      character.rightShoulder.localToWorld(handWorldR.set(0, -1.5, 0));
      const handTrailKind =
        gloveDef.id === 'fusion' || gloveDef.id === 'glider'
          ? 'rainbow'
          : gloveDef.id === 'power' || gloveDef.id === 'speed'
            ? 'flame'
            : gloveDef.id === 'grapple' || gloveDef.id === 'blink'
              ? 'toxic'
              : 'cyan';
      leftHandRibbon.update(handTrailKind, handWorldL.x, handWorldL.y, handWorldL.z, charYaw, handTrailActive, nowSec);
      rightHandRibbon.update(handTrailKind, handWorldR.x, handWorldR.y, handWorldR.z, charYaw, handTrailActive, nowSec);

      // ───── Update Air Blast Ring & Grapple Beam ─────
      if (blastRingTimer > 0) {
        blastRingTimer = Math.max(0, blastRingTimer - dt);
        const p = 1 - blastRingTimer / 0.36;
        blastRing.scale.setScalar(1 + p * 8.5);
        (blastRing.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.82;
        if (blastRingTimer === 0) blastRing.visible = false;
      }
      if (grappleTimer > 0) {
        grappleTimer = Math.max(0, grappleTimer - dt);
        scratchStart.set(player.x, player.y + 2.8, player.z);
        scratchMid.addVectors(scratchStart, grappleAnchor).multiplyScalar(0.5);
        const len = scratchStart.distanceTo(grappleAnchor);
        grappleBeam.position.copy(scratchMid);
        grappleBeam.scale.set(1, 1, Math.max(0.1, len));
        grappleBeam.lookAt(grappleAnchor);
        (grappleBeam.material as THREE.MeshBasicMaterial).opacity = Math.min(1, grappleTimer * 4);
        if (grappleTimer === 0) grappleBeam.visible = false;
      }

      // Track sharp jukes for ankle-break detection
      if (player.speed > 10) {
        const heading = Math.atan2(player.vz, player.vx);
        const turnDelta = Math.abs(angleDifference(prevHeading, heading));
        prevHeading = heading;
        sharpTurnAccum = sharpTurnTimer > 0 ? sharpTurnAccum + turnDelta : turnDelta;
        sharpTurnTimer = 0.25;
      } else {
        sharpTurnTimer = Math.max(0, sharpTurnTimer - dt);
        if (sharpTurnTimer === 0) sharpTurnAccum = 0;
      }

      // ───── Roster sync (Classic 8 ↔ MEGA 100) ─────
      if (state.roster.length !== syncedRosterSize) {
        syncRoster();
        if (phase === 'intermission') placeLobby();
      }
      const lobbyDance = phase === 'intermission' || phase === 'results';

      // ───── AI bots (zero allocations + O(N) spatial hash infection!) ─────
      if (playing && !freezeBots) {
        // Build pre-filtered list of exposed runners ONCE per frame for instant chaser tracking & spatial grid.
        openRunners.length = 0;
        const startZ = VALLEY_BOUNDS.START_LINE_Z + 1;
        const finishZ = VALLEY_BOUNDS.FINISH_LINE_Z - 1;
        for (let i = 0; i < bots.length; i++) {
          const r = bots[i];
          if (r.role === 'runner' && !r.finished && r.body.z < startZ && r.body.z > finishZ) {
            openRunners.push(r);
          }
        }

        for (let i = 0; i < bots.length; i++) {
          const bot = bots[i];
          bot.update(dt, player, state.role, inSafeZone, openRunners);
          while (bot.crossingsReported < bot.crossings) {
            bot.crossingsReported++;
            game.completeCrossing(bot.id);
          }
        }

        tauntTimer -= dt;
        if (tauntTimer <= 0 && state.role === 'runner' && !state.finished) {
          let chosenTaunter: ValleyBot | null = null;
          let count = 0;
          for (let i = 0; i < bots.length; i++) {
            const b = bots[i];
            if (b.role !== 'chaser') continue;
            const ddx = b.body.x - player.x;
            const ddz = b.body.z - player.z;
            if (ddx * ddx + ddz * ddz < 7225) {
              count++;
              if (Math.random() * count < 1) chosenTaunter = b;
            }
          }
          if (chosenTaunter) {
            const key = soundFX.playTaunt();
            game.taunt(chosenTaunter.name, MEME_CAPTIONS[key]);
          }
          tauntTimer = 5.5 + Math.random() * 4.5;
        }

        // Spatial-hashed infection checks (O(N) even with 99 bots!)
        if (openRunners.length > 0) {
          grid.clear();
          for (let i = 0; i < openRunners.length; i++) {
            const r = openRunners[i];
            const k = cellKey(r.body.x, r.body.z);
            const bucket = grid.get(k);
            if (bucket) bucket.push(r);
            else grid.set(k, [r]);
          }
          for (let i = 0; i < bots.length; i++) {
            const c = bots[i];
            if (c.role !== 'chaser' || c.stumbleTimer > 0 || c.tagCooldown > 0) continue;
            const cx = (c.body.x + 512) >> 4;
            const cz = (c.body.z + 640) >> 4;
            let tagged = false;
            for (let ox = -1; ox <= 1 && !tagged; ox++) {
              for (let oz = -1; oz <= 1 && !tagged; oz++) {
                const bucket = grid.get(((cx + ox) << 10) | (cz + oz));
                if (!bucket) continue;
                for (let j = 0; j < bucket.length; j++) {
                  const r = bucket[j];
                  if (r.role !== 'runner' || r.finished) continue;
                  const dx = c.body.x - r.body.x;
                  const dy = c.body.y - r.body.y;
                  const dz = c.body.z - r.body.z;
                  if (dx * dx + dy * dy + dz * dz < 12.96 && game.infect(r.id, c.id)) {
                    r.convertToChaser();
                    tagged = true;
                    break;
                  }
                }
              }
            }
          }
        }

        if (state.role === 'tagger') {
          for (const r of bots) {
            if (r.role !== 'runner' || r.finished) continue;
            const rSafe =
              r.body.z >= VALLEY_BOUNDS.START_LINE_Z + 1 || r.body.z <= VALLEY_BOUNDS.FINISH_LINE_Z - 1;
            if (rSafe) continue;
            const d = Math.hypot(player.x - r.body.x, player.y - r.body.y, player.z - r.body.z);
            if (d < 3.5 && game.infect(r.id, 'you')) {
              r.convertToChaser();
              soundFX.playTag(true);
              spawnConfetti(r.body.x, r.body.y + 2, r.body.z, 24);
            }
          }
        }
      } else {
        for (let i = 0; i < bots.length; i++) bots[i].idle(dt, lobbyDance);
      }

      // Player crossing progression
      if (playing && state.role === 'runner' && !state.finished) {
        const reached =
          (state.targetZone === 'finish' && player.z <= VALLEY_BOUNDS.FINISH_LINE_Z - 1) ||
          (state.targetZone === 'start' && player.z >= VALLEY_BOUNDS.START_LINE_Z + 1);
        if (reached) {
          const outcome = game.completeCrossing('you');
          if (outcome === 'finished') {
            soundFX.playSurvive();
            soundFX.playMeme('vine-boom', 0.65, 1000);
            spawnConfetti(player.x, player.y + 2, player.z, 140);
          } else if (outcome === 'crossing') {
            soundFX.playCrossing(game.state.crossings);
            spawnConfetti(player.x, player.y + 2, player.z, 28);
          }
        }
      }

      let nearestDist = Infinity;
      let nearest: ValleyBot | null = null;
      for (const bot of bots) {
        const wanted = state.role === 'runner' ? bot.role === 'chaser' : bot.role === 'runner' && !bot.finished;
        if (!wanted) continue;
        const d = Math.hypot(player.x - bot.body.x, player.y - bot.body.y, player.z - bot.body.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = bot;
        }
        if (
          playing && state.role === 'runner' && bot.role === 'chaser' && !inSafeZone &&
          bot.stumbleTimer <= 0 && d < 3.4 && game.infect('you', bot.id)
        ) {
          soundFX.playTag(false);
          fovKick = Math.min(10, fovKick + 8);
        }
        if (
          playing && state.role === 'runner' && bot.role === 'chaser' && !inSafeZone &&
          bot.ankleCooldown <= 0 && bot.stumbleTimer <= 0 && d < 22 &&
          (abilityTriggeredFrame || (sharpTurnAccum > 1.2 && player.speed >= 44) || (player.sliding && sharpTurnAccum > 0.75))
        ) {
          bot.triggerStumble();
          sharpTurnAccum = 0;
          const sound = soundFX.playAnkleBreaker();
          game.recordAnkleBreak(bot.name, MEME_CAPTIONS[sound]);
          spawnConfetti(bot.body.x, bot.body.y + 2, bot.body.z, 20);
          fovKick = Math.min(10, fovKick + 5);
        }
      }

      game.tick(dt, { nearestThreat: nearestDist, inSafeZone });

      // Zero-allocation live positions written directly into typed array for the <canvas> progress strip.
      const rList = game.state.roster;
      const rLen = Math.min(rList.length, stripZ.length);
      stripHandle.count = rLen;
      stripZ[0] = player.z;
      stripFlags[0] = 4 | (rList[0].role === 'tagger' ? 1 : 0) | (rList[0].finished ? 2 : 0);
      for (let i = 1; i < rLen; i++) {
        const bot = bots[i - 1];
        const rp = rList[i];
        stripZ[i] = bot ? bot.body.z : 0;
        stripFlags[i] = (rp.role === 'tagger' ? 1 : 0) | (rp.finished ? 2 : 0);
      }

      // In MEGA 100 mode render all 99 bots cleanly in 7 GPU-instanced draw calls (zero stutter, locked 60 FPS!).
      if (isMegaMode) {
        crowd.begin(dt);
        for (let i = 0; i < bots.length; i++) crowd.add(bots[i], dt, lobbyDance);
        crowd.end();
      }

      // ───── Player rig ─────
      const previousYaw = charYaw;
      const targetYaw =
        faceCamera && !player.sliding
          ? Math.atan2(fx, fz)
          : player.speed > 1 ? Math.atan2(player.vx, player.vz) : charYaw;
      charYaw += angleDifference(charYaw, targetYaw) * (1 - Math.exp(-28 * dt));
      const turnRate = angleDifference(previousYaw, charYaw) / Math.max(dt, 0.001);
      character.root.position.set(player.x, player.y, player.z);
      character.root.rotation.y = charYaw;
      if (character.emoting && (player.speed > 6 || !player.grounded || player.sliding || forward !== 0 || sideways !== 0)) {
        stopActiveEmote();
      }
      const footstep = character.update({
        dt,
        speedRatio: Math.min(1.5, player.speed / MOVEMENT.BASE_SPEED),
        isGrounded: player.grounded,
        verticalVelocity: player.vy,
        isSliding: player.sliding,
        isGliding: player.gliding,
        isDashing: player.dashing,
        mantling: player.mantling,
        vaultProgress: player.vaultProgress,
        strafeAmount: faceCamera ? sideways : 0,
        forwardAmount: faceCamera ? forward : 1,
        turnRate,
        landingSquash: landingCompression,
      });
      if (footstep && player.grounded && !player.sliding) {
        soundFX.playFootstep(0.95 + 0.12 * Math.min(1, player.speed / MOVEMENT.BASE_SPEED) + Math.random() * 0.05);
      }

      shield.visible = playing && (state.ntb > 0 || inSafeZone);
      if (shield.visible) {
        shield.position.set(player.x, player.y + 2.6, player.z);
        (shield.material as THREE.MeshBasicMaterial).color.set(inSafeZone ? 0x5df27a : 0x7fd7ff);
        (shield.material as THREE.MeshBasicMaterial).opacity = 0.12 + 0.1 * Math.abs(Math.sin(now * 0.005));
      }
      tagRing.visible = playing && state.role === 'tagger';
      if (tagRing.visible) {
        tagRing.position.set(player.x, player.y + 0.06, player.z);
        tagRing.rotation.z = now * 0.001;
      }

      // ───── Camera ─────
      fovKick = THREE.MathUtils.damp(fovKick, 0, 6, dt);
      const speedKick = Math.min(11, Math.max(0, player.speed - 48) * 0.075);
      const newFov = THREE.MathUtils.damp(camera.fov, 86 + speedKick + fovKick, 6, dt);
      if (Math.abs(camera.fov - newFov) > 0.005) {
        camera.fov = newFov;
        camera.updateProjectionMatrix();
      }
      const tiltTarget = THREE.MathUtils.clamp(-turnRate * 0.012, -0.09, 0.09);
      tilt = THREE.MathUtils.damp(tilt, tiltTarget, 8, dt);
      cameraHeight = THREE.MathUtils.damp(cameraHeight, player.sliding ? 2.1 : 3.75, 24, dt);
      shoulder = THREE.MathUtils.damp(shoulder, latest.current.shiftLocked && !state.shopOpen ? 1.45 : 0, 20, dt);
      const lx = fx * Math.cos(pitch);
      const ly = Math.sin(pitch);
      const lz = fz * Math.cos(pitch);
      pivot.set(player.x, player.y + cameraHeight, player.z);
      desiredCamera.set(
        pivot.x - lx * distance + rx * shoulder,
        Math.max(0.5, pivot.y - ly * distance),
        pivot.z - lz * distance + rz * shoulder,
      );
      rayDirection.subVectors(desiredCamera, pivot);
      let actualDistance = rayDirection.length();
      rayDirection.normalize();
      ray.set(pivot, rayDirection);
      ray.far = actualDistance + 0.3;
      const hits = ray.intersectObjects(obstacles, false);
      if (hits.length) actualDistance = Math.max(0.15, Math.min(actualDistance, hits[0].distance - 0.35));
      camera.position.copy(pivot).addScaledVector(rayDirection, actualDistance);
      cameraLook.set(pivot.x + lx * 30 + rx * shoulder, pivot.y + ly * 30, pivot.z + lz * 30 + rz * shoulder);
      character.root.visible = actualDistance > 2;
      camera.lookAt(cameraLook);
      camera.rotateZ(tilt);

      if (nearest) {
        const projected = scratchProj.set(nearest.body.x, nearest.body.y + 2.5, nearest.body.z).project(camera);
        (window as unknown as { __chaserScreen?: unknown }).__chaserScreen = {
          x: (projected.x * 0.5 + 0.5) * container.clientWidth,
          y: (-projected.y * 0.5 + 0.5) * container.clientHeight,
          onScreen: projected.z < 1 && Math.abs(projected.x) < 0.92 && Math.abs(projected.y) < 0.92,
          dist: nearestDist,
        };
      }

      fxManager.update(dt);

      sky.position.copy(camera.position);
      sun.position.set(player.x + sunOffset[0], player.y + sunOffset[1], player.z + sunOffset[2]);
      sun.target.position.set(player.x, player.y, player.z);
      sun.target.updateMatrixWorld();
      renderer.render(scene, camera);
      movementStore.frame(
        player.speed,
        player.sliding,
        player.grounded,
        player.gliding,
        player.gloveCooldown,
        player.gloveCooldownMax,
        player.gloveActiveTimer > 0,
        player.airJumpsAvailable,
        player.speedCap,
      );
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clearInput);
      window.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mouseup', mouseUp);
      window.removeEventListener('mousemove', mouseMove);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('contextmenu', contextMenu);
      document.removeEventListener('pointerlockchange', lockChange);
      document.removeEventListener('visibilitychange', visibility);
      soundFX.stopEmoteMusic();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      if (testWindow.__sandboxTest?.player === player) delete testWindow.__sandboxTest;
      disposeScene(scene);
      sun.shadow.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div className="game-canvas" ref={containerRef}>
      {error && <p role="alert">WebGL is unavailable. Enable hardware acceleration in your browser to play.</p>}
    </div>
  );
}
