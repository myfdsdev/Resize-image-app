import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

interface Props {
  user?: { name?: string | null; email?: string | null } | null;
}

export function UserMenu({ user }: Props) {
  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <ButtonLink href="/login" variant="ghost" size="sm">
          Log in
        </ButtonLink>
        <ButtonLink href="/signup" variant="secondary" size="sm" className="hidden sm:inline-flex">
          Sign up
        </ButtonLink>
      </div>
    );
  }
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  return (
    <Link
      href="/account"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-sm font-medium hover:border-faint"
      title={user.email ?? "Account"}
      aria-label="Account"
    >
      {initial}
    </Link>
  );
}
