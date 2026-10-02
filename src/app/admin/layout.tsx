import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, destroySession } from "@/lib/auth/session";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/check-ins", label: "Check-ins" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/settings/integrations", label: "Integrations" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/scanner");

  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gate-bg">
      <aside className="hidden w-56 shrink-0 border-r border-gate-border bg-gate-surface p-4 md:block">
        <p className="mb-6 text-sm font-semibold text-gate-text">TicketGate Admin</p>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-gate-textMuted hover:bg-gate-surfaceRaised hover:text-gate-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="mt-8">
          <button className="w-full rounded-lg border border-gate-border py-2 text-sm text-gate-textMuted hover:bg-gate-surfaceRaised">
            Log out
          </button>
        </form>
      </aside>

      <div className="flex-1">
        {/* Mobile top nav */}
        <div className="flex items-center justify-between border-b border-gate-border bg-gate-surface px-4 py-3 md:hidden">
          <p className="text-sm font-semibold text-gate-text">TicketGate Admin</p>
          <form action={logout}>
            <button className="text-sm text-gate-textMuted">Log out</button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-b border-gate-border bg-gate-surface px-2 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-gate-textMuted hover:bg-gate-surfaceRaised"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
