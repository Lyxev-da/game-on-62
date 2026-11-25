import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { R6Character } from './R6Character';
import { CosmeticFxManager, RibbonTrail3D } from './cosmeticFx3D';
import { soundFX } from '../utils/sound';
import {
  GLOVES,
  OUTFITS,
  EMOTES,
  TRAILS,
  FX_ITEMS,
  getEmote,
  getFx,
  getTrail,
  type EmoteId,
  type FxId,
  type GloveId,
  type OutfitId,
  type ShopCategory,
  type TrailId,
} from './shopData';

const thumbCache = new Map<string, string>();
let thumbBatchRendered = false;

/** Adds UTG's signature crisp thick comic black ink outline around a transparent 3D render. */
function stampOutlinedDataUrl(srcCanvas: HTMLCanvasElement): string {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;

  const stroke = 5.5;
  const silhouette = document.createElement('canvas');
  silhouette.width = w;
  silhouette.height = h;
  const sctx = silhouette.getContext('2d')!;
  sctx.drawImage(srcCanvas, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = '#0f0f12';
  sctx.fillRect(0, 0, w, h);

  const offsets = [
    [-stroke, 0], [stroke, 0], [0, -stroke], [0, stroke],
    [-stroke * 0.72, -stroke * 0.72], [stroke * 0.72, -stroke * 0.72],
    [-stroke * 0.72, stroke * 0.72], [stroke * 0.72, stroke * 0.72],
    [0, stroke + 3],
  ];
  for (const [ox, oy] of offsets) ctx.drawImage(silhouette, ox, oy);
  ctx.drawImage(srcCanvas, 0, 0);
  return out.toDataURL('image/png');
}

/** Auto-frames any 3D Box3 completely inside the square thumbnail with safe outline margin. */
function frameObject(
  camera: THREE.PerspectiveCamera,
  box: THREE.Box3,
  margin = 1.38,
  angleX = 0.08,
  angleY = 0.14,
): void {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSpan = Math.max(size.x, size.y, 1.5);
  const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const dist = (maxSpan * 0.5 / Math.tan(halfFov)) * margin + size.z * 0.42;
  camera.position.set(
    center.x + dist * angleX,
    center.y + dist * angleY,
    center.z + dist,
  );
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

/** Peak iconic timestamp for each emote's card thumbnail! */
const EMOTE_SNAP_TIME: Record<EmoteId, number> = {
  wave: 0.18,
  cheer: 0.23,
  laugh: 1.45,
  sit: 0.6,
  tpose: 0.35,
  floss: 0.25,
  boston: 2.05,
  california: 0.28,
  kazotsky: 0.22,
  sturdy: 0.24,
  ratdance: 0.22,
  gangnam: 2.15,
};

/** Renders all 42 shop item 3D card thumbnails cleanly in one fast WebGL pass and disposes immediately. */
export function ensureCosmeticThumbnails(): Map<string, string> {
  if (thumbBatchRendered || typeof document === 'undefined') return thumbCache;
  thumbBatchRendered = true;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return thumbCache;
  }

  const SIZE = 260;
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;

  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x64748b, 1.4);
  const key = new THREE.DirectionalLight(0xfffbeb, 1.9);
  key.position.set(5, 10, 9);
  const rim = new THREE.DirectionalLight(0x81f4ff, 0.95);
  rim.position.set(-6, 5, -5);
  scene.add(hemi, key, rim);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const rig = new R6Character(true);
  rig.headMesh.scale.setScalar(1.22);
  scene.add(rig.root);

  // 1) All 10 Parkour Pandemic Gloves (raised heroic dual-gauntlet render — fits whole upper body + cuffs!)
  for (const g of GLOVES) {
    rig.stopEmote();
    rig.setOutfit('classic', false);
    rig.setGloves(g.id, true);
    rig.root.position.set(0, 0, 0);
    rig.root.rotation.set(0, 0.36, 0);
    rig.hipGroup.position.set(0, 2.0, 0);
    rig.hipGroup.rotation.set(0, 0, 0);
    rig.torsoPivot.rotation.set(0.12, -0.18, -0.04);
    rig.neckPivot.rotation.set(-0.08, 0.22, 0);
    rig.leftShoulder.rotation.set(-1.32, -0.25, -0.24);
    rig.rightShoulder.rotation.set(-1.48, 0.28, 0.26);
    rig.leftHip.rotation.set(-0.28, 0, 0.08);
    rig.rightHip.rotation.set(0.28, 0, -0.08);
    rig.root.updateMatrixWorld(true);

    // Frame full chest + head + both oversized 3D gauntlets cleanly with extra glow headroom
    const box = new THREE.Box3()
      .setFromObject(rig.leftShoulder)
      .union(new THREE.Box3().setFromObject(rig.rightShoulder))
      .union(new THREE.Box3().setFromObject(rig.torsoMesh))
      .union(new THREE.Box3().setFromObject(rig.headMesh));
    box.expandByScalar(0.32);
    frameObject(camera, box, 1.32, 0.1, 0.08);
    renderer.render(scene, camera);
    thumbCache.set(`gloves:${g.id}`, stampOutlinedDataUrl(renderer.domElement));
  }

  // 2) All 8 Outfits (expressive full-body R6 posed render with full crown/cape/sword/wings clearance!)
  rig.setGloves('tape', false);
  OUTFITS.forEach((o, idx) => {
    rig.stopEmote();
    rig.setOutfit(o.id, false);
    const dir = idx % 2 === 0 ? 1 : -1;
    rig.root.rotation.set(0, dir * 0.44, 0);
    rig.hipGroup.position.set(0, 2.0, 0);
    rig.hipGroup.rotation.set(0, 0, 0);
    rig.torsoPivot.rotation.set(0.08, -dir * 0.14, 0.04 * dir);
    rig.neckPivot.rotation.set(-0.06, dir * 0.2, 0);
    rig.leftShoulder.rotation.set(idx % 3 === 0 ? -2.25 : -0.72, 0, 0.3);
    rig.rightShoulder.rotation.set(0.5, 0, -0.26);
    rig.leftHip.rotation.set(0.42, 0, 0.08);
    rig.rightHip.rotation.set(-0.42, 0, -0.08);
    rig.root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(rig.root);
    box.expandByScalar(0.28);
    frameObject(camera, box, 1.32, 0.04, 0.1);
    renderer.render(scene, camera);
    thumbCache.set(`outfits:${o.id}`, stampOutlinedDataUrl(renderer.domElement));
  });

  // 3) All 12 Iconic UTG Emotes (caught right at each emote's peak recognizable gesture!)
  for (const em of EMOTES) {
    rig.setOutfit('classic', false);
    rig.setGloves('tape', false);
    rig.root.position.set(0, 0, 0);
    rig.root.rotation.set(0, em.id === 'laugh' ? 0.55 : em.id === 'boston' ? 0.35 : 0.32, 0);
    rig.poseEmoteAt(em.id, EMOTE_SNAP_TIME[em.id]);
    rig.root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(rig.root);
    box.expandByScalar(0.32);
    frameObject(camera, box, 1.32, 0.06, 0.14);
    renderer.render(scene, camera);
    thumbCache.set(`emotes:${em.id}`, stampOutlinedDataUrl(renderer.domElement));
  }
  rig.stopEmote();

  // 4) All 6 Trails (mid-stride dynamic runner streaming glowing colorful 3D ribbon!)
  const ribbonGroup = new THREE.Group();
  scene.add(ribbonGroup);
  for (const t of TRAILS) {
    ribbonGroup.clear();
    rig.setOutfit('cyber', false);
    rig.setGloves('speed', true);
    rig.root.rotation.set(0, 0.92, 0);
    rig.hipGroup.position.set(0, 2.0, 0);
    rig.hipGroup.rotation.set(0, 0, 0);
    rig.torsoPivot.rotation.set(0.34, 0, -0.08);
    rig.neckPivot.rotation.set(-0.18, 0, 0);
    rig.leftShoulder.rotation.set(0.85, 0, 0.25);
    rig.rightShoulder.rotation.set(-1.12, 0, -0.25);
    rig.leftHip.rotation.set(-0.82, 0, 0);
    rig.rightHip.rotation.set(0.74, 0, 0);

    const palette = t.colors.length > 0 ? t.colors : [0x94a3b8, 0xcbd5e1];
    palette.forEach((hex, band) => {
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 16; s++) {
        const u = s / 16;
        pts.push(
          new THREE.Vector3(
            -u * 3.2 - 0.25,
            2.15 + Math.sin(u * Math.PI * 1.7 + band * 0.45) * 0.68 + (band - (palette.length - 1) / 2) * 0.26,
            -u * 1.4,
          ),
        );
      }
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, t.id === 'none' ? 0.09 : 0.23, 8, false),
        new THREE.MeshBasicMaterial({ color: hex }),
      );
      ribbonGroup.add(tube);
    });

    rig.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rig.root).union(new THREE.Box3().setFromObject(ribbonGroup));
    box.expandByScalar(0.3);
    frameObject(camera, box, 1.28, 0.08, 0.1);
    renderer.render(scene, camera);
    thumbCache.set(`trails:${t.id}`, stampOutlinedDataUrl(renderer.domElement));
  }
  scene.remove(ribbonGroup);

  // 5) All 6 Tag Effects (dramatic bold UTG impact bursts around a startled noob!)
  const fxGroup = new THREE.Group();
  scene.add(fxGroup);
  for (const f of FX_ITEMS) {
    fxGroup.clear();
    rig.setOutfit('classic', false);
    rig.setGloves('tape', false);
    rig.root.rotation.set(0.12, -0.38, 0.14);
    rig.hipGroup.position.set(0, 2.0, 0);
    rig.hipGroup.rotation.set(0, 0, 0);
    rig.torsoPivot.rotation.set(0, 0, 0);
    rig.neckPivot.rotation.set(0, 0, 0);
    rig.leftShoulder.rotation.set(-2.1, 0, 0.55);
    rig.rightShoulder.rotation.set(-1.95, 0, -0.55);
    rig.leftHip.rotation.set(-0.42, 0, 0.18);
    rig.rightHip.rotation.set(0.38, 0, -0.18);

    if (f.style === 'judgement') {
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(1.85, 18, 14),
        new THREE.MeshBasicMaterial({ color: 0x090d16, transparent: true, opacity: 0.85 }),
      );
      core.position.set(0, 2.2, 0);
      fxGroup.add(core);
      for (let i = 0; i < 6; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(2.35, 0.13, 8, 28),
          new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x7cf2ff : 0x38bdf8 }),
        );
        ring.position.set(0, 2.2, 0);
        ring.rotation.set(i * 0.9, i * 1.1, i * 0.6);
        fxGroup.add(ring);
      }
    } else if (f.style === 'zapper') {
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.62, 5.4, 6),
        new THREE.MeshBasicMaterial({ color: 0x7cf2ff }),
      );
      bolt.position.set(0, 2.8, 0.35);
      bolt.rotation.z = 0.2;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.15, 0.18, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xfef08a }),
      );
      ring.position.set(0, 0.9, 0);
      ring.rotation.x = Math.PI / 2;
      fxGroup.add(bolt, ring);
    } else if (f.style === 'glacier') {
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.52, 3.2, 5),
          new THREE.MeshPhysicalMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 0.48, roughness: 0.12 }),
        );
        spike.position.set(Math.cos(ang) * 1.4, 1.5, Math.sin(ang) * 1.4);
        spike.rotation.z = -Math.cos(ang) * 0.48;
        spike.rotation.x = Math.sin(ang) * 0.48;
        fxGroup.add(spike);
      }
    } else if (f.style === 'subspace') {
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.9, 0),
        new THREE.MeshBasicMaterial({ color: 0xff20aa, transparent: true, opacity: 0.72 }),
      );
      star.position.set(0, 2.3, 0.2);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.4, 0.18, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xf472b6 }),
      );
      ring.position.set(0, 2.3, 0.2);
      ring.rotation.x = 0.88;
      fxGroup.add(star, ring);
    } else {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = 1.65 + (i % 3) * 0.45;
        const hex = f.colors[i % f.colors.length];
        const shard = new THREE.Mesh(
          f.style === 'midas'
            ? new THREE.CylinderGeometry(0.45, 0.45, 0.16, 12)
            : new THREE.BoxGeometry(0.55, 0.55, 0.22),
          new THREE.MeshBasicMaterial({ color: hex }),
        );
        shard.position.set(Math.cos(a) * r, 2.2 + Math.sin(a * 2) * 1.3, Math.sin(a) * 0.7);
        shard.rotation.set(i, i * 0.7, i * 0.4);
        fxGroup.add(shard);
      }
    }

    rig.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rig.root).union(new THREE.Box3().setFromObject(fxGroup));
    box.expandByScalar(0.32);
    frameObject(camera, box, 1.3, 0.04, 0.1);
    renderer.render(scene, camera);
    thumbCache.set(`fx:${f.id}`, stampOutlinedDataUrl(renderer.domElement));
  }

  renderer.dispose();
  renderer.forceContextLoss?.();
  return thumbCache;
}

