// @ts-nocheck
export type RarityId =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'outrageous'
  | 'special';

export interface RarityMeta {
  id: RarityId;
  label: string;
  bg: string;
  bgDark: string;
  symbol?: string;
  holo?: boolean;
}

/** Authentic Untitled Tag Game recode cosmetic rarity palette. */
export const RARITIES: Record<RarityId, RarityMeta> = {
  common: { id: 'common', label: 'common', bg: '#CEF8FF', bgDark: '#96E3F4' },
  uncommon: { id: 'uncommon', label: 'uncommon', bg: '#73FF73', bgDark: '#39D948' },
  rare: { id: 'rare', label: 'rare', bg: '#5B82FF', bgDark: '#2F53E0' },
  epic: { id: 'epic', label: 'epic', bg: '#BA6EFF', bgDark: '#8434E6' },
  legendary: { id: 'legendary', label: 'legendary', bg: '#FFE869', bgDark: '#F2BC1D', symbol: '★' },
  mythic: { id: 'mythic', label: 'mythic', bg: '#FF6458', bgDark: '#DC2E24', symbol: '✦' },
  outrageous: { id: 'outrageous', label: 'outrageous', bg: '#8CF7FF', bgDark: '#36D4EC', symbol: '❖', holo: true },
  special: { id: 'special', label: 'special', bg: '#FF66C6', bgDark: '#DB2896', symbol: '♥', holo: true },
};

export type GloveId =
  | 'tape'
  | 'speed'
  | 'gravity'
  | 'boost'
  | 'blink'
  | 'frost'
  | 'power'
  | 'grapple'
  | 'glider'
  | 'fusion';

export type OutfitId = 'classic' | 'noob' | 'skater' | 'cyber' | 'violet' | 'bigshot' | 'soldier' | 'bloxy';
export type TrailId = 'none' | 'cloud' | 'cyan' | 'toxic' | 'flame' | 'rainbow';
export type FxId = 'confetti' | 'volt' | 'frost' | 'inferno' | 'judgement' | 'crown';
export type EmoteId =
  | 'wave'
  | 'cheer'
  | 'laugh'
  | 'sit'
  | 'tpose'
  | 'floss'
  | 'boston'
  | 'california'
  | 'kazotsky'
  | 'sturdy'
  | 'ratdance'
  | 'gangnam';

export type ShopCategory = 'gloves' | 'outfits' | 'emotes' | 'trails' | 'fx';

export interface GloveItem {
  id: GloveId;
  name: string;
  rarity: RarityId;
  price: number;
  cooldown: number;
  tagline: string;
  description: string;
  perks: string[];
  abilityName: string;
  abilityHint: string;
  color: string;
  colorHex: number;
  accent: string;
  accentHex: number;
  emissiveIntensity: number;
  dealPercent?: number;
}

export interface OutfitItem {
  id: OutfitId;
  name: string;
  rarity: RarityId;
  price: number;
  tagline: string;
  quote: string;
  shirtHex: number;
  pantsHex: number;
  skinHex: number;
  sleeveHex?: number;
  color: string;
  accent: string;
}

export interface EmoteItem {
  id: EmoteId;
  name: string;
  rarity: RarityId;
  price: number;
  tagline: string;
  quote: string;
  bpm: number;
  duration: number;
  loop: boolean;
  hasProp?: 'seat' | 'tpose' | 'disco';
  color: string;
  accent: string;
  dealPercent?: number;
}

export interface TrailItem {
  id: TrailId;
  name: string;
  rarity: RarityId;
  price: number;
  tagline: string;
  quote: string;
  colors: number[];
  ribbonWidth: number;
  particleShape: 'puff' | 'spark' | 'star' | 'flame' | 'prism';
  color: string;
  accent: string;
}

