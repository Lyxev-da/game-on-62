import { useState } from 'react';
import { RobloxSandboxCanvas } from './components/RobloxSandboxCanvas';
import { UtgHud } from './components/UtgHud';

export function App() {
  const [shiftLocked, setShiftLocked] = useState(false);

  return (
    <main className="game">
      <RobloxSandboxCanvas shiftLocked={shiftLocked} onSetShiftLocked={setShiftLocked} />
      <UtgHud />
      {shiftLocked && <div className="reticle" aria-hidden="true" />}
      <p id="game-instructions" className="sr-only">
        Huss Valley, round based tag game styled after Untitled Tag Game and Parkour Pandemic.
        WASD to run, Space to jump and mantle over ledges, C to slide, E or X to activate your equipped Glove ability,
        G to perform your equipped Emote with custom synth music, N to open the TikTok 2026 soundboard and choose your juke sound effect,
        B to open the utg://shop browser, I to open utg://inventory, M in the lobby to switch between Classic (8 players) and MEGA 100 mode
        (100 players, 8 chasers, 1.5x coins), Shift to lock the mouse, 1-3 to vote on maps during intermission,
        and R to return to spawn.
      </p>
    </main>
  );
}

export default App;