export function getThumbUrl(category: ShopCategory, id: string): string {
  ensureCosmeticThumbnails();
  return thumbCache.get(`${category}:${id}`) ?? '';
}

interface LivePreviewProps {
  glove: GloveId;
  outfit: OutfitId;
  emote: EmoteId;
  trail: TrailId;
  fx: FxId;
  focusCategory: ShopCategory;
  burstSignal: number;
  emoteSignal: number;
}

/**
 * Interactive Live 3D Showcase Turntable inside utg://shop & utg://inventory!
 * Drag to spin, test all 10 sculpted 3D gloves (with Sky Glider wings!), dance live
 * with synced chiptune beats + sparkles, stream glowing trails, and pop Tag FX live!
 */
export function LiveCharacterPreview({
  glove,
  outfit,
  emote,
  trail,
  fx,
  focusCategory,
  burstSignal,
  emoteSignal,
}: LivePreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ glove, outfit, emote, trail, fx, focusCategory });
  propsRef.current = { glove, outfit, emote, trail, fx, focusCategory };
  const [mode, setMode] = useState<'run' | 'pose' | 'dance'>('run');
  const [beatOn, setBeatOn] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const fxTriggerRef = useRef<(() => void) | null>(null);
  const playDanceRef = useRef<((id: EmoteId, withAudio: boolean) => void) | null>(null);
  const stopDanceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (burstSignal > 0) fxTriggerRef.current?.();
  }, [burstSignal]);

  useEffect(() => {
    if (emoteSignal > 0) {
      setMode('dance');
      playDanceRef.current?.(propsRef.current.emote, beatOn);
    }
  }, [emoteSignal, beatOn]);

  // Stop shop beat audio cleanly when unmounting or turning music off
  useEffect(() => {
    if (!beatOn) soundFX.stopEmoteMusic();
    else if (mode === 'dance') soundFX.startEmoteMusic(emote);
    return () => {
      soundFX.stopEmoteMusic();
    };
  }, [beatOn, mode, emote]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth || 260, host.clientHeight || 220);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(0xffffff, 0x64748b, 1.38);
    const sun = new THREE.DirectionalLight(0xfff9e2, 1.8);
    sun.position.set(5, 10, 8);
    const rim = new THREE.DirectionalLight(0x81f4ff, 0.9);
    rim.position.set(-6, 5, -5);
    scene.add(hemi, sun, rim);

    // Playful white & black comic-outlined turntable pedestal
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(2.65, 2.85, 0.38, 32),
      new THREE.MeshPhysicalMaterial({ color: 0xf1f5f9, roughness: 0.4, clearcoat: 0.35 }),
    );
    pad.position.y = -0.19;
    const padRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.74, 0.09, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0x111111 }),
    );
    padRing.rotation.x = Math.PI / 2;
    padRing.position.y = 0;
    scene.add(pad, padRing);

    const camera = new THREE.PerspectiveCamera(
      38,
      (host.clientWidth || 260) / (host.clientHeight || 220),
      0.1,
      100,
    );
    const rig = new R6Character(true);
    rig.headMesh.scale.setScalar(1.22);
    scene.add(rig.root);

    const fxMgr = new CosmeticFxManager(scene);
    const ribbon = new RibbonTrail3D(26);
    scene.add(ribbon.mesh);

    fxTriggerRef.current = () => {
      fxMgr.spawnFxBurst(propsRef.current.fx, 0, 1.5, 0, 0.8);
    };
    playDanceRef.current = (id: EmoteId, withAudio: boolean) => {
      rig.playEmote(id);
      if (withAudio) soundFX.startEmoteMusic(id);
    };
    stopDanceRef.current = () => {
      rig.stopEmote();
      soundFX.stopEmoteMusic();
    };

    let dragging = false;
    let lastX = 0;
    let turntableYaw = 0.35;
    let autoSpin = true;
    let sparkleAccum = 0;
    let trailOrbit = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      autoSpin = false;
      lastX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      turntableYaw += (e.clientX - lastX) * 0.015;
      lastX = e.clientX;
    };
    const onUp = () => { dragging = false; };

    const el = renderer.domElement;
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const ro = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    });
    ro.observe(host);

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const cur = propsRef.current;
      const m = modeRef.current;
      rig.setGloves(cur.glove, true);
      rig.setOutfit(cur.outfit, false);

      if (m === 'dance') {
        if (rig.currentEmote !== cur.emote) rig.playEmote(cur.emote);
        if (autoSpin) turntableYaw = Math.sin(now * 0.0007) * 0.45;
      } else {
        if (rig.emoting) rig.stopEmote();
        if (autoSpin) turntableYaw += dt * 0.72;
      }
      rig.root.rotation.y = turntableYaw;

      const showWings = cur.glove === 'glider' && m === 'pose';
      const targetZ = showWings ? 12.2 : m === 'dance' ? 10.6 : 10.0;
      const targetY = showWings ? 3.2 : 2.95;
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 8, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 8, dt);
      camera.lookAt(0, 2.35, 0);

      rig.update({
        dt,
        speedRatio: m === 'run' ? 1.0 : 0,
        isGrounded: !showWings,
        verticalVelocity: 0,
        isSliding: false,
        isGliding: showWings,
        isDashing: false,
        strafeAmount: 0,
        forwardAmount: 1,
        turnRate: 0,
        landingSquash: 0,
      });

      // Boxer dual-gauntlet showcase pose when checking out gloves!
      if (m === 'pose' && !showWings) {
        rig.leftShoulder.rotation.set(-1.32, -0.25, -0.22);
        rig.rightShoulder.rotation.set(-1.42, 0.25, 0.22);
      }

      // Live dancing note sparkles
      if (m === 'dance') {
        sparkleAccum += dt;
        if (sparkleAccum >= 0.26) {
          sparkleAccum = 0;
          fxMgr.spawnEmoteSparkle(0, 0.5, 0, [0xffd23a, 0x81f4ff, 0xff66c6, 0x73ff73]);
        }
      }

      // Stream live 3D ribbon trail in run mode
      trailOrbit += dt * 5.2;
      const tx = -Math.sin(turntableYaw) * 1.35 + Math.cos(trailOrbit) * 0.42;
      const tz = -Math.cos(turntableYaw) * 1.35 + Math.sin(trailOrbit) * 0.42;
      ribbon.update(
        cur.trail,
        tx,
        2.15 + Math.sin(trailOrbit * 1.3) * 0.35,
        tz,
        turntableYaw,
        m === 'run' && cur.trail !== 'none',
        now * 0.001,
      );

      fxMgr.update(dt);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      soundFX.stopEmoteMusic();
      fxTriggerRef.current = null;
      playDanceRef.current = null;
      stopDanceRef.current = null;
      renderer.dispose();
      renderer.forceContextLoss?.();
      el.remove();
    };
  }, []);

  const trailMeta = getTrail(trail);
  const fxMeta = getFx(fx);
  const emoteMeta = getEmote(emote);

  return (
    <div className="utg-stage-wrap">
      <div ref={hostRef} className="utg-stage-canvas" title="Drag to rotate your avatar 360°!" />
      <div className="utg-stage-controls">
        <button
          type="button"
          className={`utg-stage-chip ${mode === 'run' ? 'is-on' : ''}`}
          onClick={() => {
            setMode('run');
            stopDanceRef.current?.();
          }}
          title="Run animation + ribbon trail"
        >
          run
        </button>
        <button
          type="button"
          className={`utg-stage-chip ${mode === 'pose' ? 'is-on' : ''}`}
          onClick={() => {
            setMode('pose');
            stopDanceRef.current?.();
          }}
          title="Flex equipped gloves / Sky Glider wings"
        >
          flex
        </button>
        <button
          type="button"
          className={`utg-stage-chip is-emote ${mode === 'dance' ? 'is-on' : ''}`}
          onClick={() => {
            setMode('dance');
            playDanceRef.current?.(emote, beatOn);
          }}
          title={`Watch ${emoteMeta.name}!`}
        >
          dance
        </button>
        <button
          type="button"
          className={`utg-stage-chip is-beat ${beatOn ? 'is-on' : ''}`}
          onClick={() => {
            soundFX.unlock();
            setBeatOn((v) => !v);
            if (mode !== 'dance') setMode('dance');
          }}
          title="Toggle dance music preview"
        >
          {beatOn ? '♫ on' : '♫'}
        </button>
        <button
          type="button"
          className="utg-stage-chip is-fx"
          onClick={() => fxTriggerRef.current?.()}
          title={`Pop ${fxMeta.name} Tag Effect!`}
        >
          fx!
        </button>
      </div>
      <div className="utg-stage-caption">
        drag to spin · <b>{mode === 'dance' ? emoteMeta.name : trailMeta.name}</b>
      </div>
    </div>
  );
}
