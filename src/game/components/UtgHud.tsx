// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { CROSSINGS_TO_WIN, MAPS, MODES, game, xpForLevel, type GameMode, type GameState, type Outcome, type Participant } from './gameStore';
import { GLOVES, getFx, getGlove } from './shopData';
import { UtgShopModal } from './UtgShopModal';
import { movementStore } from '../utils/movementStore';
import { VALLEY_BOUNDS } from './level';
import { soundFX } from '../utils/sound';

const RUNNER_COLOR = '#ffd23a';
const CHASER_COLOR = '#ff5a4e';

const OUTCOME_TEXT: Record<Outcome, string> = {
  escaped: 'you made it across!',
  survived: 'you survived the valley',
  infected: 'you got infected',
  'chasers-win': 'you infected everyone!',
  'chasers-lose': 'the runners got away',
};
const GOOD_OUTCOMES: Outcome[] = ['escaped', 'survived', 'chasers-win'];

function Pips({ done, total = CROSSINGS_TO_WIN }: { done: number; total?: number }) {
  return (
    <span className="utg-pips" aria-label={`${done} of ${total} crossings`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < done ? 'is-done' : ''} />
      ))}
    </span>
  );
}

/** Top-center pill during intermission: countdown to the next round. */
function IntermissionPill({ state }: { state: GameState }) {
  if (state.phase !== 'intermission') return null;
  return (
    <div className="utg-phase">
      <span className="utg-phase-label">intermission</span>
      <span className="utg-phase-count">{Math.ceil(state.phaseTime)}</span>
      <span className="utg-phase-sub">
        {MODES[state.mode].name} · {state.roster.length} players · vote a map · B shop
      </span>
    </div>
  );
}

/** Lobby mode picker: Classic (8 players) or MEGA 100. Press M or click. */
function ModePicker({ state }: { state: GameState }) {
  if (state.phase !== 'intermission' || state.shopOpen) return null;
  const pickMode = (m: GameMode) => {
    if (game.setMode(m)) soundFX.playVote();
  };
  return (
    <div className="utg-mode-picker" role="group" aria-label="Game mode">
      <span className="utg-mode-label">mode <kbd>M</kbd></span>
      {(Object.keys(MODES) as GameMode[]).map((m) => {
        const info = MODES[m];
        const on = state.mode === m;
        return (
          <button
            key={m}
            type="button"
            className={`utg-mode-btn is-${m} ${on ? 'is-on' : ''}`}
            onClick={(e) => {
              e.currentTarget.blur();
              pickMode(m);
            }}
          >
            <b>{info.name}</b>
            <span>{info.blurb}</span>
            {m === 'mega' && <em className="utg-mode-bonus">x1.5 coins</em>}
          </button>
        );
      })}
    </div>
  );
}