export interface FxItem {
  id: FxId;
  name: string;
  rarity: RarityId;
  price: number;
  tagline: string;
  quote: string;
  titleBadge: string;
  style: 'confetti' | 'zapper' | 'glacier' | 'subspace' | 'judgement' | 'midas';
  colors: number[];
  color: string;
  accent: string;
}

/** 10 Parkour Pandemic & Classic Roblox-inspired Gloves — each gives a signature [E] ability! */
export const GLOVES: GloveItem[] = [
  {
    id: 'tape',
    name: 'fighter wraps',
    rarity: 'common',
    price: 0,
    cooldown: 2.0,
    tagline: 'quick shove lunge on [E]',
    description: 'Crisp cloth boxer wraps with crimson straps. Press E for a snappy forward shove that knocks back close chasers!',
    perks: ['[E] Quick Shove Lunge', 'Stumbles chasers within 14m', 'Clean 2.0s cooldown'],
    abilityName: 'QUICK SHOVE',
    abilityHint: 'SHOVE [E]',
    color: '#f1f5f9',
    colorHex: 0xf1f5f9,
    accent: '#ef4444',
    accentHex: 0xef4444,
    emissiveIntensity: 0,
  },
  {
    id: 'speed',
    name: 'speed coil',
    rarity: 'uncommon',
    price: 100,
    cooldown: 3.6,
    tagline: 'classic red helix overdrive!',
    description: 'Inspired by Parkour Pandemic Speed Gear & the Roblox Speed Coil! Passive faster sprint + press E for a blazing 2.6s turbo rush and mega slides.',
    perks: ['[E] 2.6s Overdrive (+48% speed!)', 'Passive +12% run & slide speed', 'Sparking neon-red coil wrap'],
    abilityName: 'OVERDRIVE',
    abilityHint: 'OVERDRIVE [E]',
    color: '#ff4757',
    colorHex: 0xdc2626,
    accent: '#ff8a80',
    accentHex: 0xff6b6b,
    emissiveIntensity: 0.72,
  },
  {
    id: 'gravity',
    name: 'gravity coil',
    rarity: 'rare',
    price: 150,
    cooldown: 2.6,
    tagline: 'boing! sky-high moon jumps',
    description: 'Classic luminous blue Roblox Gravity Coil gauntlets! Press E to blast high into the sky and float with dreamy low-gravity hangtime over walls and chasers.',
    perks: ['[E] Sky Launch (soar over walls!)', '2.2s moon-gravity slow fall', 'Classic glowing blue coil springs'],
    abilityName: 'SKY LAUNCH',
    abilityHint: 'MOON JUMP [E]',
    color: '#38bdf8',
    colorHex: 0x0284c7,
    accent: '#7dd3fc',
    accentHex: 0x38bdf8,
    emissiveIntensity: 0.78,
  },
  {
    id: 'boost',
    name: 'jet thrusters',
    rarity: 'rare',
    price: 200,
    cooldown: 1.5,
    tagline: 'rocket dash + double jump!',
    description: 'Parkour Pandemic Boost Gear! Twin emerald plasma nozzles launch you forward in a high-speed dash on E, plus unlock a crisp mid-air Double Jump on SPACE.',
    perks: ['[E] 98 studs/s Rocket Dash (1.5s CD)', 'Passive: Double Jump [SPACE]', 'Live flickering green plasma jets'],
    abilityName: 'ROCKET DASH',
    abilityHint: 'JET DASH [E]',
    color: '#4ade80',
    colorHex: 0x16a34a,
    accent: '#bef264',
    accentHex: 0x86efac,
    emissiveIntensity: 0.78,
    dealPercent: 20,
  },
  {
    id: 'blink',
    name: 'void blink',
    rarity: 'epic',
    price: 260,
    cooldown: 2.8,
    tagline: 'instant 48m shadow teleport!',
    description: 'Rift-forged obsidian claws etched with violet portal energy. Press E to instantly flash-step 48 studs forward through thin air, breaking nearby ankles!',
    perks: ['[E] Instant 48-stud Teleport', 'Stumbles nearby chasers on fade', 'Twin neon purple rift rings'],
    abilityName: 'PHASE BLINK',
    abilityHint: 'BLINK [E]',
    color: '#a855f7',
    colorHex: 0x1e1033,
    accent: '#d8b4fe',
    accentHex: 0xc084fc,
    emissiveIntensity: 0.9,
  },
  {
    id: 'frost',
    name: 'subzero claws',
    rarity: 'epic',
    price: 310,
    cooldown: 3.4,
    tagline: 'freeze chasers in 3D ice blocks!',
    description: 'Razor-sharp translucent cryo gauntlets. Press E to erupt a freezing pulse that traps nearby chasers inside solid 3D ice blocks for 2.4s & starts a hyper ice-slide!',
    perks: ['[E] Freeze Chasers in 34m (2.4s!)', 'Instant frictionless cryo-slide', 'Awards +25c ankle breaks on freeze'],
    abilityName: 'FLASH FREEZE',
    abilityHint: 'FREEZE [E]',
    color: '#67e8f9',
    colorHex: 0x0ea5e9,
    accent: '#e0f2fe',
    accentHex: 0xbae6fd,
    emissiveIntensity: 0.8,
  },
  {
    id: 'power',
    name: 'seismic pistons',
    rarity: 'legendary',
    price: 380,
    cooldown: 2.5,
    tagline: 'explosive air blast shockwave!',
    description: 'Parkour Pandemic Power Gear! Oversized crimson mech-fists with hydraulic pistons. Press E to trigger a huge Air Blast launching you forward and flinging every chaser away!',
    perks: ['[E] Air Blast Launch + Mega Push', 'Flings all chasers within 32m!', 'Huge 3D shockwave ring burst'],
    abilityName: 'AIR BLAST',
    abilityHint: 'AIR BLAST [E]',
    color: '#ff5e52',
    colorHex: 0xdc2626,
    accent: '#fde047',
    accentHex: 0xfacc15,
    emissiveIntensity: 0.82,
  },
  {
    id: 'grapple',
    name: 'mag-claw',
    rarity: 'legendary',
    price: 440,
    cooldown: 2.2,
    tagline: '190m magnetic grapple hook!',
    description: 'Parkour Pandemic Grapple Gear! Aim anywhere at a wall, goalpost, or open sky and press E to fire a glowing plasma hook that slingshots you straight across the field!',
    perks: ['[E] 190-stud Plasma Grapple', 'Extreme vertical & horizontal yank', '3-prong chrome launcher pods'],
    abilityName: 'MAG-GRAPPLE',
    abilityHint: 'GRAPPLE [E]',
    color: '#e879f9',
    colorHex: 0x6b21a8,
    accent: '#f5d0fe',
    accentHex: 0xf0abfc,
    emissiveIntensity: 0.85,
  },
  {
    id: 'glider',
    name: 'sky glider',
    rarity: 'mythic',
    price: 540,
    cooldown: 3.2,
    tagline: 'updraft boost + glowing 3D wings!',
    description: 'Parkour Pandemic Glider Gear! Press E to blast skyward and pop open huge glowing holographic wings on your back — soar gracefully at 92 studs/s across the entire arena!',
    perks: ['[E] Sky Updraft + 3.0s Jet Glide', 'Deploys massive 3D glowing wings!', 'Steer freely mid-flight above all'],
    abilityName: 'WING GLIDE',
    abilityHint: 'SKY GLIDE [E]',
    color: '#fbbf24',
    colorHex: 0xf8fafc,
    accent: '#38bdf8',
    accentHex: 0x38bdf8,
    emissiveIntensity: 0.88,
  },
  {
    id: 'fusion',
    name: 'fusion core',
    rarity: 'outrageous',
    price: 760,
    cooldown: 1.9,
    tagline: 'nova dash + pulse + 2x jump + speed!',
    description: 'The Outrageous Black Hole Fusion Gear! Obsidian-gold gauntlets circled by dual spinning neon halos. Press E for an explosive Nova Dash that knocks chasers back — plus faster runs, super slides & Double Jump!',
    perks: ['[E] Hyper Nova Dash + 30m Shockwave', 'Passive: Speed Coil + Double Jump', 'Twin counter-spinning orbital rings!'],
    abilityName: 'NOVA SURGE',
    abilityHint: 'NOVA SURGE [E]',
    color: '#81f4ff',
    colorHex: 0x18181b,
    accent: '#ffd23a',
    accentHex: 0x38bdf8,
    emissiveIntensity: 0.98,
  },
];

