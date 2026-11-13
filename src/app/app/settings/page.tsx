import type { Metadata } from "next";
import { DefaultsForm } from "@/components/dashboard/DefaultsForm";
import { PageHeader } from "@/components/dashboard/PageHeader";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader title="Settings" description="Default export settings for new batches." />
      <DefaultsForm />
    </div>
  );
}
