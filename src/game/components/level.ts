// @ts-nocheck -- imported game code written for looser TS settings
import type { AABB, Ramp as PlayerRamp } from './PlayerController';

export interface LevelBox {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  /** Base color. Auto-shaded per face like Roblox parts. */
  color: number;
  /** Optional flat accent color for the top face. */
  top?: number;
  /** Optional material name for procedural textures. */
  material?: 'brick' | 'concrete' | 'grass' | 'road' | 'wood' | 'metal' | 'roof' | 'checker' | 'sand' | 'water' | 'ice';
  /** Optional: disable shadow casting for huge distant backdrops. */
  noShadow?: boolean;
  /** Ice surface: low friction & extra glide speed. */
  ice?: boolean;
  /** Bounce pad: landing on top launches the player upward with this speed. */
  bounce?: number;
}

export interface Ramp extends PlayerRamp {
  color?: number;
  material?: LevelBox['material'];
}

/**
 * Open Field Arena boundaries:
 * START is at the South end (z >= 420), FINISH is at the North end (z <= -420).
 * Total crossing = 840 studs of clean, wide-open high-speed field with zero ramps.
 */
export const VALLEY_BOUNDS = {
  MIN_X: -320,
  MAX_X: 320,
  MIN_Z: -540,
  MAX_Z: 540,
  START_LINE_Z: 420,
  FINISH_LINE_Z: -420,
  START_SPAWN_Z: 465,
  CHASER_SPAWN_Z: 0,
} as const;

export const LEVEL_BOXES: LevelBox[] = [
  // ═══════════ 1. FLUSH START SAFE ZONE (South: z = 420..536) ═══════════
  { x: 0, y: 0.03, z: 480, sx: 632, sy: 0.06, sz: 112, color: 0x43b558, top: 0x56cf6c, material: 'concrete' },
  { x: 0, y: 0.05, z: 420, sx: 632, sy: 0.1, sz: 10, color: 0xffffff, material: 'checker' },
  // Clean Start Goal Posts (wide apart so the center lane is 100% open)
  { x: -110, y: 14, z: 420, sx: 6, sy: 28, sz: 6, color: 0x39b54a, top: 0x67e878, material: 'concrete' },
  { x: 110, y: 14, z: 420, sx: 6, sy: 28, sz: 6, color: 0x39b54a, top: 0x67e878, material: 'concrete' },

  // ═══════════ 2. FLUSH FINISH SAFE ZONE (North: z = -536..-420) ═══════════
  { x: 0, y: 0.03, z: -480, sx: 632, sy: 0.06, sz: 112, color: 0xe8b928, top: 0xf7d54f, material: 'concrete' },
  { x: 0, y: 0.05, z: -420, sx: 632, sy: 0.1, sz: 10, color: 0xffffff, material: 'checker' },
  // Clean Finish Goal Posts
  { x: -110, y: 14, z: -420, sx: 6, sy: 28, sz: 6, color: 0xf2b729, top: 0xffe566, material: 'concrete' },
  { x: 110, y: 14, z: -420, sx: 6, sy: 28, sz: 6, color: 0xf2b729, top: 0xffe566, material: 'concrete' },

  // ═══════════ 3. CLEAN PARKOUR WALLS ON THE OPEN FIELD (Zero clutter, zero ramps) ═══════════
  // Center Twin Wall-Run / Juke Walls (wide 76-stud central alley between them)
  { x: -42, y: 10, z: 0, sx: 4, sy: 20, sz: 68, color: 0x2b7de0, top: 0x5aa3ff, material: 'concrete' },
  { x: 42, y: 10, z: 0, sx: 4, sy: 20, sz: 68, color: 0xe85342, top: 0xff7b6b, material: 'concrete' },

  // South Mid-Field Wall-Run Pair
  { x: -105, y: 9, z: 195, sx: 4, sy: 18, sz: 60, color: 0xe6eaf0, top: 0xffffff, material: 'concrete' },
  { x: 105, y: 9, z: 195, sx: 4, sy: 18, sz: 60, color: 0xe6eaf0, top: 0xffffff, material: 'concrete' },

  // North Mid-Field Wall-Run Pair
  { x: -105, y: 9, z: -195, sx: 4, sy: 18, sz: 60, color: 0xe6eaf0, top: 0xffffff, material: 'concrete' },
  { x: 105, y: 9, z: -195, sx: 4, sy: 18, sz: 60, color: 0xe6eaf0, top: 0xffffff, material: 'concrete' },

  // Low Yellow Mantle Hurdles (4.2 studs tall — clean instant Space mantle!)
  { x: 0, y: 2.1, z: 270, sx: 40, sy: 4.2, sz: 4.5, color: 0xffd23a, top: 0xffe875, material: 'concrete' },
  { x: 0, y: 2.1, z: -270, sx: 40, sy: 4.2, sz: 4.5, color: 0xffd23a, top: 0xffe875, material: 'concrete' },
  // Clean Two-Step Mantle Blocks tucked flush at center walls (climb 0 -> 10 -> 20 with jump + mantle!)
  { x: -42, y: 5, z: 42, sx: 14, sy: 10, sz: 16, color: 0x4b93eb, top: 0x7ab8ff, material: 'concrete' },
  { x: 42, y: 5, z: -42, sx: 14, sy: 10, sz: 16, color: 0xf06b5c, top: 0xff9a8f, material: 'concrete' },

  // ═══════════ 4. CLEAN ARENA PERIMETER WALLS ═══════════
  { x: 0, y: 14, z: -540, sx: 648, sy: 28, sz: 8, color: 0xd8dee9, top: 0xecf0f6, material: 'concrete' },
  { x: 0, y: 14, z: 540, sx: 648, sy: 28, sz: 8, color: 0xd8dee9, top: 0xecf0f6, material: 'concrete' },
  { x: -320, y: 14, z: 0, sx: 8, sy: 28, sz: 1088, color: 0xd8dee9, top: 0xecf0f6, material: 'concrete' },
  { x: 320, y: 14, z: 0, sx: 8, sy: 28, sz: 1088, color: 0xd8dee9, top: 0xecf0f6, material: 'concrete' },
];