export const OUTFITS: OutfitItem[] = [
  {
    id: 'classic',
    name: 'classic noob',
    rarity: 'common',
    price: 0,
    tagline: 'iconic roblox bloxxer look',
    quote: 'born in the iron cafe',
    shirtHex: 0x0d69ac,
    pantsHex: 0xa4bd47,
    skinHex: 0xf5cd30,
    color: '#0d69ac',
    accent: '#f5cd30',
  },
  {
    id: 'skater',
    name: 'street skater',
    rarity: 'uncommon',
    price: 100,
    tagline: 'backward cap, headphones & deck',
    quote: 'kickflip first, ask questions later',
    shirtHex: 0x232730,
    pantsHex: 0xd93838,
    skinHex: 0xf5cd30,
    sleeveHex: 0x232730,
    color: '#ef4444',
    accent: '#f5cd30',
  },
  {
    id: 'noob',
    name: 'brickbattler',
    rarity: 'rare',
    price: 160,
    tagline: 'doomspire helmet & linked sword',
    quote: 'classic crossroads legend',
    shirtHex: 0x1d6fe8,
    pantsHex: 0x334155,
    skinHex: 0xf7d53b,
    color: '#2563eb',
    accent: '#facc15',
  },
  {
    id: 'cyber',
    name: 'cyber runner',
    rarity: 'epic',
    price: 240,
    tagline: 'glowing LED visor & tech jacket',
    quote: 'blinding cyan at max speed',
    shirtHex: 0x0f172a,
    pantsHex: 0x1e293b,
    skinHex: 0xf5cd30,
    sleeveHex: 0x0ea5e9,
    color: '#06b6d4',
    accent: '#7cf2ff',
  },
  {
    id: 'violet',
    name: 'casual fit',
    rarity: 'epic',
    price: 260,
    tagline: 'beanie, varsity vest & fresh kicks',
    quote: 'effortlessly clean utg staple',
    shirtHex: 0x1e3a5f,
    pantsHex: 0x334155,
    skinHex: 0xe2e8f0,
    sleeveHex: 0xffffff,
    color: '#6366f1',
    accent: '#ffffff',
  },
  {
    id: 'bigshot',
    name: 'BIG SHOT',
    rarity: 'legendary',
    price: 360,
    tagline: 'dealmaker shades & neo wings',
    quote: "NOW'S YOUR CHANCE TO BE A [[BIG SHOT]]!",
    shirtHex: 0xdb2777,
    pantsHex: 0x18181b,
    skinHex: 0xf8fafc,
    sleeveHex: 0xf472b6,
    color: '#ec4899',
    accent: '#fde047',
  },
  {
    id: 'soldier',
    name: 'soldier',
    rarity: 'mythic',
    price: 460,
    tagline: 'steel combat helmet & bandolier',
    quote: 'if tagging is sure to result in victory...',
    shirtHex: 0xb91c1c,
    pantsHex: 0x3f2e26,
    skinHex: 0xf5cd30,
    sleeveHex: 0xb91c1c,
    color: '#ef4444',
    accent: '#fbbf24',
  },
  {
    id: 'bloxy',
    name: 'king bloxy',
    rarity: 'outrageous',
    price: 680,
    tagline: 'floating golden crown & royal cape',
    quote: 'heavy is the blocky head',
    shirtHex: 0x18181b,
    pantsHex: 0x111113,
    skinHex: 0xffe066,
    sleeveHex: 0xeab308,
    color: '#eab308',
    accent: '#81f4ff',
  },
];

