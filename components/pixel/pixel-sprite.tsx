import type { Sprite } from "./sprites";

type PixelSpriteProps = {
  sprite: Sprite;
  /** Rendered size of one sprite pixel, in CSS pixels. */
  scale?: number;
  className?: string;
  /** Leave unset for decorative sprites so screen readers skip them. */
  label?: string;
};

export function PixelSprite({
  sprite,
  scale = 4,
  className,
  label,
}: PixelSpriteProps) {
  const width = sprite.rows[0].length;
  const height = sprite.rows.length;

  // Merge horizontal runs of the same colour into one rect to keep the SVG small.
  const rects: { x: number; y: number; length: number; color: string }[] = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) end++;
      if (key !== ".") {
        rects.push({ x, y, length: end - x, color: sprite.colors[key] });
      }
      x = end;
    }
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      shapeRendering="crispEdges"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rects.map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}`}
          x={rect.x}
          y={rect.y}
          width={rect.length}
          height={1}
          // CSS variables only resolve in style, not in SVG attributes.
          style={{ fill: rect.color }}
        />
      ))}
    </svg>
  );
}
