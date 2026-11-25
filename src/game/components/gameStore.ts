// @ts-nocheck -- imported game code written for looser TS settings
import {
  GLOVES,
  OUTFITS,
  TRAILS,
  FX_ITEMS,
  EMOTES,
  PROMO_CODES,
  type EmoteId,
  type GloveId,
  type OutfitId,
  type TrailId,
  type FxId,
  type ShopCategory,
} from './shopData';

import {
  ALL_MEME_KEYS,
  getSoundLabel,
  soundFX,
  type JukeSoundChoice,
} from '../utils/sound';

export type BrowserRoute =
  | 'home'
  | 'featured'
  | 'gloves'
  | 'outfits'
  | 'emotes'
  | 'fx'
  | 'trails'
  | 'sounds'
  | 'inventory'
  | 'codes'
  | 'zany'
  | '503';

export type GameMode = 'classic' | 'mega';

export interface ModeInfo {
  id: GameMode;
  name: string;
  players: number;
  chasers: number;
  blurb: string;
  coinMult: number;
  xpMult: number;
}

export const MODES: Record<GameMode, ModeInfo> = {
  classic: { id: 'classic', name: 'classic', players: 8, chasers: 1, blurb: '8 players · 1 chaser', coinMult: 1, xpMult: 1 },
  mega: { id: 'mega', name: 'MEGA 100', players: 100, chasers: 8, blurb: '100 players · 8 chasers', coinMult: 1.5, xpMult: 1.25 },
};

export const effectivePrice = (price: number, dealPercent?: number): number =>
  dealPercent ? Math.max(0, Math.round(price * (1 - dealPercent / 100))) : price;

/**
 * Round director for the Huss Valley loop:
 *
 *   intermission (map vote) -> intro (chaser reveal + countdown) -> playing -> results -> ...
 *
 * Everything advances from tick(dt). State is mutated in place by a single writer.
 */

export type Role = 'runner' | 'tagger';
export type GamePhase = 'intermission' | 'intro' | 'playing' | 'results';
export type TargetZone = 'finish' | 'start';
export type MapId = 'valley' | 'ice' | 'sunset';
export type Outcome = 'escaped' | 'survived' | 'infected' | 'chasers-win' | 'chasers-lose';

export const CROSSINGS_TO_WIN = 3;

export const TIMINGS = {
  firstIntermission: 9,
  intermission: 15,
  intro: 4.5,
  play: 165,
  results: 9,
  immunity: 3.5,
} as const;

export interface MapInfo {
  id: MapId;
  name: string;
  blurb: string;
  color: string;
}

export const MAPS: MapInfo[] = [
  { id: 'valley', name: 'the field', blurb: 'clean open tag arena', color: '#45b858' },
  { id: 'ice', name: 'ice rink', blurb: 'hyper-glide ice field', color: '#2fb4ba' },
  { id: 'sunset', name: 'sunset field', blurb: 'golden hour sprint', color: '#e8812f' },
];

export interface FeedEntry {
  id: number;
  text: string;
  actor: string;
  victim: string;
  tone?: 'tag' | 'ankle' | 'cross' | 'win' | 'taunt';
}

export interface Participant {
  id: string;
  name: string;
  isPlayer: boolean;
  role: Role;
  /** Role at the start of the round, used to score the round fairly. */
  startRole: Role;
  crossings: number;
  finished: boolean;
  infections: number;
}

export interface RoundResult {
  winner: 'runners' | 'chasers';
  outcome: Outcome;
  crossings: number;
  infections: number;
  ankles: number;
  escaped: number;
  infected: number;
  runnersTotal: number;
  xp: number;
  coins: number;
  leveledUp: boolean;
  mode: GameMode;
  /** Survival placement among everyone who started as a runner (1 = best). */
  placement: number;
}

export interface Loadout {
  glove: GloveId;
  outfit: OutfitId;
  emote: EmoteId;
  trail: TrailId;
  fx: FxId;
  jukeSound: JukeSoundChoice;
}

export interface Progress {
  coins: number;
  xp: number;
  level: number;
  ownedGloves: GloveId[];
  ownedOutfits: OutfitId[];
  ownedEmotes: EmoteId[];
  ownedTrails: TrailId[];
  ownedFx: FxId[];
  redeemedCodes: string[];
  zanyClicks: number;
  equipped: Loadout;
}