/** 12 Authentic Untitled Tag Game-inspired choreographed emotes with custom synced synth beats! */
export const EMOTES: EmoteItem[] = [
  {
    id: 'wave',
    name: 'wave',
    rarity: 'common',
    price: 0,
    tagline: 'bouncy classic roblox greeting',
    quote: 'hi!!! hello!!!!!',
    bpm: 112,
    duration: 2.2,
    loop: true,
    color: '#38bdf8',
    accent: '#fef08a',
  },
  {
    id: 'cheer',
    name: 'cheer',
    rarity: 'common',
    price: 60,
    tagline: 'hyped double-hop victory pumps',
    quote: 'victory screech!!!',
    bpm: 132,
    duration: 1.8,
    loop: true,
    hasProp: 'disco',
    color: '#fde047',
    accent: '#fb923c',
  },
  {
    id: 'laugh',
    name: 'schadenfreude',
    rarity: 'uncommon',
    price: 90,
    tagline: 'point, double over & belly laugh',
    quote: 'how misfortunate for you',
    bpm: 120,
    duration: 2.2,
    loop: true,
    color: '#fb7185',
    accent: '#fde047',
  },
  {
    id: 'sit',
    name: 'chill sit',
    rarity: 'uncommon',
    price: 100,
    tagline: 'summons a bouncy beanbag & kicks feet',
    quote: 'take a seat, stay a while!',
    bpm: 88,
    duration: 4.0,
    loop: true,
    hasProp: 'seat',
    color: '#60a5fa',
    accent: '#e2e8f0',
  },
  {
    id: 'tpose',
    name: 'T-pose',
    rarity: 'rare',
    price: 130,
    tagline: 'levitate & slowly spin with aura',
    quote: 'T.',
    bpm: 76,
    duration: 3.6,
    loop: true,
    hasProp: 'tpose',
    color: '#a855f7',
    accent: '#7cf2ff',
  },
  {
    id: 'floss',
    name: 'floss',
    rarity: 'rare',
    price: 150,
    tagline: 'snappy 4-beat hip & arm swings',
    quote: 'fresh out of 2017',
    bpm: 128,
    duration: 1.88,
    loop: true,
    hasProp: 'disco',
    color: '#4ade80',
    accent: '#fde047',
  },
  {
    id: 'boston',
    name: 'breakdance',
    rarity: 'epic',
    price: 210,
    tagline: 'toprock into full floor spin-flare!',
    quote: 'break it down boston style',
    bpm: 124,
    duration: 3.8,
    loop: true,
    hasProp: 'disco',
    color: '#fb923c',
    accent: '#7cf2ff',
  },
  {
    id: 'california',
    name: 'california',
    rarity: 'epic',
    price: 240,
    tagline: 'iconic bouncy hip-sway viral dance',
    quote: "we're unforgettable!",
    bpm: 125,
    duration: 3.84,
    loop: true,
    hasProp: 'disco',
    color: '#f472b6',
    accent: '#fef08a',
    dealPercent: 25,
  },
  {
    id: 'kazotsky',
    name: 'kazotsky kick',
    rarity: 'legendary',
    price: 300,
    tagline: 'folded-arm rhythmic squat kicks!',
    quote: 'ra, ra! hop-hop-hop!',
    bpm: 138,
    duration: 1.74,
    loop: true,
    hasProp: 'disco',
    color: '#ef4444',
    accent: '#facc15',
  },
  {
    id: 'sturdy',
    name: 'sturdy',
    rarity: 'legendary',
    price: 340,
    tagline: 'low crouch whips, leg hops & spin',
    quote: 'get sturdy wit it!!',
    bpm: 142,
    duration: 3.38,
    loop: true,
    hasProp: 'disco',
    color: '#22d3ee',
    accent: '#fde047',
  },
  {
    id: 'ratdance',
    name: 'rat dance',
    rarity: 'mythic',
    price: 430,
    tagline: 'chaotic viral heel-toe turbo jig!',
    quote: "how he doin' that??",
    bpm: 148,
    duration: 3.24,
    loop: true,
    hasProp: 'disco',
    color: '#ff5e52',
    accent: '#7cf2ff',
  },
  {
    id: 'gangnam',
    name: 'gangnam',
    rarity: 'outrageous',
    price: 560,
    tagline: 'horse-gallop hops & overhead lasso!',
    quote: 'oppa valley style!!',
    bpm: 132,
    duration: 3.64,
    loop: true,
    hasProp: 'disco',
    color: '#81f4ff',
    accent: '#ff66c6',
  },
];

