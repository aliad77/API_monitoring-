// A stepped heartbeat trace, the recurring Pulse motif. Purely decorative.
const POINTS =
  "0,12 14,12 14,8 16,8 16,4 18,4 18,18 20,18 20,22 22,22 22,12 26,12 26,10 28,10 28,12 40,12";

export function PixelPulse({
  className = "",
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 40 24"
      fill="none"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden
    >
      <polyline
        points={POINTS}
        pathLength={1}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="miter"
        className={animated ? "pixel-pulse-trace" : undefined}
      />
    </svg>
  );
}
