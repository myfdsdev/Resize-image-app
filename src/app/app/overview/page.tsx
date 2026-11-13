import { ArrowRight, Crop, Images, LogIn, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/auth";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { formatBytes } from "@/lib/filenames";
import { getOverview, type Overview } from "@/lib/user-data";

export const metadata: Metadata = { title: "Overview" };

const tools = [
  { href: "/app", icon: Images, title: "Bulk Editor", text: "Resize, convert and compress many images at once." },
  { href: "/app/crop", icon: Crop, title: "Crop & Rotate", text: "Crop with ratios and social presets, rotate and flip." },
  { href: "/app/settings", icon: Settings, title: "Settings", text: "Default size, format and quality for new batches." },
];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-xs text-faint">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-ok">{hint}</p>}
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function OverviewPage() {
  const session = await getSession();
  const name = session?.user?.name?.split(" ")[0];

  let data: Overview | null = null;
  let failed = false;
  if (session?.user?.id) {
    try {
      data = await getOverview(session.user.id);
    } catch {
      failed = true;
    }
  }
  const t = data?.totals;
  const saved = t && t.inBytes > t.outBytes ? t.inBytes - t.outBytes : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title={name ? `Welcome back, ${name}` : "Overview"}
        description="Your image work at a glance."
        actions={<ButtonLink href="/app">Open Bulk Editor</ButtonLink>}
      />

      {!session?.user ? (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line-strong bg-surface-2 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-medium">Track your activity</h2>
            <p className="mt-1 text-sm text-muted">Log in to see stats, save default settings and sync them across devices.</p>
          </div>
          <ButtonLink href="/login?callbackUrl=/app/overview" variant="secondary">
            <LogIn className="h-4 w-4" /> Log in
          </ButtonLink>
        </div>
      ) : failed ? (
        <p className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
          Stats are unavailable right now. Your tools still work normally.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="overview-stats">
            <Stat label="Batches" value={String(t!.batches)} />
            <Stat label="Images processed" value={String(t!.images)} />
            <Stat label="Files exported" value={String(t!.outputs)} />
            <Stat
              label="Space saved"
              value={formatBytes(saved)}
              hint={t!.inBytes > 0 && saved > 0 ? `${Math.round((saved / t!.inBytes) * 100)}% smaller overall` : undefined}
            />
          </div>

          <section className="rounded-2xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="text-sm font-medium">Recent batches</h2>
            </div>
            {data!.recent.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-faint">No batches yet. Process some images to see them here.</p>
            ) : (
              <ul className="divide-y divide-line" data-testid="recent-batches">
                {data!.recent.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p>
                        {b.images} image{b.images === 1 ? "" : "s"} → {b.outputs} file{b.outputs === 1 ? "" : "s"}
                        {b.failed > 0 && <span className="ml-2 text-bad">{b.failed} failed</span>}
                      </p>
                      <p className="truncate text-xs text-faint">
                        {b.sizes.slice(0, 3).join(", ")}
                        {b.sizes.length > 3 ? ` +${b.sizes.length - 3} more` : ""} · {b.format === "original" ? "same format" : b.format.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p>
                        {formatBytes(b.inBytes)} → {formatBytes(b.outBytes)}
                      </p>
                      <p className="text-faint">{timeAgo(b.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Tools</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
            >
              <tool.icon className="h-5 w-5" />
              <h3 className="mt-4 flex items-center gap-1.5 font-medium">
                {tool.title}
                <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </h3>
              <p className="mt-1.5 text-sm text-muted">{tool.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