export const TRAILS: TrailItem[] = [
  {
    id: 'none',
    name: 'no trail',
    rarity: 'common',
    price: 0,
    tagline: 'clean footsteps only',
    quote: 'minimalist runner energy',
    colors: [],
    ribbonWidth: 0,
    particleShape: 'puff',
    color: '#94a3b8',
    accent: '#cbd5e1',
  },
  {
    id: 'cloud',
    name: 'slipstream',
    rarity: 'uncommon',
    price: 80,
    tagline: 'crisp white aero-ribbon stream',
    quote: 'smooth wind slice behind you',
    colors: [0xffffff, 0xe0f2fe, 0xbae6fd],
    ribbonWidth: 1.65,
    particleShape: 'puff',
    color: '#38bdf8',
    accent: '#ffffff',
  },
  {
    id: 'cyan',
    name: 'volt beam',
    rarity: 'rare',
    price: 160,
    tagline: 'crackling electric cyan plasma beam',
    quote: 'zipping past at 1.21 gigawatts',
    colors: [0x00f0ff, 0x38bdf8, 0xfef08a],
    ribbonWidth: 1.9,
    particleShape: 'spark',
    color: '#06b6d4',
    accent: '#fef08a',
  },
  {
    id: 'flame',
    name: 'flaming skull',
    rarity: 'epic',
    price: 250,
    tagline: 'blazing solar fire ribbon & embers',
    quote: 'too hot to tag!',
    colors: [0xffe047, 0xff8c1a, 0xff3b1f],
    ribbonWidth: 2.15,
    particleShape: 'flame',
    color: '#f97316',
    accent: '#fde047',
  },
  {
    id: 'toxic',
    name: 'subspace',
    rarity: 'legendary',
    price: 340,
    tagline: 'neon magenta beam + spinning stars',
    quote: 'watch your step (tripmine noise)',
    colors: [0xff20aa, 0xc084fc, 0x7cf2ff],
    ribbonWidth: 2.25,
    particleShape: 'star',
    color: '#ec4899',
    accent: '#81f4ff',
  },
  {
    id: 'rainbow',
    name: 'hyper prism',
    rarity: 'outrageous',
    price: 520,
    tagline: 'full-spectrum rainbow ribbon + stars',
    quote: 'taste the velocity',
    colors: [0xff4d4d, 0xffa62b, 0xffe63b, 0x52eb6a, 0x38bdf8, 0xc084fc],
    ribbonWidth: 2.45,
    particleShape: 'prism',
    color: '#81f4ff',
    accent: '#ffd23a',
  },
];

