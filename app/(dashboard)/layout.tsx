import { redirect } from "next/navigation";
import { AppNav } from "@/components/dashboard/app-nav";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserId();
  const [user, unreadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  // A valid session for an account that has since been deleted.
  if (!user) redirect("/login");

  return (
    <div className="lg:flex">
      <AppNav user={user} unreadCount={unreadCount} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
