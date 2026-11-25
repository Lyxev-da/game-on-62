import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  GLOVES,
  OUTFITS,
  EMOTES,
  TRAILS,
  FX_ITEMS,
  PROMO_CODES,
  RARITIES,
  getEmote,
  getGlove,
  getOutfit,
  getTrail,
  getFx,
  type ShopCategory,
  type EmoteId,
  type GloveId,
  type OutfitId,
  type TrailId,
  type FxId,
  type RarityId,
} from './shopData';
import { effectivePrice, game, type BrowserRoute, type GameState } from './gameStore';
import { LiveCharacterPreview, ensureCosmeticThumbnails, getThumbUrl } from './ShopPreview3D';
import {
  soundFX,
  SOUNDBOARD_ITEMS,
  JUKE_PRESETS,
  MEME_CAPTIONS,
  getSoundLabel,
  type MemeSoundKey,
  type SoundTag,
} from '../utils/sound';

const PAGE_ORDER: BrowserRoute[] = ['featured', 'gloves', 'outfits', 'emotes', 'fx', 'trails', 'sounds', 'inventory'];

const ROUTE_TITLES: Record<BrowserRoute, string> = {
  home: 'home',
  featured: 'featured',
  gloves: 'gloves',
  outfits: 'outfits',
  emotes: 'emotes',
  fx: 'tag effects',
  trails: 'trails',
  sounds: 'soundboard',
  inventory: 'inventory',
  codes: 'codes',
  zany: 'zany!!',
  '503': '503 error',
};

const ROUTE_URLS: Record<BrowserRoute, string> = {
  home: 'utg://home',
  featured: 'utg://shop',
  gloves: 'utg://shop/gloves',
  outfits: 'utg://shop/outfits',
  emotes: 'utg://shop/emotes',
  fx: 'utg://shop/tageffects',
  trails: 'utg://shop/trails',
  sounds: 'utg://sounds',
  inventory: 'utg://inventory',
  codes: 'utg://codes',
  zany: 'utg://uglyburger0.user/zany',
  '503': 'utg://503',
};

const STICKY_NOTES = [
  { text: 'psst.. try code', bold: 'PANDEMIC', go: 'codes' as BrowserRoute },
  { text: 'try typing', bold: 'utg://zany', go: 'zany' as BrowserRoute },
  { text: 'free coins!!', bold: 'ROBLOX_RTC', go: 'codes' as BrowserRoute },
  { text: 'bust a move:', bold: 'DANCETIME', go: 'codes' as BrowserRoute },
];

const CONFETTI_COLORS = ['#ff5e52', '#ffd23a', '#73ff73', '#81f4ff', '#ba6eff', '#ff66c6'];

