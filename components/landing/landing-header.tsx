import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonStyles } from "@/components/ui/button";

export function LandingHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <div className="glass mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-1">
          <a
            href="#how-it-works"
            className={`${buttonStyles("ghost", "sm")} hidden md:inline-flex`}
          >
            How it works
          </a>
          <a
            href="#preview"
            className={`${buttonStyles("ghost", "sm")} hidden md:inline-flex`}
          >
            Preview
          </a>
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className={buttonStyles("primary", "sm")}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={`${buttonStyles("ghost", "sm")} hidden sm:inline-flex`}
              >
                Sign in
              </Link>
              <Link href="/register" className={buttonStyles("primary", "sm")}>
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