export const xpForLevel = (level: number): number => 120 + level * 60;

export interface GameState {
  phase: GamePhase;
  /** Seconds left in the current phase (intermission, intro, results). */
  phaseTime: number;
  phaseTotal: number;
  roundNumber: number;
  mapId: MapId;
  votes: Record<MapId, number>;
  myVote: MapId | null;
  roster: Participant[];
  /** Player view of the roster, kept in sync for the HUD. */
  role: Role;
  crossings: number;
  finished: boolean;
  targetZone: TargetZone;
  inSafeZone: boolean;
  /** Seconds of start-of-round immunity for a runner. */
  ntb: number;
  timeLeft: number;
  score: number;
  ankleBreaks: number;
  anklePopupId: number;
  anklePopupText: string;
  coinPopupId: number;
  coinPopupAmount: number;
  runnersAlive: number;
  chasersAlive: number;
  chaserDistance: number;
  feed: FeedEntry[];
  result: RoundResult | null;
  progress: Progress;
  shopOpen: boolean;
  shopRoute: BrowserRoute;
  emoteName: string;
  emoteTimeLeft: number;
  mode: GameMode;
  version: number;
}

const PROGRESS_KEY_V2 = 'huss-valley-progress-v2';
const LEGACY_PROGRESS_KEY = 'huss-valley-progress-v1';
const MODE_KEY = 'huss-valley-mode-v1';
const CLASSIC_BOT_NAMES = ['Builderman', 'xX_Noob_Xx', 'BaconHair', 'Guest1337', 'ankle_enjoyer', 'ItsRufus', 'GopGopGop'];
const NAME_HEADS = [
  'Noob', 'Bacon', 'Guest', 'Blox', 'Turbo', 'Speedy', 'Ankle', 'Tag', 'Parkour', 'Slide', 'Zany', 'Brick',
  'Pixel', 'Ninja', 'Coil', 'Jumpy', 'Sneaky', 'Bloxy', 'Doge', 'Robo', 'Cheese', 'Frosty', 'Lava', 'Dash',
];
const NAME_TAILS = [
  'Master', 'Kid', 'Lord', 'Runner', 'Gamer', 'Hopper', 'Tagger', 'Breaker', 'King', 'Queen', 'Pro', 'Legend',
  'Boi', 'Girl', 'Guy', 'Fan', 'Bot', 'Main', 'Enjoyer', 'Zoomer',
];

/** Deterministic, Roblox-ish bot usernames so a bot keeps its name between rounds. */
function botNameFor(i: number): string {
  if (i < CLASSIC_BOT_NAMES.length) return CLASSIC_BOT_NAMES[i];
  const head = NAME_HEADS[(i * 7) % NAME_HEADS.length];
  const tail = NAME_TAILS[(i * 13 + 5) % NAME_TAILS.length];
  const style = i % 4;
  const num = ((i * 4271) % 9000) + 100;
  if (style === 0) return `${head}${tail}${num}`;
  if (style === 1) return `xX_${head}${tail}_Xx`;
  if (style === 2) return `${head.toLowerCase()}_${tail.toLowerCase()}${num % 100}`;
  return `The${head}${tail}`;
}

function loadMode(): GameMode {
  try {
    if (typeof localStorage === 'undefined') return 'classic';
    return localStorage.getItem(MODE_KEY) === 'mega' ? 'mega' : 'classic';
  } catch {
    return 'classic';
  }
}

function saveMode(mode: GameMode): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(MODE_KEY, mode);
  } catch {
    // ignore
  }
}

const VALID_JUKE_KEYS = new Set<string>(['random-2026', 'random-all', 'random-classic', ...ALL_MEME_KEYS]);
function isValidJukeChoice(v: unknown): v is JukeSoundChoice {
  return typeof v === 'string' && VALID_JUKE_KEYS.has(v);
}

