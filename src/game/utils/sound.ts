// @ts-nocheck -- imported game code written for looser TS settings
// Sound engine: 33 authentic MyInstants / TikTok 2026 meme MP3 clips bundled directly
// in the build (zero network fails), customizable Juke SFX, plus crisp WebAudio SFX & emote synth beats.

import whereAreYouGoing from '../assets/sounds/where-are-you-going';
import whereAreYouGoingFahhh from '../assets/sounds/where-are-you-going-fahhh';
import brokenAnkles from '../assets/sounds/broken-ankles';
import ankleBreaker from '../assets/sounds/ankle-breaker';
import vineBoom from '../assets/sounds/vine-boom';
import fahhh from '../assets/sounds/fahhh';
import metalPipe from '../assets/sounds/metal-pipe';
import bruh from '../assets/sounds/bruh';
import faaah from '../assets/sounds/faaah-63455';
import ohNo from '../assets/sounds/oh-no-no-no-laugh-56694';
import michaelHeeHee from '../assets/sounds/michael-jackson-hee-hee-40277';
import dunDun from '../assets/sounds/dun-dun-dunnnnnnnn-68584';
import hahaLaugh from '../assets/sounds/haha-funny-laugh-93061';
import gopgopgop from '../assets/sounds/gopgopgop-41469';

// New viral TikTok 2026 & classic goofy soundboard clips!
import sixSeven from '../assets/sounds/six-seven';
import getOut from '../assets/sounds/get-out';
import rizz from '../assets/sounds/rizz';
import reverbFart from '../assets/sounds/reverb-fart';
import goofyRun from '../assets/sounds/goofy-run';
import tacoBell from '../assets/sounds/taco-bell';
import bonk from '../assets/sounds/bonk';
import cartoonSlip from '../assets/sounds/cartoon-slip';
import spongebobFail from '../assets/sounds/spongebob-fail';
import xpShutdown from '../assets/sounds/xp-shutdown';
import sadTrombone from '../assets/sounds/sad-trombone';
import skibidiOof from '../assets/sounds/skibidi-oof';
import whatTheHell from '../assets/sounds/what-the-hell';
import emotionalDamage from '../assets/sounds/emotional-damage';
import airhorn from '../assets/sounds/airhorn';
import auughhh from '../assets/sounds/auughhh';
import nootNoot from '../assets/sounds/noot-noot';
import nuhUh from '../assets/sounds/nuh-uh';
import sike from '../assets/sounds/sike';

export type MemeSoundKey =
  | 'six-seven'
  | 'get-out'
  | 'rizz'
  | 'reverb-fart'
  | 'goofy-run'
  | 'taco-bell'
  | 'bonk'
  | 'cartoon-slip'
  | 'spongebob-fail'
  | 'xp-shutdown'
  | 'sad-trombone'
  | 'skibidi-oof'
  | 'what-the-hell'
  | 'emotional-damage'
  | 'airhorn'
  | 'auughhh'
  | 'noot-noot'
  | 'nuh-uh'
  | 'sike'
  | 'where-are-you-going'
  | 'where-are-you-going-fahhh'
  | 'broken-ankles'
  | 'ankle-breaker'
  | 'vine-boom'
  | 'fahhh'
  | 'metal-pipe'
  | 'bruh'
  | 'faaah'
  | 'oh-no'
  | 'hee-hee'
  | 'dun-dun'
  | 'haha'
  | 'gopgopgop';

export type JukeSoundChoice = 'random-2026' | 'random-all' | 'random-classic' | MemeSoundKey;
export type SoundTag = '2026' | 'juke' | 'goofy' | 'classic';

export interface SoundboardItem {
  key: MemeSoundKey;
  label: string;
  caption: string;
  tag: SoundTag;
  color: string;
  isNew?: boolean;
}

