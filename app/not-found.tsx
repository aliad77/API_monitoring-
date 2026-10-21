import Link from "next/link";
import { PixelSprite } from "@/components/pixel/pixel-sprite";
import { mascot } from "@/components/pixel/sprites";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid-canvas flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <PixelSprite sprite={mascot} scale={6} />
      <p className="mt-6 font-pixel text-5xl text-lavender-deep dark:text-lavender">
        404
      </p>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-haze-500 dark:text-haze-400">
        The page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/" className={`${buttonStyles("secondary")} mt-6`}>
        Go home
      </Link>
    </main>
  );
}
