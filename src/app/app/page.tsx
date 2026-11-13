import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/auth";
import { Logo } from "@/components/layout/Logo";
import { UserMenu } from "@/components/layout/UserMenu";
import { Workspace } from "@/components/Workspace";

export const metadata: Metadata = { title: "Workspace" };

export default async function AppPage() {
  const session = await getSession();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden rounded-md border border-line px-2 py-0.5 text-xs text-faint sm:inline">Workspace</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="hidden text-sm text-muted hover:text-fg sm:inline">
              Home
            </Link>
            <UserMenu user={session?.user} />
          </div>
        </div>
      </header>
      <Workspace />
    </div>
  );
}