export const SOUNDBOARD_ITEMS: SoundboardItem[] = [
  // ── Fresh TikTok 2026 Viral Pack ──
  { key: 'six-seven', label: '6-7!!', caption: 'SIX SEVEEEN!!', tag: '2026', color: '#ff5e52', isNew: true },
  { key: 'get-out', label: 'GET OUT!', caption: 'GET OUT!!', tag: '2026', color: '#ff3838', isNew: true },
  { key: 'nuh-uh', label: 'nuh uh', caption: 'NUH UH!!', tag: '2026', color: '#fb923c', isNew: true },
  { key: 'rizz', label: 'rizz', caption: 'UNSPOKEN RIZZ!', tag: '2026', color: '#f472b6', isNew: true },
  { key: 'reverb-fart', label: 'reverb fart', caption: '*REVERB BRAAAP*', tag: 'goofy', color: '#84cc16', isNew: true },
  { key: 'goofy-run', label: 'goofy run', caption: 'SKEDADDLE!!', tag: 'goofy', color: '#38bdf8', isNew: true },
  { key: 'taco-bell', label: 'taco bell', caption: '*BONG*', tag: '2026', color: '#a855f7', isNew: true },
  { key: 'bonk', label: 'bonk!', caption: 'BONK!!', tag: 'goofy', color: '#facc15', isNew: true },
  { key: 'sike', label: 'SIKE!', caption: 'SIKE!! WRONG NUMBER!', tag: 'juke', color: '#ef4444', isNew: true },
  { key: 'what-the-hell', label: 'what the hell', caption: 'WHAT THE HELLLL?!', tag: '2026', color: '#f97316', isNew: true },
  { key: 'emotional-damage', label: 'emotional dmg', caption: 'EMOTIONAL DAMAGE!', tag: 'juke', color: '#e11d48', isNew: true },
  { key: 'auughhh', label: 'auughhh', caption: 'AUUGHHHHH!!', tag: 'goofy', color: '#a3e635', isNew: true },
  { key: 'cartoon-slip', label: 'cartoon slip', caption: '*SLIP-WHOOP!*', tag: 'goofy', color: '#22d3ee', isNew: true },
  { key: 'spongebob-fail', label: 'boo-womp', caption: 'BOO-WOMP...', tag: '2026', color: '#fde047', isNew: true },
  { key: 'xp-shutdown', label: 'xp shutdown', caption: '*WINDOWS SHUTDOWN*', tag: '2026', color: '#60a5fa', isNew: true },
  { key: 'noot-noot', label: 'noot noot', caption: 'NOOT NOOT!!', tag: '2026', color: '#818cf8', isNew: true },
  { key: 'airhorn', label: 'mlg airhorn', caption: 'BWAA BWAA BWAAA!!', tag: 'goofy', color: '#fbbf24', isNew: true },
  { key: 'sad-trombone', label: 'sad trombone', caption: 'WAH WAH WAAAH', tag: 'goofy', color: '#fb7185', isNew: true },
  { key: 'skibidi-oof', label: 'roblox oof', caption: 'OOF!!', tag: 'classic', color: '#f87171', isNew: true },

  // ── Classic Huss Valley & Ankle-Breaker Pack ──
  { key: 'broken-ankles', label: 'broken ankles', caption: 'BROKEN ANKLES!', tag: 'juke', color: '#38bdf8' },
  { key: 'ankle-breaker', label: 'ankle breaker', caption: 'ANKLE BREAKER!', tag: 'juke', color: '#22d3ee' },
  { key: 'where-are-you-going', label: 'where u going', caption: 'WHERE ARE YOU GOING?!', tag: 'juke', color: '#ffd23a' },
  { key: 'where-are-you-going-fahhh', label: 'going fahhh', caption: 'WHERE ARE YOU GOING FAHHH!', tag: 'juke', color: '#ff8a4c' },
  { key: 'vine-boom', label: 'vine boom', caption: 'BOOM!', tag: 'classic', color: '#6366f1' },
  { key: 'metal-pipe', label: 'metal pipe', caption: 'CLANG!!', tag: 'classic', color: '#94a3b8' },
  { key: 'fahhh', label: 'fahhhh', caption: 'FAHHHHH!', tag: '2026', color: '#ec4899' },
  { key: 'faaah', label: 'faaaah 2', caption: 'FAAAAH!!', tag: '2026', color: '#f43f5e' },
  { key: 'bruh', label: 'bruh', caption: 'BRUH.', tag: 'classic', color: '#64748b' },
  { key: 'oh-no', label: 'oh no no laugh', caption: 'OH NO NO NO!', tag: 'classic', color: '#eab308' },
  { key: 'hee-hee', label: 'hee hee', caption: 'HEE HEE!', tag: 'goofy', color: '#c084fc' },
  { key: 'dun-dun', label: 'dun dun dun', caption: 'DUN DUN DUNNN!', tag: 'classic', color: '#475569' },
  { key: 'haha', label: 'goofy laugh', caption: 'HAHA!!', tag: 'goofy', color: '#4ade80' },
  { key: 'gopgopgop', label: 'gop gop gop', caption: 'GOP GOP GOP!', tag: 'goofy', color: '#2dd4bf' },
];