/** Chunky hand-drawn UTG black-outlined SVG icons for the vertical icon rail & headers. */
function NavIcon({ kind }: { kind: BrowserRoute }) {
  switch (kind) {
    case 'featured':
      return (
        <svg viewBox="0 0 44 44" className="utg-ico" aria-hidden="true">
          <path
            d="M22 4 27.6 15.2 40 17 31 25.8 33.2 38.2 22 32.3 10.8 38.2 13 25.8 4 17 16.4 15.2Z"
            fill="currentColor"
            stroke="#000"
            strokeWidth="3.3"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'gloves':
      return (
        <svg viewBox="0 0 44 44" className="utg-ico" aria-hidden="true">
          <path
            d="M12 24V13a2.6 2.6 0 0 1 5.2 0v7V10a2.6 2.6 0 0 1 5.2 0v10v-8.5a2.6 2.6 0 0 1 5.2 0V21l2.8-3.2a2.6 2.6 0 0 1 4 3.3L29 31.5V37H14v-5.5L9.5 25a2.5 2.5 0 0 1 2.5-1Z"
            fill="currentColor"
            stroke="#000"
            strokeWidth="3.1"
            strokeLinejoin="round"
          />
          <rect x="13" y="33" width="17" height="6" rx="2" fill="#ffd23a" stroke="#000" strokeWidth="2.8" />
        </svg>
      );
    case 'outfits':
      return (
        <svg viewBox="0 0 44 44" className="utg-ico" aria-hidden="true">
          <path
            d="M15 9h14l9 7-5 7-4-3v17H15V20l-4 3-5-7 9-7Z"
            fill="currentColor"
            stroke="#000"
            strokeWidth="3.3"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'emotes':
      return (
        <svg viewBox="0 0 44 44" className="utg-ico" aria-hidden="true">
          <circle cx="22" cy="23" r="15.5" fill="currentColor" stroke="#000" strokeWidth="3.3" />
          <circle cx="16.2" cy="19.5" r="2.4" fill="#000" />
          <circle cx="27.8" cy="19.5" r="2.4" fill="#000" />
          <path d="M15 26.5c2.4 5 11.6 5 14 0" fill="none" stroke="#000" strokeWidth="3.3" strokeLinecap="round" />
          <path d="M34 4l1.8 3.8 3.8 1.8-3.8 1.8L34 15.2l-1.8-3.8-3.8-1.8 3.8-1.8Z" fill="#ffd23a" stroke="#000" strokeWidth="2.2" />
        </svg>
      );
    case 'fx':
      return (
        <svg viewBox="0 0 44 44" className="utg-ico" aria-hidden="true">
          <polygon
            points="22,4 27,15 39,11 31,22 40,31 28,30 23,41 18,30 6,32 14,22 7,12 18,15"
            fill="currentColor"
            stroke="#000"
            strokeWidth="3.1"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'trails':
      return (
        <svg viewBox="0 0 44 44" className="utg-ico" aria-hidden="true">
          <path
            d="M6 30c8-2 14-14 28-18l4 6c-11 4-17 15-29 18l-3-6ZM10 17c6-1 10-7 18-9l2 4c-7 2-11 7-18 9l-2-4Z"
            fill="currentColor"
            stroke="#000"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'sounds':
      return (
        <svg viewBox="0 0 44 44" className="utg-ico" aria-hidden="true">
          <path
            d="M6 17h9l12-9v28l-12-9H6Z"
            fill="currentColor"
            stroke="#000"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <path d="M32 15c3.5 3.5 3.5 10.5 0 14" fill="none" stroke="#000" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M36.5 10.5c5.5 6 5.5 17 0 23" fill="none" stroke="#ff5e52" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 44 44" className="utg-ico" aria-hidden="true">
          <rect x="9" y="14" width="26" height="23" rx="5" fill="currentColor" stroke="#000" strokeWidth="3.3" />
          <path d="M16 14V10a6 6 0 0 1 12 0v4" fill="none" stroke="#000" strokeWidth="3.3" />
          <rect x="15" y="22" width="14" height="7" rx="2" fill="#ffd23a" stroke="#000" strokeWidth="2.6" />
        </svg>
      );
  }
}

function CoinSvg() {
  return (
    <span className="utg-coin-disc" aria-hidden="true">
      <span className="utg-coin-inner" />
    </span>
  );
}

interface CardProps {
  category: ShopCategory;
  id: string;
  name: string;
  rarity: RarityId;
  typeLabel: string;
  price: number;
  dealPercent?: number;
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  shaking: boolean;
  justBought: boolean;
  selected: boolean;
  onHover: () => void;
  onAction: () => void;
}

function UtgCosmeticCard({
  category,
  id,
  name,
  rarity,
  typeLabel,
  price,
  dealPercent,
  owned,
  equipped,
  canAfford,
  shaking,
  justBought,
  selected,
  onHover,
  onAction,
}: CardProps) {
  const r = RARITIES[rarity];
  const thumb = getThumbUrl(category, id);
  const finalPrice = effectivePrice(price, dealPercent);
  const showSparkle = rarity === 'legendary' || rarity === 'mythic' || rarity === 'outrageous';

  return (
    <button
      type="button"
      className={[
        'utg-card',
        r.holo ? 'is-holo' : '',
        rarity === 'mythic' || rarity === 'legendary' ? 'is-glow' : '',
        equipped ? 'is-equipped' : '',
        owned && !equipped ? 'is-owned' : '',
        !owned && !canAfford ? 'is-locked' : '',
        selected ? 'is-selected' : '',
        shaking ? 'is-shaking' : '',
        justBought ? 'is-bought' : '',
      ].filter(Boolean).join(' ')}
      style={{
        ['--r-bg' as string]: r.bg,
        ['--r-dark' as string]: r.bgDark,
      }}
      onMouseEnter={() => {
        soundFX.playHover();
        onHover();
      }}
      onFocus={onHover}
      onClick={onAction}
    >
      {/* Subtle diagonal sunburst stripe layer */}
      <span className="utg-card-rays" aria-hidden="true" />
      {r.holo && <span className="utg-card-sheen" aria-hidden="true" />}
      {showSparkle && (
        <span className="utg-card-spark" aria-hidden="true">✦</span>
      )}

      {dealPercent && !owned && (
        <span className="utg-sale-tag">-{dealPercent}%!</span>
      )}

      <div className="utg-card-top">
        {equipped ? (
          <span className="utg-card-pill is-eq">equipped ✓</span>
        ) : owned ? (
          <span className="utg-card-pill is-own">owned</span>
        ) : (
          <span className={`utg-card-price ${!canAfford ? 'is-dim' : ''}`}>
            <CoinSvg />
            <b>{finalPrice === 0 ? 'free' : finalPrice.toLocaleString()}</b>
            {dealPercent && <s className="utg-old-price">{price}</s>}
          </span>
        )}
        <div className="utg-card-meta">
          <span className="utg-card-rarity">
            {r.label}
            {r.symbol ? ` ${r.symbol}` : ''}
          </span>
          <span className="utg-card-type">{typeLabel}</span>
        </div>
      </div>

      <div className="utg-card-render-wrap">
        {thumb ? (
          <img src={thumb} alt="" className="utg-card-render" draggable={false} />
        ) : (
          <span className="utg-card-fallback" aria-hidden="true">
            {category === 'gloves' ? '🧤' : category === 'outfits' ? '👕' : category === 'emotes' ? '🕺' : category === 'trails' ? '💫' : '💥'}
          </span>
        )}
      </div>

      <div className="utg-card-name">{name}</div>
    </button>
  );
}

type FilterMode = 'all' | 'affordable' | 'owned';

export function UtgShopModal({ state }: { state: GameState }) {
  const route = state.shopRoute;
  const [history, setHistory] = useState<BrowserRoute[]>(['featured']);
  const [histIdx, setHistIdx] = useState(0);
  const [urlText, setUrlText] = useState(ROUTE_URLS[route]);
  const [homeQuery, setHomeQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [invCat, setInvCat] = useState<'all' | ShopCategory>('all');
  const [spinningRefresh, setSpinningRefresh] = useState(false);
  const [shakeKey, setShakeKey] = useState<string | null>(null);
  const [justBoughtKey, setJustBoughtKey] = useState<string | null>(null);
  const [confettiId, setConfettiId] = useState(0);
  const [burstSignal, setBurstSignal] = useState(0);
  const [emoteSignal, setEmoteSignal] = useState(0);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [stickyIdx, setStickyIdx] = useState(0);
  const [codeInput, setCodeInput] = useState('');
  const [codeFeedback, setCodeFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [zanyPop, setZanyPop] = useState('');
  const [sfxFilter, setSfxFilter] = useState<'all' | SoundTag>('all');
  const [sfxSearch, setSfxSearch] = useState('');
  const [sfxPop, setSfxPop] = useState<{ key: MemeSoundKey; caption: string; n: number } | null>(null);
  const [clockTick, setClockTick] = useState(0);

  const eq = state.progress.equipped;
  const [previewGlove, setPreviewGlove] = useState<GloveId>(eq.glove);
  const [previewOutfit, setPreviewOutfit] = useState<OutfitId>(eq.outfit);
  const [previewEmote, setPreviewEmote] = useState<EmoteId>(eq.emote);
  const [previewTrail, setPreviewTrail] = useState<TrailId>(eq.trail);
  const [previewFx, setPreviewFx] = useState<FxId>(eq.fx);
  const [inspectedCat, setInspectedCat] = useState<ShopCategory>('gloves');

  useEffect(() => {
    setUrlText(ROUTE_URLS[route]);
    setFilter('all');
    setSearch('');
    if (route === 'gloves' || route === 'outfits' || route === 'emotes' || route === 'trails' || route === 'fx') {
      setInspectedCat(route);
    }
  }, [route]);

  useEffect(() => {
    setPreviewGlove(eq.glove);
    setPreviewOutfit(eq.outfit);
    setPreviewEmote(eq.emote);
    setPreviewTrail(eq.trail);
    setPreviewFx(eq.fx);
  }, [eq.glove, eq.outfit, eq.emote, eq.trail, eq.fx]);

  // Shop clock + gentle sticky-note rotation
  useEffect(() => {
    if (!state.shopOpen) return;
    ensureCosmeticThumbnails();
    const id = window.setInterval(() => {
      setClockTick((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.shopOpen]);

  useEffect(() => {
    if (clockTick > 0 && clockTick % 9 === 0) {
      setStickyIdx((i) => (i + 1) % STICKY_NOTES.length);
    }
  }, [clockTick]);

  // Auto-advance featured spotlight mildly
  useEffect(() => {
    if (!state.shopOpen || route !== 'featured') return;
    const id = window.setInterval(() => setFeaturedIdx((i) => (i + 1) % 5), 6500);
    return () => window.clearInterval(id);
  }, [state.shopOpen, route]);

  const rotationTimer = useMemo(() => {
    const baseSec = 2 * 3600 + 28 * 60 + 47 - (clockTick % 7200);
    const h = Math.floor(baseSec / 3600);
    const m = Math.floor((baseSec % 3600) / 60);
    const s = baseSec % 60;
    return `${h}h:${m.toString().padStart(2, '0')}m:${s.toString().padStart(2, '0')}s`;
  }, [clockTick]);

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: `${6 + ((i * 37) % 88)}%`,
        delay: `${(i % 7) * 35}ms`,
        rot: `${(i * 47) % 360}deg`,
        drift: `${((i % 2 === 0 ? 1 : -1) * (18 + (i % 5) * 12))}px`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [],
  );

  if (!state.shopOpen) return null;

  const { coins, ownedGloves, ownedOutfits, ownedEmotes, ownedTrails, ownedFx, redeemedCodes, zanyClicks } =
    state.progress;

  const navigate = (next: BrowserRoute, push = true) => {
    game.setShopRoute(next);
    soundFX.playVote();
    if (push) {
      const sliced = history.slice(0, histIdx + 1);
      if (sliced[sliced.length - 1] !== next) {
        const nextHist = [...sliced, next];
        setHistory(nextHist);
        setHistIdx(nextHist.length - 1);
      }
    }
  };

  const goBack = () => {
    if (histIdx <= 0) return;
    const ni = histIdx - 1;
    setHistIdx(ni);
    navigate(history[ni], false);
  };

  const goForward = () => {
    if (histIdx >= history.length - 1) return;
    const ni = histIdx + 1;
    setHistIdx(ni);
    navigate(history[ni], false);
  };

  const routeFromText = (raw: string) => {
    const q = raw.trim().toLowerCase();
    if (q === 'utg://home' || q === 'home') navigate('home');
    else if (q === 'utg://shop' || q === 'shop' || q === 'featured') navigate('featured');
    else if (q.includes('zany') || q.includes('uglyburger')) navigate('zany');
    else if (q.includes('code')) navigate('codes');
    else if (q.includes('inv') || q.includes('item')) navigate('inventory');
    else if (q.includes('glove') || q.includes('gear') || q.includes('coil') || q.includes('glider') || q.includes('blink')) navigate('gloves');
    else if (q.includes('outfit') || q.includes('skin') || q.includes('bloxy')) navigate('outfits');
    else if (q.includes('emote') || q.includes('dance') || q.includes('rat') || q.includes('gangnam') || q.includes('kazotsky')) navigate('emotes');
    else if (q.includes('sound') || q.includes('sfx') || q.includes('juke') || q.includes('meme') || q.includes('tiktok') || q.includes('67') || q.includes('fart')) navigate('sounds');
    else if (q.includes('trail') || q.includes('prism') || q.includes('beam')) navigate('trails');
    else if (q.includes('fx') || q.includes('tag') || q.includes('judgement') || q.includes('zap')) navigate('fx');
    else navigate('503');
  };

  const onUrlSubmit = (e: FormEvent) => {
    e.preventDefault();
    routeFromText(urlText);
  };

  const fireConfetti = () => {
    setConfettiId((n) => n + 1);
    window.setTimeout(() => setConfettiId(0), 1250);
  };

  const triggerBuyOrEquip = (cat: ShopCategory, id: string) => {
    const res = game.buyOrEquip(cat, id);
    if (res === 'bought') {
      soundFX.playBuy();
      setJustBoughtKey(`${cat}:${id}`);
      fireConfetti();
      if (cat === 'fx') setBurstSignal((n) => n + 1);
      if (cat === 'emotes') setEmoteSignal((n) => n + 1);
      window.setTimeout(() => setJustBoughtKey(null), 1300);
    } else if (res === 'equipped') {
      soundFX.playEquip();
      if (cat === 'fx') setBurstSignal((n) => n + 1);
      if (cat === 'emotes') setEmoteSignal((n) => n + 1);
    } else {
      soundFX.playError();
      setShakeKey(`${cat}:${id}`);
      window.setTimeout(() => setShakeKey(null), 420);
    }
  };

  const matchFilter = (name: string, owned: boolean, price: number, deal?: number) => {
    const q = search.trim().toLowerCase();
    if (q && !name.toLowerCase().includes(q)) return false;
    if (filter === 'owned') return owned;
    if (filter === 'affordable') return !owned && coins >= effectivePrice(price, deal);
    return true;
  };

  // Spotlight carousel (5 blockbuster items!)
  const spotlights: Array<{
    cat: ShopCategory;
    id: string;
    series: string;
    sub: string;
    name: string;
    typeLabel: string;
    price: number;
    bg: string;
    accent: string;
  }> = [
    { cat: 'gloves', id: 'fusion', series: 'parkour pandemic', sub: 'Black Hole Series', name: 'fusion core', typeLabel: 'gloves · nova surge', price: 760, bg: '#0e7490', accent: '#8cf7ff' },
    { cat: 'gloves', id: 'glider', series: 'parkour pandemic', sub: 'Skybound Series', name: 'sky glider', typeLabel: 'gloves · 3D wings!', price: 540, bg: '#ea580c', accent: '#fde047' },
    { cat: 'emotes', id: 'gangnam', series: 'outrageous dance', sub: '132 BPM + Beat!', name: 'gangnam', typeLabel: 'emote · oppa hop!', price: 560, bg: '#c026d3', accent: '#8cf7ff' },
    { cat: 'gloves', id: 'frost', series: 'cryo drop', sub: 'Freeze Chasers!', name: 'subzero claws', typeLabel: 'gloves · 3D ice cube', price: 310, bg: '#0284c7', accent: '#e0f2fe' },
    { cat: 'outfits', id: 'bloxy', series: 'utg legends', sub: 'Floating Crown + Cape', name: 'king bloxy', typeLabel: 'outrageous outfit', price: 680, bg: '#ca8a04', accent: '#fef08a' },
  ];
  const spot = spotlights[featuredIdx % spotlights.length];
  const spotThumb = getThumbUrl(spot.cat, spot.id);
  const spotOwned =
    spot.cat === 'gloves'
      ? ownedGloves.includes(spot.id as GloveId)
      : spot.cat === 'emotes'
        ? ownedEmotes.includes(spot.id as EmoteId)
        : ownedOutfits.includes(spot.id as OutfitId);
  const spotEquipped =
    spot.cat === 'gloves'
      ? eq.glove === spot.id
      : spot.cat === 'emotes'
        ? eq.emote === spot.id
        : eq.outfit === spot.id;

  // Dynamic contextual right-panel inspector based on whatever category you're browsing!
  const inspectorInfo = (() => {
    if (inspectedCat === 'gloves') {
      const g = getGlove(previewGlove);
      const owned = ownedGloves.includes(g.id);
      const isEq = eq.glove === g.id;
      const cost = effectivePrice(g.price, g.dealPercent);
      return {
        cat: 'gloves' as ShopCategory,
        id: g.id,
        kicker: `glove · ${g.cooldown}s cd`,
        name: g.name,
        rarity: g.rarity,
        desc: g.description,
        bullets: g.perks,
        owned,
        isEq,
        cost,
        origPrice: g.dealPercent ? g.price : undefined,
      };
    }
    if (inspectedCat === 'emotes') {
      const e = getEmote(previewEmote);
      const owned = ownedEmotes.includes(e.id);
      const isEq = eq.emote === e.id;
      const cost = effectivePrice(e.price, e.dealPercent);
      return {
        cat: 'emotes' as ShopCategory,
        id: e.id,
        kicker: `emote · ${e.bpm} bpm ♫`,
        name: e.name,
        rarity: e.rarity,
        desc: `"${e.quote}" — ${e.tagline}`,
        bullets: ['Press [G] anytime to dance', 'Custom chiptune synth beat!', e.hasProp === 'seat' ? 'Summons a 3D blue beanbag!' : e.hasProp === 'tpose' ? 'Hovers & rotates with aura!' : 'Animated disco ring + sparkles!'],
        owned,
        isEq,
        cost,
        origPrice: e.dealPercent ? e.price : undefined,
      };
    }
    if (inspectedCat === 'outfits') {
      const o = getOutfit(previewOutfit);
      return {
        cat: 'outfits' as ShopCategory,
        id: o.id,
        kicker: '3D outfit',
        name: o.name,
        rarity: o.rarity,
        desc: `"${o.quote}"`,
        bullets: [o.tagline, 'Custom shirt art & 3D gear!'],
        owned: ownedOutfits.includes(o.id),
        isEq: eq.outfit === o.id,
        cost: o.price,
      };
    }
    if (inspectedCat === 'trails') {
      const t = getTrail(previewTrail);
      return {
        cat: 'trails' as ShopCategory,
        id: t.id,
        kicker: '3D ribbon trail',
        name: t.name,
        rarity: t.rarity,
        desc: `"${t.quote}"`,
        bullets: [t.tagline, 'Streams behind you while running!'],
        owned: ownedTrails.includes(t.id),
        isEq: eq.trail === t.id,
        cost: t.price,
      };
    }
    const f = getFx(previewFx);
    return {
      cat: 'fx' as ShopCategory,
      id: f.id,
      kicker: 'tag effect + title',
      name: f.name,
      rarity: f.rarity,
      desc: `"${f.quote}"`,
      bullets: [f.tagline, `Unlocks [${f.titleBadge}] tag!`],
      owned: ownedFx.includes(f.id),
      isEq: eq.fx === f.id,
      cost: f.price,
    };
  })();

  const inspRarity = RARITIES[inspectorInfo.rarity];
  const sticky = STICKY_NOTES[stickyIdx % STICKY_NOTES.length];
  const isCatalog = route === 'gloves' || route === 'outfits' || route === 'emotes' || route === 'trails' || route === 'fx';
  const pageIdx = Math.max(0, PAGE_ORDER.indexOf(PAGE_ORDER.includes(route) ? route : 'featured'));
  const prevRoute = PAGE_ORDER[(pageIdx - 1 + PAGE_ORDER.length) % PAGE_ORDER.length];
  const nextRoute = PAGE_ORDER[(pageIdx + 1) % PAGE_ORDER.length];

  const boostDeal = getGlove('boost');
  const caliDeal = getEmote('california');

  return (
    <div
      className="utg-browser-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Untitled Tag Game Browser Menu"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          game.setShopOpen(false);
          soundFX.playEquip();
        }
      }}
    >
      <div className="utg-browser-win">
        {/* Celebration Confetti Overlay when you buy something or claim a code! */}
        {confettiId > 0 && (
          <div key={confettiId} className="utg-confetti-layer" aria-hidden="true">
            {confettiPieces.map((p, i) => (
              <span
                key={i}
                className="utg-confetti-bit"
                style={{
                  left: p.left,
                  background: p.color,
                  animationDelay: p.delay,
                  ['--drift' as string]: p.drift,
                  ['--rot' as string]: p.rot,
                }}
              />
            ))}
          </div>
        )}

        {/* 1. Classic White UTG Window Titlebar */}
        <div className="utg-win-titlebar">
          <span className="utg-win-title">menu</span>
          <span className="utg-win-sub">untitled tag browser v2.0</span>
          <div className="utg-win-btns">
            <button
              type="button"
              className="utg-win-ctrl"
              aria-label="Minimize menu"
              onClick={() => {
                game.setShopOpen(false);
                soundFX.playEquip();
              }}
            >
              —
            </button>
            <button
              type="button"
              className="utg-win-ctrl"
              aria-label="Next page"
              onClick={() => navigate(nextRoute)}
            >
              □
            </button>
            <button
              type="button"
              className="utg-win-ctrl is-close"
              aria-label="Close menu"
              onClick={() => {
                game.setShopOpen(false);
                soundFX.playEquip();
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Authentic Browser Bar (Back/Fwd, Star, Home, Refresh, Address Bar, Coins + Green [+]) */}
        <div className="utg-addr-row">
          <button
            type="button"
            className="utg-addr-ico is-nav"
            disabled={histIdx <= 0}
            title="Back"
            onClick={goBack}
          >
            ◀
          </button>
          <button
            type="button"
            className="utg-addr-ico is-nav"
            disabled={histIdx >= history.length - 1}
            title="Forward"
            onClick={goForward}
          >
            ▶
          </button>
          <button
            type="button"
            className={`utg-addr-ico ${route === 'featured' ? 'is-lit' : ''}`}
            title="Featured Shop (utg://shop)"
            onClick={() => navigate('featured')}
          >
            ★
          </button>
          <button
            type="button"
            className={`utg-addr-ico ${route === 'home' ? 'is-lit' : ''}`}
            title="Home Hub (utg://home)"
            onClick={() => navigate('home')}
          >
            ⌂
          </button>
          <button
            type="button"
            className={`utg-addr-ico ${spinningRefresh ? 'is-spinning' : ''}`}
            title="Refresh & celebrate!"
            onClick={() => {
              setSpinningRefresh(true);
              setBurstSignal((n) => n + 1);
              soundFX.playVote();
              window.setTimeout(() => setSpinningRefresh(false), 450);
            }}
          >
            ↻
          </button>

          <form className="utg-addr-form" onSubmit={onUrlSubmit}>
            <input
              type="text"
              className="utg-addr-input"
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              aria-label="utg browser address"
            />
          </form>

          <div key={coins} className="utg-addr-coins" aria-label={`${coins} coins`}>
            <CoinSvg />
            <span className="utg-addr-coin-num">{coins.toLocaleString()}</span>
            <button
              type="button"
              className="utg-addr-plus"
              title="Free coin codes (utg://codes)!"
              onClick={() => navigate('codes')}
            >
              +
            </button>
          </div>
        </div>

        {/* 3. Body: Icon Rail + Animated Watermarked Page + Live 3D Turntable Inspector */}
        <div className="utg-browser-body">
          {/* Left Vertical Hand-Drawn Icon Rail */}
          <nav className="utg-rail" aria-label="Shop categories">
            {PAGE_ORDER.map((r) => (
              <button
                key={r}
                type="button"
                className={`utg-rail-btn ${route === r ? 'is-active' : ''}`}
                title={ROUTE_TITLES[r]}
                data-label={ROUTE_TITLES[r]}
                onClick={() => navigate(r)}
              >
                <NavIcon kind={r} />
                <span className="utg-rail-label">{r === 'fx' ? 'fx' : r === 'inventory' ? 'items' : r}</span>
              </button>
            ))}
          </nav>

          {/* Center Animated Content Page */}
          <div key={route} className="utg-page">
            {route !== 'home' && route !== 'zany' && route !== '503' && (
              <div className="utg-page-header">
                <span className="utg-page-header-ico">
                  <NavIcon kind={route === 'codes' ? 'featured' : route} />
                </span>
                <h2 className="utg-page-title">{ROUTE_TITLES[route]}</h2>
                {route !== 'inventory' && route !== 'codes' && (
                route !== 'sounds' && <span className="utg-page-timer">{rotationTimer}</span>
              )}
                {justBoughtKey && <span className="utg-bought-toast">★ unlocked & equipped!</span>}
              </div>
            )}

            {/* Quick filter & search ribbon on catalog pages */}
            {isCatalog && (
              <div className="utg-filter-bar">
                <div className="utg-filter-pills">
                  {(['all', 'affordable', 'owned'] as FilterMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`utg-fpill ${filter === m ? 'is-on' : ''}`}
                      onClick={() => {
                        setFilter(m);
                        soundFX.playHover();
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="search"
                  className="utg-search-mini"
                  placeholder={`search ${ROUTE_TITLES[route]}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}

            {/* ── utg://home (Playful Classic UTG Start Hub!) ── */}
            {route === 'home' && (
              <div className="utg-home-page">
                <div className="utg-home-logo">
                  <span>untitled</span> <b>tag shop</b>
                </div>
                <p className="utg-home-sub">welcome to your awesome browser!!</p>
                <form
                  className="utg-home-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    routeFromText(homeQuery || 'shop');
                  }}
                >
                  <input
                    type="text"
                    placeholder="search gloves, emotes, outfits, or try utg://zany..."
                    value={homeQuery}
                    onChange={(e) => setHomeQuery(e.target.value)}
                  />
                  <button type="submit">go!</button>
                </form>
                <div className="utg-home-tiles">
                  <button type="button" className="utg-home-tile" style={{ ['--t' as string]: '#ffe869' }} onClick={() => navigate('featured')}>
                    <b>★ featured</b><span>deals & hype drops</span>
                  </button>
                  <button type="button" className="utg-home-tile" style={{ ['--t' as string]: '#8cf7ff' }} onClick={() => navigate('gloves')}>
                    <b>🧤 {GLOVES.length} gloves</b><span>pandemic abilities</span>
                  </button>
                  <button type="button" className="utg-home-tile" style={{ ['--t' as string]: '#ff85d0' }} onClick={() => navigate('emotes')}>
                    <b>🕺 {EMOTES.length} emotes</b><span>dances + live beats</span>
                  </button>
                  <button type="button" className="utg-home-tile" style={{ ['--t' as string]: '#ba6eff' }} onClick={() => navigate('outfits')}>
                    <b>👕 {OUTFITS.length} outfits</b><span>3D drip & crowns</span>
                  </button>
                  <button type="button" className="utg-home-tile" style={{ ['--t' as string]: '#73ff73' }} onClick={() => navigate('codes')}>
                    <b>🐦 codes</b><span>free bonus coins!</span>
                  </button>
                  <button type="button" className="utg-home-tile" style={{ ['--t' as string]: '#ff7b72' }} onClick={() => navigate('sounds')}>
                    <b>🔊 33 sfx</b><span>tiktok 2026 & jukes!</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── PAGE 1: utg://shop FEATURED BENTO ── */}
            {route === 'featured' && (
              <div className="utg-featured-bento">
                {/* Left Tall Animated Spotlight Carousel */}
                <div
                  className="utg-spotlight-card"
                  style={{ ['--spot' as string]: spot.bg, ['--spot-acc' as string]: spot.accent }}
                  onMouseEnter={() => {
                    setInspectedCat(spot.cat);
                    if (spot.cat === 'gloves') setPreviewGlove(spot.id as GloveId);
                    else if (spot.cat === 'emotes') {
                      setPreviewEmote(spot.id as EmoteId);
                      setEmoteSignal((n) => n + 1);
                    } else setPreviewOutfit(spot.id as OutfitId);
                  }}
                >
                  <span className="utg-card-rays" aria-hidden="true" />
                  <div className="utg-spot-series-pill">{spot.series}</div>
                  <div className="utg-spot-sub">{spot.sub}</div>

                  <div className="utg-spot-stage">
                    <button
                      type="button"
                      className="utg-spot-arrow is-left"
                      aria-label="Previous featured"
                      onClick={() => {
                        setFeaturedIdx((i) => (i - 1 + spotlights.length) % spotlights.length);
                        soundFX.playVote();
                      }}
                    >
                      ‹
                    </button>
                    {spotThumb && (
                      <img key={spot.id} src={spotThumb} alt="" className="utg-spot-img" draggable={false} />
                    )}
                    <button
                      type="button"
                      className="utg-spot-arrow is-right"
                      aria-label="Next featured"
                      onClick={() => {
                        setFeaturedIdx((i) => (i + 1) % spotlights.length);
                        soundFX.playVote();
                      }}
                    >
                      ›
                    </button>
                  </div>

                  <div className="utg-spot-name">{spot.name}</div>
                  <div className="utg-spot-type">{spot.typeLabel}</div>

                  <button
                    type="button"
                    className={`utg-spot-buy ${spotEquipped ? 'is-eq' : spotOwned ? 'is-own' : ''}`}
                    onClick={() => triggerBuyOrEquip(spot.cat, spot.id)}
                  >
                    {spotEquipped ? (
                      'equipped ✓'
                    ) : spotOwned ? (
                      'equip now'
                    ) : (
                      <>
                        <CoinSvg /> <span>{spot.price.toLocaleString()}</span>
                      </>
                    )}
                  </button>

                  <div className="utg-spot-dots">
                    {spotlights.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={`Slide ${idx + 1}`}
                        className={idx === featuredIdx % spotlights.length ? 'is-on' : ''}
                        onClick={() => setFeaturedIdx(idx)}
                      />
                    ))}
                  </div>
                </div>

                {/* Right Side: Two Hot Deal Cards + Parkour Pandemic Gloves Banner */}
                <div className="utg-featured-mid">
                  <div className="utg-featured-pair">
                    <UtgCosmeticCard
                      category="gloves"
                      id={boostDeal.id}
                      name={boostDeal.name}
                      rarity={boostDeal.rarity}
                      typeLabel="gloves"
                      price={boostDeal.price}
                      dealPercent={boostDeal.dealPercent}
                      owned={ownedGloves.includes(boostDeal.id)}
                      equipped={eq.glove === boostDeal.id}
                      canAfford={coins >= effectivePrice(boostDeal.price, boostDeal.dealPercent)}
                      shaking={shakeKey === `gloves:${boostDeal.id}`}
                      justBought={justBoughtKey === `gloves:${boostDeal.id}`}
                      selected={inspectedCat === 'gloves' && previewGlove === boostDeal.id}
                      onHover={() => {
                        setInspectedCat('gloves');
                        setPreviewGlove(boostDeal.id);
                      }}
                      onAction={() => triggerBuyOrEquip('gloves', boostDeal.id)}
                    />
                    <UtgCosmeticCard
                      category="emotes"
                      id={caliDeal.id}
                      name={caliDeal.name}
                      rarity={caliDeal.rarity}
                      typeLabel="emote ♫"
                      price={caliDeal.price}
                      dealPercent={caliDeal.dealPercent}
                      owned={ownedEmotes.includes(caliDeal.id)}
                      equipped={eq.emote === caliDeal.id}
                      canAfford={coins >= effectivePrice(caliDeal.price, caliDeal.dealPercent)}
                      shaking={shakeKey === `emotes:${caliDeal.id}`}
                      justBought={justBoughtKey === `emotes:${caliDeal.id}`}
                      selected={inspectedCat === 'emotes' && previewEmote === caliDeal.id}
                      onHover={() => {
                        setInspectedCat('emotes');
                        setPreviewEmote(caliDeal.id);
                        setEmoteSignal((n) => n + 1);
                      }}
                      onAction={() => triggerBuyOrEquip('emotes', caliDeal.id)}
                    />
                  </div>

                  {/* Authentic UTG Builder's-Club-Lite Style Promo Banner! */}
                  <button
                    type="button"
                    className="utg-bcl-banner"
                    onClick={() => navigate('gloves')}
                  >
                    <div className="utg-bcl-acronym">
                      <span><b>10</b> gloves</span>
                      <span><b>12</b> emotes</span>
                    </div>
                    <ul className="utg-bcl-list">
                      <li>- speed coil & gravity coil!</li>
                      <li>- void blink teleport & subzero ice!</li>
                      <li>- sky glider 3D flying wings!</li>
                      <li>- fusion core, power blast & grapple!</li>
                    </ul>
                    <span className="utg-bcl-cta">open gloves ➜</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── PAGE 2: 10 PARKOUR PANDEMIC GLOVES ── */}
            {route === 'gloves' && (
              <div className="utg-cards-grid">
                {GLOVES.filter((g) => matchFilter(g.name, ownedGloves.includes(g.id), g.price, g.dealPercent)).map((g) => (
                  <UtgCosmeticCard
                    key={g.id}
                    category="gloves"
                    id={g.id}
                    name={g.name}
                    rarity={g.rarity}
                    typeLabel={`${g.cooldown}s · [E]`}
                    price={g.price}
                    dealPercent={g.dealPercent}
                    owned={ownedGloves.includes(g.id)}
                    equipped={eq.glove === g.id}
                    canAfford={coins >= effectivePrice(g.price, g.dealPercent)}
                    shaking={shakeKey === `gloves:${g.id}`}
                    justBought={justBoughtKey === `gloves:${g.id}`}
                    selected={inspectedCat === 'gloves' && previewGlove === g.id}
                    onHover={() => {
                      setInspectedCat('gloves');
                      setPreviewGlove(g.id);
                    }}
                    onAction={() => triggerBuyOrEquip('gloves', g.id)}
                  />
                ))}
              </div>
            )}

            {/* ── PAGE 3: OUTFITS ── */}
            {route === 'outfits' && (
              <div className="utg-cards-grid">
                {OUTFITS.filter((o) => matchFilter(o.name, ownedOutfits.includes(o.id), o.price)).map((o) => (
                  <UtgCosmeticCard
                    key={o.id}
                    category="outfits"
                    id={o.id}
                    name={o.name}
                    rarity={o.rarity}
                    typeLabel="outfit"
                    price={o.price}
                    owned={ownedOutfits.includes(o.id)}
                    equipped={eq.outfit === o.id}
                    canAfford={coins >= o.price}
                    shaking={shakeKey === `outfits:${o.id}`}
                    justBought={justBoughtKey === `outfits:${o.id}`}
                    selected={inspectedCat === 'outfits' && previewOutfit === o.id}
                    onHover={() => {
                      setInspectedCat('outfits');
                      setPreviewOutfit(o.id);
                    }}
                    onAction={() => triggerBuyOrEquip('outfits', o.id)}
                  />
                ))}
              </div>
            )}

            {/* ── PAGE 4: 12 EMOTES (Live preview on hover!) ── */}
            {route === 'emotes' && (
              <div className="utg-cards-grid">
                {EMOTES.filter((e) => matchFilter(e.name, ownedEmotes.includes(e.id), e.price, e.dealPercent)).map((e) => (
                  <UtgCosmeticCard
                    key={e.id}
                    category="emotes"
                    id={e.id}
                    name={e.name}
                    rarity={e.rarity}
                    typeLabel={`${e.bpm} bpm ♫`}
                    price={e.price}
                    dealPercent={e.dealPercent}
                    owned={ownedEmotes.includes(e.id)}
                    equipped={eq.emote === e.id}
                    canAfford={coins >= effectivePrice(e.price, e.dealPercent)}
                    shaking={shakeKey === `emotes:${e.id}`}
                    justBought={justBoughtKey === `emotes:${e.id}`}
                    selected={inspectedCat === 'emotes' && previewEmote === e.id}
                    onHover={() => {
                      setInspectedCat('emotes');
                      setPreviewEmote(e.id);
                      setEmoteSignal((n) => n + 1);
                    }}
                    onAction={() => {
                      setInspectedCat('emotes');
                      setPreviewEmote(e.id);
                      setEmoteSignal((n) => n + 1);
                      triggerBuyOrEquip('emotes', e.id);
                    }}
                  />
                ))}
              </div>
            )}

            {/* ── PAGE 5: TAG EFFECTS ── */}
            {route === 'fx' && (
              <div className="utg-cards-grid">
                {FX_ITEMS.filter((f) => matchFilter(f.name, ownedFx.includes(f.id), f.price)).map((f) => (
                  <UtgCosmeticCard
                    key={f.id}
                    category="fx"
                    id={f.id}
                    name={f.name}
                    rarity={f.rarity}
                    typeLabel="tag effect"
                    price={f.price}
                    owned={ownedFx.includes(f.id)}
                    equipped={eq.fx === f.id}
                    canAfford={coins >= f.price}
                    shaking={shakeKey === `fx:${f.id}`}
                    justBought={justBoughtKey === `fx:${f.id}`}
                    selected={inspectedCat === 'fx' && previewFx === f.id}
                    onHover={() => {
                      setInspectedCat('fx');
                      setPreviewFx(f.id);
                      setBurstSignal((n) => n + 1);
                    }}
                    onAction={() => triggerBuyOrEquip('fx', f.id)}
                  />
                ))}
              </div>
            )}

            {/* ── PAGE 6: 3D RIBBON TRAILS ── */}
            {route === 'trails' && (
              <div className="utg-cards-grid">
                {TRAILS.filter((t) => matchFilter(t.name, ownedTrails.includes(t.id), t.price)).map((t) => (
                  <UtgCosmeticCard
                    key={t.id}
                    category="trails"
                    id={t.id}
                    name={t.name}
                    rarity={t.rarity}
                    typeLabel="trail"
                    price={t.price}
                    owned={ownedTrails.includes(t.id)}
                    equipped={eq.trail === t.id}
                    canAfford={coins >= t.price}
                    shaking={shakeKey === `trails:${t.id}`}
                    justBought={justBoughtKey === `trails:${t.id}`}
                    selected={inspectedCat === 'trails' && previewTrail === t.id}
                    onHover={() => {
                      setInspectedCat('trails');
                      setPreviewTrail(t.id);
                    }}
                    onAction={() => triggerBuyOrEquip('trails', t.id)}
                  />
                ))}
              </div>
            )}

            {/* ── PAGE 7: utg://sounds — Goofy TikTok 2026 Soundboard & Juke SFX Picker! ── */}
            {route === 'sounds' && (
              <div className="utg-sfx-page">
                {/* Active Juke Sound Header Bar */}
                <div className="utg-sfx-banner">
                  <div className="utg-sfx-active">
                    <span className="utg-sfx-kicker">equipped juke sound</span>
                    <b className="utg-sfx-current">{getSoundLabel(eq.jukeSound)}</b>
                  </div>
                  <div className="utg-sfx-actions">
                    <button
                      type="button"
                      className="utg-sfx-act is-test"
                      onClick={() => {
                        soundFX.unlock();
                        const played = soundFX.playAnkleBreaker(eq.jukeSound);
                        setSfxPop({ key: played, caption: MEME_CAPTIONS[played], n: Date.now() });
                      }}
                    >
                      ▶ test juke!
                    </button>
                    <button
                      type="button"
                      className="utg-sfx-act is-stop"
                      onClick={() => {
                        soundFX.stopAllMemes();
                        setSfxPop(null);
                      }}
                    >
                      ■ stop
                    </button>
                  </div>
                </div>

                {/* Live shouting caption toast whenever a button is slapped */}
                {sfxPop && (
                  <div key={sfxPop.n} className="utg-sfx-shout" role="status">
                    🔊 {sfxPop.caption}
                  </div>
                )}

                {/* Shuffle Mix Presets for Juking */}
                <div className="utg-sfx-presets">
                  {JUKE_PRESETS.map((pr) => {
                    const active = eq.jukeSound === pr.id;
                    return (
                      <button
                        key={pr.id}
                        type="button"
                        className={`utg-sfx-preset ${active ? 'is-on' : ''}`}
                        style={{ ['--p' as string]: pr.color }}
                        onClick={() => {
                          soundFX.unlock();
                          game.setJukeSound(pr.id);
                          const k = soundFX.playAnkleBreaker(pr.id);
                          setSfxPop({ key: k, caption: MEME_CAPTIONS[k], n: Date.now() });
                        }}
                      >
                        <b>{active ? '★ ' : '🎲 '}{pr.label}</b>
                        <span>{pr.blurb}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Filter pills + search */}
                <div className="utg-filter-bar">
                  <div className="utg-filter-pills">
                    {(
                      [
                        ['all', `all (${SOUNDBOARD_ITEMS.length})`],
                        ['2026', 'tiktok 2026'],
                        ['goofy', 'goofy ahh'],
                        ['juke', 'ankle juke'],
                        ['classic', 'classic'],
                      ] as Array<['all' | SoundTag, string]>
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={`utg-fpill ${sfxFilter === id ? 'is-on' : ''}`}
                        onClick={() => setSfxFilter(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="search"
                    className="utg-search-mini"
                    placeholder="search meme sfx..."
                    value={sfxSearch}
                    onChange={(e) => setSfxSearch(e.target.value)}
                  />
                </div>

                {/* Tactile MyInstants-style 3D Goofy Soundboard Grid! */}
                <div className="utg-sfx-grid">
                  {SOUNDBOARD_ITEMS.filter((item) => {
                    if (sfxFilter !== 'all' && item.tag !== sfxFilter) return false;
                    const q = sfxSearch.trim().toLowerCase();
                    if (q && !item.label.toLowerCase().includes(q) && !item.caption.toLowerCase().includes(q)) {
                      return false;
                    }
                    return true;
                  }).map((item) => {
                    const isJuke = eq.jukeSound === item.key;
                    const blasting = sfxPop?.key === item.key;
                    return (
                      <div
                        key={item.key}
                        className={`utg-sfx-tile ${isJuke ? 'is-juke' : ''} ${blasting ? 'is-playing' : ''}`}
                        style={{ ['--btn' as string]: item.color }}
                      >
                        {item.isNew && <span className="utg-sfx-new">2026</span>}
                        <button
                          type="button"
                          className="utg-sfx-dome"
                          aria-label={`Play ${item.label}`}
                          title={`Click to blast "${item.caption}"`}
                          onClick={() => {
                            soundFX.unlock();
                            soundFX.playSoundboard(item.key);
                            setSfxPop({ key: item.key, caption: item.caption, n: Date.now() });
                          }}
                        >
                          <span className="utg-sfx-shine" aria-hidden="true" />
                          <span className="utg-sfx-play-glyph" aria-hidden="true">🔊</span>
                        </button>
                        <span className="utg-sfx-name">{item.label}</span>
                        <button
                          type="button"
                          className={`utg-sfx-pick ${isJuke ? 'is-on' : ''}`}
                          onClick={() => {
                            soundFX.unlock();
                            game.setJukeSound(item.key);
                            soundFX.playSoundboard(item.key);
                            setSfxPop({ key: item.key, caption: item.caption, n: Date.now() });
                          }}
                        >
                          {isJuke ? '★ juke sfx!' : 'use on juke'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── PAGE 8: utg://inventory (Equipped Locker) ── */}
            {route === 'inventory' && (
              <div className="utg-inv-wrap">
                <div className="utg-inv-slots">
                  {(
                    [
                      ['gloves', eq.glove, getGlove(eq.glove).name],
                      ['outfits', eq.outfit, getOutfit(eq.outfit).name],
                      ['emotes', eq.emote, getEmote(eq.emote).name],
                      ['trails', eq.trail, getTrail(eq.trail).name],
                      ['fx', eq.fx, getFx(eq.fx).name],
                    ] as Array<[ShopCategory, string, string]>
                  ).map(([cat, id, label]) => (
                    <button key={cat} type="button" className="utg-inv-slot" onClick={() => navigate(cat)}>
                      <img src={getThumbUrl(cat, id)} alt="" className="utg-inv-slot-img" />
                      <span className="utg-inv-slot-val">{label}</span>
                      <span className="utg-inv-slot-lbl">{cat}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="utg-inv-juke-bar"
                  onClick={() => navigate('sounds')}
                >
                  <span>🔊 equipped juke sound: <b>{getSoundLabel(eq.jukeSound)}</b></span>
                  <em>change sfx ➜</em>
                </button>

                <div className="utg-filter-pills">
                  {(['all', 'gloves', 'outfits', 'emotes', 'trails', 'fx'] as Array<'all' | ShopCategory>).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`utg-fpill ${invCat === c ? 'is-on' : ''}`}
                      onClick={() => setInvCat(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="utg-cards-grid">
                  {(invCat === 'all' || invCat === 'gloves') &&
                    GLOVES.filter((g) => ownedGloves.includes(g.id)).map((g) => (
                      <UtgCosmeticCard
                        key={`g-${g.id}`}
                        category="gloves"
                        id={g.id}
                        name={g.name}
                        rarity={g.rarity}
                        typeLabel="gloves"
                        price={0}
                        owned
                        equipped={eq.glove === g.id}
                        canAfford
                        shaking={false}
                        justBought={false}
                        selected={eq.glove === g.id}
                        onHover={() => { setInspectedCat('gloves'); setPreviewGlove(g.id); }}
                        onAction={() => triggerBuyOrEquip('gloves', g.id)}
                      />
                    ))}
                  {(invCat === 'all' || invCat === 'outfits') &&
                    OUTFITS.filter((o) => ownedOutfits.includes(o.id)).map((o) => (
                      <UtgCosmeticCard
                        key={`o-${o.id}`}
                        category="outfits"
                        id={o.id}
                        name={o.name}
                        rarity={o.rarity}
                        typeLabel="outfit"
                        price={0}
                        owned
                        equipped={eq.outfit === o.id}
                        canAfford
                        shaking={false}
                        justBought={false}
                        selected={eq.outfit === o.id}
                        onHover={() => { setInspectedCat('outfits'); setPreviewOutfit(o.id); }}
                        onAction={() => triggerBuyOrEquip('outfits', o.id)}
                      />
                    ))}
                  {(invCat === 'all' || invCat === 'emotes') &&
                    EMOTES.filter((e) => ownedEmotes.includes(e.id)).map((e) => (
                      <UtgCosmeticCard
                        key={`e-${e.id}`}
                        category="emotes"
                        id={e.id}
                        name={e.name}
                        rarity={e.rarity}
                        typeLabel="emote"
                        price={0}
                        owned
                        equipped={eq.emote === e.id}
                        canAfford
                        shaking={false}
                        justBought={false}
                        selected={eq.emote === e.id}
                        onHover={() => { setInspectedCat('emotes'); setPreviewEmote(e.id); setEmoteSignal((n) => n + 1); }}
                        onAction={() => triggerBuyOrEquip('emotes', e.id)}
                      />
                    ))}
                  {(invCat === 'all' || invCat === 'trails') &&
                    TRAILS.filter((t) => ownedTrails.includes(t.id) && t.id !== 'none').map((t) => (
                      <UtgCosmeticCard
                        key={`t-${t.id}`}
                        category="trails"
                        id={t.id}
                        name={t.name}
                        rarity={t.rarity}
                        typeLabel="trail"
                        price={0}
                        owned
                        equipped={eq.trail === t.id}
                        canAfford
                        shaking={false}
                        justBought={false}
                        selected={eq.trail === t.id}
                        onHover={() => { setInspectedCat('trails'); setPreviewTrail(t.id); }}
                        onAction={() => triggerBuyOrEquip('trails', t.id)}
                      />
                    ))}
                  {(invCat === 'all' || invCat === 'fx') &&
                    FX_ITEMS.filter((f) => ownedFx.includes(f.id)).map((f) => (
                      <UtgCosmeticCard
                        key={`f-${f.id}`}
                        category="fx"
                        id={f.id}
                        name={f.name}
                        rarity={f.rarity}
                        typeLabel="tag fx"
                        price={0}
                        owned
                        equipped={eq.fx === f.id}
                        canAfford
                        shaking={false}
                        justBought={false}
                        selected={eq.fx === f.id}
                        onHover={() => { setInspectedCat('fx'); setPreviewFx(f.id); setBurstSignal((n) => n + 1); }}
                        onAction={() => triggerBuyOrEquip('fx', f.id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* ── utg://codes ── */}
            {route === 'codes' && (
              <div className="utg-codes-page">
                <div className="utg-codes-card">
                  <div className="utg-codes-title">redeem codes!</div>
                  <p className="utg-codes-sub">
                    type or click any community code below for instant shop coins!
                  </p>
                  <form
                    className="utg-codes-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const res = game.redeemCode(codeInput);
                      setCodeFeedback({ ok: res.ok, msg: res.message });
                      if (res.ok) {
                        soundFX.playBuy();
                        fireConfetti();
                        setBurstSignal((n) => n + 1);
                        setCodeInput('');
                      } else {
                        soundFX.playError();
                      }
                    }}
                  >
                    <input
                      type="text"
                      className="utg-codes-input"
                      placeholder="TYPE CODE HERE..."
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                    />
                    <button type="submit" className="utg-codes-btn">
                      redeem!
                    </button>
                  </form>
                  {codeFeedback && (
                    <div className={`utg-codes-msg ${codeFeedback.ok ? 'is-ok' : 'is-err'}`}>
                      {codeFeedback.msg}
                    </div>
                  )}
                  <div className="utg-codes-chips-head">active codes (click to redeem!):</div>
                  <div className="utg-codes-chips">
                    {PROMO_CODES.map((c) => {
                      const used = redeemedCodes.includes(c.code);
                      return (
                        <button
                          key={c.code}
                          type="button"
                          className={`utg-code-chip ${used ? 'is-used' : ''}`}
                          onClick={() => {
                            if (used) return;
                            const res = game.redeemCode(c.code);
                            setCodeFeedback({ ok: res.ok, msg: res.message });
                            if (res.ok) {
                              soundFX.playBuy();
                              fireConfetti();
                              setBurstSignal((n) => n + 1);
                            }
                          }}
                        >
                          <b>{c.code}</b>
                          <span>{used ? 'claimed ✓' : `+${c.coins}c`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── utg://uglyburger0.user/zany (Secret UTG Easter Egg!) ── */}
            {route === 'zany' && (
              <div className="utg-codes-page">
                <div className="utg-codes-card is-zany">
                  <div className="utg-codes-title">zany zaner!!</div>
                  <p className="utg-codes-sub">
                    secret untitled tag browser page! mash for bonus pocket coins ({zanyClicks}/20)
                  </p>
                  <button
                    type="button"
                    className="utg-zany-btn"
                    onClick={() => {
                      const res = game.clickZany();
                      if (res.awarded > 0) {
                        soundFX.playCoin();
                        setZanyPop(res.remaining === 0 ? 'MAX ZANY!! +25c jackpot!!' : `ZANY! +${res.awarded} coins!`);
                        if (res.remaining === 0) fireConfetti();
                      } else {
                        soundFX.playBoing();
                        setZanyPop('u reached MAXIMUM zany!!');
                      }
                    }}
                  >
                    {zanyClicks >= 20 ? 'MAX ZANY ★' : 'GET ZANY!!'}
                  </button>
                  {zanyPop && <div className="utg-codes-msg is-ok">{zanyPop}</div>}
                </div>
              </div>
            )}

            {/* ── utg://503 (Authentic UTG Error Page!) ── */}
            {route === '503' && (
              <div className="utg-codes-page">
                <div className="utg-codes-card">
                  <div className="utg-codes-title">503</div>
                  <p className="utg-codes-sub">we&apos;re still working on this! try again later!</p>
                  <button type="button" className="utg-codes-btn" onClick={() => navigate('featured')}>
                    back to shop
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Live 3D Showcase Turntable + Contextual Item Card + Cheeky Sticky Note */}
          <aside className="utg-inspector">
            <LiveCharacterPreview
              glove={previewGlove}
              outfit={previewOutfit}
              emote={previewEmote}
              trail={previewTrail}
              fx={previewFx}
              focusCategory={inspectedCat}
              burstSignal={burstSignal}
              emoteSignal={emoteSignal}
            />

            <div
              className="utg-glove-spec"
              style={{ ['--spec-col' as string]: inspRarity.bg }}
            >
              <div className="utg-spec-head">
                <span className="utg-spec-kicker">{inspectorInfo.kicker}</span>
                <span className="utg-spec-rarity" style={{ background: inspRarity.bg }}>
                  {inspRarity.label}{inspRarity.symbol ? ` ${inspRarity.symbol}` : ''}
                </span>
              </div>
              <div className="utg-spec-name">{inspectorInfo.name}</div>
              <p className="utg-spec-desc">{inspectorInfo.desc}</p>
              <ul className="utg-spec-perks">
                {inspectorInfo.bullets.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <button
                type="button"
                className={`utg-spec-action ${inspectorInfo.isEq ? 'is-eq' : inspectorInfo.owned ? 'is-own' : coins < inspectorInfo.cost ? 'is-poor' : ''}`}
                onClick={() => triggerBuyOrEquip(inspectorInfo.cat, inspectorInfo.id)}
              >
                {inspectorInfo.isEq ? (
                  'equipped ✓'
                ) : inspectorInfo.owned ? (
                  `equip ${inspectorInfo.name}`
                ) : (
                  <>
                    buy · <CoinSvg /> {inspectorInfo.cost.toLocaleString()}
                    {inspectorInfo.origPrice && <s className="utg-old-price">{inspectorInfo.origPrice}</s>}
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              className="utg-sticky-note"
              onClick={() => navigate(sticky.go)}
              title="Click me!"
            >
              {sticky.text}
              <br />
              <b>{sticky.bold}</b>
            </button>
          </aside>
        </div>

        {/* 4. Classic UTG Bottom Pager + [ codes ] Button */}
        <footer className="utg-browser-foot">
          <div className="utg-pager">
            <button type="button" className="utg-page-jump" onClick={() => navigate(prevRoute)}>
              <span>{ROUTE_TITLES[prevRoute]}</span>
              <span className="utg-arrow-pill">⬅</span>
            </button>
            <span className="utg-page-num">page {pageIdx + 1}</span>
            <button type="button" className="utg-page-jump" onClick={() => navigate(nextRoute)}>
              <span className="utg-arrow-pill">➡</span>
              <span>{ROUTE_TITLES[nextRoute]}</span>
            </button>
          </div>

          <button
            type="button"
            className={`utg-codes-btn-foot ${route === 'codes' ? 'is-active' : ''}`}
            onClick={() => navigate(route === 'codes' ? 'featured' : 'codes')}
          >
            <span>codes</span>
            <span aria-hidden="true">🐦</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
