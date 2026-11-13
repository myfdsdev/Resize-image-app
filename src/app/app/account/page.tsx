import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, signOut } from "@/auth";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login?callbackUrl=/app/account");
  const { user } = session;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader title="Account" description="Manage your PixForge profile." />

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
  );
}
