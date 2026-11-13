import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, signOut } from "@/auth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button, ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login?callbackUrl=/account");
  const { user } = session;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
          <p className="mt-1 text-sm text-muted">Manage your PixForge profile.</p>
        </div>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-medium">Profile</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[120px_1fr]">
            <dt className="text-faint">Name</dt>
            <dd data-testid="account-name">{user.name || "—"}</dd>
            <dt className="text-faint">Email</dt>
            <dd data-testid="account-email">{user.email}</dd>
          </dl>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <h2 className="text-sm font-medium">AI API key (fal.ai)</h2>
            <span className="rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-faint">Coming soon</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Soon you&apos;ll be able to add your own fal.ai key here to unlock AI tools. Keys will be stored encrypted.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/app">Open workspace</ButtonLink>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="secondary">
              Log out
            </Button>
          </form>
        </div>
      </main>
    </>
  );
}
