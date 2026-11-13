import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PresetsManager } from "@/components/dashboard/PresetsManager";

export const metadata: Metadata = { title: "Saved Presets" };

export default function PresetsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader title="Saved Presets" description="Your own sizes, ready to use in the Bulk Editor." />
      <PresetsManager />
    </div>
  );
}
