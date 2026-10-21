"use client";

import { useEffect, useRef, type ReactNode } from "react";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Drives every scroll animation on the landing page from one passive scroll
 * listener. For each `[data-scene]` element it writes:
 *
 * - `--p`: scroll progress from 0 to 1. For a scene taller than the viewport
 *   (a pinned scene) it runs while the sticky content is pinned; for a shorter
 *   scene it runs from entering the viewport to leaving it.
 * - `data-step`: the current step, when the scene declares `data-steps`.
 *
 * The CSS reads these values, so scrolling never re-renders React. Pointer
 * position is exposed as `--mx`/`--my` (-0.5 to 0.5) for a slight parallax
 * tilt on devices with a fine pointer.
 */
export function ScrollStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const scenes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-scene]"),
    );
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    function update() {
      frame = 0;
      const viewport = window.innerHeight;

      for (const scene of scenes) {
        const rect = scene.getBoundingClientRect();
        const pinnedDistance = rect.height - viewport;
        const progress =
          pinnedDistance > 0
            ? clamp01(-rect.top / pinnedDistance)
            : clamp01((viewport - rect.top) / (viewport + rect.height));
        scene.style.setProperty("--p", progress.toFixed(4));

        const steps = Number(scene.dataset.steps);
        if (steps > 0) {
          const step = Math.min(steps - 1, Math.floor(progress * steps));
          scene.dataset.step = String(step);
        }
      }

      const scrollable = document.documentElement.scrollHeight - viewport;
      const pageProgress = scrollable > 0 ? window.scrollY / scrollable : 0;
      root.style.setProperty("--page-p", clamp01(pageProgress).toFixed(4));

      if (pointer) {
        root.style.setProperty("--mx", pointer.x.toFixed(3));
        root.style.setProperty("--my", pointer.y.toFixed(3));
      }
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    function onPointerMove(event: PointerEvent) {
      pointer = {
        x: event.clientX / window.innerWidth - 0.5,
        y: event.clientY / window.innerHeight - 0.5,
      };
      schedule();
    }

    const tiltEnabled =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    if (tiltEnabled) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