/** No ramps anywhere on the map. */
export const LEVEL_RAMPS: Ramp[] = [];

/** No trees cluttering the field. */
export const TREE_LOCATIONS: Array<[number, number, number]> = [];

/** Clean lines of golden UTG coins along the open field & wall-run lanes. */
export const COIN_LOCATIONS: Array<[number, number, number]> = [
  // Center corridor line
  [0, 2.4, 340],
  [0, 5.8, 270],
  [0, 2.4, 140],
  [-36, 2.4, 25],
  [-36, 2.4, -25],
  [36, 2.4, 25],
  [36, 2.4, -25],
  [0, 2.4, -140],
  [0, 5.8, -270],
  [0, 2.4, -340],

  // West field & wall-run lane
  [-99, 2.4, 215],
  [-99, 2.4, 175],
  [-150, 2.4, 90],
  [-150, 2.4, 0],
  [-150, 2.4, -90],
  [-99, 2.4, -175],
  [-99, 2.4, -215],

  // East field & wall-run lane
  [99, 2.4, 215],
  [99, 2.4, 175],
  [150, 2.4, 90],
  [150, 2.4, 0],
  [150, 2.4, -90],
  [99, 2.4, -175],
  [99, 2.4, -215],
];

export function levelToAABBs(boxes: LevelBox[] = LEVEL_BOXES): AABB[] {
  return boxes.map((box) => ({
    minX: box.x - box.sx / 2,
    maxX: box.x + box.sx / 2,
    minY: box.y - box.sy / 2,
    maxY: box.y + box.sy / 2,
    minZ: box.z - box.sz / 2,
    maxZ: box.z + box.sz / 2,
    ice: box.ice,
    bounce: box.bounce,
  }));
}
