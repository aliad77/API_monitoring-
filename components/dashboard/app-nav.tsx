"use client";

import {
  AlertTriangle,
  Bell,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Radio,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { PixelSprite } from "@/components/pixel/pixel-sprite";
import { mascot } from "@/components/pixel/sprites";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/monitors", label: "Monitors", icon: Radio },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/status-pages", label: "Status pages", icon: Globe },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

type AppNavProps = {
  user: { name: string | null; email: string };
  unreadCount: number;
};

export function AppNav({ user, unreadCount }: AppNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-linear-to-r from-lavender/25 to-lavender/5 text-haze-950 dark:text-white"
                : "text-haze-600 hover:bg-lavender/10 hover:text-haze-950 dark:text-haze-300 dark:hover:text-white"
            }`}
          >
            <span
              className={`size-1.5 shrink-0 transition ${active ? "bg-lavender-deep dark:bg-lavender" : "bg-transparent group-hover:bg-haze-300 dark:group-hover:bg-haze-600"}`}
              aria-hidden
            />
            <Icon className="size-4" aria-hidden />
            {label}
            {href === "/notifications" && unreadCount > 0 && (
              <span className="ml-auto rounded-md bg-lavender-deep px-1.5 py-0.5 font-pixel text-[11px] text-white">
                {unreadCount}
                <span className="sr-only"> unread</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const account = (
    <div className="border-t border-(--edge) pt-4">
      <div className="mb-3 flex min-w-0 items-center gap-3 px-3">
        <PixelSprite sprite={mascot} scale={2} className="shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {user.name ?? "Account"}
          </p>
          <p className="truncate text-xs text-haze-500 dark:text-haze-400">
            {user.email}
          </p>
        </div>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-haze-600 transition hover:bg-lavender/10 hover:text-haze-950 dark:text-haze-300 dark:hover:text-white"
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-(--edge) bg-(--surface) px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-lg p-2 text-haze-600 hover:bg-lavender/10 dark:text-haze-300"
          >
            {open ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
      {open && (
        <div
          id="mobile-nav"
          className="border-b border-(--edge) bg-(--surface-solid) px-4 py-4 lg:hidden"
        >
          {nav}
          <div className="mt-4">{account}</div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 p-3 lg:block">
        <div className="glass flex h-full flex-col rounded-2xl px-3 py-4">
          <div className="mb-6 flex items-center justify-between px-2">
            <Logo href="/dashboard" />
            <ThemeToggle />
          </div>
          <p className="mb-2 px-3 font-pixel text-[11px] tracking-widest text-haze-500 uppercase dark:text-haze-400">
            Workspace
          </p>
          <div className="flex-1">{nav}</div>
          {account}
        </div>
      </aside>
    </>
  );
}