export const FX_ITEMS: FxItem[] = [
  {
    id: 'confetti',
    name: 'party popper',
    rarity: 'common',
    price: 0,
    tagline: 'colorful party burst + [runner]',
    quote: 'yay!! hooray!!',
    titleBadge: 'runner',
    style: 'confetti',
    colors: [0xff6fd8, 0xffd23a, 0x7cf2ff, 0x73f27e, 0xff5a4e],
    color: '#64748b',
    accent: '#ffd23a',
  },
  {
    id: 'volt',
    name: 'zapper',
    rarity: 'rare',
    price: 140,
    tagline: 'sky lightning bolt + [zapper]',
    quote: 'struck straight from the clouds',
    titleBadge: 'zapper',
    style: 'zapper',
    colors: [0x7cf2ff, 0x00e5ff, 0xfef08a, 0xffffff],
    color: '#0284c7',
    accent: '#7cf2ff',
  },
  {
    id: 'frost',
    name: 'glacier',
    rarity: 'epic',
    price: 210,
    tagline: '3D ice crystal spikes + [ice cold]',
    quote: 'stay frosty',
    titleBadge: 'ice cold',
    style: 'glacier',
    colors: [0xe0f2fe, 0x7dd3fc, 0x38bdf8, 0xffffff],
    color: '#0ea5e9',
    accent: '#e0f2fe',
  },
  {
    id: 'inferno',
    name: 'subspace',
    rarity: 'legendary',
    price: 310,
    tagline: 'tripmine pink shock-nova + [tripmine]',
    quote: 'BWOOOOOOM (turns everything pink)',
    titleBadge: 'tripmine',
    style: 'subspace',
    colors: [0xff20aa, 0xf472b6, 0xc084fc, 0xffffff],
    color: '#db2777',
    accent: '#ff80df',
  },
  {
    id: 'judgement',
    name: 'judgement cut',
    rarity: 'mythic',
    price: 460,
    tagline: 'katana slash sphere + [motivated]',
    quote: 'i am the storm that is tagging',
    titleBadge: 'motivated',
    style: 'judgement',
    colors: [0x7cf2ff, 0x38bdf8, 0x0f172a, 0xffffff],
    color: '#ef4444',
    accent: '#7cf2ff',
  },
  {
    id: 'crown',
    name: 'fatality gold',
    rarity: 'outrageous',
    price: 620,
    tagline: '24k coin fountain + [untouchable]',
    quote: 'pure golden tag game perfection',
    titleBadge: 'untouchable',
    style: 'midas',
    colors: [0xffd23a, 0xfef08a, 0xf59e0b, 0x81f4ff],
    color: '#eab308',
    accent: '#fef08a',
  },
];

