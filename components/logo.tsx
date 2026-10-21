import Link from "next/link";
import { PixelSprite } from "@/components/pixel/pixel-sprite";
import { heart } from "@/components/pixel/sprites";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-lg"
    >
      <span className="chrome flex size-8 items-center justify-center rounded-lg transition-transform group-hover:-rotate-6">
        <PixelSprite sprite={heart} scale={3} />
      </span>
      <span className="font-display text-base font-bold tracking-tight">
        Pulse
      </span>
    </Link>
  );
}