function defaultProgress(): Progress {
  return {
    coins: 260,
    xp: 0,
    level: 1,
    ownedGloves: ['tape'],
    ownedOutfits: ['classic'],
    ownedEmotes: ['wave'],
    ownedTrails: ['none'],
    ownedFx: ['confetti'],
    redeemedCodes: [],
    zanyClicks: 0,
    equipped: {
      glove: 'tape',
      outfit: 'classic',
      emote: 'wave',
      trail: 'none',
      fx: 'confetti',
      jukeSound: 'random-2026',
    },
  };
}

function loadProgress(): Progress {
  const fresh = defaultProgress();
  try {
    if (typeof localStorage === 'undefined') return fresh;
    const raw = localStorage.getItem(PROGRESS_KEY_V2);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Progress>;
      const validGloves = new Set(GLOVES.map((g) => g.id));
      const validOutfits = new Set(OUTFITS.map((o) => o.id));
      const validEmotes = new Set(EMOTES.map((e) => e.id));
      const validTrails = new Set(TRAILS.map((t) => t.id));
      const validFx = new Set(FX_ITEMS.map((f) => f.id));

      const ownedGloves = Array.from(new Set(['tape', ...(p.ownedGloves ?? []).filter((x) => validGloves.has(x))])) as GloveId[];
      const ownedOutfits = Array.from(new Set(['classic', ...(p.ownedOutfits ?? []).filter((x) => validOutfits.has(x))])) as OutfitId[];
      const ownedEmotes = Array.from(new Set(['wave', ...(p.ownedEmotes ?? []).filter((x) => validEmotes.has(x))])) as EmoteId[];
      const ownedTrails = Array.from(new Set(['none', ...(p.ownedTrails ?? []).filter((x) => validTrails.has(x))])) as TrailId[];
      const ownedFx = Array.from(new Set(['confetti', ...(p.ownedFx ?? []).filter((x) => validFx.has(x))])) as FxId[];

      const eq = p.equipped ?? fresh.equipped;
      return {
        coins: Math.max(0, Number(p.coins) || 0),
        xp: Math.max(0, Number(p.xp) || 0),
        level: Math.max(1, Number(p.level) || 1),
        ownedGloves,
        ownedOutfits,
        ownedEmotes,
        ownedTrails,
        ownedFx,
        redeemedCodes: Array.isArray(p.redeemedCodes) ? p.redeemedCodes : [],
        zanyClicks: Math.max(0, Number(p.zanyClicks) || 0),
        equipped: {
          glove: ownedGloves.includes(eq.glove) ? eq.glove : 'tape',
          outfit: ownedOutfits.includes(eq.outfit) ? eq.outfit : 'classic',
          emote: ownedEmotes.includes(eq.emote) ? eq.emote : 'wave',
          trail: ownedTrails.includes(eq.trail) ? eq.trail : 'none',
          fx: ownedFx.includes(eq.fx) ? eq.fx : 'confetti',
          jukeSound: isValidJukeChoice(eq.jukeSound) ? eq.jukeSound : 'random-2026',
        },
      };
    }

    // Migrate v1 progress if present, plus welcome bonus coins for the new shop!
    const v1Raw = localStorage.getItem(LEGACY_PROGRESS_KEY);
    if (v1Raw) {
      const v1 = JSON.parse(v1Raw);
      const migrated: Progress = {
        ...fresh,
        coins: Math.max(0, Number(v1.coins) || 0) + 160,
        xp: Math.max(0, Number(v1.xp) || 0),
        level: Math.max(1, Number(v1.level) || 1),
      };
      saveProgress(migrated);
      return migrated;
    }

    saveProgress(fresh);
    return fresh;
  } catch {
    return fresh;
  }
}

function saveProgress(p: Progress): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PROGRESS_KEY_V2, JSON.stringify(p));
    }
  } catch {
    // Ignore storage failures in restricted browsing modes.
  }
}

function freshRoster(mode: GameMode): Participant[] {
  const make = (id: string, name: string, isPlayer: boolean): Participant => ({
    id, name, isPlayer, role: 'runner', startRole: 'runner', crossings: 0, finished: false, infections: 0,
  });
  const botCount = MODES[mode].players - 1;
  const bots: Participant[] = [];
  for (let i = 0; i < botCount; i++) bots.push(make(`bot${i}`, botNameFor(i), false));
  return [make('you', 'You', true), ...bots];
}

