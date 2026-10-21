import { Logo } from "@/components/logo";
import { PixelSprite } from "@/components/pixel/pixel-sprite";
import { mascot, sparkle } from "@/components/pixel/sprites";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid-canvas flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-10 pb-24 sm:pt-16">
        <div className="relative w-full max-w-sm">
          <div
            className="pointer-events-none absolute -top-10 -right-14 hidden sm:block"
            aria-hidden
          >
            <PixelSprite sprite={mascot} scale={4} />
          </div>
          <div
            className="pointer-events-none absolute top-24 -left-12 hidden sm:block"
            aria-hidden
          >
            <PixelSprite sprite={sparkle} scale={4} />
          </div>

          {/* A retro desktop window around the form. */}
          <div className="glass relative overflow-hidden rounded-2xl">
            <div
              className="flex items-center gap-2 border-b border-(--edge) bg-linear-to-r from-lavender/20 to-aqua/10 px-4 py-2.5"
              aria-hidden
            >
              <span className="size-2 bg-lavender" />
              <span className="size-2 bg-haze-300 dark:bg-haze-700" />
              <span className="size-2 bg-haze-300 dark:bg-haze-700" />
              <span className="ml-2 font-pixel text-[11px] tracking-wide text-haze-600 uppercase dark:text-haze-300">
                pulse://account
              </span>
            </div>
            <div className="p-6 sm:p-7">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
