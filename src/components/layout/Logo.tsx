import Link from "next/link";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#ffffff" />
      <rect x="7" y="7" width="12" height="12" rx="2" fill="none" stroke="#000" strokeWidth="2.4" />
      <path d="M13 25h12V13" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-semibold tracking-tight text-fg">
      <LogoMark />
      <span className="text-[17px]">PixForge</span>
    </Link>
  );
}