export const JUKE_PRESETS: Array<{ id: JukeSoundChoice; label: string; blurb: string; color: string }> = [
  { id: 'random-2026', label: 'tiktok 2026 mix', blurb: 'random viral 2026 meme!', color: '#ff5cc0' },
  { id: 'random-all', label: 'full chaos mix', blurb: 'shuffles all 33 sounds!', color: '#81f4ff' },
  { id: 'random-classic', label: 'classic ankles', blurb: 'original ankle-breaker lines', color: '#ffe869' },
];

export const ALL_MEME_KEYS: MemeSoundKey[] = SOUNDBOARD_ITEMS.map((i) => i.key);

const MEME_URLS: Record<MemeSoundKey, string> = {
  'six-seven': sixSeven,
  'get-out': getOut,
  rizz,
  'reverb-fart': reverbFart,
  'goofy-run': goofyRun,
  'taco-bell': tacoBell,
  bonk,
  'cartoon-slip': cartoonSlip,
  'spongebob-fail': spongebobFail,
  'xp-shutdown': xpShutdown,
  'sad-trombone': sadTrombone,
  'skibidi-oof': skibidiOof,
  'what-the-hell': whatTheHell,
  'emotional-damage': emotionalDamage,
  airhorn,
  auughhh,
  'noot-noot': nootNoot,
  'nuh-uh': nuhUh,
  sike,
  'where-are-you-going': whereAreYouGoing,
  'where-are-you-going-fahhh': whereAreYouGoingFahhh,
  'broken-ankles': brokenAnkles,
  'ankle-breaker': ankleBreaker,
  'vine-boom': vineBoom,
  fahhh,
  'metal-pipe': metalPipe,
  bruh,
  faaah,
  'oh-no': ohNo,
  'hee-hee': michaelHeeHee,
  'dun-dun': dunDun,
  haha: hahaLaugh,
  gopgopgop,
};

const CLASSIC_ANKLE_LINES: MemeSoundKey[] = [
  'where-are-you-going',
  'where-are-you-going-fahhh',
  'broken-ankles',
  'ankle-breaker',
];

const TIKTOK_2026_JUKES: MemeSoundKey[] = [
  'six-seven',
  'get-out',
  'nuh-uh',
  'sike',
  'rizz',
  'reverb-fart',
  'goofy-run',
  'taco-bell',
  'bonk',
  'cartoon-slip',
  'emotional-damage',
  'what-the-hell',
  'xp-shutdown',
  'noot-noot',
  'airhorn',
  'fahhh',
  'broken-ankles',
  'metal-pipe',
];

const TAUNTS: MemeSoundKey[] = [
  'where-are-you-going', 'where-are-you-going-fahhh', 'six-seven', 'get-out',
  'noot-noot', 'goofy-run', 'gopgopgop', 'haha', 'hee-hee', 'auughhh',
];

const CAUGHT_SOUNDS: MemeSoundKey[] = [
  'fahhh', 'faaah', 'oh-no', 'metal-pipe', 'spongebob-fail', 'xp-shutdown',
  'sad-trombone', 'taco-bell', 'skibidi-oof', 'reverb-fart', 'emotional-damage', 'bonk',
];