/** Map vote: three colored cards like UTG's gamemode list. Keys 1-3 or click. */
function VotePanel({ state }: { state: GameState }) {
  if (state.phase !== 'intermission' || state.shopOpen) return null;
  const leading = Math.max(...MAPS.map((m) => state.votes[m.id]));
  return (
    <div className="utg-vote" role="group" aria-label="Map vote">
      {MAPS.map((m, i) => {
        const votes = state.votes[m.id];
        const selected = state.myVote === m.id;
        return (
          <button
            key={m.id}
            type="button"
            className={`utg-vote-card ${selected ? 'is-selected' : ''} ${votes === leading && votes > 0 ? 'is-leading' : ''}`}
            style={{ ['--card' as string]: m.color }}
            onClick={(e) => {
              e.currentTarget.blur();
              game.vote(m.id);
              soundFX.playVote();
            }}
          >
            <span className="utg-vote-key">{i + 1}</span>
            <span className="utg-vote-name">{m.name}</span>
            <span className="utg-vote-blurb">{m.blurb}</span>
            <span className="utg-vote-count">
              {votes} {votes === 1 ? 'vote' : 'votes'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Top-center round timer with the objective and crossing pips. */
function RoundTimer({ state }: { state: GameState }) {
  if (state.phase !== 'playing') return null;
  const t = Math.ceil(state.timeLeft);
  const urgent = state.timeLeft < 15;
  const runner = state.role === 'runner';
  return (
    <div className={`utg-timer ${urgent ? 'utg-timer--urgent' : ''}`}>
      <span className="utg-timer-value">
        {Math.floor(t / 60)}:{(t % 60).toString().padStart(2, '0')}
      </span>
      <span className="utg-objective">
        {!runner
          ? 'infect every runner'
          : state.finished
            ? 'you made it · safe'
            : `go ${state.targetZone.toUpperCase()}`}
      </span>
      {runner && <Pips done={state.crossings} />}
      <div className="utg-counts">
        <span className="is-runners">{state.runnersAlive} runners</span>
        <span className="is-chasers">{state.chasersAlive} chasers</span>
      </div>
    </div>
  );
}

/** Ultra-fast zero-reflow canvas START -> FINISH strip (smoothly paints 8 OR 100 players with 0 DOM churn!). */
function ValleyStrip({ state }: { state: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visible = (state.phase === 'playing' || state.phase === 'intro') && !state.shopOpen;
  const mega = state.roster.length > 20;

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    let lastDraw = 0;
    const span = VALLEY_BOUNDS.START_LINE_Z - VALLEY_BOUNDS.FINISH_LINE_Z;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - lastDraw < 33) return; // crisp 30fps, zero overhead
      lastDraw = now;
      const cv = canvasRef.current;
      const live = (window as unknown as {
        __hussStrip?: { count: number; z: Float32Array; flags: Uint8Array };
      }).__hussStrip;
      if (!cv || !live || live.count === 0) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      const w = cv.width;
      const h = cv.height;
      const pad = 10;
      const trackW = w - pad * 2;
      const cy = h * 0.5;
      ctx.clearRect(0, 0, w, h);

      // Rounded track pill with start green & finish gold end-caps
      const trH = 10;
      const trY = cy - trH / 2;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pad, trY, trackW, trH, 5);
      ctx.clip();
      ctx.fillStyle = 'rgba(20, 20, 24, 0.8)';
      ctx.fillRect(pad, trY, trackW, trH);
      ctx.fillStyle = '#4cd36a';
      ctx.fillRect(pad, trY, trackW * 0.075, trH);
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(pad + trackW * 0.925, trY, trackW * 0.075, trH);
      ctx.restore();
      ctx.strokeStyle = '#171717';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(pad, trY, trackW, trH, 5);
      ctx.stroke();

      const n = live.count;
      const zArr = live.z;
      const fArr = live.flags;
      const dotR = n > 20 ? 3.2 : 5;

      // Bots first (subtle vertical stagger in MEGA so crowds read like a wave!)
      for (let i = 1; i < n; i++) {
        const f = fArr[i];
        const t = Math.min(1, Math.max(0, (VALLEY_BOUNDS.START_LINE_Z - zArr[i]) / span));
        const x = pad + t * trackW;
        const y = n > 20 ? cy + (((i % 5) - 2) * 1.4) : cy;
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = (f & 1) !== 0 ? '#ff5a4e' : (f & 2) !== 0 ? '#73f27e' : '#f1f5f9';
        ctx.fill();
        if (n <= 20) {
          ctx.strokeStyle = '#171717';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }

      // Draw YOU prominent right on top!
      const yf = fArr[0];
      const yt = Math.min(1, Math.max(0, (VALLEY_BOUNDS.START_LINE_Z - zArr[0]) / span));
      const yx = pad + yt * trackW;
      ctx.beginPath();
      ctx.arc(yx, cy, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = (yf & 1) !== 0 ? '#ff5a4e' : '#ffd23a';
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(yx, cy, 8.6, 0, Math.PI * 2);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#111111';
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className={`utg-strip ${mega ? 'is-mega' : ''}`} aria-hidden="true">
      <span className="utg-strip-end">start</span>
      <canvas ref={canvasRef} width={mega ? 420 : 340} height={24} className="utg-strip-canvas" />
      <span className="utg-strip-end">finish</span>
    </div>
  );
}

/** Intro: role reveal with a colored vignette and the countdown. */
function RoleSplash({ state }: { state: GameState }) {
  if (state.phase !== 'intro' || state.shopOpen) return null;
  const chaser = state.roster.find((p) => p.role === 'tagger');
  const youChaser = state.role === 'tagger';
  const color = youChaser ? CHASER_COLOR : RUNNER_COLOR;
  const n = Math.ceil(state.phaseTime);
  const map = MAPS.find((m) => m.id === state.mapId);
  return (
    <div className="utg-splash" style={{ ['--role' as string]: color }}>
      <div className="utg-edge" />
      <div className="utg-splash-body">
        <span className="utg-splash-map" style={{ ['--card' as string]: map?.color }}>
          {map?.name} · round {state.roundNumber}
        </span>
        <span className="utg-splash-you">you are a</span>
        <span className="utg-splash-role">{youChaser ? 'CHASER' : 'RUNNER'}</span>
        <span className="utg-splash-sub">
          {state.mode === 'mega'
            ? youChaser
              ? `you + ${state.chasersAlive - 1} other chasers · infect all ${state.runnersAlive} runners!`
              : `${state.chasersAlive} chasers vs ${state.runnersAlive} runners · cross ${CROSSINGS_TO_WIN} times!`
            : youChaser
              ? 'infect every runner before they cross'
              : `${chaser?.name ?? 'someone'} is the chaser · make it across ${CROSSINGS_TO_WIN} times`}
        </span>
        {n <= 3 && <span key={n} className="utg-splash-count">{n}</span>}
      </div>
    </div>
  );
}

function InfectedVignette({ state }: { state: GameState }) {
  const [flash, setFlash] = useState(0);
  const prev = useRef({ role: state.role, phase: state.phase });
  useEffect(() => {
    if (prev.current.phase === 'playing' && state.phase === 'playing' && prev.current.role === 'runner' && state.role === 'tagger') {
      setFlash(Date.now());
    }
    prev.current = { role: state.role, phase: state.phase };
  }, [state.role, state.phase]);
  if (!flash) return null;
  return <div key={flash} className="utg-edge utg-edge--flash" style={{ ['--role' as string]: CHASER_COLOR }} />;
}

function CenterFlash({ state }: { state: GameState }) {
  const [msg, setMsg] = useState<{ text: string; color: string; id: number } | null>(null);
  const last = useRef({ phase: state.phase, role: state.role, crossings: state.crossings, ankle: state.anklePopupId });

  useEffect(() => {
    const prev = last.current;
    let text = '';
    let color = '#fff';
    if (state.anklePopupId !== prev.ankle) {
      text = state.anklePopupText || 'ANKLE BREAKER!';
      color = '#7cf2ff';
    } else if (state.phase === 'playing' && prev.phase === 'intro') {
      text = state.role === 'tagger' ? 'HUNT THEM!' : 'CROSS THE VALLEY!';
      color = state.role === 'tagger' ? CHASER_COLOR : RUNNER_COLOR;
    } else if (state.phase === 'playing' && prev.role === 'runner' && state.role === 'tagger') {
      text = "CAUGHT! YOU'RE A CHASER!";
      color = CHASER_COLOR;
    } else if (state.phase === 'playing' && state.crossings > prev.crossings) {
      text = state.crossings >= CROSSINGS_TO_WIN ? 'MADE IT ACROSS!' : `CROSSING ${state.crossings}/${CROSSINGS_TO_WIN}!`;
      color = '#73f27e';
    }
    last.current = { phase: state.phase, role: state.role, crossings: state.crossings, ankle: state.anklePopupId };
    if (!text) return;
    setMsg({ text, color, id: Date.now() + Math.random() });
    const t = window.setTimeout(() => setMsg(null), 1500);
    return () => window.clearTimeout(t);
  }, [state.phase, state.role, state.crossings, state.anklePopupId, state.anklePopupText]);

  if (!msg || state.shopOpen) return null;
  return (
    <div key={msg.id} className="utg-flash" style={{ color: msg.color }}>
      {msg.text}
    </div>
  );
}

function RoleBanner({ state }: { state: GameState }) {
  if (state.phase !== 'playing') return null;
  const chaser = state.role === 'tagger';
  const sub = chaser
    ? 'touch or click runners to infect'
    : state.finished
      ? 'safe · wait for the round to end'
      : state.inSafeZone
        ? 'safe zone · cross to score'
        : state.ntb > 0
          ? `shield · ${state.ntb.toFixed(1)}s`
          : `reach ${state.targetZone.toUpperCase()}`;
  return (
    <div className="utg-role" style={{ ['--role' as string]: chaser ? CHASER_COLOR : RUNNER_COLOR }}>
      <span className="utg-role-you">you are a</span>
      <span className="utg-role-name">{chaser ? 'CHASER' : 'RUNNER'}</span>
      <span className="utg-role-sub">{sub}</span>
    </div>
  );
}

/** Clean bottom-left Equipped Glove Ability bar ([E] to activate, smooth live recharge!). */
function GearStack({ state }: { state: GameState }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const airRef = useRef<HTMLDivElement>(null);
  const gloveId = state.progress.equipped.glove;
  const glove = getGlove(gloveId);
  const hasDoubleJump = gloveId === 'boost' || gloveId === 'fusion';

  useEffect(() => {
    return movementStore.subscribe((s) => {
      const card = cardRef.current;
      const lbl = labelRef.current;
      const fill = fillRef.current;
      if (card && lbl && fill) {
        const ready = s.gloveCooldown <= 0.04;
        const pct = ready ? 1 : Math.max(0, 1 - s.gloveCooldown / Math.max(0.1, s.gloveCooldownMax));
        fill.style.transform = `scaleX(${pct.toFixed(3)})`;
        card.classList.toggle('is-cooling', !ready);
        card.classList.toggle('is-active', s.gloveActive || s.gliding);
        lbl.textContent = s.gliding
          ? 'GLIDING! [SPACE drop]'
          : ready
            ? glove.abilityHint
            : `${glove.abilityName} ${s.gloveCooldown.toFixed(1)}s`;
      }
      if (airRef.current && hasDoubleJump) {
        const ok = s.grounded || s.airJumpsLeft > 0;
        airRef.current.classList.toggle('is-cooling', !ok);
        airRef.current.textContent = ok ? '2X JUMP READY' : '2X JUMP USED';
      }
    });
  }, [gloveId, glove.abilityHint, glove.abilityName, hasDoubleJump]);

  if (state.shopOpen) return null;

  return (
    <div className="utg-gear-stack" style={{ ['--glove' as string]: glove.color }}>
      <div className="utg-glove-pill">
        <span className="utg-glove-dot" />
        <span>{glove.name}</span>
      </div>
      {hasDoubleJump && (
        <div ref={airRef} className="utg-passive-pill">2X JUMP READY</div>
      )}
      <div ref={cardRef} className="utg-ability-bar">
        <span ref={fillRef} className="utg-ability-fill" />
        <span ref={labelRef} className="utg-ability-txt">{glove.abilityHint}</span>
      </div>
    </div>
  );
}

function NtbTimer({ state }: { state: GameState }) {
  if (state.phase !== 'playing' || state.ntb <= 0) return null;
  return (
    <div className="utg-ntb">
      <svg viewBox="0 0 24 24" className="utg-ntb-shield" aria-hidden="true">
        <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" fill="#fff" stroke="#171717" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <span className="utg-ntb-value">{Math.ceil(state.ntb)}</span>
    </div>
  );
}

/** Top-left level card + clickable UTG SHOP [B] button + coin gain popups! */
function LevelAndShopCard({ state }: { state: GameState }) {
  const { level, xp, coins, ownedGloves } = state.progress;
  const need = xpForLevel(level);
  const canAffordNewGlove = GLOVES.some((g) => !ownedGloves.includes(g.id) && coins >= g.price);
  const [coinPop, setCoinPop] = useState<{ id: number; amount: number } | null>(null);
  const lastPop = useRef(state.coinPopupId);

  useEffect(() => {
    if (state.coinPopupId !== lastPop.current && state.coinPopupAmount > 0) {
      lastPop.current = state.coinPopupId;
      setCoinPop({ id: state.coinPopupId, amount: state.coinPopupAmount });
      const t = window.setTimeout(() => setCoinPop(null), 1100);
      return () => window.clearTimeout(t);
    }
  }, [state.coinPopupId, state.coinPopupAmount]);

  return (
    <div className="utg-topleft">
      <div className="utg-level">
        <span className="utg-level-badge">{level}</span>
        <div className="utg-level-body">
          <div className="utg-level-row">
            <span>level {level}</span>
            <span className="utg-level-coins">¢ {coins}</span>
          </div>
          <div className="utg-level-bar"><i style={{ width: `${Math.min(100, (xp / need) * 100)}%` }} /></div>
          <div className="utg-level-xp">{xp} / {need} xp</div>
        </div>
        {coinPop && (
          <span key={coinPop.id} className="utg-coin-pop">
            +{coinPop.amount} ¢
          </span>
        )}
      </div>

      <div className="utg-quick-btns">
        <button
          type="button"
          className={`utg-shop-btn ${canAffordNewGlove ? 'has-deal' : ''}`}
          onClick={(e) => {
            e.currentTarget.blur();
            if (document.pointerLockElement) document.exitPointerLock();
            game.toggleShop('featured');
            soundFX.playVote();
          }}
        >
          <span className="utg-shop-btn-label">★ shop</span>
          <kbd className="utg-shop-btn-key">B</kbd>
          {canAffordNewGlove && <span className="utg-shop-alert" title="New Parkour Gloves affordable!">!</span>}
        </button>

        <button
          type="button"
          className="utg-shop-btn is-inv"
          onClick={(e) => {
            e.currentTarget.blur();
            if (document.pointerLockElement) document.exitPointerLock();
            game.toggleShop('inventory');
            soundFX.playVote();
          }}
        >
          <span className="utg-shop-btn-label">items</span>
          <kbd className="utg-shop-btn-key">I</kbd>
        </button>

        <button
          type="button"
          className="utg-shop-btn is-emote"
          title="Perform your equipped emote"
          onClick={(e) => {
            e.currentTarget.blur();
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG', key: 'g', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyG', key: 'g', bubbles: true }));
          }}
        >
          <span className="utg-shop-btn-label">emote</span>
          <kbd className="utg-shop-btn-key">G</kbd>
        </button>

        <button
          type="button"
          className="utg-shop-btn is-sfx"
          title="Open TikTok 2026 Soundboard & Juke SFX Picker!"
          onClick={(e) => {
            e.currentTarget.blur();
            if (document.pointerLockElement) document.exitPointerLock();
            game.toggleShop('sounds');
            soundFX.playVote();
          }}
        >
          <span className="utg-shop-btn-label">sfx</span>
          <kbd className="utg-shop-btn-key">N</kbd>
        </button>
      </div>
    </div>
  );
}

function LeaderRow({ p, playerTitle }: { p: Participant; playerTitle: string }) {
  const chaser = p.role === 'tagger';
  return (
    <li className={`utg-lb-row ${p.isPlayer ? 'is-you' : ''} ${chaser ? 'is-chaser' : ''}`}>
      <span className="utg-lb-dot" style={{ background: chaser ? CHASER_COLOR : p.finished ? '#73f27e' : RUNNER_COLOR }} />
      <span className="utg-lb-name">
        {p.name}
        {p.isPlayer && playerTitle !== 'runner' && <em className="utg-lb-title"> [{playerTitle}]</em>}
      </span>
      {chaser ? <b className="utg-lb-tag">chaser</b> : p.finished ? <b className="utg-lb-tag is-ok">safe</b> : <Pips done={p.crossings} />}
    </li>
  );
}

function Leaderboard({ state }: { state: GameState }) {
  const [muted, setMuted] = useState(soundFX.muted);
  const map = MAPS.find((m) => m.id === state.mapId);
  const playerTitle = getFx(state.progress.equipped.fx).titleBadge;
  const mega = state.roster.length > 12;
  // In MEGA mode show you + the 9 most impressive players (safe first, then most crossings).
  const rankScore = (p: Participant) =>
    (p.finished ? 1000 : 0) + (p.role === 'runner' ? 100 : 0) + p.crossings * 10 + p.infections * 3;
  const rows = mega
    ? [state.roster[0], ...state.roster.slice(1).sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 9)]
    : state.roster;
  const hiddenCount = state.roster.length - rows.length;
  const safeCount = mega ? state.roster.filter((p) => p.finished).length : 0;
  return (
    <div className={`utg-lb ${mega ? 'is-mega' : ''}`}>
      <div className="utg-lb-head">
        <span>{mega ? 'MEGA 100' : 'huss valley'}</span>
        <span className="utg-lb-round">{state.roundNumber > 0 ? `round ${state.roundNumber} · ${map?.name}` : 'lobby'}</span>
      </div>
      {mega && (
        <div className="utg-lb-mega">
          <span className="is-runners">{state.runnersAlive} runners</span>
          <span className="is-chasers">{state.chasersAlive} chasers</span>
          <span className="is-safe">{safeCount} safe</span>
        </div>
      )}
      <ul className="utg-lb-list">
        {rows.map((p) => <LeaderRow key={p.id} p={p} playerTitle={playerTitle} />)}
      </ul>
      {hiddenCount > 0 && <div className="utg-lb-more">+{hiddenCount} more players</div>}
      <div className="utg-lb-foot">
        <span>wins <b>{state.score}</b></span>
        <span>ankles <b>{state.ankleBreaks}</b></span>
        <button
          type="button"
          className="utg-mute"
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          onClick={(e) => {
            e.currentTarget.blur();
            soundFX.muted = !soundFX.muted;
            setMuted(soundFX.muted);
          }}
        >
          {muted ? 'SFX OFF' : 'SFX ON'}
        </button>
      </div>
    </div>
  );
}

function TagFeed({ state }: { state: GameState }) {
  if (state.feed.length === 0) return null;
  return (
    <div className="utg-feed">
      {state.feed.slice(0, 4).map((e) => (
        <div key={e.id} className={`utg-feed-row tone-${e.tone ?? 'tag'}`}>
          <span className={`utg-feed-avatar ${e.actor === 'You' ? 'is-you' : 'is-tagger'}`} />
          <span className="utg-feed-text"><b>{e.actor}</b> {e.text}</span>
        </div>
      ))}
    </div>
  );
}

function ResultsPanel({ state }: { state: GameState }) {
  const r = state.result;
  if (state.phase !== 'results' || !r || state.shopOpen) return null;
  const good = GOOD_OUTCOMES.includes(r.outcome);
  const { level, xp } = state.progress;
  return (
    <div className={`utg-result ${r.winner === 'runners' ? 'is-runners' : 'is-chasers'}`}>
      <div className="utg-result-head">{r.winner} win!</div>
      <div className={`utg-result-badge ${good ? 'is-good' : ''}`}>{good ? 'victory' : 'better luck next time'}</div>
      <div className="utg-result-sub">{OUTCOME_TEXT[r.outcome]}</div>
      <div className="utg-result-grid">
        <div><b>{r.crossings}</b><span>crossings</span></div>
        <div><b>{r.infections}</b><span>infected</span></div>
        <div><b>{r.ankles}</b><span>ankles</span></div>
        <div><b>{r.escaped}/{r.runnersTotal}</b><span>escaped</span></div>
      </div>
      {r.mode === 'mega' && r.placement > 0 && (
        <div className="utg-result-place">
          placed <b>#{r.placement}</b> of {r.runnersTotal} runners
        </div>
      )}
      <div className="utg-result-reward">
        <span>+{r.xp} xp</span>
        <span className="is-coins">+{r.coins} coins</span>
        {r.mode === 'mega' && <span className="is-mega">MEGA x1.5!</span>}
      </div>
      <div className="utg-level-bar utg-result-bar"><i style={{ width: `${Math.min(100, (xp / xpForLevel(level)) * 100)}%` }} /></div>
      {r.leveledUp && <div className="utg-result-level">level up! you are level {level} (+50c)</div>}
      <div className="utg-result-next">next round in {Math.ceil(state.phaseTime)} · press B to spend coins!</div>
    </div>
  );
}

function EmoteToast({ state }: { state: GameState }) {
  if (state.emoteTimeLeft <= 0 || !state.emoteName || state.shopOpen) return null;
  return (
    <div className="utg-emote-toast" role="status">
      <span className="utg-emote-note" aria-hidden="true">♫</span>
      <span className="utg-emote-toast-name">{state.emoteName}</span>
      <span className="utg-emote-toast-hint">G stop · move to cancel</span>
    </div>
  );
}

function ControlsHint({ state }: { state: GameState }) {
  if (state.phase !== 'intermission' || state.shopOpen) return null;
  return (
    <div className="utg-hint">
      <span><b>WASD</b> run</span>
      <span><b>SPACE</b> jump / mantle</span>
      <span><b>C</b> slide</span>
      <span><b>E</b> glove</span>
      <span><b>G</b> emote</span>
      <span><b>N</b> soundboard</span>
      <span><b>B</b> shop</span>
      <span><b>M</b> 100p</span>
      <span><b>1-3</b> vote</span>
    </div>
  );
}

function Speedometer() {
  const digits = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => movementStore.subscribe((s) => {
    const v = String(Math.round(s.speed));
    if (digits.current && digits.current.textContent !== v) digits.current.textContent = v;
    if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, s.speed / Math.max(1, s.speedCap)).toFixed(4)})`;
    const vig = document.querySelector<HTMLElement>('.speed-vignette');
    if (vig) vig.style.opacity = Math.min(1, Math.max(0, (s.speed - 82) / 55)).toFixed(3);
  }), []);
  return (
    <output className="speed-counter" aria-label="Speed in studs per second" aria-live="off">
      <span ref={digits} className="speed-value">0</span>
      <span className="speed-unit">studs/s</span>
      <span className="speed-bar"><span ref={bar} className="speed-bar-fill" /></span>
    </output>
  );
}

function ChaserIndicator({ state }: { state: GameState }) {
  const ref = useRef<HTMLDivElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = (window as unknown as { __chaserScreen?: { x: number; y: number; onScreen: boolean; dist: number } }).__chaserScreen;
      if (!t || !ref.current || !distRef.current) return;
      distRef.current.textContent = `${Math.round(t.dist)}m`;
      ref.current.style.opacity = t.onScreen ? '0' : '1';
      if (!t.onScreen) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const ang = Math.atan2(t.y - cy, t.x - cx);
        const radius = Math.min(cx, cy) - 60;
        ref.current.style.transform = `translate(${cx + Math.cos(ang) * radius}px, ${cy + Math.sin(ang) * radius}px) translate(-50%,-50%) rotate(${ang}rad)`;
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  if (state.phase !== 'playing' || state.shopOpen) return null;
  return (
    <div ref={ref} className={`utg-chaser-arrow ${state.role === 'tagger' ? 'is-prey' : ''}`} aria-hidden="true">
      <span className="utg-chaser-arrow-head" />
      <span ref={distRef} className="utg-chaser-dist">0m</span>
    </div>
  );
}

export function UtgHud() {
  const [state, setState] = useState<GameState>({ ...game.state });
  useEffect(() => game.subscribe(() => setState({ ...game.state })), []);

  return (
    <>
      <div className="speed-vignette" aria-hidden="true" />
      <RoleSplash state={state} />
      <InfectedVignette state={state} />
      <LevelAndShopCard state={state} />
      <IntermissionPill state={state} />
      <VotePanel state={state} />
      <ModePicker state={state} />
      <RoundTimer state={state} />
      <ValleyStrip state={state} />
      <CenterFlash state={state} />
      <Leaderboard state={state} />
      <RoleBanner state={state} />
      <GearStack state={state} />
      <NtbTimer state={state} />
      <TagFeed state={state} />
      <ResultsPanel state={state} />
      <ControlsHint state={state} />
      <Speedometer />
      <ChaserIndicator state={state} />
      <EmoteToast state={state} />
      <UtgShopModal state={state} />
    </>
  );
}