const emptyVotes = (): Record<MapId, number> => ({ valley: 0, ice: 0, sunset: 0 });

function makeState(): GameState {
  const mode = loadMode();
  return {
    phase: 'intermission',
    phaseTime: TIMINGS.firstIntermission,
    phaseTotal: TIMINGS.firstIntermission,
    roundNumber: 0,
    mapId: 'valley',
    votes: emptyVotes(),
    myVote: null,
    roster: freshRoster(mode),
    role: 'runner',
    crossings: 0,
    finished: false,
    targetZone: 'finish',
    inSafeZone: true,
    ntb: 0,
    timeLeft: TIMINGS.play,
    score: 0,
    ankleBreaks: 0,
    anklePopupId: 0,
    anklePopupText: '',
    coinPopupId: 0,
    coinPopupAmount: 0,
    runnersAlive: MODES[mode].players,
    chasersAlive: 0,
    chaserDistance: Infinity,
    feed: [],
    result: null,
    progress: (() => {
      const pr = loadProgress();
      soundFX.jukeChoice = pr.equipped.jukeSound;
      return pr;
    })(),
    shopOpen: false,
    shopRoute: 'featured',
    emoteName: '',
    emoteTimeLeft: 0,
    mode,
    version: 0,
  };
}

let state: GameState = makeState();
const listeners = new Set<() => void>();
let feedId = 1;
let ankleId = 1;
let coinPopCounter = 1;
let forcedRole: Role | null = null;
let roundsSincePlayerChaser = 0;
let phaseElapsed = 0;
let emitAccum = 0;
let botVotes: Array<{ at: number; map: MapId; cast: boolean }> = [];
let lastCtx = { nearestThreat: Infinity, inSafeZone: false };

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

function pushFeed(actor: string, text: string, victim: string, tone: FeedEntry['tone']): void {
  state.feed = [{ id: feedId++, actor, text, victim, tone }, ...state.feed].slice(0, 5);
}

function emit(): void {
  listeners.forEach((l) => l());
}

function touch(): void {
  state.version++;
  emit();
}

function awardCoins(amount: number): void {
  if (amount <= 0) return;
  state.progress.coins += amount;
  state.coinPopupId = coinPopCounter++;
  state.coinPopupAmount = amount;
  saveProgress(state.progress);
}

function syncPlayerFields(): void {
  const s = state;
  const you = s.roster[0];
  s.role = you.role;
  s.crossings = you.crossings;
  s.finished = you.finished;
  s.targetZone = you.crossings % 2 === 0 ? 'finish' : 'start';
  s.runnersAlive = s.roster.filter((p) => p.role === 'runner').length;
  s.chasersAlive = s.roster.filter((p) => p.role === 'tagger').length;
}

function tallyVotes(): void {
  const v = emptyVotes();
  for (const b of botVotes) if (b.cast) v[b.map]++;
  if (state.myVote) v[state.myVote]++;
  state.votes = v;
}

function pickWinningMap(): MapId {
  const best = Math.max(...MAPS.map((m) => state.votes[m.id]));
  return pick(MAPS.filter((m) => state.votes[m.id] === best)).id;
}

function beginIntermission(first: boolean): void {
  const s = state;
  const length = first ? TIMINGS.firstIntermission : TIMINGS.intermission;
  s.phase = 'intermission';
  s.phaseTime = length;
  s.phaseTotal = length;
  phaseElapsed = 0;
  s.myVote = null;
  s.result = null;
  s.timeLeft = TIMINGS.play;
  s.ntb = 0;
  for (const p of s.roster) {
    p.role = 'runner';
    p.startRole = 'runner';
    p.crossings = 0;
    p.finished = false;
    p.infections = 0;
  }
  botVotes = s.roster.slice(1).map(() => ({
    at: 1 + Math.random() * Math.max(1, length - 3.5),
    map: pick(MAPS).id,
    cast: false,
  }));
  tallyVotes();
  syncPlayerFields();
}