/** Subtitles shown on screen for every soundboard clip. */
export const MEME_CAPTIONS: Record<MemeSoundKey, string> = Object.fromEntries(
  SOUNDBOARD_ITEMS.map((item) => [item.key, item.caption]),
) as Record<MemeSoundKey, string>;

export function getSoundLabel(choice: JukeSoundChoice): string {
  const preset = JUKE_PRESETS.find((p) => p.id === choice);
  if (preset) return preset.label;
  return SOUNDBOARD_ITEMS.find((i) => i.key === choice)?.label ?? 'broken ankles';
}

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

class SoundEffects {
  private ctx: AudioContext | null = null;
  private buffers = new Map<MemeSoundKey, AudioBuffer>();
  private decoding = new Set<MemeSoundKey>();
  private activeSources = new Set<AudioBufferSourceNode>();
  private preloadStarted = false;
  private lastAt = new Map<string, number>();
  private emoteMusicTimer: number | null = null;
  private emoteMusicId: string | null = null;
  /** Player's chosen sound effect when juking / breaking ankles! */
  public jukeChoice: JukeSoundChoice = 'random-2026';
  public muted = false;

  get loadedCount(): number {
    return this.buffers.size;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined' || this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (!this.preloadStarted) {
      this.preloadStarted = true;
      this.preloadStaggered();
    }
    return this.ctx;
  }

  unlock(): void {
    this.getContext();
  }

  /** Decodes a single clip on demand and caches it cleanly. */
  private decodeOne(key: MemeSoundKey): void {
    const ctx = this.ctx;
    if (!ctx || this.buffers.has(key) || this.decoding.has(key)) return;
    const url = MEME_URLS[key];
    if (!url) return;
    this.decoding.add(key);
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        this.buffers.set(key, decoded);
      })
      .catch(() => {})
      .finally(() => {
        this.decoding.delete(key);
      });
  }

  /** Staggered preload (2 clips at a time) so booting audio never stutters gameplay. */
  private preloadStaggered(): void {
    const queue = [...ALL_MEME_KEYS];
    const pump = () => {
      if (!this.ctx || queue.length === 0) return;
      for (let i = 0; i < 2 && queue.length > 0; i++) {
        this.decodeOne(queue.shift()!);
      }
      if (queue.length > 0) window.setTimeout(pump, 140);
    };
    window.setTimeout(pump, 120);
  }

  /** Stops any currently screaming soundboard clips (handy panic button!). */
  stopAllMemes(): void {
    for (const s of this.activeSources) {
      try { s.stop(); } catch { /* ignore */ }
    }
    this.activeSources.clear();
  }

  /** Plays a meme clip. Set cooldownMs = 0 for instant spammy soundboard clicking! */
  playMeme(key: MemeSoundKey, volume = 0.85, cooldownMs = 600): boolean {
    if (this.muted || typeof window === 'undefined') return false;
    const nowMs = performance.now();
    if (cooldownMs > 0 && nowMs - (this.lastAt.get(key) ?? -1e9) < cooldownMs) return false;
    this.lastAt.set(key, nowMs);

    const ctx = this.getContext();
    const buf = this.buffers.get(key);
    if (ctx && buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      src.connect(gain);
      gain.connect(ctx.destination);
      this.activeSources.add(src);
      src.onended = () => {
        this.activeSources.delete(src);
      };
      src.start();
      return true;
    }

    // Trigger background decode for next time and play immediately via HTMLAudio.
    if (ctx) this.decodeOne(key);
    try {
      const audio = new Audio(MEME_URLS[key]);
      audio.volume = Math.min(1, volume);
      void audio.play().catch(() => {});
    } catch {
      // Optional audio
    }
    return true;
  }

  /** Instant soundboard press (allows rapid playful re-triggers). */
  playSoundboard(key: MemeSoundKey): void {
    this.playMeme(key, 0.9, 60);
  }

  /** Juke / ankle-break: plays the player's chosen sound effect (specific clip OR chosen shuffle mix)! */
  playAnkleBreaker(override?: JukeSoundChoice): MemeSoundKey {
    const choice = override ?? this.jukeChoice;
    let key: MemeSoundKey;
    if (choice === 'random-2026') key = pick(TIKTOK_2026_JUKES);
    else if (choice === 'random-all') key = pick(ALL_MEME_KEYS);
    else if (choice === 'random-classic') key = pick(CLASSIC_ANKLE_LINES);
    else if (MEME_URLS[choice]) key = choice;
    else key = pick(TIKTOK_2026_JUKES);

    this.playMeme(key, 0.95, 320);
    return key;
  }

  /** Random goofy taunt from a nearby chaser. */
  playTaunt(): MemeSoundKey {
    const key = pick(TAUNTS);
    this.playMeme(key, 0.68, 2600);
    return key;
  }

  /** Random dramatic reaction when you get tagged. */
  playCaughtReaction(): MemeSoundKey {
    const key = pick(CAUGHT_SOUNDS);
    this.playMeme(key, 0.85, 800);
    return key;
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  playFootstep(pitch = 1): void {
    this.tone('triangle', 135 * pitch, 48 * pitch, 0.045, 0.05);
  }

  playJump(chain = 0): void {
    const base = 190 + Math.min(chain * 18, 90);
    this.tone('sine', base, base * 1.95, 0.09, 0.09);
  }

  playBoing(): void {
    this.tone('sine', 180, 980, 0.32, 0.12);
    this.tone('triangle', 420, 240, 0.22, 0.05, 0.04);
  }

  playPerfect(chain = 1): void {
    const root = 523.25 * Math.pow(2, Math.min(chain, 8) / 12);
    this.tone('sine', root, root, 0.14, 0.06);
    this.tone('sine', root * 1.5, root * 1.5, 0.14, 0.06, 0.07);
  }

  playDash(): void {
    this.tone('sawtooth', 320, 920, 0.11, 0.055);
    this.tone('sine', 240, 620, 0.12, 0.07);
  }

  playLand(intensity = 1): void {
    this.tone('sine', 110, 34, 0.075, Math.min(0.14, Math.max(0.04, intensity * 0.09)));
  }

  playSlide(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const size = Math.floor(ctx.sampleRate * 0.18);
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.18);
    filter.Q.value = 1.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  playMantle(): void {
    this.tone('sine', 260, 580, 0.14, 0.075);
    this.tone('triangle', 460, 960, 0.13, 0.045, 0.03);
  }

  playWallJump(): void {
    this.tone('square', 180, 430, 0.11, 0.04);
    this.tone('sine', 220, 430, 0.09, 0.08, 0.02);
  }

  playShiftLock(locked: boolean): void {
    this.tone('triangle', locked ? 520 : 680, locked ? 780 : 440, 0.06, 0.05);
  }

  playChainLost(): void {
    this.tone('triangle', 320, 140, 0.18, 0.04);
  }

  playCrossing(step: number): void {
    const base = 523.25 * Math.pow(1.12, step);
    this.tone('sine', base, base, 0.1, 0.08);
    this.tone('sine', base * 1.25, base * 1.25, 0.12, 0.08, 0.08);
    this.tone('sine', base * 1.5, base * 1.5, 0.2, 0.09, 0.16);
  }

  playTag(success: boolean): void {
    if (success) {
      this.tone('square', 660, 990, 0.08, 0.06);
      this.tone('square', 990, 1320, 0.12, 0.06, 0.08);
      this.playMeme(pick(['vine-boom', 'bonk', 'taco-bell', 'get-out', 'six-seven']), 0.72, 700);
    } else {
      this.tone('sawtooth', 330, 110, 0.3, 0.08);
      this.playCaughtReaction();
    }
  }

  playTick(n: number): void {
    if (n === 0) {
      this.tone('square', 880, 880, 0.22, 0.07);
      this.tone('sine', 1320, 1320, 0.3, 0.08, 0.02);
    } else {
      this.tone('square', 440, 440, 0.1, 0.05);
    }
  }

  playVote(): void {
    this.tone('triangle', 520, 780, 0.08, 0.07);
  }

  playRoundStart(): void {
    this.tone('sine', 440, 440, 0.1, 0.07);
    this.tone('sine', 554, 554, 0.1, 0.07, 0.11);
    this.tone('sine', 659, 659, 0.18, 0.08, 0.22);
  }

  playSurvive(): void {
    this.tone('sine', 523, 523, 0.12, 0.07);
    this.tone('sine', 659, 659, 0.12, 0.07, 0.12);
    this.tone('sine', 784, 784, 0.12, 0.07, 0.24);
    this.tone('sine', 1046, 1046, 0.3, 0.08, 0.36);
  }

  playCoin(): void {
    this.tone('sine', 988, 988, 0.07, 0.07);
    this.tone('sine', 1318.5, 1318.5, 0.18, 0.08, 0.065);
  }

  playBuy(): void {
    this.tone('triangle', 587, 587, 0.07, 0.08);
    this.tone('triangle', 880, 880, 0.09, 0.08, 0.07);
    this.tone('sine', 1175, 1396, 0.2, 0.09, 0.14);
  }

  playEquip(): void {
    this.tone('triangle', 520, 820, 0.09, 0.065);
  }

  playError(): void {
    this.tone('sawtooth', 190, 130, 0.16, 0.06);
  }

  playDoubleJump(): void {
    this.tone('sine', 420, 920, 0.12, 0.08);
    this.tone('triangle', 640, 1240, 0.1, 0.05, 0.03);
  }

  playWallBoost(): void {
    this.tone('sawtooth', 280, 860, 0.14, 0.055);
    this.tone('sine', 440, 1080, 0.16, 0.08, 0.02);
  }

  playPowerDash(): void {
    this.tone('sawtooth', 180, 1120, 0.18, 0.075);
    this.tone('square', 360, 720, 0.14, 0.05, 0.02);
  }

  playAirBlast(): void {
    this.tone('sawtooth', 140, 52, 0.26, 0.11);
    this.tone('sine', 340, 960, 0.18, 0.08, 0.02);
  }

  playEmote(): void {
    this.tone('triangle', 660, 990, 0.09, 0.055);
    this.tone('sine', 880, 1320, 0.14, 0.065, 0.07);
  }

  /** Playful custom synth dance loop unique to each UTG emote. */
  startEmoteMusic(emoteId: string): void {
    this.stopEmoteMusic();
    if (typeof window === 'undefined' || this.muted) return;
    this.emoteMusicId = emoteId;
    const tracks: Record<string, { stepMs: number; wave: OscillatorType; notes: number[]; bass: number[] }> = {
      wave: { stepMs: 240, wave: 'triangle', notes: [523, 659, 784, 659, 880, 784, 659, 0], bass: [261, 0, 196, 0] },
      cheer: { stepMs: 185, wave: 'triangle', notes: [523, 659, 784, 1046, 784, 1046, 1175, 1046], bass: [261, 329, 392, 329] },
      laugh: { stepMs: 180, wave: 'square', notes: [587, 523, 466, 0, 587, 523, 440, 392], bass: [196, 0, 146, 0] },
      sit: { stepMs: 340, wave: 'sine', notes: [392, 493, 587, 493, 440, 523, 659, 523], bass: [131, 0, 165, 0] },
      tpose: { stepMs: 420, wave: 'sawtooth', notes: [146, 146, 155, 138, 146, 0, 220, 138], bass: [73, 73, 78, 69] },
      floss: { stepMs: 190, wave: 'triangle', notes: [587, 0, 698, 784, 587, 880, 784, 698], bass: [147, 293, 175, 196] },
      boston: { stepMs: 175, wave: 'square', notes: [440, 523, 587, 659, 523, 0, 784, 659], bass: [110, 110, 131, 147] },
      california: { stepMs: 185, wave: 'triangle', notes: [659, 659, 784, 659, 880, 784, 659, 587], bass: [196, 261, 220, 175] },
      kazotsky: { stepMs: 155, wave: 'square', notes: [440, 523, 659, 523, 587, 494, 440, 392, 440, 523, 659, 880, 784, 659, 587, 523], bass: [110, 220, 131, 220] },
      sturdy: { stepMs: 150, wave: 'triangle', notes: [330, 0, 440, 494, 523, 0, 659, 587], bass: [82, 82, 110, 98] },
      ratdance: { stepMs: 138, wave: 'square', notes: [659, 784, 880, 784, 1046, 880, 784, 659, 587, 659, 784, 880, 1046, 1175, 1046, 784], bass: [165, 220, 196, 247] },
      gangnam: { stepMs: 162, wave: 'sawtooth', notes: [494, 494, 494, 587, 659, 0, 587, 494, 740, 740, 659, 587, 494, 0, 587, 659], bass: [123, 123, 147, 165] },
    };
    const track = tracks[emoteId] ?? tracks.wave;
    let step = 0;
    const tick = () => {
      if (this.muted || this.emoteMusicId !== emoteId) return;
      const note = track.notes[step % track.notes.length];
      if (note > 0) {
        const vol = emoteId === 'tpose' ? 0.025 : track.wave === 'sawtooth' || track.wave === 'square' ? 0.024 : 0.044;
        this.tone(track.wave, note, note * 0.996, (track.stepMs / 1000) * 0.82, vol);
      }
      if (step % 2 === 0) {
        const b = track.bass[(step >> 1) % track.bass.length];
        if (b > 0) this.tone('sine', b, b * 0.85, (track.stepMs / 1000) * 1.1, 0.048);
      }
      if (step % 4 === 2 && emoteId !== 'sit' && emoteId !== 'tpose') {
        this.tone('triangle', 1200, 320, 0.032, 0.018);
      }
      step++;
    };
    tick();
    this.emoteMusicTimer = window.setInterval(tick, track.stepMs);
  }

  stopEmoteMusic(): void {
    this.emoteMusicId = null;
    if (this.emoteMusicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.emoteMusicTimer);
      this.emoteMusicTimer = null;
    }
  }

  playHover(): void {
    this.tone('sine', 640, 760, 0.035, 0.024);
  }

  playSpeedCoil(): void {
    this.tone('sawtooth', 260, 1080, 0.22, 0.055);
    this.tone('sine', 520, 1420, 0.26, 0.065, 0.04);
  }

  playGravityCoil(): void {
    this.tone('sine', 330, 990, 0.34, 0.09);
    this.tone('triangle', 660, 1320, 0.28, 0.055, 0.05);
  }

  playBlink(): void {
    this.tone('sine', 960, 220, 0.14, 0.08);
    this.tone('triangle', 420, 1480, 0.15, 0.065, 0.05);
  }

  playFrost(): void {
    this.tone('sine', 1560, 920, 0.22, 0.07);
    this.tone('triangle', 2080, 1240, 0.28, 0.05, 0.04);
    this.tone('sine', 240, 75, 0.25, 0.08);
  }

  playGlide(): void {
    this.tone('sine', 320, 760, 0.28, 0.075);
    this.tone('triangle', 640, 1180, 0.32, 0.055, 0.06);
  }

  playFusion(): void {
    this.tone('sawtooth', 160, 52, 0.3, 0.09);
    this.tone('sine', 523, 1568, 0.26, 0.085);
    this.tone('triangle', 784, 2093, 0.28, 0.055, 0.05);
  }

  playGrapple(): void {
    this.tone('square', 480, 1380, 0.11, 0.055);
    this.tone('sine', 280, 880, 0.2, 0.075, 0.04);
  }
}

export const soundFX = new SoundEffects();

if (typeof window !== 'undefined') {
  (window as unknown as { __hussSoundCount?: () => number }).__hussSoundCount = () => soundFX.loadedCount;
}
