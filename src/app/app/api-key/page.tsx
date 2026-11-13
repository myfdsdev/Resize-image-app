import type { Metadata } from "next";
import { ApiKeyManager } from "@/components/ai/ApiKeyManager";
import { PageHeader } from "@/components/dashboard/PageHeader";

export const metadata: Metadata = { title: "API Key" };

export default function ApiKeyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader title="API Key" description="Use your own fal.ai key to unlock AI tools. You stay in control of cost." />
      <ApiKeyManager />
    </div>
  );
}
