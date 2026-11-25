import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import "../game/fonts.css";
import "../game/game.css";

const GameApp = lazy(() => import("../game/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Huss Valley — Tag Game" },
      { name: "description", content: "Round-based 3D tag game: run, jump, slide and juke your way to victory." },
      { property: "og:title", content: "Huss Valley — Tag Game" },
      { property: "og:description", content: "Round-based 3D tag game: run, jump, slide and juke your way to victory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <GameApp />
    </Suspense>
  );
}
