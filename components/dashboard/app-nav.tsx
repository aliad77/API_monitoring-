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
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-haze-100 text-haze-900 dark:bg-haze-800 dark:text-haze-100"
                : "text-haze-600 hover:bg-haze-100 hover:text-haze-900 dark:text-haze-400 dark:hover:bg-haze-800/60 dark:hover:text-haze-100"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
            {href === "/notifications" && unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-lavender-deep px-2 py-0.5 text-xs font-semibold text-white">
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
    <div className="border-t border-haze-200 pt-4 dark:border-haze-800">
      <div className="mb-3 min-w-0 px-3">
        <p className="truncate text-sm font-medium">{user.name ?? "Account"}</p>
        <p className="truncate text-xs text-haze-500 dark:text-haze-400">
          {user.email}
        </p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-haze-600 hover:bg-haze-100 hover:text-haze-900 dark:text-haze-400 dark:hover:bg-haze-800/60 dark:hover:text-haze-100"
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
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-haze-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-haze-800 dark:bg-haze-950/90">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-md p-2 text-haze-600 hover:bg-haze-100 dark:text-haze-300 dark:hover:bg-haze-800"
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
          className="border-b border-haze-200 bg-white px-4 py-4 lg:hidden dark:border-haze-800 dark:bg-haze-950"
        >
          {nav}
          <div className="mt-4">{account}</div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-haze-200 bg-white px-3 py-5 lg:flex dark:border-haze-800 dark:bg-haze-950">
        <div className="mb-6 flex items-center justify-between px-3">
          <Logo href="/dashboard" />
          <ThemeToggle />
        </div>
        <div className="flex-1">{nav}</div>
        {account}
      </aside>
    </>
  );
}