export interface PromoCode {
  code: string;
  coins: number;
  message: string;
}

export const PROMO_CODES: PromoCode[] = [
  { code: 'ZANY', coins: 250, message: 'zany zaner!! +250 coins!' },
  { code: 'PANDEMIC', coins: 350, message: 'pandemic glove fund!! +350 coins!' },
  { code: 'THANKYOU', coins: 300, message: 'thanks for playing!! +300 coins!' },
  { code: 'DANCETIME', coins: 250, message: 'bust a move!! +250 coins!' },
  { code: 'ROBLOX_RTC', coins: 500, message: 'utg community drop!! +500 coins!' },
  { code: 'SOFTLOCKED', coins: 150, message: 'never softlocked again! +150 coins!' },
  { code: '8ACE00', coins: 180, message: 'its brat summer!! +180 coins!' },
];

export const getGlove = (id: GloveId): GloveItem => GLOVES.find((g) => g.id === id) ?? GLOVES[0];
export const getOutfit = (id: OutfitId): OutfitItem => OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
export const getEmote = (id: EmoteId): EmoteItem => EMOTES.find((e) => e.id === id) ?? EMOTES[0];
export const getTrail = (id: TrailId): TrailItem => TRAILS.find((t) => t.id === id) ?? TRAILS[0];
export const getFx = (id: FxId): FxItem => FX_ITEMS.find((f) => f.id === id) ?? FX_ITEMS[0];
