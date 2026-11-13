import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-14 text-sm leading-relaxed text-muted sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Terms of Use</h1>
        <p>By using PixForge you agree to these terms.</p>
        <h2 className="pt-4 text-lg font-medium text-fg">Your content</h2>
        <p>
          You are responsible for the images you process. Only use images that you own or have permission to edit.
          Do not use PixForge to remove watermarks or other ownership information from images you do not own.
        </p>
        <h2 className="pt-4 text-lg font-medium text-fg">Service</h2>
        <p>
          PixForge is provided &quot;as is&quot;. We work hard to keep it reliable, but we cannot guarantee it will be
          error-free. Always keep your original files — PixForge never modifies them.
        </p>
        <h2 className="pt-4 text-lg font-medium text-fg">Your API keys</h2>
        <p>
          When AI tools become available, any usage and cost on your own API key is your responsibility and is billed by
          the provider.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
