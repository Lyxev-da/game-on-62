import { MOVEMENT } from '../components/PlayerController';

export interface MovementSnapshot {
  /** horizontal studs/s */
  speed: number;
  speedCap: number;
  sliding: boolean;
  grounded: boolean;
  gliding: boolean;
  gloveCooldown: number;
  gloveCooldownMax: number;
  gloveActive: boolean;
  airJumpsLeft: number;
}

type Listener = (snapshot: MovementSnapshot) => void;

class MovementStore {
  private snapshot: MovementSnapshot = {
    speed: 0,
    speedCap: MOVEMENT.SPEED_CAP,
    sliding: false,
    grounded: true,
    gliding: false,
    gloveCooldown: 0,
    gloveCooldownMax: 2.0,
    gloveActive: false,
    airJumpsLeft: 0,
  };
  private listeners = new Set<Listener>();

  frame(
    speed: number,
    sliding: boolean,
    grounded: boolean,
    gliding: boolean,
    gloveCooldown: number,
    gloveCooldownMax: number,
    gloveActive: boolean,
    airJumpsLeft: number,
    speedCap: number,
  ): void {
    const s = this.snapshot;
    s.speed = speed;
    s.speedCap = speedCap;
    s.sliding = sliding;
    s.grounded = grounded;
    s.gliding = gliding;
    s.gloveCooldown = gloveCooldown;
    s.gloveCooldownMax = gloveCooldownMax;
    s.gloveActive = gloveActive;
    s.airJumpsLeft = airJumpsLeft;
    this.listeners.forEach((listener) => listener(s));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const movementStore = new MovementStore();