function startIntro(): void {
  const s = state;
  s.mapId = pickWinningMap();
  s.roundNumber++;
  s.phase = 'intro';
  s.phaseTime = TIMINGS.intro;
  s.phaseTotal = TIMINGS.intro;
  phaseElapsed = 0;
  s.timeLeft = TIMINGS.play;
  s.ntb = 0;
  s.ankleBreaks = 0;
  s.result = null;

  for (const p of s.roster) {
    p.role = 'runner';
    p.startRole = 'runner';
    p.crossings = 0;
    p.finished = false;
    p.infections = 0;
  }
  const you = s.roster[0];
  const info = MODES[s.mode];
  const chaserCount = Math.max(1, Math.min(info.chasers, s.roster.length - 1));
  // The player is picked on a forced role, a fair roll, or as a pity pick after a few rounds.
  const playerOdds = s.mode === 'mega' ? 0.14 : 0.2;
  const pityRounds = s.mode === 'mega' ? 4 : 3;
  let playerIsChaser: boolean;
  if (forcedRole) playerIsChaser = forcedRole === 'tagger';
  else playerIsChaser = roundsSincePlayerChaser >= pityRounds || Math.random() < playerOdds;
  forcedRole = null;
  roundsSincePlayerChaser = playerIsChaser ? 0 : roundsSincePlayerChaser + 1;

  const chosen: Participant[] = [];
  if (playerIsChaser) chosen.push(you);
  const pool = s.roster.filter((p) => !p.isPlayer);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const p of pool) {
    if (chosen.length >= chaserCount) break;
    chosen.push(p);
  }
  for (const c of chosen) {
    c.role = 'tagger';
    c.startRole = 'tagger';
  }

  syncPlayerFields();
  if (chosen.length === 1) {
    pushFeed(chosen[0].isPlayer ? 'You' : chosen[0].name, 'is the chaser!', '', 'tag');
  } else {
    pushFeed(`${chosen.length} chasers`, playerIsChaser ? 'released · you are one!' : 'released into the field!', '', 'tag');
  }
  touch();
}

function startPlaying(): void {
  state.phase = 'playing';
  state.phaseTime = 0;
  state.ntb = state.role === 'runner' ? TIMINGS.immunity : 0;
  touch();
}

function endRound(): void {
  const s = state;
  const you = s.roster[0];
  const runners = s.roster.filter((p) => p.startRole === 'runner');
  const survivors = runners.filter((p) => p.role === 'runner');
  const winner: RoundResult['winner'] = survivors.length > 0 ? 'runners' : 'chasers';

  let outcome: Outcome;
  if (you.startRole === 'runner') {
    outcome = you.finished ? 'escaped' : you.role === 'runner' ? 'survived' : 'infected';
  } else {
    outcome = winner === 'chasers' ? 'chasers-win' : 'chasers-lose';
  }

  const info = MODES[s.mode];
  const baseXp =
    30 +
    you.crossings * 30 +
    (outcome === 'escaped' ? 120 : outcome === 'survived' ? 75 : 0) +
    you.infections * 35 +
    s.ankleBreaks * 20 +
    (outcome === 'chasers-win' ? 100 : 0);
  const baseCoins =
    35 +
    you.crossings * 18 +
    (outcome === 'escaped' ? 65 : outcome === 'survived' ? 35 : 0) +
    you.infections * 18 +
    s.ankleBreaks * 12 +
    (outcome === 'chasers-win' ? 55 : 0);
  const xp = Math.round(baseXp * info.xpMult);
  const coins = Math.round(baseCoins * info.coinMult);

  // Placement: escaped runners rank above survivors, survivors above the infected, then by crossings.
  const scoreOf = (p: Participant) => (p.finished ? 1000 : 0) + (p.role === 'runner' ? 500 : 0) + p.crossings * 10;
  const ranked = [...runners].sort((a, b) => scoreOf(b) - scoreOf(a));
  const placement = you.startRole === 'runner' ? Math.max(1, ranked.indexOf(you) + 1) : 0;

  const progress = s.progress;
  progress.xp += xp;
  progress.coins += coins;
  let leveledUp = false;
  while (progress.xp >= xpForLevel(progress.level)) {
    progress.xp -= xpForLevel(progress.level);
    progress.level++;
    progress.coins += 50; // UTG level-up coin bonus!
    leveledUp = true;
  }
  saveProgress(progress);

  s.result = {
    winner,
    outcome,
    crossings: you.crossings,
    infections: you.infections,
    ankles: s.ankleBreaks,
    escaped: runners.filter((p) => p.finished).length,
    infected: runners.filter((p) => p.role === 'tagger').length,
    runnersTotal: runners.length,
    xp,
    coins,
    leveledUp,
    mode: s.mode,
    placement,
  };
  if (outcome === 'escaped' || outcome === 'survived' || outcome === 'chasers-win') s.score++;

  s.phase = 'results';
  s.phaseTime = TIMINGS.results;
  s.phaseTotal = TIMINGS.results;
  phaseElapsed = 0;
  pushFeed(winner === 'runners' ? 'Runners' : 'Chasers', 'win the round!', '', 'win');
  touch();
}

