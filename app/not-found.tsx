import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-zinc-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        The page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/" className={`${buttonStyles("secondary")} mt-6`}>
        Go home
      </Link>
    </main>
  );
}
