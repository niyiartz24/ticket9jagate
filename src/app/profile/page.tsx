import { redirect } from "next/navigation";
import { getSession, destroySession } from "@/lib/auth/session";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gate-bg px-4 py-8">
      <div className="mx-auto max-w-sm rounded-xl border border-gate-border bg-gate-surface p-6">
        <h1 className="text-lg font-semibold text-gate-text">{session.name}</h1>
        <p className="mt-1 text-sm text-gate-textMuted">{session.email}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-gate-textMuted">{session.role}</p>

        <form action={logout} className="mt-6">
          <button className="w-full rounded-lg border border-gate-border py-3 text-gate-text hover:bg-gate-surfaceRaised">
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}
