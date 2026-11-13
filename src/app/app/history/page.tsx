import { LogIn } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/auth";
import { ClearHistoryButton } from "@/components/dashboard/ClearHistoryButton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { formatBytes } from "@/lib/filenames";
import { getHistory } from "@/lib/user-data";

export const metadata: Metadata = { title: "History" };

const PAGE_SIZE = 20;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getSession();
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);

  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader title="History" description="Every batch you process, at a glance." />
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line-strong bg-surface-2 p-6 sm:flex-row sm:items-center">
          <p className="text-sm text-muted">Log in to keep a history of your batches. Only numbers are saved — never your images.</p>
          <ButtonLink href="/login?callbackUrl=/app/history" variant="secondary">
            <LogIn className="h-4 w-4" /> Log in
          </ButtonLink>
        </div>
      </div>
    );
  }

  let data: Awaited<ReturnType<typeof getHistory>> | null = null;
  try {
    data = await getHistory(session.user.id, page, PAGE_SIZE);
  } catch {
    data = null;
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="History"
        description="Every batch you process, at a glance. Only numbers are saved — never your images."
        actions={data && data.total > 0 ? <ClearHistoryButton /> : undefined}
      />

      {!data ? (
        <p className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">History is unavailable right now.</p>
      ) : data.total === 0 ? (
        <div className="rounded-2xl border border-line bg-surface px-5 py-12 text-center">
          <p className="text-sm text-faint">No batches yet.</p>
          <ButtonLink href="/app" className="mt-4">
            Open Bulk Editor
          </ButtonLink>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[620px] text-left text-sm" data-testid="history-table">
              <thead className="border-b border-line text-xs text-faint">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Images</th>
                  <th className="px-3 py-3 font-medium">Files</th>
                  <th className="px-3 py-3 font-medium">Sizes</th>
                  <th className="px-3 py-3 font-medium">Format</th>
                  <th className="px-5 py-3 text-right font-medium">Size change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((b) => {
                  const saved = b.inBytes > 0 ? 1 - b.outBytes / b.inBytes : 0;
                  return (
                    <tr key={b.id}>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">
                        {new Date(b.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="px-3 py-3">
                        {b.images}
                        {b.failed > 0 && <span className="ml-1.5 text-xs text-bad">({b.failed} failed)</span>}
                      </td>
                      <td className="px-3 py-3">{b.outputs}</td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-muted" title={b.sizes.join(", ")}>
                        {b.sizes.join(", ")}
                      </td>
                      <td className="px-3 py-3 text-muted">{b.format === "original" ? "Same" : b.format.toUpperCase()}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <span className="text-muted">
                          {formatBytes(b.inBytes)} → {formatBytes(b.outBytes)}
                        </span>
                        {saved > 0.005 && <span className="ml-1.5 text-xs text-ok">−{Math.round(saved * 100)}%</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-faint">
                Page {page} of {pages} · {data.total} batches
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`/app/history?page=${page - 1}`} className="rounded-lg border border-line-strong px-3 py-1.5 hover:bg-surface-3">
                    Previous
                  </Link>
                )}
                {page < pages && (
                  <Link href={`/app/history?page=${page + 1}`} className="rounded-lg border border-line-strong px-3 py-1.5 hover:bg-surface-3">
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