function checkRoundEnd(): void {
  const s = state;
  if (s.timeLeft <= 0) {
    endRound();
    return;
  }
  const roster = s.roster;
  for (let i = 0; i < roster.length; i++) {
    const p = roster[i];
    if (p.role === 'runner' && !p.finished) return;
  }
  endRound();
}

export const game = {
  get state(): GameState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  tick(dt: number, ctx: { nearestThreat: number; inSafeZone: boolean }): void {
    const s = state;
    lastCtx = ctx;
    s.chaserDistance = ctx.nearestThreat;
    s.inSafeZone = ctx.inSafeZone;
    phaseElapsed += dt;
    s.phaseTime = Math.max(0, s.phaseTime - dt);
    if (s.emoteTimeLeft > 0) {
      s.emoteTimeLeft = Math.max(0, s.emoteTimeLeft - dt);
      if (s.emoteTimeLeft === 0) s.emoteName = '';
    }

    switch (s.phase) {
      case 'intermission':
        for (const b of botVotes) {
          if (!b.cast && b.at <= phaseElapsed) {
            b.cast = true;
            tallyVotes();
          }
        }
        if (s.phaseTime <= 0) startIntro();
        break;
      case 'intro':
        if (s.phaseTime <= 0) startPlaying();
        break;
      case 'playing':
        s.ntb = Math.max(0, s.ntb - dt);
        s.timeLeft = Math.max(0, s.timeLeft - dt);
        checkRoundEnd();
        break;
      case 'results':
        if (s.phaseTime <= 0) {
          beginIntermission(false);
          touch();
        }
        break;
    }

    emitAccum += dt;
    if (emitAccum >= 0.1) {
      emitAccum = 0;
      state.version++;
      emit();
    }
  },

  vote(map: MapId): void {
    if (state.phase !== 'intermission') return;
    state.myVote = map;
    tallyVotes();
    touch();
  },

  /** Switch between Classic (8) and MEGA (100) players. Only allowed in the lobby between rounds. */
  setMode(mode: GameMode): boolean {
    if (state.phase !== 'intermission') return false;
    if (state.mode === mode) return true;
    state.mode = mode;
    saveMode(mode);
    state.roster = freshRoster(mode);
    state.myVote = null;
    botVotes = state.roster.slice(1).map(() => ({
      at: phaseElapsed + Math.random() * Math.max(1, state.phaseTime - 1.5),
      map: pick(MAPS).id,
      cast: false,
    }));
    tallyVotes();
    syncPlayerFields();
    pushFeed('Lobby', mode === 'mega' ? 'switched to MEGA 100 mode!' : 'switched to classic mode', '', 'win');
    touch();
    return true;
  },

  setShopOpen(open: boolean, route?: BrowserRoute): void {
    if (route) state.shopRoute = route;
    if (state.shopOpen === open && !route) return;
    state.shopOpen = open;
    touch();
  },

  setShopRoute(route: BrowserRoute): void {
    state.shopRoute = route;
    touch();
  },

  /** Sets which viral sound plays whenever the player breaks a chaser's ankles / jukes! */
  setJukeSound(choice: JukeSoundChoice): void {
    if (!isValidJukeChoice(choice)) return;
    state.progress.equipped.jukeSound = choice;
    soundFX.jukeChoice = choice;
    saveProgress(state.progress);
    pushFeed('You', `juke SFX → ${getSoundLabel(choice)}`, '', 'ankle');
    touch();
  },

  toggleShop(route?: BrowserRoute): boolean {
    if (state.shopOpen && (!route || state.shopRoute === route)) {
      state.shopOpen = false;
    } else {
      state.shopOpen = true;
      if (route) state.shopRoute = route;
    }
    touch();
    return state.shopOpen;
  },

  redeemCode(raw: string): { ok: boolean; message: string } {
    const clean = raw.trim().toUpperCase();
    if (!clean) return { ok: false, message: 'type a code first!' };
    const found = PROMO_CODES.find((c) => c.code === clean);
    if (!found) return { ok: false, message: 'invalid code! try ZANY or PANDEMIC' };
    if (state.progress.redeemedCodes.includes(found.code)) {
      return { ok: false, message: 'already redeemed that code!' };
    }
    state.progress.redeemedCodes = [...state.progress.redeemedCodes, found.code];
    awardCoins(found.coins);
    pushFeed('You', `redeemed ${found.code} (+${found.coins}c)!`, '', 'win');
    touch();
    return { ok: true, message: found.message };
  },

  buyOrEquip(category: ShopCategory, itemId: string): 'bought' | 'equipped' | 'insufficient' {
    const p = state.progress;
    if (category === 'gloves') {
      const item = GLOVES.find((g) => g.id === itemId);
      if (!item) return 'insufficient';
      if (p.ownedGloves.includes(item.id)) {
        p.equipped.glove = item.id;
        saveProgress(p);
        touch();
        return 'equipped';
      }
      const cost = effectivePrice(item.price, item.dealPercent);
      if (p.coins < cost) return 'insufficient';
      p.coins -= cost;
      p.ownedGloves = [...p.ownedGloves, item.id];
      p.equipped.glove = item.id;
      saveProgress(p);
      pushFeed('You', `unlocked ${item.name}!`, '', 'win');
      touch();
      return 'bought';
    }

    if (category === 'emotes') {
      const item = EMOTES.find((e) => e.id === itemId);
      if (!item) return 'insufficient';
      if (p.ownedEmotes.includes(item.id)) {
        p.equipped.emote = item.id;
        saveProgress(p);
        touch();
        return 'equipped';
      }
      const cost = effectivePrice(item.price, item.dealPercent);
      if (p.coins < cost) return 'insufficient';
      p.coins -= cost;
      p.ownedEmotes = [...p.ownedEmotes, item.id];
      p.equipped.emote = item.id;
      saveProgress(p);
      pushFeed('You', `unlocked ${item.name} emote!`, '', 'win');
      touch();
      return 'bought';
    }

    if (category === 'outfits') {
      const item = OUTFITS.find((o) => o.id === itemId);
      if (!item) return 'insufficient';
      if (p.ownedOutfits.includes(item.id)) {
        p.equipped.outfit = item.id;
        saveProgress(p);
        touch();
        return 'equipped';
      }
      if (p.coins < item.price) return 'insufficient';
      p.coins -= item.price;
      p.ownedOutfits = [...p.ownedOutfits, item.id];
      p.equipped.outfit = item.id;
      saveProgress(p);
      pushFeed('You', `put on ${item.name}!`, '', 'win');
      touch();
      return 'bought';
    }

    if (category === 'trails') {
      const item = TRAILS.find((t) => t.id === itemId);
      if (!item) return 'insufficient';
      if (p.ownedTrails.includes(item.id)) {
        p.equipped.trail = item.id;
        saveProgress(p);
        touch();
        return 'equipped';
      }
      if (p.coins < item.price) return 'insufficient';
      p.coins -= item.price;
      p.ownedTrails = [...p.ownedTrails, item.id];
      p.equipped.trail = item.id;
      saveProgress(p);
      pushFeed('You', `equipped ${item.name} trail!`, '', 'win');
      touch();
      return 'bought';
    }

    const item = FX_ITEMS.find((f) => f.id === itemId);
    if (!item) return 'insufficient';
    if (p.ownedFx.includes(item.id)) {
      p.equipped.fx = item.id;
      saveProgress(p);
      touch();
      return 'equipped';
    }
    if (p.coins < item.price) return 'insufficient';
    p.coins -= item.price;
    p.ownedFx = [...p.ownedFx, item.id];
    p.equipped.fx = item.id;
    saveProgress(p);
    pushFeed('You', `unlocked [${item.titleBadge}]!`, '', 'win');
    touch();
    return 'bought';
  },

  collectMapCoin(amount = 15): void {
    awardCoins(amount);
    touch();
  },

  playEmote(name: string): void {
    state.emoteName = name;
    state.emoteTimeLeft = 3.2;
    touch();
  },

  clearEmoteToast(): void {
    if (!state.emoteName && state.emoteTimeLeft <= 0) return;
    state.emoteName = '';
    state.emoteTimeLeft = 0;
    touch();
  },

  /** Easter egg from real UTG's utg://uglyburger0.user/zany! Grants playful bonus coins up to 100c. */
  clickZany(): { awarded: number; remaining: number } {
    const p = state.progress;
    const cap = 20;
    if (p.zanyClicks >= cap) return { awarded: 0, remaining: 0 };
    p.zanyClicks += 1;
    const bonus = p.zanyClicks === cap ? 25 : 5;
    awardCoins(bonus);
    touch();
    return { awarded: bonus, remaining: cap - p.zanyClicks };
  },

  completeCrossing(id: string): 'crossing' | 'finished' | null {
    const s = state;
    if (s.phase !== 'playing') return null;
    const p = s.roster.find((r) => r.id === id);
    if (!p || p.role !== 'runner' || p.finished) return null;
    p.crossings++;
    const finished = p.crossings >= CROSSINGS_TO_WIN;
    if (finished) p.finished = true;
    if (p.isPlayer) {
      awardCoins(finished ? 40 : 20);
      pushFeed(
        'You',
        finished ? 'MADE IT ACROSS (3/3)! +40c' : `crossing ${p.crossings}/${CROSSINGS_TO_WIN} (+20c)`,
        '',
        finished ? 'win' : 'cross',
      );
    } else if (finished) {
      pushFeed(p.name, 'made it across!', '', 'cross');
    }
    // Fast inline update; skip synchronous React render on bot crossings in MEGA mode (picked up by 10Hz tick).
    if (p.isPlayer) {
      syncPlayerFields();
      touch();
    }
    return finished ? 'finished' : 'crossing';
  },

  infect(victimId: string, byId: string): boolean {
    const s = state;
    if (s.phase !== 'playing') return false;
    const victim = s.roster.find((r) => r.id === victimId);
    if (!victim || victim.role !== 'runner' || victim.finished) return false;
    if (victim.isPlayer && s.ntb > 0) return false;
    const by = s.roster.find((r) => r.id === byId);
    if (!by || by.role !== 'tagger') return false;
    victim.role = 'tagger';
    by.infections++;
    s.runnersAlive = Math.max(0, s.runnersAlive - 1);
    s.chasersAlive++;
    const involvesPlayer = victim.isPlayer || by.isPlayer;
    if (by.isPlayer) awardCoins(20);
    if (involvesPlayer || s.mode === 'classic' || Math.random() < 0.35) {
      pushFeed(
        by.isPlayer ? 'You' : by.name,
        victim.isPlayer ? 'caught you!' : by.isPlayer ? `infected ${victim.name} (+20c)` : `infected ${victim.name}`,
        victim.name,
        'tag',
      );
    }
    if (involvesPlayer) {
      syncPlayerFields();
      touch();
    }
    return true;
  },

  recordAnkleBreak(chaserName: string, line: string): void {
    state.ankleBreaks++;
    state.anklePopupId = ankleId++;
    state.anklePopupText = line;
    awardCoins(25);
    pushFeed('You', `broke ${chaserName}'s ankles! (+25c)`, chaserName, 'ankle');
    touch();
  },

  taunt(chaserName: string, line: string): void {
    pushFeed(chaserName, line, '', 'taunt');
    touch();
  },

  forceNextPlayerRole(role: Role | null): void {
    forcedRole = role;
  },

  skipPhase(): void {
    state.phaseTime = 0;
    if (state.phase === 'playing') state.timeLeft = 0;
    this.tick(0, lastCtx);
  },

  reset(): void {
    state = makeState();
    forcedRole = null;
    roundsSincePlayerChaser = 0;
    emitAccum = 0;
    beginIntermission(true);
    touch();
  },
};

beginIntermission(true);
