import Link from "next/link";
import { getSession } from "@/auth";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";

const nav = [
  { href: "/#how", label: "How it works" },
  { href: "/#presets", label: "Presets" },
  { href: "/#features", label: "Features" },
  { href: "/#faq", label: "FAQ" },
];

export async function SiteHeader() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm text-muted hover:text-fg">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <UserMenu user={session?.user} />
          <ButtonLink href="/app" size="sm">
            Open app
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
